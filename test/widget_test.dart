import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/account_role.dart';

import 'fakes/fake_auth_repository.dart';
import 'fakes/fake_account_repository.dart';
import 'fakes/fake_parent_home_repository.dart';
import 'fakes/fake_student_home_repository.dart';
import 'fakes/fake_student_learning_repository.dart';
import 'fakes/fake_student_quiz_repository.dart';

QudratMaghrabiApp createTestApp([
  FakeAuthRepository? repository,
  FakeStudentHomeRepository? homeRepository,
  FakeStudentLearningRepository? learningRepository,
  FakeStudentQuizRepository? quizRepository,
  FakeAccountRepository? accountRepository,
  FakeParentHomeRepository? parentHomeRepository,
]) {
  return QudratMaghrabiApp(
    authRepository: repository ?? FakeAuthRepository(),
    accountRepository: accountRepository ?? FakeAccountRepository(),
    parentHomeRepository: parentHomeRepository ?? FakeParentHomeRepository(),
    studentHomeRepository: homeRepository ?? FakeStudentHomeRepository(),
    studentLearningRepository:
        learningRepository ?? FakeStudentLearningRepository(),
    studentQuizRepository: quizRepository ?? FakeStudentQuizRepository(),
  );
}

void main() {
  testWidgets('login screen starts in Arabic RTL with student selected', (
    tester,
  ) async {
    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    expect(find.text('أهلًا بعودتك'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.byKey(const Key('student-role')), findsOneWidget);
    expect(find.byKey(const Key('parent-role')), findsOneWidget);

    final directionality = tester.widget<Directionality>(
      find.byType(Directionality).first,
    );
    expect(directionality.textDirection, TextDirection.rtl);

    expect(find.byKey(const Key('student-role-check')), findsOneWidget);
    expect(find.byKey(const Key('parent-role-check')), findsNothing);
  });

  testWidgets('role, remember me, and password controls respond', (
    tester,
  ) async {
    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('parent-role')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('student-role-check')), findsNothing);
    expect(find.byKey(const Key('parent-role-check')), findsOneWidget);

    await tester.tap(find.byKey(const Key('remember-me')));
    await tester.pump();
    expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);

    expect(find.byIcon(Icons.visibility_off_outlined), findsOneWidget);
    expect(find.byIcon(Icons.visibility_outlined), findsNothing);
    await tester.tap(find.byKey(const Key('toggle-password')));
    await tester.pump();
    expect(find.byIcon(Icons.visibility_off_outlined), findsNothing);
    expect(find.byIcon(Icons.visibility_outlined), findsOneWidget);
  });

  testWidgets('empty login submission shows field validation', (tester) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    final loginButton = find.byKey(const Key('login-button'));
    await tester.ensureVisible(loginButton);
    await tester.pumpAndSettle();
    await tester.tap(loginButton);
    await tester.pumpAndSettle();

    expect(find.text('أدخل البريد الإلكتروني أو رقم الجوال'), findsOneWidget);
    expect(find.text('أدخل كلمة المرور'), findsOneWidget);
    expect(repository.signInCalls, 0);
  });

  testWidgets('login tolerates a temporarily zero-height Android viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 0);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(createTestApp());
    await tester.pump();

    expect(tester.takeException(), isNull);
  });

  testWidgets('valid form signs in using the selected student role', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('email-input')),
      'student@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('password-input')),
      'password123',
    );

    final loginButton = find.byKey(const Key('login-button'));
    await tester.ensureVisible(loginButton);
    await tester.tap(loginButton);
    await tester.pumpAndSettle();

    expect(repository.signInCalls, 1);
    expect(repository.lastExpectedRole, AccountRole.student);
    expect(find.text('الكورسات المتاحة'), findsOneWidget);
  });

  testWidgets('a persisted session bypasses the login screen', (tester) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    expect(find.text('أهلًا بعودتك'), findsNothing);
    expect(find.text('الكورسات المتاحة'), findsOneWidget);
  });

  testWidgets('student home presents free and paid courses clearly', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('الكورسات المتاحة'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    expect(find.text('مجاني بالكامل'), findsWidgets);
    expect(find.text('دورة تأسيس 2027'), findsWidgets);

    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('question-bank-course')),
      220,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();

    expect(find.text('مدفوع'), findsOneWidget);
    expect(find.text('249 ج.م'), findsOneWidget);
    expect(find.text('الرئيسية'), findsOneWidget);
    expect(find.text('الكورسات'), findsOneWidget);
  });

  testWidgets('opening a free course shows its real chapters and lessons', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    final foundationTitle = find.text('دورة تأسيس 2027').first;
    await tester.ensureVisible(foundationTitle);
    await tester.tap(foundationTitle);
    await tester.pumpAndSettle();

    expect(find.text('محتوى الكورس'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('الباب الأول - الجبر'),
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('الباب الأول - الجبر'), findsOneWidget);
    expect(find.text('الأعداد العشرية'), findsOneWidget);
    expect(find.text('تقدّمك في الكورس'), findsOneWidget);
  });

  testWidgets('student can open the training section from bottom navigation', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('التدريب'));
    await tester.pumpAndSettle();

    expect(find.text('التدريب والاختبارات'), findsOneWidget);
    expect(find.text('اختبار الأعداد العشرية'), findsOneWidget);
    expect(find.text('ابدأ الاختبار'), findsOneWidget);
  });

  testWidgets('student completes a quiz and sees the secure review', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final quizRepository = FakeStudentQuizRepository();
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, quizRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('التدريب'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('اختبار الأعداد العشرية'));
    await tester.pumpAndSettle();

    expect(find.textContaining('ما الصورة العشرية للنصف؟'), findsOneWidget);
    await tester.tap(find.text('0.5'));
    await tester.tap(find.text('التالي'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('0.9'));
    await tester.tap(find.text('إنهاء وتسليم'));
    await tester.pumpAndSettle();

    expect(quizRepository.submitCalls, 1);
    expect(find.text('أحسنت! اجتزت الاختبار 🎉'), findsOneWidget);
    expect(find.text('مراجعة الإجابات'), findsOneWidget);
    expect(find.text('2 إجابات صحيحة من 2'), findsOneWidget);
  });

  testWidgets('account section exposes review and privacy requirements', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();

    expect(find.text('إدارة الحساب'), findsOneWidget);
    await tester.scrollUntilVisible(find.byKey(const Key('privacy-tile')), 250);
    await tester.pumpAndSettle();
    expect(find.text('سياسة الخصوصية'), findsOneWidget);
    expect(find.text('الشروط والأحكام'), findsOneWidget);
    expect(find.text('الدعم والمساعدة'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const Key('delete-account-tile')),
      300,
    );
    expect(find.text('حذف الحساب نهائيًا'), findsOneWidget);
  });

  testWidgets('student creates a one-time parent link code', (tester) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final parentRepository = FakeParentHomeRepository();
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, null, parentRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('parent-link-code-tile')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('create-parent-link-code-button')));
    await tester.pumpAndSettle();

    expect(parentRepository.createCodeCalls, 1);
    expect(find.text('ABCD-EF12-3456-7890'), findsOneWidget);
    expect(find.text('نسخ الرمز'), findsOneWidget);
    expect(
      find.textContaining('تنتهي صلاحيته بعد 24 ساعة', skipOffstage: false),
      findsOneWidget,
    );
  });

  testWidgets('student can update first and second name', (tester) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final accountRepository = FakeAccountRepository();
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, accountRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('edit-profile-tile')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('profile-name-input')),
      'أحمد محمد',
    );
    await tester.tap(find.byKey(const Key('save-profile-button')));
    await tester.pumpAndSettle();

    expect(accountRepository.updateCalls, 1);
    expect(find.text('أحمد محمد'), findsOneWidget);
  });

  testWidgets('account deletion requires confirmation and returns to login', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final accountRepository = FakeAccountRepository();
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, accountRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حسابي'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.byKey(const Key('delete-account-tile')),
      300,
    );
    await tester.ensureVisible(find.byKey(const Key('delete-account-tile')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('delete-account-tile')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('delete-password-input')),
      'password123',
    );
    await tester.tap(find.byKey(const Key('delete-understood-checkbox')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('delete-account-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-delete-account-button')));
    await tester.pumpAndSettle();

    expect(accountRepository.deleteCalls, 1);
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
  });

  testWidgets('parent without linked students sees a clear linking action', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.parentProfile,
    );
    await tester.pumpWidget(createTestApp(authRepository));
    await tester.pumpAndSettle();

    expect(find.text('لم تربط أي طالب بعد'), findsOneWidget);
    expect(find.byKey(const Key('open-link-student-button')), findsOneWidget);
  });

  testWidgets('parent links a student by one-time code and opens dashboard', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.parentProfile,
    );
    final parentRepository = FakeParentHomeRepository(
      linkedSnapshot: FakeParentHomeRepository.sampleSnapshot,
    );
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, null, parentRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('open-link-student-button')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('parent-student-code-input')),
      'ABCD-EF12-3456-7890',
    );
    await tester.tap(find.byKey(const Key('link-student-button')));
    await tester.pumpAndSettle();

    expect(parentRepository.linkCalls, 1);
    expect(parentRepository.lastLinkedCode, 'ABCD-EF12-3456-7890');
    expect(find.text('رحلة كريم'), findsOneWidget);
    expect(find.text('60%'), findsWidgets);
    expect(find.text('اختبار الأعداد العشرية'), findsOneWidget);
  });

  testWidgets('parent switches between progress and test reports', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.parentProfile,
    );
    final parentRepository = FakeParentHomeRepository(
      snapshot: FakeParentHomeRepository.sampleSnapshot,
    );
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, null, parentRepository),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('parent-nav-1')));
    await tester.pumpAndSettle();
    expect(find.text('تقدّم الطالب'), findsOneWidget);
    expect(find.text('3 من 5 درس مكتمل'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('parent-nav-2')));
    await tester.pumpAndSettle();
    expect(find.text('نتائج الاختبارات'), findsOneWidget);
    expect(find.text('اجتاز الاختبار'), findsOneWidget);
  });

  testWidgets('parent adds a second student and opens their dashboard', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.parentProfile,
    );
    final parentRepository = FakeParentHomeRepository(
      snapshot: FakeParentHomeRepository.sampleSnapshot,
      linkedSnapshot: FakeParentHomeRepository.multiStudentSnapshot,
    )..linkedStudentId = 'second-student-id';
    await tester.pumpWidget(
      createTestApp(authRepository, null, null, null, null, parentRepository),
    );
    await tester.pumpAndSettle();

    expect(find.text('رحلة كريم'), findsOneWidget);
    await tester.tap(find.byKey(const Key('add-another-student-button')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('parent-student-code-input')),
      '1234-5678-90AB-CDEF',
    );
    await tester.tap(find.byKey(const Key('link-student-button')));
    await tester.pumpAndSettle();

    expect(parentRepository.linkCalls, 1);
    expect(find.text('رحلة ريم'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('parent-student-student-id')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('parent-student-second-student-id')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('parent-student-student-id')));
    await tester.pumpAndSettle();
    expect(find.text('رحلة كريم'), findsOneWidget);
  });
}
