import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';

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
    expect(
      find.text('أدخل رقم جوال صحيحًا، مثل 05xxxxxxxx'),
      findsOneWidget,
    );
    expect(
      find.text('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
      findsOneWidget,
    );
  });
}
