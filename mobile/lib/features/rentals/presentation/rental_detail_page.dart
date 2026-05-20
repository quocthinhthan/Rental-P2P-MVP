import 'dart:async';
import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/utils/open_url.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';

class RentalDetailPage extends StatefulWidget {
  const RentalDetailPage({
    super.key,
    required this.rentalId,
    required this.repository,
    required this.currentUserId,
  });

  final String rentalId;
  final RentalsRepository repository;
  final String currentUserId;

  @override
  State<RentalDetailPage> createState() => _RentalDetailPageState();
}

class _RentalDetailPageState extends State<RentalDetailPage>
    with SingleTickerProviderStateMixin {
  RentalCardData? rental;
  bool isOwner = false;
  List<ChatMessage> messages = [];
  bool loading = true;
  bool chatLoading = false;
  bool actionLoading = false;
  late TabController _tabs;
  final _msgCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final view = await widget.repository.getMyRentals();
      final all = [...view.asRenter, ...view.asOwner];
      final found = all.where((r) => r.id == widget.rentalId).firstOrNull;
      final ownerFlag = view.asOwner.any((r) => r.id == widget.rentalId);
      setState(() {
        rental = found;
        isOwner = ownerFlag;
      });
      await _loadChat();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _loadChat() async {
    try {
      final msgs = await widget.repository.getMessages(widget.rentalId);
      if (mounted) setState(() => messages = msgs);
    } catch (_) {}
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();
    try {
      await widget.repository.sendMessage(widget.rentalId, text);
      await _loadChat();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _openVnpay() async {
    setState(() => actionLoading = true);
    try {
      final url = await widget.repository.createPaymentUrl(widget.rentalId);
      await openUrl(url);
      
      if (mounted) {
        final success = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => _PaymentPollingDialog(
            rentalId: widget.rentalId,
            repository: widget.repository,
          ),
        );
        
        if (success == true) {
          await _load();
          if (mounted) {
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const _PaymentResultPage(
                  success: true,
                  message: 'Thanh toán thành công! Đơn thuê đã được cập nhật.',
                ),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _doAction(String action) async {
    setState(() => actionLoading = true);
    try {
      if (action == 'confirm') {
        await widget.repository.confirmRental(widget.rentalId);
      } else if (action == 'reject') {
        await widget.repository.rejectRental(widget.rentalId);
      } else if (action == 'pickup') {
        await widget.repository.pickupRental(widget.rentalId, []);
      } else if (action == 'complete') {
        await widget.repository.completeRental(widget.rentalId, []);
      } else if (action == 'dispute') {
        await _showDisputeDialog();
        return;
      } else if (action == 'sign') {
        await widget.repository.signContract(widget.rentalId, 'signed');
      }
      await _load();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _showDisputeDialog() async {
    final ctrl = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Báo cáo sự cố'),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Mô tả sự cố',
            hintText: 'Mô tả chi tiết vấn đề gặp phải...',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            child: const Text('Gửi báo cáo'),
          ),
        ],
      ),
    );
    if (submitted == true && ctrl.text.trim().isNotEmpty) {
      try {
        await widget.repository.createDispute(
          rentalId: widget.rentalId,
          reason: ctrl.text.trim(),
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã gửi báo cáo sự cố')),
          );
        }
      } catch (e) {
        if (mounted) showError(context, e);
      }
    }
    setState(() => actionLoading = false);
  }

  Color _statusColor(String s) => switch (s.toLowerCase()) {
        'completed' => AppColors.green,
        'in_progress' || 'active' => AppColors.blue,
        'pending_confirmation' || 'confirmed' => AppColors.orange,
        'cancelled' || 'rejected' => AppColors.red,
        'pending_payment' => const Color(0xff7c3aed),
        _ => AppColors.muted,
      };

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn thuê')),
        body: const Center(child: CircularProgressIndicator(color: AppColors.orange)),
      );
    }

    final r = rental;
    if (r == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn thuê')),
        body: const Center(child: Text('Không tìm thấy đơn thuê')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.page,
      appBar: AppBar(
        title: const Text('Chi tiết đơn thuê'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.orange,
          unselectedLabelColor: AppColors.muted,
          indicatorColor: AppColors.orange,
          tabs: const [
            Tab(icon: Icon(Icons.info_outline_rounded, size: 18), text: 'Thông tin'),
            Tab(icon: Icon(Icons.chat_bubble_outline_rounded, size: 18), text: 'Tin nhắn'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _InfoTab(
            rental: r,
            actionLoading: actionLoading,
            statusColor: _statusColor(r.status),
            onVnpay: r.status == 'pending_payment' ? _openVnpay : null,
            onSign: r.status == 'confirmed' ? () => _doAction('sign') : null,
            onPickup: r.status == 'confirmed' ? () => _doAction('pickup') : null,
            onComplete: r.status == 'in_progress' ? () => _doAction('complete') : null,
            onConfirm: (r.status == 'pending_confirmation' && isOwner) ? () => _doAction('confirm') : null,
            onReject: (r.status == 'pending_confirmation' && isOwner) ? () => _doAction('reject') : null,
            onDispute: ['confirmed', 'in_progress'].contains(r.status)
                ? () => _doAction('dispute')
                : null,
          ),
          _ChatTab(
            messages: messages,
            currentUserId: widget.currentUserId,
            controller: _msgCtrl,
            onSend: _sendMessage,
            onRefresh: _loadChat,
          ),
        ],
      ),
    );
  }
}

// ─── Info Tab ────────────────────────────────────────────────────────────────

class _InfoTab extends StatelessWidget {
  const _InfoTab({
    required this.rental,
    required this.actionLoading,
    required this.statusColor,
    this.onVnpay,
    this.onSign,
    this.onPickup,
    this.onComplete,
    this.onConfirm,
    this.onReject,
    this.onDispute,
  });

  final RentalCardData rental;
  final bool actionLoading;
  final Color statusColor;
  final VoidCallback? onVnpay;
  final VoidCallback? onSign;
  final VoidCallback? onPickup;
  final VoidCallback? onComplete;
  final VoidCallback? onConfirm;
  final VoidCallback? onReject;
  final VoidCallback? onDispute;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Item card
          _SectionBox(
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.orangeLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: rental.itemMainImage.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(rental.itemMainImage, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                  Icons.inventory_2_outlined, color: AppColors.orange)),
                        )
                      : const Icon(Icons.inventory_2_outlined, color: AppColors.orange),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(rental.itemName,
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 6),
                      StatusBadge(label: rental.status, color: statusColor),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Timeline status
          _StatusTimeline(status: rental.status),
          const SizedBox(height: 12),

          // Info rows
          _SectionBox(
            child: Column(
              children: [
                _InfoRow(icon: Icons.calendar_today_outlined,
                    label: 'Thời gian thuê',
                    value: '${shortDate(rental.startDate)} → ${shortDate(rental.endDate)}'),
                const Divider(height: 20),
                _InfoRow(icon: Icons.payments_outlined,
                    label: 'Tổng tiền',
                    value: formatMoney(rental.totalAmount, perDay: false),
                    valueColor: AppColors.orange),
                const Divider(height: 20),
                _InfoRow(icon: Icons.account_balance_outlined,
                    label: 'Tiền ký quỹ',
                    value: formatMoney(rental.escrowAmount, perDay: false)),
                if (rental.counterpartyName.isNotEmpty) ...[
                  const Divider(height: 20),
                  _InfoRow(icon: Icons.person_outline_rounded,
                      label: 'Đối tác',
                      value: rental.counterpartyName),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Action buttons
          if (actionLoading)
            const Center(child: CircularProgressIndicator(color: AppColors.orange))
          else ...[
            // VNPay
            if (onVnpay != null) ...[
              _ActionButton(
                label: '💳 Thanh toán qua VNPay',
                color: const Color(0xff0033a0),
                icon: Icons.payment_rounded,
                onTap: onVnpay!,
              ),
              const SizedBox(height: 8),
            ],
            // Confirm / Reject (owner)
            if (onConfirm != null || onReject != null)
              Row(children: [
                if (onReject != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onReject,
                      icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.red),
                      label: const Text('Từ chối', style: TextStyle(color: AppColors.red)),
                      style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.red)),
                    ),
                  ),
                if (onConfirm != null && onReject != null) const SizedBox(width: 10),
                if (onConfirm != null)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onConfirm,
                      icon: const Icon(Icons.check_rounded, size: 16),
                      label: const Text('Xác nhận'),
                    ),
                  ),
              ]),
            // Sign contract
            if (onSign != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '✍️ Ký hợp đồng điện tử',
                color: AppColors.blue,
                icon: Icons.edit_note_rounded,
                onTap: onSign!,
              ),
            ],
            // Pickup
            if (onPickup != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '📦 Xác nhận giao/nhận đồ',
                color: AppColors.green,
                icon: Icons.handshake_outlined,
                onTap: onPickup!,
              ),
            ],
            // Complete
            if (onComplete != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '✅ Hoàn thành & Trả đồ',
                color: AppColors.green,
                icon: Icons.done_all_rounded,
                onTap: onComplete!,
              ),
            ],
            // Dispute
            if (onDispute != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 44,
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onDispute,
                  icon: const Icon(Icons.flag_outlined, size: 16, color: AppColors.red),
                  label: const Text('Báo cáo sự cố',
                      style: TextStyle(color: AppColors.red)),
                  style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.red)),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

// ─── Chat Tab ────────────────────────────────────────────────────────────────

class _ChatTab extends StatelessWidget {
  const _ChatTab({
    required this.messages,
    required this.currentUserId,
    required this.controller,
    required this.onSend,
    required this.onRefresh,
  });

  final List<ChatMessage> messages;
  final String currentUserId;
  final TextEditingController controller;
  final VoidCallback onSend;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: messages.isEmpty
                ? const Center(
                    child: Text('Chưa có tin nhắn.\nKéo xuống để tải lại.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.muted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: messages.length,
                    itemBuilder: (_, i) {
                      final m = messages[i];
                      final isMe = m.senderId == currentUserId;
                      return _ChatBubble(message: m, isMe: isMe);
                    },
                  ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(top: BorderSide(color: AppColors.line)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8, offset: const Offset(0, -2))],
          ),
          padding: EdgeInsets.fromLTRB(12, 10, 12,
              MediaQuery.of(context).viewInsets.bottom + 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  decoration: const InputDecoration(
                    hintText: 'Nhập tin nhắn...',
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    filled: true,
                    fillColor: AppColors.page,
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide: BorderSide(color: AppColors.line)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide: BorderSide(color: AppColors.line)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide: BorderSide(color: AppColors.orange, width: 1.5)),
                  ),
                  onSubmitted: (_) => onSend(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onSend,
                child: Container(
                  width: 42, height: 42,
                  decoration: const BoxDecoration(
                    color: AppColors.orange, shape: BoxShape.circle),
                  child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message, required this.isMe});
  final ChatMessage message;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(radius: 14,
                backgroundColor: AppColors.orangeLight,
                child: Text(message.senderName.isNotEmpty
                    ? message.senderName[0].toUpperCase() : '?',
                    style: const TextStyle(color: AppColors.orange, fontSize: 11,
                        fontWeight: FontWeight.w700))),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe && message.senderName.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                    child: Text(message.senderName,
                        style: const TextStyle(fontSize: 10, color: AppColors.muted,
                            fontWeight: FontWeight.w600)),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isMe ? AppColors.orange : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(14),
                      topRight: const Radius.circular(14),
                      bottomLeft: Radius.circular(isMe ? 14 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 14),
                    ),
                    border: isMe ? null : Border.all(color: AppColors.line),
                  ),
                  child: Text(message.content,
                      style: TextStyle(
                          color: isMe ? Colors.white : AppColors.ink,
                          fontSize: 14)),
                ),
              ],
            ),
          ),
          if (isMe) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

// ─── Status Timeline ─────────────────────────────────────────────────────────

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.status});
  final String status;

  static const _steps = [
    ('pending_payment', 'Chờ thanh toán', Icons.payment_outlined),
    ('pending_confirmation', 'Chờ xác nhận', Icons.hourglass_empty_rounded),
    ('confirmed', 'Đã xác nhận', Icons.check_circle_outline_rounded),
    ('in_progress', 'Đang thuê', Icons.handshake_outlined),
    ('completed', 'Hoàn thành', Icons.done_all_rounded),
  ];

  int get _currentStep {
    for (var i = 0; i < _steps.length; i++) {
      if (_steps[i].$1 == status) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    if (status == 'cancelled' || status == 'rejected') {
      return _SectionBox(
        child: Row(children: [
          const Icon(Icons.cancel_outlined, color: AppColors.red, size: 20),
          const SizedBox(width: 10),
          Text(status == 'cancelled' ? 'Đơn đã bị hủy' : 'Đơn bị từ chối',
              style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w700)),
        ]),
      );
    }

    final current = _currentStep;
    return _SectionBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trạng thái đơn thuê',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Row(
            children: List.generate(_steps.length, (i) {
              final done = i <= current;
              final active = i == current;
              return Expanded(
                child: Row(
                  children: [
                    Column(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: active ? 28 : 22,
                          height: active ? 28 : 22,
                          decoration: BoxDecoration(
                            color: done ? AppColors.orange : AppColors.line,
                            shape: BoxShape.circle,
                            boxShadow: active ? [BoxShadow(
                                color: AppColors.orange.withValues(alpha: 0.4),
                                blurRadius: 8)] : null,
                          ),
                          child: Icon(_steps[i].$3, size: active ? 14 : 12,
                              color: done ? Colors.white : AppColors.muted),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 52,
                          child: Text(_steps[i].$2,
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 8,
                                  fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                                  color: done ? AppColors.orange : AppColors.muted)),
                        ),
                      ],
                    ),
                    if (i < _steps.length - 1)
                      Expanded(
                        child: Container(height: 2,
                            color: i < current ? AppColors.orange : AppColors.line),
                      ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

class _SectionBox extends StatelessWidget {
  const _SectionBox({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: child,
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
  });
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          elevation: 0,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label,
      required this.value, this.valueColor});
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 18, color: AppColors.muted),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
        const SizedBox(height: 1),
        Text(value, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14,
            color: valueColor ?? AppColors.ink)),
      ])),
    ]);
  }
}

// ─── Polling Dialog ──────────────────────────────────────────────────────────

class _PaymentPollingDialog extends StatefulWidget {
  const _PaymentPollingDialog({required this.rentalId, required this.repository});
  final String rentalId;
  final RentalsRepository repository;

  @override
  State<_PaymentPollingDialog> createState() => _PaymentPollingDialogState();
}

class _PaymentPollingDialogState extends State<_PaymentPollingDialog> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      try {
        final view = await widget.repository.getMyRentals();
        final all = [...view.asRenter, ...view.asOwner];
        final r = all.where((item) => item.id == widget.rentalId).firstOrNull;
        if (r != null && r.status != 'pending_payment') {
          timer.cancel();
          if (mounted) Navigator.of(context).pop(true);
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.all(32),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppColors.orange),
          const SizedBox(height: 24),
          const Text(
            'Đang chờ thanh toán...',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Vui lòng hoàn tất thanh toán trên trình duyệt. Màn hình này sẽ tự động đóng khi thanh toán thành công.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: () {
              _timer?.cancel();
              Navigator.of(context).pop(false);
            },
            child: const Text('Hủy', style: TextStyle(color: AppColors.red)),
          ),
        ],
      ),
    );
  }
}

// ─── Payment Result Page ─────────────────────────────────────────────────────

class _PaymentResultPage extends StatelessWidget {
  const _PaymentResultPage({required this.success, required this.message});
  final bool success;
  final String message;

  @override
  Widget build(BuildContext context) {
    final color = success ? AppColors.green : AppColors.red;
    final icon = success ? Icons.check_circle_rounded : Icons.cancel_rounded;
    final title = success ? 'Thành công' : 'Thất bại';

    return Scaffold(
      backgroundColor: AppColors.page,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 10))
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 80, color: color),
                const SizedBox(height: 16),
                Text(title, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: AppColors.muted, height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(success),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.orange,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                    ),
                    child: const Text('Quay lại đơn thuê'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
