const mongoose = require('mongoose');
const User = require('../models/User.model');
const Review = require('../models/Review.model');
const Rental = require('../models/Rental.model');
const Dispute = require('../models/Dispute.model');
const Item = require('../models/Item.model');
const ItemReport = require('../models/ItemReport.model');
const { RentalStatus } = require('../enums/rental.enum');
const { DisputeStatus, PenaltyType } = require('../enums/dispute.enum');
const { ItemReportStatus, ItemReportAction } = require('../models/ItemReport.model');

const BASE_SCORE = 50;
const SUSPENDED_SCORE_CAP = 40;

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

const toObjectId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return new mongoose.Types.ObjectId(userId);
};

const getTrustLevelFromScore = (score) => {
  const normalizedScore = clampScore(score || 0);

  if (normalizedScore >= 90) return 'very_high';
  if (normalizedScore >= 75) return 'high';
  if (normalizedScore >= 60) return 'medium';
  if (normalizedScore >= 40) return 'new_or_limited';
  if (normalizedScore >= 20) return 'low';
  return 'very_low';
};

const getUserRatingSummary = async (userId) => {
  const objectId = toObjectId(userId);
  if (!objectId) {
    return { averageRating: 0, totalReviews: 0 };
  }

  const stats = await Review.aggregate([
    { $match: { revieweeId: objectId, isPublic: true } },
    {
      $group: {
        _id: '$revieweeId',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (!stats.length) {
    return { averageRating: 0, totalReviews: 0 };
  }

  return {
    averageRating: Math.round(stats[0].averageRating * 10) / 10,
    totalReviews: stats[0].totalReviews
  };
};

const getEkycScore = (ekycStatus) => {
  if (ekycStatus === 'verified') return 20;
  if (ekycStatus === 'rejected') return -10;
  return 0;
};

const getReviewScore = (averageRating, totalReviews) => {
  if (!totalReviews) return 0;
  if (averageRating >= 4.8) return 10;
  if (averageRating >= 4.5) return 7;
  if (averageRating >= 4.0) return 4;
  if (averageRating >= 3.5) return 0;
  if (averageRating >= 3.0) return -5;
  return -10;
};

const getDisputePenalty = async (userId) => {
  const resolvedPenalties = await Dispute.find({
    status: DisputeStatus.RESOLVED,
    penalizeUserId: userId,
    penaltyType: { $ne: PenaltyType.NONE }
  }).select('penaltyType');

  return resolvedPenalties.reduce((result, dispute) => {
    if (dispute.penaltyType === PenaltyType.BAN) {
      result.hasBanPenalty = true;
      return result;
    }
    if (dispute.penaltyType === PenaltyType.SUSPENSION) {
      result.penalty += 30;
      return result;
    }
    if (dispute.penaltyType === PenaltyType.WARNING) {
      result.penalty += 15;
    }
    return result;
  }, { penalty: 0, hasBanPenalty: false });
};

const getItemReportPenalty = async (userId) => {
  const ownerItemIds = await Item.distinct('_id', { ownerId: userId });
  if (!ownerItemIds.length) {
    return 0;
  }

  const reports = await ItemReport.find({
    itemId: { $in: ownerItemIds },
    status: ItemReportStatus.RESOLVED,
    action: { $ne: ItemReportAction.NO_ACTION }
  }).select('action');

  return reports.reduce((penalty, report) => {
    if (report.action === ItemReportAction.WARN_OWNER) return penalty + 10;
    if (report.action === ItemReportAction.BAN_ITEM) return penalty + 25;
    if ([ItemReportAction.HIDE_ITEM, ItemReportAction.DELIST_ITEM].includes(report.action)) {
      return penalty + 15;
    }
    return penalty;
  }, 0);
};

const calculateUserTrustScore = async (userId) => {
  const objectId = toObjectId(userId);
  if (!objectId) {
    return null;
  }

  const user = await User.findById(objectId).select('ekycStatus isBanned suspendedUntil');
  if (!user) {
    return null;
  }

  const [
    ratingSummary,
    completedRentalCount,
    disputePenalty,
    itemReportPenalty
  ] = await Promise.all([
    getUserRatingSummary(objectId),
    Rental.countDocuments({
      status: RentalStatus.COMPLETED,
      $or: [{ renterId: objectId }, { ownerId: objectId }]
    }),
    getDisputePenalty(objectId),
    getItemReportPenalty(objectId)
  ]);

  if (user.isBanned || disputePenalty.hasBanPenalty) {
    return {
      trustScore: 0,
      trustLevel: getTrustLevelFromScore(0),
      averageRating: ratingSummary.averageRating,
      totalReviews: ratingSummary.totalReviews
    };
  }

  const completedRentalScore = Math.min(completedRentalCount * 2, 20);
  let score = BASE_SCORE
    + getEkycScore(user.ekycStatus)
    + completedRentalScore
    + getReviewScore(ratingSummary.averageRating, ratingSummary.totalReviews)
    - disputePenalty.penalty
    - itemReportPenalty;

  if (user.suspendedUntil && new Date() < new Date(user.suspendedUntil)) {
    score = Math.min(score, SUSPENDED_SCORE_CAP);
  }

  const trustScore = clampScore(score);

  return {
    trustScore,
    trustLevel: getTrustLevelFromScore(trustScore),
    averageRating: ratingSummary.averageRating,
    totalReviews: ratingSummary.totalReviews
  };
};

const recalculateUserTrustScore = async (userId) => {
  const result = await calculateUserTrustScore(userId);
  if (!result) {
    return null;
  }

  return User.findByIdAndUpdate(
    userId,
    {
      trustScore: result.trustScore,
      averageRating: result.averageRating,
      totalReviews: result.totalReviews
    },
    {
      new: true,
      runValidators: true
    }
  ).select('_id fullName avatarUrl ekycStatus averageRating totalReviews trustScore isBanned suspendedUntil');
};

const toSafeUserTrustSummary = (user) => {
  if (!user) return null;

  const trustScore = typeof user.trustScore === 'number' ? user.trustScore : BASE_SCORE;

  return {
    _id: user._id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl || '',
    ekycStatus: user.ekycStatus,
    averageRating: user.averageRating || 0,
    totalReviews: user.totalReviews || 0,
    trustScore,
    trustLevel: getTrustLevelFromScore(trustScore)
  };
};

module.exports = {
  getUserRatingSummary,
  calculateUserTrustScore,
  recalculateUserTrustScore,
  getTrustLevelFromScore,
  toSafeUserTrustSummary
};
