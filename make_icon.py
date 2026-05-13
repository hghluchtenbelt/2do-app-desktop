from PIL import Image, ImageDraw

size = 256
img = Image.new('RGBA', (size, size), (20, 20, 20, 255))
draw = ImageDraw.Draw(img)

# Draw a white checkmark on dark background
# This won't turn blue when Windows applies overlay
draw.line([(60, 140), (100, 180)], fill=(34, 197, 94), width=24)
draw.line([(100, 180), (200, 60)], fill=(34, 197, 94), width=24)

img.save('C:\\Users\\lucht004\\Documents\\2do-app-desktop\\public\\icon.ico')
print("Icon created")
