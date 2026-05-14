import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LocationPickerModal from '../components/Common/LocationPickerModal';
import ItemList from '../components/Items/ItemList';
import apiService from '../services/api';

function ShopPage() {
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [address, setAddress] = useState(searchParams.get('address') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [ownerId, setOwnerId] = useState(searchParams.get('ownerId') || '');
  const [categories, setCategories] = useState([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [nearbyLocation, setNearbyLocation] = useState(null);
  const [radius, setRadius] = useState(searchParams.get('radius') || '5');

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
    setRadius(searchParams.get('radius') || '5');
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
      nextFilters.radius = radius;
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
    setRadius('5');
  };

  const handleFindNearby = () => {
    setShowLocationModal(true);
  };

  const handleLocationConfirm = ({ location, radius: selectedRadius }) => {
    setNearbyLocation(location);
    setRadius(selectedRadius);
    setShowLocationModal(false);
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
    <>
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">Cửa hàng</h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item"><span className="text-white">Trang</span></li>
          <li className="breadcrumb-item active text-white">Cửa hàng</li>
        </ol>
      </div>

      <div className="container-fluid shop py-5">
        <div className="container py-5">
          <div className="row g-4">
            <div className="col-lg-3 wow fadeInUp" data-wow-delay="0.1s">
              <div className="bg-light rounded-4 p-4 shadow-sm sticky-top" style={{ top: '120px' }}>
                <h4 className="mb-4">Bộ lọc</h4>

                <label className="form-label">Từ khóa</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="camera, xe máy..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />

                <label className="form-label">Danh mục</label>
                <select
                  className="form-select mb-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <label className="form-label">Vị trí</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  placeholder="Quận, thành phố..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label">Từ ngày</label>
                    <input
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Đến ngày</label>
                    <input
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-top pt-3 mt-3">
                  <label className="form-label">Tìm quanh đây</label>
                  <button
                    type="button"
                    className="btn btn-outline-primary rounded-pill w-100 mb-2"
                    onClick={handleFindNearby}
                  >
                    <i className="fas fa-map-marker-alt me-2"></i>
                    {hasNearbyFilter ? 'Đổi vị trí' : 'Chọn vị trí trên bản đồ'}
                  </button>

                  {hasNearbyFilter && (
                    <div className="small text-success mb-2">
                      <div className="d-flex align-items-start gap-2 mb-2">
                        <i className="fas fa-check-circle mt-1"></i>
                        <span>Đang tìm quanh khu vực đã chọn trong bán kính {radius} km</span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={handleFindNearby}
                        >
                          Đổi vị trí
                        </button>
                        <span className="text-muted">·</span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none text-danger"
                          onClick={handleClearNearby}
                        >
                          Bỏ tìm quanh đây
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2 mt-3">
                  <button type="button" className="btn btn-primary rounded-pill" onClick={() => {}}>
                    Áp dụng bộ lọc
                  </button>
                  <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={handleReset}>
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>

            <div className="col-lg-9 wow fadeInUp" data-wow-delay="0.1s">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <h4 className="mb-1">Kết quả tìm kiếm</h4>
                  <small className="text-muted">
                    {hasNearbyFilter
                      ? `Đang tìm quanh khu vực đã chọn trong bán kính ${radius} km.`
                      : hasActiveFilters
                      ? 'Đang lọc theo tên, danh mục, vị trí và thời gian trống từ API.'
                      : 'Hiển thị tất cả sản phẩm từ API.'}
                  </small>
                </div>
                {hasActiveFilters && (
                  <button type="button" className="btn btn-outline-primary rounded-pill" onClick={handleReset}>
                    Bỏ tất cả
                  </button>
                )}
              </div>
              <ItemList filters={filters} />
            </div>
          </div>
        </div>
      </div>

      <LocationPickerModal
        show={showLocationModal}
        initialLocation={nearbyLocation}
        initialRadius={radius}
        itemFilters={locationPickerFilters}
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleLocationConfirm}
      />
    </>
  );
}

export default ShopPage;
