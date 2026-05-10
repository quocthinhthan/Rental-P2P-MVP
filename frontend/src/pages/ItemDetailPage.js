import React, { useState, useEffect, forwardRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/CustomDetail.css';
import '../styles/ItemDetailPage.css';

/* ─────────────────────────────────────────
   Helper: star renderer
   ───────────────────────────────────────── */
const renderStars = (rating) =>
  [1, 2, 3, 4, 5].map((s) => (
    <i key={s} className={`fa fa-star ${s <= rating ? 'text-warning' : 'text-muted'}`} />
  ));

/* ─────────────────────────────────────────
   Helper: related product card
   ───────────────────────────────────────── */
function ProdCard({ item }) {
  return (
    <div className="idp-prod-card">
      <div className="idp-prod-img-wrap">
        <img
          src={item.mainImage || 'https://via.placeholder.com/300x190'}
          alt={item.name}
        />
        <div className="idp-prod-overlay">
          <Link to={`/items/${item._id}`} className="idp-prod-overlay-btn" title="Xem chi tiết">
            <i className="fa fa-eye" />
          </Link>
        </div>
      </div>
      <div className="idp-prod-body">
        {item.owner?.fullName && (
          <div className="idp-prod-owner-row">
            <img
              src={item.owner.avatarUrl || 'https://via.placeholder.com/22'}
              alt={item.owner.fullName}
              className="idp-prod-owner-avatar"
            />
            <span>{item.owner.fullName}</span>
          </div>
        )}
        <Link to={`/items/${item._id}`} className="idp-prod-name">{item.name}</Link>
        <p className="idp-prod-price">
          {Number(item.pricePerDay).toLocaleString('vi-VN')}đ
          <span className="idp-prod-price-unit"> / ngày</span>
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Helper: skeleton loader (4 cards)
   ───────────────────────────────────────── */
function SkeletonRow() {
  return (
    <>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="col-6 col-md-4 col-lg-3">
          <div className="idp-skel-card">
            <div className="idp-skel-img" />
            <div className="idp-skel-line" />
            <div className="idp-skel-line short" />
          </div>
        </div>
      ))}
    </>
  );
}

/* ─────────────────────────────────────────
   Helper: Related section block
   ───────────────────────────────────────── */
function RelatedSection({ title, pill, linkTo, linkLabel, items, loading }) {
  return (
    <div className="idp-related-section">
      <div className="idp-section-header">
        <h3 className="idp-section-title">
          {title}
          {pill && <span className="idp-title-pill">{pill}</span>}
        </h3>
        {linkTo && (
          <Link to={linkTo} className="idp-section-link">
            {linkLabel || 'Xem tất cả'} <i className="fa fa-arrow-right" style={{ fontSize: '.7rem' }} />
          </Link>
        )}
      </div>
      <hr className="idp-section-divider" />
      <div className="row g-3">
        {loading ? (
          <SkeletonRow />
        ) : items.length === 0 ? (
          <div className="col-12">
            <div className="idp-empty">
              <div className="idp-empty-icon">📦</div>
              <p>Không tìm thấy sản phẩm phù hợp.</p>
            </div>
          </div>
        ) : (
          items.map((it) => (
            <div key={it._id} className="col-6 col-md-4 col-lg-3">
              <ProdCard item={it} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
function ItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  /* ── state: item ── */
  const [item, setItem]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  /* ── state: active gallery image ── */
  const [activeImg, setActiveImg] = useState(0);

  /* ── state: booking ── */
  const [startDate, setStartDate]   = useState(null);
  const [endDate, setEndDate]       = useState(null);
  const [note, setNote]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── state: reviews ── */
  const [ownerReviews, setOwnerReviews]         = useState([]);
  const [ownerTrustScore, setOwnerTrustScore]   = useState(null);
  const [ownerTotalReviews, setOwnerTotalReviews] = useState(0);
  const [reviewLoading, setReviewLoading]       = useState(false);
  const [reviewError, setReviewError]           = useState(null);
  const [eligibleRental, setEligibleRental]     = useState(null);
  const [reviewRating, setReviewRating]         = useState(5);
  const [reviewComment, setReviewComment]       = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState('');
  const [reviewSubmitError, setReviewSubmitError] = useState('');

  /* ── state: tabs ── */
  const [activeTab, setActiveTab] = useState('desc');

  /* ── state: related ── */
  const [ownerItems, setOwnerItems]           = useState([]);
  const [ownerItemsLoading, setOwnerItemsLoading] = useState(false);
  const [categoryItems, setCategoryItems]     = useState([]);
  const [categoryItemsLoading, setCategoryItemsLoading] = useState(false);

  /* ─────────────────────────────────────
     Custom DatePicker input (unchanged)
     ───────────────────────────────────── */
  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <div className="position-relative w-100" onClick={onClick} ref={ref}>
      <input
        className="form-control custom-date-input shadow-sm border-0"
        value={value || 'Chọn ngày thuê (Bắt đầu - Kết thúc)'}
        readOnly
        style={{ height: '50px', borderRadius: '10px' }}
      />
      <i
        className="fa fa-calendar-alt position-absolute"
        style={{ right: '20px', top: '15px', color: '#ffb524' }}
      />
    </div>
  ));

  /* ─────────────────────────────────────
     Fetch item + related sections
     ───────────────────────────────────── */
  useEffect(() => {
    if (!itemId) return;

    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      setOwnerItems([]);
      setCategoryItems([]);
      setActiveImg(0);

      try {
        const detailRes = await apiService.getItemDetails(itemId);
        const fetched = detailRes.data;
        setItem(fetched);

        const ownerId  = fetched?.owner?._id;
        const category = fetched?.category;

        /* --- Sản phẩm khác của chủ --- */
        if (ownerId) {
          setOwnerItemsLoading(true);
          try {
            const res = await apiService.getItems({ ownerId, exclude: itemId });
            const all = Array.isArray(res.data) ? res.data : (res.data?.items || []);
            setOwnerItems(all.slice(0, 4));
          } catch { /* silent */ } finally {
            setOwnerItemsLoading(false);
          }
        }

        /* --- Sản phẩm cùng danh mục --- */
        if (category) {
          setCategoryItemsLoading(true);
          try {
            const res = await apiService.getItems({ category, exclude: itemId });
            const all = Array.isArray(res.data) ? res.data : (res.data?.items || []);
            setCategoryItems(all.slice(0, 4));
          } catch { /* silent */ } finally {
            setCategoryItemsLoading(false);
          }
        }
      } catch {
        setError('Không thể tải dữ liệu sản phẩm.');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  /* ─────────────────────────────────────
     Fetch owner reviews
     ───────────────────────────────────── */
  useEffect(() => {
    const ownerId = item?.owner?._id;
    if (!ownerId) return;

    const fetchOwnerReviews = async () => {
      setReviewLoading(true);
      setReviewError(null);
      try {
        const res = await apiService.getUserReviews(ownerId, 1, 5);
        setOwnerTrustScore(res.data.trustScore);
        setOwnerTotalReviews(res.data.totalReviews || 0);
        setOwnerReviews(res.data.reviews || []);
      } catch {
        setReviewError('Không thể tải đánh giá của chủ vật dụng.');
      } finally {
        setReviewLoading(false);
      }
    };

    fetchOwnerReviews();
  }, [item?.owner?._id]);

  /* ─────────────────────────────────────
     Fetch eligible rental
     ───────────────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn || !item?._id) { setEligibleRental(null); return; }

    const fetchEligible = async () => {
      try {
        const res = await apiService.getMyRentals();
        const rentals = [...(res.data?.asRenter || []), ...(res.data?.asOwner || [])];
        setEligibleRental(
          rentals.find((r) => String(r.item?._id) === String(item._id) && r.status === 'completed') || null
        );
      } catch { setEligibleRental(null); }
    };

    fetchEligible();
  }, [isLoggedIn, item?._id]);

  /* ─────────────────────────────────────
     Hash → review tab
     ───────────────────────────────────── */
  useEffect(() => {
    const activate = () => {
      if (window.location.hash === '#nav-review') setActiveTab('review');
    };
    activate();
    window.addEventListener('hashchange', activate);
    return () => window.removeEventListener('hashchange', activate);
  }, [itemId]);

  /* ─────────────────────────────────────
     Handlers
     ───────────────────────────────────── */
  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }
    setIsSubmitting(true);
    try {
      const res = await apiService.createRentalRequest(itemId, startDate, endDate, note);
      const pay = await apiService.createVNPayUrl(res.data._id);
      window.location.href = pay.data.paymentUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi hệ thống');
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!eligibleRental?._id) {
      setReviewSubmitError('Bạn chỉ có thể đánh giá sau khi có đơn thuê hoàn thành.');
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewSubmitError('');
      setReviewSubmitMessage('');
      await apiService.createReview({
        rentalId: eligibleRental._id,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });
      setReviewSubmitMessage('Đánh giá đã được gửi thành công.');
      setReviewComment('');
      setReviewRating(5);
      // Refetch reviews
      if (item?.owner?._id) {
        const res = await apiService.getUserReviews(item.owner._id, 1, 5);
        setOwnerTrustScore(res.data.trustScore);
        setOwnerTotalReviews(res.data.totalReviews || 0);
        setOwnerReviews(res.data.reviews || []);
      }
    } catch (err) {
      setReviewSubmitError(err.response?.data?.message || 'Không thể gửi đánh giá.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const excludeDates =
    item?.bookedDates?.map((r) => ({ start: new Date(r.startDate), end: new Date(r.endDate) })) || [];

  /* ─────────────────────────────────────
     Loading / Error states
     ───────────────────────────────────── */
  if (loading) {
    return (
      <div className="idp-page-loading">
        <div className="idp-page-spinner" />
        <span>Đang tải sản phẩm…</span>
      </div>
    );
  }
  if (error)  return <div className="alert alert-danger m-4">{error}</div>;
  if (!item)  return <div className="alert alert-warning m-4">Vật phẩm không tồn tại.</div>;

  const isOwner   = isLoggedIn && user?._id === item.owner._id;
  const allImages = item.images?.length ? item.images : [item.mainImage || 'https://via.placeholder.com/600'];

  /* ─────────────────────────────────────
     RENDER
     ───────────────────────────────────── */
  return (
    <div className="idp-page">
      {/* ── Page header (matching site template) ── */}
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          {item.name}
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item"><Link to="/items">Sản phẩm</Link></li>
          <li className="breadcrumb-item active text-white">{item.name}</li>
        </ol>
      </div>

      <div className="container py-5">

        {/* ══ MAIN ROW ══ */}
        <div className="row g-5 mb-5">

          {/* ── LEFT: Gallery ── */}
          <div className="col-lg-6">
            <div className="sticky-top" style={{ top: '100px' }}>
              <div className="idp-main-img">
                <img src={allImages[activeImg]} alt={item.name} />
              </div>
              {allImages.length > 1 && (
                <div className="idp-thumb-row">
                  {allImages.slice(0, 5).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`thumb-${idx}`}
                      className={`idp-thumb${activeImg === idx ? ' active' : ''}`}
                      onClick={() => setActiveImg(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Info + Booking ── */}
          <div className="col-lg-6">

            {/* Title */}
            <h1 className="idp-product-title">{item.name}</h1>

            <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
              <span className="idp-category-badge">
                <i className="fa fa-tag" style={{ fontSize: '.65rem' }} /> {item.category || 'Khác'}
              </span>
              <span className="idp-code">#{item._id.slice(-6).toUpperCase()}</span>
              {ownerTrustScore !== null && (
                <span className="d-flex align-items-center gap-1" style={{ fontSize: '.82rem' }}>
                  <i className="fa fa-star text-warning" />
                  <strong>{ownerTrustScore.toFixed(1)}</strong>
                  <span className="text-muted">({ownerTotalReviews} đánh giá)</span>
                </span>
              )}
            </div>

            <div className="mb-4">
              <span className="idp-price">
                {Number(item.pricePerDay).toLocaleString('vi-VN')}đ
              </span>
              <span className="idp-price-unit"> / ngày</span>
            </div>

            {/* Booking + Owner card */}
            <div className="idp-booking-card">

              {/* Form area */}
              <div className="idp-booking-form-area">
                {!isOwner ? (
                  <>
                    <h5 className="mb-4">
                      <i className="fas fa-calendar-check text-primary me-2" />
                      Thông tin thuê vật dụng
                    </h5>
                    <form onSubmit={handleRentalSubmit}>
                      <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase mb-2 d-block">
                          Thời gian thuê
                        </label>
                        <div className="mt-2">
                          <DatePicker
                            selected={startDate}
                            onChange={([start, end]) => { setStartDate(start); setEndDate(end); }}
                            startDate={startDate}
                            endDate={endDate}
                            selectsRange
                            minDate={new Date()}
                            excludeDateIntervals={excludeDates}
                            customInput={<CustomDateInput />}
                            dateFormat="dd/MM/yyyy"
                            monthsShown={1}
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase mb-2 d-block">
                          Ghi chú (Tùy chọn)
                        </label>
                        <textarea
                          className="form-control border-0 shadow-sm rounded-3 p-3"
                          rows="3"
                          placeholder="Ví dụ: Tôi sẽ đến lấy đồ lúc 8h sáng ngày đầu tiên..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                      {startDate && endDate && (
                        <div className="mb-3 px-3 py-2 rounded-3 bg-white border" style={{ fontSize: '.85rem' }}>
                          <span className="text-muted">Tổng ước tính: </span>
                          <strong className="text-primary">
                            {(
                              Number(item.pricePerDay) *
                              Math.max(1, Math.ceil((endDate - startDate) / 86400000))
                            ).toLocaleString('vi-VN')}đ
                          </strong>
                          <span className="text-muted">
                            {' '}({Math.max(1, Math.ceil((endDate - startDate) / 86400000))} ngày)
                          </span>
                        </div>
                      )}
                      <button
                        className="btn-submit"
                        type="submit"
                        disabled={!startDate || !endDate || isSubmitting}
                      >
                        {isSubmitting
                          ? <span className="spinner-border spinner-border-sm me-2" />
                          : <i className="fas fa-handshake me-2" />}
                        GỬI YÊU CẦU THUÊ
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="alert alert-info border-0 rounded-4 text-center mb-0 shadow-sm py-4">
                    <div
                      className="bg-white rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow-sm"
                      style={{ width: '60px', height: '60px' }}
                    >
                      <i className="fas fa-box-open fa-2x text-info" />
                    </div>
                    <h5 className="fw-bold text-dark">Vật dụng của bạn</h5>
                    <p className="mb-0 text-muted small">
                      Bạn đang xem giao diện chi tiết vật dụng do chính bạn đăng tải.
                    </p>
                  </div>
                )}
              </div>

              {/* Owner area */}
              <div className="idp-owner-area">
                <div className="idp-owner-section-label">
                  <i className="fa fa-user-circle" /> Được cho thuê bởi
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="idp-owner-avatar-wrap">
                    <img
                      src={item.owner?.avatarUrl || 'https://thanquocthinh.id.vn/_next/image?url=%2Favatar.jpg&w=384&q=75'}
                      alt={item.owner?.fullName}
                      className="idp-owner-avatar"
                    />
                    <span className="idp-owner-verified"><i className="fas fa-check" /></span>
                  </div>
                  <div>
                    <p className="idp-owner-name">{item.owner?.fullName || 'Người dùng ẩn danh'}</p>
                    <div className="idp-owner-meta">
                      <div className="idp-owner-meta-row">
                        <i className="fas fa-map-marker-alt text-primary" />
                        <span>{item.address || item.owner?.address || 'Chưa cập nhật địa chỉ'}</span>
                      </div>
                      <div className="idp-owner-meta-row">
                        <i className="fas fa-phone-alt text-success" />
                        {isLoggedIn ? (
                          <span className="fw-medium text-dark">
                            {item.owner?.phoneNumber || 'Chưa cập nhật SĐT'}
                          </span>
                        ) : (
                          <span className="idp-phone-locked">
                            <i className="fas fa-lock" /> Đăng nhập để xem
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /idp-booking-card */}

          </div>
          {/* /col right */}
        </div>
        {/* /main row */}

        {/* ══ TABS: Mô tả / Đánh giá ══ */}
        <div className="row mb-2">
          <div className="col-12">
            <div className="idp-tabs-nav" id="nav-tab" role="tablist">
              <button
                className={`idp-tab-btn${activeTab === 'desc' ? ' active' : ''}`}
                onClick={() => setActiveTab('desc')}
              >
                <i className="fa fa-align-left me-2" /> Mô tả chi tiết
              </button>
              <button
                id="nav-review-tab-btn"
                className={`idp-tab-btn${activeTab === 'review' ? ' active' : ''}`}
                data-bs-target="#nav-review"
                onClick={() => setActiveTab('review')}
              >
                <i className="fa fa-star me-2" /> Đánh giá
                {ownerTotalReviews > 0 && (
                  <span
                    className="ms-2 badge rounded-pill"
                    style={{ background: 'var(--idp-brand-light)', color: 'var(--idp-brand)', fontSize: '.7rem' }}
                  >
                    {ownerTotalReviews}
                  </span>
                )}
              </button>
            </div>

            <div className="idp-tab-content">

              {/* ── Mô tả ── */}
              {activeTab === 'desc' && (
                <div id="nav-desc">
                  <p className="idp-desc-text">
                    {item.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                  </p>
                </div>
              )}

              {/* ── Đánh giá ── */}
              {activeTab === 'review' && (
                <div id="nav-review">
                  <div className="row g-4">

                    {/* Score box */}
                    <div className="col-lg-4">
                      <div className="idp-review-score-box">
                        <div className="idp-review-score-num">
                          {ownerTrustScore !== null ? ownerTrustScore.toFixed(1) : '--'}
                        </div>
                        <div className="idp-review-stars">
                          {ownerTrustScore !== null ? renderStars(Math.round(ownerTrustScore)) : renderStars(0)}
                        </div>
                        <p className="idp-review-count">{ownerTotalReviews} đánh giá từ cộng đồng</p>
                        {!isLoggedIn && (
                          <div className="alert alert-light border mt-3 mb-0 small">
                            Đăng nhập để thuê và gửi đánh giá.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review list + form */}
                    <div className="col-lg-8">
                      <div className="bg-white border rounded-4 p-4 shadow-sm">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                          <h5 className="fw-bold mb-0">Đánh giá từ người thuê</h5>
                          <span className="text-muted small">Đánh giá công khai từ chủ vật dụng.</span>
                        </div>

                        {reviewLoading && (
                          <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status" />
                          </div>
                        )}
                        {!reviewLoading && reviewError && (
                          <div className="alert alert-warning">{reviewError}</div>
                        )}
                        {!reviewLoading && !reviewError && ownerReviews.length === 0 && (
                          <div className="alert alert-light border">Chưa có đánh giá nào.</div>
                        )}
                        {!reviewLoading && !reviewError && ownerReviews.length > 0 && (
                          <div>
                            {ownerReviews.map((review) => (
                              <div key={review._id} className="idp-review-item">
                                <img
                                  src={review.reviewerId?.avatarUrl || 'https://via.placeholder.com/52'}
                                  alt={review.reviewerId?.fullName}
                                  className="idp-reviewer-avatar"
                                />
                                <div className="flex-grow-1">
                                  <div className="d-flex justify-content-between flex-wrap gap-1">
                                    <p className="idp-review-author">{review.reviewerId?.fullName || 'Ẩn danh'}</p>
                                    <span className="idp-review-date">
                                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                  </div>
                                  <div className="d-flex gap-1 mb-1">{renderStars(review.rating)}</div>
                                  <p className="idp-review-comment">
                                    {review.comment || <em className="text-muted">Không có nội dung.</em>}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Write review */}
                        <div className="mt-4 pt-4 border-top">
                          <p className="idp-review-form-title">Viết đánh giá của bạn</p>
                          {!isLoggedIn && (
                            <div className="alert alert-light border">
                              <Link to="/login">Đăng nhập</Link> để gửi đánh giá.
                            </div>
                          )}
                          {isLoggedIn && !eligibleRental && (
                            <div className="alert alert-light border">
                              Chỉ có thể đánh giá khi bạn đã có đơn thuê hoàn thành.
                            </div>
                          )}
                          {isLoggedIn && eligibleRental && (
                            <form onSubmit={handleReviewSubmit}>
                              <div className="mb-3">
                                <label className="form-label fw-bold small text-uppercase text-muted mb-2 d-block">
                                  Đánh giá
                                </label>
                                <div className="d-flex gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      className="idp-star-btn"
                                      onClick={() => setReviewRating(s)}
                                      aria-label={`${s} sao`}
                                    >
                                      <i className={`fa fa-star fa-lg ${s <= reviewRating ? 'text-warning' : 'text-muted'}`} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label fw-bold small text-uppercase text-muted mb-2 d-block">
                                  Nội dung
                                </label>
                                <textarea
                                  className="form-control border-0 shadow-sm rounded-3 p-3"
                                  rows="4"
                                  placeholder="Chia sẻ trải nghiệm thuê của bạn..."
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                />
                              </div>
                              {reviewSubmitError && (
                                <div className="alert alert-danger py-2">{reviewSubmitError}</div>
                              )}
                              {reviewSubmitMessage && (
                                <div className="alert alert-success py-2">{reviewSubmitMessage}</div>
                              )}
                              <button
                                type="submit"
                                className="btn btn-primary rounded-pill px-5 py-2"
                                disabled={reviewSubmitting}
                              >
                                {reviewSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>{/* /idp-tab-content */}
          </div>
        </div>

        {/* ══ RELATED: Sản phẩm khác của chủ ══ */}
        <RelatedSection
          title={`Sản phẩm khác của ${item.owner?.fullName || 'chủ này'}`}
          pill={ownerItems.length > 0 ? `${ownerItems.length}+` : undefined}
          linkTo={`/shop?ownerId=${item.owner?._id}`}
          linkLabel="Xem tất cả"
          items={ownerItems}
          loading={ownerItemsLoading}
        />

        {/* ══ RELATED: Cùng danh mục ══ */}
        <RelatedSection
          title={`Sản phẩm cùng danh mục`}
          pill={item.category}
          linkTo={`/shop?category=${encodeURIComponent(item.category || '')}`}
          linkLabel={`Xem tất cả "${item.category}"`}
          items={categoryItems}
          loading={categoryItemsLoading}
        />

      </div>{/* /container */}
    </div>
  );
}

export default ItemDetailPage;