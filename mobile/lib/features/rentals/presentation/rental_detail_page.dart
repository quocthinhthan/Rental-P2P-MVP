import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rental_p2p_mobile/core/utils/open_url.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';

bool _isDisplayableImageUrl(String value) {
  final uri = Uri.tryParse(value);
  if (uri == null) return false;
  if (uri.scheme == 'data') return value.startsWith('data:image');
  if (uri.scheme != 'http' && uri.scheme != 'https') return false;

  final host = uri.host.toLowerCase();
  if (host.contains('vnpayment.vn')) return false;
  if (host.contains('cloudinary.com')) return true;

  final path = uri.path.toLowerCase();
  return path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.png') ||
      path.endsWith('.webp') ||
      path.endsWith('.gif');
}

bool _isCompletedWithinSevenDays(RentalCardData rental) {
  if (rental.status != 'completed') return false;
  final baseDate = DateTime.tryParse(
    rental.updatedAt.isNotEmpty ? rental.updatedAt : rental.endDate,
  );
  if (baseDate == null) return false;
  return DateTime.now().difference(baseDate).inDays <= 7;
}

String _disputeStatusLabel(String status) => switch (status) {
      'pending' => 'Đang hòa giải',
      'escalated' => 'Đã yêu cầu Admin',
      'resolved' => 'Đã giải quyết',
      'withdrawn' => 'Đã rút',
      _ => 'Tranh chấp',
    };

class RentalDetailPage extends StatefulWidget {
  const RentalDetailPage({
    super.key,
    required this.rentalId,
    required this.repository,
    required this.currentUserId,
    this.initialTabIndex = 0,
  });

  final String rentalId;
  final RentalsRepository repository;
  final String currentUserId;
  final int initialTabIndex;

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
  bool _autoPromptedSign = false;
  late TabController _tabs;
  final _msgCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 1),
    );
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging && _tabs.index == 1) {
        _markLatestIncomingSeen();
      }
    });
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
      final detail = await widget.repository.getRentalDetail(widget.rentalId);
      final ownerFlag = detail.ownerId == widget.currentUserId;
      final card = detail.toCard();
      setState(() {
        rental = card;
        isOwner = ownerFlag;
      });
      final shouldPromptSign = card.status == 'confirmed' &&
          !card.isFullySigned &&
          !(ownerFlag ? card.ownerHasSigned : card.renterHasSigned);
      if (shouldPromptSign && !_autoPromptedSign && mounted) {
        _autoPromptedSign = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _showSignContractDialog(afterConfirm: ownerFlag);
        });
      }
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
      if (mounted) {
        setState(() => messages = msgs);
        if (_tabs.index == 1) {
          await _markLatestIncomingSeen();
        }
      }
    } catch (_) {}
  }

  Future<void> _markLatestIncomingSeen() async {
    final incoming = messages
        .where((message) => message.senderId != widget.currentUserId)
        .toList()
      ..sort((a, b) {
        final aTime = DateTime.tryParse(a.createdAt);
        final bTime = DateTime.tryParse(b.createdAt);
        if (aTime == null || bTime == null) {
          return a.createdAt.compareTo(b.createdAt);
        }
        return aTime.compareTo(bTime);
      });
    if (incoming.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'chat_seen_${widget.currentUserId}_${widget.rentalId}',
      incoming.last.id,
    );
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
        } else {
          await _load();
        }
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _showSignContractDialog({bool afterConfirm = false}) async {
    final currentRental = rental;
    if (currentRental == null) return;

    setState(() => actionLoading = true);
    RentalContractDetail contract;
    try {
      contract = await widget.repository.getRentalContract(widget.rentalId);
    } catch (e) {
      if (mounted) showError(context, e);
      return;
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }

    if (!mounted) return;

    final signatureBytes = await showDialog<Uint8List>(
      context: context,
      barrierDismissible: !afterConfirm,
      builder: (ctx) => _ContractSigningDialog(
        rental: currentRental,
        contract: contract,
        isOwner: isOwner,
        afterConfirm: afterConfirm,
        canSign: true,
      ),
    );

    if (signatureBytes == null || !mounted) return;

    setState(() => actionLoading = true);
    try {
      final signatureUrl = await widget.repository
          .uploadSignatureImage(widget.rentalId, signatureBytes);
      await widget.repository.signContract(widget.rentalId, signatureUrl);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã ký hợp đồng điện tử')),
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _showViewContractDialog() async {
    final currentRental = rental;
    if (currentRental == null) return;

    setState(() => actionLoading = true);
    RentalContractDetail contract;
    try {
      contract = await widget.repository.getRentalContract(widget.rentalId);
    } catch (e) {
      if (mounted) showError(context, e);
      return;
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => _ContractSigningDialog(
        rental: currentRental,
        contract: contract,
        isOwner: isOwner,
        canSign: false,
      ),
    );
  }

  Future<void> _showHandoverDialog(String type) async {
    final currentRental = rental;
    if (currentRental == null) return;

    final result = await showDialog<_HandoverResult>(
      context: context,
      builder: (ctx) => _HandoverImageDialog(
        rental: currentRental,
        type: type,
      ),
    );

    if (result == null || result.images.isEmpty || !mounted) return;

    setState(() => actionLoading = true);
    try {
      final imageUrls = <String>[];
      for (var i = 0; i < result.images.length; i += 1) {
        final imageUrl = await widget.repository.uploadHandoverImage(
          rentalId: widget.rentalId,
          type: type,
          index: i,
          bytes: result.images[i],
        );
        imageUrls.add(imageUrl);
      }

      if (type == 'return') {
        await widget.repository.completeRental(
          widget.rentalId,
          imageUrls,
          condition: result.condition,
          accessories: result.accessories,
          notes: result.notes,
          damages: result.damages,
        );
      } else {
        await widget.repository.pickupRental(
          widget.rentalId,
          imageUrls,
          condition: result.condition,
          accessories: result.accessories,
          notes: result.notes,
        );
      }

      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(type == 'return'
                ? 'Đã hoàn tất trả đồ'
                : 'Đã xác nhận bàn giao đồ'),
          ),
        );
      }

      if (type == 'return' && mounted) {
        await _showReviewDialog();
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _doAction(String action) async {
    if (action == 'sign') {
      await _showSignContractDialog();
      return;
    }
    if (action == 'pickup') {
      await _showHandoverDialog('pickup');
      return;
    }
    if (action == 'complete') {
      await _showHandoverDialog('return');
      return;
    }
    if (action == 'cancel') {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Hủy đơn thuê'),
          content: const Text('Bạn có chắc muốn hủy đơn thuê này không?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Không'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: AppColors.red),
              child: const Text('Hủy đơn'),
            ),
          ],
        ),
      );
      if (confirm != true || !mounted) return;
      setState(() => actionLoading = true);
      try {
        await widget.repository.cancelRental(widget.rentalId);
        await _load();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã hủy đơn thuê')),
          );
        }
      } catch (e) {
        if (mounted) showError(context, e);
      } finally {
        if (mounted) setState(() => actionLoading = false);
      }
      return;
    }

    setState(() => actionLoading = true);
    var promptOwnerSign = false;
    try {
      if (action == 'confirm') {
        await widget.repository.confirmRental(widget.rentalId);
        promptOwnerSign = true;
      } else if (action == 'reject') {
        await widget.repository.rejectRental(widget.rentalId);
      } else if (action == 'dispute') {
        await _showDisputeDialog();
        return;
      }
      if (promptOwnerSign) _autoPromptedSign = true;
      await _load();
      if (promptOwnerSign && mounted) {
        setState(() => actionLoading = false);
        await _showSignContractDialog(afterConfirm: true);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _showDisputeDialog() async {
    final draft = await showDialog<_DisputeDraft>(
      context: context,
      builder: (ctx) => const _CreateDisputeDialog(),
    );
    if (draft == null || !mounted) return;

    setState(() => actionLoading = true);
    try {
      final evidenceUrls = <String>[];
      for (var i = 0; i < draft.evidenceImages.length; i += 1) {
        final url = await widget.repository.uploadImageBytes(
          filename: 'dispute-${widget.rentalId}-${i + 1}.jpg',
          bytes: draft.evidenceImages[i],
        );
        evidenceUrls.add(url);
      }

      await widget.repository.createDispute(
        rentalId: widget.rentalId,
        reason: draft.reason,
        evidenceImages: evidenceUrls,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã gửi báo cáo sự cố')),
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _withdrawDispute(String disputeId) async {
    setState(() => actionLoading = true);
    try {
      await widget.repository.withdrawDispute(disputeId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã rút khiếu nại')),
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _escalateDispute(String disputeId) async {
    setState(() => actionLoading = true);
    try {
      await widget.repository.escalateDispute(disputeId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã yêu cầu Admin can thiệp')),
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
  }

  Future<void> _showReviewDialog() async {
    final currentRental = rental;
    if (currentRental == null) return;

    final revieweeId = isOwner ? currentRental.renterId : currentRental.ownerId;
    if (revieweeId.isEmpty) return;

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _ReviewDialog(
        rentalId: widget.rentalId,
        revieweeId: revieweeId,
        revieweeName: currentRental.counterpartyName,
        revieweeAvatar: currentRental.counterpartyAvatar,
        repository: widget.repository,
        onSubmitted: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cảm ơn bạn đã đánh giá!')),
          );
        },
      ),
    );
  }

  Color _statusColor(String s) => switch (s.toLowerCase()) {
        'completed' => AppColors.green,
        'in_progress' || 'active' => AppColors.blue,
        'pending_confirmation' || 'confirmed' => AppColors.orange,
        'disputed' => AppColors.red,
        'cancelled' || 'rejected' => AppColors.red,
        'pending_payment' => const Color(0xff7c3aed),
        _ => AppColors.muted,
      };

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn thuê')),
        body: const Center(
            child: CircularProgressIndicator(color: AppColors.orange)),
      );
    }

    final r = rental;
    if (r == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết đơn thuê')),
        body: const Center(child: Text('Không tìm thấy đơn thuê')),
      );
    }

    final hasCurrentUserSigned = isOwner ? r.ownerHasSigned : r.renterHasSigned;
    final hasActiveDispute = r.dispute?.isActive ?? false;
    final canSignContract = !hasActiveDispute &&
        r.status == 'confirmed' &&
        !r.isFullySigned &&
        !hasCurrentUserSigned;
    final canPickup =
        !hasActiveDispute && r.status == 'confirmed' && r.isFullySigned;
    final hasContractDocument = r.contract != null ||
        ['confirmed', 'in_progress', 'disputed', 'completed']
            .contains(r.status);
    final canCreateDispute = !hasActiveDispute &&
        (r.status == 'confirmed' ||
            r.status == 'in_progress' ||
            _isCompletedWithinSevenDays(r));

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
            Tab(
                icon: Icon(Icons.info_outline_rounded, size: 18),
                text: 'Thông tin'),
            Tab(
                icon: Icon(Icons.chat_bubble_outline_rounded, size: 18),
                text: 'Tin nhắn'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _InfoTab(
            rental: r,
            isOwner: isOwner,
            actionLoading: actionLoading,
            statusColor: _statusColor(r.status),
            onRefresh: _load,
            onVnpay: r.status == 'pending_payment' ? _openVnpay : null,
            onViewContract: hasContractDocument && !canSignContract
                ? _showViewContractDialog
                : null,
            onSign: canSignContract ? () => _doAction('sign') : null,
            onPickup: (isOwner && canPickup) ? () => _doAction('pickup') : null,
            onComplete:
                (!hasActiveDispute && !isOwner && r.status == 'in_progress')
                    ? () => _doAction('complete')
                    : null,
            onConfirm: (r.status == 'pending_confirmation' && isOwner)
                ? () => _doAction('confirm')
                : null,
            onReject: (r.status == 'pending_confirmation' && isOwner)
                ? () => _doAction('reject')
                : null,
            currentUserId: widget.currentUserId,
            onWithdrawDispute: _withdrawDispute,
            onEscalateDispute: _escalateDispute,
            onDispute: canCreateDispute ? () => _doAction('dispute') : null,
            onCancel: (r.status == 'pending_confirmation' ||
                    r.status == 'pending_payment')
                ? () => _doAction('cancel')
                : null,
            onReview: r.status == 'completed' ? _showReviewDialog : null,
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

class _InfoTab extends StatelessWidget {
  const _InfoTab({
    required this.rental,
    required this.isOwner,
    required this.actionLoading,
    required this.statusColor,
    required this.currentUserId,
    required this.onWithdrawDispute,
    required this.onEscalateDispute,
    this.onVnpay,
    this.onViewContract,
    this.onSign,
    this.onPickup,
    this.onComplete,
    this.onConfirm,
    this.onReject,
    this.onDispute,
    this.onCancel,
    this.onRefresh,
    this.onReview,
  });

  final RentalCardData rental;
  final bool isOwner;
  final bool actionLoading;
  final Color statusColor;
  final String currentUserId;
  final ValueChanged<String> onWithdrawDispute;
  final ValueChanged<String> onEscalateDispute;
  final VoidCallback? onVnpay;
  final VoidCallback? onViewContract;
  final VoidCallback? onSign;
  final VoidCallback? onPickup;
  final VoidCallback? onComplete;
  final VoidCallback? onConfirm;
  final VoidCallback? onReject;
  final VoidCallback? onDispute;
  final VoidCallback? onCancel;
  final Future<void> Function()? onRefresh;
  final VoidCallback? onReview;

  @override
  Widget build(BuildContext context) {
    final hasCurrentUserSigned =
        isOwner ? rental.ownerHasSigned : rental.renterHasSigned;
    final needsSignatureBeforePickup =
        rental.status == 'confirmed' && !rental.isFullySigned;
    final isWaitingForOtherSignature =
        needsSignatureBeforePickup && hasCurrentUserSigned;

    return RefreshIndicator(
      onRefresh: onRefresh ?? () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
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
                  child: _isDisplayableImageUrl(rental.itemMainImage)
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(rental.itemMainImage,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                  Icons.inventory_2_outlined,
                                  color: AppColors.orange)),
                        )
                      : const Icon(Icons.inventory_2_outlined,
                          color: AppColors.orange),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(rental.itemName,
                          style: const TextStyle(
                              fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 6),
                      StatusBadge(label: rental.status, color: statusColor),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _StatusTimeline(status: rental.status),
          const SizedBox(height: 12),
          if (rental.dispute != null) ...[
            _DisputeStatusBox(
              dispute: rental.dispute!,
              currentUserId: currentUserId,
              actionLoading: actionLoading,
              onWithdraw: onWithdrawDispute,
              onEscalate: onEscalateDispute,
            ),
            const SizedBox(height: 12),
          ],
          _SectionBox(
            child: Column(
              children: [
                _InfoRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Thời gian thuê',
                    value:
                        '${shortDate(rental.startDate)} → ${shortDate(rental.endDate)}'),
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.payments_outlined,
                    label: 'Tổng tiền',
                    value: formatMoney(rental.totalAmount, perDay: false),
                    valueColor: AppColors.orange),
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.account_balance_outlined,
                    label: 'Tiền ký quỹ',
                    value: formatMoney(rental.escrowAmount, perDay: false)),
                if (rental.counterpartyName.isNotEmpty) ...[
                  const Divider(height: 20),
                  _InfoRow(
                      icon: Icons.person_outline_rounded,
                      label: 'Đối tác',
                      value: rental.counterpartyName),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (rental.contract != null || rental.status == 'confirmed') ...[
            _ContractStatusBox(
              rental: rental,
              isOwner: isOwner,
              hasCurrentUserSigned: hasCurrentUserSigned,
              onViewContract: onViewContract,
            ),
            const SizedBox(height: 16),
          ],
          if (isOwner && rental.status == 'in_progress') ...[
            _OwnerRentalInProgressPanel(rental: rental),
            const SizedBox(height: 16),
          ],
          if (actionLoading)
            const Center(
                child: CircularProgressIndicator(color: AppColors.orange))
          else ...[
            if (onVnpay != null) ...[
              _ActionButton(
                label: '💳 Thanh toán qua VNPay',
                color: const Color(0xff0033a0),
                icon: Icons.payment_rounded,
                onTap: onVnpay!,
              ),
              const SizedBox(height: 8),
            ],
            if (onConfirm != null || onReject != null)
              Row(children: [
                if (onReject != null)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onReject,
                      icon: const Icon(Icons.close_rounded,
                          size: 16, color: AppColors.red),
                      label: const Text('Từ chối',
                          style: TextStyle(color: AppColors.red)),
                      style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.red)),
                    ),
                  ),
                if (onConfirm != null && onReject != null)
                  const SizedBox(width: 10),
                if (onConfirm != null)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onConfirm,
                      icon: const Icon(Icons.check_rounded, size: 16),
                      label: const Text('Xác nhận'),
                    ),
                  ),
              ]),
            if (isWaitingForOtherSignature) ...[
              const SizedBox(height: 8),
              const _InlineStateNotice(
                icon: Icons.hourglass_top_rounded,
                text: 'Bạn đã ký hợp đồng. Đang chờ bên còn lại ký.',
                color: AppColors.orange,
              ),
            ],
            if (onSign != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '✍️ Ký hợp đồng điện tử',
                color: AppColors.blue,
                icon: Icons.edit_note_rounded,
                onTap: onSign!,
              ),
            ],
            if (needsSignatureBeforePickup &&
                onSign == null &&
                !isWaitingForOtherSignature) ...[
              const SizedBox(height: 8),
              const _InlineStateNotice(
                icon: Icons.lock_outline_rounded,
                text: 'Cần ký hợp đồng trước khi giao/nhận đồ.',
                color: AppColors.orange,
              ),
            ],
            if (onPickup != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '📦 Xác nhận giao/nhận đồ',
                color: AppColors.green,
                icon: Icons.handshake_outlined,
                onTap: onPickup!,
              ),
            ],
            if (onComplete != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: '✅ Hoàn thành & Trả đồ',
                color: AppColors.green,
                icon: Icons.done_all_rounded,
                onTap: onComplete!,
              ),
            ],
            if (rental.status == 'completed' && onReview != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 48,
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onReview,
                  icon: const Icon(Icons.star_rounded, size: 18),
                  label: const Text('Đánh giá đối tác'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    textStyle: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15),
                    elevation: 0,
                  ),
                ),
              ),
            ],
            if (onDispute != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 48,
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onDispute,
                  icon: const Icon(Icons.flag_outlined,
                      size: 18, color: AppColors.red),
                  label: const Text('Báo cáo sự cố',
                      style: TextStyle(
                          color: AppColors.red,
                          fontWeight: FontWeight.w700,
                          fontSize: 15)),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    side: const BorderSide(color: AppColors.red),
                  ),
                ),
              ),
            ],
            if (onCancel != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 44,
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onCancel,
                  icon: const Icon(Icons.cancel_outlined,
                      size: 16, color: AppColors.red),
                  label: const Text('Hủy đơn thuê',
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

class _DisputeStatusBox extends StatelessWidget {
  const _DisputeStatusBox({
    required this.dispute,
    required this.currentUserId,
    required this.actionLoading,
    required this.onWithdraw,
    required this.onEscalate,
  });

  final RentalDisputeData dispute;
  final String currentUserId;
  final bool actionLoading;
  final ValueChanged<String> onWithdraw;
  final ValueChanged<String> onEscalate;

  bool get _isReporter =>
      dispute.reporterId.isNotEmpty && dispute.reporterId == currentUserId;

  bool get _canWithdraw =>
      _isReporter &&
      (dispute.status == 'pending' || dispute.status == 'escalated');

  bool get _canEscalate {
    if (dispute.status != 'pending') return false;
    final end = DateTime.tryParse(dispute.mediationEndsAt);
    if (end == null) return false;
    return !DateTime.now().isBefore(end);
  }

  @override
  Widget build(BuildContext context) {
    final isActive = dispute.isActive;

    return _SectionBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.red.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.gavel_rounded, color: AppColors.red),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hồ sơ tranh chấp',
                      style:
                          TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      _disputeStatusLabel(dispute.status),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive)
                StatusBadge(label: 'disputed', color: AppColors.red),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            dispute.reason.isEmpty ? 'Chưa có mô tả sự cố.' : dispute.reason,
            style: const TextStyle(height: 1.35),
          ),
          const SizedBox(height: 12),
          _InfoRow(
            icon: Icons.timer_outlined,
            label: 'Hạn hòa giải',
            value: shortDate(dispute.mediationEndsAt),
          ),
          if (dispute.adminDecision.isNotEmpty) ...[
            const Divider(height: 20),
            _InfoRow(
              icon: Icons.fact_check_outlined,
              label: 'Phán quyết',
              value: dispute.adminDecision,
            ),
          ],
          if (dispute.evidenceImages.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 62,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: dispute.evidenceImages.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final imageUrl = dispute.evidenceImages[index];
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(
                      imageUrl,
                      width: 62,
                      height: 62,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 62,
                        height: 62,
                        color: AppColors.page,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          if (_canWithdraw || _canEscalate) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (_canWithdraw)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed:
                          actionLoading ? null : () => onWithdraw(dispute.id),
                      icon: const Icon(Icons.undo_rounded, size: 16),
                      label: const Text('Rút khiếu nại'),
                    ),
                  ),
                if (_canWithdraw && _canEscalate) const SizedBox(width: 10),
                if (_canEscalate)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed:
                          actionLoading ? null : () => onEscalate(dispute.id),
                      icon: const Icon(Icons.support_agent_rounded, size: 16),
                      label: const Text('Yêu cầu Admin'),
                    ),
                  ),
              ],
            ),
          ] else if (dispute.status == 'pending') ...[
            const SizedBox(height: 10),
            const _InlineStateNotice(
              icon: Icons.schedule_rounded,
              text: 'Có thể yêu cầu Admin can thiệp sau 48 giờ hòa giải.',
              color: AppColors.orange,
            ),
          ],
        ],
      ),
    );
  }
}

class _OwnerRentalInProgressPanel extends StatelessWidget {
  const _OwnerRentalInProgressPanel({required this.rental});

  final RentalCardData rental;

  @override
  Widget build(BuildContext context) {
    return _SectionBox(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PulsingRentalIcon(),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Đơn đang trong quá trình cho thuê',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  'Người thuê đang sử dụng ${rental.itemName}. Khi người thuê trả đồ, họ sẽ gửi ảnh xác nhận để hoàn tất đơn.',
                  style: const TextStyle(
                    color: AppColors.muted,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.blueLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.blue.withValues(alpha: 0.18),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.event_available_outlined,
                        size: 17,
                        color: AppColors.blue,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${shortDate(rental.startDate)} - ${shortDate(rental.endDate)}',
                          style: const TextStyle(
                            color: AppColors.blue,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PulsingRentalIcon extends StatefulWidget {
  const _PulsingRentalIcon();

  @override
  State<_PulsingRentalIcon> createState() => _PulsingRentalIconState();
}

class _PulsingRentalIconState extends State<_PulsingRentalIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final scale = 0.92 + (_controller.value * 0.12);
        final glow = 0.10 + (_controller.value * 0.18);

        return Transform.scale(
          scale: scale,
          child: Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: AppColors.greenLight,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.green.withValues(alpha: glow),
                  blurRadius: 18,
                  spreadRadius: 3,
                ),
              ],
            ),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.inventory_2_outlined,
                  color: AppColors.green,
                  size: 24,
                ),
                SizedBox(height: 7),
                _BouncingStatusDots(),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _BouncingStatusDots extends StatefulWidget {
  const _BouncingStatusDots();

  @override
  State<_BouncingStatusDots> createState() => _BouncingStatusDotsState();
}

class _BouncingStatusDotsState extends State<_BouncingStatusDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final shifted = (_controller.value + (index * 0.18)) % 1;
            final lift = shifted < 0.5 ? shifted * 2 : (1 - shifted) * 2;

            return Transform.translate(
              offset: Offset(0, -3 * lift),
              child: Container(
                width: 4.5,
                height: 4.5,
                margin: EdgeInsets.only(right: index == 2 ? 0 : 3),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: 0.45 + lift * 0.45),
                  shape: BoxShape.circle,
                ),
              ),
            );
          }),
        );
      },
    );
  }
}

class _DisputeDraft {
  const _DisputeDraft({
    required this.reason,
    required this.evidenceImages,
  });

  final String reason;
  final List<Uint8List> evidenceImages;
}

class _CreateDisputeDialog extends StatefulWidget {
  const _CreateDisputeDialog();

  @override
  State<_CreateDisputeDialog> createState() => _CreateDisputeDialogState();
}

class _CreateDisputeDialogState extends State<_CreateDisputeDialog> {
  final _reasonCtrl = TextEditingController();
  final _picker = ImagePicker();
  final List<Uint8List> _images = [];
  bool _loadingImages = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    setState(() => _loadingImages = true);
    try {
      final picked = await _picker.pickMultiImage(imageQuality: 82);
      if (picked.isEmpty) return;

      final nextImages = <Uint8List>[];
      for (final image in picked) {
        nextImages.add(await image.readAsBytes());
      }
      if (mounted) setState(() => _images.addAll(nextImages));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể chọn ảnh: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingImages = false);
    }
  }

  void _submit() {
    final reason = _reasonCtrl.text.trim();
    if (reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập lý do tranh chấp.')),
      );
      return;
    }
    Navigator.pop(
      context,
      _DisputeDraft(reason: reason, evidenceImages: List.of(_images)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.report_problem_rounded,
                          color: AppColors.red, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Báo cáo sự cố',
                              style: TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.w900)),
                          Text('Mô tả vấn đề xảy ra với đơn thuê này',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 13)),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded,
                          color: AppColors.muted),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.page,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Warning banner
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xfffff3cd),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: const Color(0xffffc107).withValues(alpha: 0.5)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded,
                          color: Color(0xffe65100), size: 18),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Chỉ gửi báo cáo khi xảy ra sự cố nghiêm trọng. Admin sẽ xem xét và ra quyết định.',
                          style: TextStyle(
                              color: Color(0xffe65100),
                              fontSize: 12,
                              fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                // Reason field
                const Text('Mô tả sự cố *',
                    style:
                        TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonCtrl,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Mô tả chi tiết vấn đề gặp phải...',
                    hintStyle: TextStyle(
                        color: AppColors.muted.withValues(alpha: 0.7)),
                    filled: true,
                    fillColor: AppColors.page,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.line),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.line),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide:
                          const BorderSide(color: AppColors.red, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
                const SizedBox(height: 20),
                // Image section
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Ảnh bằng chứng (tuỳ chọn)',
                              style: TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 14)),
                          Text('Tối đa 5 ảnh',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 12)),
                        ],
                      ),
                    ),
                    if (_images.length < 5)
                      GestureDetector(
                        onTap: _loadingImages ? null : _pickImages,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.orangeLight,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppColors.orange.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _loadingImages
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: AppColors.orange))
                                  : const Icon(
                                      Icons.add_photo_alternate_outlined,
                                      color: AppColors.orange,
                                      size: 16),
                              const SizedBox(width: 6),
                              const Text('Thêm ảnh',
                                  style: TextStyle(
                                      color: AppColors.orange,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_images.isEmpty)
                  GestureDetector(
                    onTap: _loadingImages ? null : _pickImages,
                    child: Container(
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.page,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.line, style: BorderStyle.solid),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_photo_alternate_outlined,
                              color: AppColors.muted, size: 28),
                          SizedBox(height: 4),
                          Text('Nhấn để thêm ảnh bằng chứng',
                              style: TextStyle(
                                  color: AppColors.muted, fontSize: 12)),
                        ],
                      ),
                    ),
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _images.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemBuilder: (context, index) {
                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child:
                                Image.memory(_images[index], fit: BoxFit.cover),
                          ),
                          Positioned(
                            right: 2,
                            top: 2,
                            child: GestureDetector(
                              onTap: () =>
                                  setState(() => _images.removeAt(index)),
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.65),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close_rounded,
                                    color: Colors.white, size: 13),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                const SizedBox(height: 28),
                // Submit
                FilledButton(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('Gửi báo cáo sự cố',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HandoverResult {
  const _HandoverResult({
    required this.images,
    required this.condition,
    required this.accessories,
    required this.notes,
    this.damages = '',
  });

  final List<Uint8List> images;
  final String condition;
  final String accessories;
  final String notes;
  final String damages;
}

class _HandoverImageDialog extends StatefulWidget {
  const _HandoverImageDialog({
    required this.rental,
    required this.type,
  });

  final RentalCardData rental;
  final String type;

  @override
  State<_HandoverImageDialog> createState() => _HandoverImageDialogState();
}

class _HandoverImageDialogState extends State<_HandoverImageDialog> {
  final _picker = ImagePicker();
  final List<Uint8List> _images = [];
  bool _loadingImages = false;

  final _conditionCtrl = TextEditingController();
  final _accessoriesCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _damagesCtrl = TextEditingController();

  @override
  void dispose() {
    _conditionCtrl.dispose();
    _accessoriesCtrl.dispose();
    _notesCtrl.dispose();
    _damagesCtrl.dispose();
    super.dispose();
  }

  bool get _isReturn => widget.type == 'return';

  String get _title => _isReturn ? 'Hoàn tất / trả đồ' : 'Xác nhận bàn giao đồ';
  String get _subtitle => _isReturn
      ? 'Tải lên ít nhất 1 ảnh tình trạng món đồ tại thời điểm trả đồ.'
      : 'Tải lên ít nhất 1 ảnh tình trạng món đồ tại thời điểm bàn giao.';
  String get _submitLabel => _isReturn ? 'Hoàn tất đơn' : 'Xác nhận bàn giao';

  Future<void> _pickImages() async {
    setState(() => _loadingImages = true);
    try {
      final picked = await _picker.pickMultiImage(imageQuality: 82);
      if (picked.isEmpty) return;

      final nextImages = <Uint8List>[];
      for (final image in picked) {
        nextImages.add(await image.readAsBytes());
      }
      if (mounted) {
        setState(() => _images.addAll(nextImages));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể chọn ảnh: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingImages = false);
    }
  }

  void _submit() {
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn ít nhất 1 ảnh xác nhận.')),
      );
      return;
    }
    Navigator.pop(
      context,
      _HandoverResult(
        images: List<Uint8List>.from(_images),
        condition: _conditionCtrl.text.trim(),
        accessories: _accessoriesCtrl.text.trim(),
        notes: _notesCtrl.text.trim(),
        damages: _isReturn ? _damagesCtrl.text.trim() : '',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 24),
      child: SafeArea(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 8, 10),
                child: Row(
                  children: [
                    Icon(
                      _isReturn
                          ? Icons.assignment_turned_in_outlined
                          : Icons.handshake_outlined,
                      color: AppColors.green,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _title,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            widget.rental.itemName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed:
                          _loadingImages ? null : () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _subtitle,
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _loadingImages ? null : _pickImages,
                        icon: _loadingImages
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.add_photo_alternate_outlined),
                        label: Text(_loadingImages
                            ? 'Đang đọc ảnh...'
                            : 'Chọn ảnh từ thiết bị'),
                      ),
                      const SizedBox(height: 12),
                      if (_images.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.page,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: const Text(
                            'Chưa có ảnh nào được chọn.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted),
                          ),
                        )
                      else
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _images.length,
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                          ),
                          itemBuilder: (context, index) {
                            return Stack(
                              fit: StackFit.expand,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    _images[index],
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  right: 4,
                                  top: 4,
                                  child: GestureDetector(
                                    onTap: () =>
                                        setState(() => _images.removeAt(index)),
                                    child: Container(
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: Colors.black
                                            .withValues(alpha: 0.65),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.close_rounded,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      const SizedBox(height: 20),
                      const Text(
                        'Thông tin kiểm tra thiết bị',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 14),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _conditionCtrl,
                        decoration: const InputDecoration(
                          labelText:
                              'Tình trạng thiết bị (Ví dụ: Mới, trầy xước nhẹ...)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _accessoriesCtrl,
                        decoration: const InputDecoration(
                          labelText:
                              'Phụ kiện đi kèm (Ví dụ: Cáp sạc, bao da...)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _notesCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Ghi chú khác',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      if (_isReturn) ...[
                        const SizedBox(height: 12),
                        TextField(
                          controller: _damagesCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Mô tả hư hỏng hao mòn (nếu có)',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loadingImages
                            ? null
                            : () => Navigator.pop(context),
                        child: const Text('Hủy'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loadingImages ? null : _submit,
                        icon: const Icon(Icons.cloud_upload_outlined, size: 18),
                        label: Text(_submitLabel),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContractSigningDialog extends StatefulWidget {
  const _ContractSigningDialog({
    required this.rental,
    required this.contract,
    required this.isOwner,
    this.afterConfirm = false,
    this.canSign = true,
  });

  final RentalCardData rental;
  final RentalContractDetail contract;
  final bool isOwner;
  final bool afterConfirm;
  final bool canSign;

  @override
  State<_ContractSigningDialog> createState() => _ContractSigningDialogState();
}

class _ContractSigningDialogState extends State<_ContractSigningDialog> {
  final _signatureController = _SignaturePadController();
  bool _buildingSignature = false;
  bool _exportingPdf = false;

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _submitSignature() async {
    if (_signatureController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Vui lòng ký vào khung chữ ký trước khi lưu.')),
      );
      return;
    }

    setState(() => _buildingSignature = true);
    try {
      final signatureBytes = await _signatureController.toPngBytes();
      if (mounted) Navigator.pop(context, signatureBytes);
    } finally {
      if (mounted) setState(() => _buildingSignature = false);
    }
  }

  Future<void> _exportContractPdf() async {
    setState(() => _exportingPdf = true);
    try {
      final bytes = await _ContractPdfBuilder(
        rental: widget.rental,
        contract: widget.contract,
        isOwner: widget.isOwner,
      ).build();
      final id =
          widget.contract.id.isEmpty ? widget.rental.id : widget.contract.id;
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'hop-dong-$id.pdf',
      );
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _exportingPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleLabel = widget.isOwner ? 'người cho thuê' : 'người thuê';

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
      backgroundColor: AppColors.page,
      child: SafeArea(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(16, 14, 8, 12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: AppColors.line)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.description_outlined,
                        color: AppColors.blue),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.canSign
                                ? 'Ký hợp đồng điện tử'
                                : 'Hợp đồng điện tử',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            widget.canSign
                                ? 'Kiểm tra nội dung và ký với vai trò $roleLabel'
                                : 'Bản hợp đồng của đơn thuê này',
                            style: const TextStyle(
                                color: AppColors.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Xuất PDF',
                      onPressed: (_buildingSignature || _exportingPdf)
                          ? null
                          : _exportContractPdf,
                      icon: _exportingPdf
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.orange,
                              ),
                            )
                          : const Icon(Icons.picture_as_pdf_outlined),
                    ),
                    IconButton(
                      onPressed: (_buildingSignature || _exportingPdf)
                          ? null
                          : () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      if (widget.afterConfirm) ...[
                        const _InlineStateNotice(
                          icon: Icons.verified_user_outlined,
                          text:
                              'Đơn thuê đã được xác nhận. Người cho thuê cần ký hợp đồng trước, sau đó người thuê ký để đủ điều kiện giao nhận đồ.',
                          color: AppColors.orange,
                        ),
                        const SizedBox(height: 12),
                      ],
                      _ContractPaper(
                        rental: widget.rental,
                        contract: widget.contract,
                        isOwner: widget.isOwner,
                      ),
                      if (widget.canSign) ...[
                        const SizedBox(height: 12),
                        _SectionBox(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Chữ ký của $roleLabel',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Ký trực tiếp trong khung bên dưới. Chữ ký sẽ được lưu thành ảnh và đính kèm vào hợp đồng.',
                                style: TextStyle(
                                    color: AppColors.muted, fontSize: 12),
                              ),
                              const SizedBox(height: 12),
                              _SignaturePad(controller: _signatureController),
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton.icon(
                                  onPressed: _buildingSignature
                                      ? null
                                      : _signatureController.clear,
                                  icon: const Icon(Icons.refresh_rounded,
                                      size: 17),
                                  label: const Text('Ký lại'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: AppColors.line)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _buildingSignature
                            ? null
                            : () => Navigator.pop(context),
                        child: Text(widget.canSign ? 'Để sau' : 'Đóng'),
                      ),
                    ),
                    if (widget.canSign) ...[
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed:
                              _buildingSignature ? null : _submitSignature,
                          icon: _buildingSignature
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.edit_note_rounded, size: 18),
                          label: Text(_buildingSignature
                              ? 'Đang lưu...'
                              : 'Lưu chữ ký'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContractPdfBuilder {
  _ContractPdfBuilder({
    required this.rental,
    required this.contract,
    required this.isOwner,
  });

  final RentalCardData rental;
  final RentalContractDetail contract;
  final bool isOwner;

  Future<Uint8List> build() async {
    final regular = await PdfGoogleFonts.robotoRegular();
    final bold = await PdfGoogleFonts.robotoBold();
    final ownerSignature = await _loadSignature(contract.ownerSignatureUrl);
    final renterSignature = await _loadSignature(contract.renterSignatureUrl);
    final doc = pw.Document(
      theme: pw.ThemeData.withFont(base: regular, bold: bold),
    );

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 34, vertical: 30),
        build: (context) => [
          pw.Center(
            child: pw.Text(
              'HỢP ĐỒNG THUÊ TÀI SẢN',
              textAlign: pw.TextAlign.center,
              style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.SizedBox(height: 5),
          pw.Center(
            child: pw.Text(
              'Số hợp đồng: ${contract.id.isEmpty ? rental.id : contract.id}',
              style: const pw.TextStyle(color: PdfColors.grey700, fontSize: 10),
            ),
          ),
          pw.SizedBox(height: 18),
          _sectionTitle('1. Thông tin các bên'),
          _partyBlock(
            title: 'Bên cho thuê',
            party: contract.ownerInfo,
            isCurrentUser: isOwner,
          ),
          pw.SizedBox(height: 8),
          _partyBlock(
            title: 'Bên thuê',
            party: contract.renterInfo,
            isCurrentUser: !isOwner,
          ),
          pw.SizedBox(height: 14),
          _sectionTitle('2. Tài sản thuê'),
          _infoRow(
            'Tên tài sản',
            contract.itemInfo.name.isEmpty
                ? rental.itemName
                : contract.itemInfo.name,
          ),
          _infoRow(
            'Giá thuê mỗi ngày',
            formatMoney(contract.itemInfo.pricePerDay, perDay: false),
          ),
          _infoRow(
            'Tổng giá trị hợp đồng',
            formatMoney(contract.totalPrice, perDay: false),
          ),
          pw.SizedBox(height: 14),
          _sectionTitle('3. Thời hạn thuê'),
          _infoRow('Ngày bắt đầu', shortDate(contract.rentalPeriod.startDate)),
          _infoRow('Ngày kết thúc', shortDate(contract.rentalPeriod.endDate)),
          pw.SizedBox(height: 14),
          _sectionTitle('4. Điều khoản và lưu ý'),
          pw.Text(contract.terms, style: const pw.TextStyle(fontSize: 11)),
          pw.SizedBox(height: 7),
          pw.Text(
            'Hai bên xác nhận thông tin trên là đúng, đã kiểm tra tài sản '
            'trước khi giao nhận, và chịu trách nhiệm với chữ ký điện tử '
            'của mình.',
            style: const pw.TextStyle(fontSize: 11),
          ),
          pw.SizedBox(height: 18),
          _sectionTitle('5. Chữ ký điện tử'),
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(
                child: _signatureBox(
                  title: 'Bên cho thuê',
                  name: contract.ownerInfo.fullName,
                  signedAt: contract.ownerSignedAt,
                  image: ownerSignature,
                ),
              ),
              pw.SizedBox(width: 10),
              pw.Expanded(
                child: _signatureBox(
                  title: 'Bên thuê',
                  name: contract.renterInfo.fullName,
                  signedAt: contract.renterSignedAt,
                  image: renterSignature,
                ),
              ),
            ],
          ),
        ],
      ),
    );

    return doc.save();
  }

  pw.Widget _sectionTitle(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 7),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold),
      ),
    );
  }

  pw.Widget _partyBlock({
    required String title,
    required ContractPartyInfo party,
    required bool isCurrentUser,
  }) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        color: PdfColors.grey100,
        border: pw.Border.all(color: PdfColors.grey300),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            '$title${isCurrentUser ? ' (bạn)' : ''}',
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 5),
          _infoRow(
            'Họ tên',
            party.fullName.isEmpty ? 'Chưa có thông tin' : party.fullName,
          ),
          _infoRow(
            'Số giấy tờ',
            party.idCardNumber.isEmpty
                ? 'Đã xác thực eKYC'
                : party.idCardNumber,
          ),
        ],
      ),
    );
  }

  pw.Widget _infoRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 116,
            child: pw.Text(
              label,
              style: const pw.TextStyle(color: PdfColors.grey700, fontSize: 10),
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              value.isEmpty ? 'Chưa có thông tin' : value,
              style:
                  pw.TextStyle(fontSize: 10.5, fontWeight: pw.FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  pw.Widget _signatureBox({
    required String title,
    required String name,
    required String signedAt,
    required pw.MemoryImage? image,
  }) {
    final signed = signedAt.isNotEmpty || image != null;
    return pw.Container(
      height: 140,
      padding: const pw.EdgeInsets.all(9),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey400),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Column(
        children: [
          pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          pw.Text(
            name.isEmpty ? 'Chưa có thông tin' : name,
            textAlign: pw.TextAlign.center,
            style: const pw.TextStyle(fontSize: 10),
          ),
          pw.SizedBox(height: 7),
          pw.Expanded(
            child: pw.Center(
              child: image == null
                  ? pw.Text(
                      signed ? 'Đã ký' : 'Chưa ký',
                      style: pw.TextStyle(
                        color: signed ? PdfColors.green700 : PdfColors.grey600,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    )
                  : pw.Image(image, fit: pw.BoxFit.contain),
            ),
          ),
          if (signedAt.isNotEmpty)
            pw.Text(
              'Ký lúc ${shortDate(signedAt)}',
              style: const pw.TextStyle(color: PdfColors.grey700, fontSize: 9),
            ),
        ],
      ),
    );
  }

  Future<pw.MemoryImage?> _loadSignature(String value) async {
    if (value.isEmpty) return null;
    try {
      if (value.startsWith('data:image')) {
        final commaIndex = value.indexOf(',');
        if (commaIndex < 0) return null;
        final meta = value.substring(0, commaIndex);
        if (meta.contains('svg')) return null;
        final payload = value.substring(commaIndex + 1);
        final bytes = meta.contains(';base64')
            ? base64Decode(payload)
            : Uint8List.fromList(utf8.encode(Uri.decodeComponent(payload)));
        return pw.MemoryImage(bytes);
      }

      final response = await http.get(Uri.parse(value));
      if (response.statusCode < 200 || response.statusCode >= 300) return null;
      return pw.MemoryImage(response.bodyBytes);
    } catch (_) {
      return null;
    }
  }
}

class _ContractPaper extends StatelessWidget {
  const _ContractPaper({
    required this.rental,
    required this.contract,
    required this.isOwner,
  });

  final RentalCardData rental;
  final RentalContractDetail contract;
  final bool isOwner;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.line),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'HỢP ĐỒNG THUÊ TÀI SẢN',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            'Số hợp đồng: ${contract.id.isEmpty ? rental.id : contract.id}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 18),
          const _ContractSectionTitle('1. Thông tin các bên'),
          _ContractPartyBlock(
            title: 'Bên cho thuê',
            party: contract.ownerInfo,
            isCurrentUser: isOwner,
          ),
          const SizedBox(height: 10),
          _ContractPartyBlock(
            title: 'Bên thuê',
            party: contract.renterInfo,
            isCurrentUser: !isOwner,
          ),
          const SizedBox(height: 16),
          const _ContractSectionTitle('2. Tài sản thuê'),
          _ContractInfoRow(
              'Tên tài sản',
              contract.itemInfo.name.isEmpty
                  ? rental.itemName
                  : contract.itemInfo.name),
          _ContractInfoRow('Giá thuê mỗi ngày',
              formatMoney(contract.itemInfo.pricePerDay, perDay: false)),
          _ContractInfoRow('Tổng giá trị hợp đồng',
              formatMoney(contract.totalPrice, perDay: false)),
          const SizedBox(height: 16),
          const _ContractSectionTitle('3. Thời hạn thuê'),
          _ContractInfoRow(
              'Ngày bắt đầu', shortDate(contract.rentalPeriod.startDate)),
          _ContractInfoRow(
              'Ngày kết thúc', shortDate(contract.rentalPeriod.endDate)),
          const SizedBox(height: 16),
          const _ContractSectionTitle('4. Điều khoản và lưu ý'),
          Text(
            contract.terms,
            style: const TextStyle(height: 1.45, color: AppColors.ink),
          ),
          const SizedBox(height: 10),
          const Text(
            'Hai bên xác nhận thông tin trên là đúng, đã kiểm tra tài sản trước khi giao nhận, và chịu trách nhiệm với chữ ký điện tử của mình.',
            style: TextStyle(height: 1.45, color: AppColors.ink),
          ),
          const SizedBox(height: 18),
          const _ContractSectionTitle('5. Chữ ký điện tử'),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _ContractSignatureBox(
                  title: 'Bên cho thuê',
                  name: contract.ownerInfo.fullName,
                  signedAt: contract.ownerSignedAt,
                  signatureUrl: contract.ownerSignatureUrl,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ContractSignatureBox(
                  title: 'Bên thuê',
                  name: contract.renterInfo.fullName,
                  signedAt: contract.renterSignedAt,
                  signatureUrl: contract.renterSignatureUrl,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ContractPartyBlock extends StatelessWidget {
  const _ContractPartyBlock({
    required this.title,
    required this.party,
    required this.isCurrentUser,
  });

  final String title;
  final ContractPartyInfo party;
  final bool isCurrentUser;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.page,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$title${isCurrentUser ? ' (bạn)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          _ContractInfoRow('Họ tên',
              party.fullName.isEmpty ? 'Chưa có thông tin' : party.fullName),
          _ContractInfoRow(
              'Số giấy tờ',
              party.idCardNumber.isEmpty
                  ? 'Đã xác thực eKYC'
                  : party.idCardNumber),
        ],
      ),
    );
  }
}

class _ContractSectionTitle extends StatelessWidget {
  const _ContractSectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _ContractInfoRow extends StatelessWidget {
  const _ContractInfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 118,
            child: Text(
              label,
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? 'Chưa có thông tin' : value,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContractSignatureBox extends StatelessWidget {
  const _ContractSignatureBox({
    required this.title,
    required this.name,
    required this.signedAt,
    required this.signatureUrl,
  });

  final String title;
  final String name;
  final String signedAt;
  final String signatureUrl;

  @override
  Widget build(BuildContext context) {
    final signed = signedAt.isNotEmpty || signatureUrl.isNotEmpty;
    return Container(
      constraints: const BoxConstraints(minHeight: 150),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.line),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(
            name.isEmpty ? 'Chưa có thông tin' : name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 72,
            child: Center(
              child: signatureUrl.isEmpty
                  ? Text(
                      signed ? 'Đã ký' : 'Chưa ký',
                      style: TextStyle(
                        color: signed ? AppColors.green : AppColors.muted,
                        fontWeight: FontWeight.w800,
                      ),
                    )
                  : _SignaturePreview(signatureUrl: signatureUrl),
            ),
          ),
          if (signedAt.isNotEmpty)
            Text(
              'Ký lúc ${shortDate(signedAt)}',
              style: const TextStyle(color: AppColors.muted, fontSize: 10),
            ),
        ],
      ),
    );
  }
}

class _SignaturePreview extends StatelessWidget {
  const _SignaturePreview({required this.signatureUrl});

  final String signatureUrl;

  @override
  Widget build(BuildContext context) {
    if (signatureUrl.startsWith('data:image')) {
      final commaIndex = signatureUrl.indexOf(',');
      if (commaIndex > -1) {
        final meta = signatureUrl.substring(0, commaIndex);
        final payload = signatureUrl.substring(commaIndex + 1);
        if (meta.contains('svg')) {
          return const _SignedFallbackChip();
        }
        try {
          final bytes = meta.contains(';base64')
              ? base64Decode(payload)
              : Uint8List.fromList(utf8.encode(Uri.decodeComponent(payload)));
          return Image.memory(bytes, fit: BoxFit.contain);
        } catch (_) {
          return const _SignedFallbackChip();
        }
      }
    }

    return Image.network(
      signatureUrl,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => const _SignedFallbackChip(),
    );
  }
}

class _SignedFallbackChip extends StatelessWidget {
  const _SignedFallbackChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: AppColors.greenLight,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.green.withValues(alpha: 0.20)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_outlined, size: 15, color: AppColors.green),
          SizedBox(width: 5),
          Text(
            'Đã ký',
            style: TextStyle(
              color: AppColors.green,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _SignaturePadController extends ChangeNotifier {
  final List<List<Offset>> _strokes = [];
  Size _size = const Size(1, 1);

  bool get isEmpty => _strokes.every((stroke) => stroke.length < 2);

  void setSize(Size size) {
    if (size.width > 0 && size.height > 0) _size = size;
  }

  void startStroke(Offset point) {
    _strokes.add([point]);
    notifyListeners();
  }

  void appendPoint(Offset point) {
    if (_strokes.isEmpty) _strokes.add([]);
    _strokes.last.add(point);
    notifyListeners();
  }

  void clear() {
    _strokes.clear();
    notifyListeners();
  }

  Future<Uint8List> toPngBytes() async {
    final width = _size.width.clamp(1, 1200).round();
    final height = _size.height.clamp(1, 600).round();
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final size = Size(width.toDouble(), height.toDouble());

    final bgPaint = Paint()..color = Colors.white;
    canvas.drawRect(Offset.zero & size, bgPaint);
    _SignaturePainter(_strokes).paint(canvas, size);

    final picture = recorder.endRecording();
    final image = await picture.toImage(width, height);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return bytes!.buffer.asUint8List();
  }
}

class _SignaturePad extends StatefulWidget {
  const _SignaturePad({required this.controller});

  final _SignaturePadController controller;

  @override
  State<_SignaturePad> createState() => _SignaturePadState();
}

class _SignaturePadState extends State<_SignaturePad> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onChanged);
  }

  @override
  void didUpdateWidget(covariant _SignaturePad oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onChanged);
      widget.controller.addListener(_onChanged);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final size = Size(width, 190);
        widget.controller.setSize(size);

        return GestureDetector(
          onPanStart: (details) =>
              widget.controller.startStroke(details.localPosition),
          onPanUpdate: (details) =>
              widget.controller.appendPoint(details.localPosition),
          child: Container(
            width: double.infinity,
            height: size.height,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.line, width: 1.4),
            ),
            child: CustomPaint(
              painter: _SignaturePainter(widget.controller._strokes),
              child: widget.controller.isEmpty
                  ? const Center(
                      child: Text(
                        'Ký vào đây',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  : null,
            ),
          ),
        );
      },
    );
  }
}

class _SignaturePainter extends CustomPainter {
  const _SignaturePainter(this.strokes);

  final List<List<Offset>> strokes;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.ink
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      if (stroke.length < 2) continue;
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (final point in stroke.skip(1)) {
        path.lineTo(point.dx, point.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) => true;
}

class _ContractStatusBox extends StatelessWidget {
  const _ContractStatusBox({
    required this.rental,
    required this.isOwner,
    required this.hasCurrentUserSigned,
    this.onViewContract,
  });

  final RentalCardData rental;
  final bool isOwner;
  final bool hasCurrentUserSigned;
  final VoidCallback? onViewContract;

  @override
  Widget build(BuildContext context) {
    final ownerSigned = rental.ownerHasSigned;
    final renterSigned = rental.renterHasSigned;
    final statusText = rental.isFullySigned
        ? 'Hợp đồng đã được hai bên ký đầy đủ.'
        : hasCurrentUserSigned
            ? 'Bạn đã ký. Đang chờ bên còn lại ký.'
            : 'Hợp đồng đã sẵn sàng. Vui lòng ký trước khi giao/nhận đồ.';

    return _SectionBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.description_outlined, color: AppColors.blue, size: 20),
              SizedBox(width: 8),
              Text(
                'Hợp đồng điện tử',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(statusText, style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 12),
          _SignatureLine(
            label: 'Người cho thuê',
            signed: ownerSigned,
            isCurrentUser: isOwner,
          ),
          const SizedBox(height: 8),
          _SignatureLine(
            label: 'Người thuê',
            signed: renterSigned,
            isCurrentUser: !isOwner,
          ),
          if (onViewContract != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 42,
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onViewContract,
                icon: const Icon(Icons.description_outlined, size: 17),
                label: const Text('Xem hợp đồng điện tử'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.blue,
                  backgroundColor: AppColors.blueLight,
                  side: BorderSide(
                    color: AppColors.blue.withValues(alpha: 0.16),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SignatureLine extends StatelessWidget {
  const _SignatureLine({
    required this.label,
    required this.signed,
    required this.isCurrentUser,
  });

  final String label;
  final bool signed;
  final bool isCurrentUser;

  @override
  Widget build(BuildContext context) {
    final color = signed ? AppColors.green : AppColors.orange;
    return Row(
      children: [
        Icon(
          signed
              ? Icons.check_circle_outline_rounded
              : Icons.pending_actions_rounded,
          size: 18,
          color: color,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            '$label${isCurrentUser ? ' (bạn)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          signed ? 'Đã ký' : 'Chưa ký',
          style: TextStyle(color: color, fontWeight: FontWeight.w800),
        ),
      ],
    );
  }
}

class _InlineStateNotice extends StatelessWidget {
  const _InlineStateNotice({
    required this.icon,
    required this.text,
    required this.color,
  });

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: color, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

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
    final orderedMessages = [...messages]..sort((a, b) {
        final aTime = DateTime.tryParse(a.createdAt);
        final bTime = DateTime.tryParse(b.createdAt);
        if (aTime == null || bTime == null) {
          return a.createdAt.compareTo(b.createdAt);
        }
        return aTime.compareTo(bTime);
      });

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppColors.orangeLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.chat_bubble_outline_rounded,
                              color: AppColors.orange, size: 36),
                        ),
                        const SizedBox(height: 16),
                        const Text('Chưa có tin nhắn nào',
                            style: TextStyle(
                                fontWeight: FontWeight.w800, fontSize: 16)),
                        const SizedBox(height: 6),
                        const Text('Hãy bắt đầu cuộc trò chuyện!',
                            style: TextStyle(color: AppColors.muted)),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: onRefresh,
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text('Làm mới'),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    reverse: true,
                    padding: const EdgeInsets.fromLTRB(14, 16, 14, 8),
                    itemCount: orderedMessages.length,
                    itemBuilder: (_, i) {
                      final messageIndex = orderedMessages.length - 1 - i;
                      final m = orderedMessages[messageIndex];
                      final isMe = m.senderId == currentUserId;
                      final showDate = messageIndex == 0 ||
                          !_sameDay(orderedMessages[messageIndex - 1].createdAt,
                              m.createdAt);
                      return Column(
                        children: [
                          if (showDate) _DateDivider(date: m.createdAt),
                          _ChatBubble(message: m, isMe: isMe),
                        ],
                      );
                    },
                  ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(top: BorderSide(color: AppColors.line)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, -2))
            ],
          ),
          padding: EdgeInsets.fromLTRB(
              12, 10, 12, MediaQuery.of(context).viewInsets.bottom + 12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  decoration: const InputDecoration(
                    hintText: 'Nhập tin nhắn...',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    filled: true,
                    fillColor: AppColors.page,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide: BorderSide(color: AppColors.line)),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide: BorderSide(color: AppColors.line)),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(24)),
                        borderSide:
                            BorderSide(color: AppColors.orange, width: 1.5)),
                  ),
                  onSubmitted: (_) => onSend(),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onSend,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: const BoxDecoration(
                      color: AppColors.orange, shape: BoxShape.circle),
                  child: const Icon(Icons.send_rounded,
                      color: Colors.white, size: 18),
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

  String _timeString(String sentAt) {
    try {
      final dt = DateTime.parse(sentAt).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            SizedBox(
              width: 32,
              height: 32,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: AppColors.orangeLight,
                    child: Text(
                      message.senderName.isNotEmpty
                          ? message.senderName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                          color: AppColors.orange,
                          fontSize: 12,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                  if (message.senderAvatar.isNotEmpty)
                    ClipOval(
                      child: Image.network(
                        message.senderAvatar,
                        width: 32,
                        height: 32,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe && message.senderName.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 4),
                    child: Text(
                      message.senderName,
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.muted,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isMe ? AppColors.orange : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isMe ? 18 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 18),
                    ),
                    border: isMe ? null : Border.all(color: AppColors.line),
                    boxShadow: [
                      BoxShadow(
                        color:
                            Colors.black.withValues(alpha: isMe ? 0.12 : 0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    message.content,
                    style: TextStyle(
                        color: isMe ? Colors.white : AppColors.ink,
                        fontSize: 14,
                        height: 1.4),
                  ),
                ),
                const SizedBox(height: 3),
                Padding(
                  padding:
                      EdgeInsets.only(left: isMe ? 0 : 4, right: isMe ? 4 : 0),
                  child: Text(
                    _timeString(message.createdAt),
                    style:
                        const TextStyle(fontSize: 10, color: AppColors.muted),
                  ),
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

bool _sameDay(String a, String b) {
  try {
    final da = DateTime.parse(a).toLocal();
    final db = DateTime.parse(b).toLocal();
    return da.year == db.year && da.month == db.month && da.day == db.day;
  } catch (_) {
    return true;
  }
}

class _DateDivider extends StatelessWidget {
  const _DateDivider({required this.date});
  final String date;

  String _label() {
    try {
      final dt = DateTime.parse(date).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return 'Hôm nay';
      }
      final yesterday = now.subtract(const Duration(days: 1));
      if (dt.year == yesterday.year &&
          dt.month == yesterday.month &&
          dt.day == yesterday.day) {
        return 'Hôm qua';
      }
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return date.length >= 10 ? date.substring(0, 10) : date;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          const Expanded(child: Divider(color: AppColors.line)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.page,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.line),
              ),
              child: Text(_label(),
                  style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.muted,
                      fontWeight: FontWeight.w600)),
            ),
          ),
          const Expanded(child: Divider(color: AppColors.line)),
        ],
      ),
    );
  }
}

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
              style: const TextStyle(
                  color: AppColors.red, fontWeight: FontWeight.w700)),
        ]),
      );
    }

    final current = _currentStep;
    return _SectionBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Trạng thái đơn thuê',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
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
                            boxShadow: active
                                ? [
                                    BoxShadow(
                                        color: AppColors.orange
                                            .withValues(alpha: 0.4),
                                        blurRadius: 8)
                                  ]
                                : null,
                          ),
                          child: Icon(_steps[i].$3,
                              size: active ? 14 : 12,
                              color: done ? Colors.white : AppColors.muted),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 52,
                          child: Text(_steps[i].$2,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: 8,
                                  fontWeight: active
                                      ? FontWeight.w700
                                      : FontWeight.w400,
                                  color: done
                                      ? AppColors.orange
                                      : AppColors.muted)),
                        ),
                      ],
                    ),
                    if (i < _steps.length - 1)
                      Expanded(
                        child: Container(
                            height: 2,
                            color: i < current
                                ? AppColors.orange
                                : AppColors.line),
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
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          elevation: 0,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(
      {required this.icon,
      required this.label,
      required this.value,
      this.valueColor});
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 18, color: AppColors.muted),
      const SizedBox(width: 10),
      Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: AppColors.muted)),
        const SizedBox(height: 1),
        Text(value,
            style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: valueColor ?? AppColors.ink)),
      ])),
    ]);
  }
}

// â”€â”€â”€ Polling Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _PaymentPollingDialog extends StatefulWidget {
  const _PaymentPollingDialog(
      {required this.rentalId, required this.repository});
  final String rentalId;
  final RentalsRepository repository;

  @override
  State<_PaymentPollingDialog> createState() => _PaymentPollingDialogState();
}

class _PaymentPollingDialogState extends State<_PaymentPollingDialog> {
  Timer? _timer;
  bool _checking = false;
  bool _timedOut = false;
  int _attempts = 0;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  void _startPolling() {
    _pollPaymentStatus();
    _timer = Timer.periodic(
      const Duration(seconds: 3),
      (_) => _pollPaymentStatus(),
    );
  }

  Future<void> _pollPaymentStatus() async {
    if (_checking || _timedOut) return;

    _checking = true;
    _attempts += 1;
    try {
      final detail = await widget.repository.getRentalDetail(widget.rentalId);
      final status = detail.status.toLowerCase();
      final paymentStatus = detail.paymentStatus.toLowerCase();
      final paid = paymentStatus == 'escrowed' ||
          status == 'pending_confirmation' ||
          status == 'confirmed' ||
          status == 'in_progress' ||
          status == 'completed';
      final stopped = paymentStatus == 'refunded' ||
          status == 'cancelled' ||
          status == 'rejected';

      if (paid || stopped) {
        _timer?.cancel();
        if (mounted) Navigator.of(context).pop(paid);
        return;
      }

      if (_attempts >= 40) {
        _timer?.cancel();
        if (mounted) {
          setState(() => _timedOut = true);
        }
      }
    } catch (_) {
      if (_attempts >= 40) {
        _timer?.cancel();
        if (mounted) {
          setState(() => _timedOut = true);
        }
      }
    } finally {
      _checking = false;
    }
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
          if (!_timedOut)
            const CircularProgressIndicator(color: AppColors.orange)
          else
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.orangeLight,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.schedule_rounded,
                color: AppColors.orange,
                size: 26,
              ),
            ),
          const SizedBox(height: 24),
          Text(
            _timedOut
                ? 'Chưa xác nhận được thanh toán'
                : 'Đang chờ thanh toán...',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _timedOut
                ? 'Nếu bạn đã thanh toán, vui lòng kéo để làm mới lại đơn thuê sau ít phút.'
                : 'Vui lòng hoàn tất thanh toán trên trình duyệt. Màn hình này sẽ tự đóng khi thanh toán thành công.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          if (_timedOut) ...[
            FilledButton(
              onPressed: () {
                setState(() {
                  _attempts = 0;
                  _timedOut = false;
                });
                _startPolling();
              },
              child: const Text('Kiểm tra lại'),
            ),
            const SizedBox(height: 8),
          ],
          TextButton(
            onPressed: () {
              _timer?.cancel();
              Navigator.of(context).pop(false);
            },
            child: Text(
              _timedOut ? 'Đóng' : 'Hủy',
              style: const TextStyle(color: AppColors.red),
            ),
          ),
        ],
      ),
    );
  }
}

// â”€â”€â”€ Payment Result Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 10))
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 80, color: color),
                const SizedBox(height: 16),
                Text(title,
                    style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: color)),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 16, color: AppColors.muted, height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: FilledButton(
                    onPressed: () => Navigator.of(context).pop(success),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.orange,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 16),
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

class _ReviewDialog extends StatefulWidget {
  const _ReviewDialog({
    required this.rentalId,
    required this.revieweeId,
    required this.repository,
    required this.onSubmitted,
    this.revieweeName = '',
    this.revieweeAvatar = '',
  });

  final String rentalId;
  final String revieweeId;
  final RentalsRepository repository;
  final VoidCallback onSubmitted;
  final String revieweeName;
  final String revieweeAvatar;

  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  final Set<String> _selectedTags = {};
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final typedComment = _commentCtrl.text.trim();
    final tagComment = _selectedTags.join(', ');
    final comment = [
      if (tagComment.isNotEmpty) tagComment,
      if (typedComment.isNotEmpty) typedComment,
    ].join(' - ');

    setState(() => _submitting = true);
    try {
      await widget.repository.createReview(
        rentalId: widget.rentalId,
        revieweeId: widget.revieweeId,
        rating: _rating,
        comment: comment,
      );
      if (mounted) {
        Navigator.pop(context);
        widget.onSubmitted();
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  static const _ratingLabels = [
    '',
    'Rất tệ',
    'Không tốt',
    'Bình thường',
    'Tốt',
    'Tuyệt vời'
  ];
  static const _reviewTags = [
    'Đúng hẹn',
    'Giao tiếp tốt',
    'Giữ đồ cẩn thận',
    'Thân thiện',
    'Rõ ràng',
    'Dễ hợp tác',
  ];

  @override
  Widget build(BuildContext context) {
    final name =
        widget.revieweeName.isNotEmpty ? widget.revieweeName : 'Đối tác';
    final avatar = widget.revieweeAvatar;
    final initials =
        name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';

    return Dialog(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 32),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded,
                      color: AppColors.ink, size: 22),
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 34, minHeight: 34),
                ),
              ),
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.14),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircleAvatar(
                      radius: 34,
                      backgroundColor: AppColors.orangeLight,
                      child: Text(initials,
                          style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: AppColors.orange)),
                    ),
                    if (avatar.isNotEmpty)
                      ClipOval(
                        child: Image.network(
                          avatar,
                          width: 68,
                          height: 68,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Bạn đánh giá $name thế nào?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Text(
                  _rating == 0 ? 'Chọn số sao phù hợp' : _ratingLabels[_rating],
                  key: ValueKey(_rating),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.orange,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    height: 1.25,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) {
                  final v = i + 1;
                  final filled = v <= _rating;
                  return GestureDetector(
                    onTap: () => setState(() {
                      _rating = v;
                    }),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 150),
                        child: Icon(
                          filled
                              ? Icons.star_rounded
                              : Icons.star_border_rounded,
                          key: ValueKey(filled),
                          color: filled
                              ? AppColors.orange
                              : const Color(0xffd1d5db),
                          size: 39,
                        ),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 18),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: _reviewTags.map((tag) {
                  final selected = _selectedTags.contains(tag);
                  return InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: () => setState(() {
                      if (selected) {
                        _selectedTags.remove(tag);
                      } else {
                        _selectedTags.add(tag);
                      }
                    }),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.orangeLight : Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: selected ? AppColors.orange : AppColors.line,
                        ),
                      ),
                      child: Text(
                        tag,
                        style: TextStyle(
                          color: selected ? AppColors.orange : AppColors.muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _commentCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Chia sẻ thêm về trải nghiệm của bạn...',
                  hintStyle:
                      TextStyle(color: AppColors.muted.withValues(alpha: 0.7)),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.line),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.line),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide:
                        const BorderSide(color: AppColors.orange, width: 1.5),
                  ),
                  contentPadding: const EdgeInsets.all(14),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Gửi đánh giá',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w900)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
