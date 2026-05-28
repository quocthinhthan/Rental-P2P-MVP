import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
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
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _price = TextEditingController();
  final _baseValue = TextEditingController();
  final _deposit = TextEditingController(text: '100');
  final _address = TextEditingController();
  final _locationSearch = TextEditingController();

  String _category = '';
  List<String> _categories = const [
    'Công nghệ',
    'Du lịch',
    'Thể thao',
    'Thời trang',
    'Âm nhạc',
    'Khác',
  ];

  // Image state
  final _picker = ImagePicker();
  final List<Uint8List> _imageBytes = [];
  final List<String> _imageUrls = [];
  bool _uploadingImages = false;

  // Location state
  num _lat = 10.7321;
  num _lng = 106.6999;
  bool _locationFound = false;
  bool _geocoding = false;

  // Form state
  bool _loading = false;
  bool _aiLoading = false;

  static const int _maxImages = 5;

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _price.addListener(() {
      _formatCurrencyController(_price);
    });
    _baseValue.addListener(() {
      _formatCurrencyController(_baseValue);
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _price.dispose();
    _baseValue.dispose();
    _deposit.dispose();
    _address.dispose();
    _locationSearch.dispose();
    super.dispose();
  }

  void _formatCurrencyController(TextEditingController ctrl) {
    final raw = ctrl.text.replaceAll('.', '');
    if (raw.isEmpty) return;
    final n = int.tryParse(raw);
    if (n == null) return;
    final formatted = _formatWithDots(n);
    if (ctrl.text != formatted) {
      ctrl.value = TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    }
  }

  String _formatWithDots(int n) {
    final s = n.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  String _rawPrice(TextEditingController ctrl) {
    return ctrl.text.replaceAll('.', '');
  }

  Future<void> _loadCategories() async {
    try {
      final cats = await widget.repository.getCategories();
      if (mounted && cats.isNotEmpty) {
        setState(() {
          _categories = cats;
          if (_category.isEmpty) _category = cats.first;
        });
      }
    } catch (_) {
      if (mounted && _category.isEmpty) {
        setState(() => _category = _categories.first);
      }
    }
  }

  // ─── Image Picker ──────────────────────────────────────────────────────────

  Future<void> _pickImages() async {
    if (_imageUrls.length >= _maxImages) {
      showError(context, 'Tối đa $_maxImages ảnh');
      return;
    }
    final source = await _showImageSourceSheet();
    if (source == null) return;

    setState(() => _uploadingImages = true);
    try {
      List<XFile> picked = [];
      if (source == ImageSource.gallery) {
        picked = await _picker.pickMultiImage(imageQuality: 85);
      } else {
        final img = await _picker.pickImage(
            source: ImageSource.camera, imageQuality: 85);
        if (img != null) picked = [img];
      }
      if (picked.isEmpty) return;

      final remaining = _maxImages - _imageUrls.length;
      if (picked.length > remaining) {
        picked = picked.sublist(0, remaining);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(
                    'Chỉ thêm được $remaining ảnh nữa (tối đa $_maxImages)')),
          );
        }
      }

      for (final xfile in picked) {
        final bytes = await xfile.readAsBytes();
        final filename =
            'item_${DateTime.now().millisecondsSinceEpoch}_${xfile.name}';
        final url = await widget.repository.uploadItemImage(bytes, filename);
        if (mounted) {
          setState(() {
            _imageBytes.add(bytes);
            _imageUrls.add(url);
          });
        }
      }
    } catch (e) {
      if (mounted) showError(context, 'Lỗi tải ảnh: $e');
    } finally {
      if (mounted) setState(() => _uploadingImages = false);
    }
  }

  Future<ImageSource?> _showImageSourceSheet() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Chọn nguồn ảnh',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.orangeLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.photo_library_outlined,
                    color: AppColors.orange),
              ),
              title: const Text('Thư viện ảnh',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.blueLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.camera_alt_outlined,
                    color: AppColors.blue),
              ),
              title: const Text('Chụp ảnh mới',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _removeImage(int index) {
    setState(() {
      _imageBytes.removeAt(index);
      _imageUrls.removeAt(index);
    });
  }

  // ─── Geocoding ─────────────────────────────────────────────────────────────

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
      final resp =
          await http.get(uri, headers: {'User-Agent': 'RentalP2P-Mobile/1.0'});
      final data = jsonDecode(resp.body) as List;
      if (data.isNotEmpty) {
        final place = data.first as Map;
        setState(() {
          _lat = double.tryParse(place['lat'].toString()) ?? _lat;
          _lng = double.tryParse(place['lon'].toString()) ?? _lng;
          _address.text = place['display_name'].toString();
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

  // ─── AI Price Suggestion ───────────────────────────────────────────────────

  Future<void> _suggestPrice() async {
    final n = _name.text.trim();
    final bv = num.tryParse(_rawPrice(_baseValue));
    if (n.isEmpty || bv == null || bv <= 0) {
      showError(context, 'Nhập tên món đồ và giá trị tài sản trước');
      return;
    }
    setState(() => _aiLoading = true);
    try {
      final result = await widget.repository.suggestPrice(
        name: n,
        baseValue: bv,
        category: _category,
        description: _description.text.trim(),
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
                    style:
                        const TextStyle(fontSize: 12, color: AppColors.muted)),
              if (result.aiReasoning.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(result.aiReasoning, style: const TextStyle(fontSize: 12)),
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
                _price.text = _formatWithDots(result.finalSuggestion.round());
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

  // ─── Submit ────────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    if (_imageUrls.isEmpty) {
      showError(context, 'Vui lòng thêm ít nhất 1 ảnh sản phẩm');
      return;
    }
    if (_name.text.trim().isEmpty) {
      showError(context, 'Vui lòng nhập tên món đồ');
      return;
    }
    if (!_locationFound && _address.text.trim().isEmpty) {
      showError(context, 'Vui lòng tìm địa chỉ nhận trả đồ');
      return;
    }

    setState(() => _loading = true);
    try {
      final input = CreateItemInput(
        name: _name.text.trim(),
        description: _description.text.trim(),
        category: _category,
        pricePerDay: num.tryParse(_rawPrice(_price)) ?? 0,
        baseValue: num.tryParse(_rawPrice(_baseValue)) ?? 0,
        depositPercentage: num.tryParse(_deposit.text.trim()) ?? 100,
        address: _address.text.trim(),
        images: List.from(_imageUrls),
        lat: _lat,
        lng: _lng,
      );
      await widget.repository.createItem(input);

      // Reset form
      for (final c in [_name, _description, _price, _baseValue, _address]) {
        c.clear();
      }
      _locationSearch.clear();
      _deposit.text = '100';
      _lat = 10.7321;
      _lng = 106.6999;
      _locationFound = false;
      _imageBytes.clear();
      _imageUrls.clear();
      if (_categories.isNotEmpty) _category = _categories.first;
      setState(() {});

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🎉 Đã đăng đồ thành công!')),
      );
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

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
          // ── Hero banner
          _HeroBanner(),
          const SizedBox(height: 16),

          // ── Step 1: Product info
          SectionCard(
            title: 'Thông tin sản phẩm',
            subtitle: 'Tên, danh mục và mô tả hiển thị trên marketplace.',
            stepNumber: 1,
            children: [
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: 'Tên món đồ *',
                  hintText: 'VD: Máy ảnh Sony A6000',
                  prefixIcon: Icon(Icons.inventory_2_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
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

              // Category chips
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
                  final selected = _category == cat;
                  return GestureDetector(
                    onTap: () => setState(() => _category = cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.orange : AppColors.page,
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
              const SizedBox(height: 16),

              // ── Image upload area
              _ImageUploadSection(
                imageBytes: _imageBytes,
                imageUrls: _imageUrls,
                uploading: _uploadingImages,
                maxImages: _maxImages,
                onPickImages: _pickImages,
                onRemove: _removeImage,
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Step 2: Price & deposit
          SectionCard(
            title: 'Giá và ký quỹ',
            subtitle: 'Giá thuê hợp lý và ký quỹ rõ ràng giúp tăng độ tin cậy.',
            stepNumber: 2,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _price,
                      decoration: const InputDecoration(
                        labelText: 'Giá thuê / ngày *',
                        prefixIcon: Icon(Icons.attach_money_rounded, size: 18),
                        suffixText: 'đồng',
                        suffixStyle:
                            TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _baseValue,
                      decoration: const InputDecoration(
                        labelText: 'Giá trị tài sản',
                        prefixIcon: Icon(Icons.price_check_rounded, size: 18),
                        suffixText: 'đồng',
                        suffixStyle:
                            TextStyle(color: AppColors.muted, fontSize: 12),
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
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: AppColors.orange))
                      : const Icon(Icons.auto_awesome_rounded,
                          size: 16, color: AppColors.orange),
                  label: Text(_aiLoading ? 'Đang hỏi AI...' : '✨ AI gợi giá',
                      style: const TextStyle(
                          color: AppColors.orange,
                          fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.orange),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Quick select deposit % chips
              const Text(
                'Tỷ lệ ký quỹ (%)',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              const SizedBox(height: 8),
              LayoutBuilder(
                builder: (context, constraints) {
                  const gap = 8.0;
                  final chipWidth = (constraints.maxWidth - gap * 2) / 3;

                  return Wrap(
                    spacing: gap,
                    runSpacing: gap,
                    children: [5, 10, 15, 20, 25, 30].map((pct) {
                      final selected = _deposit.text.trim() == pct.toString();
                      return SizedBox(
                        width: chipWidth,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(999),
                          onTap: () =>
                              setState(() => _deposit.text = pct.toString()),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            height: 34,
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.orange
                                  : AppColors.orangeLight,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(
                                color: selected
                                    ? AppColors.orange
                                    : AppColors.orange.withValues(alpha: 0.22),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$pct%',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                                color:
                                    selected ? Colors.white : AppColors.orange,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _deposit,
                decoration: const InputDecoration(
                  labelText: 'Hoặc nhập tỷ lệ tuỳ chỉnh',
                  prefixIcon: Icon(Icons.percent_rounded, size: 18),
                  helperText: 'Ký quỹ = Giá trị tài sản × %',
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Step 3: Location (geocoding)
          SectionCard(
            title: 'Vị trí nhận trả đồ',
            subtitle:
                'Nhập địa chỉ để tự động lấy tọa độ — không cần điền kinh vĩ độ.',
            stepNumber: 3,
            children: [
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
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Tìm'),
                  ),
                ),
              ]),
              if (_locationFound) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.greenLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                        color: AppColors.green.withValues(alpha: 0.3)),
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
                            const Text('Đã xác định vị trí',
                                style: TextStyle(
                                    color: AppColors.green,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12)),
                            Text(_address.text,
                                style: const TextStyle(
                                    fontSize: 11, color: AppColors.muted),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                const SizedBox(height: 8),
                const Text(
                  'Tìm địa chỉ để hệ thống tự điền tọa độ.',
                  style: TextStyle(fontSize: 11, color: AppColors.muted),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),

          // ── Submit button
          SizedBox(
            height: 52,
            width: double.infinity,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: _loading
                    ? null
                    : const LinearGradient(
                        colors: [Color(0xffee4d2d), Color(0xffff7143)],
                      ),
                borderRadius: BorderRadius.circular(10),
                color: _loading ? AppColors.line : null,
              ),
              child: FilledButton.icon(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: _loading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.rocket_launch_rounded, size: 18),
                label: Text(_loading ? 'Đang đăng...' : 'Đăng đồ ngay'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Hero Banner ──────────────────────────────────────────────────────────────

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
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
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
    );
  }
}

// ─── Image Upload Section ─────────────────────────────────────────────────────

class _ImageUploadSection extends StatelessWidget {
  const _ImageUploadSection({
    required this.imageBytes,
    required this.imageUrls,
    required this.uploading,
    required this.maxImages,
    required this.onPickImages,
    required this.onRemove,
  });

  final List<Uint8List> imageBytes;
  final List<String> imageUrls;
  final bool uploading;
  final int maxImages;
  final VoidCallback onPickImages;
  final void Function(int) onRemove;

  @override
  Widget build(BuildContext context) {
    final count = imageUrls.length;
    final canAdd = count < maxImages;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Ảnh sản phẩm *',
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.muted),
            ),
            const Spacer(),
            Text(
              '$count / $maxImages ảnh',
              style: const TextStyle(fontSize: 11, color: AppColors.muted),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // Upload area / Grid
        if (count == 0)
          _UploadEmptyArea(uploading: uploading, onTap: onPickImages)
        else ...[
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: count + (canAdd ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == count) {
                // Add more button
                return _AddMoreTile(uploading: uploading, onTap: onPickImages);
              }
              return _ImageTile(
                bytes: imageBytes[index],
                onRemove: () => onRemove(index),
              );
            },
          ),
          if (uploading)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: AppColors.orange),
                  ),
                  SizedBox(width: 8),
                  Text('Đang tải ảnh lên...',
                      style: TextStyle(fontSize: 12, color: AppColors.muted)),
                ],
              ),
            ),
        ],
      ],
    );
  }
}

class _UploadEmptyArea extends StatelessWidget {
  const _UploadEmptyArea({required this.uploading, required this.onTap});
  final bool uploading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: uploading ? null : onTap,
      child: Container(
        height: 130,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.orangeLight,
              AppColors.orangeLight.withValues(alpha: 0.5),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.orange.withValues(alpha: 0.35),
            width: 1.5,
            style: BorderStyle.solid,
          ),
        ),
        child: uploading
            ? const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                        strokeWidth: 2.5, color: AppColors.orange),
                    SizedBox(height: 8),
                    Text('Đang tải ảnh...',
                        style: TextStyle(
                            fontSize: 12,
                            color: AppColors.orange,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.orange.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.add_photo_alternate_outlined,
                        color: AppColors.orange, size: 24),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Thêm ảnh sản phẩm',
                    style: TextStyle(
                        color: AppColors.orange,
                        fontWeight: FontWeight.w700,
                        fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Camera hoặc thư viện • Tối đa 5 ảnh',
                    style: TextStyle(fontSize: 11, color: AppColors.muted),
                  ),
                ],
              ),
      ),
    );
  }
}

class _AddMoreTile extends StatelessWidget {
  const _AddMoreTile({required this.uploading, required this.onTap});
  final bool uploading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: uploading ? null : onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.orangeLight,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: AppColors.orange.withValues(alpha: 0.3),
            style: BorderStyle.solid,
          ),
        ),
        child: uploading
            ? const Center(
                child: SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: AppColors.orange),
                ),
              )
            : const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_rounded, color: AppColors.orange, size: 26),
                  SizedBox(height: 2),
                  Text('Thêm',
                      style: TextStyle(
                          fontSize: 11,
                          color: AppColors.orange,
                          fontWeight: FontWeight.w600)),
                ],
              ),
      ),
    );
  }
}

class _ImageTile extends StatelessWidget {
  const _ImageTile({required this.bytes, required this.onRemove});
  final Uint8List bytes;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.memory(bytes, fit: BoxFit.cover),
        ),
        Positioned(
          right: 4,
          top: 4,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.65),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded,
                  color: Colors.white, size: 15),
            ),
          ),
        ),
      ],
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
