import 'dart:typed_data';
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

  Future<AppUser> getMe() async {
    final result = await api.get('/auth/me');
    return AppUser.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<void> forgotPassword(String email) {
    return api.post('/auth/forgot-password', {'email': email});
  }

  Future<AppUser> verifyEkyc({
    required Uint8List frontBytes,
    String frontFilename = 'cccd-mat-truoc.jpg',
    Uint8List? backBytes,
    String backFilename = 'cccd-mat-sau.jpg',
  }) async {
    // Upload front image
    final frontResult = await api.uploadFile(
      '/upload',
      fieldName: 'image',
      filename: frontFilename,
      bytes: frontBytes,
    );
    final frontUrl = (frontResult as Map)['imageUrl'].toString();

    String? backUrl;
    if (backBytes != null) {
      final backResult = await api.uploadFile(
        '/upload',
        fieldName: 'image',
        filename: backFilename,
        bytes: backBytes,
      );
      backUrl = (backResult as Map)['imageUrl'].toString();
    }

    final body = <String, dynamic>{
      'idCardFrontUrl': frontUrl,
      if (backUrl != null) 'idCardBackUrl': backUrl,
    };

    final result = await api.post('/auth/verify-ekyc', body);
    if (result is Map && result['user'] is Map) {
      return AppUser.fromJson(Map<String, dynamic>.from(result['user'] as Map));
    }
    // fallback: return current me
    return getMe();
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
    this.trustScore = 0,
    this.averageRating = 0.0,
    this.totalReviews = 0,
  });

  final String id;
  final String fullName;
  final String email;
  final String phoneNumber;
  final String address;
  final String avatarUrl;
  final String role;
  final String ekycStatus;
  final num trustScore;
  final double averageRating;
  final int totalReviews;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    num parseNum(dynamic v) =>
        v is num ? v : num.tryParse(v?.toString() ?? '') ?? 0;
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
      trustScore: parseNum(json['trustScore']),
      averageRating: (parseNum(json['averageRating'])).toDouble(),
      totalReviews: (json['totalReviews'] as num?)?.toInt() ?? 0,
    );
  }
}
