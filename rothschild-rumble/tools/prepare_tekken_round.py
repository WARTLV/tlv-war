"""Split, key and normalize the v7 Tekken-style specials and hit reactions."""
from pathlib import Path
from PIL import Image

from prepare_v5_chroma import trim_and_normalize
from prepare_energy_supers import exact_green_key
from prepare_finishers import keep_main_figure

PROJECT = Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GENERATED = Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")

SPECIALS = {
    "bigcom": ("exec-cb3fcb46-2b5e-4d8d-ab0c-b821bca54a91.png", "exec-c6ca8798-e033-42d3-817f-c15296dfe098.png"),
    "yashar": ("exec-1a194289-2102-49da-81e0-d606ba39635d.png", "exec-2afe131f-80a4-4657-a3ef-1b1f018d1559.png"),
    "frisbee": ("exec-663a9f9f-9ae8-4664-9303-fe5d1cb1f43b.png", "exec-cc5cef0a-b21e-4ad9-9883-be78b61de780.png"),
    "tmr": ("exec-06841ecf-4d0a-4eea-a6be-981ecde5a2df.png", "exec-1aabae04-3ab1-4c29-9b23-eed266378a3e.png"),
    "referee": ("exec-f313b853-be7d-4f9f-8674-f271c1f02504.png", "exec-7c4ac529-f7eb-4b04-ae12-c3fb682f944d.png"),
    "icon": ("exec-18c9349f-eaa9-44c4-8c03-30de613cc5f3.png", "exec-694b6254-6fbf-4aa6-b8d9-ee71cc051868.png"),
    "rottweiler": ("exec-3b7965f1-6aa3-444f-a4f2-4f225a44989b.png", "exec-0887a206-922b-4ce7-9322-bc05188f4b4c.png"),
}

REACTIONS = {
    "bigcom": "exec-1c2d2407-5c17-4179-b987-a221dba461a4.png",
    "yashar": "exec-4e63623a-4400-4bea-8e25-515101555d25.png",
    "frisbee": "exec-30a3521c-3269-42cc-9c4f-770cf39f3ffc.png",
    "tmr": "exec-ae3215bd-36d9-42f8-a9ce-d92ad145178b.png",
    "referee": "exec-fd50eff2-98c1-40c4-9b15-f5f117ac7c85.png",
    "icon": "exec-4be9fb68-599b-442d-972f-8e1f3c6b5134.png",
    "rottweiler": "exec-e7ac1aa8-1fb8-462a-925c-04deafec6183.png",
}

KINDS = ("hurt_high", "hurt_mid", "hurt_low", "hurt_launch", "hurt_crumple")

def base(fighter):
    if fighter == "rottweiler":
        return PROJECT / "assets" / "enemies" / "wrestler-dog"
    return PROJECT / "assets" / "roster-frames" / fighter

def finish(frame):
    return trim_and_normalize(keep_main_figure(exact_green_key(frame.convert("RGBA"))))

def save(frame, fighter, folder, number):
    out = base(fighter) / folder
    out.mkdir(parents=True, exist_ok=True)
    suffix = "-clean" if fighter in ("tmr", "referee") else ""
    finish(frame).save(out / f"F{number:02d}{suffix}.png", optimize=True)

def split_special(fighter, pair):
    for half, filename in enumerate(pair):
        sheet = Image.open(GENERATED / filename)
        cw = sheet.width / 4
        for i in range(4):
            save(sheet.crop((round(i*cw), 0, round((i+1)*cw), sheet.height)), fighter, "tekken_special", half*4+i+1)

def split_reactions(fighter, filename):
    sheet = Image.open(GENERATED / filename)
    cw, ch = sheet.width / 5, sheet.height / 2
    frames = []
    for row in range(2):
        for col in range(5):
            frames.append(sheet.crop((round(col*cw), round(row*ch), round((col+1)*cw), round((row+1)*ch))))
    # Atlas order: high1/high2, mid1/mid2, low1, low2, launch1/launch2, crumple1/crumple2.
    for idx, kind in enumerate(KINDS):
        save(frames[idx*2], fighter, kind, 1)
        save(frames[idx*2+1], fighter, kind, 2)

if __name__ == "__main__":
    for fighter, pair in SPECIALS.items(): split_special(fighter, pair)
    for fighter, filename in REACTIONS.items(): split_reactions(fighter, filename)
