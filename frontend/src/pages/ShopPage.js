import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ItemCard from '../components/Items/ItemCard';
import apiService from '../services/api';
// Import file CSS riêng
import '../styles/ShopPage.css';

function ShopPage() {
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [address, setAddress] = useState(searchParams.get('address') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [ownerId, setOwnerId] = useState(searchParams.get('ownerId') || '');
  const [categories, setCategories] = useState([]);
  const [nearbyLocation, setNearbyLocation] = useState(() => {
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const hasRadius = Boolean(searchParams.get('radius'));
    return Number.isFinite(lat) && Number.isFinite(lng) && hasRadius ? { lat, lng } : null;
  });
  const [radius, setRadius] = useState(searchParams.get('radius') || '');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);

  // States for client-side pagination and item fetching
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    setSearchInput(searchParams.get('search') || '');
    setCategory(searchParams.get('category') || '');
    setAddress(searchParams.get('address') || '');
    setStartDate(searchParams.get('startDate') || '');
    setEndDate(searchParams.get('endDate') || '');
    setOwnerId(searchParams.get('ownerId') || '');
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const radiusParam = searchParams.get('radius') || '';
    setNearbyLocation(Number.isFinite(lat) && Number.isFinite(lng) && radiusParam ? { lat, lng } : null);
    setRadius(radiusParam);
  }, [searchParams]);

  const filters = useMemo(() => {
    const nextFilters = {
      search: searchInput.trim(),
      category: category.trim(),
      address: address.trim(),
      startDate,
      endDate,
      ownerId,
    };

    if (isFeaturedOnly) {
      nextFilters.isFeatured = true;
    }

    if (nearbyLocation) {
      nextFilters.lat = nearbyLocation.lat;
      nextFilters.lng = nearbyLocation.lng;
      if (radius) nextFilters.radius = radius;
    }

    return nextFilters;
  }, [searchInput, category, address, startDate, endDate, ownerId, nearbyLocation, radius, isFeaturedOnly]);

  const locationPickerFilters = useMemo(() => ({
    search: searchInput.trim(),
    category: category.trim(),
    address: address.trim(),
    startDate,
    endDate,
    ownerId,
  }), [searchInput, category, address, startDate, endDate, ownerId]);

  // Effect to fetch items on filters change
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getItems({ ...filters, limit: 1000 });
        setItems(response.data || []);
        setCurrentPage(1);
      } catch (err) {
        console.error('Lỗi khi tải sản phẩm:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      }
      setLoading(false);
    };
    fetchItems();
  }, [filters]);

  const handleReset = () => {
    setSearchInput('');
    setCategory('');
    setAddress('');
    setStartDate('');
    setEndDate('');
    setOwnerId('');
    setNearbyLocation(null);
    setRadius('');
    setIsCategoryOpen(false);
    setIsFeaturedOnly(false);
    setCurrentPage(1);
  };

  const handleCategorySelect = (catName) => {
    setCategory(catName);
    setIsCategoryOpen(false);
  };

  const handleFindNearby = () => {
    window.dispatchEvent(new CustomEvent('rentalp2p:open-location-picker', {
      detail: {
        initialLocation: nearbyLocation,
        initialRadius: nearbyLocation ? radius : undefined,
        preferCurrentLocation: !nearbyLocation,
        itemFilters: locationPickerFilters,
        onConfirm: ({ location, radius: selectedRadius }) => {
          setNearbyLocation(location);
          setRadius(selectedRadius);
        },
      },
    }));
  };

  const handleClearNearby = () => {
    setNearbyLocation(null);
  };

  const hasNearbyFilter = Boolean(nearbyLocation);
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.address ||
    filters.startDate ||
    filters.endDate ||
    filters.ownerId ||
    isFeaturedOnly ||
    hasNearbyFilter
  );

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Header Banner */}
      <div className="container-fluid page-header shop-page-header wow fadeIn" data-wow-delay="0.1s">
        <div className="container text-center">
          <h1 className="text-white display-5 mb-3">Khám Phá Đồ Cho Thuê</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
              <li className="breadcrumb-item active text-white-50" aria-current="page">Cửa hàng</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="row g-4">
          
          {/* Sidebar - Bộ Lọc */}
          <div className="col-lg-3 col-md-12 wow fadeInUp" data-wow-delay="0.2s">
            <div className="filter-sidebar">
              <h4><i className="fas fa-sliders-h text-primary"></i> Bộ lọc tìm kiếm</h4>

              {/* Từ khóa */}
              <div className="filter-group">
                <label className="filter-label">Bạn đang tìm gì?</label>
                <div className="custom-input-wrapper">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Máy ảnh, lều trại, xe máy..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Danh mục */}
              <div className="filter-group">
                <label className="filter-label">Danh mục</label>
                <div className="custom-input-wrapper shop-category-dropdown">
                  <i className="fas fa-th-large"></i>
                  <button
                    type="button"
                    className={`shop-category-toggle ${isCategoryOpen ? 'is-open' : ''}`}
                    onClick={() => setIsCategoryOpen((open) => !open)}
                    aria-expanded={isCategoryOpen}
                  >
                    <span className="text-truncate">{category || 'Tất cả danh mục'}</span>
                    <i className={`fas fa-chevron-down ms-2 transition-icon ${isCategoryOpen ? 'rotate-180' : ''}`}></i>
                  </button>

                  {isCategoryOpen && (
                    <div className="custom-inner-dropdown-menu shop-filter-category-menu shadow-lg">
                      <button
                        type="button"
                        className={`inner-dropdown-item ${!category ? 'active' : ''}`}
                        onClick={() => handleCategorySelect('')}
                      >
                        Tất cả danh mục
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`inner-dropdown-item ${category === cat ? 'active' : ''}`}
                          onClick={() => handleCategorySelect(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Vị trí */}
              <div className="filter-group">
                <label className="filter-label">Khu vực</label>
                <div className="custom-input-wrapper">
                  <i className="fas fa-map-marker-alt"></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập quận, thành phố..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Ngày thuê */}
              <div className="filter-group date-inputs">
                <label className="filter-label">Thời gian thuê</label>
                <div className="row g-2">
                  <div className="col-6">
                    <div className={`custom-input-wrapper date-field ${startDate ? 'has-value' : ''}`} data-placeholder="Từ ngày">
                      <input
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        title="Từ ngày"
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className={`custom-input-wrapper date-field ${endDate ? 'has-value' : ''}`} data-placeholder="Đến ngày">
                      <input
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        title="Đến ngày"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lọc sản phẩm nổi bật */}
              <div className="filter-group">
                <div className="form-check form-switch d-flex align-items-center justify-content-between p-0">
                  <label className="filter-label m-0 cursor-pointer shop-featured-toggle-label" htmlFor="featuredSwitch">
                    ⭐ Nổi bật VIP
                  </label>
                  <input
                    className="form-check-input ms-0 cursor-pointer shop-featured-toggle-input"
                    type="checkbox"
                    role="switch"
                    id="featuredSwitch"
                    checked={isFeaturedOnly}
                    onChange={(e) => setIsFeaturedOnly(e.target.checked)}
                  />
                </div>
              </div>

              <hr className="my-4 text-muted" />

              {/* Tìm quanh đây (Bản đồ) */}
              <div className="filter-group">
                <label className="filter-label">Tìm theo định vị</label>
                <button
                  type="button"
                  className={`btn rounded-pill w-100 btn-map ${hasNearbyFilter ? 'active' : ''}`}
                  onClick={handleFindNearby}
                >
                  <i className="fas fa-map-marked-alt"></i>
                  {hasNearbyFilter ? 'Chỉnh sửa vị trí' : 'Chọn vị trí trên bản đồ'}
                </button>

                {hasNearbyFilter && (
                  <div className="nearby-section shadow-sm">
                    <div className="d-flex align-items-center gap-2 mb-2 text-success">
                      <i className="fas fa-check-circle fs-5"></i>
                      <span className="fw-medium text-dark" style={{fontSize: '0.9rem'}}>
                        Bán kính: <strong>{radius} km</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger rounded-pill w-100 mt-1"
                      onClick={handleClearNearby}
                    >
                      <i className="fas fa-times me-1"></i> Bỏ định vị
                    </button>
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="d-grid gap-2 mt-4 pt-2">
                <button type="button" className="btn btn-primary btn-apply rounded-pill text-white" onClick={() => {}}>
                  Áp dụng bộ lọc
                </button>
                {hasActiveFilters && (
                  <button type="button" className="btn btn-reset rounded-pill" onClick={handleReset}>
                    Xóa tất cả
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="col-lg-9 col-md-12 wow fadeInUp" data-wow-delay="0.3s">
            <div className="results-header d-flex align-items-sm-center justify-content-between flex-column flex-sm-row gap-3">
              <div>
                <h4 className="mb-1">Kết quả tìm kiếm</h4>
                <div className="text-muted">
                  {hasNearbyFilter
                    ? <span><i className="fas fa-crosshairs text-primary me-1"></i> Đang tìm quanh vị trí của bạn ({radius} km).</span>
                    : hasActiveFilters
                    ? <span><i className="fas fa-filter text-primary me-1"></i> Đang áp dụng các bộ lọc tìm kiếm.</span>
                    : <span><i className="fas fa-list text-primary me-1"></i> Hiển thị tất cả sản phẩm.</span>}
                </div>
              </div>
              
              {hasActiveFilters && (
                <button type="button" className="btn btn-light rounded-pill border shadow-sm px-4" onClick={handleReset}>
                  <i className="fas fa-undo-alt me-2 text-secondary"></i> Bỏ lọc
                </button>
              )}
            </div>
            
            {/* Component hiển thị danh sách sản phẩm */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Đang tải danh sách sản phẩm...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger shadow-sm rounded-3 py-3" role="alert">
                <i className="fas fa-exclamation-circle me-2"></i> {error}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-3 shadow-sm border border-light">
                <p className="fs-5 text-muted mb-0">Không tìm thấy sản phẩm nào phù hợp.</p>
              </div>
            ) : (
              <>
                <div className="row g-4">
                  {items.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(item => (
                    <ItemCard key={item._id} item={item} />
                  ))}
                </div>

                {/* Phân trang */}
                <div className="pagination-container d-flex align-items-center justify-content-between flex-wrap gap-3 mt-5">
                  <div className="d-flex align-items-center gap-3 flex-wrap text-muted small">
                    <span>Tổng số <strong>{items.length}</strong> sản phẩm</span>
                    <select
                      className="form-select form-select-sm shop-page-size-select cursor-pointer shadow-sm"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                    </select>
                  </div>

                  {/* Điều hướng trang */}
                  {Math.ceil(items.length / pageSize) > 1 && (
                    <nav aria-label="Page navigation">
                      <ul className="pagination shop-pagination pagination-sm m-0 gap-1">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          >
                            <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </li>
                        {Array.from({ length: Math.ceil(items.length / pageSize) }, (_, i) => i + 1).map(page => (
                          <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                            <button
                              className="page-link rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                              style={{ width: '32px', height: '32px', fontWeight: 'bold' }}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === Math.ceil(items.length / pageSize) ? 'disabled' : ''}`}>
                          <button
                            className="page-link rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '32px', height: '32px' }}
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(items.length / pageSize), prev + 1))}
                          >
                            <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default ShopPage;
