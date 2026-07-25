import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.authRepository,
    required this.onSignedIn,
    super.key,
  });

  final AuthRepository authRepository;
  final ValueChanged<AuthProfile> onSignedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  AccountRole _selectedRole = AccountRole.student;
  bool _rememberMe = true;
  bool _obscurePassword = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
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

    setState(() => _isSubmitting = true);
    try {
      final profile = await widget.authRepository.signIn(
        identifier: _emailController.text,
        password: _passwordController.text,
        expectedRole: _selectedRole,
      );
      if (!mounted) return;
      widget.onSignedIn(profile);
    } on AuthFailure catch (failure) {
      if (!mounted) return;
      _showMessage(failure.message, isError: true);
    } catch (_) {
      if (!mounted) return;
      _showMessage('حدث خطأ غير متوقع. حاول مرة أخرى', isError: true);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              if (constraints.maxWidth <= 0 || constraints.maxHeight <= 0) {
                return const SizedBox.shrink();
              }

              return SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 22,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight > 44
                        ? constraints.maxHeight - 44
                        : 0,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _BrandHeader(
                              logoWidth: constraints.maxWidth < 380 ? 138 : 154,
                            ),
                            const SizedBox(height: 28),
                            Row(
                              children: [
                                Expanded(
                                  child: _RoleCard(
                                    key: const Key('student-role'),
                                    selectionKey: const Key(
                                      'student-role-check',
                                    ),
                                    label: 'طالب',
                                    icon: Icons.school_rounded,
                                    selected:
                                        _selectedRole == AccountRole.student,
                                    onTap: () {
                                      setState(() {
                                        _selectedRole = AccountRole.student;
                                      });
                                    },
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _RoleCard(
                                    key: const Key('parent-role'),
                                    selectionKey: const Key(
                                      'parent-role-check',
                                    ),
                                    label: 'ولي أمر',
                                    icon: Icons.group_rounded,
                                    selected:
                                        _selectedRole == AccountRole.parent,
                                    onTap: () {
                                      setState(() {
                                        _selectedRole = AccountRole.parent;
                                      });
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 22),
                            TextFormField(
                              key: const Key('email-input'),
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.next,
                              autofillHints: const [
                                AutofillHints.email,
                                AutofillHints.telephoneNumber,
                              ],
                              decoration: const InputDecoration(
                                hintText: 'البريد الإلكتروني أو رقم الجوال',
                                prefixIcon: Icon(Icons.mail_outline_rounded),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'أدخل البريد الإلكتروني أو رقم الجوال';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              key: const Key('password-input'),
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              autofillHints: const [AutofillHints.password],
                              onFieldSubmitted: (_) => _submit(),
                              decoration: InputDecoration(
                                hintText: 'كلمة المرور',
                                prefixIcon: const Icon(
                                  Icons.lock_outline_rounded,
                                ),
                                suffixIcon: IconButton(
                                  key: const Key('toggle-password'),
                                  tooltip: _obscurePassword
                                      ? 'إظهار كلمة المرور'
                                      : 'إخفاء كلمة المرور',
                                  onPressed: () {
                                    setState(() {
                                      _obscurePassword = !_obscurePassword;
                                    });
                                  },
                                  icon: Icon(
                                    _obscurePassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'أدخل كلمة المرور';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    key: const Key('remember-me'),
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: () {
                                      setState(() {
                                        _rememberMe = !_rememberMe;
                                      });
                                    },
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Checkbox(
                                          value: _rememberMe,
                                          activeColor: QmColors.pink,
                                          side: const BorderSide(
                                            color: QmColors.border,
                                          ),
                                          onChanged: (value) {
                                            setState(() {
                                              _rememberMe = value ?? false;
                                            });
                                          },
                                        ),
                                        Text(
                                          'تذكرني',
                                          style: Theme.of(context)
                                              .textTheme
                                              .bodyMedium
                                              ?.copyWith(
                                                color: QmColors.textSecondary,
                                              ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                TextButton(
                                  key: const Key('forgot-password-button'),
                                  onPressed: () => _showMessage(
                                    'سيتم تفعيل استعادة كلمة المرور عند الربط',
                                  ),
                                  child: const Text('نسيت كلمة المرور؟'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            QmGradientButton(
                              key: const Key('login-button'),
                              label: 'تسجيل الدخول',
                              isLoading: _isSubmitting,
                              onPressed: _isSubmitting ? null : _submit,
                            ),
                            const SizedBox(height: 22),
                            const _OrDivider(),
                            const SizedBox(height: 12),
                            TextButton(
                              key: const Key('create-account-button'),
                              onPressed: () => _showMessage(
                                'سننفّذ إنشاء الحساب بعد اعتماد شاشة الدخول',
                              ),
                              child: Text.rich(
                                TextSpan(
                                  text: 'ليس لديك حساب؟ ',
                                  style: Theme.of(context).textTheme.bodyMedium
                                      ?.copyWith(color: QmColors.textSecondary),
                                  children: const [
                                    TextSpan(
                                      text: 'إنشاء حساب',
                                      style: TextStyle(
                                        color: QmColors.pink,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader({required this.logoWidth});

  final double logoWidth;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Image.asset(
          'assets/brand/qudrat_maghrabi_logo.png',
          width: logoWidth,
          semanticLabel: 'شعار قدرات المغربي',
        ),
        const SizedBox(height: 20),
        Text(
          'أهلًا بعودتك',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            color: QmColors.textPrimary,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'سجّل دخولك للمتابعة والتعلّم',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: QmColors.textSecondary,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.selectionKey,
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final Key selectionKey;
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: 112,
            decoration: BoxDecoration(
              color: selected
                  ? QmColors.pink.withValues(alpha: 0.035)
                  : QmColors.surfaceSoft,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selected ? QmColors.pink : QmColors.border,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ShaderMask(
                        shaderCallback: (bounds) =>
                            QmGradients.brand.createShader(bounds),
                        child: Icon(icon, color: Colors.white, size: 36),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              color: selected
                                  ? QmColors.pink
                                  : QmColors.textSecondary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                  ),
                ),
                if (selected)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: KeyedSubtree(
                      key: selectionKey,
                      child: const DecoratedBox(
                        decoration: BoxDecoration(
                          color: QmColors.pink,
                          shape: BoxShape.circle,
                        ),
                        child: Padding(
                          padding: EdgeInsets.all(3),
                          child: Icon(
                            Icons.check_rounded,
                            color: Colors.white,
                            size: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'أو',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: QmColors.textMuted),
          ),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }
}
