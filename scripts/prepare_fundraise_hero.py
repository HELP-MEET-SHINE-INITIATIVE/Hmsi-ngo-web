from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/IMG_4806.JPG')
output = Path('/home/ubuntu/Hmsi-ngo-web/public/images/fundraise-community-hero.webp')
output.parent.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert('RGB')
# The supplied campaign artwork is already square; resize it for a crisp, efficient web hero asset.
crop = image
crop.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
crop.save(output, 'WEBP', quality=86, method=6)
print(f'Wrote {output} at {crop.size[0]}x{crop.size[1]}')
