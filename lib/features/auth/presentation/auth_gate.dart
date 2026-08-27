import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
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
    super.key,
  });

  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final StudentHomeRepository studentHomeRepository;
  final StudentLearningRepository studentLearningRepository;
  final StudentQuizRepository studentQuizRepository;
  final SubscriptionRepository subscriptionRepository;
  final NotificationRepository notificationRepository;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthProfile? _profile;
  bool _restoringSession = true;
  bool _passwordRecoveryPending = false;
  StreamSubscription<void>? _passwordRecoverySubscription;

  @override
  void initState() {
    super.initState();
    _passwordRecoverySubscription = widget.authRepository.passwordRecoveryEvents
        .listen((_) {
          if (!mounted) return;
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
    if (!mounted) return;
    setState(() {
      if (!_passwordRecoveryPending) _profile = profile;
      _restoringSession = false;
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
    setState(() => _profile = null);
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
