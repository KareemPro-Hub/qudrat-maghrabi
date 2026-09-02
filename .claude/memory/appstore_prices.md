---
name: appstore-prices
description: أسعار اشتراكات App Store لتطبيق قدرات المغربي ومعرّفاتها، ومطابقتها لأسعار الويب والتطبيق
type: project
---
- App ID: 6799747012 · مجموعة الاشتراكات: 22298138.
- معرّفات الاشتراكات: شهري 6799766925 · 3 أشهر 6799770061 · 6 أشهر 6799771402.
- بتاريخ 2026-08-31 ضُبطت أسعار App Store لتطابق أسعار الويب (عرض الافتتاح)، سارية من 1 سبتمبر 2026 لكل الـ175 دولة بقاعدة السعر السعودي:
  19.99 SAR (بدل 79) · 39.99 SAR (بدل 199) · 59.99 SAR (بدل 299).
- Existing subscribers: Price not preserved — المشتركون الحاليون ينتقلون للسعر الأقل.
- التطبيق يعرض سعر المتجر الحيّ من `_products[productId].price`؛ لا يحتاج بناءً جديدًا لتغيير السعر.
- Commit 8b7cffd (فرع flutter-app): حُدّثت الأسعار الاحتياطية في `subscription_plan.dart` إلى 19.99/39.99/59.99 وأُضيفت `fallbackPriceLabel` لأن `toStringAsFixed(0)` كان يحوّل 19.99 إلى "20".
- `lib/features/subscriptions/presentation/subscription_screen.dart` كود ميت غير مستخدم وما زال يحمل 79/199/299 — لم يُلمس.

**Why:** أسعار الويب في المنصة 19/39/59 ريال، وكان فيه تفاوت كبير مع أسعار المتجر.
**How to apply:** أسعار App Store منفصلة تمامًا عن أسعار الويب وPaymob وGoogle Play — لا تخلطهم. للتحقق: صفحة `/distribution/subscriptions/<id>/pricing` ثم فتح صف Upcoming Prices وقراءة سطر Saudi Arabia (SAR)؛ الجدول 175 صفًا ومُحاكى (virtualized) فاستخدم تمرير الحاوية بـ JS بنسبة ~0.745 للوصول للسعودية.
