import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
// Import file layout.css
import '../../styles/layout.css';

function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [rentalBadgeCount, setRentalBadgeCount] = useState(0);

  // Thêm useState này vào phần đầu component Header
  const [isCatOpen, setIsCatOpen] = useState(false);

  // Hàm chọn danh mục
  const selectCategory = (catName) => {
    setSelectedCategory(catName);
    setIsCatOpen(false);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiService.getCategories();
        setCategories(response.data);
      } catch (err) {
        console.error('Lỗi khi tải danh mục:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setRentalBadgeCount(0);
      return;
    }

    const activeRentalStatuses = new Set([
      'pending_payment',
      'pending_confirmation',
      'confirmed',
      'in_progress',
      'disputed',
    ]);

    const countActiveRentals = (rentals = []) => (
      rentals.filter((rental) => activeRentalStatuses.has(rental?.status)).length
    );

    const fetchRentalBadgeCount = async () => {
      try {
        const response = await apiService.getMyRentals({ skipGlobalLoading: true });
        const asRenterCount = countActiveRentals(response.data?.asRenter);
        const asOwnerCount = countActiveRentals(response.data?.asOwner);
        setRentalBadgeCount(asRenterCount + asOwnerCount);
      } catch (err) {
        console.error('Lỗi khi tải số lượng đơn thuê:', err);
        setRentalBadgeCount(0);
      }
    };

    fetchRentalBadgeCount();
  }, [isLoggedIn, user?._id, location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (selectedCategory) params.append('category', selectedCategory);
    const queryString = params.toString();
    navigate(`/shop${queryString ? `?${queryString}` : ''}`);
  };

  const handleOpenLocationPicker = () => {
    const itemFilters = {
      search: searchQuery.trim(),
      category: selectedCategory,
    };

    window.dispatchEvent(new CustomEvent('rentalp2p:open-location-picker', {
      detail: {
        itemFilters,
        preferCurrentLocation: true,
        onConfirm: ({ location, radius }) => {
          const params = new URLSearchParams();
          if (itemFilters.search) params.append('search', itemFilters.search);
          if (itemFilters.category) params.append('category', itemFilters.category);
          params.append('lat', location.lat);
          params.append('lng', location.lng);
          if (radius) params.append('radius', radius);
          navigate(`/shop?${params.toString()}`);
        },
      },
    }));
  };

  return (
    <>
      {/* Search Header Start */}
      <div className={`container-fluid px-5 py-3 d-none d-lg-block bg-white shadow-sm search-header-wrapper ${location.pathname.startsWith('/admin') ? 'mb-3' : ''}`}>
        <div className="row gx-0 align-items-center">

          {/* Logo */}
          {/* <div className="col-lg-3 col-xl-3 text-start">
            <Link to="/" className="navbar-brand p-0 text-decoration-none d-inline-block">
              <h1 className="display-6 text-primary m-0 fw-bold d-flex align-items-center">
                <i className="fas fa-sync-alt text-secondary me-2 brand-icon-spin"></i>RentalP2P
              </h1>
            </Link>
          </div> */}
          
          {/* Logo */}
          <div className="col-lg-3 col-xl-3 text-start">
            <Link to="/" className="navbar-brand p-0 text-decoration-none d-inline-block">
              <img src="/logo-brand-2.png" alt="RentalP2P Logo" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
            </Link>
          </div>

          {/* Thanh Tìm Kiếm Hiện Đại */}
          <div className="col-lg-6 col-xl-6 text-center">
            <div className="header-search-cluster">
              <form className="d-flex custom-search-bar" onSubmit={handleSearch}>
                <span className="search-field-icon">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  className="form-control border-0 bg-transparent py-2 px-3 shadow-none search-main-input"
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="search-divider"></div>

                {/* Custom Category Dropdown trong Search Bar */}
                <div className="position-relative d-flex align-items-center">
                  <div
                    className="custom-inner-select d-flex align-items-center justify-content-between px-3"
                    onClick={() => setIsCatOpen(!isCatOpen)}
                  >
                    <span className="text-truncate" style={{ maxWidth: '120px' }}>
                      {selectedCategory || 'Tất cả'}
                    </span>
                    <i className={`fas fa-chevron-down ms-2 transition-icon ${isCatOpen ? 'rotate-180' : ''}`}></i>
                  </div>

                  {/* Menu danh sách hiện ra khi click */}
                  {isCatOpen && (
                    <div className="custom-inner-dropdown-menu shadow-lg">
                      <div
                        className="inner-dropdown-item"
                        onClick={() => selectCategory('')}
                      >
                        Tất cả danh mục
                      </div>
                      {categories.map((cat) => (
                        <div
                          key={cat}
                          className="inner-dropdown-item"
                          onClick={() => selectCategory(cat)}
                        >
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary search-btn px-3 ms-2">
                  <i className="fas fa-search"></i>
                </button>
              </form>

              <button
                type="button"
                className="btn header-location-btn"
                onClick={handleOpenLocationPicker}
              >
                <span className="header-location-icon">
                  <i className="fas fa-location-arrow"></i>
                </span>
                <span className="header-location-copy">
                  <span>Tìm đồ quanh đây</span>
                  <small>Chọn vị trí trên bản đồ</small>
                </span>
                <i className="fas fa-chevron-right header-location-arrow"></i>
              </button>
            </div>
          </div>

          {/* Favorites & Cart & User Header Actions */}
          <div className="col-lg-3 col-xl-3 text-end d-flex align-items-center justify-content-end gap-2 header-actions-container">
            {isLoggedIn && (
              <>
                {/* Nút yêu thích nhanh */}
                <Link to="/favorites" className="text-decoration-none fav-link header-action-btn d-inline-flex align-items-center" title="Sản phẩm yêu thích">
                  <div className="position-relative fav-icon-wrapper action-icon-circle d-flex justify-content-center align-items-center rounded-circle border">
                    <i className="fas fa-heart text-danger fs-5"></i>
                  </div>
                  <span className="action-text">Yêu thích</span>
                </Link>

                <div className="header-divider d-none d-xl-block"></div>

                {/* Đơn thuê */}
                <Link to="/my-rentals" className="text-decoration-none cart-link header-action-btn d-inline-flex align-items-center" title="Quản lý đơn thuê">
                  <div className="position-relative cart-icon-wrapper action-icon-circle d-flex justify-content-center align-items-center rounded-circle border">
                    <i className="fas fa-shopping-cart text-primary fs-5"></i>
                    {rentalBadgeCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">
                        {rentalBadgeCount}
                      </span>
                    )}
                  </div>
                  <span className="action-text">Đơn thuê</span>
                </Link>

                <div className="header-divider d-none d-xl-block"></div>
              </>
            )}

            {/* Tài khoản Người dùng */}
            <div className="dropdown custom-dropdown align-self-center">
              <button
                type="button"
                className="btn text-decoration-none d-inline-flex align-items-center border-0 bg-transparent p-0 user-dropdown-trigger header-action-btn"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="position-relative user-icon-wrapper action-icon-circle d-flex justify-content-center align-items-center rounded-circle border overflow-hidden">
                  {isLoggedIn && user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <i className="fas fa-user text-primary fs-5"></i>
                  )}
                </div>
                <span className="action-text-permanent d-inline-flex align-items-center">
                  {isLoggedIn && user ? user.fullName.split(' ').pop() : 'Tài khoản'}
                  <i className="fas fa-chevron-down ms-1 dropdown-arrow-icon" style={{ fontSize: '9px', color: '#94a3b8' }}></i>
                </span>
              </button>

              <div className="dropdown-menu dropdown-menu-end custom-dropdown-menu mt-2">
                {isLoggedIn && user ? (
                  <>
                    <div className="dropdown-header">
                      <p className="mb-0 text-muted fs-7">Xin chào,</p>
                      <h6 className="mb-0 text-dark fw-bold">{user.fullName}</h6>
                    </div>
                    <hr className="dropdown-divider mx-3 my-2" />
                    <Link to="/my-rentals" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-clipboard-list me-2 item-icon"></i>Quản lý đơn thuê
                    </Link>
                    <Link to="/financial-dashboard" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-wallet me-2 item-icon text-success"></i>Quản lý tài chính / Doanh thu
                    </Link>
                    <Link to="/favorites" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-heart me-2 item-icon text-danger"></i>Sản phẩm yêu thích
                    </Link>
                    <Link to="/account" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-user-cog me-2 item-icon"></i>Tài khoản của tôi
                    </Link>
                    <Link to="/post-item" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-plus-circle me-2 item-icon"></i>Đăng đồ cho thuê
                    </Link>
                    {user && user.role === 'admin' && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <Link to="/admin/dashboard" className="custom-dropdown-item">
                            <i className="fas fa-chart-line me-2 item-icon"></i>
                            Tổng quan admin
                          </Link>
                        </li>
                        <li>
                          <Link to="/admin/items" className="custom-dropdown-item">
                            <i className="fas fa-boxes me-2 item-icon"></i>
                            Quản lý sản phẩm
                          </Link>
                        </li>
                        <li>
                          <Link to="/admin/item-reports" className="custom-dropdown-item">
                            <i className="fas fa-flag me-2 item-icon"></i>
                            Báo cáo sản phẩm
                          </Link>
                        </li>
                        <li>
                          <Link to="/admin/disputes" className="custom-dropdown-item">
                            <i className="fas fa-gavel me-2 item-icon"></i>
                            Xử lý tranh chấp
                          </Link>
                        </li>
                      </>
                    )}
                    <hr className="dropdown-divider mx-3 my-2" />
                    <button onClick={handleLogout} className="dropdown-item custom-dropdown-item text-danger logout-btn">
                      <i className="fas fa-sign-out-alt me-2 item-icon"></i>Đăng xuất
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-sign-in-alt me-2 item-icon"></i>Đăng nhập
                    </Link>
                    <Link to="/register" className="dropdown-item custom-dropdown-item">
                      <i className="fas fa-user-plus me-2 item-icon"></i>Đăng ký
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* Search Header End */}

      {/* Navbar Start */}
      <div className="container-fluid nav-bar p-0">
        <div className="row gx-0 bg-primary px-5 align-items-center">

          {/* Cột Danh Mục (Categories) */}
          <div className="col-lg-3 d-none d-lg-block">
            <nav className="navbar navbar-light position-relative p-0" style={{ width: '250px' }}>
              <button
                className="navbar-toggler border-0 w-100 text-start d-flex align-items-center rounded-0 p-3"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#allCat"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }} /* Màu nền làm nổi bật khối danh mục như template */
              >
                <h4 className="m-0 text-dark fw-bold" style={{ fontSize: '1.2rem' }}>
                  <i className="fa fa-bars me-3"></i>Danh mục
                </h4>
              </button>

              {/* Danh sách thả xuống của Danh Mục */}
              <div className="collapse navbar-collapse rounded-bottom position-absolute w-100 bg-white shadow-lg custom-category-dropdown" id="allCat" style={{ top: '100%', left: 0 }}>
                <div className="navbar-nav py-0 w-100">
                  <div className="categories-list w-100">
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <Link
                          key={cat}
                          to={`/shop?category=${encodeURIComponent(cat)}`}
                          className="category-item d-flex align-items-center justify-content-between text-decoration-none"
                        >
                          <div className="d-flex align-items-center">
                            <div className="category-icon-box me-3">
                              <i className="fas fa-th-large"></i> {/* Bạn có thể thay icon tùy ý */}
                            </div>
                            <span className="category-name">{cat}</span>
                          </div>
                          <i className="fas fa-chevron-right arrow-icon"></i>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted">
                        <i className="fas fa-box-open d-block mb-2 fs-3"></i>
                        <small>Chưa có danh mục</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Cột Menu Chính */}
          <div className="col-12 col-lg-9">
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary py-lg-0 p-3 p-lg-0">
              <Link to="/" className="navbar-brand d-block d-lg-none">
                <h1 className="display-5 text-white m-0">
                  <i className="fas fa-sync-alt text-white me-2"></i>RentalP2P
                </h1>
              </Link>

              <button className="navbar-toggler ms-auto" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
                <span className="fa fa-bars fa-1x text-white"></span>
              </button>

              <div className="collapse navbar-collapse" id="navbarCollapse">
                {/* Dùng ms-auto để căn phải như template */}
                <div className="navbar-nav ms-auto py-0 font-weight-bold">
                  <Link to="/" className={`nav-item nav-link ${location.pathname === '/' ? 'active' : ''}`}>Trang chủ</Link>
                  <Link to="/shop" className={`nav-item nav-link ${location.pathname.startsWith('/shop') ? 'active' : ''}`}>Cửa hàng</Link>
                  <Link to="/about" className={`nav-item nav-link ${location.pathname === '/about' ? 'active' : ''}`}>Về chúng tôi</Link>

                  {/* Dropdown cho các trang phụ */}
                  <div className="nav-item dropdown">
                    <span
                      className={`nav-link dropdown-toggle ${['/help', '/faq'].some(p => location.pathname.startsWith(p)) ? 'active' : ''}`}
                      data-bs-toggle="dropdown"
                      role="button"
                      style={{ cursor: 'pointer' }}
                    >
                      Hỗ trợ
                    </span>
                    <div className="dropdown-menu m-0">
                      <Link to="/help" className={`dropdown-item ${location.pathname === '/help' ? 'active' : ''}`}>
                        <i className="fas fa-life-ring me-2" />Trung tâm trợ giúp
                      </Link>
                      <Link to="/faq" className={`dropdown-item ${location.pathname === '/faq' ? 'active' : ''}`}>
                        <i className="fas fa-comments me-2" />Câu hỏi thường gặp
                      </Link>
                    </div>
                  </div>

                  <Link to="/contact" className={`nav-item nav-link me-2 ${location.pathname === '/contact' ? 'active' : ''}`}>Liên hệ</Link>
                </div>

                {/* Nút Hotline CSKH hỗ trợ bên phải */}
                <a href="tel:+84364123957" className="btn nav-hotline-btn text-white rounded-pill mb-3 mb-lg-0 fw-bold d-inline-flex align-items-center" title="Hỗ trợ chăm sóc khách hàng 24/7">
                  <span className="hotline-icon-wrapper me-2">
                    <i className="fas fa-headset animate-pulse-gentle"></i>
                  </span>
                  <div className="text-start lh-1 hotline-content">
                    <small className="hotline-subtext d-block">
                      <span className="status-dot-active me-1"></span>CSKH HỖ TRỢ 24/7
                    </small>
                    <span className="hotline-number">+84 364 123 957</span>
                  </div>
                </a>
              </div>
            </nav>
          </div>

        </div>
      </div>
      {/* Navbar End */}
    </>
  );
}

export default Header;
