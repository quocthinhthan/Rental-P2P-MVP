import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getAdminItemReports, resolveAdminItemReport } from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminHero from '../components/Admin/AdminHero';
import { formatDateTime, getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels } from '../constants/rentalUi';
import { formatItemCode } from '../utils/itemCode';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'rejected', label: 'Không xử lý thêm' },
];

const ACTION_OPTIONS = [
  { value: 'no_action', label: 'Không xử lý thêm' },
  { value: 'hide_item', label: 'Ẩn sản phẩm' },
  { value: 'delist_item', label: 'Gỡ sản phẩm' },
  { value: 'ban_item', label: 'Gỡ sản phẩm và phạt chủ sở hữu' },
  { value: 'warn_owner', label: 'Cảnh báo chủ sở hữu' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'status_asc', label: 'Trạng thái' },
  { value: 'action_asc', label: 'Hướng xử lý' },
];

const REPORT_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  resolved: 'Đã xử lý',
};

const REPORT_STATUS_CLASSES = {
  pending: 'aip-pill--pending',
  resolved: 'aip-pill--available',
};

const ACTION_LABELS = ACTION_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

const getId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '');
const getItemImage = (item) => (Array.isArray(item?.images) && item.images[0]) || '/img/product-1.png';

export default function AdminItemReportsPage() {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const backendStatus = status === 'rejected' ? 'resolved' : status;

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminItemReports({ page, limit: 20, status: backendStatus });
      setReports(Array.isArray(response.data?.reports) ? response.data.reports : []);
      setPagination(response.data?.pagination || {});
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải danh sách báo cáo sản phẩm.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, backendStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const visibleReports = useMemo(() => {
    let rows = [...reports];
    if (status === 'rejected') {
      rows = rows.filter((report) => report.action === 'no_action');
    }
    const sorters = {
      status_asc: (a, b) => (a.status || '').localeCompare(b.status || '', 'vi'),
      action_asc: (a, b) => (a.action || '').localeCompare(b.action || '', 'vi'),
      created_desc: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    };
    return rows.sort(sorters[sort] || sorters.created_desc);
  }, [reports, sort, status]);

  const reportStats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length;
    const resolved = reports.filter((report) => report.status === 'resolved').length;
    const noAction = reports.filter((report) => report.action === 'no_action').length;
    return { pending, resolved, noAction };
  }, [reports]);

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleResolve = async (report) => {
    if (report.status === 'resolved') {
      Swal.fire('Đã xử lý', 'Báo cáo này đã được xử lý trước đó.', 'info');
      return;
    }

    const { value, isConfirmed } = await Swal.fire({
      title: 'Xử lý báo cáo sản phẩm',
      html: `
        <select id="report-action" class="swal2-select" style="display:block;width:100%;margin:0 0 12px;">
          ${ACTION_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
        </select>
        <textarea id="report-note" class="swal2-textarea" placeholder="Nhập ghi chú xử lý bắt buộc..." style="display:block;width:100%;margin:0;"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xử lý',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const action = document.getElementById('report-action')?.value;
        const adminNote = document.getElementById('report-note')?.value?.trim();
        if (!adminNote) {
          Swal.showValidationMessage('Vui lòng nhập ghi chú xử lý.');
          return false;
        }
        return { action, adminNote };
      },
    });
    if (!isConfirmed) return;

    try {
      setActionLoading(report._id);
      await resolveAdminItemReport(report._id, {
        action: value.action,
        adminNote: value.adminNote,
        resolutionNote: value.adminNote,
      });
      Swal.fire('Thành công!', 'Báo cáo sản phẩm đã được xử lý.', 'success');
      await fetchReports();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể xử lý báo cáo sản phẩm.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <main className="admin-products-page admin-shell-page">
      <AdminHero
        eyebrow="Quản trị hệ thống"
        title="Báo cáo sản phẩm"
        description="Theo dõi phản ánh từ người dùng, kiểm tra sản phẩm và chủ sở hữu trước khi quyết định hướng xử lý."
      />

      <section className="air-stat-row">
        <div className="air-stat-card">
          <span>Tổng báo cáo</span>
          <strong>{Number(pagination.totalItems || 0).toLocaleString('vi-VN')}</strong>
        </div>
        <div className="air-stat-card">
          <span>Chờ xử lý</span>
          <strong>{reportStats.pending.toLocaleString('vi-VN')}</strong>
        </div>
        <div className="air-stat-card">
          <span>Đã xử lý</span>
          <strong>{reportStats.resolved.toLocaleString('vi-VN')}</strong>
        </div>
        <div className="air-stat-card">
          <span>Không xử lý thêm</span>
          <strong>{reportStats.noAction.toLocaleString('vi-VN')}</strong>
        </div>
      </section>

      <section className="aip-filter-panel">
        <div className="air-filter-form">
          <div className="aip-field">
            <label className="aip-label">Trạng thái</label>
            <div className="aip-select-wrap">
              <select className="aip-select" value={status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <i className="fas fa-chevron-down aip-select-icon" />
            </div>
          </div>
          <div className="aip-field">
            <label className="aip-label">Sắp xếp</label>
            <div className="aip-select-wrap">
              <select className="aip-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <i className="fas fa-chevron-down aip-select-icon" />
            </div>
          </div>
          <button type="button" className="aip-btn aip-btn--ghost air-refresh-btn" onClick={fetchReports}>
            <i className="fas fa-sync-alt" /> Làm mới
          </button>
        </div>
      </section>

      <section className="aip-table-panel">
        <div className="aip-table-head">
          <div>
            <h3 className="aip-table-title">Danh sách báo cáo</h3>
            <span className="aip-table-count">{Number(pagination.totalItems || 0).toLocaleString('vi-VN')} báo cáo</span>
          </div>
        </div>

        {loading ? (
          <div className="aip-loading"><Spinner /></div>
        ) : (
          <>
            <div className="aip-table-wrap">
              <table className="aip-table air-table">
                <thead>
                  <tr>
                    <th>Báo cáo</th>
                    <th>Sản phẩm</th>
                    <th>Chủ sở hữu</th>
                    <th>Người báo cáo</th>
                    <th>Trạng thái</th>
                    <th>Hướng xử lý</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => {
                    const item = report.itemId || {};
                    const owner = item.ownerId || {};
                    const isResolved = report.status === 'resolved';
                    return (
                      <tr key={report._id}>
                        <td>
                          <div className="air-report-reason">
                            <strong>{report.reason || 'Không có lý do'}</strong>
                            <span>{formatDateTime(report.createdAt)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="aip-entity">
                            <img src={getItemImage(item)} alt={item.name || 'Sản phẩm'} />
                            <div>
                              <Link to={`/admin/items/${getId(item)}`} className="air-item-link">
                                {item.name || 'Sản phẩm không rõ'}
                              </Link>
                              <span>
                                {formatItemCode(item)} · {itemStatusLabels[item.status] || item.status || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{getName(owner, '-')}</strong>
                          <span className="aip-muted">{owner.email || '-'}</span>
                        </td>
                        <td>
                          <strong>{getName(report.reporterId, '-')}</strong>
                          <span className="aip-muted">{report.reporterId?.email || '-'}</span>
                        </td>
                        <td>
                          <span className={`aip-pill ${REPORT_STATUS_CLASSES[report.status] || ''}`}>
                            {REPORT_STATUS_LABELS[report.status] || report.status || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`aip-pill ${report.action ? 'aip-pill--muted' : 'air-pill--waiting'}`}>
                            {ACTION_LABELS[report.action] || 'Chưa có'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="aip-action-btn aip-action-btn--view"
                            disabled={isResolved || actionLoading === report._id}
                            onClick={() => handleResolve(report)}
                            title={isResolved ? 'Đã xử lý' : 'Xử lý báo cáo'}
                          >
                            <i className={`fas ${isResolved ? 'fa-check' : 'fa-gavel'}`} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleReports.length === 0 && (
                <div className="aip-empty">
                  <i className="fas fa-flag" />
                  <p>Không có báo cáo sản phẩm phù hợp với bộ lọc.</p>
                </div>
              )}
            </div>

            <div className="aip-pagination">
              <button
                type="button"
                className="aip-page-btn"
                disabled={(pagination.currentPage || 1) <= 1}
                onClick={() => setPage((pagination.currentPage || 1) - 1)}
              >
                <i className="fas fa-chevron-left" /> Trước
              </button>
              <span className="aip-page-info">
                Trang <strong>{pagination.currentPage || 1}</strong> / {pagination.totalPages || 1}
              </span>
              <button
                type="button"
                className="aip-page-btn"
                disabled={!pagination.hasMore}
                onClick={() => setPage((pagination.currentPage || 1) + 1)}
              >
                Sau <i className="fas fa-chevron-right" />
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
