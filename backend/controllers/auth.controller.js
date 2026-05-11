const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const FormData = require('form-data');

// Hàm trợ giúp để tạo token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token hết hạn sau 30 ngày
  });
};

// 2. [PUBLIC] POST /api/auth/register (Cập nhật để lưu luôn data eKYC và SĐT)
exports.registerUser = async (req, res) => {
  // Thêm phoneNumber, idCardNumber, idCardImages vào payload
  const { fullName, email, password, phoneNumber, idCardNumber, idCardImages } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email đã tồn tại' });

    // Nếu lúc đăng ký có gửi kèm idCardNumber thì đánh dấu là Verified luôn
    const ekycStatus = idCardNumber ? 'verified' : 'unverified';

    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber,       // Lưu SĐT
      idCardNumber,      // Lưu CCCD
      idCardImages,      // Lưu mảng ảnh
      ekycStatus         // Lưu trạng thái eKYC
    });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        ekycStatus: user.ekycStatus
      }
    });

  } catch (error) {
    res.status(400).json({ message: 'Lỗi đăng ký', error: error.message });
  }
};

// 3. [USER] PUT /api/auth/profile (API Update thông tin User mới tinh)
exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.fullName = req.body.fullName || user.fullName;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    user.address = req.body.address || user.address;
    user.avatarUrl = req.body.avatarUrl || user.avatarUrl;
    if (req.body.idCardNumber) {
      user.idCardNumber = req.body.idCardNumber;
      user.ekycStatus = 'verified';
    }
    if (Array.isArray(req.body.idCardImages) && req.body.idCardImages.length > 0) {
      user.idCardImages = req.body.idCardImages;
    }
    
    // Lưu ý: Thường không cho phép update CCCD ở đây, muốn đổi CCCD phải làm luồng khác
    // Nếu đổi pass, phải thêm logic so sánh pass cũ. Ở đây tạm update thông tin cơ bản.

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address,
      avatarUrl: updatedUser.avatarUrl,
      ekycStatus: updatedUser.ekycStatus
    });
  } else {
    res.status(404).json({ message: 'Không tìm thấy User' });
  }
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
          role: user.role
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

// 1. [PUBLIC] POST /api/auth/verify-ekyc (Chỉ dùng để mớm data cho form Đăng ký)
exports.verifyEKYC = async (req, res) => {
  const { idCardFrontUrl } = req.body; 

  try {
    if (!idCardFrontUrl) return res.status(400).json({ message: 'Vui lòng cung cấp URL ảnh mặt trước CCCD' });

    console.log('\n[DEBUG - eKYC] 1. Tải ảnh từ URL...');
    const imageResponse = await axios.get(idCardFrontUrl, { responseType: 'stream' });

    console.log('[DEBUG - eKYC] 2. Gửi ảnh sang FPT.AI...');
    const form = new FormData();
    form.append('image', imageResponse.data);

    const fptResponse = await axios.post('https://api.fpt.ai/vision/idr/vnm', form, {
      headers: {
        'api-key': process.env.FPT_AI_API_KEY, 
        ...form.getHeaders()
      }
    });

    const fptData = fptResponse.data;
    if (fptData.errorCode !== 0) {
      return res.status(400).json({ message: 'AI không đọc được ảnh!', fptError: fptData.errorMessage });
    }

    const extractedData = fptData.data[0];
    console.log(`[DEBUG - eKYC] ✔️ Đọc xong! Trả data về cho Frontend tự fill form.`);

    // CHỈ TRẢ DATA VỀ CHO FRONTEND, KHÔNG LƯU DB LÚC NÀY
    res.status(200).json({ 
      message: 'Quét eKYC thành công!',
      extractedData: {
        idNumber: extractedData.id,
        fullName: extractedData.name,
        dob: extractedData.dob, 
        address: extractedData.address 
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống eKYC', error: error.message });
  }
};