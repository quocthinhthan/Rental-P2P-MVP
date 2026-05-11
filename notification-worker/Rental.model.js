const mongoose = require('mongoose');

const RentalSchema = new mongoose.Schema({
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'Item' 
  },
  renterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
  // Thêm ownerId để tiện truy vấn cho "MyRentalsView"
  ownerId: {
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    ref: 'User' 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  rentalFee: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  commissionRate: { type: Number, default: 10 },
  commissionAmount: { type: Number, required: true },
  payoutAmount: { type: Number, required: true },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'pending_payment',
      'pending_confirmation',
      'confirmed',
      'rejected',
      'in_progress',
      'completed',
      'cancelled'
    ],
    default: 'pending_confirmation'
  }
}, { timestamps: true });

module.exports = mongoose.model('Rental', RentalSchema);