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
# ⚠️ المكان الصح: جذر المستودع (أبل بتدوّر على ci_scripts/ci_post_clone.sh)،
# ولازم يكون executable في Git (100755) وإلا أبل تقول "script not found".

set -e

# لو Flutter موجود من محاولة سابقة على نفس العامل، ما نستنسخهوش تاني.
if [ -d "$HOME/flutter/bin" ]; then
  export PATH="$HOME/flutter/bin:$PATH"
  echo "▸ Flutter موجود بالفعل"
  SKIP_FLUTTER_CLONE=1
fi

REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
FLUTTER_VERSION="${FLUTTER_VERSION:-3.47.2}"

if [ -z "$SKIP_FLUTTER_CLONE" ]; then
  echo "▸ تثبيت Flutter $FLUTTER_VERSION"
  git clone --depth 1 --branch "$FLUTTER_VERSION" \
    https://github.com/flutter/flutter.git "$HOME/flutter"
  export PATH="$HOME/flutter/bin:$PATH"
fi
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

# المشروع بيستخدم SwiftPM مش CocoaPods؛ الخطوة دي بتتنفّذ لو بس فيه Podfile.
if [ -f "$REPO_ROOT/ios/Podfile" ]; then
  echo "▸ CocoaPods"
  cd "$REPO_ROOT/ios"
  pod install
else
  echo "▸ مفيش Podfile — تخطّي CocoaPods"
fi

echo "✓ جاهز للبناء"
