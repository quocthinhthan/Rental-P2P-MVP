import React, { useState, useEffect, forwardRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import ReportItemModal from '../components/Items/ReportItemModal';
import DatePicker from 'react-datepicker';
import Swal from 'sweetalert2';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/CustomDetail.css';
import '../styles/ItemDetailPage.css';
import {
  getDetailMainImage,
  getDetailThumbImage,
  getRelatedItemImage
} from '../utils/cloudinaryImage';
import { formatItemCode } from '../utils/itemCode';
import { sanitizeDescription } from '../utils/sanitize';
import UserTrustSummary, { RatingSummary, TrustBadge } from '../components/Trust/TrustBadge';

/* ─────────────────────────────────────────
   Helper: star renderer
   ───────────────────────────────────────── */
const renderStars = (rating) =>
  [1, 2, 3, 4, 5].map((s) => (
    <i key={s} className={`fa fa-star ${s <= rating ? 'text-warning' : 'text-muted'}`} />
  ));

/* ─────────────────────────────────────────
   Helper: availability status calculator
   ───────────────────────────────────────── */
const getAvailabilityStatus = (bookedDates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!bookedDates || bookedDates.length === 0) {
    return {
      status: 'AVAILABLE',
      label: 'Còn trống',
      subLabel: '✨ Sẵn sàng phục vụ',
      badgeClass: 'badge-available',
      activeBookings: []
    };
  }

  // Parse and sort bookings ascending by startDate
  const activeBookings = bookedDates
    .map(r => {
      const start = new Date(r.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(r.endDate);
      end.setHours(0, 0, 0, 0);
      return { start, end };
    })
    .filter(r => r.end >= today) // only care about current or future bookings
    .sort((a, b) => a.start - b.start);

  if (activeBookings.length === 0) {
    return {
      status: 'AVAILABLE',
      label: 'Còn trống',
      subLabel: '✨ Sẵn sàng phục vụ',
      badgeClass: 'badge-available',
      activeBookings: []
    };
  }

  // Check if today falls in any booking range
  const currentBooking = activeBookings.find(r => today >= r.start && today <= r.end);

  if (currentBooking) {
    // Find expected free date (day after end date of current booking)
    const nextFreeDate = new Date(currentBooking.end);
    nextFreeDate.setDate(nextFreeDate.getDate() + 1);
    const formattedFreeDate = nextFreeDate.toLocaleDateString('vi-VN');

    return {
      status: 'RENTED',
      label: 'Đang được thuê',
      subLabel: `🕒 Dự kiến trống từ ${formattedFreeDate}`,
      badgeClass: 'badge-rented',
      currentBooking,
      activeBookings
    };
  }

  // If today is free but there are future bookings
  const nextBooking = activeBookings[0]; // first upcoming booking
  const formattedNextBookingDate = nextBooking.start.toLocaleDateString('vi-VN');

  return {
    status: 'AVAILABLE_TODAY',
    label: 'Còn trống hôm nay',
    subLabel: `⚠️ Bận từ ${formattedNextBookingDate}`,
    badgeClass: 'badge-available-today',
    nextBooking,
    activeBookings
  };
};


/* ─────────────────────────────────────────
   Helper: related product card
   ───────────────────────────────────────── */
function ProdCard({ item }) {
  const imageUrl = item.mainImage || 'https://via.placeholder.com/300x190';
  const imageSources = getRelatedItemImage(imageUrl);

  return (
    <div className="idp-prod-card">
      <div className="idp-prod-img-wrap">
        <img
          src={imageSources.src}
          srcSet={imageSources.srcSet}
          sizes={imageSources.sizes}
          alt={item.name}
          loading="lazy"
          decoding="async"
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
            <RatingSummary
              averageRating={item.owner.averageRating}
              totalReviews={item.owner.totalReviews}
              muted
            />
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

  /* ── state: favorites ── */
  const [isFav, setIsFav] = useState(false);

  /* ── state: owner calendar block ── */
  const [blockStart, setBlockStart] = useState(null);
  const [blockEnd, setBlockEnd] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  /* ── state: active gallery image ── */
  const [activeImg, setActiveImg] = useState(0);

  /* ── state: booking ── */
  const [startDate, setStartDate]   = useState(null);
  const [endDate, setEndDate]       = useState(null);
  const [note, setNote]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── state: report ── */
  const [isReportOpen, setIsReportOpen] = useState(false);

  /* ── state: reviews ── */
  const [ownerReviews, setOwnerReviews]         = useState([]);
  const [ownerAverageRating, setOwnerAverageRating] = useState(null);
  const [ownerTotalReviews, setOwnerTotalReviews] = useState(0);
  const [reviewLoading, setReviewLoading]       = useState(false);
  const [reviewError, setReviewError]           = useState(null);

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
    window.scrollTo(0, 0);

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
        setIsFav(fetched.isFavorited || false);

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
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
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
        setOwnerAverageRating(res.data.averageRating ?? item?.owner?.averageRating ?? 0);
        setOwnerTotalReviews(res.data.totalReviews || 0);
        setOwnerReviews(res.data.reviews || []);
      } catch {
        setReviewError('Không thể tải đánh giá của chủ vật dụng.');
      } finally {
        setReviewLoading(false);
      }
    };

    fetchOwnerReviews();
  }, [item?.owner?._id, item?.owner?.averageRating]);

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

  const handleReportClick = () => {
    if (!isLoggedIn) {
      Swal.fire({
        title: 'Yêu cầu đăng nhập! 🔑',
        text: 'Bạn cần đăng nhập tài khoản để báo cáo vi phạm sản phẩm.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đăng nhập ngay',
        cancelButtonText: 'Để sau',
        confirmButtonColor: '#ffb524',
        cancelButtonColor: '#6c757d'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login', { state: { from: window.location.pathname } });
        }
      });
      return;
    }
    setIsReportOpen(true);
  };

  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) { navigate('/login'); return; }

    if (startDate && endDate) {
      const chosenStart = new Date(startDate);
      chosenStart.setHours(0, 0, 0, 0);
      const chosenEnd = new Date(endDate);
      chosenEnd.setHours(0, 0, 0, 0);

      const hasOverlap = excludeDates.some(interval => {
        const intervalStart = new Date(interval.start);
        intervalStart.setHours(0, 0, 0, 0);
        const intervalEnd = new Date(interval.end);
        intervalEnd.setHours(0, 0, 0, 0);
        return intervalStart <= chosenEnd && intervalEnd >= chosenStart;
      });

      if (hasOverlap) {
        Swal.fire({
          title: 'Trùng lịch bận! 📅',
          text: 'Khoảng thời gian bạn chọn trùng với lịch đã bị khóa hoặc đã được đặt thuê. Vui lòng chọn khoảng thời gian khác không chứa ngày bận.',
          icon: 'warning',
          confirmButtonColor: '#ffb524'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await apiService.createRentalRequest(itemId, startDate, endDate, note);
      const pay = await apiService.createVNPayUrl(res.data._id);
      window.location.href = pay.data.paymentUrl;
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Không thể tạo yêu cầu thuê.';
      
      // Kiểm tra nếu lỗi do chưa xác thực eKYC
      if (errorMsg.toLowerCase().includes('xác thực') || errorMsg.toLowerCase().includes('ekyc')) {
        Swal.fire({
          title: 'Yêu cầu xác thực! 🛡️',
          text: 'Bạn cần hoàn tất xác thực danh tính (eKYC) trước khi có thể thuê vật dụng này để đảm bảo an toàn cho cả hai bên.',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Xác thực ngay',
          cancelButtonText: 'Để sau'
        }).then((result) => {
          if (result.isConfirmed) {
            navigate('/account');
          }
        });
      } else {
        Swal.fire('Lỗi hệ thống', errorMsg, 'error');
      }
      setIsSubmitting(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
      Swal.fire({
        title: 'Đăng nhập ngay',
        text: 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.',
        icon: 'info',
        confirmButtonColor: '#ffb524',
      });
      return;
    }
    try {
      if (isFav) {
        await apiService.removeFavorite(item._id);
        setIsFav(false);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã xóa khỏi danh sách yêu thích',
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await apiService.addFavorite(item._id);
        setIsFav(true);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Đã thêm vào danh sách yêu thích',
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (err) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Thao tác thất bại',
        showConfirmButton: false,
        timer: 2000,
      });
    }
  };

  const handleBlockDatesSubmit = async (e) => {
    e.preventDefault();
    if (!blockStart || !blockEnd) {
      Swal.fire('Thiếu thông tin', 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc để khóa lịch.', 'warning');
      return;
    }
    try {
      setIsBlocking(true);
      await apiService.addBlockedDates(itemId, {
        startDate: blockStart,
        endDate: blockEnd,
        reason: blockReason.trim() || 'Bận cá nhân / Bảo trì',
      });
      Swal.fire({
        title: 'Thành công! 🎉',
        text: 'Đã khóa lịch thủ công cho sản phẩm.',
        icon: 'success',
        confirmButtonColor: '#ffb524'
      });
      setBlockStart(null);
      setBlockEnd(null);
      setBlockReason('');
      
      const detailRes = await apiService.getItemDetails(itemId);
      setItem(detailRes.data);
    } catch (err) {
      Swal.fire('Khóa lịch thất bại ⚠️', err.response?.data?.message || 'Có lỗi xảy ra khi khóa lịch.', 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDeleteBlockDate = async (blockId) => {
    const result = await Swal.fire({
      title: 'Mở khóa lịch?',
      text: 'Sản phẩm sẽ sẵn sàng cho thuê trở lại vào các ngày này.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffb524',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Mở khóa',
      cancelButtonText: 'Hủy',
    });
    if (!result.isConfirmed) return;

    try {
      await apiService.removeBlockedDate(itemId, blockId);
      Swal.fire({
        title: 'Đã mở khóa! 🎉',
        text: 'Đã xóa lịch bận thủ công thành công.',
        icon: 'success',
        confirmButtonColor: '#ffb524'
      });
      
      const detailRes = await apiService.getItemDetails(itemId);
      setItem(detailRes.data);
    } catch (err) {
      Swal.fire('Thất bại', err.response?.data?.message || 'Không thể mở khóa lịch.', 'error');
    }
  };

  const excludeDates = [
    ...(item?.bookedDates?.map((r) => ({ start: new Date(r.startDate), end: new Date(r.endDate) })) || []),
    ...(item?.blockedDates?.map((r) => ({ start: new Date(r.startDate), end: new Date(r.endDate) })) || [])
  ];

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

  const isOwner = isLoggedIn && user?._id === item.owner._id;
  const availability = getAvailabilityStatus(item.bookedDates);
  const allImages = item.images?.length ? item.images : [item.mainImage || 'https://via.placeholder.com/600'];
  const activeImageSources = getDetailMainImage(allImages[activeImg]);
  const depositPercentage = Number(item.depositPercentage ?? 100);
  const baseValue = Number(item.baseValue ?? 0);
  const depositAmount = (baseValue * depositPercentage) / 100;
  const ownerProfile = item.owner ? {
    ...item.owner,
    averageRating: ownerAverageRating ?? item.owner.averageRating ?? 0,
    totalReviews: ownerTotalReviews || item.owner.totalReviews || 0
  } : null;

  const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (ownerReviews && ownerReviews.length > 0) {
    ownerReviews.forEach(r => {
      const rate = Math.round(r.rating);
      if (rate >= 1 && rate <= 5) {
        ratingBreakdown[rate] += 1;
      }
    });
  }

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
                <img
                  src={activeImageSources.src}
                  srcSet={activeImageSources.srcSet}
                  sizes={activeImageSources.sizes}
                  alt={item.name}
                  decoding="async"
                />
              </div>
              {allImages.length > 1 && (
                <div className="idp-thumb-row">
                  {allImages.slice(0, 5).map((img, idx) => {
                    const thumbSources = getDetailThumbImage(img);
                    return (
                      <img
                        key={idx}
                        src={thumbSources.src}
                        srcSet={thumbSources.srcSet}
                        sizes={thumbSources.sizes}
                        alt={`thumb-${idx}`}
                        className={`idp-thumb${activeImg === idx ? ' active' : ''}`}
                        loading="lazy"
                        decoding="async"
                        onClick={() => setActiveImg(idx)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Info + Booking ── */}
          <div className="col-lg-6">

            {/* VIP/Featured Banner */}
            {item.isFeatured && (
              <div 
                className="featured-trust-banner rounded-3 p-3 mb-3 d-flex align-items-center gap-3 shadow-sm border-0 position-relative overflow-hidden" 
                style={{
                  background: 'linear-gradient(135deg, #fffcf0 0%, #fff7d6 100%)',
                  borderLeft: '4px solid #ffd700',
                  boxShadow: '0 4px 12px rgba(255, 215, 0, 0.1)'
                }}
              >
                <div 
                  className="d-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm"
                  style={{ width: '40px', height: '40px', minWidth: '40px' }}
                >
                  <span className="fs-4">🌟</span>
                </div>
                <div>
                  <div className="fw-bold text-dark mb-0 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem' }}>
                    Sản phẩm nổi bật uy tín
                    <span className="badge text-white" style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)', fontSize: '0.65rem' }}>VIP</span>
                  </div>
                  <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                    Sản phẩm được đánh giá cao với độ tin cậy vượt trội trên Rental-P2P.
                  </p>
                </div>
                {/* Background shimmer lines */}
                <div 
                  className="position-absolute end-0 bottom-0 opacity-10" 
                  style={{
                    fontSize: '4.5rem',
                    transform: 'translate(10px, 15px) rotate(-15deg)',
                    color: '#ffd700',
                    pointerEvents: 'none'
                  }}
                >
                  👑
                </div>
              </div>
            )}

            {/* Title with Favorite Button */}
            <div className="d-flex align-items-center justify-content-between gap-3 mb-2 flex-wrap">
              <h1 className="idp-product-title mb-0" style={{ flex: 1 }}>{item.name}</h1>
              {!isOwner && (
                <button
                  type="button"
                  className="btn-favorite-toggle"
                  onClick={handleFavoriteToggle}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#fff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: isFav ? '#ef4444' : '#9ca3af',
                    fontSize: '1.2rem'
                  }}
                  title={isFav ? 'Bỏ yêu thích' : 'Yêu thích sản phẩm'}
                >
                  <i className={isFav ? 'fas fa-heart text-danger' : 'far fa-heart'} />
                </button>
              )}
            </div>

            {/* Row 1: Low-key Metadata (Category, Code, Rating, Report on far right) */}
            <div className="idp-meta-top-row d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div className="d-flex align-items-center gap-2 flex-wrap text-muted small">
                <span className="idp-category-tag">
                  <i className="fa fa-tag me-1" /> {item.category || 'Khác'}
                </span>
                <span className="idp-meta-dot">•</span>
                <span className="idp-code-text">{formatItemCode(item)}</span>
                <span className="idp-meta-dot">•</span>
                <RatingSummary
                  averageRating={ownerProfile?.averageRating}
                  totalReviews={ownerProfile?.totalReviews}
                  muted
                />
              </div>
              
              {!isOwner && (
                <button
                  type="button"
                  className="idp-report-text-btn"
                  onClick={handleReportClick}
                  title="Báo cáo sản phẩm vi phạm"
                >
                  <i className="far fa-flag me-1" /> Báo cáo vi phạm
                </button>
              )}
            </div>

            {/* Row 2: Status & Trust Indicators (High-priority action-oriented info) */}
            <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
              <span className={`idp-status-badge ${availability.badgeClass}`}>
                {availability.status === 'AVAILABLE' && <i className="fas fa-check-circle me-1" />}
                {availability.status === 'AVAILABLE_TODAY' && <i className="fas fa-info-circle me-1" />}
                {availability.status === 'RENTED' && <i className="fas fa-history me-1" />}
                {availability.label}
              </span>
              
              {availability.subLabel && (
                <span className={`idp-status-sublabel ${availability.badgeClass}`}>
                  {availability.subLabel}
                </span>
              )}

              {ownerProfile && <TrustBadge user={ownerProfile} />}
            </div>

            <div className="mb-4">
              <span className="idp-price">
                {Number(item.pricePerDay).toLocaleString('vi-VN')}đ
              </span>
              <span className="idp-price-unit"> / ngày</span>
            </div>
            <div className="mb-4">
              <div className="text-muted" style={{ fontSize: '.9rem' }}>
                Tiền cọc yêu cầu: <strong>{depositAmount.toLocaleString('vi-VN')}đ</strong> ({depositPercentage}%)
              </div>
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

                        {/* Hộp lịch bận sắp tới */}
                        <div className="idp-schedule-box mt-3">
                          <div className="idp-schedule-header">
                            <i className="far fa-calendar-alt text-primary me-2" />
                            <span>Lịch bận sắp tới</span>
                          </div>
                          {availability.activeBookings.length === 0 ? (
                            <div className="idp-schedule-empty">
                              ✨ Chưa có lịch bận sắp tới - Sẵn sàng phục vụ bất cứ lúc nào!
                            </div>
                          ) : (
                            <div className="idp-schedule-list">
                              {availability.activeBookings.slice(0, 3).map((booking, idx) => (
                                <div key={idx} className="idp-schedule-item">
                                  <span className="idp-schedule-bullet" />
                                  <span className="idp-schedule-dates">
                                    {booking.start.toLocaleDateString('vi-VN')} - {booking.end.toLocaleDateString('vi-VN')}
                                  </span>
                                  <span className="idp-schedule-status-tag">Đã đặt</span>
                                </div>
                              ))}
                              {availability.activeBookings.length > 3 && (
                                <div className="idp-schedule-more text-muted mt-1 small">
                                  + và {availability.activeBookings.length - 3} lịch thuê khác...
                                </div>
                              )}
                            </div>
                          )}
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
                  <>
                    <div className="alert alert-info border-0 rounded-4 text-center mb-4 shadow-sm py-4">
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

                    {/* Hộp lịch bận sắp tới cho chủ sở hữu */}
                    <div className="idp-schedule-box">
                      <div className="idp-schedule-header" style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '10px', marginBottom: '12px' }}>
                        <i className="far fa-calendar-alt text-primary me-2" />
                        <span className="fw-bold" style={{ color: '#1f2937' }}>Quản lý lịch bận sắp tới</span>
                      </div>
                      
                      {/* Đơn thuê đã đặt */}
                      <div className="mb-3">
                        <span className="small text-muted fw-bold text-uppercase d-block mb-2">📅 Lịch đơn thuê từ khách hàng:</span>
                        {availability.activeBookings.length === 0 ? (
                          <div className="idp-schedule-empty text-muted py-2 small ps-2">
                            Chưa có khách đặt thuê lịch sắp tới.
                          </div>
                        ) : (
                          <div className="idp-schedule-list">
                            {availability.activeBookings.map((booking, idx) => (
                              <div key={idx} className="idp-schedule-item d-flex justify-content-between align-items-center mb-2" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '6px 12px' }}>
                                <span className="idp-schedule-dates small">
                                  {booking.start.toLocaleDateString('vi-VN')} - {booking.end.toLocaleDateString('vi-VN')}
                                </span>
                                <span className="badge bg-success-light text-success px-2 py-1" style={{ fontSize: '0.75rem', borderRadius: '4px' }}>Đã đặt</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Lịch khóa thủ công */}
                      <div className="mb-3" style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '12px' }}>
                        <span className="small text-muted fw-bold text-uppercase d-block mb-2">🔒 Lịch bạn đã khóa thủ công:</span>
                        {!item.blockedDates || item.blockedDates.length === 0 ? (
                          <div className="idp-schedule-empty text-muted py-2 small ps-2">
                            Chưa có ngày nào bị khóa thủ công.
                          </div>
                        ) : (
                          <div className="idp-schedule-list">
                            {item.blockedDates.map((block) => (
                              <div key={block._id} className="d-flex justify-content-between align-items-center mb-2" style={{ backgroundColor: '#fff5f5', border: '1px solid #fee2e2', borderRadius: '8px', padding: '8px 12px' }}>
                                <div>
                                  <span className="fw-semibold small text-danger d-block">
                                    {new Date(block.startDate).toLocaleDateString('vi-VN')} - {new Date(block.endDate).toLocaleDateString('vi-VN')}
                                  </span>
                                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{block.reason || 'Bận cá nhân'}</span>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteBlockDate(block._id)}
                                  style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                                  title="Mở khóa lịch"
                                >
                                  <i className="fas fa-unlock-alt" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Form Khóa lịch nhanh */}
                      <div className="mt-3" style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                        <span className="small text-muted fw-bold text-uppercase d-block mb-2">🔐 Khóa lịch bận mới:</span>
                        <form onSubmit={handleBlockDatesSubmit} className="bg-light p-3 rounded-3" style={{ border: '1px solid #e5e7eb' }}>
                          <div className="mb-2">
                            <label className="small fw-semibold text-dark mb-1 d-block">Khoảng ngày bận <span className="text-danger">*</span></label>
                            <DatePicker
                              selected={blockStart}
                              onChange={(dates) => {
                                const [start, end] = dates;
                                setBlockStart(start);
                                setBlockEnd(end);
                              }}
                              startDate={blockStart}
                              endDate={blockEnd}
                              selectsRange
                              minDate={new Date()}
                              excludeDateIntervals={excludeDates}
                              placeholderText="Chọn ngày bắt đầu - kết thúc"
                              className="form-control"
                              style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                              required
                              disabled={isBlocking}
                            />
                          </div>
                          <div className="mb-3">
                            <label className="small fw-semibold text-dark mb-1 d-block">Lý do khóa <span className="text-muted">(Tùy chọn)</span></label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Ví dụ: Bảo trì, bận cá nhân..."
                              value={blockReason}
                              onChange={(e) => setBlockReason(e.target.value)}
                              style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '6px 12px' }}
                              maxLength={100}
                              disabled={isBlocking}
                            />
                          </div>
                          <button
                            type="submit"
                            className="btn btn-warning w-100 fw-semibold text-white d-flex align-items-center justify-content-center"
                            style={{ borderRadius: '8px', padding: '8px', fontSize: '0.85rem', backgroundColor: '#ffb524', border: 'none' }}
                            disabled={!blockStart || !blockEnd || isBlocking}
                          >
                            {isBlocking ? (
                              <span className="spinner-border spinner-border-sm me-2" />
                            ) : (
                              <i className="fas fa-lock me-2" />
                            )}
                            Xác nhận khóa lịch
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Owner area */}
              <div className="idp-owner-area">
                <div className="idp-owner-section-label">
                  <i className="fa fa-user-circle" /> Được cho thuê bởi
                </div>
                <div className="d-flex align-items-start gap-3">
                  <div className="idp-owner-avatar-wrap">
                    <img
                      src={item.owner?.avatarUrl || 'https://thanquocthinh.id.vn/_next/image?url=%2Favatar.jpg&w=384&q=75'}
                      alt={item.owner?.fullName}
                      className="idp-owner-avatar"
                    />
                    {ownerProfile?.ekycStatus === 'verified' && (
                      <span className="idp-owner-verified"><i className="fas fa-check" /></span>
                    )}
                  </div>
                  <div className="idp-owner-content">
                    <p className="idp-owner-name">{item.owner?.fullName || 'Người dùng ẩn danh'}</p>
                    {ownerProfile && (
                      <UserTrustSummary user={ownerProfile} className="idp-owner-trust-row" />
                    )}
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
                    {item.owner?._id && (
                      <Link to={`/users/${item.owner._id}/profile`} className="idp-owner-profile-link">
                        Xem hồ sơ <i className="fa fa-arrow-right" />
                      </Link>
                    )}
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
                <div id="nav-desc" className="fade-in">
                  {item.description ? (
                    <div 
                      className="idp-desc-text"
                      dangerouslySetInnerHTML={{ __html: sanitizeDescription(item.description) }}
                    />
                  ) : (
                    <p className="idp-desc-text text-muted italic">Chưa có mô tả chi tiết cho sản phẩm này.</p>
                  )}
                </div>
              )}

              {/* ── Đánh giá ── */}
              {activeTab === 'review' && (
                <div id="nav-review" className="fade-in">
                  <div className="row g-4">

                    {/* Score box */}
                    <div className="col-lg-4">
                      <div className="idp-review-score-box shadow-sm border border-light-subtle rounded-4 p-4 text-center bg-light-subtle">
                        <div className="idp-review-score-label text-uppercase small fw-bold text-muted mb-2 tracking-wider">
                          Đánh giá trung bình
                        </div>
                        <div className="idp-review-score-num text-primary fw-extrabold mb-1" style={{ fontSize: '3rem', fontWeight: 800 }}>
                          {ownerAverageRating !== null && ownerTotalReviews > 0 ? ownerAverageRating.toFixed(1) : '--'}
                        </div>
                        <div className="idp-review-stars mb-2 d-flex justify-content-center gap-1">
                          {ownerAverageRating !== null ? renderStars(Math.round(ownerAverageRating)) : renderStars(0)}
                        </div>
                        <p className="idp-review-count text-muted small mb-3">
                          {ownerTotalReviews} đánh giá công khai
                        </p>
                        
                        {/* Star progress breakdown chart */}
                        <div className="rating-breakdown border-top pt-3 mt-2">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = ratingBreakdown[star];
                            const percentage = ownerReviews.length > 0 ? (count / ownerReviews.length) * 100 : 0;
                            return (
                              <div key={star} className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '.8rem' }}>
                                <span style={{ width: '12px' }} className="fw-semibold text-dark">{star}</span>
                                <i className="fa fa-star text-warning" style={{ fontSize: '.75rem' }} />
                                <div className="progress flex-grow-1" style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
                                  <div 
                                    className="progress-bar" 
                                    role="progressbar" 
                                    style={{ 
                                      width: `${percentage}%`, 
                                      height: '100%', 
                                      borderRadius: '3px',
                                      background: 'linear-gradient(90deg, #ffb524 0%, #ff8c00 100%)'
                                    }} 
                                    aria-valuenow={percentage} 
                                    aria-valuemin="0" 
                                    aria-valuemax="100"
                                  />
                                </div>
                                <span className="text-muted" style={{ width: '30px', textAlign: 'right', fontSize: '0.75rem' }}>
                                  {ownerReviews.length > 0 ? `${Math.round(percentage)}%` : '0%'}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {!isLoggedIn && (
                          <div className="alert alert-light border mt-4 mb-0 small text-muted py-2" style={{ borderRadius: '10px' }}>
                            <i className="fas fa-lock me-1"></i> Đăng nhập để thuê và gửi đánh giá.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review list + form */}
                    <div className="col-lg-8">
                      <div className="bg-white border border-light-subtle rounded-4 p-4 shadow-sm">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4 pb-2 border-bottom">
                          <div>
                            <h5 className="fw-bold mb-1" id="reviews-header-title">Đánh giá từ người thuê</h5>
                            <span className="text-muted small">Đánh giá được gửi sau khi hoàn thành giao dịch thực tế.</span>
                          </div>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold" style={{ fontSize: '.75rem' }}>
                            {ownerTotalReviews} Nhận xét
                          </span>
                        </div>

                        {reviewLoading && (
                          <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
                              <span className="visually-hidden">Đang tải...</span>
                            </div>
                            <p className="text-muted small mt-2">Đang tải phản hồi...</p>
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

                        {/* Review entry point */}
                        <div className="mt-4 pt-4 border-top">
                          <p className="idp-review-form-title">Bạn muốn đánh giá sau khi thuê?</p>
                          {!isLoggedIn && (
                            <div className="alert alert-light border">
                              <Link to="/login">Đăng nhập</Link> để xem đơn thuê và gửi đánh giá cho đúng đối phương.
                            </div>
                          )}
                          {isLoggedIn && (
                            <div className="alert alert-light border">
                              Đánh giá được gửi từ <Link to="/my-rentals">Đơn thuê của tôi</Link> sau khi đơn hoàn thành, để cả chủ sở hữu và người thuê có thể đánh giá lẫn nhau theo đúng đơn.
                            </div>
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

        {/* ══ MODAL BÁO CÁO SẢN PHẨM ══ */}
        <ReportItemModal
          isOpen={isReportOpen}
          itemId={itemId}
          onClose={() => setIsReportOpen(false)}
        />

      </div>{/* /container */}
    </div>
  );
}

export default ItemDetailPage;
