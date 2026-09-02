import 'dart:async';

import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({
    this.restoredProfile,
    AuthProfile? signInProfile,
    this.signInFailure,
    this.signUpFailure,
    this.passwordResetFailure,
    this.passwordUpdateFailure,
  }) : signInProfile = signInProfile ?? studentProfile;

  static const studentProfile = AuthProfile(
    id: 'student-id',
    fullName: 'كريم محمد',
    email: 'student@example.com',
    phone: '0500000000',
    role: AccountRole.student,
    primaryRole: AccountRole.student,
    isActive: true,
  );

  static const parentProfile = AuthProfile(
    id: 'parent-id',
    fullName: 'ولي أمر تجريبي',
    email: 'parent@example.com',
    phone: '0500000000',
    role: AccountRole.parent,
    primaryRole: AccountRole.parent,
    isActive: true,
  );

  AuthProfile? restoredProfile;
  AuthProfile signInProfile;
  AuthFailure? signInFailure;
  AuthFailure? signUpFailure;
  AuthFailure? passwordResetFailure;
  AuthFailure? passwordUpdateFailure;
  String? lastSignUpName;
  String? lastSignUpEmail;
  String? lastSignUpPhone;
  String? lastPasswordResetEmail;
  String? lastRecoveredPassword;
  int signInCalls = 0;
  int signUpCalls = 0;
  int passwordResetCalls = 0;
  int passwordUpdateCalls = 0;
  int signOutCalls = 0;

  final _passwordRecoveryController = StreamController<void>.broadcast();

  @override
  Stream<void> get passwordRecoveryEvents => _passwordRecoveryController.stream;

  void emitPasswordRecovery() {
    _passwordRecoveryController.add(null);
  }

  @override
  bool get hasStoredSession => storedSession;

  bool storedSession = false;

  @override
  Future<AuthProfile?> restoreSession() async => restoredProfile;

  @override
  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
  }) async {
    signInCalls += 1;
    final failure = signInFailure;
    if (failure != null) throw failure;
    return signInProfile;
  }

  @override
  Future<void> signUp({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    signUpCalls += 1;
    lastSignUpName = fullName;
    lastSignUpEmail = email;
    lastSignUpPhone = phone;
    final failure = signUpFailure;
    if (failure != null) throw failure;
  }

  @override
  Future<void> sendPasswordReset({required String email}) async {
    passwordResetCalls += 1;
    lastPasswordResetEmail = email;
    final failure = passwordResetFailure;
    if (failure != null) throw failure;
  }

  @override
  Future<void> updateRecoveredPassword({required String password}) async {
    passwordUpdateCalls += 1;
    lastRecoveredPassword = password;
    final failure = passwordUpdateFailure;
    if (failure != null) throw failure;
  }

  @override
  Future<void> signOut() async {
    signOutCalls += 1;
    restoredProfile = null;
    storedSession = false;
  }
}
