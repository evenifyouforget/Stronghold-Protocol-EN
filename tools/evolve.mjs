#!/usr/bin/env node
// tools/evolve.mjs — (fork) the evolution bench (fish-edition/ai-players/03-human-game-analysis.md "Evolution"):
// evolves tactics profiles (server/match/botTactics.js) by botbench matches. A candidate is a profile: an ordered list
// of tactics with their parameters, legacy always below. Mutations add, remove or move a tactic, or change one
// parameter inside its declared bounds; crossover merges two parents' lists in order.
//
// Usage:
//   node tools/evolve.mjs --out DIR [--config solo:ABYSS] [--pop 12] [--gens 6] [--train 1-40] [--holdout 101-160]
//                         [--jobs 8] [--elite 3] [--max-tactics 6] [--pool research,basic,legacy|tactic ids] [--rules R]
//                         [--seed 1] [--halving]
//   node tools/evolve.mjs --out DIR --race [--budget 2400] [--iters 5] [--first 3] [--alpha 0.05] [--train 1-…]
//                                           iterated racing (irace), the recommended mode: see "--race" below
//   node tools/evolve.mjs --out DIR --holdout-only     score the best candidates and legacy on the held-back seeds
//   node tools/evolve.mjs --out DIR --anytime [--iter-budget 1500] [--config solo:ABYSS] [--jobs 22]
//                                           the race with no end: stop it with Ctrl+C whenever (see "--anytime" below)
// - --resample (recommended): generation g plays a fresh block of seeds (TRAIN's size, right after the previous one),
//   and a candidate's fitness is the mean over every block it has played. A candidate that got lucky on one block
//   regresses as it survives; without it, 12 candidates × 6 generations on one fixed block overfit that block (the
//   first run: 20/40 vs legacy 14/40 on training, 27/60 each on held-back seeds). Held-back default: 1001-1060.
//
// - Score per match: victory + 0.25 × hidden core cleared + 0.25 × rounds passed / boss round. A candidate's fitness
//   is its mean score minus legacy's on the same seeds (paired; legacy = 0), minus 0.005 per tactic (against bloat). Paired seeds: every candidate
//   plays the same seeds, and legacy (the empty profile) is always in the population as the control.
// - Resumable: each candidate's matches are saved per 10-seed chunk under DIR/cache/<genome hash>.sA-B.json (written
//   via .tmp), so a restart, an elite carried over, or the same genome found twice costs nothing. Generations are
//   derived from --seed, so a restart rebuilds the same population. One run per DIR (DIR/.pid).
// - --halving: each generation scores everyone on the first half of the training seeds, then only the better half on
//   the rest (the others keep their half-seed score, marked "½").
// - --race (fish-edition/ai-players/10; tools/race.mjs): iterated racing after irace (López-Ibáñez et al. 2016).
//   The seeds are one stream of 10-seed blocks from TRAIN's start. Each iteration samples new candidates around the
//   elites (a parent picked by rank, mutated with a step that shrinks every iteration), then races them with the elites
//   and legacy: block by block, every live candidate plays the same seeds; from block --first on, a paired t-test
//   against the current best (Holm-corrected, --alpha) drops the significantly worse ones. Each race starts again at
//   the first block, so a new candidate meets the elites on every seed they have played (cached: free for them), and
//   an elite can only be dropped once the race has gone past the seeds it has already played. A race stops at the
//   survivors' floor (2 + log2 of the parameters) or when its share of --budget (in matches) is spent; the survivors
//   are the next elites. Legacy is the control: never dropped, and every fitness is paired against it.
//   Held-back default for --race: 5001-5300.
// - --anytime (Fish 2026-11-12: "I ctrl+c to stop it whenever is convenient … whether I have 10 hours or 100 hours it
//   still is maximally useful"): --race with no budget. Every iteration gets --iter-budget matches (irace's split of
//   one iteration's share), so the races go on until stopped; after each iteration its best and legacy also play the
//   held-back seeds (6 blocks, one more per iteration, up to 30), written to DIR/holdout.md. Ctrl+C (or a file
//   DIR/STOP) stops the matches at once, writes DIR/summary.md and packs DIR into DIR.zip (cache included, so the run
//   can go on later: the same command resumes from the cache). A second Ctrl+C quits without the zip.
// - Output: DIR/gen-N.md (the ranking), DIR/best.json (the best profile; botbench --profile takes it), DIR/run.log,
//   and with --holdout-only DIR/holdout.md: wins, flips against legacy and fitness on seeds no generation saw.
// - Memory: botbench's workers are threads of one process. A chunk killed by a signal or out of memory is retried at
//   half the jobs (up to 4 times); the jobs climb back by 1 after 4 clean chunks.
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TACTICS } from '../server/match/botStrategies.js';
import { BASIC_TACTICS } from '../server/match/botTacticsBasic.js';
import { LEGACY_TACTICS } from '../server/match/botTacticsLegacy.js';
import { RESEARCH_TACTICS } from '../server/match/botTacticsResearch.js';
import * as RACE from './race.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
  const k = a.slice(2);
  if (['halving', 'holdout-only', 'resample', 'race', 'anytime'].includes(k)) opt[k] = true;
  else opt[k] = args[++i];
}
if (opt.anytime) opt.race = true;
if (!opt.out) { console.error('usage: node tools/evolve.mjs --out DIR [options] (see the header)'); process.exit(2); }
const OUT = resolve(opt.out);
const CONFIG = opt.config || 'solo:ABYSS';
const POP = +(opt.pop || 12), GENS = +(opt.gens || 6), ELITE = +(opt.elite || 3), MAXT = +(opt['max-tactics'] || 6);
const range = (s) => { const [a, b] = String(s).split('-').map(Number); if (!(a >= 1 && b >= a)) throw new Error(`bad seed range ${s}`); return [a, b]; };
const TRAIN = range(opt.train || '1-40'), HOLD = range(opt.holdout || (opt.race ? '5001-5300' : opt.resample ? '1001-1060' : '101-160'));
// --resample: generation g trains on the g-th block of TRAIN's size after TRAIN (fresh seeds each generation)
const SPAN = TRAIN[1] - TRAIN[0] + 1;
const blockOf = (gen) => (opt.resample ? [TRAIN[0] + gen * SPAN, TRAIN[1] + gen * SPAN] : TRAIN);
{
  const last = blockOf(Math.max(0, +(opt.gens || 6) - 1))[1];
  if (HOLD[0] <= last && HOLD[1] >= TRAIN[0]) throw new Error(`held-back seeds ${HOLD.join('-')} overlap the training seeds ${TRAIN[0]}-${last}`);
}
const RULES = opt.rules || '';
const SEED = +(opt.seed || 1);
// --jobs: default from the machine (cores − 2, and about 1.5 GB a worker), so the PC command needs no tuning
const JOBS_MAX = opt.jobs ? +opt.jobs : Math.max(1, Math.min((os.availableParallelism?.() ?? os.cpus().length) - 2, Math.floor(os.totalmem() / 1.5e9)));
const POOLS = { research: RESEARCH_TACTICS, basic: BASIC_TACTICS, legacy: LEGACY_TACTICS };
// a pool entry is a pool name or a single tactic id (e.g. research,basic,legacy-rules)
const POOL = [...new Set(String(opt.pool || 'research,basic').split(',').flatMap((p) => {
  if (POOLS[p]) return POOLS[p];
  if (TACTICS[p]) return [TACTICS[p]];
  throw new Error(`unknown pool or tactic ${p}; pools: ${Object.keys(POOLS).join(', ')}`);
}))];

mkdirSync(join(OUT, 'cache'), { recursive: true });
const PID = join(OUT, '.pid');
if (existsSync(PID)) {
  const old = +readFileSync(PID, 'utf8');
  try { process.kill(old, 0); console.error(`already running (pid ${old})`); process.exit(1); } catch { /* stale */ }
}
writeFileSync(PID, String(process.pid));
process.on('exit', () => { try { rmSync(PID); } catch { /* gone */ } });
// Ctrl+C: the first stops the running matches (the console sends it to them too) and lets the run write its summary and
// zip; a second one quits at once. Only the async race can see it between matches (the GA's spawnSync loop exits at once).
let STOP = false;
const children = new Set();
class Stopped extends Error {}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => {
  if (STOP || !opt.race) process.exit(130);
  STOP = true;
  console.log('\nstopping: finishing up (summary and zip); Ctrl+C again to quit without them');
  for (const c of children) { try { c.kill(); } catch { /* gone */ } }
});
const stopRequested = () => STOP || existsSync(join(OUT, 'STOP'));
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
let STEP = 0.15;
function tweakParam(rng, s, v) {
  if (s.type === 'bool') return !v;
  if (s.type === 'choice') return s.choices.length > 1 ? pick(rng, s.choices.filter((c) => c !== v)) : v;
  const span = s.max - s.min;
  // a small step usually, a jump now and then (--race shrinks STEP every iteration)
  let n = rng() < 0.8 ? v + (rng() * 2 - 1) * span * STEP : s.min + rng() * span;
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
  if (process.env.EVOLVE_FAKE) return fakeChunk(g, [a, b]);
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
/** runChunk for the race, async so Ctrl+C is seen between (and during) matches. */
async function runChunkA(g, [a, b], share = jobs) {
  if (process.env.EVOLVE_FAKE) {
    if (stopRequested()) throw new Stopped();
    if (process.env.EVOLVE_FAKE_STOP_AFTER && fakeSeen.size >= +process.env.EVOLVE_FAKE_STOP_AFTER) writeFileSync(join(OUT, 'STOP'), '');
    return fakeChunk(g, [a, b]);
  }
  const h = hashOf(g), file = join(OUT, 'cache', `${h}.s${a}-${b}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  if (stopRequested()) throw new Stopped();
  const prof = join(OUT, 'cache', `${h}.profile.json`);
  if (!existsSync(prof)) writeFileSync(prof, JSON.stringify({ id: `evo-${h}`, tactics: g }, null, 1));
  for (let tryN = 1; ; tryN++) {
    const tmp = file + '.tmp';
    const argv = ['tools/botbench.mjs', '--configs', CONFIG, '--seeds', String(b - a + 1), '--seed', String(a), '--jobs', String(Math.max(1, Math.min(share, b - a + 1))),
      '--profile', prof, '--json', tmp, '--quiet', ...(RULES ? ['--rules', RULES] : []), ...(opt.scenario ? ['--scenario', resolve(String(opt.scenario))] : [])];
    const r = await new Promise((done) => {
      let err = '';
      const child = spawn(process.execPath, argv, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
      children.add(child);
      child.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
      child.on('close', (status, signal) => { children.delete(child); done({ status, signal, stderr: err }); });
      child.on('error', (e) => { children.delete(child); done({ status: -1, signal: null, stderr: String(e) }); });
    });
    if (r.status === 0 && existsSync(tmp)) {
      renameSync(tmp, file);
      if (++clean >= 4 && jobs < JOBS_MAX) { jobs++; clean = 0; }
      return JSON.parse(readFileSync(file, 'utf8'));
    }
    rmSync(tmp, { force: true });
    if (stopRequested()) throw new Stopped();
    const oom = r.signal || (r.status ?? 0) >= 128 || /out of memory/i.test(r.stderr || '');
    if (!oom || tryN >= 4) throw new Error(`botbench failed for ${h} s${a}-${b} (exit ${r.status} ${r.signal || ''}): ${(r.stderr || '').slice(-600)}`);
    jobs = Math.max(1, Math.floor(jobs / 2)); clean = 0;
    log(`chunk ${h} s${a}-${b}: killed (memory?), retry at ${jobs} jobs`);
  }
}

/** DIR.zip next to DIR (Windows 10+: its tar.exe writes zip; elsewhere zip, else a .tar.gz). */
function pack() {
  const name = basename(OUT), parent = dirname(OUT);
  const ex = ['.pid', 'STOP', '*.tmp'];
  const tries = process.platform === 'win32'
    ? [['tar', ['-a', '-c', '-f', `${name}.zip`, ...ex.flatMap((e) => ['--exclude', e]), name], `${name}.zip`]]
    : [['zip', ['-qr', `${name}.zip`, name, '-x', ...ex.map((e) => `*/${e}`), `*/cache/${'*.tmp'}`], `${name}.zip`],
       ['tar', ['-czf', `${name}.tar.gz`, ...ex.flatMap((e) => ['--exclude', e]), name], `${name}.tar.gz`]];
  for (const [cmd, argv, out] of tries) {
    rmSync(join(parent, out), { force: true });
    const r = spawnSync(cmd, argv, { cwd: parent, stdio: 'ignore' });
    if (r.status === 0 && existsSync(join(parent, out))) return join(parent, out);
  }
  return null;
}

/**
 * EVOLVE_FAKE=<tactic id>: no matches, a synthetic game for checking the search itself (test/tools/evolve-race.test.js).
 * Each tactic in the profile adds a fixed effect in ±0.04 to a 40 % win chance, the named tactic +0.15 (EVOLVE_FAKE_EFFECT); a seed's luck
 * is shared by every candidate (60 %) plus the candidate's own (40 %), as paired matches are. Each chunk is counted in
 * DIR/fake-matches.
 */
const unit = (s) => parseInt(createHash('sha1').update(String(s)).digest('hex').slice(0, 8), 16) / 2 ** 32;
const fakeSeen = new Set();
function fakeChunk(g, [a, b]) {
  let p = 0.4;
  for (const id of new Set(g.map((e) => e.tactic))) p += id === process.env.EVOLVE_FAKE ? +(process.env.EVOLVE_FAKE_EFFECT || 0.15) : (unit(id) - 0.5) * 0.08;
  const out = [];
  for (let seed = a; seed <= b; seed++) {
    const luck = 0.6 * unit(`seed${seed}`) + 0.4 * unit(`${hashOf(g)}|${seed}`);
    out.push({ seed, victory: luck < p, hidden: false, roundsPassed: luck < p ? 14 : 10, bossRound: 14 });
  }
  const key = `${hashOf(g)}.s${a}-${b}`; // counted once, as the real cache would play it once
  if (!fakeSeen.has(key)) { fakeSeen.add(key); appendFileSync(join(OUT, 'fake-matches'), `${b - a + 1}\n`); }
  return out;
}
const score = (r) => (r.victory ? 1 : 0) + (r.hidden ? 0.25 : 0) + 0.25 * Math.min(1, (r.roundsPassed || 0) / Math.max(1, r.bossRound || 14));
/** The matches of `g` already saved for `seeds` (none are played). */
function cachedRecs(g, seeds) {
  if (process.env.EVOLVE_FAKE) return chunks(seeds).flatMap((c) => fakeChunk(g, c));
  const h = hashOf(g);
  return chunks(seeds).flatMap(([a, b]) => { const f = join(OUT, 'cache', `${h}.s${a}-${b}.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []; });
}
/** `g` on `seeds`; with --resample and `gen`, plus every earlier generation's block it has already played. */
function evaluate(g, seeds, gen = 0) {
  const recs = chunks(seeds).flatMap((c) => runChunk(g, c));
  if (opt.resample) for (let k = 0; k < gen; k++) recs.push(...cachedRecs(g, blockOf(k)));
  // paired: each match against legacy's on the same seed (legacy plays every seed any candidate plays), so a
  // candidate that drew easier seeds gains nothing from them
  const base = new Map();
  if (g.length) {
    const ranges = [seeds, ...(opt.resample ? Array.from({ length: gen }, (_, k) => blockOf(k)) : [])];
    for (const rg of ranges) for (const c of chunks(rg)) for (const x of runChunk([], c)) base.set(x.seed, x);
  }
  const diff = g.length ? recs.reduce((s, r) => s + score(r) - score(base.get(r.seed)), 0) / recs.length : 0;
  const raw = recs.reduce((s, r) => s + score(r), 0) / recs.length;
  return { fit: diff - 0.005 * g.length, raw, wins: recs.filter((r) => r.victory).length, n: recs.length, bySeed: new Map(recs.map((r) => [r.seed, r])) };
}
const describe = (g) => g.length ? g.map((e) => `${e.tactic}(${Object.entries(e.params).filter(([k, v]) => TACTICS[e.tactic].params[k].default !== v).map(([k, v]) => `${k}=${v}`).join(',')})`).join(' > ') : '(legacy)';

// ---- the run ----
const statePath = join(OUT, 'state.json');
const meta = { config: CONFIG, train: TRAIN, resample: !!opt.resample, holdout: HOLD, rules: RULES, seed: SEED, pop: POP, pool: POOL.map((t) => t.id), maxTactics: MAXT };
if (existsSync(statePath)) {
  const st = JSON.parse(readFileSync(statePath, 'utf8'));
  for (const k of ['config', 'train', 'resample', 'rules', 'seed']) if (JSON.stringify(st.meta[k]) !== JSON.stringify(meta[k])) throw new Error(`DIR was made with ${k}=${JSON.stringify(st.meta[k])}; use another --out`);
}

function rank(pop, seeds, gen) {
  const half = opt.halving ? [seeds[0], seeds[0] + Math.floor((seeds[1] - seeds[0] + 1) / 2) - 1] : null;
  let rows;
  if (half && half[1] >= half[0] && half[1] < seeds[1]) {
    rows = pop.map((g) => ({ g, ...evaluate(g, half, gen), partial: true }));
    rows.sort((x, y) => y.fit - x.fit);
    const keep = Math.ceil(rows.length / 2);
    for (let i = 0; i < rows.length; i++) if (i < keep || rows[i].g.length === 0) Object.assign(rows[i], evaluate(rows[i].g, seeds, gen), { partial: false });
  } else rows = pop.map((g) => ({ g, ...evaluate(g, seeds, gen), partial: false }));
  // full scores above half-seed scores
  rows.sort((x, y) => (x.partial - y.partial) || (y.fit - x.fit));
  return rows;
}

function report(gen, rows) {
  const base = rows.find((r) => r.g.length === 0);
  const lines = [`# Generation ${gen} — ${CONFIG}, seeds ${blockOf(gen).join('–')}${opt.resample ? ' (fitness: every block played so far)' : ''}${RULES ? `, rules ${RULES}` : ''}`, '',
    '| # | fitness (vs legacy) | wins | vs legacy (+ / −) | tactics | hash |', '|---|---|---|---|---|---|'];
  rows.forEach((r, i) => {
    let flips = '';
    if (base && !r.partial && r !== base) {
      let up = 0, down = 0;
      for (const [s, x] of r.bySeed) { const y = base.bySeed.get(s); if (!y) continue; if (x.victory && !y.victory) up++; if (!x.victory && y.victory) down++; }
      flips = `+${up} / −${down}`;
    }
    lines.push(`| ${i + 1} | ${r.fit >= 0 ? '+' : ''}${r.fit.toFixed(3)}${r.partial ? ' ½' : ''} | ${r.wins}/${r.n} | ${flips} | ${describe(r.g)} | ${hashOf(r.g)} |`);
  });
  writeFileSync(join(OUT, `gen-${gen}.md`), lines.join('\n') + '\n');
}

if (opt['holdout-only']) {
  const st = JSON.parse(readFileSync(statePath, 'utf8'));
  // the final ranking's best: they have played the most seeds (the best of every generation would pick early luck)
  const cands = st.gens[st.gens.length - 1].top.filter((r) => r.g.length).slice(0, 3).map((r) => r.g);
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

if (opt.race) { await raceMain(); process.exit(0); }

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
  const rows = rank(pop, blockOf(gen), gen);
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

// ---- --race: iterated racing (irace) ----
/** Runs async `tasks` (functions) with at most `k` at a time; the first error (Stopped) wins once all have settled. */
async function inPool(tasks, k) {
  let i = 0, err = null;
  const worker = async () => { while (i < tasks.length) { const t = tasks[i++]; try { await t(); } catch (e) { err ||= e; } } };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(k, tasks.length)) }, worker));
  if (err) throw err;
}
async function raceMain() {
  // a 10-seed block uses 10 workers at most: with more, several candidates' blocks run at once
  const PAR = Math.max(1, Math.floor(JOBS_MAX / 10));
  const SHARE = () => Math.max(1, Math.floor(jobs / PAR));
  const { eliminate, candidatesFor, minSurvivors, pickParent } = RACE;
  const ANY = !!opt.anytime;
  const IB = +(opt['iter-budget'] || 1500);
  const BUDGET = ANY ? Infinity : +(opt.budget || 2400), ITERS = ANY ? Infinity : +(opt.iters || 5), FIRST = +(opt.first || 3), ALPHA = +(opt.alpha || 0.05);
  const blockAt = (k) => [TRAIN[0] + 10 * k, TRAIN[0] + 10 * k + 9];
  const holdAt = (k) => [HOLD[0] + 10 * k, Math.min(HOLD[1], HOLD[0] + 10 * k + 9)];
  const HOLD_BLOCKS = Math.ceil((HOLD[1] - HOLD[0] + 1) / 10);
  const nParams = POOL.reduce((n, t) => n + 1 + Object.keys(t.params).length, 0);
  const SURV = minSurvivors(nParams);
  const st = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { meta, gens: [] };
  st.meta = { ...meta, race: ANY ? { anytime: true, iterBudget: IB, first: FIRST, alpha: ALPHA } : { budget: BUDGET, iters: ITERS, first: FIRST, alpha: ALPHA } };
  rmSync(join(OUT, 'STOP'), { force: true });
  log(`race: ${CONFIG}, ${ANY ? `anytime (${IB} matches an iteration; Ctrl+C to stop)` : `budget ${BUDGET} matches, ${ITERS} iterations`}, first test after ${FIRST} blocks, alpha ${ALPHA}, survivors ${SURV}, pool ${POOL.length} tactics`);
  // per genome: seed → paired score (its score minus legacy's on that seed)
  const scoresOf = new Map(), base = new Map();
  const play = async (g, k) => {
    const blk = blockAt(k);
    if (blk[1] >= HOLD[0] && blk[0] <= HOLD[1]) throw new Error(`the race reached the held-back seeds ${HOLD.join('-')}; lower --budget or move --holdout`);
    for (const r of await runChunkA([], blk, SHARE())) base.set(r.seed, score(r));
    const h = hashOf(g); if (!scoresOf.has(h)) scoresOf.set(h, new Map());
    const m = scoresOf.get(h);
    for (const r of await runChunkA(g, blk, SHARE())) m.set(r.seed, score(r) - base.get(r.seed) - 0.005 * g.length);
  };
  // --anytime: the held-back seeds the best of each iteration has played (cached chunks only, nothing is played here)
  const holdRows = () => {
    const seenH = new Set(), rows = [];
    const legacy = new Map(); for (let k = 0; k < HOLD_BLOCKS; k++) for (const r of cachedRecs([], holdAt(k))) legacy.set(r.seed, r);
    for (const [j, gen] of st.gens.entries()) {
      const top = gen?.top?.find((r) => r.g.length); if (!top || seenH.has(top.hash)) continue;
      seenH.add(top.hash);
      let n = 0, w = 0, lw = 0, up = 0, down = 0, d = 0;
      for (let k = 0; k < HOLD_BLOCKS; k++) for (const r of cachedRecs(top.g, holdAt(k))) {
        const y = legacy.get(r.seed); if (!y) continue;
        n++; if (r.victory) w++; if (y.victory) lw++;
        if (r.victory && !y.victory) up++; if (!r.victory && y.victory) down++;
        d += score(r) - score(y);
      }
      if (n) rows.push(`| ${j} | ${describe(top.g)} | ${n} | ${w} | ${lw} | +${up} / −${down} | ${d >= 0 ? '+' : ''}${(d / n).toFixed(3)} |`);
    }
    return [`# Held-back seeds ${HOLD.join('–')}: each iteration's best against legacy — ${CONFIG}`, '',
      '| iteration | best | seeds | wins | legacy wins | flips (+ / −) | fitness per match |', '|---|---|---|---|---|---|---|', ...rows];
  };
  const finish = (why) => {
    const last = st.gens.length - 1;
    const lines = [`# Evolution run — ${CONFIG}`, '', `Stopped: ${why}. ${st.gens.length} iterations finished; ${readdirSync(join(OUT, 'cache')).filter((f) => /\.s\d+-\d+\.json$/.test(f)).length * 10} matches played in all (cache).`,
      `best.json: ${last >= 0 ? describe(JSON.parse(readFileSync(join(OUT, 'best.json'), 'utf8')).tactics) : '(none yet)'}`, '',
      ...(last >= 0 ? [readFileSync(join(OUT, `gen-${last}.md`), 'utf8'), ''] : []), ...(ANY ? holdRows() : [])];
    writeFileSync(join(OUT, 'summary.md'), lines.join('\n') + '\n');
    if (ANY) writeFileSync(join(OUT, 'holdout.md'), holdRows().join('\n') + '\n');
    log(`stopped (${why}); summary.md written`);
    if (ANY || why !== 'done') {
      try { rmSync(PID, { force: true }); } catch { /* gone */ }
      const z = pack();
      log(z ? `packed: ${z} — send this file back` : `could not pack ${OUT}; send the folder instead`);
    }
  };
  let used = 0, seen = 0, elites = [];
  try {
    for (let j = 0; j < ITERS; j++) {
      const rng = rngOf(SEED * 1000003 + 7919 * (j + 1));
      STEP = 0.15 * Math.pow(0.7, Math.min(j, 6));
      // anytime: every iteration has its own IB matches (irace's share for one iteration out of one left)
      const share = () => (ANY ? candidatesFor(IB / 10, j, j + 1, FIRST) : candidatesFor(Math.max(0, BUDGET / 10 - used), j, ITERS, FIRST));
      const { n } = share();
      const pop = [[], ...elites], hs = new Set(pop.map(hashOf));
      // the first race screens every pool tactic alone (the space's first design), whatever N_0 is
      if (j === 0) for (const t of POOL) { const g = [{ tactic: t.id, params: defaults(t) }]; if (!hs.has(hashOf(g))) { hs.add(hashOf(g)); pop.push(g); } }
      for (let guard = 0; pop.length < Math.max(n, elites.length + 3) && guard < 500; guard++) {
        let g = j === 0 || !elites.length ? Array.from({ length: 1 + Math.floor(rng() * 2) }, () => newEntry(rng)) : mutate(rng, pickParent(rng, elites));
        if (j > 0 && rng() < 0.2 && elites.length > 1) g = mutate(rng, crossover(rng, pickParent(rng, elites), pickParent(rng, elites)));
        const h = hashOf(g); if (!hs.has(h) && g.length) { hs.add(h); pop.push(g); }
      }
      const eliteHs = new Set(elites.map(hashOf));
      let alive = pop.map((g) => ({ g, id: hashOf(g) }));
      const limit = share().budget;
      let spent = 0, k = 0;
      for (; alive.length > SURV + 1 || k < Math.max(FIRST, seen); k++) {
        const fresh = alive.filter((c) => c.g.length && !(scoresOf.get(c.id)?.has(blockAt(k)[0]))).length;
        if (k >= Math.max(FIRST, seen) && spent + fresh > limit) break;
        // legacy's block first (every candidate's score is paired against it), then the candidates side by side
        for (const r of await runChunkA([], blockAt(k), SHARE())) base.set(r.seed, score(r));
        await inPool(alive.filter((c) => c.g.length).map((c) => () => play(c.g, k)), PAR);
        spent += fresh; used += fresh;
        if (k + 1 < FIRST) continue;
        const seeds = new Set(); for (let q = 0; q <= k; q++) for (let s = blockAt(q)[0]; s <= blockAt(q)[1]; s++) seeds.add(s);
        const view = alive.map((c) => ({ id: c.id, protected: !c.g.length || (eliteHs.has(c.id) && k < seen),
          scores: c.g.length ? new Map([...scoresOf.get(c.id)].filter(([s]) => seeds.has(s))) : new Map([...seeds].map((s) => [s, 0])) }));
        const { drop } = eliminate(view, ALPHA);
        if (drop.length) { alive = alive.filter((c) => !drop.includes(c.id)); log(`iter ${j} block ${k}: dropped ${drop.length}, ${alive.length} left`); }
        if (spent >= limit && k + 1 >= Math.max(FIRST, seen)) { k++; break; }
      }
      seen = Math.max(seen, k);
      const mean = (c) => { if (!c.g.length) return 0; const m = scoresOf.get(c.id); let s = 0, n2 = 0; for (const v of m.values()) { s += v; n2++; } return n2 ? s / n2 : -Infinity; };
      const ranked = alive.filter((c) => c.g.length).sort((x, y) => mean(y) - mean(x));
      elites = ranked.slice(0, SURV).map((c) => c.g);
      const rows = [{ g: [], fit: 0 }, ...ranked.map((c) => ({ g: c.g, fit: mean(c) }))].sort((x, y) => y.fit - x.fit);
      const winsOf = (g) => { let w = 0, n2 = 0; for (let q = 0; q < seen; q++) for (const r of cachedRecs(g, blockAt(q))) { n2++; if (r.victory) w++; } return { wins: w, n: n2 }; };
      st.gens[j] = { top: rows.slice(0, Math.max(SURV, 5)).map((r) => ({ hash: hashOf(r.g), fit: r.fit, ...winsOf(r.g), g: r.g })) };
      writeFileSync(statePath, JSON.stringify(st, null, 1));
      const lines = [`# Race iteration ${j} — ${CONFIG}, seeds ${TRAIN[0]}–${blockAt(seen - 1)[1]} (${seen} blocks), ${pop.length} candidates, ${alive.length} survived; ${used * 10}${ANY ? '' : ` of ${BUDGET}`} matches`, '',
        '| # | fitness (vs legacy, per match) | wins | seeds | tactics | hash |', '|---|---|---|---|---|---|'];
      st.gens[j].top.forEach((r, i) => lines.push(`| ${i + 1} | ${r.fit >= 0 ? '+' : ''}${r.fit.toFixed(3)} | ${r.wins} | ${r.n} | ${describe(r.g)} | ${r.hash} |`));
      writeFileSync(join(OUT, `gen-${j}.md`), lines.join('\n') + '\n');
      const best = rows.find((r) => r.g.length) || rows[0];
      writeFileSync(join(OUT, 'best.json'), JSON.stringify({ id: `evo-${hashOf(best.g)}`, tactics: best.g }, null, 1));
      log(`iter ${j}: ${pop.length} candidates, ${alive.length} survived after ${seen} blocks; best ${best.fit.toFixed(3)} ${describe(best.g)}; ${used * 10}${ANY ? '' : `/${BUDGET}`} matches`);
      if (ANY && best.g.length) {
        // the held-back check grows with the run: 6 blocks, one more each iteration, all 30 at most
        const hb = Array.from({ length: Math.min(HOLD_BLOCKS, 6 + j) }, (_, q) => q);
        await inPool(hb.map((q) => () => runChunkA([], holdAt(q), SHARE())), PAR);
        await inPool(hb.map((q) => () => runChunkA(best.g, holdAt(q), SHARE())), PAR);
        writeFileSync(join(OUT, 'holdout.md'), holdRows().join('\n') + '\n');
      }
      if (used * 10 >= BUDGET) break;
    }
  } catch (e) {
    if (!(e instanceof Stopped)) throw e;
    finish('Ctrl+C');
    return;
  }
  log('race done');
  finish('done');
}
