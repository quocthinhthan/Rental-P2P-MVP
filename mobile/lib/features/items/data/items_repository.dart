import 'package:rental_p2p_mobile/core/network/api_client.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/rentals/data/rental_models.dart';

class ItemsRepository {
  ItemsRepository(this.api);

  final ApiClient api;

  Future<List<ItemSummary>> searchItems(String search, {String? category}) async {
    final result = await api.get('/items', query: {
      if (search.trim().isNotEmpty) 'search': search.trim(),
      if (category != null && category.isNotEmpty) 'category': category,
      'limit': '50',
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

  Future<void> createItem(CreateItemInput input) {
    return api.post('/items', input.toJson());
  }

  Future<void> updateItem(String itemId, CreateItemInput input) {
    return api.put('/items/$itemId', input.toJson());
  }

  Future<void> deleteItem(String itemId) {
    return api.delete('/items/$itemId');
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
    final result = await api.post('/rentals/$rentalId/create-vnpay-url', {});
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
}
