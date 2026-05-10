// backend/controllers/items.controller.js
const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');

// GET /api/items?search=...&category=...&address=...&startDate=...&endDate=...
const searchItems = async (req, res) => {
  try {
    const { search, category, address, startDate, endDate } = req.query;

    let query = { status: { $ne: 'delisted' } };

    // Lọc theo Tên (Tìm gần đúng, không dấu, không hoa thường)
    if (search) {
      query.name = { $regex: createViFuzzyRegex(search), $options: 'i' };
    }

    // Lọc theo Danh mục (Tìm gần đúng, không dấu, không hoa thường)
    // VD: DB lưu "Công nghệ", gõ "cong nghe" vẫn ra
    if (category) {
      query.category = { $regex: createViFuzzyRegex(category), $options: 'i' };
    }

    // Lọc theo Địa chỉ (Tìm gần đúng, không dấu, không hoa thường)
    // VD: DB lưu "Quận Gò Vấp", gõ "go vap" vẫn ra
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
        status: { $in: ['confirmed', 'in_progress'] },
        startDate: { $lte: reqEnd },
        endDate: { $gte: reqStart }
      }).select('itemId');

      const unavailableItemIds = overlappingRentals.map(rental => rental.itemId);

      // Loại những món đồ đó ra
      query._id = { $nin: unavailableItemIds };
    }

    // Chạy Query
    const items = await Item.find(query)
      .select('_id name category address pricePerDay images')
      .sort({ createdAt: -1 })
      .limit(20);

    const itemSummaries = items.map(item => ({
      _id: item._id,
      name: item.name,
      category: item.category,
      address: item.address,
      pricePerDay: item.pricePerDay,
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
  const { name, description, category, pricePerDay, address, images } = req.body;
  try {
    const item = new Item({
      name, description, category, pricePerDay, address, images,
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
  const { name, description, category, pricePerDay, address, images, status } = req.body;
  const item = req.item; 

  item.name = name ?? item.name;
  item.description = description ?? item.description;
  item.category = category ?? item.category; // Thêm update category
  item.pricePerDay = pricePerDay ?? item.pricePerDay;
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

module.exports = {
  searchItems,
  createItem,
  updateItem,
  deleteItem,
  checkOwner
};