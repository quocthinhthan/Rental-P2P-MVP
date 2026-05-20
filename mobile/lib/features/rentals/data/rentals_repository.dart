import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';

class RentalsRepository {
  RentalsRepository(this.api);

  final ApiClient api;

  Future<MyRentalsView> getMyRentals() async {
    final result = await api.get('/views/my-rentals');
    return MyRentalsView.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<RentalDetail> getRentalDetail(String rentalId) async {
    // Use my-rentals view and find the specific rental (no single-rental endpoint)
    // Fall back to parsing from the list
    final result = await api.get('/views/my-rentals');
    final view = MyRentalsView.fromJson(Map<String, dynamic>.from(result as Map));

    // Find the rental by ID from either list
    final allRentals = [...view.asRenter, ...view.asOwner];
    final card = allRentals.firstWhere(
      (r) => r.id == rentalId,
      orElse: () => allRentals.first,
    );

    // Convert card to RentalDetail for detail page
    return RentalDetail(
      id: card.id,
      itemId: '',
      itemName: card.itemName,
      itemMainImage: card.itemMainImage,
      startDate: card.startDate,
      endDate: card.endDate,
      status: card.status,
      paymentStatus: card.paymentStatus,
      totalPrice: card.totalAmount,
      escrowAmount: card.escrowAmount,
      note: '',
      counterpartyName: card.counterpartyName,
      counterpartyId: '',
    );
  }

  Future<void> confirmRental(String rentalId) {
    return api.patch('/rentals/$rentalId/confirm', {});
  }

  Future<void> rejectRental(String rentalId) {
    return api.patch('/rentals/$rentalId/reject', {});
  }

  Future<String> createPaymentUrl(String rentalId) async {
    final result = await api.post('/rentals/$rentalId/create-vnpay-url', {'source': 'mobile'});
    return (result as Map)['paymentUrl'].toString();
  }

  Future<void> signContract(String rentalId, String signatureUrl) {
    return api.post('/rentals/$rentalId/sign-contract', {
      'signatureUrl': signatureUrl,
    });
  }

  Future<void> pickupRental(String rentalId, List<String> images) {
    return api.patch('/rentals/$rentalId/pickup', {
      'pickupImages': images,
    });
  }

  Future<void> completeRental(String rentalId, List<String> images) {
    return api.patch('/rentals/$rentalId/complete', {
      'returnImages': images,
    });
  }

  Future<List<ChatMessage>> getMessages(String rentalId) async {
    final result = await api.get('/rentals/$rentalId/messages');
    if (result is! List) return const [];
    return result
        .map((m) => ChatMessage.fromJson(Map<String, dynamic>.from(m as Map)))
        .toList();
  }

  Future<void> sendMessage(String rentalId, String content) {
    return api.post('/rentals/$rentalId/messages', {'content': content});
  }

  Future<void> createDispute({
    required String rentalId,
    required String reason,
    List<String> evidenceImages = const [],
  }) {
    return api.post('/disputes', {
      'rentalId': rentalId,
      'reason': reason,
      'evidenceImages': evidenceImages,
    });
  }
}
