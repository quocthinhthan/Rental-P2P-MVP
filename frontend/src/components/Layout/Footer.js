import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <>
      {/* Footer Start */}
      <div
        className="container-fluid footer pt-5 pb-4 wow fadeIn"
        data-wow-delay="0.2s"
      >
        <div className="container">
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

                {/* Compact Contact Info List */}
                <div className="footer-contact-info mt-3 d-flex flex-column gap-2 text-white-50">
                  <div className="d-flex align-items-center gap-2 small">
                    <i className="fas fa-map-marker-alt text-primary" style={{ width: '16px' }}></i>
                    <span>19 Nguyễn Hữu Thọ, P. Tân Hưng, TP.HCM</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 small">
                    <i className="fas fa-envelope text-primary" style={{ width: '16px' }}></i>
                    <span>thanquocthinh287@gmail.com</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 small">
                    <i className="fas fa-phone-alt text-primary" style={{ width: '16px' }}></i>
                    <span>0364123957</span>
                  </div>
                </div>
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

                <Link to="/my-rentals">
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

                <Link to="/help">
                  <i className="fas fa-angle-right me-2"></i>
                  Chính sách bảo mật
                </Link>

                <Link to="/help">
                  <i className="fas fa-angle-right me-2"></i>
                  Điều khoản sử dụng
                </Link>

                <Link to="/help">
                  <i className="fas fa-angle-right me-2"></i>
                  Hướng dẫn thuê đồ
                </Link>
              </div>
            </div>

            {/* Extras */}
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">Khám phá thêm</h4>

                <Link to="/shop">
                  <i className="fas fa-angle-right me-2"></i>
                  Danh mục sản phẩm
                </Link>

                <Link to="/favorites">
                  <i className="fas fa-angle-right me-2"></i>
                  Danh sách yêu thích
                </Link>

                <Link to="/my-rentals">
                  <i className="fas fa-angle-right me-2"></i>
                  Theo dõi đơn thuê
                </Link>

                <Link to="/post-item">
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
      <div className="container-fluid copyright py-3">
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
    </>
  );
}

export default Footer;