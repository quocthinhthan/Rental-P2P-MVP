import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import {
  disputeStatusConfig,
  paymentLabels,
  statusConfig,
} from '../constants/rentalUi';
import Swal from 'sweetalert2';
import { formatRentalCode } from '../utils/itemCode';
import UserTrustSummary from '../components/Trust/TrustBadge';
import '../styles/MyRentalsPage.css';

// ─── Filter definitions ──────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all',     label: 'Tất cả',         icon: 'fas fa-layer-group',   match: null },
  { key: 'active',  label: 'Đang hoạt động', icon: 'fas fa-bolt',          match: ['pending_payment','pending_confirmation','confirmed','in_progress','disputed'] },
  { key: 'pending_payment',     label: 'Chờ thanh toán', icon: 'fas fa-credit-card',  match: ['pending_payment'] },
  { key: 'pending_confirmation',label: 'Chờ xác nhận',  icon: 'fas fa-hourglass-half',match: ['pending_confirmation'] },
  { key: 'confirmed',           label: 'Đã xác nhận',   icon: 'fas fa-file-signature',match: ['confirmed'] },
  { key: 'in_progress',         label: 'Đang thuê',     icon: 'fas fa-sync-alt',      match: ['in_progress'] },
  { key: 'disputed',            label: 'Tranh chấp',    icon: 'fas fa-gavel',         match: ['disputed'] },
  { key: 'completed',           label: 'Hoàn tất',      icon: 'fas fa-check-circle',  match: ['completed','refunded'] },
  { key: 'ended',               label: 'Đã kết thúc',   icon: 'fas fa-ban',           match: ['cancelled','rejected'] },
];

function applyStatusFilter(rentals, filterKey) {
  if (filterKey === 'all' || !filterKey) return rentals;
  const filter = STATUS_FILTERS.find((f) => f.key === filterKey);
  if (!filter || !filter.match) return rentals;
  return rentals.filter((r) => filter.match.includes(r.status));
}

function countForFilter(rentals, filter) {
  if (!filter.match) return rentals.length;
  return rentals.filter((r) => filter.match.includes(r.status)).length;
}

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const formatDateRange = (startDate, endDate) => `${formatDate(startDate)} - ${formatDate(endDate)}`;

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: 'Không rõ', cls: 'status-unknown' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function DisputeMiniBadge({ dispute, rentalStatus }) {
  if (dispute?.status) {
    const cfg = disputeStatusConfig[dispute.status] || { label: 'Trạng thái tranh chấp chưa rõ', cls: 'dispute-pending' };
    return <span className={`dispute-badge ${cfg.cls}`}>{cfg.label}</span>;
  }

  if (rentalStatus === 'disputed') {
    return <span className="dispute-badge dispute-escalated">Đang tranh chấp</span>;
  }

  return null;
}


const miniLifecycleSteps = [
  { key: 'payment', label: 'Thanh toán' },
  { key: 'confirm', label: 'Xác nhận' },
  { key: 'contract', label: 'Hợp đồng' },
  { key: 'handover', label: 'Bàn giao' },
  { key: 'done', label: 'Hoàn tất' },
];

const getMiniLifecycleIndex = (rental) => {
  switch (rental?.status) {
    case 'pending_payment': return 0;
    case 'pending_confirmation': return 1;
    case 'confirmed': return 2;
    case 'in_progress': return 3;
    case 'completed':
    case 'refunded': return 4;
    case 'rejected': return 1;
    case 'cancelled': {
      if (rental) {
        if (rental.paymentStatus === 'pending' || rental.status === 'pending_payment') {
          return 0; // Hủy ở bước thanh toán
        }
        const hasContract = rental.contractId || rental.contract;
        if (hasContract) {
          const isSigned = rental.isFullySigned || rental.contract?.isFullySigned;
          return isSigned ? 3 : 2; // Hủy ở bước bàn giao (3) hoặc hợp đồng (2)
        }
        return 1; // Hủy ở bước xác nhận
      }
      return 1;
    }
    case 'disputed': {
      const dispute = rental?.dispute || rental?.activeDispute || rental?.latestDispute;
      const previousStatus = dispute?.previousRentalStatus;
      return getMiniLifecycleIndex({ ...rental, status: previousStatus || 'confirmed' });
    }
    default: return 0;
  }
};

function RentalMiniTimeline({ rental, dispute }) {
  const activeIndex = getMiniLifecycleIndex(rental);
  const isFailed = ['rejected', 'cancelled'].includes(rental?.status);
  const isDisputed = rental?.status === 'disputed' || ['pending', 'escalated'].includes(dispute?.status);
  const isResolved = dispute?.status === 'resolved';

  return (
    <div className={`rental-mini-timeline${isDisputed ? ' is-disputed' : ''}${isResolved ? ' is-resolved' : ''}`}>
      {miniLifecycleSteps.map((step, index) => {
        let state = 'pending';
        if (rental?.status === 'completed' || rental?.status === 'refunded') state = 'done';
        else if (isFailed && index === activeIndex) state = 'failed';
        else if (index < activeIndex) state = 'done';
        else if (index === activeIndex) state = isDisputed ? 'warning' : 'active';

        return (
          <div key={step.key} className={`mini-step mini-step-${state}`} title={step.label}>
            <span className="mini-step-dot" aria-hidden="true" />
            <span className="mini-step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RentalSummaryCard({ rental, type }) {
  const isOwner = type === 'asOwner';
  const dispute = rental.dispute || rental.activeDispute || null;
  const counterparty = isOwner
    ? (rental.renter || rental.counterparty)
    : (rental.owner || rental.counterparty);

  if (!rental.item) {
    return (
      <div className="rental-card rental-card-deleted">
        <div>
          <p className="rental-card-title">Vật phẩm không còn tồn tại</p>
          <p className="rental-card-meta">Mã đơn thuê: {formatRentalCode(rental)}</p>
        </div>
        <Link className="btn-xs btn-primary-xs" to={`/my-rentals/${rental._id}`} state={{ type }}>
          Xem chi tiết
        </Link>
      </div>
    );
  }

  return (
    <article className="rental-card rental-market-card">
      <Link className="rental-card-media" to={`/my-rentals/${rental._id}`} state={{ type }}>
        <img
          src={rental.item.mainImage || 'https://via.placeholder.com/420x280'}
          alt={rental.item.name}
          className="rental-card-img"
        />
      </Link>

      <div className="rental-card-body">
        <div className="rental-card-topline">
          <div className="rental-card-heading">
            <p className="rental-card-eyebrow">{isOwner ? 'Yêu cầu từ người thuê' : 'Đơn thuê của bạn'}</p>
            <h4 className="rental-card-title">{rental.item.name}</h4>
          </div>
          <StatusBadge status={rental.status} />
        </div>

        <div className="rental-card-meta-grid">
          <div>
            <span>Mã đơn</span>
            <strong>{formatRentalCode(rental)}</strong>
          </div>
          <div>
            <span>Thời gian thuê</span>
            <strong>{formatDateRange(rental.startDate, rental.endDate)}</strong>
          </div>
          <div>
            <span>{isOwner ? 'Người thuê' : 'Chủ sở hữu'}</span>
            <strong>{counterparty?.fullName || rental.counterparty?.fullName || 'Chưa có thông tin'}</strong>
          </div>
          <div>
            <span>Tổng thanh toán</span>
            <strong className="rental-card-price">{formatCurrency(rental.totalAmount)}</strong>
          </div>
        </div>

        {counterparty?.fullName && (
          <div className={`rental-counterparty-trust${isOwner ? ' is-owner-decision' : ''}`}>
            <img
              src={counterparty.avatarUrl || 'https://via.placeholder.com/40'}
              alt={counterparty.fullName}
              className="rental-counterparty-avatar"
            />
            <div className="rental-counterparty-copy">
              <span>{isOwner ? 'Độ tin cậy người thuê' : 'Uy tín chủ sở hữu'}</span>
              <strong>{counterparty.fullName}</strong>
              <UserTrustSummary user={counterparty} compact />
            </div>
            <Link
              className="rental-counterparty-profile"
              to={`/users/${counterparty._id}/profile`}
              title="Xem hồ sơ công khai"
            >
              <i className="fas fa-arrow-right" />
            </Link>
          </div>
        )}

        <RentalMiniTimeline rental={rental} dispute={dispute} />

        <div className="rental-card-footer">
          <div className="rental-card-badges">
            <DisputeMiniBadge dispute={dispute} rentalStatus={rental.status} />
            {rental.paymentStatus && (
              <span className="payment-chip">Thanh toán: {paymentLabels[rental.paymentStatus] || 'Không rõ'}</span>
            )}
          </div>
          <Link className="btn-xs btn-primary-xs rental-detail-link" to={`/my-rentals/${rental._id}`} state={{ type }}>
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

function ItemCard({ item, onEdit, onDelete }) {
  return (
    <div className="item-card">
      <Link to={`/items/${item._id}`} className="item-card-link">
        <img
          src={item.mainImage || 'https://via.placeholder.com/300x175'}
          alt={item.name}
          className="item-card-img"
        />
      </Link>
      <div className="item-card-body">
        <Link to={`/items/${item._id}`} className="item-card-title">
          {item.name}
        </Link>
        <p className="item-card-price">
          {Number(item.pricePerDay).toLocaleString('vi-VN')}đ
          <span className="item-card-price-unit"> / ngày</span>
        </p>
        <p className="item-card-cat">{item.category}</p>
        <div className="item-card-actions">
          <button className="btn-xs btn-ghost-xs" onClick={() => onEdit(item._id)}>Sửa</button>
          <button className="btn-xs btn-danger-xs" onClick={() => onDelete(item._id)}>Xóa</button>
        </div>
      </div>
    </div>
  );
}

function RentalEmptyState({ title, description, action }) {
  return (
    <div className="empty-state rental-empty-state">
      <div className="empty-state-mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

function StatusFilterBar({ allRentals, activeFilter, onFilterChange }) {
  // Only show filters that have at least one match OR are 'all'/'active'
  const visibleFilters = STATUS_FILTERS.filter((f) => {
    if (f.key === 'all' || f.key === 'active') return true;
    return countForFilter(allRentals, f) > 0;
  });

  return (
    <div className="rental-filter-bar" role="group" aria-label="Lọc theo trạng thái">
      {visibleFilters.map((f) => {
        const count = countForFilter(allRentals, f);
        const isActive = activeFilter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            className={`rental-filter-pill${isActive ? ' active' : ''}${f.key === 'active' ? ' pill-active-group' : ''}`}
            onClick={() => onFilterChange(f.key)}
            aria-pressed={isActive}
          >
            <i className={f.icon} aria-hidden="true" />
            <span className="pill-label">{f.label}</span>
            <span className="pill-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

function RentalListSection({ title, subtitle, rentals, allRentals, type, activeFilter, onFilterChange }) {
  const filtered = useMemo(() => applyStatusFilter(rentals, activeFilter), [rentals, activeFilter]);

  return (
    <>
      <div className="rental-section-heading">
        <div>
          <p className="section-kicker">Quản lý giao dịch</p>
          <h2 className="section-title">{title}</h2>
        </div>
        <span className="section-count">{filtered.length} / {rentals.length} đơn</span>
      </div>

      <StatusFilterBar
        allRentals={allRentals || rentals}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />

      {filtered.length === 0 ? (
        <RentalEmptyState
          title={activeFilter === 'all' ? 'Chưa có đơn thuê' : 'Không có đơn nào phù hợp'}
          description={
            activeFilter !== 'all'
              ? 'Thử chọn "Tất cả" để xem toàn bộ đơn thuê.'
              : type === 'asRenter'
                ? 'Khi bạn thuê một vật phẩm, đơn sẽ xuất hiện tại đây để theo dõi tiến trình.'
                : 'Khi có người gửi yêu cầu thuê đồ, bạn sẽ thấy đơn cần xử lý trong khu vực này.'
          }
        />
      ) : (
        <div className="rental-list-grid rental-list-filtered">
          {filtered.map((rental) => (
            <RentalSummaryCard key={rental._id} rental={rental} type={type} />
          ))}
        </div>
      )}
    </>
  );
}

function MyRentalsPage() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState({ asRenter: [], asOwner: [], myItems: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('asRenter');
  const [renterFilter, setRenterFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const fetchMyRentals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyRentals();
      setRentals({
        asRenter: response.data.asRenter || [],
        asOwner: response.data.asOwner || [],
        myItems: response.data.myItems || [],
      });
      setError(null);
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRentals();
  }, [fetchMyRentals]);

  const handleDeleteItem = async (itemId) => {
    const result = await Swal.fire({
      title: 'Xóa vật phẩm?',
      text: 'Bạn có chắc chắn muốn xóa vật phẩm này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      await apiService.deleteItem(itemId);
      await fetchMyRentals();
      Swal.fire('Đã xóa!', 'Vật phẩm của bạn đã được gỡ bỏ.', 'success');
    } catch (err) {
      Swal.fire('Thất bại', err.response?.data?.message || 'Không thể xóa vật phẩm.', 'error');
    }
  };

  const tabs = [
    { key: 'asRenter', label: 'Tôi đang thuê', count: rentals.asRenter.length },
    { key: 'asOwner', label: 'Yêu cầu thuê đồ', count: rentals.asOwner.length },
    { key: 'myItems', label: 'Sản phẩm của tôi', count: rentals.myItems.length },
  ];

  return (
    <div className="myrp">
      <div className="myrp-header">
        <p className="myrp-header-kicker">Trung tâm đơn thuê</p>
        <h1>Quản lý đơn thuê</h1>
        <div className="myrp-header-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Đơn thuê của tôi</span>
        </div>
      </div>

      <div className="myrp-body">
        <div className="myrp-container">
          <div className="myrp-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`myrp-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <span>{tab.label}</span>
                <span className="myrp-tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>

          {loading && (
            <div className="myrp-loading">
              <div className="myrp-spinner" />
              <p>Đang tải dữ liệu...</p>
            </div>
          )}

          {!loading && error && <div className="myrp-error">{error}</div>}

          {!loading && !error && activeTab === 'asRenter' && (
            <RentalListSection
              title="Vật phẩm tôi đang thuê"
              subtitle="Theo dõi trạng thái thanh toán, hợp đồng, bàn giao và tranh chấp của từng đơn thuê."
              rentals={rentals.asRenter}
              allRentals={rentals.asRenter}
              type="asRenter"
              activeFilter={renterFilter}
              onFilterChange={setRenterFilter}
            />
          )}

          {!loading && !error && activeTab === 'asOwner' && (
            <RentalListSection
              title="Yêu cầu thuê đồ"
              subtitle="Xem nhanh người thuê, thời gian thuê và những đơn cần bạn xác nhận hoặc xử lý."
              rentals={rentals.asOwner}
              allRentals={rentals.asOwner}
              type="asOwner"
              activeFilter={ownerFilter}
              onFilterChange={setOwnerFilter}
            />
          )}

          {!loading && !error && activeTab === 'myItems' && (
            <>
              <h2 className="section-title">Sản phẩm tôi đã đăng</h2>
              {rentals.myItems.length === 0 ? (
                <div className="empty-state">
                  <p>Bạn chưa đăng sản phẩm nào. <Link to="/post-item">Đăng ngay!</Link></p>
                </div>
              ) : (
                <div className="items-grid">
                  {rentals.myItems.map((item) => (
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

