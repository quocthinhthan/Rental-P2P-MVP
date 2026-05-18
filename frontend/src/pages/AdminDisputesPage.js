import React, { useEffect, useMemo, useState } from 'react';
import { getAllDisputes, resolveDispute } from '../services/api';
import Spinner from '../components/Common/Spinner';
import Swal from 'sweetalert2';

const STATUS_OPTIONS = ['all', 'pending', 'escalated', 'resolved', 'withdrawn'];
const STATUS_LABELS = {
  all: 'Tat ca',
  pending: 'Dang hoa giai',
  escalated: 'Can Admin',
  resolved: 'Da xu ly',
  withdrawn: 'Da rut'
};

const WINNER_LABELS = {
  renter: 'Nguoi thue thang',
  owner: 'Chu do thang',
  none: 'Khong ben nao thang'
};

const PENALTY_LABELS = {
  none: 'Khong phat',
  warning: 'Canh bao',
  suspension: 'Tam khoa 7 ngay',
  ban: 'Cam tai khoan'
};

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getName = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.fullName || value.name || value.email || value._id || fallback;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
};

const getErrorMessage = (error, fallback) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'Ban khong co quyen thuc hien thao tac nay.';
  }
  return error.response?.data?.message || fallback;
};

function ResolveForm({ dispute, onResolved }) {
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
      Swal.fire('Thieu thong tin', 'Vui long nhap quyet dinh cua Admin.', 'warning');
      return;
    }

    if (winner === 'none' && penaltyType !== 'none') {
      Swal.fire('Sai nghiep vu', 'winner = none chi duoc di kem penaltyType = none.', 'warning');
      return;
    }

    if (penaltyType !== 'none' && !penalizeUserId) {
      Swal.fire('Thieu thong tin', 'Vui long chon tai khoan bi xu ly.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Xac nhan xu ly tranh chap?',
      text: 'Quyet dinh nay se cap nhat trang thai don thue theo ket qua dispute.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Gui quyet dinh',
      cancelButtonText: 'Huy'
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
      Swal.fire('Thanh cong!', 'Tranh chap da duoc xu ly.', 'success');
      setAdminDecision('');
      setWinner('owner');
      setPenaltyType('none');
      setPenalizeUserId('');
      await onResolved();
    } catch (error) {
      Swal.fire('That bai', getErrorMessage(error, 'Khong the xu ly tranh chap.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canResolve) {
    return (
      <div className="alert alert-light border mb-0">
        <div className="fw-bold mb-1">Trang thai: {STATUS_LABELS[dispute.status] || dispute.status}</div>
        <div className="small text-muted">Quyet dinh: {dispute.adminDecision || 'Chua co noi dung.'}</div>
        {dispute.winner && <div className="small text-muted">Winner: {WINNER_LABELS[dispute.winner] || dispute.winner}</div>}
        {dispute.penaltyType && <div className="small text-muted">Penalty: {PENALTY_LABELS[dispute.penaltyType] || dispute.penaltyType}</div>}
        {dispute.penalizeUserId && <div className="small text-muted">Nguoi bi xu ly: {getName(dispute.penalizeUserId)}</div>}
        {dispute.resolvedAt && <div className="small text-muted">Resolved at: {formatDateTime(dispute.resolvedAt)}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded p-3 bg-light">
      <div className="mb-2">
        <label className="form-label fw-bold">Quyet dinh Admin</label>
        <textarea
          className="form-control"
          rows="3"
          required
          value={adminDecision}
          onChange={(event) => setAdminDecision(event.target.value)}
          placeholder="Nhap ly do va huong xu ly..."
        />
      </div>

      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label fw-bold">Winner</label>
          <select className="form-select" value={winner} onChange={(event) => setWinner(event.target.value)}>
            <option value="renter">{WINNER_LABELS.renter}</option>
            <option value="owner">{WINNER_LABELS.owner}</option>
            <option value="none">{WINNER_LABELS.none}</option>
          </select>
        </div>

        <div className="col-md-4">
          <label className="form-label fw-bold">Penalty</label>
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
          <label className="form-label fw-bold">Nguoi bi xu ly</label>
          <select
            className="form-select"
            value={penalizeUserId}
            onChange={(event) => setPenalizeUserId(event.target.value)}
            disabled={winner === 'none' || penaltyType === 'none'}
          >
            <option value="">Khong chon</option>
            {getId(renter) && <option value={getId(renter)}>Nguoi thue: {getName(renter)}</option>}
            {getId(owner) && <option value={getId(owner)}>Chu do: {getName(owner)}</option>}
          </select>
        </div>
      </div>

      {winner === 'none' && (
        <div className="alert alert-warning py-2 mt-3 mb-0 small">
          Case none khong ap dung che tai; frontend da khoa penaltyType ve none.
        </div>
      )}

      <button type="submit" className="btn btn-primary mt-3" disabled={submitting}>
        {submitting ? 'Dang gui...' : 'Gui quyet dinh'}
      </button>
    </form>
  );
}

function DisputeCard({ dispute, onResolved }) {
  const rental = dispute.rentalId || {};
  const item = rental.itemId || {};
  const renter = rental.renterId || {};
  const owner = rental.ownerId || {};
  const reporter = dispute.reporterId || {};
  const penalizedUser = dispute.penalizeUserId || null;
  const evidenceImages = Array.isArray(dispute.evidenceImages) ? dispute.evidenceImages : [];

  return (
    <div className={`card shadow-sm border-0 mb-3 ${dispute.status === 'escalated' ? 'border-start border-4 border-danger' : ''}`}>
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
          <div>
            <h5 className="mb-1">{item.name || 'Vat pham khong ro'}</h5>
            <div className="text-muted small">Rental: <code>{getId(rental) || 'N/A'}</code></div>
          </div>
          <span className={`badge align-self-start ${dispute.status === 'escalated' ? 'bg-danger' : dispute.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
            {STATUS_LABELS[dispute.status] || dispute.status}
          </span>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-3"><strong>Reporter</strong><br /><span className="text-muted">{getName(reporter)}</span></div>
          <div className="col-md-3"><strong>Renter</strong><br /><span className="text-muted">{getName(renter)}</span></div>
          <div className="col-md-3"><strong>Owner</strong><br /><span className="text-muted">{getName(owner)}</span></div>
          <div className="col-md-3"><strong>Created</strong><br /><span className="text-muted">{formatDateTime(dispute.createdAt)}</span></div>
          <div className="col-md-3"><strong>Mediation ends</strong><br /><span className="text-muted">{formatDateTime(dispute.mediationEndsAt)}</span></div>
          <div className="col-md-3"><strong>Escalated at</strong><br /><span className="text-muted">{formatDateTime(dispute.escalatedAt)}</span></div>
          <div className="col-md-3"><strong>Resolved at</strong><br /><span className="text-muted">{formatDateTime(dispute.resolvedAt)}</span></div>
          <div className="col-md-3"><strong>Winner</strong><br /><span className="text-muted">{WINNER_LABELS[dispute.winner] || dispute.winner || '-'}</span></div>
          <div className="col-md-3"><strong>Penalty</strong><br /><span className="text-muted">{PENALTY_LABELS[dispute.penaltyType] || dispute.penaltyType || '-'}</span></div>
          <div className="col-md-3"><strong>Nguoi bi xu ly</strong><br /><span className="text-muted">{getName(penalizedUser, '-')}</span></div>
          <div className="col-md-3"><strong>Rental status cu</strong><br /><span className="text-muted">{dispute.previousRentalStatus || '-'}</span></div>
          <div className="col-md-3"><strong>Item status cu</strong><br /><span className="text-muted">{dispute.previousItemStatus || '-'}</span></div>
        </div>

        <div className="mb-3">
          <strong>Ly do</strong>
          <p className="mb-2 text-muted">{dispute.reason || 'Khong co noi dung.'}</p>
          {evidenceImages.length > 0 && (
            <div className="d-flex flex-wrap gap-2">
              {evidenceImages.map((imageUrl) => (
                <a key={imageUrl} href={imageUrl} target="_blank" rel="noreferrer">
                  <img src={imageUrl} alt="Evidence" className="rounded border" style={{ width: 88, height: 88, objectFit: 'cover' }} />
                </a>
              ))}
            </div>
          )}
        </div>

        <ResolveForm dispute={dispute} onResolved={onResolved} />
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async (status = statusFilter) => {
    try {
      setLoading(true);
      const data = await getAllDisputes(status);
      setDisputes(Array.isArray(data) ? data : []);
    } catch (error) {
      Swal.fire('Loi!', getErrorMessage(error, 'Khong the tai danh sach tranh chap.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const sortedDisputes = useMemo(() => {
    const priority = { escalated: 0, pending: 1, resolved: 2, withdrawn: 3 };
    return [...disputes].sort((a, b) => {
      const statusCompare = (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      if (statusCompare !== 0) return statusCompare;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [disputes]);

  return (
    <div className="container-fluid px-4 pt-5 pb-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-primary mb-1">Quan ly tranh chap</h2>
          <p className="text-muted mb-0">Uu tien cac tranh chap escalated va pending truoc.</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchDisputes()}>
          Lam moi
        </button>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : sortedDisputes.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">Chua co tranh chap nao trong bo loc nay.</div>
        </div>
      ) : (
        sortedDisputes.map((dispute) => (
          <DisputeCard key={dispute._id} dispute={dispute} onResolved={() => fetchDisputes()} />
        ))
      )}
    </div>
  );
}
