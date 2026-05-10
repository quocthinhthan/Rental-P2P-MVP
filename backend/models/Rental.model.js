const mongoose = require('mongoose');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');

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
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: Object.values(RentalStatus),
    default: RentalStatus.PENDING_PAYMENT
  }
}, { timestamps: true });

module.exports = mongoose.model('Rental', RentalSchema);
