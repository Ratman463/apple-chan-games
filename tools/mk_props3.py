# -*- coding: utf-8 -*-
"""新机关贴图：史莱姆弹床 / 蜘蛛网 / TNT / 裂纹石墙 / 升降平台"""
import os
from PIL import Image, ImageDraw

OUT = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\game\assets\mc2'
PRE = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test'


def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def save(im, name, scale=4):
    im.save(os.path.join(OUT, name + '.png'))
    im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(os.path.join(PRE, 'p3_' + name + '.png'))
    print(name, im.size)


# ---------- 史莱姆弹床 40x40 ----------
im = new(40, 40); d = ImageDraw.Draw(im)
d.rounded_rectangle([2, 14, 37, 39], radius=7, fill=(96, 200, 108, 235))
d.rounded_rectangle([4, 16, 35, 37], radius=6, fill=(126, 224, 130, 235))
# 顶部高光块
for x in range(0, 36, 6):
    d.rectangle([5 + x, 17, 9 + x, 21], fill=(178, 246, 176, 255))
# 网格线（MC 史莱姆的方块感）
for x in range(10, 36, 10):
    d.rectangle([x, 15, x + 1, 38], fill=(70, 168, 84, 220))
for y in range(24, 39, 7):
    d.rectangle([4, y, 35, y + 1], fill=(70, 168, 84, 220))
d.rectangle([2, 34, 37, 39], fill=(58, 150, 72, 235))
d.rectangle([5, 20, 9, 24], fill=(222, 255, 216, 220))
save(im, 'slime')

# ---------- 蜘蛛网 40x40 ----------
im = new(40, 40); d = ImageDraw.Draw(im)
w = (246, 250, 255, 220)
for i in range(0, 41, 8):
    d.line([(0, i), (40, i)], fill=w, width=2)
    d.line([(i, 0), (i, 40)], fill=w, width=2)
for i in range(-40, 41, 8):
    d.line([(0, i), (40, i + 40)], fill=w, width=2)
    d.line([(0, i), (40, i - 40)], fill=w, width=2)
# 中心略亮
d.ellipse([14, 14, 26, 26], outline=(255, 255, 255, 240), width=2)
save(im, 'web')

# ---------- TNT 40x40 ----------
im = new(40, 40); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 39, 39], fill=(176, 52, 44, 255))
d.rectangle([0, 0, 39, 3], fill=(210, 74, 62, 255))
for x in range(0, 40, 8):
    d.rectangle([x, 4, x + 1, 39], fill=(148, 40, 34, 255))
d.rectangle([0, 14, 39, 26], fill=(240, 238, 228, 255))
d.rectangle([0, 14, 39, 15], fill=(212, 208, 196, 255))
d.rectangle([0, 25, 39, 26], fill=(212, 208, 196, 255))
# TNT 字样（像素块）
letter = {
    'T': [(0, 0), (1, 0), (2, 0), (1, 1), (1, 2), (1, 3), (1, 4)],
    'N': [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (1, 1), (2, 2), (3, 3), (4, 0), (4, 1), (4, 2), (4, 3), (4, 4)],
}
ox = 5
for ch in 'TNT':
    for (px, py) in letter[ch]:
        d.rectangle([ox + px * 2, 16 + py * 1.6, ox + px * 2 + 1, 16 + py * 1.6 + 1], fill=(60, 30, 26, 255))
    ox += 12
d.rectangle([0, 36, 39, 39], fill=(120, 30, 26, 255))
save(im, 'tnt')

# ---------- 裂纹石墙 40x40 ----------
im = new(40, 40); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 39, 39], fill=(178, 176, 170, 255))
for y in range(0, 40, 10):
    for x in range(0, 40, 20):
        o = 10 if (y // 10) % 2 else 0
        d.rectangle([x + o, y, x + o + 1, y + 9], fill=(158, 156, 150, 255))
d.rectangle([0, 0, 39, 1], fill=(206, 204, 198, 255))
d.rectangle([0, 38, 39, 39], fill=(146, 144, 138, 255))
# 裂纹
d.line([(8, 2), (14, 12), (10, 20), (18, 30), (15, 38)], fill=(96, 92, 88, 255), width=2)
d.line([(14, 12), (24, 8)], fill=(96, 92, 88, 255), width=2)
d.line([(18, 30), (30, 34)], fill=(96, 92, 88, 255), width=2)
d.line([(28, 4), (34, 14), (30, 22)], fill=(96, 92, 88, 255), width=2)
save(im, 'cracked')

# ---------- 升降平台 60x18 ----------
im = new(60, 18); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 59, 17], fill=(150, 150, 146, 255))
d.rectangle([0, 0, 59, 3], fill=(198, 198, 192, 255))
d.rectangle([0, 14, 59, 17], fill=(112, 112, 108, 255))
for x in range(0, 60, 12):
    d.rectangle([x, 0, x + 1, 17], fill=(128, 128, 124, 255))
for x in range(4, 60, 12):
    d.rectangle([x, 5, x + 5, 9], fill=(88, 88, 86, 255))
    d.rectangle([x + 1, 6, x + 4, 7], fill=(190, 190, 184, 255))
save(im, 'lift')
print('all done')
