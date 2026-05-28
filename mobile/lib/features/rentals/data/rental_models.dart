import 'package:rental_p2p_mobile/core/utils/formatters.dart';

String _idOf(dynamic value) {
  if (value is Map) return textOf(value['_id']);
  return textOf(value);
}

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
    this.counterpartyAvatar = '',
    this.ownerId = '',
    this.renterId = '',
    this.contract,
    this.dispute,
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
  final String counterpartyAvatar;
  final String ownerId;
  final String renterId;
  final RentalContractData? contract;
  final RentalDisputeData? dispute;

  /// Convert to RentalCardData for use in RentalDetailPage.
  RentalCardData toCard() {
    return RentalCardData(
      id: id,
      contractId: contract?.id ?? '',
      contract: contract,
      isFullySigned: contract?.isFullySigned ?? false,
      itemName: itemName,
      itemMainImage: itemMainImage,
      startDate: startDate,
      endDate: endDate,
      status: status,
      paymentStatus: paymentStatus,
      totalAmount: totalPrice,
      escrowAmount: escrowAmount,
      counterpartyName: counterpartyName,
      counterpartyAvatar: counterpartyAvatar,
      dispute: dispute,
      createdAt: '',
      updatedAt: '',
      ownerId: ownerId,
      renterId: renterId,
    );
  }

  factory RentalDetail.fromJson(Map<String, dynamic> json) {
    final item = json['item'] is Map
        ? Map<String, dynamic>.from(json['item'] as Map)
        : <String, dynamic>{};
    final counterparty = json['counterparty'] is Map
        ? Map<String, dynamic>.from(json['counterparty'] as Map)
        : <String, dynamic>{};
    final escrow = json['escrowAmount'] ?? json['depositAmount'];
    final contractJson = json['contract'] is Map
        ? Map<String, dynamic>.from(json['contract'] as Map)
        : null;
    final disputeJson = json['dispute'] is Map
        ? Map<String, dynamic>.from(json['dispute'] as Map)
        : null;

    return RentalDetail(
      id: textOf(json['_id']),
      itemId:
          textOf(item['_id'].toString().isEmpty ? json['itemId'] : item['_id']),
      itemName:
          textOf(item['name']).isEmpty ? 'Đồ đã bị xóa' : textOf(item['name']),
      itemMainImage: textOf(item['mainImage']),
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
      status: textOf(json['status']),
      paymentStatus: textOf(json['paymentStatus']),
      totalPrice: json['totalPrice'] is num
          ? json['totalPrice'] as num
          : num.tryParse(textOf(json['totalPrice'])) ?? 0,
      escrowAmount: escrow is num ? escrow : num.tryParse(textOf(escrow)) ?? 0,
      note: textOf(json['note']),
      counterpartyName: textOf(counterparty['fullName']),
      counterpartyId: textOf(counterparty['_id']),
      counterpartyAvatar: textOf(counterparty['avatarUrl']),
      ownerId: _idOf(json['ownerId']),
      renterId: _idOf(json['renterId']),
      contract: contractJson == null
          ? null
          : RentalContractData.fromJson(contractJson),
      dispute:
          disputeJson == null ? null : RentalDisputeData.fromJson(disputeJson),
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

class RentalContractData {
  const RentalContractData({
    required this.id,
    required this.ownerSignedAt,
    required this.renterSignedAt,
    required this.ownerSignatureUrl,
    required this.renterSignatureUrl,
    required this.isFullySigned,
  });

  final String id;
  final String ownerSignedAt;
  final String renterSignedAt;
  final String ownerSignatureUrl;
  final String renterSignatureUrl;
  final bool isFullySigned;

  bool get ownerHasSigned =>
      ownerSignedAt.isNotEmpty || ownerSignatureUrl.isNotEmpty;
  bool get renterHasSigned =>
      renterSignedAt.isNotEmpty || renterSignatureUrl.isNotEmpty;

  factory RentalContractData.fromJson(Map<String, dynamic> json) {
    return RentalContractData(
      id: textOf(json['_id']),
      ownerSignedAt: textOf(json['ownerSignedAt']),
      renterSignedAt: textOf(json['renterSignedAt']),
      ownerSignatureUrl: textOf(json['ownerSignatureUrl']),
      renterSignatureUrl: textOf(json['renterSignatureUrl']),
      isFullySigned: json['isFullySigned'] == true,
    );
  }
}

class ContractPartyInfo {
  const ContractPartyInfo({
    required this.userId,
    required this.fullName,
    required this.idCardNumber,
  });

  final String userId;
  final String fullName;
  final String idCardNumber;

  factory ContractPartyInfo.fromJson(Map<String, dynamic> json) {
    return ContractPartyInfo(
      userId: textOf(json['userId']),
      fullName: textOf(json['fullName']),
      idCardNumber: textOf(json['idCardNumber']),
    );
  }
}

class ContractItemInfo {
  const ContractItemInfo({
    required this.itemId,
    required this.name,
    required this.pricePerDay,
  });

  final String itemId;
  final String name;
  final num pricePerDay;

  factory ContractItemInfo.fromJson(Map<String, dynamic> json) {
    return ContractItemInfo(
      itemId: textOf(json['itemId']),
      name: textOf(json['name']),
      pricePerDay: json['pricePerDay'] is num
          ? json['pricePerDay'] as num
          : num.tryParse(textOf(json['pricePerDay'])) ?? 0,
    );
  }
}

class ContractRentalPeriod {
  const ContractRentalPeriod({
    required this.startDate,
    required this.endDate,
  });

  final String startDate;
  final String endDate;

  factory ContractRentalPeriod.fromJson(Map<String, dynamic> json) {
    return ContractRentalPeriod(
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
    );
  }
}

class RentalContractDetail {
  const RentalContractDetail({
    required this.id,
    required this.rentalId,
    required this.ownerInfo,
    required this.renterInfo,
    required this.itemInfo,
    required this.rentalPeriod,
    required this.totalPrice,
    required this.terms,
    required this.ownerSignedAt,
    required this.ownerSignatureUrl,
    required this.renterSignedAt,
    required this.renterSignatureUrl,
    required this.isFullySigned,
    required this.createdAt,
  });

  final String id;
  final String rentalId;
  final ContractPartyInfo ownerInfo;
  final ContractPartyInfo renterInfo;
  final ContractItemInfo itemInfo;
  final ContractRentalPeriod rentalPeriod;
  final num totalPrice;
  final String terms;
  final String ownerSignedAt;
  final String ownerSignatureUrl;
  final String renterSignedAt;
  final String renterSignatureUrl;
  final bool isFullySigned;
  final String createdAt;

  bool get ownerHasSigned =>
      ownerSignedAt.isNotEmpty || ownerSignatureUrl.isNotEmpty;
  bool get renterHasSigned =>
      renterSignedAt.isNotEmpty || renterSignatureUrl.isNotEmpty;

  factory RentalContractDetail.fromJson(Map<String, dynamic> json) {
    final ownerInfo = json['ownerInfo'] is Map
        ? Map<String, dynamic>.from(json['ownerInfo'] as Map)
        : <String, dynamic>{};
    final renterInfo = json['renterInfo'] is Map
        ? Map<String, dynamic>.from(json['renterInfo'] as Map)
        : <String, dynamic>{};
    final itemInfo = json['itemInfo'] is Map
        ? Map<String, dynamic>.from(json['itemInfo'] as Map)
        : <String, dynamic>{};
    final rentalPeriod = json['rentalPeriod'] is Map
        ? Map<String, dynamic>.from(json['rentalPeriod'] as Map)
        : <String, dynamic>{};

    return RentalContractDetail(
      id: textOf(json['_id']),
      rentalId: textOf(json['rentalId']),
      ownerInfo: ContractPartyInfo.fromJson(ownerInfo),
      renterInfo: ContractPartyInfo.fromJson(renterInfo),
      itemInfo: ContractItemInfo.fromJson(itemInfo),
      rentalPeriod: ContractRentalPeriod.fromJson(rentalPeriod),
      totalPrice: json['totalPrice'] is num
          ? json['totalPrice'] as num
          : num.tryParse(textOf(json['totalPrice'])) ?? 0,
      terms: textOf(json['terms']).isEmpty
          ? 'Hai bên cam kết giao nhận tài sản đúng như mô tả và thực hiện đầy đủ trách nhiệm trong thời gian thuê.'
          : textOf(json['terms']),
      ownerSignedAt: textOf(json['ownerSignedAt']),
      ownerSignatureUrl: textOf(json['ownerSignatureUrl']),
      renterSignedAt: textOf(json['renterSignedAt']),
      renterSignatureUrl: textOf(json['renterSignatureUrl']),
      isFullySigned: json['isFullySigned'] == true,
      createdAt: textOf(json['createdAt']),
    );
  }
}

class RentalDisputeData {
  const RentalDisputeData({
    required this.id,
    required this.reporterId,
    required this.reason,
    required this.evidenceImages,
    required this.status,
    required this.previousRentalStatus,
    required this.previousItemStatus,
    required this.mediationEndsAt,
    required this.escalatedAt,
    required this.winner,
    required this.penaltyType,
    required this.adminDecision,
    required this.resolvedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String reporterId;
  final String reason;
  final List<String> evidenceImages;
  final String status;
  final String previousRentalStatus;
  final String previousItemStatus;
  final String mediationEndsAt;
  final String escalatedAt;
  final String winner;
  final String penaltyType;
  final String adminDecision;
  final String resolvedAt;
  final String createdAt;
  final String updatedAt;

  bool get isActive => status == 'pending' || status == 'escalated';

  factory RentalDisputeData.fromJson(Map<String, dynamic> json) {
    return RentalDisputeData(
      id: textOf(json['_id']),
      reporterId: _idOf(json['reporterId']),
      reason: textOf(json['reason']),
      evidenceImages: ((json['evidenceImages'] as List?) ?? const [])
          .map(textOf)
          .where((url) => url.isNotEmpty)
          .toList(),
      status: textOf(json['status']),
      previousRentalStatus: textOf(json['previousRentalStatus']),
      previousItemStatus: textOf(json['previousItemStatus']),
      mediationEndsAt: textOf(json['mediationEndsAt']),
      escalatedAt: textOf(json['escalatedAt']),
      winner: textOf(json['winner']),
      penaltyType: textOf(json['penaltyType']),
      adminDecision: textOf(json['adminDecision']),
      resolvedAt: textOf(json['resolvedAt']),
      createdAt: textOf(json['createdAt']),
      updatedAt: textOf(json['updatedAt']),
    );
  }
}

class RentalCardData {
  const RentalCardData({
    required this.id,
    required this.contractId,
    required this.contract,
    required this.isFullySigned,
    required this.itemName,
    required this.itemMainImage,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.escrowAmount,
    required this.counterpartyName,
    required this.dispute,
    required this.createdAt,
    required this.updatedAt,
    this.ownerId = '',
    this.renterId = '',
    this.counterpartyAvatar = '',
  });

  final String id;
  final String contractId;
  final RentalContractData? contract;
  final bool isFullySigned;
  final String itemName;
  final String itemMainImage;
  final String startDate;
  final String endDate;
  final String status;
  final String paymentStatus;
  final num totalAmount;
  final num escrowAmount;
  final String counterpartyName;
  final RentalDisputeData? dispute;
  final String createdAt;
  final String updatedAt;
  final String ownerId;
  final String renterId;
  final String counterpartyAvatar;

  bool get ownerHasSigned => contract?.ownerHasSigned ?? false;
  bool get renterHasSigned => contract?.renterHasSigned ?? false;

  factory RentalCardData.fromJson(Map<String, dynamic> json) {
    final item = json['item'] is Map
        ? Map<String, dynamic>.from(json['item'] as Map)
        : <String, dynamic>{};
    final counterparty = json['counterparty'] is Map
        ? Map<String, dynamic>.from(json['counterparty'] as Map)
        : <String, dynamic>{};
    final contractJson = json['contract'] is Map
        ? Map<String, dynamic>.from(json['contract'] as Map)
        : null;
    final contract =
        contractJson == null ? null : RentalContractData.fromJson(contractJson);
    final disputeJson = json['dispute'] is Map
        ? Map<String, dynamic>.from(json['dispute'] as Map)
        : null;
    final dispute =
        disputeJson == null ? null : RentalDisputeData.fromJson(disputeJson);

    // API returns totalPrice (swagger spec)
    final total = json['totalPrice'] ?? json['totalAmount'];
    final escrow = json['escrowAmount'] ?? json['depositAmount'];

    return RentalCardData(
      id: textOf(json['_id']),
      contractId: textOf(json['contractId']),
      contract: contract,
      isFullySigned:
          json['isFullySigned'] == true || (contract?.isFullySigned ?? false),
      itemName:
          textOf(item['name']).isEmpty ? 'Đồ đã bị xóa' : textOf(item['name']),
      itemMainImage: textOf(item['mainImage']),
      startDate: textOf(json['startDate']),
      endDate: textOf(json['endDate']),
      status: textOf(json['status']),
      paymentStatus: textOf(json['paymentStatus']),
      totalAmount: total is num ? total : num.tryParse(textOf(total)) ?? 0,
      escrowAmount: escrow is num ? escrow : num.tryParse(textOf(escrow)) ?? 0,
      counterpartyName: textOf(counterparty['fullName']),
      counterpartyAvatar: textOf(counterparty['avatarUrl']),
      dispute: dispute,
      createdAt: textOf(json['createdAt']),
      updatedAt: textOf(json['updatedAt']),
      ownerId: _idOf(json['ownerId']),
      renterId: _idOf(json['renterId']),
    );
  }
}

class MyItemData {
  const MyItemData({
    required this.id,
    required this.name,
    required this.pricePerDay,
    required this.status,
    required this.mainImage,
  });

  final String id;
  final String name;
  final num pricePerDay;
  final String status;
  final String mainImage;

  factory MyItemData.fromJson(Map<String, dynamic> json) {
    return MyItemData(
      id: textOf(json['_id']),
      name: textOf(json['name']),
      pricePerDay: json['pricePerDay'] is num
          ? json['pricePerDay'] as num
          : num.tryParse(textOf(json['pricePerDay'])) ?? 0,
      status: textOf(json['status']),
      mainImage: textOf(json['mainImage']),
    );
  }
}

// Chat message model
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.senderAvatar,
    required this.content,
    required this.createdAt,
  });

  final String id;
  final String senderId;
  final String senderName;
  final String senderAvatar;
  final String content;
  final String createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    final senderSource =
        json['sender'] is Map ? json['sender'] : json['senderId'];
    final sender = senderSource is Map
        ? Map<String, dynamic>.from(senderSource)
        : <String, dynamic>{};
    final rawSenderId = sender.isNotEmpty ? sender['_id'] : json['senderId'];

    return ChatMessage(
      id: textOf(json['_id']),
      senderId: textOf(rawSenderId),
      senderName: textOf(sender['fullName']),
      senderAvatar: textOf(sender['avatarUrl']),
      content: textOf(json['content']),
      createdAt: textOf(json['createdAt']),
    );
  }
}
