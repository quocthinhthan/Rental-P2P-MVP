import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ItemList from '../components/Items/ItemList';
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

    if (nearbyLocation) {
      nextFilters.lat = nearbyLocation.lat;
      nextFilters.lng = nearbyLocation.lng;
      if (radius) nextFilters.radius = radius;
    }

    return nextFilters;
  }, [searchInput, category, address, startDate, endDate, ownerId, nearbyLocation, radius]);

  const locationPickerFilters = useMemo(() => ({
    search: searchInput.trim(),
    category: category.trim(),
    address: address.trim(),
    startDate,
    endDate,
    ownerId,
  }), [searchInput, category, address, startDate, endDate, ownerId]);

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
            <ItemList filters={filters} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default ShopPage;
