import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:qudrat_maghrabi_app/core/config/app_metadata.dart';
import 'package:qudrat_maghrabi_app/features/app_update/data/app_update_service.dart';

/// عميل يرد بنفس جسم أبل، ويسجّل الرابط المطلوب.
MockClient _appStoreClient(String version, {int status = 200}) {
  return MockClient((request) async {
    return http.Response(
      jsonEncode({
        'resultCount': 1,
        'results': [
          {
            'version': version,
            'trackViewUrl':
                'https://apps.apple.com/sa/app/id${AppMetadata.appStoreTrackId}',
          },
        ],
      }),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
}

void main() {
  group('compareVersions', () {
    test('يقارن الأجزاء رقميًا لا نصيًا', () {
      expect(AppUpdateService.compareVersions('1.1.10', '1.1.9'), 1);
      expect(AppUpdateService.compareVersions('1.2.0', '1.10.0'), -1);
      expect(AppUpdateService.compareVersions('1.1.4', '1.1.4'), 0);
      expect(AppUpdateService.compareVersions('1.2', '1.2.0'), 0);
    });
  });

  group('Android', () {
    setUp(() => debugDefaultTargetPlatformOverride = TargetPlatform.android);
    tearDown(() => debugDefaultTargetPlatformOverride = null);

    AppUpdateService manifest(String version, int build) => AppUpdateService(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'version': version,
            'build': build,
            'url':
                'https://www.qudratmaghrabi.com/downloads/qudrat-maghrabi.apk',
          }),
          200,
        ),
      ),
    );

    test(
      'new version is detected even when its build number is lower',
      () async {
        expect(await manifest('9.9.9', 1).checkForUpdate(), isNotNull);
      },
    );

    test('same version with a newer build is detected', () async {
      expect(
        await manifest(
          AppMetadata.versionName,
          int.parse(AppMetadata.buildNumber) + 1,
        ).checkForUpdate(),
        isNotNull,
      );
    });

    test(
      'older version with a higher build is not offered as an update',
      () async {
        expect(await manifest('1.0.0', 9999).checkForUpdate(), isNull);
      },
    );
  });

  group('iOS', () {
    setUp(() => debugDefaultTargetPlatformOverride = TargetPlatform.iOS);
    tearDown(() => debugDefaultTargetPlatformOverride = null);

    test('يُنبّه عندما تكون نسخة المتجر أحدث', () async {
      final service = AppUpdateService(client: _appStoreClient('9.9.9'));
      final update = await service.checkForUpdate();

      expect(update, isNotNull);
      expect(update!.version, '9.9.9');
      expect(update.url, contains(AppMetadata.appStoreTrackId));
    });

    test('لا يُنبّه عندما تكون النسخة الحالية هي الأحدث', () async {
      final service = AppUpdateService(
        client: _appStoreClient(AppMetadata.versionName),
      );

      expect(await service.checkForUpdate(), isNull);
    });

    test('لا يُنبّه عندما تكون النسخة الحالية أحدث من المتجر', () async {
      final service = AppUpdateService(client: _appStoreClient('0.0.1'));

      expect(await service.checkForUpdate(), isNull);
    });

    test('يبتلع فشل الشبكة بهدوء', () async {
      final service = AppUpdateService(
        client: MockClient((_) async => throw const SocketExceptionStub()),
      );

      expect(await service.checkForUpdate(), isNull);
    });

    test('يبتلع ردًا غير متوقع', () async {
      final service = AppUpdateService(
        client: MockClient((_) async => http.Response('ليس JSON', 200)),
      );

      expect(await service.checkForUpdate(), isNull);
    });
  });
}

class SocketExceptionStub implements Exception {
  const SocketExceptionStub();
}
