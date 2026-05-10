import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ItemList from '../components/Items/ItemList'; // <-- 1. IMPORT
import apiService from '../services/api';

function ShopPage() {
  // Đọc query search từ URL, ví dụ: /shop?search=camera
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [address, setAddress] = useState(searchParams.get('address') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [ownerId, setOwnerId] = useState(searchParams.get('ownerId') || '');
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

  // Cập nhật state khi URL thay đổi (VD: bấm vào link danh mục ở Header)
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
    setCategory(searchParams.get('category') || '');
    setAddress(searchParams.get('address') || '');
    setStartDate(searchParams.get('startDate') || '');
    setEndDate(searchParams.get('endDate') || '');
    setOwnerId(searchParams.get('ownerId') || '');
  }, [searchParams]);

  const filters = useMemo(() => ({
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
  };

  const hasActiveFilters = Boolean(filters.search || filters.category || filters.address || filters.startDate || filters.endDate || filters.ownerId);

  return (
    <>
      {/* Single Page Header start */}
      <div className="container-fluid page-header py-5">
        <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">Cửa hàng</h1>
        <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item"><span className="text-white">Trang</span></li>
          <li className="breadcrumb-item active text-white">Cửa hàng</li>
        </ol>
      </div>
      {/* Single Page Header End */}

      {/* Shop Page Start */}
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

                <div className="d-grid gap-2">
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
                    {hasActiveFilters
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
      {/* Shop Page End */}
    </>
  );
}

export default ShopPage;