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

let User, Rental, Item, Contract;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    console.log('[WORKER] Attempting to connect to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[WORKER] MongoDB Connected successfully.');
    
    User = require('./User.model.js');
    Rental = require('./Rental.model.js');
    Item = require('./Item.model.js');
    Contract = require('./Contract.model.js');
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

const https = require('https');

const fetchImageBuffer = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: status code ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
};

const sanitizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
};

// Send email notifications
const sendNotification = async (data) => {
  if (!User || !Rental || !Item || !Contract) {
    throw new Error('Models not initialized. Requeuing task.');
  }

  try {

    if (data.task === 'contract_fully_signed') {
      console.log(`[WORKER] Processing contract_fully_signed for rental ${data.rentalId}`);

      const contract = await Contract.findOne({ rentalId: data.rentalId }).lean();
      if (!contract) {
        console.error(`[WORKER] Contract not found for rental ${data.rentalId}`);
        return;
      }

      // Fetch signature buffers
      let ownerSigBuffer = null;
      let renterSigBuffer = null;

      if (contract.ownerSignatureUrl) {
        try {
          const finalUrl = sanitizeUrl(contract.ownerSignatureUrl);
          console.log(`[WORKER] Fetching owner signature image from: ${finalUrl}`);
          ownerSigBuffer = await fetchImageBuffer(finalUrl);
        } catch (err) {
          console.error('[WORKER] Failed to fetch owner signature image:', err.message);
        }
      }

      if (contract.renterSignatureUrl) {
        try {
          const finalUrl = sanitizeUrl(contract.renterSignatureUrl);
          console.log(`[WORKER] Fetching renter signature image from: ${finalUrl}`);
          renterSigBuffer = await fetchImageBuffer(finalUrl);
        } catch (err) {
          console.error('[WORKER] Failed to fetch renter signature image:', err.message);
        }
      }

      const rental = await Rental.findById(data.rentalId)
        .populate('renterId', 'fullName email')
        .populate('ownerId', 'fullName email')
        .lean();

      if (!rental) {
        console.error(`[WORKER] Rental not found for ID ${data.rentalId}`);
        return;
      }

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      
      const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
      });

      try {
        doc.registerFont('Arial', 'C:\\Windows\\Fonts\\Arial.ttf');
        doc.registerFont('Arial-Bold', 'C:\\Windows\\Fonts\\Arialbd.ttf');
        doc.font('Arial');
      } catch (fontErr) {
        console.warn('[WORKER] Failed to load Windows Arial font, falling back to Helvetica:', fontErr.message);
      }

      doc.fontSize(10).fillColor('#475569').text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { align: 'center' });
      doc.fontSize(10).fillColor('#475569').text('Độc lập - Tự do - Hạnh phúc', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#94a3b8').text('----------------------------------', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(18).fillColor('#0f172a').font('Arial-Bold').text('HỢP ĐỒNG THUÊ TÀI SẢN NỘI BỘ', { align: 'center' });
      doc.fontSize(9).fillColor('#64748b').font('Arial').text(`Số hợp đồng: ${contract._id || 'Chưa cấp mã'}`, { align: 'center' });
      doc.moveDown(1.5);

      const contractDate = new Date(contract.createdAt || Date.now());
      doc.fontSize(9).fillColor('#334155').text(`Hôm nay, ngày ${contractDate.getDate()} tháng ${contractDate.getMonth() + 1} năm ${contractDate.getFullYear()}, tại hệ thống Rental P2P, chúng tôi gồm các bên dưới đây đồng ý ký kết hợp đồng thuê tài sản này:`, { align: 'left', lineGap: 3 });
      doc.moveDown(1);

      doc.fontSize(12).fillColor('#0284c7').font('Arial-Bold').text('1. CÁC BÊN THAM GIA HỢP ĐỒNG');
      doc.fontSize(9).fillColor('#334155').font('Arial');
      doc.moveDown(0.5);

      doc.font('Arial-Bold').text('Bên Cho Thuê (Bên A):');
      doc.font('Arial').text(`  - Họ và tên: ${contract.ownerInfo?.fullName || 'Chưa cập nhật'}`);
      doc.text(`  - Số CMND/CCCD: ${contract.ownerInfo?.idCardNumber || 'Chưa xác thực eKYC'}`);
      doc.text('  - Vai trò trên hệ thống: Chủ sở hữu');
      doc.moveDown(0.5);

      doc.font('Arial-Bold').text('Bên Thuê (Bên B):');
      doc.font('Arial').text(`  - Họ và tên: ${contract.renterInfo?.fullName || 'Chưa cập nhật'}`);
      doc.text(`  - Số CMND/CCCD: ${contract.renterInfo?.idCardNumber || 'Chưa xác thực eKYC'}`);
      doc.text('  - Vai trò trên hệ thống: Người thuê đồ');
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#0284c7').font('Arial-Bold').text('2. CHI TIẾT TÀI SẢN THUÊ & CHI PHÍ');
      doc.fontSize(9).fillColor('#334155').font('Arial');
      doc.moveDown(0.5);

      const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')} VNĐ`;
      const start = new Date(contract.rentalPeriod?.startDate);
      const end = new Date(contract.rentalPeriod?.endDate);
      const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const depositVal = contract.totalPrice - ((contract.itemInfo?.pricePerDay || 0) * rentalDays);

      doc.text(`  - Tên sản phẩm thuê: ${contract.itemInfo?.name || 'Tài sản thuê'}`);
      doc.text(`  - Đơn giá thuê / Ngày: ${formatCurrency(contract.itemInfo?.pricePerDay)}`);
      doc.text(`  - Thời hạn thuê: Từ ngày ${start.toLocaleDateString('vi-VN')} đến ngày ${end.toLocaleDateString('vi-VN')} (${rentalDays} ngày)`);
      doc.text(`  - Tiền ký quỹ (Tiền cọc): ${formatCurrency(depositVal)}`);
      doc.font('Arial-Bold').text(`  - Tổng giá trị thanh toán: ${formatCurrency(contract.totalPrice)}`);
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#0284c7').font('Arial-Bold').text('3. ĐIỀU KHOẢN VÀ CAM KẾT');
      doc.fontSize(9).fillColor('#334155').font('Arial');
      doc.moveDown(0.5);
      doc.text(contract.terms || 'Hai bên cam kết giao nhận tài sản đúng như mô tả. Nếu có hư hỏng, hệ thống sẽ sử dụng tiền ký quỹ để đền bù theo quy định của pháp luật.', { lineGap: 3 });
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#0284c7').font('Arial-Bold').text('4. CHỮ KÝ ĐIỆN TỬ HAI BÊN');
      doc.moveDown(0.5);

      const yStart = doc.y;

      // Column A: Owner
      doc.x = 50;
      doc.y = yStart;
      doc.fontSize(10).fillColor('#0f172a').font('Arial-Bold').text('Đại diện Bên A (Chủ đồ):', { width: 230 });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#475569').font('Arial');
      doc.text(`- Họ tên: ${contract.ownerInfo?.fullName || ''}`, { width: 230 });
      doc.text(`- Ký lúc: ${new Date(contract.ownerSignedAt).toLocaleString('vi-VN')}`, { width: 230 });
      doc.text('- Xác thực chữ ký: ĐÃ XÁC NHẬN CHỮ KÝ ĐIỆN TỬ TRÊN HỆ THỐNG', { width: 230 });
      doc.moveDown(0.5);
      if (ownerSigBuffer) {
        try {
          doc.image(ownerSigBuffer, { width: 140, height: 60 });
        } catch (imgErr) {
          console.error('[WORKER] Error drawing owner signature image:', imgErr.message);
          doc.fontSize(8).fillColor('#dc2626').text('(Lỗi hiển thị hình ảnh chữ ký)', { width: 230 });
        }
      }

      // Column B: Renter
      doc.x = 320;
      doc.y = yStart;
      doc.fontSize(10).fillColor('#0f172a').font('Arial-Bold').text('Đại diện Bên B (Người thuê):', { width: 230 });
      doc.moveDown(0.3);
      doc.fontSize(8).fillColor('#475569').font('Arial');
      doc.text(`- Họ tên: ${contract.renterInfo?.fullName || ''}`, { width: 230 });
      doc.text(`- Ký lúc: ${new Date(contract.renterSignedAt).toLocaleString('vi-VN')}`, { width: 230 });
      doc.text('- Xác thực chữ ký: ĐÃ XÁC NHẬN CHỮ KÝ ĐIỆN TỬ TRÊN HỆ THỐNG', { width: 230 });
      doc.moveDown(0.5);
      if (renterSigBuffer) {
        try {
          doc.image(renterSigBuffer, { width: 140, height: 60 });
        } catch (imgErr) {
          console.error('[WORKER] Error drawing renter signature image:', imgErr.message);
          doc.fontSize(8).fillColor('#dc2626').text('(Lỗi hiển thị hình ảnh chữ ký)', { width: 230 });
        }
      }

      // Reset x position and complete doc
      doc.x = 50;
      doc.moveDown(1.5);
      doc.end();

      const pdfBuffer = await pdfPromise;

      const mailOptions = {
        from: `"P2P Rental" <${process.env.EMAIL_USER}>`,
        to: [rental.ownerId.email, rental.renterId.email].join(','),
        subject: `📄 Hợp đồng điện tử đã ký kết thành công: "${contract.itemInfo?.name}"`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color:#28a745;">Ký kết hợp đồng thành công</h2>
          <p>Xin chào <strong>${rental.ownerId.fullName}</strong> và <strong>${rental.renterId.fullName}</strong>,</p>
          <p>Hai bên đã hoàn tất việc ký kết hợp đồng điện tử cho đơn thuê vật phẩm <strong>${contract.itemInfo?.name}</strong>.</p>
          <p>Đính kèm trong email này là tệp PDF hợp đồng chính thức để hai bên lưu trữ và làm bằng chứng đối chiếu khi giao nhận đồ.</p>
          <p>Vui lòng tiến hành giao nhận đồ đúng hẹn và kiểm tra kỹ tình trạng sản phẩm trước khi xác nhận trên hệ thống.</p>
          <br>
          <p>Trân trọng,<br><strong>P2P Rental Team</strong></p>
        </div>`,
        attachments: [
          {
            filename: `hop-dong-dien-tu-${rental.code || data.rentalId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`[WORKER] PDF contract email sent successfully to ${rental.ownerId.email} and ${rental.renterId.email}`);
      return;
    }

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
        <p><strong>Hợp đồng điện tử đã sẵn sàng. Vui lòng mở đơn thuê và ký hợp đồng trước khi giao nhận vật phẩm.</strong></p>
        <p>Yêu cầu thuê <strong>${itemId.name}</strong> từ 
        ${formatDate(startDate)} đến ${formatDate(endDate)} đã được chấp nhận.</p>
        <p>Sau khi cả hai bên ký đầy đủ, đơn thuê mới có thể chuyển sang bước giao/nhận đồ.</p>`;
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
