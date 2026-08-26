import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/auth_flow_scaffold.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';
import 'package:url_launcher/url_launcher.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({required this.authRepository, super.key});

  final AuthRepository authRepository;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  bool _agreeToTerms = false;
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError ? QmColors.error : QmColors.deepPurple,
        ),
      );
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (!_agreeToTerms) {
      _showMessage(
        'وافق على الشروط وسياسة الخصوصية لإكمال إنشاء الحساب',
        isError: true,
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await widget.authRepository.signUp(
        fullName: _nameController.text,
        email: _emailController.text,
        phone: _phoneController.text,
        password: _passwordController.text,
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          icon: const Icon(
            Icons.mark_email_read_rounded,
            color: QmColors.success,
            size: 42,
          ),
          title: const Text('تم إنشاء الحساب'),
          content: Text(
            'أرسلنا رسالة تأكيد إلى ${_emailController.text.trim()}. '
            'افتحها لتفعيل حسابك ثم سجّل الدخول.',
            textAlign: TextAlign.center,
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            FilledButton(
              key: const Key('registration-success-button'),
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('العودة لتسجيل الدخول'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pop(context);
    } on AuthFailure catch (failure) {
      if (mounted) _showMessage(failure.message, isError: true);
    } catch (_) {
      if (mounted) {
        _showMessage('حدث خطأ غير متوقع. حاول مرة أخرى', isError: true);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openLegalPage(String path) async {
    final uri = Uri.parse('https://www.qudratmaghrabi.com/$path');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      _showMessage('تعذّر فتح الصفحة الآن', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthFlowScaffold(
      title: 'أنشئ حساب الطالب',
      subtitle: 'ابدأ رحلتك نحو التفوق مع قدرات المغربي.',
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              key: const Key('register-name-input'),
              controller: _nameController,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.name],
              decoration: const InputDecoration(
                labelText: 'الاسم الأول والثاني',
                hintText: 'مثال: محمد أحمد',
                prefixIcon: Icon(Icons.person_outline_rounded),
              ),
              validator: (value) {
                final parts = (value ?? '')
                    .trim()
                    .split(RegExp(r'\s+'))
                    .where((part) => part.isNotEmpty)
                    .toList();
                if (parts.length < 2) return 'أدخل الاسم الأول والثاني';
                return null;
              },
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('register-email-input'),
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(
                labelText: 'البريد الإلكتروني',
                hintText: 'name@example.com',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
              validator: _validateEmail,
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('register-phone-input'),
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.telephoneNumber],
              decoration: const InputDecoration(
                labelText: 'رقم الجوال',
                hintText: '05xxxxxxxx',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              validator: _validatePhone,
            ),
            const SizedBox(height: 14),
            TextFormField(
              key: const Key('register-password-input'),
              controller: _passwordController,
              obscureText: _obscurePassword,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                labelText: 'كلمة المرور',
                hintText: '8 أحرف على الأقل',
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
              key: const Key('register-confirm-input'),
              controller: _confirmController,
              obscureText: _obscureConfirmation,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.newPassword],
              onFieldSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'تأكيد كلمة المرور',
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
            const SizedBox(height: 12),
            CheckboxListTile(
              key: const Key('register-terms-checkbox'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              activeColor: QmColors.pink,
              value: _agreeToTerms,
              onChanged: (value) {
                setState(() => _agreeToTerms = value ?? false);
              },
              title: Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text('أوافق على '),
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => _openLegalPage('terms'),
                    child: const Text('الشروط'),
                  ),
                  const Text(' و '),
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: () => _openLegalPage('privacy'),
                    child: const Text('سياسة الخصوصية'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            QmGradientButton(
              key: const Key('register-submit-button'),
              label: 'إنشاء الحساب',
              icon: Icons.school_rounded,
              isLoading: _submitting,
              onPressed: _submitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }

  String? _validateEmail(String? value) {
    final email = (value ?? '').trim();
    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      return 'أدخل بريدًا إلكترونيًا صحيحًا';
    }
    return null;
  }

  String? _validatePhone(String? value) {
    final compact = (value ?? '').replaceAll(RegExp(r'[\s()-]'), '');
    final normalized = compact.startsWith('+')
        ? compact
        : compact.startsWith('05') && compact.length == 10
        ? '+966${compact.substring(1)}'
        : compact.startsWith('9665') && compact.length == 12
        ? '+$compact'
        : compact.startsWith('01') && compact.length == 11
        ? '+20${compact.substring(1)}'
        : compact.startsWith('20') && compact.length == 12
        ? '+$compact'
        : compact;
    if (!RegExp(r'^\+[1-9][0-9]{7,14}$').hasMatch(normalized)) {
      return 'أدخل رقم جوال صحيحًا، مثل 05xxxxxxxx';
    }
    return null;
  }
}
