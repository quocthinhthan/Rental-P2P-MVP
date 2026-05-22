/**
 * Làm sạch chuỗi mô tả, chặn mã độc XSS và chỉ cho phép hiển thị các thẻ định dạng cơ bản.
 * @param {string} html - Chuỗi mô tả gốc từ backend hoặc người dùng nhập.
 * @returns {string} Chuỗi HTML an toàn đã được khử độc.
 */
export function sanitizeDescription(html) {
  if (!html) return '';
  
  // 0. Giải mã thực thể HTML trước để giải quyết triệt để bất kỳ vấn đề double-escaping (nếu có)
  // giúp đầu vào luôn là chuỗi HTML raw đồng nhất trước khi xử lý
  let decoded = html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  // 1. Chuyển đổi ký tự đặc biệt để vô hiệu hóa tất cả các thẻ HTML gốc (Ngăn chặn XSS triệt để)
  let safe = decoded
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
    .replace(/&lt;\/p&gt;/gi, '</p>')
    .replace(/&lt;u&gt;/gi, '<u>')
    .replace(/&lt;\/u&gt;/gi, '</u>')
    .replace(/&lt;ul&gt;/gi, '<ul class="desc-ul">')
    .replace(/&lt;\/ul&gt;/gi, '</ul>')
    .replace(/&lt;ol&gt;/gi, '<ol class="desc-ol">')
    .replace(/&lt;\/ol&gt;/gi, '</ol>')
    .replace(/&lt;li&gt;/gi, '<li class="desc-li">')
    .replace(/&lt;\/li&gt;/gi, '</li>');

  // 2.5. Khôi phục thẻ liên kết (anchor tags) an toàn
  safe = safe.replace(/&lt;a\s+(.*?)&gt;/gi, (match, attributes) => {
    if (/href\s*=\s*["']?\s*javascript:/i.test(attributes)) {
      return '<a>';
    }
    let cleanAttrs = attributes.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    cleanAttrs = cleanAttrs.replace(/\bon\w+\s*=\s*\S+/gi, '');
    return `<a ${cleanAttrs}>`;
  });
  safe = safe.replace(/&lt;\/a&gt;/gi, '</a>');

  // 2.6. Khôi phục thẻ hình ảnh (img tags) an toàn (Người dùng chèn thêm ảnh trong mô tả)
  safe = safe.replace(/&lt;img\s+(.*?)&gt;/gi, (match, attributes) => {
    if (/src\s*=\s*["']?\s*javascript:/i.test(attributes)) {
      return '';
    }
    let cleanAttrs = attributes.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
    cleanAttrs = cleanAttrs.replace(/\bon\w+\s*=\s*\S+/gi, '');
    return `<img ${cleanAttrs} />`;
  });

  // 2.7. Khôi phục các thực thể HTML phổ biến (như &nbsp;, &amp;) để hiển thị đúng ký tự khoảng trắng và định dạng
  safe = safe
    .replace(/&amp;nbsp;/gi, '&nbsp;')
    .replace(/&amp;quot;/gi, '&quot;')
    .replace(/&amp;apos;/gi, '&apos;')
    .replace(/&amp;lt;/gi, '&lt;')
    .replace(/&amp;gt;/gi, '&gt;')
    .replace(/&amp;amp;/gi, '&amp;');

  // 3. Tự động chuyển đổi các ký tự xuống dòng (\n) thành <br/> để hiển thị xuống dòng tự nhiên
  safe = safe.replace(/\n/g, '<br/>');

  return safe;
}
