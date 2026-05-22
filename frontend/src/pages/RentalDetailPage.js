import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import HandoverModal from '../components/Rentals/HandoverModal';
import RentalChatPanel from '../components/Rentals/RentalChatPanel';
import SignatureModal from '../components/Rentals/SignatureModal';
import ContractModal from '../components/Rentals/ContractModal';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { formatRentalCode } from '../utils/itemCode';
import UserTrustSummary from '../components/Trust/TrustBadge';
import {
  disputeStatusConfig,
  penaltyLabels,
  paymentLabels,
  statusConfig,
  winnerMessages,
} from '../constants/rentalUi';
import '../styles/MyRentalsPage.css';
import '../styles/RentalDetailPage.css';

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getName = (value, fallback = 'Người dùng liên quan') => (
  value?.fullName || value?.name || value?.email || getId(value) || fallback
);

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateRange = (startDate, endDate) => `${formatDate(startDate)} - ${formatDate(endDate)}`;

const getDisputeFromRental = (rental) => (
  rental?.dispute ||
  rental?.activeDispute ||
  rental?.latestDispute ||
  (Array.isArray(rental?.disputes) ? rental.disputes[0] : null)
);

const isCompletedWithinSevenDays = (rental) => {
  if (rental?.status !== 'completed') return false;
  const baseDate = new Date(rental.updatedAt || rental.completedAt || rental.endDate);
  if (Number.isNaN(baseDate.getTime())) return false;
  return Date.now() - baseDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
};

const hasPickupProof = (rental) => Array.isArray(rental?.pickupImages) && rental.pickupImages.length > 0;

const canCreateDispute = (rental, dispute) => {
  if (!rental || dispute?.status) return false;
  if (['pending_payment', 'pending_confirmation', 'rejected', 'cancelled', 'disputed'].includes(rental.status)) {
    return false;
  }

  return hasPickupProof(rental) || rental.status === 'in_progress' || isCompletedWithinSevenDays(rental);
};


const lifecycleStepMeta = [
  {
    key: 'payment',
    label: 'Thanh toán',
    icon: 'fas fa-credit-card',
    description: 'Người thuê thanh toán tiền thuê và tiền cọc.',
  },
  {
    key: 'confirmation',
    label: 'Chờ xác nhận',
    icon: 'fas fa-clock',
    description: 'Chủ đồ xem xét và xác nhận yêu cầu thuê.',
  },
  {
    key: 'contract',
    label: 'Ký hợp đồng',
    icon: 'fas fa-file-signature',
    description: 'Hai bên ký hợp đồng điện tử trước khi giao nhận.',
  },
  {
    key: 'handover',
    label: 'Giao/Nhận đồ',
    icon: 'fas fa-box-open',
    description: 'Xác nhận bàn giao vật phẩm kèm hình ảnh minh chứng.',
  },
  {
    key: 'using',
    label: 'Đang thuê',
    icon: 'fas fa-calendar-check',
    description: 'Vật phẩm đang trong thời gian thuê.',
  },
  {
    key: 'completed',
    label: 'Hoàn tất',
    icon: 'fas fa-check-circle',
    description: 'Đơn thuê đã hoàn tất và có thể đánh giá.',
  },
];

const hasReturnProof = (rental) => Array.isArray(rental?.returnImages) && rental.returnImages.length > 0;

const isPastRentalEndDate = (rental) => {
  if (!rental?.endDate) return false;
  const endDate = new Date(rental.endDate);
  if (Number.isNaN(endDate.getTime())) return false;
  return Date.now() > endDate.getTime();
};

const getPastEndDateHelperText = (rental) => {
  if (rental?.status === 'completed' || hasReturnProof(rental) || !hasPickupProof(rental) || !isPastRentalEndDate(rental)) {
    return '';
  }

  return 'Đơn đã qua ngày thuê, vui lòng hoàn tất/trả đồ.';
};

const getConfirmedTimelineStatus = (rental, isFullySigned) => {
  if (hasPickupProof(rental)) return 'in_progress';
  return isFullySigned ? 'confirmed_ready_for_pickup' : 'confirmed';
};

const getTimelineStatusAfterDisputeRestore = (rental, dispute, isFullySigned) => {
  if (!rental) return '';

  if (rental.status === 'completed' || dispute?.previousRentalStatus === 'completed' || hasReturnProof(rental)) {
    return 'completed';
  }

  if (
    rental.status === 'in_progress' ||
    dispute?.previousRentalStatus === 'in_progress' ||
    hasPickupProof(rental)
  ) {
    return 'in_progress';
  }

  if (rental.status === 'confirmed' || dispute?.previousRentalStatus === 'confirmed') {
    return isFullySigned ? 'confirmed_ready_for_pickup' : 'confirmed';
  }

  return rental.status || dispute?.previousRentalStatus || 'in_progress';
};

const getEffectiveTimelineStatus = (rental, dispute, isFullySigned) => {
  if (!rental) return '';

  const hasActiveDispute = ['pending', 'escalated'].includes(dispute?.status);

  if (rental.status === 'disputed' || hasActiveDispute) {
    return 'disputed_in_progress';
  }

  if (dispute?.status === 'withdrawn') {
    return getTimelineStatusAfterDisputeRestore(rental, dispute, isFullySigned);
  }

  if (dispute?.status === 'resolved') {
    if (dispute.winner === 'owner' && rental.status === 'completed') {
      return 'completed';
    }

    if (dispute.winner === 'renter') {
      return 'dispute_resolved_at_in_progress';
    }

    if (dispute.winner === 'none') {
      return getTimelineStatusAfterDisputeRestore(rental, dispute, isFullySigned);
    }

    return rental.status;
  }

  if (rental.status === 'confirmed') {
    return getConfirmedTimelineStatus(rental, isFullySigned);
  }

  return rental.status;
};

const getLifecycleIndex = (status) => {
  switch (status) {
    case 'pending_payment':
      return 0;
    case 'pending_confirmation':
      return 1;
    case 'confirmed':
      return 2;
    case 'confirmed_ready_for_pickup':
      return 3;
    case 'in_progress':
    case 'disputed_in_progress':
    case 'dispute_resolved_at_in_progress':
      return 4;
    case 'completed':
      return 5;
    case 'refunded':
      return 4;
    case 'rejected':
    case 'cancelled':
      return 1;
    default:
      return 0;
  }
};

const getLifecycleSummary = (rental, dispute) => {
  if (dispute?.status === 'resolved') {
    const helperText = getPastEndDateHelperText(rental);

    return {
      badge: 'Tranh chấp đã giải quyết',
      tone: 'resolved',
      text: [
        winnerMessages[dispute.winner] || 'Admin đã xử lý tranh chấp cho đơn thuê này.',
        helperText,
      ].filter(Boolean).join(' '),
    };
  }

  if (dispute?.status === 'withdrawn') {
    const helperText = getPastEndDateHelperText(rental);

    return {
      badge: 'Khiếu nại đã rút',
      tone: 'neutral',
      text: [
        'Người báo cáo đã rút khiếu nại. Giao dịch được khôi phục theo xử lý của hệ thống.',
        helperText,
      ].filter(Boolean).join(' '),
    };
  }

  if (rental?.status === 'disputed' || ['pending', 'escalated'].includes(dispute?.status)) {
    return {
      badge: dispute?.status === 'pending' ? 'Đang hòa giải' : 'Đang tranh chấp',
      tone: 'dispute',
      text: dispute?.status === 'escalated'
        ? 'Tranh chấp đã được chuyển cho Admin xem xét. Các thao tác giao dịch chính đang tạm khóa.'
        : 'Đơn thuê đang trong thời gian hòa giải. Các thao tác giao dịch chính đang tạm khóa.',
    };
  }

  if (rental?.status === 'completed') {
    return { badge: 'Hoàn tất', tone: 'success', text: 'Đơn thuê đã hoàn tất. Hai bên có thể đánh giá giao dịch.' };
  }

  if (getPastEndDateHelperText(rental)) {
    return {
      badge: statusConfig[rental?.status]?.label || 'Đang thuê',
      tone: 'active',
      text: getPastEndDateHelperText(rental),
    };
  }

  if (rental?.status === 'rejected') {
    return { badge: 'Yêu cầu bị từ chối', tone: 'failed', text: 'Chủ đồ đã từ chối yêu cầu thuê này.' };
  }

  if (rental?.status === 'cancelled') {
    return { badge: 'Đơn đã hủy', tone: 'failed', text: 'Đơn thuê đã kết thúc ở trạng thái hủy.' };
  }

  return {
    badge: statusConfig[rental?.status]?.label || 'Đang xử lý',
    tone: 'active',
    text: 'Theo dõi các bước chính từ thanh toán, xác nhận, ký hợp đồng đến hoàn tất đơn thuê.',
  };
};

const getRentalTimelineState = (rental, dispute, isFullySigned) => {
  const effectiveStatus = getEffectiveTimelineStatus(rental, dispute, isFullySigned);
  const activeIndex = getLifecycleIndex(effectiveStatus);
  const isTerminalStopped = ['rejected', 'cancelled', 'refunded'].includes(effectiveStatus);
  const isFullyCompleted = effectiveStatus === 'completed';
  const isDisputeActive = (
    ['pending', 'escalated'].includes(dispute?.status) ||
    (rental?.status === 'disputed' && !['resolved', 'withdrawn'].includes(dispute?.status))
  );
  const isResolvedAtInProgress = effectiveStatus === 'dispute_resolved_at_in_progress';
  const summary = getLifecycleSummary(rental, dispute);

  const steps = lifecycleStepMeta.map((step, index) => {
    let status = 'pending';

    if (isFullyCompleted) {
      status = 'completed';
    } else if (isTerminalStopped && index > activeIndex) {
      status = 'pending';
    } else if (isTerminalStopped && index === activeIndex) {
      status = 'failed';
    } else if (index < activeIndex) {
      status = 'completed';
    } else if (index === activeIndex) {
      status = isDisputeActive ? 'warning' : 'active';
      if (isResolvedAtInProgress) status = 'active';
    }

    return { ...step, status };
  });

  return { steps, summary, normalizedStatus: effectiveStatus, isDisputeActive };
};

const getErrorMessage = (error, fallback) => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  return error.response?.data?.message || fallback;
};


function RentalLifecycleTimeline({ rental, dispute, isFullySigned }) {
  const timeline = getRentalTimelineState(rental, dispute, isFullySigned);

  return (
    <section className={`rental-detail-panel lifecycle-panel lifecycle-panel-${timeline.summary.tone}`}>
      <SectionHeader eyebrow="Vòng đời đơn thuê" title="Tiến trình thuê đồ">
        <span className={`lifecycle-summary-badge is-${timeline.summary.tone}`}>{timeline.summary.badge}</span>
      </SectionHeader>

      <p className="lifecycle-summary-text">{timeline.summary.text}</p>

      <div className="rental-lifecycle-timeline" aria-label="Timeline vòng đời đơn thuê">
        {timeline.steps.map((step, index) => (
          <div key={step.key} className={`lifecycle-step is-${step.status}`}>
            <div className="lifecycle-step-connector" aria-hidden="true" />
            <div className="lifecycle-step-icon" aria-hidden="true">
              <i className={step.icon} />
            </div>
            <div className="lifecycle-step-content">
              <span>Bước {index + 1}</span>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {timeline.isDisputeActive && (
        <div className="lifecycle-dispute-callout">
          <strong>Tranh chấp đang tạm dừng quy trình thuê.</strong>
          <p>Timeline dừng tại bước phát sinh tranh chấp hoặc bước thuê gần nhất, còn các hành động chính sẽ bị khóa cho đến khi khiếu nại được rút hoặc Admin xử lý.</p>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: 'Không rõ', cls: 'status-unknown' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function DisputeStatusBadge({ status }) {
  const cfg = disputeStatusConfig[status] || { label: 'Trạng thái tranh chấp chưa rõ', cls: 'dispute-pending' };
  return <span className={`dispute-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="detail-section-header">
      <div>
        {eyebrow && <p className="section-kicker">{eyebrow}</p>}
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, highlight }) {
  return (
    <div className={`detail-info-item${highlight ? ' is-highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function RatingStars({ rating }) {
  return (
    <div className="review-readonly-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} className={`fa fa-star ${star <= Number(rating || 0) ? 'active' : ''}`} />
      ))}
    </div>
  );
}

function ImageGallery({ images, emptyText }) {
  if (!Array.isArray(images) || images.length === 0) {
    return (
      <div className="compact-empty-state">
        <span aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="evidence-grid">
      {images.map((imageUrl) => (
        <a href={imageUrl} target="_blank" rel="noreferrer" key={imageUrl}>
          <img src={imageUrl} alt="Ảnh minh chứng" />
        </a>
      ))}
    </div>
  );
}

function DisputeTimeline({ dispute }) {
  const steps = [
    { key: 'created', label: 'Tạo khiếu nại', done: true },
    { key: 'mediation', label: dispute.status === 'withdrawn' ? 'Đã rút khiếu nại' : 'Đang hòa giải', done: true },
    { key: 'escalated', label: 'Yêu cầu Admin', done: ['escalated', 'resolved'].includes(dispute.status) },
    { key: 'resolved', label: dispute.status === 'withdrawn' ? 'Kết thúc' : 'Đã giải quyết', done: ['resolved', 'withdrawn'].includes(dispute.status) },
  ];

  return (
    <div className="dispute-timeline">
      {steps.map((step) => (
        <div key={step.key} className={`dispute-timeline-step${step.done ? ' done' : ''}`}>
          <span className="dispute-timeline-dot" aria-hidden="true" />
          <p>{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ title, review, fallback }) {
  if (!review) {
    return (
      <div className="compact-empty-state">
        <span aria-hidden="true" />
        <p>{fallback}</p>
      </div>
    );
  }

  return (
    <div className="review-readonly-box review-detail-card">
      <p className="review-card-title">{title}</p>
      <RatingStars rating={review.rating} />
      <p className="review-readonly-comment">{review.comment || <em>Không có nội dung đánh giá.</em>}</p>
      <p className="review-readonly-date">Gửi lúc {formatDateTime(review.createdAt)}</p>
    </div>
  );
}

function ReviewModal({ isOpen, rental, type, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment('');
      setError('');
    }
  }, [isOpen, rental?._id]);

  if (!isOpen || !rental) return null;

  const isOwner = type === 'asOwner';
  const targetRole = isOwner ? 'người thuê' : 'chủ sở hữu';
  const targetName = rental.counterparty?.fullName || targetRole;

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      const response = await apiService.createReview({
        rentalId: rental._id,
        rating: Number(rating),
        comment: comment.trim(),
      });
      await onSubmitted?.();
      Swal.fire('Đã gửi đánh giá', response.data?.message || 'Cảm ơn bạn đã đánh giá đối phương.', 'success');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-modal-backdrop" role="dialog" aria-modal="true">
      <div className="rental-modal review-modal">
        <div className="rental-modal-header">
          <div>
            <p className="rental-modal-eyebrow">Đánh giá sau thuê</p>
            <h3>Đánh giá {targetRole}</h3>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng">
            ×
          </button>
        </div>

        <div className="review-modal-summary">
          <img
            src={rental.item?.mainImage || 'https://via.placeholder.com/96'}
            alt={rental.item?.name || 'Vật phẩm thuê'}
            className="review-modal-item-img"
          />
          <div>
            <p className="review-modal-item-name">{rental.item?.name || 'Vật phẩm đã thuê'}</p>
            <p className="review-modal-counterparty">Bạn đang đánh giá <strong>{targetName}</strong></p>
            <p className="review-modal-date">{formatDateRange(rental.startDate, rental.endDate)}</p>
          </div>
        </div>

        <div className="review-blind-note">
          Đánh giá sẽ được giữ riêng tư và chỉ công khai khi cả hai bên đã đánh giá nhau, hoặc khi hết thời hạn phản hồi theo hệ thống.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="review-field">
            <label>Chọn số sao</label>
            <div className="review-star-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`review-star-btn${star <= rating ? ' active' : ''}`}
                  onClick={() => setRating(star)}
                  aria-label={`${star} sao`}
                >
                  <i className="fa fa-star" />
                </button>
              ))}
            </div>
          </div>

          <div className="review-field">
            <label htmlFor="rental-review-comment">Nội dung đánh giá</label>
            <textarea
              id="rental-review-comment"
              className="review-textarea"
              rows="4"
              placeholder={isOwner ? 'Ví dụ: Người thuê giữ đồ cẩn thận, trả đúng hẹn...' : 'Ví dụ: Chủ sở hữu hỗ trợ tốt, vật phẩm đúng mô tả...'}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          {error && <div className="review-error">{error}</div>}

          <div className="rental-modal-actions">
            <button className="btn-xs btn-ghost-xs" type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button className="btn-xs btn-primary-xs" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DisputePanel({ rental, type, currentUser, onRefresh }) {
  const dispute = getDisputeFromRental(rental);
  const [disputeAction, setDisputeAction] = useState('');
  const currentUserId = getId(currentUser);
  const reporterId = getId(dispute?.reporterId);
  const penalizeUserId = getId(dispute?.penalizeUserId);
  const isReporter = Boolean(dispute?._id && reporterId && reporterId === currentUserId);
  const isParty = type === 'asRenter' || type === 'asOwner';
  const mediationEndsAt = dispute?.mediationEndsAt ? new Date(dispute.mediationEndsAt) : null;
  const canWithdraw = isReporter && ['pending', 'escalated'].includes(dispute?.status);
  const canEscalate = Boolean(
    isParty &&
    dispute?._id &&
    dispute.status === 'pending' &&
    mediationEndsAt &&
    Date.now() >= mediationEndsAt.getTime()
  );
  const isPenalizedCurrentUser = penalizeUserId && penalizeUserId === currentUserId;

  const handleWithdraw = async () => {
    const result = await Swal.fire({
      title: 'Rút khiếu nại?',
      text: 'Đơn thuê sẽ được khôi phục theo trạng thái trước tranh chấp nếu backend có đủ dữ liệu.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Rút khiếu nại',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      setDisputeAction('withdraw');
      await apiService.withdrawDispute(dispute._id);
      await onRefresh();
      Swal.fire('Thành công!', 'Khiếu nại đã được rút.', 'success');
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Không thể rút khiếu nại.'), 'error');
    } finally {
      setDisputeAction('');
    }
  };

  const handleEscalate = async () => {
    try {
      setDisputeAction('escalate');
      const response = await apiService.escalateDispute(dispute._id);
      await onRefresh();
      Swal.fire('Thành công!', response.data?.message || 'Đã yêu cầu Admin can thiệp.', 'success');
    } catch (error) {
      Swal.fire('Lỗi!', getErrorMessage(error, 'Chưa thể yêu cầu Admin can thiệp.'), 'error');
    } finally {
      setDisputeAction('');
    }
  };

  if (!dispute) {
    if (rental.status !== 'disputed') {
      return (
        <section className="rental-detail-panel">
          <SectionHeader eyebrow="Tranh chấp" title="Chưa có tranh chấp" />
          <div className="compact-empty-state">
            <span aria-hidden="true" />
            <p>Đơn thuê hiện chưa có khiếu nại hoặc tranh chấp nào.</p>
          </div>
        </section>
      );
    }

    return (
      <section className="rental-detail-panel dispute-panel is-frozen">
        <SectionHeader eyebrow="Tranh chấp" title="Đơn thuê đang có tranh chấp" />
        <div className="dispute-freeze-box">
          <strong>Đơn thuê đang có tranh chấp.</strong>
          <p>Các thao tác giao dịch đã tạm khóa cho đến khi tranh chấp được xử lý.</p>
          <p className="dispute-muted">
            Dữ liệu hiện tại chưa có hồ sơ tranh chấp chi tiết nên giao diện chỉ hiển thị trạng thái đóng băng.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`rental-detail-panel dispute-panel dispute-panel-${dispute.status || 'pending'}`}>
      <SectionHeader eyebrow="Tranh chấp" title="Hồ sơ tranh chấp">
        <DisputeStatusBadge status={dispute.status} />
      </SectionHeader>

      <DisputeTimeline dispute={dispute} />

      {dispute.status === 'resolved' && (
        <div className="dispute-resolution-box">
          <strong>Tranh chấp đã giải quyết</strong>
          <p>{winnerMessages[dispute.winner] || 'Admin đã xử lý tranh chấp.'}</p>
        </div>
      )}

      {dispute.status === 'withdrawn' && (
        <div className="dispute-resolution-box">
          <strong>Khiếu nại đã được rút</strong>
          <p>Đơn thuê được xử lý theo kết quả khôi phục từ backend.</p>
        </div>
      )}

      <div className="detail-info-grid">
        <InfoItem label="Lý do" value={dispute.reason || '-'} />
        <InfoItem label="Trạng thái" value={disputeStatusConfig[dispute.status]?.label || 'Không rõ'} />
        <InfoItem label="Hạn hòa giải" value={formatDateTime(dispute.mediationEndsAt)} />
        <InfoItem label="Thời điểm yêu cầu Admin" value={formatDateTime(dispute.escalatedAt)} />
        {dispute.resolvedAt && <InfoItem label="Thời điểm giải quyết" value={formatDateTime(dispute.resolvedAt)} />}
        {dispute.adminDecision && <InfoItem label="Phán quyết Admin" value={dispute.adminDecision} highlight />}
      </div>

      {dispute.status === 'resolved' && dispute.penaltyType && dispute.penaltyType !== 'none' && (
        <div className={`penalty-box${isPenalizedCurrentUser ? ' is-current-user' : ''}`}>
          <strong>{isPenalizedCurrentUser ? 'Bạn đã bị áp dụng chế tài cho tranh chấp này.' : 'Thông tin chế tài'}</strong>
          <p>Người bị xử lý: {getName(dispute.penalizeUserId)}</p>
          <p>Hình thức xử lý: {penaltyLabels[dispute.penaltyType] || dispute.penaltyType}</p>
        </div>
      )}

      <div className="detail-subsection">
        <h4>Bằng chứng tranh chấp</h4>
        <ImageGallery images={dispute.evidenceImages} emptyText="Chưa có hình ảnh bằng chứng được gửi kèm." />
      </div>

      <div className="rental-card-actions dispute-actions">
        {canWithdraw && (
          <button className="btn-xs btn-ghost-xs" onClick={handleWithdraw} disabled={Boolean(disputeAction)}>
            {disputeAction === 'withdraw' ? 'Đang rút khiếu nại...' : 'Rút khiếu nại'}
          </button>
        )}

        {dispute.status === 'pending' && mediationEndsAt && !canEscalate && (
          <span className="contract-state contract-state-waiting">
            Có thể yêu cầu Admin can thiệp sau {formatDateTime(dispute.mediationEndsAt)}
          </span>
        )}

        {canEscalate && (
          <button className="btn-xs btn-primary-xs" onClick={handleEscalate} disabled={Boolean(disputeAction)}>
            {disputeAction === 'escalate' ? 'Đang gửi yêu cầu...' : 'Yêu cầu Admin can thiệp'}
          </button>
        )}
      </div>
    </section>
  );
}

function RentalDetailPage() {
  const { rentalId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rental, setRental] = useState(null);
  const [type, setType] = useState(location.state?.type || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [signatureRental, setSignatureRental] = useState(null);
  const [handoverState, setHandoverState] = useState({ type: null, rental: null });
  const [reviewRental, setReviewRental] = useState(null);
  const [isViewContractOpen, setIsViewContractOpen] = useState(false);

  const loadRental = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyRentals();
      const allRentals = [
        ...(response.data.asRenter || []).map((item) => ({ ...item, __type: 'asRenter' })),
        ...(response.data.asOwner || []).map((item) => ({ ...item, __type: 'asOwner' })),
      ];
      const found = allRentals.find((item) => item._id === rentalId);

      if (!found) {
        setRental(null);
        setError('Không tìm thấy đơn thuê hoặc bạn không có quyền xem.');
        return;
      }

      let nextRental = found;
      if ((!found.contract || !found.contract.ownerInfo) && (found.contractId || ['confirmed', 'in_progress', 'disputed', 'completed'].includes(found.status))) {
        try {
          const contractResponse = await apiService.getRentalContract(found._id);
          nextRental = {
            ...found,
            contract: contractResponse.data,
            isFullySigned: Boolean(contractResponse.data?.isFullySigned),
          };
        } catch (err) {
          nextRental = {
            ...found,
            isFullySigned: Boolean(found.isFullySigned || found.contract?.isFullySigned),
          };
        }
      }

      setRental(nextRental);
      setType(found.__type);
      setError('');
    } catch (err) {
      setError('Không thể tải chi tiết đơn thuê.');
    } finally {
      setLoading(false);
    }
  }, [rentalId]);

  useEffect(() => {
    loadRental();
  }, [loadRental]);

  const dispute = useMemo(() => getDisputeFromRental(rental), [rental]);
  const isOwnerView = type === 'asOwner';
  const isDisputed = rental?.status === 'disputed';
  const isFullySigned = Boolean(
    rental?.isFullySigned ||
    rental?.contract?.isFullySigned ||
    (rental?.contract?.ownerSignedAt && rental?.contract?.renterSignedAt)
  );
  const hasCurrentUserSigned = isOwnerView
    ? Boolean(rental?.contract?.ownerSignedAt)
    : Boolean(rental?.contract?.renterSignedAt);
  const canSignContract = !isDisputed && rental?.status === 'confirmed' && !isFullySigned && !hasCurrentUserSigned;
  const isWaitingForOtherSignature = !isDisputed && rental?.status === 'confirmed' && !isFullySigned && hasCurrentUserSigned;
  const canPickup = !isDisputed && rental?.status === 'confirmed' && isFullySigned;
  const needsSignatureBeforePickup = !isDisputed && rental?.status === 'confirmed' && !isFullySigned;
  const canReturn = !isDisputed && rental?.status === 'in_progress';
  const showCreateDispute = canCreateDispute(rental, dispute);
  const canReview = rental?.status === 'completed' && !rental?.review?.hasMyReview;
  const hasBothReviews = Boolean(rental?.review?.hasMyReview && rental?.review?.hasCounterpartyReview);
  const canPayEscrow = !isDisputed && !isOwnerView && rental?.status === 'pending_payment';
  const canOwnerConfirmReject = !isDisputed && isOwnerView && rental?.status === 'pending_confirmation';
  const canCancelRental = !isDisputed
    && !hasPickupProof(rental)
    && (
      (!isOwnerView && ['pending_payment', 'pending_confirmation', 'confirmed'].includes(rental?.status))
      || (isOwnerView && rental?.status === 'confirmed')
    );
  const showContractReadyState = isFullySigned && rental?.status === 'confirmed';
  const showReviewState = rental?.status === 'completed' && rental?.review?.hasMyReview;
  const showExistingDisputeState = !showCreateDispute && !isDisputed && Boolean(dispute?.status);
  const hasVisibleAction = Boolean(
    canPayEscrow ||
    canOwnerConfirmReject ||
    canSignContract ||
    isWaitingForOtherSignature ||
    showContractReadyState ||
    needsSignatureBeforePickup ||
    canPickup ||
    canReturn ||
    canReview ||
    showReviewState ||
    canCancelRental ||
    showCreateDispute ||
    showExistingDisputeState
  );
  const itemImage = rental?.item?.mainImage || 'https://via.placeholder.com/900x600';
  const counterparty = isOwnerView
    ? (rental?.renter || rental?.counterparty)
    : (rental?.owner || rental?.counterparty);

  const handleOwnerAction = async (action) => {
    try {
      setActionLoading(action);
      if (action === 'confirm') await apiService.confirmRental(rental._id);
      if (action === 'reject') await apiService.rejectRental(rental._id);
      await loadRental();
      Swal.fire('Thành công!', action === 'confirm' ? 'Đã chấp nhận đơn thuê.' : 'Đã từ chối đơn thuê.', 'success');
    } catch (err) {
      Swal.fire('Lỗi!', getErrorMessage(err, 'Thao tác thất bại.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handlePayEscrow = async () => {
    try {
      setActionLoading('pay');
      const response = await apiService.createVNPayUrl(rental._id);
      window.location.href = response.data.paymentUrl;
    } catch (err) {
      setActionLoading('');
      Swal.fire('Lỗi thanh toán', getErrorMessage(err, 'Không thể tạo liên kết thanh toán VNPay.'), 'error');
    }
  };

  const handleCancelRental = async () => {
    const willRefund = rental?.paymentStatus === 'escrowed';
    const { value: reason } = await Swal.fire({
      title: 'Hủy đơn thuê?',
      input: 'textarea',
      inputPlaceholder: 'Nhập lý do hủy đơn (tùy chọn)',
      text: willRefund
        ? 'Đơn đã ký quỹ sẽ được đánh dấu hoàn tiền sau khi hủy.'
        : 'Đơn sẽ được hủy và không thể tiếp tục xử lý.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Hủy đơn',
      cancelButtonText: 'Quay lại',
    });

    if (reason === undefined) return;

    try {
      setActionLoading('cancel');
      const response = await apiService.cancelRental(rental._id, reason);
      await loadRental();
      Swal.fire('Đã hủy đơn', response.data?.message || 'Đơn thuê đã được hủy.', 'success');
    } catch (err) {
      Swal.fire('Lỗi!', getErrorMessage(err, 'Không thể hủy đơn thuê.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleCreateDispute = async () => {
    const { value: formData } = await Swal.fire({
      title: 'Báo cáo sự cố',
      html: `
        <p style="color:#6b7280;margin-bottom:12px">Mô tả rõ sự cố. Đơn thuê sẽ bị đóng băng trong thời gian xử lý tranh chấp.</p>
        <textarea id="dispute-reason" class="swal2-textarea" style="height:120px;resize:vertical;" placeholder="Ví dụ: hàng không đúng mô tả, bị hư hỏng, một bên không phản hồi..."></textarea>
        <input id="dispute-evidence" class="swal2-input" placeholder="URL hình ảnh bằng chứng, phân tách bằng dấu phẩy (tùy chọn)" />
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      confirmButtonText: 'Gửi báo cáo',
      cancelButtonText: 'Hủy',
      preConfirm: () => {
        const reason = document.getElementById('dispute-reason').value.trim();
        const evidenceText = document.getElementById('dispute-evidence').value.trim();
        if (!reason) {
          Swal.showValidationMessage('Vui lòng mô tả sự cố trước khi gửi');
          return false;
        }
        return {
          reason,
          evidenceImages: evidenceText ? evidenceText.split(',').map((url) => url.trim()).filter(Boolean) : [],
        };
      },
    });

    if (!formData) return;

    try {
      setActionLoading('dispute');
      await apiService.createDispute(rental._id, formData.reason, formData.evidenceImages);
      await loadRental();
      Swal.fire('Đã gửi báo cáo!', 'Đơn thuê đã chuyển sang trạng thái tranh chấp.', 'success');
    } catch (err) {
      Swal.fire('Lỗi!', getErrorMessage(err, 'Không thể gửi báo cáo.'), 'error');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="myrp-body">
        <div className="myrp-loading"><div className="myrp-spinner" /><p>Đang tải chi tiết...</p></div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="myrp-body">
        <div className="myrp-container">
          <div className="myrp-error">{error || 'Không tìm thấy đơn thuê.'}</div>
          <button className="btn-xs btn-ghost-xs" onClick={() => navigate('/my-rentals')}>Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="myrp rental-detail-page">
      <div className="myrp-header rental-detail-header">
        <p className="myrp-header-kicker">Chi tiết giao dịch</p>
        <h1>{rental.item?.name || 'Chi tiết đơn thuê'}</h1>
        <div className="myrp-header-breadcrumb">
          <Link to="/my-rentals">Đơn thuê của tôi</Link>
          <span>/</span>
          <span>{rental.item?.name || formatRentalCode(rental)}</span>
        </div>
      </div>

      <div className="myrp-body">
        <div className="myrp-container rental-detail-layout">
          <main className="rental-detail-main">
            <section className="rental-hero-section">
              <div className="rental-hero-media">
                <img src={itemImage} alt={rental.item?.name || 'Vật phẩm thuê'} />
              </div>
              <div className="rental-hero-content">
                <div className="rental-hero-status">
                  <StatusBadge status={rental.status} />
                  {dispute?.status && <DisputeStatusBadge status={dispute.status} />}
                </div>
                <p className="rental-hero-kicker">{isOwnerView ? 'Bạn là chủ đồ' : 'Bạn là người thuê'}</p>
                <h3>{rental.item?.name || 'Vật phẩm đã thuê'}</h3>
                <p className="rental-hero-date">{formatRentalCode(rental)} · {formatDateRange(rental.startDate, rental.endDate)}</p>
                <div className="rental-hero-price">
                  <span>Tổng thanh toán</span>
                  <strong>{formatCurrency(rental.totalAmount)}</strong>
                </div>
              </div>
            </section>

            <RentalLifecycleTimeline rental={rental} dispute={dispute} isFullySigned={isFullySigned} />

            {counterparty?.fullName && (
              <section className={`rental-detail-panel counterparty-trust-panel${isOwnerView ? ' is-owner-reviewing-renter' : ''}`}>
                <SectionHeader
                  eyebrow={isOwnerView ? 'Đánh giá người thuê' : 'Đối tác giao dịch'}
                  title={isOwnerView ? 'Bạn có thể xem độ tin cậy trước khi xác nhận' : 'Thông tin uy tín của chủ sở hữu'}
                />
                <div className="counterparty-trust-card">
                  <img
                    src={counterparty.avatarUrl || 'https://via.placeholder.com/72'}
                    alt={counterparty.fullName}
                    className="counterparty-trust-avatar"
                  />
                  <div className="counterparty-trust-main">
                    <div>
                      <strong>{counterparty.fullName}</strong>
                      <span>{isOwnerView ? 'Người gửi yêu cầu thuê' : 'Chủ sở hữu vật phẩm'}</span>
                    </div>
                    <UserTrustSummary user={counterparty} />
                  </div>
                  <Link to={`/users/${counterparty._id}/profile`} className="btn-xs btn-ghost-xs">
                    Xem hồ sơ
                  </Link>
                </div>
              </section>
            )}

            <section className="rental-detail-panel">
              <SectionHeader eyebrow="Thông tin đơn thuê" title="Chi tiết thuê" />
              <div className="detail-info-grid">
                <InfoItem label="Vai trò của bạn" value={isOwnerView ? 'Chủ đồ' : 'Người thuê'} />
                <InfoItem label="Mã đơn thuê" value={formatRentalCode(rental)} />
                <InfoItem label="Đối tác" value={rental.counterparty?.fullName || 'Chưa có thông tin'} />
                <InfoItem label="Email đối tác" value={rental.counterparty?.email || 'Chưa có thông tin'} />
                <InfoItem label="Ngày bắt đầu" value={formatDate(rental.startDate)} />
                <InfoItem label="Ngày kết thúc" value={formatDate(rental.endDate)} />
                <InfoItem label="Trạng thái đơn" value={statusConfig[rental.status]?.label || 'Không rõ'} />
              </div>
              {rental.note ? (
                <div className="rental-card-note"><strong>Ghi chú:</strong> {rental.note}</div>
              ) : (
                <div className="compact-empty-state">
                  <span aria-hidden="true" />
                  <p>Đơn thuê này chưa có ghi chú từ người thuê.</p>
                </div>
              )}
            </section>

            <section className="rental-detail-panel">
              <SectionHeader eyebrow="Thanh toán" title="Chi phí và ký quỹ" />
              <div className="detail-info-grid payment-info-grid">
                <InfoItem label="Trạng thái thanh toán" value={paymentLabels[rental.paymentStatus] || 'Không rõ'} />
                <InfoItem label="Phí thuê" value={formatCurrency(rental.rentalFee)} />
                <InfoItem label="Tiền cọc" value={formatCurrency(rental.depositAmount)} />
                <InfoItem label="Tổng tiền" value={formatCurrency(rental.totalAmount)} highlight />
              </div>
            </section>

            <section className="rental-detail-panel">
              <SectionHeader eyebrow="Hợp đồng và bàn giao" title="Tiến trình giao dịch" />
              <div className="rental-process-grid">
                <div className="process-card">
                  <span className="process-step-number">1</span>
                  <h4>Hợp đồng</h4>
                  <p>
                    {isFullySigned
                      ? 'Hợp đồng đã được hai bên ký đầy đủ.'
                      : hasCurrentUserSigned
                        ? 'Bạn đã ký hợp đồng, đang chờ bên còn lại ký.'
                        : 'Hợp đồng cần được ký trước khi bàn giao.'}
                  </p>
                  {hasCurrentUserSigned && !isFullySigned && (
                    <span className="contract-state contract-state-waiting">Bạn đã ký, đang chờ bên còn lại</span>
                  )}
                  {isFullySigned && <span className="contract-state contract-state-ready">Hợp đồng đã ký đủ</span>}
                  {rental.contract && (
                    <button
                      className="btn-xs btn-primary-xs mt-2"
                      type="button"
                      onClick={() => setIsViewContractOpen(true)}
                    >
                      <i className="fas fa-file-contract"></i> Xem hợp đồng chi tiết
                    </button>
                  )}
                </div>
                <div className="process-card">
                  <span className="process-step-number">2</span>
                  <h4>Bàn giao</h4>
                  <p>Ảnh bàn giao giúp hai bên xác nhận tình trạng vật phẩm khi bắt đầu thuê.</p>
                  <ImageGallery images={rental.pickupImages} emptyText="Chưa có ảnh bàn giao trong dữ liệu hiện tại." />
                </div>
                <div className="process-card">
                  <span className="process-step-number">3</span>
                  <h4>Trả đồ</h4>
                  <p>Ảnh trả đồ được dùng để đối chiếu khi hoàn tất đơn thuê.</p>
                  <ImageGallery images={rental.returnImages} emptyText="Chưa có ảnh trả đồ trong dữ liệu hiện tại." />
                </div>
              </div>
            </section>

            <DisputePanel rental={rental} type={type} currentUser={user} onRefresh={loadRental} />

            <RentalChatPanel rental={rental} currentUser={user} />

            <section className="rental-detail-panel">
              <SectionHeader eyebrow="Đánh giá" title="Phản hồi sau thuê">
                {hasBothReviews && <span className="review-state-chip is-complete">Hai bên đã đánh giá</span>}
              </SectionHeader>

              {rental.status !== 'completed' && (
                <div className="compact-empty-state">
                  <span aria-hidden="true" />
                  <p>Đánh giá sẽ mở sau khi đơn thuê hoàn tất.</p>
                </div>
              )}

              {rental.status === 'completed' && canReview && (
                <div className="review-status-note is-waiting">
                  Bạn có thể đánh giá {isOwnerView ? 'người thuê' : 'chủ sở hữu'} cho đơn thuê này.
                </div>
              )}

              {rental.status === 'completed' && rental.review?.hasMyReview && !hasBothReviews && (
                <div className="review-status-note is-waiting">
                  Bạn đã gửi đánh giá. Hệ thống đang chờ đối phương đánh giá để công khai đầy đủ.
                </div>
              )}

              {rental.status === 'completed' && (
                <div className="review-detail-grid">
                  <ReviewCard
                    title="Đánh giá của bạn"
                    review={rental.review?.myReview}
                    fallback="Bạn chưa gửi đánh giá cho đơn thuê này."
                  />
                  {hasBothReviews ? (
                    <ReviewCard
                      title={`Đánh giá từ ${rental.counterparty?.fullName || 'đối phương'}`}
                      review={rental.review?.counterpartyReview}
                      fallback="Đối phương chưa gửi đánh giá."
                    />
                  ) : (
                    <div className="compact-empty-state">
                      <span aria-hidden="true" />
                      <p>Đánh giá của đối phương sẽ hiển thị khi cả hai bên đã đánh giá.</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </main>

          <aside className="rental-detail-sidebar">
            <section className="rental-detail-panel rental-action-panel">
              <SectionHeader eyebrow="Thao tác" title="Hành động tiếp theo" />

              {isDisputed && (
                <div className="dispute-freeze-box">
                  <strong>Đơn thuê đang có tranh chấp.</strong>
                  <p>Các thao tác giao dịch đã tạm khóa cho đến khi tranh chấp được xử lý.</p>
                </div>
              )}

              <div className="rental-card-actions detail-actions">
                {canPayEscrow && (
                  <button className="btn-xs btn-primary-xs" onClick={handlePayEscrow} disabled={Boolean(actionLoading)}>
                    {actionLoading === 'pay' ? 'Đang tạo thanh toán...' : 'Thanh toán VNPay'}
                  </button>
                )}

                {canOwnerConfirmReject && (
                  <>
                    <button className="btn-xs btn-success-xs" onClick={() => handleOwnerAction('confirm')} disabled={Boolean(actionLoading)}>
                      {actionLoading === 'confirm' ? 'Đang chấp nhận...' : 'Chấp nhận cho thuê'}
                    </button>
                    <button className="btn-xs btn-danger-xs" onClick={() => handleOwnerAction('reject')} disabled={Boolean(actionLoading)}>
                      {actionLoading === 'reject' ? 'Đang từ chối...' : 'Từ chối'}
                    </button>
                  </>
                )}

                {canSignContract && (
                  <button className="btn-xs btn-primary-xs" onClick={() => setSignatureRental(rental)} disabled={Boolean(actionLoading)}>
                    Ký hợp đồng
                  </button>
                )}

                {isWaitingForOtherSignature && (
                  <span className="contract-state contract-state-waiting">Bạn đã ký, đang chờ bên còn lại</span>
                )}

                {showContractReadyState && (
                  <span className="contract-state contract-state-ready">Hợp đồng đã ký đủ</span>
                )}

                {needsSignatureBeforePickup && (
                  <button
                    className="btn-xs btn-info-xs"
                    onClick={() => Swal.fire('Chưa thể giao đồ', 'Phải ký hợp đồng trước khi giao đồ.', 'warning')}
                    disabled={Boolean(actionLoading)}
                  >
                    Xác nhận giao đồ
                  </button>
                )}

                {canPickup && (
                  <button className="btn-xs btn-info-xs" onClick={() => setHandoverState({ type: 'pickup', rental })} disabled={Boolean(actionLoading)}>
                    Xác nhận giao đồ
                  </button>
                )}

                {canReturn && (
                  <button className="btn-xs btn-info-xs" onClick={() => setHandoverState({ type: 'return', rental })} disabled={Boolean(actionLoading)}>
                    Hoàn tất thuê / Trả đồ
                  </button>
                )}

                {canCancelRental && (
                  <button className="btn-xs btn-danger-xs" onClick={handleCancelRental} disabled={Boolean(actionLoading)}>
                    {actionLoading === 'cancel' ? 'Đang hủy...' : 'Hủy đơn thuê'}
                  </button>
                )}

                {canReview && (
                  <button className="btn-xs btn-outline-xs" onClick={() => setReviewRental(rental)} disabled={Boolean(actionLoading)}>
                    Đánh giá {isOwnerView ? 'người thuê' : 'chủ sở hữu'}
                  </button>
                )}

                {showReviewState && (
                  <span className={`review-state-chip ${hasBothReviews ? 'is-complete' : 'is-waiting'}`}>
                    {hasBothReviews ? 'Hai bên đã đánh giá' : 'Chờ đối phương đánh giá'}
                  </span>
                )}

                {showCreateDispute && (
                  <button className="btn-xs btn-warning-xs" onClick={handleCreateDispute} disabled={Boolean(actionLoading)}>
                    {actionLoading === 'dispute' ? 'Đang gửi báo cáo...' : 'Báo cáo sự cố'}
                  </button>
                )}

                {showExistingDisputeState && (
                  <span className="contract-state contract-state-waiting">Đơn này đã có tranh chấp liên quan</span>
                )}

                {!hasVisibleAction && (
                  <span className="contract-state contract-state-neutral">Không có thao tác khả dụng ở trạng thái hiện tại</span>
                )}

                {rental?.contract && (
                  <button
                    className="btn-xs btn-primary-xs w-full mt-2"
                    type="button"
                    onClick={() => setIsViewContractOpen(true)}
                  >
                    <i className="fas fa-file-contract"></i> Xem hợp đồng
                  </button>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <SignatureModal
        isOpen={Boolean(signatureRental)}
        rental={signatureRental}
        onClose={() => setSignatureRental(null)}
        onSigned={loadRental}
      />

      <HandoverModal
        isOpen={Boolean(handoverState.rental)}
        rental={handoverState.rental}
        type={handoverState.type}
        onClose={() => setHandoverState({ type: null, rental: null })}
        onSuccess={loadRental}
      />

      <ReviewModal
        isOpen={Boolean(reviewRental)}
        rental={reviewRental}
        type={type}
        onClose={() => setReviewRental(null)}
        onSubmitted={loadRental}
      />

      <ContractModal
        isOpen={isViewContractOpen}
        contract={rental?.contract}
        onClose={() => setIsViewContractOpen(false)}
      />
    </div>
  );
}

export default RentalDetailPage;

