"""Local reference contact sheets; never write third-party plates to public/."""
from pathlib import Path
import argparse
from PIL import Image, ImageOps, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("iteration")
parser.add_argument("--previous", default="round-00")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / "references/private/iterations" / args.iteration
out.mkdir(parents=True, exist_ok=True)
views = {
    "climber": ("design-31.jpg", (520, 295, 1245, 690)),
    "base": ("design-10.jpg", (408, 110, 1380, 800)),
    "station": ("design-43.jpg", (420, 160, 1330, 835)),
    "ice-shield": ("design-38.jpg", (480, 285, 1285, 745)),
    "cabin-aisle": ("plate-06.png", (0, 155, 1440, 820)),
    "cabin-control": ("plate-06.png", (0, 155, 1440, 820)),
}
reference_crops = {"cabin-aisle": (0, 330, 552, 587), "cabin-control": (0, 2093, 552, 2352)}
for name, (reference, crop) in views.items():
    sheet = Image.new("RGB", (1800, 630), "#182028")
    draw = ImageDraw.Draw(sheet)
    sources = [
        (root / "references/private" / reference, f"REFERENCE / {reference}", reference_crops.get(name)),
        (root / "previews/iterations" / args.previous / f"{name}.png", f"BEFORE / {args.previous}", crop),
        (root / "previews/iterations" / args.iteration / f"{name}.png", f"AFTER / {args.iteration}", crop),
    ]
    for i, (path, label, bounds) in enumerate(sources):
        im = Image.open(path).convert("RGB")
        if bounds:
            im = im.crop(bounds)
        im = ImageOps.contain(im, (580, 550), Image.Resampling.LANCZOS)
        sheet.paste(im, (i * 600 + (600 - im.width) // 2, 45 + (550 - im.height) // 2))
        draw.text((i * 600 + 14, 17), label, fill="#e8edf1")
    draw.text((14, 610), "Uncalibrated perspective / aspect ratios preserved / private comparison only", fill="#a4b4c1")
    sheet.save(out / f"{name}-comparison.jpg", quality=93)
print(out)
