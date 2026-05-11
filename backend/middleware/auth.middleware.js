const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Middleware_bảo_vệ_các_route
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header (ví dụ: "Bearer ...token...")
      token = req.headers.authorization.split(' ')[1];

      // Xác thực token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Lấy thông tin user từ token (không bao gồm mật khẩu)
      // Gắn user vào object 'req' để các hàm controller sau có thể sử dụng
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Đi tiếp đến controller
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Unauthorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized, no token' });
  }
};

// Middleware_kiểm_tra_quyền_Admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin role required' });
  }
};

// Middleware kiểm tra xem user đã eKYC chưa (Có tick xanh chưa)
const checkVerified = (req, res, next) => {
  if (req.user && req.user.ekycStatus === 'verified') {
    next(); // Có tick xanh -> Cho qua
  } else {
    res.status(403).json({ 
      message: 'Forbidden: Vui lòng xác thực danh tính (eKYC) để sử dụng tính năng này!',
      ekycStatus: req.user ? req.user.ekycStatus : 'unknown'
    });
  }
};

module.exports = { protect, admin, checkVerified };