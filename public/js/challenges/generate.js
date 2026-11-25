// Generating the panel of Challenges (fish-edition/untracked/challenge-system-draft.md §5.2). Pure: the same seed, history, level and
// frozen cards always give the same panel, so a reload shows the same challenges and a test can reproduce one.
//
// A challenge = one outcome + conditions whose ratings (prior.json, logit difficulty) sum to a TARGET near the player's level:
// success chance = sigmoid(θ − sum), so the target sum θ means "about one match in two". Easier / Harder shift the target by
// STEP per press; the three slots sit a little apart so the panel offers a choice of effort. A frozen card is kept as it is.

import { OUTCOMES, CONDITIONS, BY_ID, compatible } from './catalog.js';
import { ability, playstyle } from './model.js';

export const STEP = 0.5; // logit per Easier / Harder press (Fish, 2026-11-26: halve if automated tests find it too extreme)
export const HALF_WIDTH = 0.4; // half-width of the target range
export const SLOTS = 3;
export const MAX_PARTS = 5; // one outcome + up to four conditions
const TRIES = 60;

/** mulberry32: a small seeded PRNG (the same shape the engine uses for its own seeded draws). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickWeighted = (items, weights, r) => {
  let total = 0; for (const w of weights) total += w;
  if (!(total > 0)) return null;
  let x = r() * total;
  for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
};

export const ratingOf = (parts, prior) => parts.reduce((s, p) => s + (prior.ratings[p.id] ?? 0), 0);
/** The points of a challenge (the prior rating, not the personal one: playing badly on purpose cannot raise it). Scale is for P5 to settle. */
export const pointsOf = (rating) => Math.max(1, Math.round(rating * 5));
const isWinOutcome = (p) => p.id === 'win' || p.id === 'winHidden';

/** One challenge near `target` (±tol), avoiding keys in `taken` (what the other cards hold). */
function makeOne({ prior, style, target, tol, taken, r, usedIds }) {
  const rated = (c) => c.needsPrior && prior.ratings[c.id] != null;
  const outcomes = OUTCOMES.filter((c) => rated(c) && !usedIds.has(c.id));
  if (!outcomes.length) outcomes.push(...OUTCOMES.filter(rated));
  let best = null;
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const out = pickWeighted(outcomes, outcomes.map((o) => (o.id === 'win' ? 4 : o.id === 'winHidden' ? 2 : 1) * Math.exp(-Math.abs(target - prior.ratings[o.id]) / 2)), r);
    const parts = [out];
    let sum = ratingOf(parts, prior);
    while (parts.length < MAX_PARTS && Math.abs(sum - target) > tol) {
      const gap = target - sum;
      const cands = CONDITIONS.filter((c) => rated(c) && !taken.has(c.key) && compatible(parts, c) && (c.kind !== 'performance' || isWinOutcome(out)));
      // prefer a condition whose rating closes the gap (a hard condition alone, or a light one that leaves room); novelty favours the unusual
      const w = cands.map((c) => Math.exp(-Math.abs(gap - prior.ratings[c.id])) * style.novelty(c));
      const c = pickWeighted(cands, w, r);
      if (!c) break;
      parts.push(c); sum += prior.ratings[c.id];
    }
    const err = Math.abs(sum - target);
    if (!best || err < best.err) best = { parts, err, sum };
    if (err <= tol && parts.length >= 1) break;
  }
  return best;
}

/**
 * The panel: `SLOTS` challenges. `frozen[i]` (a saved challenge) is kept; the others are generated.
 * @param {{ prior: any, history?: any[], level?: number, frozen?: (any|null)[], seed: number }} o
 * @returns {{ theta: number, target: number, cards: { id: string, parts: string[], rating: number, points: number, frozen: boolean }[] }}
 */
export function generatePanel({ prior, history = [], level = 0, frozen = [], seed }) {
  const { theta } = ability(history, prior);
  const style = playstyle(history);
  const r = rng(seed);
  const target = theta + level * STEP;
  const taken = new Set();
  const usedIds = new Set();
  const cards = new Array(SLOTS).fill(null);
  for (let i = 0; i < SLOTS; i++) {
    const f = frozen[i];
    if (f && Array.isArray(f.parts)) {
      const parts = f.parts.map((id) => BY_ID.get(id)).filter(Boolean);
      if (parts.length === f.parts.length) { cards[i] = { ...f, frozen: true }; for (const p of parts) taken.add(p.key); usedIds.add(parts[0].id); }
    }
  }
  for (let i = 0; i < SLOTS; i++) {
    if (cards[i]) continue;
    const centre = target + (i - (SLOTS - 1) / 2) * HALF_WIDTH;
    const made = makeOne({ prior, style, target: centre, tol: HALF_WIDTH * 0.75, taken, r, usedIds });
    const rating = ratingOf(made.parts, prior);
    for (const p of made.parts) taken.add(p.key);
    usedIds.add(made.parts[0].id);
    cards[i] = { id: `${seed}-${i}-${made.parts.map((p) => p.id).join('+')}`, parts: made.parts.map((p) => p.id), rating, points: pointsOf(rating), frozen: false };
  }
  return { theta, target, cards };
}
