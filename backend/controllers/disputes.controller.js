// backend/controllers/disputes.controller.js
const Dispute = require('../models/Dispute.model');
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum'); // >>> IMPORT ENUM CỦA BẠN VÀO
const { DisputeStatus, PenaltyType } = require('../enums/dispute.enum');
const { ItemStatus } = require('../enums/item.enum');

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
  const { adminDecision, winner, penalizeUserId, penaltyType } = req.body; 

  try {
    const dispute = await Dispute.findById(id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy hồ sơ sự cố' });

    const rental = await Rental.findById(dispute.rentalId);

    dispute.status = DisputeStatus.RESOLVED;
    dispute.adminDecision = adminDecision;
    await dispute.save();

    // 1. XỬ LÝ DÒNG TIỀN THEO NGƯỜI THẮNG
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

    // Luôn đưa món đồ về trạng thái sẵn sàng sau khi giải quyết
    await Item.findByIdAndUpdate(rental.itemId, { status: 'available' });

    // 2. ÁP DỤNG CHẾ TÀI LŨY TIẾN
    if (penalizeUserId && penaltyType && penaltyType !== PenaltyType.NONE) {
      const userToPenalize = await User.findById(penalizeUserId);
      if (userToPenalize) {
        switch (penaltyType) {
          case PenaltyType.WARNING:
            userToPenalize.trustScore -= 20; // Cảnh cáo: Trừ điểm uy tín
            break;
          case PenaltyType.SUSPENSION:
            userToPenalize.trustScore -= 50; 
            const suspensionDays = 7;
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + suspensionDays);
            userToPenalize.suspendedUntil = endDate; // Đình chỉ có thời hạn
            break;
          case PenaltyType.BAN:
            userToPenalize.trustScore = -100;
            userToPenalize.isBanned = true; // Khóa vĩnh viễn
            break;
        }
        await userToPenalize.save();
      }
    }

    res.status(200).json({ message: 'Đã giải quyết xong tranh chấp', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// [USER] PATCH /api/disputes/:id/withdraw - Người dùng tự rút khiếu nại
exports.withdrawDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Không tìm thấy sự cố' });

    if (dispute.reporterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ người tạo báo cáo mới có quyền rút khiếu nại.' });
    }

    if (dispute.status !== DisputeStatus.PENDING) {
      return res.status(400).json({ message: 'Sự cố này đã được xử lý, không thể rút.' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    const now = new Date();

    // >>> SỬ DỤNG ĐÚNG ENUM CHO TRẠNG THÁI RENTAL VÀ ITEM <<<
    let targetStatus = RentalStatus.IN_PROGRESS; 
    let itemStatus = ItemStatus.RENTED; // Đang thuê thì item vẫn tính là rented

    if (now > new Date(rental.endDate)) {
      // Đã quá ngày trả đồ -> Hoàn tất
      targetStatus = RentalStatus.COMPLETED;
      itemStatus = ItemStatus.AVAILABLE; // Trả đồ về available
    } else if (now < new Date(rental.startDate)) {
      // Chưa tới ngày thuê -> Trả về chờ bàn giao
      targetStatus = RentalStatus.APPROVED;
      itemStatus = ItemStatus.RENTED; 
    }

    // Cập nhật sự cố
    dispute.status = DisputeStatus.WITHDRAWN;
    dispute.adminDecision = 'Người khiếu nại đã rút đơn. Giao dịch tiếp tục theo lịch trình.';
    await dispute.save();

    // Cập nhật lại đơn thuê và món đồ
    await Rental.findByIdAndUpdate(rental._id, { status: targetStatus });
    await Item.findByIdAndUpdate(rental.itemId, { status: itemStatus });

    res.status(200).json({ 
      message: `Đã rút khiếu nại. Trạng thái đơn thuê: ${targetStatus}, Trạng thái Item: ${itemStatus}`, 
      dispute 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};