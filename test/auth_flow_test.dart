import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:http/io_client.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/core/config/app_environment.dart';
import 'package:qudrat_maghrabi_app/core/config/error_monitoring.dart';
import 'package:qudrat_maghrabi_app/features/auth/data/supabase_auth_repository.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_failure.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/supabase_student_home_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'fakes/fake_account_repository.dart';
import 'fakes/fake_auth_repository.dart';
import 'fakes/fake_student_home_repository.dart';
import 'fakes/fake_student_learning_repository.dart';
import 'fakes/fake_student_quiz_repository.dart';

QudratMaghrabiApp _createApp(FakeAuthRepository repository) {
  return QudratMaghrabiApp(
    authRepository: repository,
    accountRepository: FakeAccountRepository(),
    studentHomeRepository: FakeStudentHomeRepository(),
    studentLearningRepository: FakeStudentLearningRepository(),
    studentQuizRepository: FakeStudentQuizRepository(),
  );
}

void main() {
  testWidgets('create account submits student data and explains confirmation', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(_createApp(repository));
    await tester.pumpAndSettle();

    final createButton = find.byKey(const Key('create-account-button'));
    await tester.ensureVisible(createButton);
    await tester.tap(createButton);
    await tester.pumpAndSettle();

    expect(find.text('أنشئ حساب الطالب'), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('register-name-input')),
      'محمد أحمد',
    );
    await tester.enterText(
      find.byKey(const Key('register-email-input')),
      'student@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('register-phone-input')),
      '0500000000',
    );
    await tester.enterText(
      find.byKey(const Key('register-password-input')),
      'password123',
    );
    await tester.enterText(
      find.byKey(const Key('register-confirm-input')),
      'password123',
    );

    final terms = find.byKey(const Key('register-terms-checkbox'));
    await tester.ensureVisible(terms);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(of: terms, matching: find.byType(Checkbox)),
    );
    await tester.pump();

    final submit = find.byKey(const Key('register-submit-button'));
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));

    expect(repository.signUpCalls, 1);
    expect(repository.lastSignUpName, 'محمد أحمد');
    expect(repository.lastSignUpEmail, 'student@example.com');
    expect(repository.lastSignUpPhone, '0500000000');
    expect(find.text('ولي أمر'), findsNothing);
    expect(find.text('تم إنشاء الحساب'), findsOneWidget);
    expect(
      find.textContaining('أرسلنا رسالة تأكيد إلى student@example.com'),
      findsOneWidget,
    );
  });

  testWidgets(
    'forgot password sends recovery email without revealing account',
    (tester) async {
      final repository = FakeAuthRepository();
      await tester.pumpWidget(_createApp(repository));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('forgot-password-button')));
      await tester.pumpAndSettle();

      expect(find.text('استعادة كلمة المرور'), findsOneWidget);
      await tester.enterText(
        find.byKey(const Key('recovery-email-input')),
        'student@example.com',
      );
      await tester.tap(find.byKey(const Key('recovery-submit-button')));
      await tester.pumpAndSettle();

      expect(repository.passwordResetCalls, 1);
      expect(repository.lastPasswordResetEmail, 'student@example.com');
      expect(find.text('راجع بريدك الإلكتروني'), findsOneWidget);
      expect(
        find.textContaining('إذا كان البريد مرتبطًا بحساب'),
        findsOneWidget,
      );
    },
  );

  testWidgets('password recovery deep link opens reset and returns to login', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(_createApp(repository));
    await tester.pumpAndSettle();

    repository.emitPasswordRecovery();
    await tester.pumpAndSettle();

    expect(find.text('عيّن كلمة مرور جديدة'), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('new-password-input')),
      'newPassword123',
    );
    await tester.enterText(
      find.byKey(const Key('confirm-new-password-input')),
      'newPassword123',
    );
    await tester.tap(find.byKey(const Key('update-password-button')));
    await tester.pumpAndSettle();

    expect(repository.passwordUpdateCalls, 1);
    expect(repository.lastRecoveredPassword, 'newPassword123');
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
  });

  testWidgets('recovery deep link shows the reset form over forgot password', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(_createApp(repository));
    await tester.pumpAndSettle();

    // الطالب بيطلب الرابط، فيفضل واقف على شاشة "راجع بريدك الإلكتروني"
    await tester.tap(find.byKey(const Key('forgot-password-button')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('recovery-email-input')),
      'student@example.com',
    );
    await tester.tap(find.byKey(const Key('recovery-submit-button')));
    await tester.pumpAndSettle();
    expect(find.text('راجع بريدك الإلكتروني'), findsOneWidget);

    // ولما يفتح الرابط من بريده لازم يشوف شاشة كلمة المرور الجديدة
    repository.emitPasswordRecovery();
    await tester.pumpAndSettle();

    expect(find.text('عيّن كلمة مرور جديدة'), findsOneWidget);
    expect(find.text('راجع بريدك الإلكتروني'), findsNothing);
  });

  testWidgets('registration validates required identity and password fields', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(_createApp(repository));
    await tester.pumpAndSettle();

    final createButton = find.byKey(const Key('create-account-button'));
    await tester.ensureVisible(createButton);
    await tester.tap(createButton);
    await tester.pumpAndSettle();

    final submit = find.byKey(const Key('register-submit-button'));
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();

    expect(repository.signUpCalls, 0);
    expect(find.text('أدخل الاسم الأول والثاني'), findsOneWidget);
    expect(find.text('أدخل بريدًا إلكترونيًا صحيحًا'), findsOneWidget);
    expect(find.text('أدخل رقم جوال صحيحًا، مثل 05xxxxxxxx'), findsOneWidget);
    expect(
      find.text('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
      findsOneWidget,
    );
  });

  test(
    'authorized Apple QA login, home data, recovered session and re-login',
    () async {
      final email = Platform.environment['QUDRAT_QA_EMAIL'];
      final password = Platform.environment['QUDRAT_QA_PASSWORD'];
      if (email == null ||
          password == null ||
          !AppEnvironment.isSupabaseConfigured) {
        fail(
          'Authorized QA credentials and release configuration are required',
        );
      }
      final client = SupabaseClient(
        AppEnvironment.supabaseUrl,
        AppEnvironment.supabasePublishableKey,
        authOptions: const AuthClientOptions(autoRefreshToken: false),
        httpClient: IOClient(_LiveHttpOverrides().createHttpClient(null)),
      );
      final restoredClient = SupabaseClient(
        AppEnvironment.supabaseUrl,
        AppEnvironment.supabasePublishableKey,
        authOptions: const AuthClientOptions(autoRefreshToken: false),
        httpClient: IOClient(_LiveHttpOverrides().createHttpClient(null)),
      );
      addTearDown(client.dispose);
      addTearDown(restoredClient.dispose);
      final repository = SupabaseAuthRepository(client, onDiagnostic: (_) {});
      final restoredRepository = SupabaseAuthRepository(
        restoredClient,
        onDiagnostic: (_) {},
      );
      try {
        final profile = await repository.signIn(
          identifier: email,
          password: password,
        );
        expect(profile.role == AccountRole.student && profile.isActive, isTrue);
        final home = await SupabaseStudentHomeRepository(
          client,
        ).load(studentId: profile.id);
        expect(
          home.bundles.isNotEmpty || home.availableCourses.isNotEmpty,
          isTrue,
        );
        final persisted = jsonEncode(client.auth.currentSession!.toJson());
        await restoredClient.auth.recoverSession(persisted);
        final restored = await restoredRepository.restoreSession();
        expect(restored?.id == profile.id, isTrue);
        await restoredClient.auth.signOut(scope: SignOutScope.local);
        expect(restoredClient.auth.currentSession == null, isTrue);
        final again = await repository.signIn(
          identifier: email,
          password: password,
        );
        expect(again.id == profile.id, isTrue);
        await client.auth.signOut(scope: SignOutScope.local);
      } on AuthFailure catch (failure) {
        fail('Authorized QA authentication failed: ${failure.code}');
      }
    },
    skip: !const bool.fromEnvironment('RUN_LIVE_AUTH_QA'),
  );

  group('SupabaseAuthRepository & ErrorDiagnostics', () {
    const projectUrl = 'https://zjmxvunmokqjzexvqrla.supabase.co';
    const publishableKey = 'sb_publishable_TestMockPublishableKey1234567890';

    test(
      'gateway 401 invalid API key emits safe non-PII diagnostic and arabic failure',
      () async {
        final diagnostics = <AuthDiagnosticEvent>[];
        final mock = MockClient((request) async {
          if (request.url.path.contains('/auth/v1/token')) {
            // Exact 99-byte response returned by Supabase API gateway on invalid publishable key
            return http.Response(
              '{"message":"Invalid API key","hint":"Double check your Supabase `anon` or `service_role` API key."}',
              401,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        });

        final client = SupabaseClient(
          projectUrl,
          publishableKey,
          httpClient: mock,
        );
        final repo = SupabaseAuthRepository(
          client,
          onDiagnostic: diagnostics.add,
        );

        try {
          await repo.signIn(
            identifier: 'student@example.com',
            password: 'SecretPassword123!',
          );
          fail('signIn should have thrown AuthFailure');
        } on AuthFailure catch (failure) {
          expect(failure.code, 'auth_error');
          expect(
            failure.message,
            'تعذّر تسجيل الدخول. تحقق من البيانات والاتصال ثم حاول مجددًا',
          );
        }

        expect(diagnostics.length, 1);
        final event = diagnostics.first;
        expect(event.operation, 'sign_in');
        expect(event.errorCode, 'invalid_api_key');
        expect(event.statusCode, '401');
        expect(event.reason.toLowerCase(), contains('invalid api key'));
        // Zero sensitive data
        expect(event.reason, isNot(contains('student@example.com')));
        expect(event.reason, isNot(contains('SecretPassword123!')));
        expect(event.reason, isNot(contains(publishableKey)));
      },
    );

    test(
      'invalid credentials 400 returns arabic message without false diagnostic alert',
      () async {
        final diagnostics = <AuthDiagnosticEvent>[];
        final mock = MockClient((request) async {
          if (request.url.path.contains('/auth/v1/token')) {
            return http.Response(
              jsonEncode({
                'code': 'invalid_credentials',
                'error_code': 'invalid_credentials',
                'msg': 'Invalid login credentials',
              }),
              400,
              headers: {'content-type': 'application/json; charset=utf-8'},
            );
          }
          return http.Response('{}', 404);
        });

        final client = SupabaseClient(
          projectUrl,
          publishableKey,
          httpClient: mock,
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        );
        final repo = SupabaseAuthRepository(
          client,
          onDiagnostic: diagnostics.add,
        );

        try {
          await repo.signIn(
            identifier: 'student@example.com',
            password: 'WrongPassword!',
          );
          fail('signIn should have thrown AuthFailure');
        } on AuthFailure catch (failure) {
          expect(failure.code, 'invalid_credentials');
          expect(failure.message, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        expect(diagnostics, isEmpty);
      },
    );

    test(
      'successful student login, profile fetch, session persistence and sign out',
      () async {
        final diagnostics = <AuthDiagnosticEvent>[];
        const fakeJwt =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
            'eyJzdWIiOiJzdHVkZW50LTEyMyIsImV4cCI6NDEwMjQ0NDgwMH0.'
            'signature';
        final mock = MockClient((request) async {
          if (request.url.path.contains('/auth/v1/token')) {
            return http.Response(
              jsonEncode({
                'access_token': fakeJwt,
                'token_type': 'bearer',
                'expires_in': 3600,
                'refresh_token': 'dummy_refresh_token',
                'user': {
                  'id': 'student-123',
                  'aud': 'authenticated',
                  'role': 'authenticated',
                  'email': 'student@example.com',
                  'app_metadata': {'provider': 'email'},
                  'user_metadata': {'full_name': 'طالب تجريبي'},
                  'created_at': '2026-01-01T00:00:00.000Z',
                },
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
              request: request,
            );
          }
          if (request.url.path.contains('get_my_access_profile')) {
            return http.Response(
              jsonEncode({
                'id': 'student-123',
                'full_name': 'طالب تجريبي',
                'email': 'student@example.com',
                'phone': '0501234567',
                'role': 'student',
                'primary_role': 'student',
                'is_active': true,
              }),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
              request: request,
            );
          }
          if (request.url.path.contains('set_my_active_portal')) {
            return http.Response(
              jsonEncode(null),
              200,
              headers: {'content-type': 'application/json; charset=utf-8'},
              request: request,
            );
          }
          if (request.url.path.contains('/auth/v1/logout')) {
            return http.Response('', 204, request: request);
          }
          return http.Response('{}', 404, request: request);
        });

        final client = SupabaseClient(
          projectUrl,
          publishableKey,
          httpClient: mock,
          authOptions: const AuthClientOptions(autoRefreshToken: false),
        );
        final repo = SupabaseAuthRepository(
          client,
          onDiagnostic: diagnostics.add,
        );

        final profile = await repo.signIn(
          identifier: 'student@example.com',
          password: 'Password123',
        );
        expect(profile.id, 'student-123');
        expect(profile.fullName, 'طالب تجريبي');
        expect(profile.role, AccountRole.student);
        expect(repo.hasStoredSession, isTrue);

        final restored = await repo.restoreSession();
        expect(restored?.id, 'student-123');

        await repo.signOut();
        expect(repo.hasStoredSession, isFalse);
        expect(diagnostics, isEmpty);
      },
    );

    test(
      'ErrorMonitoring.sanitizeDiagnosticText redacts keys, tokens, emails, phones, and passwords',
      () {
        const raw =
            'Failed sb_publishable_ABC1234567890DEF with JWT eyJhbGciOiJIUzI1NiJ9.test and Bearer token123 at user student@qudratmaghrabi.com phone +966501234567 password=secretPass123';
        final clean = ErrorMonitoring.sanitizeDiagnosticText(raw);
        expect(clean, contains('[redacted-key]'));
        expect(clean, contains('[redacted-token]'));
        expect(clean, contains('[redacted-email]'));
        expect(clean, contains('[redacted-phone]'));
        expect(clean, contains('[redacted-secret]'));
        expect(clean, isNot(contains('sb_publishable_ABC1234567890DEF')));
        expect(clean, isNot(contains('student@qudratmaghrabi.com')));
        expect(clean, isNot(contains('+966501234567')));
        expect(clean, isNot(contains('secretPass123')));
      },
    );

    test(
      'live release probe against Supabase: valid config reaches GoTrue, invalid key rejected with 401',
      () async {
        if (!AppEnvironment.isSupabaseConfigured) {
          // Only executes when compiled with --dart-define-from-file
          fail('Live auth probe requires release configuration');
        }
        final validClient = SupabaseClient(
          AppEnvironment.supabaseUrl,
          AppEnvironment.supabasePublishableKey,
          httpClient: IOClient(_LiveHttpOverrides().createHttpClient(null)),
        );
        addTearDown(validClient.dispose);
        final validRepo = SupabaseAuthRepository(validClient);

        // 1. Valid release config against live server: probe with wrong credentials must reach GoTrue and return 400 invalid_credentials
        try {
          await validRepo.signIn(
            identifier: 'nonexistent-probe-student@qudratmaghrabi.invalid',
            password: 'ProbeWrongPassword123!',
          );
          fail('Should fail wrong credentials on live server');
        } on AuthFailure catch (failure) {
          expect(failure.code, 'invalid_credentials');
          expect(failure.message, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }

        // 2. Invalid publishable key against live server: must fail at gateway with HTTP 401 Invalid API key
        final probeDiagnostics = <AuthDiagnosticEvent>[];
        final badClient = SupabaseClient(
          AppEnvironment.supabaseUrl,
          'sb_publishable_invalid_key_for_testing_401_rejection_12345',
          httpClient: IOClient(_LiveHttpOverrides().createHttpClient(null)),
        );
        addTearDown(badClient.dispose);
        final badRepo = SupabaseAuthRepository(
          badClient,
          onDiagnostic: probeDiagnostics.add,
        );
        try {
          await badRepo.signIn(
            identifier: 'nonexistent-probe-student@qudratmaghrabi.invalid',
            password: 'ProbeWrongPassword123!',
          );
          fail('Should fail with invalid key 401 on live server');
        } on AuthFailure catch (failure) {
          expect(failure.code, 'auth_error');
          expect(
            failure.message,
            'تعذّر تسجيل الدخول. تحقق من البيانات والاتصال ثم حاول مجددًا',
          );
        }
        expect(probeDiagnostics.length, 1);
        expect(probeDiagnostics.first.statusCode, '401');
        expect(probeDiagnostics.first.errorCode, 'invalid_api_key');
      },
      skip: !const bool.fromEnvironment('RUN_LIVE_AUTH_SMOKE'),
    );

    test(
      'unexpected response diagnostics never include raw server data',
      () async {
        final diagnostics = <AuthDiagnosticEvent>[];
        final client = SupabaseClient(
          projectUrl,
          publishableKey,
          authOptions: const AuthClientOptions(autoRefreshToken: false),
          httpClient: MockClient(
            (request) async => http.Response(
              jsonEncode({
                'code': 'unexpected_failure',
                'msg':
                    'Server rejected {"password":"DO_NOT_SEND","email":"private@example.com"}',
              }),
              400,
              headers: {'content-type': 'application/json'},
            ),
          ),
        );
        addTearDown(client.dispose);
        final repo = SupabaseAuthRepository(
          client,
          onDiagnostic: diagnostics.add,
        );
        await expectLater(
          repo.signIn(identifier: 'student@example.com', password: 'dummy'),
          throwsA(isA<AuthFailure>()),
        );
        expect(
          diagnostics.single.reason,
          'Unexpected authentication service failure',
        );
      },
    );

    test(
      'diagnostic failure preserves the original authentication failure',
      () async {
        final client = SupabaseClient(
          projectUrl,
          publishableKey,
          authOptions: const AuthClientOptions(autoRefreshToken: false),
          httpClient: MockClient(
            (request) async => http.Response(
              '{"message":"Invalid API key"}',
              401,
              headers: {'content-type': 'application/json'},
            ),
          ),
        );
        addTearDown(client.dispose);
        final repo = SupabaseAuthRepository(
          client,
          onDiagnostic: (_) {
            throw StateError('reporting unavailable');
          },
        );
        await expectLater(
          repo.signIn(identifier: 'student@example.com', password: 'dummy'),
          throwsA(
            isA<AuthFailure>().having((e) => e.code, 'code', 'auth_error'),
          ),
        );
      },
    );
  });
}

// Create an isolated real transport without changing Flutter test HTTP overrides.
class _LiveHttpOverrides extends HttpOverrides {}
