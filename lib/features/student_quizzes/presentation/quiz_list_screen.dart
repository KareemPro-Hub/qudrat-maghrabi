import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_attempt_screen.dart';

class QuizListScreen extends StatefulWidget {
  const QuizListScreen({required this.repository, super.key});

  final StudentQuizRepository repository;

  @override
  State<QuizListScreen> createState() => _QuizListScreenState();
}

class _QuizListScreenState extends State<QuizListScreen> {
  late Future<List<StudentQuiz>> _quizzesFuture;

  @override
  void initState() {
    super.initState();
    _quizzesFuture = _load();
  }

  Future<List<StudentQuiz>> _load() {
    return widget.repository.loadAvailableQuizzes();
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _quizzesFuture = next;
    });
    await next;
  }

  Future<void> _openQuiz(StudentQuiz quiz) async {
    if (!quiz.isReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'لم تُضف أسئلة لهذا الاختبار بعد',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            QuizAttemptScreen(quiz: quiz, repository: widget.repository),
      ),
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'التدريب والاختبارات',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
      ),
      body: FutureBuilder<List<StudentQuiz>>(
        future: _quizzesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: QmColors.pink),
            );
          }
          if (snapshot.hasError) {
            return _QuizListError(
              message: snapshot.error is QuizFailure
                  ? snapshot.error.toString()
                  : 'تعذّر تحميل الاختبارات',
              onRetry: _refresh,
            );
          }
          return _buildContent(snapshot.data ?? const []);
        },
      ),
    );
  }

  Widget _buildContent(List<StudentQuiz> quizzes) {
    final attempts = quizzes.fold<int>(
      0,
      (sum, quiz) => sum + quiz.attemptCount,
    );
    final scored = quizzes
        .where((quiz) => quiz.bestPercentage != null)
        .toList();
    final average = scored.isEmpty
        ? 0
        : (scored.fold<int>(0, (sum, quiz) => sum + quiz.bestPercentage!) /
                  scored.length)
              .round();

    return RefreshIndicator(
      color: QmColors.pink,
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 38),
        children: [
          _QuizHero(
            quizzesCount: quizzes.length,
            attemptsCount: attempts,
            average: average,
          ),
          const SizedBox(height: 28),
          Text(
            'اختباراتك المتاحة',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'طبّق بعد الدرس واعرف مستواك فورًا',
            style: TextStyle(color: QmColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (quizzes.isEmpty)
            const _EmptyQuizzesCard()
          else
            for (final quiz in quizzes)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _QuizCard(quiz: quiz, onTap: () => _openQuiz(quiz)),
              ),
        ],
      ),
    );
  }
}

class _QuizHero extends StatelessWidget {
  const _QuizHero({
    required this.quizzesCount,
    required this.attemptsCount,
    required this.average,
  });

  final int quizzesCount;
  final int attemptsCount;
  final int average;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [QmColors.deepPurple, QmColors.purple, QmColors.pink],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x387A2DD6),
            blurRadius: 28,
            offset: Offset(0, 16),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .18),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: .25),
                  ),
                ),
                child: const Icon(
                  Icons.fact_check_rounded,
                  color: Colors.white,
                  size: 30,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'اختبر قدراتك .. واصنع تفوقك.',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'تابع نتائجك فورًا، وتعرّف على نقاط القوة والضعف لديك !',
                style: TextStyle(color: Color(0xE6FFFFFF)),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  _HeroStat(label: 'اختبار', value: quizzesCount.toString()),
                  const SizedBox(width: 10),
                  _HeroStat(label: 'محاولة', value: attemptsCount.toString()),
                  const SizedBox(width: 10),
                  _HeroStat(
                    label: 'متوسطك',
                    value: attemptsCount == 0 ? '—' : '$average%',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: .16)),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              label,
              style: const TextStyle(color: Color(0xCCFFFFFF), fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuizCard extends StatelessWidget {
  const _QuizCard({required this.quiz, required this.onTap});

  final StudentQuiz quiz;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final result = quiz.lastResult;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: QmColors.border),
            boxShadow: const [
              BoxShadow(
                color: Color(0x100F0520),
                blurRadius: 20,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: const BoxDecoration(
                      gradient: QmGradients.brand,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.quiz_rounded, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          quiz.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: QmColors.textPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          quiz.lessonTitle ?? quiz.courseTitle,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: QmColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (result != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: result.passed
                            ? const Color(0xFFE6FAF1)
                            : const Color(0xFFFFEEF0),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        result.passed ? 'ناجح' : 'حاول مجددًا',
                        style: TextStyle(
                          color: result.passed
                              ? QmColors.success
                              : QmColors.error,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _QuizMeta(
                    icon: Icons.help_outline_rounded,
                    label: '${quiz.questionCount} أسئلة',
                  ),
                  const SizedBox(width: 12),
                  _QuizMeta(
                    icon: Icons.timer_outlined,
                    label: quiz.hasTimer
                        ? '${quiz.timeLimitMinutes} دقيقة'
                        : 'بدون مؤقت',
                  ),
                  const Spacer(),
                  if (quiz.bestPercentage != null)
                    Text(
                      'أفضل نتيجة ${quiz.bestPercentage}%',
                      style: const TextStyle(
                        color: QmColors.pink,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 15),
              Container(
                height: 48,
                decoration: BoxDecoration(
                  gradient: quiz.isReady ? QmGradients.brand : null,
                  color: quiz.isReady ? null : QmColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Text(
                  quiz.isReady
                      ? quiz.attemptCount > 0
                            ? 'أعد الاختبار'
                            : 'ابدأ الاختبار'
                      : 'الأسئلة قيد التجهيز',
                  style: TextStyle(
                    color: quiz.isReady ? Colors.white : QmColors.textMuted,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuizMeta extends StatelessWidget {
  const _QuizMeta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 17, color: QmColors.purple),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(color: QmColors.textSecondary, fontSize: 12),
        ),
      ],
    );
  }
}

class _EmptyQuizzesCard extends StatelessWidget {
  const _EmptyQuizzesCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 34, 24, 34),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: QmColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 74,
            height: 74,
            decoration: const BoxDecoration(
              color: QmColors.lavender,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.assignment_outlined,
              color: QmColors.purple,
              size: 38,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'لا توجد اختبارات منشورة بعد',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: QmColors.textPrimary,
              fontSize: 17,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'ستظهر اختبارات دروسك هنا فور إضافتها من المنصة.',
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.textSecondary, height: 1.6),
          ),
        ],
      ),
    );
  }
}

class _QuizListError extends StatelessWidget {
  const _QuizListError({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, color: QmColors.pink, size: 52),
            const SizedBox(height: 14),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }
}
