// backend/controllers/reviews.controller.js
const Review = require('../models/Review.model');
const Rental = require('../models/Rental.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const {
  recalculateUserTrustScore,
  getTrustLevelFromScore
} = require('../services/trustScore.service');

// POST /api/reviews
exports.createReview = async (req, res) => {
  console.log('\n[DEBUG] >>> BẮT ĐẦU TẠO ĐÁNH GIÁ (DOUBLE-BLIND)');
  const { rentalId, rating, comment } = req.body;
  const reviewerId = req.user._id;

  try {
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    if (rental.status !== 'completed') {
      return res.status(400).json({ message: 'Chỉ được đánh giá khi đơn đã hoàn thành' });
    }

    const diffDays = Math.ceil(Math.abs(new Date() - new Date(rental.updatedAt)) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      return res.status(400).json({ message: 'Đã hết hạn đánh giá (chỉ cho phép trong 7 ngày)' });
    }

    const revieweeId = rental.renterId.equals(reviewerId)
      ? rental.ownerId
      : (rental.ownerId.equals(reviewerId) ? rental.renterId : null);
    if (!revieweeId) return res.status(403).json({ message: 'Bạn không thuộc đơn thuê này' });

    const counterpartReview = await Review.findOne({
      rentalId,
      reviewerId: revieweeId
    });

    const isPublicNow = Boolean(counterpartReview);

    const myReview = await Review.create({
      rentalId,
      reviewerId,
      revieweeId,
      rating,
      comment,
      isPublic: isPublicNow
    });

    if (isPublicNow) {
      console.log('[DEBUG] BÊN KIA ĐÃ ĐÁNH GIÁ -> MỞ KHÓA CẢ 2 BÀI ĐÁNH GIÁ');
      await Review.findByIdAndUpdate(counterpartReview._id, { isPublic: true });

      await Promise.all([
        recalculateUserTrustScore(revieweeId),
        recalculateUserTrustScore(reviewerId)
      ]);

      return res.status(201).json({
        message: 'Đánh giá thành công! Cả 2 đánh giá đã được hiển thị công khai.',
        review: myReview
      });
    }

    console.log('[DEBUG] BÊN KIA CHƯA ĐÁNH GIÁ -> TẠM ẨN BÀI ĐÁNH GIÁ NÀY');
    return res.status(201).json({
      message: 'Đánh giá đã được ghi nhận và đang tạm ẩn. Đánh giá sẽ công khai khi đối phương đánh giá lại bạn.',
      review: myReview
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Bạn đã đánh giá đơn này rồi!' });
    console.error('[DEBUG] LỖI:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

// GET /api/reviews/users/:userId?page=1&limit=5
exports.getUserReviews = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 5;
  const skip = (page - 1) * limit;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'User ID không hợp lệ' });
  }

  try {
    let user = await User.findById(userId).select('trustScore averageRating totalReviews');
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const expiredHiddenReviews = await Review.find({
      revieweeId: userId,
      isPublic: false,
      createdAt: { $lte: sevenDaysAgo }
    });

    if (expiredHiddenReviews.length > 0) {
      console.log(`[DEBUG] Tự động công khai ${expiredHiddenReviews.length} đánh giá ẩn quá 7 ngày`);

      const expiredIds = expiredHiddenReviews.map((review) => review._id);
      await Review.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { isPublic: true } }
      );

      await recalculateUserTrustScore(userId);
      user = await User.findById(userId).select('trustScore averageRating totalReviews');
    }

    const reviews = await Review.find({ revieweeId: userId, isPublic: true })
      .populate('reviewerId', 'fullName avatarUrl')
      .populate('rentalId', 'startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      trustScore: user.trustScore,
      trustLevel: getTrustLevelFromScore(user.trustScore),
      averageRating: user.averageRating || 0,
      totalReviews: user.totalReviews,
      pagination: {
        currentPage: page,
        limitPerPage: limit,
        hasMore: user.totalReviews > (page * limit)
      },
      reviews
    });
  } catch (error) {
    console.error('[DEBUG] LỖI:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};
