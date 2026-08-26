import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:qudrat_maghrabi_app/core/config/app_metadata.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/shared/widgets/qm_gradient_button.dart';
import 'package:url_launcher/url_launcher.dart';

/// أيقونة دعم صغيرة تُستخدم أعلى شاشات الدخول/التسجيل لفتح نموذج
/// الإبلاغ عن مشكلة والتواصل المباشر مع الدعم عبر واتساب.
class SupportIconButton extends StatelessWidget {
  const SupportIconButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      key: const Key('support-report-problem-button'),
      tooltip: 'الإبلاغ عن مشكلة',
      onPressed: () => showReportProblemSheet(context),
      icon: const Icon(Icons.support_agent_rounded),
    );
  }
}

enum _ProblemSource { app, platform }

Future<void> showReportProblemSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _ReportProblemSheet(),
  );
}

class _ReportProblemSheet extends StatefulWidget {
  const _ReportProblemSheet();

  @override
  State<_ReportProblemSheet> createState() => _ReportProblemSheetState();
}

class _ReportProblemSheetState extends State<_ReportProblemSheet> {
  final _descriptionController = TextEditingController();
  _ProblemSource _source = _ProblemSource.app;
  XFile? _screenshot;
  bool _picking = false;

  bool get _isValid =>
      _descriptionController.text.trim().isNotEmpty && _screenshot != null;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickScreenshot() async {
    setState(() => _picking = true);
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );
      if (picked != null && mounted) setState(() => _screenshot = picked);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تعذّر فتح مكتبة الصور', textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  Future<void> _contactSupport() async {
    if (!_isValid) return;
    final sourceLabel = _source == _ProblemSource.app
        ? 'التطبيق'
        : 'المنصة (الموقع)';
    final message =
        'مرحبًا، عندي مشكلة في $sourceLabel.\n'
        'وصف المشكلة: ${_descriptionController.text.trim()}\n'
        '(سأرفق لقطة شاشة توضح المشكلة هنا)';
    final uri = Uri.parse(
      'https://wa.me/${AppMetadata.supportWhatsappNumber}'
      '?text=${Uri.encodeComponent(message)}',
    );
    final canOpen = await canLaunchUrl(uri);
    final opened = canOpen && await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!mounted) return;
    if (!opened) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تعذّر فتح واتساب على هذا الجهاز',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text(
            'لا تنسَ إرفاق الصورة اللي اخترتها داخل محادثة واتساب',
            textAlign: TextAlign.center,
          ),
          behavior: SnackBarBehavior.floating,
          duration: Duration(seconds: 5),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: QmColors.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: QmColors.border,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                Text(
                  'الإبلاغ عن مشكلة',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: QmColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'اكتب المشكلة بالتفصيل وأرفق لقطة شاشة، وهنوصلك بالدعم فورًا.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: QmColors.textSecondary, height: 1.5),
                ),
                const SizedBox(height: 20),
                Text(
                  'المشكلة من:',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: QmColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _SourceChip(
                        label: 'التطبيق',
                        selected: _source == _ProblemSource.app,
                        onTap: () =>
                            setState(() => _source = _ProblemSource.app),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _SourceChip(
                        label: 'المنصة (الموقع)',
                        selected: _source == _ProblemSource.platform,
                        onTap: () =>
                            setState(() => _source = _ProblemSource.platform),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  'وصف مختصر للمشكلة *',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: QmColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('report-problem-description'),
                  controller: _descriptionController,
                  maxLines: 3,
                  minLines: 2,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'مثال: تسجيل الدخول ما بيشتغلش وطالعة رسالة خطأ...',
                    filled: true,
                    fillColor: QmColors.lavender,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'لقطة شاشة توضح المشكلة *',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: QmColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                _ScreenshotPicker(
                  screenshot: _screenshot,
                  isLoading: _picking,
                  onTap: _pickScreenshot,
                  onRemove: () => setState(() => _screenshot = null),
                ),
                const SizedBox(height: 24),
                QmGradientButton(
                  label: 'تواصل عبر واتساب',
                  icon: Icons.chat_rounded,
                  onPressed: _isValid ? _contactSupport : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SourceChip extends StatelessWidget {
  const _SourceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? QmColors.purple.withValues(alpha: 0.12)
          : QmColors.lavender,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? QmColors.purple : Colors.transparent,
              width: 1.4,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: selected ? QmColors.purple : QmColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _ScreenshotPicker extends StatelessWidget {
  const _ScreenshotPicker({
    required this.screenshot,
    required this.isLoading,
    required this.onTap,
    required this.onRemove,
  });

  final XFile? screenshot;
  final bool isLoading;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    if (screenshot != null) {
      return Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(
              File(screenshot!.path),
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          Positioned(
            top: 8,
            left: 8,
            child: Material(
              color: Colors.black.withValues(alpha: 0.55),
              shape: const CircleBorder(),
              child: IconButton(
                key: const Key('report-problem-remove-screenshot'),
                onPressed: onRemove,
                icon: const Icon(
                  Icons.close_rounded,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ),
          ),
        ],
      );
    }
    return Material(
      color: QmColors.lavender,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        key: const Key('report-problem-pick-screenshot'),
        borderRadius: BorderRadius.circular(14),
        onTap: isLoading ? null : onTap,
        child: Container(
          height: 100,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: QmColors.border),
          ),
          child: isLoading
              ? const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.add_photo_alternate_outlined,
                      color: QmColors.purple,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'اختر لقطة شاشة',
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
