import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/student_learning/domain/course_learning_content.dart';

/// قسم «ملفات الدرس» تحت مشغّل الفيديو: يعرض الملفات المرفوعة فعلًا للدرس،
/// ويفتحها بتطبيق خارجي. مايظهرش خالص لو الدرس مالوش ملفات.
class LessonFilesSection extends StatelessWidget {
  const LessonFilesSection({
    required this.files,
    required this.loading,
    required this.onRetry,
    required this.onOpen,
    this.errorMessage,
    super.key,
  });

  final List<LessonFile> files;
  final bool loading;
  final String? errorMessage;
  final VoidCallback onRetry;
  final ValueChanged<LessonFile> onOpen;

  @override
  Widget build(BuildContext context) {
    // الدرس اللي مالوش ملفات مايعرضش صندوق فاضي؛ الواجبات بتطلع مكانه.
    if (!loading && errorMessage == null && files.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      key: const Key('lesson-files-section'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'ملفات الدرس',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          'كل ما تحتاجه للمراجعة بعد مشاهدة الفيديو.',
          style: TextStyle(color: QmColors.textSecondary),
        ),
        const SizedBox(height: 12),
        if (loading)
          const _FilesLoadingCard()
        else if (errorMessage != null)
          _FilesErrorCard(message: errorMessage!, onRetry: onRetry)
        else
          for (final file in files)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _LessonFileCard(
                key: ValueKey('lesson-file-${file.id}'),
                file: file,
                onTap: () => onOpen(file),
              ),
            ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _LessonFileCard extends StatelessWidget {
  const _LessonFileCard({required this.file, required this.onTap, super.key});

  final LessonFile file;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: QmColors.surface,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: QmColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  gradient: QmGradients.brand,
                  borderRadius: BorderRadius.all(Radius.circular(14)),
                ),
                child: Icon(
                  file.isPdf
                      ? Icons.picture_as_pdf_rounded
                      : Icons.description_rounded,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      file.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: QmColors.textPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [
                        if ((file.fileType ?? '').isNotEmpty)
                          file.fileType!.toUpperCase(),
                        if ((file.sizeLabel ?? '').isNotEmpty) file.sizeLabel!,
                      ].join(' • '),
                      style: TextStyle(
                        color: QmColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.download_rounded,
                color: QmColors.purple,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilesLoadingCard extends StatelessWidget {
  const _FilesLoadingCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 96,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: const CircularProgressIndicator(color: QmColors.pink),
    );
  }
}

class _FilesErrorCard extends StatelessWidget {
  const _FilesErrorCard({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: QmColors.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.cloud_off_rounded, color: QmColors.purple, size: 34),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(color: QmColors.textSecondary),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }
}
