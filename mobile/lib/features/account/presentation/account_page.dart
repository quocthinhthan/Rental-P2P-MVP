import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
    this.authRepository,
  });

  final AccountRepository repository;
  final AuthRepository? authRepository;
  final AppUser user;
  final ValueChanged<AppUser> onUserChanged;
  final VoidCallback onSignOut;

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  // Profile controllers
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  // Password controllers
  final _currentPwd = TextEditingController();
  final _newPwd = TextEditingController();
  final _confirmPwd = TextEditingController();

  bool _savingProfile = false;
  bool _loadingProfile = false;
  bool _savingPwd = false;
  bool _uploadingAvatar = false;
  bool _verifyingEkyc = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  // eKYC images
  Uint8List? _ekycFront;
  Uint8List? _ekycBack;
  late AppUser _user;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _syncProfileFields(_user);
    _refreshProfile(silent: true);
  }

  @override
  void didUpdateWidget(covariant AccountPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user != widget.user) {
      _user = widget.user;
      _syncProfileFields(_user);
    }
  }

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    _address.dispose();
    _currentPwd.dispose();
    _newPwd.dispose();
    _confirmPwd.dispose();
    super.dispose();
  }

  bool get _isVerified => _user.ekycStatus == 'verified';

  void _syncProfileFields(AppUser user) {
    _fullName.text = user.fullName;
    _phone.text = user.phoneNumber;
    _address.text = user.address;
  }

  Future<void> _refreshProfile({bool silent = false}) async {
    if (_loadingProfile) return;
    if (mounted) {
      setState(() => _loadingProfile = true);
    }
    try {
      final user = await widget.repository.getMe();
      if (!mounted) return;
      setState(() => _user = user);
      _syncProfileFields(user);
      widget.onUserChanged(user);
    } catch (error) {
      if (!mounted || silent) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loadingProfile = false);
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _savingProfile = true);
    try {
      final user = await widget.repository.updateProfile(
        fullName: _fullName.text.trim(),
        phoneNumber: _phone.text.trim(),
        address: _address.text.trim(),
      );
      if (!mounted) return;
      setState(() => _user = user);
      widget.onUserChanged(user);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Đã cập nhật hồ sơ')));
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _changePassword() async {
    if (_newPwd.text != _confirmPwd.text) {
      showError(context, 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (_newPwd.text.length < 6) {
      showError(context, 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    setState(() => _savingPwd = true);
    try {
      await widget.repository.changePassword(
        currentPassword: _currentPwd.text,
        newPassword: _newPwd.text,
      );
      if (!mounted) return;
      _currentPwd.clear();
      _newPwd.clear();
      _confirmPwd.clear();
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã đổi mật khẩu thành công')));
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _savingPwd = false);
    }
  }

  Future<void> _uploadAvatar() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(
        source: ImageSource.gallery, maxWidth: 512, imageQuality: 80);
    if (xfile == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await xfile.readAsBytes();
      final avatarUrl =
          await widget.repository.uploadAvatar(bytes, 'avatar-${_user.id}.jpg');
      final user = await widget.repository.updateProfile(
        fullName: _fullName.text.trim(),
        phoneNumber: _phone.text.trim(),
        address: _address.text.trim(),
        avatarUrl: avatarUrl,
      );
      if (!mounted) return;
      setState(() => _user = user);
      widget.onUserChanged(user);
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã cập nhật ảnh đại diện')));
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _pickEkycImage(bool isFront) async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Chụp ảnh'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Chọn từ thư viện'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;
    final xfile = await picker.pickImage(source: source, imageQuality: 85);
    if (xfile == null) return;
    final bytes = await xfile.readAsBytes();
    setState(() {
      if (isFront) {
        _ekycFront = bytes;
      } else {
        _ekycBack = bytes;
      }
    });
  }

  Future<void> _verifyEkyc() async {
    if (_ekycFront == null) {
      showError(context, 'Vui lòng chụp mặt trước CCCD');
      return;
    }
    if (widget.authRepository == null) {
      showError(context, 'Không tìm thấy auth repository');
      return;
    }
    setState(() => _verifyingEkyc = true);
    try {
      final user = await widget.authRepository!.verifyEkyc(
        frontBytes: _ekycFront!,
        frontFilename: 'cccd-mat-truoc-${_user.id}.jpg',
        backBytes: _ekycBack,
        backFilename: 'cccd-mat-sau-${_user.id}.jpg',
      );
      if (!mounted) return;
      setState(() => _user = user);
      _syncProfileFields(user);
      widget.onUserChanged(user);
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Xác minh CCCD thành công!')));
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _verifyingEkyc = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _user;
    final avgRating = user.averageRating;
    final totalReviews = user.totalReviews;

    return Scaffold(
      backgroundColor: AppColors.page,
      body: ListView(
        children: [
          // ── Profile Header ──
          Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Container(
                height: 150,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xffee4d2d), Color(0xffff7143)],
                  ),
                ),
              ),
              Positioned(
                top: -30,
                right: -30,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
              ),
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
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const Spacer(),
                        IconButton(
                          onPressed:
                              _loadingProfile ? null : () => _refreshProfile(),
                          icon: _loadingProfile
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(
                                  Icons.refresh_rounded,
                                  color: Colors.white,
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // Avatar (tappable)
              Positioned(
                bottom: -52,
                child: GestureDetector(
                  onTap: _uploadingAvatar ? null : _uploadAvatar,
                  child: Stack(
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
                          radius: 44,
                          backgroundColor: AppColors.orangeLight,
                          backgroundImage: user.avatarUrl.isNotEmpty
                              ? NetworkImage(user.avatarUrl)
                              : null,
                          child: _uploadingAvatar
                              ? const CircularProgressIndicator(
                                  color: AppColors.orange)
                              : user.avatarUrl.isEmpty
                                  ? Text(
                                      _initials(user.fullName),
                                      style: const TextStyle(
                                        color: AppColors.orange,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 24,
                                      ),
                                    )
                                  : null,
                        ),
                      ),
                      // Camera badge
                      if (!_uploadingAvatar)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: const BoxDecoration(
                              color: AppColors.orange,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt_rounded,
                                size: 14, color: Colors.white),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 64),
          // Name + email + badge
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Text(
                  user.fullName.isEmpty
                      ? 'Người dùng Rental P2P'
                      : user.fullName,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  user.email,
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
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: Row(
                children: [
                  _StatItem(
                    label: 'Đánh giá TB',
                    value: avgRating > 0
                        ? '⭐ ${avgRating.toStringAsFixed(1)}'
                        : '—',
                  ),
                  Container(width: 1, height: 40, color: AppColors.line),
                  _StatItem(
                    label: 'Xác minh',
                    value: _isVerified ? '✓' : '—',
                  ),
                  Container(width: 1, height: 40, color: AppColors.line),
                  _StatItem(
                    label: 'Review',
                    value: '$totalReviews',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Profile section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionCard(
              title: 'Hồ sơ cá nhân',
              subtitle: 'Thông tin giúp chủ đồ và người thuê liên hệ dễ hơn.',
              icon: Icons.person_outline_rounded,
              stepNumber: null,
              children: [
                TextField(
                  controller: _fullName,
                  decoration: const InputDecoration(
                    labelText: 'Họ và tên',
                    prefixIcon: Icon(Icons.person_outline_rounded, size: 18),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Số điện thoại',
                    prefixIcon: Icon(Icons.phone_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _address,
                  decoration: const InputDecoration(
                    labelText: 'Địa chỉ',
                    prefixIcon: Icon(Icons.place_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _savingProfile ? null : _saveProfile,
                    child: _savingProfile
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Lưu hồ sơ'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // eKYC section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionCard(
              title: 'Xác minh tài khoản (eKYC)',
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
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppColors.green,
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                      ],
                    ),
                  )
                else ...[
                  Text(
                    'Chụp ảnh mặt trước và mặt sau CCCD của bạn.',
                    style: Theme.of(context)
                        .textTheme
                        .bodySmall
                        ?.copyWith(color: AppColors.muted),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                          child: _EkycImagePicker(
                        label: 'Mặt trước *',
                        bytes: _ekycFront,
                        onPick: () => _pickEkycImage(true),
                      )),
                      const SizedBox(width: 10),
                      Expanded(
                          child: _EkycImagePicker(
                        label: 'Mặt sau',
                        bytes: _ekycBack,
                        onPick: () => _pickEkycImage(false),
                      )),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _verifyingEkyc ? null : _verifyEkyc,
                      icon: _verifyingEkyc
                          ? const SizedBox(
                              height: 14,
                              width: 14,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: AppColors.orange))
                          : const Icon(Icons.verified_user_outlined,
                              size: 16, color: AppColors.orange),
                      label: Text(
                        _verifyingEkyc ? 'Đang xác minh...' : 'Xác minh ngay',
                        style: const TextStyle(color: AppColors.orange),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.orange),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          // Change password section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SectionCard(
              title: 'Đổi mật khẩu',
              subtitle: 'Bảo vệ tài khoản với mật khẩu mạnh.',
              icon: Icons.lock_outline_rounded,
              stepNumber: null,
              children: [
                TextField(
                  controller: _currentPwd,
                  obscureText: _obscureCurrent,
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu hiện tại',
                    prefixIcon:
                        const Icon(Icons.lock_outline_rounded, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(
                          _obscureCurrent
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 18,
                          color: AppColors.muted),
                      onPressed: () =>
                          setState(() => _obscureCurrent = !_obscureCurrent),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _newPwd,
                  obscureText: _obscureNew,
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu mới',
                    prefixIcon:
                        const Icon(Icons.lock_outline_rounded, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(
                          _obscureNew
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 18,
                          color: AppColors.muted),
                      onPressed: () =>
                          setState(() => _obscureNew = !_obscureNew),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _confirmPwd,
                  obscureText: _obscureConfirm,
                  decoration: InputDecoration(
                    labelText: 'Xác nhận mật khẩu mới',
                    prefixIcon:
                        const Icon(Icons.lock_outline_rounded, size: 18),
                    suffixIcon: IconButton(
                      icon: Icon(
                          _obscureConfirm
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 18,
                          color: AppColors.muted),
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _savingPwd ? null : _changePassword,
                    child: _savingPwd
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Đổi mật khẩu'),
                  ),
                ),
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

class _EkycImagePicker extends StatelessWidget {
  const _EkycImagePicker({
    required this.label,
    required this.bytes,
    required this.onPick,
  });

  final String label;
  final Uint8List? bytes;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPick,
      child: Container(
        height: 110,
        decoration: BoxDecoration(
          color: AppColors.page,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: bytes != null ? AppColors.green : AppColors.line,
            width: bytes != null ? 2 : 1,
          ),
        ),
        child: bytes != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: Image.memory(bytes!,
                    fit: BoxFit.cover, width: double.infinity),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.camera_alt_outlined,
                      color: AppColors.muted, size: 28),
                  const SizedBox(height: 6),
                  Text(label,
                      style: Theme.of(context)
                          .textTheme
                          .bodySmall
                          ?.copyWith(color: AppColors.muted),
                      textAlign: TextAlign.center),
                ],
              ),
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
