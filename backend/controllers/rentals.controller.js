// backend/controllers/rentals.controller.js
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const Contract = require('../models/Contract.model');
const User = require('../models/User.model');
const Message = require('../models/Message.model');
const Dispute = require('../models/Dispute.model');
const Review = require('../models/Review.model');
const { publishToQueue } = require('../config/rabbitmq');
const MESSAGES = require('../constants/messages.constant');
const { ItemStatus } = require('../enums/item.enum');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');
const mongoose = require('mongoose');
const crypto = require('crypto');
const qs = require('qs');
const { saveWithUniqueCode } = require('../utils/codeGenerator');
const { recalculateUserTrustScore } = require('../services/trustScore.service');
const {
  authorizeChatRead,
  authorizeChatWrite
} = require('../services/chatAuthorization.service');

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

const BOOKING_BLOCKING_STATUSES = [
  RentalStatus.PENDING_CONFIRMATION,
  RentalStatus.CONFIRMED,
  RentalStatus.IN_PROGRESS,
  RentalStatus.DISPUTED
];

const parseRentalDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  return { start, end };
};

const findOverlappingBooking = ({ itemId, startDate, endDate, excludeRentalId = null }) => {
  const query = {
    itemId,
    status: { $in: BOOKING_BLOCKING_STATUSES },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };

  if (excludeRentalId) {
    query._id = { $ne: excludeRentalId };
  }

  return Rental.findOne(query).select('_id code status startDate endDate');
};

const updateItemRuntimeStatus = async (itemId) => {
  const item = await Item.findById(itemId).select('_id status');
  if (!item || item.status === ItemStatus.DELISTED) {
    return item;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentRental = await Rental.findOne({
    itemId,
    status: { $in: [RentalStatus.CONFIRMED, RentalStatus.IN_PROGRESS, RentalStatus.DISPUTED] },
    startDate: { $lt: tomorrow },
    endDate: { $gte: today }
  }).select('_id');

  const nextStatus = currentRental ? ItemStatus.RENTED : ItemStatus.AVAILABLE;
  if (item.status !== nextStatus) {
    item.status = nextStatus;
    await item.save();
  }

  return item;
};

const applyRentalCancellation = async (rental, cancelledBy, reason = '') => {
  const wasEscrowed = rental.paymentStatus === PaymentStatus.ESCROWED;
  rental.status = RentalStatus.CANCELLED;
  rental.paymentStatus = wasEscrowed ? PaymentStatus.REFUNDED : rental.paymentStatus;
  rental.cancellationReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  rental.cancelledBy = cancelledBy;
  rental.cancelledAt = new Date();
  await rental.save();
  await updateItemRuntimeStatus(rental.itemId);

  return rental;
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
    if (item.status === ItemStatus.DELISTED) {
      return res.status(400).json({ message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE });
    }

    const rentalRange = parseRentalDateRange(startDate, endDate);
    if (!rentalRange) {
      return res.status(400).json({ message: MESSAGES.RENTAL.INVALID_DATE_RANGE });
    }
    const { start, end } = rentalRange;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) {
      return res.status(400).json({ message: MESSAGES.RENTAL.INVALID_DATE_RANGE });
    }

    const overlappingRental = await findOverlappingBooking({
      itemId,
      startDate: start,
      endDate: end
    });
    if (overlappingRental) {
      return res.status(400).json({
        message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE,
        overlappingRental
      });
    }
    const rentalFee = days * item.pricePerDay;
    const depositAmount = (item.baseValue * item.depositPercentage) / 100;
    const commissionRate = 10;
    const commissionAmount = (rentalFee * commissionRate) / 100;
    const payoutAmount = rentalFee - commissionAmount;
    const totalAmount = rentalFee + depositAmount;

    const rental = new Rental({
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
    const createdRental = await saveWithUniqueCode(rental, { prefix: 'RT' });

    res.status(201).json(createdRental);
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

    const item = await Item.findById(rental.itemId).select('_id status');
    if (!item || item.status === ItemStatus.DELISTED) {
      return res.status(400).json({ message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE });
    }

    const overlappingRental = await findOverlappingBooking({
      itemId: rental.itemId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      excludeRentalId: rental._id
    });
    if (overlappingRental) {
      return res.status(400).json({
        message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE,
        overlappingRental
      });
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
      vnp_OrderInfo: 'Thanh toan ky quy don thue ' + (rental.code || rental._id),
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: req.body.source === 'mobile' 
          ? `${process.env.VNP_RETURN_URL}?source=mobile` 
          : process.env.VNP_RETURN_URL,
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

    let vnpParams = {};
    const source = req.query.source;
    
    // Chỉ lấy các tham số bắt đầu bằng vnp_ để xác thực chữ ký (tránh lỗi do thêm source=mobile)
    for (const key in req.query) {
      if (key.startsWith('vnp_')) {
        vnpParams[key] = req.query[key];
      }
    }
    
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    vnpParams = sortObject(vnpParams);

    const signData = qs.stringify(vnpParams, { encode: false });
    const signed = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const isMobile = source === 'mobile';

    if (!secureHash || secureHash.toLowerCase() !== signed.toLowerCase()) {
      if (isMobile) return res.send(renderMobileResponse(false, MESSAGES.PAYMENT.VNPAY_SIGNATURE_INVALID));
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: MESSAGES.PAYMENT.VNPAY_SIGNATURE_INVALID
      }));
    }

    const rentalId = vnpParams.vnp_TxnRef;
    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      if (isMobile) return res.send(renderMobileResponse(false, MESSAGES.PAYMENT.VNPAY_TRANSACTION_INVALID));
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: MESSAGES.PAYMENT.VNPAY_TRANSACTION_INVALID
      }));
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      if (isMobile) return res.send(renderMobileResponse(false, MESSAGES.RENTAL.NOT_FOUND));
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'failed',
        message: MESSAGES.RENTAL.NOT_FOUND
      }));
    }

    if (vnpParams.vnp_ResponseCode === '00') {
      if (rental.paymentStatus !== PaymentStatus.ESCROWED) {
        const item = await Item.findById(rental.itemId).select('_id status');
        const overlappingRental = await findOverlappingBooking({
          itemId: rental.itemId,
          startDate: rental.startDate,
          endDate: rental.endDate,
          excludeRentalId: rental._id
        });

        if (!item || item.status === ItemStatus.DELISTED || overlappingRental) {
          rental.paymentStatus = PaymentStatus.REFUNDED;
          rental.status = RentalStatus.CANCELLED;
          rental.cancellationReason = 'Lịch thuê đã không còn khả dụng trước khi xác nhận thanh toán.';
          rental.cancelledAt = new Date();
          await rental.save();

          return res.redirect(buildFrontendVNPayReturnUrl({
            status: 'refunded',
            rentalId: rental._id.toString(),
            rentalCode: rental.code || '',
            message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE
          }));
        }

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

      if (isMobile) return res.send(renderMobileResponse(true, 'Thanh toán thành công!'));
      return res.redirect(buildFrontendVNPayReturnUrl({
        status: 'success',
        rentalId: rental._id.toString(),
        rentalCode: rental.code || ''
      }));
    }

    if (isMobile) return res.send(renderMobileResponse(false, MESSAGES.PAYMENT.VNPAY_PAYMENT_FAILED));
    return res.redirect(buildFrontendVNPayReturnUrl({
      status: 'failed',
      rentalId: rental._id.toString(),
      rentalCode: rental.code || '',
      responseCode: vnpParams.vnp_ResponseCode,
      message: MESSAGES.PAYMENT.VNPAY_PAYMENT_FAILED
    }));
  } catch (error) {
    if (req.query.source === 'mobile') return res.send(renderMobileResponse(false, error.message));
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

const renderMobileResponse = (success, message) => {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đang quay lại ứng dụng...</title>
      <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f2f2f6; text-align: center; padding: 20px; }
        .spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #f97316; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { color: #8e8e93; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <p>Đang quay lại ứng dụng...</p>
      <script>
        setTimeout(() => {
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `;
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
  const rental = req.rental; 
  
  // Dùng Enum
  if (rental.status !== RentalStatus.PENDING_CONFIRMATION) {
    return res.status(400).json({ message: MESSAGES.RENTAL.CANNOT_CONFIRM });
  }

  try {
    const item = await Item.findById(rental.itemId);
    let contract = await Contract.findOne({ rentalId: rental._id });
    // Dùng Enum
    if (!item || item.status === ItemStatus.DELISTED) {
      return res.status(400).json({ message: MESSAGES.ITEM.NO_LONGER_AVAILABLE });
    }

    const overlappingRental = await findOverlappingBooking({
      itemId: rental.itemId,
      startDate: rental.startDate,
      endDate: rental.endDate,
      excludeRentalId: rental._id
    });
    if (overlappingRental) {
      return res.status(400).json({
        message: MESSAGES.RENTAL.ITEM_NOT_AVAILABLE,
        overlappingRental
      });
    }

    const owner = await User.findById(rental.ownerId);
    const renter = await User.findById(rental.renterId);

    if (!owner || !renter) {
      return res.status(404).json({ message: MESSAGES.USER.NOT_FOUND });
    }

    if (owner.ekycStatus !== 'verified' || renter.ekycStatus !== 'verified') {
       return res.status(400).json({ message: 'Cả hai bên phải hoàn tất eKYC để tự động lập hợp đồng!' });
    }

    if (!contract) {
      contract = await Contract.create({
        rentalId: rental._id,
        ownerInfo: { userId: owner._id, fullName: owner.fullName, idCardNumber: owner.idCardNumber },
        renterInfo: { userId: renter._id, fullName: renter.fullName, idCardNumber: renter.idCardNumber },
        itemInfo: { itemId: item._id, name: item.name, pricePerDay: item.pricePerDay },
        rentalPeriod: { startDate: rental.startDate, endDate: rental.endDate },
        totalPrice: rental.totalAmount
      });
    }

    // Dùng Enum cập nhật trạng thái
    const savedRental = await Rental.findByIdAndUpdate(
      rental._id,
      {
        status: RentalStatus.CONFIRMED,
        contractId: contract._id
      },
      { new: true }
    );
    await updateItemRuntimeStatus(item._id);

    publishToQueue({
      task: 'rental_status_changed',
      rentalId: savedRental._id,
      status: RentalStatus.CONFIRMED
    });

    res.status(200).json({ message: MESSAGES.RENTAL.CONFIRMED, rental: savedRental, contract });
  } catch (error) {
    if (error.code === 11000) {
      const existingContract = await Contract.findOne({ rentalId: rental._id });
      if (existingContract) {
        const savedRental = await Rental.findByIdAndUpdate(
          rental._id,
          {
            status: RentalStatus.CONFIRMED,
            contractId: existingContract._id
          },
          { new: true }
        );
        await updateItemRuntimeStatus(rental.itemId);

        publishToQueue({
          task: 'rental_status_changed',
          rentalId: savedRental._id,
          status: RentalStatus.CONFIRMED
        });

        return res.status(200).json({ message: MESSAGES.RENTAL.CONFIRMED, rental: savedRental, contract: existingContract });
      }
    }

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
    {
      status: RentalStatus.REJECTED,
      paymentStatus: rental.paymentStatus === PaymentStatus.ESCROWED
        ? PaymentStatus.REFUNDED
        : rental.paymentStatus
    }, 
    { new: true }
  );

  // Gửi message đến RabbitMQ
  await updateItemRuntimeStatus(rental.itemId);

  publishToQueue({
    task: 'rental_status_changed',
    rentalId: savedRental._id,
    status: RentalStatus.REJECTED
  });

  res.status(200).json(savedRental);
};

// PATCH /api/rentals/:id/cancel
exports.cancelRental = async (req, res) => {
  const { reason = '' } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: MESSAGES.COMMON.INVALID_RENTAL_ID });
    }

    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
    }

    const isRenter = rental.renterId.equals(req.user._id);
    const isOwner = rental.ownerId.equals(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isRenter && !isOwner && !isAdmin) {
      return res.status(403).json({ message: MESSAGES.RENTAL.NOT_PARTICIPANT });
    }

    if ([RentalStatus.COMPLETED, RentalStatus.REJECTED, RentalStatus.CANCELLED, RentalStatus.DISPUTED].includes(rental.status)) {
      return res.status(400).json({ message: 'Không thể hủy đơn thuê ở trạng thái hiện tại.' });
    }

    if (rental.status === RentalStatus.IN_PROGRESS || rental.pickupImages?.length > 0) {
      return res.status(400).json({ message: 'Không thể hủy đơn sau khi đã bàn giao. Vui lòng dùng luồng tranh chấp.' });
    }

    if (rental.status === RentalStatus.PENDING_PAYMENT && !isRenter && !isAdmin) {
      return res.status(403).json({ message: MESSAGES.RENTAL.NOT_PARTICIPANT });
    }

    const cancelledRental = await applyRentalCancellation(rental, req.user._id, reason);

    publishToQueue({
      task: 'rental_status_changed',
      rentalId: cancelledRental._id,
      status: RentalStatus.CANCELLED
    });

    res.status(200).json({
      message: cancelledRental.paymentStatus === PaymentStatus.REFUNDED
        ? 'Đã hủy đơn và đánh dấu hoàn tiền ký quỹ.'
        : 'Đã hủy đơn thuê thành công.',
      rental: cancelledRental
    });
  } catch (error) {
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

// PATCH /api/rentals/:id/complete
exports.completeRental = async (req, res) => {
  const { returnImages, condition, accessories, notes, damages } = req.body;

  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    if (!rental.renterId.equals(req.user._id) && !rental.ownerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (rental.status !== RentalStatus.IN_PROGRESS) {
      return res.status(400).json({ message: 'Đơn thuê chưa ở trạng thái đang diễn ra' });
    }
    if (!returnImages || returnImages.length === 0) {
      return res.status(400).json({ message: 'Bắt buộc phải tải ảnh lên lúc trả đồ!' });
    }

    // Build return report
    const returnReport = {
      condition:   ['good', 'fair', 'damaged'].includes(condition) ? condition : 'good',
      accessories: typeof accessories === 'string' ? accessories.trim() : '',
      notes:       typeof notes === 'string'       ? notes.trim()       : '',
      damages:     typeof damages === 'string'     ? damages.trim()     : '',
      recordedBy:  req.user._id,
      recordedAt:  new Date()
    };

    const savedRental = await Rental.findByIdAndUpdate(
      rental._id,
      {
        returnImages,
        returnReport,
        status: RentalStatus.COMPLETED
      },
      { new: true }
    );
    await updateItemRuntimeStatus(rental.itemId);

    await Promise.all([
      recalculateUserTrustScore(rental.renterId),
      recalculateUserTrustScore(rental.ownerId)
    ]);

    res.status(200).json({ message: 'Trả đồ và hoàn thành đơn', rental: savedRental });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/rentals/:id/sign-contract - Ký hợp đồng 
exports.signContract = async (req, res) => {
  // Yêu cầu Frontend gửi URL của ảnh chữ ký (sau khi Frontend đã up lên Cloudinary)
  const { signatureUrl } = req.body; 

  try {
    if (!signatureUrl) {
      return res.status(400).json({ message: 'Vui lòng cung cấp chữ ký điện tử!' });
    }

    const rental = await Rental.findById(req.params.id);
    if (!rental || !rental.contractId) return res.status(404).json({ message: 'Không tìm thấy hợp đồng' });

    if (rental.status === RentalStatus.DISPUTED) {
      return res.status(400).json({ message: 'Don thue dang tranh chap, khong the ky hop dong.' });
    }

    const contract = await Contract.findById(rental.contractId);
    if (!contract) return res.status(404).json({ message: 'Khong tim thay hop dong' });
    const userId = req.user._id;

    // Gắn thời gian VÀ dán ảnh chữ ký vào đúng người
    if (rental.ownerId.equals(userId)) {
      contract.ownerSignedAt = new Date();
      contract.ownerSignatureUrl = signatureUrl;
    } 
    else if (rental.renterId.equals(userId)) {
      contract.renterSignedAt = new Date();
      contract.renterSignatureUrl = signatureUrl;
    } 
    else {
      return res.status(403).json({ message: 'Bạn không có quyền ký hợp đồng này' });
    }

    // Kiểm tra nếu cả 2 đã ký
    if (contract.ownerSignedAt && contract.renterSignedAt) {
      contract.isFullySigned = true;
    }

    await contract.save();
    res.status(200).json({ message: 'Ký hợp đồng thành công', contract });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// GET /api/rentals/:id/contract - Lấy chi tiết Hợp đồng
exports.getContractByRentalId = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });
    }

    // Chỉ người trong cuộc mới được xem hợp đồng
    const userId = req.user._id;
    if (!rental.renterId.equals(userId) && !rental.ownerId.equals(userId)) {
      return res.status(403).json({ message: 'Bạn không có quyền xem hợp đồng này' });
    }

    if (!rental.contractId) {
      return res.status(404).json({ message: 'Đơn thuê này chưa sinh hợp đồng (Chưa được xác nhận)' });
    }

    // Lấy chi tiết hợp đồng
    const contract = await Contract.findById(rental.contractId);
    
    res.status(200).json(contract);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// PATCH /api/rentals/:id/pickup - Giao/Nhận đồ (Up ảnh lúc nhận)
exports.pickupItem = async (req, res) => {
  const { pickupImages, condition, accessories, notes } = req.body;

  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    if (rental.status !== RentalStatus.CONFIRMED) {
      return res.status(400).json({ message: 'Đơn thuê chưa được xác nhận' });
    }
    if (!pickupImages || pickupImages.length === 0) {
      return res.status(400).json({ message: 'Bắt buộc phải tải ảnh lên lúc bàn giao!' });
    }

    const contract = await Contract.findById(rental.contractId);
    if (!contract || !contract.isFullySigned) {
      return res.status(400).json({ message: 'Cả 2 bên phải ký hợp đồng điện tử trước khi giao nhận đồ!' });
    }

    // Build pickup report
    const pickupReport = {
      condition:   ['good', 'fair', 'damaged'].includes(condition) ? condition : 'good',
      accessories: typeof accessories === 'string' ? accessories.trim() : '',
      notes:       typeof notes === 'string'       ? notes.trim()       : '',
      recordedBy:  req.user._id,
      recordedAt:  new Date()
    };

    rental.pickupImages = pickupImages;
    rental.pickupReport = pickupReport;
    rental.status = RentalStatus.IN_PROGRESS;
    await rental.save();

    res.status(200).json({ message: 'Đã xác nhận giao đồ', rental });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content) return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });

    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Noi dung tin nhan khong duoc de trong' });
    }

    const { error } = await authorizeChatWrite(id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const newMessage = await Message.create({
      rentalId: id,
      senderId: req.user._id,
      content: trimmedContent
    });

    await newMessage.populate('senderId', '_id fullName avatarUrl');
    const messageObject = newMessage.toObject();
    const sender = messageObject.senderId;
    res.status(201).json({
      ...messageObject,
      senderId: sender?._id || req.user._id,
      sender: sender ? {
        _id: sender._id,
        fullName: sender.fullName,
        avatarUrl: sender.avatarUrl || ''
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi gửi tin nhắn', error: error.message });
  }
};

// [USER/ADMIN] GET /api/rentals/:id/messages - Lấy lịch sử chat của 1 đơn thuê
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    
    // (Có thể thêm logic check xem req.user._id có phải Renter/Owner/Admin không cho bảo mật)
    
    const { error } = await authorizeChatRead(id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const messages = await Message.find({ rentalId: id })
      .populate('senderId', '_id fullName avatarUrl')
      .sort({ createdAt: 1 });
    res.status(200).json(messages.map((message) => {
      const messageObject = message.toObject();
      const sender = messageObject.senderId;
      return {
        ...messageObject,
        senderId: sender?._id || message.senderId,
        sender: sender ? {
          _id: sender._id,
          fullName: sender.fullName,
          avatarUrl: sender.avatarUrl || ''
        } : null
      };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tải lịch sử chat', error: error.message });
  }
};

// [USER/ADMIN] GET /api/rentals/:id - Lấy chi tiết 1 đơn thuê
exports.getRentalDetail = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: MESSAGES.COMMON.INVALID_RENTAL_ID });
    }

    const rental = await Rental.findById(id)
      .populate({
        path: 'itemId',
        select: '_id code name pricePerDay images baseValue depositPercentage address ownerId'
      })
      .populate({
        path: 'ownerId',
        select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      })
      .populate({
        path: 'renterId',
        select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      });

    if (!rental) {
      return res.status(404).json({ message: MESSAGES.RENTAL.NOT_FOUND });
    }

    // Only allow renter, owner, or admin to view
    const isRenter = rental.renterId.equals(userId);
    const isOwner = rental.ownerId.equals(userId);
    const isAdmin = req.user.role === 'admin';
    if (!isRenter && !isOwner && !isAdmin) {
      return res.status(403).json({ message: MESSAGES.RENTAL.NOT_PARTICIPANT });
    }

    // Load related contract if exists
    let contract = null;
    if (rental.contractId) {
      contract = await Contract.findById(rental.contractId)
        .select('_id ownerSignedAt renterSignedAt ownerSignatureUrl renterSignatureUrl isFullySigned createdAt updatedAt');
    } else {
      contract = await Contract.findOne({ rentalId: rental._id })
        .select('_id ownerSignedAt renterSignedAt ownerSignatureUrl renterSignatureUrl isFullySigned createdAt updatedAt');
    }

    // Load related dispute if exists
    const dispute = await Dispute.findOne({ rentalId: rental._id })
      .sort({ createdAt: -1 })
      .populate('reporterId', '_id fullName email')
      .populate('penalizeUserId', '_id fullName email');

    // Populate review if exists
    const review = await Review.findOne({ rentalId: rental._id, reviewerId: userId });

    const counterparty = isOwner ? rental.renterId : rental.ownerId;

    const itemSummary = rental.itemId ? {
      _id: rental.itemId._id,
      code: rental.itemId.code,
      name: rental.itemId.name,
      pricePerDay: rental.itemId.pricePerDay,
      mainImage: (rental.itemId.images && rental.itemId.images.length > 0) ? rental.itemId.images[0] : '',
      images: rental.itemId.images || []
    } : null;

    const responseData = {
      _id: rental._id,
      code: rental.code,
      startDate: rental.startDate,
      endDate: rental.endDate,
      rentalFee: rental.rentalFee,
      depositAmount: rental.depositAmount,
      escrowAmount: rental.depositAmount, // both names for convenience
      totalAmount: rental.totalAmount,
      totalPrice: rental.totalAmount, // both names for convenience
      commissionRate: rental.commissionRate,
      commissionAmount: rental.commissionAmount,
      payoutAmount: rental.payoutAmount,
      paymentStatus: rental.paymentStatus,
      status: rental.status,
      createdAt: rental.createdAt,
      updatedAt: rental.updatedAt,
      note: rental.note || '',
      cancellationReason: rental.cancellationReason || '',
      cancelledBy: rental.cancelledBy || null,
      cancelledAt: rental.cancelledAt || null,
      contractId: rental.contractId,
      pickupImages: rental.pickupImages || [],
      returnImages: rental.returnImages || [],
      pickupReport: (rental.pickupReport && rental.pickupReport.recordedBy) ? rental.pickupReport : null,
      returnReport: (rental.returnReport && rental.returnReport.recordedBy) ? rental.returnReport : null,
      actualReturnDate: rental.actualReturnDate || null,
      overdueDays: rental.overdueDays || 0,
      lateFeeAmount: rental.lateFeeAmount || 0,
      contract: contract ? {
        _id: contract._id,
        ownerSignedAt: contract.ownerSignedAt,
        renterSignedAt: contract.renterSignedAt,
        ownerSignatureUrl: contract.ownerSignatureUrl,
        renterSignatureUrl: contract.renterSignatureUrl,
        isFullySigned: contract.isFullySigned,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      } : null,
      isFullySigned: Boolean(contract?.isFullySigned),
      item: itemSummary,
      itemId: rental.itemId?._id || null,
      itemName: rental.itemId?.name || 'Đồ đã bị xóa',
      itemMainImage: (rental.itemId?.images && rental.itemId.images.length > 0) ? rental.itemId.images[0] : '',
      counterparty: counterparty ? {
        _id: counterparty._id,
        fullName: counterparty.fullName,
        email: counterparty.email,
        avatarUrl: counterparty.avatarUrl || '',
        ekycStatus: counterparty.ekycStatus,
        averageRating: counterparty.averageRating || 0,
        totalReviews: counterparty.totalReviews || 0,
        trustScore: counterparty.trustScore || 50
      } : null,
      counterpartyName: counterparty?.fullName || '',
      counterpartyId: counterparty?._id || '',
      renter: rental.renterId ? {
        _id: rental.renterId._id,
        fullName: rental.renterId.fullName
      } : null,
      owner: rental.ownerId ? {
        _id: rental.ownerId._id,
        fullName: rental.ownerId.fullName
      } : null,
      ownerId: rental.ownerId?._id || '',
      renterId: rental.renterId?._id || '',
      dispute: dispute ? {
        _id: dispute._id,
        status: dispute.status,
        reason: dispute.reason,
        evidenceImages: dispute.evidenceImages || [],
        mediationEndsAt: dispute.mediationEndsAt,
        adminDecision: dispute.adminDecision,
        resolvedAt: dispute.resolvedAt
      } : null,
      review: review ? {
        _id: review._id,
        rating: review.rating,
        comment: review.comment
      } : null
    };

    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};

// Đính kèm middleware vào exports
exports.checkRentalOwner = checkRentalOwner;
