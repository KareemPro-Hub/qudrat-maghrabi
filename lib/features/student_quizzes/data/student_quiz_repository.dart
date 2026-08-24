import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';

abstract interface class StudentQuizRepository {
  Future<List<StudentQuiz>> loadAvailableQuizzes();

  Future<List<QuizAttemptHistoryEntry>> loadAttemptHistory();

  Future<List<QuizQuestion>> loadQuestions({required String quizId});

  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required Map<String, String> answers,
  });

  Future<QuizReview> loadReview({
    required StudentQuiz quiz,
    required QuizAttemptResult result,
  });
}

class QuizFailure implements Exception {
  const QuizFailure(this.message);

  final String message;

  @override
  String toString() => message;
}
