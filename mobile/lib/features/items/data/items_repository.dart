import 'dart:typed_data';
import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';

class ItemsRepository {
  ItemsRepository(this.api);

  final ApiClient api;

  Future<List<ItemSummary>> searchItems(
    String search, {
    String? category,
    int page = 1,
    int limit = 16,
  }) async {
    final result = await api.get('/items', query: {
      if (search.trim().isNotEmpty) 'search': search.trim(),
      if (category != null && category.isNotEmpty) 'category': category,
      'page': page.toString(),
      'limit': limit.toString(),
    }) as List<dynamic>;

    return result
        .map((item) =>
            ItemSummary.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<ItemDetail> getItemDetail(String itemId) async {
    final result = await api.get('/views/item-details/$itemId');
    return ItemDetail.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<List<String>> getCategories() async {
    try {
      final result = await api.get('/items/categories');
      if (result is List) {
        return result.map((e) => e.toString()).toList();
      }
    } catch (_) {}
    return const [
      'Công nghệ',
      'Du lịch',
      'Thể thao',
      'Thời trang',
      'Âm nhạc',
      'Khác',
    ];
  }

  Future<List<ItemSummary>> getBestsellers() async {
    try {
      final result = await api.get('/items/bestsellers') as List<dynamic>;
      return result
          .map((item) =>
              ItemSummary.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> createItem(CreateItemInput input) {
    return api.post('/items', input.toJson());
  }

  Future<void> updateItem(String itemId, CreateItemInput input) {
    return api.put('/items/$itemId', input.toJson());
  }

  Future<void> deleteItem(String itemId) {
    return api.delete('/items/$itemId');
  }

  Future<String> uploadItemImage(Uint8List bytes, String filename) async {
    final result = await api.uploadFile(
      '/upload',
      fieldName: 'image',
      filename: filename,
      bytes: bytes,
    );
    return (result as Map)['imageUrl'].toString();
  }

  Future<RentalRequestResult> createRentalRequest({
    required String itemId,
    required String startDate,
    required String endDate,
    String note = '',
  }) async {
    final result = await api.post('/rentals', {
      'itemId': itemId,
      'startDate': startDate,
      'endDate': endDate,
      if (note.isNotEmpty) 'note': note,
    });

    return RentalRequestResult.fromJson(
        Map<String, dynamic>.from(result as Map));
  }

  Future<String> createPaymentUrl(String rentalId) async {
    final result =
        await api.post('/rentals/$rentalId/create-vnpay-url', {'source': 'mobile'});
    return (result as Map)['paymentUrl'].toString();
  }

  Future<AiPriceSuggestion> suggestPrice({
    required String name,
    required num baseValue,
    String category = '',
    String description = '',
  }) async {
    final result = await api.post('/items/suggest-price', {
      'name': name,
      'baseValue': baseValue,
      if (category.isNotEmpty) 'category': category,
      if (description.isNotEmpty) 'description': description,
    });
    return AiPriceSuggestion.fromJson(Map<String, dynamic>.from(result as Map));
  }

  Future<void> reportItem({
    required String itemId,
    required String description,
    List<String> evidenceImages = const [],
  }) {
    return api.post('/items/$itemId/report', {
      'description': description,
      if (evidenceImages.isNotEmpty) 'evidenceImages': evidenceImages,
    });
  }

  Future<BlockedDate> addBlockedDate({
    required String itemId,
    required String startDate,
    required String endDate,
    String? reason,
  }) async {
    final result = await api.post('/items/$itemId/blocked-dates', {
      'startDate': startDate,
      'endDate': endDate,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    // Backend returns updated item or the blockEntry
    if (result is Map) {
      final blockedDates = result['blockedDates'];
      if (blockedDates is List && blockedDates.isNotEmpty) {
        return BlockedDate.fromJson(
            Map<String, dynamic>.from(blockedDates.last as Map));
      }
    }
    return BlockedDate(
      id: '',
      startDate: startDate,
      endDate: endDate,
      reason: reason ?? '',
    );
  }

  Future<void> deleteBlockedDate(String itemId, String blockId) {
    return api.delete('/items/$itemId/blocked-dates/$blockId');
  }
}
