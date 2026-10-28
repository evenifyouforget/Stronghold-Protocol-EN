// (fork) SPA-CC Risk tag texts in the room's rules dialog (public/js/ui/lobbyRules.js).
//   GitHub #84: a stacking chain (Investor, Strategy, Junk) lists every level in force, as the sim applies them all.
//   GitHub #91: Last Line of Defense says it is once per round, also after the Unite Phase, past the cap.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, ruleOf } from '../../shared/rules.js';
import { CC } from '../../shared/ruleData.js';
import { levelsInForce, riskText } from '../../public/js/ui/lobbyRules.js';

test('#84: Investor 2, Strategy 2 and Junk 2 include level 1; the other chains replace their lower levels', () => {
  assert.deepEqual(RULES.filter((r) => r.stacks).map((r) => r.key), ['ccInvestorBench', 'ccStrategyLate', 'ccJunk']);
  for (const k of ['ccInvestorBench', 'ccStrategyLate', 'ccJunk']) {
    assert.deepEqual(levelsInForce(ruleOf(k), 2), [1, 2], k);
    assert.deepEqual(levelsInForce(ruleOf(k), 1), [1], k);
    assert.deepEqual(levelsInForce(ruleOf(k), 0), [], k);
  }
  // one number per level: level 3 alone
  assert.deepEqual(levelsInForce(ruleOf('ccSpRecovery'), 3), [3]);
  assert.deepEqual(levelsInForce(ruleOf('ccBoss'), 2), [2]);
  // a tag group: its ancestors, as before
  assert.deepEqual(levelsInForce(ruleOf('ccVengeance'), 3), [1, 2, 3]);
});

test('#91: Last Line of Defense names the extra LP, the cap and the most a round can cost', () => {
  const { full } = riskText('ccLastLine', 1);
  assert.match(full, new RegExp(`扣除${CC.lastLineLp}点`));
  assert.match(full, /每回合一次/);
  assert.match(full, /每回合10点的扣除上限/);
  assert.match(full, new RegExp(`最多扣除${10 + CC.lastLineLp}点`));
  assert.doesNotMatch(full, /\{/);
});
