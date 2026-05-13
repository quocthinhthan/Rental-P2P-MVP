// notification-worker/worker.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const amqp = require('amqplib');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const QUEUE_NAME = 'notification_queue';
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://rabbitmq';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/p2p_rental';

let User, Rental, Item;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    console.log('[WORKER] Attempting to connect to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[WORKER] MongoDB Connected successfully.');
    
    User = require('./User.model.js');
    Rental = require('./Rental.model.js');
    Item = require('./Item.model.js');
  } catch (err) {
    console.error('[WORKER] MongoDB connection error:', err.message);
    throw err;
  }
};

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Format date helper
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Send email notifications
const sendNotification = async (data) => {
  if (!User || !Rental || !Item) {
    throw new Error('Models not initialized. Requeuing task.');
  }

  try {

    if (data.task === 'forgot_password') {
      console.log(`[WORKER] Processing: forgot password for ${data.email}`);
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${data.resetToken}`;

      const mailOptions = {
        from: `"P2P Rental" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: `🔑 Yêu cầu khôi phục mật khẩu`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Khôi phục mật khẩu</h2>
          <p>Xin chào <strong>${data.fullName}</strong>,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng bấm vào nút bên dưới để đặt lại mật khẩu (Link có hiệu lực trong 10 phút):</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#28a745;color:#fff;text-decoration:none;border-radius:5px;">Đặt lại mật khẩu</a>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`[WORKER] Password reset email sent to ${data.email}`);
      
      return; 
    }

    const rental = await Rental.findById(data.rentalId)
      .populate('itemId', 'name')
      .populate('renterId', 'fullName email')
      .populate('ownerId', 'fullName email')
      .lean();

    if (!rental) {
      console.error(`[WORKER] Rental with ID ${data.rentalId} not found.`);
      return;
    }

    const {
      renterId,
      ownerId,
      itemId,
      startDate,
      endDate,
      note,
      rentalFee,
      depositAmount,
      totalAmount,
      status
    } = rental;

    // ================= EMAIL TEMPLATE =================

    if (data.task === 'new_rental_request') {
      console.log(`[WORKER] Processing: new rental request`);

      if (!ownerId) return console.error('Owner not found');

      const mailOptions = {
        from: `"P2P Rental" <${process.env.EMAIL_USER}>`,
        to: ownerId.email,
        subject: `📩 Yêu cầu thuê mới: "${itemId.name}"`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color:#007bff;">Yêu cầu thuê mới</h2>
          <p>Xin chào <strong>${ownerId.fullName}</strong>,</p>
          <p>Bạn có yêu cầu thuê cho vật phẩm:</p>

          <div style="padding:12px;border-left:4px solid #007bff;background:#f4f7ff">
            <p><strong>Vật phẩm:</strong> ${itemId.name}</p>
            <p><strong>Người thuê:</strong> ${renterId.fullName} (${renterId.email})</p>
            <p><strong>Thời gian:</strong> ${formatDate(startDate)} ➝ ${formatDate(endDate)}</p>
            <p><strong>Phí thuê:</strong> ${Number(rentalFee || 0).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Tiền cọc:</strong> ${Number(depositAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Tổng thanh toán:</strong> ${Number(totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
            <p><strong>Ghi chú:</strong> ${note || '<em>Không có</em>'}</p>
          </div>

          <a href="${process.env.FRONTEND_URL || '#'}"
            style="display:inline-block;margin-top:16px;padding:10px 18px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;">
            Xử lý yêu cầu
          </a>

          <p style="margin-top:24px;">Trân trọng,<br><strong>P2P Rental Team</strong></p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`[WORKER] Email sent to owner ${ownerId.email}`);
    }

    if (data.task === 'rental_status_changed') {
      console.log(`[WORKER] Processing status changed: ${status}`);

      if (!renterId) return console.error('Renter not found');

      let color = '#6c757d';
      let message = '';
      let title = '📢 Cập nhật đơn thuê';

      if (status === 'confirmed') {
        color = '#28a745';
        title = '✅ Đơn thuê đã được chấp nhận';
        message = `
        <p>Yêu cầu thuê <strong>${itemId.name}</strong> từ 
        ${formatDate(startDate)} đến ${formatDate(endDate)} đã được chấp nhận.</p>
        <p>Vui lòng liên hệ chủ sở hữu để nhận vật phẩm.</p>`;
      }

      if (status === 'rejected') {
        color = '#dc3545';
        title = '❌ Đơn thuê đã bị từ chối';
        message = `
        <p>Yêu cầu thuê <strong>${itemId.name}</strong> đã bị từ chối.</p>
        <p>Bạn có thể tìm vật phẩm khác phù hợp hơn.</p>`;
      }

      const mailOptions = {
        from: `"P2P Rental" <${process.env.EMAIL_USER}>`,
        to: renterId.email,
        subject: title,
        html: `
        <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
          <h2 style="color:${color};">${title}</h2>
          <p>Xin chào <strong>${renterId.fullName}</strong> (${renterId.email}),</p>

          <div style="padding:14px;border-left:4px solid ${color};background:#f8f9fa;margin:14px 0;">
            ${message}
          </div>

          <a href="${process.env.FRONTEND_URL || '#'}"
            style="display:inline-block;padding:10px 18px;background:${color};color:#fff;text-decoration:none;border-radius:6px;">
            Xem chi tiết đơn thuê
          </a>

          <p style="margin-top:24px;">Trân trọng,<br><strong>P2P Rental Team</strong></p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`[WORKER] Email sent to renter ${renterId.email}`);
    }
  } catch (error) {
    console.error('[WORKER] Email failed:', error.message);
    throw error;
  }
};

// Worker listen queue
const startWorker = async () => {
  try {
    await connectDB();
    console.log('[WORKER] Connecting to RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`[WORKER] Waiting for messages in: "${QUEUE_NAME}"`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      console.log('[WORKER] <<< New message received');

      try {
        const data = JSON.parse(msg.content.toString());
        await sendNotification(data);
        channel.ack(msg);
      } catch (err) {
        console.error('[WORKER] Message failed, requeueing...', err.message);
        setTimeout(() => channel.nack(msg, false, true), 3000);
      }
    });

    connection.on("close", () => {
      console.error("[WORKER] RabbitMQ closed. Reconnecting...");
      setTimeout(startWorker, 5000);
    });
    connection.on("error", (err) => {
      console.error("[WORKER] RabbitMQ error:", err.message);
    });

  } catch (err) {
    console.error('[WORKER] Start failed:', err.message);
    console.log('Retrying...');
    setTimeout(startWorker, 5000);
  }
};

console.log('[WORKER] Starting...');
startWorker();
