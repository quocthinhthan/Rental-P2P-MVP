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
import { itemStatusLabels, statusConfig, disputeStatusConfig } from '../constants/rentalUi';
import { formatItemCode, formatRentalCode } from '../utils/itemCode';
import UserTrustSummary from '../components/Trust/TrustBadge';
import '../styles/MyRentalsPage.css';
import '../styles/RentalDetailPage.css';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDisputeDetailPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const ACTIVE_RENTAL_STATUSES = ['pending_confirmation', 'confirmed', 'in_progress', 'disputed'];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '');

const REPORT_ACTION_LABELS = {
  no_action: 'Không xử lý thêm',
  hide_item: 'Ẩn sản phẩm',
  delist_item: 'Gỡ sản phẩm',
  ban_item: 'Gỡ sản phẩm và phạt chủ sở hữu',
  warn_owner: 'Cảnh báo chủ sở hữu',
};

const formatEkycStatus = (status) => {
  if (status === 'verified') return 'Đã xác thực ✅';
  if (status === 'rejected') return 'Bị từ chối ❌';
  if (status === 'pending') return 'Đang chờ duyệt ⏳';
  return 'Chưa xác thực ⚠️';
};

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
      Swal.fire('Không thể thao tác', 'Sản phẩm đang có đơn thuê đang hoạt động. Vui lòng xử lý đơn thuê trước khi đổi trạng thái.', 'warning');
      return;
    }

    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Đổi trạng thái sang ${itemStatusLabels[status] || status}?`,
      input: 'textarea',
      inputLabel: 'Lý do thay đổi trạng thái',
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
      confirmButtonText: item.isFeatured ? 'Tắt nổi bật' : 'Bật nổi bật',
      cancelButtonText: 'Hủy',
    });
    if (!confirm.isConfirmed) return;

    try {
      setActionLoading(true);
      await updateAdminItemFeature(id, { isFeatured: !item.isFeatured });
      await fetchDetail();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật trạng thái nổi bật.'), 'error');
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
                <span className={`admin-status-pill ${item.isFeatured ? 'is-success' : 'is-muted'}`}>{item.isFeatured ? 'Nổi bật 🌟' : 'Không nổi bật'}</span>
                <a href={`/items/${id}`} target="_blank" rel="noopener noreferrer" className="admin-status-pill" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none' }} title="Xem trên trang chợ người dùng">
                  <i className="fas fa-external-link-alt me-1"></i>Chi tiết sản phẩm 🌐
                </a>
              </div>
              <p className="rental-hero-kicker">Chi tiết sản phẩm</p>
              <h3>{item.name || 'Sản phẩm không rõ'}</h3>
              <p className="rental-hero-date">
                <span className="aip-item-code" style={{ marginRight: 10, fontWeight: 700 }}>{formatItemCode(item)}</span>
                {item.category || '-'} · {formatCurrency(item.pricePerDay)} / ngày
              </p>
              {hasActiveRental && <div className="admin-lifecycle-warning"><i className="fas fa-triangle-exclamation"></i>Sản phẩm đang có giao dịch thuê đang hoạt động, không nên đổi sang Sẵn sàng cho thuê hoặc Gỡ.</div>}
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Thống kê</p><h3>Hiệu suất sản phẩm</h3></div></div>
            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Mã sản phẩm" value={formatItemCode(item)} />
              <InfoItem label="Đơn thuê" value={stats.rentalCount} />
              <InfoItem label="Doanh thu" value={formatCurrency(stats.revenue)} />
              <InfoItem label="Hoa hồng" value={formatCurrency(stats.commissionAmount)} />
              <InfoItem label="Tiền cọc" value={formatCurrency(stats.depositAmount)} />
              <InfoItem label="Tranh chấp" value={stats.disputeCount} />
              <InfoItem label="Báo cáo" value={stats.reportCount} />
              <InfoItem label="Đánh giá chủ đồ" value={stats.reviewCount} />
              <InfoItem label="Giá trị gốc" value={formatCurrency(item.baseValue)} />
              <InfoItem label="Địa chỉ" value={item.address} />
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header">
              <div>
                <p className="section-kicker">Chủ sở hữu</p>
                <h3>Thông tin chủ đồ</h3>
              </div>
              {getId(owner) && (
                <Link to={`/users/${getId(owner)}/profile`} className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.8rem', borderRadius: '8px', padding: '6px 12px' }}>
                  <i className="fas fa-user-circle me-1"></i>Hồ sơ chủ đồ
                </Link>
              )}
            </div>
            <div className="admin-owner-trust-summary">
              <UserTrustSummary user={owner} />
              <span>{Number(owner.trustScore ?? 50).toLocaleString('vi-VN')}/100 điểm uy tín</span>
            </div>
            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Tên chủ đồ" value={
                <span>
                  {getName(owner)}
                  {getId(owner) && (
                    <Link to={`/users/${getId(owner)}/profile`} className="ms-2 text-primary" title="Xem hồ sơ chủ đồ" style={{ textDecoration: 'none' }}>
                      <i className="fas fa-external-link-alt" style={{ fontSize: '0.76rem' }}></i>
                    </Link>
                  )}
                </span>
              } />
              <InfoItem label="Email liên hệ" value={owner.email} />
              <InfoItem label="Số điện thoại" value={owner.phoneNumber || owner.phone} />
              <InfoItem label="Trạng thái eKYC" value={formatEkycStatus(owner.ekycStatus)} />
              <InfoItem label="Tài khoản bị khóa" value={owner.isBanned ? 'Có tài khoản đang khóa ❌' : 'Hoạt động bình thường ✅'} />
              <InfoItem label="Mã tài khoản (ID)" value={getId(owner)} />
            </div>
          </section>

          <section className="rental-detail-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Đơn thuê</p><h3>Đơn thuê liên quan</h3></div></div>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead><tr><th>Mã đơn</th><th>Người thuê</th><th>Trạng thái</th><th>Thời gian</th><th className="text-end">Phí thuê</th></tr></thead>
                <tbody>{rentals.map((rental) => (
                  <tr key={rental._id}>
                    <td><code>{formatRentalCode(rental)}</code></td>
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

          {/* Premium Signals Section: Detailed violation reports, disputes and reviews */}
          <section className="rental-detail-panel admin-item-signals-panel">
            <div className="detail-section-header">
              <div>
                <p className="section-kicker">Tín hiệu phản hồi</p>
                <h3>Báo cáo vi phạm, tranh chấp & đánh giá</h3>
              </div>
            </div>

            <div className="admin-signals-container">
              {/* Reports Section */}
              <div className="admin-signal-block">
                <h4 className="admin-signal-heading"><i className="fas fa-flag text-danger me-2"></i> Báo cáo vi phạm ({reports.length})</h4>
                <div className="admin-signal-list">
                  {reports.map((report) => {
                    const reporter = report.reporterId || {};
                    const isReportResolved = report.status === 'resolved';
                    const resolvedBy = report.resolvedBy || {};
                    return (
                      <div key={report._id} className={`admin-signal-card report-card ${isReportResolved ? 'is-resolved' : 'is-pending'}`}>
                        <div className="signal-card-header">
                          <span className={`signal-status-badge ${isReportResolved ? 'badge-resolved' : 'badge-pending'}`}>
                            {isReportResolved ? 'Đã giải quyết' : 'Chờ xử lý'}
                          </span>
                          <span className="signal-card-date">{formatDateTime(report.createdAt)}</span>
                        </div>
                        <div className="signal-card-body">
                          <p className="signal-card-reporter">
                            <strong>Người báo cáo:</strong> {getName(reporter)} <span className="text-muted">({reporter.email || 'N/A'})</span>
                          </p>
                          <p className="signal-card-reason">
                            <strong>Nội dung:</strong> {report.reason || 'Không có mô tả chi tiết'}
                          </p>
                          
                          {/* Evidence images */}
                          {report.evidenceImages && report.evidenceImages.length > 0 && (
                            <div className="signal-evidence-gallery mt-2">
                              <strong>Hình ảnh minh chứng:</strong>
                              <div className="d-flex gap-2 mt-1 flex-wrap">
                                {report.evidenceImages.map((img, index) => (
                                  <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="signal-evidence-link" title="Click để phóng to ảnh">
                                    <img src={img} alt={`Evidence ${index + 1}`} className="signal-evidence-img" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Resolution Details */}
                        {isReportResolved && (
                          <div className="signal-resolution-box mt-3">
                            <h5 className="resolution-title"><i className="fas fa-gavel me-1"></i> Kết quả xử lý từ Admin</h5>
                            <p className="mb-1">
                              <strong>Hướng xử lý:</strong> <span className="badge-action-pill">{REPORT_ACTION_LABELS[report.action] || report.action}</span>
                            </p>
                            <p className="mb-1">
                              <strong>Người giải quyết:</strong> {getName(resolvedBy)} <span className="text-muted">({resolvedBy.email || 'N/A'})</span>
                            </p>
                            <p className="mb-1">
                              <strong>Thời gian xử lý:</strong> {formatDateTime(report.resolvedAt)}
                            </p>
                            <p className="mb-0 resolution-note">
                              <strong>Ghi chú xử lý:</strong> <em>{report.resolutionNote || report.adminNote || 'Không có ghi chú.'}</em>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {reports.length === 0 && <p className="admin-signal-empty"><i className="far fa-circle-check text-success me-2"></i> Chưa có báo cáo vi phạm nào cho sản phẩm này.</p>}
                </div>
              </div>

              {/* Disputes Section */}
              <div className="admin-signal-block mt-4">
                <h4 className="admin-signal-heading"><i className="fas fa-gavel text-warning me-2"></i> Tranh chấp khiếu nại ({disputes.length})</h4>
                <div className="admin-signal-list">
                  {disputes.map((dispute) => {
                    const renter = dispute.renterId || {};
                    const isDisputedResolved = dispute.status === 'resolved';
                    return (
                      <div key={dispute._id} className="admin-signal-card dispute-card">
                        <div className="signal-card-header">
                          <span className={`signal-status-badge badge-${dispute.status}`}>
                            {disputeStatusConfig[dispute.status]?.label || dispute.status}
                          </span>
                          <span className="signal-card-date">{formatDateTime(dispute.createdAt)}</span>
                        </div>
                        <div className="signal-card-body">
                          <p className="signal-card-renter">
                            <strong>Người thuê khiếu nại:</strong> {getName(renter)} <span className="text-muted">({renter.email || 'N/A'})</span>
                          </p>
                          <p className="signal-card-reason">
                            <strong>Lý do khiếu nại:</strong> {dispute.reason || 'Không có mô tả chi tiết'}
                          </p>
                          {isDisputedResolved && dispute.adminDecision && (
                            <div className="signal-resolution-box mt-2">
                              <p className="mb-0">
                                <strong>Phán quyết của Admin:</strong> <em>{dispute.adminDecision}</em>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {disputes.length === 0 && <p className="admin-signal-empty"><i className="far fa-circle-check text-success me-2"></i> Sản phẩm chưa từng xảy ra tranh chấp khiếu nại.</p>}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="admin-signal-block mt-4">
                <h4 className="admin-signal-heading"><i className="fas fa-star text-warning me-2"></i> Đánh giá về chủ sở hữu ({reviews.length})</h4>
                <div className="admin-signal-list">
                  {reviews.map((review) => {
                    const reviewer = review.reviewerId || {};
                    return (
                      <div key={review._id} className="admin-signal-card review-card">
                        <div className="signal-card-header">
                          <span className="signal-rating-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <i key={i} className={`${i < (review.rating || 0) ? 'fas' : 'far'} fa-star star-filled`} style={{ color: '#eab308', marginRight: 2 }} />
                            ))}
                          </span>
                          <span className="signal-card-date">{formatDateTime(review.createdAt)}</span>
                        </div>
                        <div className="signal-card-body">
                          <p className="signal-card-reviewer">
                            <strong>Người đánh giá:</strong> {getName(reviewer)}
                          </p>
                          <p className="signal-card-comment">
                            <strong>Bình luận:</strong> "{review.comment || 'Không có bình luận.'}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {reviews.length === 0 && <p className="admin-signal-empty"><i className="far fa-star text-muted me-2"></i> Chưa có đánh giá nào dành cho chủ sở hữu này.</p>}
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="rental-detail-sidebar">
          <section className="rental-detail-panel admin-action-panel">
            <div className="detail-section-header"><div><p className="section-kicker">Quản trị</p><h3>Thao tác</h3></div></div>
            <button type="button" className="btn btn-outline-primary w-100 mb-3" disabled={actionLoading} onClick={handleFeatureUpdate}>
              <i className="fas fa-star me-2"></i>{item.isFeatured ? 'Tắt nổi bật' : 'Đánh dấu nổi bật'}
            </button>
            
            {item.status !== 'available' && (
              <button type="button" className="btn btn-outline-success w-100 mb-2" disabled={actionLoading || hasActiveRental} onClick={() => handleStatusUpdate('available')}>
                <i className="fas fa-check-circle me-2"></i>Đổi sang Hoạt động
              </button>
            )}
            
            {item.status !== 'delisted' && (
              <button type="button" className="btn btn-outline-danger w-100 mb-3" disabled={actionLoading || hasActiveRental} onClick={() => handleStatusUpdate('delisted')}>
                <i className="fas fa-ban me-2"></i>Gỡ sản phẩm
              </button>
            )}
            
            {hasActiveRental && <div className="admin-lifecycle-warning mt-3">Đang khóa đổi trạng thái vì có đơn thuê đang hoạt động.</div>}
          </section>
        </aside>
      </div>
    </main>
  );
}
