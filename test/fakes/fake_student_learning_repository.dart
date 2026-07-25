import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';

class FakeStudentLearningRepository implements StudentLearningRepository {
  static const sampleLesson = CourseLesson(
    id: 'lesson-1',
    courseId: 'foundation-course',
    chapterId: 'chapter-1',
    title: 'الأعداد العشرية',
    description: 'ملخص مبسط للأعداد العشرية.',
    videoId: 'video-1',
    durationMinutes: 36,
    orderIndex: 1,
    isFreePreview: false,
    progress: LessonProgress.empty,
  );

  static const sampleContent = CourseLearningContent(
    courseId: 'foundation-course',
    title: 'دورة تأسيس 2027',
    description: 'تأسيس قوي ومبسّط في القدرات الكمية.',
    price: 0,
    hasAccess: true,
    chapters: [
      CourseChapter(
        id: 'chapter-1',
        title: 'الباب الأول - الجبر',
        orderIndex: 1,
        lessons: [sampleLesson],
      ),
    ],
    ungroupedLessons: [],
  );

  CourseLearningContent content = sampleContent;
  int loadCalls = 0;
  int saveCalls = 0;

  @override
  Future<CourseLearningContent> loadCourse({
    required String courseId,
    required String studentId,
  }) async {
    loadCalls += 1;
    return content;
  }

  @override
  Future<BunnyEmbedCredentials> requestVideo({
    required String courseId,
    required String videoId,
  }) async {
    return const BunnyEmbedCredentials(
      libraryId: '123',
      token: 'test-token',
      expires: 9999999999,
    );
  }

  @override
  Future<LessonProgress> saveProgress({
    required String studentId,
    required String lessonId,
    required LessonProgress current,
    required int watchPercentage,
    required bool completed,
  }) async {
    saveCalls += 1;
    return LessonProgress(
      watchPercentage: completed
          ? 100
          : watchPercentage.clamp(current.watchPercentage, 100),
      completed: current.completed || completed,
    );
  }
}
