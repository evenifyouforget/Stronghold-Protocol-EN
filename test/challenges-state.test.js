import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultState, normalizeState, ensure, reroll, easier, harder, toggleFreeze, setEnabled, reset, MAX_LEVEL, STATE_VERSION } from '../public/js/challenges/state.js';
import { SLOTS } from '../public/js/challenges/generate.js';

const prior = JSON.parse(fs.readFileSync(new URL('../public/js/challenges/prior.json', import.meta.url), 'utf8'));
const first = () => ensure(defaultState(42), [], prior);
const parts = (s) => s.open.map((c) => c.parts.join('+'));

test('a new state has no panel until ensure, which fills every slot and is stable', () => {
  const d = defaultState(42);
  assert.deepEqual(d.open, new Array(SLOTS).fill(null));
  const s = ensure(d, [], prior);
  assert.ok(s.open.every((c) => c && c.parts.length && c.points >= 1 && c.frozen === false));
  assert.deepEqual(ensure(s, [], prior), s, 'ensure keeps a full panel');
  assert.deepEqual(parts(ensure(defaultState(42), [], prior)), parts(s), 'the same seed gives the same panel after a reload');
  assert.equal(ensure(setEnabled(d, false), [], prior).open[0], null, 'switched off: nothing is generated');
});

test('reroll draws fresh cards, keeps frozen ones, and Easier / Harder move the level (bounded)', () => {
  let s = first();
  const was = parts(s);
  s = toggleFreeze(s, 1);
  const r = reroll(s, [], prior);
  assert.notDeepEqual(parts(r), was); assert.equal(parts(r)[1], was[1]); assert.equal(r.open[1].frozen, true);
  assert.equal(easier(r, [], prior).level, -1); assert.equal(harder(r, [], prior).level, 1);
  let h = r; for (let i = 0; i < 20; i++) h = harder(h, [], prior);
  assert.equal(h.level, MAX_LEVEL); assert.equal(parts(h)[1], was[1], 'still frozen');
  assert.equal(toggleFreeze(r, 1).open[1].frozen, false);
  assert.equal(toggleFreeze(r, 9), r);
});

test('every regeneration differs, and the same sequence of presses gives the same panels (replayable)', () => {
  const run = () => { let s = first(); const out = [parts(s).join('|')]; for (const f of [reroll, harder, reroll, easier]) { s = f(s, [], prior); out.push(parts(s).join('|')); } return out; };
  const a = run(); assert.deepEqual(a, run());
  assert.equal(new Set(a).size, a.length);
});

test('normalizeState: survives garbage, drops unknown instances, bounds everything', () => {
  assert.deepEqual(normalizeState(null), defaultState());
  assert.deepEqual(normalizeState({ v: 99 }), defaultState());
  const s = first();
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(s))), s, 'a round trip through JSON is the same state');
  const bad = JSON.parse(JSON.stringify(s)); bad.open[0].parts.push('nonsense'); bad.level = 99; bad.done = [{ at: 1, pts: 5, parts: ['win'] }, 'x', { at: 'no' }]; bad.extra = 1;
  const n = normalizeState(bad);
  assert.equal(n.open[0], null); assert.equal(n.level, MAX_LEVEL); assert.equal(n.done.length, 1); assert.equal('extra' in n, false); assert.equal(n.v, STATE_VERSION);
  assert.equal(ensure(n, [], prior).open[0] !== null, true, 'the dropped card is generated again');
});

test('reset clears everything and takes a new seed', () => {
  const s = ensure(reset(7), [], prior);
  assert.equal(s.level, 0); assert.equal(s.done.length, 0); assert.notDeepEqual(parts(s), parts(first()));
});
