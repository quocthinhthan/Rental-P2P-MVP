import 'dart:typed_data';
import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';

class AccountRepository {
  AccountRepository(this.api);

  final ApiClient api;

  Future<AppUser> updateProfile({
    required String fullName,
    required String phoneNumber,
    required String address,
    String? idCardNumber,
    String? avatarUrl,
  }) async {
    final body = <String, dynamic>{
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'address': address,
      if (idCardNumber != null && idCardNumber.isNotEmpty)
        'idCardNumber': idCardNumber,
      if (avatarUrl != null && avatarUrl.isNotEmpty) 'avatarUrl': avatarUrl,
    };
    final result = await api.put('/auth/profile', body);
    if (result is Map && result['user'] is Map) {
      return AppUser.fromJson(Map<String, dynamic>.from(result['user'] as Map));
    }
    return getMe();
  }

  Future<AppUser> getMe() async {
    final result = await api.get('/auth/me');
    return AppUser.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) {
    return api.patch('/auth/change-password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<String> uploadAvatar(Uint8List bytes, String filename) async {
    final result = await api.uploadFile(
      '/upload',
      fieldName: 'image',
      filename: filename,
      bytes: bytes,
    );
    return (result as Map)['imageUrl'].toString();
  }

  Future<List<dynamic>> getFavorites() async {
    final result = await api.get('/users/me/favorites');
    return result is List ? result : [];
  }

  Future<void> addFavorite(String itemId) {
    return api.post('/users/me/favorites/$itemId', {});
  }

  Future<void> removeFavorite(String itemId) {
    return api.delete('/users/me/favorites/$itemId');
  }

  Future<Map<String, dynamic>> getPublicProfile(String userId) async {
    final result = await api.get('/users/$userId/profile');
    return Map<String, dynamic>.from(result as Map);
  }

  Future<List<dynamic>> getUserReviews(String userId) async {
    final result = await api.get('/reviews/users/$userId?limit=100');
    if (result is Map && result['reviews'] is List) {
      return result['reviews'] as List<dynamic>;
    }
    return result is List ? result : [];
  }
}
