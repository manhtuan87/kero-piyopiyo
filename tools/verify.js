// Checks every stage: rows have the right length, every egg hangs from the cloud,
// and pretend players can clear it at each speed. Also prints how the ★ limits compare.
// usage: node tools/verify.js [1 | 1-3 ...] [--quick]
const path = require('path');
const { play, E } = require('./bot.js');
const WORLDS = require(path.join(__dirname, '..', 'js', 'levels.js'));

const args = process.argv.slice(2), quick = args.includes('--quick');
const filters = args.filter(a => !a.startsWith('--'));
const N = quick ? 6 : 16;
let bad = 0, total = 0;

function structure(lv) {
  const errs = [];
  lv.rows.forEach((row, r) => {
    const n = row.replace(/\s+/g, '').length;
    if (n !== (r % 2 ? 7 : 8)) errs.push(`row ${r} has ${n} eggs`);
    if (/[^abcdefx.\s]/.test(row)) errs.push(`row ${r} has an unknown letter`);
  });
  const w = new E.World(lv, { seed: 1 });
  if (w.g.loose().length) errs.push(`${w.g.loose().length} eggs do not hang from the cloud`);
  if (!w.present().length) errs.push('no coloured eggs');
  if (w.lowest() >= E.P.dangerY - E.ROWH * 2) errs.push('starts too close to the line');
  if (!lv.par || lv.par[0] >= lv.par[1]) errs.push('bad par');
  return errs;
}

function rate(lv, player, speed) {
  let won = 0; const shots = [];
  for (let s = 1; s <= N; s++) {
    const r = play(lv, { player, speed, seed: 1000 + s * 7 });
    if (r.state === 'won') { won++; shots.push(r.shots); }
  }
  shots.sort((a, b) => a - b);
  return { p: won / N, med: shots.length ? shots[shots.length >> 1] : 0 };
}

WORLDS.forEach((wd, wi) => {
  wd.stages.forEach((lv, si) => {
    const id = `${wi + 1}-${si + 1}`;
    if (filters.length && !filters.some(f => f === String(wi + 1) || f === id)) return;
    total++;
    const errs = structure(lv);
    const little = rate(lv, 'little', 'slow'), kid = rate(lv, 'kid', 'normal'), kidFast = rate(lv, 'kid', 'fast');
    const expertOni = rate(lv, 'expert', 'oni');   // (おに: a player who aims well and thinks 1 s must clear it)
    const eggs = new E.World(lv, { seed: 1 }).count();
    if (little.p < 0.8) errs.push('little player clears slow only ' + Math.round(little.p * 100) + '%');
    if (expertOni.p < 0.5) errs.push('a good player clears おに only ' + Math.round(expertOni.p * 100) + '%');
    if (errs.length) bad++;
    console.log(`${id.padEnd(5)} eggs ${String(eggs).padStart(2)}  slow(little) ${(little.p * 100).toFixed(0).padStart(3)}% med ${String(little.med).padStart(2)}  normal(kid) ${(kid.p * 100).toFixed(0).padStart(3)}% med ${String(kid.med).padStart(2)}  fast(kid) ${(kidFast.p * 100).toFixed(0).padStart(3)}%  oni(expert) ${(expertOni.p * 100).toFixed(0).padStart(3)}%  par ${lv.par[0]}/${lv.par[1]}${errs.length ? '  !! ' + errs.join('; ') : ''}`);
  });
});
console.log(bad ? `${bad} of ${total} stages need a look` : `all ${total} stages OK`);
process.exitCode = bad ? 1 : 0;
