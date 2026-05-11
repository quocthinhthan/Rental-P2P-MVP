// backend/controllers/items.controller.js
const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');

// GET /api/items?search=...&category=...&address=...&startDate=...&endDate=...
const searchItems = async (req, res) => {
  try {
    const { search, category, address, startDate, endDate, ownerId, exclude } = req.query;

    let query = { status: { $ne: 'delisted' } };

    // Lọc theo Chủ sở hữu
    if (ownerId) {
      query.ownerId = ownerId;
    }

    // Loại trừ vật phẩm cụ thể (Ví dụ: loại trừ chính nó khi lấy "Sản phẩm liên quan")
    if (exclude) {
      query._id = { ...query._id, $ne: exclude };
    }

    // Lọc theo Tên (Tìm gần đúng, không dấu, không hoa thường)
    if (search) {
      query.name = { $regex: createViFuzzyRegex(search), $options: 'i' };
    }

    // Lọc theo Danh mục (Tìm gần đúng, không dấu, không hoa thường)
    if (category) {
      query.category = { $regex: createViFuzzyRegex(category), $options: 'i' };
    }

    // Lọc theo Địa chỉ (Tìm gần đúng, không dấu, không hoa thường)
    if (address) {
      query.address = { $regex: createViFuzzyRegex(address), $options: 'i' };
    }

    // LỌC THỜI GIAN TRỐNG
    if (startDate && endDate) {
      const reqStart = new Date(startDate);
      const reqEnd = new Date(endDate);

      if (reqStart > reqEnd) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }

      // Tìm những món đồ ĐANG KẸT LỊCH
      const overlappingRentals = await Rental.find({
        status: { $in: ['confirmed', 'in_progress', 'pending_confirmation'] },
        startDate: { $lte: reqEnd },
        endDate: { $gte: reqStart }
      }).select('itemId');

      const unavailableItemIds = overlappingRentals.map(rental => rental.itemId);

      // Loại những món đồ đó ra
      query._id = { ...query._id, $nin: unavailableItemIds };
    }

    // Chạy Query
    const items = await Item.find(query)
      .select('_id name category address pricePerDay images status')
      .sort({ createdAt: -1 })
      .limit(20);

    const itemSummaries = items.map(item => ({
      _id: item._id,
      name: item.name,
      category: item.category,
      address: item.address,
      pricePerDay: item.pricePerDay,
      status: item.status,
      mainImage: (item.images && item.images.length > 0) ? item.images[0] : ''
    }));

    res.status(200).json(itemSummaries);
  } catch (error) {
    console.error('[DEBUG] LỖI SEARCH ITEMS:', error);
    res.status(500).json({ message: 'Server error while searching items' });
  }
};

// POST /api/items
const createItem = async (req, res) => {
  const {
    name,
    description,
    category,
    pricePerDay,
    address,
    images,
    baseValue,
    depositPercentage
  } = req.body;
  try {
    const item = new Item({
      name,
      description,
      category,
      pricePerDay,
      address,
      images,
      baseValue,
      depositPercentage,
      ownerId: req.user.id
    });
    const createdItem = await item.save();
    res.status(201).json(createdItem);
  } catch (error) {
    res.status(400).json({ message: 'Bad request', error: error.message });
  }
};

const checkOwner = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.ownerId.toString() === req.user.id) {
      req.item = item;
      next();
    } else {
      res.status(403).json({ message: 'Forbidden (not the owner)' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/items/:id
const updateItem = async (req, res) => {
  const {
    name,
    description,
    category,
    pricePerDay,
    address,
    images,
    status,
    baseValue,
    depositPercentage
  } = req.body;
  const item = req.item; 

  item.name = name ?? item.name;
  item.description = description ?? item.description;
  item.category = category ?? item.category; // Thêm update category
  item.pricePerDay = pricePerDay ?? item.pricePerDay;
  item.baseValue = baseValue ?? item.baseValue;
  item.depositPercentage = depositPercentage ?? item.depositPercentage;
  item.address = address ?? item.address;
  item.images = images ?? item.images;
  
  if (status && ['available', 'delisted'].includes(status)) {
     item.status = status;
  }

  try {
    const updatedItem = await item.save();
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: 'Bad request', error: error.message });
  }
};

// DELETE /api/items/:id
const deleteItem = async (req, res) => {
  try {
    if (req.item.status === 'rented') {
        return res.status(400).json({ message: 'Cannot delete item while it is being rented.' });
    }
    await Item.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createViFuzzyRegex = (keyword) => {
  if (!keyword) return '';
  
  // 1. Chống lỗi ký tự đặc biệt của Regex (VD người dùng gõ dấu ngoặc, dấu sao)
  let safeStr = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 2. Chuyển hết về chữ thường và xóa dấu để lấy ký tự gốc
  let baseStr = safeStr.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd');

  // 3. Từ điển map 1 chữ cái không dấu ra tất cả biến thể có dấu (Cả hoa & thường)
  const viMap = {
    'a': '[aAàÀảẢãÃáÁạẠăĂằẰẳẲẵẴắẮặẶâÂầẦẩẨẫẪấẤậẬ]',
    'e': '[eEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆ]',
    'i': '[iIìÌỉỈĩĨíÍịỊ]',
    'o': '[oOòÒỏỎõÕóÓọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢ]',
    'u': '[uUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰ]',
    'y': '[yYỳỲỷỶỹỸýÝỵỴ]',
    'd': '[dDđĐ]',
  };

  // 4. Lắp ráp lại thành chuỗi Regex hoàn chỉnh
  let regexStr = '';
  for (let i = 0; i < baseStr.length; i++) {
    const char = baseStr[i];
    regexStr += viMap[char] || char; // Nếu là phụ âm (b,c,k..) thì giữ nguyên
  }
  
  return regexStr;
};

// GET /api/items/categories
const getCategories = async (req, res) => {
  console.log('[DEBUG] GET /api/items/categories HIT');
  try {
    const categories = await Item.distinct('category', { status: { $ne: 'delisted' } });
    res.status(200).json(categories);
  } catch (error) {
    console.error('[DEBUG] LỖI GET CATEGORIES:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// GET /api/items/bestsellers?limit=3
const getBestsellerItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;

    // Aggregate: đếm số lượng đơn thuê completed hoặc confirmed theo itemId
    const rentalsAgg = await Rental.aggregate([
      { $match: { status: { $in: ['completed', 'confirmed', 'in_progress'] } } },
      { $group: { _id: '$itemId', rentalCount: { $sum: 1 } } },
      { $sort: { rentalCount: -1 } },
      { $limit: limit }
    ]);

    if (rentalsAgg.length === 0) {
      // Fallback: lấy sản phẩm mới nhất nếu chưa có đơn thuê nào
      const fallback = await Item.find({ status: { $ne: 'delisted' } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id name category pricePerDay images address');
      return res.status(200).json(fallback.map(item => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        pricePerDay: item.pricePerDay,
        mainImage: item.images?.[0] || '',
        rentalCount: 0
      })));
    }

    const itemIds = rentalsAgg.map(r => r._id);
    const items = await Item.find({ _id: { $in: itemIds }, status: { $ne: 'delisted' } })
      .select('_id name category pricePerDay images address');

    // Map rentalCount vào từng item, giữ thứ tự sort
    const countMap = {};
    rentalsAgg.forEach(r => { countMap[r._id.toString()] = r.rentalCount; });

    const result = items
      .map(item => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        pricePerDay: item.pricePerDay,
        mainImage: item.images?.[0] || '',
        rentalCount: countMap[item._id.toString()] || 0
      }))
      .sort((a, b) => b.rentalCount - a.rentalCount);

    res.status(200).json(result);
  } catch (error) {
    console.error('[DEBUG] LỖI GET BESTSELLERS:', error);
    res.status(500).json({ message: 'Server error while fetching bestsellers' });
  }
};

module.exports = {
  searchItems,
  createItem,
  updateItem,
  deleteItem,
  checkOwner,
  getCategories,
  getBestsellerItems
};