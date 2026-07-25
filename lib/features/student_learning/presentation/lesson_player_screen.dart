import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/data/student_learning_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';
import 'package:webview_flutter/webview_flutter.dart';

class LessonPlayerScreen extends StatefulWidget {
  const LessonPlayerScreen({
    required this.content,
    required this.initialLessonId,
    required this.studentId,
    required this.repository,
    super.key,
  });

  final CourseLearningContent content;
  final String initialLessonId;
  final String studentId;
  final StudentLearningRepository repository;

  @override
  State<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends State<LessonPlayerScreen> {
  late List<CourseLesson> _lessons;
  late int _selectedIndex;
  int _latestPercentage = 0;
  int _lastSavedMilestone = 0;
  bool _saving = false;
  bool _pendingSave = false;

  CourseLesson get _lesson => _lessons[_selectedIndex];

  @override
  void initState() {
    super.initState();
    _lessons = [...widget.content.allLessons];
    _selectedIndex = math.max(
      0,
      _lessons.indexWhere((lesson) => lesson.id == widget.initialLessonId),
    );
    _resetTracking();
  }

  void _resetTracking() {
    _latestPercentage = _lesson.progress.watchPercentage;
    _lastSavedMilestone = (_latestPercentage ~/ 5) * 5;
  }

  void _selectLesson(CourseLesson lesson) {
    final index = _lessons.indexWhere((item) => item.id == lesson.id);
    if (index < 0 || index == _selectedIndex) return;
    setState(() {
      _selectedIndex = index;
      _resetTracking();
    });
  }

  void _onPlaybackProgress(double seconds, double duration) {
    if (duration <= 0) return;
    final percentage = ((seconds / duration) * 100).floor().clamp(0, 99);
    _latestPercentage = math.max(_latestPercentage, percentage);
    final milestone = (_latestPercentage ~/ 5) * 5;
    if (milestone >= _lastSavedMilestone + 5) {
      _lastSavedMilestone = milestone;
      _saveProgress(milestone, completed: false);
    }
  }

  Future<void> _saveProgress(int percentage, {required bool completed}) async {
    if (_saving) {
      _pendingSave = true;
      return;
    }
    _saving = true;
    final lessonAtSave = _lesson;
    try {
      final progress = await widget.repository.saveProgress(
        studentId: widget.studentId,
        lessonId: lessonAtSave.id,
        current: lessonAtSave.progress,
        watchPercentage: percentage,
        completed: completed,
      );
      if (!mounted) return;
      final index = _lessons.indexWhere((item) => item.id == lessonAtSave.id);
      if (index >= 0) {
        setState(() {
          _lessons[index] = _lessons[index].copyWith(progress: progress);
        });
      }
    } catch (_) {
      // لا نقطع المشاهدة عند ضعف الاتصال؛ المحاولة التالية تحفظ أعلى نسبة.
    } finally {
      _saving = false;
      if (_pendingSave && mounted) {
        _pendingSave = false;
        await _saveProgress(_latestPercentage, completed: false);
      }
    }
  }

  Future<void> _onCompleted() async {
    _latestPercentage = 100;
    await _saveProgress(100, completed: true);
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'أحسنت! تم إكمال الدرس بنجاح 🎉',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.success,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_forward_rounded),
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 34),
          children: [
            _ProtectedVideoPlayer(
              key: ValueKey(_lesson.id),
              lesson: _lesson,
              repository: widget.repository,
              onProgress: _onPlaybackProgress,
              onPaused: () =>
                  _saveProgress(_latestPercentage, completed: false),
              onCompleted: _onCompleted,
            ),
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
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          height: 1.3,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        _lesson.durationMinutes == null
                            ? 'درس فيديو'
                            : '${_lesson.durationMinutes} دقيقة',
                        style: const TextStyle(color: QmColors.textSecondary),
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
            const SizedBox(height: 28),
            Text(
              'دروس الكورس',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: QmColors.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (var index = 0; index < _lessons.length; index++) ...[
                    _PlayerLessonTile(
                      lesson: _lessons[index],
                      number: index + 1,
                      selected: index == _selectedIndex,
                      onTap: () => _selectLesson(_lessons[index]),
                    ),
                    if (index != _lessons.length - 1)
                      const Divider(indent: 70, endIndent: 16),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'ملخص الدرس',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: QmColors.border),
              ),
              child: Text(
                _lesson.description.isEmpty
                    ? 'لم يُضف ملخص لهذا الدرس بعد.'
                    : _lesson.description,
                style: const TextStyle(
                  color: QmColors.textSecondary,
                  height: 1.7,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProtectedVideoPlayer extends StatefulWidget {
  const _ProtectedVideoPlayer({
    required this.lesson,
    required this.repository,
    required this.onProgress,
    required this.onPaused,
    required this.onCompleted,
    super.key,
  });

  final CourseLesson lesson;
  final StudentLearningRepository repository;
  final void Function(double seconds, double duration) onProgress;
  final VoidCallback onPaused;
  final Future<void> Function() onCompleted;

  @override
  State<_ProtectedVideoPlayer> createState() => _ProtectedVideoPlayerState();
}

class _ProtectedVideoPlayerState extends State<_ProtectedVideoPlayer> {
  WebViewController? _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  Future<void> _prepare() async {
    final videoId = widget.lesson.videoId;
    if (videoId == null) {
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
    try {
      final data = jsonDecode(message.message) as Map<String, dynamic>;
      switch (data['type']) {
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
    return WebViewWidget(controller: controller);
  }

  String _playerHtml({
    required String libraryId,
    required String videoId,
    required String token,
    required int expires,
  }) {
    final source =
        'https://iframe.mediadelivery.net/embed/$libraryId/$videoId'
        '?token=${Uri.encodeQueryComponent(token)}&expires=$expires'
        '&autoplay=false&preload=true&responsive=true';
    return '''
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    html, body, iframe { width:100%; height:100%; margin:0; border:0; background:#000; overflow:hidden; }
  </style>
  <script src="https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js"></script>
</head>
<body>
  <iframe id="player" src="$source" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe>
  <script>
    const bridge = (payload) => Playback.postMessage(JSON.stringify(payload));
    const player = new playerjs.Player(document.getElementById('player'));
    player.on('ready', () => {
      player.on('timeupdate', (data) => bridge({type:'timeupdate', seconds:data.seconds, duration:data.duration}));
      player.on('pause', () => bridge({type:'pause'}));
      player.on('ended', () => bridge({type:'ended'}));
      player.on('error', () => bridge({type:'error'}));
    });
  </script>
</body>
</html>
''';
  }
}

class _PlayerLessonTile extends StatelessWidget {
  const _PlayerLessonTile({
    required this.lesson,
    required this.number,
    required this.selected,
    required this.onTap,
  });

  final CourseLesson lesson;
  final int number;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? QmColors.lavender : Colors.transparent,
      child: InkWell(
        onTap: lesson.hasVideo ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: selected ? QmGradients.brand : null,
                  color: selected ? null : QmColors.surfaceSoft,
                  shape: BoxShape.circle,
                  border: selected ? null : Border.all(color: QmColors.border),
                ),
                child: Icon(
                  lesson.progress.completed
                      ? Icons.check_rounded
                      : Icons.play_arrow_rounded,
                  color: selected ? Colors.white : QmColors.purple,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: QmColors.textPrimary,
                        fontWeight: selected
                            ? FontWeight.w900
                            : FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      lesson.durationMinutes == null
                          ? 'الدرس $number'
                          : 'الدرس $number • ${lesson.durationMinutes} دقيقة',
                      style: const TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (lesson.progress.watchPercentage > 0)
                Text(
                  '${lesson.progress.watchPercentage}%',
                  style: TextStyle(
                    color: lesson.progress.completed
                        ? QmColors.success
                        : QmColors.pink,
                    fontWeight: FontWeight.w900,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
