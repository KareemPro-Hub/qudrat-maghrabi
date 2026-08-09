# تطبيق قدرات المغربي

تطبيق Flutter عربي للطلاب وأولياء الأمور، ويدعم iOS وAndroid.

## التشغيل والبناء

ضع إعدادات Supabase المحلية في `config/supabase.dev.json`، ثم شغّل:

```bash
flutter run --dart-define-from-file=config/supabase.dev.json
```

فحوص الإصدار:

```bash
flutter analyze
flutter test
flutter build appbundle --release --dart-define-from-file=config/supabase.dev.json
flutter build ipa --release --dart-define-from-file=config/supabase.dev.json
```

يتطلب بناء Android النهائي ملف `android/key.properties` وملف مفتاح الرفع المحلي. لا تُحفظ بيانات التوقيع أو إعدادات Supabase الحقيقية في Git.

معرّف حزمة iOS: `com.alimaghrabi.qudrat.ios`.

معرّف حزمة Android: `com.qudratmaghrabi.app`.

معرّفات الاشتراكات:

- `com.qudratmaghrabi.app.subscription.monthly`
- `com.qudratmaghrabi.app.subscription.quarterly`
- `com.qudratmaghrabi.app.subscription.semiannual`
