import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import Swal from 'sweetalert2';
import SignatureModal from '../components/Rentals/SignatureModal';
import HandoverModal from '../components/Rentals/HandoverModal';
import '../styles/MyRentalsPage.css';

/* ─────── helpers ─────── */
const statusConfig = {
  pending_payment:      { label: 'Chờ thanh toán',   cls: 'status-pending-payment' },
  pending_confirmation: { label: 'Chờ xác nhận',    cls: 'status-pending-confirm' },
  confirmed:            { label: 'Đã xác nhận',     cls: 'status-confirmed'       },
  in_progress:          { label: 'Đang thuê',        cls: 'status-confirmed'       },
  completed:            { label: 'Đã hoàn thành',   cls: 'status-completed'       },
  rejected:             { label: 'Đã từ chối',      cls: 'status-rejected'        },
  cancelled:            { label: 'Đã hủy',          cls: 'status-cancelled'       },
  disputed:             { label: 'Đang tranh chấp', cls: 'status-rejected'         },
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function ReviewModal({ isOpen, rental, type, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment('');
      setError('');
    }
  }, [isOpen, rental?._id]);

  if (!isOpen || !rental) return null;

  const isOwner = type === 'asOwner';
  const targetRole = isOwner ? 'người thuê' : 'chủ sở hữu';
  const targetName = rental.counterparty?.fullName || targetRole;
  const myReview = rental.review?.myReview;
  const hasMyReview = Boolean(myReview);
  const reviewCompleted = rental.review?.status === 'completed' || rental.review?.isPublic;
  const reviewStatusText = reviewCompleted
    ? 'Cả hai bên đã đánh giá. Đánh giá của bạn đã được công khai trong hồ sơ uy tín.'
    : 'Bạn đã gửi đánh giá. Hệ thống đang chờ đối phương đánh giá lại trước khi công khai.';

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const response = await apiService.createReview({
        rentalId: rental._id,
        rating: Number(rating),
        comment: comment.trim(),
      });
      await onSubmitted?.();
      Swal.fire('Đã gửi đánh giá', response.data?.message || 'Cảm ơn bạn đã đánh giá đối phương.', 'success');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal review-modal">
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow">Đánh giá sau thuê</p>
            <h3>Đánh giá {targetRole}</h3>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="review-modal-summary">
          <img
            src={rental.item?.mainImage || 'https://via.placeholder.com/96'}
            alt={rental.item?.name}
            className="review-modal-item-img"
          />
          <div>
            <p className="review-modal-item-name">{rental.item?.name || 'Vật phẩm đã thuê'}</p>
            <p className="review-modal-counterparty">
              {hasMyReview ? 'Bạn đã đánh giá' : 'Bạn đang đánh giá'} <strong>{targetName}</strong>
            </p>
            <p className="review-modal-date">
              {new Date(rental.startDate).toLocaleDateString('vi-VN')} - {new Date(rental.endDate).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        {hasMyReview ? (
          <>
            <div className={`review-status-note ${reviewCompleted ? 'is-complete' : 'is-waiting'}`}>
              {reviewStatusText}
            </div>
            <div className="review-readonly-box">
              <div className="review-readonly-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`fa fa-star ${star <= Number(myReview.rating) ? 'active' : ''}`}
                  />
                ))}
              </div>
              <p className="review-readonly-comment">
                {myReview.comment || <em>Không có nội dung đánh giá.</em>}
              </p>
              <p className="review-readonly-date">
                Đã gửi ngày {new Date(myReview.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div className="rental-modal-actions">
              <button className="btn-xs btn-primary-xs" type="button" onClick={onClose}>
                Đã hiểu
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="review-blind-note">
              Đánh giá sẽ được giữ riêng tư và chỉ công khai khi cả hai bên đã đánh giá nhau, hoặc khi hết thời hạn phản hồi theo hệ thống.
            </div>

            <form onSubmit={handleSubmit}>
              <div className="review-field">
                <label>Chọn số sao</label>
                <div className="review-star-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`review-star-btn${star <= rating ? ' active' : ''}`}
                      onClick={() => setRating(star)}
                      aria-label={`${star} sao`}
                    >
                      <i className="fa fa-star" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="review-field">
                <label htmlFor="rental-review-comment">Nội dung đánh giá</label>
                <textarea
                  id="rental-review-comment"
                  className="review-textarea"
                  rows="4"
                  placeholder={isOwner ? 'Ví dụ: Người thuê giữ đồ cẩn thận, trả đúng hẹn...' : 'Ví dụ: Chủ sở hữu hỗ trợ tốt, vật phẩm đúng mô tả...'}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </div>

              {error && <div className="review-error">{error}</div>}

              <div className="rental-modal-actions">
                <button className="btn-xs btn-ghost-xs" type="button" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button className="btn-xs btn-primary-xs" type="submit" disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────── RentalCard ─────── */
function RentalCard({
  rental,
  type,
  onOwnerAction,
  onOpenSignature,
  onOpenPickup,
  onOpenReturn,
  onPayEscrow,
  onDispute,
  onOpenReview,
}) {
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
  const isFullySigned = Boolean(rental.isFullySigned || rental.contract?.isFullySigned);
  const hasCurrentUserSigned = isOwner
    ? Boolean(rental.contract?.ownerSignedAt)
    : Boolean(rental.contract?.renterSignedAt);
  const canSignContract = rental.status === 'confirmed' && !isFullySigned && !hasCurrentUserSigned;
  const isWaitingForOtherSignature = rental.status === 'confirmed' && !isFullySigned && hasCurrentUserSigned;
  const canPickup = rental.status === 'confirmed' && isFullySigned;
  const needsSignatureBeforePickup = rental.status === 'confirmed' && !isFullySigned;
  const canReturn = rental.status === 'in_progress';
  const hasMyReview = Boolean(rental.review?.hasMyReview);
  const reviewCompleted = rental.review?.status === 'completed' || rental.review?.isPublic;

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
                ✔ Chấp nhận cho thuê
              </button>
              <button className="btn-xs btn-danger-xs" onClick={() => onOwnerAction(rental._id, 'reject')}>
                ✕ Từ chối
              </button>
            </>
          )}

          {canSignContract && (
            <button className="btn-xs btn-primary-xs" onClick={() => onOpenSignature(rental)}>
              ✍ Ký hợp đồng
            </button>
          )}

          {isFullySigned && rental.status === 'confirmed' && (
            <span className="contract-state contract-state-ready">Hợp đồng đã ký đủ</span>
          )}

          {isWaitingForOtherSignature && (
            <span className="contract-state contract-state-waiting">Bạn đã ký, đang chờ bên còn lại</span>
          )}

          {needsSignatureBeforePickup && (
            <button
              className="btn-xs btn-info-xs"
              onClick={() => Swal.fire('Chưa thể giao đồ', 'Phải ký hợp đồng trước khi giao đồ.', 'warning')}
            >
              📦 Giao đồ
            </button>
          )}

          {canPickup && (
            <button className="btn-xs btn-info-xs" onClick={() => onOpenPickup(rental)}>
              📦 Xác nhận giao đồ
            </button>
          )}

          {canReturn && (
            <button className="btn-xs btn-info-xs" onClick={() => onOpenReturn(rental)}>
              ✅ Hoàn tất đơn / Trả đồ
            </button>
          )}

          {/* Nút giải quyết tranh chấp — chỉ người thuê sau khi đã ký quỹ */}
          {!isOwner && (rental.status === 'confirmed' || rental.status === 'in_progress') && rental.paymentStatus === 'escrowed' && (
            <button className="btn-xs btn-danger-xs" onClick={() => onDispute(rental._id)} style={{ background: '#f97316', borderColor: '#f97316' }}>
              ⚠️ Báo cáo sự cố
            </button>
          )}

          {/* Đánh giá */}
          {rental.status === 'completed' && rental.item?._id && (
            <>
              <button
                className="btn-xs btn-outline-xs"
                onClick={() => onOpenReview(rental, type)}
              >
                ⭐ {hasMyReview ? 'Xem đánh giá' : `Đánh giá ${reviewTargetLabel}`}
              </button>
              {hasMyReview && (
                <span className={`review-state-chip ${reviewCompleted ? 'is-complete' : 'is-waiting'}`}>
                  {reviewCompleted ? 'Hai bên đã đánh giá' : 'Chờ đối phương đánh giá'}
                </span>
              )}
            </>
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
  const [signatureRental, setSignatureRental] = useState(null);
  const [handoverState, setHandoverState] = useState({ type: null, rental: null });
  const [reviewState, setReviewState] = useState({ type: null, rental: null });

  const enrichRentalsWithContracts = useCallback(async (list = []) => {
    return Promise.all(
      list.map(async (rental) => {
        if (!['confirmed', 'in_progress'].includes(rental.status)) {
          return rental;
        }

        try {
          const contractResponse = await apiService.getRentalContract(rental._id);
          const contract = contractResponse.data;
          return {
            ...rental,
            contract,
            isFullySigned: Boolean(contract?.isFullySigned),
          };
        } catch (err) {
          return {
            ...rental,
            isFullySigned: false,
          };
        }
      })
    );
  }, []);

  const fetchMyRentals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyRentals();
      const [asRenter, asOwner] = await Promise.all([
        enrichRentalsWithContracts(response.data.asRenter || []),
        enrichRentalsWithContracts(response.data.asOwner || []),
      ]);

      setRentals({
        asRenter,
        asOwner,
        myItems: response.data.myItems || [],
      });
      setError(null);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      console.error(err);
    }
    setLoading(false);
  }, [enrichRentalsWithContracts]);

  useEffect(() => { fetchMyRentals(); }, [fetchMyRentals, location.key]);

  const handleOwnerAction = async (rentalId, action) => {
    try {
      if (action === 'confirm') await apiService.confirmRental(rentalId);
      else if (action === 'reject') await apiService.rejectRental(rentalId);
      fetchMyRentals();
      Swal.fire('Thành công!', action === 'confirm' ? 'Đã chấp nhận đơn thuê.' : 'Đã từ chối đơn thuê.', 'success');
    } catch (err) {
      Swal.fire('Lỗi!', err.response?.data?.message || 'Thao tác thất bại.', 'error');
      console.error(err);
    }
  };

  const handlePayEscrow = async (rentalId) => {
    try {
      const response = await apiService.createVNPayUrl(rentalId);
      window.location.href = response.data.paymentUrl;
    } catch (err) {
      Swal.fire('Lỗi thanh toán', err.response?.data?.message || 'Không thể tạo liên kết thanh toán VNPay.', 'error');
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    const result = await Swal.fire({
      title: 'Xóa vật phẩm?',
      text: 'Bạn có chắc chắn muốn xóa vật phẩm này? Thao tác này không thể hoàn tác.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
      await apiService.deleteItem(itemId);
      fetchMyRentals();
      Swal.fire('Đã xóa!', 'Vật phẩm của bạn đã được gỡ bỏ.', 'success');
    } catch (err) {
      Swal.fire('Thất bại', err.response?.data?.message || 'Không thể xóa vật phẩm.', 'error');
      console.error(err);
    }
  };

  const handleDispute = async (rentalId) => {
    const { value: reason } = await Swal.fire({
      title: '⚠️ Báo cáo sự cố',
      html: `
        <p style="color:#6b7280;margin-bottom:12px">Mô tả rõ sự cố bạn gặp phải. Đơn thuê sẽ bị <b>đóng băng</b> trong khi Admin xử lý.</p>
        <textarea id="dispute-reason" class="swal2-input" style="height:120px;width:90%;resize:vertical;" placeholder="Ví dụ: Hàng không đúng mô tả, bị hư, chủ không phản hồi..."></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      confirmButtonText: 'Gửi báo cáo',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const val = document.getElementById('dispute-reason').value.trim();
        if (!val) {
          Swal.showValidationMessage('Vui lòng mô tả sự cố trước khi gửi');
          return false;
        }
        return val;
      }
    });

    if (!reason) return;

    try {
      await apiService.createDispute(rentalId, reason);
      fetchMyRentals();
      Swal.fire(
        'Đã gửi báo cáo!',
        'Đơn thuê đã bị đóng băng. Admin sẽ liên hệ và giải quyết trong thời gian sớm nhất.',
        'success'
      );
    } catch (err) {
      Swal.fire('Lỗi!', err.response?.data?.message || 'Không thể gửi báo cáo.', 'error');
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
                    onOpenSignature={setSignatureRental}
                    onOpenPickup={(selectedRental) => setHandoverState({ type: 'pickup', rental: selectedRental })}
                    onOpenReturn={(selectedRental) => setHandoverState({ type: 'return', rental: selectedRental })}
                    onPayEscrow={handlePayEscrow}
                    onDispute={handleDispute}
                    onOpenReview={(selectedRental, selectedType) => setReviewState({ type: selectedType, rental: selectedRental })}
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
                    onOpenSignature={setSignatureRental}
                    onOpenPickup={(selectedRental) => setHandoverState({ type: 'pickup', rental: selectedRental })}
                    onOpenReturn={(selectedRental) => setHandoverState({ type: 'return', rental: selectedRental })}
                    onPayEscrow={handlePayEscrow}
                    onDispute={handleDispute}
                    onOpenReview={(selectedRental, selectedType) => setReviewState({ type: selectedType, rental: selectedRental })}
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

      <SignatureModal
        isOpen={Boolean(signatureRental)}
        rental={signatureRental}
        onClose={() => setSignatureRental(null)}
        onSigned={fetchMyRentals}
      />

      <HandoverModal
        isOpen={Boolean(handoverState.rental)}
        rental={handoverState.rental}
        type={handoverState.type}
        onClose={() => setHandoverState({ type: null, rental: null })}
        onSuccess={fetchMyRentals}
      />

      <ReviewModal
        isOpen={Boolean(reviewState.rental)}
        rental={reviewState.rental}
        type={reviewState.type}
        onClose={() => setReviewState({ type: null, rental: null })}
        onSubmitted={fetchMyRentals}
      />
    </div>
  );
}

export default MyRentalsPage;
