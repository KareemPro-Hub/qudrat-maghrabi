import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

abstract interface class AuthRepository {
  Stream<void> get passwordRecoveryEvents;

  Future<AuthProfile?> restoreSession();

  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
    required AccountRole expectedRole,
  });

  Future<void> signUp({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required AccountRole role,
  });

  Future<void> sendPasswordReset({required String email});

  Future<void> updateRecoveredPassword({required String password});

  Future<void> signOut();
}
