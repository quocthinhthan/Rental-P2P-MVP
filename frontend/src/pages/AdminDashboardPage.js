import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getAdminDashboardCharts,
  getAdminDashboardOverview,
  getAdminTopItems,
  getAdminTopUsers
} from '../services/api';
import Spinner from '../components/Common/Spinner';
import AdminNav from '../components/Admin/AdminNav';
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

function KpiCard({ icon, label, value, tone, hint }) {
  return (
    <div className={`admin-kpi-card is-${tone || 'primary'}`}>
      <span className="admin-kpi-icon"><i className={icon}></i></span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

function MiniChart({ title, rows, valueKey, formatter = formatNumber, tone = 'primary' }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const max = Math.max(...safeRows.map((row) => Number(row?.[valueKey] || 0)), 1);

  return (
    <section className="admin-chart-panel">
      <div className="admin-panel-heading">
        <h3>{title}</h3>
      </div>
      {safeRows.length === 0 ? (
        <div className="admin-compact-empty">Chưa có dữ liệu biểu đồ.</div>
      ) : (
        <div className="admin-mini-chart" style={{ '--bar-count': safeRows.length }}>
          {safeRows.map((row) => {
            const value = Number(row?.[valueKey] || 0);
            return (
              <div className="admin-chart-bar-wrap" key={`${title}-${row.date}`}>
                <div
                  className={`admin-chart-bar is-${tone}`}
                  style={{ height: `${Math.max((value / max) * 100, value > 0 ? 8 : 2)}%` }}
                  title={`${formatDate(row.date)}: ${formatter(value)}`}
                />
                <span>{formatDate(row.date)}</span>
              </div>
            );
          })}
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
        Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể tải top user.'), 'error');
      }
    };
    if (!loading) fetchUsers();
  }, [userType, loading]);

  const kpis = useMemo(() => ([
    { icon: 'fas fa-users', label: 'Users', value: formatNumber(overview?.users?.total), hint: `${formatNumber(overview?.users?.banned)} bị ban`, tone: 'primary' },
    { icon: 'fas fa-box-open', label: 'Items', value: formatNumber(overview?.items?.total), hint: `${formatNumber(overview?.items?.available)} available`, tone: 'info' },
    { icon: 'fas fa-receipt', label: 'Rentals', value: formatNumber(overview?.rentals?.total), hint: 'Tổng đơn thuê', tone: 'success' },
    { icon: 'fas fa-coins', label: 'Doanh thu', value: formatCurrency(overview?.finance?.rentalFee), hint: 'Rental fee', tone: 'warning' },
    { icon: 'fas fa-percent', label: 'Commission', value: formatCurrency(overview?.finance?.commissionAmount), hint: 'Phí nền tảng', tone: 'primary' },
    { icon: 'fas fa-shield-halved', label: 'Đặt cọc giữ', value: formatCurrency(overview?.finance?.heldDepositAmount), hint: 'Escrow active', tone: 'info' },
    { icon: 'fas fa-gavel', label: 'Disputes', value: formatNumber(overview?.disputes?.total), hint: `${formatNumber(overview?.disputes?.escalated)} escalated`, tone: 'danger' },
    { icon: 'fas fa-user-slash', label: 'Banned users', value: formatNumber(overview?.users?.banned), hint: 'Tài khoản bị khóa', tone: 'danger' },
  ]), [overview]);

  return (
    <main className="admin-dashboard-page admin-shell-page">
      <section className="admin-disputes-hero">
        <div className="admin-disputes-hero-copy">
          <span className="admin-disputes-eyebrow">Admin Dashboard</span>
          <h1>Tổng quan vận hành</h1>
          <p>Theo dõi người dùng, sản phẩm, đơn thuê, doanh thu, ký quỹ và rủi ro trên RentalP2P.</p>
        </div>
        <AdminNav />
      </section>

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
              <MiniChart title="Đơn thuê" rows={charts?.rentalsByDay} valueKey="count" tone="primary" />
              <MiniChart title="Doanh thu" rows={charts?.revenueByDay} valueKey="rentalFee" formatter={formatCurrency} tone="success" />
              <MiniChart title="User mới" rows={charts?.usersByDay} valueKey="count" tone="info" />
              <MiniChart title="Tranh chấp" rows={charts?.disputesByDay} valueKey="count" tone="danger" />
            </section>
          )}

          <section className="admin-dashboard-tables">
            <div className="admin-table-panel">
              <div className="admin-panel-heading">
                <h3>Top sản phẩm</h3>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Trạng thái</th>
                      <th className="text-end">Đơn thuê</th>
                      <th className="text-end">Doanh thu</th>
                      <th className="text-end">Dispute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="admin-table-entity">
                            <img src={item.mainImage || '/img/product-1.png'} alt={item.name || 'Sản phẩm'} />
                            <div><strong>{item.name || 'Không rõ'}</strong><span>{item.category || '-'}</span></div>
                          </div>
                        </td>
                        <td><span className={`admin-status-pill is-${item.status}`}>{itemStatusLabels[item.status] || item.status || '-'}</span></td>
                        <td className="text-end">{formatNumber(item.rentalCount)}</td>
                        <td className="text-end">{formatCurrency(item.revenue)}</td>
                        <td className="text-end">{formatNumber(item.disputeCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topItems.length === 0 && <div className="admin-compact-empty">Chưa có sản phẩm có đơn thuê.</div>}
              </div>
            </div>

            <div className="admin-table-panel">
              <div className="admin-panel-heading">
                <h3>Top user</h3>
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
                      <th>User</th>
                      <th className="text-end">Items</th>
                      <th className="text-end">Owner rentals</th>
                      <th className="text-end">Renter rentals</th>
                      <th className="text-end">Dispute</th>
                      <th className="text-end">Trust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <strong>{getName(user)}</strong>
                          <span className="admin-muted-line">{user.email || '-'}</span>
                          {user.isBanned && <span className="admin-status-pill is-danger ms-2">Banned</span>}
                        </td>
                        <td className="text-end">{formatNumber(user.itemCount)}</td>
                        <td className="text-end">{formatNumber(user.ownerRentalCount)}</td>
                        <td className="text-end">{formatNumber(user.renterRentalCount)}</td>
                        <td className="text-end">{formatNumber(user.disputeCount)}</td>
                        <td className="text-end">{formatNumber(user.trustScore)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topUsers.length === 0 && <div className="admin-compact-empty">Chưa có user phù hợp bộ lọc.</div>}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
