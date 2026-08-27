import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';

StudentSubscription? activeStoreSubscriptionFromRows(
  List<Map<String, dynamic>> rows, {
  DateTime? now,
}) {
  final referenceTime = now ?? DateTime.now();
  const entitledStatuses = {'active', 'grace', 'cancelled'};
  final entitledRows =
      rows.where((row) {
        if (!entitledStatuses.contains(row['status'])) return false;
        final expiry = DateTime.tryParse(
          row['current_period_end']?.toString() ?? '',
        );
        return expiry != null && expiry.isAfter(referenceTime);
      }).toList()..sort((first, second) {
        final firstExpiry = DateTime.tryParse(
          first['current_period_end']?.toString() ?? '',
        );
        final secondExpiry = DateTime.tryParse(
          second['current_period_end']?.toString() ?? '',
        );
        if (firstExpiry == null && secondExpiry == null) return 0;
        if (firstExpiry == null) return 1;
        if (secondExpiry == null) return -1;
        return secondExpiry.compareTo(firstExpiry);
      });
  if (entitledRows.isEmpty) return null;

  // كنا بناخد أحدث صف بس؛ فلو الباقة المرتبطة بيه ناقصة bundle_course_id
  // كانت الدالة ترجع null وتخفي اشتراك فعّال بالكامل رغم إن في صف تاني
  // سليم يستحق الوصول. دلوقتي بنكمل على باقي الصفوف بدل ما نتوقف عند الأول.
  for (final row in entitledRows) {
    final plan = row['store_subscription_plans'] as Map<String, dynamic>?;
    final bundleId = plan?['bundle_course_id'] as String?;
    if (bundleId == null || bundleId.isEmpty) continue;

    return StudentSubscription(
      bundleId: bundleId,
      planName: plan?['name_ar'] as String? ?? 'اشتراك المنصة',
      startedAt: DateTime.tryParse(
        row['current_period_start']?.toString() ?? '',
      ),
      expiresAt: DateTime.tryParse(row['current_period_end']?.toString() ?? ''),
    );
  }
  return null;
}

/// اشتراك باقة تم دفعه عبر المنصة (Paymob) بدل متجر التطبيقات.
/// [bundleCourseNames] خريطة من معرّف الكورس الأب (الباقة) إلى اسم يُعرض للطالب.
StudentSubscription? activeEnrollmentSubscriptionFromRows(
  List<Map<String, dynamic>> enrollmentRows, {
  required Map<String, String> bundleCourseNames,
  DateTime? now,
}) {
  final referenceTime = now ?? DateTime.now();
  final entitledRows =
      enrollmentRows.where((row) {
        if (row['payment_status'] != 'paid') return false;
        final courseId = row['course_id'] as String?;
        if (courseId == null || !bundleCourseNames.containsKey(courseId)) {
          return false;
        }
        final expiry = DateTime.tryParse(
          row['expires_at']?.toString() ?? '',
        );
        return expiry == null || expiry.isAfter(referenceTime);
      }).toList()..sort((first, second) {
        final firstExpiry = DateTime.tryParse(
          first['expires_at']?.toString() ?? '',
        );
        final secondExpiry = DateTime.tryParse(
          second['expires_at']?.toString() ?? '',
        );
        if (firstExpiry == null && secondExpiry == null) return 0;
        if (firstExpiry == null) return -1;
        if (secondExpiry == null) return 1;
        return secondExpiry.compareTo(firstExpiry);
      });
  if (entitledRows.isEmpty) return null;

  final row = entitledRows.first;
  final courseId = row['course_id'] as String;
  return StudentSubscription(
    bundleId: courseId,
    planName: bundleCourseNames[courseId] ?? 'اشتراك الباقة',
    startedAt: DateTime.tryParse(row['enrolled_at']?.toString() ?? ''),
    expiresAt: DateTime.tryParse(row['expires_at']?.toString() ?? ''),
  );
}
