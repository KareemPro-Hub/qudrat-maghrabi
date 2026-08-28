import 'dart:async';

import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// قفل التطبيق ببصمة الإصبع أو بصمة الوجه.
///
/// الجلسة نفسها بيحفظها Supabase زي ما هي؛ الخدمة دي بس بتقرر هل نطلب من
/// الطالب يأكّد هويته قبل ما نعرض له محتوى التطبيق عند فتحه.
class BiometricLockService {
  BiometricLockService({LocalAuthentication? auth})
    : _auth = auth ?? LocalAuthentication();

  static const String prefKey = 'biometric_lock_enabled';

  final LocalAuthentication _auth;

  /// هل الجهاز نفسه يدعم البصمة وفيها بصمة مسجّلة فعلًا.
  Future<bool> isSupported() async {
    try {
      if (!await _auth.isDeviceSupported()) return false;
      return await _auth.canCheckBiometrics;
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }

  // شاشة البداية بتستنى القراءة دي، فأي تعطّل في التخزين المحلي لازم ينتهي
  // بمهلة بدل ما يسيب الطالب على شاشة تحميل للأبد.
  static const Duration _storageTimeout = Duration(seconds: 2);

  Future<bool> isEnabled() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(
        _storageTimeout,
      );
      return prefs.getBool(prefKey) ?? false;
    } catch (_) {
      // لو التخزين المحلي فشل، الأأمن إننا ما نقفلش التطبيق على الطالب.
      return false;
    }
  }

  Future<void> setEnabled(bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(
        _storageTimeout,
      );
      await prefs.setBool(prefKey, value);
    } catch (_) {
      // مجرد تفضيل؛ فشل الحفظ مايستاهلش نكسر الشاشة.
    }
  }

  /// يطلب من النظام تأكيد الهوية. بيسمح برمز قفل الجهاز كبديل عشان الطالب
  /// ما يتقفلش بره التطبيق لو البصمة ما اشتغلتش.
  Future<bool> authenticate({
    String reason = 'أكّد هويتك لفتح تطبيق قدرات المغربي',
  }) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    } catch (_) {
      return false;
    }
  }
}
