/* ============================================================
   果酱跑酷 (Apple-chan Runner)  ·  RatAPI 游戏区
   ============================================================ */
(() => {
'use strict';

/* ---------------- 基础配置 ---------------- */
const W = 1280, H = 720;
const GRAVITY = 2600;
const GROUND_Y = 585;          // 地面 y
const BASE_SPEED = 440;        // 初始滚动速度
const MAX_SPEED = 720;         // 速度上限（冒险岛式：节奏稳，不无限加速）
const SPEED_GROW = 5;          // 每秒加速（约 56s 到顶后保持匀速）
const JUMP_V = -980;
const DOUBLE_JUMP_V = -880;

const CFG = {
  maxHearts: 6,
  startAmmo: 5,
  maxAmmo: 12,
  throwCooldown: 0.28,
  heartDamageInvuln: 1.2,
  // 分数统一折算
  scorePerDistance: 0.1,   // 每 px 距离
  coinScore: 10,           // 金币
  killScore: 50,           // 击杀苦力怕
  catPenalty: 50,          // 砸中猫的惩罚
  // 蓄力投掷（冒险岛式：力量越大飞得越远，弧线浅而快）
  chargeTime: 0.85,        // 按满所需时间
  appleGravity: 1800,
  throwBaseVX: 640,        // 水平速度 = speed*0.45 + base + charge*add
  throwAddVX: 680,
  throwBaseVY: 150,        // 起手向上的速度
  throwAddVY: 130,
};

/* ---------------- 工具 ---------------- */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------- 画布 ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/* ---------------- Minecraft 贴图 ---------------- */
const IMG = {};
const MC = {
  grass: '/assets/mc/cream_grass.png?v=4',
  dirt: '/assets/mc/cream_dirt.png?v=4',
  wood: '/assets/mc/cream_wood.png?v=4',
  stone: '/assets/mc/cream_stone.png?v=4',
  creeper: '/assets/mc/creeper.png?v=2',
  cat: '/assets/mc/cat.png?v=4',
  chest: '/assets/mc/chest.png?v=4',
  hillFar: '/assets/hill_far.png?v=4',
  hillNear: '/assets/hill_near.png?v=4',
};
for (const k in MC) {
  const im = new Image();
  im.onload = () => { IMG[k] = im; };
  im.src = MC[k];
}
// 用贴图平铺填充矩形（像素风）
function tileImage(g, img, x, y, w, h, size) {
  if (!img) return false;
  for (let ty = 0; ty < h; ty += size) {
    for (let tx = 0; tx < w; tx += size) {
      g.drawImage(img, x + tx, y + ty, Math.min(size, w - tx), Math.min(size, h - ty));
    }
  }
  return true;
}
function drawImgContain(g, img, x, y, w, h) {
  if (!img) return false;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

/* ============================================================
   程序绘制：果酱 (临时占位角色；之后可换成真实立绘 sprite)
   ============================================================ */
// 说明：当前用矢量程序绘制果酱；将来有了干净立绘，可在此加载 sprite 并替换 drawAppleChan。
let SPRITE = null;
function useSprite(img) { SPRITE = img; }
window.useAppleSprite = (url) => {
  const img = new Image();
  img.onload = () => useSprite(img);
  img.src = url;
};
window.useAppleSprite('/assets/applechan-game.png?v=24');  // 自动加载果酱立绘

// 用立绘绘制 + 程序动画（跑动弹跳+腾空拉伸+丢苹果前倾+扬尘）
function drawSpriteChan(g, x, y, s, state) {
  const img = SPRITE;
  const dispH = 176;                 // 显示高度
  const dispW = img.width * (dispH / img.height);

  // 跑动扬尘（只留扬尘，本体保持静止——之前的摆动太抖，先停用）
  if (state.onGround && Math.random() < 0.4) {
    state.dust && state.dust(x - dispW * 0.3, GROUND_Y - 2);
  }

  g.save();
  g.imageSmoothingEnabled = true;
  if (state.hurt) g.globalAlpha = 0.4;   // 受伤：整体闪烁，不画框
  g.drawImage(img, x - dispW / 2, y - dispH, dispW, dispH);
  g.restore();
}

// 画一个可爱的果酱（矢量：绿长发 + 小黄花 + 粉毛衣 + 棕鞋）
function drawAppleChan(g, x, y, s, state) {
  // x,y 为脚底中心; s 为缩放(1 约 160px 高); state 提供 {t, onGround, vy, throwing, hurt}
  const t = state.t || 0;
  const bob = state.onGround ? Math.sin(t * 14) * 2.2 : 0;      // 跑动上下
  const lean = clamp((state.vy || 0) / 2200, -0.18, 0.18);       // 跳跃倾斜
  const blink = (Math.sin(t * 1.7) > 0.985) ? 0.15 : 1;

  g.save();
  g.translate(x, y + bob);
  g.rotate(lean * 0.35);
  g.scale(s, s);

  // 影子
  g.save();
  g.globalAlpha = state.onGround ? 0.18 : 0.08;
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(0, 2, 46, 12, 0, 0, Math.PI * 2); g.fill();
  g.restore();

  const skin = '#ffe3d6', hair = '#a8d68a', hairD = '#8cc46e';
  const sweater = '#f4a7b0', sweaterD = '#e58b98', shoe = '#a5714a';

  // 腿
  g.fillStyle = skin;
  const legSwing = state.onGround ? Math.sin(t * 14) * 8 : 5;
  g.save(); g.translate(-11, -46); g.rotate(legSwing * 0.02);
  g.beginPath(); g.roundRect(-7, 0, 14, 40, 7); g.fill(); g.restore();
  g.save(); g.translate(11, -46); g.rotate(-legSwing * 0.02);
  g.beginPath(); g.roundRect(-7, 0, 14, 40, 7); g.fill(); g.restore();

  // 鞋
  g.fillStyle = shoe;
  g.beginPath(); g.roundRect(-17, -12, 22, 14, 5); g.fill();
  g.beginPath(); g.roundRect(3, -12, 22, 14, 5); g.fill();

  // 身体（毛衣）
  g.fillStyle = sweater;
  g.beginPath(); g.roundRect(-30, -100, 60, 58, 20); g.fill();
  // 领口
  g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(0, -98, 22, 10, 0, 0, Math.PI * 2); g.fill();
  // 衣服上的小苹果
  g.fillStyle = '#e2453c';
  g.beginPath(); g.arc(0, -70, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a4a24'; g.fillRect(-1, -86, 2, 8);
  g.fillStyle = '#8cc46e'; g.beginPath(); g.ellipse(5, -85, 6, 3, -0.5, 0, Math.PI * 2); g.fill();

  // 手臂（丢苹果时前伸）
  g.fillStyle = skin;
  const armF = state.throwing ? -1.1 : (state.onGround ? Math.sin(t * 14) * 0.5 : -0.6);
  g.save(); g.translate(-28, -92); g.rotate(armF * 0.5);
  g.beginPath(); g.roundRect(-8, 0, 15, 40, 7); g.fill(); g.restore();
  g.save(); g.translate(28, -92); g.rotate(-armF * 0.7);
  g.beginPath(); g.roundRect(-8, 0, 15, 40, 7); g.fill(); g.restore();

  // ---- 头发（后层，先画）----
  g.fillStyle = hairD;
  g.beginPath(); g.ellipse(0, -122, 50, 52, 0, 0, Math.PI * 2); g.fill();
  // 两侧长发（垂到身体两侧）
  g.fillStyle = hair;
  g.beginPath(); g.roundRect(-56, -150, 22, 150, 11); g.fill();
  g.beginPath(); g.roundRect(34, -150, 22, 150, 11); g.fill();

  // ---- 头（脸）----
  g.fillStyle = skin;
  g.beginPath(); g.arc(0, -128, 40, 0, Math.PI * 2); g.fill();

  // 眼睛（大眼 + 高光）
  g.fillStyle = '#3b7a3b';
  g.beginPath(); g.ellipse(-14, -126, 7, 9 * blink, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(14, -126, 7, 9 * blink, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(-15.5, -129, 2.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(12.5, -129, 2.4, 0, Math.PI * 2); g.fill();

  // 腮红
  g.fillStyle = 'rgba(240,150,160,.5)';
  g.beginPath(); g.arc(-26, -116, 7, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(26, -116, 7, 0, Math.PI * 2); g.fill();

  // 嘴（小虎牙）
  g.strokeStyle = '#c96a6a'; g.lineWidth = 2.5; g.beginPath();
  g.arc(0, -114, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = '#fff'; g.fillRect(-2, -112, 3, 4);

  // ---- 头发（前层：顶部"帽子"，留出脸）----
  g.fillStyle = hair;
  // 顶部圆弧发帽
  g.beginPath();
  g.moveTo(-42, -134);
  g.quadraticCurveTo(-46, -172, 0, -172);
  g.quadraticCurveTo(46, -172, 42, -134);
  g.quadraticCurveTo(30, -146, 18, -140);
  g.quadraticCurveTo(0, -150, -18, -140);
  g.quadraticCurveTo(-30, -146, -42, -134);
  g.closePath(); g.fill();
  // 侧刘海（斜分）
  g.beginPath(); g.moveTo(-42, -136); g.quadraticCurveTo(-30, -150, -14, -142);
  g.quadraticCurveTo(-30, -132, -42, -136); g.fill();
  g.beginPath(); g.moveTo(42, -136); g.quadraticCurveTo(30, -152, 12, -144);
  g.quadraticCurveTo(30, -130, 42, -136); g.fill();

  // 小黄花（发饰）
  g.save(); g.translate(34, -166); g.rotate(0.2);
  for (let i = 0; i < 5; i++) {
    g.rotate(Math.PI * 2 / 5);
    g.fillStyle = '#ffd95e';
    g.beginPath(); g.ellipse(0, -8, 6, 10, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f0a92e'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
  g.restore();

  // 受伤闪红
  if (state.hurt) {
    g.globalAlpha = 0.35; g.fillStyle = '#ff3b30';
    g.beginPath(); g.roundRect(-40, -170, 80, 170, 20); g.fill();
    g.globalAlpha = 1;
  }

  g.restore();
}

/* ============================================================
   游戏对象
   ============================================================ */
class Player {
  constructor() {
    this.x = 240; this.y = GROUND_Y; this.vy = 0;
    this.onGround = true; this.jumps = 0;
    this.hearts = CFG.maxHearts;
    this.ammo = CFG.startAmmo;
    this.invuln = 0; this.throwT = 0; this.hurtFlash = 0;
    this.w = 62; this.h = 160;
    this.t = 0;
    this.charging = false; this.charge = 0;   // 蓄力（按住）
    this.chargeFx = 0;
  }
  get top() { return this.y - this.h; }
  jump() {
    if (this.onGround) { this.vy = JUMP_V; this.onGround = false; this.jumps = 1; sfx('jump'); }
    else if (this.jumps < 2) { this.vy = DOUBLE_JUMP_V; this.jumps = 2; sfx('jump'); }
  }
  // ---- 蓄力投掷 ----
  canThrow() { return this.throwT <= 0 && this.ammo > 0; }
  startCharge() {
    if (!this.canThrow()) return;
    this.charging = true; this.charge = 0;
  }
  releaseThrow(game) {
    if (!this.charging) return;
    const c = clamp(this.charge, 0, 1);
    this.charging = false; this.charge = 0;
    if (!this.canThrow()) return;
    this.throwT = CFG.throwCooldown; this.ammo--;
    this.throwing = 0.22;
    game.apples.push(new Apple(this.throwX(), this.throwY(), this.throwVX(game, c), this.throwVY(c)));
    sfx('throw');
  }
  cancelCharge() { this.charging = false; this.charge = 0; }
  throwX() { return this.x + 34; }
  throwY() { return this.y - 120; }
  throwVX(game, c) { return game.speed * 0.45 + CFG.throwBaseVX + CFG.throwAddVX * c; }
  throwVY(c) { return -(CFG.throwBaseVY + CFG.throwAddVY * c); }
  // 抛物线采样（预览与实际共用同一套物理）
  simulatePath(game, c, maxT) {
    const pts = [];
    let x = this.throwX(), y = this.throwY(), vx = this.throwVX(game, c), vy = this.throwVY(c);
    const dt = 1 / 60, n = Math.ceil((maxT || 1.6) / dt);
    for (let i = 0; i < n; i++) {
      const py = y;
      vy += CFG.appleGravity * dt; x += vx * dt; y += vy * dt;
      pts.push([x, y]);
      if (y > GROUND_Y + 4 || x > W + 40) break;
      let hitPlat = false;
      if (game) for (const pl of game.platforms) {
        const tr = pl.topRect();
        if (x > tr.x && x < tr.x + tr.w && py <= tr.y && y >= tr.y) { hitPlat = true; break; }
      }
      if (hitPlat) break;
    }
    return pts;
  }
  hurt() {
    if (this.invuln > 0) return;
    this.hearts--; this.invuln = CFG.heartDamageInvuln; this.hurtFlash = 0.4;
    this.cancelCharge();
    sfx('hurt');
  }
  update(dt, game) {
    this.t += dt;
    const prevY = this.y;
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    this.onGround = false;                       // 每帧先假设腾空，落地再置回
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y; this.vy = 0; this.onGround = true; this.jumps = 0; this.groundY = GROUND_Y;
    } else if (this.vy > 0 && game) {
      // 平台：脚「从上方穿过平台顶面」才承接（避免穿透/站不住）
      for (const pl of game.platforms) {
        const tr = pl.topRect();
        if (this.x > tr.x - 16 && this.x < tr.x + tr.w + 16 && prevY <= tr.y + 6 && this.y >= tr.y) {
          this.y = tr.y; this.vy = 0; this.onGround = true; this.jumps = 0; this.groundY = tr.y;
          break;
        }
      }
    }
    if (this.throwT > 0) this.throwT -= dt;
    if (this.charging) {
      this.charge = Math.min(1, this.charge + dt / CFG.chargeTime);
      if (!this.canThrow()) this.cancelCharge();
    }
    this.chargeFx = this.charging ? this.charge : 0;
    if (this.throwing > 0) this.throwing -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
  }
  draw(g, game) {
    const flick = this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0;
    if (flick) g.globalAlpha = 0.55;
    const st = {
      t: this.t, onGround: this.onGround, vy: this.vy,
      throwing: this.throwing > 0, hurt: this.hurtFlash > 0.22,
      dust: (dx, dy) => game && game.particles.push(new Particle(dx, dy, '#c9a86a', rand(-90, -20), rand(-160, -40), rand(0.3, 0.6), rand(2, 4)))
    };
    if (SPRITE) drawSpriteChan(g, this.x, this.y, 1, st);
    else drawAppleChan(g, this.x, this.y, 1, st);
    g.globalAlpha = 1;
  }
  // 碰撞体积：只取身体主干（不含头顶空白和脚底），比立绘小一圈，判定更公平
  hitbox() { return { x: this.x - 22, y: this.y - 132, w: 44, h: 128 }; }
}

class Apple {  // 玩家投掷的苹果
  constructor(x, y, vx, vy) {
    this.x = x; this.y = y; this.vx = vx; this.vy = (vy !== undefined ? vy : -250);
    this.r = 13; this.dead = false; this.rot = 0; this.life = 2.0;
  }
  update(dt, game) {
    this.vy += CFG.appleGravity * dt;
    const py = this.y;
    this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 10;
    this.life -= dt;
    // 碰撞体积：撞到平台顶面就落地
    if (game) {
      for (const pl of game.platforms) {
        const tr = pl.topRect();
        if (this.x > tr.x && this.x < tr.x + tr.w && py <= tr.y && this.y >= tr.y) { this.dead = true; break; }
      }
    }
    if (this.y > GROUND_Y + 10 || this.x > W + 60 || this.life <= 0) this.dead = true;
  }
  draw(g) {
    g.save(); g.translate(this.x, this.y); g.rotate(this.rot);
    g.fillStyle = '#e2453c'; g.beginPath(); g.arc(0, 0, this.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a4a24'; g.fillRect(-1.5, -this.r - 6, 3, 8);
    g.fillStyle = '#8cc46e'; g.beginPath(); g.ellipse(5, -this.r - 4, 7, 3.5, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}

class AppleChest { // 苹果箱子：MC 箱子贴图 + 苹果 icon，碰到补弹药
  constructor(x, baseY, size) {
    this.w = this.h = size || 64;
    this.x = x;
    this.baseY = (baseY !== undefined ? baseY : GROUND_Y);
    this.y = this.baseY - this.h;
    this.dead = false; this.bob = Math.random() * 6;
  }
  update(dt, game) {
    this.x -= game.speed * dt; this.bob += dt;
    if (this.x < -this.w - 20) this.dead = true;
  }
  draw(g) {
    const x = this.x, y = this.y + Math.sin(this.bob * 2) * 3, w = this.w, h = this.h;
    if (IMG.chest) {
      g.save(); g.imageSmoothingEnabled = false;
      g.drawImage(IMG.chest, x, y, w, h);
      g.restore();
    } else {
      g.fillStyle = '#a77022'; g.fillRect(x, y, w, h);
    }
  }
  hitbox() { return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 10 }; }
}

class Platform { // 空中平台（可站立）
  constructor(x, y, w) {
    this.x = x; this.y = y; this.w = w || rand(120, 300); this.h = 40;
    this.dead = false;
  }
  update(dt, game) { this.x -= game.speed * dt; if (this.x < -this.w - 20) this.dead = true; }
  draw(g) {
    const x = this.x, y = this.y, w = this.w, h = this.h;
    if (!tileImage(g, IMG.stone, x, y, w, h, 32)) { g.fillStyle = '#cec8be'; g.fillRect(x, y, w, h); }
    g.fillStyle = '#9ccb6e';          // 顶部草皮（奶油绿）
    g.fillRect(x, y, w, 12);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(x, y, w, 4);
    g.strokeStyle = 'rgba(120,105,88,.5)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  // 仅顶面作为站立面
  topRect() { return { x: this.x, y: this.y, w: this.w, h: 8 }; }
}

class Creeper { // 苦力怕（真实体型：头 + 身体 + 四条腿）
  constructor(x, game, baseY) {
    this.w = 40; this.h = 130;                       // 保持立绘 1:3.25 比例
    this.x = x; this.baseY = (baseY !== undefined ? baseY : GROUND_Y);
    this.y = this.baseY - this.h;                    // y 为顶部，脚踩地面
    this.dead = false; this.hp = 2;
    this.speed = 80 + Math.random() * 70; this.t = Math.random() * 10; this.hitFlash = 0;
    this.fuse = 0; this.bob = 0;
  }
  update(dt, game) {
    this.t += dt;
    this.x -= (game.speed - this.speed) * dt;        // 向玩家靠近
    this.bob = Math.abs(Math.sin(this.t * 5)) * 6;   // 走路时轻微起伏
    this.y = this.baseY - this.h - this.bob;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.x < -this.w - 20) this.dead = true;
  }
  hurt() { this.hp--; this.hitFlash = 0.2; if (this.hp <= 0) { this.dead = true; sfx('pop'); } }
  draw(g) {
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const flash = this.hitFlash > 0;
    // 影子
    g.save(); g.globalAlpha = 0.15; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(x + w / 2, this.baseY + 2, w * 0.6, 8, 0, 0, Math.PI * 2); g.fill(); g.restore();
    // 苦力怕立绘
    if (IMG.creeper) {
      g.save();
      g.imageSmoothingEnabled = false;
      if (flash) g.globalAlpha = 0.35;               // 受伤：整体闪烁（不再画白框）
      g.drawImage(IMG.creeper, x, y, w, h);
      g.restore();
    } else {
      g.fillStyle = flash ? '#c8ff9e' : '#66c24a'; g.fillRect(x, y, w, h);
    }
  }
  hitbox() { return { x: this.x + 6, y: this.y + 12, w: this.w - 12, h: this.h - 18 }; }
}

class Cat { // 中立生物：猫（砸中会喵一声并扣分）
  constructor(x, game, baseY, ride) {
    this.w = 76; this.h = 58;
    this.x = x; this.baseY = (baseY !== undefined ? baseY : GROUND_Y);
    this.y = this.baseY - this.h;
    this.dead = false;
    this.ride = !!ride;                                  // 站在平台上 → 随平台一起漂
    this.speed = this.ride ? 0 : (34 + Math.random() * 46);
    this.t = Math.random() * 10; this.bob = 0; this.flash = 0;
    this.dir = -1;
  }
  update(dt, game) {
    this.t += dt;
    this.x -= (game.speed - this.speed) * dt;
    this.bob = Math.abs(Math.sin(this.t * 3)) * 4;
    this.y = this.baseY - this.h - this.bob;
    if (this.flash > 0) this.flash -= dt;
    if (this.x < -this.w - 20) this.dead = true;
  }
  meow(game) {
    if (this.dead) return;
    this.dead = true;
    playMeow();
    game.addPenalty(CFG.catPenalty);
    game.burst(this.x + this.w / 2, this.y + this.h / 2, '#ffd166', 10);
  }
  draw(g) {
    const x = this.x, y = this.y, w = this.w, h = this.h;
    // 影子
    g.save(); g.globalAlpha = 0.12; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(x + w / 2, this.baseY + 2, w * 0.36, 6, 0, 0, Math.PI * 2); g.fill(); g.restore();
    if (IMG.cat) {
      g.save(); g.imageSmoothingEnabled = false;
      if (this.flash > 0) g.globalAlpha = 0.35;
      g.drawImage(IMG.cat, x, y, w, h);
      g.restore();
    } else {
      g.fillStyle = '#e7a24f'; g.fillRect(x, y, w, h);
    }
  }
  hitbox() { return { x: this.x + 9, y: this.y + 12, w: this.w - 18, h: this.h - 22 }; }
}

class Coin {
  constructor(x, y) { this.x = x; this.y = y; this.dead = false; this.t = Math.random() * 6; }
  update(dt, game) { this.x -= game.speed * dt; this.t += dt; if (this.x < -40) this.dead = true; }
  draw(g) {
    const x = this.x, y = this.y + Math.sin(this.t * 3) * 6;
    const p = 6;                       // 像素格
    const wpx = Math.round(26 * (0.45 + 0.55 * Math.abs(Math.cos(this.t * 2.4))));  // 旋转错觉
    g.save(); g.translate(x, y);
    // 像素金币（Minecraft 风）
    const drawPix = (color, x0, y0, ww, hh) => { g.fillStyle = color; g.fillRect(x0, y0, ww, hh); };
    const cw = Math.max(6, wpx);
    drawPix('#b8860b', -cw / 2, -13, cw, 26);           // 边
    drawPix('#ffc531', -cw / 2 + 3, -10, Math.max(3, cw - 6), 20);
    drawPix('#ffe27a', -cw / 2 + 6, -7, Math.max(2, cw - 12), 14);
    drawPix('#b8860b', -3, -3, 6, 6);                    // 中间的 $ 面
    g.restore();
  }
  hitbox() { return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 }; }
}

class Particle {
  constructor(x, y, color, vx, vy, life = 0.6, size = 5) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.life = life; this.max = life; this.color = color; this.size = size;
  }
  update(dt) { this.vy += 1200 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
  draw(g) {
    g.globalAlpha = clamp(this.life / this.max, 0, 1);
    g.fillStyle = this.color;
    g.beginPath(); g.arc(this.x, this.y, this.size, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
}

/* ============================================================
   声音开关（默认关闭；开启后音效与喵叫才会响）
   ============================================================ */
const Sound = {
  on: false,
  apply() {
    for (const id of ['btn-sound', 'btn-sound-home']) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.textContent = this.on ? '🔊' : '🔇';
      el.title = this.on ? '声音：开' : '声音：关';
      el.classList.toggle('off', !this.on);
    }
  },
  toggle() { this.on = !this.on; this.apply(); if (this.on) sfx('coin'); },
};

/* ============================================================
   音效（WebAudio 简易合成，无需素材）
   ============================================================ */
let actx = null;
function sfx(type) {
  if (!Sound.on) return;
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    const now = actx.currentTime;
    const map = {
      jump: [520, 0.12, 'sine'], throw: [760, 0.08, 'triangle'], coin: [1180, 0.1, 'square'],
      hurt: [160, 0.2, 'sawtooth'], pop: [420, 0.12, 'square'], over: [220, 0.5, 'sawtooth']
    };
    const [f, d, w] = map[type] || map.coin;
    o.type = w; o.frequency.setValueAtTime(f, now);
    if (type === 'coin' || type === 'jump') o.frequency.exponentialRampToValueAtTime(f * 1.6, now + d);
    if (type === 'over' || type === 'hurt') o.frequency.exponentialRampToValueAtTime(f * 0.5, now + d);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + d);
    o.start(now); o.stop(now + d);
  } catch (e) {}
}

/* 喵叫音效（素材 mp3；克隆节点以便连打时叠加播放） */
let _meowBuf = null;
function playMeow() {
  if (!Sound.on) return;
  try {
    if (!_meowBuf) {
      _meowBuf = new Audio('/assets/audio/meow.mp3');
      _meowBuf.preload = 'auto';
    }
    const a = _meowBuf.cloneNode();
    a.volume = 0.55;
    a.play().catch(() => {});
  } catch (e) {}
}

/* ============================================================
   游戏主类
   ============================================================ */
class Game {
  constructor() {
    this.reset();
    this.state = 'home'; // home | playing | paused | over
    this.lastT = 0;
    this.bg = { clouds: [], hills: [] };
    this.initBg();
  }
  reset() {
    this.player = new Player();
    this.apples = []; this.chests = []; this.creepers = []; this.cats = []; this.coins = []; this.particles = []; this.platforms = [];
    this.speed = BASE_SPEED;
    this.distance = 0; this.score = 0; this.coinCount = 0;
    this.kills = 0; this.penalty = 0;
    this.t = 0;
    this.spawnTimer = 1.0;
    this.coinTimer = 1.2;
    this.creepTimer = 3.5;
    this.catTimer = 5.0;
    this.platTimer = 2.0;
    this.running = false;
  }
  // 分数统一折算：距离 + 金币 + 击杀 - 猫惩罚
  recalcScore() {
    this.score = Math.max(0, Math.floor(
      this.distance * CFG.scorePerDistance + this.coinCount * CFG.coinScore
      + this.kills * CFG.killScore - this.penalty));
  }
  addPenalty(p) { this.penalty += p; this.recalcScore(); }
  initBg() {
    for (let i = 0; i < 6; i++) this.bg.clouds.push({ x: rand(0, W), y: rand(60, 240), s: rand(0.6, 1.4), v: rand(8, 26) });
    for (let i = 0; i < 8; i++) this.bg.hills.push({ x: rand(0, W), s: rand(0.7, 1.3) });
  }

  start() { this.reset(); this.state = 'playing'; this.running = true; }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.running = false; this.player.cancelCharge(); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.running = true; this.lastT = performance.now(); } }
  gameOver() {
    if (this.state === 'over') return;
    this.state = 'over'; this.running = false; sfx('over');
    UI.showGameOver(this.score, this.coinCount, this.kills);
  }

  spawn() {
    // 障碍/箱子
    this.spawnTimer -= 1 / 60;
  }

  update(dt) {
    this.t += dt;
    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_GROW * dt);
    this.distance += this.speed * dt;
    this.recalcScore();

    this.player.update(dt, this);

    // 生成苹果箱子（补弹药；随机大小、随机高度）
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = rand(1.9, 4.4);
      this.chests.push(new AppleChest(W + 40, GROUND_Y, rand(52, 68)));
    }
    // 生成空中平台（够长、高度保证能二段跳够到）
    this.platTimer -= dt;
    if (this.platTimer <= 0 && this.t > 5) {
      this.platTimer = rand(3.0, 4.8);
      const py = GROUND_Y - rand(130, 295);
      const pw = rand(230, 470);                        // 长一点，好落脚
      const pl = new Platform(W + 40, py, pw);
      this.platforms.push(pl);
      // 箱子/猫有几率站在平台上
      if (Math.random() < 0.5) this.chests.push(new AppleChest(pl.x + pl.w * 0.5, pl.y, rand(52, 64)));
      if (Math.random() < 0.45) this.cats.push(new Cat(pl.x + pl.w * rand(0.25, 0.75), this, pl.y, true));
    }
    // 生成金币
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.coinTimer = rand(0.9, 1.8);
      const n = Math.floor(rand(1, 4));
      const baseY = GROUND_Y - rand(150, 300);
      for (let i = 0; i < n; i++) this.coins.push(new Coin(W + 40 + i * 42, baseY));
    }
    // 生成苦力怕
    this.creepTimer -= dt;
    if (this.creepTimer <= 0 && this.t > 6) {
      this.creepTimer = rand(3.0, 5.2);
      this.creepers.push(new Creeper(W + 60, this));
    }
    // 生成猫（中立生物；平台上那批在新平台生成时一起出现）
    this.catTimer -= dt;
    if (this.catTimer <= 0 && this.t > 4) {
      this.catTimer = rand(4.0, 7.5);
      this.cats.push(new Cat(W + 60, this));
    }

    // 更新实体
    for (const a of this.apples) a.update(dt, this);
    for (const c of this.chests) c.update(dt, this);
    for (const s of this.creepers) s.update(dt, this);
    for (const s of this.cats) s.update(dt, this);
    for (const c of this.coins) c.update(dt, this);
    for (const p of this.platforms) p.update(dt, this);
    for (const p of this.particles) p.update(dt);
    this.apples = this.apples.filter(a => !a.dead);
    this.chests = this.chests.filter(c => !c.dead);
    this.creepers = this.creepers.filter(s => !s.dead);
    this.cats = this.cats.filter(s => !s.dead);
    this.coins = this.coins.filter(c => !c.dead);
    this.platforms = this.platforms.filter(p => !p.dead);
    this.particles = this.particles.filter(p => p.life > 0);

    // ---- 苹果 vs 苦力怕 ----
    for (const a of this.apples) {
      for (const s of this.creepers) {
        if (a.dead || s.dead) continue;
        if (circleRect(a.x, a.y, a.r, s.hitbox())) {
          s.hurt(); a.dead = true; this.burst(a.x, a.y, '#e2453c', 8);
          if (s.dead) { this.kills++; this.recalcScore(); }
        }
      }
    }
    // ---- 苹果 vs 猫（打中=喵 + 扣分） ----
    for (const a of this.apples) {
      for (const c of this.cats) {
        if (a.dead || c.dead) continue;
        if (circleRect(a.x, a.y, a.r, c.hitbox())) { c.meow(this); a.dead = true; }
      }
    }
    // ---- 玩家 vs 苹果箱子（补弹药） ----
    const ph = this.player.hitbox();
    for (const c of this.chests) {
      if (c.dead) continue;
      if (rectRect(ph, c.hitbox())) {
        c.dead = true;
        this.player.ammo = Math.min(CFG.maxAmmo, this.player.ammo + 2);
        sfx('coin'); this.burst(c.x + c.w / 2, c.y + c.h / 2, '#e23b2e', 10);
      }
    }
    // ---- 玩家 vs 苦力怕 ----
    for (const s of this.creepers) {
      if (s.dead || this.player.invuln > 0) continue;
      if (rectRect(ph, s.hitbox())) {
        s.dead = true; this.player.hurt();
        this.burst(s.x + s.w / 2, s.y, '#7ed957', 10);
        UI.showCryBubble();                 // 果酱哭哭
      }
    }
    // ---- 玩家 vs 金币 ----
    for (const c of this.coins) {
      if (c.dead) continue;
      if (rectRect(ph, c.hitbox())) {
        c.dead = true; this.coinCount++; sfx('coin'); this.recalcScore();
        this.player.ammo = Math.min(CFG.maxAmmo, this.player.ammo + (Math.random() < 0.35 ? 1 : 0));
        this.burst(c.x, c.y, '#ffcb2e', 6);
      }
    }

    // ---- 死亡判定 ----
    if (this.player.hearts <= 0) this.gameOver();

    // ---- HUD ----
    UI.updateHUD(this);
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(x, y, color, rand(-260, 260), rand(-420, -80), rand(0.4, 0.8), rand(3, 7)));
  }

  draw() {
    const g = ctx;
    g.clearRect(0, 0, W, H);
    // 天空（奶油风渐变）
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#c4e3f2'); sky.addColorStop(0.55, '#e7f4f6'); sky.addColorStop(1, '#fdf2dd');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // 太阳（右上，柔和方块）
    g.save();
    g.fillStyle = 'rgba(255,244,207,.45)'; g.fillRect(W - 250, 58, 184, 184);
    g.fillStyle = 'rgba(255,238,184,.85)'; g.fillRect(W - 226, 82, 136, 136);
    g.fillStyle = '#fff7d6'; g.fillRect(W - 206, 102, 96, 96);
    g.restore();

    // 云（奶油白方块）
    for (const c of this.bg.clouds) {
      c.x -= c.v * 0.016; if (c.x < -260) c.x = W + 260;
      g.save(); g.translate(Math.round(c.x), c.y); g.scale(c.s, c.s);
      const b = 36;
      const cells = [[0,0],[1,0],[2,0],[1,1],[-1,1],[0,1],[1,-1]];
      g.fillStyle = '#fffdf7';
      for (const [cx, cy] of cells) g.fillRect(cx * b, cy * b, b, b);
      g.fillStyle = '#eae3d6';
      for (const [cx, cy] of cells) if (cy >= 1) g.fillRect(cx * b, cy * b + b - 8, b, 8);
      g.restore();
    }

    // 远山 / 近山（视差滚动，奶油绿）
    this.drawParallax(g, IMG.hillFar, 0.16, GROUND_Y - 240 + 26);
    this.drawParallax(g, IMG.hillNear, 0.40, GROUND_Y - 300 + 66);

    // 地面：奶油草方块 + 泥土贴图（滚动平铺）
    const S = 48;
    const off = this.distance % S;
    const grassTop = GROUND_Y - 8;      // 草方块顶面≈地面线，角色恰好站在草皮上
    g.save();
    g.translate(-off, 0);
    for (let x = 0; x <= W + S; x += S) {
      tileImage(g, IMG.dirt, x, grassTop, S, H - grassTop + 4, S);
    }
    for (let x = 0; x <= W + S; x += S) {
      tileImage(g, IMG.grass, x, grassTop, S, S, S);
    }
    g.restore();

    // 实体
    for (const p of this.platforms) p.draw(g);
    for (const c of this.coins) c.draw(g);
    for (const c of this.chests) c.draw(g);
    for (const s of this.creepers) s.draw(g);
    for (const s of this.cats) s.draw(g);
    for (const a of this.apples) a.draw(g);
    for (const p of this.particles) p.draw(g);
    if (this.player.charging) this.drawTrajectory(g);   // 蓄力：虚线抛物线预览
    this.player.draw(g, this);
  }

  // 虚线抛物线预览 + 落点标记
  drawTrajectory(g) {
    const p = this.player;
    const pts = p.simulatePath(this, p.charge, 1.6);
    if (pts.length < 2) return;
    g.save();
    for (const [lw, col] of [[9, 'rgba(91,74,56,.45)'], [5, 'rgba(255,255,255,.95)']]) {
      g.lineWidth = lw; g.strokeStyle = col; g.setLineDash([13, 11]);
      g.beginPath(); g.moveTo(p.throwX(), p.throwY());
      for (const [x, y] of pts) g.lineTo(x, y);
      g.stroke();
    }
    g.setLineDash([]);
    const [lx, ly] = pts[pts.length - 1];
    g.lineWidth = 5; g.strokeStyle = 'rgba(91,74,56,.85)';
    g.beginPath(); g.arc(lx, ly, 13, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.arc(lx, ly, 13, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  // 视差滚动：把一张可无缝平铺的条带按 factor 速度水平滚动
  drawParallax(g, img, factor, y) {
    if (!img || !img.width) return;
    const sw = img.width;
    const off = (this.distance * factor) % sw;
    for (let x = -off; x < W; x += sw) {
      g.drawImage(img, Math.round(x), Math.round(y));
    }
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, (now - this.lastT) / 1000 || 0);
    this.lastT = now;
    if (this.state === 'playing') { this.update(dt); this.draw(); }
    else if (this.state === 'paused' || this.state === 'over') { this.draw(); }
  }
}

/* 碰撞工具 */
function rectRect(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function circleRect(cx, cy, r, rc) {
  const nx = clamp(cx, rc.x, rc.x + rc.w), ny = clamp(cy, rc.y, rc.y + rc.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}

/* ============================================================
   UI / 状态
   ============================================================ */
// Minecraft 像素爱心
const HEART_PAT = ["0110110", "1111111", "1111111", "1111111", "0111110", "0011100", "0001000"];
function heartSVG(color) {
  let rects = '';
  HEART_PAT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '1') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  });
  return `<svg class="heart" viewBox="0 0 7 7" shape-rendering="crispEdges"><g fill="${color}">${rects}</g></svg>`;
}

const UI = {
  screens: { home: document.getElementById('screen-home'), game: document.getElementById('screen-game') },
  show(name) {
    for (const k in this.screens) this.screens[k].classList.toggle('active', k === name);
    document.body.classList.toggle('in-game', name === 'game');   // 移动端横屏布局用
    if (name !== 'game') this.hideCryBubble();
  },

  // 撞到苦力怕：果酱头顶弹一个哭哭气泡（小尺寸，不挡视线）
  showCryBubble() {
    const b = document.getElementById('bubble');
    const cv = document.getElementById('game');
    const shell = document.querySelector('.game-shell');
    if (!b || !cv || !shell) return;
    const cr = cv.getBoundingClientRect(), sr = shell.getBoundingClientRect();
    // 画布坐标 → 容器坐标（气泡尖角对准头顶）
    b.style.left = (cr.left - sr.left + (275 / 1280) * cr.width) + 'px';
    b.style.top = (cr.top - sr.top + (405 / 720) * cr.height) + 'px';
    b.classList.remove('hidden', 'pop');
    void b.offsetWidth;                    // 重排一下，让弹出动画能重播
    b.classList.add('pop');
    clearTimeout(this._bubbleT);
    this._bubbleT = setTimeout(() => b.classList.add('hidden'), 1300);
  },
  hideCryBubble() {
    const b = document.getElementById('bubble');
    if (b) b.classList.add('hidden');
  },

  updateHUD(game) {
    // 血条
    const hp = document.getElementById('hud-hearts');
    let html = '';
    for (let i = 0; i < CFG.maxHearts; i++) {
      const full = i < game.player.hearts;
      html += heartSVG(full ? '#e23b2e' : 'rgba(120,120,120,.35)');
    }
    hp.innerHTML = html;
    document.getElementById('hud-ammo').textContent = '🍎 × ' + game.player.ammo;
    document.getElementById('hud-score').textContent = game.score;
    document.getElementById('hud-coins').textContent = game.coinCount;
  },

  showGameOver(score, coins, kills) {
    document.getElementById('over-score').textContent = score;
    document.getElementById('over-sub').textContent =
      `金币 ×${coins}` + (kills !== undefined ? ` · 击杀 ×${kills}` : '');
    document.getElementById('overlay-over').classList.remove('hidden');
    // 提交分数
    const name = (document.getElementById('input-name').value || '匿名').trim().slice(0, 12);
    API.submitScore(name, score).then(() => this.loadBoard());
  },

  togglePause(on) {
    document.getElementById('overlay-pause').classList.toggle('hidden', !on);
  },

  async loadBoard() {
    const el = document.getElementById('leaderboard');
    el.innerHTML = '<li class="empty">加载中…</li>';
    try {
      const list = await API.getBoard();
      if (!list.length) { el.innerHTML = '<li class="empty">还没有记录，来抢第一!</li>'; return; }
      el.innerHTML = list.slice(0, 10).map((r, i) =>
        `<li><span class="rank">${i + 1}</span><span class="nm">${esc(r.name)}</span><span class="sc">${r.score}</span></li>`
      ).join('');
    } catch (e) {
      el.innerHTML = '<li class="empty">排行榜加载失败</li>';
    }
  }
};
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------------- 排行榜 API ---------------- */
const API = {
  base: '',
  async getBoard() {
    const r = await fetch(this.base + '/api/leaderboard', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad');
    return await r.json();
  },
  async submitScore(name, score) {
    try {
      await fetch(this.base + '/api/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score })
      });
    } catch (e) {}
  }
};

/* ============================================================
   预览角色 (Dashboard)
   ============================================================ */
function drawPreview() {
  const c = document.getElementById('char-preview');
  if (!c) return;                       // 首页已改用图片立绘
  const g = c.getContext('2d');
  let t = 0;
  (function loop() {
    requestAnimationFrame(loop);
    t += 1 / 60;
    g.clearRect(0, 0, c.width, c.height);
    drawAppleChan(g, c.width / 2, c.height - 12, 0.86, { t, onGround: true, vy: 0, throwing: false, hurt: false });
  })();
}

/* ============================================================
   启动
   ============================================================ */
const game = new Game();
game.lastT = performance.now();
requestAnimationFrame((t) => game.frame(t));
drawPreview();
UI.loadBoard();

// 声音开关
Sound.apply();
for (const id of ['btn-sound', 'btn-sound-home']) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', () => Sound.toggle());
}

document.getElementById('btn-play').addEventListener('click', () => {
  if (!document.getElementById('input-name').value.trim()) {
    document.getElementById('input-name').focus();
    document.getElementById('input-name').style.borderColor = '#ff3b30';
    setTimeout(() => document.getElementById('input-name').style.borderColor = '', 1200);
    return;
  }
  UI.show('game');
  document.getElementById('overlay-over').classList.add('hidden');
  document.getElementById('overlay-pause').classList.add('hidden');
  game.start();
  game.lastT = performance.now();
  enterGameFullscreen();
});
document.getElementById('btn-refresh').addEventListener('click', () => UI.loadBoard());
document.getElementById('btn-again').addEventListener('click', () => {
  document.getElementById('overlay-over').classList.add('hidden');
  game.start(); game.lastT = performance.now();
});
document.getElementById('btn-home').addEventListener('click', () => {
  document.getElementById('overlay-over').classList.add('hidden');
  UI.show('home'); game.state = 'home'; UI.loadBoard();
});
document.getElementById('btn-quit').addEventListener('click', () => {
  UI.togglePause(false); UI.show('home'); game.state = 'home';
});
document.getElementById('btn-resume').addEventListener('click', () => { UI.togglePause(false); game.resume(); });

/* 移动端：尝试全屏 + 锁定横屏（不支持时静默失败，改由竖屏提示兜底） */
function toggleFullscreen() {
  try {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (on) {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document);
    } else {
      const e = document.documentElement;
      const rq = e.requestFullscreen || e.webkitRequestFullscreen;
      if (rq) { const p = rq.call(e, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); }
      try { if (screen.orientation && screen.orientation.lock) { const q = screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => {}); } } catch (err) {}
    }
  } catch (err) {}
  setTimeout(syncFsButtons, 150);
}
function syncFsButtons() {
  const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
  for (const id of ['btn-fs', 'btn-fs-home']) {
    const b = document.getElementById(id);
    if (b) b.textContent = on ? '🗗' : '⛶';
  }
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, syncFsButtons));
for (const id of ['btn-fs', 'btn-fs-home']) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', toggleFullscreen);
}
function enterGameFullscreen() {
  const coarse = window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  if (!coarse) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  toggleFullscreen();
}
window.__FS = { toggle: toggleFullscreen, sync: syncFsButtons };

// 手机端：第一次点屏幕就自动进全屏（全屏必须由用户手势触发）
let fsAutoTried = false;
document.addEventListener('pointerdown', () => {
  if (fsAutoTried || document.fullscreenElement || document.webkitFullscreenElement) return;
  fsAutoTried = true;
  const coarse = window.matchMedia && window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  if (coarse) toggleFullscreen();
}, true);

/* 输入 */
function doJump() { if (game.state === 'playing') game.player.jump(); }
function doChargeStart() { if (game.state === 'playing') game.player.startCharge(); }
function doChargeRelease() { if (game.state === 'playing') game.player.releaseThrow(game); }

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); doJump(); }
  else if (e.code === 'KeyJ' || e.code === 'ArrowDown') { e.preventDefault(); doChargeStart(); }
  else if (e.code === 'KeyP') { if (game.state === 'playing') { game.pause(); UI.togglePause(true); } else if (game.state === 'paused') { UI.togglePause(false); game.resume(); } }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyJ' || e.code === 'ArrowDown') { e.preventDefault(); doChargeRelease(); }
});
window.addEventListener('blur', () => { game.player && game.player.cancelCharge(); });

// 触屏：按住蓄力，松开投掷（用 pointer 事件，避免 touch+click 重复触发）
const throwBtn = document.getElementById('t-throw');
throwBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { throwBtn.setPointerCapture(e.pointerId); } catch (err) {}
  doChargeStart();
});
throwBtn.addEventListener('pointerup', (e) => { e.preventDefault(); doChargeRelease(); });
throwBtn.addEventListener('pointercancel', () => doChargeRelease());
throwBtn.addEventListener('contextmenu', (e) => e.preventDefault());

const jumpBtn = document.getElementById('t-jump');
jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); doJump(); });
jumpBtn.addEventListener('contextmenu', (e) => e.preventDefault());

// 暴露给调试
window.__game = game;
})();
