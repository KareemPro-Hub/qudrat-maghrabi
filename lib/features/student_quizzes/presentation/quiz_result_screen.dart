import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/domain/student_quiz.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/presentation/quiz_attempt_screen.dart';
import 'package:webview_flutter/webview_flutter.dart';

class QuizResultScreen extends StatefulWidget {
  const QuizResultScreen({
    required this.quiz,
    required this.result,
    required this.repository,
    required this.watermark,
    super.key,
  });

  final StudentQuiz quiz;
  final QuizAttemptResult result;
  final StudentQuizRepository repository;

  /// هوية الطالب التي تُكتب فوق فيديو شرح الإجابة — نفس علامة مشغّل الدرس.
  final String watermark;

  @override
  State<QuizResultScreen> createState() => _QuizResultScreenState();
}

class _QuizResultScreenState extends State<QuizResultScreen> {
  late Future<QuizReview> _reviewFuture;

  @override
  void initState() {
    super.initState();
    _reviewFuture = widget.repository.loadReview(
      quiz: widget.quiz,
      result: widget.result,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: QmColors.background,
        title: const Text(
          'نتيجة الاختبار',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close_rounded),
        ),
      ),
      body: FutureBuilder<QuizReview>(
        future: _reviewFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(color: QmColors.pink),
            );
          }
          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  snapshot.error is QuizFailure
                      ? snapshot.error.toString()
                      : 'تعذّر تحميل المراجعة. تأكد من الإنترنت وحاول مرة أخرى',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return _buildReview(snapshot.data!);
        },
      ),
    );
  }

  void _openExplanationVideo({
    required String courseId,
    required String videoId,
  }) {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _ExplanationVideoScreen(
          repository: widget.repository,
          courseId: courseId,
          videoId: videoId,
          watermark: widget.watermark,
        ),
      ),
    );
  }

  Widget _buildReview(QuizReview review) {
    return ListView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 38),
      children: [
        _ResultHero(review: review),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.fact_check_outlined),
                label: const Text('كل الاختبارات'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
              ),
            ),
            if (!review.result.passed) ...[
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: QmGradients.brand,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pushReplacement<void, void>(
                        MaterialPageRoute(
                          builder: (_) => QuizAttemptScreen(
                            quiz: widget.quiz,
                            repository: widget.repository,
                            watermark: widget.watermark,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('إعادة المحاولة'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 28),
        Text(
          'مراجعة الإجابات',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Text(
          '${review.correctAnswers} إجابات صحيحة من ${review.questions.length}',
          style: TextStyle(color: QmColors.textSecondary),
        ),
        const SizedBox(height: 14),
        for (var index = 0; index < review.questions.length; index++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _ReviewQuestionCard(
              question: review.questions[index],
              number: index + 1,
              studentAnswer: review.result.answers[review.questions[index].id],
              onExplain: () => _openExplanationVideo(
                courseId: review.quiz.courseId,
                videoId: review.questions[index].explanationVideoId!,
              ),
            ),
          ),
      ],
    );
  }
}

class _ResultHero extends StatelessWidget {
  const _ResultHero({required this.review});

  final QuizReview review;

  @override
  Widget build(BuildContext context) {
    final passed = review.result.passed;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: passed
              ? (QmColors.useDarkPalette
                    ? const [Color(0xFF10301F), Color(0xFF16412A)]
                    : const [Color(0xFFE9FBF3), Color(0xFFD7F6E8)])
              : (QmColors.useDarkPalette
                    ? const [Color(0xFF3A1620), Color(0xFF4A1C29)]
                    : const [Color(0xFFFFF0F3), Color(0xFFFFE1E7)]),
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: passed ? QmColors.successTintStrong : QmColors.errorTintStrong,
        ),
      ),
      child: Column(
        children: [
          Container(
            width: 78,
            height: 78,
            decoration: BoxDecoration(
              color: passed ? QmColors.success : QmColors.error,
              shape: BoxShape.circle,
            ),
            child: Icon(
              passed ? Icons.emoji_events_rounded : Icons.refresh_rounded,
              color: Colors.white,
              size: 40,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            passed ? 'أحسنت ! اجتزت الاختبار 🎉' : 'المرة القادمة أفضل',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            review.quiz.title,
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.textSecondary),
          ),
          const SizedBox(height: 22),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _ScoreValue(
                value: '${review.result.score}',
                label: 'درجتك',
                color: QmColors.accent,
              ),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 18),
                child: Text(
                  '/',
                  style: TextStyle(color: QmColors.textMuted, fontSize: 28),
                ),
              ),
              _ScoreValue(
                value: '${review.result.totalMarks}',
                label: 'الدرجة الكاملة',
                color: QmColors.textSecondary,
              ),
              const SizedBox(width: 24),
              _ScoreValue(
                value: '${review.result.percentage}%',
                label: 'النسبة',
                color: passed ? QmColors.success : QmColors.error,
              ),
            ],
          ),
          const SizedBox(height: 20),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              minHeight: 11,
              value: review.result.percentage / 100,
              color: passed ? QmColors.success : QmColors.error,
              backgroundColor: Colors.white.withValues(alpha: .7),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'درجة النجاح: ${review.quiz.passMarks} من ${review.quiz.totalMarks}',
            style: TextStyle(color: QmColors.textSecondary, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _ScoreValue extends StatelessWidget {
  const _ScoreValue({
    required this.value,
    required this.label,
    required this.color,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 28,
            fontWeight: FontWeight.w900,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: QmColors.textSecondary, fontSize: 11),
        ),
      ],
    );
  }
}

class _ReviewQuestionCard extends StatelessWidget {
  const _ReviewQuestionCard({
    required this.question,
    required this.number,
    required this.studentAnswer,
    required this.onExplain,
  });

  final QuizReviewQuestion question;
  final int number;
  final String? studentAnswer;
  final VoidCallback onExplain;

  @override
  Widget build(BuildContext context) {
    const labels = {'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د'};
    final correct = studentAnswer == question.correctAnswer;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: correct ? QmColors.successTintStrong : QmColors.errorTintStrong,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                correct ? Icons.check_circle_rounded : Icons.cancel_rounded,
                color: correct ? QmColors.success : QmColors.error,
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  '$number. ${question.text}',
                  style: TextStyle(
                    color: QmColors.textPrimary,
                    height: 1.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
          // صورة السؤال: في هذه الاختبارات السؤال نفسه صورة (كسور وجذور مرصوصة)،
          // فبدونها لا يعرف الطالب ما الذي كان يُسأل عنه أثناء المراجعة.
          if (question.imageUrl != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(
                question.imageUrl!,
                fit: BoxFit.contain,
                cacheWidth: 1080,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
          ],
          const SizedBox(height: 13),
          for (final entry in question.options.entries)
            if (entry.key == studentAnswer ||
                entry.key == question.correctAnswer)
              Container(
                margin: const EdgeInsets.only(bottom: 7),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: entry.key == question.correctAnswer
                      ? QmColors.successTint
                      : QmColors.errorTint,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Text(
                  '${labels[entry.key]}) ${entry.value}',
                  style: TextStyle(
                    color: entry.key == question.correctAnswer
                        ? QmColors.success
                        : QmColors.error,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
          if (studentAnswer == null)
            const Text(
              'لم تتم الإجابة',
              style: TextStyle(
                color: QmColors.error,
                fontWeight: FontWeight.w800,
              ),
            ),
          if (question.explanation != null) ...[
            const SizedBox(height: 7),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: QmColors.lavender,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                '💡 ${question.explanation}',
                style: TextStyle(color: QmColors.textSecondary, height: 1.55),
              ),
            ),
          ],
          if (question.explanationVideoId != null) ...[
            const SizedBox(height: 9),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: onExplain,
                icon: const Icon(Icons.play_circle_fill_rounded),
                label: const Text('عرفني الإجابة الصحيحة'),
                style: FilledButton.styleFrom(
                  backgroundColor: QmColors.purple,
                  minimumSize: const Size.fromHeight(46),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// شاشة فيديو شرح الإجابة (Bunny) — نفس أسلوب مشغّل الدرس: توكن مؤقت من
/// الخادم ثم تشغيل داخل WebView بدون كشف رابط الفيديو.
class _ExplanationVideoScreen extends StatefulWidget {
  const _ExplanationVideoScreen({
    required this.repository,
    required this.courseId,
    required this.videoId,
    required this.watermark,
  });

  final StudentQuizRepository repository;
  final String courseId;
  final String videoId;
  final String watermark;

  @override
  State<_ExplanationVideoScreen> createState() =>
      _ExplanationVideoScreenState();
}

class _ExplanationVideoScreenState extends State<_ExplanationVideoScreen> {
  WebViewController? _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  Future<void> _prepare() async {
    try {
      final credentials = await widget.repository.requestExplanationVideo(
        courseId: widget.courseId,
        videoId: widget.videoId,
      );
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (request) {
              if (!request.isMainFrame) return NavigationDecision.navigate;
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
        () => _error = error is QuizFailure
            ? error.toString()
            : 'تعذّر تشغيل فيديو الشرح. حاول مرة أخرى',
      );
    }
  }

  String _playerHtml({
    required String libraryId,
    required String token,
    required int expires,
  }) {
    // تهريب النص قبل حقنه في HTML عشان أي رمز في البريد ما يكسرش الصفحة.
    final safeWatermark = widget.watermark
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    final source =
        'https://iframe.mediadelivery.net/embed/$libraryId/${widget.videoId}'
        '?token=${Uri.encodeQueryComponent(token)}&expires=$expires'
        '&autoplay=false&preload=true&responsive=true'
        '&playsinline=true&disableIosPlayer=true';
    return '''
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    html, body { width:100%; height:100%; margin:0; background:#000; overflow:hidden; }
    iframe { width:100%; height:100%; border:0; }
    /* نفس علامة مشغّل الدرس: مابتمنعش التصوير، بس بتخلّي أي تسريب معروف
       مصدره. pointer-events:none عشان ما تعطّلش التحكم في المشغّل. */
    #qm-wm {
      position: fixed; z-index: 2147483647; pointer-events: none; user-select: none;
      color: rgba(255,255,255,.42); font-size: 12px; font-weight: 700;
      font-family: -apple-system, "SF Arabic", "Segoe UI", Tahoma, sans-serif;
      text-shadow: 0 1px 3px rgba(0,0,0,.85); white-space: nowrap;
      transition: top .8s ease, left .8s ease;
      top: 8%; left: 6%;
    }
  </style>
</head>
<body>
  <iframe src="$source" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen></iframe>
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
  </script>
</body>
</html>
''';
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text(
          'شرح الإجابة',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.close_rounded),
        ),
      ),
      body: Center(
        child: _error != null
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              )
            : controller == null
            ? const CircularProgressIndicator(color: QmColors.pink)
            : AspectRatio(
                aspectRatio: 16 / 9,
                child: WebViewWidget(controller: controller),
              ),
      ),
    );
  }
}
