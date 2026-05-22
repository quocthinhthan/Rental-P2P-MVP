import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function VNPayReturnPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const rentalId = searchParams.get('rentalId');
  const rentalCode = searchParams.get('rentalCode');
  const responseCode = searchParams.get('responseCode');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';
  const isRefunded = status === 'refunded';

  return (
    <>
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          Kết quả thanh toán
        </h1>

        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item">
            <Link to="/">Trang chủ</Link>
          </li>
          <li className="breadcrumb-item active text-white">
            VNPay
          </li>
        </ol>
      </div>

      <div className="container-fluid bg-light overflow-hidden py-5">
        <div className="container py-5 text-center">
          <div className="row justify-content-center">
            <div className="col-lg-7 wow fadeInUp" data-wow-delay="0.1s">
              <div className="bg-white rounded p-5 shadow-sm">
                <i
                  className={`bi ${
                    isSuccess || isRefunded
                      ? 'bi-check-circle text-success'
                      : 'bi-x-circle text-danger'
                  } display-1`}
                ></i>

                <h2 className="mt-4 mb-3">
                  {isSuccess
                    ? 'Thanh toán ký quỹ thành công'
                    : isRefunded
                      ? 'Đơn đã được hoàn tiền'
                      : 'Thanh toán chưa thành công'}
                </h2>

                <p className="mb-4 text-muted">
                  {isSuccess
                    ? 'Đơn thuê của bạn đã được chuyển sang trạng thái chờ chủ cửa hàng xác nhận.'
                    : isRefunded
                      ? 'Lịch thuê vừa được giữ bởi đơn khác hoặc sản phẩm không còn khả dụng. Hệ thống đã đánh dấu hoàn tiền cho đơn này.'
                      : 'Giao dịch VNPay không thành công hoặc không thể xác thực. Bạn có thể thử thanh toán lại trong mục Đơn thuê của tôi.'}
                </p>

                {rentalId && (
                  <p className="mb-2">
                    <strong>Mã đơn thuê:</strong> {rentalCode || rentalId}
                  </p>
                )}

                {!isSuccess && !isRefunded && responseCode && (
                  <p className="mb-2">
                    <strong>Mã phản hồi VNPay:</strong> {responseCode}
                  </p>
                )}

                {!isSuccess && message && (
                  <div className="alert alert-warning mt-4" role="alert">
                    {message}
                  </div>
                )}

                <div className="d-flex flex-wrap gap-3 justify-content-center mt-4">
                  <Link
                    to="/my-rentals"
                    className="btn btn-primary rounded-pill py-3 px-5"
                  >
                    Xem đơn thuê của tôi
                  </Link>

                  <Link
                    to="/shop"
                    className="btn btn-outline-primary rounded-pill py-3 px-5"
                  >
                    Tiếp tục xem đồ thuê
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default VNPayReturnPage;
