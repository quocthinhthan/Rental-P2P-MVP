const mongoose = require('mongoose');
const User = require('../models/User.model');
const Review = require('../models/Review.model');
const Item = require('../models/Item.model');
const { ItemStatus } = require('../enums/item.enum');
const {
  getTrustLevelFromScore,
  toSafeUserTrustSummary
} = require('../services/trustScore.service');

const parseLimit = (value, defaultValue = 10, max = 50) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, max);
};

exports.getPublicUserProfile = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'User ID khong hop le' });
  }

  try {
    const user = await User.findById(id)
      .select('_id fullName avatarUrl createdAt ekycStatus averageRating totalReviews trustScore');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reviewLimit = parseLimit(req.query.reviewLimit);
    const [publicReviews, ownerItems] = await Promise.all([
      Review.find({ revieweeId: id, isPublic: true })
        .sort({ createdAt: -1 })
        .limit(reviewLimit)
        .select('_id rating comment createdAt reviewerId rentalId')
        .populate('reviewerId', '_id fullName avatarUrl'),
      Item.find({ ownerId: id, status: { $ne: ItemStatus.DELISTED } })
        .sort({ createdAt: -1 })
        .select('_id code name category images pricePerDay address status createdAt')
    ]);

    const trustSummary = toSafeUserTrustSummary(user);

    return res.status(200).json({
      ...trustSummary,
      createdAt: user.createdAt,
      trustLevel: getTrustLevelFromScore(trustSummary.trustScore),
      publicReviews,
      ownerItems: ownerItems.map((item) => ({
        _id: item._id,
        code: item.code,
        name: item.name,
        category: item.category,
        pricePerDay: item.pricePerDay,
        address: item.address,
        status: item.status,
        mainImage: item.images?.[0] || '',
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
