import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/presentation/lesson_files_section.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/lesson_homework_section.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_attempt_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

class LessonPlayerScreen extends StatefulWidget {
  const LessonPlayerScreen({
    required this.content,
    required this.initialLessonId,
    required this.studentId,
    required this.watermark,
    required this.repository,
    required this.quizRepository,
    this.onSubscribe,
    super.key,
  });

  final CourseLearningContent content;
  final String initialLessonId;
  final String studentId;

  /// نص العلامة المائية فوق الفيديو (بريد الطالب عادةً) لتتبّع أي تسريب.
  final String watermark;
  final StudentLearningRepository repository;
  final StudentQuizRepository quizRepository;

  /// يُستدعى لما الطالب يضغط على درس مقفول في قائمة الدروس.
  final Future<void> Function()? onSubscribe;

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen>
    with WidgetsBindingObserver {
  late List<CourseLesson> _lessons;
  late int _selectedIndex;
  int _latestPercentage = 0;
  int _lastSavedMilestone = 0;
  double _latestSeconds = 0;
  double _durationSeconds = 0;
  Future<void> _saveChain = Future.value();
  bool _closing = false;
  bool _allowPop = false;
  late Future<List<StudentQuiz>> _quizzesFuture;
  late Future<List<LessonFile>> _filesFuture;

  /// أجزاء فيديو الدرس الحالي. فاضية ⇒ الدرس فيديو واحد (الوضع القديم).
  List<LessonVideoPart> _parts = const <LessonVideoPart>[];
  int _activePart = 0;

  /// قناة الجانب الأصلي: iOS بيبلّغنا بعد ما الطالب ياخد لقطة شاشة (أبل مابتتيحش
  /// منعها). أندرويد مابيوصلش هنا أصلًا لأن FLAG_SECURE بيمنع اللقطة من الأساس.
  static const _screenCaptureChannel = MethodChannel('qudrat/screen_capture');

  CourseLesson get _lesson => _lessons[_selectedIndex];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _lessons = [...widget.content.allLessons];
    _selectedIndex = math.max(
      0,
      _lessons.indexWhere((lesson) => lesson.id == widget.initialLessonId),
    );
    if (!_canOpenLesson(_lessons[_selectedIndex])) {
      final firstAccessibleIndex = _lessons.indexWhere(_canOpenLesson);
      _selectedIndex = firstAccessibleIndex >= 0 ? firstAccessibleIndex : 0;
    }
    _resetTracking();
    _quizzesFuture = widget.quizRepository.loadAvailableQuizzes();
    _filesFuture = widget.repository.loadLessonFiles(lessonId: _lesson.id);
    _screenCaptureChannel.setMethodCallHandler(_handleScreenCaptureCall);
    unawaited(_loadParts(_lesson.id));
  }

  /// تحميل أجزاء الدرس والبدء من أول جزء لسه ما اتشافش.
  Future<void> _loadParts(String lessonId) async {
    final parts = await widget.repository.loadLessonParts(
      lessonId: lessonId,
      studentId: widget.studentId,
    );
    if (!mounted || _lesson.id != lessonId) return;
    final firstUnseen = parts.indexWhere((part) => !part.completed);
    setState(() {
      _parts = parts;
      _activePart = firstUnseen == -1 ? 0 : firstUnseen;
    });
  }

  LessonVideoPart? get _currentPart =>
      _parts.isEmpty || _activePart >= _parts.length ? null : _parts[_activePart];

  void _selectPart(int index) {
    if (index < 0 || index >= _parts.length || index == _activePart) return;
    setState(() {
      _activePart = index;
      _latestSeconds = 0;
      _durationSeconds = 0;
    });
  }

  /// إنهاء جزء: يتسجّل، وبعدين الجزء اللي بعده يبدأ تلقائيًا.
  /// آخر جزء ⇒ الدرس كله يتعلّم مكتمل.
  Future<void> _completePart() async {
    final part = _currentPart;
    if (part == null) return;
    final index = _activePart;
    if (!part.completed) {
      await widget.repository.completeLessonPart(
        studentId: widget.studentId,
        lessonVideoId: part.id,
      );
      if (!mounted) return;
      setState(() {
        _parts = [
          for (var i = 0; i < _parts.length; i++)
            i == index ? _parts[i].copyWith(completed: true) : _parts[i],
        ];
      });
    }
    if (!mounted) return;
    if (index < _parts.length - 1) {
      setState(() {
        _activePart = index + 1;
        _latestSeconds = 0;
        _durationSeconds = 0;
      });
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(
              'بدأ ${_parts[index + 1].labelFor(index + 1)} تلقائيًا',
              textAlign: TextAlign.center,
            ),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
    } else {
      await _onCompleted();
    }
  }

  Future<void> _handleScreenCaptureCall(MethodCall call) async {
    if (call.method != 'screenshotTaken') return;
    final lessonId = _lesson.id;
    unawaited(
      widget.repository.logScreenshot(
        studentId: widget.studentId,
        lessonId: lessonId,
        platform: 'ios',
      ),
    );
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'تم تسجيل لقطة الشاشة باسم حسابك. المحتوى محمي بحقوق الملكية.',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 4),
        ),
      );
  }

  void _reloadFiles() {
    setState(() {
      _filesFuture = widget.repository.loadLessonFiles(lessonId: _lesson.id);
    });
  }

  Future<void> _openLessonFile(LessonFile file) async {
    final uri = Uri.tryParse(file.fileUrl);
    var opened = false;
    if (uri != null) {
      try {
        opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        opened = false;
      }
    }
    if (opened || !mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'تعذّر فتح الملف. حاول مرة أخرى',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  void _reloadQuizzes() {
    setState(() {
      _quizzesFuture = widget.quizRepository.loadAvailableQuizzes();
    });
  }

  Future<void> _openHomework(StudentQuiz quiz) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => QuizAttemptScreen(
          quiz: quiz,
          repository: widget.quizRepository,
          watermark: widget.watermark,
        ),
      ),
    );
    if (mounted) _reloadQuizzes();
  }

  void _resetTracking() {
    _latestPercentage = _lesson.progress.watchPercentage;
    _lastSavedMilestone = (_latestPercentage ~/ 5) * 5;
    _latestSeconds = _lesson.progress.positionSeconds.toDouble();
    _durationSeconds = _lesson.progress.durationSeconds.toDouble();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      unawaited(_saveCurrentPosition());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _screenCaptureChannel.setMethodCallHandler(null);
    super.dispose();
  }

  Future<void> _selectLesson(CourseLesson lesson) async {
    if (!_canOpenLesson(lesson)) {
      // نفس سلوك صفحة الكورس: القفل بيعرض الاشتراك مش مجرد رسالة رفض.
      final onSubscribe = widget.onSubscribe;
      if (onSubscribe != null) {
        await onSubscribe();
        return;
      }
      _showLockedLessonMessage();
      return;
    }
    final index = _lessons.indexWhere((item) => item.id == lesson.id);
    if (index < 0 || index == _selectedIndex) return;
    await _saveCurrentPosition();
    if (!mounted) return;
    setState(() {
      _selectedIndex = index;
      _resetTracking();
      _parts = const <LessonVideoPart>[];
      _activePart = 0;
      _filesFuture = widget.repository.loadLessonFiles(
        lessonId: _lessons[index].id,
      );
    });
    unawaited(_loadParts(_lessons[index].id));
  }

  bool _canOpenLesson(CourseLesson lesson) =>
      widget.content.canAccessLesson(lesson);

  void _showLockedLessonMessage() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'هذا الدرس متاح للمشتركين في الكورس فقط',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  /// نسبة تُعتبر عندها المشاهدة مكتملة. الفيديو كثيرًا ما يتوقف قبل الثانية
  /// الأخيرة فلا يصل حدث الانتهاء، فيظل الدرس "غير مكتمل" رغم مشاهدته كاملًا.
  static const int _completionThreshold = 95;

  void _onPlaybackProgress(double seconds, double duration) {
    if (duration <= 0) return;
    _durationSeconds = math.max(_durationSeconds, duration);
    _latestSeconds = seconds.clamp(0, duration);
    var percentage = ((seconds / duration) * 100).floor().clamp(0, 99);
    if (_parts.isNotEmpty) {
      // مع الأجزاء، تقدّم الدرس = الأجزاء المكتملة + نسبة الجزء الحالي.
      final done = _parts.where((part) => part.completed).length;
      percentage = (((done + (percentage / 100)) / _parts.length) * 100)
          .floor()
          .clamp(0, 99);
    }
    _latestPercentage = math.max(_latestPercentage, percentage);
    final milestone = (_latestPercentage ~/ 5) * 5;
    if (milestone >= _lastSavedMilestone + 5) {
      _lastSavedMilestone = milestone;
      _saveProgress(
        milestone,
        completed: milestone >= _completionThreshold,
        positionSeconds: _latestSeconds.round(),
        durationSeconds: _durationSeconds.round(),
      );
    }
  }

  Future<void> _saveCurrentPosition() {
    return _saveProgress(
      _latestPercentage,
      completed: _latestPercentage >= _completionThreshold,
      positionSeconds: _latestSeconds.round(),
      durationSeconds: _durationSeconds.round(),
    );
  }

  Future<void> _saveProgress(
    int percentage, {
    required bool completed,
    required int positionSeconds,
    required int durationSeconds,
  }) {
    final lessonAtSave = _lesson;
    _saveChain = _saveChain.then((_) async {
      try {
        // لازم نقرأ آخر تقدّم محفوظ وقت التنفيذ مش وقت الاستدعاء: لو اتبعت
        // عملية حفظ "مكتمل" وبعدها على طول حفظ للموضع (مثلًا لما التطبيق يروح
        // للخلفية بعد نهاية الفيديو)، كانت التانية بتستخدم نسخة قديمة فيها
        // completed=false فتمسح علامة الإكمال، ويفضل الدرس 100% من غير علامة.
        final savedIndex = _lessons.indexWhere(
          (item) => item.id == lessonAtSave.id,
        );
        final current = savedIndex >= 0
            ? _lessons[savedIndex].progress
            : lessonAtSave.progress;
        final progress = await widget.repository.saveProgress(
          studentId: widget.studentId,
          lessonId: lessonAtSave.id,
          current: current,
          watchPercentage: percentage,
          completed: completed,
          positionSeconds: positionSeconds,
          durationSeconds: durationSeconds,
        );
        if (!mounted) return;
        final index = _lessons.indexWhere((item) => item.id == lessonAtSave.id);
        if (index >= 0) {
          setState(() {
            _lessons[index] = _lessons[index].copyWith(progress: progress);
          });
        }
      } catch (_) {
        // لا نقطع المشاهدة عند ضعف الاتصال؛ المحاولة التالية تحفظ الموضع.
      }
    });
    return _saveChain;
  }

  Future<void> _onCompleted() async {
    _latestPercentage = 100;
    _latestSeconds = _durationSeconds;
    await _saveProgress(
      100,
      completed: true,
      positionSeconds: _latestSeconds.round(),
      durationSeconds: _durationSeconds.round(),
    );
    if (!mounted) return;
    final nextIndex = _nextPlayableIndex;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text(
            'أحسنت ! تم إكمال الدرس بنجاح 🎉',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.success,
          action: nextIndex == null
              ? null
              : SnackBarAction(
                  label: 'الدرس التالي',
                  textColor: Colors.white,
                  onPressed: () => _selectLesson(_lessons[nextIndex]),
                ),
        ),
      );
  }

  int? get _previousPlayableIndex {
    for (var index = _selectedIndex - 1; index >= 0; index--) {
      if (_lessons[index].hasVideo && _canOpenLesson(_lessons[index])) {
        return index;
      }
    }
    return null;
  }

  int? get _nextPlayableIndex {
    for (var index = _selectedIndex + 1; index < _lessons.length; index++) {
      if (_lessons[index].hasVideo && _canOpenLesson(_lessons[index])) {
        return index;
      }
    }
    return null;
  }

  Future<void> _close() async {
    if (_closing) return;
    _closing = true;
    // مهلة قصيرة: على شبكة بطيئة كان زر الرجوع يتجمّد إلى أن ينتهي الحفظ.
    // الحفظ يكمل في الخلفية، والمحاولة التالية تلتقط الموضع على أي حال.
    await _saveCurrentPosition().timeout(
      const Duration(seconds: 3),
      onTimeout: () {},
    );
    if (!mounted) return;
    setState(() => _allowPop = true);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_close());
      },
      child: Scaffold(
        backgroundColor: QmColors.background,
        appBar: AppBar(
          title: Text(
            widget.content.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          centerTitle: false,
          backgroundColor: QmColors.background,
          leading: IconButton(
            onPressed: _close,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
        ),
        body: SafeArea(
          top: false,
          child: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 34),
            children: [
              _ProtectedVideoPlayer(
                key: ValueKey('${_lesson.id}:${_currentPart?.id ?? ''}'),
                lesson: _lesson,
                partVideoId: _currentPart?.videoId,
                repository: widget.repository,
                watermark: widget.watermark,
                onProgress: _onPlaybackProgress,
                onPaused: _saveCurrentPosition,
                onCompleted: _parts.isEmpty ? _onCompleted : _completePart,
              ),
              if (_parts.isNotEmpty) ...[
                const SizedBox(height: 16),
                _LessonPartsBar(
                  parts: _parts,
                  activeIndex: _activePart,
                  onSelect: _selectPart,
                  onFinishPart: _completePart,
                ),
              ],
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      gradient: QmGradients.brand,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _lesson.progress.completed
                          ? Icons.check_rounded
                          : Icons.play_arrow_rounded,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _lesson.title,
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(
                                height: 1.3,
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          _lesson.durationMinutes == null
                              ? 'درس فيديو'
                              : '${_lesson.durationMinutes} دقيقة',
                          style: TextStyle(color: QmColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  if (_lesson.progress.watchPercentage > 0)
                    Text(
                      '${_lesson.progress.watchPercentage}%',
                      style: const TextStyle(
                        color: QmColors.pink,
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  minHeight: 8,
                  value: _lesson.progress.watchPercentage / 100,
                  color: _lesson.progress.completed
                      ? QmColors.success
                      : QmColors.pink,
                  backgroundColor: QmColors.lavender,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _previousPlayableIndex == null
                          ? null
                          : () => _selectLesson(
                              _lessons[_previousPlayableIndex!],
                            ),
                      icon: const Icon(Icons.arrow_back_rounded),
                      label: const Text('الدرس السابق'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _nextPlayableIndex == null
                          ? null
                          : () => _selectLesson(_lessons[_nextPlayableIndex!]),
                      icon: const Icon(Icons.arrow_forward_rounded),
                      label: Text(
                        _nextPlayableIndex == null ? 'آخر درس' : 'الدرس التالي',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              FutureBuilder<List<LessonFile>>(
                future: _filesFuture,
                builder: (context, snapshot) {
                  return LessonFilesSection(
                    files: snapshot.data ?? const <LessonFile>[],
                    loading:
                        snapshot.connectionState != ConnectionState.done,
                    errorMessage: snapshot.hasError
                        ? snapshot.error is LearningFailure
                              ? snapshot.error.toString()
                              : 'تعذّر تحميل ملفات الدرس'
                        : null,
                    onRetry: _reloadFiles,
                    onOpen: _openLessonFile,
                  );
                },
              ),
              FutureBuilder<List<StudentQuiz>>(
                future: _quizzesFuture,
                builder: (context, snapshot) {
                  final homework =
                      snapshot.data
                          ?.where((quiz) => quiz.lessonId == _lesson.id)
                          .toList() ??
                      const <StudentQuiz>[];
                  return LessonHomeworkSection(
                    quizzes: homework,
                    loading: snapshot.connectionState != ConnectionState.done,
                    errorMessage: snapshot.hasError
                        ? snapshot.error is QuizFailure
                              ? snapshot.error.toString()
                              : 'تعذّر تحميل واجبات الدرس'
                        : null,
                    onRetry: _reloadQuizzes,
                    onOpen: _openHomework,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// قائمة أجزاء الدرس: الجزء المكتمل بعلامة ✓، والحالي متظلّل،
/// وزر لإنهاء الجزء يدويًا لو الطالب خلّص قبل نهاية الفيديو.
class _LessonPartsBar extends StatelessWidget {
  const _LessonPartsBar({
    required this.parts,
    required this.activeIndex,
    required this.onSelect,
    required this.onFinishPart,
  });

  final List<LessonVideoPart> parts;
  final int activeIndex;
  final void Function(int index) onSelect;
  final Future<void> Function() onFinishPart;

  @override
  Widget build(BuildContext context) {
    final isLast = activeIndex >= parts.length - 1;
    final currentDone = activeIndex < parts.length && parts[activeIndex].completed;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: QmColors.lavender),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.playlist_play_rounded, size: 20),
              const SizedBox(width: 6),
              Text(
                'أجزاء الدرس',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const Spacer(),
              Text(
                '${parts.where((part) => part.completed).length} من ${parts.length}',
                style: TextStyle(
                  color: QmColors.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < parts.length; index++)
            _PartRow(
              part: parts[index],
              index: index,
              active: index == activeIndex,
              onTap: () => onSelect(index),
            ),
          if (!currentDone) ...[
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => onFinishPart(),
                icon: const Icon(Icons.check_rounded, size: 18),
                label: Text(
                  isLast ? 'أنهيت آخر جزء' : 'أنهيت هذا الجزء — التالي',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PartRow extends StatelessWidget {
  const _PartRow({
    required this.part,
    required this.index,
    required this.active,
    required this.onTap,
  });

  final LessonVideoPart part;
  final int index;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: active ? QmColors.lavender.withValues(alpha: 0.55) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
            child: Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: part.completed
                        ? QmColors.success
                        : active
                        ? QmColors.pink
                        : QmColors.lavender,
                  ),
                  child: part.completed
                      ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
                      : Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: active ? Colors.white : QmColors.textSecondary,
                          ),
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    part.labelFor(index),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: active ? FontWeight.w900 : FontWeight.w600,
                    ),
                  ),
                ),
                if (part.durationMinutes != null)
                  Text(
                    '${part.durationMinutes} د',
                    style: TextStyle(
                      color: QmColors.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
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

class _ProtectedVideoPlayer extends StatefulWidget {
  const _ProtectedVideoPlayer({
    required this.lesson,
    required this.repository,
    required this.watermark,
    required this.onProgress,
    required this.onPaused,
    required this.onCompleted,
    this.partVideoId,
    super.key,
  });

  final CourseLesson lesson;

  /// فيديو الجزء الحالي لو الدرس متقسّم. null ⇒ فيديو الدرس الواحد.
  final String? partVideoId;
  final StudentLearningRepository repository;
  final String watermark;
  final void Function(double seconds, double duration) onProgress;
  final VoidCallback onPaused;
  final Future<void> Function() onCompleted;

  @override
  State<_ProtectedVideoPlayer> createState() => _ProtectedVideoPlayerState();
}

class _ProtectedVideoPlayerState extends State<_ProtectedVideoPlayer> {
  WebViewController? _controller;
  String? _error;
  bool _audioReady = false;
  bool _muted = false;
  bool _changingAudio = false;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  /// إيقاف المشغّل وفصل قناة Playback قبل تدمير الشاشة.
  /// بدون هذا كان iframe بَني يستمر في إرسال timeupdate بعد إغلاق الشاشة،
  /// فيستدعي WebKit معالج الرسائل على كائن مدمَّر ويسقط التطبيق بـSIGABRT
  /// (unowned reference ... already destroyed) — رُصد على iPad في 1.1.3.
  @override
  void dispose() {
    final controller = _controller;
    _controller = null;
    if (controller != null) {
      controller.removeJavaScriptChannel('Playback');
      controller.loadRequest(Uri.parse('about:blank'));
    }
    super.dispose();
  }

  Future<void> _prepare() async {
    final videoId = widget.partVideoId ?? widget.lesson.videoId;
    if (videoId == null || videoId.isEmpty) {
      setState(() => _error = 'لا يوجد فيديو لهذا الدرس حاليًا');
      return;
    }
    try {
      final credentials = await widget.repository.requestVideo(
        courseId: widget.lesson.courseId,
        videoId: videoId,
      );
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..addJavaScriptChannel(
          'Playback',
          onMessageReceived: _handlePlaybackMessage,
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (request) {
              if (!request.isMainFrame) {
                return NavigationDecision.navigate;
              }
              final uri = Uri.tryParse(request.url);
              if (uri == null ||
                  uri.scheme == 'about' ||
                  uri.host == 'www.qudratmaghrabi.com') {
                return NavigationDecision.navigate;
              }
              return NavigationDecision.prevent;
            },
            onWebResourceError: (error) {
              if (error.isForMainFrame == false) return;
              if (mounted) {
                setState(() => _error = 'تعذّر تحميل مشغّل الفيديو');
              }
            },
          ),
        );
      await controller.loadHtmlString(
        _playerHtml(
          libraryId: credentials.libraryId,
          videoId: videoId,
          token: credentials.token,
          expires: credentials.expires,
          // الاستئناف من آخر موضع للدرس الواحد فقط؛ الجزء بيبدأ من أوله.
          resumeSeconds: widget.partVideoId == null
              ? widget.lesson.progress.positionSeconds
              : 0,
          resumePercentage: widget.partVideoId == null
              ? widget.lesson.progress.watchPercentage
              : 0,
          watermark: widget.watermark,
        ),
        baseUrl: 'https://www.qudratmaghrabi.com',
      );
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (error) {
      if (!mounted) return;
      setState(
        () => _error = error is LearningFailure
            ? error.toString()
            : 'تعذّر تشغيل الفيديو. حاول مرة أخرى',
      );
    }
  }

  void _handlePlaybackMessage(JavaScriptMessage message) {
    // رسالة وصلت بعد تدمير الشاشة تُتجاهل بدل أن تلمس حالة غير موجودة.
    if (!mounted) return;
    try {
      final data = jsonDecode(message.message) as Map<String, dynamic>;
      switch (data['type']) {
        case 'ready':
          if (mounted) {
            setState(() {
              _audioReady = true;
              _muted = data['muted'] as bool? ?? false;
              _changingAudio = false;
            });
          }
        case 'muted':
          if (mounted) {
            setState(() {
              _muted = data['value'] as bool? ?? false;
              _changingAudio = false;
            });
          }
        case 'timeupdate':
          widget.onProgress(
            (data['seconds'] as num?)?.toDouble() ?? 0,
            (data['duration'] as num?)?.toDouble() ?? 0,
          );
        case 'pause':
          widget.onPaused();
        case 'ended':
          widget.onCompleted();
        case 'error':
          if (mounted) {
            setState(() => _error = 'حدث خطأ أثناء تشغيل الفيديو');
          }
      }
    } catch (_) {
      // نتجاهل الرسائل غير المعروفة من مشغل الطرف الثالث.
    }
  }

  Future<void> _toggleMute() async {
    final controller = _controller;
    if (controller == null || !_audioReady || _changingAudio) return;
    final shouldMute = !_muted;
    setState(() {
      _changingAudio = true;
      _muted = shouldMute;
    });
    try {
      await controller.runJavaScript(
        'if (window.setPlayerMuted) '
        'window.setPlayerMuted(${shouldMute ? 'true' : 'false'});',
      );
      await Future<void>.delayed(const Duration(milliseconds: 500));
      if (mounted && _changingAudio) {
        setState(() => _changingAudio = false);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _muted = !shouldMute;
          _changingAudio = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: ColoredBox(color: Colors.black, child: _buildBody()),
      ),
    );
  }

  Widget _buildBody() {
    final error = _error;
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline_rounded,
                color: Colors.white,
                size: 38,
              ),
              const SizedBox(height: 10),
              Text(
                error,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _error = null;
                    _controller = null;
                  });
                  _prepare();
                },
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('إعادة المحاولة'),
                style: TextButton.styleFrom(foregroundColor: QmColors.pink),
              ),
            ],
          ),
        ),
      );
    }
    final controller = _controller;
    if (controller == null) {
      return const Center(
        child: CircularProgressIndicator(color: QmColors.pink),
      );
    }
    return Stack(
      children: [
        Positioned.fill(child: WebViewWidget(controller: controller)),
        PositionedDirectional(
          top: 10,
          start: 10,
          child: Semantics(
            button: true,
            label: _muted ? 'تشغيل الصوت' : 'كتم الصوت',
            child: Material(
              color: Colors.black.withValues(alpha: 0.68),
              shape: const CircleBorder(),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: _audioReady && !_changingAudio ? _toggleMute : null,
                child: SizedBox(
                  width: 46,
                  height: 46,
                  child: _changingAudio
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Icon(
                          _muted
                              ? Icons.volume_off_rounded
                              : Icons.volume_up_rounded,
                          color: _audioReady ? Colors.white : Colors.white54,
                        ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _playerHtml({
    required String libraryId,
    required String videoId,
    required String token,
    required int expires,
    required int resumeSeconds,
    required int resumePercentage,
    required String watermark,
  }) {
    // تهريب النص قبل حقنه في HTML عشان أي رمز في البريد ما يكسرش الصفحة.
    final safeWatermark = watermark
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    final source =
        'https://iframe.mediadelivery.net/embed/$libraryId/$videoId'
        '?token=${Uri.encodeQueryComponent(token)}&expires=$expires'
        '&autoplay=false&preload=true&responsive=true'
        '&playsinline=true&disableIosPlayer=true'
        '&session=${DateTime.now().millisecondsSinceEpoch}';
    return '''
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    html, body, iframe { width:100%; height:100%; margin:0; border:0; background:#000; overflow:hidden; }
    /* علامة مائية باسم الطالب فوق الفيديو: مابتمنعش التصوير، بس بتخلّي أي
       تسريب معروف مصدره. pointer-events:none عشان ما تعطّلش التحكم في المشغّل. */
    #qm-wm {
      position: fixed; z-index: 2147483647; pointer-events: none; user-select: none;
      color: rgba(255,255,255,.42); font-size: 12px; font-weight: 700;
      font-family: -apple-system, "SF Arabic", "Segoe UI", Tahoma, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,.85); white-space: nowrap;
      transition: top .8s ease, left .8s ease;
      top: 8%; left: 6%;
    }
  </style>
  <script src="https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js"></script>
</head>
<body>
  <iframe id="player" src="$source" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe>
  <div id="qm-wm">$safeWatermark</div>
  <script>
    document.addEventListener('contextmenu', (event) => event.preventDefault());
    // بنحرّك العلامة بين أربع زوايا كل 12 ثانية عشان ما تتقصّش من الصورة.
    (() => {
      const mark = document.getElementById('qm-wm');
      if (!mark || !mark.textContent.trim()) { if (mark) mark.remove(); return; }
      const spots = [
        {top: '8%',  left: '6%'},
        {top: '8%',  left: '58%'},
        {top: '78%', left: '58%'},
        {top: '78%', left: '6%'},
      ];
      let index = 0;
      setInterval(() => {
        index = (index + 1) % spots.length;
        mark.style.top = spots[index].top;
        mark.style.left = spots[index].left;
      }, 12000);
    })();
    const bridge = (payload) => Playback.postMessage(JSON.stringify(payload));
    const player = new playerjs.Player(document.getElementById('player'));
    window.setPlayerMuted = (shouldMute) => {
      if (shouldMute) {
        player.mute();
        player.setVolume(0);
      } else {
        player.unmute();
        player.setVolume(100);
      }
      bridge({type:'muted', value:shouldMute});
    };
    player.on('ready', () => {
      bridge({type:'ready', muted:false});
      player.on('timeupdate', (data) => bridge({type:'timeupdate', seconds:data.seconds, duration:data.duration}));
      player.on('pause', () => bridge({type:'pause'}));
      player.on('ended', () => bridge({type:'ended'}));
      player.on('error', () => bridge({type:'error'}));
      const exactResume = $resumeSeconds;
      const legacyPercentage = $resumePercentage;
      if (exactResume > 0 && legacyPercentage < 100) {
        player.setCurrentTime(exactResume);
      } else if (legacyPercentage > 0 && legacyPercentage < 100) {
        player.getDuration((duration) => {
          if (duration > 0) {
            player.setCurrentTime(duration * legacyPercentage / 100);
          }
        });
      }
    });
  </script>
</body>
</html>
''';
  }
}
