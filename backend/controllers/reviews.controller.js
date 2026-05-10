// backend/controllers/reviews.controller.js
const Review = require('../models/Review.model');
const Rental = require('../models/Rental.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');

// --- HÀM HELPER: CHẠY AGGREGATION TÍNH ĐIỂM (Tái sử dụng) ---
const updateTrustScore = async (userId) => {
  // Chỉ tính điểm những bài đánh giá đã isPublic = true
  const stats = await Review.aggregate([
    { $match: { revieweeId: userId, isPublic: true } },
    { $group: { _id: '$revieweeId', averageRating: { $avg: '$rating' }, numOfReviews: { $sum: 1 } } }
  ]);

  if (stats.length > 0) {
    const newTrustScore = Math.round(stats[0].averageRating * 10) / 10;
    const newTotalReviews = stats[0].numOfReviews;
    await User.findByIdAndUpdate(userId, { trustScore: newTrustScore, totalReviews: newTotalReviews });
    console.log(`[DEBUG] ✔️ Đã cập nhật điểm cho User ${userId}: ${newTrustScore} sao / ${newTotalReviews} đánh giá.`);
  }
};

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

    // Giới hạn 7 ngày
    const diffDays = Math.ceil(Math.abs(new Date() - new Date(rental.updatedAt)) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      return res.status(400).json({ message: 'Đã hết hạn đánh giá (chỉ cho phép trong 7 ngày)' });
    }

    let revieweeId = rental.renterId.equals(reviewerId) ? rental.ownerId : 
                     (rental.ownerId.equals(reviewerId) ? rental.renterId : null);
    if (!revieweeId) return res.status(403).json({ message: 'Bạn không thuộc đơn thuê này' });

    // =======================================================
    // NGHIỆP VỤ UY TÍN: KIỂM TRA ĐÁNH GIÁ MÙ (BLIND REVIEW)
    // =======================================================
    // Xem đối phương đã đánh giá mình trước đó chưa?
    const counterpartReview = await Review.findOne({
      rentalId: rentalId,
      reviewerId: revieweeId // Người đánh giá là đối phương
    });

    // Nếu đối phương ĐÃ đánh giá -> Mở khóa hiển thị (true)
    // Nếu đối phương CHƯA đánh giá -> Tạm ẩn (false)
    const isPublicNow = counterpartReview ? true : false;

    // Lưu đánh giá của mình
    const myReview = await Review.create({
      rentalId, reviewerId, revieweeId, rating, comment,
      isPublic: isPublicNow
    });

    if (isPublicNow) {
      console.log('[DEBUG] 🔓 BÊN KIA ĐÃ ĐÁNH GIÁ -> MỞ KHÓA CẢ 2 BÀI ĐÁNH GIÁ!');
      // 1. Mở khóa bài đánh giá của đối phương
      await Review.findByIdAndUpdate(counterpartReview._id, { isPublic: true });

      // 2. Tính lại điểm cho cả 2 người cùng 1 lúc
      await updateTrustScore(revieweeId); // Tính điểm cho người bị mình đánh giá
      await updateTrustScore(reviewerId); // Tính điểm cho mình (do bài đối phương vừa mở khóa)

      res.status(201).json({ message: 'Đánh giá thành công! Cả 2 đánh giá đã được hiển thị công khai.', review: myReview });
    } else {
      console.log('[DEBUG] 🔒 BÊN KIA CHƯA ĐÁNH GIÁ -> ẨN BÀI ĐÁNH GIÁ NÀY ĐI.');
      res.status(201).json({ message: 'Đánh giá đã được ghi nhận và đang tạm ẩn. Đánh giá sẽ công khai khi đối phương đánh giá lại bạn.', review: myReview });
    }

  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Bạn đã đánh giá đơn này rồi!' });
    console.error('[DEBUG] ❌ LỖI:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};

// GET /api/reviews/users/:userId?page=1&limit=5
exports.getUserReviews = async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 5;
  const skip = (page - 1) * limit;

  if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'User ID không hợp lệ' });

  try {
    let user = await User.findById(userId).select('trustScore totalReviews');
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });

    // =======================================================================
    // THUẬT TOÁN "LAZY EVALUATION": TỰ ĐỘNG CÔNG KHAI ĐÁNH GIÁ QUÁ HẠN 7 NGÀY
    // =======================================================================
    // 1. Tính mốc thời gian 7 ngày trước so với hiện tại
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 2. Tìm những bài đánh giá nhắm vào user này, ĐANG BỊ ẨN, và ĐÃ VIẾT QUÁ 7 NGÀY
    const expiredHiddenReviews = await Review.find({
      revieweeId: userId,
      isPublic: false,
      createdAt: { $lte: sevenDaysAgo }
    });

    // 3. Nếu phát hiện thằng này có bài đánh giá ẩn quá hạn -> ÉP CÔNG KHAI!
    if (expiredHiddenReviews.length > 0) {
      console.log(`[DEBUG] ⏰ Phát hiện ${expiredHiddenReviews.length} đánh giá quá 7 ngày chưa được phản hồi. TIẾN HÀNH ÉP CÔNG KHAI!`);
      
      // Update tất cả các bài đó thành isPublic = true
      const expiredIds = expiredHiddenReviews.map(r => r._id);
      await Review.updateMany(
        { _id: { $in: expiredIds } },
        { $set: { isPublic: true } }
      );

      // Gọi lại hàm tính điểm để cập nhật điểm mới cho thằng chủ đồ
      await updateTrustScore(userId);

      // Truy vấn lại thông tin user để lấy điểm số vừa mới rớt
      user = await User.findById(userId).select('trustScore totalReviews');
    }
    // =======================================================================

    // LẤY DANH SÁCH BÀI ĐÁNH GIÁ ĐÃ CÔNG KHAI (Bao gồm cả những bài vừa bị ép công khai ở trên)
    const reviews = await Review.find({ revieweeId: userId, isPublic: true })
      .populate('reviewerId', 'fullName avatarUrl')
      .populate('rentalId', 'startDate endDate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      trustScore: user.trustScore,
      totalReviews: user.totalReviews,
      pagination: { currentPage: page, limitPerPage: limit, hasMore: user.totalReviews > (page * limit) },
      reviews
    });

  } catch (error) {
    console.error('[DEBUG] ❌ LỖI:', error);
    res.status(500).json({ message: 'Lỗi hệ thống', error: error.message });
  }
};