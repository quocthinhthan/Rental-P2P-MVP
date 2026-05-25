const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  phoneNumber: { type: String },
  address: { type: String, default: '' }, // fixed: was declared twice (mongoose silently dropped the first)
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned: { type: Boolean, default: false },
  suspendedUntil: { type: Date, default: null },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  ekycStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified', 'rejected'],
    default: 'unverified'
  },
  idCardNumber: { type: String, default: '' },
  idCardImages: [{ type: String }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  /**
   * Wishlist — array of saved Item IDs.
   * Capped at 100 (enforced in controller).
   * $addToSet used in controller to prevent duplicates.
   */
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }]
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
