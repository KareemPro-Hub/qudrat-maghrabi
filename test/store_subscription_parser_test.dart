import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/store_subscription_parser.dart';

void main() {
  test('course access without a store purchase is not a subscription', () {
    final subscription = activeStoreSubscriptionFromRows(
      const <Map<String, dynamic>>[],
      now: DateTime.utc(2026, 8, 14),
    );

    expect(subscription, isNull);
  });

  test('only a current verified store subscription is shown', () {
    final subscription = activeStoreSubscriptionFromRows([
      {
        'status': 'active',
        'current_period_start': '2026-08-01T00:00:00Z',
        'current_period_end': '2026-11-01T00:00:00Z',
        'store_subscription_plans': {
          'name_ar': 'الباقة المميزة',
          'bundle_course_id': 'bundle',
        },
      },
    ], now: DateTime.utc(2026, 8, 14));

    expect(subscription?.planName, 'الباقة المميزة');
    expect(subscription?.expiresAt, DateTime.utc(2026, 11, 1));
  });

  test('a plan row without a bundle does not hide a valid subscription', () {
    final subscription = activeStoreSubscriptionFromRows([
      {
        'status': 'active',
        'current_period_start': '2026-08-05T00:00:00Z',
        'current_period_end': '2026-12-01T00:00:00Z',
        'store_subscription_plans': {
          'name_ar': 'باقة بدون ربط',
          'bundle_course_id': null,
        },
      },
      {
        'status': 'active',
        'current_period_start': '2026-08-01T00:00:00Z',
        'current_period_end': '2026-11-01T00:00:00Z',
        'store_subscription_plans': {
          'name_ar': 'الباقة الأساسية',
          'bundle_course_id': 'bundle',
        },
      },
    ], now: DateTime.utc(2026, 8, 14));

    expect(subscription?.bundleId, 'bundle');
    expect(subscription?.planName, 'الباقة الأساسية');
  });

  test('an expired store purchase is not shown as active', () {
    final subscription = activeStoreSubscriptionFromRows([
      {
        'status': 'active',
        'current_period_start': '2026-01-01T00:00:00Z',
        'current_period_end': '2026-02-01T00:00:00Z',
        'store_subscription_plans': {
          'name_ar': 'الباقة الأساسية',
          'bundle_course_id': 'bundle',
        },
      },
    ], now: DateTime.utc(2026, 8, 14));

    expect(subscription, isNull);
  });
}
