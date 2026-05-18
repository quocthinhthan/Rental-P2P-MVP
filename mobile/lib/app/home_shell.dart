import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/account/presentation/account_page.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/items/presentation/items_page.dart';
import 'package:rental_p2p_mobile/features/items/presentation/post_item_page.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/presentation/my_rentals_page.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.user,
    required this.accountRepository,
    required this.itemsRepository,
    required this.rentalsRepository,
    required this.onUserChanged,
    required this.onSignOut,
  });

  final AppUser user;
  final AccountRepository accountRepository;
  final ItemsRepository itemsRepository;
  final RentalsRepository rentalsRepository;
  final ValueChanged<AppUser> onUserChanged;
  final VoidCallback onSignOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      ItemsPage(
        repository: widget.itemsRepository,
        rentalsRepository: widget.rentalsRepository,
        currentUserId: widget.user.id,
      ),
      MyRentalsPage(
        repository: widget.rentalsRepository,
        itemsRepository: widget.itemsRepository,
        currentUserId: widget.user.id,
      ),
      PostItemPage(repository: widget.itemsRepository),
      AccountPage(
        repository: widget.accountRepository,
        user: widget.user,
        onUserChanged: widget.onUserChanged,
        onSignOut: widget.onSignOut,
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: index, children: pages),
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
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
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
