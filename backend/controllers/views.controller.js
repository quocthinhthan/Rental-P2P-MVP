const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');
const mongoose = require('mongoose');

// GET /api/views/item-details/:id
exports.getItemDetailView = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
     return res.status(400).json({ message: 'Invalid Item ID' });
  }

  try {
    const item = await Item.findById(req.params.id)
      .populate('ownerId', 'fullName avatarUrl _id'); 

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Tìm các đơn thuê đã được xác nhận của vật phẩm này trong tương lai
    const confirmedRentals = await Rental.find({ 
        itemId: req.params.id, 
        status: 'confirmed',
        endDate: { $gte: new Date() } 
    }).select('startDate endDate');

    const viewData = {
        _id: item._id,
        name: item.name,
        description: item.description,
        images: item.images,
        pricePerDay: item.pricePerDay,
        address: item.address,
        owner: item.ownerId,
        bookedDates: confirmedRentals // Thêm mảng này vào response
    };

    res.status(200).json(viewData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
      status: { $ne: 'pending_payment' }
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
    
    // 3. Hàm helper để định dạng lại
    const formatRentalDetail = (rental, counterparty) => {
        // Rào chắn nếu item bị null (do đã bị xóa)
        const itemSummary = rental.itemId ? {
            _id: rental.itemId._id,
            name: rental.itemId.name,
            pricePerDay: rental.itemId.pricePerDay,
            mainImage: (rental.itemId.images && rental.itemId.images.length > 0) ? rental.itemId.images[0] : ''
        } : null;

        return {
            _id: rental._id,
            startDate: rental.startDate,
            endDate: rental.endDate,
            totalPrice: rental.totalPrice,
            escrowAmount: rental.escrowAmount,
            paymentStatus: rental.paymentStatus,
            status: rental.status,
            note: rental.note, // >>> SỬA: Thêm trường note vào đây
            item: itemSummary,
            counterparty: counterparty
        };
    };

    // 4. Trả về kết quả
    res.status(200).json({
      asRenter: asRenter.map(r => formatRentalDetail(r, r.ownerId)),
      asOwner: asOwner.map(r => formatRentalDetail(r, r.renterId)),
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
