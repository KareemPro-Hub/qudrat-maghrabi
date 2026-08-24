class StudentQuiz {
  const StudentQuiz({
    required this.id,
    required this.title,
    required this.description,
    required this.courseId,
    required this.courseTitle,
    required this.totalMarks,
    required this.passMarks,
    required this.questionCount,
    required this.attemptCount,
    this.lessonId,
    this.lessonTitle,
    this.timeLimitMinutes,
    this.bestPercentage,
    this.lastResult,
  });

  final String id;
  final String title;
  final String description;
  final String courseId;
  final String courseTitle;
  final String? lessonId;
  final String? lessonTitle;
  final int? timeLimitMinutes;
  final int totalMarks;
  final int passMarks;
  final int questionCount;
  final int attemptCount;
  final int? bestPercentage;
  final QuizAttemptResult? lastResult;

  bool get isReady => questionCount > 0;
  bool get hasTimer => timeLimitMinutes != null && timeLimitMinutes! > 0;
}

class QuizQuestion {
  const QuizQuestion({
    required this.id,
    required this.quizId,
    required this.text,
    required this.options,
    required this.marks,
    required this.orderIndex,
    this.imageUrl,
    this.linkUrl,
    this.linkText,
  });

  final String id;
  final String quizId;
  final String text;
  final Map<String, String> options;
  final int marks;
  final int orderIndex;
  final String? imageUrl;
  final String? linkUrl;
  final String? linkText;
}

class QuizAttemptResult {
  const QuizAttemptResult({
    required this.id,
    required this.quizId,
    required this.score,
    required this.totalMarks,
    required this.passed,
    required this.answers,
    required this.takenAt,
  });

  final String id;
  final String quizId;
  final int score;
  final int totalMarks;
  final bool passed;
  final Map<String, String> answers;
  final DateTime takenAt;

  int get percentage {
    if (totalMarks <= 0) return 0;
    return ((score / totalMarks) * 100).round().clamp(0, 100);
  }
}

class QuizAttemptHistoryEntry {
  const QuizAttemptHistoryEntry({
    required this.result,
    required this.quizTitle,
    required this.courseTitle,
    this.lessonTitle,
  });

  final QuizAttemptResult result;
  final String quizTitle;
  final String courseTitle;
  final String? lessonTitle;
}

class QuizReviewQuestion {
  const QuizReviewQuestion({
    required this.id,
    required this.text,
    required this.options,
    required this.correctAnswer,
    required this.marks,
    required this.orderIndex,
    this.explanation,
    this.explanationVideoId,
    this.imageUrl,
    this.linkUrl,
    this.linkText,
  });

  final String id;
  final String text;
  final Map<String, String> options;
  final String correctAnswer;
  final int marks;
  final int orderIndex;
  final String? explanation;
  final String? explanationVideoId;
  final String? imageUrl;
  final String? linkUrl;
  final String? linkText;
}

class QuizReview {
  const QuizReview({
    required this.quiz,
    required this.result,
    required this.questions,
  });

  final StudentQuiz quiz;
  final QuizAttemptResult result;
  final List<QuizReviewQuestion> questions;

  int get correctAnswers => questions
      .where(
        (question) => result.answers[question.id] == question.correctAnswer,
      )
      .length;
}
