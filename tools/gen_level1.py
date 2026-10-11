# -*- coding: utf-8 -*-
"""第一关《失窃的苹果园》v9 —— 果酱村的一天（按成熟关卡设计法重排）

设计原则（参考 teach→test→twist / 一间房一个新机制 / 交互状态可见 / 房间不重样）
  跳跃数值先定死：单跳 167px、二连跳 259px、身高 42px
  → 层高一律 4 格（3 格净空，站着不卡、跳得动）
  5 个乐章，目标 10 分钟

图例  # 泥土  B 石头  W 木板  L 树篱  d 可开合木门  T(已取消)  / 弹簧  ^ 仙人掌
      o 苹果  A 金苹果  k 苹果篮  r 稻草人  e 苦力怕  b 蜜蜂  c 猫  h ♥回血
      w 蜘蛛网  C 裂纹石墙  p 活塞平台  _ 压力板  m 电梯轿厢  L 操纵杆  = 单向平台
      F 栅栏  H 干草堆  O 木桶  V 路灯  P 起点  X Boss出生点  . 空
"""
import json

W, H = 432, 15
GY = 13
g = [['.' for _ in range(W)] for _ in range(H)]
for x in range(W):
    g[0][x] = '#'; g[H - 1][x] = '#'
for y in range(H):
    g[y][0] = '#'; g[y][W - 1] = '#'

HOUSES = []


def rect(x0, y0, x1, y1, ch='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < W and 0 <= y < H:
                g[y][x] = ch


def put(x, y, ch):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = ch


# ---------------- 建筑（层高 4 格，净空 3 格，绝不卡人）----------------
def house(x0, w, h, doors=((0, GY),), roof='B', wall='W', floors=(), props=(), style='wood'):
    """MC 木屋（空心）：左右墙 + 屋顶 + 可开合木门
       doors : (相对x, 这扇门服务哪一层) —— 站在第 F 层夹板上时身体占 F-2、F-1 两格，
               所以门要摆在 F-2、F-1，即门底行 = F-1。传楼层 F，函数自己算。
       floors: (x起, x止, 行) 夹层（单向平台）
       props : (相对x, 行, 方块) 屋里摆件（一律摆地面行，不悬空）"""
    top = GY - h
    for x in range(x0, x0 + w):
        for y in range(top, GY):
            if x == x0 or x == x0 + w - 1 or y == top:
                put(x, y, wall)
    for (dx, floorRow) in doors:
        dy = floorRow - 1                       # 门底行 = 楼层 - 1（对准身体两格）
        put(x0 + dx, dy, 'd'); put(x0 + dx, dy - 1, 'd')
        put(x0 + dx, dy - 2, wall)
    for x in range(x0, x0 + w):
        put(x, top - 1, roof)
    for (fx0, fx1, fy) in floors:
        for x in range(x0 + fx0, x0 + fx1 + 1):
            put(x, fy, '=')
    for (ix, iy, ch) in props:
        put(x0 + ix, iy, ch)
    HOUSES.append([x0, top, x0 + w - 1, GY - 1, style])


def cottage(x0, w=9, h=7):
    """民居：两端门 + 一层夹层（教玩家"屋里能上夹层"）"""
    house(x0, w, h, doors=((0, GY), (w - 1, GY)),
          floors=((2, w - 2, GY - 4),), props=((3, GY - 1, 'O'),), style='wood')


def two_story(x0, w=10, h=11):
    """两层楼：正门在一楼，出口在二楼（要进屋爬上去）"""
    house(x0, w, h, doors=((0, GY), (w - 1, GY - 8)),
          floors=((2, w - 2, GY - 4), (2, w - 2, GY - 8)),
          props=((3, GY - 1, 'O'), (4, GY - 1, 'H')), style='wood')


def warehouse(x0, w=14, h=11):
    """仓库：一楼正门，出口在阁楼；屋里木桶/干草当台阶"""
    house(x0, w, h, doors=((0, GY), (w - 1, GY - 8)),
          floors=((2, w - 2, GY - 4), (5, w - 2, GY - 8)),
          props=((3, GY - 1, 'O'), (4, GY - 1, 'O'), (5, GY - 1, 'H'), (6, GY - 1, 'H')), style='wood')


def barn_big(x0, w=18, h=11):
    """大谷仓：超大空间 + 两层夹层 + 干草堆（全落地）"""
    house(x0, w, h, doors=((0, GY), (w - 1, GY)),
          floors=((3, w - 3, GY - 4), (6, w - 3, GY - 8)),
          props=((2, GY - 1, 'H'), (3, GY - 1, 'H'), (4, GY - 1, 'H'),
                 (w - 4, GY - 1, 'O'), (w - 3, GY - 1, 'O')), style='hay')


def tower(x0, w=7, h=12):
    """瞭望塔：窄而高，两层夹层爬到出口"""
    house(x0, w, h, doors=((0, GY), (w - 1, GY - 7)),
          floors=((1, w - 2, GY - 3), (1, w - 2, GY - 7)),
          props=((2, GY - 1, 'O'),), style='stone')


def ruin(x0, w=8, h=7):
    """塌半边的旧屋：裂纹石墙挡路，要用金苹果炸开（后门能绕）"""
    top = GY - h
    rect(x0, top, x0 + w - 1, GY - 1, 'C')
    rect(x0 + 2, top, x0 + w - 1, top, '.')
    put(x0 + w, GY - 1, 'd'); put(x0 + w, GY - 2, 'd'); put(x0 + w, GY - 3, 'W')
    HOUSES.append([x0, top, x0 + w - 1, GY - 1, 'stone'])


def fence_line(x0, x1, gap=()):
    for x in range(x0, x1 + 1):
        if x in gap: continue
        put(x, GY - 1, 'F')


def well(x):
    """水井：井台 + 两侧立柱（只立两边，中间留出跳过去的空间）+ 小屋顶，不悬空"""
    rect(x, GY - 3, x + 2, GY - 2, 'B')          # 井台
    put(x + 1, GY - 3, '.')                       # 井口
    for y in (GY - 4, GY - 5):                    # 立柱：只在左右两侧
        put(x, y, 'W'); put(x + 2, y, 'W')
    rect(x, GY - 6, x + 2, GY - 6, 'W')           # 屋顶


def stall(x0):
    for x in range(x0, x0 + 4):
        put(x, GY - 4, 'W')
    put(x0, GY - 3, 'W'); put(x0 + 3, GY - 3, 'W')
    put(x0, GY - 1, 'O'); put(x0 + 2, GY - 1, 'k')


def lamp(x): put(x, GY - 1, 'V')


def flowers(x0, x1, step=4, off=0):
    """撒野花（蜜蜂会被花丛吸引）"""
    for x in range(x0 + off, x1 + 1, step):
        if g[GY - 1][x] == '.': put(x, GY - 1, 'f')


def bees(x0, x1, ys=(9, 8, 7), step=9, off=0):
    """在花丛上空加蜜蜂"""
    for i, x in enumerate(range(x0 + off, x1 + 1, step)):
        if g[ys[i % len(ys)]][x] == '.': put(x, ys[i % len(ys)], 'b')


rect(1, GY, W - 2, H - 1, '#')

# ============ 乐章1 · 果酱的家 (2~60) —— 教：门 / 二连跳 / 丢苹果 ============
put(4, 12, 'P')
cottage(9, 9, 7)                        # 果酱的小屋（第一间房，安全教学）
put(6, 12, 'c')
put(7, 10, 'o'); put(20, 10, 'o')
warehouse(23, 14, 11)                   # 仓库（被偷的那个）—— 阁楼出口
lamp(20)
fence_line(42, 54, gap=(47, 48))
put(44, GY - 1, 'H'); put(52, GY - 1, 'O')
put(57, 12, 'h')
put(54, 12, '^')                        # 仙人掌（教学：危险物）
put(58, 12, 'o')

# ============ 乐章2 · 村口市集 (60~140) —— 教：敌人 / 两层楼 ============
stall(64)
cottage(72, 9, 7)
two_story(86, 10, 11)                   # 两层楼（要进屋爬上二楼出口）
well(104)
lamp(83); lamp(112)
fence_line(96, 102, gap=(99,))
put(68, 12, 'e'); put(110, 12, 'e')
put(76, 9, 'b'); put(116, 8, 'b')
put(66, 10, 'o'); put(100, 10, 'o'); put(120, 12, 'k')
put(92, 12, 'r')

# ============ 乐章3 · 果园与谷仓 (140~250) —— 教：蛛网 / 弹簧 / 谷仓迷宫 ============
for x in range(144, 176, 6):
    put(x, GY - 3, 'o')
flowers(144, 178, 4)                    # ★ 果园里开满野花
bees(146, 176, (9, 7, 8), 8)            # ★ 花丛上空蜜蜂更多
put(148, 12, 'r'); put(166, 12, 'r')
put(152, 12, 'e'); put(170, 12, 'e')
put(158, 9, 'b'); put(174, 8, 'b')
put(162, 12, 'k')
for x in range(180, 190):
    put(x, 11, 'w'); put(x, 12, 'w')    # 破棚蛛网（教：走不快）
put(183, 12, 'e'); put(187, 12, 'e')
put(178, 10, 'o')
put(196, 12, '/')                       # 弹簧 → 浮空草垛（靶子已取消，改成奖励）
rect(199, 8, 206, 9, '#')
put(200, 6, 'o'); put(204, 6, 'A')
put(212, 12, '^'); put(214, 12, '^')
put(218, 12, 'e'); put(226, 12, 'S')
barn_big(232, 18, 11)                   # 大谷仓（内部迷宫）
put(256, 12, 'e'); put(262, 12, 'k')
put(266, 12, '_')                       # 压力板 → 活塞
put(269, 10, 'p'); put(270, 8, 'p')
rect(271, 7, 273, 12, 'B')
put(268, 6, 'o'); put(276, 10, 'o')
put(282, 12, 'e'); put(288, 12, 'k')

# ============ 乐章4 · 广场与旧屋 (290~370) —— 教：电梯 / 炸墙 ============
cottage(294, 9, 7)
tower(308, 7, 12)                       # 瞭望塔（垂直挑战）
put(304, 12, 'L')                       # ★ 地面操纵杆 → 叫电梯
put(320, 12, 'm')                       # ★ 电梯轿厢
# ★ 电梯顶上的一段平台，一路接到瞭望塔二楼的出口（电梯 → 平台 → 楼里）
for x in range(314, 321):
    put(x, 6, '=')
put(313, 6, '='); put(312, 6, '=')
well(328)
lamp(299); lamp(334)
put(324, 12, 'e'); put(340, 12, 'e')
put(316, 9, 'b'); put(344, 8, 'b')
put(318, 10, 'o'); put(338, 10, 'o'); put(346, 12, 'k')
put(354, 12, 'S')
put(354, 12, 'r')
# ★ 旧屋前的跳台：贴着墙堆的木桶+干草，可以借它跳上旧屋屋顶绕过去（不炸墙也能过）
put(355, 11, 'O'); put(355, 12, 'O')
put(356, 10, 'H'); put(356, 11, 'H'); put(356, 12, 'H')
ruin(358, 8, 7)                         # 塌半边的旧屋（也可以用金苹果炸开）
put(353, 12, 'A')
put(352, 12, 'V')

# ============ 乐章5 · 大猫老巢 (374~430) —— 郊外：苦力怕成群 ============
flowers(374, 398, 5)                    # 郊外也有零星野花
bees(376, 396, (9, 8), 11)
for bx in (376, 380, 384, 388, 392, 396):     # ★ 郊外苦力怕密度拉高
    if g[12][bx] == '.': put(bx, 12, 'e')
put(382, 9, 'b'); put(392, 8, 'b')
put(380, 10, 'o'); put(396, 12, 'k')
rect(400, 0, 400, 12, 'B')              # Boss 房左墙
put(400, 12, '.'); put(400, 11, '.')
rect(430, 0, 430, 12, 'B')              # 右墙
put(404, 12, 'S')
rect(406, 10, 406, 12, 'B')
rect(426, 10, 426, 12, 'B')
for x in range(410, 418): put(x, 10, '=')
for x in range(414, 422): put(x, 8, '=')
put(408, 5, 'o'); put(422, 5, 'o')
put(424, 11, 'k')
put(428, 12, 'X')

rows = [''.join(r) for r in g]
out = 'const LEVEL = ' + json.dumps(
    {'name': '失窃的苹果园', 'rows': rows, 'bossRoom': [401, 429], 'houses': HOUSES},
    ensure_ascii=False, indent=1) + ';\n'
open(r'C:\Users\ADMINI~1\AppData\Local\Temp\opencode\llm-test\level1.js', 'w', encoding='utf-8').write(out)

print(f'{W}x{H}  {W*40}px   房屋 {len(HOUSES)} 栋')
for ch, name in [('d', '木门'), ('m', '电梯'), ('L', '操纵杆'), ('=', '单向平台'),
                 ('A', '金苹果'), ('C', '裂纹墙'), ('H', '干草'), ('O', '木桶')]:
    print(f'  {name}: {sum(r.count(ch) for r in rows)}')
print('  靶子 T:', sum(r.count('T') for r in rows))
