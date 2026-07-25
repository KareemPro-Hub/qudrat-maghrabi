import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/account/presentation/account_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/presentation/course_overview_screen.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_list_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({
    required this.profile,
    required this.repository,
    required this.learningRepository,
    required this.quizRepository,
    required this.accountRepository,
    required this.onProfileUpdated,
    required this.onAccountDeleted,
    required this.onSignOut,
    super.key,
  });

  final AuthProfile profile;
  final StudentHomeRepository repository;
  final StudentLearningRepository learningRepository;
  final StudentQuizRepository quizRepository;
  final AccountRepository accountRepository;
  final ValueChanged<AuthProfile> onProfileUpdated;
  final Future<void> Function() onAccountDeleted;
  final Future<void> Function() onSignOut;

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  final _scrollController = ScrollController();
  final _coursesKey = GlobalKey();
  late Future<StudentHomeSnapshot> _snapshotFuture;
  int _selectedNavigationIndex = 0;

  @override
  void initState() {
    super.initState();
    _snapshotFuture = _load();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<StudentHomeSnapshot> _load() {
    return widget.repository.load(studentId: widget.profile.id);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _snapshotFuture = next;
    });
    await next;
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.deepPurple,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
  }

  Future<void> _onNavigationTap(int index) async {
    if (index == 1) {
      setState(() => _selectedNavigationIndex = index);
      final coursesContext = _coursesKey.currentContext;
      if (coursesContext != null) {
        Scrollable.ensureVisible(
          coursesContext,
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeOutCubic,
          alignment: 0.05,
        ).whenComplete(() {
          if (mounted) setState(() => _selectedNavigationIndex = 0);
        });
      }
      return;
    }
    if (index == 2) {
      setState(() => _selectedNavigationIndex = index);
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => QuizListScreen(repository: widget.quizRepository),
        ),
      );
      if (mounted) setState(() => _selectedNavigationIndex = 0);
      return;
    }
    if (index == 3) {
      setState(() => _selectedNavigationIndex = index);
      await Navigator.of(context).push<void>(
        MaterialPageRoute(
          builder: (_) => AccountScreen(
            profile: widget.profile,
            repository: widget.accountRepository,
            onProfileUpdated: widget.onProfileUpdated,
            onSignOut: widget.onSignOut,
            onAccountDeleted: widget.onAccountDeleted,
          ),
        ),
      );
      if (mounted) setState(() => _selectedNavigationIndex = 0);
      return;
    }
    setState(() => _selectedNavigationIndex = 0);
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          bottom: false,
          child: FutureBuilder<StudentHomeSnapshot>(
            future: _snapshotFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const _HomeLoadingView();
              }
              if (snapshot.hasError || !snapshot.hasData) {
                return _HomeErrorView(onRetry: _refresh);
              }
              return _buildContent(snapshot.data!);
            },
          ),
        ),
      ),
      bottomNavigationBar: _GlassNavigationBar(
        selectedIndex: _selectedNavigationIndex,
        onTap: _onNavigationTap,
      ),
    );
  }

  Widget _buildContent(StudentHomeSnapshot snapshot) {
    final firstName = widget.profile.fullName
        .trim()
        .split(RegExp(r'\s+'))
        .first;
    final bundle = snapshot.bundles.isEmpty ? null : snapshot.bundles.first;
    final nextCourse = snapshot.continueCourse ?? snapshot.recommendedCourse;

    return RefreshIndicator(
      color: QmColors.pink,
      onRefresh: _refresh,
      child: CustomScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 150),
            sliver: SliverList.list(
              children: [
                _HomeHeader(
                  firstName: firstName,
                  unreadNotifications: snapshot.unreadNotifications,
                  onNotificationTap: () {
                    final count = snapshot.unreadNotifications;
                    _showMessage(
                      count == 0
                          ? 'لا توجد إشعارات جديدة'
                          : 'لديك $count إشعار جديد',
                    );
                  },
                ),
                const SizedBox(height: 24),
                _JourneyCard(
                  title: bundle?.title ?? 'رحلتك نحو الـ 95+',
                  coursesCount:
                      bundle?.childCoursesCount ??
                      snapshot.availableCourses.length,
                  onTap: () => _onNavigationTap(1),
                ),
                if (nextCourse != null) ...[
                  const SizedBox(height: 30),
                  _SectionTitle(
                    title: snapshot.continueCourse == null
                        ? 'ابدأ رحلتك'
                        : 'تابع من حيث توقفت',
                    subtitle: snapshot.continueCourse == null
                        ? 'الكورس المجاني جاهز لك بالكامل'
                        : 'أكمل خطوتك التالية نحو هدفك',
                  ),
                  const SizedBox(height: 14),
                  _ContinueCard(
                    course: nextCourse,
                    onTap: () => _showCourseDetails(nextCourse),
                  ),
                ],
                const SizedBox(height: 32),
                KeyedSubtree(
                  key: _coursesKey,
                  child: _SectionTitle(
                    title: 'الكورسات المتاحة',
                    subtitle: 'اختر مسارك وابدأ التعلّم بثقة',
                    trailing: '${snapshot.availableCourses.length} كورسات',
                  ),
                ),
                const SizedBox(height: 14),
                if (snapshot.availableCourses.isEmpty)
                  const _EmptyCoursesCard()
                else
                  SizedBox(
                    height: 330,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsetsDirectional.only(end: 2),
                      itemCount: snapshot.availableCourses.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 14),
                      itemBuilder: (context, index) {
                        final course = snapshot.availableCourses[index];
                        return _CourseCard(
                          key: ValueKey(course.id),
                          course: course,
                          onTap: () => _showCourseDetails(course),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 30),
                _MotivationCard(
                  accessibleCourses: snapshot.myCourses.length,
                  availableCourses: snapshot.availableCourses.length,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showCourseDetails(StudentCourse course) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => CourseOverviewScreen(
          courseId: course.id,
          studentId: widget.profile.id,
          repository: widget.learningRepository,
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.firstName,
    required this.unreadNotifications,
    required this.onNotificationTap,
  });

  final String firstName;
  final int unreadNotifications;
  final VoidCallback onNotificationTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 62,
          height: 62,
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .92),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A7A2DD6),
                blurRadius: 22,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Image.asset('assets/brand/qudrat_maghrabi_logo.png'),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'أهلًا $firstName 👋',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: QmColors.textPrimary,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'جاهز تخطو خطوة جديدة نحو هدفك؟',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: QmColors.textSecondary),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Stack(
          clipBehavior: Clip.none,
          children: [
            IconButton(
              onPressed: onNotificationTap,
              icon: const Icon(Icons.notifications_none_rounded),
              color: QmColors.deepPurple,
              iconSize: 28,
              style: IconButton.styleFrom(
                backgroundColor: Colors.white.withValues(alpha: .9),
                minimumSize: const Size.square(52),
                side: const BorderSide(color: QmColors.border),
              ),
            ),
            if (unreadNotifications > 0)
              PositionedDirectional(
                top: -2,
                end: -2,
                child: Container(
                  constraints: const BoxConstraints(
                    minWidth: 20,
                    minHeight: 20,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  decoration: const BoxDecoration(
                    color: QmColors.pink,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    unreadNotifications > 9
                        ? '+9'
                        : unreadNotifications.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _JourneyCard extends StatelessWidget {
  const _JourneyCard({
    required this.title,
    required this.coursesCount,
    required this.onTap,
  });

  final String title;
  final int coursesCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 190),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [QmColors.deepPurple, Color(0xFF6824C7), QmColors.purple],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(
            color: Color(0x407A2DD6),
            blurRadius: 28,
            offset: Offset(0, 16),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          const PositionedDirectional(
            top: -56,
            end: -30,
            child: _DecorativeCircle(size: 170),
          ),
          const PositionedDirectional(
            bottom: -70,
            start: -25,
            child: _DecorativeCircle(size: 150),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .14),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: .2),
                    ),
                  ),
                  child: Text(
                    '$coursesCount مسارات تعليمية',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    height: 1.25,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'افهم، تدرّب، وتفوّق بخطة واضحة.',
                  style: TextStyle(color: Color(0xD9FFFFFF), fontSize: 15),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: onTap,
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(Icons.arrow_back_rounded, size: 20),
                  label: const Text('استعرض الكورسات'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: QmColors.deepPurple,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 12,
                    ),
                    textStyle: const TextStyle(fontWeight: FontWeight.w900),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DecorativeCircle extends StatelessWidget {
  const _DecorativeCircle({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: .06),
        border: Border.all(color: Colors.white.withValues(alpha: .08)),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: QmColors.textPrimary,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: QmColors.textSecondary),
              ),
            ],
          ),
        ),
        if (trailing != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
            decoration: BoxDecoration(
              color: QmColors.lavender,
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(
              trailing!,
              style: const TextStyle(
                color: QmColors.purple,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ),
      ],
    );
  }
}

class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.course, required this.onTap});

  final StudentCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: QmColors.border),
            boxShadow: const [
              BoxShadow(
                color: Color(0x100F0520),
                blurRadius: 24,
                offset: Offset(0, 12),
              ),
            ],
          ),
          child: Row(
            children: [
              _CourseImage(
                imageUrl: course.thumbnailUrl,
                width: 104,
                height: 86,
                borderRadius: 18,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      course.currentLessonTitle ??
                          '${course.lessonsCount} دروس جاهزة',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 11),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        minHeight: 7,
                        value: course.progressPercent / 100,
                        color: QmColors.pink,
                        backgroundColor: QmColors.lavender,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  gradient: QmGradients.brand,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow_rounded,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.course, required this.onTap, super.key});

  final StudentCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 286,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(26),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: QmColors.border),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x120F0520),
                  blurRadius: 22,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    _CourseImage(
                      imageUrl: course.thumbnailUrl,
                      width: double.infinity,
                      height: 155,
                      borderRadius: 0,
                    ),
                    PositionedDirectional(
                      top: 12,
                      start: 12,
                      child: _AccessBadge(course: course),
                    ),
                    if (!course.hasAccess && !course.isFree)
                      PositionedDirectional(
                        top: 12,
                        end: 12,
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: QmColors.deepPurple.withValues(alpha: .88),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.lock_outline_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                  ],
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 15, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                height: 1.3,
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(
                              Icons.menu_book_rounded,
                              color: QmColors.purple,
                              size: 18,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              '${course.lessonsCount} دروس',
                              style: const TextStyle(
                                color: QmColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                            const Spacer(),
                            const Icon(
                              Icons.signal_cellular_alt_rounded,
                              color: QmColors.pink,
                              size: 17,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _levelLabel(course.level),
                              style: const TextStyle(
                                color: QmColors.textSecondary,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                course.hasAccess
                                    ? 'ابدأ التعلّم'
                                    : _priceLabel(course),
                                maxLines: 1,
                                style: TextStyle(
                                  color: course.hasAccess
                                      ? QmColors.success
                                      : QmColors.textPrimary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 15,
                                ),
                              ),
                            ),
                            Container(
                              width: 42,
                              height: 42,
                              decoration: const BoxDecoration(
                                gradient: QmGradients.brand,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                course.hasAccess
                                    ? Icons.play_arrow_rounded
                                    : Icons.arrow_back_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AccessBadge extends StatelessWidget {
  const _AccessBadge({required this.course});

  final StudentCourse course;

  @override
  Widget build(BuildContext context) {
    final label = course.isFree
        ? 'مجاني بالكامل'
        : course.hasAccess
        ? 'مشترك'
        : 'مدفوع';
    final background = course.isFree || course.hasAccess
        ? const Color(0xFFE6FAF1)
        : const Color(0xFFFFEEF5);
    final foreground = course.isFree || course.hasAccess
        ? QmColors.success
        : QmColors.pink;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _CourseImage extends StatelessWidget {
  const _CourseImage({
    required this.imageUrl,
    required this.width,
    required this.height,
    required this.borderRadius,
  });

  final String? imageUrl;
  final double width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
      width: width,
      height: height,
      decoration: const BoxDecoration(gradient: QmGradients.brand),
      alignment: Alignment.center,
      child: const Icon(
        Icons.auto_stories_rounded,
        color: Colors.white,
        size: 42,
      ),
    );
    final url = imageUrl;
    if (url == null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: fallback,
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.network(
        url,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => fallback,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return Container(
            width: width,
            height: height,
            color: QmColors.lavender,
            alignment: Alignment.center,
            child: const CircularProgressIndicator(
              strokeWidth: 2,
              color: QmColors.purple,
            ),
          );
        },
      ),
    );
  }
}

class _MotivationCard extends StatelessWidget {
  const _MotivationCard({
    required this.accessibleCourses,
    required this.availableCourses,
  });

  final int accessibleCourses;
  final int availableCourses;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4F8),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFFFD9E7)),
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Text('🔥', style: TextStyle(fontSize: 24)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'لا تحفظ.. افهم وتفوّق',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  accessibleCourses == 0
                      ? '$availableCourses كورسات في انتظار انطلاقتك'
                      : '$accessibleCourses كورسات متاحة لك الآن',
                  style: const TextStyle(
                    color: QmColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GlassNavigationBar extends StatelessWidget {
  const _GlassNavigationBar({required this.selectedIndex, required this.onTap});

  final int selectedIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    (Icons.home_rounded, 'الرئيسية'),
    (Icons.grid_view_rounded, 'الكورسات'),
    (Icons.track_changes_rounded, 'التدريب'),
    (Icons.person_rounded, 'حسابي'),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            height: 76,
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .84),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: Colors.white.withValues(alpha: .92)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x281B0A33),
                  blurRadius: 28,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: Row(
              children: List.generate(_items.length, (index) {
                final item = _items[index];
                final selected = index == selectedIndex;
                return Expanded(
                  child: InkWell(
                    onTap: () => onTap(index),
                    borderRadius: BorderRadius.circular(22),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      decoration: BoxDecoration(
                        color: selected
                            ? QmColors.lavender
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            item.$1,
                            color: selected
                                ? QmColors.purple
                                : QmColors.textSecondary,
                            size: 24,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            item.$2,
                            style: TextStyle(
                              color: selected
                                  ? QmColors.purple
                                  : QmColors.textSecondary,
                              fontSize: 11,
                              fontWeight: selected
                                  ? FontWeight.w900
                                  : FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeLoadingView extends StatelessWidget {
  const _HomeLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: QmColors.pink),
          SizedBox(height: 16),
          Text(
            'نجهّز مسارك التعليمي...',
            style: TextStyle(
              color: QmColors.textSecondary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeErrorView extends StatelessWidget {
  const _HomeErrorView({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, color: QmColors.pink, size: 50),
            const SizedBox(height: 14),
            Text(
              'تعذّر تحميل الكورسات',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 7),
            const Text(
              'تحقق من اتصالك ثم حاول مرة أخرى.',
              style: TextStyle(color: QmColors.textSecondary),
            ),
            const SizedBox(height: 20),
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

class _EmptyCoursesCard extends StatelessWidget {
  const _EmptyCoursesCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: const Column(
        children: [
          Icon(Icons.auto_stories_outlined, size: 44, color: QmColors.purple),
          SizedBox(height: 12),
          Text(
            'لا توجد كورسات منشورة حاليًا',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

String _priceLabel(StudentCourse course) {
  if (course.isFree) return 'مجاني';
  final decimals = course.price == course.price.roundToDouble() ? 0 : 2;
  return '${course.price.toStringAsFixed(decimals)} ${_currencyLabel(course.currency)}';
}

String _currencyLabel(String currency) {
  switch (currency.toUpperCase()) {
    case 'EGP':
      return 'ج.م';
    case 'SAR':
      return 'ر.س';
    default:
      return currency;
  }
}

String _levelLabel(String level) {
  switch (level) {
    case 'intermediate':
      return 'متوسط';
    case 'advanced':
      return 'متقدم';
    default:
      return 'مبتدئ';
  }
}
