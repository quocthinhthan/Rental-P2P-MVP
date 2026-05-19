import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllDisputes } from '../services/api';
import Spinner from '../components/Common/Spinner';
import Swal from 'sweetalert2';
import {
  getErrorMessage,
  getName,
  formatDateTime,
  WINNER_LABELS
} from '../components/Admin/AdminDisputeResolutionForm';
import {
  itemStatusLabels,
  statusConfig
} from '../constants/rentalUi';
import AdminNav from '../components/Admin/AdminNav';
import { formatRentalCode } from '../utils/itemCode';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';

const STATUS_OPTIONS = ['all', 'pending', 'escalated', 'resolved', 'withdrawn'];
const STATUS_LABELS = {
  all: 'Tất cả',
  pending: 'Đang hòa giải',
  escalated: 'Cần Admin xử lý',
  resolved: 'Đã xử lý',
  withdrawn: 'Đã rút'
};

const getStatusTone = (status) => {
  if (status === 'escalated') return 'danger';
  if (status === 'pending') return 'warning';
  if (status === 'resolved') return 'success';
  if (status === 'withdrawn') return 'muted';
  return 'neutral';
};

const getRentalStatusLabel = (status) => statusConfig[status]?.label || (status ? 'Không rõ' : '-');
const getItemStatusLabel = (status) => itemStatusLabels[status] || (status ? 'Không rõ' : '-');

function DisputeCard({ dispute }) {
  const rental = dispute.rentalId || {};
  const item = rental.itemId || {};
  const renter = rental.renterId || {};
  const owner = rental.ownerId || {};
  const reporter = dispute.reporterId || {};
  const tone = getStatusTone(dispute.status);

  return (
    <article className={`admin-dispute-card is-${tone}`}>
      <div className="admin-dispute-card-header">
        <div className="admin-dispute-title-group">
          <span className="admin-dispute-item-icon">
            <i className="fas fa-box-open"></i>
          </span>
          <div>
            <h3>{item.name || 'Vật phẩm không rõ'}</h3>
            <p>
              Mã đơn thuê <code>{formatRentalCode(rental)}</code>
            </p>
          </div>
        </div>
        <span className={`admin-dispute-status is-${tone}`}>
          {STATUS_LABELS[dispute.status] || dispute.status}
        </span>
      </div>

      <div className="admin-dispute-card-body">
        <div className="admin-dispute-info-grid">
          <div className="admin-dispute-info-item"><span>Người báo cáo</span><strong>{getName(reporter)}</strong></div>
          <div className="admin-dispute-info-item"><span>Người thuê</span><strong>{getName(renter)}</strong></div>
          <div className="admin-dispute-info-item"><span>Chủ đồ</span><strong>{getName(owner)}</strong></div>
          <div className="admin-dispute-info-item"><span>Ngày tạo</span><strong>{formatDateTime(dispute.createdAt)}</strong></div>
          <div className="admin-dispute-info-item"><span>Hạn hòa giải</span><strong>{formatDateTime(dispute.mediationEndsAt)}</strong></div>
          <div className="admin-dispute-info-item"><span>Kết quả</span><strong>{WINNER_LABELS[dispute.winner] || dispute.winner || '-'}</strong></div>
          <div className="admin-dispute-info-item"><span>Trạng thái đơn cũ</span><strong>{getRentalStatusLabel(dispute.previousRentalStatus)}</strong></div>
          <div className="admin-dispute-info-item"><span>Trạng thái đồ cũ</span><strong>{getItemStatusLabel(dispute.previousItemStatus)}</strong></div>
        </div>

        <div className="admin-dispute-card-actions">
          <Link to={`/admin/disputes/${dispute._id}`} className="btn btn-primary">
            <i className="fas fa-folder-open me-2"></i>
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [summaryDisputes, setSummaryDisputes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async (status = statusFilter) => {
    try {
      setLoading(true);
      const [filteredData, summaryData] = await Promise.all([
        getAllDisputes(status),
        status === 'all' ? Promise.resolve(null) : getAllDisputes('all')
      ]);
      const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
      setDisputes(safeFilteredData);
      setSummaryDisputes(Array.isArray(summaryData) ? summaryData : safeFilteredData);
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải danh sách tranh chấp.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const sortedDisputes = useMemo(() => {
    const priority = { escalated: 0, pending: 1, resolved: 2, withdrawn: 3 };
    return [...disputes].sort((a, b) => {
      const statusCompare = (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      if (statusCompare !== 0) return statusCompare;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [disputes]);

  const disputeCounts = useMemo(() => {
    return summaryDisputes.reduce((counts, dispute) => {
      counts.total += 1;
      counts[dispute.status] = (counts[dispute.status] || 0) + 1;
      return counts;
    }, { total: 0, pending: 0, escalated: 0, resolved: 0, withdrawn: 0 });
  }, [summaryDisputes]);

  return (
    <main className="admin-disputes-page">
      <section className="admin-disputes-hero">
        <div className="admin-disputes-hero-copy">
          <span className="admin-disputes-eyebrow">Bảng điều phối tranh chấp</span>
          <h1>Quản lý tranh chấp</h1>
          <p>Ưu tiên hồ sơ cần Admin xử lý, rà soát bằng chứng và ra quyết định cuối cùng cho giao dịch thuê.</p>
        </div>
        <div className="admin-hero-actions">
          <AdminNav />
          <button type="button" className="admin-dispute-refresh-btn" onClick={() => fetchDisputes()}>
            <i className="fas fa-sync-alt"></i>
            Làm mới
          </button>
        </div>
      </section>

      <section className="admin-dispute-stat-strip" aria-label="Tổng quan tranh chấp">
        <div className="admin-dispute-stat-card is-total">
          <span>Tổng hồ sơ</span>
          <strong>{disputeCounts.total}</strong>
        </div>
        <div className="admin-dispute-stat-card is-danger">
          <span>Cần Admin</span>
          <strong>{disputeCounts.escalated}</strong>
        </div>
        <div className="admin-dispute-stat-card is-warning">
          <span>Đang hòa giải</span>
          <strong>{disputeCounts.pending}</strong>
        </div>
        <div className="admin-dispute-stat-card is-success">
          <span>Đã xử lý</span>
          <strong>{disputeCounts.resolved}</strong>
        </div>
      </section>

      <div className="admin-dispute-filter-bar">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={statusFilter === status ? 'is-active' : ''}
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]}
            <span>{status === 'all' ? disputeCounts.total : disputeCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-dispute-loading">
          <Spinner />
        </div>
      ) : sortedDisputes.length === 0 ? (
        <div className="admin-dispute-empty-state">
          <i className="fas fa-clipboard-check"></i>
          <strong>Chưa có tranh chấp nào trong bộ lọc này.</strong>
          <p>Thử chọn bộ lọc khác hoặc làm mới danh sách để cập nhật hồ sơ mới nhất.</p>
        </div>
      ) : (
        <div className="admin-dispute-list">
          {sortedDisputes.map((dispute) => (
            <DisputeCard key={dispute._id} dispute={dispute} />
          ))}
        </div>
      )}
    </main>
  );
}
