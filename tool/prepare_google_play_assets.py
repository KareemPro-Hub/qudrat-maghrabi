#!/usr/bin/env python3
"""Prepare deterministic, policy-compliant Google Play graphic assets."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "store_assets" / "android"
MARK = ROOT / "assets" / "brand" / "qudrat_maghrabi_mark.png"


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    return copy


def prepare_screenshots() -> None:
    for path in sorted(ASSETS.glob("0*-*.png")):
        with Image.open(path) as source:
            if source.size != (1080, 1920):
                raise SystemExit(f"Unexpected screenshot size: {path.name} {source.size}")
            source.convert("RGB").save(path, optimize=True)


def create_icon(mark: Image.Image) -> None:
    canvas = Image.new("RGB", (512, 512), "#F9F7FF")
    logo = contain(mark, (430, 280))
    canvas.paste(
        logo,
        ((canvas.width - logo.width) // 2, (canvas.height - logo.height) // 2),
        logo,
    )
    canvas.save(ASSETS / "icon-512.png", optimize=True)


def create_feature_graphic(mark: Image.Image) -> None:
    width, height = 1024, 500
    canvas = Image.new("RGB", (width, height))
    pixels = canvas.load()
    start = (113, 40, 190)
    end = (255, 105, 116)
    for x in range(width):
        ratio = x / (width - 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(start, end))
        for y in range(height):
            pixels[x, y] = color

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse((-130, 255, 260, 645), fill=(255, 255, 255, 28))
    draw.ellipse((770, -210, 1160, 180), fill=(255, 255, 255, 24))
    draw.rounded_rectangle(
        (95, 85, 929, 415),
        radius=72,
        fill=(255, 255, 255, 235),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.3))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)

    logo = contain(mark, (650, 300))
    canvas.paste(
        logo,
        ((width - logo.width) // 2, (height - logo.height) // 2),
        logo,
    )
    canvas.convert("RGB").save(ASSETS / "feature-graphic-1024x500.png", optimize=True)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    with Image.open(MARK).convert("RGBA") as mark:
        prepare_screenshots()
        create_icon(mark)
        create_feature_graphic(mark)


if __name__ == "__main__":
    main()
