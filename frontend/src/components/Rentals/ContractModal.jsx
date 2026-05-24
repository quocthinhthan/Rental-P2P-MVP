import React from 'react';
import '../../styles/ContractModal.css';

function ContractModal({ isOpen, contract, rental, onClose }) {
  if (!isOpen || !contract) return null;

  const isFullySigned = Boolean(contract.isFullySigned);

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Tính số ngày thuê từ khoảng thời gian
  const getRentalDays = () => {
    if (!contract.rentalPeriod?.startDate || !contract.rentalPeriod?.endDate) return 0;
    const start = new Date(contract.rentalPeriod.startDate);
    const end = new Date(contract.rentalPeriod.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
  };

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const host = apiUrl.replace(/\/api\/?$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${host}${cleanUrl}`;
  };

  const renderSignature = (signatureUrl, altText) => {
    if (!signatureUrl) return null;

    // Kiểm tra xem có phải là ảnh (URL tuyệt đối/relative hoặc base64 image data url)
    const isImg = signatureUrl.startsWith('http') || 
                  signatureUrl.startsWith('data:image') || 
                  signatureUrl.startsWith('/') || 
                  signatureUrl.includes('.') ||
                  signatureUrl.includes('uploads');

    if (isImg) {
      return (
        <div className="contract-sig-img-wrap">
          <img
            src={resolveImageUrl(signatureUrl)}
            alt={altText}
            className="contract-sig-img"
            onError={(e) => {
              e.target.style.display = 'none';
              const nextSibling = e.target.nextSibling;
              if (nextSibling) {
                nextSibling.style.display = 'block';
              }
            }}
          />
          <div className="contract-sig-text-fallback" style={{ display: 'none' }}>
            {signatureUrl}
          </div>
        </div>
      );
    }

    return (
      <div className="contract-sig-img-wrap">
        <div className="contract-sig-text-digital">
          {signatureUrl}
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    const oldTitle = document.title;
    
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const DD = pad(now.getDate());
    const MM = pad(now.getMonth() + 1);
    const YY = String(now.getFullYear()).slice(-2);
    
    const timestamp = `${hh}${mm}${DD}${MM}${YY}`;
    document.title = `HopDongChoThueDo_RentalP2P_${timestamp}`;
    
    window.print();
    
    setTimeout(() => {
      document.title = oldTitle;
    }, 200);
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal contract-modal-wrap">
        {/* Header Modal */}
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow">Tài liệu nội bộ</p>
            <h3>Chi tiết Hợp đồng Điện tử</h3>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {/* Khu vực Hợp đồng in (Có ID cụ thể phục vụ window.print()) */}
        <div className="contract-paper" id="contract-print-area">
          
          {/* Mộc Seal tròn Pháp lý */}
          <div className="contract-seal-container">
            <div className={`contract-seal ${isFullySigned ? 'is-fully-signed' : 'is-pending'}`}>
              <div className="contract-seal-inner">
                <span className="contract-seal-title">RENTAL P2P</span>
                <span className="contract-seal-sub">
                  {isFullySigned ? 'ĐÃ KÝ ĐIỆN TỬ' : 'ĐANG KÝ'}
                </span>
                <span style={{ fontSize: '0.45rem', marginTop: '3px', fontWeight: 'bold' }}>
                  {isFullySigned ? 'FULLY SIGNED' : 'INITIALIZING'}
                </span>
              </div>
            </div>
          </div>

          {/* Tiêu đề Quốc hiệu & Tên hợp đồng */}
          <div className="contract-header-center">
            <h2 className="contract-main-title">HỢP ĐỒNG THUÊ TÀI SẢN NỘI BỘ</h2>
            <p className="contract-code-id">Số hợp đồng: {contract._id || 'Chưa cấp mã'}</p>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '20px' }}>
            Hôm nay, ngày {new Date(contract.createdAt || Date.now()).getDate()} tháng {new Date(contract.createdAt || Date.now()).getMonth() + 1} năm {new Date(contract.createdAt || Date.now()).getFullYear()}, tại hệ thống Rental P2P, chúng tôi gồm các bên dưới đây đồng ý ký kết hợp đồng thuê tài sản này:
          </p>

          {/* Bên A & Bên B */}
          <div className="contract-section-title">Các bên tham gia hợp đồng</div>
          <div className="contract-parties-grid">
            {/* Bên Cho Thuê */}
            <div className="contract-party-card">
              <span className="contract-party-role">Bên Cho Thuê (Bên A)</span>
              <div className="contract-party-details">
                <p>Họ và tên: <strong>{contract.ownerInfo?.fullName || 'Chưa cập nhật'}</strong></p>
                <p>Số CMND/CCCD: <strong>{contract.ownerInfo?.idCardNumber || 'Chưa xác thực eKYC'}</strong></p>
                <p>Vai trò trên hệ thống: <strong>Chủ sở hữu</strong></p>
              </div>
            </div>

            {/* Bên Thuê */}
            <div className="contract-party-card">
              <span className="contract-party-role">Bên Thuê (Bên B)</span>
              <div className="contract-party-details">
                <p>Họ và tên: <strong>{contract.renterInfo?.fullName || 'Chưa cập nhật'}</strong></p>
                <p>Số CMND/CCCD: <strong>{contract.renterInfo?.idCardNumber || 'Chưa xác thực eKYC'}</strong></p>
                <p>Vai trò trên hệ thống: <strong>Người thuê đồ</strong></p>
              </div>
            </div>
          </div>

          {/* Chi tiết tài sản */}
          <div className="contract-section-title">Chi tiết tài sản thuê & Chi phí</div>
          <div className="contract-table-wrap">
            <table className="contract-table">
              <thead>
                <tr>
                  <th>Nội dung tài sản</th>
                  <th>Thông tin chi tiết</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tên sản phẩm thuê</td>
                  <td style={{ fontWeight: '700', color: '#0f172a' }}>{contract.itemInfo?.name || 'Tài sản thuê'}</td>
                </tr>
                <tr>
                  <td>Đơn giá thuê / Ngày</td>
                  <td>{formatCurrency(contract.itemInfo?.pricePerDay)} / ngày</td>
                </tr>
                <tr>
                  <td>Thời hạn thuê</td>
                  <td>
                    {formatDate(contract.rentalPeriod?.startDate)} đến {formatDate(contract.rentalPeriod?.endDate)} ({getRentalDays()} ngày)
                  </td>
                </tr>
                <tr className="contract-table-highlight">
                  <td>Tiền ký quỹ (Tiền cọc)</td>
                  <td>{formatCurrency(contract.totalPrice - (contract.itemInfo?.pricePerDay * getRentalDays()))}</td>
                </tr>
                <tr className="contract-total-row">
                  <td>Tổng giá trị thanh toán</td>
                  <td>{formatCurrency(contract.totalPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Điều khoản hợp đồng */}
          <div className="contract-section-title">Điều khoản và Cam kết</div>
          <div className="contract-terms-text">
            {contract.terms || 'Hai bên cam kết giao nhận tài sản đúng như mô tả. Nếu có hư hỏng, hệ thống sẽ sử dụng tiền ký quỹ để đền bù theo quy định của pháp luật.'}
          </div>

          {/* Phụ lục Bàn giao & Hoàn trả (Nếu có dữ liệu bàn giao hoặc trả đồ) */}
          {rental && (rental.pickupReport || rental.returnReport) && (
            <>
              <div className="contract-section-title">Phụ lục Bàn giao & Hoàn trả</div>
              <div className="contract-parties-grid" style={{ marginBottom: '22px' }}>
                {/* Biên bản bàn giao */}
                {rental.pickupReport && (
                  <div className="contract-party-card" style={{ borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
                    <span className="contract-party-role" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      Biên bản Bàn giao vật dụng (Nhận đồ)
                    </span>
                    <div className="contract-party-details" style={{ fontSize: '0.82rem' }}>
                      <p>Tình trạng lúc giao: <strong>{
                        rental.pickupReport.condition === 'good' ? 'Tốt / Nguyên vẹn' :
                        rental.pickupReport.condition === 'fair' ? 'Bình thường / Hao mòn nhẹ' :
                        'Hư hỏng / Hao mòn nhiều'
                      }</strong></p>
                      <p>Phụ kiện bàn giao: <strong>{rental.pickupReport.accessories || 'Không có'}</strong></p>
                      {rental.pickupReport.notes && <p>Ghi chú: <strong>{rental.pickupReport.notes}</strong></p>}
                      {rental.pickupReport.recordedAt && <p>Thời gian bàn giao: <strong>{formatDateTime(rental.pickupReport.recordedAt)}</strong></p>}
                    </div>
                  </div>
                )}

                {/* Biên bản trả đồ */}
                {rental.returnReport && (
                  <div className="contract-party-card" style={{ borderStyle: 'dashed', borderColor: '#cbd5e1' }}>
                    <span className="contract-party-role" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      Biên bản Hoàn trả vật dụng (Trả đồ)
                    </span>
                    <div className="contract-party-details" style={{ fontSize: '0.82rem' }}>
                      <p>Tình trạng lúc trả: <strong>{
                        rental.returnReport.condition === 'good' ? 'Tốt / Nguyên vẹn' :
                        rental.returnReport.condition === 'fair' ? 'Bình thường / Hao mòn nhẹ' :
                        'Hư hỏng / Hao mòn nhiều'
                      }</strong></p>
                      <p>Phụ kiện trả lại: <strong>{rental.returnReport.accessories || 'Không có'}</strong></p>
                      {rental.returnReport.damages && <p>Hao mòn/Hư hỏng phát sinh: <strong style={{ color: '#ef4444' }}>{rental.returnReport.damages}</strong></p>}
                      {rental.returnReport.notes && <p>Ghi chú thêm: <strong>{rental.returnReport.notes}</strong></p>}
                      {rental.returnReport.recordedAt && <p>Thời gian hoàn trả: <strong>{formatDateTime(rental.returnReport.recordedAt)}</strong></p>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Chữ ký hai bên */}
          <div className="contract-section-title">Chữ ký điện tử hai bên</div>
          <div className="contract-signatures-grid">
            {/* Chữ ký Bên A */}
            <div className={`contract-signature-box ${contract.ownerSignatureUrl ? 'is-signed' : 'is-pending'}`}>
              <span className="contract-sig-title">Đại diện Bên A (Chủ đồ)</span>
              
              {contract.ownerSignatureUrl ? (
                <>
                  {renderSignature(contract.ownerSignatureUrl, "Chữ ký Bên A")}
                  <p className="contract-sig-name">{contract.ownerInfo?.fullName}</p>
                  <p className="contract-sig-time">Ký lúc: {formatDateTime(contract.ownerSignedAt)}</p>
                </>
              ) : (
                <div className="contract-sig-pending-badge">
                  <i className="fas fa-hourglass-half"></i>
                  <span>Chờ chữ ký Bên A</span>
                </div>
              )}
            </div>

            {/* Chữ ký Bên B */}
            <div className={`contract-signature-box ${contract.renterSignatureUrl ? 'is-signed' : 'is-pending'}`}>
              <span className="contract-sig-title">Đại diện Bên B (Người thuê)</span>
              
              {contract.renterSignatureUrl ? (
                <>
                  {renderSignature(contract.renterSignatureUrl, "Chữ ký Bên B")}
                  <p className="contract-sig-name">{contract.renterInfo?.fullName}</p>
                  <p className="contract-sig-time">Ký lúc: {formatDateTime(contract.renterSignedAt)}</p>
                </>
              ) : (
                <div className="contract-sig-pending-badge">
                  <i className="fas fa-hourglass-half"></i>
                  <span>Chờ chữ ký Bên B</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="rental-modal-actions">
          <button className="btn-xs btn-ghost-xs" type="button" onClick={onClose}>
            Đóng lại
          </button>
          <button className="btn-xs btn-primary-xs contract-print-btn" type="button" onClick={handlePrint}>
            <i className="fas fa-print"></i> In hợp đồng / Tải PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContractModal;
