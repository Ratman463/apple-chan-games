# -*- coding: utf-8 -*-
"""新道具：金属弹簧 / 蜜蜂 / 稻草人 / 苹果篮"""
import os
from PIL import Image, ImageDraw

OUT = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\game\assets\mc2'
MC = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\mctex'


def tex(n, size=None):
    im = Image.open(os.path.join(MC, n + '.png')).convert('RGBA')
    return im.resize(size, Image.NEAREST) if size else im


# ---------- 金属弹簧 ----------
W, H = 40, 28
sp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(sp)
d.rectangle([2, H - 6, W - 3, H - 1], fill=(122, 128, 136, 255), outline=(70, 74, 80, 255), width=2)  # 底座
d.rectangle([6, 0, W - 7, 5], fill=(160, 166, 174, 255), outline=(70, 74, 80, 255), width=2)          # 顶板
for i in range(3):                                                                                    # 弹簧圈
    y = 7 + i * 5
    d.rectangle([7, y, W - 8, y + 2], fill=(196, 202, 210, 255))
    d.rectangle([7, y + 3, W - 8, y + 3], fill=(120, 126, 134, 255))
sp.save(OUT + r'\spring.png')

# ---------- 蜜蜂 ----------
bw, bh = 34, 26
bee = Image.new('RGBA', (bw, bh), (0, 0, 0, 0))
d = ImageDraw.Draw(bee)
d.ellipse([6, 8, 30, 22], fill=(238, 196, 60, 255), outline=(70, 55, 20, 255), width=2)   # 身体
for i in range(2):                                                                       # 黑条纹
    x = 14 + i * 7
    d.rectangle([x, 10, x + 3, 20], fill=(50, 42, 30, 255))
d.ellipse([3, 9, 13, 18], fill=(60, 52, 40, 255))                                        # 头
d.ellipse([9, 2, 22, 13], fill=(226, 238, 246, 200), outline=(150, 170, 185, 220), width=2)  # 翅膀
d.rectangle([4, 12, 7, 15], fill=(255, 255, 255, 255))                                   # 眼
bee.save(OUT + r'\bee.png')

# ---------- 稻草人 ----------
sw, sh = 40, 76
sc = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
d = ImageDraw.Draw(sc)
d.rectangle([18, 18, 22, sh - 1], fill=(150, 112, 64, 255), outline=(90, 62, 30, 255), width=2)   # 木桩
d.rectangle([2, 28, 38, 33], fill=(150, 112, 64, 255), outline=(90, 62, 30, 255), width=2)        # 横木
d.rectangle([8, 33, 33, 54], fill=(224, 190, 96, 255), outline=(150, 118, 44, 255), width=2)      # 稻草身体
d.polygon([(20, 4), (36, 20), (4, 20)], fill=(220, 186, 88, 255), outline=(150, 118, 44, 255))    # 草帽
d.ellipse([15, 20, 25, 28], fill=(238, 220, 180, 255))                                            # 脸
d.rectangle([17, 23, 18, 24], fill=(60, 45, 30, 255))
d.rectangle([22, 23, 23, 24], fill=(60, 45, 30, 255))
sc.save(OUT + r'\scarecrow.png')

# ---------- 苹果篮 ----------
kw, kh = 40, 30
bk = Image.new('RGBA', (kw, kh), (0, 0, 0, 0))
d = ImageDraw.Draw(bk)
d.rectangle([4, 12, 35, 28], fill=(176, 132, 74, 255), outline=(110, 76, 36, 255), width=2)       # 篮身
for y in range(14, 27, 4):                                                                        # 编织纹
    d.line([6, y, 33, y], fill=(140, 100, 52, 255), width=2)
d.arc([8, 2, 31, 18], start=180, end=360, fill=(110, 76, 36, 255), width=3)                       # 提手
a = tex('item_apple', (14, 14))
bk.alpha_composite(a, (7, 4)); bk.alpha_composite(a, (19, 2))
bk.save(OUT + r'\basket.png')

# 预览
names = ['spring', 'bee', 'scarecrow', 'basket']
sheet = Image.new('RGBA', (4 * 92, 100), (235, 235, 235, 255))
for i, n in enumerate(names):
    im = Image.open(f'{OUT}\\{n}.png')
    sheet.alpha_composite(im, (i * 92 + 10, 90 - im.height))
sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(
    r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\props2_preview.png')
print('props2 done')
