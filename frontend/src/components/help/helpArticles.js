/**
 * Help Center - Static FAQ/Guide articles for RentalP2P.
 * Data is intentionally static (no API needed).
 * Each article has: id, category, icon, title, description, content, keywords.
 */

const helpArticles = [
  {
    id: 'how-it-works',
    category: 'Bắt đầu',
    icon: 'fas fa-info-circle',
    title: 'RentalP2P hoạt động như thế nào?',
    description: 'Hiểu nhanh cách thuê và cho thuê đồ trên nền tảng.',
    keywords: ['hoạt động', 'giới thiệu', 'nền tảng', 'bắt đầu', 'tổng quan'],
    content: `<p>RentalP2P là nền tảng cho thuê đồ dùng cá nhân <strong>giữa người dùng với nhau</strong>.</p>
<ul>
  <li>Bạn có thể <strong>thuê</strong> những món đồ mình cần trong thời gian ngắn thay vì phải mua.</li>
  <li>Bạn cũng có thể <strong>cho thuê</strong> đồ nhàn rỗi của mình để kiếm thêm thu nhập.</li>
  <li>Toàn bộ quá trình — từ yêu cầu, thanh toán, ký hợp đồng đến bàn giao — đều được thực hiện <strong>trên nền tảng</strong> để đảm bảo minh bạch và có hỗ trợ khi xảy ra sự cố.</li>
</ul>`,
  },
  {
    id: 'how-to-rent',
    category: 'Người thuê',
    icon: 'fas fa-shopping-bag',
    title: 'Tôi muốn thuê một món đồ thì làm sao?',
    description: 'Các bước cơ bản để gửi yêu cầu thuê và hoàn tất giao dịch.',
    keywords: ['thuê đồ', 'yêu cầu thuê', 'gửi yêu cầu', 'người thuê', 'cách thuê'],
    content: `<ol>
  <li>Tìm sản phẩm phù hợp trên trang <strong>Cửa hàng</strong>.</li>
  <li>Chọn thời gian thuê mong muốn.</li>
  <li>Gửi yêu cầu thuê và chờ chủ đồ xác nhận.</li>
  <li>Thanh toán/đặt cọc qua cổng thanh toán an toàn trên nền tảng.</li>
  <li>Ký hợp đồng điện tử nếu hệ thống yêu cầu.</li>
  <li>Hẹn thời gian và địa điểm giao nhận đồ.</li>
  <li>Sử dụng sản phẩm trong thời gian thuê đã thỏa thuận.</li>
  <li>Trả đồ đúng hạn và đánh giá người cho thuê.</li>
</ol>`,
  },
  {
    id: 'how-to-lend',
    category: 'Chủ đồ',
    icon: 'fas fa-store',
    title: 'Tôi muốn cho thuê đồ thì làm sao?',
    description: 'Cách đăng sản phẩm và xử lý yêu cầu thuê từ người dùng khác.',
    keywords: ['cho thuê', 'đăng đồ', 'chủ đồ', 'đăng sản phẩm', 'xử lý yêu cầu'],
    content: `<ol>
  <li>Đăng sản phẩm qua trang <strong>Đăng đồ cho thuê</strong> với hình ảnh, mô tả, giá thuê và điều kiện sử dụng rõ ràng.</li>
  <li>Nhận yêu cầu thuê từ người dùng khác khi họ gửi đến.</li>
  <li>Kiểm tra thông tin người thuê, thời gian và điều kiện.</li>
  <li>Chấp nhận hoặc từ chối yêu cầu.</li>
  <li>Sau khi người thuê hoàn tất thanh toán, tiến hành ký hợp đồng và bàn giao đồ (có chụp ảnh kiểm tra).</li>
  <li>Khi người thuê trả đồ, kiểm tra tình trạng sản phẩm và xác nhận hoàn tất.</li>
  <li>Đánh giá người thuê sau giao dịch.</li>
</ol>`,
  },
  {
    id: 'rental-process',
    category: 'Quy trình',
    icon: 'fas fa-route',
    title: 'Quy trình thuê đồ từ A đến Z',
    description: 'Toàn bộ vòng đời của một giao dịch thuê trên RentalP2P.',
    keywords: ['quy trình', 'vòng đời', 'từ a đến z', 'các bước', 'luồng thuê'],
    content: `<p>Một giao dịch thuê trên RentalP2P trải qua các bước sau:</p>
<ol>
  <li><strong>Yêu cầu thuê</strong> — Người thuê gửi yêu cầu.</li>
  <li><strong>Thanh toán/đặt cọc</strong> — Người thuê thanh toán qua nền tảng.</li>
  <li><strong>Chủ đồ xác nhận</strong> — Chủ đồ chấp nhận yêu cầu.</li>
  <li><strong>Ký hợp đồng điện tử</strong> — Cả hai bên ký hợp đồng.</li>
  <li><strong>Giao nhận đồ</strong> — Chụp ảnh kiểm tra khi nhận.</li>
  <li><strong>Sử dụng</strong> — Người thuê sử dụng trong thời gian đã thỏa thuận.</li>
  <li><strong>Trả đồ</strong> — Chụp ảnh kiểm tra khi trả, xác nhận hoàn tất.</li>
  <li><strong>Đánh giá</strong> — Hai bên đánh giá lẫn nhau.</li>
</ol>
<p>Giao dịch có thể bị hủy trước khi bàn giao. Nếu đã thanh toán, tiền hoàn trả sẽ được xử lý qua nền tảng.</p>`,
  },
  {
    id: 'payment-deposit',
    category: 'Thanh toán',
    icon: 'fas fa-credit-card',
    title: 'Thanh toán và đặt cọc như thế nào?',
    description: 'Hiểu cách hoạt động của thanh toán và đặt cọc trên nền tảng.',
    keywords: ['thanh toán', 'đặt cọc', 'tiền', 'VNPay', 'hoàn tiền', 'payment'],
    content: `<p>RentalP2P sử dụng cổng thanh toán an toàn (VNPay) tích hợp trong nền tảng.</p>
<ul>
  <li>Người thuê thanh toán <strong>tiền cọc</strong> sau khi chủ đồ xác nhận yêu cầu.</li>
  <li>Tiền được giữ an toàn trong hệ thống và giải ngân cho chủ đồ khi giao dịch hoàn tất.</li>
  <li>Nếu giao dịch bị hủy trước khi bàn giao, tiền cọc sẽ được <strong>hoàn trả</strong>.</li>
  <li>Mọi thanh toán nên thực hiện <strong>qua nền tảng</strong> để đảm bảo quyền lợi.</li>
</ul>`,
  },
  {
    id: 'contract-handover',
    category: 'Hợp đồng',
    icon: 'fas fa-file-signature',
    title: 'Ký hợp đồng và giao nhận đồ',
    description: 'Cách ký hợp đồng điện tử và quy trình giao nhận an toàn.',
    keywords: ['hợp đồng', 'ký hợp đồng', 'bàn giao', 'giao nhận', 'chữ ký điện tử'],
    content: `<p>Sau khi chủ đồ xác nhận và người thuê thanh toán, hệ thống sẽ tự động tạo <strong>hợp đồng điện tử</strong>.</p>
<ul>
  <li>Cả hai bên cần ký hợp đồng trước khi tiến hành giao nhận.</li>
  <li>Khi giao đồ, chụp ảnh tình trạng sản phẩm để làm bằng chứng.</li>
  <li>Khi trả đồ, cũng cần chụp ảnh kiểm tra và xác nhận hoàn tất trên hệ thống.</li>
  <li>Ảnh bằng chứng là căn cứ quan trọng nếu xảy ra tranh chấp.</li>
</ul>`,
  },
  {
    id: 'disputes',
    category: 'Tranh chấp',
    icon: 'fas fa-shield-alt',
    title: 'Nếu có sự cố hoặc tranh chấp thì sao?',
    description: 'Quy trình xử lý tranh chấp từng bước — từ tạo khiếu nại đến phán quyết của Admin.',
    keywords: ['tranh chấp', 'sự cố', 'hư hỏng', 'mất mát', 'khiếu nại', 'báo cáo', 'admin', 'hoàn tiền'],
    content: `<p>Nếu xảy ra sự cố (hư hỏng, mất mát, vi phạm thỏa thuận), bạn có thể mở tranh chấp ngay trên trang quản lý đơn thuê.</p>

<p><strong>Quy trình xử lý tranh chấp:</strong></p>
<ol>
  <li><strong>Tạo tranh chấp</strong> — Gửi lý do và ảnh bằng chứng. Hệ thống ngay lập tức đóng băng đơn thuê: cả hai bên không thể xác nhận, nhận đồ, trả đồ hay thanh toán trong thời gian này.</li>
  <li><strong>Tự hòa giải 48 giờ</strong> — Cả hai bên có 48 giờ để trao đổi và tự giải quyết qua chat. Người tạo tranh chấp có thể <em>rút lại</em> nếu hai bên đã đồng thuận.</li>
  <li><strong>Yêu cầu Admin can thiệp</strong> — Sau 48 giờ nếu chưa giải quyết được, một trong hai bên có thể leo thang lên Admin.</li>
  <li><strong>Admin xem xét và phán quyết</strong> — Admin kiểm tra lý do, bằng chứng, lịch sử giao dịch và đưa ra quyết định cuối cùng.</li>
</ol>

<p><strong>Kết quả có thể xảy ra:</strong></p>
<ul>
  <li><strong>Người thuê thắng</strong> — Hoàn tiền cọc, đơn thuê bị hủy. Chủ đồ có thể bị cảnh cáo hoặc trừ điểm tin cậy.</li>
  <li><strong>Chủ đồ thắng</strong> — Đơn thuê hoàn tất, tiền được giải ngân cho chủ đồ. Người thuê có thể bị cảnh cáo.</li>
  <li><strong>Không xác định bên thắng</strong> — Phục hồi trạng thái đơn thuê về trước khi tranh chấp, không xử phạt ai.</li>
</ul>

<p><strong>Lưu ý quan trọng:</strong> Ảnh chụp khi giao và khi trả đồ là bằng chứng quan trọng nhất. Hãy luôn chụp ảnh đầy đủ trước khi ký xác nhận.</p>`,
  },
  {
    id: 'trust-score',
    category: 'Uy tín',
    icon: 'fas fa-star',
    title: 'Điểm tin cậy là gì?',
    description: 'Hiểu cách hệ thống đánh giá độ uy tín của người dùng.',
    keywords: ['điểm tin cậy', 'uy tín', 'trustscore', 'đánh giá', 'xếp hạng'],
    content: `<p><strong>Điểm tin cậy</strong> (Trust Score) phản ánh mức độ uy tín của bạn trên nền tảng, được tính dựa trên:</p>
<ul>
  <li>Lịch sử giao dịch và tỷ lệ hoàn thành đúng hạn.</li>
  <li>Đánh giá từ người thuê / chủ đồ đã giao dịch cùng.</li>
  <li>Xác minh danh tính (eKYC).</li>
  <li>Lịch sử tranh chấp và vi phạm (nếu có).</li>
</ul>
<p>Điểm tin cậy cao giúp bạn được ưu tiên trong kết quả tìm kiếm và tạo thiện cảm với đối tác giao dịch.</p>`,
  },
  {
    id: 'ekyc-verification',
    category: 'Uy tín',
    icon: 'fas fa-id-card',
    title: 'Xác minh danh tính (eKYC) bằng CCCD',
    description: 'Tại sao cần xác minh CCCD và quy trình hoạt động như thế nào.',
    keywords: ['ekyc', 'cccd', 'căn cước công dân', 'xác minh', 'danh tính', 'cư dân', 'cảnh sát', 'quốc gia'],
    content: `<p>RentalP2P sử dụng hệ thống xác minh điện tử <strong>eKYC</strong> (Electronic Know Your Customer) bằng Căn cước công dân (CCCD), đối chiếu với <strong>cơ sở dữ liệu cư dân quốc gia Việt Nam</strong>.</p>

<p><strong>Tại sao cần xác minh?</strong></p>
<ul>
  <li>Xác nhận bạn là người thật, giảm rủi ro lừa đảo và giả mạo danh tính.</li>
  <li>Tăng điểm tin cậy đáng kể — tài khoản đã xác minh CCCD được ưu tiên hiển thị và tin tưởng hơn.</li>
  <li>Một số chủ đồ chỉ cho thuê đối với người thuê đã xác minh danh tính.</li>
</ul>

<p><strong>Quy trình xác minh:</strong></p>
<ol>
  <li>Vào trang <strong>Tài khoản của tôi</strong> → mục <em>Xác minh danh tính</em>.</li>
  <li>Tải ảnh hai mặt CCCD còn hạn sử dụng.</li>
  <li>Hệ thống tự động đối chiếu thông tin với cơ sở dữ liệu cư dân quốc gia.</li>
  <li>Kết quả thường có trong vài phút. Sau khi xác minh thành công, huy hiệu <em>Đã xác minh</em> sẽ xuất hiện trên hồ sơ của bạn.</li>
</ol>

<p><strong>Lưu ý:</strong> Thông tin CCCD được mã hóa và bảo mật, chỉ dùng để xác thực danh tính, không được chia sẻ cho bên thứ ba. Bạn không thể thay đổi thông tin CCCD sau khi đã xác minh thành công.</p>`,
  },
  {
    id: 'safe-policy',
    category: 'An toàn',
    icon: 'fas fa-lock',
    title: 'Tôi có được giao dịch bên ngoài nền tảng không?',
    description: 'Vì sao nên giữ toàn bộ giao dịch trong nền tảng.',
    keywords: ['giao dịch ngoài', 'an toàn', 'bảo vệ', 'chính sách', 'ngoài nền tảng'],
    content: `<p><strong>Không nên</strong> thực hiện thanh toán hoặc giao dịch bên ngoài nền tảng. Lý do:</p>
<ul>
  <li>Bạn sẽ mất quyền được hỗ trợ khi xảy ra tranh chấp.</li>
  <li>Không có lịch sử giao dịch, hợp đồng hoặc bằng chứng được hệ thống ghi nhận.</li>
  <li>Không được bảo vệ bởi cơ chế escrow (giữ tiền an toàn) của nền tảng.</li>
</ul>
<p>Luôn thực hiện toàn bộ giao dịch — từ thanh toán đến liên lạc — <strong>trên RentalP2P</strong> để đảm bảo quyền lợi của cả hai bên.</p>`,
  },
  {
    id: 'prohibited',
    category: 'Quy tắc',
    icon: 'fas fa-ban',
    title: 'Những hành vi bị cấm trên nền tảng',
    description: 'Các hành vi vi phạm quy tắc cộng đồng của RentalP2P.',
    keywords: ['bị cấm', 'vi phạm', 'quy tắc', 'cộng đồng', 'hành vi xấu', 'tài khoản bị khóa'],
    content: `<p>Các hành vi sau đây bị cấm nghiêm trên RentalP2P:</p>
<ul>
  <li>Giao dịch bên ngoài nền tảng để tránh phí hoặc tránh giám sát.</li>
  <li>Đăng thông tin sản phẩm sai lệch, hình ảnh giả mạo.</li>
  <li>Cố tình làm hỏng tài sản của người khác.</li>
  <li>Quấy rối, lừa đảo, đe dọa người dùng khác.</li>
  <li>Tạo nhiều tài khoản để lách hệ thống.</li>
  <li>Đăng các sản phẩm bị pháp luật cấm.</li>
</ul>
<p>Vi phạm có thể dẫn đến cảnh báo, giảm điểm tin cậy, hoặc <strong>khóa tài khoản vĩnh viễn</strong>.</p>`,
  },
];

export default helpArticles;

/* ─── Category display metadata for the Help Center page ──────────────────
   Keeps visual config (color, bgColor, catIcon) separate from article data.
   The `category` key must match the `category` field in helpArticles exactly.
──────────────────────────────────────────────────────────────────────────── */
export const categoryMeta = [
  { category: 'Bắt đầu',   icon: 'fas fa-rocket',        color: '#f97316', bg: '#fff7ed' },
  { category: 'Người thuê', icon: 'fas fa-shopping-bag',  color: '#3b82f6', bg: '#eff6ff' },
  { category: 'Chủ đồ',    icon: 'fas fa-store',          color: '#10b981', bg: '#ecfdf5' },
  { category: 'Quy trình', icon: 'fas fa-route',          color: '#8b5cf6', bg: '#f5f3ff' },
  { category: 'Thanh toán',icon: 'fas fa-credit-card',    color: '#ec4899', bg: '#fdf2f8' },
  { category: 'Hợp đồng',  icon: 'fas fa-file-signature', color: '#f59e0b', bg: '#fffbeb' },
  { category: 'Tranh chấp',icon: 'fas fa-shield-alt',     color: '#ef4444', bg: '#fef2f2' },
  { category: 'Uy tín',    icon: 'fas fa-star',           color: '#f97316', bg: '#fff7ed' },
  { category: 'An toàn',   icon: 'fas fa-lock',           color: '#06b6d4', bg: '#ecfeff' },
  { category: 'Quy tắc',   icon: 'fas fa-ban',            color: '#64748b', bg: '#f8fafc' },
];

/* ─── FAQ items — quick Q&A shown at bottom of Help Center page ────────── */
export const faqItems = [
  {
    q: 'Tôi có cần đăng ký tài khoản để thuê đồ không?',
    a: 'Có. Bạn cần đăng ký và đăng nhập để gửi yêu cầu thuê, thanh toán và ký hợp đồng. Tuy nhiên, bạn có thể duyệt sản phẩm và xem giá mà không cần đăng nhập.',
  },
  {
    q: 'Tiền cọc hoạt động như thế nào?',
    a: 'Tiền cọc được giữ an toàn trong hệ thống khi bạn thuê. Nếu đồ được trả đúng hạn và nguyên vẹn, chủ đồ xác nhận hoàn tất và tiền được xử lý theo thỏa thuận. Nếu giao dịch bị hủy trước khi bàn giao, tiền cọc được hoàn lại cho người thuê.',
  },
  {
    q: 'Tôi có thể hủy yêu cầu thuê sau khi gửi không?',
    a: 'Có, bạn có thể hủy yêu cầu trước khi thanh toán hoặc trước khi chủ đồ xác nhận. Sau khi đã thanh toán và bàn giao, việc hủy sẽ phụ thuộc vào chính sách từng chủ đồ và có thể cần qua luồng tranh chấp.',
  },
  {
    q: 'Nếu chủ đồ không xác nhận yêu cầu của tôi thì sao?',
    a: 'Nếu chủ đồ không phản hồi hoặc từ chối yêu cầu, bạn sẽ được thông báo và có thể tìm sản phẩm khác. Hệ thống không tự động tính phí khi yêu cầu bị từ chối.',
  },
  {
    q: 'Làm sao để tăng điểm tin cậy của tôi?',
    a: 'Hoàn thành giao dịch đúng hạn, nhận đánh giá tốt từ các bên giao dịch, xác minh danh tính qua eKYC, và tránh tranh chấp hoặc vi phạm quy tắc nền tảng.',
  },
  {
    q: 'Hợp đồng điện tử có giá trị pháp lý không?',
    a: 'Hợp đồng điện tử trên RentalP2P có chữ ký điện tử của cả hai bên, ghi nhận thời gian thuê, tình trạng sản phẩm và điều kiện sử dụng. Đây là căn cứ quan trọng khi cần giải quyết tranh chấp trong hệ thống.',
  },
  {
    q: 'Tôi có thể cho thuê nhiều sản phẩm cùng lúc không?',
    a: 'Có. Bạn có thể đăng nhiều sản phẩm và quản lý chúng qua trang "Quản lý đơn thuê". Mỗi sản phẩm có lịch đặt riêng và hệ thống tự động kiểm tra xung đột ngày thuê.',
  },
  {
    q: 'Nếu tôi nhận được sản phẩm không đúng mô tả thì làm sao?',
    a: 'Không nhận đồ và tạo tranh chấp ngay trong trang quản lý đơn thuê, kèm theo ảnh bằng chứng. Hệ thống sẽ xử lý và Admin sẽ can thiệp nếu cần.',
  },
];
