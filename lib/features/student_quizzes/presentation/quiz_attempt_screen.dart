import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_result_screen.dart';
import 'package:url_launcher/url_launcher.dart';

class QuizAttemptScreen extends StatefulWidget {
  const QuizAttemptScreen({
    required this.quiz,
    required this.repository,
    super.key,
  });

  final StudentQuiz quiz;
  final StudentQuizRepository repository;

  @override
  State<QuizAttemptScreen> createState() => _QuizAttemptScreenState();
}

class _QuizAttemptScreenState extends State<QuizAttemptScreen>
    with WidgetsBindingObserver {
  final _pageController = PageController();
  final Map<String, String> _answers = {};
  late Future<List<QuizQuestion>> _questionsFuture;
  List<QuizQuestion> _questions = const [];
  Timer? _timer;
  DateTime? _deadline;
  int? _secondsLeft;
  int _currentIndex = 0;
  bool _submitting = false;
  bool _finished = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _questionsFuture = _loadQuestions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _updateTimer();
  }

  Future<List<QuizQuestion>> _loadQuestions() async {
    final questions = await widget.repository.loadQuestions(
      quizId: widget.quiz.id,
    );
    _questions = questions;
    // لو الطالب خرج من الاختبار والأسئلة لسه بتتحمّل، الشاشة بتكون اتقفلت خلاص
    // ومفيش حد يوقف المؤقت — فكان بيفضل شغال في الخلفية ويرمي استثناء عند
    // انتهاء الوقت لأنه بينادي setState على شاشة مقفولة.
    if (!mounted) return questions;
    if (widget.quiz.hasTimer) {
      final seconds = widget.quiz.timeLimitMinutes! * 60;
      _deadline = DateTime.now().add(Duration(seconds: seconds));
      _secondsLeft = seconds;
      _timer = Timer.periodic(
        const Duration(seconds: 1),
        (_) => _updateTimer(),
      );
    }
    return questions;
  }

  void _updateTimer() {
    if (!mounted) {
      _timer?.cancel();
      return;
    }
    final deadline = _deadline;
    if (deadline == null || _finished) return;
    final remaining = deadline.difference(DateTime.now()).inSeconds;
    if (remaining <= 0) {
      _timer?.cancel();
      setState(() => _secondsLeft = 0);
      _submit(force: true);
      return;
    }
    if (mounted) setState(() => _secondsLeft = remaining);
  }

  Future<void> _goTo(int index) async {
    if (index < 0 || index >= _questions.length) return;
    await _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _submit({bool force = false}) async {
    if (_submitting || _finished || _questions.isEmpty) return;
    final unanswered = _questions.length - _answers.length;
    if (!force && unanswered > 0) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text(
            'إنهاء الاختبار ؟',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          content: Text(
            'لم تجب عن $unanswered ${unanswered == 1 ? 'سؤال' : 'أسئلة'}. هل تريد التسليم الآن ؟',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('أكمل الحل'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('تسليم'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    setState(() => _submitting = true);
    try {
      final result = await widget.repository.submitAttempt(
        quizId: widget.quiz.id,
        answers: _answers,
      );
      _finished = true;
      _timer?.cancel();
      if (!mounted) return;
      await Navigator.of(context).pushReplacement<void, void>(
        MaterialPageRoute(
          builder: (_) => QuizResultScreen(
            quiz: widget.quiz,
            result: result,
            repository: widget.repository,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is QuizFailure ? error.toString() : 'تعذّر تسليم الاختبار',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.error,
        ),
      );
    }
  }

  Future<bool> _confirmExit() async {
    if (_answers.isEmpty || _finished) return true;
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text(
              'مغادرة الاختبار ؟',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            content: const Text(
              'ستفقد إجابات هذه المحاولة إذا غادرت قبل التسليم.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('البقاء'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: FilledButton.styleFrom(backgroundColor: QmColors.error),
                child: const Text('مغادرة'),
              ),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _answers.isEmpty || _finished,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmExit() && context.mounted) {
          _finished = true;
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: QmColors.background,
        appBar: AppBar(
          backgroundColor: QmColors.background,
          title: Text(
            widget.quiz.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          leading: IconButton(
            onPressed: () async {
              if (await _confirmExit() && context.mounted) {
                _finished = true;
                Navigator.of(context).pop();
              }
            },
            icon: const Icon(Icons.close_rounded),
          ),
          actions: [
            if (_secondsLeft != null)
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 12),
                child: _TimerPill(seconds: _secondsLeft!),
              ),
          ],
        ),
        body: FutureBuilder<List<QuizQuestion>>(
          future: _questionsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(
                child: CircularProgressIndicator(color: QmColors.pink),
              );
            }
            if (snapshot.hasError) {
              return _AttemptError(message: snapshot.error.toString());
            }
            final questions = snapshot.data ?? const [];
            if (questions.isEmpty) {
              return const _NoQuestionsView();
            }
            return _buildQuiz(questions);
          },
        ),
      ),
    );
  }

  Widget _buildQuiz(List<QuizQuestion> questions) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
          child: Column(
            children: [
              Row(
                children: [
                  Text(
                    '${_answers.length}/${questions.length} أُجيب عليها',
                    style: TextStyle(
                      color: QmColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'السؤال ${_currentIndex + 1} من ${questions.length}',
                    style: TextStyle(
                      color: QmColors.textPrimary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 9),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  minHeight: 8,
                  value: (_currentIndex + 1) / questions.length,
                  color: QmColors.pink,
                  backgroundColor: QmColors.lavender,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: questions.length,
            onPageChanged: (index) => setState(() => _currentIndex = index),
            itemBuilder: (context, index) => _QuestionView(
              question: questions[index],
              number: index + 1,
              selected: _answers[questions[index].id],
              onSelected: (answer) {
                setState(() => _answers[questions[index].id] = answer);
              },
            ),
          ),
        ),
        _QuestionNavigator(
          questions: questions,
          answers: _answers,
          currentIndex: _currentIndex,
          submitting: _submitting,
          onSelect: _goTo,
          onPrevious: () => _goTo(_currentIndex - 1),
          onNext: () => _goTo(_currentIndex + 1),
          onSubmit: () => _submit(),
        ),
      ],
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({
    required this.question,
    required this.number,
    required this.selected,
    required this.onSelected,
  });

  final QuizQuestion question;
  final int number;
  final String? selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    const labels = {'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د'};
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: QmColors.surface,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: QmColors.border),
          boxShadow: const [
            BoxShadow(
              color: Color(0x100F0520),
              blurRadius: 22,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '$number. ${question.text}',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                height: 1.55,
                fontWeight: FontWeight.w900,
              ),
            ),
            if (question.imageUrl != null) ...[
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(
                  question.imageUrl!,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
            ],
            if (question.linkUrl != null) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () async {
                  final uri = Uri.tryParse(question.linkUrl!);
                  if (uri != null) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: Text(question.linkText ?? 'فتح الرابط المرفق'),
              ),
            ],
            const SizedBox(height: 18),
            for (final entry in question.options.entries) ...[
              _AnswerOption(
                label: labels[entry.key] ?? entry.key,
                text: entry.value,
                selected: selected == entry.key,
                onTap: () => onSelected(entry.key),
              ),
              if (entry.key != 'd') const SizedBox(height: 11),
            ],
          ],
        ),
      ),
    );
  }
}

class _AnswerOption extends StatelessWidget {
  const _AnswerOption({
    required this.label,
    required this.text,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFFFF0F6) : QmColors.surfaceSoft,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: selected ? QmColors.pink : QmColors.border,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: selected ? QmGradients.brand : null,
                  color: selected ? null : QmColors.lavender,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: selected ? Colors.white : QmColors.purple,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(
                    color: QmColors.textPrimary,
                    fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                  ),
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle_rounded, color: QmColors.pink),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuestionNavigator extends StatelessWidget {
  const _QuestionNavigator({
    required this.questions,
    required this.answers,
    required this.currentIndex,
    required this.submitting,
    required this.onSelect,
    required this.onPrevious,
    required this.onNext,
    required this.onSubmit,
  });

  final List<QuizQuestion> questions;
  final Map<String, String> answers;
  final int currentIndex;
  final bool submitting;
  final ValueChanged<int> onSelect;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final last = currentIndex == questions.length - 1;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
        decoration: BoxDecoration(
          color: QmColors.surface,
          border: Border(top: BorderSide(color: QmColors.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: questions.length,
                separatorBuilder: (_, _) => const SizedBox(width: 7),
                itemBuilder: (context, index) {
                  final active = index == currentIndex;
                  final answered = answers.containsKey(questions[index].id);
                  return InkWell(
                    onTap: () => onSelect(index),
                    borderRadius: BorderRadius.circular(11),
                    child: Container(
                      width: 38,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: active ? QmGradients.brand : null,
                        color: active
                            ? null
                            : answered
                            ? const Color(0xFFE6FAF1)
                            : QmColors.surfaceSoft,
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                          color: active
                              ? Colors.transparent
                              : answered
                              ? const Color(0xFFBCEAD6)
                              : QmColors.border,
                        ),
                      ),
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          color: active
                              ? Colors.white
                              : answered
                              ? QmColors.success
                              : QmColors.textSecondary,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 11),
            Row(
              children: [
                OutlinedButton(
                  onPressed: currentIndex == 0 ? null : onPrevious,
                  child: const Text('السابق'),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: QmGradients.brand,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: FilledButton.icon(
                      onPressed: submitting
                          ? null
                          : last
                          ? onSubmit
                          : onNext,
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        disabledBackgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                      ),
                      iconAlignment: IconAlignment.end,
                      icon: submitting
                          ? const SizedBox(
                              width: 19,
                              height: 19,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Icon(
                              last
                                  ? Icons.send_rounded
                                  : Icons.arrow_forward_rounded,
                            ),
                      label: Text(
                        submitting
                            ? 'جاري التسليم'
                            : last
                            ? 'إنهاء وتسليم'
                            : 'التالي',
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TimerPill extends StatelessWidget {
  const _TimerPill({required this.seconds});

  final int seconds;

  @override
  Widget build(BuildContext context) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    final urgent = seconds <= 60;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: urgent ? const Color(0xFFFFE9EC) : QmColors.lavender,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        children: [
          Icon(
            Icons.timer_outlined,
            size: 16,
            color: urgent ? QmColors.error : QmColors.purple,
          ),
          const SizedBox(width: 5),
          Text(
            '$minutes:${remainingSeconds.toString().padLeft(2, '0')}',
            textDirection: TextDirection.ltr,
            style: TextStyle(
              color: urgent ? QmColors.error : QmColors.purple,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoQuestionsView extends StatelessWidget {
  const _NoQuestionsView();

  @override
  Widget build(BuildContext context) {
    return const Center(child: Text('لا توجد أسئلة في هذا الاختبار'));
  }
}

class _AttemptError extends StatelessWidget {
  const _AttemptError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(message, textAlign: TextAlign.center),
      ),
    );
  }
}
