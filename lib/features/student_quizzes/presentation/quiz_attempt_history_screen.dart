import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';

class QuizAttemptHistoryScreen extends StatefulWidget {
  const QuizAttemptHistoryScreen({required this.repository, super.key});

  final StudentQuizRepository repository;

  @override
  State<QuizAttemptHistoryScreen> createState() =>
      _QuizAttemptHistoryScreenState();
}

class _QuizAttemptHistoryScreenState extends State<QuizAttemptHistoryScreen> {
  late Future<List<QuizAttemptHistoryEntry>> _history;

  @override
  void initState() {
    super.initState();
    _history = widget.repository.loadAttemptHistory();
  }

  Future<void> _refresh() async {
    final next = widget.repository.loadAttemptHistory();
    setState(() => _history = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'سجل الدرجات',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back_rounded),
        ),
      ),
      body: FutureBuilder<List<QuizAttemptHistoryEntry>>(
        future: _history,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: QmColors.pink),
            );
          }
          if (snapshot.hasError) {
            return _HistoryMessage(
              icon: Icons.cloud_off_rounded,
              title: 'تعذّر تحميل سجل الدرجات',
              actionLabel: 'إعادة المحاولة',
              onAction: _refresh,
            );
          }
          final entries = snapshot.data ?? const [];
          if (entries.isEmpty) {
            return const _HistoryMessage(
              icon: Icons.fact_check_outlined,
              title: 'سيظهر سجل درجاتك هنا بعد أول محاولة',
            );
          }
          return RefreshIndicator(
            color: QmColors.pink,
            onRefresh: _refresh,
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 38),
              itemCount: entries.length + 1,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return const _ReadOnlyNotice();
                }
                return _HistoryCard(entry: entries[index - 1]);
              },
            ),
          );
        },
      ),
    );
  }
}

class _ReadOnlyNotice extends StatelessWidget {
  const _ReadOnlyNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: QmColors.lavender,
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        children: [
          Icon(Icons.verified_user_outlined, color: QmColors.purple),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'سجل دائم لجميع محاولاتك ودرجاتك.',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.entry});

  final QuizAttemptHistoryEntry entry;

  String _date(DateTime value) {
    final local = value.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final result = entry.result;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 66,
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: result.passed
                  ? const Color(0xFFE6FAF1)
                  : const Color(0xFFFFEEF2),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                Text(
                  '${result.percentage}%',
                  style: TextStyle(
                    color: result.passed ? QmColors.success : QmColors.error,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  '${result.score}/${result.totalMarks}',
                  style: TextStyle(color: QmColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.quizTitle,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  entry.lessonTitle ?? entry.courseTitle,
                  style: TextStyle(color: QmColors.textSecondary),
                ),
                const SizedBox(height: 9),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 15,
                      color: QmColors.textMuted,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _date(result.takenAt),
                      style: TextStyle(
                        color: QmColors.textMuted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryMessage extends StatelessWidget {
  const _HistoryMessage({
    required this.icon,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? actionLabel;
  final Future<void> Function()? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 54, color: QmColors.purple),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            if (actionLabel != null) ...[
              const SizedBox(height: 14),
              FilledButton(onPressed: onAction, child: Text(actionLabel!)),
            ],
          ],
        ),
      ),
    );
  }
}
