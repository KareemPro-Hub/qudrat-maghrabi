import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/features/app_update/data/app_update_service.dart';
import 'package:url_launcher/url_launcher.dart';

/// فحص التحديث لكل مستخدم، قبل الدخول وبعده، دون منع متابعة التطبيق.
class AppUpdateGate extends StatefulWidget {
  const AppUpdateGate({
    required this.child,
    this.service = const AppUpdateService(),
    this.openUpdateUrl,
    super.key,
  });

  final Widget child;
  final AppUpdateService service;
  final Future<bool> Function(Uri)? openUpdateUrl;

  @override
  State<AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends State<AppUpdateGate>
    with WidgetsBindingObserver {
  bool _checking = false;
  bool _backgrounded = false;
  AppUpdateInfo? _pendingUpdate;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _backgrounded = true;
    } else if (state == AppLifecycleState.resumed &&
        (_backgrounded || _pendingUpdate != null)) {
      _backgrounded = false;
      _checkForUpdate();
    }
  }

  Future<void> _checkForUpdate() async {
    if (!mounted || _checking) return;
    _checking = true;
    try {
      final update = _pendingUpdate ?? await widget.service.checkForUpdate();
      _pendingUpdate = null;
      if (!mounted || update == null) return;
      final lifecycle = WidgetsBinding.instance.lifecycleState;
      if (lifecycle != null && lifecycle != AppLifecycleState.resumed) {
        _pendingUpdate = update;
        return;
      }
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            key: const Key('app-update-dialog'),
            scrollable: true,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
            title: const Text(
              'إصدار جديد',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            content: const Text(
              'هناك إصدار جديد متاح من التطبيق. يرجى التحديث إلى أحدث إصدار.',
              style: TextStyle(fontSize: 17, height: 1.6),
            ),
            actions: [
              TextButton(
                key: const Key('app-update-button'),
                onPressed: () {
                  Navigator.of(dialogContext).pop();
                  _openUpdate(update);
                },
                child: const Text('تحديث'),
              ),
            ],
          ),
        ),
      );
    } catch (_) {
      // فشل الشبكة لا يمنع الدخول؛ تُعاد المحاولة عند فتح التطبيق مجددًا.
    } finally {
      _checking = false;
    }
  }

  Future<void> _openUpdate(AppUpdateInfo update) async {
    final uri = Uri.tryParse(update.url);
    var opened = false;
    try {
      if (uri != null && uri.scheme == 'https') {
        opened =
            await (widget.openUpdateUrl?.call(uri) ??
                launchUrl(uri, mode: LaunchMode.externalApplication));
      }
    } catch (_) {
      opened = false;
    }
    if (!opened && mounted) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('تعذّر فتح رابط التحديث. حاول مجددًا.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
