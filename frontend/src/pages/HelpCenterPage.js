import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import helpArticles, { categoryMeta, faqItems } from '../components/help/helpArticles';
import '../styles/HelpCenterPage.css';

/* ─── Derived helpers ─── */
const ALL_CATEGORIES = [...new Set(helpArticles.map((a) => a.category))];

function getCatMeta(category) {
  return categoryMeta.find((m) => m.category === category) || {
    icon: 'fas fa-circle',
    color: '#f97316',
    bg: '#fff7ed',
  };
}

/* ────────────────────────────────────────────────────────────────
   Main component
──────────────────────────────────────────────────────────────── */
function HelpCenterPage() {
  const [query, setQuery]               = useState('');
  const [activeCategory, setActiveCategory] = useState(null); // null = overview
  const [activeArticle, setActiveArticle]   = useState(null);
  const [openFaq, setOpenFaq]           = useState(null);
  const searchRef = useRef(null);
  const contentRef = useRef(null);

  /* ── Filtered articles (search) ── */
  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpArticles;
    return helpArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.keywords && a.keywords.some((k) => k.includes(q)))
    );
  }, [query]);

  /* Articles shown in sidebar: filtered + category filter */
  const sidebarArticles = useMemo(() => {
    if (!activeCategory) return filteredArticles;
    return filteredArticles.filter((a) => a.category === activeCategory);
  }, [filteredArticles, activeCategory]);

  /* Auto-select first article when sidebar changes */
  useEffect(() => {
    if (sidebarArticles.length > 0) {
      setActiveArticle(sidebarArticles[0]);
    } else {
      setActiveArticle(null);
    }
  }, [activeCategory, query]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Scroll to content top on article change (mobile UX) */
  useEffect(() => {
    if (activeArticle && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeArticle]);

  /* ── Category click → go to that category ── */
  const handleCategoryClick = useCallback((cat) => {
    setActiveCategory(cat);
    setQuery('');
  }, []);

  /* ── Article click ── */
  const handleArticleClick = useCallback((article) => {
    setActiveArticle(article);
  }, []);

  /* ── Back to overview ── */
  const handleBackToOverview = () => {
    setActiveCategory(null);
    setActiveArticle(null);
    setQuery('');
  };

  /* ── Search submit ── */
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveCategory(null); // search across all categories
  };

  const isSearching = query.trim().length > 0;
  const isOverview  = !activeCategory && !isSearching;

  /* ── Group articles by category for overview panels ── */
  const groupedByCategory = useMemo(() => {
    return ALL_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = helpArticles.filter((a) => a.category === cat);
      return acc;
    }, {});
  }, []);

  /* ── Title for sidebar/content area header ── */
  const areaTitle = useMemo(() => {
    if (isSearching) return `Kết quả cho "${query.trim()}"`;
    if (activeCategory) return activeCategory;
    return 'Tất cả hướng dẫn';
  }, [isSearching, activeCategory, query]);

  return (
    <>
      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="hcp-hero" aria-label="Help Center Hero">
        <div className="hcp-hero__inner">
          <div className="hcp-hero__badge">
            <i className="fas fa-life-ring" aria-hidden="true" />
            Trung tâm trợ giúp
          </div>
          <h1 className="hcp-hero__title">Trung tâm trợ giúp RentalP2P</h1>
          <p className="hcp-hero__sub">
            Tìm hiểu cách thuê, cho thuê và giao dịch an toàn trên nền tảng.
          </p>

          {/* Search */}
          <form
            className="hcp-hero__search"
            onSubmit={handleSearchSubmit}
            role="search"
            aria-label="Tìm kiếm hướng dẫn"
          >
            <span className="hcp-hero__search-icon" aria-hidden="true">
              <i className="fas fa-search" />
            </span>
            <input
              ref={searchRef}
              type="text"
              className="hcp-hero__search-input"
              placeholder="Tìm kiếm hướng dẫn, chủ đề... (VD: thuê đồ, tranh chấp)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm kiếm hướng dẫn"
            />
            {query && (
              <button
                type="button"
                className="hcp-hero__search-clear"
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                aria-label="Xóa tìm kiếm"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            )}
            <button type="submit" className="hcp-hero__search-btn">
              Tìm kiếm
            </button>
          </form>

          {/* Quick stats */}
          <div className="hcp-hero__stats">
            <span><i className="fas fa-book-open" aria-hidden="true" /> {helpArticles.length} bài viết</span>
            <span><i className="fas fa-layer-group" aria-hidden="true" /> {ALL_CATEGORIES.length} chủ đề</span>
            <span><i className="fas fa-question-circle" aria-hidden="true" /> {faqItems.length} câu hỏi thường gặp</span>
          </div>
        </div>
      </section>

      {/* ══ BREADCRUMB ════════════════════════════════════════════════════ */}
      <div className="hcp-breadcrumb-wrap">
        <div className="hcp-container">
          <ol className="hcp-breadcrumb" aria-label="Đường dẫn">
            <li>
              <Link to="/">Trang chủ</Link>
            </li>
            <li>
              {activeCategory ? (
                <button className="hcp-breadcrumb__btn" onClick={handleBackToOverview}>
                  Trợ giúp
                </button>
              ) : (
                <span className="hcp-breadcrumb__active">Trợ giúp</span>
              )}
            </li>
            {activeCategory && (
              <li>
                <span className="hcp-breadcrumb__active">{activeCategory}</span>
              </li>
            )}
          </ol>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <main className="hcp-main">
        <div className="hcp-container">

          {/* ── OVERVIEW: Category cards grid ── */}
          {isOverview && (
            <>
              <div className="hcp-section-label">Chọn chủ đề bạn cần hỗ trợ</div>
              <div className="hcp-cats-grid" role="list" aria-label="Danh mục hướng dẫn">
                {categoryMeta.map((meta) => {
                  const articles = groupedByCategory[meta.category] || [];
                  if (articles.length === 0) return null;
                  return (
                    <button
                      key={meta.category}
                      className="hcp-cat-card"
                      onClick={() => handleCategoryClick(meta.category)}
                      role="listitem"
                      aria-label={`Xem hướng dẫn về ${meta.category}`}
                      style={{ '--cat-color': meta.color, '--cat-bg': meta.bg }}
                    >
                      <div className="hcp-cat-card__icon" aria-hidden="true">
                        <i className={meta.icon} />
                      </div>
                      <div className="hcp-cat-card__body">
                        <span className="hcp-cat-card__name">{meta.category}</span>
                        <span className="hcp-cat-card__count">
                          {articles.length} bài viết
                        </span>
                      </div>
                      <i className="fas fa-chevron-right hcp-cat-card__arrow" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              {/* Overview: list all articles grouped by category */}
              {ALL_CATEGORIES.map((cat) => {
                const meta = getCatMeta(cat);
                const articles = groupedByCategory[cat] || [];
                if (articles.length === 0) return null;
                return (
                  <div key={cat} className="hcp-overview-group">
                    <div className="hcp-overview-group__header">
                      <span
                        className="hcp-overview-group__icon"
                        style={{ background: meta.bg, color: meta.color }}
                        aria-hidden="true"
                      >
                        <i className={meta.icon} />
                      </span>
                      <h2 className="hcp-overview-group__title">{cat}</h2>
                      <button
                        className="hcp-overview-group__all"
                        onClick={() => handleCategoryClick(cat)}
                      >
                        Xem tất cả <i className="fas fa-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="hcp-overview-group__articles">
                      {articles.map((article) => (
                        <button
                          key={article.id}
                          className="hcp-article-row"
                          onClick={() => {
                            setActiveCategory(cat);
                            setActiveArticle(article);
                          }}
                        >
                          <i className={`${article.icon} hcp-article-row__icon`} aria-hidden="true" />
                          <span className="hcp-article-row__text">
                            <span className="hcp-article-row__title">{article.title}</span>
                            <span className="hcp-article-row__desc">{article.description}</span>
                          </span>
                          <i className="fas fa-chevron-right hcp-article-row__arrow" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── BROWSING / SEARCHING: 2-column layout ── */}
          {!isOverview && (
            <div className="hcp-browser">
              {/* Sidebar */}
              <aside className="hcp-sidebar" aria-label="Danh sách bài viết">
                <div className="hcp-sidebar__header">
                  <button
                    className="hcp-sidebar__back"
                    onClick={handleBackToOverview}
                    aria-label="Quay lại tổng quan"
                  >
                    <i className="fas fa-arrow-left" aria-hidden="true" />
                    Tất cả chủ đề
                  </button>
                  <h2 className="hcp-sidebar__title">{areaTitle}</h2>
                </div>

                {sidebarArticles.length === 0 ? (
                  /* Empty state */
                  <div className="hcp-empty">
                    <i className="fas fa-search-minus hcp-empty__icon" aria-hidden="true" />
                    <p className="hcp-empty__title">Không tìm thấy kết quả</p>
                    <p className="hcp-empty__sub">Thử từ khóa khác hoặc xem tất cả chủ đề.</p>
                    <button
                      className="hcp-empty__reset"
                      onClick={handleBackToOverview}
                    >
                      Xem tất cả hướng dẫn
                    </button>
                  </div>
                ) : (
                  <nav className="hcp-sidebar__list" aria-label="Bài viết">
                    {sidebarArticles.map((article) => (
                      <button
                        key={article.id}
                        className={`hcp-sidebar__item ${activeArticle?.id === article.id ? 'hcp-sidebar__item--active' : ''}`}
                        onClick={() => handleArticleClick(article)}
                        aria-current={activeArticle?.id === article.id ? 'true' : undefined}
                      >
                        <span
                          className="hcp-sidebar__item-icon"
                          aria-hidden="true"
                          style={{
                            background: getCatMeta(article.category).bg,
                            color: getCatMeta(article.category).color,
                          }}
                        >
                          <i className={article.icon} />
                        </span>
                        <span className="hcp-sidebar__item-text">
                          <span className="hcp-sidebar__item-title">{article.title}</span>
                          {isSearching && (
                            <span className="hcp-sidebar__item-cat">{article.category}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </nav>
                )}
              </aside>

              {/* Article content */}
              <article className="hcp-content" ref={contentRef} aria-live="polite">
                {activeArticle ? (
                  <>
                    <div className="hcp-content__head">
                      <span
                        className="hcp-content__cat-badge"
                        style={{
                          background: getCatMeta(activeArticle.category).bg,
                          color: getCatMeta(activeArticle.category).color,
                        }}
                      >
                        <i className={getCatMeta(activeArticle.category).icon} aria-hidden="true" />
                        {activeArticle.category}
                      </span>
                      <h1 className="hcp-content__title">{activeArticle.title}</h1>
                      <p className="hcp-content__desc">{activeArticle.description}</p>
                    </div>
                    <div
                      className="hcp-content__body"
                      dangerouslySetInnerHTML={{ __html: activeArticle.content }}
                    />
                    <div className="hcp-content__footer">
                      <span className="hcp-content__footer-label">
                        <i className="fas fa-question-circle" aria-hidden="true" />
                        Bài viết này có hữu ích không?
                      </span>
                      <Link to="/contact" className="hcp-content__contact-link">
                        <i className="fas fa-headset" aria-hidden="true" />
                        Liên hệ hỗ trợ
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="hcp-content__placeholder">
                    <i className="fas fa-book-reader" aria-hidden="true" />
                    <p>Chọn một bài viết bên trái để đọc nội dung chi tiết.</p>
                  </div>
                )}
              </article>
            </div>
          )}
        </div>
      </main>

      {/* ══ FAQ SECTION ═══════════════════════════════════════════════════ */}
      <section className="hcp-faq" aria-labelledby="hcp-faq-heading">
        <div className="hcp-container">
          <div className="hcp-faq__header">
            <i className="fas fa-comments hcp-faq__header-icon" aria-hidden="true" />
            <h2 id="hcp-faq-heading" className="hcp-faq__title">Câu hỏi thường gặp</h2>
            <p className="hcp-faq__sub">Những câu hỏi người dùng đặt ra nhiều nhất.</p>
          </div>
          <div className="hcp-faq__list" role="list">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className={`hcp-faq__item ${openFaq === idx ? 'hcp-faq__item--open' : ''}`}
                role="listitem"
              >
                <button
                  className="hcp-faq__question"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                  id={`hcp-faq-q-${idx}`}
                  aria-controls={`hcp-faq-a-${idx}`}
                >
                  <span>{item.q}</span>
                  <i
                    className={`fas fa-chevron-down hcp-faq__chevron ${openFaq === idx ? 'hcp-faq__chevron--open' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`hcp-faq-a-${idx}`}
                  role="region"
                  aria-labelledby={`hcp-faq-q-${idx}`}
                  className="hcp-faq__answer"
                  hidden={openFaq !== idx}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA SECTION ═══════════════════════════════════════════════════ */}
      <section className="hcp-cta" aria-label="Bắt đầu thuê đồ">
        <div className="hcp-container">
          <div className="hcp-cta__inner">
            <div className="hcp-cta__text">
              <h2 className="hcp-cta__title">Sẵn sàng bắt đầu?</h2>
              <p className="hcp-cta__sub">
                Duyệt hàng nghìn sản phẩm cho thuê hoặc đăng đồ nhàn rỗi của bạn ngay hôm nay.
              </p>
            </div>
            <div className="hcp-cta__actions">
              <Link to="/shop" className="hcp-cta__btn hcp-cta__btn--primary">
                <i className="fas fa-search" aria-hidden="true" />
                Tìm thuê đồ
              </Link>
              <Link to="/post-item" className="hcp-cta__btn hcp-cta__btn--secondary">
                <i className="fas fa-plus" aria-hidden="true" />
                Đăng đồ cho thuê
              </Link>
              <Link to="/contact" className="hcp-cta__btn hcp-cta__btn--ghost">
                <i className="fas fa-headset" aria-hidden="true" />
                Cần hỗ trợ thêm?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default HelpCenterPage;
