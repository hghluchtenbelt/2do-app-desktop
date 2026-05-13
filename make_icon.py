import os
from PIL import Image, ImageDraw

size = 256
img = Image.new('RGBA', (size, size), (20, 20, 20, 255))
draw = ImageDraw.Draw(img)

# Green checkmark on dark background
draw.line([(60, 140), (100, 180)], fill=(34, 197, 94), width=24)
draw.line([(100, 180), (200, 60)], fill=(34, 197, 94), width=24)

icon_path = os.path.join(os.path.dirname(__file__), 'public', 'icon.ico')
img.save(icon_path)
print(f"Icon created: {icon_path}")
