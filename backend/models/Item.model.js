// backend/models/Item.model.js
const mongoose = require('mongoose');
const { ItemStatus } = require('../enums/item.enum');

const ItemSchema = new mongoose.Schema({
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
    coordinates: { type: [Number], required: true } // [Kinh độ, Vĩ độ] LƯU Ý: MongoDB là Lng trước, Lat sau
  },
  status: { 
    type: String, 
    enum: Object.values(ItemStatus), 
    default: ItemStatus.AVAILABLE 
  },
}, { timestamps: true });

ItemSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Item', ItemSchema);
