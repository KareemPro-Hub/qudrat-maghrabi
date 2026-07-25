import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

class FakeAccountRepository implements AccountRepository {
  int updateCalls = 0;
  int passwordCalls = 0;
  int deleteCalls = 0;

  @override
  Future<AuthProfile> updateProfile({
    required AuthProfile profile,
    required String fullName,
    required String phone,
  }) async {
    updateCalls += 1;
    return profile.copyWith(fullName: fullName.trim(), phone: phone.trim());
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    passwordCalls += 1;
  }

  @override
  Future<void> deleteAccount({required String password}) async {
    deleteCalls += 1;
  }
}
