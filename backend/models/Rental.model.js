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
  totalPrice: { type: Number, required: true },
  escrowAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'escrowed', 'refunded'],
    default: 'pending'
  },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending_payment', 'pending_confirmation', 'confirmed', 'rejected', 'in_progress', 'completed', 'cancelled'],
    default: 'pending_payment'
  }
}, { timestamps: true });

module.exports = mongoose.model('Rental', RentalSchema);
