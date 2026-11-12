// (fork) tools/race.mjs (the statistics of iterated racing) and tools/evolve.mjs --race on a synthetic game
// (EVOLVE_FAKE: no matches are played). fish-edition/ai-players/10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tCdf, pairedWorse, eliminate, candidatesFor, minSurvivors, pickParent } from '../tools/race.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Student t CDF matches table values', () => {
  assert.ok(Math.abs(tCdf(0, 5) - 0.5) < 1e-9);
  assert.ok(Math.abs(tCdf(2.228, 10) - 0.975) < 1e-3);
  assert.ok(Math.abs(tCdf(-1.812, 10) - 0.05) < 1e-3);
  assert.ok(Math.abs(tCdf(1.645, 1e6) - 0.95) < 1e-3, 'large df: the normal');
});

test('paired test: a constant shift is worse with p 0; noise around zero is not', () => {
  const a = new Map(), b = new Map(), c = new Map();
  for (let s = 1; s <= 30; s++) { b.set(s, s % 3); a.set(s, (s % 3) - 1); c.set(s, (s % 3) + (s % 2 ? 0.5 : -0.5)); }
  assert.equal(pairedWorse(a, b).p, 0);
  assert.ok(pairedWorse(c, b).p > 0.3);
  assert.equal(pairedWorse(new Map([[1, 0]]), b).p, 1, 'one common seed: no test');
});

test('eliminate drops a significantly worse candidate, never a protected one, and Holm stops at the first miss', () => {
  const m = (f) => new Map(Array.from({ length: 40 }, (_, i) => [i, f(i)]));
  const alive = [
    { id: 'best', scores: m((i) => (i % 4) * 0.1 + 0.3) },
    { id: 'bad', scores: m((i) => (i % 4) * 0.1) },
    { id: 'close', scores: m((i) => (i % 4) * 0.1 + 0.3 - (i % 2 ? 0.05 : -0.04)) },
    { id: 'control', protected: true, scores: m((i) => (i % 4) * 0.1 - 0.2) },
  ];
  const r = eliminate(alive, 0.05);
  assert.equal(r.best, 'best');
  assert.deepEqual(r.drop, ['bad']);
});

test('irace budget split and survivors floor', () => {
  assert.deepEqual(candidatesFor(240, 0, 5, 3), { budget: 48, n: 12 });
  assert.equal(candidatesFor(100, 4, 5, 3).n, 12);
  assert.equal(minSurvivors(1), 2);
  assert.equal(minSurvivors(40), 7);
  let x = 0; const rng = () => (x = (x + 0.37) % 1);
  const counts = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 3000; i++) counts[pickParent(rng, ['a', 'b', 'c'])]++;
  assert.ok(counts.a > counts.b && counts.b > counts.c, 'the better ranked elite is picked more');
});

test('evolve --race finds a planted tactic in a synthetic game, within the budget', () => {
  const out = mkdtempSync(join(tmpdir(), 'evo-race-'));
  try {
    const r = spawnSync(process.execPath, ['tools/evolve.mjs', '--out', out, '--race', '--budget', '1800'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, EVOLVE_FAKE: 'early-roll' } });
    assert.equal(r.status, 0, r.stderr);
    const best = JSON.parse(readFileSync(join(out, 'best.json'), 'utf8'));
    assert.ok(best.tactics.some((e) => e.tactic === 'early-roll'), JSON.stringify(best));
    const played = readFileSync(join(out, 'fake-matches'), 'utf8').trim().split('\n').reduce((s, n) => s + +n, 0);
    assert.ok(played <= 1800 + 400, `played ${played}`); // a block may finish past the budget
    assert.ok(readdirSync(out).some((f) => /^gen-\d+\.md$/.test(f)));
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('evolve --anytime runs until stopped, then writes a summary and packs the folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'evo-any-'));
  const out = join(root, 'run');
  try {
    const r = spawnSync(process.execPath, ['tools/evolve.mjs', '--out', out, '--anytime', '--iter-budget', '600', '--holdout', '5001-5060'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, EVOLVE_FAKE: 'early-roll', EVOLVE_FAKE_STOP_AFTER: '400' } });
    assert.equal(r.status, 0, r.stderr);
    const summary = readFileSync(join(out, 'summary.md'), 'utf8');
    assert.match(summary, /Stopped: Ctrl\+C/);
    assert.ok(readdirSync(out).some((f) => /^gen-\d+\.md$/.test(f)), 'at least one iteration finished');
    assert.match(readFileSync(join(out, 'holdout.md'), 'utf8'), /\| 0 \|/);
    assert.ok(readdirSync(root).some((f) => /^run\.(zip|tar\.gz)$/.test(f)), readdirSync(root).join(','));
    // the same command resumes from the cache: the finished iterations replay without new matches
    const before = readFileSync(join(out, 'fake-matches'), 'utf8').trim().split('\n').length;
    const r2 = spawnSync(process.execPath, ['tools/evolve.mjs', '--out', out, '--anytime', '--iter-budget', '600', '--holdout', '5001-5060'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, EVOLVE_FAKE: 'early-roll', EVOLVE_FAKE_STOP_AFTER: String(before + 50) } });
    assert.equal(r2.status, 0, r2.stderr);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
