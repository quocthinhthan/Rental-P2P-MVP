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
    content: `<p><strong>Điểm tin cậy</strong> (Trust Score) là một chỉ số cực kỳ quan trọng phản ánh mức độ uy tín, an toàn và tính trách nhiệm của mỗi người dùng trên nền tảng RentalP2P. Điểm số này được tính toán hoàn toàn tự động bằng hệ thống từ <strong>0 đến 100 điểm</strong>.</p>

<div class="alert alert-info mb-4">
  <h5><i class="fas fa-exclamation-circle me-2"></i>Sự khác biệt cốt lõi:</h5>
  <p class="mb-0"><strong>Điểm tin cậy (0 - 100):</strong> Đánh giá tính an toàn giao dịch, eKYC, lịch sử chấp hành quy tắc, tranh chấp và vi phạm.</p>
  <p class="mb-0"><strong>Đánh giá sao (1.0 - 5.0):</strong> Đo lường mức độ hài lòng về chất lượng sản phẩm và dịch vụ của bạn từ các đối tác sau khi hoàn tất giao dịch.</p>
</div>

<h4 class="text-primary mt-4 mb-3"><i class="fas fa-play-circle me-2"></i>Điểm khởi đầu mặc định</h4>
<p>Khi một tài khoản mới được tạo lập, hệ thống sẽ cấp mức điểm tin cậy mặc định ban đầu là <strong>50 điểm</strong> (Mức Trung bình - Người dùng mới / Ít dữ liệu). Điểm số này sẽ tự động thay đổi dựa trên hành vi giao dịch thực tế của bạn.</p>

<h4 class="text-success mt-4 mb-3"><i class="fas fa-plus-circle me-2"></i>Quy tắc CỘNG ĐIỂM (Tăng uy tín)</h4>
<p>Bạn có thể tích lũy thêm điểm tin cậy thông qua các hoạt động xác thực thông tin và giao dịch thành công:</p>
<div class="table-responsive">
  <table class="table table-bordered table-striped table-hover mb-4">
    <thead class="table-light">
      <tr>
        <th style="width: 35%;">Hành động / Sự kiện</th>
        <th style="width: 15%; text-align: center;">Điểm cộng</th>
        <th style="width: 50%;">Chi tiết quy định</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Xác minh danh tính (eKYC)</strong></td>
        <td class="text-success" style="text-align: center; font-weight: bold;">+20</td>
        <td>Xác thực thành công thông tin Căn cước công dân (CCCD) với Cơ sở dữ liệu cư dân Quốc gia.</td>
      </tr>
      <tr>
        <td><strong>Hoàn thành đơn thuê</strong></td>
        <td class="text-success" style="text-align: center; font-weight: bold;">+2 / đơn</td>
        <td>Cộng cho <strong>cả Người thuê và Chủ tài sản</strong> khi đơn hàng hoàn tất suôn sẻ.<br><small class="text-muted">*Tối đa cộng <strong>+20 điểm</strong> (sau 10 đơn thuê đầu tiên).*</small></td>
      </tr>
      <tr>
        <td><strong>Đánh giá tích cực công khai</strong></td>
        <td class="text-success" style="text-align: center; font-weight: bold;">Tối đa +10</td>
        <td>Dựa trên điểm trung bình đánh giá công khai nhận được từ đối tác:<br>
          • Đạt từ <strong>4.8 ★</strong> trở lên: <strong>+10 điểm</strong><br>
          • Đạt từ <strong>4.5 ★ đến dưới 4.8 ★</strong>: <strong>+7 điểm</strong><br>
          • Đạt từ <strong>4.0 ★ đến dưới 4.5 ★</strong>: <strong>+4 điểm</strong>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<h4 class="text-danger mt-4 mb-3"><i class="fas fa-minus-circle me-2"></i>Quy tắc TRỪ ĐIỂM (Vi phạm & Sự cố)</h4>
<p>Để bảo vệ cộng đồng, các hành vi vi phạm thỏa thuận, thông tin giả mạo hoặc tranh chấp lỗi sẽ bị khấu trừ điểm nghiêm khắc:</p>
<div class="table-responsive">
  <table class="table table-bordered table-striped table-hover mb-4">
    <thead class="table-light">
      <tr>
        <th style="width: 35%;">Hành vi / Sự cố vi phạm</th>
        <th style="width: 15%; text-align: center;">Điểm trừ</th>
        <th style="width: 50%;">Chi tiết quy định</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>eKYC bị từ chối</strong></td>
        <td class="text-danger" style="text-align: center; font-weight: bold;">-10</td>
        <td>Tải lên tài liệu không hợp lệ, mờ, sai lệch thông tin hoặc nghi ngờ giả mạo.</td>
      </tr>
      <tr>
        <td><strong>Nhận đánh giá tiêu cực</strong></td>
        <td class="text-danger" style="text-align: center; font-weight: bold;">Tối đa -10</td>
        <td>Dựa trên điểm đánh giá trung bình công khai từ các đối tác cũ:<br>
          • Điểm trung bình <strong>dưới 3.0 ★</strong>: <strong>-10 điểm</strong><br>
          • Điểm trung bình từ <strong>3.0 ★ đến dưới 3.5 ★</strong>: <strong>-5 điểm</strong>
        </td>
      </tr>
      <tr>
        <td><strong>Bị xử phạt lỗi khi Tranh chấp</strong></td>
        <td class="text-danger" style="text-align: center; font-weight: bold;">Tối đa -30</td>
        <td>Khi tranh chấp kết thúc và Admin phán quyết lỗi thuộc về bạn:<br>
          • Nhận Cảnh cáo (Warning): <strong>-15 điểm</strong> / lần.<br>
          • Bị Tạm khóa tài khoản (Suspension): <strong>-30 điểm</strong> / lần.<br>
          • Bị Cấm vĩnh viễn (Ban): Điểm tin cậy lập tức về <strong>0</strong>.
        </td>
      </tr>
      <tr>
        <td><strong>Sản phẩm đăng tải bị Báo cáo vi phạm</strong></td>
        <td class="text-danger" style="text-align: center; font-weight: bold;">Tối đa -25</td>
        <td>Chủ tài sản có sản phẩm vi phạm bị báo cáo và Admin xử lý phê duyệt:<br>
          • Nhận Cảnh cáo chủ tài sản: <strong>-10 điểm</strong> / báo cáo.<br>
          • Sản phẩm bị Ẩn hoặc Gỡ (Delist): <strong>-15 điểm</strong> / sản phẩm.<br>
          • Sản phẩm bị Cấm (Ban Item): <strong>-25 điểm</strong> / sản phẩm.
        </td>
      </tr>
    </tbody>
  </table>
</div>

<h4 class="text-warning mt-4 mb-3"><i class="fas fa-shield-alt me-2"></i>Quy tắc đặc biệt & Giới hạn điểm</h4>
<ul>
  <li><strong>Giới hạn điểm tối đa của tài khoản bị khóa tạm thời:</strong> Khi tài khoản bị tạm khóa (có trường <em>suspendedUntil</em> hiệu lực), điểm tin cậy sẽ bị <strong>giới hạn tối đa là 40 điểm</strong>. Dù điểm lý thuyết của bạn có cao hơn, hệ thống vẫn áp đặt mức trần này cho đến khi hết thời hạn khóa.</li>
  <li><strong>Khóa tài khoản vĩnh viễn:</strong> Nếu bạn bị cấm vĩnh viễn khỏi nền tảng, điểm tin cậy của bạn sẽ lập tức chuyển về <strong>0 điểm</strong>.</li>
  <li><strong>Giới hạn thang điểm:</strong> Điểm tin cậy luôn được duy trì và làm tròn trong phạm vi chuẩn từ <strong>0 đến 100 điểm</strong>.</li>
</ul>

<h4 class="text-info mt-4 mb-3"><i class="fas fa-id-badge me-2"></i>Phân loại mức độ uy tín (Trust Levels)</h4>
<p>Dựa trên điểm tin cậy hiện tại, hệ thống tự động xếp hạng hồ sơ của bạn vào các nhóm uy tín sau để hiển thị công khai:</p>
<div class="table-responsive">
  <table class="table table-bordered table-striped table-hover mb-4">
    <thead class="table-light">
      <tr>
        <th style="width: 25%; text-align: center;">Khoảng điểm</th>
        <th style="width: 25%; text-align: center;">Hạng uy tín</th>
        <th style="width: 50%;">Ý nghĩa hiển thị & Quyền lợi</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-success">
        <td style="text-align: center; font-weight: bold;">90 - 100</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-medal text-warning me-1"></i>Rất uy tín (Very High)</td>
        <td>Được ưu tiên cao nhất trong kết quả tìm kiếm sản phẩm. Tạo thiện cảm lớn cho đối tác khi gửi/xác nhận thuê đồ.</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">75 - 89</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-check-circle text-success me-1"></i>Uy tín cao (High)</td>
        <td>Tài khoản có lịch sử hoạt động xuất sắc. Đơn thuê và giao dịch được duyệt nhanh chóng.</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">60 - 74</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-user-check text-info me-1"></i>Khá uy tín (Medium)</td>
        <td>Mức độ tin cậy ổn định, đáp ứng tốt quy tắc giao dịch chung.</td>
      </tr>
      <tr class="table-warning">
        <td style="text-align: center; font-weight: bold;">40 - 59</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-baby text-muted me-1"></i>Mới / Ít dữ liệu (New)</td>
        <td>Là mức điểm mặc định ban đầu. Bạn cần tích lũy thêm các đơn hàng thành công hoặc eKYC để gia tăng điểm số.</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: bold;">20 - 39</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-exclamation-triangle text-warning me-1"></i>Cần cân nhắc (Low)</td>
        <td>Tài khoản từng bị cảnh cáo hoặc có tranh chấp lỗi. Cần cải thiện hành vi giao dịch.</td>
      </tr>
      <tr class="table-danger">
        <td style="text-align: center; font-weight: bold;">0 - 19</td>
        <td style="text-align: center; font-weight: bold;"><i class="fas fa-times-circle text-danger me-1"></i>Rủi ro cao (Very Low)</td>
        <td>Tài khoản vi phạm nghiêm trọng, bị báo cáo nhiều lần hoặc đang bị khóa. Rất khó khăn khi thực hiện các giao dịch mới.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="alert alert-success mt-4">
  <p class="mb-0"><strong><i class="fas fa-lightbulb me-2"></i>Lời khuyên duy trì uy tín:</strong> Luôn hoàn thành việc giao nhận đúng hạn, ký hợp đồng điện tử trước khi bàn giao, chụp ảnh tình trạng sản phẩm đầy đủ để lưu trữ bằng chứng và ứng xử văn minh trong các cuộc trò chuyện.</p>
</div>`,
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
    a: `Bạn có thể gia tăng điểm tin cậy của mình bằng các cách sau:<br />
<ul class="mt-2 mb-2" style="padding-left: 20px;">
  <li class="mb-1"><strong>Xác minh danh tính (eKYC)</strong> bằng CCCD thành công: Cộng ngay <strong>+20 điểm</strong>.</li>
  <li class="mb-1"><strong>Hoàn thành đơn thuê suôn sẻ đúng hạn</strong>: Cộng <strong>+2 điểm / đơn</strong> (cộng cho cả Người thuê và Chủ đồ, tối đa +20 điểm).</li>
  <li class="mb-1"><strong>Tích lũy đánh giá tích cực</strong> công khai từ đối tác: Cộng từ <strong>+4 đến +10 điểm</strong> (khi đạt trung bình từ 4.0★ trở lên).</li>
</ul>
Tránh các hành vi vi phạm, bị phán quyết lỗi trong tranh chấp hoặc có sản phẩm bị báo cáo vi phạm để không bị hệ thống trừ điểm.<br />
<br />
<em>*Chi tiết về thang điểm, mức cộng/trừ và phân loại uy tín, bạn có thể xem bảng tính điểm đầy đủ ở bài viết <strong>"Điểm tin cậy là gì?"</strong> thuộc mục <strong>"Uy tín"</strong> của Trung tâm trợ giúp.</em>`,
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
