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

/// تنبيه الطالب بوجود نسخة أحدث.
///
/// **أندرويد:** التطبيق بيتوزّع من موقع المنصة مباشرة مش من متجر، فمفيش
/// تحديث تلقائي — بنقارن رقم البناء الحالي بآخر بناء منشور على الموقع.
///
/// **iOS:** التحديث من App Store، لكن الطالب ممكن يفضل شهورًا على نسخة
/// قديمة من غير ما ينتبه (حصل فعلًا وشكا منه طالب). بنسأل واجهة أبل
/// العامة عن آخر نسخة منشورة ونقارنها برقم نسخة التطبيق. واجهة مفتوحة
/// بلا مفاتيح ولا حساب.
///
/// أي فشل (نت مقطوع، ملف ناقص، رد غير متوقع) بيرجع null بهدوء —
/// التنبيه ده إضافة مش وظيفة أساسية، فما ينفعش يعطّل الشاشة.
class AppUpdateService {
  /// [client] للحقن في الاختبارات؛ لو null بننشئ واحد ونقفله بعد الطلب.
  const AppUpdateService({this.client});

  final http.Client? client;

  static const _manifestPath = '/downloads/android-version.json';
  static const _appStoreLookup =
      'https://itunes.apple.com/lookup?id=${AppMetadata.appStoreTrackId}'
      '&country=sa';

  Future<AppUpdateInfo?> checkForUpdate() async {
    final httpClient = client ?? http.Client();
    try {
      return switch (defaultTargetPlatform) {
        TargetPlatform.android => await _checkPlatformSite(httpClient),
        TargetPlatform.iOS => await _checkAppStore(httpClient),
        _ => null,
      };
    } catch (_) {
      return null;
    } finally {
      if (client == null) httpClient.close();
    }
  }

  Future<AppUpdateInfo?> _checkPlatformSite(http.Client httpClient) async {
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
  }

  Future<AppUpdateInfo?> _checkAppStore(http.Client httpClient) async {
    final response = await httpClient
        .get(Uri.parse(_appStoreLookup))
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != 200) return null;

    final data = jsonDecode(response.body);
    if (data is! Map) return null;
    final results = data['results'];
    if (results is! List || results.isEmpty) return null;
    final entry = results.first;
    if (entry is! Map) return null;

    final latestVersion = (entry['version'] as String?)?.trim();
    if (latestVersion == null || latestVersion.isEmpty) return null;
    // أبل ترجّع اسم النسخة (1.1.4) لا رقم البناء، فالمقارنة على الاسم.
    if (compareVersions(latestVersion, AppMetadata.versionName) <= 0) {
      return null;
    }

    final url = (entry['trackViewUrl'] as String?)?.trim();
    if (url == null || url.isEmpty) return null;

    return AppUpdateInfo(version: latestVersion, build: 0, url: url);
  }

  /// مقارنة رقمين بصيغة 1.2.3. ترجع 1 لو [a] أحدث، -1 لو أقدم، 0 لو متساويين.
  @visibleForTesting
  static int compareVersions(String a, String b) {
    final left = a.split('.');
    final right = b.split('.');
    final length = left.length > right.length ? left.length : right.length;
    for (var i = 0; i < length; i++) {
      final x = i < left.length ? int.tryParse(left[i].trim()) ?? 0 : 0;
      final y = i < right.length ? int.tryParse(right[i].trim()) ?? 0 : 0;
      if (x != y) return x > y ? 1 : -1;
    }
    return 0;
  }

  static int _asInt(Object? value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
