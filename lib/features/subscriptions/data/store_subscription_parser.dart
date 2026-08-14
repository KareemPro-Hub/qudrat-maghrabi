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

  final row = entitledRows.first;
  final plan = row['store_subscription_plans'] as Map<String, dynamic>?;
  final bundleId = plan?['bundle_course_id'] as String?;
  if (bundleId == null || bundleId.isEmpty) return null;

  return StudentSubscription(
    bundleId: bundleId,
    planName: plan?['name_ar'] as String? ?? 'اشتراك المنصة',
    startedAt: DateTime.tryParse(row['current_period_start']?.toString() ?? ''),
    expiresAt: DateTime.tryParse(row['current_period_end']?.toString() ?? ''),
  );
}
