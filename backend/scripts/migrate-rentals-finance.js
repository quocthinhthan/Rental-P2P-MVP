const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config();

const Rental = require('../models/Rental.model');
const Item = require('../models/Item.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/p2p_rental';

const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const shouldMigrate = (rental) => (
  rental.rentalFee === undefined
  || rental.depositAmount === undefined
  || rental.totalAmount === undefined
  || rental.commissionAmount === undefined
  || rental.payoutAmount === undefined
);

const resolveRentalFee = (rental, days, item) => {
  if (typeof rental.totalPrice === 'number') return rental.totalPrice;
  if (typeof rental.escrowAmount === 'number') return rental.escrowAmount;
  const pricePerDay = typeof item?.pricePerDay === 'number' ? item.pricePerDay : 0;
  return days * pricePerDay;
};

const main = async () => {
  console.log('[MIGRATION] Starting rental finance migration...');
  await mongoose.connect(MONGO_URI);

  const rentals = await Rental.find({
    $or: [
      { rentalFee: { $exists: false } },
      { depositAmount: { $exists: false } },
      { totalAmount: { $exists: false } },
      { commissionAmount: { $exists: false } },
      { payoutAmount: { $exists: false } }
    ]
  }).lean();

  let migrated = 0;
  let skipped = 0;

  for (const rental of rentals) {
    if (!shouldMigrate(rental)) continue;

    const item = await Item.findById(rental.itemId).lean();
    if (!item) {
      console.warn(`[MIGRATION] Skip: rental ${rental._id} missing item.`);
      skipped += 1;
      continue;
    }

    const days = calculateDays(rental.startDate, rental.endDate);
    if (!Number.isFinite(days) || days <= 0) {
      console.warn(`[MIGRATION] Skip: rental ${rental._id} invalid date range.`);
      skipped += 1;
      continue;
    }

    const rentalFee = resolveRentalFee(rental, days, item);
    const baseValue = typeof item.baseValue === 'number' ? item.baseValue : 0;
    const depositPercentage = typeof item.depositPercentage === 'number' ? item.depositPercentage : 100;
    const depositAmount = (baseValue * depositPercentage) / 100;
    const commissionRate = typeof rental.commissionRate === 'number' ? rental.commissionRate : 10;
    const commissionAmount = (rentalFee * commissionRate) / 100;
    const payoutAmount = rentalFee - commissionAmount;
    const totalAmount = rentalFee + depositAmount;

    await Rental.updateOne(
      { _id: rental._id },
      {
        $set: {
          rentalFee,
          depositAmount,
          totalAmount,
          commissionRate,
          commissionAmount,
          payoutAmount
        },
        $unset: {
          totalPrice: '',
          escrowAmount: ''
        }
      }
    );

    migrated += 1;
  }

  console.log(`[MIGRATION] Completed. Migrated: ${migrated}, Skipped: ${skipped}.`);
  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('[MIGRATION] Failed:', error.message);
  process.exitCode = 1;
});
