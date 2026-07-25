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

  Future<LessonProgress> saveProgress({
    required String studentId,
    required String lessonId,
    required LessonProgress current,
    required int watchPercentage,
    required bool completed,
  });
}

class LearningFailure implements Exception {
  const LearningFailure(this.message);

  final String message;

  @override
  String toString() => message;
}
