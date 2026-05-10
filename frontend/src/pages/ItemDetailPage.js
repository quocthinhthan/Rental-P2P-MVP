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
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

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

  if (loading) return <div className="text-center p-5">Đang tải...</div>;
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
                          <span className="fst-italic text-warning bg-warning bg-opacity-10 px-2 py-1 rounded">
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
                        <div className="mb-5">
                          <h5 className="mb-4 fw-bold">Đánh giá từ khách hàng</h5>
                          <div className="d-flex mb-4 pb-4 border-bottom">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '60px', height: '60px', minWidth: '60px' }}>
                              <i className="fas fa-user"></i>
                            </div>
                            <div>
                              <p className="mb-1 text-muted small">10/05/2026</p>
                              <h6 className="mb-2">Nguyễn Văn A</h6>
                              <div className="d-flex mb-2">
                                {[1,2,3,4,5].map(i => (
                                  <i key={i} className={`fa fa-star ${i <= 4 ? 'text-warning' : 'text-muted'}`}></i>
                                ))}
                              </div>
                              <p className="mb-0">Vật phẩm đúng mô tả, chủ sở hữu phản hồi nhanh và giao nhận thuận tiện.</p>
                            </div>
                          </div>
                        </div>

                        <form className="mt-4">
                          <h5 className="mb-4 fw-bold">Viết đánh giá của bạn</h5>
                          <div className="row g-3 mb-4">
                            <div className="col-lg-6">
                              <input
                                type="text"
                                className="form-control border-0 border-bottom shadow-sm"
                                placeholder="Họ tên *"
                                value={reviewName}
                                onChange={(e) => setReviewName(e.target.value)}
                              />
                            </div>
                            <div className="col-lg-6">
                              <input
                                type="email"
                                className="form-control border-0 border-bottom shadow-sm"
                                placeholder="Email *"
                                value={reviewEmail}
                                onChange={(e) => setReviewEmail(e.target.value)}
                              />
                            </div>
                            <div className="col-lg-12">
                              <label className="form-label fw-bold small mb-2">Đánh giá</label>
                              <div className="d-flex gap-2 mb-3">
                                {[1,2,3,4,5].map(i => (
                                  <i
                                    key={i}
                                    className={`fa fa-star fa-2x ${i <= reviewRating ? 'text-warning' : 'text-muted'}`}
                                    onClick={() => setReviewRating(i)}
                                    style={{ cursor: 'pointer' }}
                                  ></i>
                                ))}
                              </div>
                            </div>
                            <div className="col-lg-12">
                              <textarea
                                className="form-control border-0 border-bottom shadow-sm"
                                rows="5"
                                placeholder="Nội dung đánh giá *"
                                value={reviewContent}
                                onChange={(e) => setReviewContent(e.target.value)}
                              ></textarea>
                            </div>
                            <div className="col-lg-12">
                              <button type="button" className="btn btn-primary rounded-pill px-5 py-2">
                                <i className="fas fa-send me-2"></i>Gửi đánh giá
                              </button>
                            </div>
                          </div>
                        </form>
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