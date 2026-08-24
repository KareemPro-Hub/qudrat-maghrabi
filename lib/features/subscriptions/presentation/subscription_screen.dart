import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';

class SubscriptionScreen extends StatelessWidget {
  const SubscriptionScreen({this.subscription, super.key});

  final StudentSubscription? subscription;

  static const _plans = [
    _SubscriptionPlan(
      name: 'الأساسية',
      duration: 'شهر واحد',
      price: 79,
      accent: QmColors.purple,
      benefits: ['كل كورسات المنصة', 'الاختبارات والتدريبات', 'متابعة التقدّم'],
    ),
    _SubscriptionPlan(
      name: 'المميزة',
      duration: '3 أشهر',
      price: 199,
      accent: QmColors.pink,
      popular: true,
      benefits: [
        'كل مزايا الباقة الأساسية',
        'أفضل قيمة للطالب',
        'وصول مستمر 90 يومًا',
      ],
    ),
    _SubscriptionPlan(
      name: 'الاحترافية',
      duration: '6 أشهر',
      price: 299,
      accent: Color(0xFFFF7A54),
      benefits: [
        'كل مزايا الباقة المميزة',
        'أطول مدة وصول',
        'استعداد كامل حتى الاختبار',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverAppBar(
                backgroundColor: const Color(0xFFFCFAFF),
                surfaceTintColor: Colors.transparent,
                pinned: true,
                toolbarHeight: 72,
                scrolledUnderElevation: 0,
                centerTitle: true,
                title: const Text('الاشتراك والباقات'),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                sliver: SliverList.list(
                  children: [
                    _SubscriptionHero(subscription: subscription),
                    const SizedBox(height: 28),
                    Text(
                      'اختر الباقة المناسبة',
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            color: QmColors.textPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'اشتراك واحد يفتح لك كل كورسات المنصة المدفوعة.',
                      style: TextStyle(color: QmColors.textSecondary),
                    ),
                    const SizedBox(height: 18),
                    for (final plan in _plans) ...[
                      _PlanCard(
                        plan: plan,
                        onSelect: () => _showStoreNotice(context, plan),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 4),
                    const _FreeCourseNote(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showStoreNotice(BuildContext context, _SubscriptionPlan plan) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(
                gradient: QmGradients.brand,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.storefront_rounded,
                color: Colors.white,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'باقة ${plan.name} جاهزة',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              'سيُفعّل زر الشراء فور إضافة منتجات الاشتراك في App Store وGoogle Play، حتى يتم الدفع والتجديد بأمان وفق سياسات المتاجر.',
              textAlign: TextAlign.center,
              style: TextStyle(color: QmColors.textSecondary, height: 1.55),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                style: FilledButton.styleFrom(
                  backgroundColor: QmColors.deepPurple,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                ),
                child: const Text('تمام'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionHero extends StatelessWidget {
  const _SubscriptionHero({required this.subscription});

  final StudentSubscription? subscription;

  @override
  Widget build(BuildContext context) {
    final active = subscription != null;
    return ClipRRect(
      borderRadius: BorderRadius.circular(30),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: active
                ? const LinearGradient(
                    colors: [QmColors.deepPurple, QmColors.purple],
                  )
                : LinearGradient(
                    colors: [
                      Colors.white.withValues(alpha: .92),
                      Colors.white.withValues(alpha: .68),
                    ],
                  ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withValues(alpha: .8)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x227A2DD6),
                blurRadius: 28,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: active
                      ? Colors.white.withValues(alpha: .16)
                      : QmColors.lavender,
                  borderRadius: BorderRadius.circular(19),
                ),
                child: Icon(
                  active
                      ? Icons.verified_rounded
                      : Icons.workspace_premium_rounded,
                  color: active ? Colors.white : QmColors.purple,
                  size: 31,
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      active ? 'اشتراكك فعّال' : 'افتح كل الكورسات',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: active ? Colors.white : QmColors.textPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      active
                          ? _activeSubtitle(subscription!)
                          : 'تعلّم بلا قيود واختر الباقة المناسبة لك.',
                      style: TextStyle(
                        color: active
                            ? Colors.white.withValues(alpha: .82)
                            : QmColors.textSecondary,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _activeSubtitle(StudentSubscription value) {
    final expiry = value.expiresAt;
    if (expiry == null) return '${value.planName} • وصول مستمر';
    return '${value.planName} • ينتهي في ${expiry.day}/${expiry.month}/${expiry.year}';
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.onSelect});

  final _SubscriptionPlan plan;
  final VoidCallback onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: QmColors.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: plan.popular
              ? plan.accent.withValues(alpha: .5)
              : QmColors.border,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x100F0520),
            blurRadius: 24,
            offset: Offset(0, 12),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  plan.accent,
                  Color.lerp(plan.accent, Colors.pink, .32)!,
                ],
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (plan.popular)
                        Container(
                          margin: const EdgeInsets.only(bottom: 7),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: const Text(
                            'الأكثر اختيارًا',
                            style: TextStyle(
                              color: QmColors.pink,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      Text(
                        plan.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        plan.duration,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: .84),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  plan.price.toStringAsFixed(0),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 42,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(width: 5),
                Image.asset(
                  'assets/brand/saudi_riyal_symbol.png',
                  width: 20,
                  height: 24,
                  fit: BoxFit.contain,
                  color: Colors.white,
                  colorBlendMode: BlendMode.srcIn,
                  semanticLabel: 'ريال سعودي',
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                for (final benefit in plan.benefits)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 11),
                    child: Row(
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          color: plan.accent,
                          size: 21,
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Text(
                            benefit,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 5),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    key: ValueKey('select-${plan.duration}'),
                    onPressed: onSelect,
                    style: FilledButton.styleFrom(
                      backgroundColor: plan.accent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Text(
                      'اختيار ${plan.duration}',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FreeCourseNote extends StatelessWidget {
  const _FreeCourseNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF9F3),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(Icons.volunteer_activism_rounded, color: QmColors.success),
          SizedBox(width: 11),
          Expanded(
            child: Text(
              'ابدأ بثلاث حصص مجانية من دورة التأسيس، واكتشف أسلوب الشرح قبل اختيار باقتك.',
              style: TextStyle(
                color: QmColors.textPrimary,
                fontWeight: FontWeight.w700,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionPlan {
  const _SubscriptionPlan({
    required this.name,
    required this.duration,
    required this.price,
    required this.accent,
    required this.benefits,
    this.popular = false,
  });

  final String name;
  final String duration;
  final double price;
  final Color accent;
  final List<String> benefits;
  final bool popular;
}
