import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/app/qudrat_maghrabi_app.dart';

import '../test/fakes/fake_account_repository.dart';
import '../test/fakes/fake_auth_repository.dart';
import '../test/fakes/fake_parent_home_repository.dart';
import '../test/fakes/fake_student_home_repository.dart';
import '../test/fakes/fake_student_learning_repository.dart';
import '../test/fakes/fake_student_quiz_repository.dart';

void main() {
  runApp(
    QudratMaghrabiApp(
      authRepository: FakeAuthRepository(
        restoredProfile: FakeAuthRepository.studentProfile,
      ),
      accountRepository: FakeAccountRepository(),
      parentHomeRepository: FakeParentHomeRepository(),
      studentHomeRepository: FakeStudentHomeRepository(),
      studentLearningRepository: FakeStudentLearningRepository(),
      studentQuizRepository: FakeStudentQuizRepository(),
    ),
  );
}
