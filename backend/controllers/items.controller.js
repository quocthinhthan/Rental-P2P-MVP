// backend/controllers/items.controller.js
const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');

const DEFAULT_SEARCH_LIMIT = 100;
const MAX_SEARCH_LIMIT = 200;
const DEFAULT_MAP_SEARCH_LIMIT = 100;
const MAX_MAP_SEARCH_LIMIT = 200;
const MAX_SEARCH_TEXT_LENGTH = 100;
const MAX_BESTSELLER_LIMIT = 10;

const clampNumber = (value, defaultValue, min, max) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
};

const trimSearchText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_SEARCH_TEXT_LENGTH);
};
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Hàm Helper Validate Tọa Độ
const validateCoordinates = (lat, lng) => {
  const parseLat = parseFloat(lat);
  const parseLng = parseFloat(lng);
  
  if (isNaN(parseLat) || parseLat < -90 || parseLat > 90) return false;
  if (isNaN(parseLng) || parseLng < -180 || parseLng > 180) return false;
  
  return { parseLat, parseLng };
};

// GET /api/items?search=...&category=...&address=...&startDate=...&endDate=...
const searchItems = async (req, res) => {
  try {
    const { search, category, address, startDate, endDate, ownerId, exclude, lat, lng, radius, includeMapLocation, limit } = req.query;
    const shouldIncludeMapLocation = Boolean(lat && lng && (includeMapLocation === 'true' || includeMapLocation === '1'));
    const resultLimit = shouldIncludeMapLocation
      ? clampNumber(limit, DEFAULT_MAP_SEARCH_LIMIT, 1, MAX_MAP_SEARCH_LIMIT)
      : clampNumber(limit, DEFAULT_SEARCH_LIMIT, 1, MAX_SEARCH_LIMIT);

    let query = { status: { $ne: 'delisted' } };

    // 1. CÁC BỘ LỌC CƠ BẢN
    if (ownerId) query.ownerId = ownerId;
    if (exclude) query._id = { ...query._id, $ne: exclude };
    
    const safeSearch = trimSearchText(search);
    const safeCategory = trimSearchText(category);
    const safeAddress = trimSearchText(address);

    if (safeSearch) query.name = { $regex: createViFuzzyRegex(safeSearch), $options: 'i' };
    if (safeCategory) query.category = { $regex: createViFuzzyRegex(safeCategory), $options: 'i' };
    if (safeAddress) query.address = { $regex: createViFuzzyRegex(safeAddress), $options: 'i' };

    // 2. LỌC THỜI GIAN TRỐNG
    if (startDate && endDate) {
      const reqStart = new Date(startDate);
      const reqEnd = new Date(endDate);

      if (reqStart > reqEnd) {
        return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
      }

      const overlappingRentals = await Rental.find({
        status: { $in: ['confirmed', 'in_progress', 'pending_confirmation'] },
        startDate: { $lte: reqEnd },
        endDate: { $gte: reqStart }
      }).select('itemId');

      const unavailableItemIds = overlappingRentals.map(rental => rental.itemId);
      query._id = { ...query._id, $nin: unavailableItemIds };
    }

    let items = [];

    // 3. TÌM KIẾM THEO VỊ TRÍ ($geoNear) NẾU CÓ TỌA ĐỘ
    if (lat && lng) {
      const coords = validateCoordinates(lat, lng);
      if (!coords) {
        return res.status(400).json({ message: 'Tọa độ (lat/lng) không hợp lệ' });
      }

      // Giới hạn bán kính tìm kiếm tối đa (ví dụ: 50km) để tránh query quá nặng
      let reqRadius = parseFloat(radius) || 5;
      if (reqRadius > 50) reqRadius = 50; 
      const radiusInMeters = reqRadius * 1000;

      const projectFields = {
        _id: 1,
        name: 1,
        category: 1,
        address: 1,
        pricePerDay: 1,
        status: 1,
        images: 1,
        distance: 1
      };

      if (shouldIncludeMapLocation) {
        projectFields.location = 1;
      }

      items = await Item.aggregate([
        {
          // LƯU Ý: $geoNear BẮT BUỘC phải là stage đầu tiên trong pipeline
          $geoNear: {
            near: { type: "Point", coordinates: [coords.parseLng, coords.parseLat] },
            distanceField: "distance",
            maxDistance: radiusInMeters,
            spherical: true,
            query: query // Đẩy toàn bộ filter (name, status, exclude...) vào đây
          }
        },
        { $project: projectFields },
        { $limit: resultLimit }
      ]);
    } else {
      // 4. FALLBACK: NẾU KHÔNG CÓ TỌA ĐỘ, DÙNG FIND BÌNH THƯỜNG
      items = await Item.find(query)
        .select('_id name category address pricePerDay images status')
        .sort({ createdAt: -1 })
        .limit(resultLimit);
    }

    // 5. FORMAT DỮ LIỆU TRẢ VỀ (Đảm bảo Privacy)
    const itemSummaries = items.map(item => {
      const summary = {
        _id: item._id,
        name: item.name,
        category: item.category,
        address: item.address,
        pricePerDay: item.pricePerDay,
        status: item.status,
        mainImage: (item.images && item.images.length > 0) ? item.images[0] : '',
        // Mặc định chỉ trả khoảng cách; map picker mới yêu cầu thêm mapLocation.
        distance: item.distance !== undefined && item.distance !== null ? parseFloat((item.distance / 1000).toFixed(1)) : null 
      };

      if (
        shouldIncludeMapLocation &&
        item.location &&
        Array.isArray(item.location.coordinates) &&
        item.location.coordinates.length === 2
      ) {
        summary.mapLocation = {
          lng: item.location.coordinates[0],
          lat: item.location.coordinates[1]
        };
      }

      return summary;
    });

    res.status(200).json(itemSummaries);
  } catch (error) {
    console.error('[DEBUG] LỖI SEARCH ITEMS:', error);
    res.status(500).json({ message: 'Server error while searching items' });
  }
};

// POST /api/items
const createItem = async (req, res) => {
  const { name, description, category, pricePerDay, address, images, baseValue, depositPercentage, lat, lng } = req.body;
  try {
    let location = undefined;
    if (lat !== undefined && lng !== undefined) {
      const coords = validateCoordinates(lat, lng);
      if (!coords) return res.status(400).json({ message: 'Tọa độ không hợp lệ' });
      
      location = {
        type: 'Point',
        coordinates: [coords.parseLng, coords.parseLat]
      };
    }

    const item = new Item({
      name, description, category, pricePerDay, address, images, baseValue, depositPercentage, location,
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
  const { name, description, category, pricePerDay, address, images, status, baseValue, depositPercentage, lat, lng } = req.body;
  const item = req.item; 

  item.name = name ?? item.name;
  item.description = description ?? item.description;
  item.category = category ?? item.category;
  item.pricePerDay = pricePerDay ?? item.pricePerDay;
  item.baseValue = baseValue ?? item.baseValue;
  item.depositPercentage = depositPercentage ?? item.depositPercentage;
  item.address = address ?? item.address;
  item.images = images ?? item.images;
  
  if (status && ['available', 'delisted'].includes(status)) {
     item.status = status;
  }

  if (lat !== undefined && lng !== undefined) {
    const coords = validateCoordinates(lat, lng);
    if (!coords) return res.status(400).json({ message: 'Tọa độ không hợp lệ' });

    item.location = {
      type: 'Point',
      coordinates: [coords.parseLng, coords.parseLat]
    };
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
    const limit = clampNumber(req.query.limit, 3, 1, MAX_BESTSELLER_LIMIT);

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

const pricingCache = new Map();

// POST /api/items/suggest-price
const suggestPrice = async (req, res) => {
  try {
    // 1. Nhận thêm description từ req.body
    let { name, category, baseValue, description } = req.body;

    if (!name || !baseValue) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tên món đồ và giá trị mua mới (baseValue)' });
    }
    
    baseValue = Number(baseValue);
    const catLower = category ? category.toLowerCase() : 'khác';

    // 2. LÀM SẠCH VÀ GIỚI HẠN MÔ TẢ (Chống Spam & Tấn công)
    const safeDescription = description 
        ? description.trim().substring(0, 200) 
        : "Không có mô tả chi tiết.";

    // 3. Cập nhật Cache Key (kèm theo độ dài mô tả để phân biệt cache)
    const cacheKey = `${name.toLowerCase().trim()}_${catLower}_${baseValue}_${safeDescription.length}`;
    if (pricingCache.has(cacheKey)) {
      return res.status(200).json({ ...pricingCache.get(cacheKey), cached: true });
    }

    // --- MODULE 1: DOMAIN HEURISTICS (Quy tắc chuyên gia) ---
    let ruleBasedPercent = 0.03; 
    if (catLower.includes('công nghệ') || catLower.includes('máy ảnh') || catLower.includes('laptop')) {
      ruleBasedPercent = 0.015;
    } else if (catLower.includes('cắm trại') || catLower.includes('dã ngoại') || catLower.includes('lều')) {
      ruleBasedPercent = 0.05;
    }
    const ruleBasedPrice = Math.round(baseValue * ruleBasedPercent);

    // --- MODULE 2: LLM ENGINE (THÔNG MINH THẬT SỰ) ---
    let aiSuggestedPrice = null;
    let aiReasoning = "Chưa có phân tích từ AI do đang dùng giá mặc định."; // Mặc định nếu không có API key
    let marketContext = "Dựa trên khấu hao cơ bản.";

    if (genAI) {
      try {
        const similarItemsCount = await Item.countDocuments({ category: category, status: 'available' });
        const demandStatus = similarItemsCount > 10 ? "Nguồn cung đang dồi dào, cần giá cạnh tranh" : "Nguồn cung khan hiếm, có thể để giá cao hơn";
        marketContext = `Có ${similarItemsCount} sản phẩm cùng danh mục trên hệ thống.`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite",
            generationConfig: { responseMimeType: "application/json" }
        });

        // PROMPT SIÊU THÔNG MINH: Bắt AI vừa tính giá, vừa giải thích
        const prompt = `Bạn là chuyên gia thẩm định giá tài sản cho thuê chuyên nghiệp. Tính giá thuê 1 ngày cho món đồ sau:
        - Tên: ${name}
        - Danh mục: ${category}
        - Giá mua mới: ${baseValue} VNĐ
        - Mô tả tình trạng: ${safeDescription}
        - Tình hình thị trường: ${demandStatus}

        Nhiệm vụ:
        1. Phân tích mức độ khấu hao dựa trên "Mô tả tình trạng".
        2. Tính toán giá thuê 1 ngày (VNĐ).
        3. Viết 1 câu giải thích ngắn gọn (dưới 50 chữ) lý do chọn mức giá này.

        BẮT BUỘC trả về định dạng JSON chính xác như sau:
        { 
          "suggestedPrice": 150000, 
          "reasoning": "Vì đồ đã xước và pin chai, cần giảm giá để dễ cho thuê hơn." 
        }`;
        
        // CHỐNG TREO APP: Ép AI chỉ được nghĩ tối đa 4 giây
        const result = await Promise.race([
            model.generateContent(prompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 20000))
        ]);
        
        const parsedData = JSON.parse(result.response.text());
        
        if (parsedData && parsedData.suggestedPrice) {
            let tempAiPrice = Number(parsedData.suggestedPrice);
            
            // GUARDRAILS: Chặn AI báo giá hoang tưởng
            const maxAllowed = baseValue * 0.10;
            const minAllowed = baseValue * 0.005;
            
            if (tempAiPrice > maxAllowed || tempAiPrice < minAllowed) {
                aiSuggestedPrice = ruleBasedPrice; 
                aiReasoning = "AI đề xuất giá ngoài biên độ an toàn, hệ thống tự động dùng giá tiêu chuẩn.";
            } else {
                aiSuggestedPrice = tempAiPrice;
                aiReasoning = parsedData.reasoning || "Đã phân tích dựa trên khấu hao và thị trường.";
            }
        }
      } catch (aiError) {
        console.error('[DEBUG] Lỗi gọi AI (Có thể do Timeout hoặc hết Quota):', aiError.message);
        aiSuggestedPrice = ruleBasedPrice;
        aiReasoning = "Máy chủ AI phản hồi chậm, tự động áp dụng giá tiêu chuẩn.";
      }
    }

    // --- MODULE 3: ENSEMBLE ---
    const finalSuggestion = Math.round((ruleBasedPrice + aiSuggestedPrice) / 2);

    const responseData = {
      ruleBasedPrice,
      aiSuggestedPrice,
      finalSuggestion,
      aiReasoning, // <--- Bổ sung lời giải thích vào Output
      marketContext
    };

    pricingCache.set(cacheKey, responseData);
    setTimeout(() => pricingCache.delete(cacheKey), 12 * 60 * 60 * 1000);

    res.status(200).json(responseData);

  } catch (error) {
    console.error('[DEBUG] LỖI SUGGEST PRICE:', error);
    res.status(500).json({ message: 'Lỗi server khi tính toán giá' });
  }
};

module.exports = {
  searchItems,
  createItem,
  updateItem,
  deleteItem,
  checkOwner,
  getCategories,
  getBestsellerItems,
  suggestPrice
};
