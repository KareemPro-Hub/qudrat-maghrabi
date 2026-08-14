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
  const StoreSubscriptionScreen({required this.repository, super.key});

  final SubscriptionRepository repository;

  @override
  State<StoreSubscriptionScreen> createState() =>
      _StoreSubscriptionScreenState();
}

class _StoreSubscriptionScreenState extends State<StoreSubscriptionScreen> {
  late Future<SubscriptionCatalog> _catalogFuture;
  StreamSubscription<SubscriptionUpdate>? _updatesSubscription;
  StudentSubscription? _subscription;
  String? _processingProductId;
  bool _restoring = false;

  @override
  void initState() {
    super.initState();
    _catalogFuture = widget.repository.loadCatalog();
    unawaited(_loadSubscription());
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
      unawaited(_loadSubscription());
    }
  }

  Future<void> _loadSubscription() async {
    StudentSubscription? subscription;
    try {
      subscription = await widget.repository.loadCurrentSubscription();
    } catch (_) {
      subscription = null;
    }
    if (!mounted) return;
    setState(() => _subscription = subscription);
  }

  Future<void> _reloadCatalog() async {
    setState(() => _catalogFuture = widget.repository.loadCatalog());
    await Future.wait([_catalogFuture, _loadSubscription()]);
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
                      _SubscriptionHero(subscription: _subscription),
                      const SizedBox(height: 18),
                      _ManagementActions(
                        hasSubscription: _subscription != null,
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

  _PlanPalette get palette => switch (plan.id) {
    'quarterly' => const _PlanPalette(
      capStart: Color(0xFFDD0877),
      capEnd: Color(0xFFF01D91),
      pocketStart: Color(0xFFFFC6DF),
      pocketEnd: Color(0xFFEB73B0),
      ink: Color(0xFF7A0C48),
    ),
    'semiannual' => const _PlanPalette(
      capStart: Color(0xFFFF6F3F),
      capEnd: Color(0xFFFF9142),
      pocketStart: Color(0xFFFFD7C5),
      pocketEnd: Color(0xFFF89E79),
      ink: Color(0xFF7A3410),
    ),
    _ => const _PlanPalette(
      capStart: Color(0xFF7025ED),
      capEnd: Color(0xFFA52CF3),
      pocketStart: Color(0xFFD9C4FF),
      pocketEnd: Color(0xFF9D77EF),
      ink: Color(0xFF3F1568),
    ),
  };

  @override
  Widget build(BuildContext context) {
    final colors = palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 6, 4, 22),
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 126),
            child: ClipPath(
              clipper: const _PlanPocketClipper(),
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(minHeight: 390),
                padding: const EdgeInsets.fromLTRB(28, 72, 28, 24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                    colors: [colors.pocketStart, colors.pocketEnd],
                  ),
                  border: Border.all(color: Colors.white.withValues(alpha: .7)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x3A2F1D62),
                      blurRadius: 28,
                      offset: Offset(0, 18),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    for (final benefit in plan.benefits)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x1F371554),
                                    blurRadius: 10,
                                    offset: Offset(0, 5),
                                  ),
                                ],
                              ),
                              child: Icon(
                                benefit.included
                                    ? Icons.check_rounded
                                    : Icons.close_rounded,
                                color: benefit.included
                                    ? const Color(0xFF23A374)
                                    : const Color(0xFFFF5A68),
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                benefit.text,
                                style: TextStyle(
                                  color: benefit.included
                                      ? colors.ink
                                      : colors.ink.withValues(alpha: .55),
                                  fontWeight: benefit.included
                                      ? FontWeight.w800
                                      : FontWeight.w500,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        key: ValueKey('select-${plan.duration}'),
                        onPressed: offer.canPurchase && !purchaseBlocked
                            ? onSelect
                            : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: .24),
                          disabledBackgroundColor: Colors.white.withValues(
                            alpha: .20,
                          ),
                          foregroundColor: Colors.white,
                          disabledForegroundColor: colors.ink.withValues(
                            alpha: .42,
                          ),
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: .48),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: processing
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.4,
                                ),
                              )
                            : const Icon(Icons.arrow_back_rounded, size: 20),
                        label: Text(
                          offer.canPurchase
                              ? 'ابدأ الآن'
                              : 'بانتظار تفعيل المتجر',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Container(
            width: 260,
            constraints: const BoxConstraints(minHeight: 158),
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 34),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
                colors: [colors.capStart, colors.capEnd],
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20),
                bottom: Radius.circular(5),
              ),
              boxShadow: [
                BoxShadow(
                  color: colors.capStart.withValues(alpha: .34),
                  blurRadius: 24,
                  offset: const Offset(0, 13),
                ),
              ],
            ),
            child: Stack(
              children: [
                Positioned(
                  top: -42,
                  right: -32,
                  child: Container(
                    width: 150,
                    height: 90,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        plan.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          height: 1.15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'لمدة ${plan.duration}',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: .9),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 13),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Flexible(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                offer.priceLabel,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 46,
                                  fontWeight: FontWeight.w900,
                                  height: .9,
                                ),
                              ),
                            ),
                          ),
                          if (!offer.canPurchase) ...[
                            const SizedBox(width: 7),
                            const Padding(
                              padding: EdgeInsets.only(bottom: 3),
                              child: Text(
                                'ر.س',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
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

class _PlanPalette {
  const _PlanPalette({
    required this.capStart,
    required this.capEnd,
    required this.pocketStart,
    required this.pocketEnd,
    required this.ink,
  });

  final Color capStart;
  final Color capEnd;
  final Color pocketStart;
  final Color pocketEnd;
  final Color ink;
}

class _PlanPocketClipper extends CustomClipper<Path> {
  const _PlanPocketClipper();

  @override
  Path getClip(Size size) {
    const notchDepth = 30.0;
    final notchStart = size.width * .23;
    final notchEnd = size.width * .77;
    return Path()
      ..moveTo(0, 0)
      ..lineTo(size.width * .17, 0)
      ..lineTo(notchStart, notchDepth)
      ..lineTo(notchEnd, notchDepth)
      ..lineTo(size.width * .83, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width, size.height - 28)
      ..quadraticBezierTo(size.width, size.height, size.width - 28, size.height)
      ..lineTo(28, size.height)
      ..quadraticBezierTo(0, size.height, 0, size.height - 28)
      ..close();
  }

  @override
  bool shouldReclip(covariant _PlanPocketClipper oldClipper) => false;
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
