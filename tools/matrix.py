# -*- coding: utf-8 -*-
"""直接调用游戏自身投掷逻辑，构建 距离 x 蓄力 命中矩阵"""
import time
from playwright.sync_api import sync_playwright

URL = 'https://game.ratapi.com/adventure/'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(URL, wait_until='networkidle', timeout=60000)
    time.sleep(1.5)
    pg.click('text=进入果园')
    time.sleep(2.0)

    def trial(tx, ty, back, c):
        return pg.evaluate("""async ([tx,ty,back,c]) => {
          const g = window.__game;
          g.dlg = null;
          const p = g.player;
          p.x = tx*40+20 - back; p.y = ty*40+42; p.vx = 0; p.vy = 0; p.face = 1; p.throwT = 0;
          g.targets.forEach(t => t.on = false);
          g.applesArr = []; g.apples = 9; g.gold = 3; p.throwT = 0;
          p.charging = true; p.charge = c;
          g.releaseThrow();
          const a0 = g.applesArr[0];
          for (let i = 0; i < 220; i++) {
            await new Promise(r => requestAnimationFrame(r));
            if (!g.applesArr.length) break;
          }
          const tg = g.targets.find(t => t.x === tx && t.y === ty);
          return { on: tg.on, spawn: a0 ? Math.round(a0.x)+','+Math.round(a0.y) : 'none' };
        }""", [tx, ty, back, c])

    for (tx, ty) in [(18, 12), (73, 12), (53, 7)]:
        print(f'--- 靶子 ({tx},{ty}) ---')
        for back in (60, 100, 140, 200, 300, 450, 600):
            row = []
            for c in (0, .25, .5, .75, 1.0):
                r = trial(tx, ty, back, c)
                row.append('O' if r['on'] else '.')
            print(f'   距离{back:>3}px  蓄力0/.25/.5/.75/1 : {" ".join(row)}')
    b.close()
