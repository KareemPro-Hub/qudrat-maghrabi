import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/login_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/reset_password_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/presentation/signed_in_checkpoint_screen.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/presentation/parent_home_screen.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/presentation/student_home_screen.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({
    required this.authRepository,
    required this.accountRepository,
    required this.parentHomeRepository,
    required this.studentHomeRepository,
    required this.studentLearningRepository,
    required this.studentQuizRepository,
    super.key,
  });

  final AuthRepository authRepository;
  final AccountRepository accountRepository;
  final ParentHomeRepository parentHomeRepository;
  final StudentHomeRepository studentHomeRepository;
  final StudentLearningRepository studentLearningRepository;
  final StudentQuizRepository studentQuizRepository;

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
    final profile = await widget.authRepository.restoreSession();
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
    await widget.authRepository.signOut();
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
          await widget.authRepository.signOut();
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
        accountRepository: widget.accountRepository,
        parentHomeRepository: widget.parentHomeRepository,
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

    if (profile.role == AccountRole.parent) {
      return ParentHomeScreen(
        profile: profile,
        repository: widget.parentHomeRepository,
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

    return SignedInCheckpointScreen(profile: profile, onSignOut: _signOut);
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
