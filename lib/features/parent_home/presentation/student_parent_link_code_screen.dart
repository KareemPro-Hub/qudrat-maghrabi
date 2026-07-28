import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/data/parent_home_repository.dart';
import 'package:qudrat_maghrabi_app/features/parent_home/domain/parent_home_snapshot.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';

class StudentParentLinkCodeScreen extends StatefulWidget {
  const StudentParentLinkCodeScreen({required this.repository, super.key});

  final ParentHomeRepository repository;

  @override
  State<StudentParentLinkCodeScreen> createState() =>
      _StudentParentLinkCodeScreenState();
}

class _StudentParentLinkCodeScreenState
    extends State<StudentParentLinkCodeScreen> {
  ParentLinkCode? _linkCode;
  Timer? _timer;
  bool _creating = false;
  String? _errorMessage;
  Duration _remaining = Duration.zero;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _createCode() async {
    setState(() {
      _creating = true;
      _errorMessage = null;
    });
    try {
      final code = await widget.repository.createParentLinkCode();
      if (!mounted) return;
      _timer?.cancel();
      setState(() {
        _linkCode = code;
        _remaining = code.expiresAt.difference(DateTime.now());
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        final remaining = code.expiresAt.difference(DateTime.now());
        setState(() {
          _remaining = remaining.isNegative ? Duration.zero : remaining;
        });
        if (remaining.isNegative) _timer?.cancel();
      });
    } on ParentHomeFailure catch (error) {
      if (mounted) setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _copyCode() async {
    final code = _linkCode?.code;
    if (code == null || _remaining == Duration.zero) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('تم نسخ رمز الربط', textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: QmColors.deepPurple,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
  }

  String get _remainingLabel {
    if (_remaining == Duration.zero) return 'انتهت صلاحية الرمز';
    final minutes = _remaining.inMinutes;
    final seconds = _remaining.inSeconds.remainder(60);
    return 'صالح لمدة ${minutes.toString().padLeft(2, '0')}:'
        '${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final linkCode = _linkCode;
    final isExpired = linkCode != null && _remaining == Duration.zero;

    return Scaffold(
      backgroundColor: QmColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text(
          'ربط ولي الأمر',
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
          child: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 42),
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.86),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white),
                  boxShadow: [
                    BoxShadow(
                      color: QmColors.purple.withValues(alpha: 0.12),
                      blurRadius: 30,
                      offset: const Offset(0, 16),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 92,
                      height: 92,
                      decoration: BoxDecoration(
                        color: QmColors.lavender,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: const Icon(
                        Icons.family_restroom_rounded,
                        color: QmColors.purple,
                        size: 44,
                      ),
                    ),
                    const SizedBox(height: 22),
                    Text(
                      linkCode == null
                          ? 'أنشئ رمزًا مؤقتًا'
                          : 'شارك الرمز مع ولي أمرك',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: QmColors.textPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'أعطِ الرمز لولي أمرك فقط. سيستخدمه مرة واحدة لربط حسابك ومتابعة تقدّمك.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        height: 1.65,
                      ),
                    ),
                    if (linkCode != null) ...[
                      const SizedBox(height: 26),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 22,
                        ),
                        decoration: BoxDecoration(
                          gradient: isExpired
                              ? null
                              : const LinearGradient(
                                  colors: [
                                    QmColors.deepPurple,
                                    QmColors.purple,
                                    QmColors.pink,
                                  ],
                                ),
                          color: isExpired ? QmColors.border : null,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: Column(
                          children: [
                            SelectableText(
                              linkCode.code,
                              key: const Key('student-parent-link-code'),
                              textDirection: TextDirection.ltr,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isExpired
                                    ? QmColors.textSecondary
                                    : Colors.white,
                                fontSize: 23,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.4,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _remainingLabel,
                              style: TextStyle(
                                color: isExpired
                                    ? QmColors.error
                                    : Colors.white.withValues(alpha: 0.8),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      OutlinedButton.icon(
                        key: const Key('copy-parent-link-code-button'),
                        onPressed: isExpired ? null : _copyCode,
                        icon: const Icon(Icons.copy_rounded),
                        label: const Text('نسخ الرمز'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: QmColors.purple,
                          minimumSize: const Size.fromHeight(52),
                          side: const BorderSide(color: QmColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(17),
                          ),
                        ),
                      ),
                    ],
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: QmColors.error,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                    const SizedBox(height: 22),
                    QmGradientButton(
                      key: const Key('create-parent-link-code-button'),
                      label: linkCode == null
                          ? 'إنشاء رمز الربط'
                          : 'إنشاء رمز جديد',
                      icon: Icons.key_rounded,
                      isLoading: _creating,
                      onPressed: _creating ? null : _createCode,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.shield_outlined,
                    color: QmColors.textMuted,
                    size: 19,
                  ),
                  SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      'الرمز مشفّر، تنتهي صلاحيته بعد 24 ساعة، ويُلغى فور استخدامه أو إنشاء رمز جديد.',
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12,
                        height: 1.6,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
