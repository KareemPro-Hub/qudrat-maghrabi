import 'package:flutter/foundation.dart';

@immutable
class SubscriptionBenefit {
  const SubscriptionBenefit(this.text, {this.included = true});

  final String text;
  final bool included;
}

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
  final List<SubscriptionBenefit> benefits;
  final bool popular;

  /// السعر الاحتياطي كنص: بدون كسور إذا كان رقمًا صحيحًا، وبمنزلتين غير ذلك.
  String get fallbackPriceLabel {
    return fallbackPriceSar == fallbackPriceSar.roundToDouble()
        ? fallbackPriceSar.toStringAsFixed(0)
        : fallbackPriceSar.toStringAsFixed(2);
  }

  static const monthly = SubscriptionPlan(
    id: 'monthly',
    productId: 'com.qudratmaghrabi.app.subscription.monthly',
    name: 'الأساسية',
    duration: 'شهر واحد',
    durationDays: 30,
    fallbackPriceSar: 19.99,
    benefits: [
      SubscriptionBenefit('تأسيس قوي يبدأ بك من الصفر'),
      SubscriptionBenefit('فيديوهات احترافية بجودة عالية'),
      SubscriptionBenefit('اختبار تطبيقي بعد كل درس'),
      SubscriptionBenefit('تحليل إجاباتك بالذكاء الاصطناعي', included: false),
      SubscriptionBenefit('تقارير تكشف مستواك بدقة', included: false),
    ],
  );

  static const quarterly = SubscriptionPlan(
    id: 'quarterly',
    productId: 'com.qudratmaghrabi.app.subscription.quarterly',
    name: 'المميزة',
    duration: '3 أشهر',
    durationDays: 90,
    fallbackPriceSar: 39.99,
    popular: true,
    benefits: [
      SubscriptionBenefit('جميع مزايا الباقة الأساسية'),
      SubscriptionBenefit('أحدث بنوك أسئلة المحوسب'),
      SubscriptionBenefit('محاكاة مكثفة بلا حدود'),
      SubscriptionBenefit('حلول التجميعات بأسرع الاستراتيجيات'),
      SubscriptionBenefit('خطة ذكية تناسب نقاط ضعفك', included: false),
    ],
  );

  static const semiannual = SubscriptionPlan(
    id: 'semiannual',
    productId: 'com.qudratmaghrabi.app.subscription.semiannual',
    name: 'الاحترافية',
    duration: '6 أشهر',
    durationDays: 180,
    fallbackPriceSar: 59.99,
    benefits: [
      SubscriptionBenefit('جميع مزايا الباقة المميزة'),
      SubscriptionBenefit('بث مباشر أسبوعي مع الطلاب'),
      SubscriptionBenefit('قروب تفاعلي للدعم المستمر'),
      SubscriptionBenefit('جلسات مراجعة مركزة ومباشرة'),
      SubscriptionBenefit('تحليل شامل وخطة تفوق شخصية'),
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
