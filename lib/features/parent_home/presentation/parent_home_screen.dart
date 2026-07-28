import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/account/data/account_repository.dart';
import 'package:qudrat_maghrabi_app/features/account/presentation/account_screen.dart';
import 'package:qudrat_maghrabi_app/features/auth/domain/auth_profile.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/domain/parent_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class ParentHomeScreen extends StatefulWidget {
  const ParentHomeScreen({
    required this.profile,
    required this.repository,
    required this.accountRepository,
    required this.onProfileUpdated,
    required this.onAccountDeleted,
    required this.onSignOut,
    super.key,
  });

  final AuthProfile profile;
  final ParentHomeRepository repository;
  final AccountRepository accountRepository;
  final ValueChanged<AuthProfile> onProfileUpdated;
  final Future<void> Function() onAccountDeleted;
  final Future<void> Function() onSignOut;

  @override
  State<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends State<ParentHomeScreen> {
  late Future<ParentHomeSnapshot> _snapshotFuture;
  String? _activeStudentId;
  int _selectedNavigationIndex = 0;

  @override
  void initState() {
    super.initState();
    _snapshotFuture = _load();
  }

  Future<ParentHomeSnapshot> _load() {
    return widget.repository.load(parentId: widget.profile.id);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _snapshotFuture = next;
    });
    await next;
  }

  Future<void> _openLinkStudent() async {
    final linked = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ParentLinkStudentScreen(repository: widget.repository),
      ),
    );
    if (linked == true && mounted) {
      _activeStudentId = null;
      await _refresh();
    }
  }

  Future<void> _openAccount() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => AccountScreen(
          profile: widget.profile,
          repository: widget.accountRepository,
          familyRepository: widget.repository,
          onProfileUpdated: widget.onProfileUpdated,
          onSignOut: widget.onSignOut,
          onAccountDeleted: widget.onAccountDeleted,
        ),
      ),
    );
    if (mounted) setState(() => _selectedNavigationIndex = 0);
  }

  void _showMessage(String message, {bool error = false}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: error ? QmColors.error : QmColors.deepPurple,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
  }

  Future<void> _sendReminder(ParentStudentSummary student) async {
    try {
      await widget.repository.sendReminder(
        studentId: student.id,
        parentName: widget.profile.fullName,
        lessonTitle: student.primaryCourse?.currentLessonTitle,
      );
      if (!mounted) return;
      _showMessage('تم إرسال تذكير إلى ${_firstName(student.fullName)}');
    } on ParentHomeFailure catch (error) {
      if (mounted) _showMessage(error.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<ParentHomeSnapshot>(
      future: _snapshotFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _ParentLoadingView();
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return _ParentErrorView(onRetry: _refresh);
        }

        final students = snapshot.data!.students;
        if (students.isEmpty) {
          return _ParentEmptyView(
            onLinkStudent: _openLinkStudent,
            onAccountTap: _openAccount,
          );
        }

        final activeId = _activeStudentId;
        final activeStudent = students.firstWhere(
          (student) => student.id == activeId,
          orElse: () => students.first,
        );
        _activeStudentId = activeStudent.id;

        return Scaffold(
          extendBody: true,
          body: DecoratedBox(
            decoration: const BoxDecoration(
              gradient: QmGradients.softBackground,
            ),
            child: SafeArea(
              bottom: false,
              child: RefreshIndicator(
                color: QmColors.pink,
                onRefresh: _refresh,
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 142),
                      sliver: SliverList.list(
                        children: [
                          _ParentHeader(
                            parentName: widget.profile.fullName,
                            onAddStudent: _openLinkStudent,
                          ),
                          const SizedBox(height: 24),
                          _StudentSwitcher(
                            students: students,
                            activeId: activeStudent.id,
                            onSelected: (studentId) {
                              setState(() => _activeStudentId = studentId);
                            },
                            onAddStudent: _openLinkStudent,
                          ),
                          const SizedBox(height: 24),
                          if (_selectedNavigationIndex == 0)
                            _ParentOverview(
                              student: activeStudent,
                              onReminder: () => _sendReminder(activeStudent),
                            )
                          else if (_selectedNavigationIndex == 1)
                            _ParentProgressView(student: activeStudent)
                          else
                            _ParentTestsView(student: activeStudent),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          bottomNavigationBar: _ParentNavigationBar(
            selectedIndex: _selectedNavigationIndex,
            onTap: (index) {
              if (index == 3) {
                _openAccount();
                return;
              }
              setState(() => _selectedNavigationIndex = index);
            },
          ),
        );
      },
    );
  }
}

class ParentLinkStudentScreen extends StatefulWidget {
  const ParentLinkStudentScreen({required this.repository, super.key});

  final ParentHomeRepository repository;

  @override
  State<ParentLinkStudentScreen> createState() =>
      _ParentLinkStudentScreenState();
}

class _ParentLinkStudentScreenState extends State<ParentLinkStudentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _linking = false;
  String? _errorMessage;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _linkStudent() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _linking = true;
      _errorMessage = null;
    });
    try {
      await widget.repository.linkStudentByCode(code: _codeController.text);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ParentHomeFailure catch (error) {
      if (!mounted) return;
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) setState(() => _linking = false);
    }
  }

  String? _validateCode(String? value) {
    final code = (value ?? '').replaceAll(RegExp(r'[^0-9a-fA-F]'), '');
    if (code.isEmpty) return 'أدخل رمز الربط من حساب الطالب';
    if (code.length != 16) return 'رمز الربط مكوّن من 16 حرفًا ورقمًا';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'ربط حساب طالب',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_forward_rounded),
        ),
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 42),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: MediaQuery.sizeOf(context).height - 180,
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: QmColors.lavender,
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: const Icon(
                        Icons.person_add_alt_1_rounded,
                        color: QmColors.purple,
                        size: 44,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'أضف ابنك إلى حسابك',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: QmColors.textPrimary,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'اطلب من الطالب فتح حسابه ثم «رمز ربط ولي الأمر»، وأدخل الرمز المؤقت هنا',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: QmColors.textSecondary,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 30),
                    TextFormField(
                      key: const Key('parent-student-code-input'),
                      controller: _codeController,
                      validator: _validateCode,
                      keyboardType: TextInputType.visiblePassword,
                      textInputAction: TextInputAction.done,
                      textDirection: TextDirection.ltr,
                      textCapitalization: TextCapitalization.characters,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[0-9a-fA-F-]'),
                        ),
                        LengthLimitingTextInputFormatter(19),
                      ],
                      autocorrect: false,
                      enableSuggestions: false,
                      onFieldSubmitted: (_) => _linkStudent(),
                      decoration: const InputDecoration(
                        labelText: 'رمز الربط',
                        hintText: 'ABCD-EF12-3456-7890',
                        prefixIcon: Icon(Icons.key_rounded),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFFD2D6)),
                        ),
                        child: Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: QmColors.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 22),
                    QmGradientButton(
                      key: const Key('link-student-button'),
                      label: 'ربط حساب الطالب',
                      isLoading: _linking,
                      icon: Icons.link_rounded,
                      onPressed: _linking ? null : _linkStudent,
                    ),
                    const SizedBox(height: 18),
                    const _PrivacyNote(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ParentHeader extends StatelessWidget {
  const _ParentHeader({required this.parentName, required this.onAddStudent});

  final String parentName;
  final VoidCallback onAddStudent;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 64,
          height: 64,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.86),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: Colors.white),
            boxShadow: [
              BoxShadow(
                color: QmColors.purple.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, 10),
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
                'أهلًا ${_firstName(parentName)} 👋',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 2),
              const Text(
                'تابع تقدّم أبنائك بثقة',
                style: TextStyle(color: QmColors.textSecondary),
              ),
            ],
          ),
        ),
        IconButton.filledTonal(
          key: const Key('add-another-student-button'),
          tooltip: 'ربط طالب آخر',
          onPressed: onAddStudent,
          icon: const Icon(Icons.person_add_alt_1_rounded),
          style: IconButton.styleFrom(
            foregroundColor: QmColors.purple,
            backgroundColor: QmColors.lavender,
          ),
        ),
      ],
    );
  }
}

class _StudentSwitcher extends StatelessWidget {
  const _StudentSwitcher({
    required this.students,
    required this.activeId,
    required this.onSelected,
    required this.onAddStudent,
  });

  final List<ParentStudentSummary> students;
  final String activeId;
  final ValueChanged<String> onSelected;
  final VoidCallback onAddStudent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 62,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: students.length + 1,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          if (index == students.length) {
            return ActionChip(
              onPressed: onAddStudent,
              avatar: const Icon(Icons.add_rounded, size: 19),
              label: const Text('طالب آخر'),
              side: const BorderSide(color: QmColors.border),
              backgroundColor: Colors.white.withValues(alpha: 0.75),
            );
          }
          final student = students[index];
          final selected = student.id == activeId;
          return ChoiceChip(
            key: ValueKey('parent-student-${student.id}'),
            selected: selected,
            onSelected: (_) => onSelected(student.id),
            showCheckmark: false,
            avatar: CircleAvatar(
              backgroundColor: selected
                  ? Colors.white.withValues(alpha: 0.22)
                  : QmColors.lavender,
              foregroundColor: selected ? Colors.white : QmColors.purple,
              child: Text(
                student.fullName.isEmpty ? 'ط' : student.fullName[0],
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
            label: Text(_firstName(student.fullName)),
            labelStyle: TextStyle(
              color: selected ? Colors.white : QmColors.textPrimary,
              fontWeight: FontWeight.w800,
            ),
            selectedColor: QmColors.purple,
            backgroundColor: Colors.white.withValues(alpha: 0.75),
            side: BorderSide(
              color: selected ? QmColors.purple : QmColors.border,
            ),
            padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 14, 8),
          );
        },
      ),
    );
  }
}

class _ParentOverview extends StatelessWidget {
  const _ParentOverview({required this.student, required this.onReminder});

  final ParentStudentSummary student;
  final VoidCallback onReminder;

  @override
  Widget build(BuildContext context) {
    final primaryCourse = student.primaryCourse;
    final lastQuiz = student.lastQuiz;
    return Column(
      children: [
        _ProgressHero(student: student, onReminder: onReminder),
        const SizedBox(height: 18),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                icon: Icons.menu_book_rounded,
                value: '${student.courses.length}',
                label: 'كورس',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                icon: Icons.track_changes_rounded,
                value: student.averageQuizScore == null
                    ? '—'
                    : '${student.averageQuizScore}%',
                label: 'متوسط النتائج',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                icon: Icons.local_fire_department_rounded,
                value: '${student.activeDaysThisWeek}/7',
                label: 'أيام نشطة',
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        const _SectionTitle(
          title: 'ملخص اليوم',
          subtitle: 'آخر ما وصل إليه الطالب',
        ),
        const SizedBox(height: 12),
        _GlassCard(
          child: primaryCourse == null
              ? const _EmptyInlineMessage(
                  icon: Icons.auto_stories_outlined,
                  title: 'لا توجد كورسات مرتبطة بالطالب بعد',
                )
              : _CurrentCourseSummary(course: primaryCourse),
        ),
        const SizedBox(height: 14),
        _GlassCard(
          child: lastQuiz == null
              ? const _EmptyInlineMessage(
                  icon: Icons.fact_check_outlined,
                  title: 'لم يؤدِّ الطالب أي اختبار بعد',
                )
              : _LastQuizSummary(result: lastQuiz),
        ),
      ],
    );
  }
}

class _ParentProgressView extends StatelessWidget {
  const _ParentProgressView({required this.student});

  final ParentStudentSummary student;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionTitle(
          title: 'تقدّم الطالب',
          subtitle: 'تفاصيل الإنجاز داخل كل كورس',
        ),
        const SizedBox(height: 16),
        if (student.courses.isEmpty)
          const _GlassCard(
            child: _EmptyInlineMessage(
              icon: Icons.auto_stories_outlined,
              title: 'لا توجد كورسات لعرض التقدّم',
            ),
          )
        else
          ...student.courses.map(
            (course) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _CourseProgressCard(course: course),
            ),
          ),
      ],
    );
  }
}

class _ParentTestsView extends StatelessWidget {
  const _ParentTestsView({required this.student});

  final ParentStudentSummary student;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _SectionTitle(
          title: 'نتائج الاختبارات',
          subtitle: 'أحدث النتائج موضّحة بترتيبها',
        ),
        const SizedBox(height: 16),
        if (student.quizResults.isEmpty)
          const _GlassCard(
            child: _EmptyInlineMessage(
              icon: Icons.fact_check_outlined,
              title: 'لا توجد نتائج اختبارات بعد',
            ),
          )
        else
          ...student.quizResults.map(
            (result) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _QuizResultCard(result: result),
            ),
          ),
      ],
    );
  }
}

class _ProgressHero extends StatelessWidget {
  const _ProgressHero({required this.student, required this.onReminder});

  final ParentStudentSummary student;
  final VoidCallback onReminder;

  @override
  Widget build(BuildContext context) {
    final progress = student.overallProgress;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [QmColors.deepPurple, QmColors.purple, QmColors.pink],
        ),
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: QmColors.purple.withValues(alpha: 0.26),
            blurRadius: 34,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              SizedBox.square(
                dimension: 112,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.square(
                      dimension: 112,
                      child: CircularProgressIndicator(
                        value: progress / 100,
                        strokeWidth: 10,
                        color: QmColors.gold,
                        backgroundColor: Colors.white.withValues(alpha: 0.18),
                        strokeCap: StrokeCap.round,
                      ),
                    ),
                    Text(
                      '$progress%',
                      style: Theme.of(context).textTheme.headlineMedium
                          ?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'رحلة ${_firstName(student.fullName)}',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      progress == 0
                          ? 'البداية جاهزة… كل خطوة تصنع فرقًا'
                          : 'تقدّم مستمر نحو هدف الـ 95+',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.78),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: onReminder,
            icon: const Icon(Icons.notifications_active_outlined),
            label: const Text('إرسال تذكير مشجّع'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              side: BorderSide(color: Colors.white.withValues(alpha: 0.38)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(17),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return _GlassCard(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
      child: Column(
        children: [
          Icon(icon, color: QmColors.purple, size: 25),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w900,
              color: QmColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(color: QmColors.textSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _CurrentCourseSummary extends StatelessWidget {
  const _CurrentCourseSummary({required this.course});

  final ParentCourseProgress course;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _SquareIcon(icon: Icons.auto_stories_rounded, color: QmColors.purple),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'الكورس الحالي',
                style: TextStyle(color: QmColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                course.title,
                style: const TextStyle(
                  color: QmColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
              if (course.currentLessonTitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  'التالي: ${course.currentLessonTitle}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: QmColors.textSecondary),
                ),
              ],
            ],
          ),
        ),
        Text(
          '${course.progressPercent}%',
          style: const TextStyle(
            color: QmColors.purple,
            fontWeight: FontWeight.w900,
            fontSize: 20,
          ),
        ),
      ],
    );
  }
}

class _LastQuizSummary extends StatelessWidget {
  const _LastQuizSummary({required this.result});

  final ParentQuizSummary result;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _SquareIcon(
          icon: result.passed
              ? Icons.workspace_premium_rounded
              : Icons.fact_check_outlined,
          color: result.passed ? QmColors.success : QmColors.coral,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'آخر اختبار',
                style: TextStyle(color: QmColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 2),
              Text(
                result.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: QmColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
        Text(
          '${result.percent}%',
          style: TextStyle(
            color: result.passed ? QmColors.success : QmColors.coral,
            fontWeight: FontWeight.w900,
            fontSize: 20,
          ),
        ),
      ],
    );
  }
}

class _CourseProgressCard extends StatelessWidget {
  const _CourseProgressCard({required this.course});

  final ParentCourseProgress course;

  @override
  Widget build(BuildContext context) {
    return _GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  course.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
              ),
              Text(
                '${course.progressPercent}%',
                style: const TextStyle(
                  color: QmColors.purple,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: course.progressPercent / 100,
              minHeight: 10,
              color: QmColors.purple,
              backgroundColor: QmColors.lavender,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${course.completedLessons} من ${course.totalLessons} درس مكتمل',
            style: const TextStyle(color: QmColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _QuizResultCard extends StatelessWidget {
  const _QuizResultCard({required this.result});

  final ParentQuizSummary result;

  @override
  Widget build(BuildContext context) {
    return _GlassCard(
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: result.passed
                  ? const Color(0xFFE8F8F1)
                  : const Color(0xFFFFF1EA),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Text(
              '${result.percent}%',
              style: TextStyle(
                color: result.passed ? QmColors.success : QmColors.coral,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  result.passed ? 'اجتاز الاختبار' : 'يحتاج إلى مراجعة',
                  style: const TextStyle(color: QmColors.textSecondary),
                ),
              ],
            ),
          ),
          Icon(
            result.passed ? Icons.check_circle_rounded : Icons.info_rounded,
            color: result.passed ? QmColors.success : QmColors.coral,
          ),
        ],
      ),
    );
  }
}

class _ParentEmptyView extends StatelessWidget {
  const _ParentEmptyView({
    required this.onLinkStudent,
    required this.onAccountTap,
  });

  final VoidCallback onLinkStudent;
  final VoidCallback onAccountTap;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: Stack(
            children: [
              PositionedDirectional(
                top: 12,
                end: 16,
                child: IconButton.filledTonal(
                  tooltip: 'حسابي',
                  onPressed: onAccountTap,
                  icon: const Icon(Icons.person_outline_rounded),
                  style: IconButton.styleFrom(
                    foregroundColor: QmColors.purple,
                    backgroundColor: QmColors.lavender,
                  ),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(28),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 430),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: QmColors.lavender,
                            borderRadius: BorderRadius.circular(36),
                          ),
                          child: const Icon(
                            Icons.group_outlined,
                            color: QmColors.purple,
                            size: 56,
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          'لم تربط أي طالب بعد',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineLarge
                              ?.copyWith(
                                color: QmColors.textPrimary,
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'اربط حساب ابنك أو ابنتك لمتابعة تقدّمه الدراسي',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(
                                color: QmColors.textSecondary,
                                height: 1.6,
                              ),
                        ),
                        const SizedBox(height: 34),
                        SizedBox(
                          width: 350,
                          child: QmGradientButton(
                            key: const Key('open-link-student-button'),
                            label: 'ربط حساب طالب',
                            icon: Icons.link_rounded,
                            onPressed: onLinkStudent,
                          ),
                        ),
                      ],
                    ),
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

class _ParentLoadingView extends StatelessWidget {
  const _ParentLoadingView();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: QmGradients.softBackground),
        child: Center(child: CircularProgressIndicator(color: QmColors.pink)),
      ),
    );
  }
}

class _ParentErrorView extends StatelessWidget {
  const _ParentErrorView({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.cloud_off_rounded,
                  size: 58,
                  color: QmColors.textMuted,
                ),
                const SizedBox(height: 18),
                const Text(
                  'تعذّر تحميل بيانات الأبناء',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: 260,
                  child: QmGradientButton(
                    label: 'إعادة المحاولة',
                    onPressed: onRetry,
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

class _ParentNavigationBar extends StatelessWidget {
  const _ParentNavigationBar({
    required this.selectedIndex,
    required this.onTap,
  });

  final int selectedIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    (Icons.home_rounded, 'الرئيسية'),
    (Icons.insights_rounded, 'التقدّم'),
    (Icons.fact_check_rounded, 'الاختبارات'),
    (Icons.person_rounded, 'حسابي'),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(18, 0, 18, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            height: 78,
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.84),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white),
              boxShadow: [
                BoxShadow(
                  color: QmColors.deepPurple.withValues(alpha: 0.14),
                  blurRadius: 28,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Row(
              children: List.generate(_items.length, (index) {
                final selected = index == selectedIndex;
                return Expanded(
                  child: InkWell(
                    key: ValueKey('parent-nav-$index'),
                    borderRadius: BorderRadius.circular(23),
                    onTap: () => onTap(index),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      decoration: BoxDecoration(
                        color: selected
                            ? QmColors.lavender
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(23),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _items[index].$1,
                            color: selected
                                ? QmColors.purple
                                : QmColors.textSecondary,
                            size: 24,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _items[index].$2,
                            style: TextStyle(
                              color: selected
                                  ? QmColors.purple
                                  : QmColors.textSecondary,
                              fontWeight: selected
                                  ? FontWeight.w900
                                  : FontWeight.w600,
                              fontSize: 11,
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

class _GlassCard extends StatelessWidget {
  const _GlassCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          width: double.infinity,
          padding: padding,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.78),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white),
            boxShadow: [
              BoxShadow(
                color: QmColors.deepPurple.withValues(alpha: 0.08),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(color: QmColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SquareIcon extends StatelessWidget {
  const _SquareIcon({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(17),
      ),
      child: Icon(icon, color: color),
    );
  }
}

class _EmptyInlineMessage extends StatelessWidget {
  const _EmptyInlineMessage({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Column(
        children: [
          Icon(icon, color: QmColors.textMuted, size: 36),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: QmColors.textSecondary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _PrivacyNote extends StatelessWidget {
  const _PrivacyNote();

  @override
  Widget build(BuildContext context) {
    return const Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.shield_outlined, color: QmColors.textMuted, size: 18),
        SizedBox(width: 8),
        Expanded(
          child: Text(
            'الرمز صالح لمدة 24 ساعة ويُستخدم مرة واحدة، ولا نعرض أي بيانات قبل إتمام الربط الآمن.',
            style: TextStyle(
              color: QmColors.textSecondary,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }
}

String _firstName(String fullName) {
  final parts = fullName.trim().split(RegExp(r'\s+'));
  return parts.isEmpty || parts.first.isEmpty ? 'بك' : parts.first;
}
