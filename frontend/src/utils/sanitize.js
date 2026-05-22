/**
 * Làm sạch chuỗi mô tả, chặn mã độc XSS và chỉ cho phép hiển thị các thẻ định dạng cơ bản.
 * @param {string} html - Chuỗi mô tả gốc từ backend hoặc người dùng nhập.
 * @returns {string} Chuỗi HTML an toàn đã được khử độc.
 */
export function sanitizeDescription(html) {
  if (!html) return '';
  
  // 1. Chuyển đổi ký tự đặc biệt để vô hiệu hóa tất cả các thẻ HTML gốc (Ngăn chặn XSS triệt để)
  let safe = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 2. Khôi phục chọn lọc các thẻ định dạng cơ bản an toàn (không phân biệt chữ hoa/thường)
  safe = safe
    .replace(/&lt;b&gt;/gi, '<strong>')
    .replace(/&lt;\/b&gt;/gi, '</strong>')
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>')
    .replace(/&lt;i&gt;/gi, '<em>')
    .replace(/&lt;\/i&gt;/gi, '<em>')
    .replace(/&lt;em&gt;/gi, '<em>')
    .replace(/&lt;\/em&gt;/gi, '</em>')
    .replace(/&lt;h2&gt;/gi, '<h2 class="desc-h2">')
    .replace(/&lt;\/h2&gt;/gi, '</h2>')
    .replace(/&lt;h3&gt;/gi, '<h3 class="desc-h3">')
    .replace(/&lt;\/h3&gt;/gi, '</h3>')
    .replace(/&lt;h4&gt;/gi, '<h4 class="desc-h4">')
    .replace(/&lt;\/h4&gt;/gi, '</h4>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
    .replace(/&lt;p&gt;/gi, '<p class="desc-p">')
    .replace(/&lt;\/p&gt;/gi, '</p>');

  // 3. Tự động chuyển đổi các ký tự xuống dòng (\n) thành <br/> để hiển thị xuống dòng tự nhiên
  safe = safe.replace(/\n/g, '<br/>');

  return safe;
}
