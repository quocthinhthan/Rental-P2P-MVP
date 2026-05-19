import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  getAdminItems,
  updateAdminItemFeature,
  updateAdminItemStatus
} from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminNav from '../components/Admin/AdminNav';
import { getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels } from '../constants/rentalUi';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'delisted', label: 'Delisted' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'price_desc', label: 'Giá cao' },
  { value: 'rental_desc', label: 'Nhiều đơn thuê' },
  { value: 'dispute_desc', label: 'Nhiều dispute' },
];

const ACTIVE_ITEM_STATUSES = ['rented'];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getItemImage = (item) => (Array.isArray(item?.images) && item.images[0]) || '/img/product-1.png';

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, limit: 20, search: '', status: '', category: '', ownerId: '' });
  const [draft, setDraft] = useState({ search: '', status: '', category: '', ownerId: '' });
  const [sort, setSort] = useState('created_desc');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminItems(filters);
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
      setPagination(response.data?.pagination || {});
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải danh sách sản phẩm.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const sortedItems = useMemo(() => {
    const rows = [...items];
    const sorters = {
      name_asc: (a, b) => (a.name || '').localeCompare(b.name || '', 'vi'),
      price_desc: (a, b) => Number(b.pricePerDay || 0) - Number(a.pricePerDay || 0),
      rental_desc: (a, b) => Number(b.rentalCount || 0) - Number(a.rentalCount || 0),
      dispute_desc: (a, b) => Number(b.disputeCount || 0) - Number(a.disputeCount || 0),
      created_desc: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    };
    return rows.sort(sorters[sort] || sorters.created_desc);
  }, [items, sort]);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, ...draft, page: 1 }));
  };

  const changePage = (page) => {
    if (page < 1 || page > (pagination.totalPages || 1)) return;
    setFilters((current) => ({ ...current, page }));
  };

  const handleStatusUpdate = async (item, status) => {
    if (ACTIVE_ITEM_STATUSES.includes(item.status) && status !== 'rented') {
      Swal.fire('Không thể thao tác', 'Sản phẩm đang có đơn thuê active. Vui lòng xử lý đơn thuê trước khi đổi trạng thái.', 'warning');
      return;
    }

    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Đổi trạng thái sang ${itemStatusLabels[status] || status}?`,
      input: 'textarea',
      inputLabel: 'Lý do audit',
      inputPlaceholder: 'Nhập lý do thay đổi trạng thái...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      inputValidator: (value) => (!value?.trim() ? 'Vui lòng nhập lý do.' : undefined),
    });
    if (!isConfirmed) return;

    try {
      setActionLoading(`${item._id}-status`);
      await updateAdminItemStatus(item._id, { status, reason: reason.trim() });
      Swal.fire('Thành công!', 'Trạng thái sản phẩm đã được cập nhật.', 'success');
      await fetchItems();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật trạng thái sản phẩm.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleFeatureUpdate = async (item) => {
    const nextValue = !item.isFeatured;
    const confirm = await Swal.fire({
      title: nextValue ? 'Đánh dấu nổi bật?' : 'Tắt nổi bật?',
      text: item.name || 'Sản phẩm này',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nextValue ? 'Bật featured' : 'Tắt featured',
      cancelButtonText: 'Hủy',
    });
    if (!confirm.isConfirmed) return;

    try {
      setActionLoading(`${item._id}-feature`);
      await updateAdminItemFeature(item._id, { isFeatured: nextValue });
      await fetchItems();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật featured.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <main className="admin-products-page admin-shell-page">
      <section className="admin-disputes-hero">
        <div className="admin-disputes-hero-copy">
          <span className="admin-disputes-eyebrow">Product Management</span>
          <h1>Quản lý sản phẩm</h1>
          <p>Rà soát toàn bộ sản phẩm, trạng thái hiển thị, featured, số đơn thuê và tín hiệu rủi ro.</p>
        </div>
        <AdminNav />
      </section>

      <section className="admin-table-panel admin-filter-panel">
        <form className="admin-filter-grid" onSubmit={applyFilters}>
          <input className="form-control" placeholder="Tìm tên sản phẩm" value={draft.search} onChange={(e) => setDraft((v) => ({ ...v, search: e.target.value }))} />
          <select className="form-select" value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value }))}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input className="form-control" placeholder="Category" value={draft.category} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))} />
          <input className="form-control" placeholder="Owner ID" value={draft.ownerId} onChange={(e) => setDraft((v) => ({ ...v, ownerId: e.target.value }))} />
          <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button type="submit" className="btn btn-primary"><i className="fas fa-search me-2"></i>Lọc</button>
        </form>
      </section>

      <section className="admin-table-panel">
        <div className="admin-panel-heading">
          <h3>Danh sách sản phẩm</h3>
          <span>{Number(pagination.totalItems || 0).toLocaleString('vi-VN')} sản phẩm</span>
        </div>

        {loading ? (
          <div className="admin-dispute-loading"><Spinner /></div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Chủ đồ</th>
                    <th>Giá thuê</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Rentals</th>
                    <th className="text-end">Disputes</th>
                    <th>Featured</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const hasActiveRental = ACTIVE_ITEM_STATUSES.includes(item.status);
                    return (
                      <tr key={item._id} className={hasActiveRental ? 'is-warning-row' : ''}>
                        <td>
                          <div className="admin-table-entity">
                            <img src={getItemImage(item)} alt={item.name || 'Sản phẩm'} />
                            <div>
                              <strong>{item.name || 'Không rõ'}</strong>
                              <span>{item.category || '-'} {hasActiveRental ? '• Có rental active' : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td><strong>{getName(item.owner, '-')}</strong><span className="admin-muted-line">{item.owner?.email || '-'}</span></td>
                        <td>{formatCurrency(item.pricePerDay)}</td>
                        <td><span className={`admin-status-pill is-${item.status}`}>{itemStatusLabels[item.status] || item.status || '-'}</span></td>
                        <td className="text-end">{item.rentalCount || 0}</td>
                        <td className="text-end">{item.disputeCount || 0}</td>
                        <td><span className={`admin-status-pill ${item.isFeatured ? 'is-success' : 'is-muted'}`}>{item.isFeatured ? 'Featured' : 'Thường'}</span></td>
                        <td className="text-end">
                          <div className="admin-action-menu">
                            <Link to={`/admin/items/${item._id}`} className="btn btn-sm btn-outline-primary">Chi tiết</Link>
                            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={actionLoading === `${item._id}-feature`} onClick={() => handleFeatureUpdate(item)}>
                              {item.isFeatured ? 'Unfeature' : 'Feature'}
                            </button>
                            <select
                              className="form-select form-select-sm"
                              value=""
                              disabled={actionLoading === `${item._id}-status` || hasActiveRental}
                              onChange={(e) => e.target.value && handleStatusUpdate(item, e.target.value)}
                            >
                              <option value="">Đổi status</option>
                              {['available', 'delisted'].map((status) => <option key={status} value={status}>{itemStatusLabels[status]}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedItems.length === 0 && <div className="admin-compact-empty">Không có sản phẩm phù hợp bộ lọc.</div>}
            </div>

            <div className="admin-pagination">
              <button type="button" className="btn btn-outline-secondary" disabled={(pagination.currentPage || 1) <= 1} onClick={() => changePage((pagination.currentPage || 1) - 1)}>Trước</button>
              <span>Trang {pagination.currentPage || 1} / {pagination.totalPages || 1}</span>
              <button type="button" className="btn btn-outline-secondary" disabled={!pagination.hasMore} onClick={() => changePage((pagination.currentPage || 1) + 1)}>Sau</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
