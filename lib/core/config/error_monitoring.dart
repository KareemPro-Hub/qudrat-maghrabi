import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:qudrat_maghrabi_app/core/config/app_metadata.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

/// رصد الأخطاء: أي خطأ يقع عند أي طالب بيتبعت تلقائيًا عشان نعرف بيه فورًا
/// بدل ما نستنى شكوى. الـ DSN عنوان استقبال عام (مش سر) وبيتشحن جوه التطبيق
/// أصلًا، فمفيش مشكلة إنه يبان في الكود.
abstract final class ErrorMonitoring {
  static const _dsn =
      'https://641a0129bc11366d0703fc5219dec34e@o4511987733757952.ingest.de.sentry.io/4511987767705680';

  /// بتشغّل التطبيق جوه نطاق محمي عشان أي خطأ غير متوقع يتسجّل.
  /// في وضع التطوير بنشغّل التطبيق على طول من غير رصد.
  static Future<void> runGuarded(FutureOr<void> Function() appRunner) async {
    if (kDebugMode) {
      await appRunner();
      return;
    }

    await SentryFlutter.init((options) {
      options.dsn = _dsn;
      options.environment = 'production';
      options.release =
          'qudrat-app@${AppMetadata.versionName}+${AppMetadata.buildNumber}';
      // ما نبعتش بيانات شخصية للطلاب — تفاصيل الخطأ التقنية بس
      options.sendDefaultPii = false;
      // رصد أخطاء فقط: مفيش تتبع أداء ولا تسجيل شاشة
      options.tracesSampleRate = 0.0;
      // انقطاع النت عن الطالب مش عطل في التطبيق — الجلسة بتترجع لوحدها
      // (اتصلح في 1.0.9). من غير الفلتر ده Sentry كان بيسجّله fatal ويغرق
      // التنبيهات بضجيج. أي خطأ شبكة تاني بيتبعت زي ما هو.
      options.beforeSend = (event, hint) {
        return _isOfflineNoise(event) ? null : event;
      };
    }, appRunner: appRunner);
  }

  /// بيرجّع true بس لخطأ فقدان الاتصال المعروف: فشل تجديد جلسة Supabase
  /// (`AuthRetryableFetchException`) أو فشل تحويل اسم النطاق
  /// (`SocketException: Failed host lookup`).
  static bool _isOfflineNoise(SentryEvent event) {
    final values = event.exceptions;
    if (values == null || values.isEmpty) return false;
    for (final exception in values) {
      final type = exception.type ?? '';
      final value = exception.value ?? '';
      if (type == 'AuthRetryableFetchException') return true;
      if (type == 'SocketException' && value.contains('Failed host lookup')) {
        return true;
      }
    }
    return false;
  }
}
