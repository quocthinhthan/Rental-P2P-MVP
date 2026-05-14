const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Item = require('../models/Item.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/p2p_rental';
const CENTER_LNG = Number(process.env.LONGITUDE || 106.700981);
const CENTER_LAT = Number(process.env.LATITUDE || 10.776889);
const DRY_RUN = process.env.DRY_RUN === 'true';

// Độ lệch tối đa (0.01 tương đương khoảng 1.1km)
// Bạn có thể tăng số này lên nếu muốn rải xa hơn
const SCATTER_RANGE = 0.02; 

const invalidLocationQuery = {
  $or: [
    { location: { $exists: false } },
    { 'location.type': { $ne: 'Point' } },
    { 'location.coordinates': { $exists: false } }
  ]
};

// Hàm tạo tọa độ ngẫu nhiên quanh điểm gốc
const getRandomCoordinate = (center, range) => {
  return center + (Math.random() * range * 2 - range);
};

const main = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('[SCATTER_UPDATE] Connected to MongoDB.');

  // 1. Tìm tất cả các item bị lỗi vị trí
  const items = await Item.find(invalidLocationQuery).select('_id name');
  
  if (items.length === 0) {
    console.log('[SCATTER_UPDATE] No invalid items found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[SCATTER_UPDATE] Found ${items.length} items to update.`);

  if (DRY_RUN) {
    console.log('[SCATTER_UPDATE] DRY_RUN=true. Previewing first 3 changes:');
    for (let i = 0; i < Math.min(3, items.length); i++) {
      console.log(`- ${items[i].name}: [${getRandomCoordinate(CENTER_LNG, SCATTER_RANGE)}, ${getRandomCoordinate(CENTER_LAT, SCATTER_RANGE)}]`);
    }
    await mongoose.disconnect();
    return;
  }

  // 2. Cập nhật từng item với tọa độ riêng biệt
  const updatePromises = items.map(item => {
    const randomLng = getRandomCoordinate(CENTER_LNG, SCATTER_RANGE);
    const randomLat = getRandomCoordinate(CENTER_LAT, SCATTER_RANGE);

    return Item.updateOne(
      { _id: item._id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [randomLng, randomLat]
          }
        }
      }
    );
  });

  await Promise.all(updatePromises);

  console.log(`[SCATTER_UPDATE] Done! Updated ${items.length} items with unique coordinates.`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('[SCATTER_UPDATE] Error:', err.message);
  await mongoose.disconnect().catch(() => {});
});