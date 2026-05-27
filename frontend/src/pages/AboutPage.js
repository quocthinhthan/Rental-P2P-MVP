import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AboutPage.css';

function AboutPage() {
  return (
    <div className="about-page">
      {/* ══ HERO SECTION ═══════════════════════════════════════════════════ */}
      <section className="about-hero" aria-label="Giới thiệu về chúng tôi">
        <div className="about-hero__inner">
          <div className="about-hero__badge">
            <i className="fas fa-handshake" aria-hidden="true" />
            Về chúng tôi
          </div>
          <h1 className="about-hero__title">
            Kết Nối Cộng Đồng <br />
            <span className="about-hero__title-accent">Kiến Tạo Nền Kinh Tế Chia Sẻ</span>
          </h1>
          <p className="about-hero__sub">
            RentalP2P là nền tảng cho thuê đồ dùng cá nhân ngang hàng hàng đầu, giúp bạn tối ưu hóa tài nguyên cá nhân và tận hưởng cuộc sống tiện ích, tiết kiệm.
          </p>
          <div className="about-hero__actions">
            <Link to="/shop" className="about-hero__btn about-hero__btn--primary">
              Khám phá ngay <i className="fas fa-arrow-right ms-2" />
            </Link>
            <Link to="/help" className="about-hero__btn about-hero__btn--secondary">
              Tìm hiểu cách hoạt động
            </Link>
          </div>
        </div>
      </section>

      {/* ══ BREADCRUMB ════════════════════════════════════════════════════ */}
      <div className="about-breadcrumb-wrap">
        <div className="about-container">
          <ol className="about-breadcrumb" aria-label="Đường dẫn">
            <li>
              <Link to="/">Trang chủ</Link>
            </li>
            <li>
              <span className="about-breadcrumb__active">Về chúng tôi</span>
            </li>
          </ol>
        </div>
      </div>

      {/* ══ MISSION & VISION & VALUES ═══════════════════════════════════════ */}
      <section className="about-pillars">
        <div className="about-container">
          <div className="about-section-header">
            <span className="about-section-label">Giá trị cốt lõi</span>
            <h2 className="about-section-title">Định hướng của RentalP2P</h2>
            <p className="about-section-sub">Chúng tôi tin tưởng vào sức mạnh của sự kết nối và phát triển bền vững.</p>
          </div>

          <div className="about-pillars__grid">
            {/* Card 1: Sứ mệnh */}
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon bg-orange-light text-orange">
                <i className="fas fa-bullseye" />
              </div>
              <h3 className="about-pillar-card__title">Sứ mệnh của chúng tôi</h3>
              <p className="about-pillar-card__text">
                Kiến tạo một cộng đồng tiêu dùng thông thái thông qua mô hình kinh tế chia sẻ. Giúp mọi cá nhân dễ dàng tăng thêm thu nhập từ tài sản nhàn rỗi, đồng thời tiết kiệm tối đa chi phí mua sắm vật dụng không thường xuyên sử dụng.
              </p>
            </div>

            {/* Card 2: Tầm nhìn */}
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon bg-blue-light text-blue">
                <i className="fas fa-eye" />
              </div>
              <h3 className="about-pillar-card__title">Tầm nhìn chiến lược</h3>
              <p className="about-pillar-card__text">
                Trở thành nền tảng cho thuê đồ dùng cá nhân ngang hàng (P2P) an toàn, đáng tin cậy và phổ biến nhất tại Việt Nam. Tiên phong thiết lập chuẩn mực giao dịch minh bạch, thân thiện và hướng tới mục tiêu giảm thiểu rác thải tiêu dùng vì môi trường xanh.
              </p>
            </div>

            {/* Card 3: Giá trị */}
            <div className="about-pillar-card">
              <div className="about-pillar-card__icon bg-green-light text-green">
                <i className="fas fa-shield-alt" />
              </div>
              <h3 className="about-pillar-card__title">Giá trị cốt lõi</h3>
              <p className="about-pillar-card__text">
                <strong>An toàn tối đa:</strong> Xác thực danh tính thông minh (eKYC) kết hợp Hợp đồng điện tử ký số.<br />
                <strong>Tiện lợi vượt trội:</strong> Giao diện trực quan, quy trình tinh giản.<br />
                <strong>Cộng đồng tử tế:</strong> Hệ thống chấm điểm uy tín TrustScore văn minh.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS SECTION ═══════════════════════════════════════════════════ */}
      <section className="about-stats">
        <div className="about-container">
          <div className="about-stats__grid">
            <div className="about-stat-item">
              <span className="about-stat-item__number">10K+</span>
              <span className="about-stat-item__label">Người dùng tin dùng</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-item__number">5K+</span>
              <span className="about-stat-item__label">Thiết bị, vật dụng đa dạng</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-item__number">20K+</span>
              <span className="about-stat-item__label">Lượt thuê thành công</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-item__number">98%</span>
              <span className="about-stat-item__label">Đánh giá 5 sao hài lòng</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECURITY & SYSTEM PILLARS ═══════════════════════════════════════ */}
      <section className="about-security">
        <div className="about-container">
          <div className="about-security__wrapper">
            <div className="about-security__image-panel">
              <div className="security-card">
                <div className="security-card__header">
                  <div className="security-card__badge">Xác thực chính chủ</div>
                  <h4 className="security-card__title">Hệ thống an ninh tích hợp</h4>
                </div>
                <div className="security-card__body">
                  <div className="security-feature-item">
                    <i className="fas fa-id-card text-orange" />
                    <span><strong>eKYC CCCD:</strong> Đối chiếu trực tiếp thông tin cư dân quốc gia.</span>
                  </div>
                  <div className="security-feature-item">
                    <i className="fas fa-file-signature text-orange" />
                    <span><strong>Hợp đồng ký số:</strong> Ràng buộc pháp lý điện tử chặt chẽ.</span>
                  </div>
                  <div className="security-feature-item">
                    <i className="fas fa-star text-orange" />
                    <span><strong>Hệ số TrustScore:</strong> Điểm tin cậy cập nhật theo từng giao dịch.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-security__text-panel">
              <span className="about-section-label">Đảm bảo an toàn tuyệt đối</span>
              <h2 className="about-section-title">Tại sao bạn nên chọn RentalP2P?</h2>
              <p className="about-security__desc">
                Chúng tôi không chỉ là một nền tảng kết nối, mà còn là người bảo vệ uy tín cho mỗi giao dịch thuê đồ của bạn. Mọi quy trình đều được chuẩn hóa nghiêm ngặt.
              </p>

              <div className="about-feature-list">
                <div className="about-feature-box">
                  <span className="about-feature-box__num">01</span>
                  <div>
                    <h4 className="about-feature-box__title">Thanh toán ký quỹ (Escrow) an toàn</h4>
                    <p className="about-feature-box__sub">Tiền cọc và tiền thuê được giữ an toàn qua cổng VNPay và chỉ giải ngân khi quy trình thuê hoàn thành không xảy ra tranh chấp.</p>
                  </div>
                </div>

                <div className="about-feature-box">
                  <span className="about-feature-box__num">02</span>
                  <div>
                    <h4 className="about-feature-box__title">Bảo vệ quyền lợi đôi bên</h4>
                    <p className="about-feature-box__sub">Hợp đồng điện tử tự động tạo lập, lưu giữ lịch sử kiểm tra tình trạng đồ vật thông qua hình ảnh bàn giao / nhận lại minh bạch.</p>
                  </div>
                </div>

                <div className="about-feature-box">
                  <span className="about-feature-box__num">03</span>
                  <div>
                    <h4 className="about-feature-box__title">Xử lý tranh chấp minh bạch</h4>
                    <p className="about-feature-box__sub">Trung tâm hỗ trợ và giải quyết khiếu nại hoạt động 24/7, luôn bảo đảm sự công bằng tối đa dựa trên chứng cứ thực tế.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ COMMITMENT / CORE STATEMENT ═════════════════════════════════════ */}
      <section className="about-commitment">
        <div className="about-container">
          <div className="about-commitment__card">
            <h2 className="about-commitment__title">Cam kết phát triển bền vững</h2>
            <p className="about-commitment__text">
              "Bằng việc tối ưu hóa mức độ sử dụng tài sản nhàn rỗi, mỗi người dùng trên RentalP2P đang góp phần quan trọng trong việc giảm thiểu lượng khí thải cacbon, tiết kiệm tài nguyên thiên nhiên và tạo nên xu hướng tiêu dùng xanh, thân thiện với môi trường toàn cầu."
            </p>
            <div className="about-commitment__author">
              <i className="fas fa-leaf text-green me-2" />
              <span>Đội ngũ sáng lập RentalP2P</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA SECTION ═══════════════════════════════════════════════════ */}
      <section className="about-cta" aria-label="Bắt đầu chia sẻ">
        <div className="about-container">
          <div className="about-cta__inner">
            <div className="about-cta__text">
              <h2 className="about-cta__title">Sẵn sàng trải nghiệm dịch vụ?</h2>
              <p className="about-cta__sub">
                Đăng đồ dùng nhàn rỗi để tạo thu nhập thụ động hoặc tìm thuê những món đồ bạn cần ngay hôm nay!
              </p>
            </div>
            <div className="about-cta__actions">
              <Link to="/shop" className="about-cta__btn about-cta__btn--primary">
                <i className="fas fa-search" aria-hidden="true" />
                Tìm thuê đồ
              </Link>
              <Link to="/post-item" className="about-cta__btn about-cta__btn--secondary">
                <i className="fas fa-plus" aria-hidden="true" />
                Đăng đồ cho thuê
              </Link>
              <Link to="/help" className="about-cta__btn about-cta__btn--ghost">
                <i className="fas fa-life-ring" aria-hidden="true" />
                Trung tâm trợ giúp
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
