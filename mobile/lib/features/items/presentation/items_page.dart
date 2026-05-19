import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/item_detail_page.dart';
import 'package:rental_p2p_mobile/features/items/presentation/item_tile.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';

const _kCategories = [
  ('Tất cả', Icons.apps_rounded),
  ('Công nghệ', Icons.devices_rounded),
  ('Du lịch', Icons.luggage_rounded),
  ('Thể thao', Icons.sports_soccer_rounded),
  ('Thời trang', Icons.checkroom_rounded),
  ('Âm nhạc', Icons.music_note_rounded),
  ('Khác', Icons.category_rounded),
];

class ItemsPage extends StatefulWidget {
  const ItemsPage({
    super.key,
    required this.repository,
    this.rentalsRepository,
    this.currentUserId = '',
  });

  final ItemsRepository repository;
  final RentalsRepository? rentalsRepository;
  final String currentUserId;

  @override
  State<ItemsPage> createState() => _ItemsPageState();
}

class _ItemsPageState extends State<ItemsPage> {
  final search = TextEditingController();
  List<ItemSummary> items = [];
  bool loading = true;
  int _selectedCategory = 0;

  @override
  void initState() {
    super.initState();
    loadItems();
  }

  Future<void> loadItems() async {
    setState(() => loading = true);
    try {
      final result = await widget.repository.searchItems(search.text);
      setState(() => items = result);
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List<ItemSummary> get _filteredItems {
    if (_selectedCategory == 0) return items;
    final cat = _kCategories[_selectedCategory].$1.toLowerCase();
    return items.where((i) => i.category.toLowerCase().contains(cat)).toList();
  }

  int _columnsFor(double width) {
    if (width >= 1100) return 5;
    if (width >= 760) return 4;
    if (width >= 520) return 3;
    return 2;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredItems;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: loadItems,
        color: AppColors.orange,
        child: CustomScrollView(
          slivers: [
            // Immersive header (no SafeArea — extends into status bar)
            SliverToBoxAdapter(
              child: _MarketplaceHeader(
                search: search,
                onSearch: loadItems,
              ),
            ),

            // Category chips
            SliverToBoxAdapter(
              child: _CategoryRow(
                selected: _selectedCategory,
                onSelect: (i) => setState(() => _selectedCategory = i),
              ),
            ),

            // Section title
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _selectedCategory == 0
                            ? 'Gợi ý hôm nay'
                            : _kCategories[_selectedCategory].$1,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                    ),
                    if (!loading)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.orangeLight,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${filtered.length} món',
                          style: const TextStyle(
                            color: AppColors.orange,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Grid
            if (loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.orange),
                ),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  message: 'Chưa có đồ phù hợp',
                  icon: Icons.search_off_rounded,
                  subtitle: 'Thử tìm kiếm với từ khóa khác',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
                sliver: SliverLayoutBuilder(
                  builder: (context, constraints) {
                    final columns = _columnsFor(constraints.crossAxisExtent);
                    return SliverGrid(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final item = filtered[index];
                          return ItemTile(
                            item: item,
                            onTap: () async {
                              await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ItemDetailPage(
                                    repository: widget.repository,
                                    itemId: item.id,
                                    rentalsRepository: widget.rentalsRepository,
                                    currentUserId: widget.currentUserId,
                                  ),
                                ),
                              );
                              loadItems();
                            },
                          );
                        },
                        childCount: filtered.length,
                      ),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 0.65,
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Header ────────────────────────────────────────────────────────────────

class _MarketplaceHeader extends StatelessWidget {
  const _MarketplaceHeader({
    required this.search,
    required this.onSearch,
  });

  final TextEditingController search;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xffee4d2d), Color(0xffff7143)],
        ),
      ),
      padding: EdgeInsets.fromLTRB(16, top + 12, 16, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.storefront_rounded,
                    color: AppColors.orange, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Rental P2P',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                          ),
                    ),
                    Text(
                      'Thuê đồ cá nhân nhanh & an toàn',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: IconButton(
                  icon: const Icon(Icons.notifications_outlined,
                      color: Colors.white, size: 20),
                  onPressed: onSearch,
                  padding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Search bar
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                const SizedBox(width: 12),
                const Icon(Icons.search_rounded, color: AppColors.muted, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: search,
                    decoration: const InputDecoration(
                      hintText: 'Tìm máy ảnh, lều, laptop...',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 0, vertical: 12),
                    ),
                    style: const TextStyle(fontSize: 14),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.all(5),
                  child: FilledButton(
                    onPressed: onSearch,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.orange,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      minimumSize: const Size(0, 34),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(7),
                      ),
                    ),
                    child: const Text('Tìm', style: TextStyle(fontSize: 13)),
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

// ─── Category Row ───────────────────────────────────────────────────────────

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.selected, required this.onSelect});

  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      height: 76,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        itemCount: _kCategories.length,
        itemBuilder: (context, index) {
          final (label, icon) = _kCategories[index];
          final isSelected = selected == index;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onSelect(index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.orange : AppColors.page,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? AppColors.orange : AppColors.line,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 15,
                      color: isSelected ? Colors.white : AppColors.muted,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isSelected ? Colors.white : AppColors.ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
