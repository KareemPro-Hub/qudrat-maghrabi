import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/features/student_quizzes/data/student_quiz_repository.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// شاشة فيديو شرح الإجابة (Bunny) — نفس أسلوب مشغّل الدرس: توكن مؤقت من
/// الخادم ثم تشغيل داخل WebView بدون كشف رابط الفيديو.
class ExplanationVideoScreen extends StatefulWidget {
  const ExplanationVideoScreen({
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
  State<ExplanationVideoScreen> createState() =>
      ExplanationVideoScreenState();
}

class ExplanationVideoScreenState extends State<ExplanationVideoScreen> {
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
