#!/usr/bin/env node
// tools/evolve.mjs — (fork) the evolution bench (fish-edition/ai-players/03-human-game-analysis.md "Evolution"):
// evolves tactics profiles (server/match/botTactics.js) by botbench matches. A candidate is a profile: an ordered list
// of tactics with their parameters, legacy always below. Mutations add, remove or move a tactic, or change one
// parameter inside its declared bounds; crossover merges two parents' lists in order.
//
// Usage:
//   node tools/evolve.mjs --out DIR [--config solo:ABYSS] [--pop 12] [--gens 6] [--train 1-40] [--holdout 101-160]
//                         [--jobs 8] [--elite 3] [--max-tactics 6] [--pool research,basic,legacy] [--rules R]
//                         [--seed 1] [--halving]
//   node tools/evolve.mjs --out DIR --holdout-only     score the best candidates and legacy on the held-back seeds
//
// - Fitness per match: victory + 0.25 × hidden core cleared + 0.25 × rounds passed / boss round; a candidate's
//   fitness is the mean over the training seeds, minus 0.005 per tactic (against bloat). Paired seeds: every candidate
//   plays the same seeds, and legacy (the empty profile) is always in the population as the control.
// - Resumable: each candidate's matches are saved per 10-seed chunk under DIR/cache/<genome hash>.sA-B.json (written
//   via .tmp), so a restart, an elite carried over, or the same genome found twice costs nothing. Generations are
//   derived from --seed, so a restart rebuilds the same population. One run per DIR (DIR/.pid).
// - --halving: each generation scores everyone on the first half of the training seeds, then only the better half on
//   the rest (the others keep their half-seed score, marked "½").
// - Output: DIR/gen-N.md (the ranking), DIR/best.json (the best profile; botbench --profile takes it), DIR/run.log,
//   and with --holdout-only DIR/holdout.md: wins, flips against legacy and fitness on seeds no generation saw.
// - Memory: botbench's workers are threads of one process. A chunk killed by a signal or out of memory is retried at
//   half the jobs (up to 4 times); the jobs climb back by 1 after 4 clean chunks.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TACTICS } from '../server/match/botStrategies.js';
import { BASIC_TACTICS } from '../server/match/botTacticsBasic.js';
import { LEGACY_TACTICS } from '../server/match/botTacticsLegacy.js';
import { RESEARCH_TACTICS } from '../server/match/botTacticsResearch.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
  const k = a.slice(2);
  if (['halving', 'holdout-only'].includes(k)) opt[k] = true;
  else opt[k] = args[++i];
}
if (!opt.out) { console.error('usage: node tools/evolve.mjs --out DIR [options] (see the header)'); process.exit(2); }
const OUT = resolve(opt.out);
const CONFIG = opt.config || 'solo:ABYSS';
const POP = +(opt.pop || 12), GENS = +(opt.gens || 6), ELITE = +(opt.elite || 3), MAXT = +(opt['max-tactics'] || 6);
const range = (s) => { const [a, b] = String(s).split('-').map(Number); if (!(a >= 1 && b >= a)) throw new Error(`bad seed range ${s}`); return [a, b]; };
const TRAIN = range(opt.train || '1-40'), HOLD = range(opt.holdout || '101-160');
const RULES = opt.rules || '';
const SEED = +(opt.seed || 1);
const JOBS_MAX = +(opt.jobs || 8);
const POOLS = { research: RESEARCH_TACTICS, basic: BASIC_TACTICS, legacy: LEGACY_TACTICS };
const POOL = String(opt.pool || 'research,basic').split(',').flatMap((p) => {
  if (!POOLS[p]) throw new Error(`unknown pool ${p}; known: ${Object.keys(POOLS).join(', ')}`);
  return POOLS[p];
});

mkdirSync(join(OUT, 'cache'), { recursive: true });
const PID = join(OUT, '.pid');
if (existsSync(PID)) {
  const old = +readFileSync(PID, 'utf8');
  try { process.kill(old, 0); console.error(`already running (pid ${old})`); process.exit(1); } catch { /* stale */ }
}
writeFileSync(PID, String(process.pid));
process.on('exit', () => { try { rmSync(PID); } catch { /* gone */ } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(143));
const log = (s) => { const line = `${new Date().toISOString().slice(11, 19)} ${s}`; appendFileSync(join(OUT, 'run.log'), line + '\n'); console.log(line); };

// ---- deterministic RNG (mulberry32) ----
function rngOf(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];

// ---- genomes ----
const canon = (g) => g.map((e) => ({ tactic: e.tactic, params: Object.fromEntries(Object.entries(e.params).sort(([a], [b]) => a.localeCompare(b))) }));
const hashOf = (g) => createHash('sha1').update(JSON.stringify(canon(g))).digest('hex').slice(0, 12);
const defaults = (t) => Object.fromEntries(Object.entries(t.params).map(([k, s]) => [k, s.default]));
function randomParam(rng, s) {
  if (s.type === 'bool') return rng() < 0.5;
  if (s.type === 'choice') return pick(rng, s.choices);
  const v = s.min + rng() * (s.max - s.min);
  return s.type === 'int' ? Math.round(v) : +v.toFixed(3);
}
function tweakParam(rng, s, v) {
  if (s.type === 'bool') return !v;
  if (s.type === 'choice') return s.choices.length > 1 ? pick(rng, s.choices.filter((c) => c !== v)) : v;
  const span = s.max - s.min;
  // a small step usually, a jump now and then
  let n = rng() < 0.8 ? v + (rng() * 2 - 1) * span * 0.15 : s.min + rng() * span;
  n = Math.max(s.min, Math.min(s.max, n));
  if (s.type === 'int') { n = Math.round(n); if (n === v) n = Math.max(s.min, Math.min(s.max, v + (rng() < 0.5 ? -1 : 1))); }
  return s.type === 'int' ? n : +n.toFixed(3);
}
function newEntry(rng) {
  const t = pick(rng, POOL);
  const params = defaults(t);
  // half the new entries start away from the defaults on one parameter
  const keys = Object.keys(t.params);
  if (keys.length && rng() < 0.5) { const k = pick(rng, keys); params[k] = randomParam(rng, t.params[k]); }
  return { tactic: t.id, params };
}
function mutate(rng, g) {
  const out = g.map((e) => ({ tactic: e.tactic, params: { ...e.params } }));
  const ops = [];
  if (out.length < MAXT) ops.push('add', 'add');
  if (out.length) ops.push('remove');
  if (out.length > 1) ops.push('move');
  if (out.some((e) => Object.keys(TACTICS[e.tactic].params).length)) ops.push('tweak', 'tweak', 'tweak');
  const op = pick(rng, ops);
  if (op === 'add') out.splice(Math.floor(rng() * (out.length + 1)), 0, newEntry(rng));
  else if (op === 'remove') out.splice(Math.floor(rng() * out.length), 1);
  else if (op === 'move') { const [e] = out.splice(Math.floor(rng() * out.length), 1); out.splice(Math.floor(rng() * (out.length + 1)), 0, e); }
  else {
    const withP = out.filter((e) => Object.keys(TACTICS[e.tactic].params).length);
    const e = pick(rng, withP), specs = TACTICS[e.tactic].params, k = pick(rng, Object.keys(specs));
    e.params[k] = tweakParam(rng, specs[k], e.params[k]);
  }
  return out;
}
function crossover(rng, a, b) {
  // each parent's entries in order, interleaved; each entry kept with probability 1/2, length capped
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    for (const e of [a[i], b[i]]) if (e && rng() < 0.5 && out.length < MAXT) out.push({ tactic: e.tactic, params: { ...e.params } });
  }
  return out;
}

// ---- evaluation: botbench per 10-seed chunk, cached by genome ----
let jobs = JOBS_MAX, clean = 0;
function chunks([a, b]) { const out = []; for (let s = a; s <= b; s += 10) out.push([s, Math.min(b, s + 9)]); return out; }
function runChunk(g, [a, b]) {
  const h = hashOf(g), file = join(OUT, 'cache', `${h}.s${a}-${b}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const prof = join(OUT, 'cache', `${h}.profile.json`);
  if (!existsSync(prof)) writeFileSync(prof, JSON.stringify({ id: `evo-${h}`, tactics: g }, null, 1));
  for (let tryN = 1; ; tryN++) {
    const tmp = file + '.tmp';
    const argv = ['tools/botbench.mjs', '--configs', CONFIG, '--seeds', String(b - a + 1), '--seed', String(a), '--jobs', String(jobs),
      '--profile', prof, '--json', tmp, '--quiet', ...(RULES ? ['--rules', RULES] : [])];
    const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status === 0 && existsSync(tmp)) {
      renameSync(tmp, file);
      if (++clean >= 4 && jobs < JOBS_MAX) { jobs++; clean = 0; }
      return JSON.parse(readFileSync(file, 'utf8'));
    }
    rmSync(tmp, { force: true });
    const oom = r.signal || (r.status ?? 0) >= 128 || /out of memory/i.test((r.stderr || '') + (r.stdout || ''));
    if (!oom || tryN >= 4) throw new Error(`botbench failed for ${h} s${a}-${b} (exit ${r.status} ${r.signal || ''}): ${(r.stderr || '').slice(-600)}`);
    jobs = Math.max(1, Math.floor(jobs / 2)); clean = 0;
    log(`chunk ${h} s${a}-${b}: killed (memory?), retry at ${jobs} jobs`);
  }
}
const score = (r) => (r.victory ? 1 : 0) + (r.hidden ? 0.25 : 0) + 0.25 * Math.min(1, (r.roundsPassed || 0) / Math.max(1, r.bossRound || 14));
function evaluate(g, seeds) {
  const recs = chunks(seeds).flatMap((c) => runChunk(g, c));
  const fit = recs.reduce((s, r) => s + score(r), 0) / recs.length - 0.005 * g.length;
  return { fit, wins: recs.filter((r) => r.victory).length, n: recs.length, bySeed: new Map(recs.map((r) => [r.seed, r])) };
}
const describe = (g) => g.length ? g.map((e) => `${e.tactic}(${Object.entries(e.params).filter(([k, v]) => TACTICS[e.tactic].params[k].default !== v).map(([k, v]) => `${k}=${v}`).join(',')})`).join(' > ') : '(legacy)';

// ---- the run ----
const statePath = join(OUT, 'state.json');
const meta = { config: CONFIG, train: TRAIN, holdout: HOLD, rules: RULES, seed: SEED, pop: POP, pool: POOL.map((t) => t.id), maxTactics: MAXT };
if (existsSync(statePath)) {
  const st = JSON.parse(readFileSync(statePath, 'utf8'));
  for (const k of ['config', 'train', 'rules', 'seed']) if (JSON.stringify(st.meta[k]) !== JSON.stringify(meta[k])) throw new Error(`DIR was made with ${k}=${JSON.stringify(st.meta[k])}; use another --out`);
}

function rank(pop, seeds) {
  const half = opt.halving ? [seeds[0], seeds[0] + Math.floor((seeds[1] - seeds[0] + 1) / 2) - 1] : null;
  let rows;
  if (half && half[1] >= half[0] && half[1] < seeds[1]) {
    rows = pop.map((g) => ({ g, ...evaluate(g, half), partial: true }));
    rows.sort((x, y) => y.fit - x.fit);
    const keep = Math.ceil(rows.length / 2);
    for (let i = 0; i < rows.length; i++) if (i < keep || rows[i].g.length === 0) Object.assign(rows[i], evaluate(rows[i].g, seeds), { partial: false });
  } else rows = pop.map((g) => ({ g, ...evaluate(g, seeds), partial: false }));
  // full scores above half-seed scores
  rows.sort((x, y) => (x.partial - y.partial) || (y.fit - x.fit));
  return rows;
}

function report(gen, rows) {
  const base = rows.find((r) => r.g.length === 0);
  const lines = [`# Generation ${gen} — ${CONFIG}, seeds ${TRAIN.join('–')}${RULES ? `, rules ${RULES}` : ''}`, '',
    '| # | fitness | wins | vs legacy (+ / −) | tactics | hash |', '|---|---|---|---|---|---|'];
  rows.forEach((r, i) => {
    let flips = '';
    if (base && !r.partial && r !== base) {
      let up = 0, down = 0;
      for (const [s, x] of r.bySeed) { const y = base.bySeed.get(s); if (!y) continue; if (x.victory && !y.victory) up++; if (!x.victory && y.victory) down++; }
      flips = `+${up} / −${down}`;
    }
    lines.push(`| ${i + 1} | ${r.fit.toFixed(3)}${r.partial ? ' ½' : ''} | ${r.wins}/${r.n} | ${flips} | ${describe(r.g)} | ${hashOf(r.g)} |`);
  });
  writeFileSync(join(OUT, `gen-${gen}.md`), lines.join('\n') + '\n');
}

if (opt['holdout-only']) {
  const st = JSON.parse(readFileSync(statePath, 'utf8'));
  const seen = new Map();
  for (const gen of st.gens) for (const r of gen.top) if (!seen.has(r.hash)) seen.set(r.hash, r);
  const cands = [...seen.values()].sort((a, b) => b.fit - a.fit).slice(0, 3).map((r) => r.g);
  const rows = [[], ...cands].map((g) => ({ g, ...evaluate(g, HOLD) }));
  const base = rows[0];
  const lines = [`# Held-back seeds ${HOLD.join('–')} — ${CONFIG}${RULES ? `, rules ${RULES}` : ''}`, '', '| profile | fitness | wins | vs legacy (+ / −) |', '|---|---|---|---|'];
  for (const r of rows) {
    let up = 0, down = 0;
    for (const [s, x] of r.bySeed) { const y = base.bySeed.get(s); if (x.victory && !y.victory) up++; if (!x.victory && y.victory) down++; }
    lines.push(`| ${describe(r.g)} | ${r.fit.toFixed(3)} | ${r.wins}/${r.n} | ${r === base ? '' : `+${up} / −${down}`} |`);
  }
  writeFileSync(join(OUT, 'holdout.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  process.exit(0);
}

const st = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { meta, gens: [] };
st.meta = meta;
log(`start: ${CONFIG}, pop ${POP}, gens ${GENS}, train ${TRAIN.join('-')}, pool ${POOL.length} tactics, jobs ${JOBS_MAX}`);
// generation 0: legacy, each pool tactic alone with its defaults, then random short profiles
let pop;
{
  const rng = rngOf(SEED * 1000003);
  pop = [[]];
  for (const t of POOL) if (pop.length < POP) pop.push([{ tactic: t.id, params: defaults(t) }]);
  while (pop.length < POP) pop.push(Array.from({ length: 1 + Math.floor(rng() * 3) }, () => newEntry(rng)));
}
for (let gen = 0; gen < GENS; gen++) {
  const rows = rank(pop, TRAIN);
  report(gen, rows);
  const top = rows.filter((r) => !r.partial).slice(0, Math.max(ELITE, 5));
  st.gens[gen] = { top: top.map((r) => ({ hash: hashOf(r.g), fit: r.fit, wins: r.wins, n: r.n, g: r.g })) };
  writeFileSync(statePath, JSON.stringify(st, null, 1));
  const best = rows.find((r) => !r.partial);
  writeFileSync(join(OUT, 'best.json'), JSON.stringify({ id: `evo-${hashOf(best.g)}`, tactics: best.g }, null, 1));
  log(`gen ${gen}: best ${best.fit.toFixed(3)} (${best.wins}/${best.n}) ${describe(best.g)}; legacy ${rows.find((r) => r.g.length === 0).fit.toFixed(3)}`);
  if (gen === GENS - 1) break;
  // next generation: legacy, the elites, then children of tournament-picked parents (full scores only)
  const rng = rngOf(SEED * 1000003 + gen + 1);
  const parents = rows.filter((r) => !r.partial);
  const tour = () => { const a = pick(rng, parents), b = pick(rng, parents); return a.fit >= b.fit ? a.g : b.g; };
  const next = [[]], seen = new Set([hashOf([])]);
  for (const r of parents) if (next.length < 1 + ELITE && !seen.has(hashOf(r.g))) { next.push(r.g); seen.add(hashOf(r.g)); }
  for (let guard = 0; next.length < POP && guard < POP * 50; guard++) {
    let child = rng() < 0.3 ? crossover(rng, tour(), tour()) : tour();
    child = mutate(rng, child);
    if (rng() < 0.3) child = mutate(rng, child);
    const h = hashOf(child);
    if (!seen.has(h)) { seen.add(h); next.push(child); }
  }
  pop = next;
}
log('done');
