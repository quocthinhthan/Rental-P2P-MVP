import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function VNPayReturnPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const rentalId = searchParams.get('rentalId');
  const responseCode = searchParams.get('responseCode');
  const message = searchParams.get('message');

  const isSuccess = status === 'success';

  return (
    <>
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
          Ket qua thanh toan
        </h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item active text-white">VNPay</li>
        </ol>
      </div>

      <div className="container-fluid bg-light overflow-hidden py-5">
        <div className="container py-5 text-center">
          <div className="row justify-content-center">
            <div className="col-lg-7 wow fadeInUp" data-wow-delay="0.1s">
              <div className="bg-white rounded p-5 shadow-sm">
                <i className={`bi ${isSuccess ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'} display-1`}></i>

                <h2 className="mt-4 mb-3">
                  {isSuccess ? 'Thanh toan ky quy thanh cong' : 'Thanh toan chua thanh cong'}
                </h2>

                <p className="mb-4 text-muted">
                  {isSuccess
                    ? 'Don thue cua ban da duoc chuyen sang trang thai cho Owner xac nhan.'
                    : 'Giao dich VNPay khong thanh cong hoac khong the xac thuc. Ban co the thu thanh toan lai trong My Rentals.'}
                </p>

                {rentalId && (
                  <p className="mb-2">
                    <strong>Ma don thue:</strong> {rentalId}
                  </p>
                )}

                {!isSuccess && responseCode && (
                  <p className="mb-2">
                    <strong>Ma phan hoi VNPay:</strong> {responseCode}
                  </p>
                )}

                {!isSuccess && message && (
                  <div className="alert alert-warning mt-4" role="alert">
                    {message}
                  </div>
                )}

                <div className="d-flex flex-wrap gap-3 justify-content-center mt-4">
                  <Link to="/my-rentals" className="btn btn-primary rounded-pill py-3 px-5">
                    Xem don thue cua toi
                  </Link>
                  <Link to="/shop" className="btn btn-outline-primary rounded-pill py-3 px-5">
                    Tiep tuc xem do thue
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
