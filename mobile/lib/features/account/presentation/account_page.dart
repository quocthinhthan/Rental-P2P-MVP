import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/core/widgets/section_card.dart';
import 'package:rental_p2p_mobile/core/widgets/status_badge.dart';
import 'package:rental_p2p_mobile/features/account/data/account_repository.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';

class AccountPage extends StatefulWidget {
  const AccountPage({
    super.key,
    required this.repository,
    required this.user,
    required this.onUserChanged,
    required this.onSignOut,
  });

  final AccountRepository repository;
  final AppUser user;
  final ValueChanged<AppUser> onUserChanged;
  final VoidCallback onSignOut;

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  final fullName = TextEditingController();
  final phone = TextEditingController();
  final address = TextEditingController();
  final idCard = TextEditingController();
  bool loading = false;

  @override
  void initState() {
    super.initState();
    fullName.text = widget.user.fullName;
    phone.text = widget.user.phoneNumber;
    address.text = widget.user.address;
  }

  Future<void> saveProfile({bool verify = false}) async {
    setState(() => loading = true);
    try {
      final user = await widget.repository.updateProfile(
        fullName: fullName.text.trim(),
        phoneNumber: phone.text.trim(),
        address: address.text.trim(),
        idCardNumber: verify ? idCard.text.trim() : null,
      );
      widget.onUserChanged(user);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã cập nhật tài khoản')),
      );
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  bool get _isVerified => widget.user.ekycStatus == 'verified';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.page,
      body: ListView(
        children: [
          // ── Profile Header ──────────────────────────────────────────────
          Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              // Banner gradient
              Container(
                height: 140,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xffee4d2d), Color(0xffff7143)],
                  ),
                ),
              ),
              // Decorative circle
              Positioned(
                top: -30,
                right: -30,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
              ),
              // AppBar area
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    child: Row(
                      children: [
                        Text(
                          'Tài khoản',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const Spacer(),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.settings_outlined,
                                color: Colors.white, size: 20),
                            onPressed: () {},
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // Avatar — positioned to overlap the banner bottom
              Positioned(
                bottom: -48,
                child: Column(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: CircleAvatar(
                        radius: 40,
                        backgroundColor: AppColors.orangeLight,
                        child: Text(
                          _initials(widget.user.fullName),
                          style: const TextStyle(
                            color: AppColors.orange,
                            fontWeight: FontWeight.w900,
                            fontSize: 24,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Space for avatar overflow
          const SizedBox(height: 60),

          // Name + email + badge
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Text(
                  widget.user.fullName.isEmpty
                      ? 'Người dùng Rental P2P'
                      : widget.user.fullName,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  widget.user.email,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: AppColors.muted),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                StatusBadge(
                  label: _isVerified ? 'Đã xác minh' : 'Chưa xác minh',
                  color: _isVerified ? AppColors.green : AppColors.orange,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stats row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _StatsRow(user: widget.user),
          ),
          const SizedBox(height: 20),

          // Form sections
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionCard(
              title: 'Hồ sơ cá nhân',
              subtitle:
                  'Thông tin này giúp chủ đồ và người thuê liên hệ dễ hơn.',
              icon: Icons.person_outline_rounded,
              stepNumber: null,
              children: [
                TextField(
                  controller: fullName,
                  decoration: const InputDecoration(
                    labelText: 'Họ và tên',
                    prefixIcon:
                        Icon(Icons.person_outline_rounded, size: 18),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Số điện thoại',
                    prefixIcon: Icon(Icons.phone_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: address,
                  decoration: const InputDecoration(
                    labelText: 'Địa chỉ',
                    prefixIcon: Icon(Icons.place_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: loading ? null : () => saveProfile(),
                  child: const Text('Lưu hồ sơ'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionCard(
              title: 'Xác minh tài khoản',
              subtitle: 'Tài khoản xác minh mới có thể đăng đồ và thuê.',
              icon: Icons.verified_user_outlined,
              stepNumber: null,
              children: [
                if (_isVerified)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.greenLight,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded,
                            color: AppColors.green, size: 20),
                        const SizedBox(width: 10),
                        Text(
                          'Tài khoản đã được xác minh',
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                color: AppColors.green,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  TextField(
                    controller: idCard,
                    decoration: const InputDecoration(
                      labelText: 'Số CCCD',
                      prefixIcon:
                          Icon(Icons.credit_card_outlined, size: 18),
                      helperText: 'Nhập số CCCD để xác minh nhanh',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed:
                        loading ? null : () => saveProfile(verify: true),
                    icon: const Icon(Icons.verified_user_outlined,
                        size: 16, color: AppColors.orange),
                    label: const Text('Xác minh ngay',
                        style: TextStyle(color: AppColors.orange)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.orange),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Sign out
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 48,
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: widget.onSignOut,
                icon: const Icon(Icons.logout_rounded,
                    size: 18, color: AppColors.red),
                label: const Text('Đăng xuất',
                    style: TextStyle(color: AppColors.red)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.red),
                ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _initials(String value) {
    final parts = value
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'RP';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.user});
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          _StatItem(label: 'Đánh giá', value: '4.9 ⭐'),
          Container(width: 1, height: 40, color: AppColors.line),
          _StatItem(
              label: 'Xác minh',
              value: user.ekycStatus == 'verified' ? '✓' : '—'),
          Container(width: 1, height: 40, color: AppColors.line),
          _StatItem(label: 'Thành viên', value: 'MVP'),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: AppColors.ink,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: AppColors.muted, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
