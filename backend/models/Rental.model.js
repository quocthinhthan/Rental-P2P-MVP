const mongoose = require('mongoose');
const { RentalStatus, PaymentStatus } = require('../enums/rental.enum');
const { generateUniqueCode } = require('../utils/codeGenerator');

const RentalSchema = new mongoose.Schema({
  code: { type: String, trim: true, uppercase: true, immutable: true },
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
  rentalFee: { type: Number },
  depositAmount: { type: Number },
  totalAmount: { type: Number },
  commissionRate: { type: Number, default: 10 },
  commissionAmount: { type: Number },
  payoutAmount: { type: Number },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  note: { type: String, default: '' },

  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }, // Link tới hợp đồng
  pickupImages: [{ type: String }], // Ảnh lúc nhận đồ
  returnImages: [{ type: String }], // Ảnh lúc trả đồ
  
  status: {
    type: String,
    enum: Object.values(RentalStatus),
    default: RentalStatus.PENDING_PAYMENT
  }
}, { timestamps: true });

RentalSchema.index({ code: 1 }, { unique: true, sparse: true });

RentalSchema.pre('validate', async function ensureRentalCode(next) {
  try {
    if (!this.code) {
      this.code = await generateUniqueCode(this.constructor, { prefix: 'RT' });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Rental', RentalSchema);
