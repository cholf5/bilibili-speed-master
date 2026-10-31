#!/usr/bin/env python3
# F-2: store image tooling.
#   overlay  — stamp a bottom caption band (title + subtitle) onto a PNG
#   compose  — build all store-size derivatives from the raw 2x captures
# Usage:
#   imaging.py overlay <png> <title> <subtitle>
#   imaging.py compose <raw-dir> <out-dir>
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"
PINK = (251, 114, 153)


def font(size):
    return ImageFont.truetype(FONT_PATH, size, index=0)


def stamp_band(img, title, subtitle):
    """Bottom gradient band + centered zh caption, in place."""
    w, h = img.size
    band_h = int(h * 0.22)
    band = Image.new("RGBA", (w, band_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(band)
    for y in range(band_h):
        alpha = int(200 * (y / band_h) ** 1.5)
        draw.line([(0, y), (w, y)], fill=(12, 13, 16, alpha))
    img.alpha_composite(band, (0, h - band_h))

    d = ImageDraw.Draw(img)
    t_size = max(34, int(h * 0.052))
    s_size = max(22, int(h * 0.032))
    t_font, s_font = font(t_size), font(s_size)

    t_box = d.textbbox((0, 0), title, font=t_font)
    s_box = d.textbbox((0, 0), subtitle, font=s_font)
    cx = w // 2
    ty = h - band_h + int(band_h * 0.14)
    sy = ty + (t_box[3] - t_box[1]) + int(band_h * 0.16)

    # soft shadow for readability on busy frames
    for dx, dy in [(-2, 2), (2, 2), (0, 3)]:
        d.text((cx - (t_box[2] - t_box[0]) // 2 + dx, ty + dy), title,
               font=t_font, fill=(0, 0, 0, 160))
    d.text((cx - (t_box[2] - t_box[0]) // 2, ty), title, font=t_font, fill=(255, 255, 255, 255))

    d.text((cx - (s_box[2] - s_box[0]) // 2, sy), subtitle, font=s_font, fill=(232, 234, 239, 255))
    return img


def center_crop_to_ratio(img, ratio):
    w, h = img.size
    cur = w / h
    if cur > ratio:
        nw = int(h * ratio)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = (h - nh) // 2
    return img.crop((0, y, 0 + w, y + nh))


def fit_exact(img, size):
    """Cover-fit resize to an exact WxH."""
    tw, th = size
    img = center_crop_to_ratio(img, tw / th)
    return img.resize(size, Image.LANCZOS)


def compose(raw_dir, out_dir):
    import os
    os.makedirs(out_dir, exist_ok=True)

    def load(name):
        return Image.open(f"{raw_dir}/{name}").convert("RGBA")

    board = load("popup-board-2x.png")
    options = load("options-2x.png")
    video = load("video-2x.png")
    shortcuts = load("options-shortcuts-2x.png")

    # 1280x800 listings
    fit_exact(board, (1280, 800)).save(f"{out_dir}/1280x800-popup.png")
    fit_exact(options, (1280, 800)).save(f"{out_dir}/1280x800-options.png")
    fit_exact(video, (1280, 800)).save(f"{out_dir}/1280x800-video.png")
    fit_exact(shortcuts, (1280, 800)).save(f"{out_dir}/1280x800-shortcuts.png")

    # 640x400 (alternate listing size, same board)
    fit_exact(board, (640, 400)).save(f"{out_dir}/640x400-popup.png")

    # 440x280 promo tile from the board artwork
    fit_exact(board, (440, 280)).save(f"{out_dir}/promo-440x280.png")

    # CWS store icon 128x128 from the 512 master
    icon = Image.open("/Users/theo/dev/cholf5/bilibili-speed-master/public/icon/512.png").convert("RGBA")
    icon.resize((128, 128), Image.LANCZOS).save(f"{out_dir}/icon-128.png")

    print("composed:", sorted(os.listdir(out_dir)))


def main():
    cmd = sys.argv[1]
    if cmd == "overlay":
        path, title, subtitle = sys.argv[2], sys.argv[3], sys.argv[4]
        img = Image.open(path).convert("RGBA")
        stamp_band(img, title, subtitle)
        img.convert("RGB").save(path, "PNG")
        print("overlaid:", path)
    elif cmd == "compose":
        compose(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit(f"unknown cmd {cmd}")


if __name__ == "__main__":
    main()
