// Builds js/levels.js: each stage is a shape (mask) coloured by a pattern,
// then played many times by the pretend players in bot.js to pick a good seed
// and to set the ★ limits (par).
const fs = require('fs');
const path = require('path');
const { play, E } = require('./bot.js');

// Rows alternate 8 and 7 cells (wide / narrow). o = egg, x = stone, . = empty.
const MASKS = {
  block2: ['oooooooo', 'ooooooo'],
  block3: ['oooooooo', 'ooooooo', 'oooooooo'],
  block4: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo'],
  block5: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo'],
  block6: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo'],
  block7: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo'],
  heart: ['.oo..oo.', 'ooo.ooo', 'oooooooo', 'ooooooo', '.oooooo.', '.ooooo.', '..oooo..', '..ooo..', '...oo...'],
  heartS: ['.oo..oo.', 'ooo.ooo', 'oooooooo', '.ooooo.', '..oooo..', '..ooo..', '...oo...'],
  diamond: ['oooooooo', '..ooo..', '..oooo..', '.ooooo.', '.oooooo.', '.ooooo.', '..oooo..', '..ooo..', '...oo...'],
  vee: ['oooooooo', 'ooooooo', '.oooooo.', '.ooooo.', '..oooo..', '..ooo..', '...oo...'],
  veeS: ['oooooooo', 'ooooooo', '.oooooo.', '..ooo..', '...oo...'],
  towers: ['oooooooo', 'ooo.ooo', 'ooo..ooo', 'oo...oo', 'ooo..ooo', 'oo...oo', 'ooo..ooo'],
  arch: ['oooooooo', 'ooooooo', 'ooo..ooo', 'oo...oo', 'oo....oo', 'o.....o', 'oo....oo'],
  ball: ['oooooooo', '..ooo..', '.oooooo.', 'ooooooo', 'oooooooo', 'ooooooo', '.oooooo.', '..ooo..'],
  comb: ['oooooooo', 'ooooooo', 'oo.oo.oo', 'o.o.o.o', 'oo.oo.oo', 'o.o.o.o'],
  holes: ['oooooooo', 'o.o.o.o', 'oooooooo', 'o.o.o.o', 'oooooooo', 'ooooooo'],
  stairs: ['oooooooo', 'ooooooo', 'oooooo..', 'ooooo..', 'oooo....', 'ooo....', 'oo......'],
  stairsR: ['oooooooo', 'ooooooo', '..oooooo', '..ooooo', '....oooo', '....ooo', '......oo'],
  hourglass: ['oooooooo', 'ooooooo', '.oooooo.', '..ooo..', '..oooo..', '.ooooo.', 'oooooooo'],
  bridge: ['oooooooo', 'ooooooo', 'oooooooo', 'oo...oo', 'o......o', 'oo...oo', 'oooooooo'],
  flower: ['oooooooo', '.oo.oo.', '.oooooo.', 'ooooooo', '.oooooo.', '.oo.oo.', '...oo...', '...o...', '...oo...'],
  wings: ['oooooooo', 'ooooooo', 'ooo..ooo', 'oo...oo', 'o......o', 'oo...oo', 'ooo..ooo', 'ooooooo'],
  tall8: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo'],
  tall9: ['oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo', 'ooooooo', 'oooooooo']
};

// Stones laid over a mask (same grid; x = stone).
const STONES = {
  none: [],
  midRow: ['........', '.......', '........', '.x.x.x.'],
  pillars: ['........', '.......', '.x....x.', '.......', '.x....x.'],
  corners: ['x......x', '.......', '........', '.......', 'x......x'],
  center: ['........', '.......', '...xx...', '...x...', '...xx...'],
  low: ['........', '.......', '........', '.......', '........', 'x.x.x.x'],
  ring: ['........', '..x.x..', '.x....x.', '.......', '.x....x.', '..x.x..'],
  roof: ['xxx..xxx', '.......', '........'],
  chain: ['........', '.......', 'x.x..x.x', '.......', '..x..x..'],
  hang: ['........', '.......', '........', '.......', '........', '.......', '.x....x.', '.......', '...xx...']
};

function cells(mask) {
  const out = [];
  mask.forEach((row, r) => row.split('').forEach((ch, c) => { if (ch !== '.') out.push({ r, c }); }));
  return out;
}
function xOf(r, c) { return E.LEFT + E.R + c * E.D + (r % 2 ? E.R : 0); }
function yOf(r) { return r * E.ROWH; }

// Colour patterns: return a band index for each cell (or fill cells directly for blobs).
const PATTERNS = {
  cols: (cl, n) => cl.forEach(p => { p.k = Math.min(n - 1, Math.floor((xOf(p.r, p.c) - E.LEFT) / ((E.RIGHT - E.LEFT) / n))); }),
  rows: (cl, n, h) => cl.forEach(p => { p.k = Math.floor(p.r / (h || 1)) % n; }),
  diag: (cl, n, w) => cl.forEach(p => { p.k = Math.floor((xOf(p.r, p.c) / E.D + p.r * 0.9) / (w || 2)) % n; }),
  rings: (cl, n, w) => {
    const cx = 180, cy = Math.max(...cl.map(p => yOf(p.r))) / 2;
    cl.forEach(p => { p.k = Math.floor(Math.hypot(xOf(p.r, p.c) - cx, (yOf(p.r) - cy) * 1.1) / (w || 50)) % n; });
  },
  checker: (cl, n) => cl.forEach(p => { p.k = (Math.floor(xOf(p.r, p.c) / (2 * E.D)) + Math.floor(p.r / 2)) % n; }),
  blobs: null,     // handled in colour()
  mirror: null
};

function rngOf(seed) { return E.rngOf(seed); }
function neighborsOf(r, c) { return new E.Grid([], 0).neighbors(r, c); }

// Random clusters of 2-4 eggs (the classic look). mirror = left half copied to the right.
function blobs(cl, n, rng, mirror, size) {
  const key = p => p.r + ',' + p.c, at = {};
  cl.forEach(p => { at[key(p)] = p; p.k = -1; });
  const width = r => (r % 2 ? 7 : 8);
  const twin = p => at[p.r + ',' + (width(p.r) - 1 - p.c)];
  const order = cl.slice().sort(() => rng() - 0.5);
  for (const p of order) {
    if (p.k >= 0) continue;
    if (mirror && xOf(p.r, p.c) > 180 + 1) continue;
    const near = new Set(neighborsOf(p.r, p.c).map(q => at[q[0] + ',' + q[1]]).filter(q => q && q.k >= 0).map(q => q.k));
    const choices = []; for (let k = 0; k < n; k++) if (!near.has(k)) choices.push(k);
    const k = (choices.length ? choices : [...Array(n).keys()])[Math.floor(rng() * (choices.length || n))];
    const want = (size || 2) + Math.floor(rng() * 3);
    const queue = [p]; p.k = k; let got = 1;
    for (let i = 0; i < queue.length && got < want; i++) {
      const ns = neighborsOf(queue[i].r, queue[i].c).map(q => at[q[0] + ',' + q[1]]).filter(q => q && q.k < 0 && !(mirror && xOf(q.r, q.c) > 180 + 1));
      ns.sort(() => rng() - 0.5);
      for (const q of ns) { if (got >= want) break; q.k = k; got++; queue.push(q); }
    }
  }
  if (mirror) cl.forEach(p => { if (xOf(p.r, p.c) > 180 + 1) { const t = twin(p); p.k = t ? t.k : 0; } });
}

function colour(spec, seed) {
  const mask = MASKS[spec.mask];
  const cl = cells(mask);
  const cols = spec.colors.split('');
  const rng = rngOf(seed * 131 + 7);
  const n = cols.length;
  if (spec.pat === 'blobs' || spec.pat === 'mirror') blobs(cl, n, rng, spec.pat === 'mirror', spec.size);
  else PATTERNS[spec.pat](cl, n, spec.arg);
  // shuffle which colour goes to which band (seeded)
  const perm = cols.slice();
  for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const grid = mask.map(row => row.split('').map(() => '.'));
  cl.forEach(p => { grid[p.r][p.c] = perm[p.k]; });
  // a few eggs change colour so bands are not too easy
  if (spec.noise) cl.forEach(p => { if (rng() < spec.noise) grid[p.r][p.c] = cols[Math.floor(rng() * n)]; });
  (STONES[spec.stones || 'none'] || []).forEach((row, r) => row.split('').forEach((ch, c) => { if (ch === 'x' && grid[r] && grid[r][c] !== undefined && grid[r][c] !== '.') grid[r][c] = 'x'; }));
  return grid.map((row, r) => (r % 2 ? ' ' : '') + row.join(' '));
}

// Pretend-play a stage: clear rates (kid at normal/fast, the little one at slow) and shots.
function measure(level, n) {
  const res = { kid: { normal: 0, fast: 0 }, little: 0, shotsKid: [], shotsExp: [], timeKid: [] };
  for (let s = 1; s <= n; s++) {
    for (const speed of ['normal', 'fast']) {
      const r = play(level, { speed, player: 'kid', seed: s * 17 + 3 });
      if (r.state === 'won') { res.kid[speed]++; if (speed === 'normal') { res.shotsKid.push(r.shots); res.timeKid.push(r.t); } }
    }
    if (play(level, { speed: 'slow', player: 'little', seed: s * 23 + 11 }).state === 'won') res.little++;
    const x = play(level, { speed: 'normal', player: 'expert', seed: s * 31 + 5 });
    if (x.state === 'won') res.shotsExp.push(x.shots);
  }
  const med = a => { const b = a.slice().sort((p, q) => p - q); return b.length ? b[b.length >> 1] : 0; };
  for (const k in res.kid) res.kid[k] /= n;
  res.little /= n;
  res.expMed = med(res.shotsExp); res.kidMed = med(res.shotsKid); res.timeMed = med(res.timeKid);
  return res;
}

// ---------------------------------------------------------------- the stages
// sp: special eggs in the launcher (b bomb, r rainbow, l lightning), first: which egg brings the first one.
// want: target kid clear rate at 'normal' speed (the seed closest to it is used).
// tgt: how many eggs the expert player should need (seeds are picked to come close);
// want: clear rate of the pretend child at "normal" speed.
const WORLDS = [
  { name: 'ぴよぴよ はらっぱ', theme: 0, key: 0, icon: [0, 1, 2], stages: [
    { mask: 'block3', pat: 'cols', colors: 'abc', tip: 'aim', tgt: 3, want: 1 },
    { mask: 'block4', pat: 'rows', colors: 'cba', tip: 'down', tgt: 8, want: 1 },
    { mask: 'heartS', pat: 'mirror', colors: 'abc', size: 3, tip: 'wall', tgt: 5, want: 1 },
    { mask: 'block4', pat: 'blobs', colors: 'abc', size: 3, tgt: 6, want: 1 },
    { mask: 'veeS', pat: 'rows', colors: 'abc', tip: 'drop', tgt: 3, want: 1 },
    { mask: 'block5', pat: 'mirror', colors: 'abc', size: 3, tip: 'swap', tgt: 7, want: 1 },
    { mask: 'towers', pat: 'mirror', colors: 'abc', size: 3, tgt: 7, want: 1 },
    { mask: 'block5', pat: 'diag', colors: 'abc', arg: 2, noise: 0.1, tgt: 8, want: 1 },
    { mask: 'arch', pat: 'mirror', colors: 'abc', size: 3, tgt: 8, want: 1 },
    { mask: 'block6', pat: 'blobs', colors: 'abc', size: 2, tgt: 10, want: 0.97 },
    { mask: 'heart', pat: 'mirror', colors: 'abc', size: 3, tgt: 9, want: 0.97 },
    { mask: 'block6', pat: 'mirror', colors: 'abc', size: 2, tgt: 11, want: 0.95 }
  ] },
  { name: 'ドッカン おはなばたけ', theme: 1, key: 2, icon: [0, 1, 3], special: E.BOMB, stages: [
    { mask: 'block5', pat: 'blobs', colors: 'abcd', size: 3, sp: 'b', every: 8, first: 2, tip: 'bomb', tgt: 7, want: 1 },
    { mask: 'vee', pat: 'mirror', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 8, want: 1 },
    { mask: 'block5', pat: 'mirror', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 8, want: 0.97 },
    { mask: 'flower', pat: 'rings', colors: 'dabc', arg: 46, noise: 0.15, sp: 'b', every: 9, tgt: 9, want: 0.97 },
    { mask: 'holes', pat: 'blobs', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 9, want: 0.97 },
    { mask: 'block6', pat: 'blobs', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 10, want: 0.95 },
    { mask: 'diamond', pat: 'mirror', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 10, want: 0.95 },
    { mask: 'stairs', pat: 'blobs', colors: 'abcd', size: 3, sp: 'b', every: 9, tgt: 10, want: 0.95 },
    { mask: 'block6', pat: 'mirror', colors: 'abcd', size: 2, sp: 'b', every: 10, tgt: 12, want: 0.93 },
    { mask: 'bridge', pat: 'mirror', colors: 'abcd', size: 2, sp: 'b', every: 10, tgt: 11, want: 0.93 },
    { mask: 'block7', pat: 'checker', colors: 'abcd', noise: 0.12, sp: 'b', every: 10, tgt: 13, want: 0.92 },
    { mask: 'heart', pat: 'mirror', colors: 'abcd', size: 2, sp: 'b', every: 10, tgt: 12, want: 0.9 }
  ] },
  { name: 'にじいろ おそら', theme: 2, key: -2, icon: [2, 4, 0], special: E.RAINBOW, stages: [
    { mask: 'block5', pat: 'blobs', colors: 'abce', size: 3, sp: 'r', every: 8, first: 2, tip: 'rainbow', tgt: 8, want: 1 },
    { mask: 'arch', pat: 'mirror', colors: 'abce', size: 3, sp: 'rb', every: 8, tgt: 9, want: 0.97 },
    { mask: 'block6', pat: 'rows', colors: 'eabc', noise: 0.2, sp: 'rb', every: 9, tgt: 11, want: 0.95 },
    { mask: 'ball', pat: 'rings', colors: 'abce', arg: 38, noise: 0.15, sp: 'rb', every: 9, tgt: 11, want: 0.95 },
    { mask: 'comb', pat: 'blobs', colors: 'abce', size: 3, sp: 'rb', every: 9, tgt: 10, want: 0.95 },
    { mask: 'block6', pat: 'mirror', colors: 'abce', size: 2, sp: 'rb', every: 9, tgt: 12, want: 0.93 },
    { mask: 'wings', pat: 'mirror', colors: 'abce', size: 3, sp: 'rb', every: 9, tgt: 12, want: 0.93 },
    { mask: 'stairsR', pat: 'blobs', colors: 'abce', size: 2, sp: 'rb', every: 9, tgt: 12, want: 0.92 },
    { mask: 'block7', pat: 'blobs', colors: 'abce', size: 2, sp: 'rb', every: 9, tgt: 14, want: 0.9 },
    { mask: 'hourglass', pat: 'mirror', colors: 'abce', size: 2, sp: 'rb', every: 10, tgt: 13, want: 0.9 },
    { mask: 'tall8', pat: 'checker', colors: 'abce', noise: 0.1, sp: 'rb', every: 10, tgt: 15, want: 0.88 },
    { mask: 'diamond', pat: 'mirror', colors: 'abce', size: 2, sp: 'rb', every: 10, tgt: 13, want: 0.88 }
  ] },
  { name: 'ピカピカ もり', theme: 3, key: 3, icon: [3, 1, 5], special: E.BOLT, stages: [
    { mask: 'block6', pat: 'rows', colors: 'abcde', noise: 0.2, sp: 'l', every: 7, first: 2, tip: 'bolt', tgt: 12, want: 0.97 },
    { mask: 'block6', pat: 'blobs', colors: 'abcde', size: 3, sp: 'lr', every: 8, tgt: 12, want: 0.95 },
    { mask: 'towers', pat: 'mirror', colors: 'abcde', size: 3, sp: 'lb', every: 8, tgt: 12, want: 0.95 },
    { mask: 'heart', pat: 'mirror', colors: 'abcde', size: 2, sp: 'lrb', every: 8, tgt: 13, want: 0.93 },
    { mask: 'block7', pat: 'mirror', colors: 'abcde', size: 3, sp: 'lrb', every: 8, tgt: 14, want: 0.92 },
    { mask: 'holes', pat: 'checker', colors: 'abcde', noise: 0.15, sp: 'lrb', every: 8, tgt: 13, want: 0.92 },
    { mask: 'flower', pat: 'blobs', colors: 'abcde', size: 3, sp: 'lrb', every: 9, tgt: 13, want: 0.9 },
    { mask: 'tall8', pat: 'diag', colors: 'abcde', arg: 2, noise: 0.12, sp: 'lrb', every: 9, tgt: 16, want: 0.9 },
    { mask: 'bridge', pat: 'mirror', colors: 'abcde', size: 2, sp: 'lrb', every: 9, tgt: 14, want: 0.88 },
    { mask: 'block6', pat: 'blobs', colors: 'abcde', size: 2, sp: 'lrb', every: 9, tgt: 15, want: 0.87 },
    { mask: 'wings', pat: 'mirror', colors: 'abcde', size: 2, sp: 'lrb', every: 9, tgt: 15, want: 0.86 },
    { mask: 'tall9', pat: 'mirror', colors: 'abcde', size: 2, sp: 'lrb', every: 9, tgt: 18, want: 0.85 }
  ] },
  { name: 'ころころ いしの くに', theme: 4, key: 5, icon: [4, 5, 2], special: E.STONE, stages: [
    { mask: 'block6', pat: 'blobs', colors: 'abcdf', size: 3, stones: 'midRow', sp: 'blr', every: 8, tip: 'stone', tgt: 12, want: 0.95 },
    { mask: 'vee', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'center', sp: 'blr', every: 8, tgt: 12, want: 0.93 },
    { mask: 'block6', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'pillars', sp: 'blr', every: 8, tgt: 13, want: 0.92 },
    { mask: 'arch', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'roof', sp: 'blr', every: 8, tgt: 13, want: 0.92 },
    { mask: 'block6', pat: 'blobs', colors: 'abcdf', size: 3, stones: 'chain', sp: 'blr', every: 8, tgt: 14, want: 0.9 },
    { mask: 'ball', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'ring', sp: 'blr', every: 8, tgt: 13, want: 0.9 },
    { mask: 'block6', pat: 'checker', colors: 'abcdf', noise: 0.15, stones: 'low', sp: 'blr', every: 8, tgt: 14, want: 0.88 },
    { mask: 'diamond', pat: 'mirror', colors: 'abcdf', size: 2, stones: 'hang', sp: 'blr', every: 9, tgt: 14, want: 0.88 },
    { mask: 'block7', pat: 'blobs', colors: 'abcdf', size: 3, stones: 'corners', sp: 'blr', every: 9, tgt: 16, want: 0.86 },
    { mask: 'wings', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'midRow', sp: 'blr', every: 9, tgt: 15, want: 0.85 },
    { mask: 'tall8', pat: 'diag', colors: 'abcdf', arg: 2, noise: 0.15, stones: 'pillars', sp: 'blr', every: 9, tgt: 17, want: 0.84 },
    { mask: 'block7', pat: 'mirror', colors: 'abcdf', size: 3, stones: 'chain', sp: 'blr', every: 9, tgt: 17, want: 0.82 }
  ] }
];

function levelOf(spec, seed) {
  const lv = { rows: colour(spec, seed) };
  if (spec.sp) { lv.sp = spec.sp; lv.every = spec.every || 8; if (spec.first) lv.first = spec.first; }
  if (spec.tip) lv.tip = spec.tip;
  return lv;
}

const OUT = path.join(__dirname, 'out');

function buildStage(wi, si) {
  const spec = WORLDS[wi].stages[si];
  const seeds = ['blobs', 'mirror'].includes(spec.pat) || spec.noise ? 10 : 1;
  let best = null;
  for (let s = 1; s <= seeds; s++) {
    const lv = levelOf(spec, s + si * 10 + wi * 100);
    const m = measure(lv, 10);
    // closest to the wanted clear rate, the little one clears "slow" (85%+), then close to the wanted number of eggs
    const score = Math.abs(m.kid.normal - spec.want) * 10 + Math.max(0, 0.85 - m.little) * 20 + Math.abs(m.expMed - spec.tgt) * 0.25;
    if (!best || score < best.score) best = { lv, m, score };
  }
  const m = best.m, lv = best.lv;
  const p3 = Math.ceil(m.expMed * 1.35) + 1, p2 = Math.max(p3 + 3, Math.ceil(m.kidMed * 1.25) + 2);
  lv.par = [p3, p2];
  console.log(`${wi + 1}-${si + 1} ${spec.mask}/${spec.pat}  little slow ${m.little.toFixed(2)}  kid normal ${m.kid.normal.toFixed(2)} fast ${m.kid.fast.toFixed(2)}  shots exp ${m.expMed} kid ${m.kidMed}  kid time ${m.timeMed.toFixed(0)}s  par ${p3}/${p2}`);
  return lv;
}

function load(wi) {
  try { return JSON.parse(fs.readFileSync(path.join(OUT, 'w' + (wi + 1) + '.json'), 'utf8')); } catch (e) { return []; }
}
function keep(wi, stages) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'w' + (wi + 1) + '.json'), JSON.stringify(stages));
}

// "3" builds world 3; "3-5" rebuilds only stage 3-5 (the rest of the world is kept).
function build(id) {
  const [w, s] = String(id).split('-').map(Number), wi = w - 1;
  if (s) {
    const lv = buildStage(wi, s - 1), stages = load(wi);   // read just before writing: other runs may have changed the file
    stages[s - 1] = lv;
    keep(wi, stages);
    return;
  }
  keep(wi, WORLDS[wi].stages.map((spec, si) => buildStage(wi, si)));
}

function write() {
  const file = path.join(__dirname, '..', 'js', 'levels.js');
  const worlds = WORLDS.map((wd, wi) => ({ name: wd.name, theme: wd.theme, key: wd.key, icon: wd.icon, special: wd.special, stages: load(wi) }));
  const lines = [];
  lines.push('/* ケロちゃん ぴよぴよポン — stages (made by tools/make-levels.js; edit there).');
  lines.push('   rows: the eggs hanging from the cloud, a/b/c/d/e/f = colours, x = stone, . = empty;');
  lines.push('         rows alternate 8 and 7 eggs (the narrow rows sit half an egg to the right).');
  lines.push('   sp: special eggs that come to the launcher (b bomb, r rainbow, l lightning), every: how often,');
  lines.push('       first: which egg brings the first one.   tip: one-time help (see TIPS in game.js).');
  lines.push('   par: [most eggs for ★3, most eggs for ★2]. */');
  lines.push('(function (root, factory) {');
  lines.push("  if (typeof module === 'object' && module.exports) module.exports = factory();");
  lines.push('  else root.LEVELS = factory();');
  lines.push("}(typeof self !== 'undefined' ? self : this, function () {");
  lines.push("  'use strict';");
  lines.push('  return [');
  worlds.forEach((wd, wi) => {
    lines.push(`    { name: '${wd.name}', theme: ${wd.theme}, key: ${wd.key}, icon: ${JSON.stringify(wd.icon)}` + (wd.special != null ? `, special: ${wd.special}` : '') + ', stages: [');
    wd.stages.forEach((lv, si) => {
      const extra = [];
      if (lv.sp) extra.push(`sp: '${lv.sp}', every: ${lv.every}` + (lv.first ? `, first: ${lv.first}` : ''));
      if (lv.tip) extra.push(`tip: '${lv.tip}'`);
      extra.push(`par: [${lv.par[0]}, ${lv.par[1]}]`);
      lines.push('      { rows: [');
      lv.rows.forEach((row, r) => lines.push(`        '${row}'` + (r < lv.rows.length - 1 ? ',' : '')));
      lines.push('      ], ' + extra.join(', ') + ' }' + (si < wd.stages.length - 1 ? ',' : ''));
    });
    lines.push('    ] }' + (wi < worlds.length - 1 ? ',' : ''));
  });
  lines.push('  ];');
  lines.push('}));');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  console.log('wrote', file);
}

// usage: node tools/make-levels.js              build every world, then write js/levels.js
//        node tools/make-levels.js build 2 3    build worlds 2 and 3 only (into tools/out/wN.json)
//        node tools/make-levels.js build 4-10   rebuild stage 4-10 only
//        node tools/make-levels.js write        write js/levels.js from tools/out/
const args = process.argv.slice(2);
if (args[0] === 'write') write();
else if (args[0] === 'build') args.slice(1).forEach(build);
else { WORLDS.forEach((wd, wi) => build(wi + 1)); write(); }
