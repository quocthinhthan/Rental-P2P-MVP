import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiService from '../services/api';
import UserTrustSummary, { RatingSummary, TrustBadge, VerificationBadge } from '../components/Trust/TrustBadge';
import { formatItemCode } from '../utils/itemCode';
import '../styles/PublicUserProfilePage.css';

const formatDate = (value) => {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};

const renderStars = (rating) => (
  <span className="public-profile-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <i key={star} className={`fas fa-star ${star <= Number(rating || 0) ? 'active' : ''}`} />
    ))}
  </span>
);

const getVisibleReviewAverage = (reviews = []) => {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);

  if (!ratings.length) return 0;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
};

export default function PublicUserProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiService.getPublicUserProfile(userId);
        setProfile(response.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải hồ sơ người dùng.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <main className="public-profile-page">
        <div className="public-profile-loading">
          <p>Đang tải hồ sơ...</p>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="public-profile-page">
        <div className="public-profile-container">
          <div className="alert alert-warning">{error || 'Không tìm thấy hồ sơ.'}</div>
          <Link to="/shop" className="btn btn-primary">Quay lại tìm đồ thuê</Link>
        </div>
      </main>
    );
  }

  const reviews = Array.isArray(profile.publicReviews) ? profile.publicReviews : [];
  const ownerItems = Array.isArray(profile.ownerItems) ? profile.ownerItems : [];
  const backendAverageRating = Number(profile.averageRating || 0);
  const visibleAverageRating = getVisibleReviewAverage(reviews);
  const displayProfile = {
    ...profile,
    averageRating: backendAverageRating > 0 ? backendAverageRating : visibleAverageRating,
    totalReviews: Number(profile.totalReviews || 0) || reviews.length
  };

  return (
    <main className="public-profile-page">
      <section className="public-profile-hero">
        <div className="public-profile-container public-profile-hero-inner">
          <img
            src={profile.avatarUrl || 'https://via.placeholder.com/120'}
            alt={profile.fullName}
            className="public-profile-avatar"
          />
          <div className="public-profile-heading">
            <p className="public-profile-kicker">Hồ sơ cộng đồng</p>
            <h1>{profile.fullName || 'Người dùng RentalP2P'}</h1>
            <p className="public-profile-joined">Tham gia từ {formatDate(profile.createdAt)}</p>
            <div className="public-profile-trust-row">
              <RatingSummary averageRating={displayProfile.averageRating} totalReviews={displayProfile.totalReviews} />
              <TrustBadge user={displayProfile} size="md" />
              <VerificationBadge status={displayProfile.ekycStatus} />
            </div>
          </div>
        </div>
      </section>

      <div className="public-profile-container public-profile-grid">
        <aside className="public-profile-side">
          <section className="public-profile-panel">
            <h2>Mức độ tin cậy</h2>
            <UserTrustSummary user={displayProfile} />
            <p>
              Tín hiệu này kết hợp xác thực danh tính, lịch sử thuê, đánh giá công khai và các trạng thái an toàn của nền tảng.
            </p>
          </section>
        </aside>

        <section className="public-profile-main">
          <div className="public-profile-panel">
            <div className="public-profile-section-head">
              <div>
                <p>Đánh giá công khai</p>
                <h2>{displayProfile.totalReviews || 0} đánh giá về người dùng</h2>
              </div>
              <RatingSummary averageRating={displayProfile.averageRating} totalReviews={displayProfile.totalReviews} />
            </div>

            {reviews.length === 0 ? (
              <div className="public-profile-empty">Thành viên này đang xây dựng lịch sử đánh giá trên nền tảng.</div>
            ) : (
              <div className="public-review-list">
                {reviews.map((review) => (
                  <article className="public-review-card" key={review._id}>
                    <img
                      src={review.reviewerId?.avatarUrl || 'https://via.placeholder.com/44'}
                      alt={review.reviewerId?.fullName || 'Người đánh giá'}
                    />
                    <div>
                      <div className="public-review-top">
                        <strong>{review.reviewerId?.fullName || 'Người dùng ẩn danh'}</strong>
                        <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {renderStars(review.rating)}
                      <p>{review.comment || <em>Không có nội dung đánh giá.</em>}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="public-profile-panel">
            <div className="public-profile-section-head">
              <div>
                <p>Đồ đang cho thuê</p>
                <h2>{ownerItems.length} vật phẩm công khai</h2>
              </div>
              <Link to={`/shop?ownerId=${profile._id}`} className="public-profile-link">Xem tất cả</Link>
            </div>

            {ownerItems.length === 0 ? (
              <div className="public-profile-empty">Người dùng này chưa có vật phẩm công khai.</div>
            ) : (
              <div className="public-owner-items">
                {ownerItems.slice(0, 6).map((item) => (
                  <Link to={`/items/${item._id}`} className="public-owner-item-card" key={item._id}>
                    <img src={item.mainImage || 'https://via.placeholder.com/320x220'} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{formatItemCode(item)} · {item.category || 'Khác'}</span>
                      <p>{Number(item.pricePerDay || 0).toLocaleString('vi-VN')}đ / ngày</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
