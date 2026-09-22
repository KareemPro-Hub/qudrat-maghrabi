#!/bin/sh
# Xcode Cloud — يشتغل بعد استنساخ المستودع وقبل البناء.
# مهمته: تثبيت Flutter (سيرفر أبل مفيهوش Flutter)، وتوليد إعدادات Supabase
# من المتغيّرات السرية المحفوظة في App Store Connect، ثم تجهيز مشروع iOS.
#
# المتغيّرات السرية المطلوبة في Xcode Cloud (Environment Variables، Secret):
#   SUPABASE_URL
#   SUPABASE_PUBLISHABLE_KEY
#   PLATFORM_BASE_URL            (اختياري — الافتراضي موقع المنصة)
#   FLUTTER_VERSION              (اختياري — الافتراضي 3.47.2 = نفس نسخة الماك)
#
# القيم لا تُكتب في المستودع أبدًا — الملف المولَّد متجاهَل في .gitignore.
#
# ⚠️ النسخة دي موجودة في مكانين: جذر المستودع و ios/ci_scripts — لأن أبل
# بتدوّر على السكربت جنب مشروع Xcode، والمشروع هنا جوّه ios/.

set -e

REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
FLUTTER_VERSION="${FLUTTER_VERSION:-3.47.2}"

echo "▸ تثبيت Flutter $FLUTTER_VERSION"
git clone --depth 1 --branch "$FLUTTER_VERSION" \
  https://github.com/flutter/flutter.git "$HOME/flutter"
export PATH="$HOME/flutter/bin:$PATH"
flutter --version

echo "▸ التحقق من المتغيّرات السرية"
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "✗ SUPABASE_URL أو SUPABASE_PUBLISHABLE_KEY غير مضبوط في Xcode Cloud." >&2
  echo "  بدونهما التطبيق يُبنى ثم يسقط عند الإقلاع:" >&2
  echo "  StateError: Supabase configuration is missing" >&2
  exit 1
fi

echo "▸ توليد ملف الإعدادات"
CONFIG_FILE="$REPO_ROOT/config/supabase.ci.json"
mkdir -p "$REPO_ROOT/config"
cat > "$CONFIG_FILE" <<JSON
{
  "SUPABASE_URL": "$SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY": "$SUPABASE_PUBLISHABLE_KEY",
  "PLATFORM_BASE_URL": "${PLATFORM_BASE_URL:-https://www.qudratmaghrabi.com}"
}
JSON

echo "▸ تجهيز Secrets.xcconfig (نفس سكربت البناء المحلي)"
/bin/zsh "$REPO_ROOT/tool/configure_ios_release.sh" "$CONFIG_FILE"

echo "▸ جلب الحزم"
cd "$REPO_ROOT"
flutter precache --ios
flutter pub get

# لازم قبل أي خطوة Xcode: بيولّد Generated.xcconfig وحزم البلجنز المؤقتة
# (ios/Flutter/ephemeral/Packages/...) اللي مشروع Xcode بيعتمد عليها.
# من غيرها البناء بيفشل بـ"Could not resolve package dependencies".
echo "▸ تجهيز مشروع iOS"
flutter build ios --release --no-codesign --config-only \
  --dart-define-from-file="$CONFIG_FILE"

echo "▸ CocoaPods"
cd "$REPO_ROOT/ios"
pod install

echo "✓ جاهز للبناء"
