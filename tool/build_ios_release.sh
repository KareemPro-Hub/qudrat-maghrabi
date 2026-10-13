#!/bin/zsh
set -euo pipefail

ROOT_DIR="${0:A:h:h}"
CONFIG_FILE="${1:-$ROOT_DIR/config/supabase.dev.json}"
ARCHIVE_PATH="$ROOT_DIR/build/ios/archive/Runner.xcarchive"
IPA_DIR="$ROOT_DIR/build/ios/ipa"
mkdir -p "$ROOT_DIR/build/ios"
EXPORT_OPTIONS_PLIST="$(mktemp "$ROOT_DIR/build/ios/export-options.XXXXXX")"
trap 'rm -f "$EXPORT_OPTIONS_PLIST"' EXIT

cat > "$EXPORT_OPTIONS_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>destination</key>
	<string>export</string>
	<key>method</key>
	<string>app-store-connect</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>teamID</key>
	<string>ZJ9N48228T</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
PLIST

python3 "$ROOT_DIR/tool/verify_release_config.py" "$CONFIG_FILE"

"$ROOT_DIR/tool/configure_ios_release.sh" "$CONFIG_FILE"


# Keep old artifacts as evidence and prevent a stale IPA from passing validation.
RUN_STAMP="$(date +%Y%m%d%H%M%S)-$$"
if [ -d "$ARCHIVE_PATH" ]; then mv "$ARCHIVE_PATH" "$ARCHIVE_PATH.previous.$RUN_STAMP"; fi
if [ -d "$IPA_DIR" ]; then mv "$IPA_DIR" "$IPA_DIR.previous.$RUN_STAMP"; fi

cd "$ROOT_DIR"
flutter build ipa --release \
  --dart-define-from-file="$CONFIG_FILE" \
  --export-options-plist="$EXPORT_OPTIONS_PLIST"

if ! ls "$IPA_DIR"/*.ipa >/dev/null 2>&1; then
  mkdir -p "$IPA_DIR"
  xcodebuild -exportArchive -allowProvisioningUpdates \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$IPA_DIR" \
    -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"
fi

if ! python3 "$ROOT_DIR/tool/verify_release_config.py" "$CONFIG_FILE" \
  --xcconfig "$ROOT_DIR/ios/Flutter/Secrets.xcconfig" \
  --xcconfig "$ROOT_DIR/ios/Flutter/Generated.xcconfig" \
  --archive "$ARCHIVE_PATH" \
  --ipa "$IPA_DIR"; then
    exit 1
fi

print "تم بناء iOS والتحقق من إعدادات الاتصال داخل الأرشيف وملف IPA ومع الخادم."
