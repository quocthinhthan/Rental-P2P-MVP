import React from 'react';
import { Link } from 'react-router-dom';

function ContactPage() {
  return (
    <>
      {/* Single Page Header start */}
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">Liên hệ</h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item active text-white">Liên hệ</li>
        </ol>
      </div>
      {/* Single Page Header End */}

      {/* Contact Start */}
      <div className="container-fluid contact py-5">
        <div className="container py-5">
          <div className="p-5 bg-light rounded">
            <div className="row g-4">
              <div className="col-12">
                <div className="text-center mx-auto wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: '900px' }}>
                  <h4 className="text-primary border-bottom border-primary border-2 d-inline-block pb-2">Liên hệ với chúng tôi</h4>
                  <p className="mb-5 fs-5 text-dark">
                    Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn! Nếu có bất kỳ thắc mắc hay góp ý nào, hãy gửi tin nhắn cho chúng tôi.
                  </p>
                </div>
              </div>
              <div className="col-lg-7">
                <h5 className="text-primary wow fadeInUp" data-wow-delay="0.1s">Kết nối</h5>
                <h1 className="display-5 mb-4 wow fadeInUp" data-wow-delay="0.3s">Gửi tin nhắn của bạn</h1>
                <p className="mb-4 wow fadeInUp" data-wow-delay="0.5s">
                  Biểu mẫu liên hệ này hiện đang ở chế độ demo. Chúng tôi sẽ sớm tích hợp hệ thống gửi mail tự động để phản hồi bạn nhanh nhất có thể.
                </p>
                <form>
                  <div className="row g-4 wow fadeInUp" data-wow-delay="0.1s">
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="name" placeholder="Họ tên của bạn" />
                        <label htmlFor="name">Họ tên</label>
                      </div>
                    </div>
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input type="email" className="form-control" id="email" placeholder="Email của bạn" />
                        <label htmlFor="email">Email</label>
                      </div>
                    </div>
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input type="phone" className="form-control" id="phone" placeholder="Số điện thoại" />
                        <label htmlFor="phone">Số điện thoại</label>
                      </div>
                    </div>
                    <div className="col-lg-12 col-xl-6">
                      <div className="form-floating">
                        <input type="text" className="form-control" id="subject" placeholder="Chủ đề" />
                        <label htmlFor="subject">Chủ đề</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-floating">
                        <textarea className="form-control" placeholder="Để lại tin nhắn ở đây" id="message" style={{ height: '160px' }}></textarea>
                        <label htmlFor="message">Tin nhắn</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary w-100 py-3" type="button">Gửi tin nhắn</button>
                    </div>
                  </div>
                </form>
              </div>
              <div className="col-lg-5 wow fadeInUp" data-wow-delay="0.2s">
                <div className="h-100 rounded shadow-sm overflow-hidden" style={{ minHeight: '400px' }}>
                  <iframe 
                    className="w-100 h-100" 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.9544103877597!2d106.69789347573617!3d10.735160259897103!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752fbd714c6a53%3A0x99249697dfc4020d!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBUw7RuIMSQ4bupYyBUaOG6r25n!5e0!3m2!1svi!2s!4v1715354000000!5m2!1svi!2s" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade">
                  </iframe>
                </div>
              </div>
              <div className="col-lg-12">
                <div className="row g-4 align-items-center justify-content-center">
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.1s">
                    <div className="rounded bg-white p-4 shadow-sm text-center">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '70px', height: '70px' }}>
                        <i className="fas fa-map-marker-alt fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Địa chỉ</h4>
                        <p className="mb-2">19 Nguyễn Hữu Thọ, Tân Phong, Quận 7, TP.HCM</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.3s">
                    <div className="rounded bg-white p-4 shadow-sm text-center">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '70px', height: '70px' }}>
                        <i className="fas fa-envelope fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Email</h4>
                        <p className="mb-2">support@renthub.vn</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.5s">
                    <div className="rounded bg-white p-4 shadow-sm text-center">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '70px', height: '70px' }}>
                        <i className="fa fa-phone-alt fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Điện thoại</h4>
                        <p className="mb-2">(+84) 123 456 789</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-6 col-xl-3 wow fadeInUp" data-wow-delay="0.7s">
                    <div className="rounded bg-white p-4 shadow-sm text-center">
                      <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '70px', height: '70px' }}>
                        <i className="fab fa-facebook-messenger fa-2x text-primary"></i>
                      </div>
                      <div>
                        <h4>Fanpage</h4>
                        <p className="mb-2">fb.com/renthub.vn</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Contact End */}
    </>
  );
}

export default ContactPage;
