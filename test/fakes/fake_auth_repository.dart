import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({
    this.restoredProfile,
    AuthProfile? signInProfile,
    this.signInFailure,
  }) : signInProfile = signInProfile ?? studentProfile;

  static const studentProfile = AuthProfile(
    id: 'student-id',
    fullName: 'كريم محمد',
    email: 'student@example.com',
    phone: '0500000000',
    role: AccountRole.student,
    isActive: true,
  );

  AuthProfile? restoredProfile;
  AuthProfile signInProfile;
  AuthFailure? signInFailure;
  AccountRole? lastExpectedRole;
  int signInCalls = 0;
  int signOutCalls = 0;

  @override
  Future<AuthProfile?> restoreSession() async => restoredProfile;

  @override
  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
    required AccountRole expectedRole,
  }) async {
    signInCalls += 1;
    lastExpectedRole = expectedRole;
    final failure = signInFailure;
    if (failure != null) throw failure;
    return signInProfile;
  }

  @override
  Future<void> signOut() async {
    signOutCalls += 1;
    restoredProfile = null;
  }
}
