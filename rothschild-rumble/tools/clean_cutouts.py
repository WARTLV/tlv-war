#!/usr/bin/env python3
"""
Rothschild Rumble — cutout cleaner.

Problem: T.M.R and referee's source PNGs (idle/attack stills + every move
frame) were exported with baked-in background junk that reads as a "box"
around the character in-game:
  - T.M.R: an opaque decorative rectangular frame around the whole image
    (measured at ~11% opaque coverage of the outer 3% ring — a real border).
  - referee: a faint dark halo / stray edge line around the silhouette.
Icon, BIG.COM and FRISBEE are already clean (0% opaque outer ring) and are
left untouched.

Fix: for each target PNG, threshold alpha, find connected components, and
keep only the single largest component (the character's body) — everything
else (frame, halo fragments, line artifacts) gets its alpha zeroed. A light
fringe cleanup removes leftover semi-transparent dark edge pixels that hug
the kept silhouette.

Output goes to sibling files with a `-clean` suffix so originals are never
overwritten in place; roster.js is repointed at the cleaned files.

Requires: Pillow, numpy, scipy (all confirmed present in this environment).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / "assets"

TARGETS = [
    ROOT / "referee-idle.png",
    ROOT / "referee-attack.png",
    ROOT / "tmr-idle.png",
    ROOT / "tmr-attack.png",
    *sorted((ROOT / "roster-frames" / "referee").glob("*/*.png")),
    *sorted((ROOT / "roster-frames" / "tmr").glob("*/*.png")),
]

ALPHA_THRESHOLD = 24  # pixels below this are treated as "not part of the subject" for labeling


def clean_one(path: Path) -> Path:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]

    mask = alpha >= ALPHA_THRESHOLD
    if not mask.any():
        # nothing to do (fully transparent?) — just copy through
        out_path = path.with_name(path.stem + "-clean.png")
        im.save(out_path)
        return out_path

    # 8-connectivity so diagonal-touching limbs/frame corners still group correctly
    structure = np.ones((3, 3), dtype=int)
    labeled, n = ndimage.label(mask, structure=structure)
    if n > 1:
        sizes = ndimage.sum(mask, labeled, index=range(1, n + 1))
        biggest_label = 1 + int(np.argmax(sizes))
        keep = labeled == biggest_label
        arr[~keep, 3] = 0

    # fringe cleanup: any remaining low-alpha (near-transparent) pixel that
    # sits OUTSIDE the kept silhouette's dilated footprint is dropped — kills
    # leftover halo/edge-line speckle without eating real soft edges of the
    # character itself.
    alpha2 = arr[:, :, 3]
    keep_mask = alpha2 >= ALPHA_THRESHOLD
    dilated = ndimage.binary_dilation(keep_mask, iterations=3)
    stray = (alpha2 > 0) & (alpha2 < ALPHA_THRESHOLD * 4) & (~dilated)
    arr[stray, 3] = 0

    out = Image.fromarray(arr, "RGBA")
    out_path = path.with_name(path.stem + "-clean.png")
    out.save(out_path)
    return out_path


def main():
    if not TARGETS:
        print("No target files found — check ROOT path.", file=sys.stderr)
        sys.exit(1)
    missing = [p for p in TARGETS if not p.exists()]
    if missing:
        print("Missing files:", *missing, sep="\n  ", file=sys.stderr)
        sys.exit(1)

    for p in TARGETS:
        out = clean_one(p)
        rel = out.relative_to(ROOT.parent)
        print(f"cleaned -> {rel}")

    print(f"\nDone. {len(TARGETS)} files processed.")


if __name__ == "__main__":
    main()
