import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/presentation/lesson_player_screen.dart';

class CourseOverviewScreen extends StatefulWidget {
  const CourseOverviewScreen({
    required this.courseId,
    required this.studentId,
    required this.repository,
    super.key,
  });

  final String courseId;
  final String studentId;
  final StudentLearningRepository repository;

  @override
  State<CourseOverviewScreen> createState() => _CourseOverviewScreenState();
}

class _CourseOverviewScreenState extends State<CourseOverviewScreen> {
  late Future<CourseLearningContent> _contentFuture;

  @override
  void initState() {
    super.initState();
    _contentFuture = _load();
  }

  Future<CourseLearningContent> _load() {
    return widget.repository.loadCourse(
      courseId: widget.courseId,
      studentId: widget.studentId,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _contentFuture = next;
    });
    await next;
  }

  Future<void> _openLesson(
    CourseLearningContent content,
    CourseLesson lesson,
  ) async {
    if (!content.hasAccess && !lesson.isFreePreview) {
      _showMessage('هذا الدرس متاح للمشتركين في الكورس');
      return;
    }
    if (!lesson.hasVideo) {
      _showMessage('سيتم إضافة فيديو هذا الدرس قريبًا');
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => LessonPlayerScreen(
          content: content,
          initialLessonId: lesson.id,
          studentId: widget.studentId,
          repository: widget.repository,
        ),
      ),
    );
    if (mounted) await _refresh();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.deepPurple,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      body: FutureBuilder<CourseLearningContent>(
        future: _contentFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const _CourseLoadingView();
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return _CourseErrorView(
              message: snapshot.error is LearningFailure
                  ? snapshot.error.toString()
                  : 'تعذّر تحميل محتوى الكورس',
              onRetry: _refresh,
            );
          }
          return _buildContent(snapshot.data!);
        },
      ),
    );
  }

  Widget _buildContent(CourseLearningContent content) {
    return RefreshIndicator(
      color: QmColors.pink,
      onRefresh: _refresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          SliverAppBar(
            expandedHeight: MediaQuery.sizeOf(context).width * 9 / 16,
            pinned: true,
            stretch: true,
            foregroundColor: Colors.white,
            backgroundColor: QmColors.deepPurple,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: IconButton.filledTonal(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back_rounded),
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white.withValues(alpha: .92),
                  foregroundColor: QmColors.deepPurple,
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              stretchModes: const [StretchMode.zoomBackground],
              background: _CourseHero(content: content),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 46),
            sliver: SliverList.list(
              children: [
                Row(
                  children: [
                    _StatusPill(
                      label: content.price <= 0
                          ? 'مجاني بالكامل'
                          : content.hasAccess
                          ? 'مشترك'
                          : 'مدفوع',
                      accessible: content.hasAccess,
                    ),
                    const Spacer(),
                    const Icon(
                      Icons.play_lesson_rounded,
                      color: QmColors.purple,
                      size: 20,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${content.allLessons.length} دروس',
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  content.title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: QmColors.textPrimary,
                    height: 1.25,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                if (content.description.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    content.description,
                    style: const TextStyle(
                      color: QmColors.textSecondary,
                      height: 1.65,
                    ),
                  ),
                ],
                const SizedBox(height: 22),
                _ProgressCard(content: content),
                const SizedBox(height: 30),
                Text(
                  'محتوى الكورس',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: QmColors.textPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'دروس مرتّبة في مسار واضح من البداية للنهاية',
                  style: TextStyle(color: QmColors.textSecondary),
                ),
                const SizedBox(height: 16),
                if (content.chapters.isEmpty &&
                    content.ungroupedLessons.isEmpty)
                  const _NoLessonsCard()
                else ...[
                  for (var index = 0; index < content.chapters.length; index++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _ChapterCard(
                        chapter: content.chapters[index],
                        chapterNumber: index + 1,
                        hasCourseAccess: content.hasAccess,
                        onLessonTap: (lesson) => _openLesson(content, lesson),
                      ),
                    ),
                  if (content.ungroupedLessons.isNotEmpty)
                    _ChapterCard(
                      chapter: CourseChapter(
                        id: 'other',
                        title: 'دروس إضافية',
                        orderIndex: content.chapters.length,
                        lessons: content.ungroupedLessons,
                      ),
                      chapterNumber: content.chapters.length + 1,
                      hasCourseAccess: content.hasAccess,
                      onLessonTap: (lesson) => _openLesson(content, lesson),
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CourseHero extends StatelessWidget {
  const _CourseHero({required this.content});

  final CourseLearningContent content;

  @override
  Widget build(BuildContext context) {
    final url = content.thumbnailUrl;
    return ColoredBox(
      key: const Key('course-cover-hero'),
      color: QmColors.deepPurple,
      child: url == null
          ? const DecoratedBox(
              decoration: BoxDecoration(gradient: QmGradients.brand),
            )
          : Image.network(
              url,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const DecoratedBox(
                decoration: BoxDecoration(gradient: QmGradients.brand),
              ),
            ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.accessible});

  final String label;
  final bool accessible;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
      decoration: BoxDecoration(
        color: accessible ? const Color(0xFFE6FAF1) : const Color(0xFFFFEEF5),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            accessible ? Icons.verified_rounded : Icons.lock_rounded,
            size: 16,
            color: accessible ? QmColors.success : QmColors.pink,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: accessible ? QmColors.success : QmColors.pink,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.content});

  final CourseLearningContent content;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x120F0520),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
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
                  Icons.track_changes_rounded,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'تقدّمك في الكورس',
                      style: TextStyle(
                        color: QmColors.textPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${content.completedLessons} من ${content.allLessons.length} دروس مكتملة',
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${content.progressPercent}%',
                style: const TextStyle(
                  color: QmColors.purple,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              minHeight: 9,
              value: content.progressPercent / 100,
              color: QmColors.pink,
              backgroundColor: QmColors.lavender,
            ),
          ),
        ],
      ),
    );
  }
}

class _ChapterCard extends StatefulWidget {
  const _ChapterCard({
    required this.chapter,
    required this.chapterNumber,
    required this.hasCourseAccess,
    required this.onLessonTap,
  });

  final CourseChapter chapter;
  final int chapterNumber;
  final bool hasCourseAccess;
  final ValueChanged<CourseLesson> onLessonTap;

  @override
  State<_ChapterCard> createState() => _ChapterCardState();
}

class _ChapterCardState extends State<_ChapterCard> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final chapter = widget.chapter;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: QmColors.lavender,
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Text(
                      widget.chapterNumber.toString().padLeft(2, '0'),
                      style: const TextStyle(
                        color: QmColors.purple,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          chapter.title,
                          style: const TextStyle(
                            color: QmColors.textPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          chapter.lessons.isEmpty
                              ? 'قريبًا'
                              : '${chapter.lessons.length} دروس • ${chapter.progressPercent}% مكتمل',
                          style: const TextStyle(
                            color: QmColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  AnimatedRotation(
                    turns: _expanded ? .5 : 0,
                    duration: const Duration(milliseconds: 220),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: QmColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_expanded && chapter.lessons.isNotEmpty) ...[
            const Divider(),
            for (var index = 0; index < chapter.lessons.length; index++) ...[
              _LessonTile(
                lesson: chapter.lessons[index],
                lessonNumber: index + 1,
                hasCourseAccess: widget.hasCourseAccess,
                onTap: () => widget.onLessonTap(chapter.lessons[index]),
              ),
              if (index != chapter.lessons.length - 1)
                const Divider(indent: 74, endIndent: 18),
            ],
          ],
        ],
      ),
    );
  }
}

class _LessonTile extends StatelessWidget {
  const _LessonTile({
    required this.lesson,
    required this.lessonNumber,
    required this.hasCourseAccess,
    required this.onTap,
  });

  final CourseLesson lesson;
  final int lessonNumber;
  final bool hasCourseAccess;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final canOpen = hasCourseAccess || lesson.isFreePreview;
    final completed = lesson.progress.completed;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 13, 16, 13),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: canOpen ? QmGradients.brand : null,
                color: canOpen ? null : QmColors.surfaceSoft,
                shape: BoxShape.circle,
                border: canOpen ? null : Border.all(color: QmColors.border),
              ),
              child: Icon(
                completed
                    ? Icons.check_rounded
                    : canOpen
                    ? Icons.play_arrow_rounded
                    : Icons.lock_outline_rounded,
                color: canOpen ? Colors.white : QmColors.textMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lesson.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: QmColors.textPrimary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _lessonMeta(lesson),
                    style: const TextStyle(
                      color: QmColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (!completed && lesson.progress.watchPercentage > 0)
              Text(
                '${lesson.progress.watchPercentage}%',
                style: const TextStyle(
                  color: QmColors.pink,
                  fontWeight: FontWeight.w900,
                ),
              )
            else
              Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 16,
                color: canOpen ? QmColors.purple : QmColors.textMuted,
              ),
          ],
        ),
      ),
    );
  }

  String _lessonMeta(CourseLesson lesson) {
    final duration = lesson.durationMinutes;
    if (duration == null || duration <= 0) return 'الدرس $lessonNumber';
    return 'الدرس $lessonNumber • $duration دقيقة';
  }
}

class _CourseLoadingView extends StatelessWidget {
  const _CourseLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator(color: QmColors.pink));
  }
}

class _CourseErrorView extends StatelessWidget {
  const _CourseErrorView({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                color: QmColors.pink,
                size: 54,
              ),
              const SizedBox(height: 16),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: QmColors.textPrimary,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoLessonsCard extends StatelessWidget {
  const _NoLessonsCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: const Column(
        children: [
          Icon(Icons.auto_stories_rounded, color: QmColors.purple, size: 44),
          SizedBox(height: 12),
          Text(
            'يتم تجهيز دروس هذا الكورس',
            style: TextStyle(
              color: QmColors.textPrimary,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(height: 5),
          Text(
            'ستظهر هنا فور نشرها',
            style: TextStyle(color: QmColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
