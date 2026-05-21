import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
      'pending' => 'Äang hĂ²a giáº£i',
      'escalated' => 'ÄĂ£ yĂªu cáº§u Admin',
      'resolved' => 'ÄĂ£ giáº£i quyáº¿t',
      'withdrawn' => 'ÄĂ£ rĂºt',
      _ => 'Tranh cháº¥p',
    };

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
  bool _autoPromptedSign = false;
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
      final shouldPromptSign = found != null &&
          found.status == 'confirmed' &&
          !found.isFullySigned &&
          !(ownerFlag ? found.ownerHasSigned : found.renterHasSigned);
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
                  message:
                      'Thanh toĂ¡n thĂ nh cĂ´ng! ÄÆ¡n thuĂª Ä‘Ă£ Ä‘Æ°á»£c cáº­p nháº­t.',
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
          const SnackBar(content: Text('ÄĂ£ kĂ½ há»£p Ä‘á»“ng Ä‘iá»‡n tá»­')),
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

    final images = await showDialog<List<Uint8List>>(
      context: context,
      builder: (ctx) => _HandoverImageDialog(
        rental: currentRental,
        type: type,
      ),
    );

    if (images == null || images.isEmpty || !mounted) return;

    setState(() => actionLoading = true);
    try {
      final imageUrls = <String>[];
      for (var i = 0; i < images.length; i += 1) {
        final imageUrl = await widget.repository.uploadHandoverImage(
          rentalId: widget.rentalId,
          type: type,
          index: i,
          bytes: images[i],
        );
        imageUrls.add(imageUrl);
      }

      if (type == 'return') {
        await widget.repository.completeRental(widget.rentalId, imageUrls);
      } else {
        await widget.repository.pickupRental(widget.rentalId, imageUrls);
      }

      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(type == 'return'
                ? 'ÄĂ£ hoĂ n táº¥t tráº£ Ä‘á»“'
                : 'ÄĂ£ xĂ¡c nháº­n bĂ n giao Ä‘á»“'),
          ),
        );
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
          const SnackBar(content: Text('Da gui bao cao su co')),
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
          const SnackBar(content: Text('Da rut khieu nai')),
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
          const SnackBar(content: Text('Da yeu cau Admin can thiep')),
        );
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => actionLoading = false);
    }
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
        appBar: AppBar(title: const Text('Chi tiáº¿t Ä‘Æ¡n thuĂª')),
        body: const Center(
            child: CircularProgressIndicator(color: AppColors.orange)),
      );
    }

    final r = rental;
    if (r == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiáº¿t Ä‘Æ¡n thuĂª')),
        body: const Center(child: Text('KhĂ´ng tĂ¬m tháº¥y Ä‘Æ¡n thuĂª')),
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
        title: const Text('Chi tiáº¿t Ä‘Æ¡n thuĂª'),
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
                text: 'ThĂ´ng tin'),
            Tab(
                icon: Icon(Icons.chat_bubble_outline_rounded, size: 18),
                text: 'Tin nháº¯n'),
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

// â”€â”€â”€ Info Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  @override
  Widget build(BuildContext context) {
    final hasCurrentUserSigned =
        isOwner ? rental.ownerHasSigned : rental.renterHasSigned;
    final needsSignatureBeforePickup =
        rental.status == 'confirmed' && !rental.isFullySigned;
    final isWaitingForOtherSignature =
        needsSignatureBeforePickup && hasCurrentUserSigned;

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

          // Timeline status
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

          // Info rows
          _SectionBox(
            child: Column(
              children: [
                _InfoRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Thá»i gian thuĂª',
                    value:
                        '${shortDate(rental.startDate)} â†’ ${shortDate(rental.endDate)}'),
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.payments_outlined,
                    label: 'Tá»•ng tiá»n',
                    value: formatMoney(rental.totalAmount, perDay: false),
                    valueColor: AppColors.orange),
                const Divider(height: 20),
                _InfoRow(
                    icon: Icons.account_balance_outlined,
                    label: 'Tiá»n kĂ½ quá»¹',
                    value: formatMoney(rental.escrowAmount, perDay: false)),
                if (rental.counterpartyName.isNotEmpty) ...[
                  const Divider(height: 20),
                  _InfoRow(
                      icon: Icons.person_outline_rounded,
                      label: 'Äá»‘i tĂ¡c',
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

          // Action buttons
          if (actionLoading)
            const Center(
                child: CircularProgressIndicator(color: AppColors.orange))
          else ...[
            // VNPay
            if (onVnpay != null) ...[
              _ActionButton(
                label: 'đŸ’³ Thanh toĂ¡n qua VNPay',
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
                      icon: const Icon(Icons.close_rounded,
                          size: 16, color: AppColors.red),
                      label: const Text('Tá»« chá»‘i',
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
                      label: const Text('XĂ¡c nháº­n'),
                    ),
                  ),
              ]),
            // Sign contract
            if (isWaitingForOtherSignature) ...[
              const SizedBox(height: 8),
              const _InlineStateNotice(
                icon: Icons.hourglass_top_rounded,
                text:
                    'Báº¡n Ä‘Ă£ kĂ½ há»£p Ä‘á»“ng. Äang chá» bĂªn cĂ²n láº¡i kĂ½.',
                color: AppColors.orange,
              ),
            ],
            if (onSign != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: 'âœï¸ KĂ½ há»£p Ä‘á»“ng Ä‘iá»‡n tá»­',
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
                text: 'Cáº§n kĂ½ há»£p Ä‘á»“ng trÆ°á»›c khi giao/nháº­n Ä‘á»“.',
                color: AppColors.orange,
              ),
            ],
            // Pickup
            if (onPickup != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: 'đŸ“¦ XĂ¡c nháº­n giao/nháº­n Ä‘á»“',
                color: AppColors.green,
                icon: Icons.handshake_outlined,
                onTap: onPickup!,
              ),
            ],
            // Complete
            if (onComplete != null) ...[
              const SizedBox(height: 8),
              _ActionButton(
                label: 'âœ… HoĂ n thĂ nh & Tráº£ Ä‘á»“',
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
                  icon: const Icon(Icons.flag_outlined,
                      size: 16, color: AppColors.red),
                  label: const Text('BĂ¡o cĂ¡o sá»± cá»‘',
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

// â”€â”€â”€ Chat Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                      'Ho so tranh chap',
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
            dispute.reason.isEmpty ? 'Chua co mo ta su co.' : dispute.reason,
            style: const TextStyle(height: 1.35),
          ),
          const SizedBox(height: 12),
          _InfoRow(
            icon: Icons.timer_outlined,
            label: 'Han hoa giai',
            value: shortDate(dispute.mediationEndsAt),
          ),
          if (dispute.adminDecision.isNotEmpty) ...[
            const Divider(height: 20),
            _InfoRow(
              icon: Icons.fact_check_outlined,
              label: 'Phan quyet',
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
                      label: const Text('Rut khieu nai'),
                    ),
                  ),
                if (_canWithdraw && _canEscalate) const SizedBox(width: 10),
                if (_canEscalate)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed:
                          actionLoading ? null : () => onEscalate(dispute.id),
                      icon: const Icon(Icons.support_agent_rounded, size: 16),
                      label: const Text('Yeu cau Admin'),
                    ),
                  ),
              ],
            ),
          ] else if (dispute.status == 'pending') ...[
            const SizedBox(height: 10),
            const _InlineStateNotice(
              icon: Icons.schedule_rounded,
              text: 'Co the yeu cau Admin can thiep sau 48 gio hoa giai.',
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
                  'ÄÆ¡n Ä‘ang trong quĂ¡ trĂ¬nh cho thuĂª',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  'NgÆ°á»i thuĂª Ä‘ang sá»­ dá»¥ng ${rental.itemName}. Khi ngÆ°á»i thuĂª tráº£ Ä‘á»“, há» sáº½ gá»­i áº£nh xĂ¡c nháº­n Ä‘á»ƒ hoĂ n táº¥t Ä‘Æ¡n.',
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
          SnackBar(content: Text('Khong the chon anh: $e')),
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
        const SnackBar(content: Text('Vui long nhap ly do tranh chap.')),
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
    return AlertDialog(
      title: const Text('Bao cao su co'),
      content: SizedBox(
        width: 420,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _reasonCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Mo ta su co',
                  hintText: 'Mo ta chi tiet van de gap phai...',
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _loadingImages ? null : _pickImages,
                icon: _loadingImages
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add_photo_alternate_outlined),
                label: Text(
                  _images.isEmpty
                      ? 'Them anh bang chung'
                      : 'Them anh (${_images.length})',
                ),
              ),
              if (_images.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(_images.length, (index) {
                    return Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(
                            _images[index],
                            width: 64,
                            height: 64,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: InkWell(
                            onTap: () =>
                                setState(() => _images.removeAt(index)),
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.55),
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
                  }),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _loadingImages ? null : () => Navigator.pop(context),
          child: const Text('Huy'),
        ),
        FilledButton(
          onPressed: _loadingImages ? null : _submit,
          style: FilledButton.styleFrom(backgroundColor: AppColors.red),
          child: const Text('Gui bao cao'),
        ),
      ],
    );
  }
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

  bool get _isReturn => widget.type == 'return';

  String get _title =>
      _isReturn ? 'HoĂ n táº¥t / tráº£ Ä‘á»“' : 'XĂ¡c nháº­n bĂ n giao Ä‘á»“';
  String get _subtitle => _isReturn
      ? 'Táº£i lĂªn Ă­t nháº¥t 1 áº£nh tĂ¬nh tráº¡ng mĂ³n Ä‘á»“ táº¡i thá»i Ä‘iá»ƒm tráº£ Ä‘á»“.'
      : 'Táº£i lĂªn Ă­t nháº¥t 1 áº£nh tĂ¬nh tráº¡ng mĂ³n Ä‘á»“ táº¡i thá»i Ä‘iá»ƒm bĂ n giao.';
  String get _submitLabel =>
      _isReturn ? 'HoĂ n táº¥t Ä‘Æ¡n' : 'XĂ¡c nháº­n bĂ n giao';

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
          SnackBar(content: Text('KhĂ´ng thá»ƒ chá»n áº£nh: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingImages = false);
    }
  }

  void _submit() {
    if (_images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Vui lĂ²ng chá»n Ă­t nháº¥t 1 áº£nh xĂ¡c nháº­n.')),
      );
      return;
    }
    Navigator.pop(context, List<Uint8List>.from(_images));
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
                            ? 'Äang Ä‘á»c áº£nh...'
                            : 'Chá»n áº£nh tá»« thiáº¿t bá»‹'),
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
                            'ChÆ°a cĂ³ áº£nh nĂ o Ä‘Æ°á»£c chá»n.',
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
                        child: const Text('Há»§y'),
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

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _submitSignature() async {
    if (_signatureController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Vui lĂ²ng kĂ½ vĂ o khung chá»¯ kĂ½ trÆ°á»›c khi lÆ°u.')),
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

  @override
  Widget build(BuildContext context) {
    final roleLabel = widget.isOwner ? 'ngÆ°á»i cho thuĂª' : 'ngÆ°á»i thuĂª';

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
                                ? 'KĂ½ há»£p Ä‘á»“ng Ä‘iá»‡n tá»­'
                                : 'Há»£p Ä‘á»“ng Ä‘iá»‡n tá»­',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            widget.canSign
                                ? 'Kiá»ƒm tra ná»™i dung vĂ  kĂ½ vá»›i vai trĂ² $roleLabel'
                                : 'Báº£n há»£p Ä‘á»“ng cá»§a Ä‘Æ¡n thuĂª nĂ y',
                            style: const TextStyle(
                                color: AppColors.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _buildingSignature
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
                              'ÄÆ¡n thuĂª Ä‘Ă£ Ä‘Æ°á»£c xĂ¡c nháº­n. NgÆ°á»i cho thuĂª cáº§n kĂ½ há»£p Ä‘á»“ng trÆ°á»›c, sau Ä‘Ă³ ngÆ°á»i thuĂª kĂ½ Ä‘á»ƒ Ä‘á»§ Ä‘iá»u kiá»‡n giao/nháº­n Ä‘á»“.',
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
                                'Chá»¯ kĂ½ cá»§a $roleLabel',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'KĂ½ trá»±c tiáº¿p trong khung bĂªn dÆ°á»›i. Chá»¯ kĂ½ sáº½ Ä‘Æ°á»£c lÆ°u thĂ nh áº£nh vĂ  Ä‘Ă­nh kĂ¨m vĂ o há»£p Ä‘á»“ng.',
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
                                  label: const Text('KĂ½ láº¡i'),
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
                        child: Text(widget.canSign ? 'Äá»ƒ sau' : 'ÄĂ³ng'),
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
                              ? 'Äang lÆ°u...'
                              : 'LÆ°u chá»¯ kĂ½'),
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
            'Há»¢P Äá»’NG THUĂ TĂ€I Sáº¢N',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            'Sá»‘ há»£p Ä‘á»“ng: ${contract.id.isEmpty ? rental.id : contract.id}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 18),
          const _ContractSectionTitle('1. ThĂ´ng tin cĂ¡c bĂªn'),
          _ContractPartyBlock(
            title: 'BĂªn cho thuĂª',
            party: contract.ownerInfo,
            isCurrentUser: isOwner,
          ),
          const SizedBox(height: 10),
          _ContractPartyBlock(
            title: 'BĂªn thuĂª',
            party: contract.renterInfo,
            isCurrentUser: !isOwner,
          ),
          const SizedBox(height: 16),
          const _ContractSectionTitle('2. TĂ i sáº£n thuĂª'),
          _ContractInfoRow(
              'TĂªn tĂ i sáº£n',
              contract.itemInfo.name.isEmpty
                  ? rental.itemName
                  : contract.itemInfo.name),
          _ContractInfoRow('GiĂ¡ thuĂª má»—i ngĂ y',
              formatMoney(contract.itemInfo.pricePerDay, perDay: false)),
          _ContractInfoRow('Tá»•ng giĂ¡ trá»‹ há»£p Ä‘á»“ng',
              formatMoney(contract.totalPrice, perDay: false)),
          const SizedBox(height: 16),
          const _ContractSectionTitle('3. Thá»i háº¡n thuĂª'),
          _ContractInfoRow(
              'NgĂ y báº¯t Ä‘áº§u', shortDate(contract.rentalPeriod.startDate)),
          _ContractInfoRow(
              'NgĂ y káº¿t thĂºc', shortDate(contract.rentalPeriod.endDate)),
          const SizedBox(height: 16),
          const _ContractSectionTitle('4. Äiá»u khoáº£n vĂ  lÆ°u Ă½'),
          Text(
            contract.terms,
            style: const TextStyle(height: 1.45, color: AppColors.ink),
          ),
          const SizedBox(height: 10),
          const Text(
            'Hai bĂªn xĂ¡c nháº­n thĂ´ng tin trĂªn lĂ  Ä‘Ăºng, Ä‘Ă£ kiá»ƒm tra tĂ i sáº£n trÆ°á»›c khi giao nháº­n, vĂ  chá»‹u trĂ¡ch nhiá»‡m vá»›i chá»¯ kĂ½ Ä‘iá»‡n tá»­ cá»§a mĂ¬nh.',
            style: TextStyle(height: 1.45, color: AppColors.ink),
          ),
          const SizedBox(height: 18),
          const _ContractSectionTitle('5. Chá»¯ kĂ½ Ä‘iá»‡n tá»­'),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _ContractSignatureBox(
                  title: 'BĂªn cho thuĂª',
                  name: contract.ownerInfo.fullName,
                  signedAt: contract.ownerSignedAt,
                  signatureUrl: contract.ownerSignatureUrl,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ContractSignatureBox(
                  title: 'BĂªn thuĂª',
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
            '$title${isCurrentUser ? ' (báº¡n)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          _ContractInfoRow('Há» tĂªn',
              party.fullName.isEmpty ? 'ChÆ°a cĂ³ thĂ´ng tin' : party.fullName),
          _ContractInfoRow(
              'Sá»‘ giáº¥y tá»',
              party.idCardNumber.isEmpty
                  ? 'ÄĂ£ xĂ¡c thá»±c eKYC'
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
              value.isEmpty ? 'ChÆ°a cĂ³ thĂ´ng tin' : value,
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
            name.isEmpty ? 'ChÆ°a cĂ³ thĂ´ng tin' : name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 72,
            child: Center(
              child: signatureUrl.isEmpty
                  ? Text(
                      signed ? 'ÄĂ£ kĂ½' : 'ChÆ°a kĂ½',
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
              'KĂ½ lĂºc ${shortDate(signedAt)}',
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
            'ÄĂ£ kĂ½',
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
                        'KĂ½ vĂ o Ä‘Ă¢y',
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
        ? 'Há»£p Ä‘á»“ng Ä‘Ă£ Ä‘Æ°á»£c hai bĂªn kĂ½ Ä‘áº§y Ä‘á»§.'
        : hasCurrentUserSigned
            ? 'Báº¡n Ä‘Ă£ kĂ½. Äang chá» bĂªn cĂ²n láº¡i kĂ½.'
            : 'Há»£p Ä‘á»“ng Ä‘Ă£ sáºµn sĂ ng. Vui lĂ²ng kĂ½ trÆ°á»›c khi giao/nháº­n Ä‘á»“.';

    return _SectionBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.description_outlined, color: AppColors.blue, size: 20),
              SizedBox(width: 8),
              Text(
                'Há»£p Ä‘á»“ng Ä‘iá»‡n tá»­',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(statusText, style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 12),
          _SignatureLine(
            label: 'NgÆ°á»i cho thuĂª',
            signed: ownerSigned,
            isCurrentUser: isOwner,
          ),
          const SizedBox(height: 8),
          _SignatureLine(
            label: 'NgÆ°á»i thuĂª',
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
                label: const Text('Xem há»£p Ä‘á»“ng Ä‘iá»‡n tá»­'),
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
            '$label${isCurrentUser ? ' (báº¡n)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          signed ? 'ÄĂ£ kĂ½' : 'ChÆ°a kĂ½',
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
    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: onRefresh,
            child: messages.isEmpty
                ? const Center(
                    child: Text(
                        'ChÆ°a cĂ³ tin nháº¯n.\nKĂ©o xuá»‘ng Ä‘á»ƒ táº£i láº¡i.',
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
                    hintText: 'Nháº­p tin nháº¯n...',
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

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
                radius: 14,
                backgroundColor: AppColors.orangeLight,
                child: Text(
                    message.senderName.isNotEmpty
                        ? message.senderName[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                        color: AppColors.orange,
                        fontSize: 11,
                        fontWeight: FontWeight.w700))),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe && message.senderName.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 2),
                    child: Text(message.senderName,
                        style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600)),
                  ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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

// â”€â”€â”€ Status Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.status});
  final String status;

  static const _steps = [
    ('pending_payment', 'Chá» thanh toĂ¡n', Icons.payment_outlined),
    (
      'pending_confirmation',
      'Chá» xĂ¡c nháº­n',
      Icons.hourglass_empty_rounded
    ),
    ('confirmed', 'ÄĂ£ xĂ¡c nháº­n', Icons.check_circle_outline_rounded),
    ('in_progress', 'Äang thuĂª', Icons.handshake_outlined),
    ('completed', 'HoĂ n thĂ nh', Icons.done_all_rounded),
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
          Text(
              status == 'cancelled'
                  ? 'ÄÆ¡n Ä‘Ă£ bá»‹ há»§y'
                  : 'ÄÆ¡n bá»‹ tá»« chá»‘i',
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
          Text('Tráº¡ng thĂ¡i Ä‘Æ¡n thuĂª',
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            'Äang chá» thanh toĂ¡n...',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Vui lĂ²ng hoĂ n táº¥t thanh toĂ¡n trĂªn trĂ¬nh duyá»‡t. MĂ n hĂ¬nh nĂ y sáº½ tá»± Ä‘á»™ng Ä‘Ă³ng khi thanh toĂ¡n thĂ nh cĂ´ng.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: () {
              _timer?.cancel();
              Navigator.of(context).pop(false);
            },
            child: const Text('Há»§y', style: TextStyle(color: AppColors.red)),
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
    final title = success ? 'ThĂ nh cĂ´ng' : 'Tháº¥t báº¡i';

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
                    child: const Text('Quay láº¡i Ä‘Æ¡n thuĂª'),
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
