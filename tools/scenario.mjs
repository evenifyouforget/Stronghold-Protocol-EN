// (fork) Scenario tests for the bot bench (Fish's TODO, 2026-11-12: "Set up a scenario where the game already starts
// with 1 Muelsyse (or gifts it on round 7), to see if the bots know how to scale from there"; "Other scenario tests,
// which make it possible to test if a tactic is useful even if it would only be relevant to 5% of games happening by
// chance"). A scenario gives the bot seats operators, items or funds at the start of a round's prep, after the prep's
// own start effects and before any bot acts, through the game's own gain path (on-gain traits fire, pool copies are
// taken). botbench --scenario FILE; the same scenario on the same seeds makes paired comparisons of tactics in it.
//
// FILE (JSON):
//   { "id": "muelsyse-r7",
//     "gifts": [
//       { "round": 7, "chess": "chess_char_6_11_a" },          an operator (normal; an elite id gives the elite)
//       { "round": 5, "item": "chess_item_6_09_e_a", "count": 2 },  items
//       { "round": 3, "funds": 10 },                            funds
//       { "round": 7, "chess": "…", "seats": [0] } ] }          only these seats (default: every bot seat)

const KINDS = ['chess', 'item', 'funds'];

/** Checks a scenario object; throws on a mistake (so a typo never runs a whole bench as a plain one). */
export function parseScenario(raw, gd = null) {
  const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!s || typeof s !== 'object' || !Array.isArray(s.gifts) || !s.gifts.length) throw new Error('scenario: needs a non-empty "gifts" list');
  const gifts = s.gifts.map((g, i) => {
    const kinds = KINDS.filter((k) => g[k] != null);
    if (kinds.length !== 1) throw new Error(`scenario gift ${i}: give exactly one of ${KINDS.join(' / ')}`);
    const round = Number(g.round);
    if (!Number.isInteger(round) || round < 1 || round > 30) throw new Error(`scenario gift ${i}: bad round ${g.round}`);
    const count = g.count == null ? 1 : Number(g.count);
    if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error(`scenario gift ${i}: bad count ${g.count}`);
    const seats = g.seats == null || g.seats === 'all' ? 'all' : g.seats;
    if (seats !== 'all' && !(Array.isArray(seats) && seats.every((x) => Number.isInteger(x) && x >= 0))) throw new Error(`scenario gift ${i}: bad seats`);
    const kind = kinds[0];
    if (kind === 'funds') {
      if (!Number.isInteger(g.funds) || g.funds < 1 || g.funds > 200) throw new Error(`scenario gift ${i}: bad funds ${g.funds}`);
    } else if (gd) {
      if (kind === 'chess' && !gd.chess(g.chess)) throw new Error(`scenario gift ${i}: unknown operator ${g.chess}`);
      if (kind === 'item' && !gd.item(g.item)) throw new Error(`scenario gift ${i}: unknown item ${g.item}`);
    }
    return Object.freeze({ round, kind, id: kind === 'funds' ? null : g[kind], funds: kind === 'funds' ? g.funds : 0, count, seats });
  });
  return Object.freeze({ id: String(s.id || 'scenario'), gifts: Object.freeze(gifts) });
}

/**
 * Installs the scenario on a match: its gifts land in each round's prep right after Match.enterPrep (the prep's start
 * effects ran; the bots' preps are only scheduled). Returns a log array of what was given ({ round, seat, kind, id, ok }).
 */
export function applyScenario(m, scenario) {
  const log = [];
  const enterPrep = m.enterPrep.bind(m);
  m.enterPrep = (...a) => {
    const r = enterPrep(...a);
    for (const g of scenario.gifts) {
      if (g.round !== m.round) continue;
      for (const ps of m.alivePlayers()) {
        if (!ps.isBot || (g.seats !== 'all' && !g.seats.includes(ps.seat))) continue;
        for (let k = 0; k < g.count; k++) {
          let ok;
          if (g.kind === 'funds') { ps.funds += g.funds; ok = true; }
          else if (g.kind === 'chess') ok = !!ps.acquireChess(g.id, { source: 'scenario' });
          else ok = !!ps.acquireItem(g.id, { source: 'scenario', requirePool: false });
          log.push({ round: m.round, seat: ps.seat, kind: g.kind, id: g.id, ok });
        }
        ps.recompute();
      }
    }
    return r;
  };
  return log;
}
