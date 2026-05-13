const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');
const Review = require('../models/Review.model');
const MESSAGES = require('../constants/messages.constant');
const { ItemStatus } = require('../enums/item.enum');
const { RentalStatus } = require('../enums/rental.enum');
const mongoose = require('mongoose');

// GET /api/views/item-details/:id
exports.getItemDetailView = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: MESSAGES.COMMON.INVALID_ITEM_ID });
  }

  try {
    const item = await Item.findById(req.params.id)
      .populate('ownerId', 'fullName avatarUrl phoneNumber _id'); 

    if (!item) {
      return res.status(404).json({ message: MESSAGES.ITEM.NOT_FOUND });
    }
    
    // Tìm các đơn thuê đã được xác nhận/đang thuê/chờ xác nhận của vật phẩm này trong tương lai
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

    const viewData = {
        _id: item._id,
        name: item.name,
        description: item.description,
        category: item.category, // Bổ sung category
        status: item.status,     // Bổ sung status
        images: item.images,
        pricePerDay: item.pricePerDay,
        baseValue: item.baseValue,
        depositPercentage: item.depositPercentage,
        address: item.address,
        owner: item.ownerId,
        bookedDates: confirmedRentals 
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
          select: '_id name pricePerDay images' // Lấy mảng images
      })
      .populate({ // Lấy thông tin chủ sở hữu (owner)
          path: 'ownerId',
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
          select: '_id name pricePerDay images' // Lấy mảng images
      })
      .populate({ // Lấy thông tin người thuê (renter)
          path: 'renterId',
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

    // 4. Hàm helper để định dạng lại rental
    const formatRentalDetail = (rental, counterparty) => {
        // Rào chắn nếu item bị null (do đã bị xóa)
        const itemSummary = rental.itemId ? {
            _id: rental.itemId._id,
            name: rental.itemId.name,
            pricePerDay: rental.itemId.pricePerDay,
            mainImage: (rental.itemId.images && rental.itemId.images.length > 0) ? rental.itemId.images[0] : ''
        } : null;
        const rentalKey = rental._id.toString();
        const reviewerKey = userId.toString();
        const counterpartyKey = counterparty?._id?.toString();
        const myReview = reviewByRentalAndReviewer[`${rentalKey}:${reviewerKey}`] || null;
        const counterpartyReview = counterpartyKey
          ? reviewByRentalAndReviewer[`${rentalKey}:${counterpartyKey}`] || null
          : null;
        const reviewStatus = !myReview
          ? 'not_reviewed'
          : (counterpartyReview || myReview.isPublic ? 'completed' : 'waiting_counterparty');

        return {
            _id: rental._id,
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
            item: itemSummary,
            counterparty: counterparty,
            review: {
              status: reviewStatus,
              hasMyReview: Boolean(myReview),
              hasCounterpartyReview: Boolean(counterpartyReview),
              isPublic: Boolean(myReview?.isPublic),
              myReview: myReview ? {
                _id: myReview._id,
                rating: myReview.rating,
                comment: myReview.comment,
                isPublic: myReview.isPublic,
                createdAt: myReview.createdAt
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
