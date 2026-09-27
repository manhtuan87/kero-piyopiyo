// A pretend player for checking stages without a browser.
//   kid:    thinks 1.5-4 s per egg, often shoots at any matching group rather than the best one
//   little: thinks 2.5-6 s, and one egg in four goes somewhere random
//   expert: always takes the best shot, 1 s per egg
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'engine.js'));

const PLAYERS = {
  kid: { think: [1.5, 4], bestP: 0.5, noise: 0.012, swapP: 0.3 },
  little: { think: [2.5, 6], bestP: 0.3, noise: 0.03, swapP: 0.1, wild: 0.25 },
  expert: { think: [1, 1], bestP: 1, noise: 0, swapP: 1 }
};

function gauss(rng) { return Math.sqrt(-2 * Math.log(rng() + 1e-12)) * Math.cos(2 * Math.PI * rng()); }

// Chooses an angle for the egg in the launcher (maybe after a swap).
function choose(w, pl, rng) {
  const cur = w.best(w.cur, 0.02), next = w.best(w.next, 0.02);
  let pickFrom = cur, swap = false;
  if (next && cur && next.score > cur.score + 1 && rng() < pl.swapP) { pickFrom = next; swap = true; }
  if (!pickFrom) return null;
  let a = pickFrom.a;
  if (pl.wild && rng() < pl.wild) {
    // a shot without much thought
    a = E.P.minAim + rng() * (Math.PI - 2 * E.P.minAim);
    return { a, swap };
  }
  if (rng() >= pl.bestP) {
    // any shot that makes a group hatch (what a child sees), else the best one
    const good = pickFrom.runs.filter(r => r.score >= 3);
    if (good.length) { const r = good[Math.floor(rng() * good.length)]; a = (r.a0 + r.a1) / 2; }
  }
  a += gauss(rng) * pl.noise;
  return { a, swap };
}

// Plays one game; returns { state, shots, t, hatched }.
function play(level, opts) {
  opts = opts || {};
  const pl = PLAYERS[opts.player || 'kid'];
  const seed = opts.seed || 1;
  const rng = E.rngOf(seed * 7919 + 13);
  const w = new E.World(level, { speed: opts.speed || 'normal', seed });
  const limit = opts.limit || 900;
  let wait = pl.think[0] + rng() * (pl.think[1] - pl.think[0]);
  while (w.state === 'play' && w.t < limit) {
    w.step();
    w.events.length = 0;
    if (w.shot) continue;
    wait -= E.DT;
    if (wait > 0) continue;
    const ch = choose(w, pl, rng);
    if (ch) { if (ch.swap) w.swap(); w.fire(ch.a); }
    wait = pl.think[0] + rng() * (pl.think[1] - pl.think[0]);
  }
  return { state: w.state, shots: w.shots, t: w.t, hatched: w.hatched, rows: w.rowsAdded };
}

module.exports = { play, choose, PLAYERS, E };
