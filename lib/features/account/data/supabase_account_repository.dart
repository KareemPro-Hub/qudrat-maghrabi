import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseAccountRepository implements AccountRepository {
  const SupabaseAccountRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<AuthProfile> updateProfile({
    required AuthProfile profile,
    required String fullName,
    required String phone,
  }) async {
    try {
      final row = await _client
          .from('profiles')
          .update({'full_name': fullName.trim(), 'phone': phone.trim()})
          .eq('id', profile.id)
          .select('full_name, phone')
          .single();
      return profile.copyWith(
        fullName: (row['full_name'] as String?)?.trim() ?? fullName.trim(),
        phone: (row['phone'] as String?)?.trim() ?? phone.trim(),
      );
    } on PostgrestException {
      throw const AccountFailure('تعذّر حفظ البيانات. حاول مرة أخرى');
    } catch (_) {
      throw const AccountFailure('تحقق من اتصالك بالإنترنت وحاول مجددًا');
    }
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _reauthenticate(currentPassword);
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
    } on AuthException catch (error) {
      throw AccountFailure(_authMessage(error));
    } catch (_) {
      throw const AccountFailure('تعذّر تغيير كلمة المرور. حاول مرة أخرى');
    }
  }

  @override
  Future<void> deleteAccount({required String password}) async {
    await _reauthenticate(password);
    try {
      await _client.rpc('delete_my_account');
      await _client.auth.signOut(scope: SignOutScope.local);
    } on PostgrestException {
      throw const AccountFailure(
        'تعذّر حذف الحساب نهائيًا. تواصل مع الدعم إذا استمرت المشكلة',
      );
    } on AuthException catch (error) {
      throw AccountFailure(_authMessage(error));
    } catch (_) {
      throw const AccountFailure('تعذّر إكمال الحذف. حاول مرة أخرى');
    }
  }

  Future<void> _reauthenticate(String password) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw const AccountFailure('انتهت جلسة الدخول. سجّل دخولك من جديد');
    }
    try {
      if (user.email != null && user.email!.isNotEmpty) {
        await _client.auth.signInWithPassword(
          email: user.email!,
          password: password,
        );
      } else if (user.phone != null && user.phone!.isNotEmpty) {
        await _client.auth.signInWithPassword(
          phone: user.phone!,
          password: password,
        );
      } else {
        throw const AccountFailure(
          'لا توجد وسيلة دخول مؤكدة لإعادة التحقق من الحساب',
        );
      }
    } on AccountFailure {
      rethrow;
    } on AuthException catch (error) {
      throw AccountFailure(_authMessage(error));
    }
  }

  String _authMessage(AuthException error) {
    if (error.code == 'invalid_credentials') {
      return 'كلمة المرور الحالية غير صحيحة';
    }
    if (error.code == 'same_password') {
      return 'اختر كلمة مرور جديدة مختلفة عن الحالية';
    }
    if (error.code == 'weak_password') {
      return 'كلمة المرور الجديدة ضعيفة';
    }
    return 'تعذّر التحقق من الحساب. حاول مرة أخرى';
  }
}
