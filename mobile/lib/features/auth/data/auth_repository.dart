import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';

class AuthRepository {
  AuthRepository(this.api);

  final ApiClient api;

  Future<void> register({
    required String fullName,
    required String email,
    required String phoneNumber,
    required String password,
  }) {
    return api.post('/auth/register', {
      'fullName': fullName,
      'email': email,
      'phoneNumber': phoneNumber,
      'password': password,
    });
  }

  Future<UserSession> login({
    required String email,
    required String password,
  }) async {
    final result = await api.post('/auth/login', {
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;

    return UserSession(
      token: result['token'].toString(),
      user: AppUser.fromJson(Map<String, dynamic>.from(result['user'] as Map)),
    );
  }
}

class UserSession {
  const UserSession({required this.token, required this.user});

  final String token;
  final AppUser user;
}

class AppUser {
  const AppUser({
    required this.id,
    required this.fullName,
    required this.email,
    this.phoneNumber = '',
    this.address = '',
    this.avatarUrl = '',
    this.role = 'user',
    this.ekycStatus = 'unverified',
  });

  final String id;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String address;
  final String avatarUrl;
  final String role;
  final String ekycStatus;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: textOf(json['_id'] ?? json['id']),
      fullName: textOf(json['fullName']),
      email: textOf(json['email']),
      phoneNumber: textOf(json['phoneNumber']),
      address: textOf(json['address']),
      avatarUrl: textOf(json['avatarUrl']),
      role: textOf(json['role']).isEmpty ? 'user' : textOf(json['role']),
      ekycStatus: textOf(json['ekycStatus']).isEmpty
          ? 'unverified'
          : textOf(json['ekycStatus']),
    );
  }
}
