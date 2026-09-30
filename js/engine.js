/* ケロちゃん ぴよぴよポン — the egg field, shots and rules.
   Shared by the browser game and the Node.js tools in tools/.
   Everything runs on a fixed 1/120 s step, so a stage plays out the same
   in the browser and in the stage checker. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 360, H = 640, DT = 1 / 120;
  // Hex grid: a wide row holds 8 eggs, the narrow rows between them 7.
  var R = 21, D = 2 * R, ROWH = D * Math.sqrt(3) / 2;
  var LEFT = 12, RIGHT = W - 12;

  // Egg kinds. Colours 0-5 and stones sit in the field; the other three only come from the launcher.
  var STONE = 6, BOMB = 7, RAINBOW = 8, BOLT = 9, EMPTY = -1;

  var P = {
    top: 66,          // the cloud ceiling at the start
    dangerY: 520,     // an egg reaching this line sounds the alarm
    gunX: 180, gunY: 560,
    shotSpeed: 960,   // px/s
    sub: 4,           // px moved between collision checks
    hit: 0.8,         // a flying egg touches a sitting one at D * hit (a little forgiving)
    minAim: 0.2,      // radians above the horizontal
    alarm: 3,         // seconds to clear the eggs at the line
    bombR: 1.8,       // × D
    grace: 2.5        // endless: seconds before the eggs start to come down
  };

  // Seconds for the eggs to come down one row, for each speed the child can pick.
  var SPEEDS = {
    slow: { stage: 30, endless: 20 },
    normal: { stage: 16, endless: 12 },
    fast: { stage: 9, endless: 7 },
    oni: { stage: 6, endless: 5 }   // (おに, 2026-09-30)
  };
  var ENDLESS_MIN = 3, ENDLESS_ACCEL = 0.96;

  function sq(v) { return v * v; }

  function rngOf(seed) {   // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clampAim(a) { return Math.max(P.minAim, Math.min(Math.PI - P.minAim, a)); }

  // Direction from the launcher towards a point the child touches.
  function aimAt(x, y) { return clampAim(Math.atan2(Math.max(1, P.gunY - y), x - P.gunX)); }

  // ---------------------------------------------------------------- grid

  function emptyRow(n) { var a = []; for (var i = 0; i < n; i++) a.push(EMPTY); return a; }

  // rows[r][c] = egg kind or EMPTY. Row r is narrow (shifted by half an egg) when r + par is odd.
  function Grid(rows, par) { this.rows = rows || []; this.par = par || 0; }

  Grid.prototype.narrow = function (r) { return ((r + this.par) & 1) === 1; };
  Grid.prototype.cols = function (r) { return this.narrow(r) ? 7 : 8; };
  Grid.prototype.x = function (r, c) { return LEFT + R + c * D + (this.narrow(r) ? R : 0); };
  Grid.prototype.get = function (r, c) {
    var row = this.rows[r];
    return row && row[c] != null ? row[c] : EMPTY;
  };
  Grid.prototype.set = function (r, c, k) {
    while (this.rows.length <= r) this.rows.push(emptyRow(this.cols(this.rows.length)));
    this.rows[r][c] = k;
  };
  Grid.prototype.clone = function () { return new Grid(this.rows.map(function (row) { return row.slice(); }), this.par); };
  Grid.prototype.each = function (fn) {
    for (var r = 0; r < this.rows.length; r++) {
      var row = this.rows[r];
      for (var c = 0; c < row.length; c++) if (row[c] >= 0) fn(r, c, row[c]);
    }
  };
  Grid.prototype.count = function () { var n = 0; this.each(function () { n++; }); return n; };
  Grid.prototype.trim = function () {
    while (this.rows.length && this.rows[this.rows.length - 1].every(function (k) { return k < 0; })) this.rows.pop();
  };

  Grid.prototype.neighbors = function (r, c) {
    // the rows above and below are offset by half an egg
    var d = this.narrow(r) ? 0 : -1, out = [];
    var cand = [[r, c - 1], [r, c + 1], [r - 1, c + d], [r - 1, c + d + 1], [r + 1, c + d], [r + 1, c + d + 1]];
    for (var i = 0; i < 6; i++) {
      var q = cand[i];
      if (q[0] >= 0 && q[1] >= 0 && q[1] < this.cols(q[0])) out.push(q);
    }
    return out;
  };

  Grid.prototype.touches = function (r, c) {
    var self = this;
    return r === 0 || this.neighbors(r, c).some(function (n) { return self.get(n[0], n[1]) >= 0; });
  };

  // Eggs of the same colour joined to (r, c): [[r, c, kind, steps from (r, c)]].
  Grid.prototype.group = function (r, c) {
    var k = this.get(r, c), out = [], seen = {};
    if (k < 0 || k > 5) return out;
    seen[r + ',' + c] = 1;
    out.push([r, c, k, 0]);
    for (var i = 0; i < out.length; i++) {
      var ns = this.neighbors(out[i][0], out[i][1]);
      for (var j = 0; j < ns.length; j++) {
        var key = ns[j][0] + ',' + ns[j][1];
        if (!seen[key] && this.get(ns[j][0], ns[j][1]) === k) { seen[key] = 1; out.push([ns[j][0], ns[j][1], k, out[i][3] + 1]); }
      }
    }
    return out;
  };

  // Eggs no longer hanging from the ceiling (through other eggs): [[r, c, kind]].
  Grid.prototype.loose = function () {
    var seen = {}, queue = [], out = [], self = this;
    for (var c = 0; c < this.cols(0); c++) if (this.get(0, c) >= 0) { seen['0,' + c] = 1; queue.push([0, c]); }
    for (var i = 0; i < queue.length; i++) {
      this.neighbors(queue[i][0], queue[i][1]).forEach(function (n) {
        var key = n[0] + ',' + n[1];
        if (!seen[key] && self.get(n[0], n[1]) >= 0) { seen[key] = 1; queue.push(n); }
      });
    }
    this.each(function (r, c, k) { if (!seen[r + ',' + c]) out.push([r, c, k]); });
    return out;
  };

  // Puts egg `kind` into cell (r, c) and works out what hatches. hr = row of the egg it touched (-1: the cloud).
  // Returns { type: 'match'|'stick'|'bomb'|'bolt', k, gone: [[r, c, kind, order]], drop: [[r, c, kind]], rows (bolt) }.
  function resolve(g, r, c, kind, pickColor, hr) {
    var res = { type: 'stick', k: kind, gone: [], drop: [] };
    if (kind === BOMB) {
      res.type = 'bomb';
      var bx = g.x(r, c), by = r * ROWH, lim = sq(P.bombR * D + 0.5);
      g.each(function (r2, c2, k2) {
        var d2 = sq(g.x(r2, c2) - bx) + sq(r2 * ROWH - by);
        if (d2 <= lim) res.gone.push([r2, c2, k2, Math.sqrt(d2) / D]);
      });
    } else if (kind === BOLT) {
      // the row it sticks in, and the row of the egg it touched (so it never zaps an empty row)
      res.type = 'bolt';
      res.rows = [r];
      if (hr != null && hr >= 0 && hr !== r) res.rows.push(hr);
      res.rows.forEach(function (rr) {
        for (var c2 = 0; c2 < g.cols(rr); c2++) {
          var k2 = g.get(rr, c2);
          if (k2 >= 0) res.gone.push([rr, c2, k2, Math.abs(g.x(rr, c2) - g.x(r, c)) / D]);
        }
      });
    } else {
      if (kind === RAINBOW) { kind = rainbowColor(g, r, c, pickColor); res.rainbow = true; }
      res.k = kind;
      g.set(r, c, kind);
      var grp = g.group(r, c);
      if (grp.length >= 3) { res.type = 'match'; res.gone = grp; }
    }
    res.gone.forEach(function (e) { g.rows[e[0]][e[1]] = EMPTY; });
    if (res.gone.length) res.drop = g.loose();
    res.drop.forEach(function (e) { g.rows[e[0]][e[1]] = EMPTY; });
    g.trim();
    return res;
  }

  // A rainbow egg becomes the colour that makes the biggest group where it lands.
  function rainbowColor(g, r, c, pickColor) {
    var best = -1, bestN = 0, tried = {};
    g.neighbors(r, c).forEach(function (n) {
      var k = g.get(n[0], n[1]);
      if (k < 0 || k > 5 || tried[k]) return;
      tried[k] = 1;
      g.set(r, c, k);
      var m = g.group(r, c).length;
      if (m > bestN) { bestN = m; best = k; }
    });
    g.set(r, c, EMPTY);
    return best >= 0 ? best : pickColor();
  }

  // ---------------------------------------------------------------- world

  var CODE = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, x: STONE };
  function parseRows(list) {
    return (list || []).map(function (s) {
      return s.replace(/\s+/g, '').split('').map(function (ch) { return CODE[ch] != null ? CODE[ch] : EMPTY; });
    });
  }
  var SPECIAL = { b: BOMB, r: RAINBOW, l: BOLT };

  /* level: { rows: ['aabbccaa', 'abbccaa', ...], sp: 'brl', every: 8, first: n }
     or { endless: true, palette: [0, 1, 2, 3], sp, every, start }
     opts: { speed: 'slow'|'normal'|'fast', seed } */
  function World(level, opts) {
    opts = opts || {};
    this.level = level;
    this.endless = !!level.endless;
    this.rng = rngOf(opts.seed != null ? opts.seed : Math.floor(Math.random() * 4294967296));
    this.speed = SPEEDS[opts.speed] ? opts.speed : 'normal';
    this.palette = level.palette || [0, 1, 2, 3];
    this.specials = (level.sp || '').split('').map(function (ch) { return SPECIAL[ch]; }).filter(function (k) { return k != null; });
    this.every = level.every || 8;
    this.sinceSpecial = 0;
    this.specialAt = level.first || this.every;
    this.t = 0;
    this.state = 'play';      // 'play' | 'won' | 'lost'
    this.events = [];
    this.shot = null;
    this.shots = 0;
    this.hatched = 0;
    this.alarm = -1;          // seconds left while the alarm sounds, -1 when quiet
    this.moving = false;      // the eggs start coming down after the first shot
    this.rowsAdded = 0;
    if (this.endless) {
      this.g = new Grid([], 0);
      this.ceil = P.top - ROWH;  // one row waits above the top edge
      this.sec = SPEEDS[this.speed].endless;
      for (var i = 0; i < (level.start || 6); i++) this.fillRow(i);
    } else {
      this.g = new Grid(parseRows(level.rows), 0);
      this.g.trim();
      this.ceil = P.top;
      this.sec = SPEEDS[this.speed].stage;
    }
    this.v = ROWH / this.sec;
    this.cur = this.pick();
    this.next = this.pick();
  }

  World.prototype.cx = function (r, c) { return this.g.x(r, c); };
  World.prototype.cy = function (r) { return this.ceil + R + r * ROWH; };
  World.prototype.count = function () { return this.g.count(); };
  World.prototype.lowest = function () { return this.g.rows.length ? this.cy(this.g.rows.length - 1) + R : -1e9; };

  World.prototype.present = function () {
    var has = [], out = [];
    this.g.each(function (r, c, k) { if (k <= 5) has[k] = 1; });
    for (var k = 0; k < 6; k++) if (has[k]) out.push(k);
    return out;
  };

  World.prototype.randomColor = function () {
    var ks = this.present();
    if (!ks.length) ks = this.endless ? this.palette : [0];
    return ks[Math.floor(this.rng() * ks.length)];
  };

  // The next egg for the launcher: a colour still in the field, now and then a special one.
  World.prototype.pick = function () {
    if (this.specials.length && ++this.sinceSpecial >= this.specialAt) {
      this.sinceSpecial = 0;
      this.specialAt = this.every + Math.floor(this.rng() * 5) - 2;
      return this.specials[Math.floor(this.rng() * this.specials.length)];
    }
    return this.randomColor();
  };

  // Endless: fills row r, copying nearby colours often so groups form.
  World.prototype.fillRow = function (r) {
    var g = this.g, n = g.cols(r);
    for (var c = 0; c < n; c++) {
      var near = g.neighbors(r, c).map(function (q) { return g.get(q[0], q[1]); }).filter(function (k) { return k >= 0 && k <= 5; });
      var k = near.length && this.rng() < 0.55 ? near[Math.floor(this.rng() * near.length)] : this.palette[Math.floor(this.rng() * this.palette.length)];
      g.set(r, c, k);
    }
  };

  World.prototype.addRow = function () {
    var g = this.g;
    g.par ^= 1;
    g.rows.unshift(emptyRow(g.cols(0)));
    this.fillRow(0);
    this.ceil -= ROWH;
    this.rowsAdded++;
    this.sec = Math.max(ENDLESS_MIN, this.sec * ENDLESS_ACCEL);
    this.v = ROWH / this.sec;
    this.events.push({ type: 'row' });
  };

  World.prototype.fire = function (a) {
    if (this.state !== 'play' || this.shot) return false;
    a = clampAim(a);
    this.shot = { x: P.gunX, y: P.gunY, vx: Math.cos(a), vy: -Math.sin(a), k: this.cur };
    this.cur = this.next;
    this.next = this.pick();
    this.shots++;
    this.moving = true;
    this.events.push({ type: 'fire', k: this.shot.k, a: a });
    return true;
  };

  World.prototype.swap = function () {
    if (this.state !== 'play' || this.shot) return false;
    var k = this.cur;
    this.cur = this.next;
    this.next = k;
    this.events.push({ type: 'swap' });
    return true;
  };

  World.prototype.step = function () {
    this.t += DT;
    if (this.state !== 'play') return;
    if (!this.moving && this.endless && this.t >= P.grace) this.moving = true;
    // the eggs wait while an egg is flying (so the aiming line stays true) and while the alarm sounds
    if (this.moving && !this.shot && this.alarm < 0) {
      var v = this.v;
      if (this.endless && this.count() < 14) v *= 5;   // new rows hurry in when the field is nearly empty
      this.ceil += v * DT;
      if (this.endless) while (this.ceil >= P.top) this.addRow();
    }
    if (this.shot) this.fly();
    this.checkDanger();
  };

  World.prototype.fly = function () {
    var s = this.shot, n = Math.max(1, Math.round(P.shotSpeed * DT / P.sub));
    for (var i = 0; i < n; i++) {
      var hit = this.move(s);
      if (s.bounce) { this.events.push({ type: 'bounce', x: s.bx, y: s.by }); s.bounce = false; }
      if (hit) { this.shot = null; this.land(hit, s); return; }
    }
  };

  // Moves a flying egg P.sub px; returns the cell it sticks to, or null.
  World.prototype.move = function (s) {
    var x0 = s.x, y0 = s.y, lo = LEFT + R, hi = RIGHT - R;
    s.x += s.vx * P.sub;
    s.y += s.vy * P.sub;
    if (s.x < lo || s.x > hi) {
      var wall = s.x < lo ? lo : hi, f = (x0 - wall) / (x0 - s.x);
      s.bx = wall; s.by = y0 + (s.y - y0) * f; s.bounce = true;
      s.x = 2 * wall - s.x;
      s.vx = -s.vx;
    }
    if (s.y - R <= this.ceil) return this.snap(s.x, s.y, -1, -1);
    var rows = this.g.rows, rr = Math.floor((s.y - this.ceil - R) / ROWH), lim = sq(D * P.hit), best = null, bd = lim;
    for (var r = Math.max(0, rr - 1); r <= rr + 2 && r < rows.length; r++) {
      var row = rows[r], y = this.cy(r);
      for (var c = 0; c < row.length; c++) {
        if (row[c] < 0) continue;
        var d = sq(this.g.x(r, c) - s.x) + sq(y - s.y);
        if (d < bd) { bd = d; best = [r, c]; }
      }
    }
    return best ? this.snap(s.x, s.y, best[0], best[1]) : null;
  };

  // The free cell next to the egg that was hit (or under the ceiling) nearest to the flying egg.
  World.prototype.snap = function (x, y, hr, hc) {
    var g = this.g, self = this, best = null, bd = 1e18;
    function consider(r, c) {
      if (r < 0 || c < 0 || c >= g.cols(r) || g.get(r, c) >= 0) return;
      var d = sq(g.x(r, c) - x) + sq(self.cy(r) - y);
      if (d < bd) { bd = d; best = { r: r, c: c, hr: hr }; }
    }
    var c;
    if (hr < 0) for (c = 0; c < g.cols(0); c++) consider(0, c);
    else g.neighbors(hr, hc).forEach(function (n) { consider(n[0], n[1]); });
    if (!best) {
      var rr = Math.round((y - this.ceil - R) / ROWH);
      for (var r = Math.max(0, rr - 2); r <= rr + 2; r++) for (c = 0; c < g.cols(r); c++) if (g.touches(r, c)) consider(r, c);
    }
    return best;
  };

  World.prototype.land = function (cell, s) {
    var self = this, r = cell.r, c = cell.c;
    var res = resolve(this.g, r, c, s.k, function () { return self.randomColor(); }, cell.hr);
    function place(e) { return { r: e[0], c: e[1], k: e[2], x: self.cx(e[0], e[1]), y: self.cy(e[0]), o: e[3] || 0 }; }
    var ev = {
      type: res.type, r: r, c: c, x: this.cx(r, c), y: this.cy(r), k: res.k, shot: s.k, rainbow: !!res.rainbow,
      gone: res.gone.map(place), drop: res.drop.map(place),
      ys: (res.rows || []).map(function (rr) { return self.cy(rr); })
    };
    ev.gone.concat(ev.drop).forEach(function (e) { if (e.k <= 5) self.hatched++; });
    this.events.push(ev);

    if (!this.endless && !this.present().length) {
      // every coloured egg has hatched: leftover stones crumble away
      var stones = [];
      this.g.each(function (r2, c2, k2) { stones.push(place([r2, c2, k2])); });
      this.g.rows = [];
      this.state = 'won';
      this.events.push({ type: 'win', stones: stones });
      return;
    }
    // queued eggs switch to colours that are still in the field
    var ks = this.present();
    if (ks.length) {
      if (this.cur <= 5 && ks.indexOf(this.cur) < 0) this.cur = ks[Math.floor(this.rng() * ks.length)];
      if (this.next <= 5 && ks.indexOf(this.next) < 0) this.next = ks[Math.floor(this.rng() * ks.length)];
    }
  };

  World.prototype.checkDanger = function () {
    if (this.state !== 'play') return;
    if (this.lowest() >= P.dangerY) {
      if (this.alarm < 0) { this.alarm = P.alarm; this.events.push({ type: 'alarm' }); }
      if (!this.shot) this.alarm -= DT;   // an egg on its way may still save the day
      if (this.alarm <= 0) {
        this.alarm = 0;
        this.state = 'lost';
        this.events.push({ type: 'lose' });
      }
    } else if (this.alarm >= 0) {
      this.alarm = -1;
      this.events.push({ type: 'safe' });
    }
  };

  // ---------------------------------------------------------------- aiming help (guide line, hints, test player)

  // Where an egg shot at angle a would go and stick.
  World.prototype.trace = function (a) {
    a = clampAim(a);
    var s = { x: P.gunX, y: P.gunY, vx: Math.cos(a), vy: -Math.sin(a) }, pts = [{ x: s.x, y: s.y }], hit = null;
    for (var n = 0; n < 3000 && !hit; n++) {
      hit = this.move(s);
      if (s.bounce) { pts.push({ x: s.bx, y: s.by }); s.bounce = false; }
    }
    pts.push({ x: s.x, y: s.y });
    return { a: a, pts: pts, cell: hit, x: hit ? this.cx(hit.r, hit.c) : s.x, y: hit ? this.cy(hit.r) : s.y };
  };

  // How good it would be for egg `kind` to stick in `cell`: eggs hatched, eggs dropped,
  // otherwise a little for sitting next to its own colour.
  World.prototype.value = function (cell, kind) {
    var g = this.g.clone();
    var res = resolve(g, cell.r, cell.c, kind, function () { return 0; }, cell.hr);
    var v = 0;
    res.gone.forEach(function (e) { v += e[2] <= 5 ? 1 : 0.8; });
    res.drop.forEach(function (e) { v += e[2] <= 5 ? 1.5 : 1.2; });
    if (res.type === 'stick') {
      g.neighbors(cell.r, cell.c).forEach(function (n) { if (g.get(n[0], n[1]) === res.k) v += 0.4; });
      v -= 0.02 * cell.r;
      if (this.cy(cell.r) + R >= P.dangerY - 4) v -= 3;
    } else if (!res.gone.length) v -= 1;   // a bomb or bolt that hits nothing
    return v;
  };

  // The best shot for `kind`: the angle in the middle of the widest run of angles
  // that reach the best cell. { a, cell, score, width }
  World.prototype.best = function (kind, step) {
    step = step || 0.01;
    var runs = [], run = null, vals = {};
    for (var a = P.minAim; a <= Math.PI - P.minAim + 1e-9; a += step) {
      var tr = this.trace(a);
      var key = tr.cell ? tr.cell.r + ',' + tr.cell.c : '';
      if (run && run.key === key) { run.a1 = a; run.n++; continue; }
      if (!tr.cell) { run = null; continue; }
      if (vals[key] == null) vals[key] = this.value(tr.cell, kind);
      run = { key: key, cell: tr.cell, a0: a, a1: a, n: 1, score: vals[key] };
      runs.push(run);
    }
    var best = null;
    runs.forEach(function (rn) {
      if (!best || rn.score > best.score + 1e-9 || (Math.abs(rn.score - best.score) < 1e-9 && rn.n > best.n)) best = rn;
    });
    return best ? { a: (best.a0 + best.a1) / 2, cell: best.cell, score: best.score, width: best.n * step, runs: runs } : null;
  };

  return {
    W: W, H: H, DT: DT, R: R, D: D, ROWH: ROWH, LEFT: LEFT, RIGHT: RIGHT, P: P, SPEEDS: SPEEDS,
    STONE: STONE, BOMB: BOMB, RAINBOW: RAINBOW, BOLT: BOLT, EMPTY: EMPTY,
    World: World, Grid: Grid, parseRows: parseRows, rngOf: rngOf, aimAt: aimAt, clampAim: clampAim
  };
}));
