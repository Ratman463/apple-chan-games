/* ============================================================
   果酱大冒险 · 第一章《失窃的苹果园》
   MC 奶油风 · 横版解谜 + Boss 战
   核心玩法：蓄力丢苹果打靶开门 · 普通苹果自动恢复 · 金苹果爆炸
   ============================================================ */
(() => {
'use strict';

const TS = 40;
let VW = 960, VH = 600;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const GRAV = 2400, MOVE_SPD = 235, JUMP_V = -800, MAX_FALL = 1300;
const PW = 26, PH = 42;
const CFG = {
  maxHearts: 7, startApples: 4, maxApples: 9, invuln: 1.2,
  chargeTime: .8, appleGrav: 1500,
  baseVX: 300, addVX: 700, baseVY: 220, addVY: 160,
  regenTime: 4.8,                 // 普通苹果每 4.8 秒回 1 个（原来 2.4，速度减半）
  boomR: 132, boomDmg: 3, goldBossDmg: 7, bossHp: 30,
  magnet: 118,                    // 道具磁吸半径
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- 资源 ---------------- */
const M = '/assets/mc/', P2 = '/assets/mc2/', VQ = '?v=8';
const IMG = {}, SRC = {
  grass: M + 'cream_grass.png', dirt: M + 'cream_dirt.png', stone: M + 'cream_stone.png', wood: M + 'cream_wood.png',
  hillFar: '/assets/hill_far.png' + VQ, hillNear: '/assets/hill_near.png' + VQ,
  village: '/assets/village_bg.png' + VQ,
  chan: '/assets/applechan-game.png', creeper: M + 'creeper.png', cat: M + 'cat.png',
  door: P2 + 'door.png' + VQ, doorOpen: P2 + 'door_open.png' + VQ,
  target: P2 + 'target.png' + VQ, targetOn: P2 + 'target_on.png' + VQ,
  cactus: P2 + 'spikes.png' + VQ, spring: P2 + 'spring.png' + VQ,
  bee: P2 + 'bee.png' + VQ, basket: P2 + 'basket.png' + VQ, scarecrow: P2 + 'scarecrow.png' + VQ,
  apple: P2 + 'apple.png' + VQ, gapple: P2 + 'gapple.png' + VQ, sign: P2 + 'sign.png' + VQ,
  heart: P2 + 'heart.png' + VQ,
  log: P2 + 'oak_log.png' + VQ, leaves: P2 + 'oak_leaves.png' + VQ, hay: P2 + 'hay_block_side.png' + VQ,
  barrel: P2 + 'barrel_side.png' + VQ, table: P2 + 'crafting_table_front.png' + VQ,
  cobble: P2 + 'cobblestone.png' + VQ, mossy: P2 + 'mossy_cobblestone.png' + VQ,
  fence: P2 + 'fence.png' + VQ, hay: P2 + 'hay_side.png' + VQ, barrel: P2 + 'barrel_side.png' + VQ,
  planks: P2 + 'oak_planks.png' + VQ,
  slime: P2 + 'slime.png' + VQ, web: P2 + 'web.png' + VQ, tnt: P2 + 'tnt.png' + VQ,
  cracked: P2 + 'cracked.png' + VQ, lift: P2 + 'lift.png' + VQ, plate: P2 + 'plate.png' + VQ,
};
for (const k in SRC) { const im = new Image(); im.onload = () => { IMG[k] = im; }; im.src = SRC[k]; }

/* ---------------- 音效 ---------------- */
const Sound = {
  on: false,
  apply() { const b = document.getElementById('btn-sound'); if (b) { b.textContent = this.on ? '🔊' : '🔇'; b.classList.toggle('off', !this.on); } },
  toggle() { this.on = !this.on; this.apply(); if (this.on) sfx('coin'); },
};
const SF = {};
function preloadSfx() { for (const n of ['jump', 'jump-high', 'coin', 'gem', 'hurt', 'throw', 'disappear', 'magic']) { const a = new Audio('/assets/adv2/sfx/sfx_' + n + '.ogg'); a.preload = 'auto'; SF[n] = a; } }
function sfx(n) { if (!Sound.on) return; try { const a = (SF[n] || SF.coin).cloneNode(); a.volume = .45; a.play().catch(() => {}); } catch (e) {} }
let _meow = null;
function playMeow() { if (!Sound.on) return; try { if (!_meow) { _meow = new Audio('/assets/audio/meow.mp3'); _meow.preload = 'auto'; } const a = _meow.cloneNode(); a.volume = .5; a.play().catch(() => {}); } catch (e) {} }

/* ---------------- 关卡 ---------------- */
const LEVEL = {
 "name": "失窃的苹果园",
 "rows": [
  "############################################################################################################################################################################################################################################################################################################################BBBBBBB#############################################################################B#############################B#",
  "#......................BBBBBBBBBBBBBB.................................................BBBBBBBBBB........................................................................................................................................BBBBBBBBBBBBBBBBBB..................................................................WWWWWWW.............................................................................B.............................B#",
  "#......................WWWWWWWWWWWWWW.................................................WWWWWWWWWW........................................................................................................................................WWWWWWWWWWWWWWWWWW..................................................................W.....W.............................................................................B.............................B#",
  "#......................W............d.................................................W........d........................................................................................................................................W................W..................................................................W.....W.............................................................................B.............................B#",
  "#......................W............d.................................................W........d........................................................................................................................................W................W..................................................................d.....W.............................................................................B.............................B#",
  "#........BBBBBBBBB.....W....========W...................................BBBBBBBBB.....W.=======W........................................................................................................................................W.....==========.W............................................BBBBBBBBB.............d.....W.............................................................................B.......o.............o.......B#",
  "#........WWWWWWWWW.....W............W...................................WWWWWWWWW.....W........W........................................................................................................o...A...........................W................W..................o.........................WWWWWWWWW........======.....W........o.A..................................CC..............................B.............................B#",
  "#........W.......W.....W............W...................................W.......W.....W........W........WWW...............................................b.............................................................................W................W.....................BBB....................W.......W.............W=====W......BBBBBBB......WWW.......................CCCCCCCC........................B.............................B#",
  "#........W.......W.....W............W...................................W.......W.....W........W........W.W.........b.............................................b...........b........................########.........................W................W....................pBBB....................W.......W.............W.....W......BBBBBBB......W.W.....b.................CCCCCCCC...........b....b.......B.............========........B#",
  "#........W.======W.....W.===========W...........................WWWW....W.==b===W.....W.=======W........W.W.......................................b...........b...........b............................########.........................W..=============.W.....................BBB....................W.======W.............W=====W...............b...W.W.......................CCCCCCCCb.....b.................B.............................B#",
  "#......o.W.......W..o..W............W...........................W.oW....W.......W.....W........W....o...B.B.....................................o.....o.....o.....o.....o.....o...o.....................................................W................W...................p.BBB..o.................W.......W.............W.....W.............o.....B.B.o...................H.CCCCCCCCW...o...................B.....B...========........B...B#",
  "#........d.......d.....d............W...................................d.......d.....d........W........BBB.........................................................................wwwwwwwwww..........................................d................d.....................BBB....................d.......d.............W.....d...................BBB....................OH.CCCCCCCCd.............................B.................k.B...B#",
  "#...P.c..d..O....d..V..d..OOHH......W.....FFHFF..FFFOF^..ho.....O.k.e...d..O....d..V..d..OH.r..WFFF.FFF.......e.V.......k.......................f...r...e...f...f.k.f.r.f.e.f...f...wwwewwweww....../...............^.^...e.......S.....d.HHH.........OO.d......e.....k..._....BBB........e.....k.....d..O..V.d..L..m.......W.O...d.../.............e.......V...e...k...S.VArOH.CCCCCCCCd.efe.e.f.e.efe.e.f.k.e.....S.B...................B.X.B#",
  "################################################################################################################################################################################################################################################################################################################################################################################################################################################",
  "################################################################################################################################################################################################################################################################################################################################################################################################################################################"
 ],
 "bossRoom": [
  401,
  429
 ],
 "houses": [
  [
   9,
   6,
   17,
   12,
   "wood"
  ],
  [
   23,
   2,
   36,
   12,
   "wood"
  ],
  [
   72,
   6,
   80,
   12,
   "wood"
  ],
  [
   86,
   2,
   95,
   12,
   "wood"
  ],
  [
   232,
   2,
   249,
   12,
   "hay"
  ],
  [
   294,
   6,
   302,
   12,
   "wood"
  ],
  [
   316,
   1,
   322,
   12,
   "stone"
  ],
  [
   368,
   6,
   375,
   12,
   "stone"
  ]
 ]
};

/* ============================================================
   游戏
   ============================================================ */
class Game {
  constructor() {
    this.state = 'home';
    this.lastT = performance.now();
    this.load();
    requestAnimationFrame(t => this.frame(t));
    setInterval(() => UI.hud(this), 150);
  }

  load() {
    const rows = LEVEL.rows, W = rows[0].length, H = rows.length;
    this.rows = rows; this.h = H; this.w = W;
    this.rng = mulberry32(20261010);
    this.grid = rows.map((r, y) => r.split('').map((c, x) => {
      if (x === 0 || y === 0 || x === W - 1) return 5;
      return c === '#' ? 1 : c === 'B' ? 2 : c === 'W' ? 3 : c === 'L' ? 4 : c === 'C' ? 6
           : c === 'F' ? 7 : c === 'H' ? 8 : c === 'O' ? 9 : 0;
    }));

    this.doors = []; this.targets = []; this.cacti = []; this.items = [];
    this.enemies = []; this.springs = []; this.signs = []; this.baskets = []; this.scares = [];
    this.slimes = []; this.webs = []; this.tnts = []; this.plates = []; this.pistons = []; this.lifts = [];
    this.oneways = []; this.lamps = []; this.woodDoors = []; this.levers = []; this.flowers = [];
    this.start = { x: 60, y: 480 }; this.bossSpawn = null;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = rows[y][x], cx = x * TS + TS / 2, cy = y * TS + TS;
      if (c === 'P') this.start = { x: cx, y: cy };
      else if (c === 'X') this.bossSpawn = { x: cx, y: cy };
      else if (c === 'D' && rows[y - 1] && rows[y - 1][x] !== 'D') this.doors.push({ x, y, open: false });
      else if (c === 'T') this.targets.push({ x, y, on: false, hit: 0 });
      else if (c === '^') this.cacti.push({ x, y });
      else if (c === '/') this.springs.push({ x, y, t: 0 });
      else if (c === 'k') this.baskets.push({ x, y, got: false, t: this.rng() * 6 });
      else if (c === 'S') this.slimes.push({ x, y, t: 0 });
      else if (c === 'w') this.webs.push({ x, y });
      else if (c === 't') this.tnts.push({ x, y, dead: false });
      else if (c === 'p') this.pistons.push({ x, y, on: false });
      else if (c === 'm') this.lifts.push({ x, y, t: 0, top: (y + 1) * TS, dy: 0, mode: 'elevator',
                                            yB: (y + 1) * TS, yT: (y + 1) * TS - 6 * TS, dir: 1, wait: 1.2, open: true });
      else if (c === 'L') this.levers.push({ x, y, on: false, t: 0 });   // 地面操纵杆：叫电梯
      else if (c === 'f') this.flowers.push({ x, y, t: this.rng() * 6, c: (this.rng() * 3) | 0 });   // 野花（蜜蜂喜欢）
      else if (c === '=') this.oneways.push({ x, y });        // 单向平台：能从下面跳穿，只从上方踩
      else if (c === 'V') this.lamps.push({ x, y, t: this.rng() * 6 });   // 村口路灯（装饰 + 暖光）
      else if (c === 'd' && rows[y - 1] && rows[y - 1][x] !== 'd') this.woodDoors.push({ x, y, open: false, t: 0 });   // 可开合的木门
      else if (c === '_') this.plates.push({ x, y, on: false, t: 0 });
      else if (c === 'r') this.scares.push({ x, y });
      else if (c === 'o') this.items.push({ x: cx, y: cy - TS / 2, kind: 'apple', got: false, t: this.rng() * 6 });
      else if (c === 'A') this.items.push({ x: cx, y: cy - TS / 2, kind: 'gapple', got: false, t: this.rng() * 6 });
      else if (c === 'h') this.items.push({ x: cx, y: cy - TS / 2, kind: 'heart', got: false, t: this.rng() * 6 });
      else if (c === 'E') this.signs.push({ x, y });
      else if (c === 'e') this.enemies.push({ type: 'creeper', x: cx, y: cy, sx: cx, dir: this.rng() < .5 ? -1 : 1, hp: 2, maxHp: 2, t: this.rng() * 6, dead: false, hit: 0, squash: 0 });
      else if (c === 'c') this.enemies.push({ type: 'cat', x: cx, y: cy, sx: cx, dir: this.rng() < .5 ? -1 : 1, hp: 9, maxHp: 9, t: this.rng() * 6, dead: false, hit: 0, neutral: true, squash: 0, flee: 0 });
      else if (c === 'b') this.enemies.push({ type: 'bee', x: cx, y: cy - 100, hx: cx, hy: cy - 100, hp: 1, maxHp: 1, t: this.rng() * 6, dead: false, hit: 0, squash: 0 });
    }
    this.player = { x: this.start.x, y: this.start.y, vx: 0, vy: 0, onGround: false, face: 1, invuln: 0, throwT: 0, coyote: 0, jumpBuf: 0, airJump: 1, dropT: 0, walk: 0, hurtFx: 0, charging: false, charge: 0 };
    this.applesArr = []; this.parts = []; this.booms = [];
    this.cam = { x: 0 };
    this.t = 0; this.toastT = 0; this.shake = 0; this.dead = 0;
    this.hearts = CFG.maxHearts; this.apples = CFG.startApples; this.gold = 1; this.regen = 0;
    this.done = false; this.dlg = null; this.oy = 0;
    this.boss = null; this.bossRoom = LEVEL.bossRoom || null; this.bossLocked = false;
    this.triggered = {};
    resize();
  }

  solid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    if (this.grid[ty][tx] !== 0) return true;
    for (const d of this.doors) if (!d.open && d.x === tx && (d.y === ty || d.y + 1 === ty)) return true;
    for (const d of this.woodDoors) if (!d.open && d.x === tx && (d.y === ty || d.y + 1 === ty)) return true;   // 木门关着时挡路
    for (const p of this.pistons) if (p.on && p.x === tx && p.y === ty) return true;   // 活塞平台伸出后是实心
    return false;
  }
  boxHits(l, t, r, b) {
    const x0 = Math.floor(l / TS), x1 = Math.floor((r - .01) / TS);
    const y0 = Math.floor(t / TS), y1 = Math.floor((b - .01) / TS);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.solid(x, y)) return { x, y };
    return null;
  }

  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    const dt = Math.min(.05, (now - this.lastT) / 1000 || 0);
    this.lastT = now;
    if (this.state === 'playing') { this.update(dt); this.draw(); }
    else if (this.state !== 'home') this.draw();
  }

  update(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) document.getElementById('toast').classList.add('hidden'); }
    if (this.dlg) { this.dlg.t -= dt; if (this.dlg.t <= 0) this.nextDlg(); }
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) this.respawn(); return; }
    this.updateLifts(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateApples(dt);
    for (const p of this.parts) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const b of this.booms) b.t -= dt;
    this.booms = this.booms.filter(b => b.t > 0);
    for (const s of this.springs) if (s.t > 0) s.t -= dt;
    for (const tg of this.targets) if (tg.hit > 0) tg.hit -= dt;
    for (const e of this.enemies) { if (e.squash > 0) e.squash -= dt; if (e.flee > 0) e.flee -= dt; }
    // 普通苹果自动恢复
    if (this.apples < CFG.maxApples) { this.regen += dt; if (this.regen >= CFG.regenTime) { this.regen = 0; this.apples++; } }
    else this.regen = 0;
    this.checkTriggers();
    this.pickups();
    this.updateCam(dt);
  }

  updateLifts(dt) {
    const p = this.player;
    for (const L of this.lifts) {
      const prev = L.top;
      if (L.mode === 'elevator') {
        // 电梯：在两个停靠层之间往返，到站开门停一会儿
        if (L.wait > 0) { L.wait -= dt; L.open = true; }
        else {
          L.open = false;
          const target = L.dir > 0 ? L.yB : L.yT;
          const step = 74 * dt;
          if (Math.abs(L.top - target) <= step) {
            L.top = target; L.wait = 2.4; L.dir = -L.dir;
            sfx('select'); this.burst(L.x * TS + TS / 2, L.top, '#ffd97a', 10);
          } else L.top += (target > L.top ? step : -step);
        }
      } else {
        L.t += dt * 1.05;
        L.top = (L.y + 1) * TS - (Math.sin(L.t) * .5 + .5) * L.amp;
      }
      L.dy = L.top - prev;
    }
    // 地面操纵杆：碰到就把电梯叫下来并开门
    for (const lv of this.levers) {
      const lx = lv.x * TS + TS / 2, ly = lv.y * TS + TS;
      const near = Math.abs(p.x - lx) < 50 && Math.abs(p.y - ly) < 64;
      if (near && !lv.on) {
        lv.on = true; lv.t = .3; sfx('coin');
        for (const L of this.lifts) if (L.mode === 'elevator') { L.dir = 1; L.wait = 0; }
        this.msg('🔘 电梯下来了', 1.6);
      } else if (!near && Math.abs(p.x - lx) > 96) lv.on = false;
      if (lv.t > 0) lv.t -= dt;
    }
  }
  updateCam(dt) {
    const p = this.player;
    let minX = 0, maxX = Math.max(0, this.w * TS - VW);
    if (this.bossLocked && this.bossRoom) {                       // Boss 房：镜头锁死在房里
      minX = this.bossRoom[0] * TS;
      maxX = Math.max(minX, (this.bossRoom[1] + 1) * TS - VW);
    }
    const tx = clamp(p.x - VW * .42, minX, maxX);
    this.cam.x += (tx - this.cam.x) * .14;
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.ride) { p.y += p.ride.dy; p.ride = null; }        // 站在升降平台上：跟着一起动
    p.invuln = Math.max(0, p.invuln - dt); p.throwT = Math.max(0, p.throwT - dt); p.hurtFx = Math.max(0, p.hurtFx - dt);
    if (p.dropT > 0) p.dropT -= dt;                          // 从单向平台跳下的无敌时间
    const busy = !!this.dlg;
    if (!busy) {
      let ix = Input.x; if (Math.abs(ix) < .18) ix = 0;
      p.vx = ix * MOVE_SPD * (p.charging ? .35 : 1);
      if (ix !== 0) { p.face = ix > 0 ? 1 : -1; p.walk += dt * 10; } else p.walk = 0;
    } else p.vx = 0;
    p.coyote = p.onGround ? .1 : Math.max(0, p.coyote - dt);
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    // 跳跃 + 二连跳
    if (!busy && !p.charging && p.jumpBuf > 0) {
      if (p.coyote > 0) {
        p.vy = JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.airJump = 1; sfx('jump');
      } else if (p.airJump > 0) {
        p.vy = JUMP_V * .9; p.airJump--; p.jumpBuf = 0;
        sfx('jump'); this.burst(p.x, p.y - 6, '#ffffff', 8);
      }
    }
    if (p.charging) {
      if (busy) { p.charging = false; p.charge = 0; }
      else { p.charge = Math.min(1, p.charge + dt / CFG.chargeTime); if (p.apples <= 0) { p.charging = false; p.charge = 0; } }
    }
    // 蜘蛛网：粘住（水平变慢 + 下落被拖住）
    const wtx = Math.floor(p.x / TS);
    const wy0 = Math.floor((p.y - PH) / TS), wy1 = Math.floor((p.y - 1) / TS);
    const inWeb = this.webs.some(w => w.x === wtx && w.y >= wy0 && w.y <= wy1);
    if (inWeb) p.vx *= .25;
    p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt * (inWeb ? .3 : 1));
    if (inWeb && p.vy > 130) p.vy = 130;
    p.x += p.vx * dt;
    let hit = this.boxHits(p.x - PW / 2, p.y - PH, p.x + PW / 2, p.y);
    if (hit) p.x = p.vx > 0 ? hit.x * TS - PW / 2 - .01 : (hit.x + 1) * TS + PW / 2 + .01;
    p.onGround = false;
    const prevY = p.y;
    p.y += p.vy * dt;
    hit = this.boxHits(p.x - PW / 2, p.y - PH, p.x + PW / 2, p.y);
    if (hit) { if (p.vy > 0) { p.y = hit.y * TS; p.onGround = true; p.airJump = 1; } else { p.y = (hit.y + 1) * TS + PH; } p.vy = 0; }
    // 单向平台：下落时脚穿过平台面就踩住（从下面跳可以穿过去）
    if (p.vy >= 0 && p.dropT <= 0) {
      for (const O of this.oneways) {
        const top = O.y * TS;
        if (p.x + PW / 2 > O.x * TS + 2 && p.x - PW / 2 < O.x * TS + TS - 2 && prevY <= top + 1 && p.y >= top) {
          p.y = top; p.vy = 0; p.onGround = true; p.airJump = 1;
        }
      }
    }
    // 按 ↓ 从单向平台上跳下去（放在踩住判定之后，否则那时 onGround 还是 false）
    if (p.onGround && Input.y > 0 && p.dropT <= 0) {
      p.dropT = .3; p.onGround = false; p.vy = Math.max(p.vy, 150);
    }
    if (p.y > this.h * TS + 200) return this.die();

    for (const s of this.springs) {
      const sx = s.x * TS + TS / 2, sy = s.y * TS + TS;
      if (Math.abs(p.x - sx) < 26 && Math.abs(p.y - sy) < 34 && p.vy >= 0) {
        p.vy = -1180; p.onGround = false; s.t = .25; sfx('jump-high'); this.burst(p.x, p.y, '#c9cfd8', 10);
      }
    }
    // 史莱姆弹床：踩上去超级弹（比弹簧高得多）
    if (p.onGround) {
      const bx = Math.floor(p.x / TS), by = Math.floor((p.y - 1) / TS);   // 脚所在的那一格
      if (this.charAt(bx, by) === 'S') {
        p.vy = -1460; p.onGround = false; p.coyote = 0;
        sfx('jump-high'); this.burst(p.x, p.y, '#7ee07a', 14);
        const sl = this.slimes.find(s => s.x === bx && s.y === by); if (sl) sl.t = .35;
      }
      // 压力板：踩上去 -> 所有活塞平台伸出（一次性卡住）
      const pl = this.plates.find(q => q.x === bx && q.y === by);
      if (pl && !pl.on) {
        pl.on = true; pl.t = .35; sfx('coin'); this.burst(pl.x * TS + 20, pl.y * TS + 8, '#ffd24a', 14);
        this.pistons.forEach(q => q.on = true);
        this.msg('🔘 机关启动了！活塞平台伸了出来', 2.2);
      }
    }
    // 升降平台（单向：从上方踩，会带着人上下）
    for (const L of this.lifts) {
      const lx0 = L.x * TS + 2, lx1 = L.x * TS + TS - 2;
      if (p.x + 12 > lx0 && p.x - 12 < lx1 && p.vy >= 0 && p.y <= L.top + 24 && p.y >= L.top - 34) {
        p.y = L.top; p.vy = 0; p.onGround = true; p.airJump = 1; p.ride = L;
      }
    }
    // 木门：走近自动打开、走远自动关上（MC 那种门的感觉）
    for (const d of this.woodDoors) {
      const dx2 = d.x * TS + TS / 2, dy2 = d.y * TS + TS;
      const near = Math.abs(p.x - dx2) < 64 && Math.abs(p.y - dy2) < 82;
      if (near !== d.open) {
        d.open = near; d.t = .22;
        if (near) { sfx('select'); this.burst(dx2, dy2 - 40, '#d0a874', 6); }
      }
      if (d.t > 0) d.t -= 1 / 60;
    }
    const ptx = Math.floor(p.x / TS), pty = Math.floor(p.y / TS);
    for (const c of this.cacti) if (c.x === ptx && (c.y === pty || c.y === pty - 1)) return this.hurtPlayer(1);
  }
  charAt(tx, ty) { return (this.rows[ty] && this.rows[ty][tx]) || '.'; }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt; if (e.hit > 0) e.hit -= dt;
      if (e.type === 'bee') {
        // 蜜蜂：围绕出生点游荡，玩家靠近就缓慢追 —— 但撞墙会弹回来，穿不过房子
        const dx = p.x - e.x, dy = (p.y - 28) - e.y, d = Math.hypot(dx, dy) || 1;
        let nx = e.x, ny = e.y;
        if (d < 260) { nx += dx / d * 58 * dt; ny += dy / d * 46 * dt; }
        else {
          nx += Math.cos(e.t * 1.3) * 42 * dt;
          ny = e.hy + Math.sin(e.t * 2.2) * 22;
        }
        if (this.boxHits(nx - 11, ny - 9, nx + 11, ny + 9)) {
          e.wallT = .5; e.hx = e.x; e.hy = Math.max(60, e.y);      // 撞墙：换个巡游中心
        } else { e.x = nx; e.y = ny; }
        if (e.wallT > 0) e.wallT -= dt;
        if (Math.abs(p.x - e.x) < 24 && Math.abs((p.y - PH / 2) - e.y) < 26) this.hurtPlayer(1);
        continue;
      }
      if (e.type === 'cat') {
        const spd = e.flee > 0 ? 120 : 26;
        const dir = e.flee > 0 ? (e.x > p.x ? 1 : -1) : e.dir;
        const nx = e.x + dir * spd * dt;
        if (this.boxHits(nx - 14, e.y - 40, nx + 14, e.y - 2) || nx < TS || nx > (this.w - 1) * TS) { if (e.flee <= 0) e.dir *= -1; }
        else e.x = nx;
        continue;
      }
      // 苦力怕
      const spd = 48, nx = e.x + e.dir * spd * dt;
      if (this.boxHits(nx - 14, e.y - 46, nx + 14, e.y - 2) || nx < TS || nx > (this.w - 1) * TS) e.dir *= -1;
      else e.x = nx;
      if (Math.abs(p.x - e.x) < 24 && Math.abs((p.y - PH / 2) - (e.y - 26)) < 30) this.hurtPlayer(1);
    }
  }

  /* ---------------- Boss ---------------- */
  spawnBoss() {
    const s = this.bossSpawn || { x: (this.w - 6) * TS, y: (this.h - 2) * TS };
    this.boss = {
      x: s.x, y: s.y, hp: CFG.bossHp, maxHp: CFG.bossHp, vy: 0, onGround: false,
      state: 'idle', timer: 1.4, dirX: -1, tx: 0, ty: 0, hit: 0, t: 0, dead: false, face: -1,
    };
    this.bossLocked = true;
    sfx('hurt'); playMeow();
    this.msg('😾 偷苹果的大猫出现了！', 3);
    this.say([
      { who: '大猫', text: '喵——架子上那些苹果，现在都是我的了。' },
      { who: '果酱', text: '……那是我的。' },
      { who: '果酱', text: '我一棵一棵，种了很久很久的。' },
      { who: '旁白', text: '躲开它的猛扑，用苹果砸它' },
    ]);
  }
  updateBoss(dt) {
    const b = this.boss, p = this.player;
    if (!b || b.dead) return;
    b.t += dt; if (b.hit > 0) b.hit -= dt;
    const dx = p.x - b.x, dy = (p.y - PH) - (b.y - 66), d = Math.hypot(dx, dy) || 1;
    b.timer -= dt;

    // 垂直：BOSS 也有重力，会落在平台上（会跳平台）
    b.vy = Math.min(1500, b.vy + GRAV * dt);
    b.onGround = false;
    const prevBY = b.y;
    const ny = b.y + b.vy * dt;
    const hy = this.boxHits(b.x - 34, ny - 66, b.x + 34, ny);
    if (hy) { if (b.vy > 0) { b.y = hy.y * TS; b.onGround = true; } else b.y = (hy.y + 1) * TS + 66; b.vy = 0; }
    else b.y = ny;
    // 单向平台：猫下落时也能踩在上面（可以从下面跳穿上来）
    if (b.vy >= 0) {
      for (const O of this.oneways) {
        const top = O.y * TS;
        if (b.x + 34 > O.x * TS + 2 && b.x - 34 < O.x * TS + TS - 2 && prevBY <= top + 1 && b.y >= top) {
          b.y = top; b.vy = 0; b.onGround = true;
        }
      }
    }

    switch (b.state) {
      case 'idle': {
        if (d > 110) {
          b.face = dx > 0 ? 1 : -1;
          if (!this.moveBossX(b, dx / d * 66 * dt) && b.onGround) b.vy = -900;   // 被挡住就跳上去
        }
        // 玩家在头上（躲高台）-> 跳上去追
        if (b.onGround && (b.y - p.y) > 80 && Math.abs(dx) < 260) b.vy = -1010;
        if (b.timer <= 0) { b.state = 'windup'; b.timer = .85; b.tx = p.x; b.ty = p.y; }
        break;
      }
      case 'windup': {
        b.tx = p.x; b.ty = p.y;                    // 蓄力时继续瞄准玩家
        if (b.timer <= 0) { b.state = 'dash'; b.timer = .45; this.shake = .3; playMeow(); }
        break;
      }
      case 'dash': {
        const ax = b.tx - b.x, ay = b.ty - b.y, ad = Math.hypot(ax, ay) || 1;
        b.face = ax > 0 ? 1 : -1;
        if (!this.moveBossX(b, ax / ad * 820 * dt)) {
          // 冲刺撞到障碍 -> 装晕
          b.state = 'stun'; b.timer = 1.8; b.vy = -220;
          this.shake = .55; sfx('disappear');
          this.burst(b.x, b.y - 40, '#ffd166', 22);
          this.msg('💫 撞晕了！趁现在打它', 1.8);
          break;
        }
        if (b.timer <= 0) { b.state = 'recover'; b.timer = .8; this.shake = .3; this.burst(b.x, b.y - 30, '#c9a86a', 16); }
        break;
      }
      case 'stun': if (b.timer <= 0) { b.state = 'idle'; b.timer = rand(.7, 1.3); } break;
      case 'recover': if (b.timer <= 0) { b.state = 'idle'; b.timer = rand(.9, 1.6); } break;
    }
    if (d < 62 && b.state !== 'recover' && b.state !== 'stun') this.hurtPlayer(1);
  }
  /* 横向移动；被挡住返回 false */
  moveBossX(b, dx) {
    const nx = b.x + dx;
    if (!this.boxHits(nx - 34, b.y - 66, nx + 34, b.y - 2)) { b.x = nx; return true; }
    return false;
  }
  bossDead() {
    const b = this.boss; b.dead = true; this.bossLocked = false;
    this.burst(b.x, b.y - 30, '#ffd166', 46); sfx('gem'); playMeow();
    this.say([{ who: '大猫', text: '喵呜……不打了不打了……' },
              { who: '果酱', text: '苹果，还给我。' },
              { who: '大猫', text: '咕……那批苹果啊。我早就一颗一颗，全吃光了喵。' },
              { who: '果酱', text: '……' },
              { who: '果酱', text: '（……没关系。树还在。）' },
              { who: '旁白', text: '仓库还是空的。不过偷苹果的家伙，总算是抓住了。' }],
             () => this.finish());
  }

  /* ---------------- 苹果 ---------------- */
  updateApples(dt) {
    for (const a of this.applesArr) {
      a.life -= dt; a.rot += dt * 16;
      a.x += a.vx * dt; a.y += a.vy * dt; a.vy += CFG.appleGrav * dt;   // 金苹果与普通苹果同物理（轨迹一致）
      if (a.life <= 0) { a.dead = true; if (a.gold) this.explode(a.x, a.y); else this.burst(a.x, a.y, '#e2453c', 5); continue; }
      // 打靶（判定中心对齐贴图里的红心，半径放宽到 52）
      for (const tg of this.targets) {
        if (tg.on || a.dead) continue;
        const tx = tg.x * TS + TS / 2, ty = tg.y * TS + 9;
        if (Math.abs(a.x - tx) < 52 && Math.abs(a.y - ty) < 52) {
          a.dead = true; tg.on = true; tg.hit = .4; sfx('magic'); this.burst(tx, ty, '#7ed957', 16);
          const left = this.targets.filter(t => t.x < tg.x && !t.on).length;
          this.msg(left ? `🎯 打中了！还差 ${left + 1} 个` : '🎯 打中了！', 1.4);
          this.openDoors();
          break;
        }
      }
      // 打 TNT：引爆
      for (const tn of this.tnts) {
        if (tn.dead || a.dead) continue;
        const cx2 = tn.x * TS + TS / 2, cy2 = tn.y * TS + TS / 2;
        if (Math.abs(a.x - cx2) < 36 && Math.abs(a.y - cy2) < 40) { a.dead = true; this.detonate(tn); break; }
      }
      // 打怪 / 猫
      for (const e of this.enemies) {
        if (e.dead || a.dead) continue;
        const hh = e.type === 'bee' ? 22 : (e.type === 'cat' ? 34 : 40);
        if (Math.abs(a.x - e.x) < 24 && Math.abs(a.y - (e.y - hh / 2)) < hh) {
          a.dead = true;
          if (e.neutral) { e.flee = 3; playMeow(); this.burst(e.x, e.y - 20, '#ffd166', 10); break; }   // 猫：喵一声跑掉
          if (a.gold) break;                                                                           // 金苹果：交给爆炸
          e.hp--; e.hit = .2;
          this.burst(a.x, a.y, '#e2453c', 7);
          if (e.hp <= 0) { e.dead = true; e.squash = .5; sfx('disappear'); this.burst(e.x, e.y - 20, '#7ed957', 14); }
          break;
        }
      }
      // 打 Boss
      const b = this.boss;
      if (!a.dead && b && !b.dead && Math.abs(a.x - b.x) < 46 && Math.abs(a.y - (b.y - 34)) < 44) {
        a.dead = true;
        if (a.gold) { /* 伤害统一交给下面那次爆炸结算 */ }
        else {
          b.hit = .22; b.hp -= 1;
          this.burst(a.x, a.y, '#e2453c', 12); sfx('pop');
          if (b.hp <= 0) this.bossDead();
        }
      }
      // 金苹果爆炸
      if (a.dead && a.gold) this.explode(a.x, a.y);
      if (!a.dead && this.boxHits(a.x - 7, a.y - 7, a.x + 7, a.y + 7)) { a.dead = true; this.burst(a.x, a.y, '#e2453c', 5); if (a.gold) this.explode(a.x, a.y); }
    }
    this.applesArr = this.applesArr.filter(a => !a.dead);
  }
  /* TNT 引爆：炸掉半径内的裂纹石墙（'C'）+ 波及敌人 */
  detonate(tn) {
    tn.dead = true;
    const cx = tn.x * TS + TS / 2, cy = tn.y * TS + TS / 2;
    this.booms.push({ x: cx, y: cy, r: 200, t: .5, max: .5 });
    this.shake = .55; sfx('disappear');
    let n = 0;
    const R = 5;
    for (let y = tn.y - R; y <= tn.y + R; y++) {
      if (y < 0 || y >= this.h) continue;
      for (let x = tn.x - R; x <= tn.x + R; x++) {
        if (x < 0 || x >= this.w) continue;
        if (this.rows[y][x] !== 'C') continue;
        if (Math.hypot((x - tn.x) * TS, (y - tn.y) * TS) > 200) continue;
        this.grid[y][x] = 0;
        this.rows[y] = this.rows[y].substring(0, x) + '.' + this.rows[y].substring(x + 1);
        this.burst(x * TS + 20, y * TS + 20, '#b6b4ae', 6);
        n++;
      }
    }
    for (const e of this.enemies) {
      if (e.dead || e.neutral) continue;
      if (Math.hypot(e.x - cx, (e.y - 20) - cy) < 190) { e.dead = true; e.squash = .5; this.burst(e.x, e.y - 20, '#ffd24a', 14); }
    }
    this.msg(n ? `💥 轰！炸开了 ${n} 块石墙` : '💥 轰！', 2.2);
  }

  /* 每扇门只需要"它左边"的靶子全部打亮 —— 门后面的靶子不作要求，避免把自己锁死 */
  openDoors() {
    let opened = 0;
    for (const d of this.doors) {
      if (d.open) continue;
      const need = this.targets.filter(t => t.x < d.x);
      if (need.length && need.every(t => t.on)) { d.open = true; opened++; }
    }
    if (opened) { sfx('magic'); this.msg('🚪 木门打开了！', 1.8); this.burst(this.player.x, this.player.y - 30, '#ffd24a', 12); }
    return opened;
  }
  /* 爆炸清障：炸开裂纹石墙 'C'、木门 'D'、泥土墙 '#'、木墙 'W'、仙人掌 '^'
     （石头 'B' 炸不动 —— 活塞机关那道还是得踩压力板）*/
  blastTiles(cx, cy, R) {
    let n = 0;
    const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS), rt = Math.ceil(R / TS);
    for (let y = ty0 - rt; y <= ty0 + rt; y++) {
      if (y < 1 || y > this.h - 3) continue;                 // 保留最底层地面
      for (let x = tx0 - rt; x <= tx0 + rt; x++) {
        if (x < 1 || x >= this.w - 1) continue;
        const ch = this.rows[y][x];
        if (ch !== 'C' && ch !== 'D' && ch !== '#' && ch !== 'W' && ch !== '^') continue;
        if (Math.hypot((x - tx0) * TS, (y - ty0) * TS) > R) continue;
        this.grid[y][x] = 0;
        this.rows[y] = this.rows[y].substring(0, x) + '.' + this.rows[y].substring(x + 1);
        this.burst(x * TS + 20, y * TS + 20,
                   ch === '#' ? '#b98a5e' : ch === 'D' || ch === 'W' ? '#cba36d' : ch === '^' ? '#7ed957' : '#b6b4ae', 6);
        n++;
      }
    }
    if (n) {
      for (const d of this.doors) if (this.charAt(d.x, d.y) !== 'D') d.open = true;
      for (const c of this.cacti) if (this.charAt(c.x, c.y) !== '^') c.dead = true;
      this.cacti = this.cacti.filter(c => !c.dead);
    }
    return n;
  }
  explode(x, y) {
    this.booms.push({ x, y, r: CFG.boomR, t: .38, max: .38 });
    this.shake = .4; sfx('disappear');
    const broke = this.blastTiles(x, y, CFG.boomR);
    for (const e of this.enemies) {
      if (e.dead || e.neutral) continue;
      if (Math.hypot(e.x - x, (e.y - 20) - y) < CFG.boomR) { e.dead = true; e.squash = .5; this.burst(e.x, e.y - 20, '#ffd24a', 16); }
    }
    const b = this.boss;
    if (b && !b.dead && Math.hypot(b.x - x, (b.y - 34) - y) < CFG.boomR + 30) {
      b.hit = .3; b.hp -= CFG.goldBossDmg;
      this.burst(b.x, b.y - 40, '#ffd24a', 20);
      if (b.hp <= 0) this.bossDead();
    }
    this.burst(x, y, '#ffd24a', 26);
    if (broke) this.msg(`💥 炸开了 ${broke} 块障碍`, 1.8);
  }

  checkTriggers() {
    const p = this.player;
    const fire = (id, x, lines) => { if (this.triggered[id] || p.x < x * TS) return; this.triggered[id] = true; this.say(lines); };
    fire('t1', 10, [{ who: '果酱', text: '……门开着。' },
                    { who: '旁白', text: '按 ↑ / 空格 跳，空中再按一次是二连跳；走进门里就能穿过屋子' }]);
    fire('t2', 24, [{ who: '果酱', text: '这里就是仓库。' },
                    { who: '果酱', text: '（苹果，一颗都没剩。）' },
                    { who: '旁白', text: '屋里有木桶和夹层 —— 爬上去，出口在阁楼' }]);
    fire('t3', 51, [{ who: '果酱', text: '咦……这几棵仙人掌，昨天还没有的。' }]);
    fire('t4', 55, [{ who: '果酱', text: '屋里的门都能推开。' },
                    { who: '旁白', text: '走到门边它就会自己开；站在木板上按 ↓ 可以从板子跳下去' }]);
    fire('t5', 64, [{ who: '果酱', text: '村口的市集。今天一个人都没有。' }]);
    fire('t6', 88, [{ who: '果酱', text: '这户人家的门开在二楼……' },
                    { who: '旁白', text: '进屋后踩着夹层往上跳，从二楼那扇门出去' }]);
    fire('t7', 186, [{ who: '果酱', text: '棚子塌了，全是蛛网。' },
                     { who: '旁白', text: '蛛网里走不快、也跳不高 —— 慢慢挪过去' }]);
    fire('t8', 202, [{ who: '果酱', text: '上面那个草垛，够不着……' },
                     { who: '果酱', text: '踩一下弹簧试试。' }]);
    fire('t9', 238, [{ who: '果酱', text: '这是村里的大谷仓。' },
                     { who: '旁白', text: '里面有干草堆和夹层，可以一层层爬到阁楼' }]);
    fire('t10', 268, [{ who: '果酱', text: '货堆挡着路了。' },
                      { who: '旁白', text: '踩一下地上的压力板，活塞平台就会伸出来' }]);
    fire('t11', 300, [{ who: '果酱', text: '这根杆子……是叫电梯用的吧。' },
                      { who: '旁白', text: '碰一下操纵杆，电梯就会下来开门；站上去它会自己上去' }]);
    fire('t12', 316, [{ who: '果酱', text: '瞭望塔……好高。' },
                      { who: '旁白', text: '一层一层踩着夹层往上爬，从顶层出去' }]);
    fire('t13', 354, [{ who: '果酱', text: '旧屋塌了半边，墙都裂了。' },
                      { who: '旁白', text: '按住 K（手机按 🍏）蓄力，丢金苹果炸开它' },
                      { who: '旁白', text: '金苹果爆炸也能炸开木门和泥土墙' }]);
    // 进 Boss 房就出 Boss（门都能直接开，不再依赖任何前置条件）
    if (!this.boss && this.bossRoom && p.x > (this.bossRoom[0] + 1) * TS) this.spawnBoss();
  }

  pickups() {
    const p = this.player;
    const pcx = p.x, pcy = p.y - PH / 2;
    for (const it of this.items) {
      if (it.got) continue;
      const dx = pcx - it.x, dy = pcy - it.y, d = Math.hypot(dx, dy) || 1;
      // 吸附：进入磁吸范围就会被吸过来，越近吸得越快（不用精确碰撞）
      if (d < CFG.magnet) {
        const k = Math.min(1, (CFG.magnet - d) / (CFG.magnet * .6)) * 11 / 60;
        it.x += dx * k; it.y += dy * k;
      }
      if (d < 42) {
        it.got = true; sfx('coin'); this.burst(it.x, it.y, it.kind === 'gapple' ? '#ffd24a' : it.kind === 'heart' ? '#ff7a8a' : '#e2453c', 10);
        if (it.kind === 'gapple') { this.gold++; this.msg('🍏 金苹果 +1（爆炸弹）', 2); }
        else if (it.kind === 'heart') { if (this.hearts < CFG.maxHearts) { this.hearts++; this.msg('♥ 生命 +1', 2); } else this.msg('♥ 生命已满', 1.4); }
        else { this.apples = Math.min(CFG.maxApples, this.apples + 1); }
      }
    }
    for (const k of this.baskets) {
      if (k.got) continue;
      const cx = k.x * TS + TS / 2, cy = k.y * TS + TS / 2;
      if (Math.abs(p.x - cx) < 34 && Math.abs((p.y - PH / 2) - cy) < 36) {
        k.got = true; sfx('coin'); this.apples = Math.min(CFG.maxApples, this.apples + 4);
        this.burst(cx, cy, '#e23b2e', 14); this.msg('🧺 苹果篮！+4 苹果', 1.6);
      }
    }
    for (const s of this.signs) {
      const x = s.x * TS + TS / 2, y = s.y * TS + TS;
      // 终点牌：必须三个靶子全亮 + Boss 已解决，才算通关
      if (Math.abs(p.x - x) < 34 && Math.abs(p.y - (y - 20)) < 44 && !this.done
          && this.targets.every(t => t.on) && (!this.boss || this.boss.dead)) {
        this.done = true; sfx('gem'); this.finish();
      }
    }
  }

  say(lines, onDone) { this.dlg = { lines, i: -1, t: 0, onDone: onDone || null }; this.nextDlg(); }
  nextDlg() {
    const d = this.dlg; if (!d) return;
    d.i++;
    if (d.i >= d.lines.length) { const cb = d.onDone; this.dlg = null; const el = document.getElementById('dialog'); if (el) el.classList.add('hidden'); if (cb) cb(); return; }
    const l = d.lines[d.i];
    document.getElementById('dlg-who').textContent = l.who;
    document.getElementById('dlg-text').textContent = l.text;
    document.getElementById('dialog').classList.remove('hidden');
    d.t = 4.2;
  }
  advanceDlg() { if (this.dlg) this.nextDlg(); }

  respawn() {
    const hp = this.hearts, ap = this.apples, gd = this.gold;
    const got = this.items.map(i => i.got), bgot = this.baskets.map(i => i.got);
    const ton = this.targets.map(t => t.on), dop = this.doors.map(d => d.open);
    this.load();
    this.hearts = hp; this.apples = ap; this.gold = gd;
    this.items.forEach((it, i) => it.got = got[i]);
    this.baskets.forEach((k, i) => k.got = bgot[i]);
    this.targets.forEach((t, i) => t.on = ton[i]);
    this.doors.forEach((d, i) => d.open = dop[i]);
    this.state = 'playing';
    this.msg('回到上一个安全点', 1.4);
  }
  die() { if (this.dead > 0) return; this.dead = .7; sfx('hurt'); UI.cry(); this.burst(this.player.x, this.player.y - 20, '#e23b2e', 20); this.hearts--; if (this.hearts <= 0) { this.dead = 99; this.gameOver(); } }
  hurtPlayer(d) {
    const p = this.player;
    if (p.invuln > 0 || this.dead > 0) return;
    p.invuln = CFG.invuln; p.hurtFx = .5; this.hearts -= d; sfx('hurt');
    p.charging = false; p.charge = 0; UI.cry();
    this.burst(p.x, p.y - 20, '#e23b2e', 10);
    if (this.hearts <= 0) { this.dead = 99; this.gameOver(); }
  }
  gameOver() { this.state = 'over'; UI.showOver('over'); }
  finish() { this.state = 'win'; UI.showOver('win'); }

  startCharge(kind) {
    const p = this.player;
    if (this.state !== 'playing' || this.dead > 0 || this.dlg || p.throwT > 0) return;
    const gold = kind === 'gold';
    if (gold) { if (this.gold <= 0) { this.msg('没有金苹果了', 1.2); return; } }
    else if (this.apples <= 0) { this.msg('没有苹果了！等它自动恢复…', 1.4); return; }
    p.charging = true; p.charge = 0; p.chargeKind = gold ? 'gold' : 'apple';
  }
  releaseThrow() {
    const p = this.player;
    if (!p.charging) return;
    const c = clamp(p.charge, 0, 1), gold = p.chargeKind === 'gold';
    p.charging = false; p.charge = 0; p.chargeKind = 'apple';
    if (this.state !== 'playing' || p.throwT > 0) return;
    if (gold) {
      if (this.gold <= 0) return;
      p.throwT = .45; this.gold--; sfx('throw');
      this.applesArr.push({ x: p.x + p.face * 16, y: p.y - 32, vx: p.face * this.throwVX(c), vy: -this.throwVY(c), life: 2.4, rot: 0, dead: false, gold: true });
    } else {
      if (this.apples <= 0) return;
      p.throwT = .3; this.apples--; sfx('throw');
      this.applesArr.push({ x: p.x + p.face * 16, y: p.y - 32, vx: p.face * this.throwVX(c), vy: -this.throwVY(c), life: 2.4, rot: 0, dead: false, gold: false });
    }
  }
  throwVX(c) { return CFG.baseVX + CFG.addVX * c; }
  throwVY(c) { return CFG.baseVY + CFG.addVY * c; }
  simPath(c, maxT) {
    const p = this.player, pts = [];
    let x = p.x + p.face * 16, y = p.y - 32, vx = p.face * this.throwVX(c), vy = -this.throwVY(c);
    const dt = 1 / 60, n = Math.ceil((maxT || 1.8) / dt);
    for (let i = 0; i < n; i++) {
      vy += CFG.appleGrav * dt; x += vx * dt; y += vy * dt;
      pts.push([x, y]);
      if (this.boxHits(x - 7, y - 7, x + 7, y + 7)) break;
      if (y > this.h * TS) break;
    }
    return pts;
  }
  burst(x, y, c, n) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: rand(-200, 200), vy: rand(-300, -60), life: rand(.3, .6), max: .6, color: c, s: rand(3, 6) }); }
  msg(m, t) { const e = document.getElementById('toast'); if (!e) return; e.textContent = m; e.classList.remove('hidden'); this.toastT = t || 1.6; }

  /* ============================================================
     绘制
     ============================================================ */
  draw() {
    const g = ctx, cx = Math.round(this.cam.x);
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#c4e3f2'); sky.addColorStop(.55, '#e7f4f6'); sky.addColorStop(1, '#fdf2dd');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    g.fillStyle = 'rgba(255,244,207,.45)'; g.fillRect(VW - 250, 40, 150, 150);
    g.fillStyle = 'rgba(255,238,184,.85)'; g.fillRect(VW - 230, 60, 110, 110);
    g.fillStyle = '#fff7d6'; g.fillRect(VW - 214, 76, 78, 78);
    this.clouds(g);

    g.save();
    if (this.shake > 0) g.translate(rand(-4, 4), rand(-4, 4));
    g.translate(0, this.oy);

    const groundY = (this.h - 1) * TS;
    const hf = IMG.hillFar ? IMG.hillFar.height : 240, nsc = .58, hn = IMG.hillNear ? IMG.hillNear.height * nsc : 174;
    this.parallax(g, IMG.hillFar, .16, groundY - hf - 35);       // 远山：山顶高、山脚压到地平线
    // 果酱村的远景剪影（屋顶 + 亮着的窗 + 树），夹在远山和近山之间
    if (IMG.village) this.parallax(g, IMG.village, .26, groundY - (IMG.village.height || 240) - 55);
    this.parallax(g, IMG.hillNear, .40, groundY - hn - 20, nsc); // 近山：矮一截，山脚贴地

    const t0 = Math.max(0, Math.floor(cx / TS)), t1 = Math.min(this.w - 1, Math.ceil((cx + VW) / TS));
    this.scenery(g, cx, groundY);

    // 房屋内部背景墙：铺在背景树**之后**，这样屋子里面不会长出树（内墙不透明）
    const HS = LEVEL.houses || [];
    for (const h of HS) {
      const hx = h[0] * TS - cx, hy = h[1] * TS, hw = (h[2] - h[0] + 1) * TS, hh = (h[3] - h[1] + 1) * TS;
      if (hx > VW || hx + hw < 0) continue;
      g.save();
      g.fillStyle = h[4] === 'stone' ? '#8d8478' : (h[4] === 'hay' ? '#a98b4e' : '#8a6a45');
      g.fillRect(hx, hy, hw, hh);
      g.fillStyle = 'rgba(0,0,0,.15)';
      for (let i = 0; i < hw; i += TS) g.fillRect(hx + i, hy, 2, hh);
      for (let j = 0; j < hh; j += TS) g.fillRect(hx, hy + j, hw, 2);
      const grd = g.createLinearGradient(0, hy, 0, hy + hh);
      grd.addColorStop(0, 'rgba(0,0,0,.34)');
      grd.addColorStop(.45, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = grd; g.fillRect(hx, hy, hw, hh);
      g.restore();
    }

    for (let y = 0; y < this.h; y++) for (let x = t0; x <= t1; x++) {
      const v = this.grid[y][x];
      if (v === 0 || v === 5) continue;
      const sx = x * TS - cx, sy = y * TS;
      if (v === 2) { this.tileImg(g, IMG.stone, sx, sy, '#cbc5bb'); continue; }
      if (v === 3) { this.tileImg(g, IMG.wood, sx, sy, '#cba36d'); continue; }
      if (v === 4) { this.tileImg(g, IMG.leaves, sx, sy, '#6a9a48'); continue; }
      if (v === 6) { this.tileImg(g, IMG.cracked, sx, sy, '#b2b0aa'); continue; }
      if (v === 7) { this.tileImg(g, IMG.fence, sx, sy, '#cba36d'); continue; }
      if (v === 8) { this.tileImg(g, IMG.hay, sx, sy, '#d8b25a'); continue; }
      if (v === 9) { this.tileImg(g, IMG.barrel, sx, sy, '#a77022'); continue; }
      const topOpen = this.grid[y - 1] ? this.grid[y - 1][x] === 0 : true;
      this.tileImg(g, topOpen ? IMG.grass : IMG.dirt, sx, sy, topOpen ? '#9ccb6e' : '#b98a5e');
    }

    for (const d of this.doors) { const sx = d.x * TS - cx, sy = d.y * TS, im = d.open ? IMG.doorOpen : IMG.door; if (im) g.drawImage(im, sx, sy, TS, TS * 2); }
    // 可开合的木门（开的时候带一点翻开的动态）
    for (const d of this.woodDoors) {
      const sx = d.x * TS - cx, sy = d.y * TS, im = d.open ? IMG.doorOpen : IMG.door;
      if (!im) continue;
      const k = d.t > 0 ? 1 - d.t / .22 : 0;
      g.save();
      if (d.open) { g.globalAlpha = .92; g.drawImage(im, sx + 3 - 3 * k, sy, TS - 6, TS * 2); }
      else g.drawImage(im, sx, sy, TS, TS * 2);
      g.restore();
    }
    // 活塞平台（伸出后）
    for (const q of this.pistons) {
      if (!q.on) continue;
      const sx = q.x * TS - cx, sy = q.y * TS;
      if (IMG.lift) g.drawImage(IMG.lift, sx - 10, sy, TS + 20, 18);
      else { g.fillStyle = '#b9ad8f'; g.fillRect(sx, sy, TS, TS); }
    }
    // 村口路灯（木柱 + 暖黄光晕，营造果酱村的氛围）
    for (const L of this.lamps) {
      const sx = L.x * TS - cx, sy = L.y * TS;
      g.save();
      g.fillStyle = 'rgba(255,214,120,.16)';
      g.beginPath(); g.arc(sx + TS / 2, sy + 6, 74 + Math.sin(this.t * 2 + L.t) * 4, 0, 7); g.fill();
      g.fillStyle = '#6b5539'; g.fillRect(sx + TS / 2 - 3, sy, 6, TS);
      g.fillStyle = '#c9a86a'; g.fillRect(sx + TS / 2 - 3, sy, 3, TS);
      g.fillStyle = '#4d4033'; g.fillRect(sx + TS / 2 - 11, sy - 8, 22, 10);
      g.fillStyle = '#ffd97a'; g.fillRect(sx + TS / 2 - 7, sy - 6, 14, 6);
      g.fillStyle = 'rgba(255,240,190,.9)'; g.fillRect(sx + TS / 2 - 3, sy - 5, 6, 4);
      g.restore();
    }
    // 野花（随风轻摆，蜜蜂爱在这儿打转）
    for (const f of this.flowers) {
      const sx = f.x * TS + TS / 2 - cx, sy = f.y * TS + TS;
      const sw = Math.sin(this.t * 2 + f.t) * 2;
      g.save();
      g.strokeStyle = '#5f9d33'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + sw, sy - 12); g.stroke();
      const col = ['#ff7aa2', '#ffd24a', '#c58cf0'][f.c] || '#ff7aa2';
      g.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        g.beginPath(); g.arc(sx + sw + Math.cos(a) * 4, sy - 14 + Math.sin(a) * 4, 3, 0, 7); g.fill();
      }
      g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(sx + sw, sy - 14, 2.4, 0, 7); g.fill();
      g.restore();
    }
    // 单向平台（薄木板，只从上面踩，可以从下面跳穿）
    for (const O of this.oneways) {
      const sx = O.x * TS - cx, sy = O.y * TS;
      g.fillStyle = '#d0a874'; g.fillRect(sx, sy, TS, 12);
      g.fillStyle = '#b98b56'; g.fillRect(sx, sy + 9, TS, 3);
      g.fillStyle = 'rgba(255,255,255,.42)'; g.fillRect(sx, sy, TS, 3);
      g.fillStyle = 'rgba(110,80,45,.42)'; g.fillRect(sx, sy, 2, 12); g.fillRect(sx + TS - 2, sy, 2, 12);
    }
    // 电梯（导轨 + 轿厢 + 门）
    for (const L of this.lifts) {
      const sx = L.x * TS - cx;
      if (L.mode === 'elevator') {
        g.fillStyle = 'rgba(90,84,70,.32)';
        g.fillRect(sx + 4, L.yT - 40, 5, L.yB - L.yT + 44);
        g.fillRect(sx + TS - 9, L.yT - 40, 5, L.yB - L.yT + 44);
        // 门（开着 = 两边各一扇；关着 = 一整片）
        if (L.open) {
          g.fillStyle = '#5b4a38';
          g.fillRect(sx + 1, L.top - 78, 6, 78);
          g.fillRect(sx + TS - 7, L.top - 78, 6, 78);
        } else {
          g.fillStyle = '#a77022'; g.fillRect(sx + 1, L.top - 78, TS - 2, 78);
          g.fillStyle = '#6b5539'; g.fillRect(sx + TS / 2 - 1, L.top - 78, 2, 78);
          g.fillStyle = '#c9a86a'; g.fillRect(sx + 4, L.top - 74, 5, 6);
        }
        // 轿厢地板
        g.fillStyle = '#b9ad8f'; g.fillRect(sx - 9, L.top - 2, TS + 18, 16);
        g.fillStyle = '#8e825f'; g.fillRect(sx - 9, L.top + 12, TS + 18, 5);
        g.fillStyle = '#d6cbae'; g.fillRect(sx - 6, L.top + 1, TS + 12, 4);
      } else {
        if (IMG.lift) g.drawImage(IMG.lift, sx - 6, L.top, TS + 12, 18);
        g.fillStyle = 'rgba(90,84,70,.35)';
        g.fillRect(sx + TS / 2 - 3, L.top + 18, 6, Math.max(0, (L.y + 1) * TS - L.top - 18));
      }
    }
    // 地面操纵杆
    for (const lv of this.levers) {
      const sx = lv.x * TS + TS / 2 - cx, sy = lv.y * TS + TS;
      g.save();
      g.fillStyle = '#6b5539'; g.fillRect(sx - 5, sy - 14, 10, 14);
      g.strokeStyle = lv.on ? '#ffd24a' : '#8e825f'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx, sy - 14);
      g.lineTo(sx + (lv.on ? 16 : -10), sy - 30); g.stroke();
      g.fillStyle = lv.on ? '#ffe07a' : '#c0392b';
      g.beginPath(); g.arc(sx + (lv.on ? 16 : -10), sy - 30, 6, 0, 7); g.fill();
      g.restore();
    }
    // 压力板
    for (const q of this.plates) {
      const sx = q.x * TS - cx, sy = q.y * TS + TS;
      if (IMG.plate) g.drawImage(IMG.plate, sx, sy - (q.on ? 7 : 12), TS, q.on ? 7 : 12);
    }
    // 史莱姆弹床（刚弹过会压扁一下）
    for (const s of this.slimes) {
      if (s.t > 0) s.t -= 1 / 60;
      const sq = s.t > 0 ? s.t / .35 : 0;
      const h = 30 * (1 - sq * .45);
      if (IMG.slime) g.drawImage(IMG.slime, s.x * TS - cx, s.y * TS + TS - h, TS, h);
    }
    // 蜘蛛网
    if (IMG.web) for (const w of this.webs) {
      g.save(); g.globalAlpha = .92; g.drawImage(IMG.web, w.x * TS - cx, w.y * TS, TS, TS); g.restore();
    }
    // TNT
    for (const tn of this.tnts) { if (tn.dead) continue; if (IMG.tnt) g.drawImage(IMG.tnt, tn.x * TS - cx, tn.y * TS, TS, TS); }
    for (const s of this.scares) if (IMG.scarecrow) g.drawImage(IMG.scarecrow, s.x * TS - cx, s.y * TS + TS - 76, 40, 76);
    for (const tg of this.targets) { const sx = tg.x * TS - cx, sy = tg.y * TS, im = tg.on ? IMG.targetOn : IMG.target; const sc = 1 + (tg.hit > 0 ? .18 : 0); if (im) g.drawImage(im, sx + TS / 2 - 22 * sc, sy + TS - 44 * sc, 44 * sc, 44 * sc); }
    for (const c of this.cacti) if (IMG.cactus) g.drawImage(IMG.cactus, c.x * TS - cx, c.y * TS, TS, TS);
    for (const s of this.springs) { const sy = s.y * TS + (s.t > 0 ? TS - 16 : TS - 28); if (IMG.spring) g.drawImage(IMG.spring, s.x * TS - cx, sy, 40, s.t > 0 ? 16 : 28); }
    for (const k of this.baskets) { if (k.got) continue; const bob = Math.sin(this.t * 2 + k.t) * 2; if (IMG.basket) g.drawImage(IMG.basket, k.x * TS - cx, k.y * TS + TS - 30 + bob, 40, 30); }
    for (const it of this.items) {
      if (it.got) continue;
      const im = it.kind === 'gapple' ? IMG.gapple : it.kind === 'heart' ? IMG.heart : IMG.apple;
      const bob = Math.sin(this.t * 3 + it.t) * 4;
      if (im) g.drawImage(im, it.x - 15 - cx, it.y - 15 + bob, 30, 30);
    }
    for (const s of this.signs) if (IMG.sign) g.drawImage(IMG.sign, s.x * TS + TS / 2 - 24 - cx, s.y * TS + TS - 46, 48, 40);

    for (const e of this.enemies) {
      if (e.dead && e.squash <= 0) continue;
      const sx = e.x - cx, wo = Math.sin(e.t * 7) * 2, sq = Math.max(0, e.squash / .5);
      g.save(); g.globalAlpha = e.hit > 0 ? .45 : (e.dead ? sq * .8 : 1);
      if (e.type === 'creeper' && IMG.creeper) {
        const h = 72 * (1 - sq * .78), w = (72 / 3.25) * (1 + sq * .5);
        g.save(); g.translate(sx, 0); g.scale(e.dir, 1); g.drawImage(IMG.creeper, -w / 2, e.y - h + wo + sq * 56, w, h); g.restore();
        g.restore();
        if (!e.dead) this.hpBar(g, sx, e.y - 86, 42, e.hp / e.maxHp);
      } else if (e.type === 'cat' && IMG.cat) {
        const h = 36 * (1 - sq * .7), w = 52 * (1 + sq * .4);
        g.save(); g.translate(sx, 0); g.scale(e.dir, 1); g.drawImage(IMG.cat, -w / 2, e.y - h + wo + sq * 25, w, h); g.restore();
        g.restore();
      } else if (e.type === 'bee' && IMG.bee) {
        g.save(); g.translate(sx, e.y + Math.sin(e.t * 9) * 3); g.scale(e.x < this.player.x ? 1 : -1, 1);
        g.drawImage(IMG.bee, -17, -13, 34, 26); g.restore(); g.restore();
        if (!e.dead) this.hpBar(g, sx, e.y - 26, 30, e.hp / e.maxHp);
      } else g.restore();
    }

    if (this.boss && !this.boss.dead) this.drawBoss(g, cx);

    for (const a of this.applesArr) {
      const sx = a.x - cx;
      const im = a.gold ? IMG.gapple : IMG.apple;
      g.save(); g.translate(sx, a.y); g.rotate(a.rot);
      if (im) { g.drawImage(im, -15, -15, 30, 30); }
      else {
        if (a.gold) {
          g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
          g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(-3, -3, 4, 0, 7); g.fill();
        } else {
          g.fillStyle = '#e2453c'; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill();
          g.fillStyle = '#7a4a24'; g.fillRect(-1.5, -15, 3, 6);
          g.fillStyle = '#8cc46e'; g.beginPath(); g.ellipse(5, -13, 6, 3, -.5, 0, 7); g.fill();
        }
      }
      g.restore();
    }
    // 爆炸
    for (const b of this.booms) {
      const k = 1 - b.t / b.max, r = b.r * (.4 + .6 * k);
      g.save(); g.globalAlpha = clamp(b.t / b.max, 0, 1) * .85;
      const grd = g.createRadialGradient(b.x - cx, b.y, r * .2, b.x - cx, b.y, r);
      grd.addColorStop(0, 'rgba(255,246,190,1)'); grd.addColorStop(.55, 'rgba(255,190,60,.8)'); grd.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(b.x - cx, b.y, r, 0, 7); g.fill(); g.restore();
    }
    for (const q of this.parts) { g.globalAlpha = clamp(q.life / q.max, 0, 1); g.fillStyle = q.color; g.fillRect(q.x - cx - q.s / 2, q.y - q.s / 2, q.s, q.s); }
    g.globalAlpha = 1;
    if (this.player.charging) this.drawTraj(g, cx);
    if (this.dead <= 0) this.drawPlayer(g, cx);
    g.restore();
  }

  drawBoss(g, cx) {
    const b = this.boss, sx = b.x - cx;
    const SX = 150, SY = 108;
    // 注意：不再画冲刺路径（玩家自己躲）
    g.save();
    const sh = b.state === 'windup' ? rand(-4, 4) : (b.state === 'stun' ? rand(-5, 5) : 0);
    g.translate(sx + sh, b.y - SY + sh);
    if (b.hit > 0) g.globalAlpha = .5;
    if (IMG.cat) { g.save(); g.scale(b.face, 1); g.drawImage(IMG.cat, -SX / 2, 0, SX, SY); g.restore(); }
    g.restore();
    if (b.hit > 0) { g.save(); g.globalAlpha = .45; g.fillStyle = '#fff'; g.fillRect(sx - SX / 2, b.y - SY, SX, SY); g.restore(); }
    if (b.state === 'windup') {
      g.save(); g.strokeStyle = 'rgba(255,90,60,' + (.5 + .3 * Math.sin(this.t * 24)) + ')'; g.lineWidth = 6;
      g.beginPath(); g.arc(sx, b.y - 20, 66 + 14 * Math.sin(this.t * 10), 0, 7); g.stroke(); g.restore();
    }
    if (b.state === 'stun') {                    // 装晕：头顶转圈星星
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
      const by = b.y - SY - 12;
      g.beginPath(); g.strokeStyle = 'rgba(255,220,90,.55)'; g.lineWidth = 3;
      g.ellipse(sx, by, 46, 13, 0, 0, 7); g.stroke();
      for (let i = 0; i < 4; i++) {
        const a = this.t * 6 + i * Math.PI / 2;
        g.font = 'bold 24px system-ui'; g.fillStyle = i % 2 ? '#ffd94a' : '#fff3b0';
        g.fillText('✦', sx + Math.cos(a) * 46, by + Math.sin(a) * 13);
      }
      g.font = 'bold 17px system-ui'; g.fillStyle = 'rgba(80,50,20,.85)';
      g.fillText('晕…', sx, by - 26);
      g.restore();
    }
  }

  hpBar(g, cx, y, w, ratio) {
    const h = 6;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(cx - w / 2 - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#3a1010'; g.fillRect(cx - w / 2, y, w, h);
    const r = clamp(ratio, 0, 1);
    g.fillStyle = r > .5 ? '#e23b2e' : (r > .25 ? '#e2762e' : '#d63030');
    g.fillRect(cx - w / 2, y, w * r, h);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - w / 2, y, w * r, 2);
    g.restore();
  }

  drawTraj(g, cx) {
    const p = this.player;
    const gold = p.chargeKind === 'gold';
    const pts = this.simPath(p.charge, 1.8);
    if (pts.length < 2) return;
    g.save();
    const cols = gold
      ? [[9, 'rgba(120,88,20,.5)'], [5, 'rgba(255,214,90,.98)']]
      : [[9, 'rgba(91,74,56,.45)'], [5, 'rgba(255,255,255,.95)']];
    for (const [lw, col] of cols) {
      g.lineWidth = lw; g.strokeStyle = col; g.setLineDash([13, 11]);
      g.beginPath(); g.moveTo(p.x + p.face * 16 - cx, p.y - 32);
      for (const [x, y] of pts) g.lineTo(x - cx, y);
      g.stroke();
    }
    g.setLineDash([]);
    // 金苹果：终点画个爆炸范围提示
    if (gold) {
      const e = pts[pts.length - 1];
      g.globalAlpha = .28; g.fillStyle = '#ffd24a';
      g.beginPath(); g.arc(e[0] - cx, e[1], CFG.boomR, 0, 7); g.fill();
      g.globalAlpha = .8; g.strokeStyle = '#e8a020'; g.lineWidth = 3;
      g.beginPath(); g.arc(e[0] - cx, e[1], CFG.boomR, 0, 7); g.stroke();
    }
    g.restore();
  }

  tileImg(g, img, x, y, fb) { if (img) g.drawImage(img, x, y, TS, TS); else { g.fillStyle = fb; g.fillRect(x, y, TS, TS); } }
  parallax(g, img, k, y, sc) { if (!img) return; sc = sc || 1; const sw = img.width * sc, sh = img.height * sc; let off = (this.cam.x * k) % sw; for (let x = -off; x < VW; x += sw) g.drawImage(img, Math.round(x), Math.round(y), sw, sh); }
  clouds(g) {
    if (!this._clouds) { this._clouds = []; const r = mulberry32(7); for (let i = 0; i < 7; i++) this._clouds.push({ x: r() * VW * 2, y: r() * 200 + 20, s: .7 + r() * .7 }); }
    for (const c of this._clouds) {
      const span = VW * 2, px = ((c.x - this.cam.x * .22) % span + span) % span - 150;
      g.save(); g.translate(Math.round(px), c.y); g.scale(c.s, c.s);
      const b = 36, cells = [[0, 0], [1, 0], [2, 0], [1, 1], [-1, 1], [0, 1], [1, -1]];
      g.fillStyle = '#fffdf7'; for (const [ax, ay] of cells) g.fillRect(ax * b, ay * b, b, b);
      g.fillStyle = '#eae3d6'; for (const [ax, ay] of cells) if (ay >= 1) g.fillRect(ax * b, ay * b + b - 8, b, 8);
      g.restore();
    }
  }
  // 果园背景装饰（远景，带视差，不跟地面同步跳）
  scenery(g, cx, groundY) {
    const r = mulberry32(99), K = .86;
    for (let x = 2; x < this.w - 1; x++) {
      const v = r(), v2 = r(), v3 = r();
      const px = Math.round(x * TS - cx * K);
      if (px < -160 || px > VW + 160) continue;
      if (v < .10) {                                     // 果树（更高、更疏，避免连成一片）
        const h = 96 + v2 * 46, wob = v3 * 8 - 4;
        if (IMG.log) g.drawImage(IMG.log, px - 12, groundY - h + wob, 24, h);
        if (IMG.leaves) for (const [ox, oy] of [[-34, -h - 40], [0, -h - 62], [34, -h - 40], [-19, -h - 78], [19, -h - 78], [0, -h - 24]])
          g.drawImage(IMG.leaves, px + ox - 18, groundY + oy + wob, 36, 36);
      } else if (v < .15) { if (IMG.hay) g.drawImage(IMG.hay, px, groundY - 24, 40, 24); }
      else if (v < .18) { if (IMG.barrel) g.drawImage(IMG.barrel, px, groundY - 36, 36, 36); }
      else if (v < .21) { if (IMG.table) g.drawImage(IMG.table, px, groundY - 36, 36, 36); }
      else if (v < .24) { if (IMG.mossy) g.drawImage(IMG.mossy, px, groundY - 20, 40, 20); }
    }
  }
  drawPlayer(g, cx) {
    const p = this.player, sx = p.x - cx, sy = p.y;
    g.save();
    g.globalAlpha = .18; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(sx, sy + 2, 16, 5, 0, 0, 7); g.fill();
    g.globalAlpha = 1;
    const h = 62, w = IMG.chan ? IMG.chan.width * (h / IMG.chan.height) : 26;
    const bob = p.onGround && Math.abs(p.vx) > 10 ? Math.abs(Math.sin(p.walk)) * 3 : 0;
    if (p.invuln > 0 && Math.floor(this.t * 18) % 2 === 0) g.globalAlpha = .45;
    if (IMG.chan) {
      g.save();
      if (p.face < 0) { g.translate(sx, 0); g.scale(-1, 1); g.drawImage(IMG.chan, -w / 2, sy - h - bob, w, h); }
      else g.drawImage(IMG.chan, sx - w / 2, sy - h - bob, w, h);
      g.restore();
    } else { g.fillStyle = '#e88'; g.fillRect(sx - w / 2, sy - h, w, h); }
    if (p.hurtFx > 0) { g.globalAlpha = p.hurtFx * .8; g.fillStyle = '#ff3b30'; g.fillRect(sx - w / 2, sy - h, w, h); }
    g.restore();
  }
}

/* ============================================================
   输入
   ============================================================ */
const Input = { x: 0, y: 0, keys: {} };
window.addEventListener('keydown', e => {
  const k = e.code;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  Input.keys[k] = true;
  if (game.dlg) { if (k === 'Space' || k === 'KeyJ' || k === 'Enter') game.advanceDlg(); readKeys(); return; }
  if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') game.player && (game.player.jumpBuf = .12);
  if (k === 'KeyJ') game.startCharge('apple');
  if (k === 'KeyK') game.startCharge('gold');
  if (k === 'KeyP' || k === 'Escape') UI.togglePause();
  readKeys();
});
window.addEventListener('keyup', e => {
  Input.keys[e.code] = false; readKeys();
  if (e.code === 'KeyJ' || e.code === 'KeyK') game.releaseThrow();
});
function readKeys() { const k = Input.keys; Input.x = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0); Input.y = (k['KeyS'] || k['ArrowDown'] ? 1 : 0); }
window.addEventListener('blur', () => { Input.keys = {}; Input.x = 0; Input.y = 0; if (game.player) { game.player.charging = false; game.player.charge = 0; } });

const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
let joyId = null, joyCX = 0, joyCY = 0; const JOY_R = 48;
function joyStart(e) { const r = joy.getBoundingClientRect(); joyCX = r.left + r.width / 2; joyCY = r.top + r.height / 2; joyId = e.pointerId; try { joy.setPointerCapture(joyId); } catch (err) {} joyMove(e); }
function joyMove(e) {
  if (joyId === null || e.pointerId !== joyId) return;
  let dx = e.clientX - joyCX, dy = e.clientY - joyCY;
  const d = Math.hypot(dx, dy) || 1, cl = Math.min(d, JOY_R);
  knob.style.transform = `translate(${dx / d * cl}px, ${dy / d * cl}px)`;
  Input.x = clamp(dx / JOY_R, -1, 1);
  Input.y = dy > JOY_R * .55 ? 1 : 0;      // 摇杆往下 = 从平台跳下去
}
function joyEnd(e) { if (e.pointerId !== joyId) return; joyId = null; knob.style.transform = 'translate(0,0)'; Input.x = 0; Input.y = 0; }
if (joy) {
  joy.addEventListener('pointerdown', e => { e.preventDefault(); joyStart(e); });
  joy.addEventListener('pointermove', e => { e.preventDefault(); joyMove(e); });
  joy.addEventListener('pointerup', e => { e.preventDefault(); joyEnd(e); });
  joy.addEventListener('pointercancel', e => joyEnd(e));
}
document.getElementById('btn-jump').addEventListener('pointerdown', e => { e.preventDefault(); if (game.dlg) { game.advanceDlg(); return; } if (game.player) game.player.jumpBuf = .12; });
const tb = document.getElementById('btn-throw');
tb.addEventListener('pointerdown', e => { e.preventDefault(); if (game.dlg) { game.advanceDlg(); return; } game.startCharge('apple'); });
tb.addEventListener('pointerup', e => { e.preventDefault(); game.releaseThrow(); });
tb.addEventListener('pointercancel', () => game.releaseThrow());
const gb = document.getElementById('btn-gold');
if (gb) {
  gb.addEventListener('pointerdown', e => { e.preventDefault(); if (game.dlg) { game.advanceDlg(); return; } game.startCharge('gold'); });
  gb.addEventListener('pointerup', e => { e.preventDefault(); game.releaseThrow(); });
  gb.addEventListener('pointercancel', () => game.releaseThrow());
}
const dlgel = document.getElementById('dialog');
if (dlgel) dlgel.addEventListener('pointerdown', e => { e.preventDefault(); game.advanceDlg(); });

/* ============================================================
   UI
   ============================================================ */
const HEART_PAT = ["0110110", "1111111", "1111111", "1111111", "0111110", "0011100", "0001000"];
function heartSVG(c) { let r = ''; HEART_PAT.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '1') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }); return `<svg class="heart" viewBox="0 0 7 7" shape-rendering="crispEdges"><g fill="${c}">${r}</g></svg>`; }
const UI = {
  screens: { home: document.getElementById('screen-home'), game: document.getElementById('screen-game') },
  show(n) { for (const k in this.screens) this.screens[k].classList.toggle('active', k === n); document.body.classList.toggle('in-game', n === 'game'); },
  hud(g) {
    if (!g || !g.player) return;
    let h = ''; for (let i = 0; i < CFG.maxHearts; i++) h += heartSVG(i < g.hearts ? '#e23b2e' : 'rgba(120,120,120,.35)');
    const a = document.getElementById('hud-hearts'); if (a) a.innerHTML = h;
    const b = document.getElementById('hud-apples'); if (b) b.innerHTML = '<img class="pillicon" src="/assets/mc2/apple.png' + VQ + '" alt="">× ' + g.apples;
    const c = document.getElementById('hud-gold'); if (c) c.innerHTML = '<img class="pillicon" src="/assets/mc2/gapple.png' + VQ + '" alt="">' + g.gold;
    // 左上角不再显示靶子计数（靶子只是开门的机关，不是进度检查点）
    const bb = document.getElementById('bossbar');
    if (bb) {
      if (g.boss && !g.boss.dead) { bb.classList.remove('hidden'); document.getElementById('bossbar-fill').style.width = Math.max(0, g.boss.hp / g.boss.maxHp * 100) + '%'; }
      else bb.classList.add('hidden');
    }
  },
  togglePause() {
    if (game.state === 'playing') { game.state = 'paused'; document.getElementById('overlay-pause').classList.remove('hidden'); }
    else if (game.state === 'paused') { game.state = 'playing'; game.lastT = performance.now(); document.getElementById('overlay-pause').classList.add('hidden'); }
  },
  showOver(kind) {
    const win = kind === 'win';
    document.getElementById('over-sticker').src = win ? '/assets/win.gif' : '/assets/cry.gif';
    document.getElementById('overlay-over').classList.remove('hidden');
  },
  hideOver() { document.getElementById('overlay-over').classList.add('hidden'); },
  cry() {
    const b = document.getElementById('bubble'), cv = document.getElementById('game'), fr = document.querySelector('.frame');
    if (!b || !cv || !fr) return;
    const cr = cv.getBoundingClientRect(), sr = fr.getBoundingClientRect();
    const sc = cr.width / VW;
    b.style.left = (cr.left - sr.left + (game.player.x - game.cam.x) * sc) + 'px';
    b.style.top = (cr.top - sr.top + (game.player.y - 78 + game.oy) * sc) + 'px';
    b.classList.remove('hidden', 'pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.add('hidden'), 1400);
  },
};

/* ------------------------------------------------------------ */
const game = new Game();
window.__game = game; window.__Input = Input;
Sound.apply(); preloadSfx();
document.getElementById('btn-sound').addEventListener('click', () => Sound.toggle());

/* ---------- GitHub 求 star 弹窗 ---------- */
const GH_URL = 'https://github.com/Ratman463/apple-chan-games';
(function initGh() {
  const pop = document.getElementById('gh-pop'), link = document.getElementById('gh-link'), x = document.getElementById('gh-close');
  if (!pop) return;
  if (link) { link.href = GH_URL; link.textContent = GH_URL.replace(/^https?:\/\//, ''); }
  if (x) x.addEventListener('click', () => pop.classList.add('hidden'));
})();

/* ---------- 全屏（手机端）---------- */
const FS = {
  get on() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  toggle() {
    try {
      if (this.on) {
        const ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) ex.call(document);
      } else {
        const e = document.documentElement;
        const rq = e.requestFullscreen || e.webkitRequestFullscreen;
        if (rq) { const p = rq.call(e, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); }
        try { if (screen.orientation && screen.orientation.lock) { const q = screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => {}); } } catch (err) {}
      }
    } catch (err) {}
    setTimeout(() => { this.sync(); if (typeof resize === 'function') resize(); }, 150);
  },
  sync() {
    for (const id of ['btn-fs', 'btn-fs-home']) {
      const b = document.getElementById(id);
      if (b) b.textContent = this.on ? '🗗' : '⛶';
    }
  }
};
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { FS.sync(); if (typeof resize === 'function') resize(); }));
window.__FS = FS;
for (const id of ['btn-fs', 'btn-fs-home']) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => FS.toggle());
}
const IS_TOUCH = () => window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches;

function startGame() {
  UI.show('game'); UI.hideOver();
  document.getElementById('overlay-pause').classList.add('hidden');
  if (IS_TOUCH() && !FS.on) FS.toggle();      // 手机端点开始就尝试全屏
  game.load(); game.state = 'playing'; game.lastT = performance.now();
  resize();
  game.say([
    { who: '旁白', text: '清晨的雾还没散。果酱推开了仓库的木门——' },
    { who: '旁白', text: '架子上空了。一颗都没给她剩下。' },
    { who: '旁白', text: '门口的泥地上，有一串脚印，一直通到村外的果园里。' },
    { who: '果酱', text: '……我的苹果。' },
    { who: '果酱', text: '（没关系的。我自己，找回来就好。）' },
  ]);
}
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-again').addEventListener('click', () => { UI.hideOver(); startGame(); });
document.getElementById('btn-home').addEventListener('click', () => { location.href = '../'; });
document.getElementById('btn-quit').addEventListener('click', () => { location.href = '../'; });
document.getElementById('btn-resume').addEventListener('click', () => UI.togglePause());
document.getElementById('btn-pause').addEventListener('click', () => UI.togglePause());

function resize() {
  const st = document.querySelector('.stage'); if (!st) return;
  const r = st.getBoundingClientRect(); if (!r.width || !r.height) return;
  const ratio = r.width / r.height, minH = game.h * TS;
  let vh = Math.max(minH, 520), vw = vh * ratio;
  if (vw < 960) { vw = 960; vh = vw / ratio; }
  VW = Math.round(vw); VH = Math.round(vh);
  canvas.width = VW; canvas.height = VH;
  canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
  game.oy = VH - minH;
}
window.addEventListener('resize', resize);
resize();
})();
