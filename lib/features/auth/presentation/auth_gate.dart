import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/biometric_lock_service.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/login_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/reset_password_screen.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/presentation/student_home_screen.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({
    required this.authRepository,
    required this.accountRepository,
    required this.studentHomeRepository,
    required this.studentLearningRepository,
    required this.studentQuizRepository,
    required this.subscriptionRepository,
    required this.notificationRepository,
    this.biometricLock,
    super.key,
  });

  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final StudentHomeRepository studentHomeRepository;
  final StudentLearningRepository studentLearningRepository;
  final StudentQuizRepository studentQuizRepository;
  final SubscriptionRepository subscriptionRepository;
  final NotificationRepository notificationRepository;
  final BiometricLockService? biometricLock;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthProfile? _profile;
  bool _restoringSession = true;
  bool _passwordRecoveryPending = false;
  // قفل البصمة بيتفعّل عند فتح التطبيق على جلسة محفوظة فقط، مش بعد تسجيل
  // دخول جديد لأن الطالب يكون أكّد هويته بكلمة المرور لسه.
  bool _locked = false;
  bool _unlocking = false;
  StreamSubscription<void>? _passwordRecoverySubscription;
  late final BiometricLockService _biometricLock =
      widget.biometricLock ?? BiometricLockService();

  @override
  void initState() {
    super.initState();
    _passwordRecoverySubscription = widget.authRepository.passwordRecoveryEvents
        .listen((_) {
          if (!mounted) return;
          // شاشة "عيّن كلمة مرور جديدة" بتتعرض كجسم AuthGate نفسه (الصفحة
          // الأولى)، بينما "نسيت كلمة المرور" و"إنشاء حساب" بيتفتحوا كصفحات
          // فوقها. من غير إغلاق الصفحات دي، الطالب بيرجع من رابط البريد
          // ويلاقي نفسه لسه على شاشة "راجع بريدك الإلكتروني" وشاشة كلمة
          // المرور الجديدة مغطّاة تحتها، فيفتكر إن الرابط مش شغال.
          Navigator.maybeOf(context)?.popUntil((route) => route.isFirst);
          setState(() {
            _passwordRecoveryPending = true;
            _restoringSession = false;
            _profile = null;
          });
        });
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    // من غير try/catch كان أي خطأ شبكة أثناء استعادة الجلسة (نت ضعيف أو مقطوع)
    // بيخلي المستخدم على شاشة التحميل للأبد من غير أي طريقة يخرج بيها.
    AuthProfile? profile;
    try {
      profile = await widget.authRepository.restoreSession();
    } catch (_) {
      profile = null;
    }
    var locked = false;
    if (profile != null) {
      locked = await _biometricLock.isEnabled();
    }
    if (!mounted) return;
    setState(() {
      if (!_passwordRecoveryPending) _profile = profile;
      _locked = !_passwordRecoveryPending && locked;
      _restoringSession = false;
    });
    if (_locked) unawaited(_unlock());
  }

  Future<void> _unlock() async {
    if (_unlocking) return;
    setState(() => _unlocking = true);
    final unlocked = await _biometricLock.authenticate();
    if (!mounted) return;
    setState(() {
      _unlocking = false;
      if (unlocked) _locked = false;
    });
  }

  @override
  void dispose() {
    _passwordRecoverySubscription?.cancel();
    super.dispose();
  }

  Future<void> _signOut() async {
    // فشل نداء الخروج (نت مقطوع) مكانش المفروض يمنع الخروج من الواجهة نفسها.
    try {
      await widget.authRepository.signOut();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _profile = null;
      _locked = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_passwordRecoveryPending) {
      return ResetPasswordScreen(
        authRepository: widget.authRepository,
        onCompleted: () {
          if (!mounted) return;
          setState(() {
            _passwordRecoveryPending = false;
            _profile = null;
            _restoringSession = false;
          });
        },
        onCancelled: () async {
          // الشاشة دي PopScope(canPop: false)، فلو نداء الخروج رمى استثناء كان
          // الزرار ما بيعملش حاجة والمستخدم يفضل محبوس فيها.
          try {
            await widget.authRepository.signOut();
          } catch (_) {}
          if (!mounted) return;
          setState(() {
            _passwordRecoveryPending = false;
            _profile = null;
            _restoringSession = false;
          });
        },
      );
    }

    if (_restoringSession) {
      return const _SessionLoadingScreen();
    }

    final profile = _profile;
    if (profile == null) {
      return LoginScreen(
        authRepository: widget.authRepository,
        onSignedIn: (signedInProfile) {
          setState(() => _profile = signedInProfile);
        },
      );
    }

    if (_locked) {
      return _BiometricLockScreen(
        busy: _unlocking,
        onUnlock: _unlock,
        onSignOut: _signOut,
      );
    }

    if (profile.role == AccountRole.student) {
      return StudentHomeScreen(
        profile: profile,
        repository: widget.studentHomeRepository,
        learningRepository: widget.studentLearningRepository,
        quizRepository: widget.studentQuizRepository,
        subscriptionRepository: widget.subscriptionRepository,
        notificationRepository: widget.notificationRepository,
        accountRepository: widget.accountRepository,
        onProfileUpdated: (updatedProfile) {
          setState(() => _profile = updatedProfile);
        },
        onAccountDeleted: () async {
          if (!mounted) return;
          setState(() => _profile = null);
        },
        onSignOut: _signOut,
      );
    }

    return _StudentOnlyScreen(onSignOut: _signOut);
  }
}

class _BiometricLockScreen extends StatelessWidget {
  const _BiometricLockScreen({
    required this.busy,
    required this.onUnlock,
    required this.onSignOut,
  });

  final bool busy;
  final Future<void> Function() onUnlock;
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset('assets/brand/qudrat_maghrabi_logo.png', width: 128),
              const SizedBox(height: 28),
              const Icon(
                Icons.fingerprint_rounded,
                color: QmColors.purple,
                size: 58,
              ),
              const SizedBox(height: 14),
              const Text(
                'التطبيق مقفول',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
              ),
              const SizedBox(height: 8),
              const Text(
                'أكّد هويتك بالبصمة لفتح حسابك',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                key: const Key('biometric-unlock-button'),
                onPressed: busy ? null : onUnlock,
                child: Text(busy ? 'جارٍ التحقق...' : 'فتح بالبصمة'),
              ),
              const SizedBox(height: 6),
              TextButton(
                key: const Key('biometric-signout-button'),
                onPressed: busy ? null : onSignOut,
                child: const Text('تسجيل الخروج'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentOnlyScreen extends StatelessWidget {
  const _StudentOnlyScreen({required this.onSignOut});

  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.school_rounded, color: QmColors.pink, size: 52),
              const SizedBox(height: 16),
              const Text(
                'هذه المنصة مخصّصة لحسابات الطلاب فقط',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onSignOut,
                child: const Text('تسجيل الخروج'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SessionLoadingScreen extends StatelessWidget {
  const _SessionLoadingScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/brand/qudrat_maghrabi_logo.png', width: 138),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: QmColors.pink),
          ],
        ),
      ),
    );
  }
}
