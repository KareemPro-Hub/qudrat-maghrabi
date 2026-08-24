import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseStudentQuizRepository implements StudentQuizRepository {
  const SupabaseStudentQuizRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<StudentQuiz>> loadAvailableQuizzes() async {
    try {
      final response = await _client.rpc('get_available_quizzes_for_student');
      return _rows(response).map(_quizFromRow).toList();
    } on PostgrestException catch (error) {
      throw QuizFailure(_messageFor(error));
    }
  }

  @override
  Future<List<QuizAttemptHistoryEntry>> loadAttemptHistory() async {
    try {
      final response = await _client.rpc(
        'get_quiz_attempt_history_for_student',
      );
      return _rows(response).map(_historyEntryFromRow).toList();
    } on PostgrestException catch (error) {
      throw QuizFailure(_messageFor(error));
    }
  }

  @override
  Future<List<QuizQuestion>> loadQuestions({required String quizId}) async {
    try {
      final response = await _client.rpc(
        'get_quiz_questions_for_student',
        params: {'p_quiz_id': quizId},
      );
      return _rows(response).map(_questionFromRow).toList();
    } on PostgrestException catch (error) {
      throw QuizFailure(_messageFor(error));
    }
  }

  @override
  Future<QuizAttemptResult> submitAttempt({
    required String quizId,
    required Map<String, String> answers,
  }) async {
    try {
      final response = await _client.rpc(
        'submit_quiz_attempt',
        params: {'p_quiz_id': quizId, 'p_answers': answers},
      );
      final rows = _rows(response);
      if (rows.isEmpty) {
        throw const QuizFailure('تعذّر حفظ النتيجة. حاول مرة أخرى');
      }
      return _resultFromRow(rows.first);
    } on PostgrestException catch (error) {
      throw QuizFailure(_messageFor(error));
    }
  }

  @override
  Future<QuizReview> loadReview({
    required StudentQuiz quiz,
    required QuizAttemptResult result,
  }) async {
    try {
      final response = await _client.rpc(
        'get_quiz_review',
        params: {'p_quiz_id': quiz.id, 'p_result_id': result.id},
      );
      final questions = _rows(response).map(_reviewQuestionFromRow).toList();
      return QuizReview(quiz: quiz, result: result, questions: questions);
    } on PostgrestException catch (error) {
      throw QuizFailure(_messageFor(error));
    }
  }

  StudentQuiz _quizFromRow(Map<String, dynamic> row) {
    final resultId = _text(row['last_result_id']);
    final result = resultId == null
        ? null
        : QuizAttemptResult(
            id: resultId,
            quizId: row['id'] as String,
            score: _int(row['last_score']),
            totalMarks: _int(row['last_total_marks']),
            passed: row['last_passed'] as bool? ?? false,
            answers: const {},
            takenAt:
                DateTime.tryParse(row['last_taken_at']?.toString() ?? '') ??
                DateTime.fromMillisecondsSinceEpoch(0),
          );
    return StudentQuiz(
      id: row['id'] as String,
      title: _text(row['title']) ?? '',
      description: _text(row['description']) ?? '',
      courseId: row['course_id'] as String,
      courseTitle: _text(row['course_title']) ?? '',
      lessonId: _text(row['lesson_id']),
      lessonTitle: _text(row['lesson_title']),
      timeLimitMinutes: row['time_limit_minutes'] == null
          ? null
          : _int(row['time_limit_minutes']),
      totalMarks: _int(row['total_marks']),
      passMarks: _int(row['pass_marks']),
      questionCount: _int(row['question_count']),
      attemptCount: _int(row['attempt_count']),
      bestPercentage: row['best_percentage'] == null
          ? null
          : _int(row['best_percentage']).clamp(0, 100),
      lastResult: result,
    );
  }

  QuizQuestion _questionFromRow(Map<String, dynamic> row) {
    return QuizQuestion(
      id: row['id'] as String,
      quizId: row['quiz_id'] as String,
      text: _text(row['question_text']) ?? '',
      options: _options(row),
      marks: _int(row['marks']),
      orderIndex: _int(row['order_index']),
      imageUrl: _text(row['question_image_url']),
      linkUrl: _text(row['question_link_url']),
      linkText: _text(row['question_link_text']),
    );
  }

  QuizReviewQuestion _reviewQuestionFromRow(Map<String, dynamic> row) {
    return QuizReviewQuestion(
      id: row['id'] as String,
      text: _text(row['question_text']) ?? '',
      options: _options(row),
      correctAnswer: _text(row['correct_answer']) ?? '',
      marks: _int(row['marks']),
      orderIndex: _int(row['order_index']),
      explanation: _text(row['explanation']),
      explanationVideoId: _text(row['explanation_video_id']),
      imageUrl: _text(row['question_image_url']),
      linkUrl: _text(row['question_link_url']),
      linkText: _text(row['question_link_text']),
    );
  }

  QuizAttemptResult _resultFromRow(Map<String, dynamic> row) {
    final answersValue = row['answers'];
    final answers = <String, String>{};
    if (answersValue is Map) {
      for (final entry in answersValue.entries) {
        answers[entry.key.toString()] = entry.value.toString();
      }
    }
    return QuizAttemptResult(
      id: row['id'] as String,
      quizId: row['quiz_id'] as String,
      score: _int(row['score']),
      totalMarks: _int(row['total_marks']),
      passed: row['passed'] as bool? ?? false,
      answers: answers,
      takenAt:
          DateTime.tryParse(row['taken_at']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  QuizAttemptHistoryEntry _historyEntryFromRow(Map<String, dynamic> row) {
    return QuizAttemptHistoryEntry(
      result: _resultFromRow(row),
      quizTitle: _text(row['quiz_title']) ?? 'اختبار',
      courseTitle: _text(row['course_title']) ?? '',
      lessonTitle: _text(row['lesson_title']),
    );
  }

  Map<String, String> _options(Map<String, dynamic> row) {
    return {
      'a': _text(row['option_a']) ?? '',
      'b': _text(row['option_b']) ?? '',
      'c': _text(row['option_c']) ?? '',
      'd': _text(row['option_d']) ?? '',
    };
  }

  List<Map<String, dynamic>> _rows(dynamic value) {
    return (value as List).cast<Map<String, dynamic>>();
  }

  String _messageFor(PostgrestException error) {
    if (error.code == '42501') {
      return 'هذا الاختبار غير متاح لحسابك حاليًا';
    }
    if (error.code == 'PGRST202') {
      return 'خدمة الاختبارات قيد التحديث. حاول بعد قليل';
    }
    return 'تعذّر تحميل الاختبارات. تحقق من الإنترنت وحاول مجددًا';
  }

  int _int(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  String? _text(dynamic value) {
    final text = value?.toString().trim();
    return text == null || text.isEmpty ? null : text;
  }
}
