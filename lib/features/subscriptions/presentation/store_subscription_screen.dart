import 'dart:async';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_colors.dart';
import 'package:qudrat_maghrabi_app/core/theme/qm_gradients.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/subscription_plan.dart';
import 'package:url_launcher/url_launcher.dart';

@visibleForTesting
String storePriceLabelForDisplay(String priceLabel) {
  var value = priceLabel.replaceAll(RegExp(r'[\u061C\u200E\u200F]'), '').trim();
  final upperValue = value.toUpperCase();

  if (upperValue.startsWith(r'US$') || upperValue.startsWith(r'$US')) {
    value = '\$${value.substring(3).trimLeft()}';
  } else if (upperValue.startsWith('USD')) {
    value = '\$${value.substring(3).trimLeft()}';
  }

  return value.replaceFirst(RegExp(r'^\$\s+'), r'$');
}

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
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: isDark
              ? const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF100B18), Color(0xFF171021)],
                )
              : QmGradients.softBackground,
        ),
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
                  backgroundColor: scheme.surface.withValues(alpha: .96),
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
                              color: scheme.onSurface,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'اشتراك متجدد تلقائيًا يفتح كل كورسات المنصة المدفوعة، ويمكن إلغاؤه من المتجر في أي وقت.',
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
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
                                Padding(
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
    final scheme = Theme.of(context).colorScheme;
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
                    colors: [scheme.surface, scheme.surfaceContainerHighest],
                  ),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: active
                  ? Colors.white.withValues(alpha: .8)
                  : scheme.outlineVariant,
            ),
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
                      : scheme.secondaryContainer,
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
                        color: active ? Colors.white : scheme.onSurface,
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
                            : scheme.onSurfaceVariant,
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
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline_rounded, color: scheme.onSecondaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: scheme.onSecondaryContainer,
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
      start: Color(0xFF8A0A55),
      end: Color(0xFFF01D91),
      accent: Color(0xFFDD0877),
      ink: Color(0xFF4C1032),
    ),
    'semiannual' => const _PlanPalette(
      start: Color(0xFF9E3715),
      end: Color(0xFFFF9142),
      accent: Color(0xFFFF6F3F),
      ink: Color(0xFF54230F),
    ),
    _ => const _PlanPalette(
      start: Color(0xFF4B0D73),
      end: Color(0xFFB31EF5),
      accent: Color(0xFF7A2DDA),
      ink: Color(0xFF25103F),
    ),
  };

  String get sectionTitle => switch (plan.id) {
    'quarterly' => 'تقدّم أسرع بخطة أكثر مرونة',
    'semiannual' => 'استعداد شامل حتى موعد الاختبار',
    _ => 'كل ما تحتاجه لبداية قوية',
  };

  @override
  Widget build(BuildContext context) {
    final colors = palette;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      key: ValueKey('plan-card-${plan.id}'),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: scheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: colors.accent.withValues(alpha: .16),
            blurRadius: 32,
            offset: const Offset(0, 17),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PlanGlassHeader(
            offer: offer,
            palette: colors,
            popular: plan.popular,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  sectionTitle,
                  style: TextStyle(
                    color: scheme.onSurface,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 18),
                for (final benefit in plan.benefits)
                  _BenefitRow(benefit: benefit, palette: colors),
                const SizedBox(height: 10),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: offer.canPurchase && !purchaseBlocked
                        ? LinearGradient(colors: [colors.start, colors.accent])
                        : null,
                    color: offer.canPurchase && !purchaseBlocked
                        ? null
                        : scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: offer.canPurchase && !purchaseBlocked
                        ? [
                            BoxShadow(
                              color: colors.accent.withValues(alpha: .24),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ]
                        : null,
                  ),
                  child: FilledButton(
                    key: ValueKey('select-${plan.duration}'),
                    onPressed: offer.canPurchase && !purchaseBlocked
                        ? onSelect
                        : null,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(54),
                      backgroundColor: Colors.transparent,
                      disabledBackgroundColor: Colors.transparent,
                      foregroundColor: Colors.white,
                      disabledForegroundColor: scheme.onSurfaceVariant,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                    ),
                    child: processing
                        ? const SizedBox.square(
                            dimension: 21,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.4,
                            ),
                          )
                        : Text(
                            offer.canPurchase
                                ? 'اختر الباقة ${plan.name}'
                                : 'بانتظار تفعيل المتجر',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'دفع آمن عبر متجر التطبيقات',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
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

class _PlanGlassHeader extends StatelessWidget {
  const _PlanGlassHeader({
    required this.offer,
    required this.palette,
    required this.popular,
  });

  final SubscriptionOffer offer;
  final _PlanPalette palette;
  final bool popular;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      key: ValueKey('plan-header-${offer.plan.id}'),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [palette.start, palette.end],
        ),
      ),
      child: Stack(
        fit: StackFit.passthrough,
        clipBehavior: Clip.hardEdge,
        children: [
          Positioned(
            top: -64,
            left: -36,
            child: _GlowCircle(
              size: 190,
              color: Colors.white.withValues(alpha: .10),
            ),
          ),
          Positioned(
            bottom: -84,
            right: 38,
            child: _GlowCircle(
              size: 180,
              color: Colors.white.withValues(alpha: .08),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(22),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 18,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .11),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: .38),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.white.withValues(alpha: .10),
                        blurRadius: 18,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (popular) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 11,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: .18),
                            borderRadius: BorderRadius.circular(99),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: .34),
                            ),
                          ),
                          child: const Text(
                            'الأكثر اختيارًا',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        const SizedBox(height: 7),
                      ],
                      Text(
                        offer.plan.name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 29,
                          fontWeight: FontWeight.w900,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        'اشتراك لمدة ${offer.plan.duration}',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: .84),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _PlanPrice(offer: offer),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanPrice extends StatelessWidget {
  const _PlanPrice({required this.offer});

  final SubscriptionOffer offer;

  static final _sarPattern = RegExp(
    r'(?:ر\s*\.?\s*س\s*\.?|SAR|﷼)',
    caseSensitive: false,
  );
  static final _numericPattern = RegExp(r'^[\d٠-٩۰-۹\s.,٫٬]+$');
  static final _bidiPattern = RegExp(r'[\u061C\u200E\u200F]');

  String get _normalizedLabel =>
      offer.priceLabel.replaceAll(_bidiPattern, '').trim();

  bool get _usesSaudiRiyal {
    final label = _normalizedLabel;
    return _showSaudiPreview ||
        !offer.canPurchase ||
        _sarPattern.hasMatch(label) ||
        _numericPattern.hasMatch(label);
  }

  bool get _showSaudiPreview =>
      kDebugMode && RegExp(r'[$€£]').hasMatch(_normalizedLabel);

  String get _amountLabel {
    if (_showSaudiPreview) {
      return offer.plan.fallbackPriceSar.toStringAsFixed(0);
    }
    final amount = _normalizedLabel.replaceAll(_sarPattern, '').trim();
    return amount.isEmpty
        ? offer.plan.fallbackPriceSar.toStringAsFixed(0)
        : amount;
  }

  @override
  Widget build(BuildContext context) {
    if (!_usesSaudiRiyal) {
      return FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          storePriceLabelForDisplay(offer.priceLabel),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 48,
            fontWeight: FontWeight.w800,
            height: .9,
          ),
        ),
      );
    }

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Image.asset(
              'assets/brand/saudi_riyal_symbol.png',
              key: const Key('saudi-riyal-symbol'),
              width: 31,
              height: 36,
              fit: BoxFit.contain,
              color: Colors.white,
              colorBlendMode: BlendMode.srcIn,
              semanticLabel: 'ريال سعودي',
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                _amountLabel,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 60,
                  fontWeight: FontWeight.w500,
                  height: .86,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BenefitRow extends StatelessWidget {
  const _BenefitRow({required this.benefit, required this.palette});

  final SubscriptionBenefit benefit;
  final _PlanPalette palette;

  @override
  Widget build(BuildContext context) {
    final included = benefit.included;
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 27,
            height: 27,
            decoration: BoxDecoration(
              color: included
                  ? const Color(0xFF19B889)
                  : scheme.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Icon(
              included ? Icons.check_rounded : Icons.remove_rounded,
              color: included ? Colors.white : scheme.onSurfaceVariant,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              benefit.text,
              style: TextStyle(
                color: included ? scheme.onSurface : scheme.onSurfaceVariant,
                fontWeight: included ? FontWeight.w800 : FontWeight.w500,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GlowCircle extends StatelessWidget {
  const _GlowCircle({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _PlanPalette {
  const _PlanPalette({
    required this.start,
    required this.end,
    required this.accent,
    required this.ink,
  });

  final Color start;
  final Color end;
  final Color accent;
  final Color ink;
}

class _FreeCourseNote extends StatelessWidget {
  const _FreeCourseNote();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: scheme.tertiaryContainer,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(
            Icons.volunteer_activism_rounded,
            color: scheme.onTertiaryContainer,
          ),
          SizedBox(width: 11),
          Expanded(
            child: Text(
              'ابدأ بثلاث حصص مجانية من دورة التأسيس، واكتشف أسلوب الشرح قبل اختيار باقتك.',
              style: TextStyle(
                color: scheme.onTertiaryContainer,
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
