/* ケロちゃん ぴよぴよポン — drawing (canvas 2D, world pixels).
   Sticker style: every shape gets the same warm brown outline.
   The characters are the same as in ケロちゃん もぐもぐ. */
var Draw = (function () {
  'use strict';
  var TAU = Math.PI * 2;
  var INK = '#5a3825';
  var GREEN = '#86d65c', BELLY = '#e9f9cf', CHEEK = '#ff9db6';

  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function paint(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 3; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------------------------------------------------------------- characters (from ケロちゃん もぐもぐ)

  function lilyPad(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.ellipse(0, 50, 68, 17, 0, 0.36 * Math.PI, 2.2 * Math.PI);
    ctx.closePath();
    paint(ctx, '#5dbb5f', '#2f7d3b', 3);
    ctx.strokeStyle = 'rgba(190,240,170,.7)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var i = 0; i < 5; i++) {
      var q = 0.55 * Math.PI + i * 0.3 * Math.PI;
      ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(Math.cos(q) * 50, 50 + Math.sin(q) * 12); ctx.stroke();
    }
  }

  function eyeOpen(ctx, x, y, lx, ly, k) {
    k = k || 1;
    circle(ctx, x, y, 12.5 * k); paint(ctx, '#fff', INK, 2.6);
    var px = x + lx * 4.2 * k, py = y + ly * 4.2 * k;
    circle(ctx, px, py, 6.8 * k); paint(ctx, '#2e1d14');
    circle(ctx, px - 2.3 * k, py - 2.5 * k, 2.5 * k); paint(ctx, '#fff');
    circle(ctx, px + 2.2 * k, py + 2.2 * k, 1.1 * k); paint(ctx, '#fff');
  }

  function eyeClosed(ctx, x, y, happy, fill, k) {
    k = k || 1;
    circle(ctx, x, y, 12.5 * k + 0.5); paint(ctx, fill || GREEN);
    ctx.beginPath();
    if (happy) { ctx.moveTo(x - 8 * k, y + 3 * k); ctx.quadraticCurveTo(x, y - 8 * k, x + 8 * k, y + 3 * k); }
    else { ctx.moveTo(x - 8 * k, y - k); ctx.quadraticCurveTo(x, y + 7 * k, x + 8 * k, y - k); }
    ctx.lineCap = 'round'; paint(ctx, null, INK, 3);
  }

  function bow(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.35);
    ellipse(ctx, -8, 0, 9, 6.5, -0.35); paint(ctx, '#ff7fb5', INK, 2.2);
    ellipse(ctx, 8, 0, 9, 6.5, 0.35); paint(ctx, '#ff7fb5', INK, 2.2);
    circle(ctx, 0, 0, 4); paint(ctx, '#ff5d9e', INK, 2.2);
    circle(ctx, -9, -2, 1.8); paint(ctx, 'rgba(255,255,255,.8)');
    ctx.restore();
  }

  // --- parts shared by every character (the mouth centre is the local origin)

  // Seat (lily pad or cushion) and the bouncy body transform.
  function pose(ctx, f, seat) {
    var t = f.t, mt = f.mt || 0, mode = f.mode || 'idle';
    ctx.translate(f.x, f.y);
    // slide the seat inward when the character sits near a screen edge
    var shift = Math.max(0, 72 - f.x) - Math.max(0, f.x + 72 - 360);
    ctx.save(); ctx.translate(shift * 0.6, 0);
    seat(ctx);
    ctx.restore();
    var hop = 0, sx = 1, sy = 1, breathe = Math.sin(t * 2.4) * 0.02;
    if (mode === 'happy') hop = -Math.abs(Math.sin(mt * 6.5)) * 13;
    if (mode === 'eat' && mt < 1) { var w = Math.sin(mt * 24) * 0.06 * (1 - mt); sx += w; sy -= w; }
    sx += breathe * 0.5; sy -= breathe;
    ctx.translate(0, 46 + hop); ctx.scale(sx, sy); ctx.translate(0, -46);
  }

  // Eyes follow the target; they close when blinking, happy or chewing.
  function eyes(ctx, f, ex, ey, k, fills) {
    var mode = f.mode || 'idle', mt = f.mt || 0, lx = 0, ly = 0.2;
    if (mode === 'sad') { ly = 0.8; }
    else if (f.look) {
      var dx = f.look.x - f.x, dy = f.look.y - (f.y + ey), d = Math.sqrt(dx * dx + dy * dy) || 1;
      lx = dx / d; ly = dy / d;
    }
    if (mode === 'happy' || (mode === 'eat' && mt > 0.25)) { eyeClosed(ctx, -ex, ey, true, fills[0], k); eyeClosed(ctx, ex, ey, true, fills[1], k); }
    else if (f.blink) { eyeClosed(ctx, -ex, ey, false, fills[0], k); eyeClosed(ctx, ex, ey, false, fills[1], k); }
    else { eyeOpen(ctx, -ex, ey, lx, ly, k); eyeOpen(ctx, ex, ey, lx, ly, k); }
    if (mode === 'sad' || f.worry) {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-ex - 8, ey - 18); ctx.lineTo(-ex + 6, ey - 14); paint(ctx, null, INK, 2.6);
      ctx.beginPath(); ctx.moveTo(ex + 8, ey - 18); ctx.lineTo(ex - 6, ey - 14); paint(ctx, null, INK, 2.6);
    }
  }

  function cheeks(ctx, f, cx, cy) {
    var puffed = f.mode === 'eat' && (f.mt || 0) < 1.1;
    ellipse(ctx, -cx, cy, puffed ? 11 : 8.5, puffed ? 7 : 5.5); paint(ctx, CHEEK);
    ellipse(ctx, cx, cy, puffed ? 11 : 8.5, puffed ? 7 : 5.5); paint(ctx, CHEEK);
  }

  // Mouth while chewing / sad / happy / wide open; `idle` draws the resting mouth.
  function mouth(ctx, f, y, idle) {
    var mode = f.mode || 'idle', mt = f.mt || 0, o = f.open || 0;
    ctx.lineCap = 'round';
    if (mode === 'eat' && mt < 1.1) {
      var chew = 0.5 + 0.5 * Math.sin(mt * 18);
      ellipse(ctx, 0, y + 5, 7 + 3 * chew, 2 + 4 * chew); paint(ctx, '#b0304f', INK, 2.4);
    } else if (mode === 'sad') {
      ctx.beginPath(); ctx.moveTo(-10, y + 9); ctx.quadraticCurveTo(0, y, 10, y + 9); paint(ctx, null, INK, 3);
    } else if (mode === 'happy') {
      ctx.beginPath(); ctx.moveTo(-14, y); ctx.quadraticCurveTo(0, y + 20, 14, y); ctx.closePath();
      paint(ctx, '#b0304f', INK, 2.6);
      ctx.save(); ctx.clip(); ellipse(ctx, 0, y + 12, 9, 5); paint(ctx, '#ff7ea0'); ctx.restore();
    } else if (o > 0.04) {
      var rx = 7 + 15 * o, ry = 3 + 13 * o;
      ellipse(ctx, 0, y + 6, rx, ry); paint(ctx, '#b0304f', INK, 2.6);
      ctx.save(); ellipse(ctx, 0, y + 6, rx - 1, ry - 1); ctx.clip();
      ellipse(ctx, 0, y + 6 + ry * 0.75, rx * 0.6, ry * 0.5); paint(ctx, '#ff7ea0');
      ctx.restore();
    } else idle();
  }

  function tears(ctx, f, ex) {
    if (f.mode !== 'sad') return;
    for (var s = -1; s <= 1; s += 2) {
      var ty = f.y - 8 + (((f.mt || 0) * 40 + (s + 1) * 9) % 26);
      teardrop(ctx, f.x + s * ex, ty, 4.5);
    }
  }

  // A drop of sweat while the alarm sounds.
  function sweat(ctx, f, x) {
    if (!f.worry) return;
    var ph = ((f.t || 0) * 1.6) % 1;
    ctx.save(); ctx.globalAlpha = 1 - ph * 0.6;
    teardrop(ctx, f.x + x, f.y - 40 + ph * 14, 5);
    ctx.restore();
  }

  /* f = { x, y, t, look:{x,y}|null, open:0..1, mode:'idle'|'eat'|'happy'|'sad', mt, blink, worry, kind,
           hold: function(ctx) drawing what the character hugs (local origin = mouth) } */
  function frog(ctx, f) {
    ctx.save();
    pose(ctx, f, lilyPad);
    // body silhouette: outline all parts first, then fill, so they merge
    var parts = [[0, 14, 45, 36], [-20, -20, 17, 17], [20, -20, 17, 17], [-28, 43, 15, 7], [28, 43, 15, 7]];
    ctx.lineJoin = 'round';
    parts.forEach(function (p) { ellipse(ctx, p[0], p[1], p[2], p[3]); paint(ctx, null, INK, 6); });
    parts.forEach(function (p) { ellipse(ctx, p[0], p[1], p[2], p[3]); paint(ctx, GREEN); });
    ellipse(ctx, 0, 24, 29, 21); paint(ctx, BELLY);
    if (f.hold) f.hold(ctx);
    // little hands on the tummy
    ellipse(ctx, -30, 26, 8, 11, 0.35); paint(ctx, GREEN, INK, 2.4);
    ellipse(ctx, 30, 26, 8, 11, -0.35); paint(ctx, GREEN, INK, 2.4);
    // spots
    circle(ctx, -33, 2, 3.2); paint(ctx, 'rgba(70,160,50,.35)');
    circle(ctx, 36, 8, 2.4); paint(ctx, 'rgba(70,160,50,.35)');
    eyes(ctx, f, 20, -22, 1, [GREEN, GREEN]);
    bow(ctx, 30, -38);
    cheeks(ctx, f, 31, 4);
    mouth(ctx, f, 0, function () {
      ctx.beginPath(); ctx.moveTo(-12, 1); ctx.quadraticCurveTo(0, 12, 12, 1); paint(ctx, null, INK, 3);
    });
    ctx.restore();
    tears(ctx, f, 22);
    sweat(ctx, f, -40);
  }

  // --- friends from the shop: ミミちゃん (rabbit), ニャーちゃん (cat), ワンちゃん (dog)

  var FRIENDS = {
    rabbit: { body: '#fffaf6', belly: '#ffeef3', inner: '#ffb6ca', seat: '#ffc9dc', seat2: '#ff8fb8', nose: '#ff8fae' },
    cat: { body: '#ffcf8f', belly: '#fff3dd', inner: '#ffb3a7', stripe: '#ec9a4a', seat: '#ddd0ff', seat2: '#a98bf0', nose: '#ff8fa3' },
    dog: { body: '#f5d6ad', belly: '#fff6e9', ear: '#b88456', patch: '#e6b884', seat: '#c7e7ff', seat2: '#7cc0f0', nose: '#3a2618' }
  };

  function cushion(ctx, sp) {
    ellipse(ctx, 0, 52, 64, 15); paint(ctx, sp.seat, INK, 3);
    ellipse(ctx, -4, 48, 46, 7); paint(ctx, 'rgba(255,255,255,.45)');
    circle(ctx, -62, 56, 4.5); paint(ctx, sp.seat2, INK, 2);
    circle(ctx, 62, 56, 4.5); paint(ctx, sp.seat2, INK, 2);
  }

  function buddy(ctx, f, kind) {
    var sp = FRIENDS[kind], t = f.t, mode = f.mode || 'idle', i, k;
    var excited = mode === 'happy' || (f.open || 0) > 0.3;
    ctx.save();
    pose(ctx, f, function (c) { cushion(c, sp); });
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // tails peek out from behind
    if (kind === 'cat') {
      ctx.save(); ctx.translate(36, 40); ctx.rotate(Math.sin(t * 2.2) * 0.18);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(26, 2, 34, -22, 22, -40);
      paint(ctx, null, INK, 14); paint(ctx, null, sp.body, 8.5);
      ctx.beginPath(); ctx.moveTo(28, -28); ctx.quadraticCurveTo(27, -35, 22, -40);
      paint(ctx, null, sp.stripe, 8.5);
      ctx.restore();
    } else if (kind === 'dog') {
      ctx.save(); ctx.translate(38, 36); ctx.rotate(-0.5 + Math.sin(t * (excited ? 16 : 5)) * 0.35);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(18, -6, 20, -24);
      paint(ctx, null, INK, 13); paint(ctx, null, sp.body, 7.5);
      ctx.restore();
    }
    // ears behind the head
    if (kind === 'rabbit') {
      for (i = -1; i <= 1; i += 2) {
        ctx.save(); ctx.translate(i * 15, -26); ctx.rotate(i * 0.16 + (i > 0 ? Math.sin(t * 1.6) * 0.06 : 0));
        ellipse(ctx, 0, -30, 11.5, 31); paint(ctx, sp.body, INK, 3);
        ellipse(ctx, 0, -27, 5.5, 21); paint(ctx, sp.inner);
        ctx.restore();
      }
    } else if (kind === 'cat') {
      for (i = -1; i <= 1; i += 2) {
        ctx.beginPath(); ctx.moveTo(i * 12, -28); ctx.lineTo(i * 33, -60); ctx.lineTo(i * 44, -16); ctx.closePath();
        paint(ctx, sp.body, INK, 3);
        ctx.beginPath(); ctx.moveTo(i * 19, -28); ctx.lineTo(i * 32, -50); ctx.lineTo(i * 38, -24); ctx.closePath();
        paint(ctx, sp.inner);
      }
    }
    // round body: head and body in one, like a daifuku
    ellipse(ctx, 0, 10, 46, 42); paint(ctx, sp.body, INK, 3.2);
    ellipse(ctx, 0, 30, 28, 18); paint(ctx, sp.belly);
    if (kind === 'cat') {
      [[-7, -31, -5, -22], [0, -33, 0, -23], [7, -31, 5, -22]].forEach(function (l) {
        ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); paint(ctx, null, sp.stripe, 3.2);
      });
    }
    if (kind === 'dog') { ellipse(ctx, 17, -11, 13, 11.5, 0.2); paint(ctx, sp.patch); }
    if (f.hold) f.hold(ctx);
    // paws
    ellipse(ctx, -30, 32, 8.5, 10, 0.3); paint(ctx, sp.body, INK, 2.4);
    ellipse(ctx, 30, 32, 8.5, 10, -0.3); paint(ctx, sp.body, INK, 2.4);
    // the dog's floppy ears hang in front
    if (kind === 'dog') {
      for (i = -1; i <= 1; i += 2) {
        ctx.save(); ctx.translate(i * 38, -22); ctx.rotate(-i * 0.35 + i * Math.sin(t * 3) * 0.05);
        ellipse(ctx, 0, 14, 11, 21); paint(ctx, sp.ear, INK, 3);
        ctx.restore();
      }
    }
    eyes(ctx, f, 17, -10, 0.85, [sp.body, kind === 'dog' ? sp.patch : sp.body]);
    cheeks(ctx, f, 29, 7);
    // nose
    if (kind === 'dog') {
      ellipse(ctx, 0, -1, 6.5, 5); paint(ctx, sp.nose);
      ellipse(ctx, -2, -2.6, 2, 1.2); paint(ctx, 'rgba(255,255,255,.7)');
    } else {
      ctx.beginPath(); ctx.moveTo(-4.5, -3); ctx.lineTo(4.5, -3); ctx.lineTo(0, 2); ctx.closePath();
      paint(ctx, sp.nose, INK, 1.6);
    }
    mouth(ctx, f, 4, function () {
      ctx.beginPath(); ctx.moveTo(-9, 5); ctx.quadraticCurveTo(-4.5, 11, 0, 6); ctx.quadraticCurveTo(4.5, 11, 9, 5);
      paint(ctx, null, INK, 2.6);
      if (kind === 'dog') { ellipse(ctx, 0, 12, 4.5, 5.5); paint(ctx, '#ff7ea0', INK, 2); }
    });
    if (kind === 'cat') {
      ctx.strokeStyle = 'rgba(90,56,37,.75)'; ctx.lineWidth = 1.6;
      for (i = -1; i <= 1; i += 2) {
        for (k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(i * 23, 4 + k * 4); ctx.lineTo(i * 43, 2 + k * 7); ctx.stroke(); }
      }
    }
    ctx.restore();
    tears(ctx, f, 17);
    sweat(ctx, f, -44);
  }

  function critter(ctx, f) {
    if (FRIENDS[f.kind]) buddy(ctx, f, f.kind);
    else frog(ctx, f);
  }

  function teardrop(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.8);
    ctx.quadraticCurveTo(x + r * 1.2, y, x, y + r);
    ctx.quadraticCurveTo(x - r * 1.2, y, x, y - r * 1.8);
    paint(ctx, '#8fd3ff', '#3f8fc9', 1.6);
  }

  // ---------------------------------------------------------------- eggs

  // kinds 0-5: colours (each with its own pattern, so they differ by more than colour)
  var EGGS = [
    { fill: '#ff94c2', light: '#ffd3e6', pat: 'dots' },     // pink
    { fill: '#ffd23d', light: '#fff4b0', pat: 'zigzag' },   // yellow
    { fill: '#66c3ff', light: '#d4f0ff', pat: 'waves' },    // blue
    { fill: '#8bd86a', light: '#dcf7c8', pat: 'spots' },    // green
    { fill: '#b48cff', light: '#ece2ff', pat: 'stars' },    // purple
    { fill: '#ffa552', light: '#ffe3c4', pat: 'hearts' }    // orange
  ];
  var STONE = 6, BOMB = 7, RAINBOW = 8, BOLT = 9;
  var RAINBOW_BANDS = ['#ff8fb8', '#ffb35c', '#ffe066', '#8fe07a', '#6cc6ff', '#b48cff'];

  function eggPath(ctx, r) {
    var w = r * 0.86, top = -r, bot = r * 0.98;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.bezierCurveTo(w * 0.6, top, w, -r * 0.3, w, r * 0.18);
    ctx.bezierCurveTo(w, r * 0.68, w * 0.56, bot, 0, bot);
    ctx.bezierCurveTo(-w * 0.56, bot, -w, r * 0.68, -w, r * 0.18);
    ctx.bezierCurveTo(-w, -r * 0.3, -w * 0.6, top, 0, top);
    ctx.closePath();
  }

  function starPath(ctx, R, r) {
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var q = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r : R;
      if (k) ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); else ctx.moveTo(Math.cos(q) * rr, Math.sin(q) * rr);
    }
    ctx.closePath();
  }

  function heartShape(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10);
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.bezierCurveTo(-12, -1, -7, -12, 0, -5);
    ctx.bezierCurveTo(7, -12, 12, -1, 0, 7);
    ctx.closePath();
    ctx.restore();
  }

  function pattern(ctx, e, r) {
    var i;
    ctx.fillStyle = e.light; ctx.strokeStyle = e.light; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (e.pat === 'dots') {
      [[-0.42, -0.2, 0.13], [0.3, -0.42, 0.11], [0.5, 0.15, 0.13], [-0.05, 0.3, 0.14], [-0.5, 0.52, 0.11], [0.25, 0.66, 0.1]].forEach(function (d) {
        circle(ctx, d[0] * r, d[1] * r, d[2] * r); ctx.fill();
      });
    } else if (e.pat === 'zigzag') {
      ctx.lineWidth = r * 0.2;
      ctx.beginPath();
      for (i = 0; i <= 6; i++) { var zx = -r + i * r / 3, zy = r * 0.16 + (i % 2 ? -r * 0.16 : r * 0.1); if (i) ctx.lineTo(zx, zy); else ctx.moveTo(zx, zy); }
      ctx.stroke();
    } else if (e.pat === 'waves') {
      ctx.lineWidth = r * 0.14;
      [-0.18, 0.4].forEach(function (y0) {
        ctx.beginPath();
        for (var k = 0; k <= 16; k++) { var wx = -r + k * r / 8, wy = y0 * r + Math.sin(k * 1.1) * r * 0.1; if (k) ctx.lineTo(wx, wy); else ctx.moveTo(wx, wy); }
        ctx.stroke();
      });
    } else if (e.pat === 'spots') {
      ctx.fillStyle = 'rgba(70,160,50,.3)';
      ellipse(ctx, -0.36 * r, 0.12 * r, 0.24 * r, 0.2 * r, 0.4); ctx.fill();
      ellipse(ctx, 0.38 * r, -0.3 * r, 0.17 * r, 0.14 * r, -0.3); ctx.fill();
      ellipse(ctx, 0.3 * r, 0.52 * r, 0.2 * r, 0.16 * r); ctx.fill();
    } else if (e.pat === 'stars') {
      [[-0.36, 0.06, 0.2], [0.38, -0.3, 0.15], [0.28, 0.5, 0.17]].forEach(function (s) {
        ctx.save(); ctx.translate(s[0] * r, s[1] * r); starPath(ctx, s[2] * r, s[2] * r * 0.48); ctx.fill(); ctx.restore();
      });
    } else if (e.pat === 'hearts') {
      [[-0.34, 0.1, 0.26], [0.38, -0.26, 0.2], [0.24, 0.52, 0.22]].forEach(function (h) { heartShape(ctx, h[0] * r, h[1] * r, h[2] * r); ctx.fill(); });
    }
  }

  function shine(ctx, r) {
    ellipse(ctx, -r * 0.4, -r * 0.46, r * 0.2, r * 0.12, -0.75); paint(ctx, 'rgba(255,255,255,.9)');
    circle(ctx, -r * 0.14, -r * 0.7, r * 0.06); paint(ctx, 'rgba(255,255,255,.9)');
  }

  function outlineW(r) { return Math.max(1.6, 2.6 * r / 21); }

  // Egg body of any kind at the local origin (no outline).
  function eggFill(ctx, kind, r, t) {
    var i;
    if (kind <= 5) {
      var e = EGGS[kind];
      eggPath(ctx, r); paint(ctx, e.fill);
      ctx.save(); eggPath(ctx, r); ctx.clip(); pattern(ctx, e, r); ctx.restore();
    } else if (kind === STONE) {
      eggPath(ctx, r); paint(ctx, '#bdb4aa');
      ctx.save(); eggPath(ctx, r); ctx.clip();
      ctx.fillStyle = 'rgba(120,105,90,.28)';
      ellipse(ctx, 0.3 * r, 0.45 * r, 0.45 * r, 0.3 * r, 0.3); ctx.fill();
      ellipse(ctx, -0.45 * r, -0.1 * r, 0.22 * r, 0.16 * r); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-0.1 * r, -0.9 * r); ctx.lineTo(0.05 * r, -0.5 * r); ctx.lineTo(-0.15 * r, -0.25 * r); ctx.lineTo(0.1 * r, 0.05 * r);
      ctx.moveTo(0.05 * r, -0.5 * r); ctx.lineTo(0.35 * r, -0.4 * r);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; paint(ctx, null, 'rgba(90,70,55,.55)', r * 0.08);
      ctx.restore();
    } else if (kind === BOMB) {
      eggPath(ctx, r); paint(ctx, '#4d456b');
      ctx.save(); eggPath(ctx, r); ctx.clip();
      roundRect(ctx, -r, r * 0.05, 2 * r, r * 0.26, 0); paint(ctx, '#ff7a9c');
      ctx.restore();
      ctx.save(); ctx.translate(0, r * 0.18); starPath(ctx, r * 0.24, r * 0.11); paint(ctx, '#ffe066'); ctx.restore();
    } else if (kind === RAINBOW) {
      eggPath(ctx, r); paint(ctx, '#fff');
      ctx.save(); eggPath(ctx, r); ctx.clip();
      var off = ((t || 0) * 0.5 % 1) * r * 0.36;
      for (i = -1; i < 7; i++) {
        ctx.fillStyle = RAINBOW_BANDS[(i + 6) % 6];
        ctx.fillRect(-r, -r + i * r * 0.36 + off, 2 * r, r * 0.37);
      }
      ctx.restore();
    } else if (kind === BOLT) {
      eggPath(ctx, r); paint(ctx, '#fffaf0');
      ctx.save(); eggPath(ctx, r); ctx.clip();
      circle(ctx, 0, r * 0.1, r * 0.8); paint(ctx, 'rgba(255,230,120,.45)');
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(r * 0.12, -r * 0.72); ctx.lineTo(-r * 0.38, r * 0.12); ctx.lineTo(-r * 0.02, r * 0.12);
      ctx.lineTo(-r * 0.16, r * 0.78); ctx.lineTo(r * 0.4, -r * 0.1); ctx.lineTo(r * 0.04, -r * 0.1); ctx.closePath();
      ctx.lineJoin = 'round'; paint(ctx, '#ffd23d', INK, Math.max(1.2, r * 0.07));
    }
  }

  /* An egg at (x, y); r = size, t = time (for the animated kinds), rot = tilt. */
  function egg(ctx, kind, x, y, r, t, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    if (kind === BOLT) {   // soft glow so it stands out from the white of the clouds
      var gl = 0.35 + 0.25 * Math.sin((t || 0) * 6);
      circle(ctx, 0, 0, r * 1.18); paint(ctx, 'rgba(255,236,120,' + gl.toFixed(3) + ')');
    }
    eggFill(ctx, kind, r, t);
    eggPath(ctx, r); ctx.lineJoin = 'round'; paint(ctx, null, INK, outlineW(r));
    shine(ctx, r);
    if (kind === BOMB) fuse(ctx, r, t || 0);
    ctx.restore();
  }

  function fuse(ctx, r, t) {
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(r * 0.05, -r * 1.35, r * 0.4, -r * 1.35);
    paint(ctx, null, INK, r * 0.2); paint(ctx, null, '#e9c58f', r * 0.1);
    var fl = 1 + 0.25 * Math.sin(t * 30);
    sparkle(ctx, r * 0.45, -r * 1.38, r * 0.34 * fl, '#ffb13d');
    sparkle(ctx, r * 0.45, -r * 1.38, r * 0.18 * fl, '#fff6a8');
  }

  function zigzagY(i, r) { return r * 0.06 + (i % 2 ? -r * 0.15 : r * 0.12); }

  // Half an eggshell (for hatching): top = true for the upper half.
  function eggHalf(ctx, kind, x, y, r, rot, top, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath();
    var i, n = 6;
    ctx.moveTo(-r * 1.2, zigzagY(0, r));
    for (i = 0; i <= n; i++) ctx.lineTo(-r + i * 2 * r / n, zigzagY(i, r));
    ctx.lineTo(r * 1.2, zigzagY(n, r));
    ctx.lineTo(r * 1.2, top ? -r * 1.3 : r * 1.3);
    ctx.lineTo(-r * 1.2, top ? -r * 1.3 : r * 1.3);
    ctx.closePath();
    ctx.save(); ctx.clip();
    eggFill(ctx, kind > 5 && kind !== STONE ? 1 : kind, r, t);
    eggPath(ctx, r); paint(ctx, null, INK, outlineW(r));
    if (top) shine(ctx, r);
    // the broken edge
    ctx.beginPath();
    for (i = 0; i <= n; i++) { if (i) ctx.lineTo(-r + i * 2 * r / n, zigzagY(i, r)); else ctx.moveTo(-r, zigzagY(0, r)); }
    ctx.lineJoin = 'round'; paint(ctx, null, INK, outlineW(r) * 0.8);
    ctx.restore();
    ctx.restore();
  }

  // Cracks just before a chick comes out (k = 0..1).
  function cracks(ctx, x, y, r, k) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    var n = Math.max(1, Math.round(6 * k));
    ctx.moveTo(-r * 0.86, zigzagY(0, r));
    for (var i = 1; i <= n; i++) ctx.lineTo(-r + i * 2 * r / 6, zigzagY(i, r));
    paint(ctx, null, INK, 2);
    ctx.restore();
  }

  // ---------------------------------------------------------------- chicks

  /* A chick (about 15 px radius at s = 1). o: { flap: wing phase, happy, run, shell: egg kind worn as a hat, dir } */
  function chick(ctx, x, y, s, t, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // feet
    if (!o.fly) {
      var st = o.run ? Math.sin(t * 22) * 3 : 0;
      ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(-6 - st, 18); ctx.moveTo(5, 12); ctx.lineTo(6 + st, 18);
      paint(ctx, null, '#f08a2a', 3);
    }
    // wings (behind the body, flapping when flying)
    var wa = o.flap != null ? Math.sin(o.flap) * 0.9 : 0;
    for (var side = -1; side <= 1; side += 2) {
      ctx.save(); ctx.translate(side * 12, 2); ctx.rotate(side * (0.5 + wa));
      ellipse(ctx, side * 4, -2, 7.5, 4.5); paint(ctx, '#ffd23d', INK, 2.2);
      ctx.restore();
    }
    circle(ctx, 0, 0, 15); paint(ctx, '#ffe45c', INK, 2.6);
    ellipse(ctx, 0, 6, 9.5, 7); paint(ctx, '#fff3a6');
    // tuft
    ctx.beginPath(); ctx.moveTo(-3, -14); ctx.quadraticCurveTo(-5, -21, 0, -20); ctx.quadraticCurveTo(1, -17, 0, -14.5);
    ctx.moveTo(1, -14.5); ctx.quadraticCurveTo(4, -20, 7, -17);
    paint(ctx, null, INK, 2);
    var dx = o.dir ? o.dir * 2 : 0;
    if (o.happy) {
      ctx.beginPath(); ctx.moveTo(-8 + dx, -2); ctx.quadraticCurveTo(-5 + dx, -6, -2 + dx, -2);
      ctx.moveTo(2 + dx, -2); ctx.quadraticCurveTo(5 + dx, -6, 8 + dx, -2);
      paint(ctx, null, INK, 2);
    } else {
      circle(ctx, -5 + dx, -3, 2.5); paint(ctx, '#2e1d14');
      circle(ctx, 5 + dx, -3, 2.5); paint(ctx, '#2e1d14');
      circle(ctx, -5.8 + dx, -3.9, 0.9); paint(ctx, '#fff');
      circle(ctx, 4.2 + dx, -3.9, 0.9); paint(ctx, '#fff');
    }
    ellipse(ctx, -9 + dx, 3, 3.2, 2); paint(ctx, CHEEK);
    ellipse(ctx, 9 + dx, 3, 3.2, 2); paint(ctx, CHEEK);
    // beak
    ctx.beginPath(); ctx.moveTo(-3.6 + dx, 1); ctx.lineTo(dx, -1.2); ctx.lineTo(3.6 + dx, 1); ctx.lineTo(dx, 4.4); ctx.closePath();
    paint(ctx, '#ff9f43', INK, 1.5);
    ctx.beginPath(); ctx.moveTo(-3.2 + dx, 1.1); ctx.lineTo(3.2 + dx, 1.1); paint(ctx, null, 'rgba(90,56,37,.5)', 1);
    // eggshell hat
    if (o.shell != null) eggHalf(ctx, o.shell, 1, -13, 12, -0.22, true, t);
    ctx.restore();
  }

  // ---------------------------------------------------------------- the field

  // The fluffy cloud the eggs hang from; y = its lower edge, y0 = top of the visible area.
  function ceiling(ctx, x0, x1, y0, y, t) {
    var n = 10, step = (x1 - x0) / n, i, bumps = [];
    for (i = -1; i <= n + 1; i++) bumps.push([x0 + (i + 0.5) * step, y - 2 + Math.sin(i * 1.9) * 3, 15 + (i % 2) * 5 + Math.sin(t * 1.2 + i) * 1.2]);
    ctx.save();
    bumps.forEach(function (b) { circle(ctx, b[0], b[1], b[2]); paint(ctx, null, '#8fb9e0', 5); });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x0, y0, x1 - x0, y - y0);
    bumps.forEach(function (b) { circle(ctx, b[0], b[1], b[2]); paint(ctx, '#ffffff'); });
    // soft puffs inside, so a tall cloud still looks fluffy
    ctx.strokeStyle = 'rgba(160,200,240,.2)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var ry = y - 34, k = 0; ry > y0 - 20; ry -= 46, k++) {
      for (var rx = x0 + (k % 2 ? 50 : 10); rx < x1 + 30; rx += 100) {
        ctx.beginPath(); ctx.arc(rx, ry, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(rx + 30, ry + 4, 16, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
    }
    for (i = 0; i < n; i += 3) { ellipse(ctx, x0 + (i + 0.8) * step, y - 12, 10, 3.5, -0.2); paint(ctx, 'rgba(200,225,255,.8)'); }
    ctx.restore();
  }

  // Soft side walls the eggs bounce off.
  function walls(ctx, left, right, y0, y1, x0, x1) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(x0, y0, left - x0, y1 - y0);
    ctx.fillRect(right, y0, x1 - right, y1 - y0);
    ctx.strokeStyle = 'rgba(90,56,37,.22)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left, y0); ctx.lineTo(left, y1); ctx.moveTo(right, y0); ctx.lineTo(right, y1); ctx.stroke();
    ctx.restore();
  }

  // The line the eggs must not reach. near = 0..1 (how close the eggs are), alarm = true while it sounds.
  function dangerLine(ctx, x0, x1, y, t, near, alarm) {
    ctx.save();
    var red = alarm ? 0.5 + 0.5 * Math.sin(t * 14) : near;
    ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 20; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    ctx.strokeStyle = 'rgba(90,56,37,' + (0.25 + 0.3 * red).toFixed(3) + ')'; ctx.lineWidth = 7; ctx.stroke();
    var rr = 255, gg = Math.round(255 - 150 * red), bb = Math.round(255 - 160 * red);
    ctx.strokeStyle = 'rgb(' + rr + ',' + gg + ',' + bb + ')'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.restore();
  }

  // The launcher: a nest on a spring. y = the egg's centre, kick = 0..1 just after a shot.
  function launcher(ctx, x, y, t, kick) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var bob = Math.sin(kick * Math.PI) * 6;
    // base
    ellipse(ctx, 0, 64, 32, 9); paint(ctx, '#ffc2dc', INK, 3);
    ellipse(ctx, -6, 62, 18, 3.5); paint(ctx, 'rgba(255,255,255,.6)');
    // spring
    ctx.beginPath();
    var top = 30 - bob, bot = 60, n = 5;
    ctx.moveTo(0, bot);
    for (var i = 1; i <= n * 2; i++) ctx.lineTo(i % 2 ? 11 : -11, bot + (top - bot) * i / (n * 2));
    ctx.lineTo(0, top);
    paint(ctx, null, INK, 6); paint(ctx, null, '#9fd8ff', 3.2);
    // nest
    ctx.translate(0, -bob);
    ctx.beginPath(); ctx.moveTo(-30, 10); ctx.quadraticCurveTo(-28, 34, 0, 34); ctx.quadraticCurveTo(28, 34, 30, 10); ctx.closePath();
    paint(ctx, '#c98e57', INK, 3);
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,70,30,.55)'; ctx.lineWidth = 2;
    for (i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-32, 14 + i * 5); ctx.quadraticCurveTo(0, 20 + i * 5 + (i % 2 ? 4 : -2), 32, 12 + i * 5); ctx.stroke(); }
    ctx.restore();
    ellipse(ctx, 0, 10, 30, 7); paint(ctx, '#e3b07a', INK, 3);
    ellipse(ctx, 0, 10, 22, 4); paint(ctx, '#8a5a33');
    ctx.restore();
  }

  // Arrow showing where the egg will go.
  function arrow(ctx, x, y, a, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-a);
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(26, -5); ctx.lineTo(56, -5); ctx.lineTo(56, -12); ctx.lineTo(72, 0); ctx.lineTo(56, 12); ctx.lineTo(56, 5); ctx.lineTo(26, 5);
    ctx.quadraticCurveTo(22, 0, 26, -5); ctx.closePath();
    paint(ctx, '#fff27a', INK, 3);
    ctx.restore();
  }

  // Dotted path of the aim; the dots drift forward.
  function guide(ctx, pts, t, color) {
    var total = 0, i, segs = [];
    for (i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y, L = Math.sqrt(dx * dx + dy * dy);
      segs.push({ a: pts[i - 1], dx: dx, dy: dy, L: L, s: total });
      total += L;
    }
    var gap = 17, off = (t * 40) % gap;
    ctx.save();
    for (var d = 30 + off; d < total - 8; d += gap) {
      for (i = 0; i < segs.length && segs[i].s + segs[i].L < d; i++);
      var sg = segs[Math.min(i, segs.length - 1)], k = (d - sg.s) / (sg.L || 1);
      var px = sg.a.x + sg.dx * k, py = sg.a.y + sg.dy * k;
      circle(ctx, px, py, 4.6); paint(ctx, color || '#ffffff', 'rgba(90,56,37,.55)', 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- effects

  function star(ctx, x, y, t, i, scale) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.6 + i * 1.7) * 3);
    ctx.rotate(Math.sin(t * 1.8 + i) * 0.12);
    ctx.scale(scale || 1, scale || 1);
    ctx.lineJoin = 'round';
    starPath(ctx, 18, 9.5); paint(ctx, '#ffd93d', '#dc8f00', 3.2);
    starPath(ctx, 11, 6); paint(ctx, 'rgba(255,240,150,.7)');
    circle(ctx, -4.3, -1.5, 1.9); paint(ctx, INK);
    circle(ctx, 4.3, -1.5, 1.9); paint(ctx, INK);
    ctx.beginPath(); ctx.arc(0, 1.2, 2.6, 0.2, Math.PI - 0.2); ctx.lineCap = 'round'; paint(ctx, null, INK, 1.5);
    ctx.restore();
  }

  function heart(ctx, x, y, s, color) {
    heartShape(ctx, x, y, s);
    paint(ctx, color || '#ff6f9f', INK, 1.8);
  }

  function sparkle(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    paint(ctx, color || '#fff6a8');
  }

  // Cartoon explosion: k = 0..1.
  function boom(ctx, x, y, k) {
    ctx.save(); ctx.translate(x, y);
    var s = 0.4 + k * 1.1;
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < 20; i++) {
      var q = i / 20 * TAU, rr = (i % 2 ? 34 : 56) * s;
      if (i) ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr); else ctx.moveTo(rr, 0);
    }
    ctx.closePath();
    paint(ctx, '#ffe066', INK, 3);
    circle(ctx, 0, 0, 26 * s); paint(ctx, '#fff6c9');
    ctx.restore();
  }

  // Lightning across a row: k = 0..1.
  function lightning(ctx, x0, x1, y, k, seed) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var n = 14;
    for (var i = 0; i <= n; i++) {
      var px = x0 + (x1 - x0) * i / n, py = y + (i % 2 ? -1 : 1) * (7 + ((i * 7 + seed) % 5) * 2);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    paint(ctx, null, INK, 9); paint(ctx, null, '#ffe066', 5); paint(ctx, null, '#fffbe0', 2);
    ctx.restore();
  }

  function hand(ctx, x, y, scale, press) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(-0.35);
    ctx.lineJoin = 'round';
    var dy = press ? 3 : 0;
    // finger points at (0,0)
    roundRect(ctx, -5.5, -2 + dy, 11, 30, 5.5); paint(ctx, '#fff', INK, 2.4);
    roundRect(ctx, -13, 18 + dy, 30, 26, 11); paint(ctx, '#fff', INK, 2.4);
    roundRect(ctx, -5.5, -2 + dy, 11, 26, 5.5); paint(ctx, '#fff');
    ctx.beginPath(); ctx.moveTo(-1, 30 + dy); ctx.lineTo(-1, 36 + dy); ctx.moveTo(6, 30 + dy); ctx.lineTo(6, 36 + dy);
    ctx.lineCap = 'round'; paint(ctx, null, 'rgba(90,56,37,.5)', 1.8);
    ctx.restore();
  }

  // Big outlined word (praise, countdown).
  function word(ctx, text, x, y, size, color, k) {
    ctx.save();
    ctx.translate(x, y);
    var s = k < 0.2 ? 0.5 + k / 0.2 * 0.7 : k < 0.3 ? 1.2 - (k - 0.2) / 0.1 * 0.2 : 1;
    ctx.scale(s, s);
    ctx.globalAlpha = k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
    ctx.font = '800 ' + size + 'px "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = INK; ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color; ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // ---------------------------------------------------------------- backgrounds

  var THEMES = [
    { sky: ['#9fdcff', '#e6f7ff'], hill: ['#a4e384', '#83cf66'], deco: 'clouds' },
    { sky: ['#ffc4db', '#fff1f7'], hill: ['#b4e79a', '#8fd476'], deco: 'hearts' },
    { sky: ['#c9b6ff', '#f4efff'], hill: ['#ffd3ea', '#f7b3d7'], deco: 'sprinkles' },
    { sky: ['#ffd7a3', '#fff5e4'], hill: ['#d4ad74', '#bb9157'], deco: 'trees' },
    { sky: ['#aef0dd', '#f1fffb'], hill: ['#a9e8cd', '#86d8b6'], deco: 'rainbow' },
    { sky: ['#ffe28a', '#fffbe8'], hill: ['#a4e384', '#83cf66'], deco: 'clouds' }     // title: chick yellow
  ];

  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // Draws in world coordinates; (x0,y0,x1,y1) is the visible area (may extend past 0..W/0..H).
  function background(ctx, theme, x0, y0, x1, y1) {
    var th = THEMES[theme] || THEMES[0], r = rnd(7 + theme * 13), i;
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    var w = x1 - x0;
    if (th.deco === 'rainbow') {
      var cols = ['#ffb3c7', '#ffd59e', '#fff3a3', '#bff0b0', '#b3dcff', '#d7c2ff'];
      ctx.lineWidth = 14;
      cols.forEach(function (c, k) { ctx.beginPath(); ctx.arc(180, 330, 250 - k * 14, Math.PI, 0); ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    for (i = 0; i < 14; i++) {
      var x = x0 + r() * w, y = y0 + r() * (y1 - y0) * 0.8, s = 0.6 + r() * 0.8;
      if (th.deco === 'clouds' || th.deco === 'rainbow') {
        if (i > 6) continue;
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ellipse(ctx, x, y, 30 * s, 14 * s); ctx.fill();
        ellipse(ctx, x - 18 * s, y + 4 * s, 18 * s, 10 * s); ctx.fill();
        ellipse(ctx, x + 20 * s, y + 3 * s, 20 * s, 11 * s); ctx.fill();
      } else if (th.deco === 'hearts') {
        ctx.save(); ctx.globalAlpha = 0.35; heartShape(ctx, x, y, 9 * s); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
      } else if (th.deco === 'sprinkles') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 3);
        ctx.fillStyle = ['rgba(255,255,255,.7)', 'rgba(255,190,225,.8)', 'rgba(170,220,255,.8)', 'rgba(255,240,160,.8)'][i % 4];
        roundRect(ctx, -9 * s, -2.6, 18 * s, 5.2, 2.6); ctx.fill(); ctx.restore();
      } else if (th.deco === 'trees') {
        if (i > 7) continue;
        var ty = y1 - 70 - r() * 60;
        ctx.fillStyle = 'rgba(160,110,60,.25)';
        roundRect(ctx, x - 4 * s, ty, 8 * s, 50 * s, 3); ctx.fill();
        ctx.fillStyle = 'rgba(120,170,80,.28)';
        circle(ctx, x, ty - 6 * s, 26 * s); ctx.fill();
        circle(ctx, x - 16 * s, ty + 6 * s, 17 * s); ctx.fill();
        circle(ctx, x + 16 * s, ty + 6 * s, 17 * s); ctx.fill();
      }
    }
    // hills at the bottom
    var hy = Math.max(600, y1 - 60);
    ctx.fillStyle = th.hill[0];
    ellipse(ctx, x0 + w * 0.2, hy + 30, w * 0.55, 70); ctx.fill();
    ctx.fillStyle = th.hill[1];
    ellipse(ctx, x0 + w * 0.85, hy + 40, w * 0.6, 70); ctx.fill();
    ctx.fillRect(x0, hy + 40, w, y1 - hy);
  }

  return {
    INK: INK, THEMES: THEMES, EGGS: EGGS,
    circle: circle, ellipse: ellipse, paint: paint, roundRect: roundRect, starPath: starPath,
    frog: frog, critter: critter, egg: egg, eggHalf: eggHalf, cracks: cracks, chick: chick,
    ceiling: ceiling, walls: walls, dangerLine: dangerLine, launcher: launcher, arrow: arrow, guide: guide,
    star: star, heart: heart, sparkle: sparkle, boom: boom, lightning: lightning, hand: hand, word: word,
    background: background, teardrop: teardrop
  };
}());
