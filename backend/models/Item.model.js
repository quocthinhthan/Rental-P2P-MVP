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
  address: { type: String },
  status: { 
    type: String, 
    enum: Object.values(ItemStatus), 
    default: ItemStatus.AVAILABLE 
  },
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
