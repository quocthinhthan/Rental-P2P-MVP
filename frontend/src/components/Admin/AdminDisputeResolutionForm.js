import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { resolveDispute } from '../../services/api';

export const WINNER_LABELS = {
  renter: 'Người thuê thắng',
  owner: 'Chủ đồ thắng',
  none: 'Không bên nào thắng'
};

export const PENALTY_LABELS = {
  none: 'Không áp dụng',
  warning: 'Cảnh báo',
  suspension: 'Tạm khóa 7 ngày',
  ban: 'Cấm tài khoản'
};

export const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

export const getName = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.fullName || value.name || value.email || value._id || fallback;
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
};

export const getErrorMessage = (error, fallback) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  return error.response?.data?.message || fallback;
};

export default function AdminDisputeResolutionForm({
  dispute,
  onResolved,
  statusLabels,
  className = ''
}) {
  const rental = dispute.rentalId || {};
  const renter = rental.renterId || null;
  const owner = rental.ownerId || null;
  const [adminDecision, setAdminDecision] = useState('');
  const [winner, setWinner] = useState('owner');
  const [penaltyType, setPenaltyType] = useState('none');
  const [penalizeUserId, setPenalizeUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (winner === 'none') {
      setPenaltyType('none');
      setPenalizeUserId('');
    }
  }, [winner]);

  useEffect(() => {
    if (penaltyType === 'none') {
      setPenalizeUserId('');
    }
  }, [penaltyType]);

  const canResolve = ['pending', 'escalated'].includes(dispute.status);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!adminDecision.trim()) {
      Swal.fire('Thiếu thông tin', 'Vui lòng nhập quyết định của Admin.', 'warning');
      return;
    }

    if (winner === 'none' && penaltyType !== 'none') {
      Swal.fire('Sai nghiệp vụ', 'Kết quả không bên nào thắng chỉ được đi kèm chế tài không áp dụng.', 'warning');
      return;
    }

    if (penaltyType !== 'none' && !penalizeUserId) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn tài khoản bị xử lý.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Xác nhận xử lý tranh chấp?',
      text: 'Quyết định này sẽ cập nhật trạng thái đơn thuê theo kết quả xử lý.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Gửi quyết định',
      cancelButtonText: 'Hủy'
    });

    if (!confirm.isConfirmed) return;

    try {
      setSubmitting(true);
      await resolveDispute(dispute._id, {
        adminDecision: adminDecision.trim(),
        winner,
        penaltyType,
        penalizeUserId: penaltyType === 'none' ? null : penalizeUserId
      });
      Swal.fire('Thành công!', 'Tranh chấp đã được xử lý.', 'success');
      setAdminDecision('');
      setWinner('owner');
      setPenaltyType('none');
      setPenalizeUserId('');
      await onResolved?.();
    } catch (error) {
      Swal.fire('Thất bại', getErrorMessage(error, 'Không thể xử lý tranh chấp.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canResolve) {
    return (
      <div className={`admin-dispute-resolution-summary ${className}`.trim()}>
        <div className="admin-dispute-form-title">
          <span className="admin-dispute-icon">
            <i className="fas fa-check"></i>
          </span>
          <div>
            <strong>Hồ sơ đã kết thúc</strong>
            <p>Trạng thái: {statusLabels?.[dispute.status] || dispute.status}</p>
          </div>
        </div>
        <div className="admin-dispute-summary-grid">
          <div>
            <span>Quyết định</span>
            <strong>{dispute.adminDecision || 'Chưa có nội dung.'}</strong>
          </div>
          {dispute.winner && (
            <div>
              <span>Kết quả</span>
              <strong>{WINNER_LABELS[dispute.winner] || dispute.winner}</strong>
            </div>
          )}
          {dispute.penaltyType && (
            <div>
              <span>Chế tài</span>
              <strong>{PENALTY_LABELS[dispute.penaltyType] || dispute.penaltyType}</strong>
            </div>
          )}
          {dispute.penalizeUserId && (
            <div>
              <span>Người bị xử lý</span>
              <strong>{getName(dispute.penalizeUserId)}</strong>
            </div>
          )}
          {dispute.resolvedAt && (
            <div>
              <span>Thời điểm xử lý</span>
              <strong>{formatDateTime(dispute.resolvedAt)}</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`admin-dispute-resolution-form ${className}`.trim()}>
      <div className="admin-dispute-form-title">
        <span className="admin-dispute-icon">
          <i className="fas fa-gavel"></i>
        </span>
        <div>
          <strong>Ra quyết định xử lý</strong>
          <p>Ghi nhận kết luận, kết quả thắng kiện và chế tài nếu có.</p>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label admin-dispute-form-label">Quyết định Admin</label>
        <textarea
          className="form-control"
          rows="4"
          required
          value={adminDecision}
          onChange={(event) => setAdminDecision(event.target.value)}
          placeholder="Nhập lý do, căn cứ và hướng xử lý cuối cùng..."
        />
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <label className="form-label admin-dispute-form-label">Kết quả</label>
          <select className="form-select" value={winner} onChange={(event) => setWinner(event.target.value)}>
            <option value="renter">{WINNER_LABELS.renter}</option>
            <option value="owner">{WINNER_LABELS.owner}</option>
            <option value="none">{WINNER_LABELS.none}</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label admin-dispute-form-label">Chế tài</label>
          <select
            className="form-select"
            value={penaltyType}
            onChange={(event) => setPenaltyType(event.target.value)}
            disabled={winner === 'none'}
          >
            <option value="none">{PENALTY_LABELS.none}</option>
            <option value="warning">{PENALTY_LABELS.warning}</option>
            <option value="suspension">{PENALTY_LABELS.suspension}</option>
            <option value="ban">{PENALTY_LABELS.ban}</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label admin-dispute-form-label">Người bị xử lý</label>
          <select
            className="form-select"
            value={penalizeUserId}
            onChange={(event) => setPenalizeUserId(event.target.value)}
            disabled={winner === 'none' || penaltyType === 'none'}
          >
            <option value="">Không chọn</option>
            {getId(renter) && <option value={getId(renter)}>Người thuê: {getName(renter)}</option>}
            {getId(owner) && <option value={getId(owner)}>Chủ đồ: {getName(owner)}</option>}
          </select>
        </div>
      </div>

      {winner === 'none' && (
        <div className="admin-dispute-note mt-3">
          Khi chọn không bên nào thắng, hệ thống sẽ không áp dụng chế tài trong biểu mẫu này.
        </div>
      )}

      <div className="admin-dispute-form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <i className="fas fa-paper-plane me-2"></i>
          {submitting ? 'Đang gửi...' : 'Gửi quyết định'}
        </button>
      </div>
    </form>
  );
}
