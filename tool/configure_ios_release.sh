#!/bin/zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
CONFIG_FILE="${1:-$ROOT_DIR/config/supabase.dev.json}"
OUTPUT_FILE="$ROOT_DIR/ios/Flutter/Secrets.xcconfig"

if [[ ! -f "$CONFIG_FILE" ]]; then
  print -u2 "ملف إعدادات النشر غير موجود: $CONFIG_FILE"
  exit 1
fi

encode_define() {
  print -n "$1" | /usr/bin/base64 | /usr/bin/tr -d '\n'
}

SUPABASE_URL="$(/usr/bin/plutil -extract SUPABASE_URL raw -o - "$CONFIG_FILE")"
SUPABASE_KEY="$(/usr/bin/plutil -extract SUPABASE_PUBLISHABLE_KEY raw -o - "$CONFIG_FILE")"
PLATFORM_URL="$(/usr/bin/plutil -extract PLATFORM_BASE_URL raw -o - "$CONFIG_FILE" 2>/dev/null || print -n 'https://www.qudratmaghrabi.com')"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]]; then
  print -u2 "إعدادات Supabase المطلوبة ناقصة."
  exit 1
fi

DEFINES="$(encode_define "SUPABASE_URL=$SUPABASE_URL"),$(encode_define "SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY"),$(encode_define "PLATFORM_BASE_URL=$PLATFORM_URL")"

{
  print '// Generated locally. Do not commit.'
  print "DART_DEFINES=$DEFINES"
} > "$OUTPUT_FILE"

print "تم تجهيز إعدادات بناء iOS الآمنة."
