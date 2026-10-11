# -*- coding: utf-8 -*-
"""MC 风红心道具（回血）"""
import os
from PIL import Image, ImageDraw

OUT = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\game\assets\mc2'
S = 32
im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
PAT = ["0110110", "1111111", "1111111", "1111111", "0111110", "0011100", "0001000"]
cell = 4
ox, oy = (S - 7 * cell) // 2, (S - 7 * cell) // 2
for y, row in enumerate(PAT):
    for x, ch in enumerate(row):
        if ch == '1':
            d.rectangle([ox + x * cell, oy + y * cell, ox + x * cell + cell - 1, oy + y * cell + cell - 1],
                        fill=(226, 59, 46, 255))
# 高光
d.rectangle([ox + cell, oy + cell, ox + 2 * cell - 1, oy + 2 * cell - 1], fill=(255, 150, 140, 255))
# 描边
for y, row in enumerate(PAT):
    for x, ch in enumerate(row):
        if ch == '0':
            nb = False
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < 7 and 0 <= nx < 7 and PAT[ny][nx] == '1': nb = True
            if nb:
                d.rectangle([ox + x * cell, oy + y * cell, ox + x * cell + cell - 1, oy + y * cell + cell - 1],
                            fill=(70, 20, 16, 255))
# 重画实体（描边在下层）
for y, row in enumerate(PAT):
    for x, ch in enumerate(row):
        if ch == '1':
            d.rectangle([ox + x * cell + 1, oy + y * cell + 1, ox + x * cell + cell - 2, oy + y * cell + cell - 2],
                        fill=(226, 59, 46, 255))
d.rectangle([ox + cell + 1, oy + cell + 1, ox + 2 * cell - 2, oy + 2 * cell - 2], fill=(255, 150, 140, 255))

im.save(os.path.join(OUT, 'heart.png'))
im.resize((96, 96), Image.NEAREST).save(r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\heart_preview.png')
print('heart done')
