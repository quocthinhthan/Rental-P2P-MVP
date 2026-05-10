const MESSAGES = Object.freeze({
  AUTH: Object.freeze({
    LOGIN_SUCCESS: 'Đăng nhập thành công.',
    REGISTER_SUCCESS: 'Đăng ký tài khoản thành công.',
    LOGOUT_SUCCESS: 'Đăng xuất thành công.',
    EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    WRONG_PASSWORD: 'Mật khẩu không đúng.',
    USER_NOT_FOUND: 'Tài khoản không tồn tại.',
    ACCOUNT_BANNED: 'Tài khoản của bạn đã bị khóa.',
    TOKEN_INVALID: 'Token không hợp lệ hoặc đã hết hạn.',
    TOKEN_MISSING: 'Vui lòng đăng nhập để tiếp tục.',
    ADMIN_REQUIRED: 'Bạn cần quyền quản trị viên để thực hiện thao tác này.'
  }),

  USER: Object.freeze({
    NOT_FOUND: 'Không tìm thấy người dùng.',
    STATUS_UPDATED: 'Cập nhật trạng thái người dùng thành công.'
  }),

  ITEM: Object.freeze({
    NOT_FOUND: 'Không tìm thấy vật phẩm.',
    CREATED: 'Tạo vật phẩm thành công.',
    UPDATED: 'Cập nhật vật phẩm thành công.',
    DELETED: 'Xóa vật phẩm thành công.',
    STATUS_UPDATED: 'Cập nhật trạng thái vật phẩm thành công.',
    NO_PERMISSION_UPDATE: 'Bạn không có quyền chỉnh sửa vật phẩm này.',
    NO_PERMISSION_DELETE: 'Bạn không có quyền xóa vật phẩm này.',
    NOT_AVAILABLE: 'Vật phẩm hiện không còn trống để thuê.',
    NO_LONGER_AVAILABLE: 'Vật phẩm không còn khả dụng.',
    CANNOT_DELETE_WHILE_RENTED: 'Không thể xóa vật phẩm khi đang được thuê.',
    SEARCH_FAILED: 'Có lỗi xảy ra khi tìm kiếm vật phẩm.'
  }),

  RENTAL: Object.freeze({
    NOT_FOUND: 'Không tìm thấy đơn thuê.',
    CREATED: 'Tạo yêu cầu thuê thành công.',
    REQUEST_SUCCESS: 'Gửi yêu cầu thuê thành công.',
    OWN_ITEM_NOT_ALLOWED: 'Bạn không thể thuê vật phẩm của chính mình.',
    ITEM_NOT_AVAILABLE: 'Vật phẩm hiện không còn trống để thuê.',
    INVALID_DATE_RANGE: 'Ngày kết thúc phải sau ngày bắt đầu.',
    NOT_RENTER: 'Bạn không có quyền thanh toán đơn thuê này.',
    NOT_OWNER: 'Bạn không có quyền xử lý đơn thuê này.',
    NOT_PARTICIPANT: 'Bạn không có quyền thao tác trên đơn thuê này.',
    WAITING_PAYMENT_REQUIRED: 'Đơn thuê không ở trạng thái chờ thanh toán.',
    CANNOT_CONFIRM: 'Không thể xác nhận đơn thuê ở trạng thái hiện tại.',
    CANNOT_REJECT: 'Không thể từ chối đơn thuê ở trạng thái hiện tại.',
    CANNOT_COMPLETE: 'Không thể hoàn tất đơn thuê ở trạng thái hiện tại.',
    CONFIRMED: 'Xác nhận đơn thuê thành công.',
    REJECTED: 'Từ chối đơn thuê thành công.',
    COMPLETED: 'Hoàn tất đơn thuê thành công.'
  }),

  PAYMENT: Object.freeze({
    VNPAY_CONFIG_MISSING: 'Thiếu cấu hình VNPay.',
    VNPAY_SIGNATURE_INVALID: 'Chữ ký VNPay không hợp lệ.',
    VNPAY_TRANSACTION_INVALID: 'Mã giao dịch VNPay không hợp lệ.',
    VNPAY_PAYMENT_FAILED: 'Thanh toán VNPay thất bại.',
    VNPAY_URL_CREATED: 'Tạo đường dẫn thanh toán VNPay thành công.'
  }),

  COMMON: Object.freeze({
    SERVER_ERROR: 'Đã xảy ra lỗi máy chủ.',
    NOT_FOUND: 'Không tìm thấy trang.',
    BAD_REQUEST: 'Yêu cầu không hợp lệ.',
    INVALID_ID: 'ID không hợp lệ.',
    INVALID_ITEM_ID: 'ID vật phẩm không hợp lệ.',
    INVALID_RENTAL_ID: 'ID đơn thuê không hợp lệ.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    UNAUTHORIZED: 'Bạn cần đăng nhập để tiếp tục.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ.'
  })
});

module.exports = MESSAGES;
