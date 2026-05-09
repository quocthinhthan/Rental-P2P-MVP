// backend/controllers/rentals.controller.js
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const { publishToQueue } = require('../config/rabbitmq');
const mongoose = require('mongoose');
const crypto = require('crypto');
const qs = require('qs');

const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  });

  return sorted;
};

const formatDateForVNPay = (date) => {
  const pad = (number) => number.toString().padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.connection?.socket?.remoteAddress
    || '127.0.0.1';
};

const buildFrontendVNPayReturnUrl = (params = {}) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const query = qs.stringify(params);

  return `${frontendUrl}/vnpay-return${query ? `?${query}` : ''}`;
};

// POST /api/rentals (Create a rental request)
exports.createRentalRequest = async (req, res) => {
  const { itemId, startDate, endDate, note } = req.body;
  const renterId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Invalid Item ID' });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (item.ownerId.equals(renterId)) {
      return res.status(400).json({ message: 'You cannot rent your own item' });
    }
    if (item.status !== 'available') {
      return res.status(400).json({ message: 'Item is not available for rent' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    const totalPrice = days * item.pricePerDay;

    const rental = await Rental.create({
      itemId,
      renterId,
      ownerId: item.ownerId,
      startDate: start,
      endDate: end,
      totalPrice,
      escrowAmount: totalPrice,
      paymentStatus: 'pending',
      note,
      status: 'pending_payment'
    });

    res.status(201).json(rental);
  } catch (error) {
    res.status(400).json({ message: 'Bad request', error: error.message });
  }
};

// POST /api/rentals/:id/create-vnpay-url
exports.createVNPayUrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Rental ID' });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (!rental.renterId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden (not the renter of this rental)' });
    }

    if (rental.status !== 'pending_payment' || rental.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Rental is not waiting for payment' });
    }

    const requiredEnv = ['VNP_TMN_CODE', 'VNP_HASH_SECRET', 'VNP_URL', 'VNP_RETURN_URL'];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
      return res.status(500).json({
        message: 'VNPay config is missing',
        missing: missingEnv
      });
    }

    const amount = Math.round(rental.escrowAmount * 100);
    let vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: rental._id.toString(),
      vnp_OrderInfo: 'Thanh toan ky quy don thue ' + rental._id,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: formatDateForVNPay(new Date())
    };

    vnpParams = sortObject(vnpParams);

    const signData = qs.stringify(vnpParams, { encode: false });
    const secureHash = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    vnpParams.vnp_SecureHash = secureHash;

    const paymentUrl = process.env.VNP_URL + '?' + qs.stringify(vnpParams, { encode: false });

    res.status(200).json({ paymentUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/rentals/vnpay-return
exports.handleVNPayReturn = async (req, res) => {
  try {
    if (!process.env.VNP_HASH_SECRET) {
      return res.status(500).json({ message: 'VNPay config is missing', missing: ['VNP_HASH_SECRET'] });
    }

    let vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    vnpParams = sortObject(vnpParams);

    const signData = qs.stringify(vnpParams, { encode: false });
    const signed = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (!secureHash || secureHash.toLowerCase() !== signed.toLowerCase()) {
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: 'Invalid VNPay signature'
      }));
    }

    const rentalId = vnpParams.vnp_TxnRef;
    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: 'Invalid VNPay transaction reference'
      }));
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: 'Rental not found'
      }));
    }

    if (vnpParams.vnp_ResponseCode === '00') {
      if (rental.paymentStatus !== 'escrowed') {
        rental.paymentStatus = 'escrowed';
        rental.status = 'pending_confirmation';
        await rental.save();

        publishToQueue({
          task: 'new_rental_request',
          rentalId: rental._id,
          ownerId: rental.ownerId
        });
      }

      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'success',
        rentalId: rental._id.toString()
      }));
    }

    return res.redirect(buildFrontendVNPayReturnUrl({
      status: 'failed',
      rentalId: rental._id.toString(),
      responseCode: vnpParams.vnp_ResponseCode,
      message: 'VNPay payment failed'
    }));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware kiểm tra chủ sở hữu item (cho confirm/reject)
const checkRentalOwner = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    if (rental.ownerId.equals(req.user._id)) {
      req.rental = rental;
      next();
    } else {
      res.status(403).json({ message: 'Forbidden (not the item owner)' });
    }
  } catch (error) {
    res.status(404).json({ message: 'Rental not found' });
  }
};

// PATCH /api/rentals/:id/confirm
exports.confirmRental = async (req, res) => {
  const rental = req.rental; // Từ middleware checkRentalOwner

  if (rental.status !== 'pending_confirmation') {
    return res.status(400).json({ message: 'Rental cannot be confirmed' });
  }

  try {
    const item = await Item.findById(rental.itemId);
    if (!item || item.status !== 'available') {
       return res.status(400).json({ message: 'Item is no longer available' });
    }

    // Cập nhật trạng thái
    item.status = 'rented';
    rental.status = 'confirmed';

    await item.save();
    const savedRental = await rental.save();

    // Gửi message đến RabbitMQ
    publishToQueue({
      task: 'rental_status_changed',
      rentalId: savedRental._id,
      status: 'confirmed'
    });

    res.status(200).json(savedRental);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PATCH /api/rentals/:id/reject
exports.rejectRental = async (req, res) => {
  const rental = req.rental; // Từ middleware checkRentalOwner

  if (rental.status !== 'pending_confirmation') {
    return res.status(400).json({ message: 'Rental cannot be rejected' });
  }

  rental.status = 'rejected';
  const savedRental = await rental.save();

  // Gửi message đến RabbitMQ
  publishToQueue({
    task: 'rental_status_changed',
    rentalId: savedRental._id,
    status: 'rejected'
  });

  res.status(200).json(savedRental);
};

// PATCH /api/rentals/:id/complete
exports.completeRental = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found' });
        }
        
        // Chỉ renter hoặc owner mới được complete
        if (!rental.renterId.equals(req.user._id) && !rental.ownerId.equals(req.user._id)) {
            return res.status(403).json({ message: 'Forbidden (not part of this rental)' });
        }
        
        // Chỉ complete khi đã 'confirmed' hoặc 'in_progress'
        if (rental.status !== 'confirmed' && rental.status !== 'in_progress') {
            return res.status(400).json({ message: 'Rental cannot be completed' });
        }
        
        const item = await Item.findById(rental.itemId);
        if (item) {
            // Trả item về 'available'
            item.status = 'available';
            await item.save();
        }

        rental.status = 'completed';
        const savedRental = await rental.save();
        
        res.status(200).json(savedRental);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Đính kèm middleware vào exports
exports.checkRentalOwner = checkRentalOwner;
