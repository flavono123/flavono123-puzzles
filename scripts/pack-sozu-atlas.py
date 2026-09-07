#!/usr/bin/env python3
"""Pack specialty sprites into a TexturePacker-style hash atlas."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "sozu"
SRC_JSON = ROOT / "src" / "games" / "sozu" / "assets" / "garden.json"
RAW = ROOT / "assets" / "sozu" / "raw"

DEER_IDLE = RAW / "Deer_Idle.png"
DEER_RUN = RAW / "Deer_Run.png"
KOI = RAW / "fish_orange.png"

DEER_FW, DEER_FH = 72, 52


def key_black(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r < 10 and g < 10 and b < 10:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def slice_frame(sheet: Image.Image, index: int, fw: int, fh: int) -> Image.Image:
    return sheet.crop((index * fw, 0, (index + 1) * fw, fh))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    idle = key_black(Image.open(DEER_IDLE))
    run = key_black(Image.open(DEER_RUN))
    koi = Image.open(KOI).convert("RGBA")

    frames_img = {
        "koi": koi,
        "deer-stand": slice_frame(idle, 0, DEER_FW, DEER_FH),
        "deer-drink": slice_frame(idle, 5, DEER_FW, DEER_FH),
        "deer-run": slice_frame(run, 0, DEER_FW, DEER_FH),
    }

    pad = 2
    x = pad
    y = pad
    row_h = 0
    sheet_w = 320
    placements: dict[str, dict] = {}
    for name, im in frames_img.items():
        if x + im.width + pad > sheet_w:
            x = pad
            y += row_h + pad
            row_h = 0
        placements[name] = {"x": x, "y": y, "w": im.width, "h": im.height, "im": im}
        x += im.width + pad
        row_h = max(row_h, im.height)
    sheet_h = y + row_h + pad

    atlas = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    frames = {}
    for name, p in placements.items():
        atlas.paste(p["im"], (p["x"], p["y"]), p["im"])
        frames[name] = {
            "frame": {"x": p["x"], "y": p["y"], "w": p["w"], "h": p["h"]},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": p["w"], "h": p["h"]},
            "sourceSize": {"w": p["w"], "h": p["h"]},
        }

    png_path = OUT_DIR / "garden.png"
    atlas.save(png_path)

    doc = {
        "frames": frames,
        "meta": {
            "app": "https://www.codeandweb.com/texturepacker",
            "version": "1.0",
            "image": "garden.png",
            "format": "RGBA8888",
            "size": {"w": sheet_w, "h": sheet_h},
            "scale": "1",
            "smartupdate": "sozu-garden-v1",
        },
    }
    SRC_JSON.parent.mkdir(parents=True, exist_ok=True)
    SRC_JSON.write_text(json.dumps(doc, indent=2) + "\n")
    (OUT_DIR / "garden.json").write_text(json.dumps(doc, indent=2) + "\n")
    print(f"wrote {png_path} {atlas.size} and {SRC_JSON}")


if __name__ == "__main__":
    main()
