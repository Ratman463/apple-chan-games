# -*- coding: utf-8 -*-
"""重拍两张游戏厅缩略图（480x270）"""
import time
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\game\assets'
KILL = "() => { const g=window.__game; if(!g) return; g.say=()=>{}; g.dlg=null; const d=document.getElementById('dialog'); if(d) d.style.display='none'; }"


def to_thumb(src, dst):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    # 裁成 16:9 再缩到 480x270
    tw, th = 16, 9
    if w / h > tw / th:
        nw = int(h * tw / th); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(w * th / tw); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((480, 270), Image.LANCZOS)
    im.save(dst)
    print('  ->', dst.split('\\')[-1], im.size)


with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])

    # ---- 跑酷 ----
    pg = b.new_page(viewport={'width': 1400, 'height': 820})
    pg.goto('https://game.ratapi.com/runner/', wait_until='networkidle', timeout=60000)
    time.sleep(1.5)
    pg.fill('#input-name', '果酱')
    pg.click('#btn-play')
    time.sleep(4.0)
    pg.keyboard.down('j'); time.sleep(0.35); pg.keyboard.up('j')
    time.sleep(0.30)
    el = pg.query_selector('#game')
    el.screenshot(path='thumb_run_src.png')
    print('runner shot ok')
    pg.close()

    # ---- 大冒险 ----
    pg2 = b.new_page(viewport={'width': 1400, 'height': 820})
    pg2.goto('https://game.ratapi.com/adventure/', wait_until='networkidle', timeout=60000)
    time.sleep(1.5)
    pg2.click('#btn-play')
    time.sleep(2.0)
    pg2.evaluate(KILL)
    pg2.evaluate("""() => { const g=window.__game;
      g.enemies.forEach(e=>e.dead=true);
      g.player.x=58*40; g.player.y=520; g.player.face=1; g.cam.x=58*40-320; }""")
    time.sleep(0.8); pg2.evaluate(KILL)
    pg2.keyboard.down('j'); time.sleep(0.5); pg2.keyboard.up('j')
    time.sleep(0.3)
    el2 = pg2.query_selector('#game')
    el2.screenshot(path='thumb_adv_src.png')
    print('adventure shot ok')
    pg2.close()
    b.close()

to_thumb('thumb_run_src.png', OUT + r'\thumb-runner.png')
to_thumb('thumb_adv_src.png', OUT + r'\thumb-adventure.png')
print('done')
