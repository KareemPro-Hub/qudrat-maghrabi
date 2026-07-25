import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

abstract interface class AccountRepository {
  Future<AuthProfile> updateProfile({
    required AuthProfile profile,
    required String fullName,
    required String phone,
  });

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });

  Future<void> deleteAccount({required String password});
}

class AccountFailure implements Exception {
  const AccountFailure(this.message);

  final String message;

  @override
  String toString() => message;
}
