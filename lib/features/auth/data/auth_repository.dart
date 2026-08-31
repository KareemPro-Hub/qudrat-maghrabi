import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

abstract interface class AuthRepository {
  Stream<void> get passwordRecoveryEvents;

  /// هل فيه جلسة محفوظة على الجهاز (حتى لو استعادتها فشلت مؤقتًا).
  bool get hasStoredSession;

  Future<AuthProfile?> restoreSession();

  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
  });

  Future<void> signUp({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  });

  Future<void> sendPasswordReset({required String email});

  Future<void> updateRecoveredPassword({required String password});

  Future<void> signOut();
}
