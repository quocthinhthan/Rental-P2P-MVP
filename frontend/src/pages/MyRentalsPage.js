import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import '../styles/MyRentalsPage.css';

/* ─────── helpers ─────── */
const statusConfig = {
  pending_payment:      { label: 'Chờ thanh toán',  cls: 'status-pending-payment' },
  pending_confirmation: { label: 'Chờ xác nhận',    cls: 'status-pending-confirm' },
  confirmed:            { label: 'Đã xác nhận',     cls: 'status-confirmed'       },
  completed:            { label: 'Đã hoàn thành',   cls: 'status-completed'       },
  rejected:             { label: 'Đã từ chối',      cls: 'status-rejected'        },
  cancelled:            { label: 'Đã hủy',          cls: 'status-cancelled'       },
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

/* ─────── RentalCard ─────── */
function RentalCard({ rental, type, onOwnerAction, onComplete, onPayEscrow, navigate }) {
  if (!rental.item) {
    return (
      <div className="rental-card rental-card-deleted">
        <p style={{ fontWeight: 600, color: '#b91c1c', margin: '0 0 4px' }}>Vật phẩm không còn tồn tại</p>
        <p style={{ fontSize: '.8rem', color: '#6b7280', margin: 0 }}>Đơn thuê ID: {rental._id}</p>
      </div>
    );
  }

  const isOwner = type === 'asOwner';
  const reviewTargetLabel = isOwner ? 'người thuê' : 'chủ sở hữu';

  return (
    <div className="rental-card">
      <img
        src={rental.item.mainImage || 'https://via.placeholder.com/230x160'}
        alt={rental.item.name}
        className="rental-card-img"
      />
      <div className="rental-card-body">
        <h4 className="rental-card-title">{rental.item.name}</h4>
        <StatusBadge status={rental.status} />
        <p className="rental-card-meta">
          📅 {new Date(rental.startDate).toLocaleDateString('vi-VN')} →{' '}
          {new Date(rental.endDate).toLocaleDateString('vi-VN')}
        </p>
        <p className="rental-card-price">
          {formatCurrency(rental.totalAmount)}
        </p>
        <p className="rental-card-meta">💰 Phí thuê: {formatCurrency(rental.rentalFee)}</p>
        <p className="rental-card-meta">🧾 Tiền cọc: {formatCurrency(rental.depositAmount)}</p>
        {isOwner && (
          <>
            <p className="rental-card-meta">🏦 Hoa hồng nền tảng: {formatCurrency(rental.commissionAmount)}</p>
            <p className="rental-card-meta">✅ Thực nhận: {formatCurrency(rental.payoutAmount)}</p>
          </>
        )}
        <p className="rental-card-party">
          {isOwner ? '👤 Người thuê:' : '🏠 Chủ sở hữu:'}{' '}
          <strong>{rental.counterparty?.fullName}</strong>{' '}
          ({rental.counterparty?.email})
        </p>

        {rental.note && (
          <div className="rental-card-note">
            <strong>Ghi chú:</strong> {rental.note}
          </div>
        )}

        <div className="rental-card-actions">
          {/* Người thuê — chờ thanh toán */}
          {!isOwner && rental.status === 'pending_payment' && (
            <button className="btn-xs btn-primary-xs" onClick={() => onPayEscrow(rental._id)}>
              💳 Thanh toán VNPay
            </button>
          )}

          {/* Chủ sở hữu — chờ xác nhận */}
          {isOwner && rental.status === 'pending_confirmation' && (
            <>
              <button className="btn-xs btn-success-xs" onClick={() => onOwnerAction(rental._id, 'confirm')}>
                ✔ Chấp nhận
              </button>
              <button className="btn-xs btn-danger-xs" onClick={() => onOwnerAction(rental._id, 'reject')}>
                ✕ Từ chối
              </button>
            </>
          )}

          {/* Đánh dấu hoàn thành */}
          {rental.status === 'confirmed' && (
            <button className="btn-xs btn-info-xs" onClick={() => onComplete(rental._id)}>
              ✅ Hoàn thành
            </button>
          )}

          {/* Đánh giá */}
          {rental.status === 'completed' && rental.item?._id && (
            <button
              className="btn-xs btn-outline-xs"
              onClick={() => navigate(`/items/${rental.item._id}#nav-review`, { state: { openReviewTab: true } })}
            >
              ⭐ Đánh giá {reviewTargetLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────── ItemCard ─────── */
function ItemCard({ item, onEdit, onDelete }) {
  return (
    <div className="item-card">
      {/* Bấm vào ảnh → xem chi tiết */}
      <Link to={`/items/${item._id}`} className="item-card-link">
        <img
          src={item.mainImage || 'https://via.placeholder.com/300x175'}
          alt={item.name}
          className="item-card-img"
        />
      </Link>
      <div className="item-card-body">
        {/* Bấm vào tên → xem chi tiết */}
        <Link to={`/items/${item._id}`} className="item-card-title">
          {item.name}
        </Link>
        <p className="item-card-price">
          {Number(item.pricePerDay).toLocaleString('vi-VN')}đ
          <span className="item-card-price-unit"> / ngày</span>
        </p>
        <p className="item-card-cat">🏷 {item.category}</p>
        <div className="item-card-actions">
          <button className="btn-xs btn-ghost-xs" onClick={() => onEdit(item._id)}>✏️ Sửa</button>
          <button className="btn-xs btn-danger-xs" onClick={() => onDelete(item._id)}>🗑 Xóa</button>
        </div>
      </div>
    </div>
  );
}

/* ─────── Main page ─────── */
function MyRentalsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [rentals, setRentals] = useState({ asRenter: [], asOwner: [], myItems: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('asRenter');

  const fetchMyRentals = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyRentals();
      setRentals(response.data);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMyRentals(); }, []);
  useEffect(() => { fetchMyRentals(); }, [location.key]); // eslint-disable-line

  const handleOwnerAction = async (rentalId, action) => {
    try {
      if (action === 'confirm') await apiService.confirmRental(rentalId);
      else if (action === 'reject') await apiService.rejectRental(rentalId);
      fetchMyRentals();
    } catch (err) {
      alert('Thao tác thất bại.');
      console.error(err);
    }
  };

  const handleCompleteRental = async (rentalId) => {
    if (!window.confirm('Xác nhận đánh dấu đơn thuê này là hoàn thành?')) return;
    try {
      await apiService.completeRental(rentalId);
      fetchMyRentals();
    } catch (err) {
      alert('Không thể hoàn thành đơn thuê.');
      console.error(err);
    }
  };

  const handlePayEscrow = async (rentalId) => {
    try {
      const response = await apiService.createVNPayUrl(rentalId);
      window.location.href = response.data.paymentUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể tạo liên kết thanh toán VNPay.');
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vật phẩm này?')) return;
    try {
      await apiService.deleteItem(itemId);
      fetchMyRentals();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa vật phẩm.');
      console.error(err);
    }
  };

  const tabs = [
    { key: 'asRenter', icon: '📦', label: 'Tôi đang thuê',     count: rentals.asRenter.length },
    { key: 'asOwner',  icon: '🔑', label: 'Yêu cầu thuê đồ',  count: rentals.asOwner.length  },
    { key: 'myItems',  icon: '🏷',  label: 'Sản phẩm của tôi', count: rentals.myItems.length  },
  ];

  return (
    <div className="myrp">
      {/* Header */}
      <div className="myrp-header">
        <h1>Quản lý đơn thuê</h1>
        <div className="myrp-header-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Đơn thuê của tôi</span>
        </div>
      </div>

      {/* Body */}
      <div className="myrp-body">
        <div className="myrp-container">

          {/* Tabs */}
          <div className="myrp-tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`myrp-tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <span className="myrp-tab-icon">{t.icon}</span>
                {t.label}
                <span className="myrp-tab-badge">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="myrp-loading">
              <div className="myrp-spinner" />
              <p>Đang tải dữ liệu…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="myrp-error">{error}</div>
          )}

          {/* Tab: Tôi đang thuê */}
          {!loading && !error && activeTab === 'asRenter' && (
            <>
              <h2 className="section-title">Vật phẩm tôi đang thuê</h2>
              {rentals.asRenter.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <p>Bạn chưa thuê vật phẩm nào.</p>
                </div>
              ) : (
                rentals.asRenter.map(rental => (
                  <RentalCard
                    key={rental._id}
                    rental={rental}
                    type="asRenter"
                    onOwnerAction={handleOwnerAction}
                    onComplete={handleCompleteRental}
                    onPayEscrow={handlePayEscrow}
                    navigate={navigate}
                  />
                ))
              )}
            </>
          )}

          {/* Tab: Yêu cầu thuê đồ */}
          {!loading && !error && activeTab === 'asOwner' && (
            <>
              <h2 className="section-title">Yêu cầu thuê đồ của tôi</h2>
              {rentals.asOwner.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔔</div>
                  <p>Chưa có yêu cầu thuê nào.</p>
                </div>
              ) : (
                rentals.asOwner.map(rental => (
                  <RentalCard
                    key={rental._id}
                    rental={rental}
                    type="asOwner"
                    onOwnerAction={handleOwnerAction}
                    onComplete={handleCompleteRental}
                    onPayEscrow={handlePayEscrow}
                    navigate={navigate}
                  />
                ))
              )}
            </>
          )}

          {/* Tab: Sản phẩm của tôi */}
          {!loading && !error && activeTab === 'myItems' && (
            <>
              <h2 className="section-title">Sản phẩm tôi đã đăng</h2>
              {rentals.myItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏷</div>
                  <p>Bạn chưa đăng sản phẩm nào. <Link to="/post-item">Đăng ngay!</Link></p>
                </div>
              ) : (
                <div className="items-grid">
                  {rentals.myItems.map(item => (
                    <ItemCard
                      key={item._id}
                      item={item}
                      onEdit={(id) => navigate(`/edit-item/${id}`)}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default MyRentalsPage;