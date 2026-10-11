// Planned maintenance, for the operator of a running server (see server/maintenance.js).
//
//   node scripts/maintenance.mjs --status            live rooms / matches / players, and the maintenance in force
//   node scripts/maintenance.mjs --in 15             countdown for every player: "Server maintenance in 14:59"
//   node scripts/maintenance.mjs --at 21:30          …or at a clock time (this machine's local time; tomorrow if past)
//   node scripts/maintenance.mjs --close             no new matches from now on (running matches play on)
//   node scripts/maintenance.mjs --open              allow new matches again (keeps the countdown)
//   node scripts/maintenance.mjs --stop-when-idle    stop the server cleanly as soon as no match is live (once)
//   node scripts/maintenance.mjs --keep-running      cancel --stop-when-idle (keeps the rest)
//   node scripts/maintenance.mjs --cancel            remove all of it (the countdown bar disappears)
//
// Options combine and add to what is already set: `--in 15 --close --stop-when-idle` in one go, or one at a time.
// Reaching the time does nothing by itself: matches are never cut. Stopping only happens with --stop-when-idle
// (when the last match ends) or when you stop the server; starting it again is up to you (or your service manager).
// Writes logs/maintenance.json; the server picks it up within ~2 s. A file written while the server was down is
// ignored by the next start. On the VPS, run it as the service user:
//   cd /opt/stronghold/app && sudo -u stronghold node scripts/maintenance.mjs --close
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_MINUTES = 7 * 24 * 60;

const USAGE = `Usage:
  node scripts/maintenance.mjs --status                        what the server is doing, and the maintenance in force
  node scripts/maintenance.mjs [--in MIN | --at HH:MM] [--close | --open] [--stop-when-idle | --keep-running]
  node scripts/maintenance.mjs --cancel                        remove the maintenance
Options: --file <path> (default logs/maintenance.json), --port <n> for --status (default $PORT or 3000).`;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/**
 * The next local HH:MM after `now` (today, or tomorrow when it has passed).
 * @param {string} hhmm
 * @param {number} now
 * @returns {number | null}
 */
export function nextClockTime(hhmm, now) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/**
 * The new maintenance state from the current one and the options (null = nothing left: remove the file).
 * @param {{ at?: number | null, closed?: boolean, stopWhenIdle?: boolean } | null} cur
 * @param {{ in?: string, at?: string, close?: boolean, open?: boolean, 'stop-when-idle'?: boolean, 'keep-running'?: boolean }} opt
 * @param {number} now
 * @returns {{ createdAt: number, at: number | null, closed: boolean, stopWhenIdle: boolean } | null}
 */
export function nextState(cur, opt, now) {
  if (opt.in != null && opt.at != null) throw new Error('Use either --in or --at, not both.');
  if (opt.close && opt.open) throw new Error('Use either --close or --open, not both.');
  if (opt['stop-when-idle'] && opt['keep-running']) throw new Error('Use either --stop-when-idle or --keep-running, not both.');
  let at = Number.isFinite(cur?.at) ? cur.at : null;
  if (opt.in != null) {
    const minutes = Number(opt.in);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_MINUTES) throw new Error(`--in must be a number of minutes from 1 to ${MAX_MINUTES}.`);
    at = now + Math.round(minutes * 60000);
  }
  if (opt.at != null) {
    at = nextClockTime(opt.at, now);
    if (at == null) throw new Error('--at must be a time like 21:30 (24-hour clock).');
  }
  let closed = cur?.closed === true;
  if (opt.close) closed = true;
  if (opt.open) closed = false;
  let stopWhenIdle = cur?.stopWhenIdle === true;
  if (opt['stop-when-idle']) stopWhenIdle = true;
  if (opt['keep-running']) stopWhenIdle = false;
  return at != null || closed || stopWhenIdle ? { createdAt: now, at, closed, stopWhenIdle } : null;
}

/** One line per part of a state, for the terminal. */
export function describe(s, now = Date.now()) {
  if (!s) return ['No maintenance set.'];
  const lines = [];
  if (Number.isFinite(s.at)) {
    const left = s.at - now;
    lines.push(left > 0
      ? `Countdown to ${new Date(s.at).toLocaleString()} (${Math.ceil(left / 60000)} min left).`
      : `Maintenance time ${new Date(s.at).toLocaleString()} has passed (players see "maintenance now").`);
  }
  lines.push(s.closed ? 'Closed: no new matches.' : 'Open: new matches allowed.');
  if (s.stopWhenIdle) lines.push('The server stops as soon as no match is live.');
  return lines;
}

function readState(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeFailed(e, file) {
  if (e?.code === 'EACCES' || e?.code === 'EPERM') {
    fail(`Permission denied writing ${file}.\nOn the server run it as the service user: sudo -u stronghold node scripts/maintenance.mjs …`);
  }
  fail(`Could not write ${file}: ${e?.message || e}`);
}

async function status(file, port) {
  console.log('Maintenance file:');
  for (const l of describe(readState(file))) console.log(`  ${l}`);
  const url = `http://127.0.0.1:${port}/healthz`;
  let h;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    h = await res.json();
  } catch (e) {
    console.log(`\nServer: not reachable at ${url} (${e?.cause?.code || e?.name || e}). Use --port if it listens elsewhere.`);
    return;
  }
  console.log(`\nServer (${url}): up ${Math.round((h.uptimeSec || 0) / 60)} min, version ${h.app}`);
  console.log(`  ${h.matches} live match(es), ${h.rooms} room(s), ${h.humans} player(s) seated, ${h.spectators ?? 0} spectator(s), ${h.sessions} session(s)`);
  if (h.maintenance === undefined) console.log('  (this server version does not report maintenance)');
  else if (h.maintenance === null) console.log('  No maintenance in force on the server.');
  else for (const l of describe(h.maintenance)) console.log(`  In force: ${l}`);
}

async function main() {
  let args;
  try {
    args = parseArgs({
      options: {
        status: { type: 'boolean' },
        in: { type: 'string' },
        at: { type: 'string' },
        close: { type: 'boolean' },
        open: { type: 'boolean' },
        'stop-when-idle': { type: 'boolean' },
        'keep-running': { type: 'boolean' },
        cancel: { type: 'boolean' },
        file: { type: 'string' },
        port: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (e) {
    fail(`${e.message}\n\n${USAGE}`);
  }
  const opt = args.values;
  const file = path.resolve(opt.file || path.join(ROOT, 'logs', 'maintenance.json'));
  const port = Number(opt.port || process.env.PORT || 3000);
  const changes = ['in', 'at', 'close', 'open', 'stop-when-idle', 'keep-running'].some((k) => opt[k] != null);

  if (opt.help) { console.log(USAGE); return; }
  if (opt.cancel) {
    if (changes) fail('--cancel removes everything; use it alone.');
    try { fs.rmSync(file, { force: true }); } catch (e) { writeFailed(e, file); }
    console.log('Maintenance cancelled. Players see the bar disappear within a few seconds.');
    return;
  }
  if (!changes) {
    if (!opt.status) console.log(`${USAGE}\n`);
    await status(file, port);
    return;
  }
  let next;
  try { next = nextState(readState(file), opt, Date.now()); } catch (e) { fail(e.message); }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (next) fs.writeFileSync(file, `${JSON.stringify(next)}\n`);
    else fs.rmSync(file, { force: true });
  } catch (e) {
    writeFailed(e, file);
  }
  for (const l of describe(next)) console.log(l);
  console.log('The server picks it up within ~2 s.');
  if (opt.status) await status(file, port);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
