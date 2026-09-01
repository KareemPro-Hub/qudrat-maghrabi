import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';

class FakeStudentQuizRepository implements StudentQuizRepository {
  static const sampleQuiz = StudentQuiz(
    id: 'quiz-1',
    title: 'اختبار الأعداد العشرية',
    description: 'اختبار قصير لقياس فهم الدرس.',
    courseId: 'foundation-course',
    courseTitle: 'دورة تأسيس 2027',
    lessonId: 'lesson-1',
    lessonTitle: 'الأعداد العشرية',
    totalMarks: 2,
    passMarks: 1,
    questionCount: 2,
    attemptCount: 0,
  );

  static const sampleQuestions = [
    QuizQuestion(
      id: 'question-1',
      quizId: 'quiz-1',
      text: 'ما الصورة العشرية للنصف ؟',
      options: {'a': '0.5', 'b': '0.2', 'c': '1.5', 'd': '2.0'},
      marks: 1,
      orderIndex: 1,
    ),
    QuizQuestion(
      id: 'question-2',
      quizId: 'quiz-1',
      text: 'أي عدد هو الأكبر ؟',
      options: {'a': '0.09', 'b': '0.9', 'c': '0.19', 'd': '0.29'},
      marks: 1,
      orderIndex: 2,
    ),
  ];

  List<StudentQuiz> quizzes = const [sampleQuiz];
  int loadCalls = 0;
  int submitCalls = 0;
  int explanationVideoCalls = 0;

  List<QuizAttemptHistoryEntry> history = [
    QuizAttemptHistoryEntry(
      result: QuizAttemptResult(
        id: 'history-result-1',
        quizId: 'quiz-1',
        score: 2,
        totalMarks: 2,
        passed: true,
        answers: const {},
        takenAt: DateTime(2026, 8, 24, 12, 30),
      ),
      quizTitle: 'اختبار الأعداد العشرية',
      courseTitle: 'دورة تأسيس 2027',
      lessonTitle: 'الأعداد العشرية',
    ),
  ];

  @override
  Future<List<StudentQuiz>> loadAvailableQuizzes() async {
    loadCalls += 1;
    return quizzes;
  }

  @override
  Future<List<QuizAttemptHistoryEntry>> loadAttemptHistory() async => history;

  @override
  Future<List<QuizQuestion>> loadQuestions({required String quizId}) async {
    return sampleQuestions
        .where((question) => question.quizId == quizId)
        .toList();
  }

  @override
  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required Map<String, String> answers,
  }) async {
    submitCalls += 1;
    final score =
        (answers['question-1'] == 'a' ? 1 : 0) +
        (answers['question-2'] == 'b' ? 1 : 0);
    return QuizAttemptResult(
      id: 'result-$submitCalls',
      quizId: quizId,
      score: score,
      totalMarks: 2,
      passed: score >= 1,
      answers: Map.unmodifiable(answers),
      takenAt: DateTime(2026, 7, 24),
    );
  }

  @override
  Future<QuizReview> loadReview({
    required StudentQuiz quiz,
    required QuizAttemptResult result,
  }) async {
    return QuizReview(
      quiz: quiz,
      result: result,
      questions: const [
        QuizReviewQuestion(
          id: 'question-1',
          text: 'ما الصورة العشرية للنصف ؟',
          options: {'a': '0.5', 'b': '0.2', 'c': '1.5', 'd': '2.0'},
          correctAnswer: 'a',
          marks: 1,
          orderIndex: 1,
          explanation: 'النصف يساوي خمسة أعشار.',
        ),
        QuizReviewQuestion(
          id: 'question-2',
          text: 'أي عدد هو الأكبر ؟',
          options: {'a': '0.09', 'b': '0.9', 'c': '0.19', 'd': '0.29'},
          correctAnswer: 'b',
          marks: 1,
          orderIndex: 2,
          explanation: 'تسعة أعشار أكبر من بقية الخيارات.',
        ),
      ],
    );
  }

  @override
  Future<BunnyEmbedCredentials> requestExplanationVideo({
    required String courseId,
    required String videoId,
  }) async {
    explanationVideoCalls += 1;
    return const BunnyEmbedCredentials(
      libraryId: '706043',
      token: 'fake-token',
      expires: 1,
    );
  }
}
