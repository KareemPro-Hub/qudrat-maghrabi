import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';

class LessonHomeworkSection extends StatelessWidget {
  const LessonHomeworkSection({
    required this.quizzes,
    required this.loading,
    required this.onRetry,
    required this.onOpen,
    this.errorMessage,
    super.key,
  });

  final List<StudentQuiz> quizzes;
  final bool loading;
  final String? errorMessage;
  final VoidCallback onRetry;
  final ValueChanged<StudentQuiz> onOpen;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('lesson-homework-section'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'واجبات الدرس',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          'طبّق ما تعلّمته، وتعرّف على مستواك فورًا.',
          style: TextStyle(color: QmColors.textSecondary),
        ),
        const SizedBox(height: 12),
        if (loading)
          const _HomeworkLoadingCard()
        else if (errorMessage != null)
          _HomeworkMessageCard(
            icon: Icons.cloud_off_rounded,
            title: errorMessage!,
            actionLabel: 'إعادة المحاولة',
            onAction: onRetry,
          )
        else if (quizzes.isEmpty)
          const _HomeworkMessageCard(
            icon: Icons.assignment_outlined,
            title: 'لا يوجد واجب مضاف لهذا الدرس حتى الآن.',
          )
        else
          for (final quiz in quizzes)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _HomeworkCard(
                key: ValueKey('homework-${quiz.id}'),
                quiz: quiz,
                onTap: () => onOpen(quiz),
              ),
            ),
      ],
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  const _HomeworkCard({required this.quiz, required this.onTap, super.key});

  final StudentQuiz quiz;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final attempted = quiz.attemptCount > 0;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x100F0520),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  gradient: QmGradients.brand,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.assignment_turned_in_rounded,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      quiz.title,
                      style: TextStyle(
                        color: QmColors.textPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${quiz.questionCount} أسئلة${quiz.hasTimer ? ' • ${quiz.timeLimitMinutes} دقيقة' : ''}',
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (quiz.bestPercentage != null)
                Text(
                  '${quiz.bestPercentage}%',
                  style: const TextStyle(
                    color: QmColors.success,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
            ],
          ),
          if (quiz.description.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              quiz.description,
              style: TextStyle(color: QmColors.textSecondary, height: 1.6),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: quiz.isReady ? onTap : null,
              icon: Icon(
                attempted ? Icons.replay_rounded : Icons.edit_note_rounded,
              ),
              label: Text(
                quiz.isReady
                    ? attempted
                          ? 'إعادة الواجب'
                          : 'حل الواجب'
                    : 'الواجب قيد التجهيز',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeworkLoadingCard extends StatelessWidget {
  const _HomeworkLoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 112,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: const CircularProgressIndicator(color: QmColors.pink),
    );
  }
}

class _HomeworkMessageCard extends StatelessWidget {
  const _HomeworkMessageCard({
    required this.icon,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: QmColors.purple, size: 34),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.textSecondary),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 10),
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
