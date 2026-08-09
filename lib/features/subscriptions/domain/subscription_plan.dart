import 'package:flutter/foundation.dart';

@immutable
class SubscriptionPlan {
  const SubscriptionPlan({
    required this.id,
    required this.productId,
    required this.name,
    required this.duration,
    required this.durationDays,
    required this.fallbackPriceSar,
    required this.benefits,
    this.popular = false,
  });

  final String id;
  final String productId;
  final String name;
  final String duration;
  final int durationDays;
  final double fallbackPriceSar;
  final List<String> benefits;
  final bool popular;

  static const monthly = SubscriptionPlan(
    id: 'monthly',
    productId: 'com.qudratmaghrabi.app.subscription.monthly',
    name: 'الأساسية',
    duration: 'شهر واحد',
    durationDays: 30,
    fallbackPriceSar: 49.99,
    benefits: ['كل كورسات المنصة', 'الاختبارات والتدريبات', 'متابعة التقدّم'],
  );

  static const quarterly = SubscriptionPlan(
    id: 'quarterly',
    productId: 'com.qudratmaghrabi.app.subscription.quarterly',
    name: 'المميزة',
    duration: '3 أشهر',
    durationDays: 90,
    fallbackPriceSar: 99.99,
    popular: true,
    benefits: [
      'كل مزايا الباقة الأساسية',
      'أفضل قيمة للطالب',
      'وصول مستمر 90 يومًا',
    ],
  );

  static const semiannual = SubscriptionPlan(
    id: 'semiannual',
    productId: 'com.qudratmaghrabi.app.subscription.semiannual',
    name: 'الاحترافية',
    duration: '6 أشهر',
    durationDays: 180,
    fallbackPriceSar: 179.99,
    benefits: [
      'كل مزايا الباقة المميزة',
      'أطول مدة وصول',
      'استعداد كامل حتى الاختبار',
    ],
  );

  static const all = [monthly, quarterly, semiannual];

  static SubscriptionPlan? fromProductId(String productId) {
    for (final plan in all) {
      if (plan.productId == productId) return plan;
    }
    return null;
  }
}
