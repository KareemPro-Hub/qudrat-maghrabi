import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/auth_flow_scaffold.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({required this.authRepository, super.key});

  final AuthRepository authRepository;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _submitting = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);
    try {
      await widget.authRepository.sendPasswordReset(
        email: _emailController.text,
      );
      if (mounted) setState(() => _sent = true);
    } on AuthFailure catch (failure) {
      if (mounted) _showError(failure.message);
    } catch (_) {
      if (mounted) _showError('حدث خطأ غير متوقع. حاول مرة أخرى');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.error,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return AuthFlowScaffold(
      title: 'استعادة كلمة المرور',
      subtitle: 'سنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة',
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: _sent ? _buildSuccess(context) : _buildForm(),
      ),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        key: const ValueKey('recovery-form'),
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            key: const Key('recovery-email-input'),
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.email],
            onFieldSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              labelText: 'البريد الإلكتروني',
              hintText: 'name@example.com',
              prefixIcon: Icon(Icons.mail_outline_rounded),
            ),
            validator: (value) {
              final email = (value ?? '').trim();
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
                return 'أدخل بريدًا إلكترونيًا صحيحًا';
              }
              return null;
            },
          ),
          const SizedBox(height: 20),
          QmGradientButton(
            key: const Key('recovery-submit-button'),
            label: 'إرسال رابط الاستعادة',
            icon: Icons.send_rounded,
            isLoading: _submitting,
            onPressed: _submitting ? null : _submit,
          ),
        ],
      ),
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return Container(
      key: const ValueKey('recovery-success'),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.mark_email_read_rounded,
            color: QmColors.success,
            size: 54,
          ),
          const SizedBox(height: 16),
          Text(
            'راجع بريدك الإلكتروني',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: QmColors.textPrimary,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'إذا كان البريد مرتبطًا بحساب، ستصلك رسالة الاستعادة. '
            'افتح الرابط من هاتفك لإكمال التغيير داخل التطبيق.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: QmColors.textSecondary,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            key: const Key('recovery-back-button'),
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_forward_rounded),
            label: const Text('العودة لتسجيل الدخول'),
          ),
        ],
      ),
    );
  }
}
