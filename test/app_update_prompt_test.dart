import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/features/app_update/data/app_update_service.dart';
import 'package:qudrat_maghrabi_app/features/app_update/presentation/app_update_gate.dart';

import 'fakes/fake_auth_repository.dart';
import 'widget_test.dart' as fixtures;

const update = AppUpdateInfo(
  version: '9.9.9',
  build: 99,
  url: 'https://apps.apple.com/sa/app/id6799747012',
);

class FakeUpdateService extends AppUpdateService {
  FakeUpdateService({this.available = update, this.failFirst = false});
  final AppUpdateInfo? available;
  final bool failFirst;
  int checks = 0;

  @override
  Future<AppUpdateInfo?> checkForUpdate() async {
    checks++;
    if (failFirst && checks == 1) throw Exception('offline');
    return available;
  }
}

Widget app(FakeUpdateService service, {bool signedIn = false}) {
  final fixture = fixtures.createTestApp(
    FakeAuthRepository(
      restoredProfile: signedIn ? FakeAuthRepository.studentProfile : null,
    ),
  );
  return QudratMaghrabiApp(
    authRepository: fixture.authRepository,
    accountRepository: fixture.accountRepository,
    studentHomeRepository: fixture.studentHomeRepository,
    studentLearningRepository: fixture.studentLearningRepository,
    studentQuizRepository: fixture.studentQuizRepository,
    appUpdateService: service,
  );
}

void resume(WidgetTester tester) {
  for (final state in [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(state);
  }
}

class PendingUpdateService extends AppUpdateService {
  final result = Completer<AppUpdateInfo?>();
  int checks = 0;
  @override
  Future<AppUpdateInfo?> checkForUpdate() {
    checks++;
    return result.future;
  }
}

void main() {
  testWidgets('update waits for foreground after an inactive startup', (
    tester,
  ) async {
    final service = PendingUpdateService();
    await tester.pumpWidget(
      MaterialApp(
        home: AppUpdateGate(
          service: service,
          child: const Scaffold(body: Text('متابعة التطبيق')),
        ),
      ),
    );
    await tester.pump();
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    service.result.complete(update);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-update-dialog')), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-update-dialog')), findsOneWidget);
    expect(service.checks, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('update prompt appears before login and can be dismissed', (
    tester,
  ) async {
    final service = FakeUpdateService();
    await tester.pumpWidget(app(service));
    await tester.pumpAndSettle();
    expect(find.text('إصدار جديد'), findsOneWidget);
    expect(find.text('تحديث'), findsOneWidget);
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
    expect(service.checks, 1);
    await tester.tapAt(const Offset(8, 8));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-update-dialog')), findsNothing);
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
  });

  testWidgets('returning to the app prompts over the current account tab', (
    tester,
  ) async {
    final service = FakeUpdateService();
    await tester.pumpWidget(app(service, signedIn: true));
    await tester.pumpAndSettle();
    await tester.tapAt(const Offset(8, 8));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();
    resume(tester);
    await tester.pumpAndSettle();
    expect(service.checks, 2);
    expect(find.text('إصدار جديد'), findsOneWidget);
    expect(find.text('إدارة الحساب'), findsOneWidget);
    expect(find.byKey(const Key('brand-launch-scene')), findsNothing);
    await tester.tapAt(const Offset(8, 8));
    await tester.pumpAndSettle();
    expect(find.text('إدارة الحساب'), findsOneWidget);
  });

  testWidgets(
    'network failure keeps login usable and retries on next opening',
    (tester) async {
      final service = FakeUpdateService(failFirst: true);
      await tester.pumpWidget(app(service));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('app-update-dialog')), findsNothing);
      expect(find.text('تسجيل الدخول'), findsOneWidget);
      resume(tester);
      await tester.pumpAndSettle();
      expect(service.checks, 2);
      expect(find.text('إصدار جديد'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('current version does not get a false update prompt', (
    tester,
  ) async {
    final service = FakeUpdateService(available: null);
    await tester.pumpWidget(app(service));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-update-dialog')), findsNothing);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(service.checks, 1);
  });

  testWidgets('update opens the store while the app remains usable', (
    tester,
  ) async {
    Uri? opened;
    await tester.pumpWidget(
      MaterialApp(
        home: AppUpdateGate(
          service: FakeUpdateService(),
          openUpdateUrl: (uri) async {
            opened = uri;
            return true;
          },
          child: const Scaffold(body: Text('متابعة التطبيق')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('app-update-button')));
    await tester.pumpAndSettle();
    expect(opened.toString(), update.url);
    expect(find.byKey(const Key('app-update-dialog')), findsNothing);
    expect(find.text('متابعة التطبيق'), findsOneWidget);
  });

  testWidgets('store launch failure is explained without blocking the app', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AppUpdateGate(
          service: FakeUpdateService(),
          openUpdateUrl: (_) async => throw Exception('store unavailable'),
          child: const Scaffold(body: Text('متابعة التطبيق')),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('app-update-button')));
    await tester.pumpAndSettle();
    expect(find.text('تعذّر فتح رابط التحديث. حاول مجددًا.'), findsOneWidget);
    expect(find.text('متابعة التطبيق'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
