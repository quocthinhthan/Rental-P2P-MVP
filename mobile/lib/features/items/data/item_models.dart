import 'package:rental_p2p_mobile/core/utils/formatters.dart';

class ItemSummary {
  const ItemSummary({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    required this.pricePerDay,
    required this.status,
    required this.mainImage,
  });

  final String id;
  final String name;
  final String category;
  final String address;
  final num pricePerDay;
  final String status;
  final String mainImage;

  factory ItemSummary.fromJson(Map<String, dynamic> json) {
    return ItemSummary(
      id: textOf(json['_id']),
      name: textOf(json['name']),
      category: textOf(json['category']),
      address: textOf(json['address']),
      pricePerDay: json['pricePerDay'] is num
          ? json['pricePerDay'] as num
          : num.tryParse(textOf(json['pricePerDay'])) ?? 0,
      status: textOf(json['status']),
      mainImage: textOf(json['mainImage']),
    );
  }
}

class ItemDetail {
  const ItemDetail({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.status,
    required this.images,
    required this.pricePerDay,
    required this.address,
    required this.ownerName,
  });

  final String id;
  final String name;
  final String description;
  final String category;
  final String status;
  final List<String> images;
  final num pricePerDay;
  final String address;
  final String ownerName;

  factory ItemDetail.fromJson(Map<String, dynamic> json) {
    final owner = json['owner'] is Map
        ? Map<String, dynamic>.from(json['owner'] as Map)
        : <String, dynamic>{};
    return ItemDetail(
      id: textOf(json['_id']),
      name: textOf(json['name']),
      description: textOf(json['description']),
      category: textOf(json['category']),
      status: textOf(json['status']),
      images: ((json['images'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(),
      pricePerDay: json['pricePerDay'] is num
          ? json['pricePerDay'] as num
          : num.tryParse(textOf(json['pricePerDay'])) ?? 0,
      address: textOf(json['address']),
      ownerName: textOf(owner['fullName']),
    );
  }
}

class CreateItemInput {
  const CreateItemInput({
    required this.name,
    required this.description,
    required this.category,
    required this.pricePerDay,
    required this.baseValue,
    required this.depositPercentage,
    required this.address,
    required this.images,
    required this.lat,
    required this.lng,
  });

  final String name;
  final String description;
  final String category;
  final num pricePerDay;
  final num baseValue;
  final num depositPercentage;
  final String address;
  final List<String> images;
  final num lat;
  final num lng;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'description': description,
      'category': category,
      'pricePerDay': pricePerDay,
      'baseValue': baseValue,
      'depositPercentage': depositPercentage,
      'address': address,
      'images': images,
      'lat': lat,
      'lng': lng,
    };
  }
}

class AiPriceSuggestion {
  const AiPriceSuggestion({
    required this.ruleBasedPrice,
    required this.aiSuggestedPrice,
    required this.finalSuggestion,
    required this.aiReasoning,
    required this.marketContext,
  });

  final num ruleBasedPrice;
  final num aiSuggestedPrice;
  final num finalSuggestion;
  final String aiReasoning;
  final String marketContext;

  factory AiPriceSuggestion.fromJson(Map<String, dynamic> json) {
    num parseNum(dynamic v) =>
        v is num ? v : num.tryParse(v?.toString() ?? '') ?? 0;
    return AiPriceSuggestion(
      ruleBasedPrice: parseNum(json['ruleBasedPrice']),
      aiSuggestedPrice: parseNum(json['aiSuggestedPrice']),
      finalSuggestion: parseNum(json['finalSuggestion']),
      aiReasoning: json['aiReasoning']?.toString() ?? '',
      marketContext: json['marketContext']?.toString() ?? '',
    );
  }
}

