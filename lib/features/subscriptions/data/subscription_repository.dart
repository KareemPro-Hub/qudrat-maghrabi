import 'package:flutter/foundation.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/subscription_plan.dart';

enum SubscriptionUpdateType { pending, verified, restored, cancelled, error }

@immutable
class SubscriptionUpdate {
  const SubscriptionUpdate({
    required this.type,
    required this.message,
    this.productId,
  });

  final SubscriptionUpdateType type;
  final String message;
  final String? productId;
}

@immutable
class SubscriptionOffer {
  const SubscriptionOffer({
    required this.plan,
    required this.priceLabel,
    required this.canPurchase,
  });

  factory SubscriptionOffer.fallback(SubscriptionPlan plan) {
    return SubscriptionOffer(
      plan: plan,
      priceLabel: plan.fallbackPriceSar.toStringAsFixed(0),
      canPurchase: false,
    );
  }

  final SubscriptionPlan plan;
  final String priceLabel;
  final bool canPurchase;
}

@immutable
class SubscriptionCatalog {
  const SubscriptionCatalog({
    required this.storeAvailable,
    required this.offers,
    this.notice,
  });

  final bool storeAvailable;
  final List<SubscriptionOffer> offers;
  final String? notice;

  SubscriptionOffer offerFor(SubscriptionPlan plan) {
    return offers.firstWhere(
      (offer) => offer.plan.productId == plan.productId,
      orElse: () => SubscriptionOffer.fallback(plan),
    );
  }

  static SubscriptionCatalog unavailable({String? notice}) {
    return SubscriptionCatalog(
      storeAvailable: false,
      offers: [
        for (final plan in SubscriptionPlan.all)
          SubscriptionOffer.fallback(plan),
      ],
      notice: notice,
    );
  }
}

abstract interface class SubscriptionRepository {
  Stream<SubscriptionUpdate> get updates;

  Future<StudentSubscription?> loadCurrentSubscription();

  Future<SubscriptionCatalog> loadCatalog();

  Future<void> purchase(SubscriptionPlan plan);

  Future<void> restorePurchases();

  Future<void> openSubscriptionManagement();
}

class UnavailableSubscriptionRepository implements SubscriptionRepository {
  const UnavailableSubscriptionRepository();

  @override
  Stream<SubscriptionUpdate> get updates => const Stream.empty();

  @override
  Future<StudentSubscription?> loadCurrentSubscription() async => null;

  @override
  Future<SubscriptionCatalog> loadCatalog() async {
    return SubscriptionCatalog.unavailable(
      notice: 'سيُتاح الشراء بعد تفعيل منتجات الاشتراك في المتجر.',
    );
  }

  @override
  Future<void> openSubscriptionManagement() async {}

  @override
  Future<void> purchase(SubscriptionPlan plan) async {}

  @override
  Future<void> restorePurchases() async {}
}
