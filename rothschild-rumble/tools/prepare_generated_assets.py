"""Convert generated checkerboard sheets into engine-ready transparent sprites."""

from collections import deque
from math import sqrt
from pathlib import Path
from PIL import Image

GEN = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")
ROOT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")


def remove_checker(im: Image.Image, clean_islands=False) -> Image.Image:
    """Remove connected checker regions while retaining enclosed white details."""
    rgba = im.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size

    def candidate(x, y):
        r, g, b, _ = px[x, y]
        return min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 24

    visited = bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            start = sy * w + sx
            if visited[start] or px[sx, sy][3] == 0 or not candidate(sx, sy):
                continue
            visited[start] = 1
            comp = []
            vals = []
            min_x = max_x = sx
            min_y = max_y = sy
            touches_edge = False
            cq = deque([(sx, sy)])
            while cq:
                x, y = cq.popleft()
                comp.append((x, y))
                vals.append(sum(px[x, y][:3]) / 3)
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                touches_edge = touches_edge or x == 0 or y == 0 or x == w - 1 or y == h - 1
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        idx = ny * w + nx
                        if not visited[idx] and px[nx, ny][3] and candidate(nx, ny):
                            visited[idx] = 1
                            cq.append((nx, ny))
            mean = sum(vals) / len(vals)
            std = sqrt(sum((v - mean) ** 2 for v in vals) / len(vals))
            box_area = (max_x - min_x + 1) * (max_y - min_y + 1)
            fill = len(comp) / box_area
            is_checker_island = clean_islands and len(comp) > 80 and fill > 0.48 and std > 4.0
            if touches_edge or is_checker_island:
                for x, y in comp:
                    px[x, y] = (255, 255, 255, 0)
    return rgba


def prune_components(frame):
    """Drop checker flecks and neighboring poses leaking across a cell edge."""
    alpha = frame.getchannel("A")
    w, h = frame.size
    ap = alpha.load()
    visited = bytearray(w * h)
    comps = []
    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if visited[idx] or not ap[sx, sy]:
                continue
            visited[idx] = 1
            comp = []
            touches_side = False
            q = deque([(sx, sy)])
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                touches_side = touches_side or x <= 1 or x >= w - 2
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not visited[ni] and ap[nx, ny]:
                            visited[ni] = 1
                            q.append((nx, ny))
            comps.append((comp, touches_side))
    if not comps:
        return frame
    largest = max(len(c) for c, _ in comps)
    out = Image.new("RGBA", frame.size)
    src = frame.load()
    dst = out.load()
    for comp, touches_side in comps:
        if len(comp) >= largest * 0.03 and not (touches_side and len(comp) < largest * 0.35):
            for x, y in comp:
                dst[x, y] = src[x, y]
    return out


def restore_dog_muzzle(original, cleaned):
    """Restore the pale muzzle around the topmost red mask component."""
    op = original.convert("RGBA").load()
    cp = cleaned.load()
    w, h = original.size
    clean_bbox = cleaned.getchannel("A").getbbox()
    max_existing_x = clean_bbox[2] - 1 if clean_bbox else w - 1
    red = []
    for y in range(h):
        for x in range(w):
            r, g, b, _ = op[x, y]
            if r > 95 and r > g * 1.35 and r > b * 1.18 and g < 120:
                red.append((x, y))
    if not red:
        return cleaned
    top_cut = min(y for _, y in red) + int(h * .24)
    mask = [(x, y) for x, y in red if y <= top_cut]
    if not mask:
        return cleaned
    x0, x1 = min(x for x, _ in mask), max(x for x, _ in mask)
    y0, y1 = min(y for _, y in mask), max(y for _, y in mask)
    mw, mh = max(12, x1 - x0), max(12, y1 - y0)
    cx = x1 + mw * .34
    cy = y0 + mh * .72
    rx, ry = mw * .62, mh * .44
    def foreground_neighbor(x, y, radius=5):
        for yy in range(max(0, y - radius), min(h, y + radius + 1)):
            for xx in range(max(0, x - radius), min(w, x + radius + 1)):
                r, g, b, _ = op[xx, yy]
                if not (min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 24):
                    return True
        return False
    for y in range(max(0, int(cy - ry)), min(h, int(cy + ry + 1))):
        for x in range(max(0, int(cx - rx)), min(w, int(cx + rx + 1))):
            if (x <= max_existing_x + 2
                    and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
                    and foreground_neighbor(x, y)):
                cp[x, y] = op[x, y]
    return cleaned


def restore_light_details(original, cleaned, radius=3):
    """Restore light costume pixels close to colored foreground texture."""
    original = original.convert("RGBA")
    op, cp = original.load(), cleaned.load()
    w, h = original.size
    for y in range(h):
        for x in range(w):
            if cp[x, y][3]:
                continue
            r, g, b, _ = op[x, y]
            if not (min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 24):
                continue
            found = False
            for yy in range(max(0, y - radius), min(h, y + radius + 1)):
                for xx in range(max(0, x - radius), min(w, x + radius + 1)):
                    rr, gg, bb, _ = op[xx, yy]
                    if min(rr, gg, bb) < 188 or max(rr, gg, bb) - min(rr, gg, bb) > 24:
                        found = True
                        break
                if found:
                    break
            if found:
                cp[x, y] = op[x, y]
    return cleaned


def normalize(frame, size=(768, 1024), margin=42, ground=972):
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", size)
    obj = frame.crop(bbox)
    max_w = size[0] - margin * 2
    max_h = ground - margin
    scale = min(max_w / obj.width, max_h / obj.height, 1.0)
    obj = obj.resize((max(1, round(obj.width * scale)), max(1, round(obj.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size)
    x = (size[0] - obj.width) // 2
    y = ground - obj.height
    out.alpha_composite(obj, (x, y))
    return out


def split_sheet(src_name, count, out_dir, suffix="", restore_lights=False):
    original = Image.open(GEN / src_name).convert("RGBA")
    sheet = remove_checker(original, clean_islands=False)
    out_dir = ROOT / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    for i in range(count):
        x0 = round(sheet.width * i / count)
        x1 = round(sheet.width * (i + 1) / count)
        frame = sheet.crop((x0, 0, x1, sheet.height))
        original_frame = original.crop((x0, 0, x1, original.height))
        if restore_lights:
            frame = restore_light_details(original_frame, frame)
        if "wrestler-dog" in str(out_dir):
            frame = restore_dog_muzzle(original_frame, frame)
        normalize(prune_components(frame)).save(out_dir / f"F{i + 1:02d}{suffix}.png")


def save_single(src_name, out_path, size=(768, 1024), restore_lights=False):
    is_courier = "blue-courier" in out_path
    source = Image.open(GEN / src_name).convert("RGBA")
    clean = remove_checker(source, clean_islands=is_courier)
    if restore_lights:
        clean = restore_light_details(source, clean)
    if is_courier:
        # Restore the bag's white emblem after enclosed-checker removal. This
        # rectangle is fully inside the rigid blue bag in all three variants.
        x0, x1 = int(source.width * .615), int(source.width * .755)
        y0, y1 = int(source.height * .205), int(source.height * .395)
        sp, cp = source.load(), clean.load()
        for y in range(y0, y1):
            for x in range(x0, x1):
                keep = False
                for yy in range(max(0, y - 6), min(source.height, y + 7)):
                    for xx in range(max(0, x - 6), min(source.width, x + 7)):
                        r, g, b, _ = sp[xx, yy]
                        if not (min(r, g, b) >= 188 and max(r, g, b) - min(r, g, b) <= 24):
                            keep = True
                            break
                    if keep:
                        break
                if keep:
                    cp[x, y] = (*sp[x, y][:3], 255)
    clean = normalize(prune_components(clean), size=size, margin=32, ground=size[1] - 32)
    target = ROOT / out_path
    target.parent.mkdir(parents=True, exist_ok=True)
    clean.save(target)


SHEETS = [
    ("exec-ebd34392-9cad-406c-93ae-900a81241a28.png", 4, "assets/roster-frames/bigcom/divekick"),
    ("exec-611f272e-584d-4df9-8af0-1007456cf3d5.png", 4, "assets/roster-frames/bigcom/runattack"),
    ("exec-720010a0-56ce-47e9-bf8c-cbad2855fb3a.png", 4, "assets/roster-frames/bigcom/weapon_swing"),
    ("exec-503f816e-64c2-470b-9cec-6a20fe92b2fa.png", 3, "assets/roster-frames/bigcom/weapon_throw"),
    ("exec-9a85f497-ef9b-465e-9233-ed2a89ad164e.png", 2, "assets/roster-frames/bigcom/grab-hold"),
    ("exec-aa50ed7c-00fb-4eac-bef2-3f0a5fd3b375.png", 3, "assets/roster-frames/bigcom/grab-knee"),
    ("exec-889a77ac-d72e-4274-acea-27b3e0b281d2.png", 4, "assets/roster-frames/bigcom/grab-throw"),
    ("exec-89f49c61-233f-43c4-a5e0-bd363f31812d.png", 2, "assets/enemies/wrestler-dog/idle"),
    ("exec-2f38dcc1-edf6-4011-91eb-4ab265877367.png", 4, "assets/enemies/wrestler-dog/walk"),
    ("exec-ad5c3f45-1a81-4906-85f0-338a42408a5d.png", 4, "assets/enemies/wrestler-dog/claw"),
    ("exec-931f9aa5-93b1-4521-9954-ecca4b2b6906.png", 4, "assets/enemies/wrestler-dog/bite"),
    ("exec-b8d13e80-2827-4483-8bed-653bf0e36a0a.png", 4, "assets/enemies/wrestler-dog/charge"),
    ("exec-a1072363-5b3d-4c86-a315-7a033f60676f.png", 2, "assets/enemies/wrestler-dog/hurt"),
    ("exec-f2af9215-8644-4400-a450-726487eaa5a2.png", 3, "assets/enemies/wrestler-dog/knockdown"),
    ("exec-da124f7a-3ed3-48b2-9b37-165450d3939a.png", 2, "assets/roster-frames/bigcom/hurt", "", True),
    ("exec-fe79e655-7f83-4d18-84f0-e07f9216057b.png", 2, "assets/roster-frames/bigcom/ko", "", True),
    ("exec-45c23739-c9df-46e4-8554-20467ee7dfee.png", 4, "assets/roster-frames/frisbee/walk", "", True),
    ("exec-29238c4e-a3f7-4616-b020-3c9ab7f0c523.png", 2, "assets/roster-frames/frisbee/hurt", "", True),
    ("exec-ee91e21a-f45f-458e-96d1-b8f2de879535.png", 2, "assets/roster-frames/frisbee/ko", "", True),
    ("exec-a42e5184-c79a-4bcb-81ba-a252a69c14ce.png", 4, "assets/roster-frames/tmr/walk", "-clean", True),
    ("exec-70d91757-a3ac-4be8-a3a5-a4c62e8836e7.png", 4, "assets/roster-frames/referee/walk", "-clean", True),
    ("exec-c11588df-51b4-4cd7-8c32-6bb3a66a8e52.png", 4, "assets/roster-frames/icon/walk", "", True),
]

STREET = [
    ("exec-d63b9ebc-4f9a-4bac-9f3a-16d7ccfa59a8.png", "cart"),
    ("exec-3d7df5c8-3815-4177-9b94-cd67dd90da3d.png", "vendor"),
    ("exec-f473c5f0-ea2f-472e-bb22-bac99bfc8446.png", "busker"),
    ("exec-13be2f27-dc25-42de-a924-7beff9f43c62.png", "blanket"),
]

SINGLES = [
    ("exec-063c1724-4a69-4256-8564-22fc271792e4.png", "assets/roster-frames/bigcom/weapon-hold/F01.png", (768, 1024)),
    ("exec-0cb1d1c9-5a56-43cd-99fb-1c1f4c5ee226.png", "assets/weapons/scooter-handle.png", (768, 768)),
    ("exec-3d1df6ff-81cb-4f23-b896-2ce9ab0fad7c.png", "assets/weapons/beer-bottle.png", (768, 768)),
    ("exec-7d6534c3-d565-4746-9256-9a22a248952e.png", "assets/weapons/street-sign.png", (768, 768)),
    ("exec-2112eacc-735f-4b6d-99a1-9850642cae2a.png", "assets/weapons/mangal-skewer.png", (768, 768)),
    ("exec-3b914e3a-0cc7-4590-adf9-dc1da09243e4.png", "assets/weapons/cafe-umbrella.png", (768, 768)),
    ("exec-3b4e2fbe-3d97-488a-9a36-9cafeaa8550f.png", "assets/weapons/protest-placard.png", (768, 768)),
    ("exec-10c857a8-1d8e-4bb9-a448-a714fff11e8f.png", "assets/courier/blue-courier-scooter.png", (1024, 768)),
    ("exec-b96a5a47-ea89-4caf-b4cf-b19c3b9eccbe.png", "assets/courier/blue-courier-moped.png", (1024, 768)),
    ("exec-71aa5399-55af-4880-b8c9-f04985e059a1.png", "assets/courier/blue-courier-ebike.png", (1024, 768)),
    ("exec-99cac66b-0aad-4ccf-8044-7b6d960cf871.png", "assets/roster-frames/bigcom/guard/F01.png", (768, 1024), True),
]

for item in SHEETS:
    split_sheet(*item)

for src, slug in STREET:
    sheet = remove_checker(Image.open(GEN / src), clean_islands=False)
    for i, pose in enumerate(("idle", "punch")):
        x0 = round(sheet.width * i / 2)
        x1 = round(sheet.width * (i + 1) / 2)
        target = ROOT / f"assets/street-enemy/street-enemy-{slug}-{pose}.png"
        normalize(prune_components(sheet.crop((x0, 0, x1, sheet.height)))).save(target)

for item in SINGLES:
    save_single(*item)

print(f"Prepared {sum(x[1] for x in SHEETS) + len(STREET) * 2 + len(SINGLES)} assets")
