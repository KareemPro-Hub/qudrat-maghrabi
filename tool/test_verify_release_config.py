import base64
import datetime
import http.client
import importlib.util
import io
import json
import plistlib
import tempfile
import unittest
import zipfile
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("verifier", Path(__file__).with_name("verify_release_config.py"))
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
CONFIG = {"SUPABASE_URL": v.PROJECT_URL, "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_" + "x" * 32}


class ReleaseConfigurationTests(unittest.TestCase):
    def test_correct_endpoint_contract(self):
        with patch.object(v, "read_response", side_effect=[(200, {"external": {"email": True}}), (400, {"error_code": "validation_failed"})]) as read:
            v.verify_connection(CONFIG)
            self.assertEqual(read.call_count, 2)
            self.assertEqual(read.call_args.args[0].data, b"{}")

    def test_wrong_project_is_rejected_before_network(self):
        with patch.object(v, "read_response") as read:
            with self.assertRaises(v.ConfigurationError):
                v.verify_connection(dict(CONFIG, SUPABASE_URL="https://other.supabase.co"))
            read.assert_not_called()

    def test_bad_or_secret_keys_are_rejected_before_network(self):
        for key in ["", "sb_secret_" + "x" * 32, " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"], CONFIG["SUPABASE_PUBLISHABLE_KEY"] + "\n", None]:
            with self.subTest(key_type=type(key).__name__), patch.object(v, "read_response") as read:
                with self.assertRaises(v.ConfigurationError):
                    v.verify_connection(dict(CONFIG, SUPABASE_PUBLISHABLE_KEY=key))
                read.assert_not_called()

    def test_settings_rejects_bad_key_disabled_provider_and_bad_response(self):
        for response in [
            (401, {"message": "Invalid API key"}),
            (503, {}),
            (200, {"external": {"email": False}}),
            (200, {"external": None}),
            (200, {"external": []}),
            (200, []),
        ]:
            with self.subTest(response=response), patch.object(v, "read_response", return_value=response):
                with self.assertRaises(v.ConfigurationError):
                    v.verify_connection(CONFIG)

    def test_http_exception_fails_closed(self):
        with patch.object(v, "urlopen", side_effect=http.client.BadStatusLine("bad")):
            with self.assertRaises(v.ConfigurationError):
                v.verify_connection(CONFIG)

    def test_token_gateway_rejection_blocks_release(self):
        for response in [(401, {"message": "Invalid API key"}), (200, {}), (400, {"error_code": "unexpected"})]:
            with self.subTest(status=response[0]), patch.object(v, "read_response", side_effect=[(200, {"external": {"email": True}}), response]):
                with self.assertRaises(v.ConfigurationError):
                    v.verify_connection(CONFIG)

    def test_archive_requires_both_correct_url_and_exact_key(self):
        with tempfile.TemporaryDirectory() as temp:
            binary = Path(temp) / "Products/Applications/Runner.app/Frameworks/App.framework/App"
            binary.parent.mkdir(parents=True)
            (Path(temp) / "Products/Applications/Runner.app/Info.plist").write_bytes(plistlib.dumps({
                "CFBundleIdentifier": v.EXPECTED_BUNDLE_ID,
                "CFBundleShortVersionString": v.EXPECTED_VERSION,
                "CFBundleVersion": v.EXPECTED_BUILD,
            }))
            for data in [
                b"",
                v.PROJECT_URL.encode(),
                (v.PROJECT_URL + " sb_publishable_wrong").encode(),
                (v.PROJECT_URL + " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"] + "extra").encode(),
                (v.PROJECT_URL + " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"] + " sb_secret_1234567890").encode(),
            ]:
                binary.write_bytes(data)
                with self.assertRaises(v.ConfigurationError):
                    v.verify_archive(CONFIG, temp)
            binary.write_bytes((v.PROJECT_URL + " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"]).encode())
            v.verify_archive(CONFIG, temp)

    def test_missing_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(v.ConfigurationError):
                v.verify_archive(CONFIG, temp)

    def test_xcconfig_verification_enforces_exact_defines(self):
        def enc(s):
            return base64.b64encode(s.encode()).decode()

        with tempfile.TemporaryDirectory() as temp:
            xc = Path(temp) / "Secrets.xcconfig"
            xc.write_text("DART_DEFINES=" + ",".join([
                enc("SUPABASE_URL=" + v.PROJECT_URL),
                enc("SUPABASE_PUBLISHABLE_KEY=" + CONFIG["SUPABASE_PUBLISHABLE_KEY"]),
            ]))
            v.verify_xcconfig(CONFIG, xc)

            xc.write_text("DART_DEFINES=" + ",".join([
                enc("SUPABASE_URL=" + v.PROJECT_URL),
                enc("SUPABASE_PUBLISHABLE_KEY=sb_publishable_other_" + "y" * 24),
            ]))
            with self.assertRaises(v.ConfigurationError):
                v.verify_xcconfig(CONFIG, xc)

    @patch.object(v, "verify_ipa_signature")
    def test_ipa_verification_checks_binary_metadata_and_distribution_signing(self, signature):
        with tempfile.TemporaryDirectory() as temp:
            ipa_path = Path(temp) / "Runner.ipa"
            valid_info = plistlib.dumps({
                "CFBundleIdentifier": v.EXPECTED_BUNDLE_ID,
                "CFBundleShortVersionString": v.EXPECTED_VERSION,
                "CFBundleVersion": v.EXPECTED_BUILD,
            })
            valid_prov = b"cms-header" + plistlib.dumps({
                "TeamIdentifier": [v.EXPECTED_TEAM_ID],
                "ExpirationDate": datetime.datetime(2099, 1, 1),
                "Entitlements": {
                    "application-identifier": v.EXPECTED_TEAM_ID + "." + v.EXPECTED_BUNDLE_ID,
                    "get-task-allow": False,
                },
            }) + b"cms-footer"
            valid_bin = (v.PROJECT_URL + "\x00" + CONFIG["SUPABASE_PUBLISHABLE_KEY"]).encode()

            with zipfile.ZipFile(ipa_path, "w") as zf:
                zf.writestr("Payload/Runner.app/Frameworks/App.framework/App", valid_bin)
                zf.writestr("Payload/Runner.app/Info.plist", valid_info)
                zf.writestr("Payload/Runner.app/embedded.mobileprovision", valid_prov)
            v.verify_ipa(CONFIG, temp)
            signature.assert_called_once()

            # Reject development signing (get-task-allow=True)
            dev_prov = b"cms-header" + plistlib.dumps({
                "TeamIdentifier": [v.EXPECTED_TEAM_ID],
                "ExpirationDate": datetime.datetime(2099, 1, 1),
                "Entitlements": {
                    "application-identifier": v.EXPECTED_TEAM_ID + "." + v.EXPECTED_BUNDLE_ID,
                    "get-task-allow": True,
                },
            })
            with zipfile.ZipFile(ipa_path, "w") as zf:
                zf.writestr("Payload/Runner.app/Frameworks/App.framework/App", valid_bin)
                zf.writestr("Payload/Runner.app/Info.plist", valid_info)
                zf.writestr("Payload/Runner.app/embedded.mobileprovision", dev_prov)
            with self.assertRaises(v.ConfigurationError):
                v.verify_ipa(CONFIG, ipa_path)

    def test_cli_failure_never_leaks_key_in_stderr(self):
        with tempfile.TemporaryDirectory() as temp:
            cfg_file = Path(temp) / "config.json"
            secret_candidate = "sb_publishable_SensitiveKeyValue1234567890"
            cfg_file.write_text(json.dumps({
                "SUPABASE_URL": v.PROJECT_URL,
                "SUPABASE_PUBLISHABLE_KEY": secret_candidate,
            }))
            stderr_buf = io.StringIO()
            with patch.object(v, "read_response", return_value=(401, {"message": "Invalid API key"})), \
                 patch("sys.argv", ["verify_release_config.py", str(cfg_file)]), \
                 redirect_stderr(stderr_buf):
                rc = v.main()
            self.assertEqual(rc, 1)
            self.assertNotIn(secret_candidate, stderr_buf.getvalue())

    def test_cloud_counter_and_missing_archive_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            app = Path(temp) / "Products/Applications/Runner.app"
            binary = app / "Frameworks/App.framework/App"
            binary.parent.mkdir(parents=True)
            binary.write_bytes((v.PROJECT_URL + " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"]).encode())
            with self.assertRaises(v.ConfigurationError):
                v.verify_archive(CONFIG, temp)
            (app / "Info.plist").write_bytes(plistlib.dumps({
                "CFBundleIdentifier": v.EXPECTED_BUNDLE_ID,
                "CFBundleShortVersionString": v.EXPECTED_VERSION,
                "CFBundleVersion": "10",
            }))
            v.verify_archive(CONFIG, temp, expected_build="10")
            with self.assertRaises(v.ConfigurationError):
                v.verify_archive(CONFIG, temp)

    @patch.object(v, "verify_ipa_signature")
    def test_missing_corrupt_or_non_store_profile_is_rejected(self, signature):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "Runner.ipa"
            metadata = plistlib.dumps({"CFBundleIdentifier": v.EXPECTED_BUNDLE_ID,
                "CFBundleShortVersionString": v.EXPECTED_VERSION, "CFBundleVersion": v.EXPECTED_BUILD})
            profile = {"TeamIdentifier": [v.EXPECTED_TEAM_ID],
                "ExpirationDate": datetime.datetime(2099, 1, 1),
                "Entitlements": {"application-identifier": v.EXPECTED_TEAM_ID + "." + v.EXPECTED_BUNDLE_ID,
                    "get-task-allow": False}}
            cases = [None, b"corrupt", plistlib.dumps(dict(profile, ProvisionedDevices=["test-device"])),
                plistlib.dumps(dict(profile, ProvisionsAllDevices=True)),
                plistlib.dumps(dict(profile, ExpirationDate=datetime.datetime(2000, 1, 1)))]
            for encoded in cases:
                with zipfile.ZipFile(path, "w") as package:
                    package.writestr("Payload/Runner.app/Frameworks/App.framework/App",
                        (v.PROJECT_URL + " " + CONFIG["SUPABASE_PUBLISHABLE_KEY"]).encode())
                    package.writestr("Payload/Runner.app/Info.plist", metadata)
                    if encoded is not None:
                        package.writestr("Payload/Runner.app/embedded.mobileprovision", encoded)
                with self.assertRaises(v.ConfigurationError):
                    v.verify_ipa(CONFIG, path)
            signature.assert_not_called()


if __name__ == "__main__":
    unittest.main()
