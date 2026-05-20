import React from 'react';
import './TrustBadge.css';

const TRUST_META = {
  very_high: { label: 'Rất uy tín', tone: 'very-high', icon: 'fas fa-shield-alt' },
  high: { label: 'Uy tín', tone: 'high', icon: 'fas fa-check-circle' },
  medium: { label: 'Đáng tin cậy', tone: 'medium', icon: 'fas fa-shield-alt' },
  new_or_limited: { label: 'Đang xây dựng uy tín', tone: 'limited', icon: 'fas fa-user-clock' },
  low: { label: 'Cần cân nhắc', tone: 'low', icon: 'fas fa-info-circle' },
  very_low: { label: 'Cần xem kỹ', tone: 'very-low', icon: 'fas fa-exclamation-triangle' },
};

const DEFAULT_META = TRUST_META.new_or_limited;

export const getTrustMeta = (user = {}) => {
  const level = user?.trustLevel || 'new_or_limited';
  const hasLittleHistory = Number(user?.totalReviews || 0) === 0 && Number(user?.trustScore ?? 50) >= 40;

  if (hasLittleHistory) {
    return { ...DEFAULT_META, label: 'Thành viên mới' };
  }

  return TRUST_META[level] || DEFAULT_META;
};

export function TrustBadge({ user, size = 'sm', className = '' }) {
  const meta = getTrustMeta(user);

  return (
    <span className={`trust-badge trust-badge--${meta.tone} trust-badge--${size} ${className}`.trim()}>
      <i className={meta.icon} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

export function VerificationBadge({ status, compact = false }) {
  const isVerified = status === 'verified';

  return (
    <span className={`verification-badge ${isVerified ? 'is-verified' : 'is-unverified'}`}>
      <i className={`fas ${isVerified ? 'fa-circle-check' : 'fa-clock'}`} aria-hidden="true" />
      <span>{compact ? (isVerified ? 'Đã xác thực' : 'Chưa xác thực') : (isVerified ? 'Đã xác thực danh tính' : 'Chưa xác thực eKYC')}</span>
    </span>
  );
}

export function RatingSummary({ averageRating, totalReviews, muted = false }) {
  const rating = Number(averageRating || 0);
  const count = Number(totalReviews || 0);

  if (!count) {
    return <span className={`rating-summary ${muted ? 'is-muted' : ''}`}>Chưa có đánh giá</span>;
  }

  return (
    <span className={`rating-summary ${muted ? 'is-muted' : ''}`}>
      <i className="fas fa-star" aria-hidden="true" />
      <strong>{rating.toFixed(1)}</strong>
      <span>({count} đánh giá)</span>
    </span>
  );
}

export default function UserTrustSummary({ user, compact = false, className = '' }) {
  if (!user) return null;

  return (
    <div className={`user-trust-summary ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      <RatingSummary averageRating={user.averageRating} totalReviews={user.totalReviews} />
      <TrustBadge user={user} />
      <VerificationBadge status={user.ekycStatus} compact />
    </div>
  );
}
