import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/rental_detail_page.dart';

class ItemDetailPage extends StatefulWidget {
  const ItemDetailPage({
    super.key,
    required this.repository,
    required this.itemId,
    this.rentalsRepository,
    this.currentUserId = '',
  });

  final ItemsRepository repository;
  final String itemId;
  final RentalsRepository? rentalsRepository;
  final String currentUserId;

  @override
  State<ItemDetailPage> createState() => _ItemDetailPageState();
}

class _ItemDetailPageState extends State<ItemDetailPage> {
  ItemDetail? item;
  bool loading = true;
  int _imageIndex = 0;
  final _pageCtrl = PageController();

  @override
  void initState() {
    super.initState();
    loadDetail();
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<void> loadDetail() async {
    setState(() => loading = true);
    try {
      final result = await widget.repository.getItemDetail(widget.itemId);
      setState(() => item = result);
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> createRental() async {
    final start = TextEditingController(text: dateInput(DateTime.now()));
    final end = TextEditingController(
        text: dateInput(DateTime.now().add(const Duration(days: 1))));
    final note = TextEditingController();

    // Show as center dialog (not bottom sheet)
    final submitted = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: _RentalDialog(start: start, end: end, note: note),
      ),
    );

    if (submitted != true) return;

    try {
      final rental = await widget.repository.createRentalRequest(
        itemId: widget.itemId,
        startDate: start.text.trim(),
        endDate: end.text.trim(),
        note: note.text.trim(),
      );

      if (!mounted) return;

      // Navigate directly to the rental detail page
      final repo = widget.rentalsRepository;
      if (repo != null) {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => RentalDetailPage(
              rentalId: rental.id,
              repository: repo,
              currentUserId: widget.currentUserId,
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Đã tạo đơn thuê! Trạng thái: ${rental.status}'),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = item;

    if (loading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(
            child: CircularProgressIndicator(color: AppColors.orange)),
      );
    }

    if (detail == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết')),
        body: EmptyState(
          message: 'Không tải được chi tiết',
          icon: Icons.error_outline_rounded,
          subtitle: 'Vui lòng thử lại',
        ),
      );
    }

    final images = detail.images.isNotEmpty ? detail.images : <String>[];

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.refresh_rounded, size: 20),
              onPressed: loadDetail,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: const Border(top: BorderSide(color: AppColors.line)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Giá thuê / ngày',
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppColors.muted),
                    ),
                    Text(
                      formatMoney(detail.pricePerDay),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: AppColors.orange,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  onPressed: createRental,
                  icon: const Icon(Icons.event_available_rounded, size: 18),
                  label: const Text('Thuê ngay'),
                ),
              ),
            ],
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          // Immersive image
          SliverAppBar(
            automaticallyImplyLeading: false,
            expandedHeight: 300,
            pinned: false,
            floating: false,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Light background behind image
                  Container(color: Colors.white),
                  if (images.isNotEmpty)
                    PageView.builder(
                      controller: _pageCtrl,
                      itemCount: images.length,
                      onPageChanged: (i) => setState(() => _imageIndex = i),
                      itemBuilder: (context, i) => Image.network(
                        images[i],
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => _ImageFallback(),
                        loadingBuilder: (_, child, prog) {
                          if (prog == null) return child;
                          return const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.orange,
                              strokeWidth: 2,
                            ),
                          );
                        },
                      ),
                    )
                  else
                    _ImageFallback(),
                  // Gradient overlay bottom
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.55),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Image count pill top-right
                  if (images.length > 1)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_imageIndex + 1} / ${images.length}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  // Dots indicator bottom
                  if (images.length > 1)
                    Positioned(
                      bottom: 12,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(images.length, (i) {
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 220),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == _imageIndex ? 20 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == _imageIndex
                                  ? AppColors.orange
                                  : Colors.white.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Thumbnail strip (when multiple images)
          if (images.length > 1)
            SliverToBoxAdapter(
              child: Container(
                color: Colors.white,
                height: 64,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 8),
                  itemCount: images.length,
                  itemBuilder: (_, i) => GestureDetector(
                    onTap: () {
                      setState(() => _imageIndex = i);
                      _pageCtrl.animateToPage(
                        i,
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeInOut,
                      );
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.only(right: 8),
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: i == _imageIndex
                              ? AppColors.orange
                              : AppColors.line,
                          width: i == _imageIndex ? 2 : 1,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(
                          images[i],
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.orangeLight,
                            child: const Icon(Icons.image_outlined,
                                size: 18, color: AppColors.orange),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title + status
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          detail.name,
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(
                        label: detail.status.isEmpty ? 'available' : detail.status,
                        color: AppColors.green,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Category + owner
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      if (detail.category.isNotEmpty)
                        StatusBadge(
                          label: detail.category,
                          color: AppColors.blue,
                        ),
                      if (detail.ownerName.isNotEmpty)
                        StatusBadge(
                          label: '👤 ${detail.ownerName}',
                          color: AppColors.orange,
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 16),

                  // Info section
                  Text(
                    'Thông tin thuê',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 14),
                  _InfoRow(
                    icon: Icons.place_outlined,
                    label: 'Địa chỉ',
                    value: detail.address.isEmpty
                        ? 'Chưa có địa chỉ'
                        : detail.address,
                  ),
                  const SizedBox(height: 12),
                  _InfoRow(
                    icon: Icons.description_outlined,
                    label: 'Mô tả',
                    value: detail.description.isEmpty
                        ? 'Chưa có mô tả'
                        : detail.description,
                  ),
                  const SizedBox(height: 12),
                  const _InfoRow(
                    icon: Icons.verified_user_outlined,
                    label: 'Bảo vệ người thuê',
                    value: 'Yêu cầu eKYC, ký quỹ và xác nhận đơn thuê',
                  ),
                  const SizedBox(height: 20),

                  // Trust banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.orangeLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: AppColors.orange.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.shield_outlined,
                            color: AppColors.orange, size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Giao dịch an toàn',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                        color: AppColors.orange,
                                        fontWeight: FontWeight.w800),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Thanh toán qua VNPay, ký quỹ bảo vệ cả hai bên.',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(color: AppColors.orange),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Rental Dialog (center) ─────────────────────────────────────────────────

class _RentalDialog extends StatefulWidget {
  const _RentalDialog({
    required this.start,
    required this.end,
    required this.note,
  });

  final TextEditingController start;
  final TextEditingController end;
  final TextEditingController note;

  @override
  State<_RentalDialog> createState() => _RentalDialogState();
}

class _RentalDialogState extends State<_RentalDialog> {
  Future<void> _pickDate(TextEditingController ctrl) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: ColorScheme.light(primary: AppColors.orange),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      ctrl.text = dateInput(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.orangeLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.event_available_rounded,
                      color: AppColors.orange, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Tạo yêu cầu thuê',
                        style: Theme.of(context).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w900)),
                    Text('Chủ đồ sẽ xác nhận trong 24h.',
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(color: AppColors.muted)),
                  ]),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context, false),
                  icon: const Icon(Icons.close_rounded, color: AppColors.muted),
                  padding: EdgeInsets.zero,
                ),
              ]),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 16),

              // Date row
              Row(children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickDate(widget.start),
                    child: AbsorbPointer(
                      child: TextField(
                        controller: widget.start,
                        decoration: const InputDecoration(
                          labelText: 'Từ ngày',
                          prefixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                          helperText: 'Nhấn để chọn',
                        ),
                      ),
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.arrow_forward_rounded,
                      size: 18, color: AppColors.muted),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickDate(widget.end),
                    child: AbsorbPointer(
                      child: TextField(
                        controller: widget.end,
                        decoration: const InputDecoration(
                          labelText: 'Đến ngày',
                          prefixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                          helperText: 'Nhấn để chọn',
                        ),
                      ),
                    ),
                  ),
                ),
              ]),
              const SizedBox(height: 14),

              TextField(
                controller: widget.note,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú cho chủ đồ (tuỳ chọn)',
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(bottom: 20),
                    child: Icon(Icons.notes_rounded, size: 18),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Buttons
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Huỷ'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(context, true),
                    icon: const Icon(Icons.send_rounded, size: 16),
                    label: const Text('Gửi yêu cầu'),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Sub-widgets ────────────────────────────────────────────────────────────

class _ImageFallback extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.orangeLight,
      child: const Center(
        child: Icon(Icons.inventory_2_outlined, color: AppColors.orange, size: 56),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.page,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: AppColors.muted),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
