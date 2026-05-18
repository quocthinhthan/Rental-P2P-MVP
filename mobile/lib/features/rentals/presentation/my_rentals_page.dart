import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/my_item_detail_page.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/rental_detail_page.dart';

class MyRentalsPage extends StatefulWidget {
  const MyRentalsPage({
    super.key,
    required this.repository,
    required this.itemsRepository,
    this.currentUserId = '',
  });

  final RentalsRepository repository;
  final ItemsRepository itemsRepository;
  final String currentUserId;

  @override
  State<MyRentalsPage> createState() => _MyRentalsPageState();
}

class _MyRentalsPageState extends State<MyRentalsPage>
    with SingleTickerProviderStateMixin {
  MyRentalsView? data;
  bool loading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    loadRentals();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> loadRentals() async {
    setState(() => loading = true);
    try {
      final result = await widget.repository.getMyRentals();
      setState(() => data = result);
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> rentalAction(String id, String action) async {
    try {
      if (action == 'confirm') {
        await widget.repository.confirmRental(id);
      } else if (action == 'reject') {
        await widget.repository.rejectRental(id);
      }
      await loadRentals();
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            pinned: true,
            floating: true,
            backgroundColor: Colors.white,
            foregroundColor: AppColors.ink,
            elevation: 0,
            scrolledUnderElevation: 1,
            title: const Text('Đơn thuê của tôi'),
            actions: [
              IconButton(
                onPressed: loadRentals,
                icon: const Icon(Icons.refresh_rounded),
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              labelColor: AppColors.orange,
              unselectedLabelColor: AppColors.muted,
              indicatorColor: AppColors.orange,
              indicatorWeight: 2.5,
              indicatorSize: TabBarIndicatorSize.label,
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shopping_bag_outlined, size: 16),
                      const SizedBox(width: 4),
                      const Text('Đi thuê'),
                      if ((data?.asRenter.length ?? 0) > 0) ...[
                        const SizedBox(width: 5),
                        _CountBadge(data?.asRenter.length ?? 0),
                      ],
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.storefront_outlined, size: 16),
                      const SizedBox(width: 4),
                      const Text('Cho thuê'),
                      if ((data?.asOwner.length ?? 0) > 0) ...[
                        const SizedBox(width: 5),
                        _CountBadge(data?.asOwner.length ?? 0),
                      ],
                    ],
                  ),
                ),
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.inventory_2_outlined, size: 16),
                      const SizedBox(width: 4),
                      const Text('Đồ của tôi'),
                      if ((data?.myItems.length ?? 0) > 0) ...[
                        const SizedBox(width: 5),
                        _CountBadge(data?.myItems.length ?? 0),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        body: loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.orange))
            : TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: Renter
                  _RentalListView(
                    rentals: data?.asRenter ?? [],
                    emptyMessage: 'Bạn chưa thuê đồ nào',
                    emptySubtitle: 'Khám phá marketplace để tìm đồ thuê',
                    onRefresh: loadRentals,
                    repository: widget.repository,
                    currentUserId: widget.currentUserId,
                  ),
                  // Tab 2: Owner
                  _RentalListView(
                    rentals: data?.asOwner ?? [],
                    emptyMessage: 'Chưa có đơn thuê nào',
                    emptySubtitle: 'Khi có người thuê đồ của bạn, đơn sẽ hiện tại đây',
                    ownerView: true,
                    onRentalAction: rentalAction,
                    onRefresh: loadRentals,
                    repository: widget.repository,
                    currentUserId: widget.currentUserId,
                  ),
                  // Tab 3: My items
                  _MyItemsView(
                    items: data?.myItems ?? [],
                    onRefresh: loadRentals,
                    itemsRepository: widget.itemsRepository,
                  ),
                ],
              ),
      ),
    );
  }
}

// ─── Stats Header ───────────────────────────────────────────────────────────

class _CountBadge extends StatelessWidget {
  const _CountBadge(this.count);
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: AppColors.orange,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

// ─── Rental List View ───────────────────────────────────────────────────────

class _RentalListView extends StatelessWidget {
  const _RentalListView({
    required this.rentals,
    required this.emptyMessage,
    required this.emptySubtitle,
    this.ownerView = false,
    this.onRentalAction,
    required this.onRefresh,
    required this.repository,
    required this.currentUserId,
  });

  final List<RentalCardData> rentals;
  final String emptyMessage;
  final String emptySubtitle;
  final bool ownerView;
  final Future<void> Function(String id, String action)? onRentalAction;
  final Future<void> Function() onRefresh;
  final RentalsRepository repository;
  final String currentUserId;

  @override
  Widget build(BuildContext context) {
    if (rentals.isEmpty) {
      return EmptyState(
        message: emptyMessage,
        icon: Icons.receipt_long_outlined,
        subtitle: emptySubtitle,
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.orange,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: rentals.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final rental = rentals[index];
          return _RentalCard(
            rental: rental,
            ownerView: ownerView,
            onAction: onRentalAction,
            onTap: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => RentalDetailPage(
                rentalId: rental.id,
                repository: repository,
                currentUserId: currentUserId,
              ),
            )),
          );
        },
      ),
    );
  }
}

class _RentalCard extends StatelessWidget {
  const _RentalCard({
    required this.rental,
    required this.ownerView,
    this.onAction,
    this.onTap,
  });

  final RentalCardData rental;
  final bool ownerView;
  final Future<void> Function(String id, String action)? onAction;
  final VoidCallback? onTap;

  Color get _statusColor {
    return switch (rental.status.toLowerCase()) {
      'completed' => AppColors.green,
      'active' => AppColors.blue,
      'pending_confirmation' => AppColors.orange,
      'cancelled' || 'rejected' => AppColors.red,
      _ => AppColors.muted,
    };
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Material(
        color: Colors.white,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.line),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.orangeLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.inventory_2_outlined,
                            color: AppColors.orange, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              rental.itemName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today_outlined,
                                    size: 12, color: AppColors.muted),
                                const SizedBox(width: 4),
                                Text(
                                  '${shortDate(rental.startDate)} → ${shortDate(rental.endDate)}',
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            if (rental.counterpartyName.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Row(children: [
                                const Icon(Icons.person_outline_rounded,
                                    size: 11, color: AppColors.muted),
                                const SizedBox(width: 3),
                                Text(rental.counterpartyName,
                                    style: const TextStyle(
                                        fontSize: 11, color: AppColors.muted)),
                              ]),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(label: rental.status, color: _statusColor),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.page,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.payments_outlined,
                            size: 16, color: AppColors.muted),
                        const SizedBox(width: 8),
                        const Text('Tổng tiền: ',
                            style: TextStyle(
                                fontSize: 13, color: AppColors.muted)),
                        Text(
                          formatMoney(rental.totalAmount, perDay: false),
                          style: const TextStyle(
                            color: AppColors.orange,
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.chevron_right_rounded,
                            size: 16, color: AppColors.muted),
                      ],
                    ),
                  ),
                  if (ownerView &&
                      rental.status == 'pending_confirmation') ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () =>
                                onAction?.call(rental.id, 'reject'),
                            icon: const Icon(Icons.close_rounded,
                                size: 16),
                            label: const Text('Từ chối'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.red,
                              side: const BorderSide(color: AppColors.red),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () =>
                                onAction?.call(rental.id, 'confirm'),
                            icon: const Icon(Icons.check_rounded, size: 16),
                            label: const Text('Xác nhận'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}


// ─── My Items View ───────────────────────────────────────────────────────────

class _MyItemsView extends StatelessWidget {
  const _MyItemsView({
    required this.items,
    required this.onRefresh,
    required this.itemsRepository,
  });

  final List<MyItemData> items;
  final Future<void> Function() onRefresh;
  final ItemsRepository itemsRepository;

  Color _statusColor(String s) => switch (s.toLowerCase()) {
        'available' => AppColors.green,
        'rented'    => AppColors.blue,
        'delisted'  => AppColors.muted,
        _           => AppColors.orange,
      };

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const EmptyState(
        message: 'Chưa đăng đồ nào',
        icon: Icons.add_box_outlined,
        subtitle: 'Chuyển sang tab "Đăng đồ" để bắt đầu kiếm tiền',
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.orange,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = items[index];
          final statusColor = _statusColor(item.status);
          return ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Material(
              color: Colors.white,
              child: InkWell(
                onTap: () async {
                  final deleted = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => MyItemDetailPage(
                        itemId: item.id,
                        itemName: item.name,
                        repository: itemsRepository,
                      ),
                    ),
                  );
                  if (deleted == true) {
                    // Item was deleted — refresh list
                    await onRefresh();
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.line),
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      // Icon / Thumbnail
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.orangeLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.inventory_2_outlined,
                            color: AppColors.orange, size: 26),
                      ),
                      const SizedBox(width: 12),
                      // Name + price
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 14),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 5),
                            Text(
                              formatMoney(item.pricePerDay),
                              style: const TextStyle(
                                color: AppColors.orange,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status + chevron
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          StatusBadge(
                            label: item.status.isEmpty ? 'available' : item.status,
                            color: statusColor,
                          ),
                          const SizedBox(height: 6),
                          const Icon(Icons.chevron_right_rounded,
                              size: 18, color: AppColors.muted),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
