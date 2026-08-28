import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fakes/fake_account_repository.dart';
import 'fakes/fake_auth_repository.dart';
import 'fakes/fake_biometric_lock_service.dart';
import 'fakes/fake_student_home_repository.dart';
import 'fakes/fake_student_learning_repository.dart';
import 'fakes/fake_student_quiz_repository.dart';

QudratMaghrabiApp _createApp(
  FakeAuthRepository authRepository,
  FakeBiometricLockService lock,
) {
  return QudratMaghrabiApp(
    authRepository: authRepository,
    accountRepository: FakeAccountRepository(),
    studentHomeRepository: FakeStudentHomeRepository(),
    studentLearningRepository: FakeStudentLearningRepository(),
    studentQuizRepository: FakeStudentQuizRepository(),
    biometricLock: lock,
  );
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('a saved session stays locked until the biometric check passes', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final lock = FakeBiometricLockService(
      enabled: true,
      authenticateResult: false,
    );

    await tester.pumpWidget(_createApp(authRepository, lock));
    await tester.pumpAndSettle();

    expect(find.text('التطبيق مقفول'), findsOneWidget);
    expect(lock.authenticateCalls, 1);

    lock.authenticateResult = true;
    await tester.tap(find.byKey(const Key('biometric-unlock-button')));
    await tester.pumpAndSettle();

    expect(find.text('التطبيق مقفول'), findsNothing);
  });

  testWidgets('a saved session opens directly when the lock is off', (
    tester,
  ) async {
    final authRepository = FakeAuthRepository(
      restoredProfile: FakeAuthRepository.studentProfile,
    );
    final lock = FakeBiometricLockService();

    await tester.pumpWidget(_createApp(authRepository, lock));
    await tester.pumpAndSettle();

    expect(find.text('التطبيق مقفول'), findsNothing);
    expect(lock.authenticateCalls, 0);
  });
}
