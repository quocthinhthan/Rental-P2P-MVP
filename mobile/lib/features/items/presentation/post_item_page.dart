import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/section_card.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';

class PostItemPage extends StatefulWidget {
  const PostItemPage({super.key, required this.repository});

  final ItemsRepository repository;

  @override
  State<PostItemPage> createState() => _PostItemPageState();
}

class _PostItemPageState extends State<PostItemPage> {
  final name = TextEditingController();
  final description = TextEditingController();
  final category = TextEditingController(text: 'Công nghệ');
  final price = TextEditingController();
  final baseValue = TextEditingController();
  final deposit = TextEditingController(text: '100');
  final address = TextEditingController();
  final _locationSearch = TextEditingController();
  final images = TextEditingController();
  num _lat = 10.7321;
  num _lng = 106.6999;
  bool _locationFound = false;
  bool _geocoding = false;
  bool loading = false;
  bool _aiLoading = false;

  static const _categories = [
    'Công nghệ',
    'Du lịch',
    'Thể thao',
    'Thời trang',
    'Âm nhạc',
    'Khác',
  ];

  Future<void> _geocodeAddress() async {
    final query = _locationSearch.text.trim();
    if (query.isEmpty) return;
    setState(() => _geocoding = true);
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': query,
        'format': 'json',
        'limit': '1',
        'countrycodes': 'vn',
      });
      final resp = await http.get(uri,
          headers: {'User-Agent': 'RentalP2P-Mobile/1.0'});
      final data = jsonDecode(resp.body) as List;
      if (data.isNotEmpty) {
        final place = data.first as Map;
        setState(() {
          _lat = double.tryParse(place['lat'].toString()) ?? _lat;
          _lng = double.tryParse(place['lon'].toString()) ?? _lng;
          address.text = place['display_name'].toString();
          _locationFound = true;
        });
      } else {
        if (mounted) showError(context, 'Không tìm thấy địa chỉ này');
      }
    } catch (e) {
      if (mounted) showError(context, 'Lỗi tìm địa chỉ: $e');
    } finally {
      if (mounted) setState(() => _geocoding = false);
    }
  }

  Future<void> _suggestPrice() async {
    final n = name.text.trim();
    final bv = num.tryParse(baseValue.text.trim());
    if (n.isEmpty || bv == null || bv <= 0) {
      showError(context, 'Nhập tên món đồ và giá trị tài sản trước');
      return;
    }
    setState(() => _aiLoading = true);
    try {
      final result = await widget.repository.suggestPrice(
        name: n,
        baseValue: bv,
        category: category.text.trim(),
        description: description.text.trim(),
      );
      if (!mounted) return;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('✨ AI gợi giá'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PriceRow('Theo công thức', result.ruleBasedPrice),
              _PriceRow('AI đề xuất', result.aiSuggestedPrice),
              const Divider(),
              _PriceRow('Giá cuối đề xuất', result.finalSuggestion,
                  highlight: true),
              const SizedBox(height: 10),
              if (result.marketContext.isNotEmpty)
                Text(result.marketContext,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.muted)),
              if (result.aiReasoning.isNotEmpty) ...[  
                const SizedBox(height: 6),
                Text(result.aiReasoning,
                    style: const TextStyle(fontSize: 12)),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Đóng'),
            ),
            FilledButton(
              onPressed: () {
                price.text = result.finalSuggestion.round().toString();
                Navigator.pop(ctx);
              },
              child: const Text('Dùng giá này'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> submit() async {
    setState(() => loading = true);
    try {
      final input = CreateItemInput(
        name: name.text.trim(),
        description: description.text.trim(),
        category: category.text.trim(),
        pricePerDay: num.tryParse(price.text.trim()) ?? 0,
        baseValue: num.tryParse(baseValue.text.trim()) ?? 0,
        depositPercentage: num.tryParse(deposit.text.trim()) ?? 100,
        address: address.text.trim(),
        images: images.text
            .split(',')
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toList(),
        lat: _lat,
        lng: _lng,
      );
      await widget.repository.createItem(input);

      for (final controller in [
        name,
        description,
        price,
        baseValue,
        address,
        images
      ]) {
        controller.clear();
      }
      _lat = 10.7321;
      _lng = 106.6999;
      _locationFound = false;
      _locationSearch.clear();
      deposit.text = '100';
      category.text = 'Công nghệ';
      setState(() {});

      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('🎉 Đã đăng đồ thành công!')));
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      appBar: AppBar(
        title: const Text('Đăng đồ cho thuê'),
        centerTitle: false,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          // Hero banner
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xffee4d2d), Color(0xffff8a65)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.add_business_rounded,
                      color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Biến đồ nhàn rỗi\nthành thu nhập 💰',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  height: 1.3,
                                ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Thông tin rõ ràng giúp người thuê quyết định nhanh hơn.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.88),
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Step 1: Product info
          SectionCard(
            title: 'Thông tin sản phẩm',
            subtitle:
                'Tên, danh mục và mô tả hiển thị trên marketplace.',
            stepNumber: 1,
            children: [
              TextField(
                controller: name,
                decoration: const InputDecoration(
                  labelText: 'Tên món đồ *',
                  hintText: 'VD: Máy ảnh Sony A6000',
                  prefixIcon: Icon(Icons.inventory_2_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: description,
                decoration: const InputDecoration(
                  labelText: 'Mô tả chi tiết',
                  hintText: 'Tình trạng, phụ kiện đi kèm...',
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(bottom: 40),
                    child: Icon(Icons.notes_rounded, size: 18),
                  ),
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              // Category dropdown chips
              Text(
                'Danh mục',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final selected = category.text == cat;
                  return GestureDetector(
                    onTap: () => setState(() => category.text = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.orange
                            : AppColors.page,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: selected ? AppColors.orange : AppColors.line,
                        ),
                      ),
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: selected ? Colors.white : AppColors.ink,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: images,
                decoration: const InputDecoration(
                  labelText: 'URL ảnh sản phẩm',
                  hintText: 'Dán URL ảnh, cách nhau bằng dấu phẩy',
                  prefixIcon: Icon(Icons.image_outlined, size: 18),
                  helperText: 'Tối đa 5 ảnh. VD: https://..., https://...',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Step 2: Price
          SectionCard(
            title: 'Giá và ký quỹ',
            subtitle:
                'Giá thuê hợp lý và ký quỹ rõ ràng giúp tăng độ tin cậy.',
            stepNumber: 2,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: price,
                      decoration: const InputDecoration(
                        labelText: 'Giá thuê / ngày *',
                        prefixIcon: Icon(Icons.attach_money_rounded, size: 18),
                        helperText: 'VNĐ',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: baseValue,
                      decoration: const InputDecoration(
                        labelText: 'Giá trị tài sản',
                        prefixIcon: Icon(Icons.price_check_rounded, size: 18),
                        helperText: 'VNĐ',
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // AI price button
              SizedBox(
                height: 44,
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _aiLoading ? null : _suggestPrice,
                  icon: _aiLoading
                      ? const SizedBox(width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.orange))
                      : const Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.orange),
                  label: Text(_aiLoading ? 'Đang hỏi AI...' : '✨ AI gợi giá',
                      style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.orange),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: deposit,
                decoration: const InputDecoration(
                  labelText: 'Tỷ lệ ký quỹ (%)',
                  prefixIcon: Icon(Icons.percent_rounded, size: 18),
                  helperText: 'Ký quỹ = Giá trị tài sản × %',
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Step 3: Location (geocoding)
          SectionCard(
            title: 'Vị trí nhận trả đồ',
            subtitle: 'Nhập địa chỉ để tự động lấy tọa độ — không cần điền kinh vĩ độ.',
            stepNumber: 3,
            children: [
              // Search row
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _locationSearch,
                    decoration: const InputDecoration(
                      labelText: 'Tìm địa chỉ',
                      hintText: 'VD: 123 Lê Lợi, Q.1, TP.HCM',
                      prefixIcon: Icon(Icons.search_rounded, size: 18),
                    ),
                    onSubmitted: (_) => _geocodeAddress(),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 50,
                  child: FilledButton(
                    onPressed: _geocoding ? null : _geocodeAddress,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    child: _geocoding
                        ? const SizedBox(width: 18, height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Tìm'),
                  ),
                ),
              ]),
              // Result
              if (_locationFound) ...[  
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.greenLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.green.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded,
                          color: AppColors.green, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Đã xác định vị trí',
                                style: const TextStyle(
                                    color: AppColors.green,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12)),
                            Text(address.text,
                                style: const TextStyle(fontSize: 11, color: AppColors.muted),
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[  
                const SizedBox(height: 8),
                Text(
                  'Tìm địa chỉ để hệ thống tự điền tọa độ.',
                  style: const TextStyle(fontSize: 11, color: AppColors.muted),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),

          // Submit
          SizedBox(
            height: 52,
            width: double.infinity,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: loading
                    ? null
                    : const LinearGradient(
                        colors: [Color(0xffee4d2d), Color(0xffff7143)],
                      ),
                borderRadius: BorderRadius.circular(10),
                color: loading ? AppColors.line : null,
              ),
              child: FilledButton.icon(
                onPressed: loading ? null : submit,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: loading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.rocket_launch_rounded, size: 18),
                label: Text(loading ? 'Đang đăng...' : 'Đăng đồ ngay'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Price Row Widget ─────────────────────────────────────────────────────────

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.value, {this.highlight = false});
  final String label;
  final num value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 13,
                  color: highlight ? AppColors.ink : AppColors.muted,
                  fontWeight: highlight ? FontWeight.w800 : FontWeight.w400)),
          Text(
            formatMoney(value),
            style: TextStyle(
              fontSize: highlight ? 16 : 13,
              color: highlight ? AppColors.orange : AppColors.ink,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
