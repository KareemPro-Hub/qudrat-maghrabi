#!/usr/bin/env python3
"""Generate branded iOS and Android launcher icons from the approved mark."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "brand" / "qudrat_maghrabi_mark.png"
IOS_DIR = ROOT / "ios" / "Runner" / "Assets.xcassets" / "AppIcon.appiconset"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
BACKGROUND = (250, 247, 255, 255)

IOS_ICONS = {
    "Icon-App-20x20@1x.png": 20,
    "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60,
    "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58,
    "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40,
    "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120,
    "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180,
    "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152,
    "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}

ANDROID_SCALES = {
    "mipmap-mdpi": 1.0,
    "mipmap-hdpi": 1.5,
    "mipmap-xhdpi": 2.0,
    "mipmap-xxhdpi": 3.0,
    "mipmap-xxxhdpi": 4.0,
}


def trim_alpha(image: Image.Image) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Brand mark is empty")
    return image.crop(bounds)


def fit_mark(mark: Image.Image, canvas_size: int, coverage: float) -> Image.Image:
    target_width = max(1, round(canvas_size * coverage))
    target_height = max(1, round(target_width * mark.height / mark.width))
    if target_height > canvas_size * coverage:
        target_height = max(1, round(canvas_size * coverage))
        target_width = max(1, round(target_height * mark.width / mark.height))
    return mark.resize((target_width, target_height), Image.Resampling.LANCZOS)


def compose(
    mark: Image.Image,
    size: int,
    coverage: float,
    *,
    transparent: bool = False,
) -> Image.Image:
    background = (0, 0, 0, 0) if transparent else BACKGROUND
    canvas = Image.new("RGBA", (size, size), background)
    fitted = fit_mark(mark, size, coverage)
    position = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    canvas.alpha_composite(fitted, position)
    return canvas


def write_ios(mark: Image.Image) -> None:
    for filename, size in IOS_ICONS.items():
        compose(mark, size, 0.78).convert("RGB").save(
            IOS_DIR / filename,
            "PNG",
            optimize=True,
        )


def write_android(mark: Image.Image) -> None:
    for directory, scale in ANDROID_SCALES.items():
        output = ANDROID_RES / directory
        output.mkdir(parents=True, exist_ok=True)
        legacy_size = round(48 * scale)
        foreground_size = round(108 * scale)
        legacy = compose(mark, legacy_size, 0.76).convert("RGB")
        legacy.save(output / "ic_launcher.png", "PNG", optimize=True)
        legacy.save(output / "ic_launcher_round.png", "PNG", optimize=True)
        compose(mark, foreground_size, 0.60, transparent=True).save(
            output / "ic_launcher_foreground.png",
            "PNG",
            optimize=True,
        )


def main() -> None:
    mark = trim_alpha(Image.open(SOURCE).convert("RGBA"))
    write_ios(mark)
    write_android(mark)


if __name__ == "__main__":
    main()
