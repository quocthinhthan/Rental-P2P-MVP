// backend/models/Dispute.model.js
const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Người bấm báo cáo
  reason: { type: String, required: true },
  evidenceImages: [{ type: String }], // Mảng chứa URL ảnh/video bằng chứng
  status: { 
    type: String, 
    enum: ['pending', 'resolved'], 
    default: 'pending' // Đang chờ hòa giải/admin xử lý
  },
  adminDecision: { type: String, default: '' }, // Lời phán quyết của Admin
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);