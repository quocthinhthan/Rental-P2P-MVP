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
  }) async {
    final result = await api.put('/auth/profile', {
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'address': address,
      if (idCardNumber != null && idCardNumber.isNotEmpty)
        'idCardNumber': idCardNumber,
    });

    return AppUser.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<AppUser> getMe() async {
    final result = await api.get('/auth/me');
    return AppUser.fromJson(Map<String, dynamic>.from(result as Map));
  }
}
