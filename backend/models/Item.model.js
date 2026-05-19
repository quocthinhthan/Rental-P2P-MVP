// backend/models/Item.model.js
const mongoose = require('mongoose');
const { ItemStatus } = require('../enums/item.enum');
const { generateUniqueCode } = require('../utils/codeGenerator');

const ItemSchema = new mongoose.Schema({
  code: { type: String, trim: true, uppercase: true, immutable: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'Khác' },
  images: [{ type: String }],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  pricePerDay: { type: Number, required: true },
  baseValue: { type: Number, required: true },
  depositPercentage: { type: Number, default: 100, min: 0, max: 120 },
  address: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },
  status: {
    type: String,
    enum: Object.values(ItemStatus),
    default: ItemStatus.AVAILABLE
  },
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

ItemSchema.index({ code: 1 }, { unique: true, sparse: true });
ItemSchema.index({ location: '2dsphere' });

ItemSchema.pre('validate', async function ensureItemCode(next) {
  try {
    if (!this.code) {
      this.code = await generateUniqueCode(this.constructor, { prefix: 'SP' });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Item', ItemSchema);
