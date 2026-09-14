import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';

/// «تذكرني» في شاشة الدخول.
///
/// Supabase بيحفظ الجلسة على الجهاز دائمًا، فالمربّع كان بلا أي أثر: الطالب
/// يشيله ويلاقي نفسه لسه مسجَّلًا عند فتح التطبيق. الخدمة دي تخزّن اختياره،
/// و[AuthGate] تُسقط الجلسة المحفوظة عند الإقلاع لو كان قد شال المربّع.
class RememberMeService {
  static const String prefKey = 'remember_me';

  // أي تعطّل في التخزين المحلي لا يجوز أن يعلّق شاشة البداية.
  static const Duration _storageTimeout = Duration(seconds: 2);

  /// الافتراضي `true` حتى لا نُخرج طلابًا سجّلوا دخولهم قبل وجود هذه الميزة.
  Future<bool> isEnabled() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(
        _storageTimeout,
      );
      return prefs.getBool(prefKey) ?? true;
    } catch (_) {
      return true;
    }
  }

  Future<void> setEnabled(bool value) async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(
        _storageTimeout,
      );
      await prefs.setBool(prefKey, value);
    } catch (_) {
      // التخزين المحلي غير متاح — نتجاهل بدل أن نمنع تسجيل الدخول.
    }
  }
}
