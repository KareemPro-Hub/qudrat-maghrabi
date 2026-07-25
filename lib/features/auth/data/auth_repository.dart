import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

abstract interface class AuthRepository {
  Future<AuthProfile?> restoreSession();

  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
    required AccountRole expectedRole,
  });

  Future<void> signOut();
}
