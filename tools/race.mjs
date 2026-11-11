// tools/race.mjs — (fork) the statistics of iterated racing for tools/evolve.mjs --race (fish-edition/ai-players/10).
// After irace (López-Ibáñez et al. 2016, "The irace package: Iterated racing for automatic algorithm configuration",
// Operations Research Perspectives 3: 43–58) and F-Race (Birattari et al. 2002): candidates play the same instances
// (here: seeds) one block at a time, and a candidate is dropped as soon as a paired test says it is worse than the
// current best. irace recommends the t-test when the scores of different instances are commensurable and the goal is
// the mean, which is our case (one score scale per match); we use the paired t-test with Holm's correction.
// Pure functions: no I/O, so test/tools/race.test.js checks them without a single match.

/** Regularised incomplete beta I_x(a, b) (Numerical Recipes' continued fraction). */
function betacf(a, b, x) {
  const EPS = 3e-14, FPMIN = 1e-300;
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function lgamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015; for (const c of g) ser += c / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/** P(T ≤ t) for Student's t with `df` degrees of freedom. */
export function tCdf(t, df) {
  const p = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - p : p;
}

/**
 * Paired comparison of `a` against `b` on the keys (seeds) both have: mean difference, its t statistic and the
 * one-sided p-value that `a` is worse (mean a − b < 0). Ties everywhere give p = 1.
 * @param {Map<any, number>} a @param {Map<any, number>} b
 */
export function pairedWorse(a, b) {
  const d = [];
  for (const [k, x] of a) if (b.has(k)) d.push(x - b.get(k));
  const n = d.length;
  if (n < 2) return { n, mean: n ? d[0] : 0, t: 0, p: 1 };
  const mean = d.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1));
  if (sd === 0) return { n, mean, t: mean === 0 ? 0 : mean > 0 ? Infinity : -Infinity, p: mean < 0 ? 0 : 1 };
  const t = mean / (sd / Math.sqrt(n));
  return { n, mean, t, p: tCdf(t, n - 1) };
}

/**
 * One elimination step of the race. `alive`: [{ id, scores: Map(seed → score), protected? }]. The best is the highest
 * mean over its seeds; every other candidate is tested against it (paired, on common seeds), and Holm's step-down
 * correction at `alpha` decides who is dropped. A protected candidate (the control, or an elite that has not yet met
 * new seeds) is never dropped.
 * @returns {{ best: string, drop: string[], tests: Array<{ id: string, mean: number, t: number, p: number, n: number }> }}
 */
export function eliminate(alive, alpha = 0.05) {
  const mean = (m) => { let s = 0; for (const v of m.values()) s += v; return m.size ? s / m.size : -Infinity; };
  const best = alive.reduce((x, y) => (mean(y.scores) > mean(x.scores) ? y : x));
  const tests = alive.filter((c) => c !== best).map((c) => ({ id: c.id, prot: !!c.protected, ...pairedWorse(c.scores, best.scores) }));
  const order = [...tests].sort((x, y) => x.p - y.p);
  const drop = [];
  for (let i = 0; i < order.length; i++) {
    if (order[i].p > alpha / (order.length - i)) break; // Holm: stop at the first test that is not significant
    if (!order[i].prot) drop.push(order[i].id);
  }
  return { best: best.id, drop, tests };
}

/**
 * irace's budget split (López-Ibáñez et al. 2016, §3): iteration j of `iters` gets the remaining budget over the
 * iterations left, and N_j = floor(B_j / (mu + min(5, j))) candidates, mu = the blocks before the first test.
 * Budget and the return are in blocks (candidate × block of seeds).
 */
export function candidatesFor(remaining, j, iters, mu) {
  const bj = remaining / Math.max(1, iters - j);
  return { budget: bj, n: Math.floor(bj / (mu + Math.min(5, j + 1))) };
}

/** irace's minimum survivors: floor(2 + log2(number of parameters)). */
export const minSurvivors = (nParams) => Math.floor(2 + Math.log2(Math.max(1, nParams)));

/** Pick an elite as a parent with probability (N − r + 1) / Σ (rank r = 1 best), as irace does. */
export function pickParent(rng, elites) {
  const n = elites.length, tot = (n * (n + 1)) / 2;
  let x = rng() * tot;
  for (let r = 1; r <= n; r++) { x -= n - r + 1; if (x < 0) return elites[r - 1]; }
  return elites[n - 1];
}
