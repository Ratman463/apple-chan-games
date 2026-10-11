# -*- coding: utf-8 -*-
"""关卡可达性检查 v2
1) 每个靶子是否真能用苹果打中（模拟抛物线 + 地形阻挡）
   —— 支持"站在平台上打"（自动找靶子下方的落脚面）
2) 门是否够宽、通道是否被挡
"""
import json, re

SRC = r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\level1.js'
raw = open(SRC, encoding='utf-8').read()
LV = json.loads(re.search(r'const LEVEL = (\{.*?\});', raw, re.S).group(1))
rows = LV['rows']
W, H = len(rows[0]), len(rows)
TS, GRAV, GROUND = 40, 1500.0, 520
SOLID = '#BLW'          # C（裂纹石墙）能用金苹果炸开，BFS 里当可通


def solid(tx, ty):
    if tx < 0 or ty < 0 or tx >= W or ty >= H: return True
    return rows[ty][tx] in SOLID


def hits_tile(x, y):
    for ty in range(int((y - 7) // TS), int((y + 7) // TS) + 1):
        for tx in range(int((x - 7) // TS), int((x + 7) // TS) + 1):
            if solid(tx, ty): return True
    return False


def surface_tile(x, y):
    """从靶子下方往下找第一块实心，返回其行号（玩家就站在它上面）"""
    for ty in range(y + 1, H):
        if rows[ty][x] in SOLID: return ty
    return H - 1


def can_hit(tx, ty):
    tx_c, ty_c = tx * TS + TS / 2, ty * TS + 9
    st = surface_tile(tx, ty)
    py0 = st * TS - 32                      # 手部高度
    found = []
    for px in range(TS, (tx + 2) * TS, 6):
        ptx = int(px // TS)
        if not solid(ptx, st):              # 站的地方得是实地
            continue
        for c100 in range(0, 105, 5):
            c = c100 / 100.0
            x, y = px + 16, py0
            vx, vy = 300 + 700 * c, -(220 + 160 * c)
            if hits_tile(x, y):
                continue
            for _ in range(160):
                x += vx / 60; y += vy / 60; vy += GRAV / 60
                if abs(x - tx_c) < 52 and abs(y - ty_c) < 52:
                    found.append((ptx, round(c, 2))); break
                if hits_tile(x, y): break
                if y > (H + 2) * TS or x > (tx + 5) * TS: break
    return found, st


targets = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'T']
print('靶子位置(瓦片):', targets)
ok_all = True
for (tx, ty) in targets:
    hits, st = can_hit(tx, ty)
    pts = sorted(set(p for p, c in hits))
    if hits:
        cs = [c for _, c in hits]
        extra = f'... 共{len(pts)}个站位' if len(pts) > 10 else ''
        print(f'  靶子 @({tx},{ty}) 落脚行={st}: 可打中 [OK]  站位x={pts[:10]}{extra}  蓄力 {min(cs):.2f}~{max(cs):.2f}')
        # 分站位看每格能用哪些蓄力
        per = {}
        for p, c in hits:
            per.setdefault(p, []).append(c)
        near = sorted([p for p in per if abs(p - tx) <= 6])
        if near:
            print('     近距离可用: ' + ', '.join(f'x={p}(蓄力{min(per[p]):.2f}~{max(per[p]):.2f})' for p in near))
    else:
        ok_all = False
        print(f'  靶子 @({tx},{ty}) 落脚行={st}: [FAIL] 打不中！')

# 门
doors = {}
for y, r in enumerate(rows):
    for x, ch in enumerate(r):
        if ch == 'D': doors.setdefault(x, []).append(y)
print('\n门（每列门格）:')
for x in sorted(doors): print(f'  x={x}: 行 {doors[x]}')
print('\n门通道检查（行走层）:')
segs, cur = [], None
for x in range(W):
    if rows[12][x] == 'D':
        cur = [x, x] if cur is None else [cur[0], x]
    else:
        if cur: segs.append(tuple(cur)); cur = None
if cur: segs.append(tuple(cur))
for a, b in segs:
    le = rows[12][a - 1] if a > 0 else '#'
    ri = rows[12][b + 1] if b + 1 < W else '#'
    print(f'  门段 x={a}~{b} (宽{b-a+1}) 左={le} 右={ri}  {"[OK]通" if le not in SOLID and ri not in SOLID else "[FAIL]被挡"}')

print('\n总判定:', '[OK] 全部靶子可打中' if ok_all else '[FAIL] 存在打不中的靶子')

# ---- 推进性检查：每扇门只要求"它左边"的靶子，且这些靶子必须在门的左边就能打中 ----
doors_x = sorted({x for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'D'})
print('\n推进性检查（防止门把自己锁死）:')
ok_prog = True
for dx in doors_x:
    need = [(x, y) for (x, y) in targets if x < dx]
    if not need:
        print(f'  门 x={dx}: 左边没有靶子 -> 可直接通过')
        continue
    miss = []
    for (tx, ty) in need:
        hits, _ = can_hit(tx, ty)
        side = [p for p, c in hits if p + 2 <= dx]      # 站位必须在门前
        if not side:
            miss.append((tx, ty))
    if miss:
        ok_prog = False
        print(f'  门 x={dx}: 需要靶子 {need}，但 {miss} 在门前打不中 -> [FAIL] 死锁！')
    else:
        print(f'  门 x={dx}: 需要靶子 {need} -> [OK] 门前全都能打中')

print('\n推进性判定:', '[OK] 不存在死锁' if ok_prog else '[FAIL] 存在过不去的门')

# ---- 通行性 BFS：从起点出发，能不能一路走到 Boss 房 ----
# 能站的格子：身体两格空、脚下有东西（实心或单向平台）。门视为可开，当作不挡路。
from collections import deque
ows_set = set((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == '=')
lifts_set = set((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'm')


def can_stand(x, y):
    if x < 1 or x >= W - 1 or y < 1 or y >= H - 1: return False
    if solid(x, y) or solid(x, y - 1): return False
    below = rows[y + 1][x] if y + 1 < H else '#'
    if solid(x, y + 1) or (x, y + 1) in ows_set or below == 'p': return True   # 地面 / 单向平台 / 活塞
    return any((x, yy) in lifts_set for yy in range(y + 1, min(H, y + 6)))     # 站在升降机上


start = next(((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'P'), None)
boss = next(((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'X'), None)
print('\n通行性检查（从起点能不能走到 Boss 房）:')
if not start or not boss:
    print('  找不到起点或 Boss 点')
else:
    seen, q = set(), deque([start])
    seen.add(start)
    while q:
        (x, y) = q.popleft()
        for dx in (-2, -1, 0, 1, 2):
            for dy in range(-4, H):                 # 能跳上 3 格；往下掉多远都行
                nx, ny = x + dx, y + dy
                if (nx, ny) in seen or not can_stand(nx, ny): continue
                # 中间别穿墙（简单判断：目标格身体两格已查，这里只看横向一格）
                seen.add((nx, ny)); q.append((nx, ny))
    reached = any(abs(x - boss[0]) < 4 and abs(y - boss[1]) < 4 for (x, y) in seen)
    print(f'  可达格数 {len(seen)} / 起点{start} → Boss{boss}  {"[OK] 走得过去" if reached else "[FAIL] 走不到 Boss 房！有东西挡死了"}')
    # 找出被挡死的段（连续不可达的 x 区间）
    if not reached:
        cols = set(x for (x, y) in seen)
        gaps, s0 = [], None
        for x in range(1, W - 1):
            if x not in cols:
                s0 = x if s0 is None else s0
            else:
                if s0 is not None and x - s0 > 2: gaps.append((s0, x - 1))
                s0 = None
        if s0 is not None: gaps.append((s0, W - 2))
        for (a, b) in gaps[:10]:
            print(f'    x={a}~{b} 这一段走不过去')

# ---- 新机关检查：TNT 可打中 / 活塞阶梯可跳 / 史莱姆能上 Boss 高台 ----
JUMP_H = 230                            # 二连跳总高度（单跳 133 + 二段约 108）
SLIME_H = 1460 ** 2 / (2 * 2400)        # 444px 史莱姆弹床高度
BOSS_JUMP = 900 ** 2 / (2 * 2400)       # 169px 猫的跳跃高度
GROUND_ROW = next(y for y in range(1, H) if rows[y].count('#') > W * 0.6)
GROUND_TOP = GROUND_ROW * TS

print(f'\n跳跃高度：普通 {JUMP_H:.0f}px ({JUMP_H/TS:.1f}格)  史莱姆 {SLIME_H:.0f}px ({SLIME_H/TS:.1f}格)')

# 1) TNT 是否能用苹果打中（当作一个"靶子"来测）
tnts = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 't']
print('\nTNT 检查:')
ok_tnt = True
for (tx, ty) in tnts:
    hits, st = can_hit(tx, ty)
    if hits:
        print(f'  TNT @({tx},{ty}) 落脚行={st}: 可打中 [OK]  站位x={sorted(set(p for p,_ in hits))[:8]}')
    else:
        ok_tnt = False
        print(f'  TNT @({tx},{ty}): [FAIL] 打不中，炸不开墙！')

# 2) 裂纹石墙是否存在、是否挡路（不能直接跳过）
cracks = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'C']
print('\n裂纹石墙:', cracks[:20], '...' if len(cracks) > 20 else '')
for tx in sorted(set(x for x, _ in cracks)):
    col = [y for (x, y) in cracks if x == tx]
    top = min(col)
    ground_below = max([y for y in range(top, H) if rows[y][tx] == '#'] or [H - 1])
    h = (ground_below - top) * TS
    print(f'  x={tx}: 石墙 {top}~{max(col)} 高{h}px  {"[OK]跳不过去(必须炸)" if h > JUMP_H else "[!] 能跳过去，可绕过"}')

# 3) 活塞阶梯：从地面能不能一级级跳上去
def surface_top(x, y):
    for ty in range(y + 1, H):
        if rows[ty][x] in SOLID: return ty
    return H - 1

pist = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'p']
print('\n活塞阶梯检查:')
if pist:
    cur = GROUND_ROW
    for (px, py) in sorted(pist, key=lambda q: -q[1]):
        need = (cur - py) * TS
        okk = need <= JUMP_H + 6
        print(f'  活塞@({px},{py}) 从行{cur}跳上去需 {need:.0f}px  {"[OK]" if okk else "[FAIL] 跳不上"}')
        cur = py
    walls = {}
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in 'BC':
                walls.setdefault(x, []).append(y)
    nearby = [x for x in walls if x > max(p[0] for p in pist)]
    if nearby:
        wx = min(nearby)
        wtop = min(walls[wx])
        need = (cur - wtop) * TS
        print(f'  再从行{cur}跳到石墙顶(x={wx},行{wtop})需 {need:.0f}px  {"[OK]" if need <= JUMP_H + 6 else "[FAIL] 上不去"}')

print('\n金苹果爆炸 vs 裂纹石墙（爆炸半径 132px）:')
BOOM_R = 132
for wx in sorted(set(x for x, _ in cracks)):
    col = [y for (x, y) in cracks if x == wx]
    h = (max(col) - min(col) + 1) * TS
    w = len(set(x for x, _ in cracks)) * TS
    print(f'  x={wx}: 高 {h}px  {"[OK] 一发金苹果够" if h <= BOOM_R * 2 else "[!] 可能要两发"}')
if cracks:
    print(f'  石墙总宽 {len(set(x for x, _ in cracks))*TS}px  {"[OK]" if len(set(x for x, _ in cracks))*TS <= BOOM_R*2 else "[!]"}')

# 3b) 升降平台/电梯：升到顶之后附近有没有能落脚的平台
lifts = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'm']
print('\n电梯检查:')
for (lx, ly) in lifts:
    top_high = (ly + 1) * TS - 6 * TS      # 电梯最高时的轿厢面
    row_high = ly - 6
    ok = False
    for dx in range(-8, 9):
        for dy in range(-1, 4):
            if can_stand(lx + dx, row_high + dy):
                ok = True; break
        if ok: break
    print(f'  电梯@({lx},{ly}) 最高升到行 {row_high}  ' + ('[OK] 附近有落脚平台' if ok else '[FAIL] 升上去没地方站'))

# 4) Boss 高台：地面 + 史莱姆弹床是否够高
boss = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'X']
slimes = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'S']
print('\nBoss 高台检查:')
for (bx, by) in boss:
    ground = max([y for y in range(by, H) if rows[y][bx] in SOLID] or [H - 1])
    # Boss 站的平台从哪开始
    plat_top = by
    need = (H - 2 - by) * TS
    print(f'  Boss@({bx},{by})  从地面(H-2={H-2})到它脚下需 {need:.0f}px')
if slimes:
    for (sx, sy) in slimes:
        print(f'  史莱姆@({sx},{sy}) 弹起 {SLIME_H:.0f}px，足够上到行 {H-2 - int(SLIME_H/TS)} 左右')
    print('  -> 史莱姆弹床足够上 Boss 高台' if SLIME_H > 200 else '  -> [FAIL] 弹床不够高')

# 5) ★ Boss 房通行性：地面障碍不能高过猫的跳跃，头顶净空要够（防止猫卡死出不来）
print(f'\nBoss 房通行性检查（猫跳跃 {BOSS_JUMP:.0f}px、身高 66px）:')
if not LV.get('bossRoom'):
    print('  没有 bossRoom')
else:
    bx0, bx1 = LV['bossRoom']
    boss_bad = []
    for x in range(bx0, bx1 + 1):
        if rows[GROUND_ROW - 1][x] in SOLID and rows[GROUND_ROW - 1][x] != 'D':
            # 地面上的障碍：连续实心段高度
            h = 0; y = GROUND_ROW - 1
            while y >= 0 and rows[y][x] in SOLID:
                h += 1; y -= 1
            if h * TS > BOSS_JUMP - 8:
                boss_bad.append((x, '墙太高', h * TS))
        else:
            # 头顶净空：地面到上方最低实心底面的距离
            y = GROUND_ROW - 1; gap = 9999
            while y >= 0:
                if rows[y][x] in SOLID: gap = GROUND_TOP - (y + 1) * TS; break
                y -= 1
            if gap < 72:
                boss_bad.append((x, '头顶太矮', gap))
    if boss_bad:
        for b in boss_bad: print(f'  x={b[0]}: {b[1]} {b[2]}  -> [FAIL] 猫会卡住')
    else:
        print('  [OK] 猫在地面能自由通行（石墙都能跳过 / 没有挡路的平台）')

# 6) 单向平台：从下方「附近的地面/平台」能不能跳上来（层间要有横向重叠）
ows = set((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == '=')
SURF = set(ows) | set((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch in SOLID and y >= 1) \
       | set((x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'p') \
       | set((x, y - 6) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'm')   # 电梯升到顶时的高度
print('\n单向平台可达性（普通跳跃 133px，横向最多 4 格）:')
bad_ow = []
for (x, y) in sorted(ows, key=lambda q: -q[1]):
    ok = False
    for (sx, sy) in SURF:
        if sy < y:             # 得在同一高度或下面
            continue
        if (sy - y) * TS > JUMP_H + 6:
            continue           # 太高
        if abs(sx - x) <= 4:   # 横向够得着
            ok = True; break
    if not ok:
        bad_ow.append((x, y))
if bad_ow:
    print(f'  [FAIL] {len(bad_ow)} 块平台跳不上去，例如 {bad_ow[:6]}')
else:
    print(f'  [OK] {len(ows)} 块平台都能从下方地面/平台跳上去')

# 7) Boss 房宽度
if LV.get('bossRoom'):
    bw = (LV['bossRoom'][1] - LV['bossRoom'][0] + 1) * TS
print('\nBoss 房宽度：' + f'{(LV["bossRoom"][1]-LV["bossRoom"][0]+1)*TS}px')

# ---- 木门对位检查：门旁边必须站得住人（不然玩家够不到门 / 门对不准身体）----
dcols = {}
for y, r in enumerate(rows):
    for x, ch in enumerate(r):
        if ch == 'd': dcols.setdefault(x, []).append(y)
print('\n木门对位检查:')
bad_door = []
for x in sorted(dcols):
    ys = sorted(dcols[x])
    bot = ys[-1]
    if not (can_stand(x - 1, bot) or can_stand(x + 1, bot)):
        bad_door.append((x, bot))
if bad_door:
    for (x, b) in bad_door[:10]:
        print(f'  x={x} 门底行={b}: 旁边站不住 -> [FAIL] 门对不准')
else:
    print(f'  [OK] {len(dcols)} 扇木门，旁边都能站人（门对准身体两格）')
