import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/auth_flow_scaffold.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({
    required this.authRepository,
    required this.onCompleted,
    required this.onCancelled,
    super.key,
  });

  final AuthRepository authRepository;
  final VoidCallback onCompleted;
  final Future<void> Function() onCancelled;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  bool _submitting = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);
    try {
      await widget.authRepository.updateRecoveredPassword(
        password: _passwordController.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تم تحديث كلمة المرور بنجاح. سجّل الدخول بكلمتك الجديدة',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.success,
        ),
      );
      widget.onCompleted();
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
    return PopScope(
      canPop: false,
      child: AuthFlowScaffold(
        showBackButton: false,
        title: 'عيّن كلمة مرور جديدة',
        subtitle: 'اختر كلمة قوية لا تقل عن 8 أحرف',
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                key: const Key('new-password-input'),
                controller: _passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(
                  labelText: 'كلمة المرور الجديدة',
                  prefixIcon: const Icon(Icons.lock_outline_rounded),
                  suffixIcon: IconButton(
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                  ),
                ),
                validator: (value) {
                  if ((value ?? '').length < 8) {
                    return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                key: const Key('confirm-new-password-input'),
                controller: _confirmController,
                obscureText: _obscureConfirmation,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.newPassword],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'تأكيد كلمة المرور الجديدة',
                  prefixIcon: const Icon(Icons.lock_reset_rounded),
                  suffixIcon: IconButton(
                    onPressed: () {
                      setState(
                        () => _obscureConfirmation = !_obscureConfirmation,
                      );
                    },
                    icon: Icon(
                      _obscureConfirmation
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                  ),
                ),
                validator: (value) {
                  if (value != _passwordController.text) {
                    return 'كلمتا المرور غير متطابقتين';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 22),
              QmGradientButton(
                key: const Key('update-password-button'),
                label: 'حفظ كلمة المرور',
                icon: Icons.check_rounded,
                isLoading: _submitting,
                onPressed: _submitting ? null : _submit,
              ),
              const SizedBox(height: 10),
              TextButton(
                key: const Key('cancel-password-recovery-button'),
                onPressed: _submitting ? null : widget.onCancelled,
                child: const Text('إلغاء والعودة لتسجيل الدخول'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
