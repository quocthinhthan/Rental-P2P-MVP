import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import ItemCard from '../components/Items/ItemCard';
import '../styles/FavoritesPage.css';

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await apiService.getFavorites();
      setFavorites(response.data || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm yêu thích.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="container-fluid py-5 fav-page-container">
      <div className="container py-4">
        {/* Modern Marketplace Page Header */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pb-3 mb-4 border-bottom">
          <div>
            <h1 className="fw-bold mb-1 fav-page-title">
              Sản phẩm yêu thích ❤️
            </h1>
            <p className="text-muted mb-0 fav-page-subtitle">
              Những món đồ bạn quan tâm và đang lên kế hoạch thuê
            </p>
          </div>
          {!loading && favorites.length > 0 && (
            <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill fw-semibold fav-page-count-badge">
              📊 {favorites.length} vật dụng đã lưu
            </span>
          )}
        </div>

        {/* Core Layout States */}
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 fav-page-spinner-wrap">
            <div className="spinner-border text-primary fav-page-spinner" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="text-muted mt-3 small fw-medium">Đang tải danh sách yêu thích của bạn...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger border-0 shadow-sm text-center py-4 rounded-3 fav-page-error-alert" role="alert">
            <i className="fas fa-exclamation-circle me-2 fs-5"></i>
            <span>{error}</span>
            <div className="mt-3">
              <button className="btn btn-outline-danger btn-sm px-4 rounded-pill" onClick={loadFavorites}>Thử lại</button>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-5 bg-white border border-light-subtle rounded-4 shadow-sm fav-page-empty-card">
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger mb-4 fav-page-empty-icon-wrap">
              ❤️
            </div>
            <h3 className="fw-bold text-dark mb-2" style={{ fontSize: '1.25rem' }}>Chưa có sản phẩm yêu thích nào</h3>
            <p className="text-muted mb-4 mx-auto fav-page-subtitle" style={{ maxWidth: '420px', lineHeight: '1.6' }}>
              Nhấn biểu tượng trái tim trên các món đồ khi duyệt tin để lưu lại và theo dõi trạng thái trống/bận của chúng dễ dàng tại đây.
            </p>
            <Link to="/shop" className="btn btn-primary px-4 py-2.5 rounded-pill fw-semibold shadow-sm transition-all hover-grow fav-page-explore-btn">
              🔍 Khám phá Marketplace
            </Link>
          </div>
        ) : (
          /* Grid of beautiful marketplace ItemCards */
          <div className="row g-4">
            {favorites.map((item) => (
              <ItemCard 
                key={item._id} 
                item={{ ...item, isFavorited: true }} 
                onFavoriteToggle={(itemId, isFav) => {
                  // If unfavorited, instantly remove it from favorites page view list
                  if (!isFav) {
                    setFavorites((prev) => prev.filter((fav) => fav._id !== itemId));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesPage;
