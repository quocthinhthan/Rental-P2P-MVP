import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import AdminDisputeResolutionForm, {
  formatDateTime,
  getErrorMessage,
  getId,
  getName,
  PENALTY_LABELS,
  WINNER_LABELS
} from '../components/Admin/AdminDisputeResolutionForm';
import { getAllDisputes } from '../services/api';
import {
  disputeStatusConfig,
  itemStatusLabels,
  paymentLabels,
  statusConfig
} from '../constants/rentalUi';
import AdminNav from '../components/Admin/AdminNav';
import Spinner from '../components/Common/Spinner';
import '../styles/MyRentalsPage.css';
import '../styles/RentalDetailPage.css';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDisputeDetailPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const STATUS_LABELS = {
  pending: 'Đang hòa giải',
  escalated: 'Cần Admin xử lý',
  resolved: 'Đã xử lý',
  withdrawn: 'Đã rút'
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const getStatusTone = (status) => {
  if (status === 'escalated') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'resolved') return 'success';
  if (status === 'withdrawn') return 'muted';
  return 'neutral';
};

const getRentalStatusLabel = (status) => statusConfig[status]?.label || (status ? 'Không rõ' : '-');
const getItemStatusLabel = (status) => itemStatusLabels[status] || (status ? 'Không rõ' : '-');
const getPaymentStatusLabel = (status) => paymentLabels[status] || (status ? 'Không rõ' : '-');

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="detail-section-header">
      <div>
        {eyebrow && <p className="section-kicker">{eyebrow}</p>}
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, highlight }) {
  return (
    <div className={`detail-info-item${highlight ? ' is-highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function ImageGallery({ images, emptyText }) {
  if (!Array.isArray(images) || images.length === 0) {
    return (
      <div className="compact-empty-state">
        <span aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="evidence-grid">
      {images.map((imageUrl) => (
        <a href={imageUrl} target="_blank" rel="noreferrer" key={imageUrl}>
          <img src={imageUrl} alt="Bằng chứng tranh chấp" />
        </a>
      ))}
    </div>
  );
}

function PartyCard({ title, user, icon }) {
  return (
    <div className="admin-dispute-party-card">
      <span className="admin-dispute-party-icon">
        <i className={icon}></i>
      </span>
      <div>
        <p>{title}</p>
        <strong>{getName(user)}</strong>
        <span>{user?.email || 'Chưa có email'}</span>
        <span>{user?.phoneNumber || user?.phone || 'Chưa có số điện thoại'}</span>
      </div>
    </div>
  );
}

export default function AdminDisputeDetailPage() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDispute = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllDisputes('all');
      const found = Array.isArray(data) ? data.find((item) => getId(item) === disputeId) : null;
      if (!found) {
        setDispute(null);
        return;
      }
      setDispute(found);
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải chi tiết tranh chấp.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  const rental = dispute?.rentalId || {};
  const item = rental.itemId || {};
  const renter = rental.renterId || {};
  const owner = rental.ownerId || {};
  const reporter = dispute?.reporterId || {};
  const itemImages = Array.isArray(item.images) ? item.images : [];
  const coverImage = itemImages[0];
  const statusTone = getStatusTone(dispute?.status);

  const moneySummary = useMemo(() => ([
    ['Phí thuê', formatCurrency(rental.rentalFee)],
    ['Tiền cọc', formatCurrency(rental.depositAmount)],
    ['Tổng tiền', formatCurrency(rental.totalAmount)]
  ]), [rental.rentalFee, rental.depositAmount, rental.totalAmount]);

  if (loading) {
    return (
      <div className="admin-dispute-detail-page">
        <div className="admin-dispute-detail-loading">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <main className="admin-dispute-detail-page">
        <div className="admin-dispute-detail-not-found">
          <i className="fas fa-search"></i>
          <h2>Không tìm thấy hồ sơ tranh chấp</h2>
          <p>Hồ sơ có thể đã bị xóa hoặc bạn không còn quyền truy cập.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/disputes')}>
            Quay lại danh sách
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="myrp rental-detail-page admin-dispute-detail-page">
      <section className="admin-dispute-detail-topbar">
        <Link to="/admin/disputes" className="admin-dispute-back-link">
          <i className="fas fa-arrow-left"></i>
          Quay lại danh sách
        </Link>
        <AdminNav />
      </section>

      <div className="myrp-container rental-detail-layout admin-dispute-detail-layout">
        <main className="rental-detail-main">
          <section className="rental-hero-section admin-dispute-detail-hero">
            <div className="rental-hero-media admin-dispute-detail-media">
              {coverImage ? (
                <img src={coverImage} alt={item.name || 'Vật phẩm tranh chấp'} />
              ) : (
                <div className="admin-dispute-detail-image-empty">
                  <i className="fas fa-box-open"></i>
                </div>
              )}
            </div>

            <div className="rental-hero-content">
              <div className="rental-hero-status">
                <span className={`admin-dispute-status is-${statusTone}`}>
                  {STATUS_LABELS[dispute.status] || dispute.status}
                </span>
                {rental.status && (
                  <span className={`status-badge ${statusConfig[rental.status]?.cls || 'status-unknown'}`}>
                    {getRentalStatusLabel(rental.status)}
                  </span>
                )}
              </div>
              <p className="rental-hero-kicker">Hồ sơ tranh chấp</p>
              <h3>{item.name || 'Vật phẩm không rõ'}</h3>
              <p className="rental-hero-date">
                Mã tranh chấp <code>{getId(dispute)}</code>
              </p>
              <p className="rental-hero-date">
                Đơn thuê <code>{getId(rental)}</code> · {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
              </p>

              <div className="admin-dispute-money-row">
                {moneySummary.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rental-detail-panel">
            <SectionHeader eyebrow="Tổng quan" title="Thông tin tranh chấp">
              <span className={`admin-dispute-status is-${statusTone}`}>
                {STATUS_LABELS[dispute.status] || dispute.status}
              </span>
            </SectionHeader>

            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Người báo cáo" value={getName(reporter)} />
              <InfoItem label="Trạng thái tranh chấp" value={disputeStatusConfig[dispute.status]?.label || STATUS_LABELS[dispute.status] || dispute.status} />
              <InfoItem label="Ngày tạo" value={formatDateTime(dispute.createdAt)} />
              <InfoItem label="Hạn hòa giải" value={formatDateTime(dispute.mediationEndsAt)} />
              <InfoItem label="Thời điểm yêu cầu Admin" value={formatDateTime(dispute.escalatedAt)} />
              <InfoItem label="Thời điểm xử lý" value={formatDateTime(dispute.resolvedAt)} />
              <InfoItem label="Trạng thái đơn cũ" value={getRentalStatusLabel(dispute.previousRentalStatus)} />
              <InfoItem label="Trạng thái đồ cũ" value={getItemStatusLabel(dispute.previousItemStatus)} />
              <InfoItem label="Kết quả" value={WINNER_LABELS[dispute.winner] || dispute.winner || '-'} />
              <InfoItem label="Chế tài" value={PENALTY_LABELS[dispute.penaltyType] || dispute.penaltyType || '-'} />
              <InfoItem label="Người bị xử lý" value={getName(dispute.penalizeUserId, '-')} />
              <InfoItem label="Admin xử lý" value={getName(dispute.resolvedBy, '-')} />
            </div>
          </section>

          <section className="rental-detail-panel">
            <SectionHeader eyebrow="Nội dung" title="Lý do và bằng chứng" />
            <div className="admin-dispute-detail-reason-box">
              <p>{dispute.reason || 'Không có nội dung.'}</p>
            </div>
            <ImageGallery images={dispute.evidenceImages} emptyText="Chưa có hình ảnh bằng chứng được gửi kèm." />
          </section>

          <section className="rental-detail-panel">
            <SectionHeader eyebrow="Giao dịch" title="Thông tin đơn thuê" />
            <div className="detail-info-grid admin-dispute-detail-info-grid">
              <InfoItem label="Trạng thái đơn" value={getRentalStatusLabel(rental.status)} />
              <InfoItem label="Trạng thái thanh toán" value={getPaymentStatusLabel(rental.paymentStatus)} />
              <InfoItem label="Trạng thái vật phẩm" value={getItemStatusLabel(item.status)} />
              <InfoItem label="Giá thuê/ngày" value={formatCurrency(item.pricePerDay)} />
              <InfoItem label="Ngày bắt đầu" value={formatDate(rental.startDate)} />
              <InfoItem label="Ngày kết thúc" value={formatDate(rental.endDate)} />
              <InfoItem label="Phí thuê" value={formatCurrency(rental.rentalFee)} />
              <InfoItem label="Tiền cọc" value={formatCurrency(rental.depositAmount)} />
              <InfoItem label="Tổng tiền" value={formatCurrency(rental.totalAmount)} highlight />
            </div>
            {rental.note && (
              <div className="rental-card-note">
                <strong>Ghi chú đơn thuê:</strong> {rental.note}
              </div>
            )}
          </section>

          <section className="rental-detail-panel">
            <SectionHeader eyebrow="Các bên liên quan" title="Người thuê và chủ đồ" />
            <div className="admin-dispute-party-grid">
              <PartyCard title="Người thuê" user={renter} icon="fas fa-user" />
              <PartyCard title="Chủ đồ" user={owner} icon="fas fa-store" />
              <PartyCard title="Người báo cáo" user={reporter} icon="fas fa-flag" />
            </div>
          </section>
        </main>

        <aside className="rental-detail-sidebar">
          <section className="rental-detail-panel admin-dispute-decision-panel">
            <SectionHeader eyebrow="Admin" title="Quyết định xử lý" />
            <AdminDisputeResolutionForm
              dispute={dispute}
              onResolved={fetchDispute}
              statusLabels={STATUS_LABELS}
            />
          </section>
        </aside>
      </div>
    </main>
  );
}
