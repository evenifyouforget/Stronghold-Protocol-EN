// shared/rules.js — Custom Lobby Modifications (Fish Edition): the host-set rules of a room, all off by default. Pure ESM
// shared by the server (lobby, match), the sim (BattleSpec flags.rules) and the client (room screen, result screen).
//
// Every rule has a category (remove-before-merge/ROADMAP.md "SPA-CC"), which decides how a result is labelled:
//   neutral  free to take: Alliance Modules, rebalanced alliances
//   cheat    the end screen carries a "WITH CHEATS" watermark (+2 Deployment Limit, +2 Funds, untimed)
//   seeded   less luck: "seeded" after the result title (the chosen map, chosen alliance bans)
//   risk     difficulty tags worth Risk ("Ultimate+5"); none yet — SPA-CC adds them here
// A rule's value type:
//   bool     true / false (default false)
//   choice   one of `options` (default options[0], the original game)
//   stage    a stage id of the match's mode, or null = random (the match drops one its mode does not have)
//   bans     a list of bond ids to ban, at most `max`; the match keeps the valid ones up to the difficulty's counts and
//            draws the rest at random as usual
// room.setRules merges a partial { [key]: value } into the room's rules; the match reads them once at start
// (Match opts.rules). Rooms searching for teammates and the solo queue play the original game: a room with any rule
// set cannot search (Lobby.search).

export const RULE_CATEGORIES = Object.freeze(['neutral', 'cheat', 'seeded', 'risk']);

export const RULE_EXTRA_DEPLOY = 2;
export const RULE_EXTRA_FUNDS = 2;
/** The most ban picks a rules object keeps (the difficulties draw at most 3 core + 4 add-on). */
export const RULE_BANS_MAX = 12;

/**
 * The rules, in the order the room screen lists them.
 * @type {ReadonlyArray<{ key: string, type: 'bool' | 'choice' | 'stage' | 'bans', category: string, options?: string[] }>}
 */
export const RULES = Object.freeze([
  // cheats
  { key: 'extraDeploy', type: 'bool', category: 'cheat' },      // +RULE_EXTRA_DEPLOY deployment limit for every player
  { key: 'extraFunds', type: 'bool', category: 'cheat' },       // +RULE_EXTRA_FUNDS Funds at every round start
  { key: 'untimed', type: 'bool', category: 'cheat' },          // no countdown on the screens players act on (battles keep theirs)
  // Alliance Modules: A = the original effect
  { key: 'lateranoMod', type: 'choice', options: ['A', 'B'], category: 'neutral' },
  { key: 'victoriaMod', type: 'choice', options: ['A', 'C'], category: 'neutral' },
  // rebalanced alliances
  { key: 'virtuosaBonds', type: 'bool', category: 'neutral' },  // 塑心 also in 迅捷 and 助力
  { key: 'blaze', type: 'bool', category: 'neutral' },          // 煌 replaces 凯瑟琳 in her shop slot
  // less luck
  { key: 'stage', type: 'stage', category: 'seeded' },
  { key: 'bans', type: 'bans', category: 'seeded' },
].map((r) => Object.freeze(r)));

const BY_KEY = new Map(RULES.map((r) => [r.key, r]));
export const RULE_KEYS = Object.freeze(RULES.map((r) => r.key));

const ID = /^[A-Za-z0-9_\-]{1,64}$/;

/** The default (original game) value of a rule. */
export function ruleDefault(rule) {
  if (rule.type === 'bool') return false;
  if (rule.type === 'choice') return rule.options[0];
  if (rule.type === 'bans') return Object.freeze([]);
  return null;
}

export const DEFAULT_RULES = Object.freeze(Object.fromEntries(RULES.map((r) => [r.key, ruleDefault(r)])));

/** `v` as a valid value of `rule`, or undefined. */
function cleanValue(rule, v) {
  switch (rule.type) {
    case 'bool': return typeof v === 'boolean' ? v : undefined;
    case 'choice': return rule.options.includes(v) ? v : undefined;
    case 'stage': return v === null || (typeof v === 'string' && ID.test(v)) ? v : undefined;
    case 'bans': {
      if (!Array.isArray(v)) return undefined;
      const out = [];
      for (const id of v) if (typeof id === 'string' && ID.test(id) && !out.includes(id) && out.length < RULE_BANS_MAX) out.push(id);
      return Object.freeze(out.sort());
    }
    default: return undefined;
  }
}

/** Whether `v` is a valid value of rule `key` as sent by a client (room.setRules; shared/protocol.js). */
export function isRuleValue(key, v) {
  const r = BY_KEY.get(key);
  if (!r || cleanValue(r, v) === undefined) return false;
  return r.type !== 'bans' || (v.length <= RULE_BANS_MAX && new Set(v).size === v.length && v.every((id) => typeof id === 'string' && ID.test(id)));
}

/** Whether two values of one rule are the same (a bans list by its ids). */
export function sameRuleValue(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  return a === b;
}

/** A complete, frozen rules object: known keys only, valid values only, the rest from `base` (default: all off). */
export function normalizeRules(rules, base = DEFAULT_RULES) {
  const out = {};
  for (const r of RULES) {
    const v = rules && typeof rules === 'object' ? cleanValue(r, rules[r.key]) : undefined;
    const b = base && typeof base === 'object' ? cleanValue(r, base[r.key]) : undefined;
    out[r.key] = v !== undefined ? v : b !== undefined ? b : ruleDefault(r);
  }
  return Object.freeze(out);
}

/** Whether a rule's value differs from the original game. */
export function ruleSet(key, value) {
  const r = BY_KEY.get(key);
  if (!r) return false;
  if (r.type === 'bans') return Array.isArray(value) && value.length > 0;
  return value !== undefined && value !== ruleDefault(r);
}

/** The keys of the rules in force (not at their default), in RULES order. */
export function rulesInForce(rules) {
  return RULE_KEYS.filter((k) => ruleSet(k, rules?.[k]));
}

/** Whether a rules object changes anything (a room with one cannot search for teammates). */
export const anyRule = (rules) => rulesInForce(rules).length > 0;

/**
 * How a result with these rules is labelled: `cheats` (the "WITH CHEATS" watermark; Risk counts as 0), `seeded`, and
 * `risk` (the sum of the risk tags; 0 with cheats).
 * @returns {{ cheats: boolean, seeded: boolean, risk: number }}
 */
export function ruleLabels(rules) {
  const on = rulesInForce(rules).map((k) => BY_KEY.get(k));
  const cheats = on.some((r) => r.category === 'cheat');
  const seeded = on.some((r) => r.category === 'seeded');
  const risk = cheats ? 0 : on.reduce((n, r) => n + (r.category === 'risk' ? Number(r.risk) || 0 : 0), 0);
  return { cheats, seeded, risk };
}

/** The rule record of `key`, or null. */
export const ruleOf = (key) => BY_KEY.get(key) || null;
