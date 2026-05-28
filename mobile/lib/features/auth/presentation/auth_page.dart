import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';
import 'package:rental_p2p_mobile/features/auth/presentation/forgot_password_page.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({
    super.key,
    required this.repository,
    required this.onSignedIn,
  });

  final AuthRepository repository;
  final Future<void> Function(UserSession) onSignedIn;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage>
    with SingleTickerProviderStateMixin {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _registerMode = false;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_registerMode) {
      if (_name.text.trim().isEmpty) {
        return 'Vui lòng nhập họ tên';
      }
      if (_phone.text.trim().length < 10) {
        return 'Số điện thoại phải có ít nhất 10 chữ số';
      }
      if (_password.text != _confirmPassword.text) {
        return 'Mật khẩu xác nhận không khớp';
      }
    }
    if (_email.text.trim().isEmpty || !_email.text.contains('@')) {
      return 'Email không hợp lệ';
    }
    if (_password.text.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return null;
  }

  Future<void> _submit() async {
    final err = _validate();
    if (err != null) {
      showError(context, err);
      return;
    }
    setState(() => _loading = true);
    try {
      if (_registerMode) {
        await widget.repository.register(
          fullName: _name.text.trim(),
          email: _email.text.trim(),
          phoneNumber: _phone.text.trim(),
          password: _password.text,
        );
      }
      final session = await widget.repository.login(
        email: _email.text.trim(),
        password: _password.text,
      );
      await widget.onSignedIn(session);
    } catch (error) {
      if (!mounted) return;
      showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Container(
            height: MediaQuery.of(context).size.height * 0.45,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xffee4d2d), Color(0xffff7143)],
              ),
            ),
          ),
          Positioned(
            top: -40,
            right: -40,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            top: 60,
            right: 30,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      const _BrandHeader(),
                      const SizedBox(height: 28),
                      _FormCard(
                        registerMode: _registerMode,
                        loading: _loading,
                        obscurePassword: _obscurePassword,
                        obscureConfirm: _obscureConfirm,
                        name: _name,
                        email: _email,
                        phone: _phone,
                        password: _password,
                        confirmPassword: _confirmPassword,
                        onToggleObscure: () => setState(
                            () => _obscurePassword = !_obscurePassword),
                        onToggleObscureConfirm: () =>
                            setState(() => _obscureConfirm = !_obscureConfirm),
                        onSubmit: _submit,
                        onToggleMode: () =>
                            setState(() => _registerMode = !_registerMode),
                        onForgotPassword: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ForgotPasswordPage(
                              repository: widget.repository,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.16),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(Icons.storefront_rounded,
              color: AppColors.orange, size: 36),
        ),
        const SizedBox(height: 16),
        Text(
          'Rental P2P',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6),
        Text(
          'Thuê & cho thuê đồ cá nhân',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.white.withValues(alpha: 0.85),
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 16),
        const Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: [
            _TrustPill(icon: Icons.verified_user_outlined, label: 'eKYC'),
            _TrustPill(icon: Icons.payments_outlined, label: 'Ký quỹ'),
            _TrustPill(icon: Icons.chat_bubble_outline, label: 'Chat đơn thuê'),
          ],
        ),
      ],
    );
  }
}

class _FormCard extends StatelessWidget {
  const _FormCard({
    required this.registerMode,
    required this.loading,
    required this.obscurePassword,
    required this.obscureConfirm,
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
    required this.confirmPassword,
    required this.onToggleObscure,
    required this.onToggleObscureConfirm,
    required this.onSubmit,
    required this.onToggleMode,
    required this.onForgotPassword,
  });

  final bool registerMode;
  final bool loading;
  final bool obscurePassword;
  final bool obscureConfirm;
  final TextEditingController name;
  final TextEditingController email;
  final TextEditingController phone;
  final TextEditingController password;
  final TextEditingController confirmPassword;
  final VoidCallback onToggleObscure;
  final VoidCallback onToggleObscureConfirm;
  final VoidCallback onSubmit;
  final VoidCallback onToggleMode;
  final VoidCallback onForgotPassword;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Mode tabs
            Container(
              height: 44,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.page,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _TabButton(
                      label: 'Đăng nhập',
                      selected: !registerMode,
                      onTap: registerMode ? onToggleMode : null,
                    ),
                  ),
                  Expanded(
                    child: _TabButton(
                      label: 'Đăng ký',
                      selected: registerMode,
                      onTap: !registerMode ? onToggleMode : null,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: registerMode
                  ? Column(
                      key: const ValueKey('register'),
                      children: [
                        TextField(
                          controller: name,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            prefixIcon:
                                Icon(Icons.person_outline_rounded, size: 20),
                            labelText: 'Họ và tên',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: phone,
                          keyboardType: TextInputType.phone,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.phone_outlined, size: 20),
                            labelText: 'Số điện thoại',
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    )
                  : const SizedBox.shrink(key: ValueKey('login')),
            ),
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                labelText: 'Email',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: obscurePassword,
              textInputAction:
                  registerMode ? TextInputAction.next : TextInputAction.done,
              onSubmitted: registerMode ? null : (_) => onSubmit(),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                labelText: 'Mật khẩu',
                suffixIcon: IconButton(
                  icon: Icon(
                    obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20,
                    color: AppColors.muted,
                  ),
                  onPressed: onToggleObscure,
                ),
              ),
            ),
            if (registerMode) ...[
              const SizedBox(height: 12),
              TextField(
                controller: confirmPassword,
                obscureText: obscureConfirm,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => onSubmit(),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                  labelText: 'Xác nhận mật khẩu',
                  suffixIcon: IconButton(
                    icon: Icon(
                      obscureConfirm
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      size: 20,
                      color: AppColors.muted,
                    ),
                    onPressed: onToggleObscureConfirm,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: loading ? null : onSubmit,
              child: loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(registerMode ? 'Tạo tài khoản' : 'Đăng nhập'),
            ),
            if (!registerMode) ...[
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: onForgotPassword,
                  child: const Text('Quên mật khẩu?'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? AppColors.orange : AppColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _TrustPill extends StatelessWidget {
  const _TrustPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
