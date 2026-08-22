"""Split and key the seven 12-frame energy-super sprite sequences."""
from pathlib import Path
from PIL import Image

from prepare_v5_chroma import trim_and_normalize
from prepare_finishers import keep_main_figure

PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")

SHEETS = {
    "bigcom": ("exec-020188b6-0488-496b-b575-473481dfee98.png", "exec-6548c79d-0ad3-4655-8e50-2fb68a31f389.png"),
    "yashar": ("exec-4edbde5c-09c9-4386-9a06-c91058147f09.png", "exec-2430f56d-cabb-454b-8692-37be992d9224.png"),
    "frisbee": ("exec-d68f7ca5-a8f8-4783-b46c-049849e4f210.png", "exec-90b78df5-747a-4600-a9f5-a199dc90be73.png"),
    "tmr": ("exec-b5e08006-8c88-492a-9a6c-cf0e03a875fe.png", "exec-a02676e7-1711-4239-9798-f1e59b3af227.png"),
    "referee": ("exec-cc991f9d-873a-4844-963f-bdf891db68bd.png", "exec-8df25bc0-47d3-490b-a027-28576b122983.png"),
    "icon": ("exec-fbb067a4-c4af-4dd9-91e2-04b5531c17cc.png", "exec-7182a0eb-7a13-4a3b-8c3b-0b33c2c28856.png"),
    "rottweiler": ("exec-bbde9fa4-7922-4b2b-86ac-e2e76615afd0.png", "exec-11ec1a70-a4c2-4724-956a-2b2cae33d861.png"),
}


def exact_green_key(image: Image.Image) -> Image.Image:
    """Remove only the near-pure plate green, preserving Yashar's luminous green FX."""
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            if g > 205 and r < 58 and b < 58 and g - max(r, b) > 155:
                pixels[x, y] = (r, g, b, 0)
            elif g > 175 and r < 90 and b < 90 and g - max(r, b) > 100:
                # Soft fringe decontamination around the keyed silhouette.
                alpha = max(0, min(255, int((155 - (g - max(r, b))) * 4.6)))
                pixels[x, y] = (r, min(g, max(r, b) + 18), b, alpha)
    return image


def out_dir(fighter: str) -> Path:
    if fighter == "rottweiler":
        return PROJECT / "assets" / "enemies" / "wrestler-dog" / "energy_super"
    return PROJECT / "assets" / "roster-frames" / fighter / "energy_super"


def process_half(fighter: str, filename: str, offset: int) -> None:
    sheet = Image.open(GENERATED / filename).convert("RGBA")
    cell_w = sheet.width / 6
    target_dir = out_dir(fighter)
    target_dir.mkdir(parents=True, exist_ok=True)
    for i in range(6):
        left, right = round(i * cell_w), round((i + 1) * cell_w)
        inset = round(cell_w * 0.008)
        frame = sheet.crop((left + inset, 0, right - inset, sheet.height))
        frame = trim_and_normalize(keep_main_figure(exact_green_key(frame)))
        suffix = "-clean" if fighter in ("tmr", "referee") else ""
        target = target_dir / f"F{offset + i + 1:02d}{suffix}.png"
        frame.save(target, optimize=True)
        print(target)


if __name__ == "__main__":
    for fighter, pair in SHEETS.items():
        process_half(fighter, pair[0], 0)
        process_half(fighter, pair[1], 6)
