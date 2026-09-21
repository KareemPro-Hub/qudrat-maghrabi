abstract final class AppMetadata {
  // لازم يفضلوا مطابقين لـ version في pubspec.yaml
  static const versionName = '1.1.5';
  static const buildNumber = '17';
  static const versionLabel = '$versionName ($buildNumber)';
  static const supportEmail = 'support@qudratmaghrabi.com';

  /// معرّف التطبيق في App Store — يُستخدم لسؤال أبل عن آخر نسخة منشورة.
  static const appStoreTrackId = '6799747012';

  // رقم دعم واتساب — بصيغة أرقام فقط (بدون + أو مسافات) لاستخدامه في روابط wa.me
  static const supportWhatsappNumber = '966507069605';
  static const supportWhatsappDisplay = '+966 50 706 9605';
}
