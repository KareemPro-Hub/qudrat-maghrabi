import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';

import 'fakes/fake_auth_repository.dart';
import 'fakes/fake_account_repository.dart';
import 'fakes/fake_student_home_repository.dart';
import 'fakes/fake_student_learning_repository.dart';
import 'fakes/fake_student_quiz_repository.dart';

QudratMaghrabiApp createTestApp([
  FakeAuthRepository? repository,
  FakeStudentHomeRepository? homeRepository,
  FakeStudentLearningRepository? learningRepository,
  FakeStudentQuizRepository? quizRepository,
  FakeAccountRepository? accountRepository,
]) {
  return QudratMaghrabiApp(
    authRepository: repository ?? FakeAuthRepository(),
    accountRepository: accountRepository ?? FakeAccountRepository(),
    studentHomeRepository: homeRepository ?? FakeStudentHomeRepository(),
    studentLearningRepository:
        learningRepository ?? FakeStudentLearningRepository(),
    studentQuizRepository: quizRepository ?? FakeStudentQuizRepository(),
  );
}

void main() {
  testWidgets('app launch reveals the mark before the wordmark', (
    tester,
  ) async {
    await tester.pumpWidget(createTestApp());

    expect(find.byKey(const Key('brand-launch-scene')), findsOneWidget);
    expect(find.byKey(const Key('brand-launch-mark')), findsOneWidget);
    final wordmarkFadeFinder = find.ancestor(
      of: find.byKey(const Key('brand-launch-wordmark')),
      matching: find.byType(FadeTransition),
    );
    expect(
      tester.widget<FadeTransition>(wordmarkFadeFinder.first).opacity.value,
      0,
    );

    await tester.pump(const Duration(milliseconds: 3800));
    expect(
      tester.widget<FadeTransition>(wordmarkFadeFinder.first).opacity.value,
      greaterThan(.5),
    );

    await tester.pumpAndSettle();
    expect(find.byKey(const Key('brand-launch-scene')), findsNothing);
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
  });

  testWidgets('returning from the background replays the branded launch', (
    tester,
  ) async {
    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('app-content')), findsOneWidget);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();

    expect(find.byKey(const Key('brand-launch-scene')), findsOneWidget);
    expect(find.byKey(const Key('brand-launch-mark')), findsOneWidget);

    await tester.pumpAndSettle();
    expect(find.byKey(const Key('brand-launch-scene')), findsNothing);
    expect(find.byKey(const Key('app-content')), findsOneWidget);
  });

  testWidgets('login screen is Arabic RTL and student-only', (tester) async {
    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

    expect(find.text('أهلًا بعودتك'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.text('ولي أمر'), findsNothing);

    final directionality = tester.widget<Directionality>(
      find.byType(Directionality).first,
    );
    expect(directionality.textDirection, TextDirection.rtl);
  });

  testWidgets('remember me and password controls respond', (tester) async {
    await tester.pumpWidget(createTestApp());
    await tester.pumpAndSettle();

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

  testWidgets('valid form signs in as a student', (tester) async {
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
    expect(find.byKey(const Key('free-course-surprise-card')), findsOneWidget);
  });

  testWidgets('a persisted session bypasses the login screen', (tester) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    expect(find.text('أهلًا بعودتك'), findsNothing);
    expect(find.byKey(const Key('free-course-surprise-card')), findsOneWidget);
  });

  testWidgets('student home presents free and paid courses clearly', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    expect(find.text('هدية البداية'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('اكتشف باقي الكورسات'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('question-bank-course')),
      220,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();

    expect(find.text('كورس مدفوع'), findsOneWidget);
    expect(find.text('مدفوع'), findsOneWidget);
    expect(find.text('مبتدئ'), findsNothing);
    expect(find.text('249 ج.م'), findsNothing);
    expect(find.text('الرئيسية'), findsOneWidget);
    expect(find.text('الكورسات'), findsOneWidget);
  });

  testWidgets('student sees the free course surprise with a full 16:9 cover', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('free-course-surprise-card')), findsOneWidget);
    expect(find.text('أول 3 حصص هدية لك'), findsOneWidget);
    expect(
      find.text('ابدأ رحلتك مجانًا، واكتشف أسلوب الشرح قبل الاشتراك.'),
      findsOneWidget,
    );
    expect(find.text('ابدأ مجانًا'), findsOneWidget);
    expect(
      tester
          .widget<AspectRatio>(find.byKey(const Key('free-course-cover-16-9')))
          .aspectRatio,
      16 / 9,
    );
  });

  testWidgets('student can review all three subscription plans', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.byKey(const Key('subscription-status-card')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const Key('subscription-status-card')));
    await tester.pumpAndSettle();

    expect(find.text('الاشتراك والباقات'), findsOneWidget);
    expect(find.textContaining('شهر واحد'), findsWidgets);
    expect(find.textContaining('3 أشهر'), findsWidgets);
    expect(find.text('79'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining('3 أشهر'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('3 أشهر'), findsWidgets);
    expect(find.text('199'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining('6 أشهر'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('6 أشهر'), findsWidgets);
    expect(find.text('299'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining('ابدأ بثلاث حصص مجانية'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('ابدأ بثلاث حصص مجانية'), findsOneWidget);
    expect(find.textContaining('قبل موعد التجديد بثلاثة أيام'), findsNothing);
    await tester.scrollUntilVisible(
      find.text('سياسة الخصوصية'),
      260,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('الشروط والأحكام'), findsOneWidget);
    expect(find.text('سياسة الخصوصية'), findsOneWidget);
  });

  testWidgets(
    'active platform subscription is visible and unlocks paid course',
    (tester) async {
      const unlockedPaidCourse = StudentCourse(
        id: 'question-bank-course',
        title: 'بنوك الأسئلة والاختبارات',
        description: '',
        price: 249,
        currency: 'EGP',
        level: 'beginner',
        lessonsCount: 0,
        enrolledCount: 0,
        childCoursesCount: 0,
        hasAccess: true,
        progressPercent: 0,
        completedLessons: 0,
      );
      final homeRepository = FakeStudentHomeRepository(
        snapshot: StudentHomeSnapshot(
          bundles: const [FakeStudentHomeRepository.bundle],
          availableCourses: const [
            FakeStudentHomeRepository.previewCourse,
            unlockedPaidCourse,
          ],
          myCourses: const [
            FakeStudentHomeRepository.previewCourse,
            unlockedPaidCourse,
          ],
          unreadNotifications: 0,
          subscription: StudentSubscription(
            bundleId: 'bundle',
            planName: 'الباقة المميزة',
            startedAt: DateTime(2026, 7, 1),
            expiresAt: DateTime(2026, 10, 1),
          ),
        ),
      );
      final authRepository = FakeAuthRepository(
        restoredProfile: FakeAuthRepository.studentProfile,
      );
      await tester.pumpWidget(createTestApp(authRepository, homeRepository));
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(
        find.byKey(const Key('subscription-status-card')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('اشتراكك فعّال'), findsOneWidget);
      expect(find.textContaining('الباقة المميزة'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('question-bank-course')),
        250,
        scrollable: find.byType(Scrollable).last,
      );
      expect(find.text('كورس مدفوع'), findsOneWidget);
      expect(find.text('ابدأ التعلّم'), findsWidgets);
    },
  );

  testWidgets('opening a free course shows its real chapters and lessons', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    final freeCourseCard = find.byKey(const Key('free-course-surprise-card'));
    await tester.ensureVisible(freeCourseCard);
    await tester.tap(freeCourseCard);
    await tester.pumpAndSettle();

    final coverHero = find.byKey(const Key('course-cover-hero'));
    expect(coverHero, findsOneWidget);
    expect(
      find.descendant(
        of: coverHero,
        matching: find.byIcon(Icons.play_arrow_rounded),
      ),
      findsNothing,
    );
    await tester.scrollUntilVisible(
      find.text('محتوى الكورس'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
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
    expect(find.text('نتيجة فورية لتحديد مستواك'), findsOneWidget);
    expect(find.text('اختبر قدراتك .. واصنع تفوقك.'), findsOneWidget);
    expect(
      tester.widget<Text>(find.byKey(const Key('quiz-hero-title'))).maxLines,
      1,
    );
    expect(
      find.text('تابع نتائجك فورًا، وتعرّف على نقاط القوة والضعف لديك !'),
      findsOneWidget,
    );
    expect(find.text('اختبار الأعداد العشرية'), findsOneWidget);
    expect(find.text('ابدأ الاختبار'), findsOneWidget);
  });

  testWidgets('quiz grade history is permanent and read only', (tester) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('التدريب'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('quiz-history-button')));
    await tester.pumpAndSettle();

    expect(find.text('سجل الدرجات'), findsOneWidget);
    expect(find.text('سجل دائم لجميع محاولاتك ودرجاتك.'), findsOneWidget);
    expect(find.text('اختبار الأعداد العشرية'), findsOneWidget);
    expect(find.text('100%'), findsOneWidget);
    expect(find.text('24/8/2026'), findsOneWidget);
    expect(find.byIcon(Icons.delete_outline), findsNothing);
    expect(find.textContaining('حذف'), findsNothing);
  });

  testWidgets('student can open the courses tab from bottom navigation', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    await tester.pumpWidget(createTestApp(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('الكورسات'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('courses-tab-content')), findsOneWidget);
    expect(find.text('كل الكورسات'), findsOneWidget);
    expect(find.text('دورة تأسيس 2027'), findsOneWidget);
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

    expect(find.textContaining('ما الصورة العشرية للنصف ؟'), findsOneWidget);
    await tester.tap(find.text('0.5'));
    await tester.tap(find.text('التالي'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('0.9'));
    await tester.tap(find.text('إنهاء وتسليم'));
    await tester.pumpAndSettle();

    expect(quizRepository.submitCalls, 1);
    expect(find.text('أحسنت ! اجتزت الاختبار 🎉'), findsOneWidget);
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

    expect(find.byKey(const Key('account-brand-logo')), findsOneWidget);
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

    expect(find.textContaining('حذف الحساب لا يلغي اشتراك'), findsOneWidget);
    expect(
      find.byKey(const Key('manage-before-delete-button')),
      findsOneWidget,
    );
    await tester.enterText(
      find.byKey(const Key('delete-password-input')),
      'password123',
    );
    await tester.ensureVisible(
      find.byKey(const Key('delete-understood-checkbox')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('delete-understood-checkbox')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const Key('delete-account-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('delete-account-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-delete-account-button')));
    await tester.pumpAndSettle();

    expect(accountRepository.deleteCalls, 1);
    expect(find.text('أهلًا بعودتك'), findsOneWidget);
  });

  testWidgets('a non-student session is blocked from the app', (tester) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.parentProfile,
    );
    await tester.pumpWidget(createTestApp(authRepository));
    await tester.pumpAndSettle();

    expect(find.text('هذه المنصة مخصّصة لحسابات الطلاب فقط'), findsOneWidget);
  });
}
