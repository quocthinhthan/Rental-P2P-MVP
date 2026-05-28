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
    this.averageRating = 0.0,
    this.totalReviews = 0,
  });

  final String id;
  final String name;
  final String category;
  final String address;
  final num pricePerDay;
  final String status;
  final String mainImage;
  final double averageRating;
  final int totalReviews;

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
      averageRating:
          (json['averageRating'] is num ? json['averageRating'] as num : 0)
              .toDouble(),
      totalReviews: (json['totalReviews'] as num?)?.toInt() ?? 0,
    );
  }
}

class BookedDate {
  const BookedDate({required this.startDate, required this.endDate});
  final String startDate;
  final String endDate;

  factory BookedDate.fromJson(Map<String, dynamic> json) {
    return BookedDate(
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
    );
  }

  bool containsDate(DateTime date) {
    try {
      final start = DateTime.parse(startDate);
      final end = DateTime.parse(endDate);
      final d = DateTime(date.year, date.month, date.day);
      return !d.isBefore(DateTime(start.year, start.month, start.day)) &&
          !d.isAfter(DateTime(end.year, end.month, end.day));
    } catch (_) {
      return false;
    }
  }
}

class BlockedDate {
  const BlockedDate({
    required this.id,
    required this.startDate,
    required this.endDate,
    this.reason = '',
  });
  final String id;
  final String startDate;
  final String endDate;
  final String reason;

  factory BlockedDate.fromJson(Map<String, dynamic> json) {
    return BlockedDate(
      id: textOf(json['_id'] ?? json['id']),
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
      reason: textOf(json['reason']),
    );
  }

  bool containsDate(DateTime date) {
    try {
      final start = DateTime.parse(startDate);
      final end = DateTime.parse(endDate);
      final d = DateTime(date.year, date.month, date.day);
      return !d.isBefore(DateTime(start.year, start.month, start.day)) &&
          !d.isAfter(DateTime(end.year, end.month, end.day));
    } catch (_) {
      return false;
    }
  }
}

class OwnerSummary {
  const OwnerSummary({
    required this.id,
    required this.fullName,
    this.avatarUrl = '',
    this.trustScore = 0,
    this.averageRating = 0.0,
    this.totalReviews = 0,
    this.ekycStatus = 'unverified',
  });
  final String id;
  final String fullName;
  final String avatarUrl;
  final num trustScore;
  final double averageRating;
  final int totalReviews;
  final String ekycStatus;

  factory OwnerSummary.fromJson(Map<String, dynamic> json) {
    return OwnerSummary(
      id: textOf(json['_id'] ?? json['id']),
      fullName: textOf(json['fullName']),
      avatarUrl: textOf(json['avatarUrl']),
      trustScore: json['trustScore'] is num ? json['trustScore'] as num : 0,
      averageRating:
          (json['averageRating'] is num ? json['averageRating'] as num : 0)
              .toDouble(),
      totalReviews: (json['totalReviews'] as num?)?.toInt() ?? 0,
      ekycStatus: textOf(json['ekycStatus']).isEmpty
          ? 'unverified'
          : textOf(json['ekycStatus']),
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
    required this.baseValue,
    required this.depositPercentage,
    required this.address,
    required this.owner,
    this.lat = 0.0,
    this.lng = 0.0,
    this.bookedDates = const [],
    this.blockedDates = const [],
    this.isFavorited = false,
    this.averageRating = 0.0,
    this.totalReviews = 0,
  });

  final String id;
  final String name;
  final String description;
  final String category;
  final String status;
  final List<String> images;
  final num pricePerDay;
  final num baseValue;
  final num depositPercentage;
  final String address;
  final OwnerSummary owner;
  final double lat;
  final double lng;
  final List<BookedDate> bookedDates;
  final List<BlockedDate> blockedDates;
  final bool isFavorited;
  final double averageRating;
  final int totalReviews;

  // Backwards compat
  String get ownerName => owner.fullName;

  bool isDateBlocked(DateTime date) {
    for (final b in bookedDates) {
      if (b.containsDate(date)) return true;
    }
    for (final b in blockedDates) {
      if (b.containsDate(date)) return true;
    }
    return false;
  }

  factory ItemDetail.fromJson(Map<String, dynamic> json) {
    final ownerJson = json['owner'] is Map
        ? Map<String, dynamic>.from(json['owner'] as Map)
        : <String, dynamic>{};
    num parseNum(dynamic v) =>
        v is num ? v : num.tryParse(v?.toString() ?? '') ?? 0;

    return ItemDetail(
      id: textOf(json['_id']),
      name: textOf(json['name']),
      description: textOf(json['description']),
      category: textOf(json['category']),
      status: textOf(json['status']),
      images: ((json['images'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(),
      pricePerDay: parseNum(json['pricePerDay']),
      baseValue: parseNum(json['baseValue']),
      depositPercentage: parseNum(json['depositPercentage']),
      address: textOf(json['address']),
      owner: OwnerSummary.fromJson(ownerJson),
      lat: parseNum(json['lat']).toDouble(),
      lng: parseNum(json['lng']).toDouble(),
      bookedDates: ((json['bookedDates'] as List?) ?? const [])
          .map((e) => BookedDate.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      blockedDates: ((json['blockedDates'] as List?) ?? const [])
          .map((e) =>
              BlockedDate.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      isFavorited: json['isFavorited'] == true,
      averageRating: parseNum(json['averageRating']).toDouble(),
      totalReviews: (json['totalReviews'] as num?)?.toInt() ?? 0,
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
