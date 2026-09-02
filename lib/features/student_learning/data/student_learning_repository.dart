import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';

abstract interface class StudentLearningRepository {
  Future<CourseLearningContent> loadCourse({
    required String courseId,
    required String studentId,
  });

  Future<BunnyEmbedCredentials> requestVideo({
    required String courseId,
    required String videoId,
  });

  /// تسجيل واقعة لقطة شاشة باسم الطالب. فشلها مايأثرش على المشاهدة.
  Future<void> logScreenshot({
    required String studentId,
    String? lessonId,
    required String platform,
  });

  /// ملفات الدرس المرفقة (PDF / أوراق عمل). ترجع فاضية لو مفيش ملفات.
  Future<List<LessonFile>> loadLessonFiles({required String lessonId});

  Future<LessonProgress> saveProgress({
    required String studentId,
    required String lessonId,
    required LessonProgress current,
    required int watchPercentage,
    required bool completed,
    required int positionSeconds,
    required int durationSeconds,
  });
}

class LearningFailure implements Exception {
  const LearningFailure(this.message);

  final String message;

  @override
  String toString() => message;
}
