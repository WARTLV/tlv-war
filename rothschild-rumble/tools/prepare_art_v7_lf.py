"""Prepare CODEX ART BRIEF v7 deliveries from generated chroma sheets."""
from pathlib import Path
from PIL import Image
from prepare_energy_supers import exact_green_key
from prepare_finishers import keep_main_figure
from prepare_v5_chroma import trim_and_normalize

ROOT=Path(r"C:\Users\user\Desktop\קלוד מלך\rothschild-rumble")
GEN=Path(r"C:\Users\user\.codex\generated_images\01a01388-c1e0-70e3-830a-b1e6bd3f8c6d")
SCENES={
 "independence":("exec-d2050c4c-5964-4ea5-bb18-7be64a1d2dd4.png","exec-2b560995-15d8-4124-90dd-705e7889b43d.png","exec-f7a96779-a2fa-4145-bffc-79e79fa9a476.png"),
 "towers":("exec-6094a2f5-1cfe-467f-8fdc-b6c06da4a609.png","exec-ae244b16-e38c-4afb-a341-0630b9902bd9.png","exec-c33c4479-c651-4292-90e7-54710ad2d8c7.png"),
 "nevetzedek":("exec-3f0f2a7b-3b5f-4438-aae7-ad012c6b1bf5.png","exec-f33b862a-2751-482a-9087-574d4529dd9e.png","exec-64c698ca-c210-4df7-8e60-a461ac069bb3.png"),
}
FIGHTERS={
 "bigcom":"exec-3d692ae2-07af-4065-8420-fc2a82bab76e.png",
 "yashar":"exec-03cc74b7-bd55-4523-94c7-11d08d7a7288.png",
 "frisbee":"exec-dec34597-0dd5-48af-ba63-af3bf95ce6f5.png",
 "tmr":"exec-75e36707-a148-4597-a05d-d28cb79b2871.png",
 "referee":"exec-bf198bb1-0d4b-4ef9-a825-dbf2a8a73c2f.png",
 "icon":"exec-d52fa35a-69fe-483e-b708-278a1c9e603b.png",
}
STREET={
 "cart":"exec-3dd9ad1d-5b11-4b5d-8ff1-8faedf841ef9.png",
 "vendor":"exec-51b223a5-01ec-4d45-921c-a5ecee8110c0.png",
 "busker":"exec-15bf58cb-2c96-4db2-a39f-d721ccb8f4c6.png",
 "blanket":"exec-08c87d85-a8f7-4df1-9191-1abc2028412c.png",
}
CARDS={"tmr":"exec-7a03a002-3b9f-4bda-8847-77a551ae13b4.png","referee":"exec-2a5e3bc4-90f9-4a7d-a9d7-bfabbc0f1ac7.png","icon":"exec-a0c01ae7-a83e-40a7-a254-e2371d2bd4b2.png"}

def keyed(im): return exact_green_key(im.convert("RGBA"))
def sprite(im): return trim_and_normalize(keep_main_figure(keyed(im)))
def save_sprite(im,path):
 path.parent.mkdir(parents=True,exist_ok=True); sprite(im).save(path,optimize=True)

def scene_layer(filename, opaque=False):
 im=Image.open(GEN/filename).convert("RGBA").resize((1915,821),Image.Resampling.LANCZOS)
 if opaque: return im.convert("RGB")
 im=keyed(im)
 bbox=im.getchannel("A").getbbox()
 if bbox:
  dy=640-bbox[3]
  shifted=Image.new("RGBA",im.size,(0,0,0,0)); shifted.alpha_composite(im,(0,dy)); im=shifted
 # Hard contract: the engine owns every pixel below the ground line.
 px=im.load()
 for y in range(641,821):
  for x in range(1915): px[x,y]=(0,0,0,0)
 return im

def split_grid(filename,cols,rows):
 im=Image.open(GEN/filename); cw,ch=im.width/cols,im.height/rows
 return [im.crop((round(c*cw),round(r*ch),round((c+1)*cw),round((r+1)*ch))) for r in range(rows) for c in range(cols)]

def main():
 out=ROOT/"assets"/"scenes-v7"
 out.mkdir(parents=True,exist_ok=True)
 for district,(sky,mid,near) in SCENES.items():
  scene_layer(sky,True).save(out/f"{district}-sky.png",optimize=True)
  scene_layer(mid).save(out/f"{district}-mid.png",optimize=True)
  scene_layer(near).save(out/f"{district}-near.png",optimize=True)
 for fighter,fn in FIGHTERS.items():
  cells=split_grid(fn,5,2); suffix="-clean" if fighter in ("tmr","referee") else ""
  for i in range(6): save_sprite(cells[i],ROOT/"assets"/"roster-frames"/fighter/"walk-back"/f"F{i+1:02d}{suffix}.png")
  for i in range(4): save_sprite(cells[i+6],ROOT/"assets"/"roster-frames"/fighter/"idle"/f"F{i+1:02d}{suffix}.png")
 for variant,fn in STREET.items():
  cells=split_grid(fn,4,2); base=ROOT/"assets"/"street-enemy"/variant
  for i in range(4): save_sprite(cells[i],base/"walk"/f"F{i+1:02d}.png")
  for i in range(2): save_sprite(cells[4+i],base/"hurt"/f"F{i+1:02d}.png")
  for i in range(2): save_sprite(cells[6+i],base/"ko"/f"F{i+1:02d}.png")
 cells=split_grid("exec-040ccdd8-0b9f-41d4-9738-a535f983a932.png",5,1)
 for folder,idx in (("jump-rise",0),("jump-fall",1),("land",2)): save_sprite(cells[idx],ROOT/"assets"/"roster-frames"/"bigcom"/folder/"F01.png")
 for i in range(2): save_sprite(cells[3+i],ROOT/"assets"/"roster-frames"/"bigcom"/"victory"/f"F{i+1:02d}.png")
 cards=ROOT/"assets"/"presentation"
 for fighter,fn in CARDS.items():
  im=keyed(Image.open(GEN/fn)).resize((800,800),Image.Resampling.LANCZOS)
  cards.mkdir(parents=True,exist_ok=True); im.save(cards/f"boss-card-{fighter}.png",optimize=True)
 for fn,name in (("exec-7f5c9ce9-d91f-4712-9984-0b0145e64274.png","ko.png"),("exec-06a974ff-17bd-4847-b07e-2e484054a330.png","victory-he.png")):
  keyed(Image.open(GEN/fn)).resize((1200,400),Image.Resampling.LANCZOS).save(cards/name,optimize=True)

if __name__=="__main__": main()
