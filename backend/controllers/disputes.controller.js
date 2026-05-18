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

  // MVP khong co completedAt, tam dung updatedAt cua rental de cho phep khieu nai sau tra do trong 7 ngay.
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
  // MVP fallback: neu MongoDB local khong ho tro transaction/replica set, van chay flow cu nhung giu logic o mot noi.
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

// [USER] POST /api/disputes - Bao cao su co va dong bang don thue
exports.createDispute = async (req, res) => {
  const { rentalId, reason, evidenceImages } = req.body;
  const reporterId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.status(400).json({ message: 'Ma don thue khong hop le' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Vui long nhap ly do khieu nai' });
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Khong tim thay don thue' });
    }

    if (!isRentalParty(rental, reporterId)) {
      return res.status(403).json({ message: 'Ban khong thuoc giao dich nay' });
    }

    if (rental.status === RentalStatus.DISPUTED) {
      return res.status(400).json({ message: 'Don thue dang trong trang thai tranh chap' });
    }

    if (!canCreateDisputeForRental(rental)) {
      return res.status(400).json({
        message: 'Chi co the tao tranh chap cho don da xac nhan, dang dien ra, hoac vua hoan tat trong 7 ngay'
      });
    }

    const activeDispute = await Dispute.findOne({
      rentalId,
      status: { $in: ACTIVE_DISPUTE_STATUSES }
    });

    if (activeDispute) {
      return res.status(400).json({ message: 'Don thue dang co khieu nai chua xu ly' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Khong tim thay tai san cua don thue' });
    }

    const now = new Date();
    const mediationEndsAt = new Date(now.getTime() + MEDIATION_WINDOW_HOURS * 60 * 60 * 1000);

    // Luu snapshot truoc khi freeze de withdraw/resolve none co the restore chinh xac.
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
      message: 'Da bao cao su co. Don thue da bi dong bang trong thoi gian hoa giai.',
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

// [ADMIN] GET /api/disputes - Xem tat ca su co
exports.getAllDisputes = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      if (!Object.values(DisputeStatus).includes(req.query.status)) {
        return res.status(400).json({ message: 'Trang thai tranh chap khong hop le' });
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
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

// [USER] PATCH /api/disputes/:id/escalate - Yeu cau admin can thiep sau 48h
exports.escalateDispute = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Ma tranh chap khong hop le' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Khong tim thay su co' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Khong tim thay don thue' });
    }

    if (!isRentalParty(rental, req.user._id)) {
      return res.status(403).json({ message: 'Chi nguoi thue hoac chu do trong giao dich moi duoc escalate' });
    }

    if (dispute.status !== DisputeStatus.PENDING) {
      return res.status(400).json({ message: 'Chi co the escalate khieu nai dang trong giai doan hoa giai' });
    }

    const now = new Date();
    const mediationEndsAt = dispute.mediationEndsAt || new Date(dispute.createdAt.getTime() + MEDIATION_WINDOW_HOURS * 60 * 60 * 1000);

    if (now < mediationEndsAt) {
      return res.status(400).json({
        message: 'Chi co the yeu cau Admin can thiep sau khi het 48 gio hoa giai',
        mediationEndsAt
      });
    }

    dispute.status = DisputeStatus.ESCALATED;
    dispute.escalatedAt = now;
    dispute.escalatedBy = req.user._id;
    await dispute.save();

    res.status(200).json({
      message: 'Da escalate tranh chap. Admin se xem xet va dua ra phan quyet.',
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

// [ADMIN] PATCH /api/disputes/:id/resolve - Phan quyet cuoi cung
exports.resolveDispute = async (req, res) => {
  const { id } = req.params;
  const { adminDecision, winner, penalizeUserId } = req.body;
  const penaltyType = req.body.penaltyType || PenaltyType.NONE;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Ma tranh chap khong hop le' });
    }

    if (!adminDecision) {
      return res.status(400).json({ message: 'Vui long nhap phan quyet cua Admin' });
    }

    if (!Object.values(DisputeWinner).includes(winner)) {
      return res.status(400).json({ message: 'Winner phai la renter, owner hoac none' });
    }

    if (!Object.values(PenaltyType).includes(penaltyType)) {
      return res.status(400).json({ message: 'Loai che tai khong hop le' });
    }

    if (winner === DisputeWinner.NONE && penaltyType !== PenaltyType.NONE) {
      return res.status(400).json({ message: 'winner = none chi duoc di kem penaltyType = none' });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({ message: 'Khong tim thay ho so su co' });
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      return res.status(400).json({ message: 'Tranh chap nay da duoc giai quyet' });
    }

    if (dispute.status === DisputeStatus.WITHDRAWN) {
      return res.status(400).json({ message: 'Khieu nai da duoc rut, khong the resolve' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Khong tim thay don thue' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Khong tim thay tai san cua don thue' });
    }

    let userToPenalize = null;
    if (penaltyType !== PenaltyType.NONE) {
      if (!penalizeUserId || !mongoose.Types.ObjectId.isValid(penalizeUserId)) {
        return res.status(400).json({ message: 'penalizeUserId la bat buoc khi co che tai' });
      }

      // MVP chi cho phat nguoi lien quan truc tiep den rental tranh chap.
      if (!rental.renterId.equals(penalizeUserId) && !rental.ownerId.equals(penalizeUserId)) {
        return res.status(400).json({ message: 'Chi co the phat renter hoac owner cua don thue nay' });
      }

      userToPenalize = await User.findById(penalizeUserId);
      if (!userToPenalize) {
        return res.status(404).json({ message: 'Khong tim thay nguoi bi ap dung che tai' });
      }
    }

    const rentalUpdate = {};
    let itemStatus = ItemStatus.AVAILABLE;

    if (winner === DisputeWinner.RENTER) {
      if (PaymentStatus.REFUNDED) {
        rentalUpdate.paymentStatus = PaymentStatus.REFUNDED;
      }

      // paymentStatus the hien da hoan tien; rental.status the hien don bi huy/ket thuc theo dispute.
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

    res.status(200).json({ message: 'Da giai quyet xong tranh chap', dispute });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

// [USER] PATCH /api/disputes/:id/withdraw - Nguoi dung tu rut khieu nai
exports.withdrawDispute = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Ma tranh chap khong hop le' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ message: 'Khong tim thay su co' });
    }

    if (dispute.reporterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chi nguoi tao bao cao moi co quyen rut khieu nai.' });
    }

    if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
      return res.status(400).json({ message: 'Su co nay da duoc xu ly hoac da duoc rut, khong the rut.' });
    }

    const rental = await Rental.findById(dispute.rentalId);
    if (!rental) {
      return res.status(404).json({ message: 'Khong tim thay don thue' });
    }

    const item = await Item.findById(rental.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Khong tim thay tai san cua don thue' });
    }

    const restored = getRestoreStatuses(dispute, rental);

    // Rut khieu nai phai dua rental/item thoat DISPUTED theo snapshot da luu.
    dispute.status = DisputeStatus.WITHDRAWN;
    dispute.adminDecision = 'Nguoi khieu nai da rut don. Giao dich duoc khoi phuc ve trang thai truoc tranh chap.';
    await dispute.save();

    await Rental.findByIdAndUpdate(rental._id, { status: restored.rentalStatus });
    await Item.findByIdAndUpdate(item._id, { status: restored.itemStatus });

    res.status(200).json({
      message: `Da rut khieu nai. Trang thai don thue: ${restored.rentalStatus}, trang thai item: ${restored.itemStatus}`,
      dispute
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};
