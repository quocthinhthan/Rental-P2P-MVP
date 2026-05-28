import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';

class ItemTile extends StatefulWidget {
  const ItemTile({
    super.key,
    required this.item,
    required this.onTap,
    this.isFavorite = false,
    this.onToggleFavorite,
  });

  final ItemSummary item;
  final VoidCallback onTap;
  final bool isFavorite;
  final VoidCallback? onToggleFavorite;

  @override
  State<ItemTile> createState() => _ItemTileState();
}

class _ItemTileState extends State<ItemTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pressCtrl;
  late final Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _pressCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _pressCtrl, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _pressCtrl.dispose();
    super.dispose();
  }

  bool get _isHot {
    final hot = ['công nghệ', 'technology', 'camera', 'máy ảnh', 'laptop', 'drone', 'flycam'];
    return hot.any((k) =>
        widget.item.category.toLowerCase().contains(k) ||
        widget.item.name.toLowerCase().contains(k));
  }

  bool get _isNew {
    // Items with fewer reviews are considered "new"
    return widget.item.totalReviews == 0;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _pressCtrl.forward(),
      onTapUp: (_) {
        _pressCtrl.reverse();
        widget.onTap();
      },
      onTapCancel: () => _pressCtrl.reverse(),
      child: ScaleTransition(
        scale: _scaleAnim,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ─ Image Stack ─────────────────────────────────────────────
              Expanded(
                flex: 12,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Product image
                    widget.item.mainImage.isEmpty
                        ? Container(
                            color: AppColors.orangeLight,
                            child: const Icon(
                              Icons.inventory_2_outlined,
                              color: AppColors.orange,
                              size: 36,
                            ),
                          )
                        : Image.network(
                            widget.item.mainImage,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, progress) {
                              if (progress == null) return child;
                              return Container(
                                color: AppColors.page,
                                child: const Center(
                                  child: CircularProgressIndicator(
                                    color: AppColors.orange,
                                    strokeWidth: 2,
                                  ),
                                ),
                              );
                            },
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.orangeLight,
                              child: const Icon(
                                Icons.broken_image_outlined,
                                color: AppColors.orange,
                              ),
                            ),
                          ),

                    // Subtle gradient overlay
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            stops: const [0.5, 1.0],
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.18),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Top-left badge: HOT or NEW
                    if (_isHot)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: _Badge(
                          label: '🔥 HOT',
                          gradient: const LinearGradient(
                            colors: [Color(0xfff74b2c), Color(0xffff7a4f)],
                          ),
                        ),
                      )
                    else if (_isNew)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: _Badge(
                          label: '✨ MỚI',
                          gradient: const LinearGradient(
                            colors: [Color(0xff0066FF), Color(0xff00C2FF)],
                          ),
                        ),
                      ),

                    // Bottom-left: Rating
                    if (widget.item.averageRating > 0)
                      Positioned(
                        bottom: 7,
                        left: 7,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.62),
                            borderRadius: BorderRadius.circular(7),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.star_rounded,
                                  size: 10, color: Colors.amber),
                              const SizedBox(width: 3),
                              Text(
                                widget.item.averageRating.toStringAsFixed(1),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (widget.item.totalReviews > 0) ...[
                                const SizedBox(width: 3),
                                Text(
                                  '(${widget.item.totalReviews})',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 9,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),

                    // Favorite button — tappable directly on card
                    Positioned(
                      top: 8,
                      right: 8,
                      child: GestureDetector(
                        onTap: widget.onToggleFavorite,
                        behavior: HitTestBehavior.opaque,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: widget.isFavorite
                                ? AppColors.orange.withValues(alpha: 0.12)
                                : Colors.white.withValues(alpha: 0.9),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            widget.isFavorite
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 17,
                            color: widget.isFavorite
                                ? AppColors.orange
                                : AppColors.muted,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ─ Product Info ──────────────────────────────────────────────
              Expanded(
                flex: 10,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category Badge
                      if (widget.item.category.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          margin: const EdgeInsets.only(bottom: 5),
                          decoration: BoxDecoration(
                            color: AppColors.orangeLight,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            widget.item.category,
                            style: const TextStyle(
                              fontSize: 9,
                              color: AppColors.orange,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),

                      // Product Name
                      Text(
                        widget.item.name.isEmpty
                            ? 'Chưa đặt tên'
                            : widget.item.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12.5,
                          color: AppColors.ink,
                          height: 1.3,
                        ),
                      ),

                      const Spacer(),

                      // Price
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            formatMoney(widget.item.pricePerDay, perDay: false),
                            style: const TextStyle(
                              color: AppColors.orange,
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Text(
                            '/ngày',
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 5),

                      // Location
                      Row(
                        children: [
                          const Icon(Icons.place_outlined,
                              size: 11, color: AppColors.muted),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              widget.item.address.isEmpty
                                  ? 'Chưa có địa chỉ'
                                  : _shortAddress(widget.item.address),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10,
                                color: AppColors.muted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Show only the last part of address (city/district)
  String _shortAddress(String address) {
    final parts = address.split(',');
    if (parts.length >= 2) {
      return parts.reversed.take(2).toList().reversed.join(', ').trim();
    }
    return address.trim();
  }
}

// ─── Badge Widget ─────────────────────────────────────────────────────────────

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.gradient});

  final String label;
  final LinearGradient gradient;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(7),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
