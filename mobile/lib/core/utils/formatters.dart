import 'package:intl/intl.dart';

String textOf(Object? value) => value?.toString() ?? '';

final _moneyFmt = NumberFormat('#,###', 'vi_VN');

String formatMoney(Object? value, {bool perDay = true}) {
  final number = value is num ? value : num.tryParse(textOf(value)) ?? 0;
  final formatted = _moneyFmt.format(number.round()).replaceAll(',', '.');
  return '$formatted đ${perDay ? '/ngày' : ''}';
}

String dateInput(DateTime date) {
  String two(int value) => value.toString().padLeft(2, '0');
  return '${date.year}-${two(date.month)}-${two(date.day)}';
}

String shortDate(Object? value) {
  final text = textOf(value);
  if (text.length < 10) return text;
  final parts = text.substring(0, 10).split('-');
  if (parts.length == 3) return '${parts[2]}/${parts[1]}/${parts[0]}';
  return text.substring(0, 10);
}

/// Converts full ISO date to readable Vietnamese format: "18/05/2026"
String displayDate(Object? value) => shortDate(value);

/// Format date range nicely
String dateRange(Object? start, Object? end) {
  return '${shortDate(start)} - ${shortDate(end)}';
}
