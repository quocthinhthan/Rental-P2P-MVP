// backend/models/Review.model.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  rentalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Rental', 
    required: true 
  },
  reviewerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  revieweeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    default: '' 
  },
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

// Ràng buộc: Một người chỉ được đánh giá 1 đơn thuê 1 lần duy nhất
ReviewSchema.index({ rentalId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);