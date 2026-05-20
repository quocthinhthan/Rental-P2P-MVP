import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
// Import file layout.css
import '../../styles/layout.css';

function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

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
      {/* Topbar Start */}
      <div className="container-fluid px-5 d-none border-bottom d-lg-block topbar-wrapper">
        <div className="row gx-0 align-items-center">

          <div className="col-lg-4 text-center text-lg-start mb-lg-0">
            <div className="d-inline-flex align-items-center topbar-text" style={{ height: '45px' }}>
              <span className="text-muted me-2">Trợ giúp</span><small> / </small>
              <span className="text-muted mx-2">Hỗ trợ</span><small> / </small>
              <span className="text-muted ms-2">Liên hệ</span>
            </div>
          </div>
          <div className="col-lg-4 text-center d-flex align-items-center justify-content-center topbar-text">
            <small className="text-dark">Gọi tới:</small>
            <span className="text-muted ms-2 fw-medium">(+84) 1234 567 890</span>
          </div>

          <div className="col-lg-4 text-center text-lg-end">
            <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
              <div className="dropdown custom-dropdown">
                {/* Nút nhấn Dropdown hiện đại */}
                <button
                  type="button"
                  className="btn user-dropdown-toggle text-decoration-none"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"

                >
                  <div className="user-avatar">
                    {isLoggedIn && user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.fullName}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <i className="fa fa-user"></i>
                    )}
                  </div>
                  <span className="user-name fw-bold">
                    {isLoggedIn && user ? user.fullName : 'Tài khoản'}
                  </span>
                  <i className="fa fa-chevron-down dropdown-icon"></i>
                </button>

                {/* Dropdown Menu */}
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
      </div>
      {/* Topbar End */}

      {/* Search Header Start */}
      <div className="container-fluid px-5 py-3 d-none d-lg-block bg-white shadow-sm mb-3 search-header-wrapper">
        <div className="row gx-0 align-items-center">

          {/* Logo */}
          <div className="col-md-3 col-xl-3 text-start">
            <Link to="/" className="navbar-brand p-0 text-decoration-none d-inline-block">
              <h1 className="display-6 text-primary m-0 fw-bold d-flex align-items-center">
                <i className="fas fa-sync-alt text-secondary me-2 brand-icon-spin"></i>RentalP2P
              </h1>
            </Link>
          </div>

          {/* Thanh Tìm Kiếm Hiện Đại */}
          <div className="col-md-7 col-xl-6 text-center">
            <div className="header-search-cluster">
              <form className="d-flex custom-search-bar" onSubmit={handleSearch}>
                <span className="search-field-icon">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  className="form-control border-0 bg-transparent py-2 px-3 shadow-none search-main-input"
                  type="text"
                  placeholder="Bạn đang tìm thuê gì hôm nay?"
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

          {/* Giỏ Hàng / Đơn Thuê */}
          <div className="col-md-2 col-xl-3 text-end">
            <Link to="/my-rentals" className="text-decoration-none cart-link d-inline-flex align-items-center">
              <div className="position-relative cart-icon-wrapper d-flex justify-content-center align-items-center rounded-circle border">
                <i className="fas fa-shopping-cart text-primary fs-5"></i>
                {/* Bạn có thể truyền biến đếm số lượng đơn vào số 0 bên dưới */}
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">
                  0
                </span>
              </div>
              <div className="text-start ms-3">
                <small className="text-muted d-block" style={{ fontSize: '12px', marginBottom: '-4px' }}>Quản lý</small>
                <span className="text-dark fw-bold cart-text">Đơn thuê</span>
              </div>
            </Link>
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
                  <Link to="/" className="nav-item nav-link active">Trang chủ</Link>
                  <Link to="/shop" className="nav-item nav-link">Cửa hàng</Link>

                  {/* Dropdown cho các trang phụ (nếu cần giống template) */}
                  <div className="nav-item dropdown">
                    <span className="nav-link dropdown-toggle" data-bs-toggle="dropdown" role="button" style={{ cursor: 'pointer' }}>Trang phụ</span>
                    <div className="dropdown-menu m-0">
                      <Link to="/about" className="dropdown-item">Giới thiệu</Link>
                      <Link to="/faq" className="dropdown-item">Câu hỏi thường gặp</Link>
                    </div>
                  </div>

                  <Link to="/contact" className="nav-item nav-link me-2">Liên hệ</Link>
                </div>

                {/* Nút Hotline bên phải */}
                <a href="tel:+841234567890" className="btn btn-danger text-white rounded-pill py-2 px-4 mb-3 mb-lg-0 fw-bold d-flex align-items-center">
                  <i className="fa fa-mobile-alt me-2"></i> +84 364 123 957
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
