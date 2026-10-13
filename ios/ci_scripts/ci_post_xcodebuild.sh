#!/bin/sh
set -eu
if [ "${CI_XCODEBUILD_ACTION:-}" = "archive" ]; then
  : "${CI_ARCHIVE_PATH:?Archive path is required}"
  : "${CI_BUILD_NUMBER:?Cloud build number is required}"
  python3 "$CI_PRIMARY_REPOSITORY_PATH/tool/verify_release_config.py" \
    "$CI_PRIMARY_REPOSITORY_PATH/config/supabase.ci.json" \
    --expected-build "$CI_BUILD_NUMBER" \
    --xcconfig "$CI_PRIMARY_REPOSITORY_PATH/ios/Flutter/Secrets.xcconfig" \
    --xcconfig "$CI_PRIMARY_REPOSITORY_PATH/ios/Flutter/Generated.xcconfig" \
    --archive "$CI_ARCHIVE_PATH"
fi
