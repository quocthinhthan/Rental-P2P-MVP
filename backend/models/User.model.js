const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  phoneNumber: { type: String },
  address: { type: String, default: '' }, 
  address: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned: { type: Boolean, default: false },
  trustScore: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  ekycStatus: { 
    type: String, 
    enum: ['unverified', 'pending', 'verified', 'rejected'], 
    default: 'unverified' 
  },
  idCardNumber: { type: String, default: '' }, // Số CCCD
  idCardImages: [{ type: String }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true }); // timestamps thêm createdAt và updatedAt

// Middleware để hash mật khẩu TRƯỚC KHI lưu
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Thêm một method để kiểm tra mật khẩu
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);