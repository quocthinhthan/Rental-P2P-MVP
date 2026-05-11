const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Item = require('../models/Item.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/p2p_rental';

const resolveBaseValue = (pricePerDay) => {
  if (!Number.isFinite(pricePerDay)) return null;
  return pricePerDay * 10;
};

const main = async () => {
  console.log('[BACKFILL] Starting items backfill...');
  await mongoose.connect(MONGO_URI);

  const items = await Item.find({
    $or: [
      { baseValue: { $exists: false } },
      { baseValue: null }
    ]
  }).lean();

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const baseValue = resolveBaseValue(Number(item.pricePerDay));
    if (baseValue === null) {
      console.warn(`[BACKFILL] Skip item ${item._id}: missing pricePerDay.`);
      skipped += 1;
      continue;
    }

    await Item.updateOne(
      { _id: item._id },
      {
        $set: {
          baseValue,
          depositPercentage: 100
        }
      }
    );

    updated += 1;
  }

  console.log(`[BACKFILL] Completed. Updated: ${updated}, Skipped: ${skipped}.`);
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('[BACKFILL] Failed:', error.message);
  process.exitCode = 1;
});
