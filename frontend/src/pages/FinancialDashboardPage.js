// frontend/src/pages/FinancialDashboardPage.js
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiService from '../services/api';
import Spinner from '../components/Common/Spinner';
import '../styles/FinancialDashboardPage.css';

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatCurrency = (value) => `${formatNumber(value)}đ`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const statusLabels = {
  pending_payment: 'Chờ thanh toán',
  pending_confirmation: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang thuê',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy',
  rejected: 'Từ chối',
  disputed: 'Tranh chấp',
};

const RANGE_OPTIONS = [
  { value: '7d', label: '1 tuần' },
  { value: '30d', label: '1 tháng' },
  { value: '90d', label: '3 tháng' },
  { value: '1y', label: '1 năm' },
  { value: 'all', label: 'Tất cả' },
];

// Hàm làm tròn giá trị Max trên trục Y cho đẹp (Milestones chuẩn như 10k, 50k, 100k, 1M,...)
const getNiceMaxAmount = (amount) => {
  if (amount <= 0) return 100000;
  
  // Tìm bậc độ lớn (magnitude)
  const magnitude = Math.pow(10, Math.floor(Math.log10(amount)));
  
  // Giá trị chuẩn hóa từ 1 đến 10
  const normalized = amount / magnitude;
  
  let roundedNormalized;
  if (normalized <= 1) roundedNormalized = 1;
  else if (normalized <= 1.5) roundedNormalized = 1.5;
  else if (normalized <= 2) roundedNormalized = 2;
  else if (normalized <= 3) roundedNormalized = 3;
  else if (normalized <= 4) roundedNormalized = 4;
  else if (normalized <= 5) roundedNormalized = 5;
  else if (normalized <= 6) roundedNormalized = 6;
  else if (normalized <= 8) roundedNormalized = 8;
  else roundedNormalized = 10;
  
  const niceMax = roundedNormalized * magnitude;
  
  // Đảm bảo tối thiểu là 100.000đ để hiển thị chuyên nghiệp
  return Math.max(niceMax, 100000);
};

export default function FinancialDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('owner'); // 'owner' hoặc 'renter'
  const [range, setRange] = useState('all'); // Bộ lọc thời gian
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiService.getFinancialStats(range);
        setData(response.data);
      } catch (error) {
        console.error('Lỗi khi tải thống kê tài chính:', error);
        Swal.fire(
          'Lỗi!',
          error.response?.data?.message || 'Không thể tải thống kê tài chính.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [range]);

  const handleBarHover = (e, label, amount) => {
    const rect = e.target.getBoundingClientRect();
    const containerRect = e.target.parentElement.parentElement.getBoundingClientRect();
    
    // Tính tọa độ tooltip tương ứng với thẻ SVG chứa nó
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top;

    // Định dạng lại nhãn tháng/ngày cho đẹp
    const displayLabel = label.includes('-')
      ? `${label.split('-')[1]}/${label.split('-')[0]}`
      : label;

    setTooltip({
      show: true,
      x,
      y,
      content: `${displayLabel} • ${formatCurrency(amount)}`,
    });
  };

  const handleBarLeave = () => {
    setTooltip({ show: false, x: 0, y: 0, content: '' });
  };

  // 1. Dữ liệu Owner
  const ownerStats = useMemo(() => data?.ownerStats || {}, [data]);
  const monthlyEarnings = useMemo(() => ownerStats.monthlyEarnings || [], [ownerStats]);
  const itemEarnings = useMemo(() => ownerStats.itemEarnings || [], [ownerStats]);

  const maxOwnerAmount = useMemo(() => {
    const vals = monthlyEarnings.map(m => m.amount);
    return Math.max(...vals, 1);
  }, [monthlyEarnings]);

  // Làm tròn mốc cao nhất trục Y doanh thu cho đẹp mắt
  const niceMaxOwnerAmount = useMemo(() => getNiceMaxAmount(maxOwnerAmount), [maxOwnerAmount]);

  const totalItemEarningsSum = useMemo(() => {
    return itemEarnings.reduce((sum, item) => sum + item.earned, 0) || 1;
  }, [itemEarnings]);

  // 2. Dữ liệu Renter
  const renterStats = useMemo(() => data?.renterStats || {}, [data]);
  const monthlySpending = useMemo(() => renterStats.monthlySpending || [], [renterStats]);

  const maxRenterAmount = useMemo(() => {
    const vals = monthlySpending.map(m => m.amount);
    return Math.max(...vals, 1);
  }, [monthlySpending]);

  // Làm tròn mốc cao nhất trục Y chi tiêu cho đẹp mắt
  const niceMaxRenterAmount = useMemo(() => getNiceMaxAmount(maxRenterAmount), [maxRenterAmount]);

  const recentTransactions = useMemo(() => data?.recentTransactions || [], [data]);

  // Đọc số lượng cột biểu đồ hiện có để căn chỉnh độ rộng cột tối ưu
  const ownerBarWidthConfig = useMemo(() => {
    const barCount = monthlyEarnings.length;
    if (barCount === 0) return { barWidth: 32, spacing: 10, labelStep: 1 };
    
    const containerWidth = 415; // width từ x=65 đến x=480
    const barWidth = Math.max(Math.min(32, Math.floor((containerWidth / barCount) * 0.65)), 4);
    const spacing = (containerWidth - barWidth * barCount) / (barCount + 1);
    const labelStep = barCount > 15 ? 5 : 1;

    return { barWidth, spacing, labelStep };
  }, [monthlyEarnings]);

  const renterBarWidthConfig = useMemo(() => {
    const barCount = monthlySpending.length;
    if (barCount === 0) return { barWidth: 32, spacing: 10, labelStep: 1 };
    
    const containerWidth = 415;
    const barWidth = Math.max(Math.min(32, Math.floor((containerWidth / barCount) * 0.65)), 4);
    const spacing = (containerWidth - barWidth * barCount) / (barCount + 1);
    const labelStep = barCount > 15 ? 5 : 1;

    return { barWidth, spacing, labelStep };
  }, [monthlySpending]);

  if (loading && !data) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <main className="financial-dashboard-page py-5">
      <div className="container px-4 px-lg-5">
        
        {/* Glassmorphic Hero Header */}
        <section className="finance-hero-banner">
          <div className="finance-hero-content">
            <h2>Quản lý Tài chính & Doanh thu</h2>
            <p>
              Theo dõi và phân tích dòng tiền giao dịch của bạn trên RentalP2P ở cả hai vai trò: 
              <strong> Chủ sở hữu cho thuê đồ</strong> kiếm doanh thu và <strong>Người đi thuê đồ</strong> tiêu dùng.
            </p>
          </div>
        </section>

        {/* Tab Switching & Toolbar Filters */}
        <section className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="finance-segmented-tabs">
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === 'owner' ? 'is-active owner-theme' : ''}`}
              onClick={() => setActiveTab('owner')}
            >
              <i className="fas fa-coins text-success"></i> Doanh thu cho thuê
            </button>
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === 'renter' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('renter')}
            >
              <i className="fas fa-shopping-bag text-primary"></i> Chi tiêu thuê đồ
            </button>
          </div>

          {/* Bộ lọc thời gian (Range Filters) */}
          <div className="admin-segmented-control bg-white border rounded-pill p-1 shadow-sm d-flex">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm rounded-pill border-0 px-3 py-1 text-nowrap fw-bold transition-all fs-8 ${
                  range === opt.value
                    ? 'btn-primary text-white shadow-sm'
                    : 'text-muted bg-transparent'
                }`}
                style={{ fontSize: '0.8rem' }}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
            <Spinner />
          </div>
        ) : (
          <>
            {activeTab === 'owner' ? (
              /* TAB 1: DOANH THU CHO THUÊ (OWNER STATS) */
              <>
                {/* KPI Cards Grid */}
                <section className="finance-kpi-grid">
                  <div className="finance-kpi-card theme-emerald">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-wallet"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Thực nhận hoàn tất</span>
                      <strong>{formatCurrency(ownerStats.totalEarned)}</strong>
                      <small>Doanh thu từ đơn hoàn thành</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-amber">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-clock"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Tạm giữ ký quỹ</span>
                      <strong>{formatCurrency(ownerStats.pendingPayout)}</strong>
                      <small>Đơn đang trong tiến trình</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-rose">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-percentage"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Phí dịch vụ đã trả</span>
                      <strong>{formatCurrency(ownerStats.commissionPaid)}</strong>
                      <small>10% hoa hồng nền tảng</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-blue">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-handshake"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Giá trị trung bình đơn</span>
                      <strong>{formatCurrency(ownerStats.averageEarningsPerRental)}</strong>
                      <small>Tính trên đơn thành công</small>
                    </div>
                  </div>
                </section>

                {/* Chart + Item Breakdown Row */}
                <section className="finance-dashboard-row">
                  {/* SVG Monthly Revenue Chart */}
                  <div className="finance-panel">
                    <div className="finance-panel-header">
                      <div>
                        <h3>Biểu đồ doanh thu</h3>
                        <p>Doanh thu tích lũy được gom cụ thể theo mốc thời gian</p>
                      </div>
                      <div className="badge bg-success-light text-success fw-bold px-3 py-2 rounded-pill">
                        Doanh thu
                      </div>
                    </div>

                    <div className="svg-chart-container">
                      {tooltip.show && (
                        <div
                          className="svg-chart-tooltip"
                          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, display: 'block' }}
                        >
                          {tooltip.content}
                        </div>
                      )}

                      <svg width="100%" height="100%" viewBox="0 0 500 240" preserveAspectRatio="none">
                        {/* Gridlines */}
                        <line x1="65" y1="30" x2="480" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                        <line x1="65" y1="105" x2="480" y2="105" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                        <line x1="65" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1" />

                        {/* Y-Axis scale text (Mốc đẹp, làm tròn mượt) */}
                        <text x="60" y="34" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">{formatNumber(niceMaxOwnerAmount)}</text>
                        <text x="60" y="109" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">{formatNumber(niceMaxOwnerAmount / 2)}</text>
                        <text x="60" y="184" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">0</text>

                        {/* Bars */}
                        {monthlyEarnings.map((item, index) => {
                          const { barWidth, spacing, labelStep } = ownerBarWidthConfig;
                          const x = 65 + spacing + index * (barWidth + spacing);
                          
                          // Chiều cao cột tính toán tỉ lệ với mốc niceMax làm tròn để thanh thẳng hàng với vạch lưới
                          const barHeight = Math.max((item.amount / niceMaxOwnerAmount) * 150, item.amount > 0 ? 8 : 2);
                          const y = 180 - barHeight;

                          const displayLabel = item.label.includes('-')
                            ? `${item.label.split('-')[1]}/${item.label.split('-')[0].slice(2)}`
                            : item.label;

                          return (
                            <g key={item.label}>
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="4"
                                fill="#10b981"
                                opacity="0.85"
                                className="svg-chart-bar owner-bar"
                                onMouseMove={(e) => handleBarHover(e, item.label, item.amount)}
                                onMouseLeave={handleBarLeave}
                              />
                              {index % labelStep === 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y="202"
                                  fill="#64748b"
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="middle"
                                >
                                  {displayLabel}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Item Revenue Breakdown */}
                  <div className="finance-panel">
                    <div className="finance-panel-header">
                      <div>
                        <h3>Vật phẩm sinh lời nhất</h3>
                        <p>Tỉ lệ đóng góp doanh thu của sản phẩm trong kỳ</p>
                      </div>
                    </div>

                    <div className="item-breakdown-list">
                      {itemEarnings.length > 0 ? (
                        itemEarnings.map((item) => {
                          const percentage = Math.round((item.earned / totalItemEarningsSum) * 100);
                          return (
                            <div className="item-breakdown-row" key={item._id}>
                              <img
                                src={item.mainImage || '/img/product-1.png'}
                                alt={item.name}
                                className="item-breakdown-img"
                              />
                              <div className="item-breakdown-details">
                                <div className="item-breakdown-meta">
                                  <strong title={item.name}>{item.name}</strong>
                                  <span>{formatCurrency(item.earned)}</span>
                                </div>
                                <div className="item-progress-track">
                                  <div
                                    className="item-progress-fill bg-success"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <small className="text-muted d-block mt-1 fs-8">
                                  {item.rentalCount} lượt thuê thành công • Chiếm {percentage}% doanh thu
                                </small>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="finance-empty-state">
                          <i className="fas fa-boxes"></i>
                          <p className="mb-0">Chưa ghi nhận doanh thu từ vật phẩm nào.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              /* TAB 2: CHI TIÊU THUÊ ĐỒ (RENTER STATS) */
              <>
                {/* KPI Cards Grid */}
                <section className="finance-kpi-grid">
                  <div className="finance-kpi-card theme-blue">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Tổng chi tiêu hoàn tất</span>
                      <strong>{formatCurrency(renterStats.totalSpent)}</strong>
                      <small>Chi phí thuê từ đơn hoàn thành</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-amber">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Tiền cọc ký quỹ tạm giữ</span>
                      <strong>{formatCurrency(renterStats.pendingRefund)}</strong>
                      <small>Sẽ hoàn trả khi xong bàn giao</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-emerald">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-hourglass-half"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Tiền thuê tạm giữ</span>
                      <strong>{formatCurrency(renterStats.pendingFee)}</strong>
                      <small>Đang giữ tại ví nền tảng</small>
                    </div>
                  </div>

                  <div className="finance-kpi-card theme-rose">
                    <div className="finance-kpi-icon">
                      <i className="fas fa-receipt"></i>
                    </div>
                    <div className="finance-kpi-info">
                      <span>Đơn thuê hoàn tất</span>
                      <strong>{renterStats.completedRentalsCount} đơn</strong>
                      <small>Khớp trên tổng {renterStats.totalRentalsCount} đơn</small>
                    </div>
                  </div>
                </section>

                {/* Chart + Spent Details Row */}
                <section className="finance-dashboard-row">
                  {/* SVG Monthly Spending Chart */}
                  <div className="finance-panel">
                    <div className="finance-panel-header">
                      <div>
                        <h3>Biểu đồ chi tiêu</h3>
                        <p>Lượng tiền chi trả cho việc thuê đồ được gom cụ thể theo mốc thời gian</p>
                      </div>
                      <div className="badge bg-primary-light text-primary fw-bold px-3 py-2 rounded-pill">
                        Chi tiêu
                      </div>
                    </div>

                    <div className="svg-chart-container">
                      {tooltip.show && (
                        <div
                          className="svg-chart-tooltip"
                          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, display: 'block' }}
                        >
                          {tooltip.content}
                        </div>
                      )}

                      <svg width="100%" height="100%" viewBox="0 0 500 240" preserveAspectRatio="none">
                        {/* Gridlines */}
                        <line x1="65" y1="30" x2="480" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                        <line x1="65" y1="105" x2="480" y2="105" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
                        <line x1="65" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1" />

                        {/* Y-Axis scale text (Mốc đẹp, làm tròn mượt) */}
                        <text x="60" y="34" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">{formatNumber(niceMaxRenterAmount)}</text>
                        <text x="60" y="109" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">{formatNumber(niceMaxRenterAmount / 2)}</text>
                        <text x="60" y="184" fill="#94a3b8" fontSize="10" fontWeight="600" textAnchor="end">0</text>

                        {/* Bars */}
                        {monthlySpending.map((item, index) => {
                          const { barWidth, spacing, labelStep } = renterBarWidthConfig;
                          const x = 65 + spacing + index * (barWidth + spacing);
                          
                          const barHeight = Math.max((item.amount / niceMaxRenterAmount) * 150, item.amount > 0 ? 8 : 2);
                          const y = 180 - barHeight;

                          const displayLabel = item.label.includes('-')
                            ? `${item.label.split('-')[1]}/${item.label.split('-')[0].slice(2)}`
                            : item.label;

                          return (
                            <g key={item.label}>
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="4"
                                fill="#3b82f6"
                                opacity="0.85"
                                className="svg-chart-bar"
                                onMouseMove={(e) => handleBarHover(e, item.label, item.amount)}
                                onMouseLeave={handleBarLeave}
                              />
                              {index % labelStep === 0 && (
                                <text
                                  x={x + barWidth / 2}
                                  y="202"
                                  fill="#64748b"
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="middle"
                                >
                                  {displayLabel}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Renter tips panel */}
                  <div className="finance-panel justify-content-center text-center p-4">
                    <div className="mb-3 text-primary">
                      <i className="fas fa-piggy-bank fs-1"></i>
                    </div>
                    <h4 className="fw-bold mb-2">Lời khuyên tiết kiệm tài chính</h4>
                    <p className="text-muted fs-7 mb-4 px-3">
                      Việc thuê đồ dùng định kỳ giúp bạn tiết kiệm đến 70% ngân sách so với việc mua mới các vật phẩm ít khi sử dụng (ví dụ: máy ảnh DSLR, lều cắm trại, đồ công nghệ).
                    </p>
                    <div className="p-3 bg-light rounded-3 text-start">
                      <h6 className="fw-bold fs-7 mb-1"><i className="fas fa-lightbulb text-warning me-1"></i> Bạn có biết?</h6>
                      <small className="text-muted d-block fs-8">
                        Bạn luôn nhận lại 100% số tiền đặt cọc ký quỹ ngay sau khi bàn giao vật phẩm nguyên vẹn thành công cho chủ sở hữu. Hãy đảm bảo chụp ảnh hiện trạng kỹ càng khi nhận và trả đồ.
                      </small>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Lịch sử giao dịch tài chính (Recent Transactions) */}
            <section className="finance-panel">
              <div className="finance-panel-header mb-4">
                <div>
                  <h3>Lịch sử giao dịch tài chính</h3>
                  <p>Danh sách các đơn hàng phát sinh dòng tiền tương thích với bộ lọc thời gian</p>
                </div>
                <Link to="/my-rentals" className="btn btn-outline-secondary btn-sm px-3 rounded-pill">
                  Xem chi tiết đơn thuê
                </Link>
              </div>

              <div className="finance-table-wrapper">
                {recentTransactions.length > 0 ? (
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Vật phẩm</th>
                        <th>Vai trò</th>
                        <th>Thời gian thuê</th>
                        <th>Tiền thuê</th>
                        <th>Tiền cọc</th>
                        <th>Dòng tiền</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((tx) => {
                        const isOwner = tx.role === 'owner';
                        return (
                          <tr key={tx._id}>
                            <td>
                              <Link to={`/my-rentals/${tx._id}`} className="finance-trans-code text-decoration-none">
                                {tx.code}
                              </Link>
                            </td>
                            <td>
                              <div className="finance-trans-item">
                                <img
                                  src={tx.itemImage || '/img/product-1.png'}
                                  alt={tx.itemName}
                                />
                                <span className="text-truncate fw-bold" style={{ maxWidth: '150px' }} title={tx.itemName}>
                                  {tx.itemName}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`finance-role-badge ${isOwner ? 'is-owner' : 'is-renter'}`}>
                                {isOwner ? 'Chủ đồ' : 'Người thuê'}
                              </span>
                            </td>
                            <td className="fs-8 text-muted">
                              {formatDate(tx.startDate)} - {formatDate(tx.endDate)}
                            </td>
                            <td className="fw-semibold">{formatCurrency(tx.rentalFee)}</td>
                            <td className="text-muted">{formatCurrency(tx.depositAmount)}</td>
                            <td>
                              <span className={`finance-amount-text ${isOwner ? 'is-plus' : 'is-minus'}`}>
                                {isOwner ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </td>
                            <td>
                              <span className={`finance-status-pill ${tx.status}`}>
                                {statusLabels[tx.status] || tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="finance-empty-state">
                    <i className="fas fa-receipt"></i>
                    <p className="mb-0">Không tìm thấy giao dịch nào tương ứng bộ lọc.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

      </div>
    </main>
  );
}
