# -*- coding: utf-8 -*-
"""远景村庄剪影（果酱村的背景氛围层）"""
import os, random
from PIL import Image, ImageDraw

OUT = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\game\assets'
W, H = 1440, 240
im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
random.seed(20261012)

FAR = (172, 198, 208, 238)      # 远处：淡冷灰蓝
NEAR = (146, 182, 174, 242)     # 近处：淡青绿

# 远处的房子（小、淡）
x = 0
while x < W:
    w = random.randint(46, 74)
    h = random.randint(30, 52)
    base = H - random.randint(6, 20)
    col = FAR
    d.rectangle([x, base - h, x + w, base], fill=col)
    d.polygon([(x - 6, base - h), (x + w + 6, base - h), (x + w // 2, base - h - 22)], fill=col)
    # 烟囱
    if random.random() < .5:
        d.rectangle([x + w - 16, base - h - 20, x + w - 10, base - h - 4], fill=col)
    x += w + random.randint(10, 30)

# 近处的房子（大一点）
x = 20
while x < W:
    w = random.randint(66, 104)
    h = random.randint(44, 70)
    base = H - random.randint(0, 10)
    col = NEAR
    d.rectangle([x, base - h, x + w, base], fill=col)
    d.polygon([(x - 9, base - h), (x + w + 9, base - h), (x + w // 2, base - h - 30)], fill=col)
    # 窗
    for i in range(2):
        wx = x + 12 + i * 34
        if wx + 14 < x + w:
            d.rectangle([wx, base - h + 14, wx + 14, base - h + 28], fill=(255, 244, 205, 210))
    x += w + random.randint(24, 60)

# 几棵树
for _ in range(26):
    tx = random.randint(0, W)
    ty = H - random.randint(0, 16)
    th = random.randint(26, 44)
    d.rectangle([tx - 3, ty - th, tx + 3, ty], fill=(126, 156, 150, 242))
    d.ellipse([tx - 20, ty - th - 26, tx + 20, ty - th + 14], fill=(140, 178, 148, 240))

im.save(os.path.join(OUT, 'village_bg.png'))
im.resize((720, 120), Image.LANCZOS).save(r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\prev_village.png')
print('village_bg.png', im.size)
