// backend/controllers/disputes.controller.js
const mongoose = require('mongoose');
const Dispute = require('../models/Dispute.model');
const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');
const { DisputeStatus, PenaltyType, DisputeWinner } = require('../enums/dispute.enum');
const { ItemStatus } = require('../enums/item.enum');

const MEDIATION_WINDOW_HOURS = 48;
const SUSPENSION_DAYS = 7;
const COMPLETED_DISPUTE_WINDOW_DAYS = 7;
const ACTIVE_DISPUTE_STATUSES = [DisputeStatus.PENDING, DisputeStatus.ESCALATED];
const BASE_DISPUTABLE_RENTAL_STATUSES = [
  RentalStatus.CONFIRMED,
  RentalStatus.IN_PROGRESS
];

const isRentalParty = (rental, userId) => (
  rental.renterId.equals(userId) || rental.ownerId.equals(userId)
);

const canCreateDisputeForRental = (rental) => {
  if (BASE_DISPUTABLE_RENTAL_STATUSES.includes(rental.status)) {
    return true;
  }

  if (rental.status !== RentalStatus.COMPLETED) {
    return false;
  }

  // MVP không có completedAt, tạm dùng updatedAt của rental để cho phép khiếu nại sau trả đồ trong 7 ngày.
  const completedAt = rental.updatedAt || rental.endDate;
  const completedDisputeDeadline = new Date(completedAt);
  completedDisputeDeadline.setDate(completedDisputeDeadline.getDate() + COMPLETED_DISPUTE_WINDOW_DAYS);

  return new Date() <= completedDisputeDeadline;
};

const getFallbackRestoreStatuses = (rental) => {
  const now = new Date();

  if (rental.endDate && now > new Date(rental.endDate)) {
    return {
      rentalStatus: RentalStatus.COMPLETED,
      itemStatus: ItemStatus.AVAILABLE
    };
  }

  if (rental.startDate && now < new Date(rental.startDate)) {
    return {
      rentalStatus: RentalStatus.CONFIRMED,
      itemStatus: ItemStatus.RENTED
    };
  }

  return {
    rentalStatus: RentalStatus.IN_PROGRESS,
    itemStatus: ItemStatus.RENTED
  };
};

const getRestoreStatuses = (dispute, rental) => {
  const fallback = getFallbackRestoreStatuses(rental);

  return {
    rentalStatus: dispute.previousRentalStatus && dispute.previousRentalStatus !== RentalStatus.DISPUTED
      ? dispute.previousRentalStatus
      : fallback.rentalStatus,
    itemStatus: dispute.previousItemStatus || fallback.itemStatus
  };
};

const applyPenalty = async (userToPenalize, penaltyType) => {
  if (penaltyType === PenaltyType.NONE) {
    return null;
  }

  if (!userToPenalize) {
    return null;
  }

  switch (penaltyType) {
    case PenaltyType.WARNING:
      userToPenalize.trustScore -= 20;
      break;
    case PenaltyType.SUSPENSION: {
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + SUSPENSION_DAYS);
      userToPenalize.trustScore -= 50;
      userToPenalize.suspendedUntil = suspendedUntil;
      break;
    }
    case PenaltyType.BAN:
      userToPenalize.trustScore = -100;
      userToPenalize.isBanned = true;
      break;
    default:
      break;
  }

  await userToPenalize.save();
  return userToPenalize;
};

const createDisputeAndFreezeRental = async (disputePayload, rental) => {
  // MVP fallback: nếu MongoDB local không hỗ trợ transaction/replica set, vẫn chạy flow cũ nhưng giữ logic ở một nơi.
  const createWithoutTransaction = async () => {
    const dispute = await Dispute.create(disputePayload);
    rental.status = RentalStatus.DISPUTED;
    await rental.save();

    return dispute;
  };

  const session = await mongoose.startSession();

  try {
    let createdDispute;

    await session.withTransaction(async () => {
      const disputes = await Dispute.create([disputePayload], { session });
      createdDispute = disputes[0];
      rental.status = RentalStatus.DISPUTED;
      await rental.save({ session });
    });

    return createdDispute;
  } catch (error) {
    const transactionUnsupported = /Transaction numbers are only allowed|replica set member|Transaction.*not supported/i.test(error.message);

    if (!transactionUnsupported) {
      throw error;
    }

    return createWithoutTransaction();
  } finally {
    await session.endSession();
  }
};

// [USER] POST /api/disputes - Báo cáo sự cố và đóng băng đơn thuê
exports.createDispute = async (req, res) => {
  const { rentalId, reason, evidenceImages } = req.body;
  const reporterId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.status(400).json({ message: 'Mã đơn thuê không hợp lệ' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do khiếu nại' });
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });
    }

    if (!isRentalParty(rental, reporterId)) {
      return res.status(403).json({ message: 'Bạn không thuộc giao dịch này' });
    }

    if (rental.status === RentalStatus.DISPUTED) {
      return res.status(400).json({ message: 'Đơn thuê đang trong trạng thái tranh chấp' });
    }

    if (!canCreateDisputeForRental(rental)) {
      return res.status(400).json({
        message: 'Chỉ có thể tạo tranh chấp cho đơn đã xác nhận, đang diễn ra, hoặc vừa hoàn tất trong 7 ngày'
      });
    }

    const activeDispute = await Dispute.findOne({
      rentalId,
      status: { $in: ACTIVE_DISPUTE_STATUSES }
    });

    if (activeDispute) {
      return res.status(400).json({ message: 'Đơn thuê đang có khiếu nại chưa xử lý' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy tài sản của đơn thuê' });
    }

    const now = new Date();
    const mediationEndsAt = new Date(now.getTime() + MEDIATION_WINDOW_HOURS * 60 * 60 * 1000);

    // Lưu snapshot trước khi freeze để withdraw/resolve none có thể restore chính xác.
    const dispute = await createDisputeAndFreezeRental({
      rentalId,
      reporterId,
      reason,
      evidenceImages: evidenceImages || [],
      previousRentalStatus: rental.status,
      previousItemStatus: item.status,
      mediationEndsAt,
      status: DisputeStatus.PENDING
    }, rental);

    res.status(201).json({
      message: 'Đã báo cáo sự cố. Đơn thuê đã bị đóng băng trong thời gian hòa giải.',
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// [ADMIN] GET /api/disputes - Xem tất cả sự cố
exports.getAllDisputes = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      if (!Object.values(DisputeStatus).includes(req.query.status)) {
        return res.status(400).json({ message: 'Trạng thái tranh chấp không hợp lệ' });
      }
      filter.status = req.query.status;
    }

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .populate('reporterId', 'fullName email phoneNumber phone')
      .populate('escalatedBy', 'fullName email')
      .populate('resolvedBy', 'fullName email')
      .populate('penalizeUserId', 'fullName email trustScore isBanned suspendedUntil')
      .populate({
        path: 'rentalId',
        populate: [
          { path: 'renterId', select: 'fullName email phoneNumber phone trustScore' },
          { path: 'ownerId', select: 'fullName email phoneNumber phone trustScore' },
          { path: 'itemId', select: 'name images status ownerId pricePerDay baseValue' }
        ]
      });

    res.status(200).json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// [USER] PATCH /api/disputes/:id/escalate - Yêu cầu admin can thiệp sau 48 giờ
exports.escalateDispute = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Mã tranh chấp không hợp lệ' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Không tìm thấy sự cố' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });
    }

    if (!isRentalParty(rental, req.user._id)) {
      return res.status(403).json({ message: 'Chỉ người thuê hoặc chủ đồ trong giao dịch mới được yêu cầu can thiệp' });
    }

    if (dispute.status !== DisputeStatus.PENDING) {
      return res.status(400).json({ message: 'Chỉ có thể yêu cầu can thiệp khiếu nại đang trong giai đoạn hòa giải' });
    }

    const now = new Date();
    const mediationEndsAt = dispute.mediationEndsAt || new Date(dispute.createdAt.getTime() + MEDIATION_WINDOW_HOURS * 60 * 60 * 1000);

    if (now < mediationEndsAt) {
      return res.status(400).json({
        message: 'Chỉ có thể yêu cầu admin can thiệp sau khi hết 48 giờ hòa giải',
        mediationEndsAt
      });
    }

    dispute.status = DisputeStatus.ESCALATED;
    dispute.escalatedAt = now;
    dispute.escalatedBy = req.user._id;
    await dispute.save();

    res.status(200).json({
      message: 'Đã chuyển tranh chấp lên admin. Admin sẽ xem xét và đưa ra phán quyết.',
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// [ADMIN] PATCH /api/disputes/:id/resolve - Phán quyết cuối cùng
exports.resolveDispute = async (req, res) => {
  const { id } = req.params;
  const { adminDecision, winner, penalizeUserId } = req.body;
  const penaltyType = req.body.penaltyType || PenaltyType.NONE;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Mã tranh chấp không hợp lệ' });
    }

    if (!adminDecision) {
      return res.status(400).json({ message: 'Vui lòng nhập phán quyết của admin' });
    }

    if (!Object.values(DisputeWinner).includes(winner)) {
      return res.status(400).json({ message: 'Người thắng phải là người thuê, chủ sở hữu hoặc không có ai' });
    }

    if (!Object.values(PenaltyType).includes(penaltyType)) {
      return res.status(400).json({ message: 'Loại chế tài không hợp lệ' });
    }

    if (winner === DisputeWinner.NONE && penaltyType !== PenaltyType.NONE) {
      return res.status(400).json({ message: 'winner = none chỉ được đi kèm penaltyType = none' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ sự cố' });
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      return res.status(400).json({ message: 'Tranh chấp này đã được giải quyết' });
    }

    if (dispute.status === DisputeStatus.WITHDRAWN) {
      return res.status(400).json({ message: 'Khiếu nại đã được rút, không thể giải quyết' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy tài sản của đơn thuê' });
    }

    let userToPenalize = null;
    if (penaltyType !== PenaltyType.NONE) {
      if (!penalizeUserId || !mongoose.Types.ObjectId.isValid(penalizeUserId)) {
        return res.status(400).json({ message: 'penalizeUserId là bắt buộc khi có chế tài' });
      }

      // MVP chỉ cho phạt người liên quan trực tiếp đến rental tranh chấp.
      if (!rental.renterId.equals(penalizeUserId) && !rental.ownerId.equals(penalizeUserId)) {
        return res.status(400).json({ message: 'Chỉ có thể phạt người thuê hoặc chủ sở hữu của đơn thuê này' });
      }

      userToPenalize = await User.findById(penalizeUserId);
      if (!userToPenalize) {
        return res.status(404).json({ message: 'Không tìm thấy người bị áp dụng chế tài' });
      }
    }

    const rentalUpdate = {};
    let itemStatus = ItemStatus.AVAILABLE;

    if (winner === DisputeWinner.RENTER) {
      if (PaymentStatus.REFUNDED) {
        rentalUpdate.paymentStatus = PaymentStatus.REFUNDED;
      }

      // paymentStatus thể hiện đã hoàn tiền; rental.status thể hiện đơn bị hủy/kết thúc theo dispute.
      rentalUpdate.status = Object.prototype.hasOwnProperty.call(RentalStatus, 'REFUNDED')
        ? RentalStatus.REFUNDED
        : RentalStatus.CANCELLED;
    } else if (winner === DisputeWinner.OWNER) {
      rentalUpdate.status = RentalStatus.COMPLETED;
    } else {
      const restored = getRestoreStatuses(dispute, rental);
      rentalUpdate.status = restored.rentalStatus;
      itemStatus = restored.itemStatus;
    }

    await Rental.findByIdAndUpdate(rental._id, rentalUpdate);
    await Item.findByIdAndUpdate(item._id, { status: itemStatus });

    if (penaltyType !== PenaltyType.NONE) {
      await applyPenalty(userToPenalize, penaltyType);
    }

    dispute.status = DisputeStatus.RESOLVED;
    dispute.adminDecision = adminDecision;
    dispute.winner = winner;
    dispute.penalizeUserId = penaltyType === PenaltyType.NONE ? null : penalizeUserId;
    dispute.penaltyType = penaltyType;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    res.status(200).json({ message: 'Đã giải quyết xong tranh chấp', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};

// [USER] PATCH /api/disputes/:id/withdraw - Người dùng tự rút khiếu nại
exports.withdrawDispute = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Mã tranh chấp không hợp lệ' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Không tìm thấy sự cố' });
    }

    if (dispute.reporterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ người tạo báo cáo mới có quyền rút khiếu nại.' });
    }

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      return res.status(400).json({ message: 'Sự cố này đã được xử lý hoặc đã được rút, không thể rút.' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Không tìm thấy đơn thuê' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Không tìm thấy tài sản của đơn thuê' });
    }

    const restored = getRestoreStatuses(dispute, rental);

    // Rút khiếu nại phải đưa rental/item thoát DISPUTED theo snapshot đã lưu.
    dispute.status = DisputeStatus.WITHDRAWN;
    dispute.adminDecision = 'Người khiếu nại đã rút đơn, giao dịch được khôi phục trạng thái trước khi có tranh chấp.';
    await dispute.save();

    await Rental.findByIdAndUpdate(rental._id, { status: restored.rentalStatus });
    await Item.findByIdAndUpdate(item._id, { status: restored.itemStatus });

    res.status(200).json({
      message: `Đã rút khiếu nại. Trạng thái đơn thuê: ${restored.rentalStatus}, trạng thái item: ${restored.itemStatus}`,
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
};
