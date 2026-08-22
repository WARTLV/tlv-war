"""Split the seven generated finisher sheets into anchored transparent frames."""
from pathlib import Path
from PIL import Image

from prepare_v5_chroma import chroma_key, trim_and_normalize


PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")

SHEETS = {
    "bigcom": ("exec-bad75c98-b323-4821-b06f-9c32bebb4261.png", "exec-223a3d0f-a413-417e-8ba1-cb346cae922e.png"),
    "yashar": ("exec-c59dc12f-7863-4d62-a4e5-086814ae96d7.png", "exec-2c7b0264-fc64-4c44-be8f-7a4ab543a397.png"),
    "frisbee": ("exec-7a455aaf-3451-49a8-9e31-97e2e02013e2.png", "exec-1633e2b4-24fc-4357-af2b-f1c11a3d5dd3.png"),
    "tmr": ("exec-8be0b1e9-477f-4e44-8c5a-289967d166f3.png", "exec-91ee49f8-d8d4-4038-8047-425391686c6e.png"),
    "referee": ("exec-f1f2065e-135e-44a2-8b3d-d305860e25c3.png", "exec-72126ce6-3c9f-48de-ae46-f0889b6fc167.png"),
    "icon": ("exec-04142b8f-15a5-410f-9bc4-e6a4cbd84699.png", "exec-858072f6-b6cc-4572-ab53-414e725cb0ec.png"),
    "rottweiler": ("exec-35d22b4f-2757-404f-b211-85436832eee9.png", "exec-88efe993-19f6-4dc2-b4e9-92dab38cf8bf.png"),
}


def output_dir(fighter: str) -> Path:
    if fighter == "rottweiler":
        return PROJECT / "assets" / "enemies" / "wrestler-dog" / "finisher"
    return PROJECT / "assets" / "roster-frames" / fighter / "finisher"


def keep_main_figure(image: Image.Image) -> Image.Image:
    """Remove disconnected limbs/boots leaked from neighboring sheet cells."""
    image = image.convert("RGBA")
    w, h = image.size
    alpha = image.getchannel("A")
    raw = alpha.tobytes()
    active = bytearray(1 if value > 24 else 0 for value in raw)
    seen = bytearray(w * h)
    largest = []
    for seed in range(w * h):
        if not active[seed] or seen[seed]:
            continue
        component = []
        stack = [seed]
        seen[seed] = 1
        while stack:
            pos = stack.pop()
            component.append(pos)
            x, y = pos % w, pos // w
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nxt = ny * w + nx
                    if active[nxt] and not seen[nxt]:
                        seen[nxt] = 1
                        stack.append(nxt)
        if len(component) > len(largest):
            largest = component
    keep = bytearray(w * h)
    for pos in largest:
        keep[pos] = raw[pos]
    image.putalpha(Image.frombytes("L", (w, h), bytes(keep)))
    return image


def process_half(fighter: str, filename: str, frame_offset: int) -> None:
    sheet = Image.open(GENERATED / filename).convert("RGBA")
    cell_w = sheet.width / 6
    target_dir = output_dir(fighter)
    target_dir.mkdir(parents=True, exist_ok=True)
    for i in range(6):
        left = round(i * cell_w)
        right = round((i + 1) * cell_w)
        # A tiny seam inset prevents a neighboring pose leaking into the cell.
        inset = round(cell_w * 0.018)
        frame = sheet.crop((left + inset, 0, right - inset, sheet.height))
        frame = trim_and_normalize(keep_main_figure(chroma_key(frame)))
        number = frame_offset + i + 1
        suffix = "-clean" if fighter in ("tmr", "referee") else ""
        target = target_dir / f"F{number:02d}{suffix}.png"
        frame.save(target, optimize=True)
        print(target)


if __name__ == "__main__":
    for fighter, halves in SHEETS.items():
        process_half(fighter, halves[0], 0)
        process_half(fighter, halves[1], 6)
