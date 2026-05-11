// backend/controllers/rentals.controller.js
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const { publishToQueue } = require('../config/rabbitmq');
const MESSAGES = require('../constants/messages.constant');
const { ItemStatus } = require('../enums/item.enum');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');
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
      return res.status(400).json({ message: MESSAGES.COMMON.INVALID_ITEM_ID });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: MESSAGES.ITEM.NOT_FOUND });
    }
    if (item.ownerId.equals(renterId)) {
      return res.status(400).json({ message: MESSAGES.RENTAL.OWN_ITEM_NOT_ALLOWED });
    }
    if (item.status !== ItemStatus.AVAILABLE) {
      return res.status(400).json({ message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) {
      return res.status(400).json({ message: MESSAGES.RENTAL.INVALID_DATE_RANGE });
    }
    const rentalFee = days * item.pricePerDay;
    const depositAmount = (item.baseValue * item.depositPercentage) / 100;
    const commissionRate = 10;
    const commissionAmount = (rentalFee * commissionRate) / 100;
    const payoutAmount = rentalFee - commissionAmount;
    const totalAmount = rentalFee + depositAmount;

    const rental = await Rental.create({
      itemId,
      renterId,
      ownerId: item.ownerId,
      startDate: start,
      endDate: end,
      rentalFee,
      depositAmount,
      totalAmount,
      commissionRate,
      commissionAmount,
      payoutAmount,
      paymentStatus: PaymentStatus.PENDING,
      note,
      status: RentalStatus.PENDING_PAYMENT
    });

    res.status(201).json(rental);
  } catch (error) {
    res.status(400).json({ message: MESSAGES.COMMON.BAD_REQUEST, error: error.message });
  }
};

// POST /api/rentals/:id/create-vnpay-url
exports.createVNPayUrl = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: MESSAGES.COMMON.INVALID_RENTAL_ID });
    }

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
    }

    if (!rental.renterId.equals(req.user._id)) {
      return res.status(403).json({ message: MESSAGES.RENTAL.NOT_RENTER });
    }

    if (rental.status !== RentalStatus.PENDING_PAYMENT || rental.paymentStatus !== PaymentStatus.PENDING) {
      return res.status(400).json({ message: MESSAGES.RENTAL.WAITING_PAYMENT_REQUIRED });
    }

    const requiredEnv = ['VNP_TMN_CODE', 'VNP_HASH_SECRET', 'VNP_URL', 'VNP_RETURN_URL'];
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);
    if (missingEnv.length > 0) {
      return res.status(500).json({
        message: MESSAGES.PAYMENT.VNPAY_CONFIG_MISSING,
        missing: missingEnv
      });
    }

    const amount = Math.round(rental.totalAmount * 100);
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
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

// GET /api/rentals/vnpay-return
exports.handleVNPayReturn = async (req, res) => {
  try {
    if (!process.env.VNP_HASH_SECRET) {
      return res.status(500).json({ message: MESSAGES.PAYMENT.VNPAY_CONFIG_MISSING, missing: ['VNP_HASH_SECRET'] });
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
        message: MESSAGES.PAYMENT.VNPAY_SIGNATURE_INVALID
      }));
    }

    const rentalId = vnpParams.vnp_TxnRef;
    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: MESSAGES.PAYMENT.VNPAY_TRANSACTION_INVALID
      }));
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: MESSAGES.RENTAL.NOT_FOUND
      }));
    }

    if (vnpParams.vnp_ResponseCode === '00') {
      if (rental.paymentStatus !== PaymentStatus.ESCROWED) {
        await Rental.findByIdAndUpdate(rental._id, {
          paymentStatus: PaymentStatus.ESCROWED,
          status: RentalStatus.PENDING_CONFIRMATION
        });

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
      message: MESSAGES.PAYMENT.VNPAY_PAYMENT_FAILED
    }));
  } catch (error) {
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

// Middleware kiểm tra chủ sở hữu item (cho confirm/reject)
const checkRentalOwner = async (req, res, next) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
    }
    if (rental.ownerId.equals(req.user._id)) {
      req.rental = rental;
      next();
    } else {
      res.status(403).json({ message: MESSAGES.RENTAL.NOT_OWNER });
    }
  } catch (error) {
    res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
  }
};

// PATCH /api/rentals/:id/confirm
exports.confirmRental = async (req, res) => {
  const rental = req.rental; // Từ middleware checkRentalOwner

  if (rental.status !== RentalStatus.PENDING_CONFIRMATION) {
    return res.status(400).json({ message: MESSAGES.RENTAL.CANNOT_CONFIRM });
  }

  try {
    const item = await Item.findById(rental.itemId);
     if (!item || item.status !== ItemStatus.AVAILABLE) {
       return res.status(400).json({ message: MESSAGES.ITEM.NO_LONGER_AVAILABLE });
    }

    // Cập nhật trạng thái
    item.status = ItemStatus.RENTED;
    await item.save();

    const savedRental = await Rental.findByIdAndUpdate(
      rental._id,
      { status: RentalStatus.CONFIRMED },
      { new: true }
    );

    // Gửi message đến RabbitMQ
    publishToQueue({
      task: 'rental_status_changed',
      rentalId: savedRental._id,
      status: RentalStatus.CONFIRMED
    });

    res.status(200).json(savedRental);
  } catch (error) {
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

// PATCH /api/rentals/:id/reject
exports.rejectRental = async (req, res) => {
  const rental = req.rental; // Từ middleware checkRentalOwner

  if (rental.status !== RentalStatus.PENDING_CONFIRMATION) {
    return res.status(400).json({ message: MESSAGES.RENTAL.CANNOT_REJECT });
  }

  // Dùng findByIdAndUpdate để tránh lỗi validation trên dữ liệu cũ
  const savedRental = await Rental.findByIdAndUpdate(
    rental._id, 
    { status: RentalStatus.REJECTED }, 
    { new: true }
  );

  // Gửi message đến RabbitMQ
  publishToQueue({
    task: 'rental_status_changed',
    rentalId: savedRental._id,
    status: RentalStatus.REJECTED
  });

  res.status(200).json(savedRental);
};

// PATCH /api/rentals/:id/complete
exports.completeRental = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id);
        if (!rental) {
          return res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
        }
        
        // Chỉ renter hoặc owner mới được complete
        if (!rental.renterId.equals(req.user._id) && !rental.ownerId.equals(req.user._id)) {
          return res.status(403).json({ message: MESSAGES.RENTAL.NOT_PARTICIPANT });
        }
        
        // Chỉ complete khi đã 'confirmed' hoặc 'in_progress'
        if (rental.status !== RentalStatus.CONFIRMED && rental.status !== RentalStatus.IN_PROGRESS) {
          return res.status(400).json({ message: MESSAGES.RENTAL.CANNOT_COMPLETE });
        }
        
        const item = await Item.findById(rental.itemId);
        if (item) {
            // Trả item về 'available'
          item.status = ItemStatus.AVAILABLE;
            await item.save();
        }

        // Dùng findByIdAndUpdate để tránh lỗi validation
        const savedRental = await Rental.findByIdAndUpdate(
            rental._id,
            { status: RentalStatus.COMPLETED },
            { new: true }
        );
        
        res.status(200).json(savedRental);

    } catch (error) {
        res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
    }
};

// Đính kèm middleware vào exports
exports.checkRentalOwner = checkRentalOwner;
