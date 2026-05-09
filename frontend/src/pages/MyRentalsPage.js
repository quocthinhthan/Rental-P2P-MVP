import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';

function MyRentalsPage() {
  const [rentals, setRentals] = useState({ asRenter: [], asOwner: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hàm để fetch dữ liệu rentals
  const fetchMyRentals = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyRentals();
      setRentals(response.data);
    } catch (err) {
      setError('Failed to fetch rental data.');
      console.error(err);
    }
    setLoading(false);
  };

  // Gọi API khi component được load
  useEffect(() => {
    fetchMyRentals();
  }, []);

  // Hàm xử lý khi chủ sở hữu bấm nút (Confirm / Reject)
  const handleOwnerAction = async (rentalId, action) => {
    try {
      if (action === 'confirm') {
        await apiService.confirmRental(rentalId);
      } else if (action === 'reject') {
        await apiService.rejectRental(rentalId);
      }
      // Tải lại danh sách sau khi hành động
      fetchMyRentals(); 
    } catch (err) {
      alert(`Failed to ${action} rental.`);
      console.error(err);
    }
  };

  // Hàm xử lý khi người thuê/chủ sở hữu bấm "Complete"
  const handleCompleteRental = async (rentalId) => {
    if (!window.confirm('Are you sure this rental is complete?')) return;
    try {
      await apiService.completeRental(rentalId);
      fetchMyRentals(); // Tải lại danh sách
    } catch (err) {
      alert('Failed to mark rental as complete.');
      console.error(err);
    }
  };


  const handlePayEscrow = async (rentalId) => {
    try {
      const response = await apiService.createVNPayUrl(rentalId);
      window.location.href = response.data.paymentUrl;
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create VNPay payment URL.');
      console.error(err);
    }
  };

  // Component con để render một thẻ rental
  const RentalCard = ({ rental, type }) => {
    
    if (!rental.item) {
      return (
        <div className="card mb-3 wow fadeInUp" data-wow-delay="0.1s">
          <div className="card-body">
            <h5 className="card-title text-danger">Vật phẩm không còn tồn tại</h5>
            <p className="card-text mb-1">
              <small className="text-muted">
                Đơn thuê này (ID: {rental._id}) liên quan đến một vật phẩm đã bị xóa.
              </small>
            </p>
          </div>
        </div>
      );
    }

    // Nếu rental.item tồn tại, render như bình thường
    return (
      <div className="card mb-3 wow fadeInUp" data-wow-delay="0.1s">
        <div className="row g-0">
          <div className="col-md-3">
            <img 
              src={rental.item.mainImage || 'https://via.placeholder.com/150'} 
              className="img-fluid rounded-start" 
              alt={rental.item.name}
              style={{height: '100%', objectFit: 'cover'}}
            />
          </div>
          <div className="col-md-9">
            <div className="card-body">
              <h5 className="card-title">{rental.item.name}</h5>
              <p className="card-text mb-1">
                <small className="text-muted">
                  Từ: {new Date(rental.startDate).toLocaleDateString()} - 
                  Đến: {new Date(rental.endDate).toLocaleDateString()}
                </small>
              </p>
              <p className="card-text mb-1">Tổng tiền: {rental.totalPrice}đ</p>
              <p className="card-text mb-2">
                Trạng thái: <span className={`fw-bold ${rental.status === 'confirmed' ? 'text-success' : rental.status === 'pending_confirmation' ? 'text-warning' : 'text-danger'}`}>
                  {rental.status}
                </span>
              </p>
              <p className="card-text mb-2">
                {type === 'asRenter' ? 'Chủ sở hữu:' : 'Người thuê:'} {rental.counterparty.fullName} ({rental.counterparty.email})
              </p>
              {rental.note && (
                <p className="card-text text-info fst-italic">
                  <strong>Ghi chú:</strong> {rental.note}
                </p>
              )}
              
              {type === 'asRenter' && rental.status === 'pending_payment' && (
                <div className="mt-3">
                  <button
                    onClick={() => handlePayEscrow(rental._id)}
                    className="btn btn-primary"
                  >
                    Thanh toan ky quy qua VNPay
                  </button>
                </div>
              )}

              {/* Hiển thị nút cho Chủ sở hữu (asOwner) */}
              {type === 'asOwner' && rental.status === 'pending_confirmation' && (
                <div className="mt-3">
                  <button 
                    onClick={() => handleOwnerAction(rental._id, 'confirm')} 
                    className="btn btn-success me-2"
                  >
                    Chấp nhận
                  </button>
                  <button 
                    onClick={() => handleOwnerAction(rental._id, 'reject')} 
                    className="btn btn-danger"
                  >
                    Từ chối
                  </button>
                </div>
              )}

              {/* Nút Hoàn thành (cho cả hai bên) */}
              {rental.status === 'confirmed' && (
                  <div className="mt-3">
                  <button 
                    onClick={() => handleCompleteRental(rental._id)} 
                    className="btn btn-info"
                  >
                    Đánh dấu Hoàn thành
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Single Page Header start */}
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">My Rentals</h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item active text-white">My Rentals</li>
        </ol>
      </div>
      {/* Single Page Header End */}

      <div className="container-fluid py-5">
        <div className="container py-5">
          {loading && <div className="text-center">Loading rentals...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          
          {!loading && !error && (
            <div className="row g-5">
              {/* Cột: Đồ tôi thuê (asRenter) */}
              <div className="col-lg-6">
                <h2 className="mb-4">Vật phẩm tôi thuê</h2>
                {rentals.asRenter.length === 0 ? (
                  <p>Bạn chưa thuê vật phẩm nào.</p>
                ) : (
                  rentals.asRenter.map(rental => (
                    <RentalCard key={rental._id} rental={rental} type="asRenter" />
                  ))
                )}
              </div>

              {/* Cột: Đồ của tôi (asOwner) */}
              <div className="col-lg-6">
                <h2 className="mb-4">Vật phẩm của tôi</h2>
                {rentals.asOwner.length === 0 ? (
                  <p>Bạn chưa có yêu cầu thuê nào.</p>
                ) : (
                  rentals.asOwner.map(rental => (
                    <RentalCard key={rental._id} rental={rental} type="asOwner" />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MyRentalsPage;