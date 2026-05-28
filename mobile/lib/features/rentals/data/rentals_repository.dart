import 'dart:typed_data';

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
    final result = await api.get('/rentals/$rentalId');
    return RentalDetail.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<void> confirmRental(String rentalId) {
    return api.patch('/rentals/$rentalId/confirm', {});
  }

  Future<void> rejectRental(String rentalId) {
    return api.patch('/rentals/$rentalId/reject', {});
  }

  Future<void> cancelRental(String rentalId) {
    return api.patch('/rentals/$rentalId/cancel', {});
  }

  Future<String> createPaymentUrl(String rentalId) async {
    final result = await api
        .post('/rentals/$rentalId/create-vnpay-url', {'source': 'mobile'});
    return (result as Map)['paymentUrl'].toString();
  }

  Future<void> signContract(String rentalId, String signatureUrl) {
    return api.post('/rentals/$rentalId/sign-contract', {
      'signatureUrl': signatureUrl,
    });
  }

  Future<RentalContractDetail> getRentalContract(String rentalId) async {
    final result = await api.get('/rentals/$rentalId/contract');
    return RentalContractDetail.fromJson(
        Map<String, dynamic>.from(result as Map));
  }

  Future<String> uploadSignatureImage(String rentalId, Uint8List bytes) async {
    return uploadImageBytes(
      filename: 'chu-ky-hop-dong-$rentalId.png',
      bytes: bytes,
    );
  }

  Future<String> uploadHandoverImage({
    required String rentalId,
    required String type,
    required int index,
    required Uint8List bytes,
  }) {
    return uploadImageBytes(
      filename: '$type-$rentalId-${index + 1}.jpg',
      bytes: bytes,
    );
  }

  Future<String> uploadImageBytes({
    required String filename,
    required Uint8List bytes,
  }) async {
    final result = await api.uploadFile(
      '/upload',
      fieldName: 'image',
      filename: filename,
      bytes: bytes,
    );
    return (result as Map)['imageUrl'].toString();
  }

  Future<void> pickupRental(
    String rentalId,
    List<String> images, {
    String? condition,
    String? accessories,
    String? notes,
  }) {
    return api.patch('/rentals/$rentalId/pickup', {
      'pickupImages': images,
      if (condition != null && condition.isNotEmpty) 'condition': condition,
      if (accessories != null && accessories.isNotEmpty)
        'accessories': accessories,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
  }

  Future<void> completeRental(
    String rentalId,
    List<String> images, {
    String? condition,
    String? accessories,
    String? notes,
    String? damages,
  }) {
    return api.patch('/rentals/$rentalId/complete', {
      'returnImages': images,
      if (condition != null && condition.isNotEmpty) 'condition': condition,
      if (accessories != null && accessories.isNotEmpty)
        'accessories': accessories,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (damages != null && damages.isNotEmpty) 'damages': damages,
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

  Future<void> withdrawDispute(String disputeId) {
    return api.patch('/disputes/$disputeId/withdraw', {});
  }

  Future<void> escalateDispute(String disputeId) {
    return api.patch('/disputes/$disputeId/escalate', {});
  }

  Future<void> createReview({
    required String rentalId,
    required String revieweeId,
    required int rating,
    String comment = '',
  }) {
    return api.post('/reviews', {
      'rentalId': rentalId,
      'revieweeId': revieweeId,
      'rating': rating,
      if (comment.isNotEmpty) 'comment': comment,
    });
  }
}
