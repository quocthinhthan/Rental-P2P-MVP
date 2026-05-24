// backend/controllers/favorites.controller.js
'use strict';

const mongoose = require('mongoose');
const User = require('../models/User.model');
const Item = require('../models/Item.model');

const MAX_FAVORITES = 100;

/**
 * GET /api/users/me/favorites
 * Returns the authenticated user's favorite items (populated summaries).
 */
exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('favorites')
      .populate({
        path: 'favorites',
        match: { status: { $ne: 'delisted' } }, // hide delisted items silently
        select: '_id code name category address pricePerDay images status isFeatured ownerId',
        populate: {
          path: 'ownerId',
          select: '_id fullName avatarUrl trustScore averageRating totalReviews ekycStatus'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Format to same shape used by ItemCard
    const items = (user.favorites || []).map(item => ({
      _id:         item._id,
      code:        item.code,
      name:        item.name,
      category:    item.category,
      address:     item.address,
      pricePerDay: item.pricePerDay,
      status:      item.status,
      isFeatured:  item.isFeatured,
      mainImage:   item.images?.[0] || '',
      owner:       item.ownerId || null
    }));

    res.status(200).json(items);
  } catch (error) {
    console.error('[FAVORITES] getFavorites error:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách yêu thích' });
  }
};

/**
 * POST /api/users/me/favorites/:itemId
 * Add an item to favorites (idempotent — safe to call repeatedly).
 * Returns { isFavorited: true, totalFavorites: N }
 */
exports.addFavorite = async (req, res) => {
  const { itemId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Item ID không hợp lệ' });
  }

  try {
    // Verify item exists and is not delisted
    const item = await Item.findOne({ _id: itemId, status: { $ne: 'delisted' } }).select('_id');
    if (!item) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại hoặc đã bị gỡ' });
    }

    const user = await User.findById(req.user._id).select('favorites');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const alreadyFavorited = user.favorites.some(id => id.equals(itemId));

    if (alreadyFavorited) {
      return res.status(200).json({
        isFavorited:    true,
        totalFavorites: user.favorites.length,
        message:        'Sản phẩm đã có trong danh sách yêu thích'
      });
    }

    if (user.favorites.length >= MAX_FAVORITES) {
      return res.status(400).json({
        message: `Danh sách yêu thích tối đa ${MAX_FAVORITES} sản phẩm. Vui lòng xóa bớt trước khi thêm.`
      });
    }

    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: itemId } }, // $addToSet prevents duplicates at DB level too
      { new: false }
    );

    res.status(200).json({
      isFavorited:    true,
      totalFavorites: user.favorites.length + 1,
      message:        'Đã thêm vào danh sách yêu thích'
    });
  } catch (error) {
    console.error('[FAVORITES] addFavorite error:', error);
    res.status(500).json({ message: 'Lỗi server khi thêm yêu thích' });
  }
};

/**
 * DELETE /api/users/me/favorites/:itemId
 * Remove an item from favorites (idempotent).
 * Returns { isFavorited: false, totalFavorites: N }
 */
exports.removeFavorite = async (req, res) => {
  const { itemId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: 'Item ID không hợp lệ' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: new mongoose.Types.ObjectId(itemId) } },
      { new: true, select: 'favorites' }
    );

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    res.status(200).json({
      isFavorited:    false,
      totalFavorites: user.favorites.length,
      message:        'Đã xóa khỏi danh sách yêu thích'
    });
  } catch (error) {
    console.error('[FAVORITES] removeFavorite error:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa yêu thích' });
  }
};
