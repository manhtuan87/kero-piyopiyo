/* ケロちゃん ぴよぴよポン — screens, input, effects and the main loop. */
(function () {
  'use strict';
  var E = window.Engine, D = window.Draw, S = window.Sound, WORLDS = window.LEVELS;
  var W = E.W, H = E.H, P = E.P, R = E.R;
  var $ = function (id) { return document.getElementById(id); };

  var CHARA_POS = { x: 292, y: 598, k: 0.72 };   // the character sits at the bottom right...
  var HOLD = { x: 0, y: 22, r: 18 };              // ...hugging the next egg (in its own units)
  var GROUND = 612;                               // where loose eggs land and chicks run

  var TIPS = {
    aim: 'ゆびで ねらって はなすと とぶよ\nおなじ いろを 3つ くっつけよう！',
    wall: 'かべに あてると はねかえるよ',
    drop: 'うえの たまごが われると\nぶらさがってる たまごも おちるよ',
    swap: 'だっこしてる たまごを\nタッチすると いれかえられるよ',
    down: 'たまごは だんだん おりてくるよ\nせんまで きたら たいへん！',
    bomb: 'ばくだんたまごは\nまわりを まとめて ドカン！',
    rainbow: 'にじいろたまごは\nくっついた いろに へんしん！',
    bolt: 'かみなりたまごは\nよこ いちれつを ピカッ！',
    stone: 'いしの たまごは われないよ\nうえを けして おとそう！'
  };

  // Endless mode: new rows keep coming; more colours when it is faster.
  var ENDLESS = {
    slow: { endless: true, palette: [0, 1, 2, 3], sp: 'brl', every: 9, start: 6 },
    normal: { endless: true, palette: [0, 1, 2, 3, 4], sp: 'brl', every: 9, start: 6 },
    fast: { endless: true, palette: [0, 1, 2, 3, 4], sp: 'brl', every: 10, start: 7 }
  };
  var SPEED_NAMES = { slow: 'ゆっくり', normal: 'ふつう', fast: 'はやい' };

  // ---------------------------------------------------------------- save data

  var SAVE_KEY = 'kero-piyopiyo-v1';
  var save = (function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { /* no storage */ }
    if (!s || !s.stars) s = { stars: {}, sfx: true, music: true, all: false };
    s.seen = s.seen || {};
    s.spent = s.spent || 0;            // ★ spent in the shop
    s.owned = s.owned || ['frog'];     // characters bought
    s.chara = s.chara || 'frog';       // character in use
    s.speed = E.SPEEDS[s.speed] ? s.speed : 'slow';
    s.best = s.best || {};             // endless: most chicks, per speed
    return s;
  }());
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  function skey(wi, si) { return wi + '-' + si; }
  function cleared(wi, si) { return save.stars[skey(wi, si)] != null; }
  function starsOf(wi, si) { return save.stars[skey(wi, si)] || 0; }
  function worldOpen(wi) { return save.all || wi === 0 || cleared(wi - 1, WORLDS[wi - 1].stages.length - 1); }
  function stageOpen(wi, si) { return save.all || (worldOpen(wi) && (si === 0 || cleared(wi, si - 1))); }
  function worldStars(wi) {
    var n = 0;
    for (var i = 0; i < WORLDS[wi].stages.length; i++) n += starsOf(wi, i);
    return n;
  }

  // Characters. Stars earned in stages are the shop money;
  // buying spends from the wallet but never changes a stage's star record.
  var CHARAS = [
    { id: 'frog', name: 'ケロちゃん', price: 0 },
    { id: 'rabbit', name: 'ミミちゃん', price: 10 },
    { id: 'cat', name: 'ニャーちゃん', price: 20 },
    { id: 'dog', name: 'ワンちゃん', price: 30 }
  ];
  function owns(id) { return save.owned.indexOf(id) >= 0; }
  function totalStars() { var n = 0; for (var k in save.stars) n += save.stars[k] || 0; return n; }
  function wallet() { return Math.max(0, totalStars() - save.spent); }

  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- view

  var canvas = $('game'), ctx = canvas.getContext('2d'), stageEl = $('stage');
  var view = { cw: 1, ch: 1, dpr: 1, s: 1, ox: 0, oy: 0 };
  var bg = { canvas: null, theme: -1 };

  function resize() {
    var cw = window.innerWidth, ch = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    var s = Math.min(cw / W, ch / H);
    view = { cw: cw, ch: ch, dpr: dpr, s: s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
    stageEl.style.transform = 'translate(' + view.ox + 'px,' + view.oy + 'px) scale(' + s + ')';
    bg.canvas = null;
  }

  function worldTransform(c) { c.setTransform(view.dpr * view.s, 0, 0, view.dpr * view.s, view.dpr * view.ox, view.dpr * view.oy); }
  function visible() {
    var x0 = -view.ox / view.s, y0 = -view.oy / view.s;
    return { x0: x0, y0: y0, x1: x0 + view.cw / view.s, y1: y0 + view.ch / view.s };
  }

  function drawBackground(theme) {
    if (!(view.s > 0)) return;   // (a window with no size yet)
    if (!bg.canvas || bg.theme !== theme) {
      bg.canvas = document.createElement('canvas');
      bg.canvas.width = canvas.width; bg.canvas.height = canvas.height;
      var b = bg.canvas.getContext('2d'), v = visible();
      worldTransform(b);
      D.background(b, theme, v.x0, v.y0, v.x1, v.y1);
      bg.theme = theme;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg.canvas, 0, 0);
  }

  function toWorld(e) { return { x: (e.clientX - view.ox) / view.s, y: (e.clientY - view.oy) / view.s }; }

  // Eggs are drawn from pictures made once per screen size (fast on phones);
  // the animated special eggs are drawn fresh every frame.
  var sprites = { key: '', list: [] };
  function eggSprite(kind) {
    var sc = view.s * view.dpr, key = sc.toFixed(4);
    if (sprites.key !== key) { sprites.key = key; sprites.list = []; }
    var sp = sprites.list[kind];
    if (!sp) {
      var half = R + 4, size = Math.ceil(2 * half * sc), cv = document.createElement('canvas');
      cv.width = cv.height = size;
      var g = cv.getContext('2d');
      g.setTransform(size / (2 * half), 0, 0, size / (2 * half), size / 2, size / 2);
      D.egg(g, kind, 0, 0, R, 0, 0);
      sp = sprites.list[kind] = { cv: cv, half: half };
    }
    return sp;
  }
  function drawEgg(c, kind, x, y, rot, scale, t) {
    scale = scale || 1;
    if (kind > E.STONE) { D.egg(c, kind, x, y, R * scale, t || 0, rot); return; }
    var sp = eggSprite(kind), h = sp.half * scale;
    if (rot) { c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(sp.cv, -h, -h, 2 * h, 2 * h); c.restore(); }
    else c.drawImage(sp.cv, x - h, y - h, 2 * h, 2 * h);
  }

  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- particles

  function burst(list, x, y, kind, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      list.push({ kind: kind, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5 + Math.random() * 0.3, max: 0.8, size: 3 + Math.random() * 4, color: color, rot: Math.random() * 6 });
    }
  }
  function ring(list, x, y, color) { list.push({ kind: 'ring', x: x, y: y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: 10, color: color }); }
  function confetti(list, n) {
    for (var i = 0; i < n; i++) {
      list.push({ kind: 'confetti', x: Math.random() * W, y: -20 - Math.random() * 180, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 60, life: 2.8, max: 2.8, size: 4 + Math.random() * 3, rot: Math.random() * 6, color: ['#ff7fb5', '#ffd93d', '#7fd3ff', '#8ff08f', '#c79cff'][i % 5] });
    }
  }

  function updateFx(list, dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'crumb' || p.kind === 'drop' || p.kind === 'confetti' || p.kind === 'shell') p.vy += (p.kind === 'shell' ? 900 : 500) * dt;
      if (p.kind === 'heart') p.vx = Math.sin(p.life * 6) * 25;
      if (p.kind === 'confetti') { p.vx *= 0.99; p.rot += dt * 8; }
      if (p.kind === 'shell') p.rot += p.vr * dt;
    }
  }

  function drawFx(c, list, t) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i], a = Math.max(0, Math.min(1, p.life / (p.max * 0.6)));
      c.globalAlpha = a;
      switch (p.kind) {
        case 'spark': D.sparkle(c, p.x, p.y, p.size * 1.6, p.color); break;
        case 'dot': case 'drop': D.circle(c, p.x, p.y, p.size * 0.8); D.paint(c, p.color); break;
        case 'crumb': D.circle(c, p.x, p.y, p.size); D.paint(c, p.color, D.INK, 1.5); break;
        case 'heart': D.heart(c, p.x, p.y, p.size); break;
        case 'shell': D.eggHalf(c, p.k, p.x, p.y, R, p.rot, false, t); break;
        case 'ring':
          var k = 1 - p.life / p.max;
          D.circle(c, p.x, p.y, p.size + k * 40); D.paint(c, null, p.color, 5 * (1 - k)); break;
        case 'confetti':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color;
          c.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8); c.restore(); break;
      }
    }
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- scene (a stage or an endless game being played)

  function noop() {}
  var CRACK = 0.12;          // seconds an egg shows cracks before the chick comes out
  var PRAISE = [[15, 'すごすぎ！', '#ff6fa8'], [10, 'すごい！', '#ffb13d'], [6, 'いいね！', '#7fd3ff']];

  function Scene(level, opts) {
    opts = opts || {};
    this.level = level;
    this.world = new E.World(level, { speed: opts.speed || 'normal' });
    this.onEvent = opts.onEvent || noop;
    this.fx = []; this.hatch = []; this.chicks = []; this.falls = []; this.words = []; this.booms = []; this.bolts = [];
    this.bumps = {};
    this.acc = 0; this.t = 0; this.endT = 0;
    this.crit = { mode: 'idle', mt: 0, until: 0, blinkT: 2, blink: false, worry: false, open: 0, say: 0 };
    this.aim = null;             // { a, tr } while a finger aims
    this.lastA = Math.PI / 2;
    this.pending = null;         // an angle to shoot as soon as the flying egg lands
    this.kick = 0; this.swapT = 1; this.shake = 0;
    this.lastNext = this.world.next;
    this.chickN = 0;             // chicks shown so far (the counter follows the animation)
    this.soundT = 0; this.beepN = -1;
  }

  Scene.prototype.update = function (dt) {
    var w = this.world, steps = 0;
    this.t += dt;
    this.acc += dt;
    while (this.acc >= E.DT && steps < 12) {
      w.step(); this.acc -= E.DT; steps++;
      if (this.pending != null && !w.shot && w.state === 'play') { var a = this.pending; this.pending = null; w.fire(a); }
      if (w.events.length) this.handle();
    }
    if (steps === 12) this.acc = 0;
    if (w.state !== 'play') { this.endT += dt; this.aim = null; }
    if (this.aim) this.aim.tr = w.trace(this.aim.a);   // the eggs move: keep the guide true
    if (w.next !== this.lastNext) {
      this.lastNext = w.next;
      if (w.next > E.STONE) { S.play('special'); burst(this.fx, CHARA_POS.x, CHARA_POS.y + 14, 'spark', 8, '#fff27a'); }
    }
    this.kick = Math.max(0, this.kick - dt * 3);
    this.swapT = Math.min(1, this.swapT + dt / 0.22);
    this.shake = Math.max(0, this.shake - dt);
    this.updateCrit(dt);
    this.updateHatch(dt);
    this.updateFalls(dt);
    this.updateChicks(dt);
    updateFx(this.fx, dt);
    this.booms = this.booms.filter(function (b) { b.t += dt / 0.45; return b.t < 1; });
    this.bolts = this.bolts.filter(function (b) { b.t += dt / 0.4; return b.t < 1; });
    this.words = this.words.filter(function (wd) { wd.t += dt / 1.3; return wd.t < 1; });
    // alarm: a beep every half second while the eggs sit on the line
    if (w.alarm >= 0 && w.state === 'play') {
      var n = Math.floor((E.P.alarm - w.alarm) * 2);
      if (n !== this.beepN) { this.beepN = n; S.play('alarm'); if (n % 2 === 0) vibrate(30); }
    } else this.beepN = -1;
  };

  Scene.prototype.handle = function () {
    var w = this.world, evs = w.events;
    w.events = [];
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      switch (e.type) {
        case 'fire': S.play('shoot'); this.kick = 1; this.crit.say = 0.3; break;
        case 'bounce': S.play('bounce'); burst(this.fx, e.x, e.y, 'spark', 3, '#ffffff'); break;
        case 'swap': S.play('swap'); this.swapT = 0; break;
        case 'stick':
          S.play('stick'); this.bumps[e.r + ',' + e.c] = this.t;
          if (e.rainbow) this.rainbowFx(e);
          break;
        case 'match':
          if (e.rainbow) this.rainbowFx(e);
          this.hatchAll(e, 0.055);
          break;
        case 'bomb':
          S.play('bomb'); this.booms.push({ x: e.x, y: e.y, t: 0 }); this.shake = 0.35; vibrate(40);
          this.hatchAll(e, 0.05);
          break;
        case 'bolt':
          S.play('bolt'); this.shake = 0.2; vibrate(25);
          for (var b = 0; b < e.ys.length; b++) this.bolts.push({ y: e.ys[b], t: 0, seed: Math.floor(Math.random() * 5) });
          this.hatchAll(e, 0.035);
          break;
        case 'win':
          var self = this;
          e.stones.forEach(function (s, j) { self.hatch.push({ k: s.k, x: s.x, y: s.y, t: -0.3 - j * 0.06, n: 0 }); });
          this.crit.mode = 'happy'; this.crit.mt = 0; this.crit.until = 1e9; this.crit.worry = false;
          S.play('win'); vibrate(30);
          for (var h = 0; h < 6; h++) this.fx.push({ kind: 'heart', x: CHARA_POS.x + (Math.random() - 0.5) * 60, y: CHARA_POS.y - 40, vx: 0, vy: -60 - Math.random() * 50, life: 1.4, max: 1.4, size: 9 + Math.random() * 6 });
          break;
        case 'lose':
          this.crit.mode = 'sad'; this.crit.mt = 0; this.crit.worry = false;
          S.play('lose'); vibrate(80);
          break;
        case 'alarm': this.crit.worry = true; break;
        case 'safe': this.crit.worry = false; S.play('safe'); break;
      }
      this.onEvent(e);
    }
  };

  Scene.prototype.rainbowFx = function (e) {
    S.play('rainbow');
    ring(this.fx, e.x, e.y, '#ffffff');
    burst(this.fx, e.x, e.y, 'spark', 8, '#fff7b0');
  };

  // Eggs that hatch where they are, and loose eggs that fall and hatch on the ground.
  Scene.prototype.hatchAll = function (e, gap) {
    var self = this, n = 0;
    e.gone.forEach(function (g) { self.hatch.push({ k: g.k, x: g.x, y: g.y, t: -g.o * gap, n: n++ }); });
    e.drop.forEach(function (g, j) {
      self.falls.push({ k: g.k, x: g.x, y: g.y, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 70, rot: 0, vr: (Math.random() - 0.5) * 7, t: -0.1 - j * 0.012, ground: GROUND - 8 + Math.random() * 20, n: j });
    });
    if (e.drop.length) setTimeout(function () { S.play('drop'); }, 120);
    var total = e.gone.length + e.drop.length;
    for (var i = 0; i < PRAISE.length; i++) {
      if (total >= PRAISE[i][0]) {
        this.words.push({ text: L(PRAISE[i][1]), color: PRAISE[i][2], x: Math.max(90, Math.min(W - 90, e.x)), y: Math.max(150, Math.min(420, e.y + 30)), t: 0 });
        (function (lvl) { setTimeout(function () { S.play('praise', lvl * 3); }, 250); }(PRAISE.length - i));
        this.crit.mode = 'happy'; this.crit.mt = 0; this.crit.until = 1.1;
        break;
      }
    }
  };

  Scene.prototype.sound = function (name, arg) {
    // many eggs at once: keep the sounds from piling up
    if (this.t - this.soundT < 0.028) return;
    this.soundT = this.t;
    S.play(name, arg);
  };

  Scene.prototype.updateHatch = function (dt) {
    for (var i = this.hatch.length - 1; i >= 0; i--) {
      var h = this.hatch[i], was = h.t;
      h.t += dt;
      if (was < 0 && h.t >= 0) this.sound(h.k <= 5 ? 'crack' : 'crumble', h.n);
      if (h.t >= CRACK) {
        if (h.k <= 5) {
          this.chicks.push({ x: h.x, y: h.y, vx: (Math.random() - 0.5) * 130, vy: -150 - Math.random() * 90, t: 0, fly: true, shell: h.k, seed: Math.random() * 6 });
          this.fx.push({ kind: 'shell', k: h.k, x: h.x, y: h.y, vx: (Math.random() - 0.5) * 60, vy: -30, rot: 0, vr: (Math.random() - 0.5) * 8, life: 0.7, max: 0.7 });
          this.chickN++;
        } else burst(this.fx, h.x, h.y, 'crumb', 7, '#bdb4aa');
        this.hatch.splice(i, 1);
      }
    }
  };

  Scene.prototype.updateFalls = function (dt) {
    for (var i = this.falls.length - 1; i >= 0; i--) {
      var f = this.falls[i];
      f.t += dt;
      if (f.t < 0) continue;
      f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.x < E.LEFT + R || f.x > E.RIGHT - R) { f.vx = -f.vx; f.x = Math.max(E.LEFT + R, Math.min(E.RIGHT - R, f.x)); }
      if (f.y >= f.ground) {
        if (f.k <= 5) {
          this.sound('land', f.n);
          var dir = f.x < W / 2 ? -1 : 1;
          this.chicks.push({ x: f.x, y: f.ground, gy: f.ground, vx: dir * (110 + Math.random() * 70), vy: 0, t: Math.random(), fly: false, shell: f.k, seed: 0 });
          this.fx.push({ kind: 'shell', k: f.k, x: f.x, y: f.ground, vx: -dir * 40, vy: -120, rot: 0, vr: (Math.random() - 0.5) * 8, life: 0.6, max: 0.6 });
          this.chickN++;
        } else { this.sound('crumble'); burst(this.fx, f.x, f.ground, 'crumb', 7, '#bdb4aa'); }
        this.falls.splice(i, 1);
      }
    }
  };

  Scene.prototype.updateChicks = function (dt) {
    for (var i = this.chicks.length - 1; i >= 0; i--) {
      var c = this.chicks[i];
      c.t += dt;
      if (c.fly) {
        c.vy -= 70 * dt;
        c.x += (c.vx + Math.sin(c.t * 5 + c.seed) * 35) * dt;
        c.y += c.vy * dt;
        if (c.y < -60 || c.x < -60 || c.x > W + 60) this.chicks.splice(i, 1);
      } else {
        c.x += c.vx * dt;
        c.y = c.gy - Math.abs(Math.sin(c.t * 12)) * 7;
        if (c.x < -40 || c.x > W + 40) this.chicks.splice(i, 1);
      }
    }
  };

  Scene.prototype.updateCrit = function (dt) {
    var f = this.crit;
    f.mt += dt;
    f.say = Math.max(0, f.say - dt);
    var want = f.say > 0 ? 0.55 : this.aim ? 0.12 : 0;
    f.open += (want - f.open) * Math.min(1, dt * 14);
    if (f.mode === 'happy' && f.mt > f.until) f.mode = 'idle';
    f.blinkT -= dt;
    if (f.blinkT < 0) { f.blink = true; if (f.blinkT < -0.13) { f.blink = false; f.blinkT = 2 + Math.random() * 3; } }
  };

  // --- aiming (the finger decides the direction; letting go shoots)

  Scene.prototype.setAim = function (p) {
    var a = E.aimAt(p.x, p.y);
    this.aim = { a: a, tr: this.world.trace(a) };
    this.lastA = a;
  };
  Scene.prototype.release = function (p) {
    var w = this.world;
    if (w.state !== 'play') { this.aim = null; return; }
    var a = E.aimAt(p.x, p.y);
    this.lastA = a;
    this.aim = null;
    if (w.shot) this.pending = a; else w.fire(a);
  };

  // --- drawing

  Scene.prototype.draw = function (c, hint) {
    var w = this.world, g = w.g, t = this.t, v = visible(), self = this;
    worldTransform(c);
    if (this.shake > 0) c.translate(Math.sin(t * 70) * this.shake * 12, 0);
    D.walls(c, E.LEFT, E.RIGHT, v.y0, P.dangerY, v.x0, v.x1);
    var near = Math.max(0, Math.min(1, (w.lowest() - (P.dangerY - 2 * E.ROWH)) / (2 * E.ROWH)));
    D.dangerLine(c, v.x0, v.x1, P.dangerY, t, near, w.alarm >= 0 && w.state === 'play');
    if (!w.endless) D.ceiling(c, v.x0, v.x1, v.y0, w.ceil, t);

    // the eggs in the field
    var alarm = w.alarm >= 0 && w.state === 'play';
    for (var r = 0; r < g.rows.length; r++) {
      var row = g.rows[r], y = w.cy(r);
      if (y < v.y0 - R) continue;
      for (var cc = 0; cc < row.length; cc++) {
        var k = row[cc];
        if (k < 0) continue;
        var x = g.x(r, cc), rot = Math.sin(t * 2 + r * 1.3 + cc * 0.7) * 0.05, sc = 1;
        var b = this.bumps[r + ',' + cc];
        if (b != null && t - b < 0.4) sc = 1 + Math.sin((t - b) * 25) * 0.08 * (1 - (t - b) / 0.4);
        if (alarm && y + R >= P.dangerY - E.ROWH) x += Math.sin(t * 40 + cc * 2) * 1.6;
        drawEgg(c, k, x, y, rot, sc, t);
      }
    }
    this.hatch.forEach(function (h) {
      var k = Math.max(0, h.t) / CRACK;
      drawEgg(c, h.k, h.x + (h.t > 0 ? Math.sin(h.t * 90) * 1.5 : 0), h.y, 0, 1 + k * 0.1, t);
      if (h.t > 0 && h.k <= 5) D.cracks(c, h.x, h.y, R, k);
    });
    this.falls.forEach(function (f) { drawEgg(c, f.k, f.x, f.y, f.rot, 1, t); });
    if (w.endless) D.ceiling(c, v.x0, v.x1, v.y0, P.top - 8, t);   // new rows come out from behind the cloud

    // aiming
    if (this.aim && w.state === 'play' && this.aim.tr.cell) {
      D.guide(c, this.aim.tr.pts, t);
      c.globalAlpha = 0.5; drawEgg(c, w.cur, this.aim.tr.x, this.aim.tr.y, 0, 1, t); c.globalAlpha = 1;
    }
    if (hint) drawHint(c, hint, this);
    if (w.state === 'play') D.arrow(c, P.gunX, P.gunY, this.aim ? this.aim.a : this.lastA, this.aim ? 1 : 0.5);
    D.launcher(c, P.gunX, P.gunY, t, this.kick);
    this.drawChara(c);
    this.drawQueue(c);
    if (w.shot) drawEgg(c, w.shot.k, w.shot.x, w.shot.y, 0, 1, t);

    // chicks and effects
    this.chicks.forEach(function (ch) {
      var s = ch.fly ? Math.min(0.85, 0.45 + ch.t * 3) : 0.75;
      D.chick(c, ch.x, ch.y, s, t + ch.seed, { flap: ch.fly ? ch.t * 26 : null, fly: ch.fly, run: !ch.fly, shell: ch.shell, happy: ch.fly && ch.t > 0.3, dir: ch.fly ? 0 : (ch.vx > 0 ? 1 : -1) });
    });
    this.booms.forEach(function (b) { D.boom(c, b.x, b.y, b.t); });
    this.bolts.forEach(function (b) { D.lightning(c, E.LEFT, E.RIGHT, b.y, b.t, b.seed); });
    drawFx(c, this.fx, t);

    if (alarm) {
      var left = Math.max(1, Math.ceil(w.alarm));
      D.word(c, String(left), W / 2, P.dangerY - 70, 84, '#ff7f7f', 0.3 + (1 - (w.alarm - Math.floor(w.alarm))) * 0.45);
    }
    this.words.forEach(function (wd) { D.word(c, wd.text, wd.x, wd.y - wd.t * 40, 40, wd.color, wd.t); });
  };

  Scene.prototype.drawChara = function (c) {
    var w = this.world, f = this.crit, cp = CHARA_POS, t = this.t;
    var look = this.aim ? { x: this.aim.tr.x, y: this.aim.tr.y } : w.shot ? { x: w.shot.x, y: w.shot.y } : { x: P.gunX, y: P.gunY - 60 };
    var holding = this.swapT >= 1 && w.state === 'play';
    c.save(); c.translate(cp.x, cp.y); c.scale(cp.k, cp.k); c.translate(-cp.x, -cp.y);
    D.critter(c, {
      x: cp.x, y: cp.y, t: t, kind: save.chara, look: look, open: f.open, mode: f.mode, mt: f.mt, blink: f.blink, worry: f.worry,
      hold: holding ? function (g) { drawEgg(g, w.next, HOLD.x, HOLD.y, 0, HOLD.r / R, t); } : null
    });
    c.restore();
  };

  // The egg in the nest, and the swap between the nest and the character's arms.
  Scene.prototype.drawQueue = function (c) {
    var w = this.world, t = this.t;
    if (w.state !== 'play') return;
    var nest = { x: P.gunX, y: P.gunY - Math.sin(this.kick * Math.PI) * 6 };
    var hold = { x: CHARA_POS.x + HOLD.x * CHARA_POS.k, y: CHARA_POS.y + HOLD.y * CHARA_POS.k }, hs = HOLD.r / R * CHARA_POS.k;
    if (this.swapT < 1) {
      var u = this.swapT * this.swapT * (3 - 2 * this.swapT), lift = Math.sin(u * Math.PI) * 50;
      drawEgg(c, w.cur, hold.x + (nest.x - hold.x) * u, hold.y + (nest.y - hold.y) * u - lift, 0, hs + (1 - hs) * u, t);
      drawEgg(c, w.next, nest.x + (hold.x - nest.x) * u, nest.y + (hold.y - nest.y) * u - lift * 0.4, 0, 1 + (hs - 1) * u, t);
      return;
    }
    var pop = this.kick > 0 ? Math.max(0, Math.min(1, (0.75 - this.kick) / 0.45)) : 1;
    if (pop > 0) drawEgg(c, w.cur, nest.x, nest.y, 0, pop < 1 ? 0.3 + pop * 0.7 + Math.sin(pop * Math.PI) * 0.15 : 1, t);
  };

  function hitSwap(p) {
    var dx = p.x - CHARA_POS.x, dy = p.y - (CHARA_POS.y + 6);
    return dx * dx + dy * dy < 50 * 50;
  }
  function onNest(p) { var dx = p.x - P.gunX, dy = p.y - P.gunY; return dx * dx + dy * dy < 30 * 30; }

  // ---------------------------------------------------------------- hints: the best shot, shown with a hand

  // The full search runs when something changes (a shot, a swap, a new row); while the eggs
  // creep down, only angles near the last one are tried again, to keep aiming at the same egg.
  function refreshHint(gm, dt) {
    var w = gm.scene.world;
    gm.hintT = (gm.hintT || 0) - dt;
    if (w.state !== 'play' || w.shot) { gm.hint = null; gm.hintT = 0; return; }
    var key = w.shots + ':' + w.cur + ':' + w.next + ':' + w.rowsAdded;
    if (gm.hint && gm.hintKey === key) {
      if (gm.hintT > 0 || gm.hint.swap) return;
      gm.hintT = 0.3;
      var h = gm.hint, a0 = -1, a1 = -1;
      for (var a = h.a - 0.12; a <= h.a + 0.12; a += 0.01) {
        var tr = w.trace(a);
        if (tr.cell && tr.cell.r === h.cell.r && tr.cell.c === h.cell.c) { if (a0 < 0) a0 = a; a1 = a; }
      }
      if (a0 >= 0) { h.a = (a0 + a1) / 2; h.tr = w.trace(h.a); return; }
    }
    gm.hintKey = key; gm.hintT = 0.3;
    var cur = w.best(w.cur, 0.012), nxt = w.best(w.next, 0.012);
    if (cur && nxt && nxt.score > cur.score + 1 && nxt.score >= 3) gm.hint = { swap: true };
    else if (cur) gm.hint = { a: cur.a, cell: cur.cell, tr: w.trace(cur.a) };
    else gm.hint = null;
  }

  function drawHint(c, h, scene) {
    var t = scene.t;
    if (h.swap) {
      D.hand(c, CHARA_POS.x + 4, CHARA_POS.y + 18, 1, Math.sin(t * 8) > 0);
      return;
    }
    if (!h.tr || !h.tr.cell) return;
    D.guide(c, h.tr.pts, t, '#fff27a');
    var rr = 26 + Math.sin(t * 8) * 4;
    D.circle(c, h.tr.x, h.tr.y, rr); D.paint(c, 'rgba(255,240,120,.25)', '#ffe04d', 4);
    if (!scene.aim) D.hand(c, h.tr.x + 6, h.tr.y + 8, 1, Math.sin(t * 8) > 0);
  }

  // ---------------------------------------------------------------- title screen animation

  var title = null;
  function newTitle() {
    title = { t: 0, next: 0.9, eggs: [], chicks: [], walkers: [], fx: [], crit: { blinkT: 2, blink: false } };
    for (var i = 0; i < 4; i++) title.walkers.push({ x: 40 + i * 80, vx: (i % 2 ? -1 : 1) * (20 + Math.random() * 20), t: Math.random() * 3, shell: i % 6, stop: Math.random() * 2 });
  }
  function updateTitle(dt) {
    if (!title) newTitle();
    var tt = title;
    tt.t += dt; tt.next -= dt;
    if (tt.next <= 0) {
      tt.next = 1.1 + Math.random() * 0.9;
      tt.eggs.push({ k: Math.floor(Math.random() * 6), x: 180, y: 360, vx: (Math.random() - 0.5) * 200, vy: -430 - Math.random() * 80, rot: 0 });
    }
    for (var i = tt.eggs.length - 1; i >= 0; i--) {
      var e = tt.eggs[i];
      e.vy += 520 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += dt * 3;
      if (e.vy > -30) {
        tt.chicks.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 120, vy: -90, t: 0, shell: e.k, seed: Math.random() * 6 });
        burst(tt.fx, e.x, e.y, 'spark', 6, '#fff6a8');
        tt.fx.push({ kind: 'shell', k: e.k, x: e.x, y: e.y, vx: (Math.random() - 0.5) * 60, vy: -40, rot: 0, vr: (Math.random() - 0.5) * 8, life: 0.8, max: 0.8 });
        tt.eggs.splice(i, 1);
      }
    }
    for (i = tt.chicks.length - 1; i >= 0; i--) {
      var ch = tt.chicks[i];
      ch.t += dt; ch.vy -= 40 * dt;
      ch.x += (ch.vx + Math.sin(ch.t * 5 + ch.seed) * 35) * dt; ch.y += ch.vy * dt;
      if (ch.y < -60 || ch.x < -60 || ch.x > W + 60) tt.chicks.splice(i, 1);
    }
    tt.walkers.forEach(function (wk) {
      wk.t += dt;
      wk.stop -= dt;
      if (wk.stop < 0) {
        wk.x += wk.vx * dt;
        if (wk.x < 30 || wk.x > W - 30 || (wk.x > 110 && wk.x < 250 && Math.random() < 0.01)) wk.vx = -wk.vx;
        if (Math.random() < 0.004) wk.stop = 0.8 + Math.random() * 1.5;
      }
      wk.x = Math.max(24, Math.min(W - 24, wk.x));
      if (wk.x > 118 && wk.x < 242) wk.x = wk.vx > 0 ? 242 : 118;
    });
    updateFx(tt.fx, dt);
    tt.crit.blinkT -= dt;
    if (tt.crit.blinkT < 0) { tt.crit.blink = true; if (tt.crit.blinkT < -0.13) { tt.crit.blink = false; tt.crit.blinkT = 2 + Math.random() * 3; } }
  }
  function drawTitle(c) {
    var tt = title, t = tt.t;
    worldTransform(c);
    tt.eggs.forEach(function (e) { drawEgg(c, e.k, e.x, e.y, e.rot, 1, t); });
    var look = tt.eggs.length ? { x: tt.eggs[tt.eggs.length - 1].x, y: tt.eggs[tt.eggs.length - 1].y } : { x: 180, y: 250 };
    D.critter(c, { x: 180, y: 392, t: t, kind: save.chara, look: look, mode: 'idle', blink: tt.crit.blink, open: tt.eggs.length && tt.eggs[tt.eggs.length - 1].vy < -300 ? 0.5 : 0,
      hold: function (g) { drawEgg(g, Math.floor(t / 2.2) % 6, HOLD.x, HOLD.y, 0, HOLD.r / R, t); } });
    tt.walkers.forEach(function (wk) {
      var moving = wk.stop < 0;
      D.chick(c, wk.x, 452 - (moving ? Math.abs(Math.sin(wk.t * 10)) * 5 : 0), 0.8, t + wk.shell, { run: moving, shell: wk.shell, dir: wk.vx > 0 ? 1 : -1, happy: !moving });
    });
    tt.chicks.forEach(function (ch) { D.chick(c, ch.x, ch.y, Math.min(0.85, 0.45 + ch.t * 3), t, { fly: true, flap: ch.t * 26, shell: ch.shell, happy: ch.t > 0.3 }); });
    drawFx(c, tt.fx, t);
  }

  // ---------------------------------------------------------------- screens

  var screen = 'title';
  var game = null;          // current play session
  var clock = 0;

  function show(name) {
    screen = name;
    ['title', 'worlds', 'stages', 'shop', 'hud'].forEach(function (id) {
      $(id).classList.toggle('on', id === name || (name === 'play' && id === 'hud'));
    });
    if (name !== 'play') { hidePanel('clear'); hidePanel('fail'); hideTip(); releaseWake(); }
  }

  // Android back button walks back through the screens.
  var depth = 0;
  function forward(fn) { depth++; history.pushState({ d: depth }, ''); fn(); }
  // The nickname set in ケロちゃん ランド (every game on the site reads the same key), shown on the title screen.
  function refreshNameTag() {
    var n = '', el = $('name-tag');
    try { n = (localStorage.getItem('kero-name') || '').trim().slice(0, 10); } catch (e) { /* no storage */ }
    el.hidden = !n;
    el.innerHTML = '';
    if (!n) return;
    el.innerHTML = icon('star');
    var sp = document.createElement('span');
    sp.textContent = n;
    el.appendChild(sp);
  }
  window.addEventListener('pageshow', function () { refreshNameTag(); });

  function go(name) {
    if (name === 'title') { show('title'); refreshNameTag(); newTitle(); refreshShopBadge(); refreshSpeed(); }
    else if (name === 'worlds') { buildWorlds(); show('worlds'); }
    else if (name === 'stages') { buildStages(); show('stages'); }
    else if (name === 'shop') { buildShop(); show('shop'); }
  }
  window.addEventListener('popstate', function () {
    depth = Math.max(0, depth - 1);
    ['parent', 'pass', 'buy'].forEach(hidePanel);
    if (screen === 'play') go(game && game.endless ? 'title' : 'stages');
    else if (screen === 'stages') go('worlds');
    else go('title');
  });
  function back() { S.play('click'); if (depth > 0) history.back(); else go('title'); }

  // Back to ケロちゃん ランド, the menu at the top of the site. When the game was opened
  // from it, step back in history (so the phone's back button keeps making sense).
  function toLand() {
    S.play('click');
    var fromLand = false;
    try {
      var ref = new URL(document.referrer);
      fromLand = ref.origin === location.origin && ref.pathname === new URL('../', location.href).pathname;
    } catch (e) { /* no referrer */ }
    setTimeout(function () {
      if (fromLand && depth === 0 && history.length > 1) history.back();
      else location.href = '../';
    }, 120);
  }

  var curWorld = 0;

  // --- speed (how fast the eggs come down)

  function refreshSpeed() {
    document.querySelectorAll('.speed-btn').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-speed') === save.speed); });
  }

  // --- world select

  function buildWorlds() {
    var list = $('world-list');
    list.innerHTML = '';
    WORLDS.forEach(function (wd, wi) {
      var open = worldOpen(wi), b = document.createElement('button');
      b.className = 'card' + (open ? '' : ' locked');
      b.style.setProperty('--c1', D.THEMES[wd.theme].sky[0]);
      b.style.setProperty('--c2', D.THEMES[wd.theme].sky[1]);
      var ic = document.createElement('canvas'); ic.width = 128; ic.height = 128; ic.className = 'card-icon';
      var g = ic.getContext('2d'); g.scale(2, 2);
      var ks = wd.icon || [0, 1, 2];
      D.egg(g, ks[0], 21, 38, 12, 0, -0.2); D.egg(g, ks[2], 43, 38, 12, 0, 0.2);
      D.egg(g, ks[1], 32, 25, 13, 0, 0);
      if (wd.special != null) D.egg(g, wd.special, 32, 44, 12, 0, 0);
      else D.chick(g, 32, 46, 0.62, 0, { shell: ks[1] });
      b.appendChild(ic);
      var tx = document.createElement('div'); tx.className = 'card-text';
      var wname = L(wd.name);
      tx.innerHTML = '<div class="card-num">' + L('ワールド {n}', { n: wi + 1 }) + '</div><div class="card-name' + (wname.length > (Lang.cur === 'ja' ? 9 : 16) ? ' long' : '') + '">' + wname + '</div>' +
        '<div class="card-stars">' + icon('star') + ' ' + worldStars(wi) + ' / ' + wd.stages.length * 3 + '</div>';
      b.appendChild(tx);
      if (!open) { var lk = document.createElement('span'); lk.className = 'card-lock'; lk.innerHTML = icon('lock'); b.appendChild(lk); }
      b.addEventListener('click', function () {
        if (!worldOpen(wi)) { S.play('lose'); shake(b); return; }
        S.play('click'); curWorld = wi; forward(function () { go('stages'); });
      });
      list.appendChild(b);
    });
  }

  // --- stage select

  function buildStages() {
    var wd = WORLDS[curWorld], grid = $('stage-grid');
    var wname = L(wd.name);
    $('stages-title').textContent = wname;
    $('stages-title').classList.toggle('long', wname.length > (Lang.cur === 'ja' ? 9 : 16));
    grid.innerHTML = '';
    var nextSet = false;
    wd.stages.forEach(function (lv, si) {
      var open = stageOpen(curWorld, si), b = document.createElement('button');
      b.className = 'stage-btn' + (open ? '' : ' locked');
      if (open && !cleared(curWorld, si) && !nextSet) { b.classList.add('next'); nextSet = true; }
      if (open) {
        var st = starsOf(curWorld, si), s = '';
        for (var k = 0; k < 3; k++) s += '<i class="' + (k < st ? 'got' : '') + '">' + icon('star') + '</i>';
        b.innerHTML = '<span class="num">' + (si + 1) + '</span><span class="mini-stars">' + s + '</span>';
      } else b.innerHTML = icon('lock');
      b.addEventListener('click', function () {
        if (!stageOpen(curWorld, si)) { S.play('lose'); shake(b); return; }
        S.play('click'); forward(function () { startLevel(curWorld, si); });
      });
      grid.appendChild(b);
    });
  }

  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // --- shop: buy friends with ★ and choose who plays

  var SHOP_NOTE = L('★を つかって おともだちを ふやそう！');
  var shop = { t: 0, cards: [], fx: [] };

  function drawPreview(cv, kind, t, extra) {
    var g = cv.getContext('2d'), k = cv.width / 240 * 1.05;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(k, 0, 0, k, cv.width / 2 - 180 * k, cv.height * 0.6 - 150 * k);
    D.critter(g, Object.assign({ x: 180, y: 150, t: t, kind: kind, look: null, blink: (t % 3.3) < 0.13, mode: 'idle' }, extra || {}));
  }

  function refreshShopBadge() { $('shop-badge').innerHTML = icon('star') + wallet(); }

  function buildShop() {
    var grid = $('shop-grid');
    grid.innerHTML = '';
    shop.cards = [];
    $('shop-wallet').innerHTML = icon('star') + '<span>' + wallet() + '</span>';
    CHARAS.forEach(function (ch) {
      var mine = owns(ch.id), using = save.chara === ch.id, card = document.createElement('div');
      card.className = 'chara-card' + (using ? ' using' : '');
      var cv = document.createElement('canvas');
      cv.width = 240; cv.height = 240; cv.className = 'chara-canvas';
      card.appendChild(cv);
      var nm = document.createElement('div');
      nm.className = 'chara-name'; nm.textContent = L(ch.name);
      card.appendChild(nm);
      var b = document.createElement('button');
      if (using) { b.className = 'btn chara-btn using'; b.textContent = L('つかってる'); }
      else if (mine) { b.className = 'btn chara-btn'; b.textContent = L('えらぶ'); }
      else {
        var can = wallet() >= ch.price;
        b.className = 'btn chara-btn buy' + (can ? '' : ' short');
        b.innerHTML = can ? L('{star}{price} で かう', { star: icon('star'), price: ch.price }) : icon('star') + ch.price;
      }
      b.addEventListener('click', function () { choose(ch, card); });
      card.appendChild(b);
      grid.appendChild(card);
      shop.cards.push({ id: ch.id, canvas: cv, happyT: -9 });
    });
  }

  function choose(ch, card) {
    if (save.chara === ch.id) { S.play('click'); cheer(ch.id); return; }
    if (owns(ch.id)) { S.play('click'); save.chara = ch.id; store(); buildShop(); cheer(ch.id); return; }
    if (wallet() < ch.price) {
      S.play('lose'); shake(card);
      showShopNote(L('あと ★{n} で かえるよ', { n: ch.price - wallet() }));
      return;
    }
    S.play('click');
    buying = ch;
    $('buy-text').innerHTML = L('{name}を<br>{star}{price} で かう？', { name: L(ch.name), star: icon('star'), price: ch.price });
    showPanel('buy');
  }

  var buying = null;
  function confirmBuy() {
    var ch = buying;
    hidePanel('buy'); buying = null;
    if (!ch || owns(ch.id) || wallet() < ch.price) return;
    save.spent += ch.price;
    save.owned.push(ch.id);
    save.chara = ch.id;
    store();
    S.play('fanfare'); vibrate(40);
    buildShop(); cheer(ch.id);
    confetti(shop.fx, 60);
    showShopNote(L('{name}が なかまに なったよ！', { name: L(ch.name) }));
  }

  function cheer(id) { shop.cards.forEach(function (c) { if (c.id === id) c.happyT = shop.t; }); }

  function updateShop(dt) {
    shop.t += dt;
    shop.cards.forEach(function (c, i) {
      var since = shop.t - c.happyT;
      drawPreview(c.canvas, c.id, shop.t + i * 0.9, since < 1.4 ? { mode: 'happy', mt: since } : null);
    });
    if (buying) drawPreview($('buy-canvas'), buying.id, shop.t);
    updateFx(shop.fx, dt);
  }

  var noteTimer = null;
  function showShopNote(text) {
    var el = $('shop-note');
    el.textContent = text;
    el.classList.add('flash');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { el.textContent = SHOP_NOTE; el.classList.remove('flash'); }, 2600);
  }

  // --- grown-ups: the password opens the admin menu (unlock every stage, reset)

  var ADMIN_PASS = '123', typed = '';
  function openPass() { typed = ''; drawDots(); showPanel('pass'); }
  function drawDots() {
    var h = '';
    for (var i = 0; i < Math.max(3, typed.length); i++) h += '<i class="' + (i < typed.length ? 'on' : '') + '"></i>';
    $('pass-dots').innerHTML = h;
  }
  function pressKey(k) {
    if (k === 'del') typed = typed.slice(0, -1);
    else if (k === 'ok') {
      if (typed === ADMIN_PASS) { hidePanel('pass'); S.play('click'); openAdmin(); return; }
      S.play('lose'); shake($('pass-card')); typed = '';
    } else if (typed.length < 6) { typed += k; S.play('click'); }
    drawDots();
  }
  function openAdmin() {
    $('p-all').textContent = L(save.all ? '全ステージ解放：オン' : '全ステージ解放：オフ');
    $('p-all').classList.toggle('active', !!save.all);
    $('p-reset').textContent = L('記録をリセット');
    $('p-info').textContent = L('あつめた★ {got}　つかった★ {spent}', { got: totalStars(), spent: save.spent });
    showPanel('parent');
  }

  // --- playing

  function startLevel(wi, si, opts) {
    opts = opts || {};
    var lv = WORLDS[wi].stages[si];
    var same = game && !game.endless && game.wi === wi && game.si === si;
    var firstTime = !cleared(wi, si) && lv.tip && !save.seen[skey(wi, si)];
    game = {
      wi: wi, si: si, level: lv, endless: false,
      fails: same ? game.fails : 0,
      hintOn: opts.hint || (same && game.hintOn) || firstTime,
      shownEnd: false, stars: 3, chicks: 0
    };
    game.scene = new Scene(lv, { speed: save.speed, onEvent: onPlayEvent });
    curWorld = wi;
    $('hud').classList.remove('endless');
    $('h-label').textContent = (wi + 1) + ' - ' + (si + 1);
    setHudStars(3);
    $('h-num').textContent = '0';
    $('h-hint').hidden = false;
    $('h-hint').classList.toggle('glow', game.fails >= 3 && !game.hintOn);
    $('h-hint').classList.toggle('active', !!game.hintOn);
    S.setKey(WORLDS[wi].key || 0);
    show('play');
    if (!same || opts.showTip) hideTip();
    if (lv.tip && (!same || opts.showTip)) showTip(L(TIPS[lv.tip] || lv.tip));
    if (firstTime) { save.seen[skey(wi, si)] = 1; store(); }
    requestWake();
  }

  function startEndless() {
    var same = game && game.endless;
    game = { endless: true, fails: 0, hintOn: same && game.hintOn, shownEnd: false, chicks: 0 };
    game.scene = new Scene(ENDLESS[save.speed], { speed: save.speed, onEvent: onPlayEvent });
    $('hud').classList.add('endless');
    $('h-label').textContent = L(SPEED_NAMES[save.speed]);
    $('h-best').textContent = L('さいこう {n}', { n: save.best[save.speed] || 0 });
    $('h-num').textContent = '0';
    $('h-hint').classList.remove('glow');
    $('h-hint').classList.toggle('active', !!game.hintOn);
    S.setKey(4);
    show('play');
    hideTip();
    requestWake();
  }

  function starsFor(lv, shots) { var p = lv.par || [99, 199]; return shots <= p[0] ? 3 : shots <= p[1] ? 2 : 1; }

  function onPlayEvent(e) {
    if (e.type === 'fire') {
      hideTip();
      if (!game.endless) {
        var st = starsFor(game.level, game.scene.world.shots);
        if (st < game.stars) { game.stars = st; setHudStars(st, true); S.play('starLost'); }
      }
    }
    if (e.type === 'lose') game.fails++;
  }

  function setHudStars(n, lost) {
    var slots = $('h-stars').children;
    for (var i = 0; i < 3; i++) {
      var on = i < n;
      if (lost && !on && slots[i].classList.contains('got')) { slots[i].classList.remove('lost'); void slots[i].offsetWidth; slots[i].classList.add('lost'); }
      slots[i].classList.toggle('got', on);
    }
  }

  function updatePlay(dt) {
    var sc = game.scene, w = sc.world;
    sc.update(dt);
    if (!game) return;
    if (game.hintOn) refreshHint(game, dt); else game.hint = null;
    if (sc.chickN !== game.chicks) {
      game.chicks = sc.chickN;
      $('h-num').textContent = game.chicks;
      var el = $('h-count'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }
    if (w.state === 'won' && !game.shownEnd && sc.endT > 1.8 && !sc.falls.length) { game.shownEnd = true; showClear(); }
    if (w.state === 'lost' && !game.shownEnd && sc.endT > 1.6) { game.shownEnd = true; if (game.endless) showEndlessEnd(); else showFail(); }
  }

  function retry() {
    S.play('click');
    hidePanel('clear'); hidePanel('fail');
    if (game.endless) startEndless(); else startLevel(game.wi, game.si);
  }

  function toggleHint() {
    S.play('click');
    game.hintOn = !game.hintOn;
    game.hint = null;
    $('h-hint').classList.toggle('active', !!game.hintOn);
    $('h-hint').classList.remove('glow');
  }

  // --- end of a game

  function showClear() {
    var wi = game.wi, si = game.si, got = game.stars;
    var first = !cleared(wi, si);
    save.stars[skey(wi, si)] = Math.max(starsOf(wi, si), got);
    store();
    var lastStage = si === WORLDS[wi].stages.length - 1;
    var allDone = WORLDS.every(function (wd, i) { return cleared(i, wd.stages.length - 1); });
    var title = got === 3 ? 'かんぺき！' : got === 2 ? 'すごい！' : 'やったね！';
    if (lastStage && first) title = wi === WORLDS.length - 1 && allDone ? 'ぜんぶ クリア！' : 'ワールド クリア！';
    title = L(title);
    $('clear-title').textContent = title;
    $('clear-title').classList.toggle('long', title.length > 6);
    $('clear-note').innerHTML = L('ひよこが <b>{n}</b>わ うまれたよ！', { n: game.scene.world.hatched });
    var slots = $('clear-stars').children;
    for (var i = 0; i < 3; i++) slots[i].className = '';
    for (var k = 0; k < got; k++) {
      (function (k) {
        setTimeout(function () {
          if (!game || !game.shownEnd || game.endless) return;
          slots[k].className = 'got';
          S.play('resultStar', k);
          burst(game.scene.fx, 180 + (k - 1) * 70, 250, 'spark', 8, '#fff27a');
        }, 450 + k * 330);
      }(k));
    }
    if (lastStage && first) {
      setTimeout(function () { S.play('fanfare'); }, 400);
      confetti(game.scene.fx, 70);
    }
    showPanel('clear');
  }

  function showFail() {
    $('fail-title').textContent = L('ざんねん…');
    $('fail-title').classList.add('fail-title');
    $('fail-note').textContent = L('たまごが せんまで きちゃった');
    showPanel('fail');
  }

  function showEndlessEnd() {
    var n = game.scene.world.hatched, best = save.best[save.speed] || 0, record = n > best;
    if (record) { save.best[save.speed] = n; store(); }
    $('fail-title').textContent = L(record ? 'しんきろく！' : 'おしまい！');
    $('fail-title').classList.toggle('fail-title', !record);
    $('fail-note').innerHTML = L('ひよこが <b>{n}</b>わ うまれたよ！<br>さいこう {best}わ', { n: n, best: Math.max(n, best) });
    if (record) { setTimeout(function () { S.play('fanfare'); }, 300); confetti(game.scene.fx, 60); }
    showPanel('fail');
  }

  function nextStage() {
    S.play('click');
    hidePanel('clear');
    var wi = game.wi, si = game.si + 1;
    if (si >= WORLDS[wi].stages.length) {
      if (wi + 1 < WORLDS.length) curWorld = wi + 1;
      if (depth > 0) history.back(); else go('stages');
      return;
    }
    startLevel(wi, si);
  }

  // --- panels & tips

  function showPanel(id) { $(id).classList.add('on'); }
  function hidePanel(id) { $(id).classList.remove('on'); }

  // The tip is a speech bubble from the character at the bottom right.
  var tipTimer = null;
  function showTip(text) {
    var el = $('tip'), w = 310, left = W - 10 - w;
    el.textContent = text;
    el.style.left = left + 'px';
    el.style.width = w + 'px';
    el.style.top = '';
    el.style.bottom = (H - (CHARA_POS.y - 46)) + 'px';
    el.style.setProperty('--tail', (CHARA_POS.x - left) + 'px');
    el.classList.remove('below', 'free');
    el.classList.add('on');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(hideTip, 7000);
  }
  function hideTip() { $('tip').classList.remove('on'); }

  // ---------------------------------------------------------------- wake lock (screen stays on while playing)

  var wake = null;
  function requestWake() {
    if (wake || !navigator.wakeLock) return;
    navigator.wakeLock.request('screen').then(function (l) { wake = l; l.addEventListener('release', function () { wake = null; }); }).catch(function () {});
  }
  function releaseWake() { if (wake) { wake.release().catch(function () {}); wake = null; } }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) S.suspend();
    else { S.resume(); if (screen === 'play') requestWake(); }
  });

  // ---------------------------------------------------------------- input
  // Touch to aim, let go to shoot. Touching the egg the character hugs (or the one in the nest) swaps them.

  var aimer = null;   // { id, nest, x, y }

  function firstTouch() {
    S.init();
    if (save.music) S.startMusic();
  }
  window.addEventListener('pointerdown', firstTouch, true);

  canvas.addEventListener('pointerdown', function (e) {
    if (screen !== 'play' || !game || aimer) return;
    e.preventDefault();
    var p = toWorld(e), sc = game.scene;
    if (sc.world.state !== 'play') return;
    if (hitSwap(p)) { sc.world.swap(); return; }
    if (p.y > P.gunY + 30) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    aimer = { id: e.pointerId, nest: onNest(p), x: p.x, y: p.y };
    if (!aimer.nest) sc.setAim(p);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!aimer || e.pointerId !== aimer.id || screen !== 'play' || !game) return;
    var p = toWorld(e);
    if (aimer.nest) {
      // pressed on the nest: dragging upward turns into aiming
      if (aimer.y - p.y > 24 || Math.abs(p.x - aimer.x) > 30) aimer.nest = false; else return;
    }
    game.scene.setAim(p);
  });

  function endPointer(e) {
    if (!aimer || e.pointerId !== aimer.id) return;
    var a = aimer;
    aimer = null;
    if (screen !== 'play' || !game) return;
    var sc = game.scene, p = toWorld(e);
    if (e.type === 'pointercancel') { sc.aim = null; return; }
    if (a.nest) { sc.world.swap(); return; }
    if (p.y > P.gunY + 30) { sc.aim = null; return; }   // slid down off the field: no shot
    sc.release(p);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- icons

  var ICONS = {
    home: '<path d="M4 11.5 12 4.5l8 7V20h-5.5v-5.5h-5V20H4z"/>',
    retry: '<path d="M19 12.5a7 7 0 1 1-2.3-5.2"/><path d="M17.5 3v4.8h-4.8"/>',
    hint: '<path d="M9.2 17.5h5.6M10 20.5h4M12 3.5a5.8 5.8 0 0 0-3.6 10.3c.7.6.8 1.6.8 2.2h5.6c0-.6.1-1.6.8-2.2A5.8 5.8 0 0 0 12 3.5z"/>',
    back: '<path d="M14.5 5 7.5 12l7 7"/>',
    next: '<path d="M8 5l10 7-10 7z" fill="currentColor"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    sfx: '<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    sfxOff: '<path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    music: '<path d="M9 17.5V6.5l10-2v11"/><circle cx="6.8" cy="17.5" r="2.4" fill="currentColor"/><circle cx="16.8" cy="15.5" r="2.4" fill="currentColor"/>',
    musicOff: '<path d="M9 17.5V6.5l10-2v11"/><circle cx="6.8" cy="17.5" r="2.4" fill="currentColor"/><circle cx="16.8" cy="15.5" r="2.4" fill="currentColor"/><path d="M4 4l16 16"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>',
    star: '<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.5l6-.8z" fill="currentColor" stroke-linejoin="round"/>',
    install: '<path d="M12 4v10M7.5 9.5 12 14l4.5-4.5M5 19h14"/>',
    shop: '<path d="M5.5 8.5h13l-1.2 11.5H6.7z" fill="currentColor" fill-opacity=".25"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    infinity: '<path d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  function setIcon(el, name) { el.innerHTML = icon(name); }

  // ---------------------------------------------------------------- wiring

  function refreshToggles() {
    setIcon($('btn-sfx'), save.sfx ? 'sfx' : 'sfxOff');
    setIcon($('btn-music'), save.music ? 'music' : 'musicOff');
    $('btn-sfx').classList.toggle('off', !save.sfx);
    $('btn-music').classList.toggle('off', !save.music);
  }

  function wire() {
    document.querySelectorAll('[data-icon]').forEach(function (el) { setIcon(el, el.getAttribute('data-icon')); });
    document.querySelectorAll('#h-stars i, #clear-stars i').forEach(function (el) { el.innerHTML = icon('star'); });
    var hc = $('h-chick').getContext('2d');
    D.chick(hc, 32, 36, 1.55, 0, { shell: 1 });
    refreshShopBadge();
    refreshToggles();
    refreshSpeed();
    S.set('sfx', save.sfx); S.set('music', save.music);

    $('btn-play').addEventListener('click', function () { S.play('click'); forward(function () { go('worlds'); }); });
    $('btn-land').addEventListener('click', toLand);
    $('btn-endless').addEventListener('click', function () { S.play('click'); forward(startEndless); });
    document.querySelectorAll('.speed-btn').forEach(function (b) {
      b.addEventListener('click', function () { save.speed = b.getAttribute('data-speed'); store(); refreshSpeed(); S.play('click'); });
    });
    $('btn-sfx').addEventListener('click', function () { save.sfx = !save.sfx; S.set('sfx', save.sfx); store(); refreshToggles(); S.play('click'); });
    $('btn-music').addEventListener('click', function () {
      save.music = !save.music; S.set('music', save.music); store(); refreshToggles();
      if (save.music) S.startMusic(); else S.stopMusic();
    });
    $('worlds-back').addEventListener('click', back);
    $('stages-back').addEventListener('click', back);
    $('h-home').addEventListener('click', back);
    $('h-retry').addEventListener('click', retry);
    $('h-hint').addEventListener('click', toggleHint);
    $('c-retry').addEventListener('click', retry);
    $('c-next').addEventListener('click', nextStage);
    $('c-menu').addEventListener('click', function () { hidePanel('clear'); back(); });
    $('f-retry').addEventListener('click', retry);
    $('f-menu').addEventListener('click', function () { hidePanel('fail'); back(); });
    $('tip').addEventListener('click', hideTip);

    // shop
    $('btn-shop').addEventListener('click', function () { S.play('click'); forward(function () { go('shop'); }); });
    $('shop-back').addEventListener('click', back);
    $('buy-yes').addEventListener('click', confirmBuy);
    $('buy-no').addEventListener('click', function () { S.play('click'); buying = null; hidePanel('buy'); });

    // grown-ups: ⚙ -> password -> admin menu
    $('btn-admin').addEventListener('click', function () { S.play('click'); openPass(); });
    document.querySelectorAll('#pass .key').forEach(function (k) {
      k.addEventListener('click', function () { pressKey(k.getAttribute('data-k')); });
    });
    $('pass-close').addEventListener('click', function () { hidePanel('pass'); });
    $('p-all').addEventListener('click', function () { save.all = !save.all; store(); openAdmin(); });
    var resetArmed = false;
    $('p-reset').addEventListener('click', function () {
      if (!resetArmed) { resetArmed = true; $('p-reset').textContent = L('もう一度押すと消えます'); return; }
      save.stars = {}; save.seen = {}; save.all = false; save.best = {};
      save.spent = 0; save.owned = ['frog']; save.chara = 'frog';
      store(); resetArmed = false; openAdmin(); refreshShopBadge();
    });
    $('p-close').addEventListener('click', function () { resetArmed = false; hidePanel('parent'); });

    // "add to home screen" when the browser offers it
    var installEvt = null;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; $('btn-install').hidden = false; });
    $('btn-install').addEventListener('click', function () {
      if (!installEvt) return;
      installEvt.prompt();
      installEvt.userChoice.then(function () { installEvt = null; $('btn-install').hidden = true; });
    });
    window.addEventListener('appinstalled', function () { $('btn-install').hidden = true; });
  }

  // ---------------------------------------------------------------- main loop

  var lastT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
    lastT = now; clock += dt;
    if (screen === 'play' && game) {
      updatePlay(dt);
      drawBackground(game.endless ? 4 : WORLDS[game.wi].theme);
      if (game) game.scene.draw(ctx, game.hintOn ? game.hint : null);
    } else if (screen === 'title') {
      updateTitle(dt);
      drawBackground(5);
      drawTitle(ctx);
    } else if (screen === 'shop') {
      updateShop(dt);
      drawBackground(1);
      worldTransform(ctx);
      drawFx(ctx, shop.fx, clock);
    } else {
      drawBackground(screen === 'stages' ? WORLDS[curWorld].theme : 5);
    }
  }

  window.addEventListener('resize', resize);
  resize();
  // the chosen language (js/lang.js): the title logo and the fixed text of the page
  Lang.logo($('logo'), Lang.pick(GAME_LOGO), ['#86d65c', '#ff8fc0', '#ffb347', '#6cc6ff', '#b58cff', '#ffd23d', '#ff8fc0', '#ffd23d', '#6cc6ff', '#86d65c', '#ffa552']);
  Lang.apply();
  wire();
  history.replaceState({ d: 0 }, '');
  go('title');
  requestAnimationFrame(frame);

  // Offline play and updates. sw.js keeps the game on the phone. A new version is looked for whenever
  // the game is opened or comes back to the front; once it is stored (the new sw.js takes over at once),
  // the page reloads itself as soon as the title screen is showing, so the phone never keeps an old version.
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    var swReg = null, swHad = !!navigator.serviceWorker.controller, swNew = false;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) { swReg = r; }).catch(function () {});
    var swCheck = function () { if (swReg && !document.hidden) swReg.update().catch(function () {}); };
    document.addEventListener('visibilitychange', swCheck);
    window.addEventListener('pageshow', function (e) { if (e.persisted) swCheck(); });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (swHad) swNew = true;   // (not the first time the game is stored)
      swHad = true;
    });
    setInterval(function () {
      if (swNew && !document.hidden && screen === 'title' && depth === 0 && !document.querySelector('.panel.on')) { swNew = false; location.reload(); }
    }, 700);
  }

  // for playtesting from the browser console
  window.PIYO = { save: save, get game() { return game; }, startLevel: startLevel, startEndless: startEndless, WORLDS: WORLDS };
}());
