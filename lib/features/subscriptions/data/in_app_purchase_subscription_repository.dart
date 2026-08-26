import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/store_subscription_parser.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/data/subscription_repository.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/student_subscription.dart';
import 'package:qudrat_maghrabi_app/features/subscriptions/domain/subscription_plan.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class InAppPurchaseSubscriptionRepository implements SubscriptionRepository {
  InAppPurchaseSubscriptionRepository(this._supabase, {InAppPurchase? store})
    : _store = store ?? InAppPurchase.instance {
    _purchaseSubscription = _store.purchaseStream.listen(
      _handlePurchases,
      onError: (Object error, StackTrace stackTrace) {
        _emitError('تعذّر متابعة عملية الشراء. حاول مرة أخرى.');
      },
    );
  }

  final SupabaseClient _supabase;
  final InAppPurchase _store;
  final _updates = StreamController<SubscriptionUpdate>.broadcast();
  final Map<String, ProductDetails> _products = {};
  late final StreamSubscription<List<PurchaseDetails>> _purchaseSubscription;

  @override
  Stream<SubscriptionUpdate> get updates => _updates.stream;

  @override
  Future<StudentSubscription?> loadCurrentSubscription() async {
    final studentId = _supabase.auth.currentUser?.id;
    if (studentId == null) return null;
    final response = await _supabase
        .from('store_subscriptions')
        .select(
          'product_id, status, purchased_at, current_period_start, '
          'current_period_end, store_subscription_plans!inner('
          'name_ar, bundle_course_id)',
        )
        .eq('student_id', studentId);
    final native = activeStoreSubscriptionFromRows(
      (response as List).cast<Map<String, dynamic>>(),
    );
    if (native != null) return native;
    // مفيش اشتراك عبر متجر التطبيقات، نتحقق من اشتراك مدفوع عبر المنصة
    // (الموقع/Paymob) عشان الطالب ما يفضلش شايف إنه غير مشترك رغم دفعه.
    return _loadWebEnrollmentSubscription(studentId);
  }

  Future<StudentSubscription?> _loadWebEnrollmentSubscription(
    String studentId,
  ) async {
    final plansResponse = await _supabase
        .from('store_subscription_plans')
        .select('bundle_course_id, name_ar')
        .not('bundle_course_id', 'is', null);
    final bundleIds = <String>{
      for (final row in (plansResponse as List).cast<Map<String, dynamic>>())
        if (row['bundle_course_id'] != null)
          row['bundle_course_id'] as String,
    };
    if (bundleIds.isEmpty) return null;

    final coursesResponse = await _supabase
        .from('courses')
        .select('id, title')
        .inFilter('id', bundleIds.toList());
    final bundleCourseNames = <String, String>{
      for (final row
          in (coursesResponse as List).cast<Map<String, dynamic>>())
        row['id'] as String:
            (row['title'] as String?)?.trim() ?? 'باقة المنصة',
    };

    final enrollmentsResponse = await _supabase
        .from('enrollments')
        .select('course_id, payment_status, expires_at, enrolled_at')
        .eq('student_id', studentId)
        .eq('payment_status', 'paid')
        .inFilter('course_id', bundleIds.toList());
    return activeEnrollmentSubscriptionFromRows(
      (enrollmentsResponse as List).cast<Map<String, dynamic>>(),
      bundleCourseNames: bundleCourseNames,
    );
  }

  @override
  Future<SubscriptionCatalog> loadCatalog() async {
    try {
      final available = await _store.isAvailable();
      if (!available) {
        return SubscriptionCatalog.unavailable(
          notice: 'متجر التطبيقات غير متاح حاليًا. حاول مرة أخرى لاحقًا.',
        );
      }

      final response = await _store.queryProductDetails(
        SubscriptionPlan.all.map((plan) => plan.productId).toSet(),
      );
      _products
        ..clear()
        ..addEntries(
          response.productDetails.map(
            (product) => MapEntry(product.id, product),
          ),
        );

      final offers = <SubscriptionOffer>[
        for (final plan in SubscriptionPlan.all)
          SubscriptionOffer(
            plan: plan,
            priceLabel:
                _products[plan.productId]?.price ??
                plan.fallbackPriceSar.toStringAsFixed(0),
            canPurchase: _products.containsKey(plan.productId),
          ),
      ];
      final missingProducts = response.notFoundIDs.isNotEmpty;
      return SubscriptionCatalog(
        storeAvailable: true,
        offers: offers,
        notice: response.error != null
            ? 'تعذّر تحميل بعض أسعار المتجر. حاول مرة أخرى.'
            : missingProducts
            ? 'ستظهر الأسعار النهائية بعد تفعيل منتجات الاشتراك في المتجر.'
            : null,
      );
    } catch (_) {
      return SubscriptionCatalog.unavailable(
        notice:
            'تعذّر الاتصال بمتجر التطبيقات. تحقق من الإنترنت وحاول مرة أخرى.',
      );
    }
  }

  @override
  Future<void> purchase(SubscriptionPlan plan) async {
    final product = _products[plan.productId];
    if (product == null) {
      _emitError('هذه الباقة غير متاحة للشراء من المتجر حاليًا.');
      return;
    }
    try {
      final started = await _store.buyNonConsumable(
        purchaseParam: PurchaseParam(
          productDetails: product,
          applicationUserName: _supabase.auth.currentUser?.id,
        ),
      );
      if (!started) _emitError('تعذّر بدء عملية الشراء. حاول مرة أخرى.');
    } catch (_) {
      _emitError('تعذّر بدء عملية الشراء. حاول مرة أخرى.');
    }
  }

  @override
  Future<void> restorePurchases() async {
    try {
      _updates.add(
        const SubscriptionUpdate(
          type: SubscriptionUpdateType.pending,
          message: 'جارٍ استعادة مشترياتك…',
        ),
      );
      await _store.restorePurchases();
    } catch (_) {
      _emitError('تعذّرت استعادة المشتريات. حاول مرة أخرى.');
    }
  }

  @override
  Future<void> openSubscriptionManagement() async {
    final uri = switch (defaultTargetPlatform) {
      TargetPlatform.iOS || TargetPlatform.macOS => Uri.parse(
        'https://apps.apple.com/account/subscriptions',
      ),
      _ => Uri.parse(
        'https://play.google.com/store/account/subscriptions'
        '?package=com.qudratmaghrabi.app',
      ),
    };
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _emitError('تعذّر فتح إدارة الاشتراك. حاول مرة أخرى.');
    }
  }

  Future<void> _handlePurchases(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      switch (purchase.status) {
        case PurchaseStatus.pending:
          _updates.add(
            SubscriptionUpdate(
              type: SubscriptionUpdateType.pending,
              productId: purchase.productID,
              message: 'عملية الشراء قيد التأكيد…',
            ),
          );
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          await _verifyAndDeliver(purchase);
        case PurchaseStatus.canceled:
          _updates.add(
            SubscriptionUpdate(
              type: SubscriptionUpdateType.cancelled,
              productId: purchase.productID,
              message: 'تم إلغاء عملية الشراء.',
            ),
          );
        case PurchaseStatus.error:
          _emitError(
            purchase.error?.message ?? 'لم تكتمل عملية الشراء. حاول مرة أخرى.',
            productId: purchase.productID,
          );
      }
    }
  }

  Future<void> _verifyAndDeliver(PurchaseDetails purchase) async {
    try {
      final response = await _supabase.functions.invoke(
        'verify-store-purchase',
        body: {
          'platform': defaultTargetPlatform == TargetPlatform.iOS
              ? 'apple'
              : 'google',
          'product_id': purchase.productID,
          'purchase_id': purchase.purchaseID,
          'transaction_date': purchase.transactionDate,
          'verification_source': purchase.verificationData.source,
          'server_verification_data':
              purchase.verificationData.serverVerificationData,
        },
      );
      final data = response.data;
      final verified = data is Map && data['verified'] == true;
      final entitled = data is Map && data['entitled'] == true;
      if (!verified) {
        final message = data is Map ? data['error']?.toString() : null;
        _emitError(
          message ??
              'تعذّر التحقق من الاشتراك. لن يتم خصم حقك، وحاول الاستعادة لاحقًا.',
          productId: purchase.productID,
        );
        return;
      }

      if (purchase.pendingCompletePurchase) {
        await _store.completePurchase(purchase);
      }
      if (!entitled) {
        _emitError(
          'تم التحقق من عملية الشراء، لكن لا يوجد اشتراك فعّال حاليًا.',
          productId: purchase.productID,
        );
        return;
      }
      _updates.add(
        SubscriptionUpdate(
          type: purchase.status == PurchaseStatus.restored
              ? SubscriptionUpdateType.restored
              : SubscriptionUpdateType.verified,
          productId: purchase.productID,
          message: purchase.status == PurchaseStatus.restored
              ? 'تمت استعادة اشتراكك وتحديث الوصول بنجاح.'
              : 'تم تفعيل اشتراكك بنجاح. استمتع بكل كورسات المنصة !',
        ),
      );
    } on FunctionException catch (error) {
      final details = error.details;
      final message = details is Map ? details['error']?.toString() : null;
      _emitError(
        message ?? 'تعذّر التحقق من الاشتراك الآن. حاول الاستعادة لاحقًا.',
        productId: purchase.productID,
      );
    } catch (_) {
      _emitError(
        'تعذّر التحقق من الاشتراك الآن. حاول الاستعادة لاحقًا.',
        productId: purchase.productID,
      );
    }
  }

  void _emitError(String message, {String? productId}) {
    _updates.add(
      SubscriptionUpdate(
        type: SubscriptionUpdateType.error,
        productId: productId,
        message: message,
      ),
    );
  }

  Future<void> dispose() async {
    await _purchaseSubscription.cancel();
    await _updates.close();
  }
}
