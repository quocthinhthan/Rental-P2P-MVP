// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { connectRabbitMQ } = require('./config/rabbitmq'); // >>> THÊM: Import hàm kết nối RabbitMQ

const app = express();
const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));

// --- Middleware ---
// Swagger UI và frontend local đều cần gọi API thoải mái trong môi trường dev.
// Nếu cần siết lại sau, ta có thể giới hạn bằng env var riêng.
app.use(cors());
app.options('*', cors());
app.use(express.json());

// --- Hàm kết nối DB ---
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('FATAL ERROR: MONGO_URI is not defined.');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected successfully.');
};

// --- Import & Mount Routes ---
// ... (giữ nguyên không đổi)
const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/items.routes');
const rentalRoutes = require('./routes/rentals.routes');
const viewRoutes = require('./routes/views.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');

const reviewRoutes = require('./routes/reviews.routes');

const disputeRoutes = require('./routes/disputes.routes'); 

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/views', viewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);

app.use('/api/disputes', disputeRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.send('Backend API is running...');
});

// --- >>> THAY ĐỔI LỚN: TRÌNH TỰ KHỞI ĐỘNG <<< ---
const startServer = async () => {
  try {
    // 1. Kết nối đến DB và chờ hoàn tất
    await connectDB();

    // 2. Kết nối đến RabbitMQ nhưng không chặn server khởi động nếu không có
    try {
      await connectRabbitMQ();
    } catch (err) {
      console.warn('[BACKEND] RabbitMQ not available at startup, continuing without it.');
    }

    // 3. SAU KHI tất cả kết nối đã sẵn sàng, MỚI khởi động Express server
    const PORT = process.env.PORT || 5000;
    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1); // Thoát nếu không thể khởi động
  }
};

// Gọi hàm để bắt đầu toàn bộ quá trình
startServer();
