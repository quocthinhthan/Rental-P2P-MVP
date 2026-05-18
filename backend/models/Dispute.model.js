// backend/models/Dispute.model.js
const mongoose = require('mongoose');
const { DisputeStatus, PenaltyType, DisputeWinner } = require('../enums/dispute.enum');

const DisputeSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  evidenceImages: [{ type: String }],
  previousRentalStatus: { type: String },
  previousItemStatus: { type: String },
  mediationEndsAt: { type: Date },
  escalatedAt: { type: Date, default: null },
  escalatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: Object.values(DisputeStatus),
    default: DisputeStatus.PENDING
  },
  adminDecision: { type: String, default: '' },
  winner: {
    type: String,
    enum: Object.values(DisputeWinner),
    default: null
  },
  penalizeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  penaltyType: {
    type: String,
    enum: Object.values(PenaltyType),
    default: PenaltyType.NONE
  },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);
