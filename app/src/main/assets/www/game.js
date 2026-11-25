'use strict';
// =====================================================================
//  TOTALLY 90'S PINBALL  —  Table 1: MALL MADNESS
//  Canvas engine, 1920x1080 logical. Table world is 640x720 units,
//  drawn at 1.5x in the middle of the screen.
// =====================================================================
(() => {
const W = 1920, H = 1080, PX = 480, PS = 1.5;
const C = { bg: '#12052B', pink: '#FF2E97', teal: '#00E5D4', yel: '#FFE14D', purp: '#7B2FF7', lav: '#CDBEF5',
  deep: '#1E1446', dark: '#0B0320', mid: '#2A1D5C', dim: '#8D80C4', white: '#FFFFFF', orange: '#FF8A3D' };
const FD = 'ArchivoB', FN = 'AntonF', FM = 'AnonP';
const DEMO = /demo=1/.test(location.search);

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let scale = 1, offX = 0, offY = 0;
function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, Math.max(W / w, H / h, 1));
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  scale = Math.min(cv.width / W, cv.height / H);
  offX = (cv.width - W * scale) / 2; offY = (cv.height - H * scale) / 2;
}
addEventListener('resize', resize); resize();

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmt = n => Math.floor(n).toLocaleString('en-US');
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// =====================================================================
//  INPUT  (Android shell calls window.__pad(name, down))
// =====================================================================
const held = {};
const LEFT = ['L1', 'L2', 'ShiftLeft', 'KeyZ'], RIGHT = ['R2', 'R1', 'ShiftRight', 'Slash', 'KeyM'];
const isHeld = list => list.some(k => held[k]);
const keyMap = { Space: 'A', Enter: 'A', KeyX: 'A', Escape: 'START', KeyP: 'START', Backspace: 'B', KeyB: 'B',
  ArrowLeft: 'DL', ArrowRight: 'DR', ArrowUp: 'DU', ArrowDown: 'DD' };

function input(name, down) {
  if (!!held[name] === down) return;
  held[name] = down;
  SND.init();
  let logical = name;
  if (LEFT.includes(name)) logical = 'FL';
  else if (RIGHT.includes(name)) logical = 'FR';
  else if (keyMap[name]) logical = keyMap[name];
  onInput(logical, down);
}
window.__pad = (n, d) => input(n, !!d);
addEventListener('keydown', e => { if (e.repeat) return; input(e.code, true); e.preventDefault(); });
addEventListener('keyup', e => { input(e.code, false); e.preventDefault(); });
const touches = {};
cv.addEventListener('touchstart', e => { for (const t of e.changedTouches) { const k = t.clientX < innerWidth / 2 ? 'L1' : 'R2'; touches[t.identifier] = k; if (state !== 'play') input('Enter', true); else input(k, true); } e.preventDefault(); }, { passive: false });
cv.addEventListener('touchend', e => { for (const t of e.changedTouches) { const k = touches[t.identifier]; if (k) input(k, false); input('Enter', false); delete touches[t.identifier]; } e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setPause(true); SND.suspend(document.hidden); });

// =====================================================================
//  TABLE GEOMETRY  (world units)
// =====================================================================
const BR = 11, G = 1150, MAXV = 2600;
const segs = [];
function S(ax, ay, bx, by, o) { const s = { ax, ay, bx, by, r: 3, e: 0.45, kick: 0, tag: 'wall', oneway: false, ref: null }; Object.assign(s, o || {}); segs.push(s); return s; }
function Q(x0, y0, x1, y1, x2, y2, n, o) {
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; const x = u * u * x0 + 2 * u * t * x1 + t * t * x2, y = u * u * y0 + 2 * u * t * y1 + t * t * y2; S(px, py, x, y, o); px = x; py = y; }
}
const WALL = { r: 4, e: 0.4 };
S(40, 790, 40, 170, WALL); Q(40, 170, 40, 30, 320, 30, 20, WALL); Q(320, 30, 600, 30, 600, 170, 20, WALL); S(600, 170, 600, 702, WALL);
S(560, 702, 600, 702, { r: 2, e: 0.05, tag: 'plunger' });
S(560, 215, 560, 702, WALL);
S(600, 182, 556, 213, { r: 3, e: 0.3, oneway: true, tag: 'gate' });
// upper-left orbit deflector (kicks orbiting balls back into play)
S(40, 236, 104, 318, { r: 5, e: 0.55, kick: 260, tag: 'sling' });
const LANES_X = [245, 295, 345, 395];
[220, 270, 320, 370, 420].forEach(x => S(x, 74, x, 116, { r: 4, e: 0.5, tag: 'post' }));
S(80, 560, 80, 612, { r: 5, e: 0.5, tag: 'post' }); S(80, 612, 204, 668, { r: 4, e: 0.25, tag: 'guide' });
S(530, 560, 530, 612, { r: 5, e: 0.5, tag: 'post' }); S(530, 612, 436, 668, { r: 4, e: 0.25, tag: 'guide' });
const SL = [[120, 560], [120, 625], [185, 655]], SR = [[500, 560], [500, 622], [448, 650]];
[SL, SR].forEach((p, i) => {
  S(p[0][0], p[0][1], p[1][0], p[1][1], { r: 5, e: 0.5 });
  S(p[1][0], p[1][1], p[2][0], p[2][1], { r: 5, e: 0.4 });
  S(p[2][0], p[2][1], p[0][0], p[0][1], { r: 5, e: 0.6, kick: 470, tag: 'sling', side: i });
});
const bumpers = [
  { x: 250, y: 225, r: 34, c: C.pink, flash: 0 },
  { x: 390, y: 225, r: 34, c: C.teal, flash: 0 },
  { x: 320, y: 300, r: 38, c: C.yel, flash: 0 }];
const TV = { x: 250, y: 380, w: 140, h: 90, flash: 0 };
[[250, 380, 390, 380], [390, 380, 390, 470], [390, 470, 250, 470], [250, 470, 250, 380]].forEach(s => S(s[0], s[1], s[2], s[3], { r: 5, e: 0.45, tag: 'tv' }));
const flops = [222, 299, 376].map((x, i) => ({ x, y: 515, w: 42, h: 34, down: false, c: [C.teal, C.yel, C.pink][i], t: 0 }));
flops.forEach(f => {
  const x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
  [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].forEach(s => S(s[0], s[1], s[2], s[3], { r: 3, e: 0.35, tag: 'flop', ref: f }));
});

// flippers
function mkFlip(px, py, rest, up, side) { return { px, py, len: 90, r0: 12, r1: 6, a: rest, rest, up, side, w: 0, hold: false }; }
const flips = [mkFlip(216, 672, 0.46, -0.52, 0), mkFlip(424, 672, Math.PI - 0.46, Math.PI + 0.52, 1)];

// ramps: sensors at the mouth + elevated path the ball rides
function buildPath(pts, n) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        y: 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      });
    }
  }
  const l = pts[pts.length - 1]; out.push({ x: l[0], y: l[1] });
  let d = 0; out[0].d = 0;
  for (let i = 1; i < out.length; i++) { d += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y); out[i].d = d; }
  return { pts: out, len: d };
}
const ramps = [
  { id: 'L', name: 'REWIND', c: C.teal, mouth: { x: 160, y: 478 },
    path: buildPath([[160, 478], [132, 380], [112, 262], [130, 152], [220, 86], [330, 70], [440, 94], [515, 168], [530, 300], [520, 440], [515, 578]], 10) },
  { id: 'R', name: 'DIAL-UP', c: C.pink, mouth: { x: 480, y: 478 },
    path: buildPath([[480, 478], [508, 380], [528, 262], [510, 152], [420, 86], [310, 70], [200, 94], [125, 168], [108, 300], [102, 440], [100, 578]], 10) }];
function pathAt(p, d) {
  const pts = p.pts; let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].d < d) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], t = (d - a.d) / Math.max(1e-6, b.d - a.d);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x), dy: (b.y - a.y) };
}

// =====================================================================
//  GAME STATE
// =====================================================================
let state = 'title', paused = false, time = 0;
let hi = 0; try { hi = +localStorage.getItem('t90p_hi') || 0; } catch (e) { }
let G_ = null; // current game
const balls = [];
let parts = [], pops = [], annc = [], shake = 0, flashA = 0, flashC = C.white;

function newGame() {
  G_ = {
    score: 0, ball: 1, mult: 1, lanes: [false, false, false, false], skill: -1, skillT: 0,
    od: 0, odT: 0, combo: 0, lastRamp: -9, comboShow: 0, lock: 0, mb: false, mbQueue: 0, mbT: 0, jackpot: 2500000, jpCount: 0,
    letters: 0, mission: null, missionIdx: 0, saveT: 0, playT: 0, mood: 0.6, track: 0, tilt: 0, tilted: false,
    charge: 0, charging: false, idleT: 0, ballLostT: 0, nextBallT: 0, bonus: 0, newHi: false
  };
  balls.length = 0; parts = []; pops = []; annc = [];
  flops.forEach(f => f.down = false);
  serveBall();
  SND.setMode(false, 0);
}
function mkBall(x, y, vx, vy) { return { x, y, vx: vx || 0, vy: vy || 0, ramp: null, rampCd: 0, trail: [], stillT: 0, lastY: y }; }
function serveBall() {
  balls.push(mkBall(580, 690));
  G_.skill = Math.floor(Math.random() * 4); G_.skillT = 8;
  G_.tilt = 0; G_.tilted = false;
}
function autoLaunch() { const b = mkBall(580, 690, 0, -rnd(1750, 2050)); balls.push(b); SND.play('launch', 1); }

// =====================================================================
//  SCORING + EVENTS
// =====================================================================
function add(pts, x, y, col, big) {
  if (G_.tilted) return;
  const m = G_.mult * (G_.odT > 0 ? 2 : 1);
  const v = pts * m; G_.score += v;
  if (x != null) pops.push({ x, y, t: 0, text: '+' + fmt(v), c: col || C.yel, big: !!big });
  return v;
}
function announce(text, sub, col, dur, size) { annc.push({ text, sub: sub || '', c: col || C.yel, t: 0, dur: dur || 1.8, size: size || 96 }); if (annc.length > 2) annc.shift(); }
function sparks(x, y, col, n, spd) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = rnd(0.3, 1) * (spd || 420); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.25, 0.6), max: 0.6, c: col, k: 0 }); }
}
function confetti(n) {
  const cols = [C.pink, C.teal, C.yel, C.purp, C.white];
  for (let i = 0; i < n; i++) parts.push({ x: rnd(60, 580), y: rnd(-40, 200), vx: rnd(-120, 120), vy: rnd(80, 380), life: rnd(1.5, 2.6), max: 2.6, c: cols[i % 5], k: 1 + (i % 3), rot: rnd(0, 6), vr: rnd(-8, 8), sz: rnd(6, 13) });
}
function mood(d) { G_.mood = clamp(G_.mood + d, 0, 1); }
function addOD(n) {
  if (G_.odT > 0) return;
  G_.od = Math.min(100, G_.od + n);
  if (G_.od >= 100) { G_.od = 0; G_.odT = 20; announce('OVERDRIVE!', 'TURBO FLIPPERS · 2X SCORE', C.pink, 2.2, 110); SND.play('od'); shake = 14; flashA = 0.5; flashC = C.pink; SND.setMode(false, 1); }
}

const MISSIONS = [
  { name: 'BOOMBOX BLITZ', desc: 'Blast the speaker bumpers', need: 15, ev: 'bumper', reward: 2000000 },
  { name: 'REWIND RUSH', desc: 'Shoot any ramp', need: 4, ev: 'ramp', reward: 3000000 },
  { name: 'FOOD COURT FRENZY', desc: 'Smack the TV', need: 3, ev: 'tv', reward: 2500000 }];
function missionEv(ev) {
  const m = G_.mission; if (!m || m.ev !== ev) return;
  m.count++;
  if (m.count >= m.need) {
    add(m.reward, 320, 330, C.yel, true);
    announce('MISSION COMPLETE!', m.name, C.teal, 2.2, 84); SND.play('jackpot'); confetti(60); shake = 10; mood(0.3);
    G_.mission = null;
  }
}
function startMission() {
  if (G_.mission) return;
  const d = MISSIONS[G_.missionIdx % MISSIONS.length]; G_.missionIdx++;
  G_.mission = Object.assign({ count: 0, t: 30 }, d);
  announce(d.name, d.desc.toUpperCase() + ' · 30 SEC', C.yel, 2, 80); SND.play('mult');
}

function onHit(tag, b, imp, s) {
  if (!G_ || state !== 'play') return;
  switch (tag) {
    case 'sling': add(1000, b.x, b.y - 10, C.yel); SND.play('sling'); sparks(b.x, b.y, C.yel, 8, 300); mood(0.01); break;
    case 'tv': hitTV(b); break;
    case 'flop': if (s.ref && !s.ref.down && imp > 60) hitFlop(s.ref); break;
    default: if (imp > 350) SND.play('wall', imp);
  }
}
function hitBumper(bp, b) {
  bp.flash = 1;
  add(5000, bp.x, bp.y - bp.r - 6, bp.c);
  SND.play('bumper', bumpers.indexOf(bp)); sparks(b.x, b.y, bp.c, 12, 520); shake = Math.max(shake, 4);
  addOD(2); mood(0.02); missionEv('bumper');
}
let tvCd = 0;
function hitTV(b) {
  if (tvCd > 0) return; tvCd = G_.mb ? 0.9 : 0.35; TV.flash = 1;
  if (G_.mb) {
    G_.jpCount++;
    const sup = G_.jpCount % 3 === 0;
    const v = sup ? G_.jackpot * 3 : G_.jackpot;
    add(v, 320, 360, C.yel, true);
    announce(sup ? 'SUPER JACKPOT!' : 'JACKPOT!', fmt(v * G_.mult * (G_.odT > 0 ? 2 : 1)), C.yel, 2, sup ? 104 : 120);
    G_.jackpot += 250000; SND.play('jackpot'); shake = 18; flashA = 0.6; flashC = C.yel; confetti(sup ? 120 : 50); mood(0.3);
  } else {
    add(50000, 320, 365, C.teal); SND.play('tv'); shake = 6;
  }
  sparks(b.x, b.y, C.teal, 14, 500); addOD(8); missionEv('tv');
}
function hitFlop(f) {
  f.down = true; f.t = 0; add(25000, f.x + 21, f.y - 8, f.c); SND.play('flop'); sparks(f.x + 21, f.y + 17, f.c, 16, 380); addOD(6); mood(0.04);
  if (flops.every(x => x.down)) {
    add(250000, 320, 500, C.yel, true); announce('FLOPPIES SAVED!', G_.mission ? 'BONUS BANKED' : 'MISSION READY', C.teal, 1.8, 80); SND.play('combo', 3);
    setTimeout(() => { flops.forEach(x => x.down = false); }, 1600);
    startMission();
  }
}
function rollover(i, b) {
  add(10000, LANES_X[i], 82, C.yel); SND.play('roll');
  if (G_.skillT > 0 && i === G_.skill) { add(500000, 320, 150, C.pink, true); announce('SKILL SHOT!', 'TOTALLY RADICAL', C.pink, 1.8, 96); SND.play('jackpot'); shake = 8; }
  G_.skillT = 0;
  G_.lanes[i] = true;
  if (G_.lanes.every(x => x)) {
    G_.lanes = [false, false, false, false];
    G_.mult = Math.min(10, G_.mult + 1);
    announce('RAD!', 'MULTIPLIER x' + G_.mult, C.yel, 1.6, 120); SND.play('mult'); flashA = 0.3; flashC = C.yel; mood(0.1);
  }
}
const WORD = 'TOTALLY';
function rampDone(r, b) {
  const now = time;
  if (now - G_.lastRamp < 4.5) G_.combo++; else G_.combo = 1;
  G_.lastRamp = now; G_.comboShow = 4.5;
  add(100000 * G_.combo, r.id === 'L' ? 500 : 140, 520, r.c, true);
  if (G_.combo >= 2) { announce('COMBO x' + G_.combo, fmt(100000 * G_.combo) + ' PTS', C.teal, 1.3, 90); SND.play('combo', G_.combo); }
  addOD(12); mood(0.08); missionEv('ramp');
  G_.letters++;
  SND.play('letter');
  if (G_.letters >= WORD.length) {
    G_.letters = 0; add(5000000, 320, 300, C.pink, true);
    announce('TOTALLY RAD!', '5,000,000 BONUS', C.pink, 2.4, 108); SND.play('jackpot'); confetti(140); shake = 16; flashA = 0.5; flashC = C.teal; mood(0.4);
  }
  if (r.id === 'L') SND.play('rewind');
  else {
    SND.play('modem');
    if (!G_.mb) {
      G_.lock++;
      if (G_.lock >= 3) startMB();
      else announce('BALL ' + G_.lock + ' LOCKED', 'DIAL-UP CONNECTING…', C.pink, 1.4, 72);
    }
  }
}
function startMB() {
  G_.lock = 0; G_.mb = true; G_.mbQueue = 5; G_.mbT = 0.6; G_.saveT = Math.max(G_.saveT, 20); G_.jpCount = 0;
  announce('MEGA MULTIBALL!', '6 BALLS · JACKPOTS LIT AT THE TV', C.white, 3, 116);
  SND.play('big'); shake = 24; flashA = 0.8; flashC = C.pink; confetti(160); SND.setMode(false, 1);
}

// =====================================================================
//  PHYSICS
// =====================================================================
function colSeg(b, s, h) {
  if (s.ref && s.ref.down) return;
  if (s.oneway && b.vy < 0) return;
  const abx = s.bx - s.ax, aby = s.by - s.ay;
  let t = ((b.x - s.ax) * abx + (b.y - s.ay) * aby) / (abx * abx + aby * aby);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = s.ax + abx * t, cy = s.ay + aby * t;
  const dx = b.x - cx, dy = b.y - cy, R = BR + s.r, d2 = dx * dx + dy * dy;
  if (d2 >= R * R || d2 < 1e-8) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  b.x = cx + nx * R; b.y = cy + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + s.e) * vn * nx; b.vy -= (1 + s.e) * vn * ny;
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty; b.vx -= vt * tx * 0.004; b.vy -= vt * ty * 0.004;
    if (s.kick && -vn > 70) { b.vx += nx * s.kick; b.vy += ny * s.kick; }
    if (-vn > 40) onHit(s.tag, b, -vn, s);
  }
}
function colBumper(b, bp) {
  const dx = b.x - bp.x, dy = b.y - bp.y, R = BR + bp.r, d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return;
  const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
  b.x = bp.x + nx * R; b.y = bp.y + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; }
  b.vx += nx * 560; b.vy += ny * 560;
  if (time - (bp.last || 0) > 0.06) { bp.last = time; hitBumper(bp, b); }
}
function colFlip(b, f) {
  const tx = f.px + Math.cos(f.a) * f.len, ty = f.py + Math.sin(f.a) * f.len;
  const abx = tx - f.px, aby = ty - f.py;
  let t = ((b.x - f.px) * abx + (b.y - f.py) * aby) / (f.len * f.len);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = f.px + abx * t, cy = f.py + aby * t, rad = f.r0 + (f.r1 - f.r0) * t;
  const dx = b.x - cx, dy = b.y - cy, R = BR + rad, d2 = dx * dx + dy * dy;
  if (d2 >= R * R || d2 < 1e-8) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
  b.x = cx + nx * R; b.y = cy + ny * R;
  const rx = cx + nx * rad - f.px, ry = cy + ny * rad - f.py;
  const sx = -f.w * ry, sy = f.w * rx;
  const rvx = b.vx - sx, rvy = b.vy - sy, vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const e = Math.abs(f.w) > 2 ? 0.5 : 0.22;
    b.vx = rvx - (1 + e) * vn * nx + sx; b.vy = rvy - (1 + e) * vn * ny + sy;
  }
}
function colBalls(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, R = BR * 2;
  if (d2 >= R * R || d2 < 1e-6) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, o = (R - d) / 2;
  a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) { const j = -rv * 0.95; a.vx -= j * nx; a.vy -= j * ny; b.vx += j * nx; b.vy += j * ny; }
}
function updFlip(f, h) {
  const prev = f.a, target = f.hold ? f.up : f.rest;
  const spd = (f.hold ? 26 : 15) * (G_ && G_.odT > 0 ? 1.3 : 1);
  const diff = target - f.a, st = spd * h;
  f.a = Math.abs(diff) <= st ? target : f.a + Math.sign(diff) * st;
  f.w = (f.a - prev) / h;
}

function physics(dt) {
  const N = Math.ceil(dt / (1 / 720)), h = dt / N;
  for (let n = 0; n < N; n++) {
    for (const f of flips) updFlip(f, h);
    for (const b of balls) {
      if (b.ramp) continue;
      b.vy += G * h;
      const sp = Math.hypot(b.vx, b.vy); if (sp > MAXV) { b.vx *= MAXV / sp; b.vy *= MAXV / sp; }
      const py = b.y;
      b.x += b.vx * h; b.y += b.vy * h;
      for (let i = 0; i < segs.length; i++) colSeg(b, segs[i], h);
      for (const bp of bumpers) colBumper(b, bp);
      for (const f of flips) colFlip(b, f);
      // rollover lanes
      if ((py < 95) !== (b.y < 95) && b.y < 130) for (let i = 0; i < 4; i++) if (Math.abs(b.x - LANES_X[i]) < 22) rollover(i, b);
      // ramp mouths
      if (b.rampCd <= 0 && b.vy < -260) for (const r of ramps) {
        if (Math.hypot(b.x - r.mouth.x, b.y - r.mouth.y) < 26) { b.ramp = { r, d: 0, v: clamp(Math.hypot(b.vx, b.vy), 900, 1700) }; SND.play('launch', 0.3); sparks(b.x, b.y, r.c, 10, 300); break; }
      }
    }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) if (!balls[i].ramp && !balls[j].ramp) colBalls(balls[i], balls[j]);
  }
}

// =====================================================================
//  UPDATE
// =====================================================================
let demoT = [0, 0];
function demoAI(dt) {
  for (let i = 0; i < 2; i++) {
    const f = flips[i]; let want = false;
    for (const b of balls) {
      if (b.ramp) continue;
      const dx = b.x - f.px, dy = b.y - f.py;
      const along = i === 0 ? dx : -dx;
      if (along > 10 && along < 95 && dy > -60 && dy < 30 && b.vy > -50) want = true;
    }
    if (want && demoT[i] <= 0) demoT[i] = rnd(0.16, 0.24);
    demoT[i] -= dt;
    const h = demoT[i] > 0;
    if (h !== f.hold) { if (h) SND.play('flip'); f.hold = h; }
  }
  for (const b of balls) if (b.x > 562 && b.y > 660 && Math.abs(b.vy) < 30) { b.vy = -rnd(1700, 2100); SND.play('launch', 1); }
}

function update(dt) {
  time += dt;
  if (state === 'title') { updTitle(dt); return; }
  if (state === 'over') { updFx(dt); return; }
  if (paused) return;
  const g = G_; g.playT += dt;
  if (DEMO) demoAI(dt);
  else { flips[0].hold = isHeld(LEFT) && !g.tilted; flips[1].hold = isHeld(RIGHT) && !g.tilted; }

  // plunger
  const laneBall = balls.find(b => !b.ramp && b.x > 562 && b.y > 640 && Math.abs(b.vy) < 40);
  if (g.charging && laneBall) { const pc = g.charge; g.charge = Math.min(1, g.charge + dt * 1.4); if (Math.floor(pc * 8) !== Math.floor(g.charge * 8)) SND.play('charge', g.charge); }
  if (!laneBall) { g.charging = false; g.charge = 0; }

  physics(dt);

  // ramps
  for (const b of balls) {
    if (b.rampCd > 0) b.rampCd -= dt;
    if (!b.ramp) continue;
    const rp = b.ramp; rp.d += rp.v * dt;
    if (rp.d >= rp.r.path.len) {
      const p = pathAt(rp.r.path, rp.r.path.len - 1), l = Math.hypot(p.dx, p.dy) || 1;
      const end = rp.r.path.pts[rp.r.path.pts.length - 1];
      b.x = end.x; b.y = end.y; b.vx = p.dx / l * 380; b.vy = p.dy / l * 380; b.ramp = null; b.rampCd = 0.6;
      rampDone(rp.r, b);
    } else { const p = pathAt(rp.r.path, rp.d); b.x = p.x; b.y = p.y; }
  }

  // trails, stuck detection, drains
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.trail.push(b.x, b.y); if (b.trail.length > 20) b.trail.splice(0, 2);
    if (g.odT > 0 && Math.random() < 0.7) parts.push({ x: b.x + rnd(-5, 5), y: b.y + rnd(-5, 5), vx: rnd(-40, 40), vy: rnd(-120, -30), life: rnd(0.2, 0.45), max: 0.45, c: Math.random() < 0.5 ? C.orange : C.yel, k: 0 });
    const inLane = b.x > 562;
    if (!b.ramp && !inLane && Math.hypot(b.vx, b.vy) < 25) { b.stillT += dt; if (b.stillT > 3) { b.vy = -700; b.vx = rnd(-300, 300); b.stillT = 0; } } else b.stillT = 0;
    if (b.y > 770) {
      balls.splice(i, 1);
      if (g.saveT > 0 && !g.tilted) { autoLaunch(); announce('BALL SAVED!', '', C.teal, 1.2, 84); SND.play('save'); }
      else SND.play('drain');
    }
  }
  if (g.mb && balls.length + g.mbQueue <= 1) { g.mb = false; announce('MULTIBALL OVER', 'JACKPOT NOW ' + fmt(g.jackpot), C.lav, 1.6, 64); SND.setMode(false, g.odT > 0 ? 1 : 0); }
  if (g.mbQueue > 0) { g.mbT -= dt; if (g.mbT <= 0) { autoLaunch(); g.mbQueue--; g.mbT = 0.45; } }
  if (balls.length === 0 && g.mbQueue === 0) {
    if (g.nextBallT <= 0) {
      g.nextBallT = 2.2; g.bonus = g.score;
      announce(g.ball >= 3 ? 'FINAL BALL LOST' : 'BALL ' + g.ball + ' DRAINED', g.ball >= 3 ? '' : 'BALL ' + (g.ball + 1) + ' UP NEXT', C.pink, 2, 72);
      mood(-0.3); g.odT = Math.min(g.odT, 0); g.combo = 0; SND.setMode(false, 0);
    } else {
      g.nextBallT -= dt;
      if (g.nextBallT <= 0) {
        g.nextBallT = 0;
        if (g.ball >= 3) gameOver();
        else { g.ball++; g.saveT = 0; serveBall(); }
      }
    }
  }

  // timers
  if (g.saveT > 0) g.saveT -= dt;
  if (g.skillT > 0) g.skillT -= dt;
  if (g.comboShow > 0) g.comboShow -= dt;
  if (g.odT > 0) { g.odT -= dt; if (g.odT <= 0) { g.odT = 0; announce('OVERDRIVE OVER', '', C.lav, 1.2, 64); SND.setMode(false, g.mb ? 1 : 0); } }
  if (g.mission) { g.mission.t -= dt; if (g.mission.t <= 0) { announce('MISSION FAILED', g.mission.name, C.lav, 1.4, 64); g.mission = null; } }
  if (g.tilt > 0) g.tilt = Math.max(0, g.tilt - dt * 0.35);
  if (tvCd > 0) tvCd -= dt;
  G_.mood = clamp(G_.mood - dt * 0.012, 0, 1);
  g.track = Math.floor(g.playT / 40) % TRACKS.length;
  for (const bp of bumpers) bp.flash = Math.max(0, bp.flash - dt * 4);
  TV.flash = Math.max(0, TV.flash - dt * 2);
  updFx(dt);
}
function updFx(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k) { p.vy += 60 * dt; p.rot += p.vr * dt; } else { p.vx *= 0.92; p.vy *= 0.92; } }
  parts = parts.filter(p => p.life > 0); if (parts.length > 700) parts.splice(0, parts.length - 700);
  for (const p of pops) { p.t += dt; p.y -= 40 * dt; } pops = pops.filter(p => p.t < 1.1);
  for (const a of annc) a.t += dt; annc = annc.filter(a => a.t < a.dur);
  shake = Math.max(0, shake - dt * 40); flashA = Math.max(0, flashA - dt * 1.6);
}
function launch() {
  const g = G_, b = balls.find(b => !b.ramp && b.x > 562 && b.y > 640);
  if (!b) return;
  const c = Math.max(0.35, g.charge);
  b.vy = -(1250 + c * 950); g.charge = 0; g.charging = false;
  if (g.saveT <= 0 && !g.mb) g.saveT = 10;
  SND.play('launch', c); sparks(580, 700, C.pink, 12, 400);
}
function gameOver() {
  state = 'over'; overT = 0;
  if (G_.score > hi) { hi = G_.score; G_.newHi = true; try { localStorage.setItem('t90p_hi', String(Math.floor(hi))); } catch (e) { } }
  SND.play('over'); SND.setMode(true, 0);
}
let overT = 0;
function setPause(p) { paused = p; SND.setMode(p, 0); if (!p) SND.setMode(false, G_ && (G_.odT > 0 || G_.mb) ? 1 : 0); }
function nudge(dir) {
  const g = G_; if (g.tilted) return;
  for (const b of balls) if (!b.ramp && b.x < 560) { b.vx += dir * 140; b.vy -= 90; }
  shake = 8; SND.play('nudge'); g.tilt += 1;
  if (g.tilt > 3.2) { g.tilted = true; announce('TILT!', 'FLIPPERS DEAD — BALL LOST', '#FF4D4D', 2.4, 130); SND.play('tilt'); g.saveT = 0; }
  else if (g.tilt > 2.2) announce('DANGER!', 'EASY ON THE NUDGE', C.orange, 1, 70);
}

function onInput(k, down) {
  if (state === 'title') {
    if (down && (k === 'A' || k === 'START')) { SND.play('start'); state = 'play'; paused = false; newGame(); }
    if (down && k === 'B' && window.Android && Android.exit) Android.exit();
    return;
  }
  if (state === 'over') {
    if (down && overT > 1.2 && (k === 'A' || k === 'START')) { state = 'title'; SND.setMode(true, 0); }
    return;
  }
  if (k === 'START' && down) { setPause(!paused); SND.play('menu'); return; }
  if (paused) {
    if (down && k === 'B') { paused = false; state = 'title'; SND.setMode(true, 0); }
    if (down && k === 'A') setPause(false);
    return;
  }
  if (k === 'B' && down) { setPause(true); return; }
  if (DEMO) return;
  if (k === 'FL' || k === 'FR') {
    if (down && !G_.tilted) {
      SND.play('flip');
      const l = G_.lanes; if (k === 'FL') l.push(l.shift()); else l.unshift(l.pop());
    } else if (!down) SND.play('flipDown');
  }
  if (k === 'A') { if (down) { if (balls.some(b => !b.ramp && b.x > 562 && b.y > 640)) { G_.charging = true; G_.charge = 0; } } else if (G_.charging) launch(); }
  if (down && (k === 'DL' || k === 'DR')) nudge(k === 'DL' ? -1 : 1);
  if (down && k === 'DU') nudge(0);
}

// =====================================================================
//  PRE-RENDERED LAYERS
// =====================================================================
let tableLayer, rampLayer, panelL, panelR, scanLayer, titleBg, ballSpr, glowSpr = {}, bumperSpr = {};
function glow(col, r) {
  const key = col + r; if (glowSpr[key]) return glowSpr[key];
  const c = mk(r * 2, r * 2), g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, col); gr.addColorStop(0.25, col + 'AA'); gr.addColorStop(1, col + '00');
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); glowSpr[key] = c; return c;
}
function neonStroke(g, col, w, blur) { g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = blur; }
function tablePath(g) {
  g.beginPath(); g.moveTo(40, 760); g.lineTo(40, 170); g.quadraticCurveTo(40, 30, 320, 30); g.quadraticCurveTo(600, 30, 600, 170); g.lineTo(600, 760); g.closePath();
}
function buildLayers() {
  // ---- chrome ball sprite
  ballSpr = mk(48, 48); {
    const g = ballSpr.getContext('2d'), r = BR * PS;
    const gr = g.createRadialGradient(24 - r * 0.35, 24 - r * 0.4, 1, 24, 24, r);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.3, '#D6DEF7'); gr.addColorStop(0.7, '#6E78A8'); gr.addColorStop(1, '#1C1640');
    g.fillStyle = gr; g.beginPath(); g.arc(24, 24, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(255,46,151,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(24, 24, r - 2, 0.3, 1.6); g.stroke();
    g.strokeStyle = 'rgba(0,229,212,.7)'; g.beginPath(); g.arc(24, 24, r - 2, 3.4, 4.6); g.stroke();
  }
  // ---- bumper sprites
  bumpers.forEach((bp, i) => {
    for (const lit of [0, 1]) {
      const s = Math.ceil((bp.r + 18) * PS * 2), c = mk(s, s), g = c.getContext('2d'), m = s / 2;
      g.scale(PS, PS); const cx = m / PS;
      if (lit) { g.drawImage(glow(bp.c, 64), cx - bp.r - 18, cx - bp.r - 18, (bp.r + 18) * 2, (bp.r + 18) * 2); }
      g.fillStyle = lit ? bp.c : '#160A35'; g.beginPath(); g.arc(cx, cx, bp.r, 0, 7); g.fill();
      neonStroke(g, lit ? '#FFFFFF' : bp.c, 5, lit ? 0 : 10); g.beginPath(); g.arc(cx, cx, bp.r - 2, 0, 7); g.stroke(); g.shadowBlur = 0;
      g.strokeStyle = lit ? '#12052B' : bp.c; g.lineWidth = 3; g.beginPath(); g.arc(cx, cx, bp.r * 0.62, 0, 7); g.stroke();
      g.fillStyle = lit ? '#12052B' : bp.c; g.beginPath(); g.arc(cx, cx, bp.r * 0.24, 0, 7); g.fill();
      g.strokeStyle = lit ? 'rgba(18,5,43,.5)' : 'rgba(255,255,255,.18)'; g.lineWidth = 1.5;
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * bp.r * 0.3, cx + Math.sin(a) * bp.r * 0.3); g.lineTo(cx + Math.cos(a) * bp.r * 0.58, cx + Math.sin(a) * bp.r * 0.58); g.stroke(); }
      bumperSpr[i + '_' + lit] = c;
    }
  });

  // ---- static table
  tableLayer = mk(960, 1080); {
    const g = tableLayer.getContext('2d'); g.scale(PS, PS);
    tablePath(g);
    const fl = g.createRadialGradient(320, 300, 40, 320, 360, 520); fl.addColorStop(0, '#34106E'); fl.addColorStop(1, '#0B0320');
    g.fillStyle = fl; g.fill();
    g.save(); tablePath(g); g.clip();
    // memphis floor pattern
    for (let y = 40; y < 760; y += 40) for (let x = 40; x < 600; x += 40) {
      const k = ((x / 40) * 7 + (y / 40) * 3) % 5;
      if (k === 0) { g.fillStyle = 'rgba(255,46,151,.28)'; g.beginPath(); g.arc(x + 8, y + 8, 2.4, 0, 7); g.fill(); }
      else if (k === 2) { g.strokeStyle = 'rgba(0,229,212,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 14, y + 26); g.lineTo(x + 20, y + 20); g.lineTo(x + 26, y + 26); g.stroke(); }
      else if (k === 4) { g.strokeStyle = 'rgba(255,225,77,.13)'; g.lineWidth = 2; g.strokeRect(x + 18, y + 4, 7, 7); }
    }
    // big faint backglass art
    g.save(); g.translate(320, 640); g.rotate(-0.12); g.font = `120px ${FD}`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.035)'; g.fillText("90'S", 0, 0); g.restore();
    g.strokeStyle = 'rgba(255,225,77,.12)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(70, 330); for (let i = 1; i <= 4; i++) g.quadraticCurveTo(70 + i * 12 - 6, 330 + (i % 2 ? -12 : 12), 70 + i * 12, 330); g.stroke();
    g.beginPath(); g.moveTo(440, 560); for (let i = 1; i <= 4; i++) g.quadraticCurveTo(440 + i * 12 - 6, 560 + (i % 2 ? -12 : 12), 440 + i * 12, 560); g.stroke();
    // lane arrows
    g.fillStyle = 'rgba(0,229,212,.12)'; for (let i = 0; i < 3; i++) { const y = 540 - i * 28; g.beginPath(); g.moveTo(150, y - 14); g.lineTo(168, y + 2); g.lineTo(132, y + 2); g.fill(); }
    g.fillStyle = 'rgba(255,46,151,.12)'; for (let i = 0; i < 3; i++) { const y = 540 - i * 28; g.beginPath(); g.moveTo(490, y - 14); g.lineTo(508, y + 2); g.lineTo(472, y + 2); g.fill(); }
    g.restore();
    // outer neon
    neonStroke(g, C.teal, 4, 14); tablePath(g); g.stroke();
    g.beginPath(); g.moveTo(560, 215); g.lineTo(560, 702); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(0,229,212,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(600, 182); g.lineTo(556, 213); g.stroke();
    // posts, guides
    g.lineCap = 'round';
    for (const s of segs) if (s.tag === 'post' || s.tag === 'guide') { neonStroke(g, '#E9DDFF', s.r * 2, 6); g.beginPath(); g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); g.stroke(); }
    g.shadowBlur = 0;
    // slings
    for (const p of [SL, SR]) {
      g.beginPath(); g.moveTo(p[0][0], p[0][1]); g.lineTo(p[1][0], p[1][1]); g.lineTo(p[2][0], p[2][1]); g.closePath();
      g.fillStyle = 'rgba(255,225,77,.16)'; g.fill(); neonStroke(g, C.yel, 5, 14); g.lineJoin = 'round'; g.stroke(); g.shadowBlur = 0;
      g.fillStyle = C.pink; g.beginPath(); g.arc((p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, 5, 0, 7); g.fill();
    }
    // orbit deflector
    neonStroke(g, C.yel, 10, 16); g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 236); g.lineTo(104, 318); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(44, 241); g.lineTo(100, 313); g.stroke();
    // TV body
    g.fillStyle = '#1E1446'; g.beginPath(); g.roundRect(TV.x, TV.y, TV.w, TV.h, 16); g.fill();
    neonStroke(g, C.yel, 5, 14); g.stroke(); g.shadowBlur = 0;
    g.strokeStyle = C.yel; g.lineWidth = 3; g.beginPath(); g.moveTo(295, 380); g.lineTo(280, 362); g.moveTo(345, 380); g.lineTo(360, 362); g.stroke();
    g.fillStyle = C.yel; g.beginPath(); g.arc(280, 362, 4, 0, 7); g.arc(360, 362, 4, 0, 7); g.fill();
    // labels
    g.font = `11px ${FD}`; g.textAlign = 'center'; g.fillStyle = C.lav; g.fillText('SAVE THE FLOPPIES', 320, 572);
    g.font = `9px ${FD}`; g.fillStyle = 'rgba(205,190,245,.6)'; g.fillText('BALL SAVE', 320, 600);
    // plunger lane art
    g.font = `10px ${FD}`; g.save(); g.translate(582, 480); g.rotate(-Math.PI / 2); g.fillStyle = 'rgba(255,46,151,.55)'; g.fillText('HOLD A · LAUNCH', 0, 4); g.restore();
    // drain lip
    g.fillStyle = 'rgba(255,46,151,.15)'; g.fillRect(40, 718, 520, 4);
  }

  // ---- ramps (drawn above balls on the playfield, below ramp-riding balls)
  rampLayer = mk(960, 1080); {
    const g = rampLayer.getContext('2d'); g.scale(PS, PS); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const r of ramps) {
      const pts = r.path.pts;
      const line = () => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const p of pts) g.lineTo(p.x, p.y); };
      g.globalAlpha = 0.55; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 30; g.save(); g.translate(6, 10); line(); g.stroke(); g.restore();
      g.globalAlpha = 1; g.strokeStyle = r.c + '30'; g.lineWidth = 30; line(); g.stroke();
      neonStroke(g, r.c, 2.5, 10);
      for (const side of [-13, 13]) {
        g.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
          const x = pts[i].x - dy / l * side, y = pts[i].y + dx / l * side; if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      g.shadowBlur = 0; g.setLineDash([6, 10]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; line(); g.stroke(); g.setLineDash([]);
      // mouth
      g.fillStyle = r.c; g.globalAlpha = 0.25; g.beginPath(); g.arc(r.mouth.x, r.mouth.y, 22, 0, 7); g.fill(); g.globalAlpha = 1;
      neonStroke(g, r.c, 4, 12); g.beginPath(); g.arc(r.mouth.x, r.mouth.y + 4, 20, Math.PI * 0.05, Math.PI * 0.95, true); g.stroke(); g.shadowBlur = 0;
      g.font = `14px ${FD}`; g.fillStyle = r.c; g.textAlign = 'center';
      g.save(); const mp = pathAt(r.path, r.path.len * 0.16); g.translate(mp.x, mp.y); g.rotate(Math.atan2(mp.dy, mp.dx) + (r.id === 'L' ? Math.PI : Math.PI)); g.fillText(r.id === 'L' ? '◀◀ REWIND' : 'DIAL-UP', 0, 5); g.restore();
    }
    // cassette art on left mouth, modem art on right
    g.save(); g.translate(160, 440); g.rotate(-0.08);
    g.fillStyle = C.pink; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.roundRect(-30, -18, 60, 30, 5); g.fill(); g.stroke();
    g.fillStyle = '#12052B'; g.fillRect(-21, -12, 42, 13); g.strokeStyle = '#fff'; g.beginPath(); g.arc(-10, -5.5, 4, 0, 7); g.moveTo(14, -5.5); g.arc(10, -5.5, 4, 0, 7); g.stroke(); g.restore();
    g.save(); g.translate(480, 440); g.rotate(0.08);
    g.fillStyle = '#C9D3E6'; g.beginPath(); g.roundRect(-30, -14, 60, 24, 5); g.fill();
    for (let i = 0; i < 5; i++) { g.fillStyle = i < 3 ? '#20E070' : '#555'; g.beginPath(); g.arc(-18 + i * 9, -2, 2.6, 0, 7); g.fill(); } g.restore();
  }

  // ---- side panels
  const panel = (left) => {
    const c = mk(480, 1080), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 1080); gr.addColorStop(0, '#1A0840'); gr.addColorStop(1, '#0B0320'); g.fillStyle = gr; g.fillRect(0, 0, 480, 1080);
    for (let y = 0; y < 1080; y += 33) for (let x = 0; x < 480; x += 33) if (((x + y) / 33) % 4 === 0) { g.fillStyle = 'rgba(255,46,151,.12)'; g.beginPath(); g.arc(x + 6, y + 6, 2.5, 0, 7); g.fill(); }
    g.fillStyle = left ? 'rgba(0,229,212,.45)' : 'rgba(255,46,151,.45)'; g.fillRect(left ? 477 : 0, 0, 3, 1080);
    return c;
  };
  panelL = panel(true); panelR = panel(false);

  // ---- scanlines + vignette
  scanLayer = mk(W, H); {
    const g = scanLayer.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
}

// =====================================================================
//  DRAW HELPERS
// =====================================================================
function T(s, x, y, size, col, font, align, base) {
  ctx.font = `${size}px ${font || FD}`; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic'; ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function rgbText(s, x, y, size, col, a, font) {
  ctx.font = `${size}px ${font || FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const o = Math.max(3, size * 0.045);
  ctx.globalAlpha = a * 0.9; ctx.fillStyle = C.teal; ctx.fillText(s, x - o, y); ctx.fillStyle = C.pink; ctx.fillText(s, x + o, y);
  ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.globalAlpha = 1;
}
function rr(x, y, w, h, r, fill, stroke, lw) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.stroke(); } }
function chip(label, x, y, bg, fg, round) { ctx.font = `20px ${FD}`; const w = round ? 40 : ctx.measureText(label).width + 22; rr(x, y, w, 34, round ? 17 : 8, bg); T(label, x + w / 2, y + 25, 20, fg, FD, 'center'); return w; }
function timecode(t) { const s = Math.floor(t), p = n => String(n).padStart(2, '0'); return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60); }

function drawFloppy(x, y, w, h, col, a) {
  ctx.globalAlpha = a; rr(x, y, w, h, 5, col);
  ctx.fillStyle = '#C9D3E6'; ctx.fillRect(x + w * 0.24, y, w * 0.52, h * 0.34); ctx.fillStyle = '#12052B'; ctx.fillRect(x + w * 0.56, y + h * 0.05, w * 0.12, h * 0.24);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + w * 0.16, y + h * 0.5, w * 0.68, h * 0.44); ctx.fillStyle = C.pink; ctx.fillRect(x + w * 0.22, y + h * 0.6, w * 0.56, 3);
  ctx.globalAlpha = 1;
}
function drawCassette(x, y, w, col, rot) {
  const h = w * 0.64; rr(x, y, w, h, w * 0.08, col, '#fff', 3);
  rr(x + w * 0.14, y + h * 0.16, w * 0.72, h * 0.4, 6, '#12052B');
  for (const cx of [x + w * 0.33, x + w * 0.67]) {
    const cy = y + h * 0.36; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, w * 0.09, 0, 7); ctx.stroke();
    for (let k = 0; k < 3; k++) { const a = rot + k * 2.094; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w * 0.08, cy + Math.sin(a) * w * 0.08); ctx.stroke(); }
  }
  rr(x + w * 0.25, y + h * 0.68, w * 0.5, h * 0.22, 4, 'rgba(0,0,0,.35)');
}

// =====================================================================
//  DRAW: PLAYFIELD
// =====================================================================
function drawPlayfield() {
  const g = G_;
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) : 0;
  ctx.save(); ctx.translate(PX + sx, sy);
  ctx.drawImage(tableLayer, 0, 0);
  ctx.scale(PS, PS);

  // top lane lights
  LANES_X.forEach((x, i) => {
    const lit = g.lanes[i], sk = g.skillT > 0 && g.skill === i && Math.sin(time * 14) > 0;
    if (lit || sk) ctx.drawImage(glow(sk ? C.pink : C.yel, 40), x - 24, 86, 48, 48);
    ctx.fillStyle = lit ? C.yel : sk ? C.pink : '#2A1D5C'; ctx.beginPath(); ctx.arc(x, 110, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = C.yel; ctx.lineWidth = 2; ctx.stroke();
    T('RAD!'[i], x, 116, 14, lit || sk ? '#12052B' : C.yel, FD, 'center');
  });
  // ramp mouth chevrons
  ramps.forEach((r, ri) => {
    for (let i = 0; i < 3; i++) {
      const on = (Math.floor(time * 6) % 3) === (2 - i), y = r.mouth.y + 70 - i * 28 + 2;
      ctx.fillStyle = on ? r.c : r.c + '30';
      ctx.beginPath(); ctx.moveTo(r.mouth.x, y - 16); ctx.lineTo(r.mouth.x + 18, y); ctx.lineTo(r.mouth.x - 18, y); ctx.fill();
    }
    if (ri === 1) for (let i = 0; i < 3; i++) { ctx.fillStyle = i < g.lock ? C.pink : '#2A1D5C'; ctx.beginPath(); ctx.arc(r.mouth.x - 22 + i * 22, r.mouth.y + 104, 7, 0, 7); ctx.fill(); ctx.strokeStyle = C.pink; ctx.lineWidth = 1.5; ctx.stroke(); }
  });
  T('LOCK', ramps[1].mouth.x, ramps[1].mouth.y + 126, 10, C.pink, FD, 'center');
  // TV screen
  {
    const sx0 = TV.x + 14, sy0 = TV.y + 12, sw = TV.w - 28, sh = TV.h - 30;
    rr(sx0, sy0, sw, sh, 12, '#063B4A');
    ctx.save(); ctx.beginPath(); ctx.roundRect(sx0, sy0, sw, sh, 12); ctx.clip();
    if (TV.flash > 0) { for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.6})`; ctx.fillRect(sx0 + Math.random() * sw, sy0 + Math.random() * sh, rnd(4, 18), 2); } }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let y = sy0; y < sy0 + sh; y += 3) ctx.fillRect(sx0, y, sw, 1);
    if (g.mb) { T('JACKPOT', 320, TV.y + 36, 20, Math.sin(time * 10) > 0 ? C.yel : C.white, FM, 'center'); T(fmt(g.jackpot), 320, TV.y + 62, g.jackpot >= 1e7 ? 18 : 22, C.white, FM, 'center'); }
    else if (g.mission) { T(g.mission.name.split(' ')[0], 320, TV.y + 36, 17, C.yel, FM, 'center'); T(g.mission.count + '/' + g.mission.need + '  ' + Math.ceil(g.mission.t) + 's', 320, TV.y + 62, 22, C.white, FM, 'center'); }
    else { T('FOOD CT', 320, TV.y + 36, 19, C.teal, FM, 'center'); T('50,000', 320, TV.y + 62, 24, C.white, FM, 'center'); }
    ctx.restore();
  }
  // floppies
  flops.forEach(f => { if (!f.down) drawFloppy(f.x, f.y, f.w, f.h, f.c, 1); else { ctx.globalAlpha = 0.5; rr(f.x, f.y, f.w, f.h, 5, null, '#7B6FB0', 2); ctx.globalAlpha = 1; } });
  // ball save light
  if (g.saveT > 0 && Math.sin(time * 10) > -0.3) { ctx.drawImage(glow(C.teal, 30), 302, 590, 36, 36); }
  // bumpers
  ctx.restore(); ctx.save(); ctx.translate(PX + sx, sy);
  bumpers.forEach((bp, i) => {
    const spr = bumperSpr[i + '_' + (bp.flash > 0.15 ? 1 : 0)], s = 1 + bp.flash * 0.12;
    const wsz = spr.width * s; ctx.drawImage(spr, bp.x * PS - wsz / 2, bp.y * PS - wsz / 2, wsz, wsz);
  });
  ctx.scale(PS, PS);
  // plunger
  {
    const comp = g.charge * 40;
    ctx.fillStyle = C.pink; rr(568, 704 + comp * 0.35, 24, 50, 6, g.charging ? C.yel : C.pink);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(570, 712 + i * 8 + comp * 0.35); ctx.lineTo(590, 712 + i * 8 + comp * 0.35); ctx.stroke(); }
  }
  // balls (on playfield)
  ctx.globalCompositeOperation = 'lighter';
  for (const b of balls) if (!b.ramp) drawTrail(b);
  ctx.globalCompositeOperation = 'source-over';
  for (const b of balls) if (!b.ramp) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(b.x + 4, b.y + 6, BR, BR * 0.8, 0, 0, 7); ctx.fill(); ctx.drawImage(ballSpr, b.x - 16, b.y - 16, 32, 32); }
  // flippers
  flips.forEach((f, i) => {
    const tx = f.px + Math.cos(f.a) * f.len, ty = f.py + Math.sin(f.a) * f.len;
    const col = g.odT > 0 ? (Math.sin(time * 20) > 0 ? C.orange : C.yel) : (i ? C.pink : C.teal);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = f.hold ? 24 : 12;
    const nx = -(ty - f.py) / f.len, ny = (tx - f.px) / f.len;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(f.px, f.py, f.r0, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
    ctx.arc(tx, ty, f.r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
    ctx.closePath();
    // choose the arc direction per side
    ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.px, f.py, 4, 0, 7); ctx.fill();
  });
  ctx.restore();

  // ramps layer + balls riding ramps
  ctx.save(); ctx.translate(PX + sx, sy); ctx.drawImage(rampLayer, 0, 0); ctx.scale(PS, PS);
  ctx.globalCompositeOperation = 'lighter';
  for (const b of balls) if (b.ramp) drawTrail(b);
  ctx.globalCompositeOperation = 'source-over';
  for (const b of balls) if (b.ramp) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(b.x + 8, b.y + 14, BR, BR * 0.8, 0, 0, 7); ctx.fill(); ctx.drawImage(ballSpr, b.x - 19, b.y - 19, 38, 38); }

  // particles
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) if (!p.k) { const a = p.life / p.max; ctx.globalAlpha = a; ctx.strokeStyle = p.c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of parts) if (p.k) {
    ctx.globalAlpha = Math.min(1, p.life); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.strokeStyle = p.c; ctx.lineWidth = 3;
    if (p.k === 1) { ctx.beginPath(); ctx.moveTo(0, -p.sz); ctx.lineTo(p.sz, p.sz * 0.7); ctx.lineTo(-p.sz, p.sz * 0.7); ctx.fill(); }
    else if (p.k === 2) ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz);
    else { ctx.beginPath(); ctx.moveTo(-p.sz, 0); ctx.quadraticCurveTo(-p.sz / 2, -p.sz, 0, 0); ctx.quadraticCurveTo(p.sz / 2, p.sz, p.sz, 0); ctx.stroke(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // score popups
  for (const p of pops) { const a = 1 - p.t / 1.1; ctx.globalAlpha = a; T(p.text, p.x, p.y, p.big ? 26 : 15, p.c, FD, 'center'); }
  ctx.globalAlpha = 1;
  ctx.restore();

  // announcements (screen space over playfield)
  annc.forEach((a, i) => {
    const k = a.t / a.dur, inn = Math.min(1, a.t * 6), out = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    const s = (0.6 + 0.4 * (1 - Math.pow(1 - inn, 3))) * (1 + Math.sin(a.t * 12) * 0.015);
    const y = 470 + (i - annc.length + 1) * 230;
    const older = i < annc.length - 1 ? 0.75 : 1;
    ctx.save(); ctx.translate(960, y); ctx.rotate(-0.06); ctx.scale(s * older, s * older);
    ctx.font = `${a.size}px ${FD}`; const w = Math.min(900, ctx.measureText(a.text).width);
    const fit = Math.min(1, 900 / Math.max(1, ctx.measureText(a.text).width));
    ctx.scale(fit, fit);
    ctx.globalAlpha = 0.6 * out; rr(-w / fit / 2 - 30, -a.size * 0.62, w / fit + 60, a.size * 1.24 + (a.sub ? 46 : 0), 18, 'rgba(11,3,32,.75)');
    rgbText(a.text, 0, 0, a.size, a.c, out);
    if (a.sub) { ctx.globalAlpha = out; T(a.sub, 0, a.size * 0.62 + 28, 30, C.white, FD, 'center', 'middle'); }
    ctx.restore(); ctx.globalAlpha = 1;
  });
  // overdrive frame
  if (g.odT > 0) { const p = 0.5 + Math.sin(time * 8) * 0.3; ctx.strokeStyle = `rgba(255,46,151,${p})`; ctx.lineWidth = 10; ctx.strokeRect(PX + 5, 5, 950, 1070); }
  if (g.tilted) { ctx.fillStyle = 'rgba(80,0,0,.25)'; ctx.fillRect(PX, 0, 960, 1080); }
}
function drawTrail(b) {
  const t = b.trail, n = t.length / 2, od = G_.odT > 0;
  for (let i = 0; i < n - 1; i++) {
    const a = (i + 1) / n; ctx.globalAlpha = a * (od ? 0.8 : 0.45);
    const r = BR * (0.5 + a * 0.9) * (od ? 1.6 : 1);
    ctx.drawImage(glow(od ? C.orange : (G_.mb ? C.pink : C.teal), 32), t[i * 2] - r, t[i * 2 + 1] - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

// =====================================================================
//  DRAW: SIDE PANELS (HUD)
// =====================================================================
const TRACKS = ['NEON FOOD COURT', 'DIAL TONE DREAMS', 'MALL RAT ANTHEM', 'SLAP BRACELET', 'FROSTED TIPS', 'DISPOSABLE CAMERA'];
function drawHUD() {
  const g = G_;
  ctx.drawImage(panelL, 0, 0); ctx.drawImage(panelR, 1440, 0);
  // ---- left
  let x = 36, y = 58;
  T('▶ PLAY   SP ' + timecode(g.playT), x, y, 34, 'rgba(255,255,255,.85)', FM);
  y = 122; T('PLAYER 1 · SCORE', x, y, 19, C.teal, FD);
  ctx.save(); ctx.shadowColor = C.yel; ctx.shadowBlur = 22; const sc = fmt(g.score); ctx.font = `64px ${FN}`; const sw = ctx.measureText(sc).width;
  T(sc, x, y + 72, sw > 410 ? 64 * 410 / sw : 64, C.yel, FN); ctx.restore();
  T('HI ' + fmt(Math.max(hi, g.score)), x, y + 108, 20, C.lav, FD);
  y = 266;
  rr(x, y, 196, 96, 14, C.pink); T('MULTIPLIER', x + 16, y + 28, 15, '#fff', FD); T('x' + g.mult, x + 16, y + 82, 46, '#fff', FD);
  rr(x + 212, y, 196, 96, 14, C.deep, C.teal, 3); T('BALL', x + 228, y + 28, 15, C.teal, FD); T(String(g.ball), x + 228, y + 82, 46, '#fff', FD); T('/3', x + 262, y + 82, 24, C.dim, FD);
  y = 400;
  const comboK = g.comboShow > 0 ? g.comboShow / 4.5 : 0;
  T('COMBO', x, y, 19, '#fff', FD); T(g.combo > 1 && comboK > 0 ? 'x' + g.combo + ' CHAIN' : 'RAMP TO CHAIN', x + 408, y, 19, C.teal, FD, 'right');
  rr(x, y + 14, 408, 20, 10, C.mid); if (comboK > 0) { const gr = ctx.createLinearGradient(x, 0, x + 408, 0); gr.addColorStop(0, C.teal); gr.addColorStop(1, C.yel); rr(x, y + 14, 408 * comboK, 20, 10, gr); }
  y = 480;
  T('OVERDRIVE', x, y, 19, C.pink, FD);
  if (g.odT > 0) T(Math.ceil(g.odT) + 's LEFT', x + 408, y, 19, C.yel, FD, 'right'); else T(Math.floor(g.od / 20) + ' / 5', x + 408, y, 19, '#fff', FD, 'right');
  for (let i = 0; i < 5; i++) {
    const fill = g.odT > 0 ? 1 : clamp((g.od - i * 20) / 20, 0, 1);
    ctx.save(); ctx.translate(x + i * 84 + 4, y + 14); ctx.transform(1, 0, -0.32, 1, 0, 0);
    ctx.fillStyle = C.mid; ctx.fillRect(4, 0, 72, 32);
    if (fill > 0) { ctx.shadowColor = C.pink; ctx.shadowBlur = 14; ctx.fillStyle = g.odT > 0 && Math.sin(time * 16 + i) > 0 ? C.yel : C.pink; ctx.fillRect(4, 0, 72 * fill, 32); }
    ctx.restore();
  }
  T(g.odT > 0 ? 'TURBO FLIPPERS · BALL ON FIRE · 2X' : 'Fill it: flippers go turbo, ball catches fire', x, y + 74, 18, C.lav, 'sans-serif');
  y = 600;
  if (g.mission) {
    rr(x, y, 408, 196, 18, C.yel); ctx.fillStyle = C.pink; ctx.globalAlpha = 1;
    T('MISSION · ' + Math.ceil(g.mission.t) + 's', x + 20, y + 34, 17, '#12052B', FD);
    T(g.mission.name, x + 20, y + 78, g.mission.name.length > 13 ? 28 : 32, '#12052B', FD);
    T(g.mission.desc, x + 20, y + 112, 20, '#12052B', 'sans-serif');
    rr(x + 20, y + 136, 368, 24, 12, 'rgba(18,5,43,.2)'); rr(x + 20, y + 136, 368 * g.mission.count / g.mission.need, 24, 12, C.pink);
    T(g.mission.count + ' / ' + g.mission.need, x + 388, y + 184, 20, '#12052B', FD, 'right');
  } else {
    rr(x, y, 408, 196, 18, 'rgba(255,225,77,.08)', 'rgba(255,225,77,.5)', 3);
    T('NEXT MISSION', x + 20, y + 34, 17, C.yel, FD);
    T(MISSIONS[g.missionIdx % 3].name, x + 20, y + 78, 28, '#fff', FD);
    T('Drop all 3 floppies to start', x + 20, y + 114, 20, C.lav, 'sans-serif');
    flops.forEach((f, i) => drawFloppy(x + 20 + i * 56, y + 136, 42, 34, f.c, f.down ? 1 : 0.3));
  }
  y = 850;
  T('CONTROLS', x, y, 15, C.dim, FD);
  let cx = x; cx += chip('L1', cx, y + 14, C.teal, '#12052B') + 8; T('LEFT', cx, y + 39, 16, '#E9DDFF', FD); cx += 60;
  cx += chip('R2', cx, y + 14, C.pink, '#fff') + 8; T('RIGHT', cx, y + 39, 16, '#E9DDFF', FD);
  cx = x; chip('A', cx, y + 60, C.yel, '#12052B', true); T('HOLD + RELEASE TO LAUNCH', cx + 50, y + 85, 16, '#E9DDFF', FD);
  T('D-PAD NUDGE · START PAUSE', x, y + 136, 16, C.dim, FD);

  // ---- right
  x = 1476; y = 70;
  T('SPELL IT', x, y, 19, C.teal, FD);
  for (let i = 0; i < 7; i++) {
    const on = i < g.letters, tx = x + i * 59;
    if (on) { ctx.save(); ctx.shadowColor = C.pink; ctx.shadowBlur = 16; rr(tx, y + 16, 50, 58, 9, C.pink); ctx.restore(); }
    else rr(tx, y + 16, 50, 58, 9, C.mid);
    T(WORD[i], tx + 25, y + 58, 27, on ? '#fff' : C.dim, FD, 'center');
  }
  T('Shoot ramps to light letters', x, y + 104, 17, C.lav, 'sans-serif');
  y = 222; T('MODES', x, y, 19, C.teal, FD);
  const rows = [
    ['Dial-Up Multiball', g.mb ? 'LIVE!' : g.lock + '/3 LOCKED', g.mb ? C.teal : C.pink, g.mb],
    ['Overdrive', g.odT > 0 ? 'LIVE!' : g.od + '%', g.odT > 0 ? C.teal : C.yel, g.odT > 0],
    ['Jackpot', fmt(g.jackpot), C.yel, g.mb],
    [g.mission ? g.mission.name : 'Mission', g.mission ? 'LIVE!' : 'FLOPPIES', g.mission ? C.teal : C.dim, !!g.mission]];
  rows.forEach((r, i) => {
    const ry = y + 18 + i * 60;
    if (r[3]) rr(x, ry, 408, 50, 12, 'rgba(0,229,212,.15)', C.teal, 3); else rr(x, ry, 408, 50, 12, C.deep);
    T(r[0], x + 18, ry + 33, 20, '#fff', 'sans-serif'); T(r[1], x + 390, ry + 33, 18, r[2], FD, 'right');
  });
  // pixel pal
  y = 500; rr(x, y, 408, 150, 20, C.deep);
  {
    const ex = x + 24, ey = y + 18, bob = Math.sin(time * (G_.mood > 0.6 ? 8 : 3)) * (G_.mood > 0.6 ? 4 : 1.5);
    const eg = ctx.createLinearGradient(ex, ey, ex + 100, ey + 114); eg.addColorStop(0, '#FF8FD0'); eg.addColorStop(1, C.purp);
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(ex + 52, ey + 58 + bob, 50, 58, 0, 0, 7); ctx.fill();
    rr(ex + 18, ey + 30 + bob, 68, 56, 8, '#B8D88A');
    const md = G_.mood, face = md > 0.66 ? ['0100010', '0000000', '1000001', '0111110'] : md > 0.33 ? ['0100010', '0000000', '0000000', '0111110'] : ['0100010', '0000000', '0111110', '1000001'];
    face.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === '1') { ctx.fillStyle = '#12052B'; ctx.fillRect(ex + 24 + rx * 8, ey + 40 + bob + ry * 9, 8, 8); } }));
    const name = md > 0.66 ? 'is STOKED!' : md > 0.33 ? 'is chillin.' : 'is CRANKY.';
    T('PIXEL PAL', x + 148, y + 56, 24, '#fff', FD);
    T(name, x + 148, y + 90, 22, md > 0.66 ? C.yel : md > 0.33 ? C.lav : C.pink, 'sans-serif');
    T(md > 0.33 ? 'Keep the combos coming.' : 'Hit something. Anything.', x + 148, y + 120, 17, C.lav, 'sans-serif');
  }
  // cassette / now playing
  y = 690; ctx.setLineDash([10, 8]); rr(x, y, 408, 120, 18, null, 'rgba(255,225,77,.6)', 3); ctx.setLineDash([]);
  drawCassette(x + 20, y + 22, 120, C.pink, time * (G_.odT > 0 ? 9 : 4));
  T('SIDE A · TRK 0' + (g.track + 1), x + 160, y + 52, 26, C.yel, FM);
  T(TRACKS[g.track], x + 160, y + 86, 26, '#fff', FM);
  // big multiball counter
  y = 850; T('BALLS IN PLAY', x, y, 15, C.dim, FD);
  const nb = balls.length;
  for (let i = 0; i < 6; i++) { if (i < nb) ctx.drawImage(ballSpr, x + i * 52 - 2, y + 14, 44, 44); else { ctx.strokeStyle = C.mid; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + i * 52 + 20, y + 36, 16, 0, 7); ctx.stroke(); } }
  if (g.saveT > 0) T('BALL SAVE ' + Math.ceil(g.saveT) + 's', x, y + 104, 20, C.teal, FD);
  else if (balls.some(b => !b.ramp && b.x > 562 && b.y > 640)) T(Math.sin(time * 8) > 0 ? 'HOLD A TO LAUNCH' : '', x, y + 104, 22, C.yel, FD);
}

// =====================================================================
//  TITLE SCREEN
// =====================================================================
const shapes = [];
for (let i = 0; i < 26; i++) shapes.push({ k: i % 6, x: rnd(0, W), y: rnd(0, H), r: rnd(0, 6), vr: rnd(-0.4, 0.4), vx: rnd(-14, 14), vy: rnd(-10, 10), s: rnd(26, 70), c: [C.pink, C.teal, C.yel, C.purp][i % 4], blur: i % 3 === 0 });
function updTitle(dt) { for (const s of shapes) { s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; if (s.x < -100) s.x = W + 80; if (s.x > W + 100) s.x = -80; if (s.y < -100) s.y = H + 80; if (s.y > H + 100) s.y = -80; } updFx(dt); }
function drawShape(s, a) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.globalAlpha = a; ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const z = s.s;
  if (s.k === 0) { ctx.beginPath(); ctx.moveTo(0, -z); ctx.lineTo(z * 0.9, z * 0.6); ctx.lineTo(-z * 0.9, z * 0.6); ctx.closePath(); ctx.stroke(); }
  else if (s.k === 1) { ctx.beginPath(); ctx.moveTo(-z * 1.5, 0); for (let i = 1; i <= 4; i++) ctx.quadraticCurveTo(-z * 1.5 + (i - 0.5) * z * 0.75, i % 2 ? -z * 0.5 : z * 0.5, -z * 1.5 + i * z * 0.75, 0); ctx.stroke(); }
  else if (s.k === 2) { ctx.beginPath(); ctx.arc(0, 0, z * 0.6, 0, 7); ctx.stroke(); }
  else if (s.k === 3) { ctx.fillRect(-z / 2, -z / 2, z, z); }
  else if (s.k === 4) { ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(-z * 1.2 + i * z * 0.48, i % 2 ? -z * 0.35 : z * 0.35); ctx.stroke(); }
  else { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(i * 16 - 24, j * 16 - 24, 3.5, 0, 7); ctx.fill(); } }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawTitle() {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // perspective neon floor
  ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = C.purp; ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(960 + i * 40, 760); ctx.lineTo(960 + i * 260, H); ctx.stroke(); }
  const off = (time * 60) % 40;
  for (let i = 0; i < 10; i++) { const t = (i * 40 + off) / 400, y = 760 + t * t * 320; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  for (const s of shapes) drawShape(s, s.blur ? 0.35 : 0.85);
  // chrome ball hero
  const by = 470 + Math.sin(time * 1.9) * 22;
  ctx.drawImage(glow(C.teal, 128), 1240, by - 300, 600, 600);
  ctx.save(); const gr = ctx.createRadialGradient(1470, by - 80, 10, 1540, by, 220);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.15, '#D8E6FF'); gr.addColorStop(0.45, '#7E8AB8'); gr.addColorStop(0.8, '#2A2350'); gr.addColorStop(1, '#0B0620');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(1540, by, 220, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.6; ctx.fillStyle = C.pink; ctx.beginPath(); ctx.ellipse(1540, by + 70, 160, 26, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.restore();
  ctx.save(); ctx.translate(1290, by + 170); ctx.rotate(-0.25 + Math.sin(time) * 0.05); drawCassette(-110, -70, 220, C.yel, time * 3); ctx.restore();
  ctx.save(); ctx.translate(1760, by - 210); ctx.rotate(0.28 + Math.sin(time * 1.3) * 0.06); drawFloppy(-80, -80, 160, 160, C.teal, 1); ctx.restore();
  // logo
  ctx.save(); ctx.translate(120, 196); ctx.rotate(-0.08); T('TOTALLY', 6, 6, 64, C.pink, FD); T('TOTALLY', 0, 0, 64, C.yel, FD); ctx.restore();
  ctx.save(); ctx.font = `250px ${FD}`; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.pink; ctx.fillText("90'S", 130, 458);
  const lg = ctx.createLinearGradient(0, 260, 0, 450); lg.addColorStop(0, '#FFFFFF'); lg.addColorStop(0.45, '#A8F5FF'); lg.addColorStop(0.5, '#3A1C8A'); lg.addColorStop(0.6, '#FF8FD0'); lg.addColorStop(1, '#FFFFFF');
  ctx.shadowColor = C.teal; ctx.shadowBlur = 30; ctx.fillStyle = lg; ctx.fillText("90'S", 120, 448); ctx.shadowBlur = 0;
  // shine sweep
  const sh = ((time * 0.5) % 1.6) * 900 - 100; ctx.globalCompositeOperation = 'source-atop';
  ctx.restore();
  ctx.save(); ctx.shadowColor = C.teal; ctx.shadowBlur = 24; T('PINBALL', 128, 556, 92, C.teal, FD); ctx.restore();
  ctx.save(); ctx.translate(760, 520); ctx.rotate(-0.07); rr(0, 0, 250, 50, 4, C.pink); rr(-6, -6, 250, 50, 4, C.yel); T('ON STEROIDS', 119, 30, 26, '#12052B', FD, 'center'); ctx.restore();
  // menu
  if (Math.floor(time * 2.2) % 2 === 0) { ctx.save(); ctx.shadowColor = C.yel; ctx.shadowBlur = 20; T('PRESS  A  TO START', 128, 680, 46, C.yel, FD); ctx.restore(); }
  T('TABLE 1 · MALL MADNESS', 128, 740, 28, '#E9DDFF', FD);
  T('HIGH SCORE  ' + fmt(hi), 128, 790, 28, C.teal, FD);
  // OSD + control bar
  T('▶ PLAY', 50, 70, 46, '#fff', FM); T('SP ' + timecode(time + 19 * 60 + 96), W - 50, 70, 46, '#fff', FM, 'right');
  ctx.fillStyle = 'rgba(10,3,26,.88)'; ctx.fillRect(0, H - 96, W, 96); ctx.fillStyle = C.pink; ctx.fillRect(0, H - 96, W, 3);
  let x = 420; const y = H - 66;
  x += chip('L1', x, y, C.teal, '#12052B') + 12; T('LEFT FLIPPER', x, y + 25, 22, '#E9DDFF', FD); x += 230;
  x += chip('R2', x, y, C.pink, '#fff') + 12; T('RIGHT FLIPPER', x, y + 25, 22, '#E9DDFF', FD); x += 240;
  x += chip('A', x, y, C.yel, '#12052B', true) + 12; T('LAUNCH', x, y + 25, 22, '#E9DDFF', FD); x += 140;
  x += chip('D-PAD', x, y, C.mid, '#fff') + 12; T('NUDGE', x, y + 25, 22, '#E9DDFF', FD);
}

function drawOver() {
  drawPlayfield(); drawHUD();
  ctx.fillStyle = 'rgba(11,3,32,.72)'; ctx.fillRect(0, 0, W, H);
  rgbText('GAME OVER', 960, 380, 150, C.white, Math.min(1, overT * 3));
  T('FINAL SCORE', 960, 500, 34, C.teal, FD, 'center');
  ctx.save(); ctx.shadowColor = C.yel; ctx.shadowBlur = 26; T(fmt(G_.score), 960, 600, 96, C.yel, FN, 'center'); ctx.restore();
  if (G_.newHi && Math.sin(time * 8) > -0.2) T('★ NEW HIGH SCORE ★', 960, 680, 44, C.pink, FD, 'center');
  if (overT > 1.2 && Math.floor(time * 2) % 2 === 0) T('PRESS A', 960, 800, 40, '#fff', FD, 'center');
}
function drawPause() {
  ctx.fillStyle = 'rgba(11,3,32,.7)'; ctx.fillRect(0, 0, W, H);
  T('❚❚ PAUSE', 960, 440, 110, '#fff', FM, 'center');
  T('A  RESUME     ·     B  QUIT TO TITLE', 960, 540, 34, C.teal, FD, 'center');
}

// =====================================================================
//  MAIN LOOP
// =====================================================================
let last = performance.now(), band = 0;
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > 1 / 20) dt = 1 / 20;
  if (state === 'over') overT += dt;
  update(dt);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (state === 'title') drawTitle();
  else if (state === 'over') drawOver();
  else { ctx.fillStyle = C.dark; ctx.fillRect(PX, 0, 960, H); drawPlayfield(); drawHUD(); if (paused) drawPause(); }
  if (flashA > 0) { ctx.globalAlpha = flashA * 0.5; ctx.fillStyle = flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  // VHS overlay
  ctx.drawImage(scanLayer, 0, 0);
  band = (band + dt * 140) % (H + 200);
  ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(0, band - 100, W, 22);
  ctx.restore();
  requestAnimationFrame(frame);
}

window.__pauseGame = () => { if (state === 'play' && !paused) setPause(true); };
window.__t90 = { get state() { return state; }, get game() { return G_; }, balls, start: () => onInput('A', true), mb: () => startMB(), od: () => { G_.od = 99; addOD(5); }, mission: () => startMission() };
Promise.all([document.fonts.load(`20px ${FD}`), document.fonts.load(`20px ${FN}`), document.fonts.load(`20px ${FM}`)]).catch(() => { }).then(() => {
  buildLayers();
  if (DEMO) { state = 'play'; newGame(); }
  requestAnimationFrame(frame);
});
})();
