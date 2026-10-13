import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:qudrat_maghrabi_app/core/config/app_metadata.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

class AuthDiagnosticEvent {
  const AuthDiagnosticEvent({
    required this.operation,
    required this.errorType,
    required this.errorCode,
    this.statusCode,
    required this.reason,
  });

  final String operation;
  final String errorType;
  final String errorCode;
  final String? statusCode;
  final String reason;
}

/// رصد الأخطاء: أي خطأ يقع عند أي طالب بيتبعت تلقائيًا عشان نعرف بيه فورًا
/// بدل ما نستنى شكوى. الـ DSN عنوان استقبال عام (مش سر) وبيتشحن جوه التطبيق
/// أصلًا، فمفيش مشكلة إنه يبان في الكود.
abstract final class ErrorMonitoring {
  static const _dsn =
      'https://641a0129bc11366d0703fc5219dec34e@o4511987733757952.ingest.de.sentry.io/4511987767705680';

  /// ينظّف أي نص تشخيصي من المفاتيح ورموز الجلسة والبريد والجوال وكلمات المرور.
  static String sanitizeDiagnosticText(String raw) {
    if (raw.isEmpty) return raw;
    var sanitized = raw;
    sanitized = sanitized.replaceAll(
      RegExp(r'sb_(?:publishable|secret)_[A-Za-z0-9_-]+'),
      '[redacted-key]',
    );
    sanitized = sanitized.replaceAll(
      RegExp(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*'),
      '[redacted-token]',
    );
    sanitized = sanitized.replaceAll(
      RegExp(r'Bearer\s+[A-Za-z0-9._~+/=-]+', caseSensitive: false),
      'Bearer [redacted-token]',
    );
    sanitized = sanitized.replaceAllMapped(
      RegExp(
        r'(apikey|api_key|token|access_token|refresh_token|password|secret)\s*([:=])\s*[^\s,&"\}]+',
        caseSensitive: false,
      ),
      (match) => '${match.group(1)}${match.group(2)}[redacted-secret]',
    );
    sanitized = sanitized.replaceAll(
      RegExp(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'),
      '[redacted-email]',
    );
    sanitized = sanitized.replaceAll(
      RegExp(r'\+?\d[\d\s()-]{7,}\d'),
      '[redacted-phone]',
    );
    return sanitized;
  }

  /// يسجّل أعطال اتصال أو إعدادات المصادقة غير المتوقعة دون أي بيانات شخصية أو مفاتيح.
  static void reportAuthDiagnostic(AuthDiagnosticEvent event) {
    final cleanOp = sanitizeDiagnosticText(event.operation);
    final cleanCode = sanitizeDiagnosticText(event.errorCode);
    final cleanReason = sanitizeDiagnosticText(event.reason);
    final cleanStatus = event.statusCode == null
        ? null
        : sanitizeDiagnosticText(event.statusCode!);

    if (kDebugMode) {
      return;
    }

    try {
      unawaited(
        Sentry.captureEvent(
          SentryEvent(
            message: SentryMessage('auth_diagnostic:$cleanOp:$cleanCode'),
            level: SentryLevel.error,
            tags: {
              'auth_operation': cleanOp,
              'auth_error_code': cleanCode,
              if (cleanStatus != null && cleanStatus.isNotEmpty)
                'http_status': cleanStatus,
            },
            contexts: Contexts()
              ..['auth_diagnostic'] = {
                'operation': cleanOp,
                'error_type': sanitizeDiagnosticText(event.errorType),
                'error_code': cleanCode,
                if (cleanStatus != null && cleanStatus.isNotEmpty)
                  'status_code': cleanStatus,
                'reason': cleanReason,
              },
          ),
        ).then<void>((_) {}).catchError((Object _) {}),
      );
    } catch (_) {
      // فشل الرصد لا يجوز أن يغيّر سلوك التطبيق.
    }
  }

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
