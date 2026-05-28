// notification-worker/Contract.model.js
const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, unique: true },
  
  ownerInfo: { 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: String, 
    idCardNumber: String 
  },
  renterInfo: { 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fullName: String, 
    idCardNumber: String 
  },
  itemInfo: { 
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    name: String, 
    pricePerDay: Number 
  },
  
  rentalPeriod: { startDate: Date, endDate: Date },
  totalPrice: Number,
  terms: { type: String, default: 'Hai bên cam kết giao nhận tài sản đúng như mô tả. Nếu có hư hỏng, hệ thống sẽ sử dụng tiền ký quỹ để đền bù theo quy định của pháp luật.' },

  ownerSignedAt: { type: Date, default: null },
  ownerSignatureUrl: { type: String, default: '' },

  renterSignedAt: { type: Date, default: null },
  renterSignatureUrl: { type: String, default: '' },

  isFullySigned: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('Contract', ContractSchema);
