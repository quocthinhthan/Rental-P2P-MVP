import 'package:flutter/material.dart';
import 'package:rental_p2p_mobile/core/theme/app_theme.dart';
import 'package:rental_p2p_mobile/core/widgets/error_snackbar.dart';
import 'package:rental_p2p_mobile/features/auth/data/auth_repository.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key, required this.repository});

  final AuthRepository repository;

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      showError(context, 'Vui lòng nhập email hợp lệ');
      return;
    }
    setState(() => _loading = true);
    try {
      await widget.repository.forgotPassword(email);
      if (!mounted) return;
      setState(() => _sent = true);
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
      backgroundColor: AppColors.page,
      body: Stack(
        children: [
          // Gradient top band
          Container(
            height: MediaQuery.of(context).size.height * 0.35,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xffee4d2d), Color(0xffff7143)],
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
          // Back button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: IconButton(
                icon:
                    const Icon(Icons.arrow_back_rounded, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
          // Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 32),
                      // Icon
                      Center(
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 24,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.lock_reset_rounded,
                              color: AppColors.orange, size: 36),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _sent ? 'Kiểm tra email!' : 'Quên mật khẩu?',
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _sent
                            ? 'Link đặt lại mật khẩu đã được gửi đến\n${_emailCtrl.text.trim()}'
                            : 'Nhập email tài khoản của bạn.\nChúng tôi sẽ gửi link đặt lại mật khẩu.',
                        style:
                            Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.85),
                                ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 28),
                      // Card
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 32,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(24),
                        child: _sent
                            ? _SuccessContent(
                                onBack: () => Navigator.pop(context))
                            : _FormContent(
                                emailCtrl: _emailCtrl,
                                loading: _loading,
                                onSubmit: _submit,
                              ),
                      ),
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

class _FormContent extends StatelessWidget {
  const _FormContent({
    required this.emailCtrl,
    required this.loading,
    required this.onSubmit,
  });

  final TextEditingController emailCtrl;
  final bool loading;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => onSubmit(),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.mail_outline_rounded, size: 20),
            labelText: 'Email',
            hintText: 'you@example.com',
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
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Gửi link đặt lại'),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Quay lại đăng nhập'),
        ),
      ],
    );
  }
}

class _SuccessContent extends StatelessWidget {
  const _SuccessContent({required this.onBack});
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.greenLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle_rounded,
                  color: AppColors.green, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Email đã được gửi thành công! Vui lòng kiểm tra hộp thư đến.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.green,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: onBack,
          child: const Text('Quay lại đăng nhập'),
        ),
      ],
    );
  }
}
