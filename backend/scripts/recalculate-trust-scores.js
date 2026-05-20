const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const { recalculateUserTrustScore } = require('../services/trustScore.service');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({}).select('_id email');
  let updatedCount = 0;

  for (const user of users) {
    await recalculateUserTrustScore(user._id);
    updatedCount += 1;
    console.log(`[trust-score] recalculated ${user._id} ${user.email || ''}`);
  }

  console.log(`[trust-score] done. updated=${updatedCount}`);
};

run()
  .catch((error) => {
    console.error('[trust-score] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
