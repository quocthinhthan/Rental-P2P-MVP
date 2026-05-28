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

// // Shared helper to generate a beautiful contract PDF
const generateContractPDF = async (contract, rental, ownerSigBuffer, renterSigBuffer, includeAnnex) => {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });

  // ── Font setup ──────────────────────────────────────────────────────────
  try {
    doc.registerFont('Arial', 'C:\\Windows\\Fonts\\Arial.ttf');
    doc.registerFont('Arial-Bold', 'C:\\Windows\\Fonts\\Arialbd.ttf');
    doc.font('Arial');
  } catch (fontErr) {
    console.warn('[WORKER] Arial not found, falling back to Helvetica:', fontErr.message);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatCurrency = (val) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;
  const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('vi-VN');
  };
  const fmtDateTime = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '-' : dt.toLocaleString('vi-VN');
  };

  const start = new Date(contract.rentalPeriod?.startDate);
  const end   = new Date(contract.rentalPeriod?.endDate);
  const rentalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const depositVal  = contract.totalPrice - ((contract.itemInfo?.pricePerDay || 0) * rentalDays);

  const PAGE_W = 595 - 100; // A4 width minus 2×50 margin
  const contractDate = new Date(contract.createdAt || Date.now());

  // ── Helpers: draw a section title bar (matching web "contract-section-title") ──
  const drawSectionTitle = (text) => {
    doc.moveDown(0.6);
    const y = doc.y;
    doc.rect(50, y, PAGE_W, 22).fill('#f1f5f9');
    doc.fillColor('#0f172a').font('Arial-Bold').fontSize(9)
       .text(text, 58, y + 6, { width: PAGE_W - 16 });
    doc.moveDown(0.2);
    doc.font('Arial');
  };

  // ── Helpers: draw a two-cell table row ──────────────────────────────────
  const drawTableRow = (label, value, highlight = false, totalRow = false) => {
    const rowH = 20;
    const y = doc.y;
    const col1W = PAGE_W * 0.45;
    const col2W = PAGE_W - col1W;

    const fillColor = totalRow ? '#dcfce7' : highlight ? '#f8fafc' : '#ffffff';
    doc.rect(50, y, col1W, rowH).fill(fillColor);
    doc.rect(50 + col1W, y, col2W, rowH).fill(fillColor);

    // borders
    doc.rect(50, y, PAGE_W, rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.moveTo(50 + col1W, y).lineTo(50 + col1W, y + rowH).stroke();

    const textY = y + 5;
    doc.fillColor('#475569').font('Arial').fontSize(8.5)
       .text(label, 56, textY, { width: col1W - 10 });
    doc.fillColor(totalRow ? '#166534' : '#0f172a')
       .font(totalRow ? 'Arial-Bold' : 'Arial').fontSize(8.5)
       .text(value, 56 + col1W, textY, { width: col2W - 10 });

    doc.y = y + rowH;
  };

  // ── Circular seal (matches frontend contract-seal) ───────────────────────
  const sealX = 50 + PAGE_W - 56;   // right-aligned
  const sealY = 38;
  const sealR = 36;
  doc.circle(sealX, sealY + sealR, sealR)
     .lineWidth(2).strokeColor('#1a6b4a').stroke();
  doc.circle(sealX, sealY + sealR, sealR - 5)
     .lineWidth(0.5).strokeColor('#1a6b4a').stroke();
  doc.fillColor('#1a6b4a').font('Arial-Bold').fontSize(5.5)
     .text('RENTAL P2P', sealX - 22, sealY + sealR - 12, { width: 44, align: 'center' });
  doc.font('Arial-Bold').fontSize(5)
     .text('ĐÃ KÝ ĐIỆN TỬ', sealX - 22, sealY + sealR - 3, { width: 44, align: 'center' });
  doc.font('Arial').fontSize(4.5)
     .text('FULLY SIGNED', sealX - 22, sealY + sealR + 5, { width: 44, align: 'center' });

  // ── Title block ─────────────────────────────────────────────────────────
  doc.y = 50;
  doc.fontSize(16).fillColor('#0f172a').font('Arial-Bold')
     .text('HỢP ĐỒNG THUÊ TÀI SẢN NỘI BỘ', 50, doc.y, { align: 'center', width: PAGE_W });
  doc.moveDown(0.35);
  doc.fontSize(8.5).fillColor('#64748b').font('Arial')
     .text(`Số hợp đồng: ${contract._id || 'Chưa cấp mã'}`, { align: 'center', width: PAGE_W });
  doc.moveDown(0.6);

  // Thin rule
  doc.moveTo(50, doc.y).lineTo(50 + PAGE_W, doc.y)
     .lineWidth(0.5).strokeColor('#cbd5e1').stroke();
  doc.moveDown(0.6);

  // Preamble
  doc.fontSize(8.5).fillColor('#475569').font('Arial')
     .text(
       `Hôm nay, ngày ${contractDate.getDate()} tháng ${contractDate.getMonth() + 1} năm ${contractDate.getFullYear()}, ` +
       `tại hệ thống Rental P2P, chúng tôi gồm các bên dưới đây đồng ý ký kết hợp đồng thuê tài sản này:`,
       { lineGap: 2 }
     );

  // ── Section 1: Parties ───────────────────────────────────────────────────
  drawSectionTitle('Các bên tham gia hợp đồng');
  doc.moveDown(0.4);

  const partyTopY = doc.y;
  const halfW = (PAGE_W - 12) / 2;

  // Card A
  doc.rect(50, partyTopY, halfW, 68).fill('#f8fafc').stroke('#e2e8f0');
  doc.rect(50, partyTopY, halfW, 14).fill('#dbeafe');
  doc.fillColor('#1e40af').font('Arial-Bold').fontSize(8)
     .text('Bên Cho Thuê (Bên A)', 56, partyTopY + 3, { width: halfW - 12 });
  let pY = partyTopY + 18;
  doc.fillColor('#334155').font('Arial').fontSize(8);
  doc.text(`Họ và tên: ${contract.ownerInfo?.fullName || 'Chưa cập nhật'}`, 56, pY, { width: halfW - 12 }); pY += 14;
  doc.text(`Số CMND/CCCD: ${contract.ownerInfo?.idCardNumber || 'Chưa xác thực eKYC'}`, 56, pY, { width: halfW - 12 }); pY += 14;
  doc.text('Vai trò: Chủ sở hữu', 56, pY, { width: halfW - 12 });

  // Card B
  const bX = 50 + halfW + 12;
  doc.rect(bX, partyTopY, halfW, 68).fill('#f8fafc').stroke('#e2e8f0');
  doc.rect(bX, partyTopY, halfW, 14).fill('#dcfce7');
  doc.fillColor('#166534').font('Arial-Bold').fontSize(8)
     .text('Bên Thuê (Bên B)', bX + 6, partyTopY + 3, { width: halfW - 12 });
  pY = partyTopY + 18;
  doc.fillColor('#334155').font('Arial').fontSize(8);
  doc.text(`Họ và tên: ${contract.renterInfo?.fullName || 'Chưa cập nhật'}`, bX + 6, pY, { width: halfW - 12 }); pY += 14;
  doc.text(`Số CMND/CCCD: ${contract.renterInfo?.idCardNumber || 'Chưa xác thực eKYC'}`, bX + 6, pY, { width: halfW - 12 }); pY += 14;
  doc.text('Vai trò: Người thuê đồ', bX + 6, pY, { width: halfW - 12 });

  doc.y = partyTopY + 68 + 4;

  // ── Section 2: Asset & Cost table ────────────────────────────────────────
  drawSectionTitle('Chi tiết tài sản thuê & Chi phí');
  doc.moveDown(0.3);

  // Table header
  const tHY = doc.y;
  const c1W = PAGE_W * 0.45;
  const c2W = PAGE_W - c1W;
  doc.rect(50, tHY, c1W, 18).fill('#1e3a5f');
  doc.rect(50 + c1W, tHY, c2W, 18).fill('#1e3a5f');
  doc.fillColor('#ffffff').font('Arial-Bold').fontSize(8.5)
     .text('Nội dung tài sản', 56, tHY + 4, { width: c1W - 10 });
  doc.text('Thông tin chi tiết', 56 + c1W, tHY + 4, { width: c2W - 10 });
  doc.y = tHY + 18;

  drawTableRow('Tên sản phẩm thuê', contract.itemInfo?.name || 'Tài sản thuê', false, false);
  drawTableRow('Đơn giá thuê / Ngày', `${formatCurrency(contract.itemInfo?.pricePerDay)} / ngày`);
  drawTableRow('Thời hạn thuê', `${fmtDate(contract.rentalPeriod?.startDate)} → ${fmtDate(contract.rentalPeriod?.endDate)} (${rentalDays} ngày)`);
  drawTableRow('Tiền ký quỹ (Tiền cọc)', formatCurrency(depositVal), true);
  drawTableRow('Tổng giá trị thanh toán', formatCurrency(contract.totalPrice), false, true);

  // ── Section 3: Terms ─────────────────────────────────────────────────────
  drawSectionTitle('Điều khoản và Cam kết');
  doc.moveDown(0.4);
  doc.fontSize(8.5).fillColor('#334155').font('Arial')
     .text(
       contract.terms ||
       'Hai bên cam kết giao nhận tài sản đúng như mô tả. Nếu có hư hỏng, hệ thống sẽ sử dụng tiền ký quỹ để đền bù theo quy định của pháp luật.',
       { lineGap: 3 }
     );

  // ── Section 4: Handover annex (if present in rental & requested) ──────────
  if (includeAnnex && rental && (rental.pickupReport || rental.returnReport)) {
    drawSectionTitle('Phụ lục Bàn giao & Hoàn trả');
    doc.moveDown(0.4);

    const annHalfW = (PAGE_W - 12) / 2;
    const annTopY = doc.y;

    const conditionLabel = (c) =>
      c === 'good' ? 'Tốt / Nguyên vẹn' :
      c === 'fair' ? 'Bình thường / Hao mòn nhẹ' : 'Hư hỏng / Hao mòn nhiều';

    const drawReportCard = (report, title, xOff) => {
      if (!report) return;
      const cardH = 80;
      doc.rect(xOff, annTopY, annHalfW, cardH)
         .lineWidth(0.5).dash(3, { space: 3 }).stroke('#94a3b8').undash();
      doc.rect(xOff, annTopY, annHalfW, 14).fill('#f1f5f9');
      doc.fillColor('#475569').font('Arial-Bold').fontSize(7.5)
         .text(title, xOff + 6, annTopY + 3, { width: annHalfW - 12 });
      let rY = annTopY + 18;
      doc.fillColor('#334155').font('Arial').fontSize(7.5);
      doc.text(`Tình trạng: ${conditionLabel(report.condition)}`, xOff + 6, rY, { width: annHalfW - 12 }); rY += 12;
      doc.text(`Phụ kiện: ${report.accessories || 'Không có'}`, xOff + 6, rY, { width: annHalfW - 12 }); rY += 12;
      if (report.damages) {
        doc.fillColor('#dc2626').text(`Hư hỏng: ${report.damages}`, xOff + 6, rY, { width: annHalfW - 12 });
        doc.fillColor('#334155'); rY += 12;
      }
      if (report.notes) {
        doc.text(`Ghi chú: ${report.notes}`, xOff + 6, rY, { width: annHalfW - 12 }); rY += 12;
      }
      if (report.recordedAt) {
        doc.fillColor('#64748b').fontSize(7)
           .text(`Thời gian: ${fmtDateTime(report.recordedAt)}`, xOff + 6, rY, { width: annHalfW - 12 });
      }
    };

    if (rental.pickupReport)  drawReportCard(rental.pickupReport,  'Biên bản Bàn giao (Nhận đồ)', 50);
    if (rental.returnReport)  drawReportCard(rental.returnReport,  'Biên bản Hoàn trả (Trả đồ)',  50 + annHalfW + 12);
    doc.y = annTopY + 80 + 6;
  }

  // ── Section 5: Signatures ─────────────────────────────────────────────────
  drawSectionTitle('Chữ ký điện tử hai bên');
  doc.moveDown(0.5);

  const sigTopY = doc.y;
  const sigHalfW = (PAGE_W - 12) / 2;
  const sigCardH = 110;

  const drawSigCard = async (xOff, title, info, sigBuf, signedAt) => {
    const isSigned = !!sigBuf;
    const borderColor = isSigned ? '#bbf7d0' : '#e2e8f0';
    const headerBg   = isSigned ? '#dcfce7' : '#f8fafc';
    const headerTxt  = isSigned ? '#166534' : '#475569';

    doc.rect(xOff, sigTopY, sigHalfW, sigCardH)
       .lineWidth(1).strokeColor(borderColor).stroke();
    doc.rect(xOff, sigTopY, sigHalfW, 16).fill(headerBg);
    doc.fillColor(headerTxt).font('Arial-Bold').fontSize(8)
       .text(title, xOff + 6, sigTopY + 4, { width: sigHalfW - 12 });

    let sY = sigTopY + 20;
    doc.fillColor('#334155').font('Arial').fontSize(7.5);
    doc.text(`Họ tên: ${info?.fullName || '-'}`, xOff + 6, sY, { width: sigHalfW - 12 }); sY += 12;
    doc.text(`Ký lúc: ${fmtDateTime(signedAt)}`, xOff + 6, sY, { width: sigHalfW - 12 }); sY += 12;
    doc.fillColor('#166534').font('Arial-Bold').fontSize(6.5)
       .text('✓ ĐÃ XÁC NHẬN CHỮ KÝ ĐIỆN TỬ TRÊN HỆ THỐNG', xOff + 6, sY, { width: sigHalfW - 12 });
    sY += 14;

    if (sigBuf) {
      try {
        doc.image(sigBuf, xOff + 6, sY, { width: sigHalfW - 20, height: 48 });
      } catch (imgErr) {
        console.error('[WORKER] Error drawing signature image:', imgErr.message);
        doc.fillColor('#dc2626').fontSize(7)
           .text('(Lỗi hiển thị chữ ký)', xOff + 6, sY, { width: sigHalfW - 12 });
      }
    } else {
      doc.rect(xOff + 6, sY, sigHalfW - 20, 42)
         .fill('#f9fafb').strokeColor('#e2e8f0').stroke();
      doc.fillColor('#94a3b8').fontSize(7)
         .text('Chờ chữ ký', xOff + 6 + (sigHalfW - 20) / 2 - 18, sY + 15, { width: 36 });
    }
  };

  await drawSigCard(50,                      'Đại diện Bên A (Chủ đồ)',      contract.ownerInfo,  ownerSigBuffer,  contract.ownerSignedAt);
  await drawSigCard(50 + sigHalfW + 12,      'Đại diện Bên B (Người thuê)',  contract.renterInfo, renterSigBuffer, contract.renterSignedAt);

  doc.y = sigTopY + sigCardH + 16;

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.moveTo(50, doc.y).lineTo(50 + PAGE_W, doc.y)
     .lineWidth(0.5).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.4);
  
  // Set explicit left coordinate (50) and align: 'left'
  doc.fillColor('#94a3b8').font('Arial').fontSize(7)
     .text(
       `Tài liệu nội bộ — Rental P2P · Xuất lúc ${new Date().toLocaleString('vi-VN')}`,
       50,
       doc.y,
       { align: 'left', width: PAGE_W }
     );

  doc.end();

  return pdfPromise;
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

      const pdfBuffer = await generateContractPDF(contract, rental, ownerSigBuffer, renterSigBuffer, false);

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

    if (data.task === 'contract_completed') {
      console.log(`[WORKER] Processing contract_completed for rental ${data.rentalId}`);

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

      const pdfBuffer = await generateContractPDF(contract, rental, ownerSigBuffer, renterSigBuffer, true);

      const mailOptions = {
        from: `"P2P Rental" <${process.env.EMAIL_USER}>`,
        to: [rental.ownerId.email, rental.renterId.email].join(','),
        subject: `📄 Hợp đồng điện tử hoàn tất giao dịch: "${contract.itemInfo?.name}"`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color:#28a745;">Giao dịch hoàn tất thành công</h2>
          <p>Xin chào <strong>${rental.ownerId.fullName}</strong> và <strong>${rental.renterId.fullName}</strong>,</p>
          <p>Đơn thuê vật phẩm <strong>${contract.itemInfo?.name}</strong> đã hoàn thành và được xác nhận tình trạng hoàn trả thành công bởi cả hai bên.</p>
          <p>Đính kèm trong email này là bản hợp đồng điện tử chính thức <strong>kèm theo Phụ lục Bàn giao & Hoàn trả</strong> chi tiết ghi nhận tình trạng vật phẩm khi giao và nhận đồ.</p>
          <p>Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ chia sẻ vật phẩm qua Rental P2P!</p>
          <br>
          <p>Trân trọng,<br><strong>P2P Rental Team</strong></p>
        </div>`,
        attachments: [
          {
            filename: `hop-dong-hoan-tat-${rental.code || data.rentalId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`[WORKER] Completed contract PDF email sent successfully to ${rental.ownerId.email} and ${rental.renterId.email}`);
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
