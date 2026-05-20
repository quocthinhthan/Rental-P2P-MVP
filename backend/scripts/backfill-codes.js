const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Item = require('../models/Item.model');
const Rental = require('../models/Rental.model');
const { saveWithUniqueCode } = require('../utils/codeGenerator');

const backfillModelCodes = async (Model, prefix) => {
  const documents = await Model.find({
    $or: [
      { code: { $exists: false } },
      { code: null },
      { code: '' }
    ]
  });

  let updated = 0;

  for (const document of documents) {
    await saveWithUniqueCode(document, { prefix });
    updated += 1;
  }

  return updated;
};

const run = async () => {
  await connectDB();

  const [itemsUpdated, rentalsUpdated] = await Promise.all([
    backfillModelCodes(Item, 'SP'),
    backfillModelCodes(Rental, 'RT')
  ]);

  console.log(`Backfilled item codes: ${itemsUpdated}`);
  console.log(`Backfilled rental codes: ${rentalsUpdated}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Backfill codes failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
