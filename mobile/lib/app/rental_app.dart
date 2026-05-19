import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/app/home_shell.dart';
import 'package:rental_p2p_mobile/core/config/app_config.dart';
import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';
import 'package:rental_p2p_mobile/features/auth/presentation/auth_page.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rentals_repository.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';

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

  @override
  void initState() {
    super.initState();
    apiClient = ApiClient(AppConfig.apiBaseUrl);
    authRepository = AuthRepository(apiClient);
    accountRepository = AccountRepository(apiClient);
    itemsRepository = ItemsRepository(apiClient);
    rentalsRepository = RentalsRepository(apiClient);
  }

  void signedIn(UserSession nextSession) {
    setState(() {
      apiClient.token = nextSession.token;
      session = nextSession;
    });
  }

  void updateUser(AppUser user) {
    setState(() {
      final current = session;
      if (current != null) {
        session = UserSession(token: current.token, user: user);
      }
    });
  }

  void signOut() {
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
      home: session == null
          ? AuthPage(
              repository: authRepository,
              apiBaseUrl: apiClient.baseUrl,
              onSignedIn: signedIn,
            )
          : HomeShell(
              user: session!.user,
              accountRepository: accountRepository,
              itemsRepository: itemsRepository,
              rentalsRepository: rentalsRepository,
              onUserChanged: updateUser,
              onSignOut: signOut,
            ),
    );
  }
}
