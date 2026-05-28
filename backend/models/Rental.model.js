// backend/models/Rental.model.js
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
  // ownerId — denormalized for fast "MyRentalsView" queries
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  rentalFee:        { type: Number },
  depositAmount:    { type: Number },
  totalAmount:      { type: Number },
  commissionRate:   { type: Number, default: 10 },
  commissionAmount: { type: Number },
  payoutAmount:     { type: Number },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING
  },
  note:               { type: String, default: '' },
  cancellationReason: { type: String, default: '' },
  cancelledBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancelledAt:        { type: Date, default: null },

  contractId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  pickupImages: [{ type: String }], // kept for backward-compat (also captured in pickupReport)
  returnImages: [{ type: String }], // kept for backward-compat (also captured in returnReport)

  /**
   * Pickup handover report — recorded by whichever party triggers pickup.
   * Stores condition, accessories checklist, and free-text notes.
   */
  pickupReport: {
    condition:   { type: String, enum: ['good', 'fair', 'damaged'], default: 'good' },
    accessories: { type: String, default: '' },
    notes:       { type: String, default: '' },
    recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt:  { type: Date },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:  { type: Date, default: null }
  },

  /**
   * Return handover report — recorded by whichever party triggers completion.
   * 'damages' captures any new damage compared to pickup state.
   */
  returnReport: {
    condition:   { type: String, enum: ['good', 'fair', 'damaged'], default: 'good' },
    accessories: { type: String, default: '' },
    notes:       { type: String, default: '' },
    damages:     { type: String, default: '' },
    recordedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt:  { type: Date },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:  { type: Date, default: null }
  },

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
