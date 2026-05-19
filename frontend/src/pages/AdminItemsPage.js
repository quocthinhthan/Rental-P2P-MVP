import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  getAdminItems,
  updateAdminItemFeature,
  updateAdminItemStatus
} from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminHero from '../components/Admin/AdminHero';
import { getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels } from '../constants/rentalUi';
import { formatItemCode } from '../utils/itemCode';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';
import '../styles/AdminProductManagement.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'available', label: 'Sẵn sàng cho thuê' },
  { value: 'rented', label: 'Đang cho thuê' },
  { value: 'delisted', label: 'Đã gỡ' },
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'rental_desc', label: 'Nhiều đơn thuê nhất' },
  { value: 'dispute_desc', label: 'Nhiều tranh chấp nhất' },
];

const FEATURED_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'true', label: 'Nổi bật' },
  { value: 'false', label: 'Thường' },
];

const ACTIVE_ITEM_STATUSES = ['rented'];
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const getItemImage = (item) => (Array.isArray(item?.images) && item.images[0]) || '/img/product-1.png';

const INITIAL_DRAFT = { search: '', status: '', category: '', ownerSearch: '', featured: '' };

export default function AdminItemsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, limit: 20, ...INITIAL_DRAFT });
  const [draft, setDraft] = useState(INITIAL_DRAFT);
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

  useEffect(() => { fetchItems(); }, [fetchItems]);

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

  // Apply filters with featured handled client-side (API doesn't support it yet)
  const filteredItems = useMemo(() => {
    if (!filters.featured) return sortedItems;
    const wantFeatured = filters.featured === 'true';
    return sortedItems.filter((item) => Boolean(item.isFeatured) === wantFeatured);
  }, [sortedItems, filters.featured]);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, ...draft, page: 1 }));
  };

  const resetFilters = () => {
    setDraft(INITIAL_DRAFT);
    setFilters({ page: 1, limit: 20, ...INITIAL_DRAFT });
    setSort('created_desc');
  };

  const changePage = (page) => {
    if (page < 1 || page > (pagination.totalPages || 1)) return;
    setFilters((current) => ({ ...current, page }));
  };

  const handleStatusUpdate = async (item, status) => {
    if (ACTIVE_ITEM_STATUSES.includes(item.status) && status !== 'rented') {
      Swal.fire('Không thể thao tác', 'Sản phẩm đang có đơn thuê. Vui lòng xử lý đơn thuê trước khi đổi trạng thái.', 'warning');
      return;
    }

    const { value: reason, isConfirmed } = await Swal.fire({
      title: `Đổi trạng thái sang "${itemStatusLabels[status] || status}"?`,
      input: 'textarea',
      inputLabel: 'Lý do kiểm duyệt',
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
      title: nextValue ? 'Đánh dấu nổi bật?' : 'Bỏ đánh dấu nổi bật?',
      text: item.name || 'Sản phẩm này',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nextValue ? 'Bật nổi bật' : 'Tắt nổi bật',
      cancelButtonText: 'Hủy',
    });
    if (!confirm.isConfirmed) return;

    try {
      setActionLoading(`${item._id}-feature`);
      await updateAdminItemFeature(item._id, { isFeatured: nextValue });
      await fetchItems();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể cập nhật trạng thái nổi bật.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  const hasActiveFilters = Object.values(draft).some(Boolean) || sort !== 'created_desc';

  return (
    <main className="admin-products-page admin-shell-page">
      <AdminHero
        eyebrow="Quản trị hệ thống"
        title="Quản lý sản phẩm"
        description="Rà soát sản phẩm, trạng thái hiển thị, nổi bật, số đơn thuê và tín hiệu rủi ro."
      />

      {/* ── FILTER PANEL ── */}
      <section className="aip-filter-panel">
        <form className="aip-filter-form" onSubmit={applyFilters}>
          <div className="aip-filter-row">
            {/* Search by name */}
            <div className="aip-field aip-field--search">
              <label className="aip-label">Tên sản phẩm</label>
              <div className="aip-input-wrap">
                <i className="fas fa-search aip-input-icon" />
                <input
                  className="aip-input"
                  placeholder="Tìm theo tên..."
                  value={draft.search}
                  onChange={(e) => setDraft((v) => ({ ...v, search: e.target.value }))}
                />
              </div>
            </div>

            {/* Owner name/email search */}
            <div className="aip-field aip-field--owner">
              <label className="aip-label">Chủ sở hữu</label>
              <div className="aip-input-wrap">
                <i className="fas fa-user aip-input-icon" />
                <input
                  className="aip-input"
                  placeholder="Tên hoặc email chủ..."
                  value={draft.ownerSearch}
                  onChange={(e) => setDraft((v) => ({ ...v, ownerSearch: e.target.value }))}
                />
              </div>
            </div>

            {/* Category */}
            <div className="aip-field aip-field--category">
              <label className="aip-label">Danh mục</label>
              <div className="aip-input-wrap">
                <i className="fas fa-tag aip-input-icon" />
                <input
                  className="aip-input"
                  placeholder="Lọc theo danh mục..."
                  value={draft.category}
                  onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))}
                />
              </div>
            </div>

            {/* Status dropdown */}
            <div className="aip-field aip-field--select">
              <label className="aip-label">Trạng thái</label>
              <div className="aip-select-wrap">
                <select
                  className="aip-select"
                  value={draft.status}
                  onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <i className="fas fa-chevron-down aip-select-icon" />
              </div>
            </div>

            {/* Featured dropdown */}
            <div className="aip-field aip-field--select">
              <label className="aip-label">Nổi bật</label>
              <div className="aip-select-wrap">
                <select
                  className="aip-select"
                  value={draft.featured}
                  onChange={(e) => setDraft((v) => ({ ...v, featured: e.target.value }))}
                >
                  {FEATURED_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <i className="fas fa-chevron-down aip-select-icon" />
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="aip-field aip-field--select">
              <label className="aip-label">Sắp xếp</label>
              <div className="aip-select-wrap">
                <select
                  className="aip-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <i className="fas fa-chevron-down aip-select-icon" />
              </div>
            </div>
          </div>

          <div className="aip-filter-actions">
            <button type="submit" className="aip-btn aip-btn--primary">
              <i className="fas fa-search" /> Tìm kiếm
            </button>
            {hasActiveFilters && (
              <button type="button" className="aip-btn aip-btn--ghost" onClick={resetFilters}>
                <i className="fas fa-times" /> Xóa bộ lọc
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── TABLE PANEL ── */}
      <section className="aip-table-panel">
        <div className="aip-table-head">
          <div>
            <h3 className="aip-table-title">Danh sách sản phẩm</h3>
            <span className="aip-table-count">{Number(pagination.totalItems || 0).toLocaleString('vi-VN')} sản phẩm</span>
          </div>
        </div>

        {loading ? (
          <div className="aip-loading"><Spinner /></div>
        ) : (
          <>
            <div className="aip-table-wrap">
              <table className="aip-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Mã SP</th>
                    <th>Sản phẩm</th>
                    <th>Chủ sở hữu</th>
                    <th>Giá thuê / ngày</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Đơn thuê</th>
                    <th className="text-end">Tranh chấp</th>
                    <th>Nổi bật</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const hasActiveRental = ACTIVE_ITEM_STATUSES.includes(item.status);
                    return (
                      <tr key={item._id} className={hasActiveRental ? 'is-rented-row' : ''}>
                        <td><span className="aip-item-code">{formatItemCode(item)}</span></td>
                        <td>
                          <div className="aip-entity">
                            <img src={getItemImage(item)} alt={item.name || 'Sản phẩm'} />
                            <div>
                              <strong>{item.name || 'Không rõ'}</strong>
                              <span>{item.category || '-'}{hasActiveRental ? ' · Đang có đơn thuê' : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{getName(item.owner, '-')}</strong>
                          <span className="aip-muted">{item.owner?.email || '-'}</span>
                        </td>
                        <td className="aip-price">{formatCurrency(item.pricePerDay)}</td>
                        <td>
                          <span className={`aip-pill aip-pill--${item.status}`}>
                            {itemStatusLabels[item.status] || item.status || '-'}
                          </span>
                        </td>
                        <td className="text-end aip-number">{item.rentalCount || 0}</td>
                        <td className="text-end">
                          <span className={item.disputeCount > 0 ? 'aip-dispute-count' : 'aip-number'}>
                            {item.disputeCount || 0}
                          </span>
                        </td>
                        <td>
                          <span className={`aip-pill ${item.isFeatured ? 'aip-pill--featured' : 'aip-pill--muted'}`}>
                            {item.isFeatured ? '★ Nổi bật' : 'Thường'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="aip-actions">
                            <Link
                              to={`/admin/items/${item._id}`}
                              className="aip-action-btn aip-action-btn--view"
                              title="Xem chi tiết"
                            >
                              <i className="fas fa-eye" />
                            </Link>
                            <button
                              type="button"
                              className={`aip-action-btn ${item.isFeatured ? 'aip-action-btn--unfeature' : 'aip-action-btn--feature'}`}
                              disabled={actionLoading === `${item._id}-feature`}
                              onClick={() => handleFeatureUpdate(item)}
                              title={item.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                            >
                              <i className={`fas ${item.isFeatured ? 'fa-star-half-alt' : 'fa-star'}`} />
                            </button>
                            <div className="aip-select-wrap" style={{ width: '108px' }}>
                              <select
                                className="aip-select aip-select--sm"
                                value=""
                                disabled={actionLoading === `${item._id}-status` || hasActiveRental}
                                onChange={(e) => e.target.value && handleStatusUpdate(item, e.target.value)}
                                title={hasActiveRental ? 'Đang có đơn thuê' : 'Đổi trạng thái'}
                              >
                                <option value="">Đổi TT</option>
                                {['available', 'delisted'].map((status) => (
                                  <option key={status} value={status}>{itemStatusLabels[status]}</option>
                                ))}
                              </select>
                              <i className="fas fa-chevron-down aip-select-icon" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="aip-empty">
                  <i className="fas fa-box-open" />
                  <p>Không có sản phẩm phù hợp với bộ lọc.</p>
                </div>
              )}
            </div>

            <div className="aip-pagination">
              <button
                type="button"
                className="aip-page-btn"
                disabled={(pagination.currentPage || 1) <= 1}
                onClick={() => changePage((pagination.currentPage || 1) - 1)}
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
                onClick={() => changePage((pagination.currentPage || 1) + 1)}
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
