"""Prepare the seven 8-frame stationary charged-strike sequences."""
from pathlib import Path
from PIL import Image

from prepare_v5_chroma import trim_and_normalize
from prepare_energy_supers import exact_green_key
from prepare_finishers import keep_main_figure

PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")

SHEETS = {
    "bigcom": ("exec-78d79298-7e88-4010-9e95-0f101fcddf17.png", "exec-42233af7-8276-4042-939a-dcb4b2e77ebd.png"),
    "yashar": ("exec-dedc18d7-a263-4aa0-8697-3f1e1dce7989.png", "exec-798193c9-741a-4a37-9059-f81893c6bd0f.png"),
    "frisbee": ("exec-47ef3f42-1f84-4c2d-8c9d-32fda3917eec.png", "exec-4cea1c0d-2541-41fd-9167-196d45a0333c.png"),
    "tmr": ("exec-ca29a528-a834-4ad5-bfd3-c732425f7555.png", "exec-ea5bcc42-3d69-4b22-b3cb-4b9aef08417e.png"),
    "referee": ("exec-362fd08f-f2c0-43ab-b7b3-93cb23cd47b3.png", "exec-f696ea39-9dd2-4b87-a2c1-7ea4632d96ea.png"),
    "icon": ("exec-93ae24bd-22bb-4b48-874b-df6f39a3f66d.png", "exec-39dbd723-35ff-49a9-9455-65164210d92e.png"),
    "rottweiler": ("exec-36caebc9-d49f-422c-8025-e352335aea52.png", "exec-84284560-febc-4fa9-97ef-c2568a0d56bd.png"),
}


def remove_green_motion_spill(image: Image.Image) -> Image.Image:
    """Charged strikes have no green FX, so saturated green is plate spill."""
    image = image.convert("RGBA")
    px = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            if a and g > 145 and g > r * 1.42 and g > b * 1.42:
                px[x, y] = (r, g, b, 0)
    return image


def destination(fighter: str) -> Path:
    if fighter == "rottweiler":
        return PROJECT / "assets" / "enemies" / "wrestler-dog" / "charged_strike"
    return PROJECT / "assets" / "roster-frames" / fighter / "charged_strike"


def process(fighter: str, filename: str, offset: int) -> None:
    sheet = Image.open(GENERATED / filename).convert("RGBA")
    cell_w = sheet.width / 4
    out = destination(fighter)
    out.mkdir(parents=True, exist_ok=True)
    for i in range(4):
        left, right = round(i * cell_w), round((i + 1) * cell_w)
        inset = round(cell_w * 0.01)
        frame = sheet.crop((left + inset, 0, right - inset, sheet.height))
        frame = exact_green_key(frame)
        frame = remove_green_motion_spill(frame)
        frame = trim_and_normalize(keep_main_figure(frame))
        suffix = "-clean" if fighter in ("tmr", "referee") else ""
        frame.save(out / f"F{offset + i + 1:02d}{suffix}.png", optimize=True)


if __name__ == "__main__":
    for fighter, pair in SHEETS.items():
        process(fighter, pair[0], 0)
        process(fighter, pair[1], 4)
