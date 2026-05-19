import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  getAdminItemDetail,
  updateAdminItemFeature,
  updateAdminItemStatus
} from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminNav from '../components/Admin/AdminNav';
import { formatDateTime, getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels, statusConfig } from '../constants/rentalUi';
import '../styles/MyRentalsPage.css';
import '../styles/RentalDetailPage.css';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDisputeDetailPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const ACTIVE_RENTAL_STATUSES = ['pending_confirmation', 'confirmed', 'in_progress', 'disputed'];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '');

function InfoItem({ label, value }) {
  return (
    <div className="detail-info-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export default function AdminItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminItemDetail(id);
      setDetail(response.data || null);
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải chi tiết sản phẩm.'), 'error');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const item = detail?.item || {};
  const owner = detail?.owner || item.ownerId || {};
  const stats = detail?.stats || {};
  const rentals = useMemo(() => (Array.isArray(detail?.rentals) ? detail.rentals : []), [detail?.rentals]);
  const disputes = useMemo(() => (Array.isArray(detail?.disputes) ? detail.disputes : []), [detail?.disputes]);
  const reports = useMemo(() => (Array.isArray(detail?.reports) ? detail.reports : []), [detail?.reports]);
  const reviews = useMemo(() => (Array.isArray(detail?.reviews) ? detail.reviews : []), [detail?.reviews]);
  const coverImage = Array.isArray(item.images) && item.images[0];
  const hasActiveRental = useMemo(() => rentals.some((rental) => ACTIVE_RENTAL_STATUSES.includes(rental.status)), [rentals]);

  const handleStatusUpdate = async (status) => {
    if (hasActiveRental && status !== 'rented') {
      Swal.fire('Không thể thao tác', 'Sản phẩm đang có đơn thuê active. Vui lòng xử lý đơn thuê trước khi đổi trạng thái.', 'warning');
      return;
    }

    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Đổi trạng thái sang ${itemStatusLabels[status] || status}?`,
      input: 'textarea',
      inputLabel: 'Lý do audit',
      inputPlaceholder: 'Nhập lý do thay đổi...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => (!value?.trim() ? 'Vui lòng nhập lý do.' : undefined),
    });
    if (!isConfirmed) return;

    try {
      setActionLoading(true);
      await updateAdminItemStatus(id, { status, reason: reason.trim() });
      Swal.fire('Thành công!', 'Trạng thái sản phẩm đã được cập nhật.', 'success');
      await fetchDetail();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật trạng thái sản phẩm.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeatureUpdate = async () => {
    const confirm = await Swal.fire({
      title: item.isFeatured ? 'Tắt nổi bật?' : 'Đánh dấu nổi bật?',
      text: item.name || 'Sản phẩm này',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: item.isFeatured ? 'Tắt featured' : 'Bật featured',
      cancelButtonText: 'Hủy',
    });
    if (!confirm.isConfirmed) return;

    try {
      setActionLoading(true);
      await updateAdminItemFeature(id, { isFeatured: !item.isFeatured });
      await fetchDetail();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật featured.'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <main className="admin-dispute-detail-page"><div className="admin-dispute-detail-loading"><Spinner /></div></main>;
  }

  if (!detail) {
    return (
      <main className="admin-dispute-detail-page">
        <div className="admin-dispute-detail-not-found">
          <i className="fas fa-search"></i>
          <h2>Không tìm thấy sản phẩm</h2>
          <p>Sản phẩm có thể đã bị xóa hoặc bạn không còn quyền truy cập.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/items')}>Quay lại danh sách</button>
        </div>
      </main>
    );
  }

  return (
    <main className="myrp rental-detail-page admin-dispute-detail-page admin-item-detail-page">
      <section className="admin-dispute-detail-topbar">
        <Link to="/admin/items" className="admin-dispute-back-link"><i className="fas fa-arrow-left"></i>Quay lại sản phẩm</Link>
        <AdminNav />
      </section>

      <div className="myrp-container rental-detail-layout admin-dispute-detail-layout">
        <main className="rental-detail-main">
          <section className="rental-hero-section admin-dispute-detail-hero">
            <div className="rental-hero-media admin-dispute-detail-media">
              {coverImage ? <img src={coverImage} alt={item.name || 'Sản phẩm'} /> : <div className="admin-dispute-detail-image-empty"><i className="fas fa-box-open"></i></div>}
            </div>
            <div className="rental-hero-content">
              <div className="rental-hero-status">
                <span className={`admin-status-pill is-${item.status}`}>{itemStatusLabels[item.status] || item.status || '-'}</span>
                <span className={`admin-status-pill ${item.isFeatured ? 'is-success' : 'is-muted'}`}>{item.isFeatured ? 'Featured' : 'Không featured'}</span>
              </div>
              <p className="rental-hero-kicker">Chi tiết sản phẩm</p>
              <h3>{item.name || 'Sản phẩm không rõ'}</h3>
              <p className="rental-hero-date">{item.category || '-'} · {formatCurrency(item.pricePerDay)} / ngày</p>
              {hasActiveRental && <div className="admin-lifecycle-warning"><i className="fas fa-triangle-exclamation"></i>Sản phẩm đang có rental active, không nên đổi sang available/delisted.</div>}
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Stats</p><h3>Hiệu suất sản phẩm</h3></div></div>
            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Đơn thuê" value={stats.rentalCount} />
              <InfoItem label="Doanh thu" value={formatCurrency(stats.revenue)} />
              <InfoItem label="Commission" value={formatCurrency(stats.commissionAmount)} />
              <InfoItem label="Deposit" value={formatCurrency(stats.depositAmount)} />
              <InfoItem label="Dispute" value={stats.disputeCount} />
              <InfoItem label="Report" value={stats.reportCount} />
              <InfoItem label="Review" value={stats.reviewCount} />
              <InfoItem label="Base value" value={formatCurrency(item.baseValue)} />
              <InfoItem label="Địa chỉ" value={item.address} />
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Owner</p><h3>Thông tin chủ đồ</h3></div></div>
            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Tên" value={getName(owner)} />
              <InfoItem label="Email" value={owner.email} />
              <InfoItem label="Số điện thoại" value={owner.phoneNumber || owner.phone} />
              <InfoItem label="Trust score" value={owner.trustScore} />
              <InfoItem label="Banned" value={owner.isBanned ? 'Có' : 'Không'} />
              <InfoItem label="Owner ID" value={getId(owner)} />
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Rentals</p><h3>Đơn thuê liên quan</h3></div></div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead><tr><th>Mã đơn</th><th>Người thuê</th><th>Trạng thái</th><th>Thời gian</th><th className="text-end">Phí thuê</th></tr></thead>
                <tbody>{rentals.map((rental) => (
                  <tr key={rental._id}>
                    <td><code>{rental._id}</code></td>
                    <td>{getName(rental.renterId)}</td>
                    <td><span className={`status-badge ${statusConfig[rental.status]?.cls || 'status-unknown'}`}>{statusConfig[rental.status]?.label || rental.status}</span></td>
                    <td>{formatDateTime(rental.startDate)} - {formatDateTime(rental.endDate)}</td>
                    <td className="text-end">{formatCurrency(rental.rentalFee)}</td>
                  </tr>
                ))}</tbody>
              </table>
              {rentals.length === 0 && <div className="admin-compact-empty">Chưa có đơn thuê liên quan.</div>}
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Signals</p><h3>Disputes, reports và reviews</h3></div></div>
            <div className="admin-signal-grid">
              <div><h4>Reports</h4>{reports.map((report) => <p key={report._id}><strong>{report.status}</strong> · {report.reason || report.resolutionNote || '-'}</p>)}{reports.length === 0 && <p>Chưa có report.</p>}</div>
              <div><h4>Disputes</h4>{disputes.map((dispute) => <p key={dispute._id}><strong>{dispute.status}</strong> · {dispute.reason || '-'}</p>)}{disputes.length === 0 && <p>Chưa có tranh chấp.</p>}</div>
              <div><h4>Reviews</h4>{reviews.map((review) => <p key={review._id}><strong>{review.rating || 0}/5</strong> · {review.comment || '-'}</p>)}{reviews.length === 0 && <p>Chưa có review.</p>}</div>
            </div>
          </section>
        </main>

        <aside className="rental-detail-sidebar">
          <section className="rental-detail-panel admin-action-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Admin</p><h3>Thao tác</h3></div></div>
            <button type="button" className="btn btn-outline-primary w-100 mb-2" disabled={actionLoading} onClick={handleFeatureUpdate}>
              <i className="fas fa-star me-2"></i>{item.isFeatured ? 'Tắt featured' : 'Bật featured'}
            </button>
            <button type="button" className="btn btn-outline-success w-100 mb-2" disabled={actionLoading || hasActiveRental} onClick={() => handleStatusUpdate('available')}>Đổi sang available</button>
            <button type="button" className="btn btn-outline-danger w-100" disabled={actionLoading || hasActiveRental} onClick={() => handleStatusUpdate('delisted')}>Delist sản phẩm</button>
            {hasActiveRental && <div className="admin-lifecycle-warning mt-3">Đang khóa đổi status vì có rental active.</div>}
          </section>
        </aside>
      </div>
    </main>
  );
}
