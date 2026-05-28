const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const { publishToQueue } = require('../config/rabbitmq');
const {
  recalculateUserTrustScore,
  getTrustLevelFromScore
} = require('../services/trustScore.service');


// Hàm trợ giúp để tạo token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token hết hạn sau 30 ngày
  });
};

// 1. [PUBLIC] POST /api/auth/register (Đăng ký siêu nhanh, ekycStatus mặc định là unverified)
exports.registerUser = async (req, res) => {
  const { fullName, email, password, phoneNumber } = req.body; // Bỏ CCCD ra khỏi đây

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email đã tồn tại' });

    const user = await User.create({
      fullName, email, password, phoneNumber
      // ekycStatus sẽ tự động lấy default là 'unverified' từ Model
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: { _id: user._id, fullName: user.fullName, email: user.email, ekycStatus: user.ekycStatus }
    });
  } catch (error) {
    res.status(400).json({ message: 'Lỗi đăng ký', error: error.message });
  }
};

// 3. [USER] PUT /api/auth/profile (API Update thông tin User mới tinh)
exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'Không tìm thấy User' });
  }

  // Khóa cứng thông tin định danh một khi đã xác thực (verified)
  if (user.ekycStatus === 'verified') {
    if (req.body.idCardNumber && req.body.idCardNumber !== user.idCardNumber) {
      return res.status(400).json({ message: 'Không thể thay đổi số CCCD sau khi tài khoản đã được xác thực!' });
    }
    if (req.body.idCardImages && Array.isArray(req.body.idCardImages) && req.body.idCardImages.length > 0) {
      const areImagesDifferent = JSON.stringify(req.body.idCardImages) !== JSON.stringify(user.idCardImages);
      if (areImagesDifferent) {
        return res.status(400).json({ message: 'Không thể thay đổi ảnh CCCD sau khi tài khoản đã được xác thực!' });
      }
    }
    if (req.body.fullName && req.body.fullName !== user.fullName) {
      return res.status(400).json({ message: 'Không thể thay đổi họ tên sau khi tài khoản đã được xác thực theo CCCD!' });
    }
  }

  user.fullName = req.body.fullName || user.fullName;
  user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
  user.address = req.body.address || user.address;
  user.avatarUrl = req.body.avatarUrl || user.avatarUrl;
  
  if (req.body.bankAccount) {
    user.bankAccount = {
      bankName: req.body.bankAccount.bankName !== undefined ? req.body.bankAccount.bankName : user.bankAccount?.bankName || '',
      accountNumber: req.body.bankAccount.accountNumber !== undefined ? req.body.bankAccount.accountNumber : user.bankAccount?.accountNumber || '',
      accountHolder: req.body.bankAccount.accountHolder !== undefined ? req.body.bankAccount.accountHolder : user.bankAccount?.accountHolder || ''
    };
  }

  if (req.body.idCardNumber && user.ekycStatus !== 'verified') {
    user.idCardNumber = req.body.idCardNumber;
    user.ekycStatus = 'verified';
  }
  if (Array.isArray(req.body.idCardImages) && req.body.idCardImages.length > 0 && user.ekycStatus !== 'verified') {
    user.idCardImages = req.body.idCardImages;
  }
  
  // Nếu đổi pass, phải thêm logic so sánh pass cũ. Ở đây tạm update thông tin cơ bản.

  const updatedUser = await user.save();
  const updatedTrustUser = await recalculateUserTrustScore(updatedUser._id);

  res.status(200).json({
    _id: updatedUser._id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    phoneNumber: updatedUser.phoneNumber,
    address: updatedUser.address,
    avatarUrl: updatedUser.avatarUrl,
    ekycStatus: updatedUser.ekycStatus,
    bankAccount: updatedUser.bankAccount,
    trustScore: updatedTrustUser?.trustScore,
    trustLevel: updatedTrustUser ? getTrustLevelFromScore(updatedTrustUser.trustScore) : undefined
  });
};

// POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (user.isBanned) {
        return res.status(401).json({ message: 'This account is banned.' });
      }
      // SỬA LẠI CHỖ NÀY:
      // Gửi về cả token và thông tin user
      res.status(200).json({
        token: generateToken(user._id),
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          address: user.address,
          avatarUrl: user.avatarUrl,
          role: user.role,
          ekycStatus: user.ekycStatus,
          bankAccount: user.bankAccount,
          trustScore: user.trustScore,
          averageRating: user.averageRating,
          totalReviews: user.totalReviews
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/auth/me (Endpoint mới để lấy thông tin user từ token)
exports.getMe = async (req, res) => {
  // req.user đã được gán bởi middleware 'protect'
  if (req.user) {
    res.status(200).json(req.user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// POST /api/auth/logout
// Lưu ý: Logout với JWT ở phía server thực ra rất khó
// Cách 1 (Đơn giản - Client tự xóa token):
exports.logoutUser = (req, res) => {
  // Phía client chỉ cần xóa token khỏi localStorage/cookie
  res.status(200).json({ message: 'Logout successful' });
};
// Cách 2 (Phức tạp - Blacklist token): Cần dùng Redis để lưu token đã logout.
// Với MVP, chúng ta chọn cách 1.

// 2. [USER] POST /api/auth/verify-ekyc (Upload ảnh -> Gọi FPT -> Lưu vào DB -> Lấy Tick xanh)
exports.verifyEKYC = async (req, res) => {
  const { idCardFrontUrl } = req.body; 
  const userId = req.user._id; // BẮT BUỘC ĐÃ LOGIN MỚI LẤY ĐƯỢC ID

  try {
    if (!idCardFrontUrl) return res.status(400).json({ message: 'Vui lòng cung cấp URL ảnh mặt trước CCCD' });

    const user = await User.findById(userId);
    if (user.ekycStatus === 'verified') return res.status(400).json({ message: 'Tài khoản đã được xác thực!' });

    console.log('\n[DEBUG - eKYC] 1. Tải ảnh từ URL...');
    const imageResponse = await axios.get(idCardFrontUrl, { responseType: 'stream' });

    console.log('[DEBUG - eKYC] 2. Gửi ảnh sang FPT.AI...');
    const form = new FormData();
    form.append('image', imageResponse.data);

    const fptResponse = await axios.post('https://api.fpt.ai/vision/idr/vnm', form, {
      headers: { 'api-key': process.env.FPT_AI_API_KEY, ...form.getHeaders() }
    });

    const fptData = fptResponse.data;
    if (fptData.errorCode !== 0) return res.status(400).json({ message: 'AI không đọc được ảnh!', fptError: fptData.errorMessage });

    const extractedData = fptData.data[0];
    const realIdNumber = extractedData.id; 
    const realName = extractedData.name;   

    console.log(`[DEBUG - eKYC] ✔️ AI đọc thành công: [${realName}] - [${realIdNumber}]`);

    // GHI NHẬN TICK XANH CHO USER NÀY VÀO DB
    user.ekycStatus = 'verified';
    user.idCardNumber = realIdNumber;
    user.idCardImages = [idCardFrontUrl];
    // >>> THÊM DÒNG NÀY: Ghi đè tên ảo bằng tên thật trên CCCD <<<
    user.fullName = realName; 
    await user.save();
    const updatedTrustUser = await recalculateUserTrustScore(user._id);

    res.status(200).json({ 
      message: 'Xác thực danh tính thành công! Hồ sơ của bạn đã được cập nhật theo CCCD.',
      ekycStatus: user.ekycStatus,
      trustScore: updatedTrustUser?.trustScore,
      trustLevel: updatedTrustUser ? getTrustLevelFromScore(updatedTrustUser.trustScore) : undefined,
      extractedData: { 
        idNumber: realIdNumber, 
        fullName: realName // Trả về tên thật cho Frontend biết mà cập nhật giao diện
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống eKYC', error: error.message });
  }
};

// [PUBLIC] POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 
    await user.save();
    
    publishToQueue({
      task: 'forgot_password',
      email: user.email,
      fullName: user.fullName,
      resetToken: resetToken 
    });

    res.status(200).json({ message: 'Email khôi phục mật khẩu đã được gửi!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// [PUBLIC] PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    // 1. Mã hóa cái token người dùng gửi lên để so sánh với cái trong DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() } // Kiểm tra còn hạn không
    });

    if (!user) return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });

    // 2. Đổi mật khẩu
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // Middleware hash password ở User.model sẽ tự chạy

    res.status(200).json({ message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
