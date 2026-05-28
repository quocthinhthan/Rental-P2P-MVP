import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/rental_detail_page.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/account/presentation/public_profile_page.dart';

bool _isDisplayableImageUrl(String value) {
  final normalized = value.trim();
  final uri = Uri.tryParse(normalized);
  if (uri == null) return false;
  if (uri.scheme == 'data') return normalized.startsWith('data:image');
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

class ItemDetailPage extends StatefulWidget {
  const ItemDetailPage({
    super.key,
    required this.repository,
    required this.itemId,
    this.rentalsRepository,
    this.accountRepository,
    this.currentUserId = '',
  });

  final ItemsRepository repository;
  final String itemId;
  final RentalsRepository? rentalsRepository;
  final AccountRepository? accountRepository;
  final String currentUserId;

  @override
  State<ItemDetailPage> createState() => _ItemDetailPageState();
}

class _ItemDetailPageState extends State<ItemDetailPage> {
  ItemDetail? item;
  bool loading = true;
  bool _isFavorited = false;
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
      setState(() {
        item = result;
        _isFavorited = result.isFavorited;
      });
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _toggleFavorite() async {
    final repo = widget.accountRepository;
    if (repo == null) {
      showError(context, 'Bạn cần đăng nhập để thêm vào yêu thích.');
      return;
    }
    setState(() => _isFavorited = !_isFavorited);
    try {
      if (_isFavorited) {
        await repo.addFavorite(widget.itemId);
      } else {
        await repo.removeFavorite(widget.itemId);
      }
    } catch (error) {
      setState(() => _isFavorited = !_isFavorited);
      if (mounted) showError(context, error);
    }
  }

  Future<void> _showReportDialog(String itemId) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: _ItemReportDialog(
          itemId: itemId,
          repository: widget.repository,
        ),
      ),
    );
    if (result == true) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Đã gửi báo cáo vi phạm! Ban quản trị sẽ xem xét.'),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'available':
        return AppColors.green;
      case 'rented':
        return AppColors.orange;
      case 'delisted':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  String _statusText(String status) {
    switch (status.toLowerCase()) {
      case 'available':
        return 'Còn trống';
      case 'rented':
        return 'Đang thuê';
      case 'delisted':
        return 'Ngừng cho thuê';
      default:
        return status;
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
        child: _RentalDialog(start: start, end: end, note: note, item: item!),
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

    final List<_BusyRange> busyRanges = [];
    if (detail != null) {
      for (final b in detail.bookedDates) {
        try {
          final start = DateTime.parse(b.startDate);
          final end = DateTime.parse(b.endDate);
          busyRanges.add(_BusyRange(start: start, end: end, type: 'booked'));
        } catch (_) {}
      }
      for (final b in detail.blockedDates) {
        try {
          final start = DateTime.parse(b.startDate);
          final end = DateTime.parse(b.endDate);
          busyRanges.add(_BusyRange(
            start: start,
            end: end,
            type: 'blocked',
            reason: b.reason,
          ));
        } catch (_) {}
      }
      busyRanges.sort((a, b) => a.start.compareTo(b.start));
    }

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

    final images = detail.images
        .map((image) => image.trim())
        .where(_isDisplayableImageUrl)
        .toList();
    if (_imageIndex >= images.length && images.isNotEmpty) {
      _imageIndex = images.length - 1;
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        leading: Container(
          margin: const EdgeInsets.only(left: 12),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        actions: [
          if (widget.accountRepository != null)
            Container(
              margin: const EdgeInsets.only(right: 6),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  _isFavorited
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  size: 20,
                  color: _isFavorited ? Colors.red[400] : Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
            ),
          Container(
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.4),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.share_outlined, size: 20),
              onPressed: loadDetail,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Favorite toggle button
              if (widget.accountRepository != null) ...[
                GestureDetector(
                  onTap: _toggleFavorite,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: _isFavorited
                          ? AppColors.orange.withValues(alpha: 0.1)
                          : AppColors.page,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _isFavorited ? AppColors.orange : AppColors.line,
                        width: 1.5,
                      ),
                    ),
                    child: Icon(
                      _isFavorited
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      color: _isFavorited ? AppColors.orange : AppColors.muted,
                      size: 22,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              // Price
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Giá thuê / ngày',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Text(
                      formatMoney(detail.pricePerDay),
                      style: const TextStyle(
                        fontSize: 22,
                        color: AppColors.orange,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Rent button
              SizedBox(
                height: 50,
                child: FilledButton.icon(
                  onPressed: createRental,
                  icon: const Icon(Icons.event_available_rounded, size: 18),
                  label: const Text(
                    'Thuê ngay',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          // ─── Full-cover hero image ────────────────────────────────────
          SliverAppBar(
            automaticallyImplyLeading: false,
            expandedHeight: 340,
            pinned: false,
            floating: false,
            backgroundColor: const Color(0xFF1A1A1A),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Full-cover image
                  if (images.isNotEmpty)
                    PageView.builder(
                      controller: _pageCtrl,
                      itemCount: images.length,
                      onPageChanged: (i) => setState(() => _imageIndex = i),
                      itemBuilder: (context, i) => _DetailNetworkImage(
                        imageUrl: images[i],
                        fit: BoxFit.cover,
                      ),
                    )
                  else
                    _ImageFallback(),
                  // Full gradient overlay
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          stops: const [0.3, 1.0],
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.75),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Image count top-right
                  if (images.length > 1)
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 52,
                      right: 14,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.photo_camera_outlined,
                                color: Colors.white, size: 13),
                            const SizedBox(width: 4),
                            Text(
                              '${_imageIndex + 1}/${images.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  // Product name + category overlaid on image bottom
                  Positioned(
                    bottom: 40,
                    left: 16,
                    right: 16,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (detail.category.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: AppColors.orange,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              detail.category,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        Text(
                          detail.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            height: 1.25,
                            shadows: [
                              Shadow(
                                color: Colors.black54,
                                blurRadius: 10,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Dot indicators bottom
                  if (images.length > 1)
                    Positioned(
                      bottom: 16,
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
                                  : Colors.white.withValues(alpha: 0.5),
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                        child: _DetailNetworkImage(
                          imageUrl: images[i],
                          fit: BoxFit.cover,
                          fallbackIconSize: 18,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // ─── Content card ─────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Status + rating + report row ──────────────────────
                  Row(
                    children: [
                      StatusBadge(
                        label: _statusText(detail.status.isEmpty
                            ? 'available'
                            : detail.status),
                        color: _statusColor(detail.status.isEmpty
                            ? 'available'
                            : detail.status),
                      ),
                      if (detail.averageRating > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 13, color: Colors.amber),
                              const SizedBox(width: 3),
                              Text(
                                '${detail.averageRating.toStringAsFixed(1)} (${detail.totalReviews})',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF8D6000),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const Spacer(),
                      if (widget.currentUserId != detail.owner.id &&
                          widget.currentUserId.isNotEmpty)
                        GestureDetector(
                          onTap: () => _showReportDialog(detail.id),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.red.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.flag_outlined,
                                    size: 13, color: AppColors.red),
                                SizedBox(width: 4),
                                Text(
                                  'Báo cáo',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.red,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // ── Address row ───────────────────────────────────────
                  if (detail.address.isNotEmpty)
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 14, color: AppColors.muted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            detail.address,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.muted,
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 20),

                  // ── Owner card ────────────────────────────────────────
                  if (detail.ownerName.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        final accountRepo = widget.accountRepository;
                        if (accountRepo != null) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PublicProfilePage(
                                userId: detail.owner.id,
                                userName: detail.ownerName,
                                repository: accountRepo,
                              ),
                            ),
                          );
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.page,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: AppColors.orangeLight,
                              backgroundImage: detail.owner.avatarUrl.isNotEmpty
                                  ? NetworkImage(detail.owner.avatarUrl)
                                  : null,
                              child: detail.owner.avatarUrl.isEmpty
                                  ? Text(
                                      detail.ownerName.isNotEmpty
                                          ? detail.ownerName[0].toUpperCase()
                                          : '?',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                        color: AppColors.orange,
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    detail.ownerName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Chủ sở hữu • Xem hồ sơ',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.muted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios_rounded,
                                size: 14, color: AppColors.muted),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 20),

                  // ── Description ───────────────────────────────────────
                  if (detail.description.isNotEmpty) ...[
                    Text(
                      'Mô tả sản phẩm',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.page,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        stripHtml(detail.description),
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.ink,
                          height: 1.6,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // ── Lịch bận ─────────────────────────────────────────
                  if (busyRanges.isNotEmpty) ...[
                    Text(
                      'Lịch bận sắp tới',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 10),
                    ...() {
                      final bool isOwner =
                          widget.currentUserId == detail.owner.id;
                      final int displayCount = isOwner
                          ? busyRanges.length
                          : (busyRanges.length > 3 ? 3 : busyRanges.length);
                      final list = <Widget>[];
                      for (int i = 0; i < displayCount; i++) {
                        final br = busyRanges[i];
                        final startStr = shortDate(br.start.toIso8601String());
                        final endStr = shortDate(br.end.toIso8601String());
                        final label = br.type == 'booked'
                            ? 'Đã được đặt thuê'
                            : (br.reason.isNotEmpty
                                ? 'Chủ đồ bận: ${br.reason}'
                                : 'Chủ đồ bận');
                        final color = br.type == 'booked'
                            ? AppColors.orange
                            : AppColors.muted;
                        list.add(
                          Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: br.type == 'booked'
                                  ? AppColors.orangeLight
                                  : AppColors.page,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: br.type == 'booked'
                                    ? AppColors.orange.withValues(alpha: 0.3)
                                    : AppColors.line,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  br.type == 'booked'
                                      ? Icons.bookmark_added_rounded
                                      : Icons.block_rounded,
                                  size: 16,
                                  color: color,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$startStr → $endStr',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 13),
                                      ),
                                      Text(
                                        label,
                                        style: TextStyle(
                                            color: color, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }
                      if (!isOwner && busyRanges.length > 3) {
                        list.add(
                          Padding(
                            padding: const EdgeInsets.only(
                                left: 4, top: 2, bottom: 8),
                            child: Text(
                              '+ và ${busyRanges.length - 3} lịch bận khác...',
                              style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic),
                            ),
                          ),
                        );
                      }
                      return list;
                    }(),
                    const SizedBox(height: 20),
                  ],

                  // ── Trust banner ──────────────────────────────────────
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.orange.withValues(alpha: 0.08),
                          AppColors.orange.withValues(alpha: 0.02),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: AppColors.orange.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.orangeLight,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.verified_user_rounded,
                              color: AppColors.orange, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Giao dịch an toàn 100%',
                                style: TextStyle(
                                  color: AppColors.orange,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Thanh toán qua VNPay, ký quỹ bảo vệ cả hai bên.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color:
                                      AppColors.orange.withValues(alpha: 0.8),
                                  fontWeight: FontWeight.w500,
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
    required this.item,
  });

  final TextEditingController start;
  final TextEditingController end;
  final TextEditingController note;
  final ItemDetail item;

  @override
  State<_RentalDialog> createState() => _RentalDialogState();
}

class _RentalDialogState extends State<_RentalDialog> {
  Future<void> _pickDate(TextEditingController ctrl) async {
    final now = DateTime.now();
    // Find the first unblocked/available date starting from now
    DateTime initialDate = now;
    while (widget.item.isDateBlocked(initialDate)) {
      initialDate = initialDate.add(const Duration(days: 1));
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
      selectableDayPredicate: (date) => !widget.item.isDateBlocked(date),
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

  Widget _buildDatePicker(
      String label, TextEditingController ctrl, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.page,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.calendar_month_rounded,
                    size: 16, color: AppColors.orange),
                const SizedBox(width: 6),
                Text(label,
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: ctrl,
              builder: (context, value, child) {
                final text = value.text.isEmpty ? 'Chọn ngày' : value.text;
                return Text(
                  text,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight:
                        value.text.isEmpty ? FontWeight.w500 : FontWeight.w800,
                    color: value.text.isEmpty ? AppColors.muted : AppColors.ink,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Yêu cầu thuê',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.ink,
                                ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Chủ đồ sẽ xác nhận yêu cầu của bạn',
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context, false),
                      icon: const Icon(Icons.close_rounded,
                          color: AppColors.muted, size: 22),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.page,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Product Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.line),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: _DetailNetworkImage(
                          imageUrl: widget.item.images
                                  .where(_isDisplayableImageUrl)
                                  .isNotEmpty
                              ? widget.item.images
                                  .firstWhere(_isDisplayableImageUrl)
                              : '',
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          fallbackIconSize: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.item.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 15),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.orange.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                formatMoney(widget.item.pricePerDay),
                                style: const TextStyle(
                                    color: AppColors.orange,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Date Picker row
                Row(
                  children: [
                    Expanded(
                      child: _buildDatePicker('Ngày nhận', widget.start,
                          () => _pickDate(widget.start)),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Icon(Icons.arrow_forward_rounded,
                          color: AppColors.line, size: 20),
                    ),
                    Expanded(
                      child: _buildDatePicker(
                          'Ngày trả', widget.end, () => _pickDate(widget.end)),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Note Field
                const Text(
                  'Ghi chú cho chủ đồ (Tuỳ chọn)',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: widget.note,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Ví dụ: Mình qua lấy lúc 9h sáng nhé...',
                    hintStyle: TextStyle(
                        color: AppColors.muted.withValues(alpha: 0.7)),
                    filled: true,
                    fillColor: AppColors.page,
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
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
                const SizedBox(height: 32),

                // Submit Button
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Gửi yêu cầu thuê',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
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

// ─── Sub-widgets ────────────────────────────────────────────────────────────

class _DetailNetworkImage extends StatelessWidget {
  const _DetailNetworkImage({
    required this.imageUrl,
    required this.fit,
    this.width,
    this.height,
    this.fallbackIconSize = 56,
  });

  final String imageUrl;
  final BoxFit fit;
  final double? width;
  final double? height;
  final double fallbackIconSize;

  @override
  Widget build(BuildContext context) {
    if (!_isDisplayableImageUrl(imageUrl)) {
      return SizedBox(
        width: width,
        height: height,
        child: _ImageFallback(iconSize: fallbackIconSize),
      );
    }

    return Image.network(
      imageUrl,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, __, ___) => SizedBox(
        width: width,
        height: height,
        child: _ImageFallback(iconSize: fallbackIconSize),
      ),
      loadingBuilder: (_, child, progress) {
        if (progress == null) return child;
        return Container(
          width: width,
          height: height,
          color: const Color(0xFF1A1A1A),
          child: const Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                color: AppColors.orange,
                strokeWidth: 2,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback({this.iconSize = 56});

  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.orangeLight,
      child: Center(
        child: Icon(
          Icons.inventory_2_outlined,
          color: AppColors.orange,
          size: iconSize,
        ),
      ),
    );
  }
}

// Helper class for busy ranges
class _BusyRange {
  _BusyRange({
    required this.start,
    required this.end,
    required this.type,
    this.reason = '',
  });

  final DateTime start;
  final DateTime end;
  final String type;
  final String reason;
}

// Item violation report dialog
class _ItemReportDialog extends StatefulWidget {
  const _ItemReportDialog({
    required this.itemId,
    required this.repository,
  });

  final String itemId;
  final ItemsRepository repository;

  @override
  State<_ItemReportDialog> createState() => _ItemReportDialogState();
}

class _ItemReportDialogState extends State<_ItemReportDialog> {
  final _descCtrl = TextEditingController();
  final _picker = ImagePicker();
  final List<Uint8List> _images = [];
  bool _submitting = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    if (_images.length >= 3) {
      showError(context, 'Chỉ được tải lên tối đa 3 hình ảnh minh chứng.');
      return;
    }
    try {
      final picked = await _picker.pickMultiImage(imageQuality: 80);
      if (picked.isEmpty) return;

      final List<Uint8List> nextImages = [];
      for (final file in picked) {
        if (_images.length + nextImages.length >= 3) {
          if (mounted) {
            showError(
                context, 'Chỉ được tải lên tối đa 3 hình ảnh minh chứng.');
          }
          break;
        }
        final bytes = await file.readAsBytes();
        nextImages.add(bytes);
      }
      if (mounted) {
        setState(() {
          _images.addAll(nextImages);
        });
      }
    } catch (e) {
      if (mounted) showError(context, 'Không thể chọn ảnh: $e');
    }
  }

  Future<void> _submit() async {
    final desc = _descCtrl.text.trim();
    if (desc.length < 10) {
      showError(context, 'Mô tả chi tiết vi phạm phải từ 10 ký tự trở lên.');
      return;
    }

    setState(() => _submitting = true);
    try {
      // 1. Upload evidence images if any
      final List<String> imageUrls = [];
      for (int i = 0; i < _images.length; i++) {
        final url = await widget.repository.uploadItemImage(
          _images[i],
          'evidence_${widget.itemId}_$i.jpg',
        );
        imageUrls.add(url);
      }

      // 2. Submit report
      await widget.repository.reportItem(
        itemId: widget.itemId,
        description: desc,
        evidenceImages: imageUrls,
      );

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        showError(context, e);
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.report_problem_outlined,
                        color: AppColors.red, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Báo cáo vi phạm',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        Text(
                          'Vui lòng cung cấp chi tiết vi phạm',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context, false),
                    icon:
                        const Icon(Icons.close_rounded, color: AppColors.muted),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              TextField(
                controller: _descCtrl,
                maxLines: 4,
                minLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Chi tiết vi phạm',
                  hintText: 'Nhập ít nhất 10 ký tự về hành vi vi phạm...',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Hình ảnh minh chứng (${_images.length}/3)',
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  ...List.generate(_images.length, (index) {
                    return Stack(
                      children: [
                        Container(
                          margin: const EdgeInsets.only(right: 8),
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.line),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(7),
                            child: Image.memory(
                              _images[index],
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        Positioned(
                          top: -2,
                          right: 6,
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _images.removeAt(index);
                              });
                            },
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(2),
                              child: const Icon(Icons.close,
                                  color: Colors.white, size: 12),
                            ),
                          ),
                        ),
                      ],
                    );
                  }),
                  if (_images.length < 3)
                    GestureDetector(
                      onTap: _pickImages,
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          border: Border.all(
                              color: AppColors.muted.withValues(alpha: 0.3),
                              style: BorderStyle.solid),
                          borderRadius: BorderRadius.circular(8),
                          color: AppColors.page,
                        ),
                        child: const Icon(Icons.add_a_photo_outlined,
                            color: AppColors.muted, size: 24),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _submitting
                          ? null
                          : () => Navigator.pop(context, false),
                      child: const Text('Huỷ'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text('Gửi báo cáo'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
