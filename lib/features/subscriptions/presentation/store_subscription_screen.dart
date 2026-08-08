import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/subscription_plan.dart';
import 'package:url_launcher/url_launcher.dart';

class StoreSubscriptionScreen extends StatefulWidget {
  const StoreSubscriptionScreen({
    required this.repository,
    this.subscription,
    super.key,
  });

  final SubscriptionRepository repository;
  final StudentSubscription? subscription;

  @override
  State<StoreSubscriptionScreen> createState() =>
      _StoreSubscriptionScreenState();
}

class _StoreSubscriptionScreenState extends State<StoreSubscriptionScreen> {
  late Future<SubscriptionCatalog> _catalogFuture;
  StreamSubscription<SubscriptionUpdate>? _updatesSubscription;
  String? _processingProductId;
  bool _restoring = false;

  @override
  void initState() {
    super.initState();
    _catalogFuture = widget.repository.loadCatalog();
    _updatesSubscription = widget.repository.updates.listen(_onUpdate);
  }

  @override
  void dispose() {
    _updatesSubscription?.cancel();
    super.dispose();
  }

  void _onUpdate(SubscriptionUpdate update) {
    if (!mounted) return;
    final pending = update.type == SubscriptionUpdateType.pending;
    setState(() {
      _processingProductId = pending ? update.productId : null;
      if (!pending) _restoring = false;
    });
    final isError = update.type == SubscriptionUpdateType.error;
    final isSuccess =
        update.type == SubscriptionUpdateType.verified ||
        update.type == SubscriptionUpdateType.restored;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(update.message, textAlign: TextAlign.center),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError
              ? QmColors.error
              : isSuccess
              ? QmColors.success
              : QmColors.deepPurple,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      );
    if (isSuccess) {
      setState(() {
        _catalogFuture = widget.repository.loadCatalog();
      });
    }
  }

  Future<void> _reloadCatalog() async {
    setState(() => _catalogFuture = widget.repository.loadCatalog());
    await _catalogFuture;
  }

  Future<void> _buy(SubscriptionPlan plan) async {
    if (_processingProductId != null || _restoring) return;
    setState(() => _processingProductId = plan.productId);
    await widget.repository.purchase(plan);
  }

  Future<void> _restore() async {
    if (_processingProductId != null || _restoring) return;
    setState(() => _restoring = true);
    await widget.repository.restorePurchases();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: QmGradients.softBackground),
        child: SafeArea(
          child: RefreshIndicator(
            color: QmColors.pink,
            onRefresh: _reloadCatalog,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              slivers: [
                SliverAppBar(
                  backgroundColor: Colors.transparent,
                  surfaceTintColor: Colors.transparent,
                  pinned: true,
                  title: const Text('الاشتراك والباقات'),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  sliver: SliverList.list(
                    children: [
                      _SubscriptionHero(subscription: widget.subscription),
                      const SizedBox(height: 18),
                      _ManagementActions(
                        hasSubscription: widget.subscription != null,
                        restoring: _restoring,
                        onRestore: _restore,
                        onManage: widget.repository.openSubscriptionManagement,
                      ),
                      const SizedBox(height: 26),
                      Text(
                        'اختر الباقة المناسبة',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(
                              color: QmColors.textPrimary,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'اشتراك متجدد تلقائيًا يفتح كل كورسات المنصة المدفوعة، ويمكن إلغاؤه من المتجر في أي وقت.',
                        style: TextStyle(
                          color: QmColors.textSecondary,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 18),
                      FutureBuilder<SubscriptionCatalog>(
                        future: _catalogFuture,
                        builder: (context, snapshot) {
                          final catalog =
                              snapshot.data ??
                              SubscriptionCatalog.unavailable();
                          return Column(
                            children: [
                              if (snapshot.connectionState ==
                                  ConnectionState.waiting)
                                const Padding(
                                  padding: EdgeInsets.only(bottom: 16),
                                  child: LinearProgressIndicator(
                                    color: QmColors.pink,
                                    backgroundColor: QmColors.lavender,
                                  ),
                                ),
                              if (catalog.notice != null)
                                _CatalogNotice(text: catalog.notice!),
                              for (final plan in SubscriptionPlan.all) ...[
                                _PlanCard(
                                  offer: catalog.offerFor(plan),
                                  processing:
                                      _processingProductId == plan.productId,
                                  purchaseBlocked:
                                      _processingProductId != null ||
                                      _restoring,
                                  onSelect: () => _buy(plan),
                                ),
                                const SizedBox(height: 16),
                              ],
                            ],
                          );
                        },
                      ),
                      const _RenewalNote(),
                      const SizedBox(height: 12),
                      const _FreeCourseNote(),
                      const SizedBox(height: 18),
                      const _PurchaseLegalLinks(),
                    ],
                  ),
                ),
              ],
            ),
          ),
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
                          : 'تعلّم بلا قيود واختر المدة المناسبة لك.',
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

class _ManagementActions extends StatelessWidget {
  const _ManagementActions({
    required this.hasSubscription,
    required this.restoring,
    required this.onRestore,
    required this.onManage,
  });

  final bool hasSubscription;
  final bool restoring;
  final VoidCallback onRestore;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            key: const Key('restore-purchases-button'),
            onPressed: restoring ? null : onRestore,
            icon: restoring
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.restore_rounded),
            label: const Text('استعادة المشتريات'),
          ),
        ),
        if (hasSubscription) ...[
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              key: const Key('manage-subscription-button'),
              onPressed: onManage,
              icon: const Icon(Icons.settings_outlined),
              label: const Text('إدارة الاشتراك'),
            ),
          ),
        ],
      ],
    );
  }
}

class _CatalogNotice extends StatelessWidget {
  const _CatalogNotice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5DF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFFB97800)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
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

class _PlanCard extends StatelessWidget {
  const _PlanCard({
    required this.offer,
    required this.processing,
    required this.purchaseBlocked,
    required this.onSelect,
  });

  final SubscriptionOffer offer;
  final bool processing;
  final bool purchaseBlocked;
  final VoidCallback onSelect;

  SubscriptionPlan get plan => offer.plan;

  Color get accent => switch (plan.id) {
    'quarterly' => QmColors.pink,
    'semiannual' => const Color(0xFFFF7A54),
    _ => QmColors.purple,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: plan.popular ? accent.withValues(alpha: .5) : QmColors.border,
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
                colors: [accent, Color.lerp(accent, Colors.pink, .32)!],
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
                Flexible(
                  child: Text(
                    offer.priceLabel,
                    textAlign: TextAlign.end,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                if (!offer.canPurchase) ...[
                  const SizedBox(width: 5),
                  const Text(
                    'ج.م',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
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
                          color: accent,
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
                    onPressed: offer.canPurchase && !purchaseBlocked
                        ? onSelect
                        : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                      disabledBackgroundColor: accent.withValues(alpha: .35),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: processing
                        ? const SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.5,
                            ),
                          )
                        : Text(
                            offer.canPurchase
                                ? 'اشترك في ${plan.duration}'
                                : 'بانتظار تفعيل المتجر',
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

class _RenewalNote extends StatelessWidget {
  const _RenewalNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: QmColors.lavender.withValues(alpha: .65),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        children: [
          Icon(Icons.notifications_active_outlined, color: QmColors.purple),
          SizedBox(width: 11),
          Expanded(
            child: Text(
              'سنرسل لك إشعارًا داخل التطبيق قبل موعد التجديد بثلاثة أيام. التجديد والإلغاء تتم إدارتهما بأمان من المتجر.',
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
      child: const Row(
        children: [
          Icon(Icons.volunteer_activism_rounded, color: QmColors.success),
          SizedBox(width: 11),
          Expanded(
            child: Text(
              'كورس التأسيس يظل مجانيًا بالكامل بعد إنشاء الحساب، بدون اشتراك.',
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

class _PurchaseLegalLinks extends StatelessWidget {
  const _PurchaseLegalLinks();

  Future<void> _open(BuildContext context, String url) async {
    final opened = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'تعذّر فتح الرابط. حاول مرة أخرى.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 8,
      children: [
        TextButton(
          onPressed: () =>
              _open(context, 'https://www.qudratmaghrabi.com/terms'),
          child: const Text('الشروط والأحكام'),
        ),
        TextButton(
          onPressed: () =>
              _open(context, 'https://www.qudratmaghrabi.com/privacy'),
          child: const Text('سياسة الخصوصية'),
        ),
      ],
    );
  }
}
