const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');
const Review = require('../models/Review.model');
const Dispute = require('../models/Dispute.model');
const Contract = require('../models/Contract.model');
const User = require('../models/User.model');
const MESSAGES = require('../constants/messages.constant');
const { ItemStatus } = require('../enums/item.enum');
const { RentalStatus } = require('../enums/rental.enum');
const mongoose = require('mongoose');
const {
  getTrustLevelFromScore,
  toSafeUserTrustSummary
} = require('../services/trustScore.service');

// GET /api/views/item-details/:id
exports.getItemDetailView = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: MESSAGES.COMMON.INVALID_ITEM_ID });
  }

  try {
    const item = await Item.findById(req.params.id)
      .populate('ownerId', 'fullName avatarUrl phoneNumber _id ekycStatus averageRating totalReviews trustScore');

    if (!item) {
      return res.status(404).json({ message: MESSAGES.ITEM.NOT_FOUND });
    }

    // Active rentals that block the calendar
    const activeRentalStatuses = [
      RentalStatus.CONFIRMED,
      RentalStatus.IN_PROGRESS,
      RentalStatus.PENDING_CONFIRMATION
    ];
    const confirmedRentals = await Rental.find({
      itemId: req.params.id,
      status: { $in: activeRentalStatuses },
      endDate: { $gte: new Date() }
    }).select('startDate endDate');

    // isFavorited — check only when caller is authenticated
    let isFavorited = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id).select('favorites');
        if (currentUser) {
          isFavorited = currentUser.favorites.some(id => id.equals(item._id));
        }
      } catch (_) {
        // token invalid or expired — treat as unauthenticated, isFavorited stays false
      }
    }

    const hasMapLocation = (
      item.location &&
      Array.isArray(item.location.coordinates) &&
      item.location.coordinates.length === 2
    );

    // Filter out past blocked dates to keep payload lean
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingBlockedDates = (item.blockedDates || []).filter(
      b => new Date(b.endDate) >= today
    );

    const viewData = {
      _id:               item._id,
      code:              item.code,
      name:              item.name,
      description:       item.description,
      category:          item.category,
      status:            item.status,
      isFeatured:        item.isFeatured,
      images:            item.images,
      pricePerDay:       item.pricePerDay,
      baseValue:         item.baseValue,
      depositPercentage: item.depositPercentage,
      address:           item.address,
      mapLocation: hasMapLocation ? {
        lng: item.location.coordinates[0],
        lat: item.location.coordinates[1]
      } : null,
      owner: item.ownerId ? {
        ...toSafeUserTrustSummary(item.ownerId),
        phoneNumber: item.ownerId.phoneNumber
      } : null,
      bookedDates:      confirmedRentals,
      blockedDates:     upcomingBlockedDates,
      isFavorited
    };

    res.status(200).json(viewData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR });
  }
};

// GET /api/views/my-rentals
exports.getMyRentalsView = async (req, res) => {
  const userId = req.user._id; // Lấy từ middleware 'protect'

  try {
    // 1. Lấy các đơn tôi là người thuê (asRenter)
    const asRenter = await Rental.find({ renterId: userId })
      .sort({ createdAt: -1 }) // >>> THÊM: Sắp xếp kết quả mới nhất lên đầu
      .populate({ // Populate vật phẩm
          path: 'itemId',
          select: '_id code name pricePerDay images' // Lấy mảng images
      })
      .populate({ // Lấy thông tin chủ sở hữu (owner)
          path: 'ownerId',
          select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      })
      .populate({
          path: 'renterId',
          select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      })
      .populate({
          path: 'cancelledBy',
          select: '_id fullName email'
      });

    // 2. Lấy các đơn tôi là chủ (asOwner)
    const asOwner = await Rental.find({
      ownerId: userId,
      status: { $ne: RentalStatus.PENDING_PAYMENT }
    })
      .sort({ createdAt: -1 }) // >>> THÊM: Sắp xếp kết quả mới nhất lên đầu
      .populate({ // Populate vật phẩm
          path: 'itemId',
          select: '_id code name pricePerDay images' // Lấy mảng images
      })
      .populate({ // Lấy thông tin người thuê (renter)
          path: 'renterId',
          select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      })
      .populate({
          path: 'ownerId',
          select: '_id fullName email avatarUrl ekycStatus averageRating totalReviews trustScore'
      })
      .populate({
          path: 'cancelledBy',
          select: '_id fullName email'
      });
    
    // 3. Lấy các vật phẩm tôi đã đăng (myItems)
    const myItems = await Item.find({ ownerId: userId, status: { $ne: ItemStatus.DELISTED } })
      .sort({ createdAt: -1 });

    const rentalIds = [...asRenter, ...asOwner].map((rental) => rental._id);
    const relatedReviews = await Review.find({ rentalId: { $in: rentalIds } })
      .select('_id rentalId reviewerId revieweeId rating comment isPublic createdAt');
    const reviewByRentalAndReviewer = relatedReviews.reduce((acc, review) => {
      acc[`${review.rentalId.toString()}:${review.reviewerId.toString()}`] = review;
      return acc;
    }, {});
    const relatedContracts = await Contract.find({ rentalId: { $in: rentalIds } })
      .select('_id rentalId ownerSignedAt renterSignedAt ownerSignatureUrl renterSignatureUrl isFullySigned createdAt updatedAt');
    const contractByRental = relatedContracts.reduce((acc, contract) => {
      acc[contract.rentalId.toString()] = contract;
      return acc;
    }, {});
    const relatedDisputes = await Dispute.find({ rentalId: { $in: rentalIds } })
      .sort({ createdAt: -1 })
      .select('_id rentalId reporterId reason evidenceImages status previousRentalStatus previousItemStatus mediationEndsAt escalatedAt escalatedBy winner penaltyType penalizeUserId adminDecision resolvedAt resolvedBy createdAt updatedAt')
      .populate('reporterId', '_id fullName email')
      .populate('penalizeUserId', '_id fullName email')
      .populate('escalatedBy', '_id fullName email')
      .populate('resolvedBy', '_id fullName email');
    const disputeByRental = relatedDisputes.reduce((acc, dispute) => {
      const rentalKey = dispute.rentalId.toString();
      if (!acc[rentalKey]) {
        acc[rentalKey] = dispute;
      }
      return acc;
    }, {});

    const formatDisputeDetail = (dispute) => {
      if (!dispute) return null;

      return {
        _id: dispute._id,
        rentalId: dispute.rentalId,
        reporterId: dispute.reporterId,
        reason: dispute.reason,
        evidenceImages: dispute.evidenceImages || [],
        status: dispute.status,
        previousRentalStatus: dispute.previousRentalStatus,
        previousItemStatus: dispute.previousItemStatus,
        mediationEndsAt: dispute.mediationEndsAt,
        escalatedAt: dispute.escalatedAt,
        escalatedBy: dispute.escalatedBy,
        winner: dispute.winner,
        penaltyType: dispute.penaltyType,
        penalizeUserId: dispute.penalizeUserId,
        adminDecision: dispute.adminDecision,
        resolvedAt: dispute.resolvedAt,
        resolvedBy: dispute.resolvedBy,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt
      };
    };

    const formatCounterparty = (counterparty) => {
      if (!counterparty) return null;
      if (!counterparty.fullName) return null;

      const trustScore = typeof counterparty.trustScore === 'number' ? counterparty.trustScore : 50;

      return {
        _id: counterparty._id,
        fullName: counterparty.fullName,
        email: counterparty.email,
        avatarUrl: counterparty.avatarUrl || '',
        ekycStatus: counterparty.ekycStatus,
        averageRating: counterparty.averageRating || 0,
        totalReviews: counterparty.totalReviews || 0,
        trustScore,
        trustLevel: getTrustLevelFromScore(trustScore)
      };
    };

    // 4. Hàm helper để định dạng lại rental
    const formatRentalDetail = (rental, counterparty) => {
        // Rào chắn nếu item bị null (do đã bị xóa)
        const itemSummary = rental.itemId ? {
            _id: rental.itemId._id,
            code: rental.itemId.code,
            name: rental.itemId.name,
            pricePerDay: rental.itemId.pricePerDay,
            mainImage: (rental.itemId.images && rental.itemId.images.length > 0) ? rental.itemId.images[0] : ''
        } : null;
        const rentalKey = rental._id.toString();
        const reviewerKey = userId.toString();
        const counterpartySummary = formatCounterparty(counterparty);
        const renterSummary = formatCounterparty(rental.renterId);
        const ownerSummary = formatCounterparty(rental.ownerId);
        const counterpartyKey = counterpartySummary?._id?.toString();
        const myReview = reviewByRentalAndReviewer[`${rentalKey}:${reviewerKey}`] || null;
        const counterpartyReview = counterpartyKey
          ? reviewByRentalAndReviewer[`${rentalKey}:${counterpartyKey}`] || null
          : null;
        const reviewStatus = !myReview
          ? 'not_reviewed'
          : (counterpartyReview || myReview.isPublic ? 'completed' : 'waiting_counterparty');
        const visibleCounterpartyReview = myReview && counterpartyReview ? counterpartyReview : null;
        const dispute = disputeByRental[rentalKey] || null;
        const contract = contractByRental[rentalKey] || null;

        return {
            _id: rental._id,
            code: rental.code,
            startDate: rental.startDate,
            endDate: rental.endDate,
          rentalFee: rental.rentalFee,
          depositAmount: rental.depositAmount,
          totalAmount: rental.totalAmount,
          commissionRate: rental.commissionRate,
          commissionAmount: rental.commissionAmount,
          payoutAmount: rental.payoutAmount,
            paymentStatus: rental.paymentStatus,
            status: rental.status,
            note: rental.note,
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
            extensionRequest: rental.extensionRequest || null,
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
            counterparty: counterpartySummary,
            renter: renterSummary,
            owner: ownerSummary,
            dispute: formatDisputeDetail(dispute),
            review: {
              status: reviewStatus,
              hasMyReview: Boolean(myReview),
              hasCounterpartyReview: Boolean(visibleCounterpartyReview),
              isPublic: Boolean(myReview?.isPublic),
              myReview: myReview ? {
                _id: myReview._id,
                rating: myReview.rating,
                comment: myReview.comment,
                isPublic: myReview.isPublic,
                createdAt: myReview.createdAt
              } : null,
              counterpartyReview: visibleCounterpartyReview ? {
                _id: visibleCounterpartyReview._id,
                rating: visibleCounterpartyReview.rating,
                comment: visibleCounterpartyReview.comment,
                isPublic: visibleCounterpartyReview.isPublic,
                createdAt: visibleCounterpartyReview.createdAt
              } : null
            }
        };
    };

    // 5. Trả về kết quả
    res.status(200).json({
      asRenter: asRenter.map(r => formatRentalDetail(r, r.ownerId)),
      asOwner: asOwner.map(r => formatRentalDetail(r, r.renterId)),
      myItems: myItems.map(item => ({
          _id: item._id,
          code: item.code,
          name: item.name,
          pricePerDay: item.pricePerDay,
          category: item.category,
          status: item.status,
          mainImage: (item.images && item.images.length > 0) ? item.images[0] : ''
      }))
    });

  } catch (error) {
    res.status(500).json({ message: MESSAGES.COMMON.SERVER_ERROR, error: error.message });
  }
};
