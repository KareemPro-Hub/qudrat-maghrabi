import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/subscription_plan.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/presentation/store_subscription_screen.dart';

class _FakeStoreRepository implements SubscriptionRepository {
  _FakeStoreRepository({this.localizedMonthlyPrice, this.currentSubscription});

  final String? localizedMonthlyPrice;
  final StudentSubscription? currentSubscription;
  final controller = StreamController<SubscriptionUpdate>.broadcast();
  int purchaseCalls = 0;
  int restoreCalls = 0;
  int manageCalls = 0;
  SubscriptionPlan? purchasedPlan;

  @override
  Stream<SubscriptionUpdate> get updates => controller.stream;

  @override
  Future<StudentSubscription?> loadCurrentSubscription() async {
    return currentSubscription;
  }

  @override
  Future<SubscriptionCatalog> loadCatalog() async {
    return SubscriptionCatalog(
      storeAvailable: true,
      offers: [
        for (final plan in SubscriptionPlan.all)
          SubscriptionOffer(
            plan: plan,
            priceLabel:
                plan == SubscriptionPlan.monthly &&
                    localizedMonthlyPrice != null
                ? localizedMonthlyPrice!
                : plan.fallbackPriceSar.toStringAsFixed(0),
            canPurchase: true,
          ),
      ],
    );
  }

  @override
  Future<void> purchase(SubscriptionPlan plan) async {
    purchaseCalls++;
    purchasedPlan = plan;
    controller.add(
      SubscriptionUpdate(
        type: SubscriptionUpdateType.pending,
        productId: plan.productId,
        message: 'قيد التأكيد',
      ),
    );
  }

  @override
  Future<void> restorePurchases() async {
    restoreCalls++;
    controller.add(
      const SubscriptionUpdate(
        type: SubscriptionUpdateType.restored,
        message: 'تمت الاستعادة',
      ),
    );
  }

  @override
  Future<void> openSubscriptionManagement() async {
    manageCalls++;
  }

  Future<void> dispose() => controller.close();
}

Widget _app(_FakeStoreRepository repository) {
  return MaterialApp(
    locale: const Locale('ar'),
    home: Directionality(
      textDirection: TextDirection.rtl,
      child: StoreSubscriptionScreen(repository: repository),
    ),
  );
}

void main() {
  testWidgets('store plans start a real purchase through the repository', (
    tester,
  ) async {
    final repository = _FakeStoreRepository();
    addTearDown(repository.dispose);
    await tester.pumpWidget(_app(repository));
    await tester.pumpAndSettle();

    expect(find.text('افتح كل الكورسات'), findsOneWidget);
    expect(find.text('اشتراكك فعّال'), findsNothing);
    expect(find.textContaining('2036'), findsNothing);
    expect(find.byKey(const Key('manage-subscription-button')), findsNothing);
    expect(find.text('49'), findsOneWidget);
    expect(find.text('99'), findsOneWidget);
    final monthlyButton = find.byKey(const ValueKey('select-شهر واحد'));
    await tester.ensureVisible(monthlyButton);
    await tester.pumpAndSettle();
    await tester.tap(monthlyButton);
    await tester.pump();

    expect(repository.purchaseCalls, 1);
    expect(repository.purchasedPlan, SubscriptionPlan.monthly);
  });

  testWidgets('student can restore purchases and manage active renewal', (
    tester,
  ) async {
    final repository = _FakeStoreRepository(
      currentSubscription: StudentSubscription(
        bundleId: 'bundle',
        planName: 'الباقة المميزة',
        startedAt: DateTime(2026, 7, 1),
        expiresAt: DateTime(2026, 10, 1),
      ),
    );
    addTearDown(repository.dispose);
    await tester.pumpWidget(_app(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('restore-purchases-button')));
    await tester.pumpAndSettle();
    expect(repository.restoreCalls, 1);

    await tester.tap(find.byKey(const Key('manage-subscription-button')));
    await tester.pump();
    expect(repository.manageCalls, 1);
    await tester.scrollUntilVisible(
      find.textContaining('قبل موعد التجديد بثلاثة أيام'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('قبل موعد التجديد بثلاثة أيام'), findsOneWidget);
  });

  testWidgets('Saudi price uses the official Riyal symbol', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _FakeStoreRepository(
      localizedMonthlyPrice: 'ر.س. ١٩٫٩٩',
    );
    addTearDown(repository.dispose);
    await tester.pumpWidget(_app(repository));
    await tester.pumpAndSettle();

    expect(find.text('١٩٫٩٩'), findsOneWidget);
    expect(find.byKey(const Key('saudi-riyal-symbol')), findsWidgets);
    expect(find.textContaining('ر.س'), findsNothing);
    expect(find.text('ج.م'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
