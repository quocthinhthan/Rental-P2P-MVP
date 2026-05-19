import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getAdminItemReports, resolveAdminItemReport } from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminNav from '../components/Admin/AdminNav';
import { formatDateTime, getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels } from '../constants/rentalUi';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected / no action' },
];

const ACTION_OPTIONS = [
  { value: 'no_action', label: 'Không xử lý thêm' },
  { value: 'hide_item', label: 'Ẩn sản phẩm' },
  { value: 'delist_item', label: 'Delist sản phẩm' },
  { value: 'ban_item', label: 'Ban item' },
  { value: 'warn_owner', label: 'Cảnh báo owner' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'status_asc', label: 'Trạng thái' },
  { value: 'action_asc', label: 'Action' },
];

const getId = (value) => (typeof value === 'string' ? value : value?._id || value?.id || '');

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
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải report sản phẩm.'), 'error');
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
      status_asc: (a, b) => (a.status || '').localeCompare(b.status || ''),
      action_asc: (a, b) => (a.action || '').localeCompare(b.action || ''),
      created_desc: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    };
    return rows.sort(sorters[sort] || sorters.created_desc);
  }, [reports, sort, status]);

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleResolve = async (report) => {
    if (report.status === 'resolved') {
      Swal.fire('Đã xử lý', 'Report này đã được xử lý trước đó.', 'info');
      return;
    }

    const { value, isConfirmed } = await Swal.fire({
      title: 'Xử lý report sản phẩm',
      html: `
        <select id="report-action" class="swal2-select" style="display:block;width:100%;margin:0 0 12px;">
          ${ACTION_OPTIONS.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')}
        </select>
        <textarea id="report-note" class="swal2-textarea" placeholder="Nhập adminNote bắt buộc..." style="display:block;width:100%;margin:0;"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xử lý',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const action = document.getElementById('report-action')?.value;
        const adminNote = document.getElementById('report-note')?.value?.trim();
        if (!adminNote) {
          Swal.showValidationMessage('Vui lòng nhập adminNote.');
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
      Swal.fire('Thành công!', 'Report sản phẩm đã được xử lý.', 'success');
      await fetchReports();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể xử lý report sản phẩm.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <main className="admin-products-page admin-shell-page">
      <section className="admin-disputes-hero">
        <div className="admin-disputes-hero-copy">
          <span className="admin-disputes-eyebrow">Item Reports</span>
          <h1>Report sản phẩm</h1>
          <p>Xem lý do người dùng báo cáo, đối chiếu sản phẩm và chủ đồ trước khi đưa ra quyết định.</p>
        </div>
        <AdminNav />
      </section>

      <section className="admin-table-panel admin-filter-panel">
        <div className="admin-filter-grid is-reports">
          <select className="form-select" value={status} onChange={(e) => changeStatus(e.target.value)}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="button" className="btn btn-outline-secondary" onClick={fetchReports}><i className="fas fa-sync-alt me-2"></i>Làm mới</button>
        </div>
      </section>

      <section className="admin-table-panel">
        <div className="admin-panel-heading">
          <h3>Danh sách report</h3>
          <span>{Number(pagination.totalItems || 0).toLocaleString('vi-VN')} report</span>
        </div>

        {loading ? (
          <div className="admin-dispute-loading"><Spinner /></div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Sản phẩm</th>
                    <th>Owner</th>
                    <th>Người report</th>
                    <th>Trạng thái</th>
                    <th>Action</th>
                    <th className="text-end">Xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => {
                    const item = report.itemId || {};
                    const owner = item.ownerId || {};
                    return (
                      <tr key={report._id}>
                        <td>
                          <strong>{report.reason || 'Không có lý do'}</strong>
                          <span className="admin-muted-line">{formatDateTime(report.createdAt)}</span>
                        </td>
                        <td>
                          <Link to={`/admin/items/${getId(item)}`} className="admin-link-strong">{item.name || 'Sản phẩm không rõ'}</Link>
                          <span className={`admin-status-pill is-${item.status}`}>{itemStatusLabels[item.status] || item.status || '-'}</span>
                        </td>
                        <td><strong>{getName(owner, '-')}</strong><span className="admin-muted-line">{owner.email || '-'}</span></td>
                        <td><strong>{getName(report.reporterId, '-')}</strong><span className="admin-muted-line">{report.reporterId?.email || '-'}</span></td>
                        <td><span className={`admin-status-pill is-${report.status}`}>{report.status || '-'}</span></td>
                        <td>{report.action || '-'}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-primary" disabled={report.status === 'resolved' || actionLoading === report._id} onClick={() => handleResolve(report)}>
                            {report.status === 'resolved' ? 'Đã xử lý' : 'Resolve'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleReports.length === 0 && <div className="admin-compact-empty">Không có report phù hợp bộ lọc.</div>}
            </div>

            <div className="admin-pagination">
              <button type="button" className="btn btn-outline-secondary" disabled={(pagination.currentPage || 1) <= 1} onClick={() => setPage((pagination.currentPage || 1) - 1)}>Trước</button>
              <span>Trang {pagination.currentPage || 1} / {pagination.totalPages || 1}</span>
              <button type="button" className="btn btn-outline-secondary" disabled={!pagination.hasMore} onClick={() => setPage((pagination.currentPage || 1) + 1)}>Sau</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
