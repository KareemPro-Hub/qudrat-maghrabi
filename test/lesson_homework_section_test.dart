import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/lesson_homework_section.dart';

import 'fakes/fake_student_quiz_repository.dart';

void main() {
  Widget buildSubject({bool empty = false}) {
    return MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: LessonHomeworkSection(
            quizzes: empty
                ? const []
                : const [FakeStudentQuizRepository.sampleQuiz],
            loading: false,
            onRetry: () {},
            onOpen: (_) {},
          ),
        ),
      ),
    );
  }

  testWidgets('lesson homework displays its linked quiz', (tester) async {
    await tester.pumpWidget(buildSubject());

    expect(find.byKey(const Key('lesson-homework-section')), findsOneWidget);
    expect(find.text('واجبات الدرس'), findsOneWidget);
    expect(find.text('اختبار الأعداد العشرية'), findsOneWidget);
    expect(find.text('2 أسئلة'), findsOneWidget);
    expect(find.text('حل الواجب'), findsOneWidget);
  });

  testWidgets('lesson homework explains when no quiz is linked', (
    tester,
  ) async {
    await tester.pumpWidget(buildSubject(empty: true));

    expect(find.text('لا يوجد واجب مضاف لهذا الدرس حتى الآن.'), findsOneWidget);
  });
}
