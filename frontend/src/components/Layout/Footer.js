import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <>
      {/* Footer Start */}
      <div
        className="container-fluid footer py-5 wow fadeIn"
        data-wow-delay="0.2s"
      >
        <div className="container py-5">
          {/* Top Info */}
          <div
            className="row g-4 rounded mb-5"
            style={{ background: 'rgba(255, 255, 255, .03)' }}
          >
            {/* Address */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="rounded p-4">
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                  style={{ width: '70px', height: '70px' }}
                >
                  <i className="fas fa-map-marker-alt fa-2x text-primary"></i>
                </div>

                <div>
                  <h4 className="text-white">Địa chỉ</h4>
                  <p className="mb-2">
                    19 Nguyễn Hữu Thọ, P. Tân Hưng, TP.HCM
                  </p>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="rounded p-4">
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                  style={{ width: '70px', height: '70px' }}
                >
                  <i className="fas fa-envelope fa-2x text-primary"></i>
                </div>

                <div>
                  <h4 className="text-white">Email</h4>
                  <p className="mb-2">
                    thanquocthinh287@gmail.com
                  </p>
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="rounded p-4">
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                  style={{ width: '70px', height: '70px' }}
                >
                  <i className="fa fa-phone-alt fa-2x text-primary"></i>
                </div>

                <div>
                  <h4 className="text-white">Điện thoại</h4>
                  <p className="mb-2">0364123957</p>
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="rounded p-4">
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                  style={{ width: '70px', height: '70px' }}
                >
                  <i className="fab fa-firefox-browser fa-2x text-primary"></i>
                </div>

                <div>
                  <h4 className="text-white">Website</h4>
                  <p className="mb-2">rentalp2p.com.vn</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Content */}
          <div className="row g-5">
            {/* About */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">RentalP2P</h4>

                <p className="mb-3 text-white">
                  Nền tảng cho thuê đồ dùng cá nhân theo mô hình P2P,
                  giúp người dùng dễ dàng cho thuê và tìm kiếm các vật dụng cần thiết
                  nhanh chóng và tiện lợi.
                </p>
              </div>
            </div>

            {/* Customer Service */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">
                  Chăm sóc khách hàng
                </h4>

                <Link to="/contact">
                  <i className="fas fa-angle-right me-2"></i>
                  Liên hệ
                </Link>

                <Link to="/orders">
                  <i className="fas fa-angle-right me-2"></i>
                  Lịch sử đơn thuê
                </Link>

                <Link to="/faq">
                  <i className="fas fa-angle-right me-2"></i>
                  Câu hỏi thường gặp
                </Link>

                <Link to="/account">
                  <i className="fas fa-angle-right me-2"></i>
                  Tài khoản của tôi
                </Link>
              </div>
            </div>

            {/* Information */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">Thông tin</h4>

                <Link to="/about">
                  <i className="fas fa-angle-right me-2"></i>
                  Về chúng tôi
                </Link>

                <Link to="/privacy-policy">
                  <i className="fas fa-angle-right me-2"></i>
                  Chính sách bảo mật
                </Link>

                <Link to="/terms">
                  <i className="fas fa-angle-right me-2"></i>
                  Điều khoản sử dụng
                </Link>

                <Link to="/guide">
                  <i className="fas fa-angle-right me-2"></i>
                  Hướng dẫn thuê đồ
                </Link>
              </div>
            </div>

            {/* Extras */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">Khám phá thêm</h4>

                <Link to="/categories">
                  <i className="fas fa-angle-right me-2"></i>
                  Danh mục sản phẩm
                </Link>

                <Link to="/wishlist">
                  <i className="fas fa-angle-right me-2"></i>
                  Danh sách yêu thích
                </Link>

                <Link to="/tracking">
                  <i className="fas fa-angle-right me-2"></i>
                  Theo dõi đơn thuê
                </Link>

                <Link to="/become-owner">
                  <i className="fas fa-angle-right me-2"></i>
                  Đăng cho thuê sản phẩm
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer End */}

      {/* Copyright Start */}
      <div className="container-fluid copyright py-4">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-md-6 text-center text-md-start mb-md-0">
              <span className="text-white">
                <Link to="/" className="border-bottom text-white">
                  <i className="fas fa-copyright text-light me-2"></i>
                  RentalP2P
                </Link>
                , Bản quyền đã được bảo lưu.
              </span>
            </div>

            <div className="col-md-6 text-center text-md-end text-white">
              Thiết kế và phát triển bởi RentalP2P.
            </div>
          </div>
        </div>
      </div>
      {/* Copyright End */}

      {/* Back To Top */}
      <a
        href="#"
        className="btn btn-primary btn-lg-square back-to-top"
      >
        <i className="fa fa-arrow-up"></i>
      </a>
    </>
  );
}

export default Footer;