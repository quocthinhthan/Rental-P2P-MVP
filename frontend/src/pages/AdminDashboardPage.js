import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getAdminDashboardCharts,
  getAdminDashboardOverview,
  getAdminTopItems,
  getAdminTopUsers
} from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminHero from '../components/Admin/AdminHero';
import { getErrorMessage, getName } from '../components/Admin/AdminDisputeResolutionForm';
import { itemStatusLabels } from '../constants/rentalUi';
import '../styles/AdminDisputesPage.css';
import '../styles/AdminDashboardPage.css';

const RANGE_OPTIONS = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '90d', label: '90 ngày' },
];

const USER_TABS = [
  { value: 'owners', label: 'Chủ đồ' },
  { value: 'renters', label: 'Người thuê' },
  { value: 'risky', label: 'Rủi ro' },
];

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');
const formatCurrency = (value) => `${formatNumber(value)}đ`;
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};
const formatFullDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getChartLabelStep = (count) => {
  if (count > 75) return 10;
  if (count > 45) return 7;
  if (count > 20) return 4;
  return 1;
};

const getTrustScoreStyle = (score) => {
  const s = Number(score || 0);
  if (s >= 50) return { background: '#dcfce7', color: '#166534' };
  if (s >= 0) return { background: '#dbeafe', color: '#1d4ed8' };
  if (s >= -10) return { background: '#fef3c7', color: '#92400e' };
  return { background: '#fee2e2', color: '#991b1b' };
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function KpiCard({ icon, label, value, tone, hint }) {
  return (
    <div className={`admin-kpi-card is-${tone || 'primary'}`}>
      <span className="admin-kpi-icon"><i className={icon} /></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

function MiniChart({ title, rows, valueKey, formatter = formatNumber, tone = 'primary', unitLabel = 'giá trị' }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const max = Math.max(...safeRows.map((row) => Number(row?.[valueKey] || 0)), 1);
  const labelStep = getChartLabelStep(safeRows.length);
  const total = safeRows.reduce((sum, row) => sum + Number(row?.[valueKey] || 0), 0);
  const average = safeRows.length ? total / safeRows.length : 0;

  return (
    <section className="admin-chart-panel">
      <div className="admin-panel-heading">
        <div>
          <h3>{title}</h3>
          <span>{safeRows.length ? `${formatNumber(safeRows.length)} ngày dữ liệu` : 'Chưa có dữ liệu'}</span>
        </div>
        <div className="admin-chart-summary">
          <strong>{formatter(total)}</strong>
          <span>TB {formatter(average)} / ngày</span>
        </div>
      </div>
      {safeRows.length === 0 ? (
        <div className="admin-compact-empty">Chưa có dữ liệu biểu đồ.</div>
      ) : (
        <div className="admin-chart-scroll" aria-label={`${title} theo ngày`}>
          <div className="admin-chart-y-axis" aria-hidden="true">
            <span>{formatter(max)}</span>
            <span>{formatter(max / 2)}</span>
            <span>0</span>
          </div>
          <div className="admin-mini-chart" style={{ '--bar-count': safeRows.length }}>
            {safeRows.map((row, index) => {
              const value = Number(row?.[valueKey] || 0);
              const showLabel = index === 0 || index === safeRows.length - 1 || index % labelStep === 0;
              const suffix = unitLabel ? ` ${unitLabel}` : '';
              return (
                <div
                  className="admin-chart-bar-wrap"
                  key={`${title}-${row.date || index}`}
                  data-tooltip={`${formatFullDate(row.date)} • ${formatter(value)}${suffix}`}
                >
                  <div
                    className={`admin-chart-bar is-${tone}`}
                    style={{ height: `${Math.max((value / max) * 100, value > 0 ? 8 : 2)}%` }}
                  />
                  <span className={showLabel ? '' : 'is-muted-label'}>{showLabel ? formatDate(row.date) : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [charts, setCharts] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [range, setRange] = useState('7d');
  const [userType, setUserType] = useState('owners');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const [overviewRes, chartsRes, itemsRes, usersRes] = await Promise.all([
          getAdminDashboardOverview(),
          getAdminDashboardCharts(range),
          getAdminTopItems(10),
          getAdminTopUsers(userType, 10),
        ]);
        setOverview(overviewRes.data || {});
        setCharts(chartsRes.data || {});
        setTopItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
        setTopUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
      } catch (error) {
        Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải dashboard admin.'), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setChartLoading(true);
        const response = await getAdminDashboardCharts(range);
        setCharts(response.data || {});
      } catch (error) {
        Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải biểu đồ.'), 'error');
      } finally {
        setChartLoading(false);
      }
    };
    if (!loading) fetchCharts();
  }, [range, loading]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAdminTopUsers(userType, 10);
        setTopUsers(Array.isArray(response.data?.users) ? response.data.users : []);
      } catch (error) {
        Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải top người dùng.'), 'error');
      }
    };
    if (!loading) fetchUsers();
  }, [userType, loading]);

  const kpis = useMemo(() => ([
    { icon: 'fas fa-users', label: 'Người dùng', value: formatNumber(overview?.users?.total), hint: `${formatNumber(overview?.users?.banned)} bị khóa`, tone: 'primary' },
    { icon: 'fas fa-box-open', label: 'Sản phẩm', value: formatNumber(overview?.items?.total), hint: `${formatNumber(overview?.items?.available)} đang cho thuê`, tone: 'info' },
    { icon: 'fas fa-receipt', label: 'Đơn thuê', value: formatNumber(overview?.rentals?.total), hint: 'Tổng đơn thuê', tone: 'success' },
    { icon: 'fas fa-coins', label: 'Doanh thu', value: formatCurrency(overview?.finance?.rentalFee), hint: 'Phí thuê', tone: 'warning' },
    { icon: 'fas fa-percent', label: 'Hoa hồng', value: formatCurrency(overview?.finance?.commissionAmount), hint: 'Phí nền tảng', tone: 'primary' },
    { icon: 'fas fa-hand-holding-usd', label: 'Đặt cọc giữ', value: formatCurrency(overview?.finance?.heldDepositAmount), hint: 'Ký quỹ đang giữ', tone: 'info' },
    { icon: 'fas fa-gavel', label: 'Tranh chấp', value: formatNumber(overview?.disputes?.total), hint: `${formatNumber(overview?.disputes?.escalated)} đã chuyển admin`, tone: 'danger' },
    { icon: 'fas fa-user-slash', label: 'Tài khoản khóa', value: formatNumber(overview?.users?.banned), hint: 'Người dùng bị hạn chế', tone: 'danger' },
  ]), [overview]);

  return (
    <main className="admin-dashboard-page admin-shell-page">
      <AdminHero
        eyebrow="Bảng điều khiển admin"
        title="Tổng quan vận hành"
        description="Theo dõi người dùng, sản phẩm, đơn thuê, doanh thu, ký quỹ và rủi ro trên RentalP2P."
      />

      {loading ? (
        <div className="admin-dispute-loading"><Spinner /></div>
      ) : (
        <>
          <section className="admin-kpi-grid">
            {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
          </section>

          <section className="admin-chart-toolbar">
            <div>
              <span className="admin-section-label">Biểu đồ</span>
              <strong>Xu hướng theo ngày</strong>
              <small>Rê chuột lên từng cột để xem ngày và giá trị cụ thể.</small>
            </div>
            <div className="admin-segmented-control">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={range === option.value ? 'is-active' : ''}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          {chartLoading ? (
            <div className="admin-dispute-loading"><Spinner /></div>
          ) : (
            <section className="admin-chart-grid">
              <MiniChart title="Đơn thuê" rows={charts?.rentalsByDay} valueKey="count" tone="primary" unitLabel="đơn" />
              <MiniChart title="Doanh thu" rows={charts?.revenueByDay} valueKey="rentalFee" formatter={formatCurrency} tone="success" />
              <MiniChart title="Người dùng mới" rows={charts?.usersByDay} valueKey="count" tone="info" unitLabel="người dùng" />
              <MiniChart title="Tranh chấp" rows={charts?.disputesByDay} valueKey="count" tone="danger" unitLabel="tranh chấp" />
            </section>
          )}

          <section className="admin-dashboard-tables">
            {/* Top items table */}
            <div className="admin-table-panel">
              <div className="admin-panel-heading">
                <div>
                  <h3>Top sản phẩm</h3>
                  <span>Xếp hạng theo số đơn thuê</span>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Sản phẩm</th>
                      <th>Trạng thái</th>
                      <th className="text-end">Đơn thuê</th>
                      <th className="text-end">Doanh thu</th>
                      <th className="text-end">Tranh chấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, index) => (
                      <tr key={item._id}>
                        <td style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem' }}>
                          {index < 3 ? RANK_MEDALS[index] : index + 1}
                        </td>
                        <td>
                          <div className="admin-table-entity">
                            <img src={item.mainImage || '/img/product-1.png'} alt={item.name || 'Sản phẩm'} />
                            <div>
                              <strong>{item.name || 'Không rõ'}</strong>
                              <span>{item.category || '-'}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className={`admin-status-pill is-${item.status}`}>{itemStatusLabels[item.status] || item.status || '-'}</span></td>
                        <td className="text-end">{formatNumber(item.rentalCount)}</td>
                        <td className="text-end">{formatCurrency(item.revenue)}</td>
                        <td className="text-end">
                          {item.disputeCount > 0
                            ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatNumber(item.disputeCount)}</span>
                            : <span style={{ color: '#94a3b8' }}>0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topItems.length === 0 && <div className="admin-compact-empty">Chưa có sản phẩm có đơn thuê.</div>}
              </div>
            </div>

            {/* Top users table */}
            <div className="admin-table-panel">
              <div className="admin-panel-heading">
                <div>
                  <h3>Top người dùng</h3>
                  <span>Thống kê theo vai trò</span>
                </div>
                <div className="admin-segmented-control is-small">
                  {USER_TABS.map((tab) => (
                    <button key={tab.value} type="button" className={userType === tab.value ? 'is-active' : ''} onClick={() => setUserType(tab.value)}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Người dùng</th>
                      <th className="text-end">Sản phẩm</th>
                      <th className="text-end">Đơn chủ</th>
                      <th className="text-end">Đơn thuê</th>
                      <th className="text-end">Tranh chấp</th>
                      <th className="text-end">Điểm tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user, index) => {
                      const trustStyle = getTrustScoreStyle(user.trustScore);
                      return (
                        <tr key={user._id}>
                          <td style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.82rem' }}>
                            {index < 3 ? RANK_MEDALS[index] : index + 1}
                          </td>
                          <td>
                            <strong>{getName(user)}</strong>
                            <span className="admin-muted-line">{user.email || '-'}</span>
                            {user.isBanned && <span className="admin-status-pill is-danger ms-2">Đã khóa</span>}
                          </td>
                          <td className="text-end">{formatNumber(user.itemCount)}</td>
                          <td className="text-end">{formatNumber(user.ownerRentalCount)}</td>
                          <td className="text-end">{formatNumber(user.renterRentalCount)}</td>
                          <td className="text-end">
                            {user.disputeCount > 0
                              ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatNumber(user.disputeCount)}</span>
                              : <span style={{ color: '#94a3b8' }}>0</span>}
                          </td>
                          <td className="text-end">
                            <span style={{
                              ...trustStyle,
                              display: 'inline-block',
                              padding: '2px 9px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}>
                              {formatNumber(user.trustScore)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {topUsers.length === 0 && <div className="admin-compact-empty">Chưa có người dùng phù hợp bộ lọc.</div>}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
