#!/usr/bin/env python3
"""Create a local Android upload key without printing credentials."""

import secrets
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ANDROID_DIR = ROOT / "android"
KEYSTORE = ANDROID_DIR / "app" / "upload-keystore.jks"
PROPERTIES = ANDROID_DIR / "key.properties"
ALIAS = "qudrat-upload"


def main() -> None:
    if KEYSTORE.exists() or PROPERTIES.exists():
        raise SystemExit("Release signing files already exist; nothing changed.")

    keytool = shutil.which("keytool")
    if keytool is None:
        raise SystemExit("keytool was not found.")

    password = secrets.token_urlsafe(32)
    subprocess.run(
        [
            keytool,
            "-genkeypair",
            "-v",
            "-keystore",
            str(KEYSTORE),
            "-storetype",
            "JKS",
            "-keyalg",
            "RSA",
            "-keysize",
            "4096",
            "-validity",
            "10000",
            "-alias",
            ALIAS,
            "-storepass",
            password,
            "-keypass",
            password,
            "-dname",
            "CN=Qudrat Maghrabi, O=Qudrat Maghrabi, C=SA",
        ],
        check=True,
    )
    PROPERTIES.write_text(
        "\n".join(
            [
                f"storePassword={password}",
                f"keyPassword={password}",
                f"keyAlias={ALIAS}",
                "storeFile=app/upload-keystore.jks",
                "",
            ]
        ),
        encoding="utf-8",
    )
    PROPERTIES.chmod(0o600)
    KEYSTORE.chmod(0o600)
    print("Android upload key created locally. Back up android/key.properties and android/app/upload-keystore.jks securely.")


if __name__ == "__main__":
    main()
