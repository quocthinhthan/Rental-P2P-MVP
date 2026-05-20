// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { connectRabbitMQ } = require('./config/rabbitmq'); // >>> THÊM: Import hàm kết nối RabbitMQ

const User = require('./models/User.model');
const Message = require('./models/Message.model');
const {
  authorizeChatRead,
  authorizeChatWrite
} = require('./services/chatAuthorization.service');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Cho phép FE (React/Vue/Flutter) kết nối
    methods: ["GET", "POST"]
  }
});

// Lắng nghe các sự kiện Real-time
io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || headerToken;

    if (!token) {
      return next(new Error('Unauthorized, no token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Tai khoan khong ton tai'));
    }

    if (user.isBanned) {
      return next(new Error('Tai khoan da bi khoa'));
    }

    if (user.suspendedUntil && new Date() < new Date(user.suspendedUntil)) {
      return next(new Error('Tai khoan dang bi dinh chi'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Unauthorized, token failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);

  // 1. Tham gia vào phòng chat của 1 Đơn thuê
  socket.on('join_rental_room', async (rentalId) => {
    try {
      const { error } = await authorizeChatRead(rentalId, socket.user);
      if (error) {
        socket.emit('chat_error', { message: error.message });
        return;
      }

      socket.join(rentalId.toString());
      console.log(`User ${socket.id} joined room: ${rentalId}`);
    } catch (error) {
      socket.emit('chat_error', { message: 'Khong the tham gia phong chat' });
    }
  });

  // 2. Lắng nghe tin nhắn mới
  socket.on('send_message', async (data) => {
    // data FE gửi lên sẽ có dạng: { rentalId, senderId, content }
    try {
      const rentalId = data?.rentalId;
      const content = typeof data?.content === 'string' ? data.content.trim() : '';

      if (!content) {
        socket.emit('chat_error', { message: 'Noi dung tin nhan khong duoc de trong' });
        return;
      }

      const { error } = await authorizeChatWrite(rentalId, socket.user);
      if (error) {
        socket.emit('chat_error', { message: error.message });
        return;
      }
      
      // Lưu vào Database để làm bằng chứng sau này
      const savedMessage = await Message.create({
        rentalId,
        senderId: socket.user._id,
        content
      });

      // Phát (Broadcast) tin nhắn đó lại cho tất cả những ai đang trong phòng (bao gồm cả người gửi để hiển thị)
      io.to(rentalId.toString()).emit('receive_message', savedMessage);
      
    } catch (error) {
      console.error('[SOCKET] Lỗi lưu tin nhắn:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`);
  });
});

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
const userRoutes = require('./routes/users.routes');

const reviewRoutes = require('./routes/reviews.routes');

const disputeRoutes = require('./routes/disputes.routes'); 

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/views', viewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
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

    server.listen(PORT, () => {
      console.log(`[SERVER] Đang chạy trên cổng ${PORT} (Đã tích hợp Socket.io Real-time)`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1); // Thoát nếu không thể khởi động
  }
};

// Gọi hàm để bắt đầu toàn bộ quá trình
startServer();
