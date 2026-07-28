import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';

import 'fakes/fake_student_learning_repository.dart';

void main() {
  test('يحفظ موضع الفيديو الدقيق ويستعيده دون خفض نسبة التقدم', () async {
    final repository = FakeStudentLearningRepository();

    final progress = await repository.saveProgress(
      studentId: 'student-1',
      lessonId: 'lesson-1',
      current: const LessonProgress(
        watchPercentage: 25,
        completed: false,
        positionSeconds: 120,
        durationSeconds: 600,
      ),
      watchPercentage: 20,
      completed: false,
      positionSeconds: 137,
      durationSeconds: 600,
    );

    expect(progress.watchPercentage, 25);
    expect(progress.positionSeconds, 137);
    expect(progress.durationSeconds, 600);
    expect(progress.completed, isFalse);
  });

  test('إكمال الدرس يثبت النسبة والموضع عند نهاية الفيديو', () async {
    final repository = FakeStudentLearningRepository();

    final progress = await repository.saveProgress(
      studentId: 'student-1',
      lessonId: 'lesson-1',
      current: LessonProgress.empty,
      watchPercentage: 99,
      completed: true,
      positionSeconds: 598,
      durationSeconds: 600,
    );

    expect(progress.watchPercentage, 100);
    expect(progress.positionSeconds, 600);
    expect(progress.durationSeconds, 600);
    expect(progress.completed, isTrue);
  });
}
