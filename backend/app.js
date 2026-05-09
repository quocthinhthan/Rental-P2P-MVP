// backend/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { connectRabbitMQ } = require('./config/rabbitmq'); // Import RabbitMQ

// Tải biến môi trường
dotenv.config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();

// Kết nối CSDL
connectDB();

// Kết nối RabbitMQ
connectRabbitMQ();

const app = express();

// Kích hoạt CORS
app.use(cors());

// Middleware để parse JSON bodies
app.use(express.json());

// Route cơ bản
app.get('/', (req, res) => {
  res.send('P2P Rental API (backend-api) is running...');
});

// ===============================================================
// Gắn các API routes
// ===============================================================
app.use('/api/auth', require('./routes/auth.routes')); // (Đã bỏ comment)
app.use('/api/items', require('./routes/items.routes'));
app.use('/api/rentals', require('./routes/rentals.routes')); // (Mới)
app.use('/api/views', require('./routes/views.routes'));
app.use('/api/admin', require('./routes/admin.routes')); // (Mới)

// THÊM DÒNG MỚI NÀY
app.use('/api/upload', require('./routes/upload.routes'));

// ===============================================================
// Xử lý lỗi (Thêm vào cuối file)
// ===============================================================

// Middleware xử lý lỗi 404 (Not Found)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Middleware xử lý lỗi chung (Error Handler)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;