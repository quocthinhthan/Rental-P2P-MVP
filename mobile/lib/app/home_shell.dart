import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/account/presentation/account_page.dart';
import 'package:rental_p2p_mobile/features/account/presentation/favorites_page.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/items_page.dart';
import 'package:rental_p2p_mobile/features/items/presentation/post_item_page.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/my_rentals_page.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/rental_detail_page.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.user,
    required this.authRepository,
    required this.accountRepository,
    required this.itemsRepository,
    required this.rentalsRepository,
    required this.onUserChanged,
    required this.onSignOut,
  });

  final AppUser user;
  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final ItemsRepository itemsRepository;
  final RentalsRepository rentalsRepository;
  final ValueChanged<AppUser> onUserChanged;
  final VoidCallback onSignOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell>
    with SingleTickerProviderStateMixin {
  int _index = 0;
  Timer? _unreadTimer;
  Timer? _notificationTimer;
  late final AnimationController _bounceController;
  late final Animation<double> _bounceOffset;
  _UnreadChatTarget? _unreadChat;
  List<_RentalNotification> _notifications = const [];
  bool _checkingUnread = false;
  bool _checkingNotifications = false;

  @override
  void initState() {
    super.initState();
    _bounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 760),
    )..repeat(reverse: true);
    _bounceOffset = Tween<double>(begin: 0, end: -8).animate(
      CurvedAnimation(parent: _bounceController, curve: Curves.easeInOut),
    );
    _loadUnreadChat();
    _loadRentalNotifications();
    _unreadTimer = Timer.periodic(
      const Duration(seconds: 25),
      (_) => _loadUnreadChat(),
    );
    _notificationTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _loadRentalNotifications(),
    );
  }

  @override
  void didUpdateWidget(covariant HomeShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user.id != widget.user.id) {
      _unreadChat = null;
      _loadUnreadChat();
      _notifications = const [];
      _loadRentalNotifications();
    }
  }

  @override
  void dispose() {
    _unreadTimer?.cancel();
    _notificationTimer?.cancel();
    _bounceController.dispose();
    super.dispose();
  }

  String _seenKey(String rentalId) => 'chat_seen_${widget.user.id}_$rentalId';
  String _notificationSeenKey(String notificationId) =>
      'rental_notification_seen_${widget.user.id}_$notificationId';

  Future<void> _loadUnreadChat() async {
    if (_checkingUnread || widget.user.id.isEmpty) return;
    _checkingUnread = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final rentalsView = await widget.rentalsRepository.getMyRentals();
      final rentals = [...rentalsView.asRenter, ...rentalsView.asOwner];
      _UnreadChatTarget? nextTarget;

      for (final rental in rentals) {
        final messages = await widget.rentalsRepository.getMessages(rental.id);
        final incoming = messages
            .where((message) => message.senderId != widget.user.id)
            .toList()
          ..sort((a, b) {
            final aTime = DateTime.tryParse(a.createdAt);
            final bTime = DateTime.tryParse(b.createdAt);
            if (aTime == null || bTime == null) {
              return a.createdAt.compareTo(b.createdAt);
            }
            return aTime.compareTo(bTime);
          });
        if (incoming.isEmpty) continue;

        final latest = incoming.last;
        if (prefs.getString(_seenKey(rental.id)) == latest.id) continue;

        nextTarget = _UnreadChatTarget(
          rental: rental,
          message: latest,
        );
        break;
      }

      if (mounted) {
        setState(() => _unreadChat = nextTarget);
      }
    } catch (_) {
      // Keep the home shell quiet; this prompt is a secondary affordance.
    } finally {
      _checkingUnread = false;
    }
  }

  Future<void> _openUnreadChat() async {
    final target = _unreadChat;
    if (target == null) return;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_seenKey(target.rental.id), target.message.id);
    if (mounted) setState(() => _unreadChat = null);
    if (!mounted) return;

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RentalDetailPage(
          rentalId: target.rental.id,
          repository: widget.rentalsRepository,
          currentUserId: widget.user.id,
          initialTabIndex: 1,
        ),
      ),
    );
    if (mounted) _loadUnreadChat();
  }

  Future<void> _loadRentalNotifications() async {
    if (_checkingNotifications || widget.user.id.isEmpty) return;
    _checkingNotifications = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      final rentalsView = await widget.rentalsRepository.getMyRentals();
      final notifications = <_RentalNotification>[
        for (final rental in rentalsView.asOwner)
          ..._notificationsForRental(rental, isOwner: true, prefs: prefs),
        for (final rental in rentalsView.asRenter)
          ..._notificationsForRental(rental, isOwner: false, prefs: prefs),
      ]..sort((a, b) {
          final priority = a.priority.compareTo(b.priority);
          if (priority != 0) return priority;
          return _dateOf(b.sortDate).compareTo(_dateOf(a.sortDate));
        });

      if (mounted) {
        setState(() => _notifications = notifications);
      }
    } catch (_) {
      // Notification center is derived from rental data, so it can fail quietly.
    } finally {
      _checkingNotifications = false;
    }
  }

  List<_RentalNotification> _notificationsForRental(
    RentalCardData rental, {
    required bool isOwner,
    required SharedPreferences prefs,
  }) {
    final status = rental.status.toLowerCase();
    final fingerprint = '${rental.updatedAt}|$status|${rental.ownerHasSigned}|'
        '${rental.renterHasSigned}|${rental.isFullySigned}|'
        '${rental.dispute?.status ?? ''}';

    _RentalNotification item({
      required String type,
      required String title,
      required String body,
      required IconData icon,
      required Color color,
      required int priority,
      String actionLabel = 'Xem chi tiết',
    }) {
      final id = '${rental.id}-$type-${isOwner ? 'owner' : 'renter'}';
      final unread = prefs.getString(_notificationSeenKey(id)) != fingerprint;
      return _RentalNotification(
        id: id,
        fingerprint: fingerprint,
        rental: rental,
        title: title,
        body: body,
        actionLabel: actionLabel,
        icon: icon,
        color: color,
        priority: priority,
        unread: unread,
        roleLabel: isOwner ? 'Cho thuê' : 'Đi thuê',
        sortDate: rental.updatedAt.isNotEmpty
            ? rental.updatedAt
            : rental.createdAt.isNotEmpty
                ? rental.createdAt
                : rental.startDate,
      );
    }

    if (rental.dispute?.isActive ?? false) {
      return [
        item(
          type: 'dispute',
          title: 'Đơn đang cần xử lý tranh chấp',
          body: '${rental.itemName} đang trong quá trình hòa giải. '
              'Theo dõi phản hồi mới nhất trong chi tiết đơn.',
          icon: Icons.report_problem_outlined,
          color: AppColors.red,
          priority: 0,
        ),
      ];
    }

    if (isOwner && status == 'pending_confirmation') {
      return [
        item(
          type: 'confirm',
          title: 'Có đơn thuê cần xác nhận',
          body: '${rental.counterpartyName} đang chờ bạn xác nhận '
              'yêu cầu thuê ${rental.itemName}.',
          icon: Icons.fact_check_outlined,
          color: AppColors.orange,
          priority: 0,
          actionLabel: 'Xác nhận đơn',
        ),
      ];
    }

    if (!isOwner && status == 'pending_confirmation') {
      return [
        item(
          type: 'waiting-confirm',
          title: 'Yêu cầu thuê đang chờ xác nhận',
          body: 'Chủ đồ đang xem yêu cầu thuê ${rental.itemName}. '
              'Bạn sẽ tiếp tục ký hợp đồng sau khi đơn được xác nhận.',
          icon: Icons.hourglass_empty_rounded,
          color: AppColors.orange,
          priority: 4,
        ),
      ];
    }

    if (status == 'confirmed' && !rental.isFullySigned) {
      final hasSigned =
          isOwner ? rental.ownerHasSigned : rental.renterHasSigned;
      if (!hasSigned) {
        return [
          item(
            type: 'sign',
            title: 'Cần ký hợp đồng điện tử',
            body: 'Đơn ${rental.itemName} đã được xác nhận. '
                'Bạn cần ký hợp đồng trước khi giao nhận đồ.',
            icon: Icons.draw_outlined,
            color: AppColors.orange,
            priority: 1,
            actionLabel: 'Ký ngay',
          ),
        ];
      }

      return [
        item(
          type: 'waiting-sign',
          title: 'Đang chờ bên còn lại ký',
          body: 'Bạn đã ký hợp đồng cho ${rental.itemName}. '
              'Hệ thống sẽ báo khi đủ chữ ký để giao nhận đồ.',
          icon: Icons.pending_actions_rounded,
          color: const Color(0xff7c3aed),
          priority: 5,
        ),
      ];
    }

    if (status == 'confirmed' && rental.isFullySigned) {
      return [
        item(
          type: 'handover',
          title: isOwner ? 'Cần bàn giao đồ' : 'Đơn đã sẵn sàng nhận đồ',
          body: 'Hai bên đã ký đủ hợp đồng cho ${rental.itemName}. '
              '${isOwner ? 'Bạn có thể xác nhận giao đồ.' : 'Bạn có thể kiểm tra lịch nhận đồ.'}',
          icon: Icons.inventory_2_outlined,
          color: AppColors.green,
          priority: 1,
          actionLabel: isOwner ? 'Bàn giao đồ' : 'Xem lịch nhận',
        ),
      ];
    }

    if (!isOwner &&
        status == 'in_progress' &&
        _isDueOrOverdue(rental.endDate)) {
      return [
        item(
          type: 'return',
          title: 'Đến hạn trả đồ',
          body: 'Đơn ${rental.itemName} đã đến ngày kết thúc '
              '(${shortDate(rental.endDate)}). Vui lòng hoàn tất trả đồ.',
          icon: Icons.assignment_return_outlined,
          color: AppColors.orange,
          priority: 1,
          actionLabel: 'Trả đồ',
        ),
      ];
    }

    if (status == 'completed') {
      return [
        item(
          type: 'review',
          title: 'Đơn đã hoàn tất',
          body:
              'Bạn có thể đánh giá trải nghiệm với ${rental.counterpartyName} '
              'cho đơn ${rental.itemName}.',
          icon: Icons.star_border_rounded,
          color: AppColors.green,
          priority: 3,
          actionLabel: 'Đánh giá',
        ),
      ];
    }

    if (status == 'rejected' || status == 'cancelled' || status == 'refunded') {
      final label = switch (status) {
        'rejected' => 'Đơn đã bị từ chối',
        'refunded' => 'Đơn đã hoàn tiền',
        _ => 'Đơn đã bị hủy',
      };
      return [
        item(
          type: status,
          title: label,
          body: 'Trạng thái đơn ${rental.itemName} đã được cập nhật. '
              'Bạn có thể xem chi tiết giao dịch trong đơn thuê.',
          icon: Icons.info_outline_rounded,
          color: AppColors.muted,
          priority: 6,
        ),
      ];
    }

    return const [];
  }

  bool _isDueOrOverdue(String value) {
    final date = DateTime.tryParse(value);
    if (date == null) return false;
    final today = DateTime.now();
    final end = DateTime(date.year, date.month, date.day);
    final current = DateTime(today.year, today.month, today.day);
    return !end.isAfter(current);
  }

  DateTime _dateOf(String value) {
    return DateTime.tryParse(value) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  Future<void> _markNotificationsRead([_RentalNotification? target]) async {
    final prefs = await SharedPreferences.getInstance();
    final selected = target == null ? _notifications : [target];
    for (final notification in selected) {
      await prefs.setString(
        _notificationSeenKey(notification.id),
        notification.fingerprint,
      );
    }
    if (!mounted) return;
    setState(() {
      _notifications = [
        for (final notification in _notifications)
          if (target == null || notification.id == target.id)
            notification.copyWith(unread: false)
          else
            notification,
      ];
    });
  }

  Future<void> _openNotifications() async {
    if (_notifications.isEmpty) {
      await _loadRentalNotifications();
    }
    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _NotificationsSheet(
        notifications: _notifications,
        onRefresh: () async {
          await _loadRentalNotifications();
          return _notifications;
        },
        onMarkAllRead: () => _markNotificationsRead(),
        onOpen: (notification) async {
          await _markNotificationsRead(notification);
          if (!mounted) return;
          Navigator.of(context).pop();
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => RentalDetailPage(
                rentalId: notification.rental.id,
                repository: widget.rentalsRepository,
                currentUserId: widget.user.id,
              ),
            ),
          );
          if (mounted) _loadRentalNotifications();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final unreadNotificationCount =
        _notifications.where((notification) => notification.unread).length;
    final pages = [
      ItemsPage(
        repository: widget.itemsRepository,
        rentalsRepository: widget.rentalsRepository,
        currentUserId: widget.user.id,
        accountRepository: widget.accountRepository,
        onNavigateToTab: (index) => setState(() => _index = index),
        notificationCount: unreadNotificationCount,
        hasUnreadNotifications: unreadNotificationCount > 0,
        onNotificationTap: _openNotifications,
      ),
      MyRentalsPage(
        repository: widget.rentalsRepository,
        itemsRepository: widget.itemsRepository,
        currentUserId: widget.user.id,
        accountRepository: widget.accountRepository,
      ),
      PostItemPage(repository: widget.itemsRepository),
      FavoritesPage(
        accountRepository: widget.accountRepository,
        itemsRepository: widget.itemsRepository,
        rentalsRepository: widget.rentalsRepository,
        currentUserId: widget.user.id,
      ),
      AccountPage(
        repository: widget.accountRepository,
        authRepository: widget.authRepository,
        user: widget.user,
        onUserChanged: widget.onUserChanged,
        onSignOut: widget.onSignOut,
      ),
    ];

    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _index, children: pages),
          if (_unreadChat != null)
            Positioned(
              right: 18,
              bottom: 86,
              child: _UnreadChatButton(
                target: _unreadChat!,
                animation: _bounceOffset,
                onTap: _openUnreadChat,
              ),
            ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.storefront_outlined),
              selectedIcon: Icon(Icons.storefront),
              label: 'Khám phá',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long),
              label: 'Đơn thuê',
            ),
            NavigationDestination(
              icon: Icon(Icons.add_circle_outline),
              selectedIcon: Icon(Icons.add_circle),
              label: 'Đăng đồ',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border_rounded),
              selectedIcon: Icon(Icons.favorite_rounded),
              label: 'Yêu thích',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Tài khoản',
            ),
          ],
        ),
      ),
    );
  }
}

class _UnreadChatTarget {
  const _UnreadChatTarget({
    required this.rental,
    required this.message,
  });

  final RentalCardData rental;
  final ChatMessage message;
}

class _RentalNotification {
  const _RentalNotification({
    required this.id,
    required this.fingerprint,
    required this.rental,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.icon,
    required this.color,
    required this.priority,
    required this.unread,
    required this.roleLabel,
    required this.sortDate,
  });

  final String id;
  final String fingerprint;
  final RentalCardData rental;
  final String title;
  final String body;
  final String actionLabel;
  final IconData icon;
  final Color color;
  final int priority;
  final bool unread;
  final String roleLabel;
  final String sortDate;

  _RentalNotification copyWith({bool? unread}) {
    return _RentalNotification(
      id: id,
      fingerprint: fingerprint,
      rental: rental,
      title: title,
      body: body,
      actionLabel: actionLabel,
      icon: icon,
      color: color,
      priority: priority,
      unread: unread ?? this.unread,
      roleLabel: roleLabel,
      sortDate: sortDate,
    );
  }
}

class _NotificationsSheet extends StatefulWidget {
  const _NotificationsSheet({
    required this.notifications,
    required this.onRefresh,
    required this.onMarkAllRead,
    required this.onOpen,
  });

  final List<_RentalNotification> notifications;
  final Future<List<_RentalNotification>> Function() onRefresh;
  final Future<void> Function() onMarkAllRead;
  final Future<void> Function(_RentalNotification notification) onOpen;

  @override
  State<_NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<_NotificationsSheet> {
  late List<_RentalNotification> _items;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _items = widget.notifications;
  }

  @override
  void didUpdateWidget(covariant _NotificationsSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notifications != widget.notifications) {
      _items = widget.notifications;
    }
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      final next = await widget.onRefresh();
      if (mounted) setState(() => _items = next);
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _markAllRead() async {
    await widget.onMarkAllRead();
    if (!mounted) return;
    setState(() {
      _items = [
        for (final notification in _items) notification.copyWith(unread: false),
      ];
    });
  }

  Future<void> _open(_RentalNotification notification) async {
    setState(() {
      _items = [
        for (final item in _items)
          item.id == notification.id ? item.copyWith(unread: false) : item,
      ];
    });
    await widget.onOpen(notification);
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount =
        _items.where((notification) => notification.unread).length;

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.42,
      maxChildSize: 0.92,
      builder: (context, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 10, 12),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppColors.orangeLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.notifications_active_rounded,
                        color: AppColors.orange,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Thông báo',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          Text(
                            unreadCount > 0
                                ? '$unreadCount thông báo mới cần chú ý'
                                : 'Các cập nhật mới nhất của đơn thuê',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _refreshing ? null : _refresh,
                      icon: _refreshing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.orange,
                              ),
                            )
                          : const Icon(Icons.refresh_rounded),
                    ),
                    IconButton(
                      onPressed: _items.isEmpty ? null : _markAllRead,
                      icon: const Icon(Icons.done_all_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _items.isEmpty
                    ? const _NotificationsEmptyState()
                    : ListView.separated(
                        controller: controller,
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 18),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final notification = _items[index];
                          return _NotificationTile(
                            notification: notification,
                            onTap: () => _open(notification),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationsEmptyState extends StatelessWidget {
  const _NotificationsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                color: AppColors.page,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                color: AppColors.muted,
                size: 34,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Chưa có thông báo mới',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            const Text(
              'Khi có đơn cần xác nhận, cần ký hợp đồng hoặc cần xử lý trạng thái thuê, thông báo sẽ xuất hiện ở đây.',
              style: TextStyle(color: AppColors.muted, height: 1.35),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });

  final _RentalNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = notification.color;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: notification.unread
                ? color.withValues(alpha: 0.07)
                : AppColors.page,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: notification.unread
                  ? color.withValues(alpha: 0.28)
                  : AppColors.line,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(notification.icon, color: color, size: 22),
                  ),
                  if (notification.unread)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: AppColors.orange,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _NotificationRolePill(label: notification.roleLabel),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      notification.body,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12.5,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.rental.itemName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.ink,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          notification.actionLabel,
                          style: TextStyle(
                            color: color,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded,
                            color: color, size: 18),
                      ],
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

class _NotificationRolePill extends StatelessWidget {
  const _NotificationRolePill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.line),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.muted,
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _UnreadChatButton extends StatelessWidget {
  const _UnreadChatButton({
    required this.target,
    required this.animation,
    required this.onTap,
  });

  final _UnreadChatTarget target;
  final Animation<double> animation;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final avatar = target.message.senderAvatar.isNotEmpty
        ? target.message.senderAvatar
        : target.rental.counterpartyAvatar;
    final name = target.message.senderName.isNotEmpty
        ? target.message.senderName
        : target.rental.counterpartyName;
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : '?';

    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) => Transform.translate(
        offset: Offset(0, animation.value),
        child: child,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.orange.withValues(alpha: 0.28),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        color: AppColors.orangeLight,
                        alignment: Alignment.center,
                        child: Text(
                          initial,
                          style: const TextStyle(
                            color: AppColors.orange,
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                          ),
                        ),
                      ),
                      if (avatar.isNotEmpty)
                        Image.network(
                          avatar,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                        ),
                    ],
                  ),
                ),
              ),
              Positioned(
                right: -1,
                top: -1,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: AppColors.orange,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
              Positioned(
                left: -2,
                bottom: -2,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: AppColors.orange,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(
                    Icons.chat_bubble_rounded,
                    color: Colors.white,
                    size: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
