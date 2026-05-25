import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import helpArticles from './helpArticles';
import './HelpWidget.css';

/* ─── Nhóm bài viết theo category ─── */
const CATEGORIES = [...new Set(helpArticles.map((a) => a.category))];

function HelpWidget() {
  const { user, isLoggedIn } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);

  const panelRef = useRef(null);
  const searchRef = useRef(null);

  /* Lọc bài viết theo từ khóa tìm kiếm */
  const filteredArticles = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpArticles;
    return helpArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.some((k) => k.includes(q)))
    );
  }, [query])();

  /* Nhóm kết quả lọc theo category */
  const groupedResults = CATEGORIES.reduce((acc, cat) => {
    const items = filteredArticles.filter((a) => a.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  /* Focus thanh tìm kiếm khi panel mở */
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 120);
    }
    if (!isOpen) {
      setQuery('');
      setActiveArticle(null);
    }
  }, [isOpen]);

  /* Đóng panel khi click bên ngoài */
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Nếu không click vào nút toggle thì đóng
        const toggleBtn = document.getElementById('help-widget-toggle');
        if (toggleBtn && toggleBtn.contains(e.target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  /* Lời chào */
  const greeting =
    isLoggedIn && user?.fullName
      ? `Xin chào, ${user.fullName.split(' ').pop()}!`
      : 'Xin chào!';

  /* Toggle panel */
  const handleToggle = () => setIsOpen((prev) => !prev);

  /* Mở bài viết chi tiết */
  const handleOpenArticle = (article) => {
    setActiveArticle(article);
    setQuery('');
  };

  /* Quay lại danh sách */
  const handleBack = () => {
    setActiveArticle(null);
    setTimeout(() => searchRef.current?.focus(), 80);
  };

  return (
    <div className="hw-root" aria-label="Help Center">
      {/* ── Floating Button ─────────────────────── */}
      <button
        id="help-widget-toggle"
        className={`hw-fab ${isOpen ? 'hw-fab--active' : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? 'Đóng hỗ trợ' : 'Mở hỗ trợ'}
        title="Trung tâm hỗ trợ"
        type="button"
      >
        <span className={`hw-fab__icon ${isOpen ? 'hw-fab__icon--close' : ''}`}>
          {isOpen ? (
            <i className="fas fa-times" aria-hidden="true" />
          ) : (
            <i className="fas fa-question" aria-hidden="true" />
          )}
        </span>
        {!isOpen && (
          <span className="hw-fab__pulse" aria-hidden="true" />
        )}
      </button>

      {/* ── Panel ───────────────────────────────── */}
      <div
        ref={panelRef}
        className={`hw-panel ${isOpen ? 'hw-panel--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Trung tâm hỗ trợ"
      >
        {/* Header */}
        <div className="hw-panel__header">
          <div className="hw-panel__header-inner">
            <div className="hw-panel__header-icon" aria-hidden="true">
              <i className="fas fa-life-ring" />
            </div>
            <div className="hw-panel__header-text">
              <span className="hw-panel__greeting">{greeting}</span>
              <span className="hw-panel__subtitle">Bạn cần hỗ trợ gì?</span>
            </div>
          </div>
          <button
            className="hw-panel__close"
            onClick={() => setIsOpen(false)}
            aria-label="Đóng panel hỗ trợ"
            type="button"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="hw-panel__body">
          {activeArticle ? (
            /* ── Chi tiết bài viết ─── */
            <div className="hw-article">
              <button
                className="hw-article__back"
                onClick={handleBack}
                type="button"
              >
                <i className="fas fa-arrow-left" aria-hidden="true" />
                Quay lại
              </button>
              <div className="hw-article__head">
                <span className="hw-article__cat-badge">
                  <i className={activeArticle.icon} aria-hidden="true" />
                  {activeArticle.category}
                </span>
                <h3 className="hw-article__title">{activeArticle.title}</h3>
              </div>
              <div
                className="hw-article__body"
                dangerouslySetInnerHTML={{ __html: activeArticle.content }}
              />
            </div>
          ) : (
            /* ── Danh sách bài viết ─── */
            <>
              {/* Tìm kiếm */}
              <div className="hw-search">
                <i className="fas fa-search hw-search__icon" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  className="hw-search__input"
                  placeholder="Tìm kiếm hướng dẫn..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Tìm kiếm hướng dẫn"
                />
                {query && (
                  <button
                    className="hw-search__clear"
                    onClick={() => setQuery('')}
                    aria-label="Xóa tìm kiếm"
                    type="button"
                  >
                    <i className="fas fa-times" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Kết quả / danh sách */}
              <div className="hw-list">
                {filteredArticles.length === 0 ? (
                  /* Empty state */
                  <div className="hw-empty">
                    <div className="hw-empty__icon" aria-hidden="true">
                      <i className="fas fa-search-minus" />
                    </div>
                    <p className="hw-empty__title">Không tìm thấy kết quả</p>
                    <p className="hw-empty__sub">
                      Thử từ khóa khác hoặc xem toàn bộ chủ đề bên dưới.
                    </p>
                    <button
                      className="hw-empty__reset"
                      onClick={() => setQuery('')}
                      type="button"
                    >
                      Xem tất cả hướng dẫn
                    </button>
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([cat, articles]) => (
                    <div key={cat} className="hw-group">
                      <div className="hw-group__label">{cat}</div>
                      {articles.map((article) => (
                        <button
                          key={article.id}
                          className="hw-item"
                          onClick={() => handleOpenArticle(article)}
                          type="button"
                        >
                          <span className="hw-item__icon" aria-hidden="true">
                            <i className={article.icon} />
                          </span>
                          <span className="hw-item__text">
                            <span className="hw-item__title">{article.title}</span>
                            <span className="hw-item__desc">{article.description}</span>
                          </span>
                          <i className="fas fa-chevron-right hw-item__arrow" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="hw-panel__footer">
          <Link
            to="/help"
            className="hw-panel__footer-guide"
            onClick={() => setIsOpen(false)}
          >
            <i className="fas fa-book-open" aria-hidden="true" />
            Xem hướng dẫn đầy đủ
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
          <div className="hw-panel__footer-hotline">
            <i className="fas fa-headset" aria-hidden="true" />
            <span>Hotline:</span>
            <a href="tel:+84364123957" className="hw-panel__footer-link">+84 364 123 957</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpWidget;
