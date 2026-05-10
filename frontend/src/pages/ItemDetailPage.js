import React, { useState, useEffect, forwardRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api'; 
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/CustomDetail.css';

function ItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedItems, setRelatedItems] = useState([]);
  const [ownerReviews, setOwnerReviews] = useState([]);
  const [ownerTrustScore, setOwnerTrustScore] = useState(null);
  const [ownerTotalReviews, setOwnerTotalReviews] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [eligibleRental, setEligibleRental] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState('');
  const [reviewSubmitError, setReviewSubmitError] = useState('');

  // CUSTOM DATEPICKER INPUT
  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <div className="position-relative w-100" onClick={onClick} ref={ref}>
      <input
        className="form-control custom-date-input shadow-sm border-0"
        value={value || "Chọn ngày thuê (Bắt đầu - Kết thúc)"}
        readOnly
        style={{ height: '50px', borderRadius: '10px' }}
      />
      <i className="fa fa-calendar-alt position-absolute" style={{right: '20px', top: '15px', color: '#ffb524'}}></i>
    </div>
  ));

  // Fetch item data and related products
  useEffect(() => {
    if (itemId) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [detailRes, relatedRes] = await Promise.all([
            apiService.getItemDetails(itemId),
            apiService.getItems('')
          ]);
          setItem(detailRes.data);
          const allItems = Array.isArray(relatedRes.data) ? relatedRes.data : (relatedRes.data?.items || []);
          setRelatedItems(allItems.filter(i => String(i._id) !== String(itemId)).slice(0, 4));
        } catch (err) {
          setError('Không thể tải dữ liệu.');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [itemId]);

  useEffect(() => {
    const ownerId = item?.owner?._id;

    if (!ownerId) {
      return;
    }

    const fetchOwnerReviews = async () => {
      setReviewLoading(true);
      setReviewError(null);

      try {
        const response = await apiService.getUserReviews(ownerId, 1, 5);
        setOwnerTrustScore(response.data.trustScore);
        setOwnerTotalReviews(response.data.totalReviews || 0);
        setOwnerReviews(response.data.reviews || []);
      } catch (err) {
        setReviewError('Không thể tải đánh giá của chủ vật dụng.');
      } finally {
        setReviewLoading(false);
      }
    };

    fetchOwnerReviews();
  }, [item?.owner?._id]);

  useEffect(() => {
    if (!isLoggedIn || !item?._id) {
      setEligibleRental(null);
      return;
    }

    const fetchEligibleRental = async () => {
      try {
        const response = await apiService.getMyRentals();
        const rentals = [
          ...(response.data?.asRenter || []),
          ...(response.data?.asOwner || [])
        ];

        const matchedRental = rentals.find((rental) =>
          String(rental.item?._id) === String(item._id) && rental.status === 'completed'
        );

        setEligibleRental(matchedRental || null);
      } catch (err) {
        setEligibleRental(null);
      }
    };

    fetchEligibleRental();
  }, [isLoggedIn, item?._id]);

  useEffect(() => {
    const activateReviewTab = () => {
      if (window.location.hash === '#nav-review') {
        document.querySelector('button[data-bs-target="#nav-review"]')?.click();
      }
    };

    activateReviewTab();
    window.addEventListener('hashchange', activateReviewTab);

    return () => window.removeEventListener('hashchange', activateReviewTab);
  }, [itemId]);

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

  const excludeDates = item?.bookedDates?.map(range => ({
      start: new Date(range.startDate),
      end: new Date(range.endDate)
  })) || [];

  const renderStars = (rating) => [1, 2, 3, 4, 5].map((star) => (
    <i key={star} className={`fa fa-star ${star <= rating ? 'text-warning' : 'text-muted'}`}></i>
  ));

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!eligibleRental?._id) {
      setReviewSubmitError('Bạn chỉ có thể đánh giá sau khi có đơn thuê hoàn thành cho sản phẩm này.');
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

      // Refetch owner reviews to show the newly submitted review
      if (item?.owner?._id) {
        try {
          const response = await apiService.getUserReviews(item.owner._id, 1, 5);
          setOwnerTrustScore(response.data.trustScore);
          setOwnerTotalReviews(response.data.totalReviews || 0);
          setOwnerReviews(response.data.reviews || []);
        } catch (err) {
          console.error('Không thể cập nhật danh sách đánh giá:', err);
        }
      }
    } catch (err) {
      setReviewSubmitError(err.response?.data?.message || 'Không thể gửi đánh giá.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-5">Đang tải...</div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (!item) return <div className="alert alert-warning">Vật phẩm không tồn tại.</div>;

  const isOwner = isLoggedIn && user?._id === item.owner._id;

  return (
    <div className="container-fluid py-4 mt-4">
      <div className="container py-5">
        <div className="row g-4 mb-5">
          {/* CỘT TRÁI: ẢNH SẢN PHẨM */}
          <div className="col-lg-6">
            <div className="product-image-container sticky-top" style={{ top: '100px' }}>
              <div className="border rounded-4 overflow-hidden shadow-sm">
                <img 
                  src={item.images?.[0] || 'https://via.placeholder.com/600'} 
                  className="img-fluid w-100" 
                  alt={item.name} 
                  style={{ maxHeight: '500px', objectFit: 'cover' }}
                />
              </div>
              <div className="d-flex gap-2 mt-3">
                {item.images?.slice(1, 5).map((img, idx) => (
                  <img key={idx} src={img} className="img-fluid rounded border shadow-sm" style={{width: '80px', height: '80px', cursor: 'pointer', objectFit: 'cover'}} alt="sub-img" />
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN VÀ ĐẶT LỊCH */}
          <div className="col-lg-6">
            <h2 className="fw-bold mb-2">{item.name}</h2>
            <div className="d-flex align-items-center mb-3">
               <span className="badge bg-secondary me-2">{item.category || 'Vật phẩm'}</span>
               <span className="text-muted small">Mã: {item._id.slice(-6).toUpperCase()}</span>
            </div>
            
            <h3 className="text-primary fw-bold mb-4">
                {item.pricePerDay.toLocaleString()} VNĐ 
                <small className="text-muted fw-normal" style={{fontSize: '14px'}}> / ngày</small>
            </h3>
            
            {/* Box Đặt Lịch & Chủ sở hữu (ĐÃ CẬP NHẬT) */}
            <div className="card border-0 shadow bg-white rounded-4 overflow-hidden mb-4">
              {/* NỬA TRÊN: FORM ĐẶT LỊCH */}
              <div className="p-4 p-md-5 bg-light border-bottom">
                {!isOwner ? (
                  <>
                    <h5 className="mb-4 fw-bold text-dark">
                      <i className="fas fa-calendar-check text-primary me-2"></i>Thông tin thuê vật dụng
                    </h5>
                    <form onSubmit={handleRentalSubmit}>
                      <div className="mb-4">
                        <label className="form-label fw-bold small text-muted text-uppercase mb-2 d-block">
                          Thời gian thuê
                        </label>

                        <div className="mt-2">
                          <DatePicker
                            selected={startDate}
                            onChange={(dates) => {
                              const [start, end] = dates;
                              setStartDate(start);
                              setEndDate(end);
                            }}
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
                          Ghi chú cho chủ vật dụng (Tùy chọn)
                        </label>

                        <textarea
                          className="form-control border-0 shadow-sm rounded-3 p-3"
                          rows="3"
                          placeholder="Ví dụ: Tôi sẽ đến lấy đồ lúc 8h sáng ngày đầu tiên..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        ></textarea>
                      </div>

                      <button
                        className="btn btn-primary w-100 py-3 rounded-pill fw-bold text-white shadow-sm"
                        disabled={!startDate || !endDate || isSubmitting}
                        style={{ fontSize: '1.1rem' }}
                      >
                        {isSubmitting ? (
                          <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : (
                          <i className="fas fa-handshake me-2"></i>
                        )}

                        GỬI YÊU CẦU THUÊ
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="alert alert-info border-0 rounded-4 text-center mb-0 shadow-sm py-4">
                    <div className="bg-white rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow-sm" style={{width: '60px', height: '60px'}}>
                        <i className="fas fa-box-open fa-2x text-info"></i>
                    </div>
                    <h5 className="fw-bold text-dark">Vật dụng của bạn</h5>
                    <p className="mb-0 text-muted small">Bạn đang xem giao diện chi tiết vật dụng do chính bạn đăng tải.</p>
                  </div>
                )}
              </div>

              {/* NỬA DƯỚI: THÔNG TIN CHỦ SỞ HỮU */}
              <div className="p-4 p-md-5 bg-white">
                <h6 className="fw-bold mb-4 text-uppercase small text-muted" style={{ letterSpacing: '1px' }}>
                  Được cho thuê bởi
                </h6>
                
                <div className="d-flex align-items-center">
                  {/* Avatar có tích xanh */}
                  <div className="position-relative">
                    <img 
                      src={item.owner?.avatarUrl || 'https://thanquocthinh.id.vn/_next/image?url=%2Favatar.jpg&w=384&q=75'} 
                      className="rounded-circle shadow-sm border border-2 border-white" 
                      style={{ width: '75px', height: '75px', objectFit: 'cover' }} 
                      alt={item.owner?.fullName || 'Avatar'} 
                    />
                    <span 
                      className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle d-flex align-items-center justify-content-center" 
                      style={{ width: '24px', height: '24px' }}
                    >
                      <i className="fas fa-check text-white" style={{ fontSize: '10px' }}></i>
                    </span>
                  </div>  
                  
                  {/* Chi tiết liên hệ */}
                  <div className="ms-4 flex-grow-1">
                    <h5 className="mb-2 fw-bold text-dark">{item.owner?.fullName || 'Người dùng ẩn danh'}</h5>
                    
                    <div className="d-flex flex-column gap-2 mt-2">
                      <div className="d-flex align-items-center text-muted small">
                        <i className="fas fa-map-marker-alt text-primary opacity-75 me-2 text-center" style={{ width: '16px' }}></i> 
                        <span>{item.address || item.owner?.address || 'Chưa cập nhật địa chỉ'}</span>
                      </div>
                      
                      <div className="d-flex align-items-center text-muted small">
                        <i className="fas fa-phone-alt text-success opacity-75 me-2 text-center" style={{ width: '16px' }}></i> 
                        {isLoggedIn ? (
                          <span className="fw-medium text-dark">{item.owner?.phoneNumber || 'Chưa cập nhật SĐT'}</span>
                        ) : (
                          <span className="fst-italic text-white bg-warning bg-opacity-10 px-2 py-1 rounded">
                            <i className="fas fa-lock me-1"></i>Đăng nhập để xem
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PHẦN DƯỚI: MÔ TẢ & ĐÁNH GIÁ */}
        <div className="row">
            <div className="col-12">
                <nav>
                    <div className="nav nav-tabs border-bottom-0" id="nav-tab" role="tablist">
                        <button className="nav-link active border-0 fw-bold px-4 py-3" data-bs-toggle="tab" data-bs-target="#nav-desc">Mô tả chi tiết</button>
                        <button className="nav-link border-0 fw-bold px-4 py-3" data-bs-toggle="tab" data-bs-target="#nav-review">Đánh giá</button>
                    </div>
                </nav>
                <div className="tab-content bg-light p-4 rounded-3 shadow-sm mb-5">
                    <div className="tab-pane fade show active" id="nav-desc">
                        <p style={{lineHeight: '1.8'}}>{item.description || "Chưa có mô tả chi tiết cho sản phẩm này."}</p>
                    </div>
                    <div className="tab-pane fade" id="nav-review">
                        <div className="row g-4">
                          <div className="col-lg-4">
                            <div className="bg-white border rounded-4 p-4 shadow-sm h-100">
                              <h5 className="fw-bold mb-3">Tổng quan đánh giá</h5>
                              <div className="display-6 fw-bold text-primary mb-2">
                                {ownerTrustScore !== null ? ownerTrustScore.toFixed(1) : '--'}
                              </div>
                              <div className="d-flex align-items-center mb-2">
                                {ownerTrustScore !== null ? renderStars(Math.round(ownerTrustScore)) : renderStars(0)}
                              </div>
                              <p className="text-muted mb-0">
                                {ownerTotalReviews} đánh giá công khai từ cộng đồng thuê.
                              </p>
                              {!isLoggedIn && (
                                <div className="alert alert-light border mt-3 mb-0 small">
                                  Đăng nhập để thuê và gửi đánh giá cho đơn hàng đã hoàn thành.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="col-lg-8">
                            <div className="bg-white border rounded-4 p-4 shadow-sm">
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                                <h5 className="fw-bold mb-0">Đánh giá từ người thuê</h5>
                                <span className="text-muted small">Chỉ hiển thị đánh giá công khai của chủ vật dụng.</span>
                              </div>

                              {reviewLoading && (
                                <div className="text-center py-4">
                                  <div className="spinner-border text-primary" role="status"></div>
                                </div>
                              )}

                              {!reviewLoading && reviewError && (
                                <div className="alert alert-warning mb-0">{reviewError}</div>
                              )}

                              {!reviewLoading && !reviewError && ownerReviews.length === 0 && (
                                <div className="alert alert-light border mb-0">
                                  Chưa có đánh giá nào cho chủ vật dụng này.
                                </div>
                              )}

                              {!reviewLoading && !reviewError && ownerReviews.length > 0 && (
                                <div className="d-flex flex-column gap-4">
                                  {ownerReviews.map((review) => (
                                    <div key={review._id} className="d-flex pb-4 border-bottom">
                                      <img
                                        src={review.reviewerId?.avatarUrl || 'https://via.placeholder.com/64'}
                                        alt={review.reviewerId?.fullName || 'Người đánh giá'}
                                        className="rounded-circle me-3"
                                        style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                                      />
                                      <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between flex-wrap gap-2">
                                          <h6 className="mb-1">{review.reviewerId?.fullName || 'Người dùng ẩn danh'}</h6>
                                          <span className="text-muted small">
                                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                          </span>
                                        </div>

                                        <div className="d-flex mb-2">{renderStars(review.rating)}</div>

                                        {review.comment ? (
                                          <p className="mb-0">{review.comment}</p>
                                        ) : (
                                          <p className="mb-0 text-muted fst-italic">Không có nội dung đánh giá.</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                                  <div className="mt-4 pt-4 border-top">
                                    <h5 className="fw-bold mb-3">Viết đánh giá của bạn</h5>

                                    {!isLoggedIn && (
                                      <div className="alert alert-light border mb-0">
                                        Đăng nhập để gửi đánh giá.
                                      </div>
                                    )}

                                    {isLoggedIn && !eligibleRental && (
                                      <div className="alert alert-light border mb-3">
                                        Chỉ có thể đánh giá khi bạn đã có đơn thuê hoàn thành cho sản phẩm này.
                                      </div>
                                    )}

                                    {isLoggedIn && eligibleRental && (
                                      <form onSubmit={handleReviewSubmit}>
                                        <div className="mb-3">
                                          <label className="form-label fw-bold small text-uppercase text-muted mb-2 d-block">
                                            Đánh giá
                                          </label>
                                          <div className="d-flex gap-2 flex-wrap">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                type="button"
                                                className="btn btn-link p-0 text-decoration-none"
                                                onClick={() => setReviewRating(star)}
                                                aria-label={`Đánh giá ${star} sao`}
                                              >
                                                <i className={`fa fa-star fa-lg ${star <= reviewRating ? 'text-warning' : 'text-muted'}`}></i>
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="mb-3">
                                          <label className="form-label fw-bold small text-uppercase text-muted mb-2 d-block">
                                            Nội dung đánh giá
                                          </label>
                                          <textarea
                                            className="form-control border-0 shadow-sm rounded-3 p-3"
                                            rows="4"
                                            placeholder="Chia sẻ trải nghiệm thuê của bạn..."
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                          ></textarea>
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
                </div>
            </div>
        </div>

        {/* Sản phẩm liên quan */}
        <div className="related-items mt-5">
            <h4 className="fw-bold mb-4">Có thể bạn quan tâm</h4>
            <div className="row g-4">
                {relatedItems.map(rItem => (
                    <div key={rItem._id} className="col-md-3">
                        <div className="card border-0 shadow-sm h-100 rounded-3 overflow-hidden">
                            <img src={rItem.mainImage || 'https://via.placeholder.com/300'} className="card-img-top" style={{height: '180px', objectFit: 'cover'}} alt={rItem.name} />
                            <div className="card-body p-3 text-center">
                                <Link to={`/items/${rItem._id}`} className="h6 d-block text-dark text-decoration-none text-truncate">{rItem.name}</Link>
                                <p className="text-primary fw-bold mb-0">{rItem.pricePerDay.toLocaleString()} VNĐ</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default ItemDetailPage;