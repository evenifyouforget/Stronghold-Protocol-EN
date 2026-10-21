// The SPA-CC Blood Ledger on the HUD (ccFamiglia Unending / Seasonal): snapHud reads the snapshot's `bl`, and the phase
// capsule shows hud.js LedgerBar — the gauge's count while it fills, "Asset Liquidation" (清算时刻) and the pulsing class
// while one lasts; nothing without a Ledger.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE } from '../../shared/constants.js';

const { snapHud } = await import('../../public/js/ui/gameLogic.js');
const { PhaseCapsule, LedgerBar } = await import('../../public/js/ui/hud.js');

const textOf = (v) => {
  if (v == null || typeof v === 'boolean') return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(textOf).join('');
  return typeof v === 'object' ? textOf(v.props?.children) : '';
};
function* walk(v) {
  if (Array.isArray(v)) { for (const x of v) yield* walk(x); return; }
  if (!v || typeof v !== 'object') return;
  yield v;
  yield* walk(v.props?.children);
}

test('snapHud reads the Ledger, and none without one', () => {
  assert.deepEqual(snapHud({ killed: 1, total: 5, bl: [250, 500, 0, 0] }).ledger, { value: 250, max: 500, liquidating: false, permanent: false });
  assert.deepEqual(snapHud({ bl: [500, 500, 1, 1] }).ledger, { value: 500, max: 500, liquidating: true, permanent: true });
  assert.ok(!('ledger' in snapHud({ killed: 1, total: 5 })), 'the HUD shape stays as before');
  assert.equal(snapHud({ bl: [1, 0, 0, 0] }).ledger, undefined, 'no max');
});

test('LedgerBar: the count while filling, Asset Liquidation while one lasts', () => {
  const filling = LedgerBar({ ledger: { value: 312.6, max: 500, liquidating: false, permanent: false } });
  assert.ok(textOf(filling).includes('312/500'));
  assert.ok(!filling.props.class.includes('is-liquidating'));
  const fill = [...walk(filling)].find((v) => v.props?.class === 'ledger__fill');
  assert.ok(fill.props.style.includes('62.5'), fill.props.style);
  const icon = [...walk(filling)].find((v) => v.props?.class === 'ledger__icon');
  assert.equal(icon?.props.name, 'blood_icon', '#48: the Blood Debt icon by the bar');
  const on = LedgerBar({ ledger: { value: 200, max: 500, liquidating: true, permanent: false } });
  assert.ok(on.props.class.includes('is-liquidating'));
  assert.ok(!textOf(on).includes('/500'));
  assert.equal(LedgerBar({ ledger: null }), null);
});

test('the combat and boss capsules carry it', () => {
  const hud = { killed: 2, total: 9, ledger: { value: 100, max: 500, liquidating: false, permanent: false } };
  for (const phase of [PHASE.COMBAT, PHASE.FINAL_ASSAULT]) {
    const cap = PhaseCapsule({ pub: { phase }, hud });
    assert.ok([...walk(cap)].some((v) => v.type === LedgerBar), phase);
  }
});
