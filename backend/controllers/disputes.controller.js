// backend/controllers/disputes.controller.js
const Dispute = require('../models/Dispute.model');
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum'); // >>> IMPORT ENUM CỦA BẠN VÀO

// [USER] POST /api/disputes - Báo cáo sự cố
exports.createDispute = async (req, res) => {
  const { rentalId, reason, evidenceImages } = req.body;
  const reporterId = req.user._id;

  try {
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });

    if (!rental.renterId.equals(reporterId) && !rental.ownerId.equals(reporterId)) {
      return res.status(403).json({ message: 'Bạn không thuộc giao dịch này' });
    }

    // Dùng Enum của bạn: Đổi trạng thái thành "Đang tranh chấp"
    await Rental.findByIdAndUpdate(rentalId, { status: RentalStatus.DISPUTED });

    const dispute = await Dispute.create({ rentalId, reporterId, reason, evidenceImages });

    res.status(201).json({ message: 'Đã báo cáo sự cố. Đơn thuê đã bị đóng băng.', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// [ADMIN] GET /api/disputes - Xem tất cả sự cố
exports.getAllDisputes = async (req, res) => {
  try {
    // Sửa lại đoạn populate để lấy thêm fullName của renterId và ownerId bên trong rentalId
    const disputes = await Dispute.find()
      .populate('reporterId', 'fullName email')
      .populate({
        path: 'rentalId',
        populate: {
          path: 'renterId ownerId',
          select: 'fullName email phone' // Lấy thêm email/phone để admin tiện liên lạc nếu cần
        }
      });
      
    res.status(200).json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// [ADMIN] PATCH /api/disputes/:id/resolve - Phán quyết cuối cùng
exports.resolveDispute = async (req, res) => {
  const { id } = req.params;
  const { adminDecision, winner, penalizeUserId } = req.body; 

  try {
    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy hồ sơ sự cố' });

    const rental = await Rental.findById(dispute.rentalId);

    dispute.status = 'resolved';
    dispute.adminDecision = adminDecision;
    await dispute.save();

    // Dùng Enum của bạn để xử lý kết quả
    let updateFields = {};
    if (winner === 'renter') {
      updateFields.paymentStatus = PaymentStatus.REFUNDED;
      updateFields.status = RentalStatus.CANCELLED;
    } else if (winner === 'owner') {
      updateFields.status = RentalStatus.COMPLETED;
    }
    
    if (Object.keys(updateFields).length > 0) {
      await Rental.findByIdAndUpdate(rental._id, updateFields);
    }

    await Item.findByIdAndUpdate(rental.itemId, { status: 'available' });

    if (penalizeUserId) {
      await User.findByIdAndUpdate(penalizeUserId, { isBanned: true });
    }

    res.status(200).json({ message: 'Đã giải quyết xong tranh chấp', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};