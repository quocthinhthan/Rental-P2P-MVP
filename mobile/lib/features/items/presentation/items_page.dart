import 'dart:async';
import 'dart:ui' show PointerDeviceKind;

import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/item_detail_page.dart';
import 'package:rental_p2p_mobile/features/items/presentation/item_tile.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';

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
    this.accountRepository,
    this.onNavigateToTab,
    this.notificationCount = 0,
    this.hasUnreadNotifications = false,
    this.onNotificationTap,
  });

  final ItemsRepository repository;
  final RentalsRepository? rentalsRepository;
  final String currentUserId;
  final AccountRepository? accountRepository;

  /// Called with tab index when user wants to switch tabs (e.g. cart → favorites tab 3)
  final ValueChanged<int>? onNavigateToTab;
  final int notificationCount;
  final bool hasUnreadNotifications;
  final VoidCallback? onNotificationTap;

  @override
  State<ItemsPage> createState() => _ItemsPageState();
}

class _ItemsPageState extends State<ItemsPage> {
  static const _pageSize = 16;

  final search = TextEditingController();
  final _scrollController = ScrollController();
  List<ItemSummary> items = [];
  List<ItemSummary> featuredItems = [];
  Set<String> _favoriteIds = {};
  bool loading = true;
  bool loadingMore = false;
  bool hasMore = true;
  int _page = 1;
  int _loadToken = 0;
  int _selectedCategory = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    loadItems();
    _loadFavorites();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    search.dispose();
    super.dispose();
  }

  String? get _selectedCategoryQuery =>
      _selectedCategory == 0 ? null : _kCategories[_selectedCategory].$1;

  void _onScroll() {
    if (!_scrollController.hasClients || loading || loadingMore || !hasMore) {
      return;
    }

    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 520) {
      loadMoreItems();
    }
  }

  Future<void> loadItems() async {
    final token = ++_loadToken;
    setState(() {
      loading = true;
      loadingMore = false;
      hasMore = true;
      _page = 1;
    });
    try {
      final result = await widget.repository.searchItems(
        search.text,
        category: _selectedCategoryQuery,
        page: _page,
        limit: _pageSize,
      );
      if (!mounted || token != _loadToken) return;
      setState(() {
        items = result;
        // Use first 5 items as featured (horizontal scroll section)
        featuredItems = result.take(5).toList();
        hasMore = result.length == _pageSize;
      });
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted && token == _loadToken) setState(() => loading = false);
    }
  }

  Future<void> _loadFavorites() async {
    if (widget.accountRepository == null) return;
    try {
      final list = await widget.accountRepository!.getFavorites();
      if (!mounted) return;
      final ids = <String>{};
      for (final f in list) {
        final id =
            (f is Map) ? (f['_id'] ?? f['id'])?.toString() : f.toString();
        if (id != null) ids.add(id);
      }
      setState(() => _favoriteIds = ids);
    } catch (_) {
      // silently ignore favorite load errors
    }
  }

  Future<void> _toggleFavorite(ItemSummary item) async {
    if (widget.accountRepository == null) return;
    final isFav = _favoriteIds.contains(item.id);
    // Optimistic update
    setState(() {
      if (isFav) {
        _favoriteIds.remove(item.id);
      } else {
        _favoriteIds.add(item.id);
      }
    });
    try {
      if (isFav) {
        await widget.accountRepository!.removeFavorite(item.id);
      } else {
        await widget.accountRepository!.addFavorite(item.id);
      }
    } catch (error) {
      // Revert on failure
      setState(() {
        if (isFav) {
          _favoriteIds.add(item.id);
        } else {
          _favoriteIds.remove(item.id);
        }
      });
      if (mounted) showError(context, error);
    }
  }

  Future<void> loadMoreItems() async {
    if (loading || loadingMore || !hasMore) return;
    final token = _loadToken;
    final nextPage = _page + 1;
    setState(() => loadingMore = true);
    try {
      final result = await widget.repository.searchItems(
        search.text,
        category: _selectedCategoryQuery,
        page: nextPage,
        limit: _pageSize,
      );
      if (!mounted || token != _loadToken) return;
      setState(() {
        _page = nextPage;
        items = [...items, ...result];
        hasMore = result.length == _pageSize;
      });
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted && token == _loadToken) setState(() => loadingMore = false);
    }
  }

  int _columnsFor(double width) {
    if (width >= 1100) return 5;
    if (width >= 760) return 4;
    if (width >= 520) return 3;
    return 2;
  }

  void _openItem(ItemSummary item) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ItemDetailPage(
          repository: widget.repository,
          itemId: item.id,
          rentalsRepository: widget.rentalsRepository,
          currentUserId: widget.currentUserId,
          accountRepository: widget.accountRepository,
        ),
      ),
    );
    loadItems();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: RefreshIndicator(
        onRefresh: loadItems,
        color: AppColors.orange,
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            // ── Sticky Header ─────────────────────────────────────────────
            _StickyHeader(
              search: search,
              onSearch: loadItems,
              onCartTap: () => widget.onNavigateToTab?.call(3),
              notificationCount: widget.notificationCount,
              hasUnreadNotifications: widget.hasUnreadNotifications,
              onNotificationTap: widget.onNotificationTap,
            ),

            // ── Banner Carousel ────────────────────────────────────────────
            const SliverToBoxAdapter(
              child: _BannerCarousel(),
            ),

            // ── Category Chips (below banner, per request) ─────────────────
            SliverToBoxAdapter(
              child: _CategoryChips(
                selected: _selectedCategory,
                onSelect: (i) {
                  if (_selectedCategory == i) return;
                  setState(() => _selectedCategory = i);
                  loadItems();
                },
              ),
            ),

            // ── Featured Section (horizontal scroll) ────────────────────
            if (!loading && featuredItems.isNotEmpty && _selectedCategory == 0)
              SliverToBoxAdapter(
                child: _FeaturedSection(
                  items: featuredItems,
                  onTap: _openItem,
                ),
              ),

            // ── Section Title ─────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _selectedCategory == 0
                                ? '🔥 Gợi ý hôm nay'
                                : _kCategories[_selectedCategory].$1,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          if (!loading)
                            Text(
                              '${items.length}${hasMore ? '+' : ''} sản phẩm đang cho thuê',
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (!loading)
                      _PillBadge(
                        label: '${items.length}${hasMore ? '+' : ''}',
                        icon: Icons.inventory_2_outlined,
                      ),
                  ],
                ),
              ),
            ),

            // ── Products Grid or Empty/Loading ────────────────────────────
            if (loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.orange),
                ),
              )
            else if (items.isEmpty)
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
                          final item = items[index];
                          return _AnimatedGridTile(
                            index: index,
                            child: ItemTile(
                              item: item,
                              isFavorite: _favoriteIds.contains(item.id),
                              onTap: () => _openItem(item),
                              onToggleFavorite: () => _toggleFavorite(item),
                            ),
                          );
                        },
                        childCount: items.length,
                      ),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        childAspectRatio: 0.68,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                    );
                  },
                ),
              ),

            if (!loading && loadingMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 18),
                  child: Center(
                    child: CircularProgressIndicator(
                      color: AppColors.orange,
                      strokeWidth: 2.6,
                    ),
                  ),
                ),
              ),

            // Bottom padding for nav bar
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
          ],
        ),
      ),
    );
  }
}

// ─── Sticky Header ─────────────────────────────────────────────────────────

class _StickyHeader extends StatelessWidget {
  const _StickyHeader({
    required this.search,
    required this.onSearch,
    this.onCartTap,
    this.notificationCount = 0,
    this.hasUnreadNotifications = false,
    this.onNotificationTap,
  });

  final TextEditingController search;
  final VoidCallback onSearch;
  final VoidCallback? onCartTap;
  final int notificationCount;
  final bool hasUnreadNotifications;
  final VoidCallback? onNotificationTap;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      floating: true,
      snap: true,
      expandedHeight: 120,
      collapsedHeight: 68,
      elevation: 0,
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      titleSpacing: 16,
      shadowColor: Colors.black.withValues(alpha: 0.06),
      scrolledUnderElevation: 4,
      // Brand logo + location row
      title: Row(
        children: [
          // ── Brand Logo (bigger) ──────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: AppColors.orange,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: AppColors.orange.withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.storefront_rounded, color: Colors.white, size: 20),
                SizedBox(width: 7),
                Text(
                  'Rental App',
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // ── Location (right of logo) ─────────────────────────────────
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: const [
                    Icon(Icons.location_on_rounded,
                        color: AppColors.orange, size: 12),
                    SizedBox(width: 2),
                    Text(
                      'KHU VỰC',
                      style: TextStyle(
                        fontSize: 9,
                        letterSpacing: 0.8,
                        fontWeight: FontWeight.w700,
                        color: AppColors.orange,
                      ),
                    ),
                  ],
                ),
                const Text(
                  'TP. Hồ Chí Minh',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.ink,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // ── Cart icon (navigate → Yêu thích tab) ─────────────────────
          GestureDetector(
            onTap: onCartTap,
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppColors.page,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.shopping_cart_outlined,
                  color: AppColors.ink, size: 21),
            ),
          ),
          const SizedBox(width: 8),
          // ── Notification Bell ────────────────────────────────────────
          _NotificationBell(
            count: notificationCount,
            hasUnread: hasUnreadNotifications,
            onTap: onNotificationTap,
          ),
        ],
      ),
      // Expanded search bar
      flexibleSpace: FlexibleSpaceBar(
        background: Align(
          alignment: Alignment.bottomCenter,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: _SearchBar(controller: search, onSearch: onSearch),
          ),
        ),
      ),
    );
  }
}

class _NotificationBell extends StatefulWidget {
  const _NotificationBell({
    required this.count,
    required this.hasUnread,
    this.onTap,
  });

  final int count;
  final bool hasUnread;
  final VoidCallback? onTap;

  @override
  State<_NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<_NotificationBell>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _wiggle;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    );
    _wiggle = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0, end: -0.12), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -0.12, end: 0.12), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 0.12, end: -0.08), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -0.08, end: 0), weight: 1),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
    _scale = Tween<double>(begin: 1, end: 1.08).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant _NotificationBell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.hasUnread != widget.hasUnread) {
      _syncAnimation();
    }
  }

  void _syncAnimation() {
    if (widget.hasUnread) {
      _controller.repeat(reverse: true);
    } else {
      _controller.stop();
      _controller.reset();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final displayCount = widget.count > 9 ? '9+' : widget.count.toString();

    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Transform.scale(
          scale: widget.hasUnread ? _scale.value : 1,
          child: Transform.rotate(
            angle: widget.hasUnread ? _wiggle.value : 0,
            child: child,
          ),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color:
                    widget.hasUnread ? AppColors.orangeLight : AppColors.page,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: widget.hasUnread
                      ? AppColors.orange.withValues(alpha: 0.35)
                      : Colors.transparent,
                ),
              ),
              child: Icon(
                widget.hasUnread
                    ? Icons.notifications_active_rounded
                    : Icons.notifications_none_rounded,
                color: widget.hasUnread ? AppColors.orange : AppColors.ink,
                size: 22,
              ),
            ),
            if (widget.count > 0)
              Positioned(
                top: -5,
                right: -5,
                child: Container(
                  constraints:
                      const BoxConstraints(minWidth: 20, minHeight: 20),
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: BoxDecoration(
                    color: AppColors.orange,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    displayCount,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Search Bar ────────────────────────────────────────────────────────────

class _SearchBar extends StatelessWidget {
  const _SearchBar({required this.controller, required this.onSearch});

  final TextEditingController controller;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.page,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line, width: 1.2),
            ),
            child: Row(
              children: [
                const SizedBox(width: 14),
                const Icon(Icons.search_rounded,
                    color: AppColors.muted, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      hintText: 'Tìm máy ảnh, lều trại, laptop...',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      filled: false,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.ink,
                    ),
                    onSubmitted: (_) => onSearch(),
                  ),
                ),
                if (controller.text.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      controller.clear();
                      onSearch();
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10),
                      child: Icon(Icons.close_rounded,
                          size: 16, color: AppColors.muted),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        // Search button
        GestureDetector(
          onTap: onSearch,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.orange,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppColors.orange.withValues(alpha: 0.35),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.tune_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Category Chips ────────────────────────────────────────────────────────
// Horizontal pill-style chips (matching video reference)

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({required this.selected, required this.onSelect});

  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.page,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Row(
          children: List.generate(_kCategories.length, (index) {
            final (label, icon) = _kCategories[index];
            final isSelected = selected == index;
            return GestureDetector(
              onTap: () => onSelect(index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.orange : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isSelected ? AppColors.orange : AppColors.line,
                    width: 1.5,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: AppColors.orange.withValues(alpha: 0.25),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 15,
                      color: isSelected ? Colors.white : AppColors.muted,
                    ),
                    const SizedBox(width: 6),
                    AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 200),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? Colors.white : AppColors.ink,
                      ),
                      child: Text(label),
                    ),
                  ],
                ),
              ),
            );
          }),
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
  final _pageCtrl = PageController(viewportFraction: 0.9);
  Timer? _autoTimer;
  int _current = 0;

  final _banners = const [
    (
      '🎁 Thuê lần đầu hoàn tiền 50K',
      'Áp dụng cho đơn từ 200.000đ đầu tiên',
      [Color(0xffEE4D2D), Color(0xffFF8C69)],
      Icons.local_offer_rounded,
    ),
    (
      '📸 Máy ảnh & Công nghệ',
      'Macbook, Camera, Drone giá sinh viên',
      [Color(0xff667eea), Color(0xff764ba2)],
      Icons.camera_alt_rounded,
    ),
    (
      '⛺ Phượt cuối tuần',
      'Lều trại, balo, flycam đầy đủ',
      [Color(0xff11998e), Color(0xff38ef7d)],
      Icons.landscape_rounded,
    ),
    (
      '🎵 Nhạc cụ & Âm thanh',
      'Guitar, Violin, Loa PA chất lượng cao',
      [Color(0xffF7971E), Color(0xffFFD200)],
      Icons.music_note_rounded,
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
        duration: const Duration(milliseconds: 480),
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
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(0, 16, 0, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  children: [
                    const Text(
                      'Ưu đãi hot',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xfff74b2c), Color(0xffff7a4f)],
                        ),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'HOT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 148,
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
                      final isActive = i == _current;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        margin: EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: isActive ? 0 : 6,
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              // Gradient background
                              Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: b.$3,
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                              ),
                              // Decorative circles
                              Positioned(
                                right: -24,
                                top: -24,
                                child: Container(
                                  width: 100,
                                  height: 100,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withValues(alpha: 0.1),
                                  ),
                                ),
                              ),
                              Positioned(
                                right: 60,
                                bottom: -30,
                                child: Container(
                                  width: 60,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withValues(alpha: 0.08),
                                  ),
                                ),
                              ),
                              // Content
                              Padding(
                                padding: const EdgeInsets.all(20),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            b.$1,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 17,
                                              fontWeight: FontWeight.w900,
                                              height: 1.2,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            b.$2,
                                            style: TextStyle(
                                              color: Colors.white
                                                  .withValues(alpha: 0.88),
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              height: 1.4,
                                            ),
                                          ),
                                          const SizedBox(height: 14),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 14, vertical: 7),
                                            decoration: BoxDecoration(
                                              color: Colors.white
                                                  .withValues(alpha: 0.22),
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                              border: Border.all(
                                                color: Colors.white
                                                    .withValues(alpha: 0.4),
                                                width: 1,
                                              ),
                                            ),
                                            child: const Text(
                                              'Xem ngay →',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                              ),
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
              const SizedBox(height: 14),
              // Dots
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_banners.length, (i) {
                  final isActive = i == _current;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: isActive ? 20 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.orange : AppColors.line,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

// ─── Featured Section (horizontal scroll) ────────────────────────────────────

class _FeaturedSection extends StatelessWidget {
  const _FeaturedSection({required this.items, required this.onTap});

  final List<ItemSummary> items;
  final ValueChanged<ItemSummary> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(0, 4, 0, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
            child: Row(
              children: [
                const Text(
                  '⚡ Nổi bật tuần này',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: AppColors.ink,
                  ),
                ),
                const Spacer(),
                Text(
                  'Tất cả',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.orange,
                  ),
                ),
                const SizedBox(width: 2),
                const Icon(Icons.arrow_forward_ios_rounded,
                    size: 11, color: AppColors.orange),
              ],
            ),
          ),
          SizedBox(
            height: 220,
            child: ScrollConfiguration(
              behavior: const MaterialScrollBehavior().copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                  PointerDeviceKind.stylus,
                  PointerDeviceKind.trackpad,
                },
              ),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return _FeaturedCard(
                    item: item,
                    onTap: () => onTap(item),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  const _FeaturedCard({required this.item, required this.onTap});

  final ItemSummary item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 160,
        margin: const EdgeInsets.symmetric(horizontal: 5),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.line, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image
            Expanded(
              flex: 7,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  item.mainImage.isEmpty
                      ? Container(
                          color: AppColors.orangeLight,
                          child: const Icon(Icons.inventory_2_outlined,
                              color: AppColors.orange, size: 32),
                        )
                      : Image.network(
                          item.mainImage,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.orangeLight,
                            child: const Icon(Icons.broken_image_outlined,
                                color: AppColors.orange),
                          ),
                        ),
                  // Gradient overlay
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.12),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (item.averageRating > 0)
                    Positioned(
                      bottom: 7,
                      left: 7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded,
                                size: 10, color: Colors.amber),
                            const SizedBox(width: 2),
                            Text(
                              item.averageRating.toStringAsFixed(1),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Info
            Expanded(
              flex: 5,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name.isEmpty ? 'Chưa đặt tên' : item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: AppColors.ink,
                        height: 1.3,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      formatMoney(item.pricePerDay, perDay: false),
                      style: const TextStyle(
                        color: AppColors.orange,
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      '/ngày',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Pill Badge ───────────────────────────────────────────────────────────────

class _PillBadge extends StatelessWidget {
  const _PillBadge({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.orangeLight,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.orange),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.orange,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Animated Banner Icon ─────────────────────────────────────────────────────

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
        final lift = -6 * _controller.value;
        final scale = 0.94 + (_controller.value * 0.08);
        return Transform.translate(
          offset: Offset(0, lift),
          child: Transform.scale(scale: scale, child: child),
        );
      },
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: widget.accent.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Icon(
          widget.icon,
          size: 38,
          color: Colors.white.withValues(alpha: 0.95),
        ),
      ),
    );
  }
}

// ─── Animated Grid Tile ───────────────────────────────────────────────────────

class _AnimatedGridTile extends StatelessWidget {
  const _AnimatedGridTile({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 280 + (index % 6) * 45),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 16 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}
