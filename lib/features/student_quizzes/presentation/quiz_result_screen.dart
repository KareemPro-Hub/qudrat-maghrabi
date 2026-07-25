import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_attempt_screen.dart';

class QuizResultScreen extends StatefulWidget {
  const QuizResultScreen({
    required this.quiz,
    required this.result,
    required this.repository,
    super.key,
  });

  final StudentQuiz quiz;
  final QuizAttemptResult result;
  final StudentQuizRepository repository;

  @override
  State<QuizResultScreen> createState() => _QuizResultScreenState();
}

class _QuizResultScreenState extends State<QuizResultScreen> {
  late Future<QuizReview> _reviewFuture;

  @override
  void initState() {
    super.initState();
    _reviewFuture = widget.repository.loadReview(
      quiz: widget.quiz,
      result: widget.result,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: QmColors.background,
        title: const Text(
          'نتيجة الاختبار',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close_rounded),
        ),
      ),
      body: FutureBuilder<QuizReview>(
        future: _reviewFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: QmColors.pink),
            );
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  snapshot.error?.toString() ?? 'تعذّر تحميل المراجعة',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return _buildReview(snapshot.data!);
        },
      ),
    );
  }

  Widget _buildReview(QuizReview review) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 38),
      children: [
        _ResultHero(review: review),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.fact_check_outlined),
                label: const Text('كل الاختبارات'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
              ),
            ),
            if (!review.result.passed) ...[
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: QmGradients.brand,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pushReplacement<void, void>(
                        MaterialPageRoute(
                          builder: (_) => QuizAttemptScreen(
                            quiz: widget.quiz,
                            repository: widget.repository,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('إعادة المحاولة'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 28),
        Text(
          'مراجعة الإجابات',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          '${review.correctAnswers} إجابات صحيحة من ${review.questions.length}',
          style: const TextStyle(color: QmColors.textSecondary),
        ),
        const SizedBox(height: 14),
        for (var index = 0; index < review.questions.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _ReviewQuestionCard(
              question: review.questions[index],
              number: index + 1,
              studentAnswer: review.result.answers[review.questions[index].id],
            ),
          ),
      ],
    );
  }
}

class _ResultHero extends StatelessWidget {
  const _ResultHero({required this.review});

  final QuizReview review;

  @override
  Widget build(BuildContext context) {
    final passed = review.result.passed;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: passed
            ? const LinearGradient(
                colors: [Color(0xFFE9FBF3), Color(0xFFD7F6E8)],
              )
            : const LinearGradient(
                colors: [Color(0xFFFFF0F3), Color(0xFFFFE1E7)],
              ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: passed ? const Color(0xFFBCEAD6) : const Color(0xFFFFC5CF),
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              color: passed ? QmColors.success : QmColors.error,
              shape: BoxShape.circle,
            ),
            child: Icon(
              passed ? Icons.emoji_events_rounded : Icons.refresh_rounded,
              color: Colors.white,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            passed ? 'أحسنت! اجتزت الاختبار 🎉' : 'المرة القادمة أفضل',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            review.quiz.title,
            textAlign: TextAlign.center,
            style: const TextStyle(color: QmColors.textSecondary),
          ),
          const SizedBox(height: 22),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _ScoreValue(
                value: '${review.result.score}',
                label: 'درجتك',
                color: QmColors.purple,
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 18),
                child: Text(
                  '/',
                  style: TextStyle(color: QmColors.textMuted, fontSize: 28),
                ),
              ),
              _ScoreValue(
                value: '${review.result.totalMarks}',
                label: 'الدرجة الكاملة',
                color: QmColors.textSecondary,
              ),
              const SizedBox(width: 24),
              _ScoreValue(
                value: '${review.result.percentage}%',
                label: 'النسبة',
                color: passed ? QmColors.success : QmColors.error,
              ),
            ],
          ),
          const SizedBox(height: 20),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              minHeight: 11,
              value: review.result.percentage / 100,
              color: passed ? QmColors.success : QmColors.error,
              backgroundColor: Colors.white.withValues(alpha: .7),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'درجة النجاح: ${review.quiz.passMarks} من ${review.quiz.totalMarks}',
            style: const TextStyle(color: QmColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _ScoreValue extends StatelessWidget {
  const _ScoreValue({
    required this.value,
    required this.label,
    required this.color,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 28,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: QmColors.textSecondary, fontSize: 11),
        ),
      ],
    );
  }
}

class _ReviewQuestionCard extends StatelessWidget {
  const _ReviewQuestionCard({
    required this.question,
    required this.number,
    required this.studentAnswer,
  });

  final QuizReviewQuestion question;
  final int number;
  final String? studentAnswer;

  @override
  Widget build(BuildContext context) {
    const labels = {'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د'};
    final correct = studentAnswer == question.correctAnswer;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: correct ? const Color(0xFFBCEAD6) : const Color(0xFFFFC5CF),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                correct ? Icons.check_circle_rounded : Icons.cancel_rounded,
                color: correct ? QmColors.success : QmColors.error,
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  '$number. ${question.text}',
                  style: const TextStyle(
                    color: QmColors.textPrimary,
                    height: 1.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          for (final entry in question.options.entries)
            if (entry.key == studentAnswer ||
                entry.key == question.correctAnswer)
              Container(
                margin: const EdgeInsets.only(bottom: 7),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: entry.key == question.correctAnswer
                      ? const Color(0xFFE6FAF1)
                      : const Color(0xFFFFEEF0),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Text(
                  '${labels[entry.key]}) ${entry.value}',
                  style: TextStyle(
                    color: entry.key == question.correctAnswer
                        ? QmColors.success
                        : QmColors.error,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          if (studentAnswer == null)
            const Text(
              'لم تتم الإجابة',
              style: TextStyle(
                color: QmColors.error,
                fontWeight: FontWeight.w800,
              ),
            ),
          if (question.explanation != null) ...[
            const SizedBox(height: 7),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: QmColors.lavender,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                '💡 ${question.explanation}',
                style: const TextStyle(
                  color: QmColors.textSecondary,
                  height: 1.55,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
