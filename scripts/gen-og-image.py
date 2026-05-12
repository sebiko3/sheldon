#!/usr/bin/env python3
"""Generate docs/assets/og-image.png — a 1200x630 social card for Sheldon.

Stdlib-only (struct + zlib). No PIL required.
Background: #020617 (dark navy). Starfield of cyan/white pixels.
"""

import os
import random
import struct
import zlib

WIDTH = 1200
HEIGHT = 630
BG = (2, 6, 23)
CYAN = (125, 249, 255)
WHITE = (255, 255, 255)
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "docs", "assets", "og-image.png")


def make_png(pixels: list[list[tuple[int, int, int]]]) -> bytes:
    def chunk(ctype: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(ctype + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + ctype + data + struct.pack(">I", crc)

    magic = b"\x89PNG\r\n\x1a\n"

    ihdr_data = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    ihdr = chunk(b"IHDR", ihdr_data)

    raw_rows = bytearray()
    for row in pixels:
        raw_rows.append(0)
        for r, g, b in row:
            raw_rows += bytes([r, g, b])

    idat = chunk(b"IDAT", zlib.compress(bytes(raw_rows), level=9))
    iend = chunk(b"IEND", b"")

    return magic + ihdr + idat + iend


def make_starfield() -> list[list[tuple[int, int, int]]]:
    rng = random.Random(42)

    pixels = [[BG] * WIDTH for _ in range(HEIGHT)]

    num_stars = 800
    for _ in range(num_stars):
        x = rng.randint(0, WIDTH - 1)
        y = rng.randint(0, HEIGHT - 1)
        brightness = rng.random()
        if brightness > 0.85:
            pixels[y][x] = CYAN
        else:
            v = int(180 + brightness * 75 / 0.85)
            pixels[y][x] = (v, v, v)

    return pixels


def main() -> None:
    pixels = make_starfield()
    png_bytes = make_png(pixels)
    out_path = os.path.normpath(OUTPUT)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(png_bytes)
    size = len(png_bytes)
    print(f"Written {out_path} ({size} bytes, {size / 1024:.1f} KB)")
    if size >= 50000:
        print("WARNING: file exceeds 50KB cap!")


if __name__ == "__main__":
    main()
