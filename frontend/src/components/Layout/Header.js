import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import apiService from '../../services/api';

function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State quản lý từ khóa tìm kiếm và danh mục
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch danh mục từ API
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

  // Hàm xử lý khi bấm nút Tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    if (selectedCategory) {
      params.append('category', selectedCategory);
    }

    const queryString = params.toString();
    navigate(`/shop${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <>
      {/* Topbar Start */}
      <div className="container-fluid px-5 d-none border-bottom d-lg-block">
        <div className="row gx-0 align-items-center">
          
          <div className="col-lg-4 text-center text-lg-start mb-lg-0">
            <div className="d-inline-flex align-items-center" style={{height: '45px'}}>
                <span className="text-muted me-2">Help</span><small> / </small>
                <span className="text-muted mx-2">Support</span><small> / </small>
                <span className="text-muted ms-2">Contact</span>
            </div>
          </div>
          <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
              <small className="text-dark">Call Us:</small>
              <span className="text-muted ms-2">(+84) 1234 567 890</span>
          </div>

          <div className="col-lg-4 text-center text-lg-end">
            <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
              <div className="dropdown">
                <button type="button" className="dropdown-toggle text-muted ms-2 btn btn-link p-0 text-decoration-none" data-bs-toggle="dropdown" aria-expanded="false" style={{ cursor: 'pointer' }}>
                  <small><i className="fa fa-user me-2"></i> {isLoggedIn && user ? user.fullName : 'Tài khoản'}</small>
                </button>

                <div className="dropdown-menu rounded">
                  {isLoggedIn && user ? (
                    <>
                      <span className="dropdown-item-text">Xin chào, {user.fullName}</span>
                      <hr className="dropdown-divider" />
                      <Link to="/my-rentals" className="dropdown-item">Quản lý đơn thuê</Link>
                      <Link to="/post-item" className="dropdown-item">Đăng đồ cho thuê</Link>
                      <hr className="dropdown-divider" />
                      <button onClick={handleLogout} className="dropdown-item">Đăng xuất</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="dropdown-item">Đăng nhập</Link>
                      <Link to="/register" className="dropdown-item">Đăng ký</Link>
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
      <div className="container-fluid px-5 py-4 d-none d-lg-block">
         <div className="row gx-0 align-items-center text-center">
            {/* Logo */}
            <div className="col-md-4 col-lg-3 text-center text-lg-start">
                <div className="d-inline-flex align-items-center">
                    <Link to="/" className="navbar-brand p-0">
                        <h1 className="display-5 text-primary m-0">
                            <i className="fas fa-sync-alt text-secondary me-2"></i>RentalP2P
                        </h1>
                    </Link>
                </div>
            </div>
            
            {/* Thanh Tìm Kiếm */}
            <div className="col-md-4 col-lg-6 text-center">
                <div className="position-relative ps-4">
                    <form className="d-flex border rounded-pill" onSubmit={handleSearch}>
                        <input 
                            className="form-control border-0 rounded-pill w-100 py-3" 
                            type="text"
                            placeholder="Bạn đang tìm thuê gì?"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select 
                            className="form-select text-dark border-0 border-start rounded-0 p-3" 
                            style={{ width: '300px' }}
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-primary rounded-pill py-3 px-5" style={{ border: 0 }}>
                            <i className="fas fa-search"></i>
                        </button>
                    </form>
                </div>
            </div>

            {/* Các icon bên phải */}
            <div className="col-md-4 col-lg-3 text-center text-lg-end">
                <div className="d-inline-flex align-items-center">
                    
                    <Link to="/my-rentals" className="text-muted d-flex align-items-center justify-content-center">
                        <span className="rounded-circle btn-md-square border"><i className="fas fa-shopping-cart"></i></span>
                        <span className="text-dark ms-2">Đơn thuê</span>
                    </Link>
                </div>
            </div>
         </div>
      </div>
      {/* Search Header End */}
      
      {/* Navbar Start */}
      <div className="container-fluid nav-bar p-0">
            <div className="row gx-0 bg-primary px-5 align-items-center">
                <div className="col-lg-3 d-none d-lg-block">
                    <nav className="navbar navbar-light position-relative" style={{width: '250px'}}>
                        <button className="navbar-toggler border-0 fs-4 w-100 px-0 text-start" type="button"
                            data-bs-toggle="collapse" data-bs-target="#allCat">
                            <h4 className="m-0"><i className="fa fa-bars me-2"></i>Danh mục</h4>
                        </button>
                        <div className="collapse navbar-collapse rounded-bottom" id="allCat">
                            <div className="navbar-nav ms-auto py-0">
                                <ul className="list-unstyled categories-bars">
                                    {categories.length > 0 ? (
                                      categories.map((cat) => (
                                        <li key={cat}>
                                            <Link to={`/shop?category=${encodeURIComponent(cat)}`} className="categories-bars-item text-decoration-none">
                                                <span className="text-dark">{cat}</span>
                                            </Link>
                                        </li>
                                      ))
                                    ) : (
                                      <li><div className="categories-bars-item"><span className="text-muted">Chưa có danh mục</span></div></li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </nav>
                </div>
                <div className="col-12 col-lg-9">
                    <nav className="navbar navbar-expand-lg navbar-light bg-primary ">
                        <Link to="/" className="navbar-brand d-block d-lg-none">
                            <h1 className="display-5 text-secondary m-0"><i
                                    className="fas fa-sync-alt text-white me-2"></i>RentalP2P</h1>
                        </Link>
                        <button className="navbar-toggler ms-auto" type="button" data-bs-toggle="collapse"
                            data-bs-target="#navbarCollapse">
                            <span className="fa fa-bars fa-1x"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarCollapse">
                            <div className="navbar-nav ms-auto py-0">
                                <Link to="/" className="nav-item nav-link">Trang chủ</Link>
                                <Link to="/shop" className="nav-item nav-link">Cửa hàng</Link>
                            </div>
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