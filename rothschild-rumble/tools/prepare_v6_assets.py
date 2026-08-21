from pathlib import Path
from PIL import Image
from collections import deque
from prepare_v5_chroma import chroma_key, trim_and_normalize

PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")

CHROMA_SHEETS = [
    ("exec-820a730a-e801-4bd7-a02b-d472a037de38.png", "roster-frames/tmr/hurt", 2, "-clean"),
    ("exec-cd7ac117-a6d4-4eaf-8b94-45069386cbc3.png", "roster-frames/tmr/ko", 2, "-clean"),
    ("exec-e43ad2df-dfca-4e86-aa84-d40bdbf13e25.png", "roster-frames/referee/hurt", 2, "-clean"),
    ("exec-5793c9a8-2ad7-4e99-bc59-7e5096fddad5.png", "roster-frames/referee/ko", 2, "-clean"),
    ("exec-c03357c8-c8a8-4e8b-93ce-391ee08ce4e9.png", "roster-frames/icon/hurt", 2, ""),
    ("exec-167975f5-8a1b-4b3f-87b1-b1a139bd45cd.png", "roster-frames/icon/ko", 2, ""),
    ("exec-a5576a52-5a1d-45c9-9cbe-6a6f25f121ef.png", "street-enemy/classic/walk", 4, ""),
    ("exec-d0162fab-05d9-4bb0-bb38-2927d5754780.png", "street-enemy/classic/hurt", 2, ""),
    ("exec-d6f5b7c6-d679-4717-8ddd-7bd45ff55ddd.png", "street-enemy/classic/ko", 2, ""),
]

FX_SHEETS = [
    ("exec-46cceee4-292d-4282-8e1e-738f16860670.png", "hit-spark"),
    ("exec-e7510cdd-48f2-479e-8171-3de469b0c6ea.png", "dust-puff"),
    ("exec-595b211c-798c-437a-acba-edb66027428b.png", "energy-ball"),
]

OBJECTS = [
    ("exec-c3d074a7-1093-4ff6-9b7e-496ee0a34759.png", "bench.png"),
    ("exec-cef10ed9-e2d3-4c88-ae79-06860cb0a585.png", "trashcan.png"),
    ("exec-3c462f6e-ff64-4dd1-adba-279066616882.png", "cafe-table.png"),
]

TRANSPARENT_SCENES = [
    ("exec-b91d4ac5-1da5-4e0c-ac7b-35b63f4e50ed.png", "habima-mid.png"),
    ("exec-6abbf9b9-615f-4cb5-b5f3-66f37e302b63.png", "habima-near.png"),
    ("exec-d4225737-cffc-4fd2-95f1-55ba5393e30e.png", "boulevard-mid.png"),
    ("exec-185ffa07-82af-48c4-b2b5-2da4b24fa1bf.png", "boulevard-near.png"),
    ("exec-4d4733b2-928c-4eef-a264-51338d40f028.png", "kiosk-mid.png"),
    ("exec-2341c3c9-1f34-46fc-a793-a41393af51b8.png", "kiosk-near.png"),
]


def remove_checker(image):
    """Remove neutral checker regions connected to an outer image edge."""
    rgba = image.convert("RGBA")
    px, w, h = rgba.load(), rgba.width, rgba.height
    def candidate(x, y):
        r, g, b, _ = px[x, y]
        return min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 24
    seen = bytearray(w * h)
    queue = deque()
    for x in range(w):
        queue.extend(((x, 0), (x, h - 1)))
    for y in range(h):
        queue.extend(((0, y), (w - 1, y)))
    while queue:
        x, y = queue.popleft()
        idx = y * w + x
        if seen[idx] or not candidate(x, y):
            continue
        seen[idx] = 1
        px[x, y] = (255, 255, 255, 0)
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx]:
                queue.append((nx, ny))
    return rgba


def split_chroma(filename, relative, count, suffix):
    sheet = Image.open(GENERATED / filename).convert("RGBA")
    out = PROJECT / "assets" / relative
    out.mkdir(parents=True, exist_ok=True)
    width = sheet.width / count
    for i in range(count):
        frame = sheet.crop((round(i * width), 0, round((i + 1) * width), sheet.height))
        frame = trim_and_normalize(chroma_key(frame))
        frame.save(out / f"F{i + 1:02d}{suffix}.png", optimize=True)


def split_fx(filename, name):
    sheet = remove_checker(Image.open(GENERATED / filename))
    out = PROJECT / "assets" / "fx" / name
    out.mkdir(parents=True, exist_ok=True)
    width = sheet.width / 4
    for i in range(4):
        frame = sheet.crop((round(i * width), 0, round((i + 1) * width), sheet.height))
        bbox = frame.getchannel("A").getbbox()
        if bbox:
            frame = frame.crop(bbox)
        canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        frame.thumbnail((460, 460), Image.Resampling.LANCZOS)
        canvas.alpha_composite(frame, ((512 - frame.width) // 2, (512 - frame.height) // 2))
        canvas.save(out / f"F{i + 1:02d}.png", optimize=True)


if __name__ == "__main__":
    for spec in CHROMA_SHEETS:
        split_chroma(*spec)
    for spec in FX_SHEETS:
        split_fx(*spec)
    obj_dir = PROJECT / "assets" / "props" / "breakables"
    obj_dir.mkdir(parents=True, exist_ok=True)
    for source, name in OBJECTS:
        remove_checker(Image.open(GENERATED / source)).save(obj_dir / name, optimize=True)
    scene_dir = PROJECT / "assets" / "scenes-v6"
    for source, name in TRANSPARENT_SCENES:
        remove_checker(Image.open(GENERATED / source)).save(scene_dir / name, optimize=True)
