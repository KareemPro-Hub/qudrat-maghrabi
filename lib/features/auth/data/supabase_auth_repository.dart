import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<AuthProfile?> restoreSession() async {
    var session = _client.auth.currentSession;
    if (session == null) return null;

    if (session.isExpired) {
      try {
        session = (await _client.auth.refreshSession()).session;
      } on AuthException {
        await _safeSignOut();
        return null;
      }
    }

    final user = session?.user;
    if (user == null) return null;

    try {
      return await _fetchProfile(user.id);
    } on AuthFailure {
      await _safeSignOut();
      return null;
    } on PostgrestException {
      await _safeSignOut();
      return null;
    }
  }

  @override
  Future<AuthProfile> signIn({
    required String identifier,
    required String password,
    required AccountRole expectedRole,
  }) async {
    final normalizedIdentifier = identifier.trim();

    try {
      final AuthResponse response;
      if (normalizedIdentifier.contains('@')) {
        response = await _client.auth.signInWithPassword(
          email: normalizedIdentifier.toLowerCase(),
          password: password,
        );
      } else {
        response = await _client.auth.signInWithPassword(
          phone: _normalizePhone(normalizedIdentifier),
          password: password,
        );
      }

      final user = response.user;
      if (user == null) {
        throw const AuthFailure(
          code: 'missing_user',
          message: 'تعذّر قراءة بيانات الحساب. حاول مرة أخرى',
        );
      }

      final profile = await _fetchProfile(user.id);
      if (!profile.isActive) {
        await _safeSignOut();
        throw const AuthFailure(
          code: 'account_disabled',
          message: 'هذا الحساب موقوف. تواصل مع إدارة المنصة',
        );
      }

      if (profile.role != expectedRole) {
        await _safeSignOut();
        throw AuthFailure(
          code: 'role_mismatch',
          message:
              'هذا الحساب مسجّل بصفة ${profile.role.arabicLabel}. '
              'اختر نوع الحساب الصحيح ثم حاول مجددًا',
        );
      }

      return profile;
    } on AuthFailure {
      rethrow;
    } on AuthException catch (error) {
      throw AuthFailure(
        code: error.code ?? 'auth_error',
        message: _arabicAuthMessage(error),
      );
    } on PostgrestException {
      await _safeSignOut();
      throw const AuthFailure(
        code: 'profile_unavailable',
        message: 'تم التحقق من الحساب لكن تعذّر تحميل ملفه. حاول مجددًا',
      );
    } catch (_) {
      throw const AuthFailure(
        code: 'network_error',
        message: 'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  Future<AuthProfile> _fetchProfile(String userId) async {
    final Map<String, dynamic>? data = await _client
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active')
        .eq('id', userId)
        .maybeSingle();

    if (data == null) {
      throw const AuthFailure(
        code: 'profile_missing',
        message: 'الحساب موجود لكن ملف المستخدم غير مكتمل. تواصل مع الإدارة',
      );
    }

    final role = AccountRole.fromDatabase(data['role'] as String?);
    if (role == null) {
      throw const AuthFailure(
        code: 'unsupported_role',
        message: 'هذا التطبيق مخصص للطالب وولي الأمر فقط',
      );
    }

    return AuthProfile(
      id: data['id'] as String,
      fullName: (data['full_name'] as String?)?.trim() ?? '',
      email: (data['email'] as String?)?.trim() ?? '',
      phone: (data['phone'] as String?)?.trim() ?? '',
      role: role,
      isActive: data['is_active'] as bool? ?? true,
    );
  }

  Future<void> _safeSignOut() async {
    try {
      await _client.auth.signOut();
    } catch (_) {
      // Local session cleanup failures must not hide the original auth error.
    }
  }

  String _normalizePhone(String value) {
    final compact = value.replaceAll(RegExp(r'[\s()-]'), '');
    if (compact.startsWith('+')) return compact;
    if (compact.startsWith('05') && compact.length == 10) {
      return '+966${compact.substring(1)}';
    }
    if (compact.startsWith('01') && compact.length == 11) {
      return '+20${compact.substring(1)}';
    }
    return compact;
  }

  String _arabicAuthMessage(AuthException error) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'البريد الإلكتروني أو رقم الجوال أو كلمة المرور غير صحيحة';
      case 'email_not_confirmed':
        return 'فعّل بريدك الإلكتروني أولًا ثم حاول تسجيل الدخول';
      case 'phone_not_confirmed':
        return 'رقم الجوال غير مؤكّد بعد';
      case 'user_banned':
        return 'هذا الحساب موقوف. تواصل مع إدارة المنصة';
      case 'over_request_rate_limit':
      case 'request_timeout':
        return 'هناك محاولات كثيرة أو بطء في الاتصال. انتظر قليلًا ثم حاول';
      case 'email_provider_disabled':
      case 'phone_provider_disabled':
        return 'طريقة تسجيل الدخول هذه غير مفعّلة حاليًا';
      default:
        return 'تعذّر تسجيل الدخول. تحقق من البيانات والاتصال ثم حاول مجددًا';
    }
  }
}
