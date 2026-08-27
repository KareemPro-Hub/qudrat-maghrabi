import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';

class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._client);

  static const _mobileAuthCallback = 'qudratmaghrabi://reset-password';

  final SupabaseClient _client;

  @override
  Stream<void> get passwordRecoveryEvents => _client.auth.onAuthStateChange
      .where((data) => data.event == AuthChangeEvent.passwordRecovery)
      .map((_) {});

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
      final profile = await _fetchProfile(user.id);
      if (profile.role != AccountRole.student ||
          profile.primaryRole != AccountRole.student) {
        await _safeSignOut();
        return null;
      }
      return profile;
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

      final currentProfile = await _fetchProfile(user.id);
      if (!currentProfile.isActive) {
        await _safeSignOut();
        throw const AuthFailure(
          code: 'account_disabled',
          message: 'هذا الحساب موقوف. تواصل مع إدارة المنصة',
        );
      }

      if (currentProfile.role != AccountRole.student ||
          currentProfile.primaryRole != AccountRole.student) {
        await _safeSignOut();
        throw const AuthFailure(
          code: 'student_only',
          message: 'هذه المنصة مخصّصة لحسابات الطلاب فقط',
        );
      }

      await _client.rpc(
        'set_my_active_portal',
        params: {'p_portal': AccountRole.student.databaseValue},
      );
      return _fetchProfile(user.id);
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
  Future<void> signUp({
    required String fullName,
    required String email,
    required String phone,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email.trim().toLowerCase(),
        password: password,
        emailRedirectTo: 'https://www.qudratmaghrabi.com/login',
        data: {
          'full_name': fullName.trim(),
          'phone': _normalizePhone(phone),
          'role': AccountRole.student.databaseValue,
        },
      );

      if (response.user == null) {
        throw const AuthFailure(
          code: 'signup_failed',
          message: 'تعذّر إنشاء الحساب. حاول مرة أخرى',
        );
      }

      // مع تفعيل تأكيد البريد، Supabase مابيرجعش خطأ لو الإيميل مسجّل قبل كده
      // (حماية ضد تعداد الحسابات)؛ بيرجع مستخدم بـ identities فاضية. من غير
      // الفحص ده كان الطالب يشوف "تم إنشاء الحساب" وما توصلهوش رسالة ولا يقدر
      // يسجّل دخول بالباسورد اللي كتبه.
      if (response.user!.identities?.isEmpty ?? false) {
        throw const AuthFailure(
          code: 'user_already_exists',
          message: 'البريد الإلكتروني مسجّل مسبقًا. سجّل الدخول أو استخدم "نسيت كلمة المرور"',
        );
      }

      // Confirmation is required in production. Do not leave an accidental
      // session active if that setting is temporarily disabled.
      if (response.session != null) {
        await _safeSignOut();
      }
    } on AuthFailure {
      rethrow;
    } on AuthException catch (error) {
      throw AuthFailure(
        code: error.code ?? 'signup_error',
        message: _arabicSignUpMessage(error),
      );
    } catch (_) {
      throw const AuthFailure(
        code: 'network_error',
        message: 'تعذّر الاتصال بالمنصة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<void> sendPasswordReset({required String email}) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        redirectTo: _mobileAuthCallback,
      );
    } on AuthException catch (error) {
      throw AuthFailure(
        code: error.code ?? 'recovery_error',
        message: _arabicRecoveryMessage(error),
      );
    } catch (_) {
      throw const AuthFailure(
        code: 'network_error',
        message: 'تعذّر إرسال رابط الاستعادة. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<void> updateRecoveredPassword({required String password}) async {
    try {
      final response = await _client.auth.updateUser(
        UserAttributes(password: password),
      );
      if (response.user == null) {
        throw const AuthFailure(
          code: 'password_update_failed',
          message: 'تعذّر تحديث كلمة المرور. اطلب رابطًا جديدًا وحاول مجددًا',
        );
      }
      await _safeSignOut();
    } on AuthFailure {
      rethrow;
    } on AuthException catch (error) {
      throw AuthFailure(
        code: error.code ?? 'password_update_error',
        message: _arabicPasswordUpdateMessage(error),
      );
    } catch (_) {
      throw const AuthFailure(
        code: 'network_error',
        message: 'تعذّر تحديث كلمة المرور. تحقق من الإنترنت وحاول مجددًا',
      );
    }
  }

  @override
  Future<void> signOut() => _client.auth.signOut();

  Future<AuthProfile> _fetchProfile(String userId) async {
    final Map<String, dynamic>? data = await _client
        .rpc('get_my_access_profile')
        .maybeSingle();

    if (data == null) {
      throw const AuthFailure(
        code: 'profile_missing',
        message: 'الحساب موجود لكن ملف المستخدم غير مكتمل. تواصل مع الإدارة',
      );
    }

    final role = AccountRole.fromDatabase(data['role'] as String?);
    final primaryRole = AccountRole.fromDatabase(
      data['primary_role'] as String?,
    );
    if (role == null || primaryRole == null) {
      throw const AuthFailure(
        code: 'unsupported_role',
        message: 'هذا التطبيق مخصّص لحسابات الطلاب فقط',
      );
    }

    return AuthProfile(
      id: data['id'] as String,
      fullName: (data['full_name'] as String?)?.trim() ?? '',
      email: (data['email'] as String?)?.trim() ?? '',
      phone: (data['phone'] as String?)?.trim() ?? '',
      role: role,
      primaryRole: primaryRole,
      canUseParentPortal: data['can_use_parent_portal'] as bool? ?? false,
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
    if (compact.startsWith('9665') && compact.length == 12) {
      return '+$compact';
    }
    if (compact.startsWith('20') && compact.length == 12) {
      return '+$compact';
    }
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
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
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

  String _arabicSignUpMessage(AuthException error) {
    switch (error.code) {
      case 'user_already_exists':
        return 'البريد الإلكتروني مسجّل مسبقًا';
      case 'email_address_invalid':
        return 'أدخل بريدًا إلكترونيًا صحيحًا';
      case 'weak_password':
        return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل';
      case 'email_provider_disabled':
      case 'signup_disabled':
        return 'إنشاء الحسابات غير متاح حاليًا';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'تمت محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا';
      default:
        return 'تعذّر إنشاء الحساب. تحقق من البيانات وحاول مجددًا';
    }
  }

  String _arabicRecoveryMessage(AuthException error) {
    switch (error.code) {
      case 'email_address_invalid':
        return 'أدخل بريدًا إلكترونيًا صحيحًا';
      case 'over_email_send_rate_limit':
      case 'over_request_rate_limit':
        return 'تم إرسال طلبات كثيرة. انتظر قليلًا ثم حاول مجددًا';
      case 'email_provider_disabled':
        return 'استعادة كلمة المرور عبر البريد غير متاحة حاليًا';
      default:
        return 'تعذّر إرسال رابط الاستعادة. حاول مجددًا';
    }
  }

  String _arabicPasswordUpdateMessage(AuthException error) {
    switch (error.code) {
      case 'same_password':
        return 'اختر كلمة مرور مختلفة عن كلمة المرور الحالية';
      case 'weak_password':
        return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل';
      case 'session_not_found':
      case 'bad_jwt':
        return 'انتهت صلاحية رابط الاستعادة. اطلب رابطًا جديدًا';
      default:
        return 'تعذّر تحديث كلمة المرور. اطلب رابطًا جديدًا وحاول مجددًا';
    }
  }
}
