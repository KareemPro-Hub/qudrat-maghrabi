import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:qudrat_maghrabi_app/core/config/app_environment.dart';
import 'package:qudrat_maghrabi_app/core/config/app_metadata.dart';

/// معلومات آخر نسخة أندرويد منشورة على موقع المنصة.
class AppUpdateInfo {
  const AppUpdateInfo({
    required this.version,
    required this.build,
    required this.url,
  });

  final String version;
  final int build;
  final String url;
}

/// تطبيق أندرويد بيتوزّع من موقع المنصة مباشرة مش من متجر، فمفيش تحديث
/// تلقائي: الطالب ممكن يفضل على نسخة قديمة للأبد. الخدمة دي بتقارن رقم
/// البناء الحالي بآخر بناء منشور على الموقع عشان نعرض له تنبيه بالتحديث.
///
/// على iOS بترجع null دايمًا لأن التحديث بيتم من App Store.
/// وأي فشل (نت مقطوع، ملف ناقص، رد غير متوقع) بيرجع null بهدوء —
/// التنبيه ده إضافة مش وظيفة أساسية، فما ينفعش يعطّل الشاشة.
class AppUpdateService {
  /// [client] للحقن في الاختبارات؛ لو null بننشئ واحد ونقفله بعد الطلب.
  const AppUpdateService({this.client});

  final http.Client? client;

  static const _manifestPath = '/downloads/android-version.json';

  Future<AppUpdateInfo?> checkForUpdate() async {
    if (defaultTargetPlatform != TargetPlatform.android) return null;

    final httpClient = client ?? http.Client();
    try {
      final response = await httpClient
          .get(Uri.parse('${AppEnvironment.platformBaseUrl}$_manifestPath'))
          .timeout(const Duration(seconds: 8));
      if (response.statusCode != 200) return null;

      final data = jsonDecode(response.body);
      if (data is! Map) return null;

      final latestBuild = _asInt(data['build']);
      final currentBuild = int.tryParse(AppMetadata.buildNumber) ?? 0;
      if (latestBuild <= currentBuild) return null;

      final url = (data['url'] as String?)?.trim();
      if (url == null || url.isEmpty) return null;

      return AppUpdateInfo(
        version: (data['version'] as String?)?.trim() ?? '',
        build: latestBuild,
        url: url,
      );
    } catch (_) {
      return null;
    } finally {
      if (client == null) httpClient.close();
    }
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
