import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { faqItems, categoryMeta } from '../components/help/helpArticles';
import '../styles/HelpCenterPage.css'; /* reuse all hcp-* styles */
import '../styles/FAQPage.css';

function FAQPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? faqItems.filter(
        (item) =>
          item.q.toLowerCase().includes(query.toLowerCase()) ||
          item.a.toLowerCase().includes(query.toLowerCase())
      )
    : faqItems;

  return (
    <>
      {/* ══ HERO — reuses hcp-hero styles ══════════════════════════════════ */}
      <section className="hcp-hero" aria-label="FAQ Hero">
        <div className="hcp-hero__inner">
          <div className="hcp-hero__badge">
            <i className="fas fa-comments" aria-hidden="true" />
            Câu hỏi thường gặp
          </div>
          <h1 className="hcp-hero__title">Câu hỏi thường gặp (FAQ)</h1>
          <p className="hcp-hero__sub">
            Tổng hợp những câu hỏi người dùng đặt ra nhiều nhất về RentalP2P.
          </p>

          {/* Search */}
          <form
            className="hcp-hero__search"
            onSubmit={(e) => e.preventDefault()}
            role="search"
            aria-label="Tìm kiếm câu hỏi"
          >
            <span className="hcp-hero__search-icon" aria-hidden="true">
              <i className="fas fa-search" />
            </span>
            <input
              type="text"
              className="hcp-hero__search-input"
              placeholder="Tìm câu hỏi... (VD: tiền cọc, hợp đồng, hủy đơn)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm kiếm câu hỏi"
            />
            {query && (
              <button
                type="button"
                className="hcp-hero__search-clear"
                onClick={() => setQuery('')}
                aria-label="Xóa tìm kiếm"
              >
                <i className="fas fa-times" aria-hidden="true" />
              </button>
            )}
          </form>

          <div className="hcp-hero__stats">
            <span><i className="fas fa-question-circle" aria-hidden="true" /> {faqItems.length} câu hỏi</span>
            <span><i className="fas fa-book-open" aria-hidden="true" />
              <Link to="/help" className="faq-hero__help-link">Xem hướng dẫn chi tiết</Link>
            </span>
          </div>
        </div>
      </section>

      {/* ══ BREADCRUMB ════════════════════════════════════════════════════ */}
      <div className="hcp-breadcrumb-wrap">
        <div className="hcp-container">
          <ol className="hcp-breadcrumb" aria-label="Đường dẫn">
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/help">Trợ giúp</Link></li>
            <li><span className="hcp-breadcrumb__active">FAQ</span></li>
          </ol>
        </div>
      </div>

      {/* ══ FAQ CONTENT ═══════════════════════════════════════════════════ */}
      <main className="faq-main">
        <div className="hcp-container">
          <div className="faq-layout">

            {/* Left: category quick-links */}
            <aside className="faq-sidebar" aria-label="Chủ đề liên quan">
              <div className="faq-sidebar__card">
                <h2 className="faq-sidebar__title">
                  <i className="fas fa-layer-group" aria-hidden="true" />
                  Chủ đề hướng dẫn
                </h2>
                <p className="faq-sidebar__sub">Cần đọc hướng dẫn chi tiết hơn?</p>
                <div className="faq-sidebar__cats">
                  {categoryMeta.map((meta) => (
                    <Link
                      key={meta.category}
                      to="/help"
                      className="faq-sidebar__cat"
                      style={{ '--cat-color': meta.color, '--cat-bg': meta.bg }}
                    >
                      <span className="faq-sidebar__cat-icon" aria-hidden="true">
                        <i className={meta.icon} />
                      </span>
                      {meta.category}
                      <i className="fas fa-chevron-right faq-sidebar__cat-arrow" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Still need help CTA */}
              <div className="faq-sidebar__cta">
                <i className="fas fa-headset faq-sidebar__cta-icon" aria-hidden="true" />
                <p className="faq-sidebar__cta-title">Vẫn cần hỗ trợ?</p>
                <p className="faq-sidebar__cta-sub">Đội ngũ CSKH luôn sẵn sàng giúp bạn 24/7.</p>
                <Link to="/contact" className="faq-sidebar__cta-btn">
                  Liên hệ ngay
                </Link>
              </div>
            </aside>

            {/* Right: FAQ accordion */}
            <section className="faq-accordion-wrap" aria-labelledby="faq-heading">
              <div className="faq-accordion-header">
                <h2 id="faq-heading" className="faq-accordion-title">
                  {query.trim()
                    ? `Kết quả cho "${query.trim()}" (${filtered.length})`
                    : `Tất cả câu hỏi (${faqItems.length})`}
                </h2>
                {query && (
                  <button
                    className="faq-accordion-reset"
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <i className="fas fa-times" aria-hidden="true" /> Bỏ lọc
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="faq-empty">
                  <i className="fas fa-search-minus faq-empty__icon" aria-hidden="true" />
                  <p className="faq-empty__title">Không tìm thấy câu hỏi phù hợp</p>
                  <p className="faq-empty__sub">Thử từ khóa khác hoặc xem toàn bộ câu hỏi.</p>
                  <button
                    className="faq-empty__reset"
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    Xem tất cả câu hỏi
                  </button>
                </div>
              ) : (
                <div className="faq-accordion" role="list">
                  {filtered.map((item, idx) => {
                    const realIdx = faqItems.indexOf(item);
                    const isOpen = openFaq === realIdx;
                    return (
                      <div
                        key={realIdx}
                        className={`faq-accordion__item ${isOpen ? 'faq-accordion__item--open' : ''}`}
                        role="listitem"
                      >
                        <button
                          className="faq-accordion__question"
                          onClick={() => setOpenFaq(isOpen ? null : realIdx)}
                          aria-expanded={isOpen}
                          id={`faq-q-${realIdx}`}
                          aria-controls={`faq-a-${realIdx}`}
                        >
                          <span className="faq-accordion__num" aria-hidden="true">
                            {String(realIdx + 1).padStart(2, '0')}
                          </span>
                          <span className="faq-accordion__q-text">{item.q}</span>
                          <i
                            className={`fas fa-chevron-down faq-accordion__chevron ${isOpen ? 'faq-accordion__chevron--open' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        <div
                          id={`faq-a-${realIdx}`}
                          role="region"
                          aria-labelledby={`faq-q-${realIdx}`}
                          className="faq-accordion__answer"
                          hidden={!isOpen}
                        >
                          <p>{item.a}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Link to full help center */}
              <div className="faq-more-link">
                <i className="fas fa-book-open" aria-hidden="true" />
                Chưa tìm thấy câu trả lời?{' '}
                <Link to="/help">Xem hướng dẫn chi tiết đầy đủ →</Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ══ CTA — reuses hcp-cta styles ════════════════════════════════════ */}
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

export default FAQPage;
