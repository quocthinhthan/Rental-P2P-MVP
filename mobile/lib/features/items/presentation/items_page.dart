import 'dart:async';
import 'dart:ui' show PointerDeviceKind;

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
      backgroundColor: AppColors.page,
      body: RefreshIndicator(
        onRefresh: loadItems,
        color: AppColors.orange,
        child: CustomScrollView(
          slivers: [
            // Sticky Header with Search
            SliverAppBar(
              pinned: true,
              floating: true,
              elevation: 4,
              shadowColor: Colors.black.withValues(alpha: 0.2),
              flexibleSpace: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xffee4d2d), Color(0xffff7143)],
                  ),
                ),
              ),
              titleSpacing: 16,
              title: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.storefront_rounded,
                        color: AppColors.orange, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Rental P2P',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                          ),
                    ),
                  ),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.notifications_outlined,
                          color: Colors.white, size: 18),
                      onPressed: loadItems,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(64),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: 12),
                        const Icon(Icons.search_rounded,
                            color: AppColors.muted, size: 20),
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
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 0, vertical: 12),
                            ),
                            style: const TextStyle(fontSize: 14),
                            onSubmitted: (_) => loadItems(),
                          ),
                        ),
                        Container(
                          margin: const EdgeInsets.all(5),
                          child: FilledButton(
                            onPressed: loadItems,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.orange,
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 14),
                              minimumSize: const Size(0, 34),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(7),
                              ),
                            ),
                            child: const Text('Tìm',
                                style: TextStyle(fontSize: 13)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Banner Carousel
            const SliverToBoxAdapter(
              child: _BannerCarousel(),
            ),

            // Grid Categories
            SliverToBoxAdapter(
              child: _CategoryGrid(
                selected: _selectedCategory,
                onSelect: (i) => setState(() => _selectedCategory = i),
              ),
            ),

            // Section title
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _selectedCategory == 0
                            ? '🔥 Gợi ý hôm nay'
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
                          return _AnimatedGridTile(
                            index: index,
                            child: ItemTile(
                              item: item,
                              onTap: () async {
                                await Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ItemDetailPage(
                                      repository: widget.repository,
                                      itemId: item.id,
                                      rentalsRepository:
                                          widget.rentalsRepository,
                                      currentUserId: widget.currentUserId,
                                    ),
                                  ),
                                );
                                loadItems();
                              },
                            ),
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

// ─── Banner Carousel ─────────────────────────────────────────────────────────

class _BannerCarousel extends StatefulWidget {
  const _BannerCarousel();

  @override
  State<_BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<_BannerCarousel> {
  final _pageCtrl = PageController();
  Timer? _autoTimer;
  int _current = 0;

  final _banners = const [
    (
      'Giảm 50% lần đầu',
      'Nhập mã NEW50 cho đơn đầu tiên',
      [Color(0xff4facfe), Color(0xff00f2fe)],
      Icons.local_offer_rounded
    ),
    (
      'Thuê đồ công nghệ',
      'Macbook, Camera giá sinh viên',
      [Color(0xfff6d365), Color(0xfffda085)],
      Icons.laptop_mac_rounded
    ),
    (
      'Vi vu cuối tuần',
      'Lều trại, flycam sẵn sàng',
      [Color(0xffa18cd1), Color(0xfffbc2eb)],
      Icons.flight_takeoff_rounded
    ),
  ];

  @override
  void initState() {
    super.initState();
    _autoTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || !_pageCtrl.hasClients) return;
      final next = (_current + 1) % _banners.length;
      _pageCtrl.animateToPage(
        next,
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _autoTimer?.cancel();
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SizedBox(
            height: 130,
            child: ScrollConfiguration(
              behavior: const MaterialScrollBehavior().copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                  PointerDeviceKind.stylus,
                  PointerDeviceKind.trackpad,
                },
              ),
              child: PageView.builder(
                controller: _pageCtrl,
                physics: const PageScrollPhysics(),
                allowImplicitScrolling: true,
                onPageChanged: (i) => setState(() => _current = i),
                itemCount: _banners.length,
                itemBuilder: (context, i) {
                  final b = _banners[i];
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOutCubic,
                    margin: EdgeInsets.symmetric(
                      horizontal: i == _current ? 0 : 5,
                      vertical: i == _current ? 0 : 4,
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        children: [
                          Positioned(
                            right: -18,
                            top: -22,
                            child: _FloatingGlow(
                              size: 82,
                              color: Colors.white.withValues(alpha: 0.14),
                            ),
                          ),
                          Positioned(
                            right: 78,
                            bottom: -16,
                            child: _FloatingGlow(
                              size: 42,
                              color: Colors.white.withValues(alpha: 0.12),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: b.$3,
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: b.$3[0].withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                )
                              ],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        b.$1,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        b.$2,
                                        style: TextStyle(
                                          color: Colors.white.withValues(
                                            alpha: 0.9,
                                          ),
                                          fontSize: 13,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                _AnimatedBannerIcon(
                                  icon: b.$4,
                                  accent: b.$3[0],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(_banners.length, (i) {
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: i == _current ? 18 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: i == _current ? AppColors.orange : AppColors.line,
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
      ],
    );
  }
}

// ─── Category Grid ──────────────────────────────────────────────────────────

class _FloatingGlow extends StatefulWidget {
  const _FloatingGlow({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  State<_FloatingGlow> createState() => _FloatingGlowState();
}

class _FloatingGlowState extends State<_FloatingGlow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
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
        return Transform.scale(scale: scale, child: child);
      },
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: widget.color,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _AnimatedBannerIcon extends StatefulWidget {
  const _AnimatedBannerIcon({required this.icon, required this.accent});

  final IconData icon;
  final Color accent;

  @override
  State<_AnimatedBannerIcon> createState() => _AnimatedBannerIconState();
}

class _AnimatedBannerIconState extends State<_AnimatedBannerIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1450),
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
        final lift = -5 * _controller.value;
        final scale = 0.96 + (_controller.value * 0.06);
        return Transform.translate(
          offset: Offset(0, lift),
          child: Transform.scale(scale: scale, child: child),
        );
      },
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.18),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
          boxShadow: [
            BoxShadow(
              color: widget.accent.withValues(alpha: 0.24),
              blurRadius: 18,
              spreadRadius: 1,
            ),
          ],
        ),
        child: Icon(
          widget.icon,
          size: 34,
          color: Colors.white.withValues(alpha: 0.9),
        ),
      ),
    );
  }
}

class _AnimatedGridTile extends StatelessWidget {
  const _AnimatedGridTile({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 260 + (index % 6) * 40),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 12 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

class _CategoryGrid extends StatelessWidget {
  const _CategoryGrid({required this.selected, required this.onSelect});

  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      margin: const EdgeInsets.only(top: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: List.generate(_kCategories.length, (index) {
            final (label, icon) = _kCategories[index];
            final isSelected = selected == index;
            return AnimatedScale(
              scale: isSelected ? 1.06 : 1,
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutBack,
              child: GestureDetector(
                onTap: () => onSelect(index),
                child: Container(
                  width: 72,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.orange : AppColors.page,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.orange
                                : Colors.transparent,
                            width: 2,
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color:
                                        AppColors.orange.withValues(alpha: 0.2),
                                    blurRadius: 12,
                                    offset: const Offset(0, 6),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          icon,
                          size: 24,
                          color: isSelected ? Colors.white : AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 8),
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 180),
                        style: TextStyle(
                          fontSize: 11,
                          height: 1.2,
                          fontWeight:
                              isSelected ? FontWeight.w800 : FontWeight.w500,
                          color: isSelected ? AppColors.orange : AppColors.ink,
                        ),
                        child: Text(
                          label,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
