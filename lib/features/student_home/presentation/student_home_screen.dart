import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/account/presentation/account_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/features/notifications/data/notification_repository.dart';
import 'package:qudrat_maghrabi_app/features/notifications/presentation/notification_screen.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/data/student_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_course.dart';
import 'package:qudrat_maghrabi_app/features/student_home/domain/student_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/presentation/course_overview_screen.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_list_screen.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/presentation/store_subscription_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  const StudentHomeScreen({
    required this.profile,
    required this.repository,
    required this.learningRepository,
    required this.quizRepository,
    required this.subscriptionRepository,
    required this.notificationRepository,
    required this.accountRepository,
    required this.parentHomeRepository,
    required this.onProfileUpdated,
    required this.onAccountDeleted,
    required this.onSignOut,
    super.key,
  });

  final AuthProfile profile;
  final StudentHomeRepository repository;
  final StudentLearningRepository learningRepository;
  final StudentQuizRepository quizRepository;
  final SubscriptionRepository subscriptionRepository;
  final NotificationRepository notificationRepository;
  final AccountRepository accountRepository;
  final ParentHomeRepository parentHomeRepository;
  final ValueChanged<AuthProfile> onProfileUpdated;
  final Future<void> Function() onAccountDeleted;
  final Future<void> Function() onSignOut;

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  final _scrollController = ScrollController();
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

  Future<void> _onNavigationTap(int index) async {
    if (index == 1) {
      setState(() => _selectedNavigationIndex = index);
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
            familyRepository: widget.parentHomeRepository,
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
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeOutCubic,
      );
    }
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
              return _selectedNavigationIndex == 1
                  ? _buildCoursesContent(snapshot.data!)
                  : _buildContent(snapshot.data!);
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
    final nextCourse = snapshot.continueCourse ?? snapshot.recommendedCourse;
    StudentCourse? freeCourse;
    for (final course in snapshot.availableCourses) {
      if (course.isFree) {
        freeCourse = course;
        break;
      }
    }
    final otherCourses = snapshot.availableCourses
        .where((course) => course.id != freeCourse?.id)
        .toList(growable: false);

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
                  onNotificationTap: () async {
                    await Navigator.of(context).push<void>(
                      MaterialPageRoute(
                        builder: (_) => NotificationScreen(
                          userId: widget.profile.id,
                          repository: widget.notificationRepository,
                        ),
                      ),
                    );
                    if (mounted) await _refresh();
                  },
                ),
                const SizedBox(height: 24),
                if (freeCourse != null)
                  _FreeCourseSurpriseCard(
                    course: freeCourse,
                    onTap: () => _showCourseDetails(freeCourse!),
                  ),
                if (nextCourse != null && nextCourse.id != freeCourse?.id) ...[
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
                if (otherCourses.isNotEmpty) ...[
                  const SizedBox(height: 32),
                  _SectionTitle(
                    title: 'اكتشف باقي الكورسات',
                    subtitle: 'واصل رحلتك نحو هدفك',
                    trailing: otherCourses.length == 1
                        ? 'كورس واحد'
                        : '${otherCourses.length} كورسات',
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 350,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsetsDirectional.only(end: 2),
                      itemCount: otherCourses.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 14),
                      itemBuilder: (context, index) {
                        final course = otherCourses[index];
                        return _CourseCard(
                          key: ValueKey(course.id),
                          course: course,
                          onTap: () => course.hasAccess
                              ? _showCourseDetails(course)
                              : _showSubscriptions(),
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                _SubscriptionStatusCard(
                  subscription: snapshot.subscription,
                  onTap: _showSubscriptions,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCoursesContent(StudentHomeSnapshot snapshot) {
    final isTablet = MediaQuery.sizeOf(context).width >= 700;

    return RefreshIndicator(
      color: QmColors.pink,
      onRefresh: _refresh,
      child: CustomScrollView(
        key: const Key('courses-tab-content'),
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'كل الكورسات',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: QmColors.deepPurple,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'اختر مسارك وابدأ التعلّم بثقة',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: QmColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          if (snapshot.availableCourses.isEmpty)
            const SliverPadding(
              padding: EdgeInsets.fromLTRB(24, 0, 24, 130),
              sliver: SliverToBoxAdapter(child: _EmptyCoursesCard()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 130),
              sliver: SliverGrid(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isTablet ? 2 : 1,
                  mainAxisExtent: isTablet ? 470 : 350,
                  crossAxisSpacing: isTablet ? 24 : 0,
                  mainAxisSpacing: 20,
                ),
                delegate: SliverChildBuilderDelegate((context, index) {
                  final course = snapshot.availableCourses[index];
                  return _CourseCard(
                    key: ValueKey('catalog-${course.id}'),
                    course: course,
                    onTap: () => course.hasAccess
                        ? _showCourseDetails(course)
                        : _showSubscriptions(),
                  );
                }, childCount: snapshot.availableCourses.length),
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
          quizRepository: widget.quizRepository,
        ),
      ),
    );
  }

  Future<void> _showSubscriptions() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            StoreSubscriptionScreen(repository: widget.subscriptionRepository),
      ),
    );
    if (mounted) await _refresh();
  }
}

class _SubscriptionStatusCard extends StatelessWidget {
  const _SubscriptionStatusCard({
    required this.subscription,
    required this.onTap,
  });

  final StudentSubscription? subscription;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final active = subscription != null;
    final expiry = subscription?.expiresAt;
    final subtitle = active
        ? expiry == null
              ? '${subscription!.planName} • وصول مستمر'
              : '${subscription!.planName} • متبقّي ${subscription!.remainingDays} يومًا'
        : 'اختر شهرًا أو 3 أو 6 أشهر وافتح كل المحتوى';
    return Material(
      color: Colors.white.withValues(alpha: .88),
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        key: const Key('subscription-status-card'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: active
                  ? QmColors.success.withValues(alpha: .28)
                  : QmColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  gradient: active ? null : QmGradients.brand,
                  color: active ? const Color(0xFFE6FAF1) : null,
                  borderRadius: BorderRadius.circular(17),
                ),
                child: Icon(
                  active
                      ? Icons.verified_rounded
                      : Icons.workspace_premium_rounded,
                  color: active ? QmColors.success : Colors.white,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      active ? 'اشتراكك فعّال' : 'افتح كل الكورسات',
                      style: const TextStyle(
                        color: QmColors.textPrimary,
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_back_ios_new_rounded,
                color: QmColors.purple,
                size: 18,
              ),
            ],
          ),
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
                'حلمك إلى 100٪ يبدأ من هنا 🚀',
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

class _FreeCourseSurpriseCard extends StatelessWidget {
  const _FreeCourseSurpriseCard({required this.course, required this.onTap});

  final StudentCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(30),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: const Key('free-course-surprise-card'),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: QmColors.border),
            borderRadius: BorderRadius.circular(30),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F6824C7),
                blurRadius: 28,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Stack(
                children: [
                  AspectRatio(
                    key: const Key('free-course-cover-16-9'),
                    aspectRatio: 16 / 9,
                    child: ColoredBox(
                      color: QmColors.deepPurple,
                      child: _CourseImage(
                        imageUrl: course.thumbnailUrl,
                        width: double.infinity,
                        height: double.infinity,
                        borderRadius: 0,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  PositionedDirectional(
                    top: 14,
                    start: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5FFF3),
                        borderRadius: BorderRadius.circular(99),
                        boxShadow: const [
                          BoxShadow(color: Color(0x22000000), blurRadius: 12),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.card_giftcard_rounded,
                            color: QmColors.success,
                            size: 17,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'هدية البداية',
                            style: TextStyle(
                              color: QmColors.success,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'أول 3 حصص هدية لك',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: QmColors.deepPurple,
                        fontWeight: FontWeight.w900,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'ابدأ رحلتك مجانًا، واكتشف أسلوب الشرح قبل الاشتراك.',
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 15,
                        height: 1.55,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: onTap,
                        iconAlignment: IconAlignment.end,
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('ابدأ مجانًا'),
                        style: FilledButton.styleFrom(
                          backgroundColor: QmColors.deepPurple,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          textStyle: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 286.0;
        final imageHeight = cardWidth >= 380 ? cardWidth * 9 / 16 : 155.0;

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
                    _CourseImage(
                      imageUrl: course.thumbnailUrl,
                      width: double.infinity,
                      height: imageHeight,
                      borderRadius: 0,
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 15, 16, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _CourseTypeLabel(course: course),
                            const SizedBox(height: 9),
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
                                Icon(
                                  course.isFree
                                      ? Icons.card_giftcard_rounded
                                      : Icons.workspace_premium_rounded,
                                  color: course.isFree
                                      ? QmColors.success
                                      : QmColors.pink,
                                  size: 17,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  course.isFree ? 'مجاني' : 'مدفوع',
                                  style: TextStyle(
                                    color: course.isFree
                                        ? QmColors.success
                                        : QmColors.pink,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
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
      },
    );
  }
}

class _CourseTypeLabel extends StatelessWidget {
  const _CourseTypeLabel({required this.course});

  final StudentCourse course;

  @override
  Widget build(BuildContext context) {
    final isFree = course.isFree;
    final label = isFree ? 'كورس مجاني' : 'كورس مدفوع';
    final background = isFree
        ? const Color(0xFFE6FAF1)
        : const Color(0xFFFFEEF5);
    final foreground = isFree ? QmColors.success : QmColors.pink;

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
    this.fit = BoxFit.cover,
  });

  final String? imageUrl;
  final double width;
  final double height;
  final double borderRadius;
  final BoxFit fit;

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
        fit: fit,
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
