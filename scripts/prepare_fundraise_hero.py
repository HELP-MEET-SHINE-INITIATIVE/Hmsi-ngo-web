from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/IMG_4808.PNG')
output = Path('/home/ubuntu/Hmsi-ngo-web/public/images/fundraise-community-hero.webp')
output.parent.mkdir(parents=True, exist_ok=True)

image = Image.open(source).convert('RGB')
# Crop the community photo from the mobile browser screenshot, excluding browser chrome and page text.
crop = image.crop((72, 680, 1212, 1900))
crop.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
crop.save(output, 'WEBP', quality=86, method=6)
print(f'Wrote {output} at {crop.size[0]}x{crop.size[1]}')
