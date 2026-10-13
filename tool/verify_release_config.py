#!/usr/bin/env python3
"""Fail closed on unusable production connection settings; never log keys."""
import argparse
import datetime
import subprocess
import tempfile
import base64
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROJECT_URL = "https://zjmxvunmokqjzexvqrla.supabase.co"
EXPECTED_BUNDLE_ID = "com.alimaghrabi.qudrat.ios"
def release_metadata():
    root = Path(__file__).resolve().parent.parent
    match = re.search(r"^version:\s*(\d+\.\d+\.\d+)\+(\d+)\s*$", (root / "pubspec.yaml").read_text(), re.MULTILINE)
    if not match:
        raise ValueError("Release version is missing")
    return match.groups()


EXPECTED_VERSION, EXPECTED_BUILD = release_metadata()
EXPECTED_TEAM_ID = "ZJ9N48228T"
EXPECTED_PLATFORM_URL = "https://www.qudratmaghrabi.com"


class ConfigurationError(Exception):
    pass


def validate_config(config):
    if not isinstance(config, dict):
        raise ConfigurationError("The configuration must be a JSON object.")
    if config.get("SUPABASE_URL") != PROJECT_URL:
        raise ConfigurationError("The production project URL is incorrect.")
    key = config.get("SUPABASE_PUBLISHABLE_KEY", "")
    if not isinstance(key, str) or not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]{20,200}", key):
        raise ConfigurationError("A valid public publishable key is required.")
    platform_url = config.get("PLATFORM_BASE_URL")
    if platform_url is not None and platform_url != EXPECTED_PLATFORM_URL:
        raise ConfigurationError("The platform base URL is incorrect.")
    return key


def read_response(request):
    try:
        with urlopen(request, timeout=15) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        try:
            with error:
                body = json.load(error)
        except Exception:
            body = {}
        return error.code, body
    except Exception:
        raise ConfigurationError("Connection validation could not complete.") from None


def verify_connection(config):
    key = validate_config(config)
    headers = {"apikey": key, "Content-Type": "application/json"}
    status, body = read_response(Request(PROJECT_URL + "/auth/v1/settings", headers=headers))
    external = body.get("external") if isinstance(body, dict) else None
    if status != 200 or not isinstance(external, dict) or external.get("email") is not True:
        raise ConfigurationError("Email authentication configuration was rejected (HTTP %s)." % status)
    # An empty request must reach Auth and fail validation, not the API-key gateway.
    # No account, password or login session is used by this check.
    status, body = read_response(Request(PROJECT_URL + "/auth/v1/token?grant_type=password", data=b"{}", headers=headers))
    if status != 400 or not isinstance(body, dict) or body.get("error_code") != "validation_failed":
        raise ConfigurationError("The password authentication endpoint was rejected (HTTP %s)." % status)


def verify_binary_bytes(data, key, label="archive"):
    found_urls = set(re.findall(rb"https://[A-Za-z0-9.-]+\.supabase\.co", data))
    found_keys = set(re.findall(rb"sb_(?:publishable|secret)_[A-Za-z0-9_-]+", data))
    if found_urls != {PROJECT_URL.encode()} or found_keys != {key.encode()}:
        raise ConfigurationError("The %s does not contain the verified production configuration." % label)


def extract_provisioning_plist(data):
    start = data.find(b"<?xml")
    if start == -1:
        start = data.find(b"<plist")
    end = data.find(b"</plist>")
    if start != -1 and end != -1:
        try:
            return plistlib.loads(data[start:end + 8])
        except Exception:
            return None
    return None


def verify_archive(config, archive, expected_build=None):
    key = validate_config(config)
    binary = Path(archive) / "Products/Applications/Runner.app/Frameworks/App.framework/App"
    if not binary.is_file():
        raise ConfigurationError("The archived Flutter application binary is missing.")
    verify_binary_bytes(binary.read_bytes(), key, label="archive")
    info_plist = Path(archive) / "Products/Applications/Runner.app/Info.plist"
    if not info_plist.is_file():
        raise ConfigurationError("The archive metadata is missing.")
    if info_plist.is_file():
        try:
            info = plistlib.loads(info_plist.read_bytes())
            if info.get("CFBundleIdentifier") != EXPECTED_BUNDLE_ID:
                raise ConfigurationError("The archive bundle identifier does not match %s." % EXPECTED_BUNDLE_ID)
            if info.get("CFBundleShortVersionString") != EXPECTED_VERSION or info.get("CFBundleVersion") != (expected_build or EXPECTED_BUILD):
                raise ConfigurationError("The archive version does not match %s (%s)." % (EXPECTED_VERSION, expected_build or EXPECTED_BUILD))
        except (plistlib.InvalidFileException, KeyError):
            raise ConfigurationError("The archive metadata could not be verified.") from None


def verify_ipa(config, ipa_target, expected_build=None):
    key = validate_config(config)
    path = Path(ipa_target)
    if path.is_dir():
        ipa_files = sorted(path.glob("*.ipa"))
        if len(ipa_files) != 1:
            raise ConfigurationError("Expected exactly one IPA file in directory, found %d." % len(ipa_files))
        ipa_file = ipa_files[0]
    elif path.is_file():
        ipa_file = path
    else:
        raise ConfigurationError("The IPA file does not exist: %s" % path)

    try:
        with zipfile.ZipFile(ipa_file, "r") as zf:
            binary_name = "Payload/Runner.app/Frameworks/App.framework/App"
            if binary_name not in zf.namelist():
                raise ConfigurationError("The IPA binary is missing from the package.")
            verify_binary_bytes(zf.read(binary_name), key, label="IPA")

            info_name = "Payload/Runner.app/Info.plist"
            if info_name not in zf.namelist():
                raise ConfigurationError("The IPA metadata is missing.")
            if info_name in zf.namelist():
                info = plistlib.loads(zf.read(info_name))
                if info.get("CFBundleIdentifier") != EXPECTED_BUNDLE_ID:
                    raise ConfigurationError("The IPA bundle identifier does not match %s." % EXPECTED_BUNDLE_ID)
                if info.get("CFBundleShortVersionString") != EXPECTED_VERSION or info.get("CFBundleVersion") != (expected_build or EXPECTED_BUILD):
                    raise ConfigurationError("The IPA version does not match %s (%s)." % (EXPECTED_VERSION, expected_build or EXPECTED_BUILD))

            prov_name = "Payload/Runner.app/embedded.mobileprovision"
            if prov_name not in zf.namelist():
                raise ConfigurationError("The distribution profile is missing.")
            if prov_name in zf.namelist():
                prov = extract_provisioning_plist(zf.read(prov_name))
                if not isinstance(prov, dict):
                    raise ConfigurationError("The distribution profile cannot be decoded.")
                if prov:
                    expiry = prov.get("ExpirationDate")
                    if not isinstance(expiry, datetime.datetime) or expiry.replace(tzinfo=datetime.timezone.utc) <= datetime.datetime.now(datetime.timezone.utc):
                        raise ConfigurationError("The distribution profile has expired or has no expiry.")
                    if prov.get("ProvisionedDevices") is not None or prov.get("ProvisionsAllDevices") is True:
                        raise ConfigurationError("The profile is not for App Store distribution.")
                    team_ids = prov.get("TeamIdentifier") or []
                    if EXPECTED_TEAM_ID not in team_ids:
                        raise ConfigurationError("The IPA provisioning profile team does not match %s." % EXPECTED_TEAM_ID)
                    entitlements = prov.get("Entitlements") or {}
                    app_id = entitlements.get("application-identifier", "")
                    if app_id != EXPECTED_TEAM_ID + "." + EXPECTED_BUNDLE_ID:
                        raise ConfigurationError("The IPA application identifier does not match %s." % EXPECTED_BUNDLE_ID)
                    if entitlements.get("get-task-allow") is not False:
                        raise ConfigurationError("The IPA uses development signing, not distribution.")
    except (zipfile.BadZipFile, plistlib.InvalidFileException):
        raise ConfigurationError("The IPA package is corrupted.") from None
    verify_ipa_signature(ipa_file)


def verify_ipa_signature(ipa_file):
    validation_dir = Path(__file__).resolve().parent.parent / "build/release-verification"
    validation_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=validation_dir) as temp:
        with zipfile.ZipFile(ipa_file) as package:
            for member in package.namelist():
                if Path(member).is_absolute() or ".." in Path(member).parts:
                    raise ConfigurationError("Unsafe IPA package path.")
            package.extractall(temp)
        app = Path(temp) / "Payload/Runner.app"
        result = subprocess.run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(app)], capture_output=True)
        if result.returncode:
            raise ConfigurationError("The exported application signature is invalid.")
        result = subprocess.run(["/usr/bin/codesign", "-d", "--verbose=4", str(app)], capture_output=True, text=True)
        details = result.stderr
        if result.returncode or "TeamIdentifier=" + EXPECTED_TEAM_ID not in details or "Authority=Apple Distribution:" not in details:
            raise ConfigurationError("The IPA is not signed for distribution by the expected team.")


def verify_xcconfig(config, xcconfig_path):
    key = validate_config(config)
    path = Path(xcconfig_path)
    if not path.is_file():
        raise ConfigurationError("The xcconfig file is missing: %s" % path.name)
    content = path.read_text()
    match = re.search(r"^\s*DART_DEFINES\s*=\s*(.+)$", content, re.MULTILINE)
    if not match:
        raise ConfigurationError("The xcconfig file %s does not define DART_DEFINES." % path.name)
    raw_defines = match.group(1).strip().strip('"')
    defines = {}
    for part in raw_defines.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            decoded = base64.b64decode(part).decode("utf-8", errors="replace")
            if "=" in decoded:
                k, v = decoded.split("=", 1)
                defines[k] = v
        except Exception:
            continue
    if defines.get("SUPABASE_URL") != PROJECT_URL or defines.get("SUPABASE_PUBLISHABLE_KEY") != key:
        raise ConfigurationError("The xcconfig file %s does not match the verified release configuration." % path.name)
    if any(k.startswith("sb_secret_") or v.startswith("sb_secret_") for k, v in defines.items()):
        raise ConfigurationError("A secret key was detected in xcconfig %s." % path.name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path)
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--expected-build", help="Xcode Cloud build counter; local builds use pubspec")
    parser.add_argument("--ipa", type=Path)
    parser.add_argument("--xcconfig", type=Path, action="append")
    parser.add_argument("--no-network", action="store_true")
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text())
        if not isinstance(config, dict):
            raise ConfigurationError("The configuration must be a JSON object.")
        validate_config(config)
        if args.expected_build is not None and not re.fullmatch(r"[0-9]+(?:\.[0-9]+){0,2}", args.expected_build):
            raise ConfigurationError("Expected native build number is invalid.")
        if args.xcconfig:
            for xc in args.xcconfig:
                verify_xcconfig(config, xc)
        if args.archive:
            verify_archive(config, args.archive, expected_build=args.expected_build)
        if args.ipa:
            verify_ipa(config, args.ipa, expected_build=args.expected_build)
        if not args.no_network:
            verify_connection(config)
    except Exception as error:
        # File/JSON/transport errors are deliberately generic: do not expose source values or keys.
        message = str(error) if isinstance(error, ConfigurationError) else "Cannot read the release configuration."
        print("Release blocked: " + message, file=sys.stderr)
        return 1
    if args.no_network:
        print("Configuration checked locally; live connectivity was not tested.")
    else:
        print("Production connection verified: Auth settings and password endpoint accepted the public key.")
    if args.xcconfig:
        print("Verified xcconfig definitions match release configuration.")
    if args.archive:
        print("Archived application contains the verified configuration.")
    if args.ipa:
        print("Exported IPA contains the verified distribution configuration.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
