import 'package:rental_p2p_mobile/core/utils/formatters.dart';

class RentalRequestResult {
  const RentalRequestResult({required this.id, required this.status});

  final String id;
  final String status;

  factory RentalRequestResult.fromJson(Map<String, dynamic> json) {
    return RentalRequestResult(
      id: textOf(json['_id']),
      status: textOf(json['status']),
    );
  }
}

// Full rental detail (returned by GET /rentals/:id or within views)
class RentalDetail {
  const RentalDetail({
    required this.id,
    required this.itemId,
    required this.itemName,
    required this.itemMainImage,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.paymentStatus,
    required this.totalPrice,
    required this.escrowAmount,
    required this.note,
    required this.counterpartyName,
    required this.counterpartyId,
  });

  final String id;
  final String itemId;
  final String itemName;
  final String itemMainImage;
  final String startDate;
  final String endDate;
  final String status;
  final String paymentStatus;
  final num totalPrice;
  final num escrowAmount;
  final String note;
  final String counterpartyName;
  final String counterpartyId;

  factory RentalDetail.fromJson(Map<String, dynamic> json) {
    final item = json['item'] is Map
        ? Map<String, dynamic>.from(json['item'] as Map)
        : <String, dynamic>{};
    final counterparty = json['counterparty'] is Map
        ? Map<String, dynamic>.from(json['counterparty'] as Map)
        : <String, dynamic>{};

    return RentalDetail(
      id: textOf(json['_id']),
      itemId: textOf(item['_id'].toString().isEmpty ? json['itemId'] : item['_id']),
      itemName: textOf(item['name']).isEmpty ? 'Đồ đã bị xóa' : textOf(item['name']),
      itemMainImage: textOf(item['mainImage']),
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
      status: textOf(json['status']),
      paymentStatus: textOf(json['paymentStatus']),
      totalPrice: json['totalPrice'] is num
          ? json['totalPrice'] as num
          : num.tryParse(textOf(json['totalPrice'])) ?? 0,
      escrowAmount: json['escrowAmount'] is num
          ? json['escrowAmount'] as num
          : num.tryParse(textOf(json['escrowAmount'])) ?? 0,
      note: textOf(json['note']),
      counterpartyName: textOf(counterparty['fullName']),
      counterpartyId: textOf(counterparty['_id']),
    );
  }
}

class MyRentalsView {
  const MyRentalsView({
    required this.asRenter,
    required this.asOwner,
    required this.myItems,
  });

  final List<RentalCardData> asRenter;
  final List<RentalCardData> asOwner;
  final List<MyItemData> myItems;

  factory MyRentalsView.fromJson(Map<String, dynamic> json) {
    return MyRentalsView(
      asRenter: ((json['asRenter'] as List?) ?? const [])
          .map((item) =>
              RentalCardData.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      asOwner: ((json['asOwner'] as List?) ?? const [])
          .map((item) =>
              RentalCardData.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
      myItems: ((json['myItems'] as List?) ?? const [])
          .map((item) =>
              MyItemData.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(),
    );
  }
}

class RentalCardData {
  const RentalCardData({
    required this.id,
    required this.itemName,
    required this.itemMainImage,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.escrowAmount,
    required this.counterpartyName,
  });

  final String id;
  final String itemName;
  final String itemMainImage;
  final String startDate;
  final String endDate;
  final String status;
  final String paymentStatus;
  final num totalAmount;
  final num escrowAmount;
  final String counterpartyName;

  factory RentalCardData.fromJson(Map<String, dynamic> json) {
    final item = json['item'] is Map
        ? Map<String, dynamic>.from(json['item'] as Map)
        : <String, dynamic>{};
    final counterparty = json['counterparty'] is Map
        ? Map<String, dynamic>.from(json['counterparty'] as Map)
        : <String, dynamic>{};

    // API returns totalPrice (swagger spec)
    final total = json['totalPrice'] ?? json['totalAmount'];

    return RentalCardData(
      id: textOf(json['_id']),
      itemName:
          textOf(item['name']).isEmpty ? 'Đồ đã bị xóa' : textOf(item['name']),
      itemMainImage: textOf(item['mainImage']),
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
      status: textOf(json['status']),
      paymentStatus: textOf(json['paymentStatus']),
      totalAmount: total is num
          ? total
          : num.tryParse(textOf(total)) ?? 0,
      escrowAmount: json['escrowAmount'] is num
          ? json['escrowAmount'] as num
          : num.tryParse(textOf(json['escrowAmount'])) ?? 0,
      counterpartyName: textOf(counterparty['fullName']),
    );
  }
}

class MyItemData {
  const MyItemData({
    required this.id,
    required this.name,
    required this.pricePerDay,
    required this.status,
  });

  final String id;
  final String name;
  final num pricePerDay;
  final String status;

  factory MyItemData.fromJson(Map<String, dynamic> json) {
    return MyItemData(
      id: textOf(json['_id']),
      name: textOf(json['name']),
      pricePerDay: json['pricePerDay'] is num
          ? json['pricePerDay'] as num
          : num.tryParse(textOf(json['pricePerDay'])) ?? 0,
      status: textOf(json['status']),
    );
  }
}

// Chat message model
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String senderId;
  final String senderName;
  final String content;
  final String createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] is Map
        ? Map<String, dynamic>.from(json['sender'] as Map)
        : <String, dynamic>{};
    return ChatMessage(
      id: textOf(json['_id']),
      senderId: textOf(sender['_id'].toString().isEmpty ? json['senderId'] : sender['_id']),
      senderName: textOf(sender['fullName']),
      content: textOf(json['content']),
      createdAt: textOf(json['createdAt']),
    );
  }
}
