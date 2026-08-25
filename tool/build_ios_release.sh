#!/bin/zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
CONFIG_FILE="${1:-$ROOT_DIR/config/supabase.dev.json}"

"$ROOT_DIR/tool/configure_ios_release.sh" "$CONFIG_FILE"

cd "$ROOT_DIR"
flutter build ipa --release --dart-define-from-file="$CONFIG_FILE"

APP_BINARY="$ROOT_DIR/build/ios/archive/Runner.xcarchive/Products/Applications/Runner.app/Frameworks/App.framework/App"
SUPABASE_URL="$(/usr/bin/plutil -extract SUPABASE_URL raw -o - "$CONFIG_FILE")"

if [[ ! -f "$APP_BINARY" ]] || ! /usr/bin/grep -aFq "$SUPABASE_URL" "$APP_BINARY"; then
  print -u2 "فشل التحقق: إعدادات المنصة غير موجودة داخل بناء iOS."
  exit 1
fi

print "تم بناء iOS والتحقق من وجود إعدادات المنصة داخل التطبيق."
