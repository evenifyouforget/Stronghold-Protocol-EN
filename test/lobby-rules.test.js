// test/lobby-rules.test.js — room.setRules over the real WebSocket lobby (shared/constants.js RULE_KEYS): host only,
// before the match, partial updates merged, shown in room.state, un-readies the other humans, handed to the match.
import { describe, test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { startServer } from '../server/index.js';
import { StubMatch } from '../server/match/StubMatch.js';
import { TestClient } from './helpers/wsClient.js';
import { DEFAULT_RULES, ERR } from '../shared/constants.js';

/** StubMatch that records the opts every match was started with. */
const started = [];
class SpyMatch extends StubMatch {
  constructor(opts) {
    super(opts);
    started.push(opts);
  }
}

describe('lobby rules', () => {
  let srv;
  const open = new Set();
  const errors = [];
  const player = async (name) => {
    const c = await TestClient.connect(`ws://127.0.0.1:${srv.port}/ws`);
    open.add(c);
    const w = await c.hello(name);
    c.id = w.playerId;
    return c;
  };
  const expectOk = async (c, msg) => {
    const r = await c.request(msg);
    assert.equal(r.t, 'ok', `${msg.t}: ${JSON.stringify(r)}`);
  };
  const expectError = async (c, msg, code) => {
    const r = await c.request(msg);
    assert.equal(r.t, 'error', `${msg.t}: ${JSON.stringify(r)}`);
    assert.equal(r.code, code);
  };
  const seatOf = (s, id) => s.seats.find((x) => x && x.playerId === id);

  before(async () => {
    const log = { info() {}, warn() {}, debug() {}, error: (...a) => errors.push(a.map(String).join(' ')) };
    srv = await startServer({ port: 0, host: '127.0.0.1', log, MatchClass: SpyMatch });
  });
  afterEach(async () => {
    await Promise.all([...open].map((c) => c.terminate().catch(() => {})));
    open.clear();
  });
  after(async () => {
    await srv?.close();
    assert.deepEqual(errors, [], 'no server errors logged');
  });

  test('host sets rules: merged, broadcast, un-readies the guest, locked once the match runs, passed to the match', async () => {
    const host = await player('Host');
    assert.equal((await host.request({ t: 'room.create', mode: 'coop', difficulty: 'NORMAL' })).t, 'ok');
    const st = await host.waitFor('room.state', (s) => s.hostId === host.id);
    assert.deepEqual(st.rules, DEFAULT_RULES, 'a new room has every rule off');

    const guest = await player('Guest');
    await expectOk(guest, { t: 'room.join', code: st.code });
    await expectOk(guest, { t: 'room.ready', ready: true });
    await host.waitFor('room.state', (s) => seatOf(s, guest.id)?.ready);

    await expectError(guest, { t: 'room.setRules', rules: { extraFunds: true } }, ERR.NOT_HOST);
    await expectError(host, { t: 'room.setRules', rules: { bogus: true } }, ERR.BAD_MSG);

    await expectOk(host, { t: 'room.setRules', rules: { extraFunds: true } });
    const s1 = await guest.waitFor('room.state', (s) => s.rules.extraFunds);
    assert.deepEqual(s1.rules, { ...DEFAULT_RULES, extraFunds: true });
    assert.equal(seatOf(s1, guest.id).ready, false, 'a rules change un-readies the other humans');

    await expectOk(host, { t: 'room.setRules', rules: { extraDeploy: true, untimed: true } });
    const s2 = await guest.waitFor('room.state', (s) => s.rules.untimed);
    assert.deepEqual(s2.rules, { extraDeploy: true, extraFunds: true, untimed: true }, 'partial updates merge');

    // setting a rule to its current value changes nothing (no broadcast, the guest stays ready)
    await expectOk(guest, { t: 'room.ready', ready: true });
    await host.waitFor('room.state', (s) => seatOf(s, guest.id)?.ready);
    guest.clearInbox();
    await expectOk(host, { t: 'room.setRules', rules: { untimed: true } });
    await expectOk(host, { t: 'room.start' });
    const inMatch = await guest.waitFor('room.state', (s) => s.inMatch);
    assert.equal(seatOf(inMatch, guest.id).ready, true);

    await expectError(host, { t: 'room.setRules', rules: { untimed: false } }, ERR.ROOM_STARTED);
    assert.deepEqual(started.at(-1).rules, { extraDeploy: true, extraFunds: true, untimed: true }, 'the match gets the room rules');
  });
});
