import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class SignedInCheckpointScreen extends StatefulWidget {
  const SignedInCheckpointScreen({
    required this.profile,
    required this.onSignOut,
    super.key,
  });

  final AuthProfile profile;
  final Future<void> Function() onSignOut;

  @override
  State<SignedInCheckpointScreen> createState() =>
      _SignedInCheckpointScreenState();
}

class _SignedInCheckpointScreenState extends State<SignedInCheckpointScreen> {
  bool _signingOut = false;

  Future<void> _signOut() async {
    setState(() => _signingOut = true);
    await widget.onSignOut();
    if (mounted) setState(() => _signingOut = false);
  }

  @override
  Widget build(BuildContext context) {
    final nameParts = widget.profile.fullName.trim().split(RegExp(r'\s+'));
    final firstName = nameParts.isEmpty ? '' : nameParts.first;

    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/brand/qudrat_maghrabi_logo.png',
                      width: 150,
                    ),
                    const SizedBox(height: 32),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        color: QmColors.success,
                        shape: BoxShape.circle,
                      ),
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Icon(
                          Icons.check_rounded,
                          color: Colors.white,
                          size: 36,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      firstName.isEmpty
                          ? 'تم تسجيل الدخول بنجاح'
                          : 'أهلًا $firstName، تم تسجيل الدخول',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: QmColors.textPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'تم التحقق من الحساب كـ ${widget.profile.role.arabicLabel}. '
                      'سنربطه بالواجهة الرئيسية في الخطوة القادمة.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: QmColors.textSecondary,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 30),
                    QmGradientButton(
                      label: _signingOut
                          ? 'جارٍ تسجيل الخروج...'
                          : 'تسجيل الخروج',
                      onPressed: _signingOut ? null : _signOut,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
