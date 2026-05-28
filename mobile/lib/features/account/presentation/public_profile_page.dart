import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/empty_state.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';

class PublicProfilePage extends StatefulWidget {
  const PublicProfilePage({
    super.key,
    required this.userId,
    required this.userName,
    required this.repository,
  });

  final String userId;
  final String userName;
  final AccountRepository repository;

  @override
  State<PublicProfilePage> createState() => _PublicProfilePageState();
}

class _PublicProfilePageState extends State<PublicProfilePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  Map<String, dynamic>? _profile;
  List<dynamic> _reviews = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        widget.repository.getPublicProfile(widget.userId),
        widget.repository.getUserReviews(widget.userId),
      ]);
      if (!mounted) return;
      setState(() {
        _profile = results[0] as Map<String, dynamic>;
        _reviews = results[1] as List<dynamic>;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: EmptyState(
                    message: 'Không tải được hồ sơ',
                    subtitle: _error,
                    icon: Icons.person_off_outlined,
                    action: ElevatedButton(
                      onPressed: _load,
                      child: const Text('Thử lại'),
                    ),
                  ),
                )
              : _buildBody(),
    );
  }

  Widget _buildBody() {
    final profile = _profile!;
    final fullName = textOf(profile['fullName']);
    final avatarUrl = textOf(profile['avatarUrl']);
    final ekycStatus = textOf(profile['ekycStatus']);
    final trustScore =
        (profile['trustScore'] is num ? profile['trustScore'] as num : 0)
            .toInt();
    final avgRating =
        (profile['averageRating'] is num ? profile['averageRating'] as num : 0)
            .toDouble();
    final totalReviews = (profile['totalReviews'] as num?)?.toInt() ?? 0;

    return NestedScrollView(
      headerSliverBuilder: (context, _) => [
        SliverAppBar(
          expandedHeight: 240,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                // Gradient banner
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xffee4d2d), Color(0xffff7143)],
                    ),
                  ),
                ),
                Positioned(
                  top: -30,
                  right: -30,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                ),
                // Profile info overlay
                Positioned(
                  bottom: 20,
                  left: 0,
                  right: 0,
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 16,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 42,
                          backgroundColor: AppColors.orangeLight,
                          backgroundImage: avatarUrl.isNotEmpty
                              ? NetworkImage(avatarUrl)
                              : null,
                          child: avatarUrl.isEmpty
                              ? Text(
                                  _initials(fullName),
                                  style: const TextStyle(
                                    color: AppColors.orange,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 24,
                                  ),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        fullName.isEmpty ? 'Người dùng' : fullName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (ekycStatus == 'verified')
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: Colors.white.withValues(alpha: 0.4)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified_rounded,
                                  size: 13, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Đã xác minh',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600),
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
          title: Text(fullName.isEmpty ? 'Hồ sơ' : fullName,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          bottom: TabBar(
            controller: _tabController,
            indicatorColor: Colors.white,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white.withValues(alpha: 0.7),
            tabs: [
              Tab(text: 'Đánh giá ($totalReviews)'),
              const Tab(text: 'Thống kê'),
            ],
          ),
        ),
      ],
      body: TabBarView(
        controller: _tabController,
        children: [
          _ReviewsTab(reviews: _reviews),
          _StatsTab(
            trustScore: trustScore,
            avgRating: avgRating,
            totalReviews: totalReviews,
            profile: profile,
          ),
        ],
      ),
    );
  }

  String _initials(String value) {
    final parts = value.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'RP';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'.toUpperCase();
  }
}

class _ReviewsTab extends StatelessWidget {
  const _ReviewsTab({required this.reviews});
  final List<dynamic> reviews;

  @override
  Widget build(BuildContext context) {
    if (reviews.isEmpty) {
      return const EmptyState(
        message: 'Chưa có đánh giá nào',
        subtitle: 'Người dùng này chưa nhận được đánh giá',
        icon: Icons.star_border_rounded,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: reviews.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) {
        final review = reviews[i] as Map<String, dynamic>;
        return _ReviewCard(review: review);
      },
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review});
  final Map<String, dynamic> review;

  @override
  Widget build(BuildContext context) {
    final reviewer = review['reviewerId'] is Map
        ? review['reviewerId'] as Map<String, dynamic>
        : <String, dynamic>{};
    final reviewerName = textOf(reviewer['fullName']);
    final reviewerAvatar = textOf(reviewer['avatarUrl']);
    final rating = (review['rating'] is num ? review['rating'] as num : 0).toInt();
    final comment = textOf(review['comment']);
    final createdAt = textOf(review['createdAt']);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.orangeLight,
                backgroundImage: reviewerAvatar.isNotEmpty
                    ? NetworkImage(reviewerAvatar)
                    : null,
                child: reviewerAvatar.isEmpty
                    ? Text(
                        reviewerName.isNotEmpty
                            ? reviewerName.substring(0, 1).toUpperCase()
                            : 'U',
                        style: const TextStyle(
                            color: AppColors.orange,
                            fontWeight: FontWeight.w700,
                            fontSize: 13),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(reviewerName.isEmpty ? 'Người dùng' : reviewerName,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            )),
                    Text(
                      shortDate(createdAt),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              // Stars
              Row(
                children: List.generate(
                  5,
                  (i) => Icon(
                    i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                    color: const Color(0xfffbbf24),
                    size: 16,
                  ),
                ),
              ),
            ],
          ),
          if (comment.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(comment, style: Theme.of(context).textTheme.bodyMedium),
          ],
        ],
      ),
    );
  }
}

class _StatsTab extends StatelessWidget {
  const _StatsTab({
    required this.trustScore,
    required this.avgRating,
    required this.totalReviews,
    required this.profile,
  });

  final int trustScore;
  final double avgRating;
  final int totalReviews;
  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final trustColor = trustScore >= 70
        ? AppColors.green
        : trustScore >= 40
            ? AppColors.orange
            : AppColors.red;
    final trustLabel = trustScore >= 70
        ? 'Đáng tin cậy'
        : trustScore >= 40
            ? 'Trung bình'
            : 'Cần cải thiện';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Trust score card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            children: [
              Text('Điểm tin cậy',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: CircularProgressIndicator(
                      value: trustScore / 100,
                      strokeWidth: 10,
                      backgroundColor: AppColors.line,
                      color: trustColor,
                    ),
                  ),
                  Column(
                    children: [
                      Text(
                        '$trustScore',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: trustColor,
                        ),
                      ),
                      Text(
                        '/100',
                        style: TextStyle(fontSize: 12, color: AppColors.muted),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: trustColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  trustLabel,
                  style: TextStyle(
                      color: trustColor, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Stats grid
        Row(
          children: [
            Expanded(
              child: _StatCard(
                icon: Icons.star_rounded,
                iconColor: const Color(0xfffbbf24),
                label: 'Đánh giá TB',
                value: avgRating.toStringAsFixed(1),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                icon: Icons.rate_review_outlined,
                iconColor: AppColors.blue,
                label: 'Tổng đánh giá',
                value: '$totalReviews',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 2),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
