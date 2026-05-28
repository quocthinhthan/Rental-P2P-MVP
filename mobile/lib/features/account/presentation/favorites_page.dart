import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/item_detail_page.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';

class FavoritesPage extends StatefulWidget {
  const FavoritesPage({
    super.key,
    required this.accountRepository,
    required this.itemsRepository,
    required this.rentalsRepository,
    required this.currentUserId,
  });

  final AccountRepository accountRepository;
  final ItemsRepository itemsRepository;
  final RentalsRepository rentalsRepository;
  final String currentUserId;

  @override
  State<FavoritesPage> createState() => _FavoritesPageState();
}

class _FavoritesPageState extends State<FavoritesPage> {
  List<ItemSummary> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final raw = await widget.accountRepository.getFavorites();
      if (!mounted) return;
      final items = raw
          .map((e) =>
              ItemSummary.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _removeFavorite(String itemId) async {
    try {
      await widget.accountRepository.removeFavorite(itemId);
      if (!mounted) return;
      setState(() => _items.removeWhere((i) => i.id == itemId));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã xóa khỏi yêu thích')),
      );
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 120,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xffee4d2d), Color(0xffff7143)],
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Yêu thích',
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          Text(
                            '${_items.length} món đồ đã lưu',
                            style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              IconButton(
                icon:
                    const Icon(Icons.refresh_rounded, color: Colors.white, size: 22),
                onPressed: _load,
              ),
            ],
          ),
          if (_loading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            SliverFillRemaining(
              child: EmptyState(
                message: 'Không tải được danh sách',
                icon: Icons.error_outline_rounded,
                action: ElevatedButton(
                    onPressed: _load, child: const Text('Thử lại')),
              ),
            )
          else if (_items.isEmpty)
            const SliverFillRemaining(
              child: EmptyState(
                message: 'Chưa có đồ yêu thích',
                subtitle: 'Nhấn ♡ trên bất kỳ sản phẩm nào để lưu vào đây',
                icon: Icons.favorite_border_rounded,
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final item = _items[i];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _FavoriteItemCard(
                        item: item,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ItemDetailPage(
                                itemId: item.id,
                                repository: widget.itemsRepository,
                                rentalsRepository: widget.rentalsRepository,
                                currentUserId: widget.currentUserId,
                                accountRepository: widget.accountRepository,
                              ),
                            ),
                          );
                          _load();
                        },
                        onRemove: () => _removeFavorite(item.id),
                      ),
                    );
                  },
                  childCount: _items.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FavoriteItemCard extends StatelessWidget {
  const _FavoriteItemCard({
    required this.item,
    required this.onTap,
    required this.onRemove,
  });

  final ItemSummary item;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(13),
                bottomLeft: Radius.circular(13),
              ),
              child: item.mainImage.isNotEmpty
                  ? Image.network(
                      item.mainImage,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 100,
                        height: 100,
                        color: AppColors.orangeLight,
                        child: const Icon(Icons.image_not_supported_outlined,
                            color: AppColors.orange),
                      ),
                    )
                  : Container(
                      width: 100,
                      height: 100,
                      color: AppColors.orangeLight,
                      child: const Icon(Icons.inventory_2_outlined,
                          color: AppColors.orange),
                    ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.address,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      formatMoney(item.pricePerDay, perDay: true),
                      style: TextStyle(
                        color: AppColors.orange,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Remove button
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton(
                icon: const Icon(Icons.favorite_rounded,
                    color: AppColors.orange, size: 22),
                onPressed: onRemove,
                tooltip: 'Bỏ yêu thích',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
