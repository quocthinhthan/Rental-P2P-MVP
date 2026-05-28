import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.color = AppColors.muted,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final displayLabel = _localizeStatus(label);
    final bg = color.withValues(alpha: 0.12);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        displayLabel,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  String _localizeStatus(String s) {
    return switch (s.toLowerCase()) {
      // Item statuses
      'available'            => 'Sẵn sàng',
      'rented'               => 'Đang được thuê',
      'delisted'             => 'Đã gỡ',
      // Rental statuses
      'pending_payment'      => 'Chờ thanh toán',
      'pending_confirmation' => 'Chờ xác nhận',
      'confirmed'            => 'Đã xác nhận',
      'in_progress'          => 'Đang thuê',
      'completed'            => 'Hoàn thành',
      'cancelled'            => 'Đã hủy',
      'rejected'             => 'Từ chối',
      // Payment statuses
      'pending'              => 'Chờ duyệt',
      'disputed'             => 'Đang tranh chấp',
      'escrowed'             => 'Đã ký quỹ',
      'refunded'             => 'Đã hoàn tiền',
      // Legacy / other
      'active'               => 'Đang thuê',
      'contract_signed'      => 'Đã ký HĐ',
      'return_requested'     => 'Yêu cầu trả',
      'payment_pending'      => 'Chờ thanh toán',
      'verified'             => 'Đã xác minh',
      'unverified'           => 'Chưa xác minh',
      _ => s,
    };
  }
}
