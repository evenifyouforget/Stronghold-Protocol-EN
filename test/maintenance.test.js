// Planned maintenance (server/maintenance.js, scripts/maintenance.mjs, public/js/ui/maintenance.js): the file the
// operator writes, what players are sent, which new matches are refused while closed, and the one-shot idle stop.
import { describe, test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MaintenanceBoard, parseMaintenance } from '../server/maintenance.js';
import { nextState, nextClockTime } from '../scripts/maintenance.mjs';
import { formatCountdown, maintenanceText } from '../public/js/ui/maintenance.js';
import { startServer } from '../server/index.js';
import { StubMatch } from '../server/match/StubMatch.js';
import { TestClient } from './helpers/wsClient.js';
import { ERR } from '../shared/constants.js';

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sp-maint-')), 'maintenance.json');
const write = (file, obj) => fs.writeFileSync(file, JSON.stringify(obj));

test('parseMaintenance: a time, closed and stop-when-idle; nothing set or malformed is null', () => {
  assert.deepEqual(parseMaintenance({ createdAt: 5, at: 100, closed: true }), { createdAt: 5, at: 100, closed: true, stopWhenIdle: false });
  assert.equal(parseMaintenance({ createdAt: 5, at: null, closed: false, stopWhenIdle: false }), null);
  assert.equal(parseMaintenance({ at: 100 }), null, 'no createdAt');
  assert.equal(parseMaintenance([1]), null);
});

test('board: sends the state to everyone, ignores a file older than the server, clears, and stops once when idle', async () => {
  const file = tmpFile();
  const sent = [];
  const session = { id: 's1', connected: true };
  const registry = { all: () => [session] };
  let matches = 1;
  const lobby = { stats: () => ({ matches }) };
  // net.js sendSession needs a socket: count the frames through a fake one
  session.ws = { readyState: 1, OPEN: 1, send: (raw) => sent.push(JSON.parse(raw)), bufferedAmount: 0 };
  let now = 1000;
  const board = new MaintenanceBoard({ file, registry, lobby, startedAt: 1000, now: () => now });
  let stops = 0;
  board.onStop = () => stops++;

  write(file, { createdAt: 999, at: 5000, closed: true }); // written before the server started
  await board.check();
  assert.equal(board.state(), null);
  assert.equal(board.closed(), false);

  now = 1200;
  write(file, { createdAt: 1100, at: 5000, closed: true, stopWhenIdle: true, pad: 'x' });
  await board.check();
  assert.equal(board.closed(), true);
  assert.deepEqual(board.report(), { at: 5000, closed: true, stopWhenIdle: true });
  assert.equal(stops, 0, 'a match is live');
  matches = 0;
  await board.check();
  await board.check();
  assert.equal(stops, 1, 'stops once the last match ends, only once');

  fs.rmSync(file);
  await board.check();
  assert.equal(board.state(), null);
  const frames = sent.filter((m) => m.t === 'sys.maintenance');
  assert.ok(frames.length >= 1, 'the cleared state was sent');
  assert.deepEqual({ at: frames.at(-1).at, closed: frames.at(-1).closed }, { at: null, closed: false });
});

describe('lobby while closed for maintenance', () => {
  let srv;
  let file;
  const open = new Set();
  const player = async (name) => {
    const c = await TestClient.connect(`ws://127.0.0.1:${srv.port}/ws`);
    open.add(c);
    const w = await c.hello(name);
    c.id = w.playerId;
    return c;
  };
  const refused = async (c, msg) => {
    const r = await c.request(msg);
    assert.equal(r.t, 'error', `${msg.t}: ${JSON.stringify(r)}`);
    assert.equal(r.code, ERR.MAINTENANCE, msg.t);
  };
  const waitFor = async (pred) => {
    for (let i = 0; i < 100 && !pred(); i++) await new Promise((r) => setTimeout(r, 20));
    assert.ok(pred());
  };

  before(async () => {
    file = tmpFile();
    const log = { info() {}, warn() {}, debug() {}, error() {} };
    srv = await startServer({ port: 0, host: '127.0.0.1', log, MatchClass: StubMatch, noticeFile: null, maintenanceFile: file, maintenancePollMs: 20 });
  });
  afterEach(async () => {
    await Promise.all([...open].map((c) => c.terminate().catch(() => {})));
    open.clear();
  });
  after(async () => { await srv?.close(); });

  test('create, start, solo matchmaking and Find Teammates are refused; players get the countdown; reopening allows them', async () => {
    const host = await player('Host');
    assert.equal((await host.request({ t: 'room.create', mode: 'coop', difficulty: 'NORMAL' })).t, 'ok', 'created before closing');

    write(file, { createdAt: Date.now(), at: Date.now() + 600000, closed: true });
    await waitFor(() => srv.maintenance.closed());
    const notice = await host.waitFor('sys.maintenance', (m) => m.closed === true);
    assert.ok(notice.at > Date.now() && Number.isFinite(notice.serverNow));

    const late = await player('Late');
    await late.waitFor('sys.maintenance', (m) => m.closed === true); // a new session gets it on hello
    await refused(late, { t: 'room.create', mode: 'solo', difficulty: 'NORMAL' });
    await refused(late, { t: 'queue.join', difficulty: 'NORMAL' });
    await refused(host, { t: 'room.search', on: true });
    await refused(host, { t: 'room.start' });
    const health = await (await fetch(`http://127.0.0.1:${srv.port}/healthz`)).json();
    assert.equal(health.maintenance.closed, true);

    write(file, { createdAt: Date.now(), at: null, closed: false, stopWhenIdle: false, reopened: true });
    await waitFor(() => !srv.maintenance.closed());
    assert.equal((await host.request({ t: 'room.start' })).t, 'ok');
  });
});

test('script: options add to the current state; --in / --at, --close / --open, --stop-when-idle / --keep-running', () => {
  const now = new Date(2026, 9, 11, 20, 0, 0).getTime();
  const a = nextState(null, { in: '15', close: true }, now);
  assert.deepEqual(a, { createdAt: now, at: now + 15 * 60000, closed: true, stopWhenIdle: false });
  const b = nextState(a, { 'stop-when-idle': true }, now + 1000);
  assert.equal(b.at, a.at, 'the countdown is kept');
  assert.equal(b.closed, true);
  assert.equal(b.stopWhenIdle, true);
  assert.equal(nextState({ at: null, closed: true }, { open: true }, now), null, 'nothing left: the file is removed');
  assert.equal(nextClockTime('21:30', now), new Date(2026, 9, 11, 21, 30).getTime());
  assert.equal(nextClockTime('19:00', now), new Date(2026, 9, 12, 19, 0).getTime(), 'past: tomorrow');
  assert.equal(nextClockTime('25:00', now), null);
  assert.throws(() => nextState(null, { in: '5', at: '21:00' }, now));
  assert.throws(() => nextState(null, { in: '0' }, now));
});

test('bar text: a live countdown on the server clock, "now" once reached, and the closed note', () => {
  assert.equal(formatCountdown(9 * 60000 + 41500), '9:42');
  assert.equal(formatCountdown(3600000 + 65000), '1:01:05');
  assert.equal(formatCountdown(-5), '0:00');
  assert.match(maintenanceText({ at: 10000, closed: false }, 0), /0:10/);
  assert.notEqual(maintenanceText({ at: 10000, closed: false }, 20000), maintenanceText({ at: 10000, closed: false }, 0));
  assert.ok(maintenanceText({ at: null, closed: true }, 0).includes(' · '));
  assert.equal(maintenanceText(null, 0), null);
});
