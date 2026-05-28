import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/utils/formatters.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/items/data/item_models.dart';
import 'package:rental_p2p_mobile/features/items/data/items_repository.dart';

class MyItemDetailPage extends StatefulWidget {
  const MyItemDetailPage({
    super.key,
    required this.itemId,
    required this.itemName,
    required this.repository,
  });

  final String itemId;
  final String itemName;
  final ItemsRepository repository;

  @override
  State<MyItemDetailPage> createState() => _MyItemDetailPageState();
}

class _MyItemDetailPageState extends State<MyItemDetailPage> {
  ItemDetail? item;
  bool loading = true;
  bool editing = false;
  bool saving = false;
  bool deleting = false;

  // Edit controllers
  late TextEditingController _name;
  late TextEditingController _description;
  late TextEditingController _price;
  late TextEditingController _address;
  late TextEditingController _locationSearch;
  String _category = '';
  num _lat = 10.7321;
  num _lng = 106.6999;
  bool _geocoding = false;
  bool _locationFound = false;

  static const _categories = [
    'Công nghệ', 'Du lịch', 'Thể thao', 'Thời trang', 'Âm nhạc', 'Khác',
  ];

  @override
  void initState() {
    super.initState();
    _name = TextEditingController();
    _description = TextEditingController();
    _price = TextEditingController();
    _address = TextEditingController();
    _locationSearch = TextEditingController();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _price.dispose();
    _address.dispose();
    _locationSearch.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final detail = await widget.repository.getItemDetail(widget.itemId);
      setState(() {
        item = detail;
        _name.text = detail.name;
        _description.text = detail.description;
        _price.text = detail.pricePerDay.toString();
        _address.text = detail.address;
        _category = detail.category.isEmpty ? 'Khác' : detail.category;
      });
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _geocodeAddress() async {
    final query = _locationSearch.text.trim();
    if (query.isEmpty) return;
    setState(() => _geocoding = true);
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': query, 'format': 'json', 'limit': '1', 'countrycodes': 'vn',
      });
      final resp = await http.get(uri, headers: {'User-Agent': 'RentalP2P-Mobile/1.0'});
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
        if (mounted) showError(context, 'Không tìm thấy địa chỉ');
      }
    } catch (e) {
      if (mounted) showError(context, 'Lỗi tìm địa chỉ: $e');
    } finally {
      if (mounted) setState(() => _geocoding = false);
    }
  }

  Future<void> _save() async {
    final currentItem = item;
    if (currentItem == null) return;
    setState(() => saving = true);
    try {
      final input = CreateItemInput(
        name: _name.text.trim(),
        description: _description.text.trim(),
        category: _category,
        pricePerDay: num.tryParse(_price.text.trim()) ?? currentItem.pricePerDay,
        baseValue: currentItem.baseValue,
        depositPercentage: currentItem.depositPercentage,
        address: _address.text.trim(),
        images: currentItem.images,
        lat: _lat,
        lng: _lng,
      );
      await widget.repository.updateItem(widget.itemId, input);
      if (mounted) {
        setState(() => editing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Đã cập nhật thông tin đồ')),
        );
        await _load();
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xoá đồ?'),
        content: Text('Bạn chắc chắn muốn xoá "${item?.name ?? widget.itemName}"?\nHành động này không thể hoàn tác.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Huỷ')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            child: const Text('Xoá'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => deleting = true);
    try {
      await widget.repository.deleteItem(widget.itemId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🗑️ Đã xoá đồ thành công')),
        );
        Navigator.of(context).pop(true); // pop with refresh signal
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      appBar: AppBar(
        title: Text(editing ? 'Chỉnh sửa đồ' : 'Chi tiết đồ'),
        actions: [
          if (!editing && !loading && item != null) ...[
            IconButton(
              icon: const Icon(Icons.edit_rounded),
              tooltip: 'Chỉnh sửa',
              onPressed: () => setState(() {
                editing = true;
                _locationFound = false;
              }),
            ),
            IconButton(
              icon: deleting
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.red))
                  : const Icon(Icons.delete_outline_rounded, color: AppColors.red),
              tooltip: 'Xoá đồ',
              onPressed: deleting ? null : _confirmDelete,
            ),
          ],
          if (editing)
            TextButton(
              onPressed: () => setState(() {
                editing = false;
                // restore values
                final d = item;
                if (d != null) {
                  _name.text = d.name;
                  _description.text = d.description;
                  _price.text = d.pricePerDay.toString();
                  _address.text = d.address;
                  _category = d.category.isEmpty ? 'Khác' : d.category;
                }
              }),
              child: const Text('Huỷ'),
            ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.orange))
          : item == null
              ? const Center(child: Text('Không tìm thấy đồ này'))
              : editing
                  ? _buildEditForm()
                  : _buildViewMode(),
      bottomNavigationBar: editing
          ? _SaveBar(loading: saving, onSave: _save)
          : null,
    );
  }

  // ─── View Mode ────────────────────────────────────────────────────────────

  Widget _buildViewMode() {
    final d = item!;
    final hasImages = d.images.isNotEmpty;
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image gallery
          if (hasImages)
            SizedBox(
              height: 220,
              child: PageView.builder(
                itemCount: d.images.length,
                itemBuilder: (_, i) => Image.network(
                  d.images[i],
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _ImagePlaceholder(),
                ),
              ),
            )
          else
            _ImagePlaceholder(),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Name + status
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(d.name,
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.w900)),
                    ),
                    const SizedBox(width: 10),
                    StatusBadge(
                      label: d.status.isEmpty ? 'available' : d.status,
                      color: _statusColor(d.status),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Price
                Row(children: [
                  const Icon(Icons.attach_money_rounded,
                      color: AppColors.orange, size: 20),
                  const SizedBox(width: 4),
                  Text(formatMoney(d.pricePerDay),
                      style: const TextStyle(
                          color: AppColors.orange,
                          fontSize: 18,
                          fontWeight: FontWeight.w900)),
                ]),
                const SizedBox(height: 16),

                // Info cards
                _InfoCard(children: [
                  _Row(Icons.category_outlined, 'Danh mục', d.category.isEmpty ? 'Khác' : d.category),
                  const Divider(height: 20),
                  _Row(Icons.place_outlined, 'Địa điểm', d.address.isEmpty ? 'Chưa cập nhật' : d.address),
                ]),
                const SizedBox(height: 12),

                if (d.description.isNotEmpty) ...[
                  _InfoCard(children: [
                    const Text('Mô tả',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    const SizedBox(height: 8),
                    Text(d.description,
                        style: const TextStyle(
                            fontSize: 14, color: AppColors.muted, height: 1.5)),
                  ]),
                  const SizedBox(height: 12),
                ],

                // Tips
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.orangeLight,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.orange.withValues(alpha: 0.2)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.lightbulb_outline_rounded,
                        color: AppColors.orange, size: 18),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Nhấn ✏️ để chỉnh sửa thông tin hoặc 🗑️ để xoá đồ này.',
                        style: TextStyle(fontSize: 12, color: AppColors.orange),
                      ),
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Edit Form ────────────────────────────────────────────────────────────

  Widget _buildEditForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Basic info
          _FormSection(
            title: '1. Thông tin cơ bản',
            children: [
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: 'Tên đồ *',
                  prefixIcon: Icon(Icons.inventory_2_outlined, size: 18),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Mô tả',
                  prefixIcon: Icon(Icons.notes_rounded, size: 18),
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Category
          _FormSection(
            title: '2. Danh mục & Giá',
            children: [
              const Text('Danh mục',
                  style: TextStyle(fontSize: 12, color: AppColors.muted)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((c) {
                  final sel = c == _category;
                  return GestureDetector(
                    onTap: () => setState(() => _category = c),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: sel ? AppColors.orange : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: sel ? AppColors.orange : AppColors.line,
                          width: sel ? 1.5 : 1,
                        ),
                      ),
                      child: Text(c,
                          style: TextStyle(
                            color: sel ? Colors.white : AppColors.ink,
                            fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 13,
                          )),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Giá thuê / ngày *',
                  prefixIcon: Icon(Icons.attach_money_rounded, size: 18),
                  helperText: 'VNĐ',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Location
          _FormSection(
            title: '3. Vị trí',
            children: [
              Row(children: [
                Expanded(
                  child: TextField(
                    controller: _locationSearch,
                    decoration: const InputDecoration(
                      labelText: 'Tìm địa chỉ mới',
                      prefixIcon: Icon(Icons.search_rounded, size: 18),
                      hintText: 'VD: 123 Lê Lợi, Q.1, TP.HCM',
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
                        padding: const EdgeInsets.symmetric(horizontal: 14)),
                    child: _geocoding
                        ? const SizedBox(width: 18, height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Tìm'),
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              if (_locationFound)
                _SuccessBanner(text: _address.text)
              else ...[
                const Text('Hoặc địa chỉ hiện tại:',
                    style: TextStyle(fontSize: 11, color: AppColors.muted)),
                const SizedBox(height: 6),
                TextField(
                  controller: _address,
                  decoration: const InputDecoration(
                    labelText: 'Địa chỉ',
                    prefixIcon: Icon(Icons.place_outlined, size: 18),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 80), // space for bottom bar
        ],
      ),
    );
  }

  Color _statusColor(String s) => switch (s.toLowerCase()) {
        'available' => AppColors.green,
        'rented'    => AppColors.blue,
        'delisted'  => AppColors.muted,
        _           => AppColors.orange,
      };
}

// ─── Save Bottom Bar ─────────────────────────────────────────────────────────

class _SaveBar extends StatelessWidget {
  const _SaveBar({required this.loading, required this.onSave});
  final bool loading;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16,
          MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: AppColors.line)),
        boxShadow: [BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SizedBox(
        height: 50,
        width: double.infinity,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: loading
                ? null
                : const LinearGradient(
                    colors: [Color(0xffee4d2d), Color(0xffff7143)]),
            color: loading ? AppColors.line : null,
            borderRadius: BorderRadius.circular(10),
          ),
          child: FilledButton.icon(
            onPressed: loading ? null : onSave,
            style: FilledButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            icon: loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_rounded, size: 18),
            label: Text(loading ? 'Đang lưu...' : 'Lưu thay đổi'),
          ),
        ),
      ),
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

class _ImagePlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      width: double.infinity,
      color: AppColors.orangeLight,
      child: const Icon(Icons.inventory_2_outlined,
          size: 64, color: AppColors.orange),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 18, color: AppColors.muted),
      const SizedBox(width: 10),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(fontSize: 11, color: AppColors.muted)),
          const SizedBox(height: 2),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 14)),
        ]),
      ),
    ]);
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: AppColors.orange)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  const _SuccessBanner({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.greenLight,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.green.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        const Icon(Icons.check_circle_rounded,
            color: AppColors.green, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Đã xác định vị trí mới',
                style: TextStyle(
                    color: AppColors.green,
                    fontWeight: FontWeight.w700,
                    fontSize: 12)),
            Text(text,
                style: const TextStyle(fontSize: 11, color: AppColors.muted),
                maxLines: 2, overflow: TextOverflow.ellipsis),
          ]),
        ),
      ]),
    );
  }
}
