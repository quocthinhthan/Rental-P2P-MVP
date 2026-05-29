import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import AdminHero from '../components/Admin/AdminHero';
import Spinner from '../components/Common/Spinner';
import {
  getAdminUsers,
  getAdminUserDetail,
  updateAdminUserStatus,
  getAdminAuditLogs
} from '../services/api';
import '../styles/AdminUsersPage.css';

// Chế độ xem & dịch nhãn
const ROLE_LABELS = {
  admin: 'Quản trị viên',
  user: 'Thành viên'
};

const EKYC_LABELS = {
  unverified: 'Chưa liên kết',
  pending: 'Chờ duyệt',
  verified: 'Đã xác thực',
  rejected: 'Từ chối'
};

const EKYC_CLASSES = {
  unverified: 'aup-pill--unverified',
  pending: 'aup-pill--pending',
  verified: 'aup-pill--verified',
  rejected: 'aup-pill--rejected'
};

const ACTION_MAP = {
  'admin.user.update_status': 'Cập nhật trạng thái tài khoản',
  'admin.user.update_ekyc': 'Cập nhật eKYC',
  'admin.item.update_status': 'Cập nhật trạng thái sản phẩm',
  'admin.item.update_feature': 'Cập nhật tin nổi bật',
  'admin.item_report.resolve': 'Xử lý báo cáo sản phẩm',
  'admin.dispute.resolve': 'Giải quyết tranh chấp'
};

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'audit'
  
  // States cho quản lý Người dùng
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({});
  const [userLoading, setUserLoading] = useState(true);
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    ekycStatus: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1
  });

  // States cho Nhật ký hệ thống
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({});
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditFilters, setAuditFilters] = useState({
    search: '',
    action: '',
    targetType: '',
    page: 1
  });

  // State xem chi tiết hồ sơ & khóa
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [suspendDuration, setSuspendDuration] = useState('unban');
  const [suspendReason, setSuspendReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Fetch Danh sách Người dùng
  const fetchUsers = useCallback(async () => {
    try {
      setUserLoading(true);
      const response = await getAdminUsers({
        search: userFilters.search,
        role: userFilters.role,
        status: userFilters.status,
        ekycStatus: userFilters.ekycStatus,
        sortBy: userFilters.sortBy,
        sortOrder: userFilters.sortOrder,
        page: userFilters.page,
        limit: 10
      });
      setUsers(response.data?.users || []);
      setUserPagination(response.data?.pagination || {});
    } catch (error) {
      Swal.fire('Lỗi', 'Không thể tải danh sách người dùng.', 'error');
    } finally {
      setUserLoading(false);
    }
  }, [userFilters]);

  // Fetch Nhật ký hệ thống
  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const response = await getAdminAuditLogs({
        search: auditFilters.search,
        action: auditFilters.action,
        targetType: auditFilters.targetType,
        page: auditFilters.page,
        limit: 15
      });
      setAuditLogs(response.data?.auditLogs || []);
      setAuditPagination(response.data?.pagination || {});
    } catch (error) {
      Swal.fire('Lỗi', 'Không thể tải nhật ký hoạt động.', 'error');
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, fetchUsers, fetchAuditLogs]);

  // Xử lý xem chi tiết người dùng
  const handleOpenDetail = async (userId) => {
    try {
      setSelectedUserId(userId);
      setDetailLoading(true);
      setSuspendDuration('unban');
      setSuspendReason('');
      
      const response = await getAdminUserDetail(userId);
      setUserDetail(response.data);

      // Nếu đang bị khóa/đình chỉ thì pre-fill form
      const user = response.data?.user;
      if (user?.isBanned) {
        setSuspendDuration('permanent');
      } else if (user?.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        setSuspendDuration('temp');
      } else {
        setSuspendDuration('unban');
      }
    } catch (error) {
      Swal.fire('Lỗi', 'Không thể tải thông tin chi tiết người dùng.', 'error');
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cập nhật trạng thái khóa/đình chỉ
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!userDetail?.user?._id) return;
    if (suspendDuration !== 'unban' && !suspendReason.trim()) {
      Swal.fire('Thiếu thông tin', 'Vui lòng cung cấp lý do thực hiện hành động.', 'warning');
      return;
    }

    try {
      setActionSubmitting(true);
      let isBanned = false;
      let suspendedUntil = null;

      if (suspendDuration === 'permanent') {
        isBanned = true;
      } else if (suspendDuration === 'temp_3') {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        suspendedUntil = d.toISOString();
      } else if (suspendDuration === 'temp_7') {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        suspendedUntil = d.toISOString();
      } else if (suspendDuration === 'temp_30') {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        suspendedUntil = d.toISOString();
      }

      await updateAdminUserStatus(userDetail.user._id, {
        isBanned,
        suspendedUntil,
        reason: suspendReason.trim()
      });

      Swal.fire('Thành công', 'Cập nhật trạng thái tài khoản thành công.', 'success');
      
      // Reload details & user list
      await handleOpenDetail(userDetail.user._id);
      fetchUsers();
    } catch (error) {
      Swal.fire('Thất bại', error.response?.data?.message || 'Không thể cập nhật trạng thái.', 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Trả về nhãn trạng thái tài khoản
  const getUserStatusPill = (user) => {
    if (user.isBanned) {
      return <span className="aup-pill aup-pill--banned">Bị cấm</span>;
    }
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      const remainingDays = Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60 * 24));
      return (
        <span className="aup-pill aup-pill--suspended" title={`Đình chỉ tới: ${new Date(user.suspendedUntil).toLocaleDateString('vi-VN')}`}>
          Tạm khóa ({remainingDays} ngày)
        </span>
      );
    }
    return <span className="aup-pill aup-pill--active">Hoạt động</span>;
  };

  const getTrustScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  return (
    <main className="admin-dashboard-page admin-shell-page">
      <AdminHero
        eyebrow="Quản trị hệ thống"
        title="Quản lý thành viên & Nhật ký"
        description="Tra cứu tài khoản, theo dõi điểm uy tín, thực hiện các biện pháp đình chỉ tài khoản và kiểm tra nhật ký hoạt động."
      />

      {/* Tabs */}
      <section className="aup-tab-navigation">
        <button
          className={`aup-tab-btn ${activeTab === 'users' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <i className="fas fa-users-cog"></i> Quản lý người dùng
        </button>
        <button
          className={`aup-tab-btn ${activeTab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <i className="fas fa-list-check"></i> Nhật ký hoạt động
        </button>
      </section>

      {activeTab === 'users' ? (
        <>
          {/* Filters for Users */}
          <section className="aup-filter-panel">
            <div className="aup-filter-grid">
              <div className="aup-field">
                <label className="aup-label">Tìm kiếm</label>
                <div className="aup-search-wrap">
                  <input
                    type="text"
                    className="aup-input"
                    placeholder="Tìm theo tên, email, sđt..."
                    value={userFilters.search}
                    onChange={(e) => {
                      setUserFilters({ ...userFilters, search: e.target.value, page: 1 });
                    }}
                  />
                  <i className="fas fa-search aup-search-icon"></i>
                </div>
              </div>

              <div className="aup-field">
                <label className="aup-label">Vai trò</label>
                <div className="aup-select-wrap">
                  <select
                    className="aup-select"
                    value={userFilters.role}
                    onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value, page: 1 })}
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="user">Thành viên (User)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>

              <div className="aup-field">
                <label className="aup-label">Trạng thái tài khoản</label>
                <div className="aup-select-wrap">
                  <select
                    className="aup-select"
                    value={userFilters.status}
                    onChange={(e) => setUserFilters({ ...userFilters, status: e.target.value, page: 1 })}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="suspended">Tạm đình chỉ (Suspended)</option>
                    <option value="banned">Bị cấm (Banned)</option>
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>

              <div className="aup-field">
                <label className="aup-label">Xác thực eKYC</label>
                <div className="aup-select-wrap">
                  <select
                    className="aup-select"
                    value={userFilters.ekycStatus}
                    onChange={(e) => setUserFilters({ ...userFilters, ekycStatus: e.target.value, page: 1 })}
                  >
                    <option value="all">Tất cả eKYC</option>
                    <option value="unverified">Chưa liên kết</option>
                    <option value="pending">Đang chờ</option>
                    <option value="verified">Đã xác thực</option>
                    <option value="rejected">Bị từ chối</option>
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>
            </div>
            
            <div className="aup-filter-actions">
              <div className="aup-field">
                <label className="aup-label">Sắp xếp</label>
                <div className="aup-select-wrap aup-sort-select">
                  <select
                    className="aup-select"
                    value={`${userFilters.sortBy}-${userFilters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      setUserFilters({ ...userFilters, sortBy, sortOrder, page: 1 });
                    }}
                  >
                    <option value="createdAt-desc">Mới tham gia</option>
                    <option value="createdAt-asc">Tham gia lâu nhất</option>
                    <option value="trustScore-desc">Điểm uy tín cao nhất</option>
                    <option value="trustScore-asc">Điểm uy tín thấp nhất</option>
                    <option value="averageRating-desc">Đánh giá tốt nhất</option>
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>
              
              <button
                type="button"
                className="aup-btn aup-btn--ghost"
                onClick={() => {
                  setUserFilters({
                    search: '',
                    role: 'all',
                    status: 'all',
                    ekycStatus: 'all',
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
                    page: 1
                  });
                }}
              >
                <i className="fas fa-undo"></i> Đặt lại bộ lọc
              </button>
            </div>
          </section>

          {/* User List Table */}
          <section className="aup-table-panel">
            <div className="aup-table-head">
              <div>
                <h3 className="aup-table-title">Danh sách tài khoản</h3>
                <span className="aup-table-count">Tổng số: {Number(userPagination.totalItems || 0).toLocaleString('vi-VN')} người dùng</span>
              </div>
            </div>

            {userLoading ? (
              <div className="aup-loading"><Spinner /></div>
            ) : (
              <>
                <div className="aup-table-wrap">
                  <table className="aup-table">
                    <thead>
                      <tr>
                        <th>Người dùng</th>
                        <th>Vai trò</th>
                        <th>Điểm Uy Tín</th>
                        <th>Đánh giá</th>
                        <th>Xác thực eKYC</th>
                        <th>Trạng thái</th>
                        <th className="text-end">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <div className="aup-entity">
                              {user.avatarUrl ? (
                                <div className="aup-avatar-wrapper">
                                  <img
                                    src={user.avatarUrl}
                                    alt={user.fullName}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const fallback = e.target.parentNode.querySelector('.aup-avatar-fallback');
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className="aup-avatar-fallback" style={{ display: 'none' }}>
                                    <i className="fas fa-user"></i>
                                  </div>
                                </div>
                              ) : (
                                <div className="aup-avatar-wrapper">
                                  <div className="aup-avatar-fallback">
                                    <i className="fas fa-user"></i>
                                  </div>
                                </div>
                              )}
                              <div>
                                <span className="aup-entity-name">{user.fullName}</span>
                                <span className="aup-entity-sub">{user.email} · {user.phoneNumber || 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`aup-role-badge aup-role-badge--${user.role}`}>
                              {ROLE_LABELS[user.role] || user.role}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <i className={`fas fa-shield-halved ${getTrustScoreColor(user.trustScore)}`}></i>
                              <strong className={getTrustScoreColor(user.trustScore)}>{user.trustScore ?? 50}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-1">
                              <i className="fas fa-star text-warning"></i>
                              <span>{user.averageRating ? user.averageRating.toFixed(1) : '0.0'}</span>
                              <span className="text-muted text-xs">({user.totalReviews || 0})</span>
                            </div>
                          </td>
                          <td>
                            <span className={`aup-pill ${EKYC_CLASSES[user.ekycStatus] || ''}`}>
                              {user.ekycStatus === 'verified' && <i className="fas fa-circle-check me-1"></i>}
                              {EKYC_LABELS[user.ekycStatus] || user.ekycStatus}
                            </span>
                          </td>
                          <td>{getUserStatusPill(user)}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="aup-btn-action"
                              onClick={() => handleOpenDetail(user._id)}
                              title="Xem chi tiết hồ sơ & quản trị"
                            >
                              <i className="fas fa-user-gear"></i> Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center py-5 text-muted">
                            <i className="fas fa-user-slash d-block fs-3 mb-2"></i>
                            Không tìm thấy người dùng nào phù hợp bộ lọc.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {userPagination.totalPages > 1 && (
                  <div className="aup-pagination">
                    <button
                      type="button"
                      className="aup-page-btn"
                      disabled={userFilters.page <= 1}
                      onClick={() => setUserFilters({ ...userFilters, page: userFilters.page - 1 })}
                    >
                      <i className="fas fa-chevron-left"></i> Trước
                    </button>
                    <span className="aup-page-info">
                      Trang <strong>{userPagination.currentPage}</strong> / {userPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="aup-page-btn"
                      disabled={!userPagination.hasMore}
                      onClick={() => setUserFilters({ ...userFilters, page: userFilters.page + 1 })}
                    >
                      Sau <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Filters for Audit Logs */}
          <section className="aup-filter-panel">
            <div className="aup-filter-grid aup-filter-grid--audit">
              <div className="aup-field">
                <label className="aup-label">Tìm kiếm lý do / admin</label>
                <div className="aup-search-wrap">
                  <input
                    type="text"
                    className="aup-input"
                    placeholder="Tìm lý do hoặc tên admin..."
                    value={auditFilters.search}
                    onChange={(e) => {
                      setAuditFilters({ ...auditFilters, search: e.target.value, page: 1 });
                    }}
                  />
                  <i className="fas fa-search aup-search-icon"></i>
                </div>
              </div>

              <div className="aup-field">
                <label className="aup-label">Loại hành động</label>
                <div className="aup-select-wrap">
                  <select
                    className="aup-select"
                    value={auditFilters.action}
                    onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả hành động</option>
                    {Object.entries(ACTION_MAP).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>

              <div className="aup-field">
                <label className="aup-label">Đối tượng tác động</label>
                <div className="aup-select-wrap">
                  <select
                    className="aup-select"
                    value={auditFilters.targetType}
                    onChange={(e) => setAuditFilters({ ...auditFilters, targetType: e.target.value, page: 1 })}
                  >
                    <option value="">Tất cả đối tượng</option>
                    <option value="User">Thành viên (User)</option>
                    <option value="Item">Sản phẩm (Item)</option>
                    <option value="ItemReport">Báo cáo vi phạm (ItemReport)</option>
                    <option value="Dispute">Tranh chấp (Dispute)</option>
                  </select>
                  <i className="fas fa-chevron-down aup-select-icon"></i>
                </div>
              </div>
            </div>
          </section>

          {/* Audit Logs Table */}
          <section className="aup-table-panel">
            <div className="aup-table-head">
              <div>
                <h3 className="aup-table-title">Lịch sử hoạt động admin</h3>
                <span className="aup-table-count">Tổng số: {Number(auditPagination.totalItems || 0).toLocaleString('vi-VN')} sự kiện</span>
              </div>
            </div>

            {auditLoading ? (
              <div className="aup-loading"><Spinner /></div>
            ) : (
              <>
                <div className="aup-table-wrap">
                  <table className="aup-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Admin xử lý</th>
                        <th>Hành động</th>
                        <th>Đối tượng</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="text-nowrap text-muted text-xs">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <strong>{log.actorId?.fullName || 'Hệ thống'}</strong>
                            <span className="d-block text-xs text-muted">{log.actorId?.email || ''}</span>
                          </td>
                          <td>
                            <span className="aup-action-tag">
                              {ACTION_MAP[log.action] || log.action}
                            </span>
                          </td>
                          <td>
                            <strong className="text-xs text-secondary">{log.targetType}</strong>
                            <span className="d-block text-xxs text-muted">{log.targetId}</span>
                          </td>
                          <td>
                            <span className="aup-log-reason" title={log.reason}>
                              {log.reason || <span className="text-muted text-xs">Không có lý do</span>}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-5 text-muted">
                            <i className="fas fa-folder-open d-block fs-3 mb-2"></i>
                            Không có dữ liệu nhật ký hoạt động nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {auditPagination.totalPages > 1 && (
                  <div className="aup-pagination">
                    <button
                      type="button"
                      className="aup-page-btn"
                      disabled={auditFilters.page <= 1}
                      onClick={() => setAuditFilters({ ...auditFilters, page: auditFilters.page - 1 })}
                    >
                      <i className="fas fa-chevron-left"></i> Trước
                    </button>
                    <span className="aup-page-info">
                      Trang <strong>{auditPagination.currentPage}</strong> / {auditPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      className="aup-page-btn"
                      disabled={!auditPagination.hasMore}
                      onClick={() => setAuditFilters({ ...auditFilters, page: auditFilters.page + 1 })}
                    >
                      Sau <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {/* User Detail & Action Modal */}
      {selectedUserId && (
        <div className="aup-modal-backdrop" onClick={() => setSelectedUserId(null)}>
          <div className="aup-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="aup-modal-close"
              onClick={() => setSelectedUserId(null)}
              title="Đóng cửa sổ"
            >
              <i className="fas fa-times"></i>
            </button>

            {detailLoading ? (
              <div className="aup-modal-loading"><Spinner /></div>
            ) : (
              userDetail && (
                <>
                  {/* Header */}
                  <div className="aup-modal-header">
                    {userDetail.user.avatarUrl ? (
                      <div className="aup-modal-avatar-wrapper">
                        <img
                          src={userDetail.user.avatarUrl}
                          alt={userDetail.user.fullName}
                          className="aup-modal-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentNode.querySelector('.aup-modal-avatar-fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="aup-modal-avatar-fallback" style={{ display: 'none' }}>
                          <i className="fas fa-user"></i>
                        </div>
                      </div>
                    ) : (
                      <div className="aup-modal-avatar-wrapper">
                        <div className="aup-modal-avatar-fallback">
                          <i className="fas fa-user"></i>
                        </div>
                      </div>
                    )}
                    <div className="aup-modal-intro">
                      <h4>{userDetail.user.fullName}</h4>
                      <span className="aup-modal-email">{userDetail.user.email}</span>
                      <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                        <span className={`aup-role-badge aup-role-badge--${userDetail.user.role}`}>
                          {ROLE_LABELS[userDetail.user.role] || userDetail.user.role}
                        </span>
                        {getUserStatusPill(userDetail.user)}
                      </div>
                    </div>
                  </div>

                  <div className="aup-modal-body">
                    {/* Grid Stats & trust */}
                    <div className="row g-3 mb-4">
                      {/* Stats */}
                      <div className="col-md-6 col-lg-7">
                        <div className="aup-card h-100">
                          <h5 className="aup-card-title">Thống kê hoạt động kinh doanh</h5>
                          <div className="aup-stat-grid">
                            <div className="aup-stat-item">
                              <span className="aup-stat-label">Sản phẩm đăng</span>
                              <strong className="aup-stat-val">{userDetail.stats.itemCount}</strong>
                            </div>
                            <div className="aup-stat-item">
                              <span className="aup-stat-label">Đơn cho thuê (Chủ)</span>
                              <strong className="aup-stat-val">{userDetail.stats.ownerRentalCount}</strong>
                            </div>
                            <div className="aup-stat-item">
                              <span className="aup-stat-label">Đơn đi thuê (Khách)</span>
                              <strong className="aup-stat-val">{userDetail.stats.renterRentalCount}</strong>
                            </div>
                            <div className="aup-stat-item">
                              <span className="aup-stat-label">Tranh chấp liên quan</span>
                              <strong className={`aup-stat-val ${userDetail.stats.disputeCount > 0 ? 'text-danger' : ''}`}>
                                {userDetail.stats.disputeCount}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trust Meter */}
                      <div className="col-md-6 col-lg-5">
                        <div className="aup-card h-100 text-center d-flex flex-column justify-content-center">
                          <span className="text-muted text-xs mb-1">ĐIỂM UY TÍN (TRUST SCORE)</span>
                          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                            <i className={`fas fa-shield-halved fs-2 ${getTrustScoreColor(userDetail.user.trustScore)}`}></i>
                            <h2 className={`mb-0 ${getTrustScoreColor(userDetail.user.trustScore)}`}>
                              {userDetail.user.trustScore}
                            </h2>
                          </div>
                          
                          <div className="mt-1">
                            <span className="d-block text-xs text-muted mb-2">
                              Đánh giá trung bình: <strong>{userDetail.user.averageRating ? userDetail.user.averageRating.toFixed(1) : '0.0'} / 5.0</strong> ({userDetail.user.totalReviews || 0} reviews)
                            </span>
                            <span className={`aup-trust-level aup-trust-level--${userDetail.user.trustScore >= 80 ? 'high' : userDetail.user.trustScore >= 50 ? 'medium' : 'low'}`}>
                              Mức độ: {userDetail.user.trustScore >= 80 ? 'Rất uy tín' : userDetail.user.trustScore >= 50 ? 'Trung bình' : 'Nguy cơ cao'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* eKYC Reference - Read Only */}
                    <div className="aup-card mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="aup-card-title mb-0">Hồ sơ định danh eKYC (CCCD)</h5>
                        <span className={`aup-pill ${EKYC_CLASSES[userDetail.user.ekycStatus] || ''}`}>
                          {EKYC_LABELS[userDetail.user.ekycStatus]}
                        </span>
                      </div>

                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="aup-data-item">
                            <span className="aup-data-label">Số CCCD liên kết</span>
                            <strong className="aup-data-val text-secondary">{userDetail.user.idCardNumber || 'Chưa cung cấp'}</strong>
                          </div>
                          <div className="aup-data-item mt-3">
                            <span className="aup-data-label">Họ tên trên CCCD</span>
                            <strong className="aup-data-val">{userDetail.user.fullName || 'N/A'}</strong>
                          </div>
                          <div className="aup-data-item mt-3">
                            <span className="aup-data-label">Số điện thoại liên hệ</span>
                            <strong className="aup-data-val">{userDetail.user.phoneNumber || 'Chưa cung cấp'}</strong>
                          </div>
                        </div>
                        <div className="col-md-8">
                          <span className="aup-data-label mb-2 d-block">Ảnh tài liệu đối chiếu</span>
                          <div className="d-flex gap-2 flex-wrap">
                            {userDetail.user.idCardImages && userDetail.user.idCardImages.length > 0 ? (
                              userDetail.user.idCardImages.map((img, index) => (
                                <a
                                  key={index}
                                  href={img}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="aup-cccd-img-wrap"
                                  title="Nhấn để xem ảnh lớn"
                                >
                                  <img src={img} alt={`CCCD ${index + 1}`} />
                                  <span className="aup-zoom-hint"><i className="fas fa-magnifying-glass-plus"></i></span>
                                </a>
                              ))
                            ) : (
                              <div className="aup-empty-cccd text-muted text-center py-4 w-100">
                                <i className="fas fa-id-card fs-4 d-block mb-1"></i>
                                Chưa tải lên ảnh CCCD.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lock & Suspend Section */}
                    <div className="aup-card mb-4 aup-card--alert">
                      <h5 className="aup-card-title text-danger">Chế tài & Đình chỉ tài khoản</h5>
                      <form onSubmit={handleUpdateStatus}>
                        <div className="row g-3">
                          <div className="col-md-5">
                            <div className="aup-field mb-0">
                              <label className="aup-label">Thời gian đình chỉ</label>
                              <div className="aup-select-wrap">
                                <select
                                  className="aup-select"
                                  value={suspendDuration}
                                  onChange={(e) => setSuspendDuration(e.target.value)}
                                >
                                  <option value="unban">Mở khóa tài khoản (Hoạt động)</option>
                                  <option value="temp_3">Tạm khóa 3 ngày</option>
                                  <option value="temp_7">Tạm khóa 7 ngày</option>
                                  <option value="temp_30">Tạm khóa 30 ngày</option>
                                  <option value="permanent">Khóa vĩnh viễn (Cấm)</option>
                                </select>
                                <i className="fas fa-chevron-down aup-select-icon"></i>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-7">
                            <div className="aup-field mb-0">
                              <label className="aup-label">Lý do chế tài (Bắt buộc nếu khóa)</label>
                              <textarea
                                className="aup-input aup-textarea"
                                rows="1"
                                placeholder="Nhập lý do chi tiết..."
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                              ></textarea>
                            </div>
                          </div>
                        </div>

                        <div className="d-flex justify-content-end mt-3">
                          <button
                            type="submit"
                            className={`aup-btn ${suspendDuration === 'unban' ? 'aup-btn--success' : 'aup-btn--danger'}`}
                            disabled={actionSubmitting}
                          >
                            {actionSubmitting ? (
                              <span>Đang cập nhật...</span>
                            ) : (
                              <>
                                <i className={suspendDuration === 'unban' ? 'fas fa-unlock' : 'fas fa-gavel'}></i>{' '}
                                {suspendDuration === 'unban' ? 'Mở khóa tài khoản' : 'Áp dụng kỷ luật'}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Personal Audit History */}
                    <div className="aup-card">
                      <h5 className="aup-card-title">Nhật ký thay đổi tài khoản này</h5>
                      <div className="aup-mini-table-wrap">
                        <table className="aup-mini-table">
                          <thead>
                            <tr>
                              <th>Thời gian</th>
                              <th>Người thực hiện</th>
                              <th>Hành động</th>
                              <th>Lý do</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.auditLogs && userDetail.auditLogs.length > 0 ? (
                              userDetail.auditLogs.map((log) => (
                                <tr key={log._id}>
                                  <td className="text-nowrap text-muted text-xs">
                                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                                  </td>
                                  <td>
                                    <strong>{log.actorId?.fullName || 'Hệ thống'}</strong>
                                    <span className="d-block text-xxs text-muted">{log.actorId?.email}</span>
                                  </td>
                                  <td>
                                    <span className="aup-action-tag text-xs">
                                      {ACTION_MAP[log.action] || log.action}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="aup-mini-log-reason" title={log.reason}>
                                      {log.reason || '-'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="4" className="text-center text-muted py-3 text-xs">
                                  Chưa ghi nhận sự kiện hệ thống nào đối với tài khoản này.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </main>
  );
}
