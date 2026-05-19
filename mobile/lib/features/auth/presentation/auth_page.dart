import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({
    super.key,
    required this.repository,
    required this.apiBaseUrl,
    required this.onSignedIn,
  });

  final AuthRepository repository;
  final String apiBaseUrl;
  final ValueChanged<UserSession> onSignedIn;

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> with SingleTickerProviderStateMixin {
  final name = TextEditingController();
  final email = TextEditingController();
  final phone = TextEditingController();
  final password = TextEditingController();
  bool _obscurePassword = true;

  bool registerMode = false;
  bool loading = false;

  Future<void> submit() async {
    setState(() => loading = true);
    try {
      if (registerMode) {
        await widget.repository.register(
          fullName: name.text.trim(),
          email: email.text.trim(),
          phoneNumber: phone.text.trim(),
          password: password.text,
        );
      }

      final session = await widget.repository.login(
        email: email.text.trim(),
        password: password.text,
      );
      widget.onSignedIn(session);
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
      body: Stack(
        children: [
          // Gradient background
          Container(
            height: MediaQuery.of(context).size.height * 0.42,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xffee4d2d),
                  Color(0xffff7143),
                ],
              ),
            ),
          ),
          // Decorative circles
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
          // Content
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
                        registerMode: registerMode,
                        loading: loading,
                        obscurePassword: _obscurePassword,
                        name: name,
                        email: email,
                        phone: phone,
                        password: password,
                        onToggleObscure: () =>
                            setState(() => _obscurePassword = !_obscurePassword),
                        onSubmit: submit,
                        onToggleMode: () =>
                            setState(() => registerMode = !registerMode),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'API: ${widget.apiBaseUrl}',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.6),
                              fontSize: 10,
                            ),
                      ),
                      const SizedBox(height: 12),
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
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
          children: const [
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
    required this.name,
    required this.email,
    required this.phone,
    required this.password,
    required this.onToggleObscure,
    required this.onSubmit,
    required this.onToggleMode,
  });

  final bool registerMode;
  final bool loading;
  final bool obscurePassword;
  final TextEditingController name;
  final TextEditingController email;
  final TextEditingController phone;
  final TextEditingController password;
  final VoidCallback onToggleObscure;
  final VoidCallback onSubmit;
  final VoidCallback onToggleMode;

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
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                            labelText: 'Họ và tên',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: phone,
                          keyboardType: TextInputType.phone,
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
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
                labelText: 'Email',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: password,
              obscureText: obscurePassword,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                labelText: 'Mật khẩu',
                suffixIcon: IconButton(
                  icon: Icon(
                    obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    size: 20,
                    color: AppColors.muted,
                  ),
                  onPressed: onToggleObscure,
                ),
              ),
            ),
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
