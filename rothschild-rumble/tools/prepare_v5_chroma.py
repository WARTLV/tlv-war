from pathlib import Path
from PIL import Image

PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")
CANVAS = (768, 1024)
FOOTLINE = 980

SHEETS = [
    ("exec-24bdce9d-f272-428f-9bae-6c83d0844a30.png", "bigcom", "guard", 1, False),
    ("exec-66363379-0d4d-4a35-9683-df583065e2aa.png", "bigcom", "hurt", 2, False),
    ("exec-ef1d2ea5-bf50-4996-ab15-38a296e42a3c.png", "bigcom", "ko", 2, False),
    ("exec-d8407d1f-966b-4ad8-b331-ce409c6c7c76.png", "frisbee", "walk", 4, False),
    ("exec-84452a35-2824-4901-874c-7fc29fd8f418.png", "frisbee", "hurt", 2, False),
    ("exec-2bb8f74e-070d-407d-9762-276c237ff923.png", "frisbee", "ko", 2, False),
    ("exec-c123183e-ef18-437b-93ea-cbbdb87a36c8.png", "tmr", "walk", 4, True),
    ("exec-42915fcc-92f8-4810-9aec-a2ed2e05b073.png", "referee", "walk", 4, True),
    ("exec-f955e190-44b3-42e0-912d-ddcf37988d02.png", "icon", "walk", 4, False),
]


def chroma_key(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = px[x, y]
            dominance = g - max(r, b)
            if g >= 135 and dominance >= 28:
                alpha = max(0, min(255, int(255 * (75 - dominance) / 47)))
                if alpha:
                    g = min(g, int((r + b) / 2) + 12)
                px[x, y] = (r, g, b, alpha)
    return image


def trim_and_normalize(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("Chroma key removed the entire frame")
    cut = image.crop(bbox)
    max_w, max_h = 690, 930
    scale = min(max_w / cut.width, max_h / cut.height)
    size = (max(1, round(cut.width * scale)), max(1, round(cut.height * scale)))
    cut = cut.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    x = (CANVAS[0] - cut.width) // 2
    y = FOOTLINE - cut.height
    canvas.alpha_composite(cut, (x, y))
    return canvas


def process_sheet(filename, fighter, move, count, clean_suffix):
    source = GENERATED / filename
    sheet = Image.open(source).convert("RGBA")
    cell_w = sheet.width / count
    out_dir = PROJECT / "assets" / "roster-frames" / fighter / move
    out_dir.mkdir(parents=True, exist_ok=True)
    for index in range(count):
        left = round(index * cell_w)
        right = round((index + 1) * cell_w)
        # The Icon's long robe crosses the model's nominal cell seam; inset
        # each cell enough to exclude the neighboring pose's stray coat edge.
        if fighter == "icon":
            inset = round(cell_w * 0.10)
            left += inset
            right -= inset
        frame = sheet.crop((left, 0, right, sheet.height))
        frame = trim_and_normalize(chroma_key(frame))
        suffix = "-clean" if clean_suffix else ""
        target = out_dir / f"F{index + 1:02d}{suffix}.png"
        frame.save(target, optimize=True)
        print(target)


if __name__ == "__main__":
    for spec in SHEETS:
        process_sheet(*spec)
