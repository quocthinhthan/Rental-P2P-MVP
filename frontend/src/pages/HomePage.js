import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ItemList from '../components/Items/ItemList';
import ItemCard from '../components/Items/ItemCard';
import apiService from '../services/api';
import '../styles/homepage.css';
import { getMiniItemImage } from '../utils/cloudinaryImage';

function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bestsellers, setBestsellers] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);

  // Fetch bestsellers & featured items
  useEffect(() => {
    apiService.getBestsellers(3)
      .then(res => setBestsellers(res.data || []))
      .catch(() => {});
      
    apiService.getItems({ isFeatured: true, limit: 4 })
      .then(res => setFeaturedItems(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let headerCarousel;

    if (window.jQuery && window.jQuery.fn.owlCarousel) {
      headerCarousel = window.jQuery(".header-carousel");
      headerCarousel.owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        items: 1,
        dots: false,
        loop: true,
        nav: true,
        navText: [
          '<i class="bi bi-chevron-left"></i>',
          '<i class="bi bi-chevron-right"></i>'
        ]
      });
    }

    return () => {
      if (headerCarousel) {
        headerCarousel.trigger('destroy.owl.carousel');
      }
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleQuickSearch = (keyword) => {
    setSearchInput(keyword);
    setSearchQuery(keyword);
  };

  return (
    <>
      {/* Carousel Start */}
      <div className="container-fluid carousel bg-light px-0">
        <div className="row g-0 justify-content-end">

          {/* LEFT CAROUSEL */}
          <div className="col-12 col-lg-7 col-xl-9">
            <div className="header-carousel owl-carousel homepage-carousel">

              {/* Slide 1 */}
              <div className="header-carousel-item">

                {/* Background Image */}
                <div className="homepage-carousel-bg">
                  <img src="/img/cam-trai.jpg" alt="Carousel 1" />
                </div>

                {/* Content */}
                <div className="homepage-carousel-content">
                  <div className="container">
                    <div className="col-lg-8">
                      <h4
                        className="text-uppercase fw-bold mb-4 wow fadeInUp"
                        data-wow-delay="0.1s"
                        style={{ letterSpacing: '3px' }}
                      >
                        Cho thuê mọi thứ
                      </h4>

                      <h1
                        className="display-3 text-capitalize mb-4 wow fadeInUp"
                        data-wow-delay="0.3s"
                      >
                        Nền tảng cho thuê P2P
                      </h1>

                      <p
                        className="fs-5 mb-4 wow fadeInUp"
                        data-wow-delay="0.5s"
                      >
                        Vật dụng bạn không dùng, là thứ người khác đang cần!
                      </p>

                      <Link
                        className="btn btn-primary rounded-pill py-3 px-5 wow fadeInUp"
                        data-wow-delay="0.7s"
                        to="/shop"
                      >
                        Xem ngay
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 2 */}
              <div className="header-carousel-item">

                {/* Background Image */}
                <div className="homepage-carousel-bg">
                  <img src="/img/carou-2.webp" alt="Carousel 2" />
                </div>

                {/* Content */}
                <div className="homepage-carousel-content">
                  <div className="container">
                    <div className="col-lg-8">
                      <h4
                        className="text-uppercase fw-bold mb-4 wow fadeInUp"
                        data-wow-delay="0.1s"
                        style={{ letterSpacing: '3px' }}
                      >
                        Tiết kiệm chi phí
                      </h4>

                      <h1
                        className="display-3 text-capitalize mb-4 wow fadeInUp"
                        data-wow-delay="0.3s"
                      >
                        Thuê thay vì mua
                      </h1>

                      <p
                        className="fs-5 mb-4 wow fadeInUp"
                        data-wow-delay="0.5s"
                      >
                        Sử dụng các vật dụng chất lượng với giá chỉ bằng một phần nhỏ.
                      </p>

                      <Link
                        className="btn btn-primary rounded-pill py-3 px-5 wow fadeInUp"
                        data-wow-delay="0.7s"
                        to="/shop"
                      >
                        Khám phá
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT BANNER - GIỮ NGUYÊN */}
          <div
            className="col-12 col-lg-5 col-xl-3 wow fadeInRight"
            data-wow-delay="0.1s"
          >
            <div className="carousel-header-banner h-100">
              <img
                src="/img/chupanhcanon.png"
                className="img-fluid w-100 h-100"
                style={{ objectFit: 'cover' }}
                alt="Header Banner"
              />

              <div className="carousel-banner-offer">
                <p className="bg-primary text-white rounded fs-5 py-2 px-4 mb-0 me-3">
                  Giảm 20%
                </p>

                <p className="text-white fs-5 fw-bold mb-0">
                  ƯU ĐÃI ĐẶC BIỆT
                </p>
              </div>

              <div className="carousel-banner">
                <div className="carousel-banner-content text-center p-4">
                  <span className="d-block mb-2">Máy Ảnh</span>

                  <span className="d-block text-white fs-3">
                    Canon EOS 70D
                  </span>

                  <del className="me-2 text-white fs-5">
                    500.000đ/ngày
                  </del>

                  <span className="text-primary fs-5">
                    400.000đ/ngày
                  </span>
                </div>

                <Link
                  to="/items/1"
                  className="btn btn-primary rounded-pill py-2 px-4"
                >
                  <i className="fas fa-shopping-cart me-2"></i>
                  Thuê ngay
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Carousel End */}

      {/* Services Start */}
      <div className="container-fluid px-0">
        <div className="row g-0">
          <div className="col-6 col-md-4 col-lg-2 border-start border-end wow fadeInUp" data-wow-delay="0.1s">
            <div className="p-4">
              <div className="d-inline-flex align-items-center">
                <i className="fa fa-sync-alt fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Minh bạch</h6>
                  <p className="mb-0">Đánh giá từ cộng đồng</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.2s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fab fa-telegram-plane fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">An toàn</h6>
                  <p className="mb-0">Xác thực người dùng</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.3s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-life-ring fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Hỗ trợ 24/7</h6>
                  <p className="mb-0">Chúng tôi luôn ở đây</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.4s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-credit-card fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Tiện lợi</h6>
                  <p className="mb-0">Thanh toán an toàn</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.5s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-lock fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Bảo mật</h6>
                  <p className="mb-0">Bảo mật thông tin của bạn</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay="0.6s">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className="fas fa-blog fa-2x text-primary"></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">Cộng đồng</h6>
                  <p className="mb-0">Chia sẻ và kết nối</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Services End */}

      {/* Products Offer Start */}
      <div className="container-fluid bg-light py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6 wow fadeInLeft" data-wow-delay="0.2s">
              <Link to="/shop?search=camera" className="d-flex align-items-center justify-content-between border bg-white rounded p-4">
                <div>
                  <p className="text-muted mb-3">Tìm máy ảnh tốt nhất!</p>
                  <h3 className="text-primary">Máy ảnh</h3>
                  <h1 className="display-3 text-secondary mb-0">40% <span className="text-primary fw-normal">Off</span></h1>
                </div>
                <img src="/img/product-1.png" className="img-fluid" alt="Product 1" />
              </Link>
            </div>
            <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.3s">
              <Link to="/shop?search=watch" className="d-flex align-items-center justify-content-between border bg-white rounded p-4">
                <div>
                  <p className="text-muted mb-3">Tìm đồng hồ tốt nhất!</p>
                  <h3 className="text-primary">Đồng hồ</h3>
                  <h1 className="display-3 text-secondary mb-0">20% <span className="text-primary fw-normal">Off</span></h1>
                </div>
                <img src="/img/product-2.png" className="img-fluid" alt="Product 2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Products Offer End */}

      {/* Featured Products Spotlight Start */}
      {featuredItems.length > 0 && (
        <div className="container-fluid featured-spotlight pt-5 pb-0">
          <div className="container py-0">
            <div className="mx-auto text-center mb-5" style={{ maxWidth: '700px' }}>
              <span className="badge badge-spotlight-vip mb-3 shadow-sm">
                🌟 Đề xuất uy tín
              </span>
              <h1 className="display-5 fw-bold mb-2 text-dark">Sản Phẩm Nổi Bật</h1>
              <p className="text-muted mb-0">
                Các sản phẩm được tài trợ và có độ tin cậy vượt trội, cam kết chất lượng dịch vụ tốt nhất.
              </p>
            </div>
            <div className="row g-4">
              {featuredItems.map(item => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Featured Products Spotlight End */}

      {/* Bestseller Products Start */}
      <div className="container-fluid products pt-5 pb-5 bg-white">
        <div className="container products-mini pt-0 pb-4">
          <div className="mx-auto text-center mb-5" style={{ maxWidth: '700px' }}>
            <h4 className="text-primary mb-4 border-bottom border-primary border-2 d-inline-block p-2 title-border-radius wow fadeInUp" data-wow-delay="0.1s">
              Những Sản Phẩm Được Thuê Nhiều Nhất
            </h4>
            <p className="mb-0 wow fadeInUp" data-wow-delay="0.2s">
              Khám phá danh sách các món đồ đang hot và được cộng đồng ưu chuộng thuê nhất. Chất lượng đảm bảo, giá thuê hợp lý!
            </p>
          </div>
          <div className="row g-4">
            {bestsellers.length === 0 ? (
              [1, 2, 3].map(n => (
                <div key={n} className="col-md-6 col-lg-6 col-xl-4">
                  <div className="products-mini-item border rounded" style={{ opacity: 0.4 }}>
                    <div className="row g-0">
                      <div className="col-5">
                        <div className="products-mini-img border-end h-100 position-relative bg-light" style={{ minHeight: 120 }} />
                      </div>
                      <div className="col-7">
                        <div className="products-mini-content p-3">
                           <div className="bg-light rounded mb-2" style={{ height: 14, width: '60%' }} />
                           <div className="bg-light rounded mb-3" style={{ height: 20, width: '80%' }} />
                           <div className="bg-light rounded" style={{ height: 18, width: '50%' }} />
                        </div>
                      </div>
                    </div>
                    <div className="products-mini-add border-top p-3 bg-light" style={{ height: 72 }} />
                  </div>
                </div>
              ))
            ) : (
              bestsellers.map((item, idx) => {
                const imageSources = getMiniItemImage(item.mainImage || '/img/product-3.png');

                return (
                  <div key={item._id} className="col-md-6 col-lg-6 col-xl-4 wow fadeInUp" data-wow-delay={`${0.1 + idx * 0.2}s`}>
                    <div className="products-mini-item border rounded">
                      <div className="row g-0">
                        <div className="col-5">
                          <div className="products-mini-img border-end h-100 position-relative">
                            <img
                              src={imageSources.src}
                              srcSet={imageSources.srcSet}
                              sizes={imageSources.sizes}
                              className="img-fluid w-100 h-100"
                              style={{ objectFit: 'cover', backfaceVisibility: 'hidden' }}
                              alt={item.name}
                              loading="lazy"
                              decoding="async"
                            />
                            {item.rentalCount > 0 && (
                              <span className="products-mini-popular-badge shadow-sm">
                                🔥 Hot
                              </span>
                            )}
                            <div className="products-mini-icon rounded-circle bg-primary">
                              <Link to={`/items/${item._id}`}><i className="fa fa-eye fa-1x text-white" /></Link>
                            </div>
                          </div>
                        </div>
                        <div className="col-7">
                          <div className="products-mini-content p-3">
                            <Link to={`/shop?category=${encodeURIComponent(item.category || '')}`} className="d-block mb-2 text-muted">
                              {item.category || 'Khác'}
                            </Link>
                            <Link to={`/items/${item._id}`} className="d-block h5 mb-2">{item.name}</Link>
                            <span className="text-primary fw-bold fs-5 d-block">
                              {Number(item.pricePerDay).toLocaleString('vi-VN')}đ/ngày
                            </span>
                            {item.rentalCount > 0 && (
                              <small className="text-muted">
                                <i className="fas fa-fire text-danger me-1" />
                                {item.rentalCount} lượt thuê
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="products-mini-add border-top p-3 bg-light">
                        <Link to={`/items/${item._id}`} className="btn btn-primary border-secondary rounded-pill py-2 px-4 w-100 mb-3">
                          <i className="fas fa-shopping-cart me-2" /> Đặt Thuê Ngay
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Bestseller Products End */}

      {/* Product Banner Start */}
      <div className="container-fluid py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-6 wow fadeInLeft" data-wow-delay="0.1s">
              <Link to="/shop" className="d-block">
                <div className="bg-primary rounded position-relative overflow-hidden">
                  <img src="/img/product-banner.jpg" className="img-fluid w-100 rounded" alt="Banner 1" />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4" style={{ background: 'rgba(255, 255, 255, 0.7)' }}>
                    <h3 className="display-5 text-primary">Máy Ảnh <br /> <span>Canon Rebel T7i</span></h3>
                    <p className="fs-4 text-dark font-weight-bold">Giá chỉ 200.000đ/ngày</p>
                    <span className="btn btn-primary rounded-pill align-self-start py-2 px-4 mt-2">Thuê Ngay</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.2s">
              <Link to="/shop" className="d-block">
                <div className="text-center bg-primary rounded position-relative overflow-hidden">
                  <img src="/img/product-banner-2.jpg" className="img-fluid w-100" alt="Banner 2" />
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4" style={{ background: 'rgba(242, 139, 0, 0.6)' }}>
                    <h2 className="display-2 text-white font-weight-bold">ƯU ĐÃI</h2>
                    <h4 className="display-5 text-white mb-4">Giảm phí cọc đến 50%</h4>
                    <span className="btn btn-secondary rounded-pill align-self-center py-2 px-4">Khám Phá Ngay</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Product Banner End */}
      {/* Our Products Start */}
      <div className="container-fluid product py-5">
        <div className="container py-5">
          <div className="tab-class">
            <div className="row g-4 align-items-end mb-5">
              <div className="col-lg-5 text-start wow fadeInLeft" data-wow-delay="0.1s">
                <h4 className="text-primary border-bottom border-primary border-2 d-inline-block p-2 title-border-radius mb-3">
                  Sản phẩm của chúng tôi
                </h4>
                <h1 className="mb-2">Khám phá món đồ bạn cần</h1>
                <p className="text-muted mb-0">
                  Nhập từ khóa để lọc ngay danh sách vật dụng phù hợp.
                </p>
              </div>
              <div className="col-lg-7 wow fadeInRight" data-wow-delay="0.2s">
                <form onSubmit={handleSearchSubmit} className="bg-white border rounded-pill shadow-sm p-2 mb-3">
                  <div className="input-group">
                    <span className="input-group-text bg-transparent border-0 ps-4 text-primary">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-0 shadow-none bg-transparent"
                      placeholder="Ví dụ: camera, xe máy, máy khoan..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary rounded-pill px-4 px-md-5">
                      Tìm kiếm
                    </button>
                  </div>
                </form>
                <div className="d-flex flex-wrap justify-content-end gap-2">
                  <span className="text-muted align-self-center me-2">Gợi ý:</span>
                  {['Máy ảnh', 'Xe máy', 'Cắm trại', 'Dụng cụ điện'].map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className="btn btn-sm btn-outline-primary rounded-pill"
                      onClick={() => handleQuickSearch(keyword)}
                    >
                      {keyword}
                    </button>
                  ))}
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger rounded-pill"
                      onClick={() => {
                        setSearchInput('');
                        setSearchQuery('');
                      }}
                    >
                      Xóa lọc
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="tab-content">
              <div id="tab-1" className="tab-pane fade show p-0 active">
                <div className="mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1 text-primary">
                      {searchQuery ? `Kết quả tìm kiếm cho: "${searchQuery}"` : 'Tất cả sản phẩm hiện có'}
                    </h5>
                  </div>
                  <Link to="/shop" className="btn btn-primary rounded-pill px-4">
                    Xem tất cả sản phẩm<i className="fas fa-arrow-right ms-2"></i>
                  </Link>
                </div>
                {/* Component render Product List của bạn */}
                 <ItemList searchQuery={searchQuery} limit={8} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Our Products End */}

          </>
  );
}

export default HomePage;

