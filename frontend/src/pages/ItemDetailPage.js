import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api'; 

import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

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
  const [rentalError, setRentalError] = useState('');
  const [rentalSuccess, setRentalSuccess] = useState('');

  // >>> THÊM: State để quản lý việc gửi request
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemId) {
      const fetchItemDetails = async () => {
        setLoading(true);
        try {
          const response = await apiService.getItemDetails(itemId);
          setItem(response.data);
        } catch (err) {
          setError('Không thể tải chi tiết vật phẩm. Vật phẩm có thể không tồn tại hoặc đã bị xóa.');
          console.error(err);
        }
        setLoading(false);
      };
      fetchItemDetails();
    }
  }, [itemId]);

  const handleRentalSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('Vui long dang nhap de thuc hien thue.');
      navigate('/login');
      return;
    }
    setRentalError('');
    setRentalSuccess('');
    setIsSubmitting(true);

    try {
      const rentalResponse = await apiService.createRentalRequest(itemId, startDate, endDate, note);
      const paymentResponse = await apiService.createVNPayUrl(rentalResponse.data._id);

      window.location.href = paymentResponse.data.paymentUrl;
    } catch (err) {
      setRentalError(err.response?.data?.message || 'Khong the tao thanh toan VNPay. Vui long thu lai.');
      setIsSubmitting(false);
    }
  };
  
  const excludeDateIntervals = item?.bookedDates?.map(range => ({
      start: new Date(range.startDate),
      end: new Date(range.endDate)
  })) || [];

  if (loading) return <div className="text-center p-5">Đang tải...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!item) return <div className="text-center p-5">Không tìm thấy vật phẩm.</div>;
  
  const isOwner = isLoggedIn && user && user._id === item.owner._id;

  return (
    <div className="container py-5">
      <div className="row g-5">
        <div className="col-md-6">
          <img 
            src={(item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/600x400.png?text=No+Image'} 
            className="img-fluid rounded" 
            alt={item.name} 
            style={{ width: '100%', objectFit: 'cover' }}
          />
        </div>
        <div className="col-md-6">
          <h1>{item.name}</h1>
          <p className="text-muted">Được cho thuê bởi: <strong>{item.owner.fullName}</strong></p>
          <h3 className="text-primary mb-3">{item.pricePerDay.toLocaleString()} VNĐ/ngày</h3>
          <p>{item.description || "Không có mô tả."}</p>
          <p><strong>Địa chỉ:</strong> {item.address}</p>

          <hr/>
          
          {!isOwner && (
            <div className="bg-light p-4 rounded">
              <h4>Đặt thuê vật phẩm này</h4>
              
              {rentalSuccess && <div className="alert alert-success mt-3">{rentalSuccess}</div>}
              {rentalError && <div className="alert alert-danger mt-3">{rentalError}</div>}

              <form onSubmit={handleRentalSubmit}>
                 <div className="mb-3">
                     <label className="form-label d-block">Chọn khoảng thời gian:</label>
                     <DatePicker
                        selected={startDate}
                        onChange={(dates) => {
                            const [start, end] = dates;
                            setStartDate(start);
                            setEndDate(end);
                        }}
                        startDate={startDate}
                        endDate={endDate}
                        excludeDateIntervals={excludeDateIntervals}
                        selectsRange
                        inline
                        minDate={new Date()}
                        dateFormat="dd/MM/yyyy"
                     />
                     <div className="form-text">
                       Các ngày màu xám đã được người khác thuê.
                     </div>
                 </div>
                 
                 <div className="mb-3">
                    <label htmlFor="note" className="form-label">Ghi chú (tùy chọn):</label>
                    <textarea 
                      className="form-control" 
                      id="note"
                      rows="2"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    ></textarea>
                 </div>

                 {/* >>> SỬA: Thêm thuộc tính `disabled` và thay đổi text của nút */}
                 <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100" 
                    disabled={!startDate || !endDate || isSubmitting}
                 >
                    {isSubmitting ? 'Đang gửi...' : (isLoggedIn ? 'Gửi Yêu Cầu Thuê' : 'Vui lòng đăng nhập để thuê')}
                 </button>
              </form>
            </div>
          )}
          
          {isOwner && (
              <div className="mt-3">
                  <Link to={`/edit-item/${item._id}`} className="btn btn-secondary me-2">Chỉnh sửa</Link>  
              </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ItemDetailPage;