import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rental_p2p_mobile/app/home_shell.dart';
import 'package:rental_p2p_mobile/core/config/app_config.dart';
import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';
import 'package:rental_p2p_mobile/features/auth/presentation/auth_page.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';

const _kTokenKey = 'auth_token';

class RentalApp extends StatefulWidget {
  const RentalApp({super.key});

  @override
  State<RentalApp> createState() => _RentalAppState();
}

class _RentalAppState extends State<RentalApp> {
  late final ApiClient apiClient;
  late final AuthRepository authRepository;
  late final AccountRepository accountRepository;
  late final ItemsRepository itemsRepository;
  late final RentalsRepository rentalsRepository;

  UserSession? session;
  bool _bootstrapping = true;

  @override
  void initState() {
    super.initState();
    apiClient = ApiClient(AppConfig.apiBaseUrl);
    authRepository = AuthRepository(apiClient);
    accountRepository = AccountRepository(apiClient);
    itemsRepository = ItemsRepository(apiClient);
    rentalsRepository = RentalsRepository(apiClient);
    _bootstrap();
  }

  /// Try to restore session from saved token.
  Future<void> _bootstrap() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(_kTokenKey);
      if (token != null && token.isNotEmpty) {
        apiClient.token = token;
        final user = await authRepository.getMe();
        if (!mounted) return;
        setState(() {
          session = UserSession(token: token, user: user);
        });
      }
    } catch (_) {
      // Token invalid or expired, stay on auth page
      apiClient.token = null;
    } finally {
      if (mounted) setState(() => _bootstrapping = false);
    }
  }

  Future<void> _signedIn(UserSession nextSession) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kTokenKey, nextSession.token);
    apiClient.token = nextSession.token;

    var user = nextSession.user;
    try {
      user = await authRepository.getMe();
    } catch (_) {
      // Keep the login session even if the profile refresh is temporarily unavailable.
    }

    if (!mounted) return;
    setState(() {
      session = UserSession(token: nextSession.token, user: user);
    });
  }

  void _updateUser(AppUser user) {
    setState(() {
      final current = session;
      if (current != null) {
        session = UserSession(token: current.token, user: user);
      }
    });
  }

  Future<void> _signOut() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kTokenKey);
    setState(() {
      apiClient.token = null;
      session = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rental P2P',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: _bootstrapping
          ? const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            )
          : session == null
              ? AuthPage(
                  repository: authRepository,
                  onSignedIn: _signedIn,
                )
              : HomeShell(
                  user: session!.user,
                  authRepository: authRepository,
                  accountRepository: accountRepository,
                  itemsRepository: itemsRepository,
                  rentalsRepository: rentalsRepository,
                  onUserChanged: _updateUser,
                  onSignOut: _signOut,
                ),
    );
  }
}
