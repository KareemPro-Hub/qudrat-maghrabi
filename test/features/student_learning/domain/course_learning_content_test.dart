import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';

void main() {
  const previewLesson = CourseLesson(
    id: 'lesson-1',
    courseId: 'course-1',
    title: 'الحصة الأولى',
    description: '',
    orderIndex: 1,
    isFreePreview: true,
    progress: LessonProgress.empty,
  );
  const paidLesson = CourseLesson(
    id: 'lesson-4',
    courseId: 'course-1',
    title: 'الحصة الرابعة',
    description: '',
    orderIndex: 4,
    isFreePreview: false,
    progress: LessonProgress.empty,
  );

  test('غير المشترك يصل فقط إلى الدروس المحددة كمعاينة مجانية', () {
    const content = CourseLearningContent(
      courseId: 'course-1',
      title: 'دورة التأسيس',
      description: '',
      price: 79,
      hasAccess: false,
      chapters: [],
      ungroupedLessons: [previewLesson, paidLesson],
    );

    expect(content.canAccessLesson(previewLesson), isTrue);
    expect(content.canAccessLesson(paidLesson), isFalse);
    expect(content.freePreviewLessonsCount, 1);
    expect(content.isFullyFree, isFalse);
  });

  test('المشترك يصل إلى الدروس المجانية والمدفوعة', () {
    const content = CourseLearningContent(
      courseId: 'course-1',
      title: 'دورة التأسيس',
      description: '',
      price: 79,
      hasAccess: true,
      chapters: [],
      ungroupedLessons: [previewLesson, paidLesson],
    );

    expect(content.canAccessLesson(previewLesson), isTrue);
    expect(content.canAccessLesson(paidLesson), isTrue);
  });
}
