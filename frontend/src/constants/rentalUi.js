export const statusConfig = Object.freeze({
  pending_payment: { label: 'Chờ thanh toán', cls: 'status-pending-payment' },
  pending_confirmation: { label: 'Chờ xác nhận', cls: 'status-pending-confirm' },
  confirmed: { label: 'Đã xác nhận', cls: 'status-confirmed' },
  rejected: { label: 'Đã từ chối', cls: 'status-rejected' },
  in_progress: { label: 'Đang thuê', cls: 'status-in-progress' },
  completed: { label: 'Hoàn tất', cls: 'status-completed' },
  cancelled: { label: 'Đã hủy', cls: 'status-cancelled' },
  refunded: { label: 'Đã hoàn tiền', cls: 'status-cancelled' },
  disputed: { label: 'Đang tranh chấp', cls: 'status-disputed' },
});

export const paymentLabels = Object.freeze({
  pending: 'Chờ thanh toán',
  escrowed: 'Đã ký quỹ',
  refunded: 'Đã hoàn tiền',
});

export const itemStatusLabels = Object.freeze({
  available: 'Sẵn sàng cho thuê',
  rented: 'Đang được thuê',
  delisted: 'Đã ẩn khỏi chợ thuê',
});

export const disputeStatusConfig = Object.freeze({
  pending: { label: 'Đang hòa giải', cls: 'dispute-pending' },
  escalated: { label: 'Đã yêu cầu Admin xử lý', cls: 'dispute-escalated' },
  withdrawn: { label: 'Khiếu nại đã rút', cls: 'dispute-withdrawn' },
  resolved: { label: 'Tranh chấp đã giải quyết', cls: 'dispute-resolved' },
});

export const penaltyLabels = Object.freeze({
  none: 'Không xử lý',
  warning: 'Cảnh cáo / trừ điểm uy tín',
  suspension: 'Đình chỉ tạm thời',
  ban: 'Khóa tài khoản',
});

export const winnerMessages = Object.freeze({
  renter: 'Admin đã xử lý tranh chấp: người thuê thắng.',
  owner: 'Admin đã xử lý tranh chấp: chủ đồ thắng.',
  none: 'Admin đã xử lý tranh chấp: không đủ căn cứ / không bên nào thắng.',
});
