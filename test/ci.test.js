// test/ci.test.js — tools/ci.mjs (the local run of .github/workflows/ci.yml): its step list is ci.yml's, the reader of
// the workflow, the arguments, the tiers, the env and the summary; tools/test-tier.mjs (the test step: the quick tier's
// files, shards). Nothing here boots a server or runs a step.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  CI_TEST_ENV, ROOT, SKIPPED_CI_STEPS, SMOKE_PATHS, STEPS, TEST_FILES, TEST_JOBS, binPath, formatDuration, formatSummary,
  isSkippedCiStep, parseArgs, parseWorkflow, selectSteps, stepEnv,
} from '../tools/ci.mjs';
import * as tier from '../tools/test-tier.mjs';

const workflow = parseWorkflow(fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
/** The ci.yml jobs a local step mirrors: its own and `alsoIn`. */
const jobsOf = (l) => [l.ci.job, ...(l.alsoIn || [])];

/** ci.yml's smoke run block as smoke() in tools/ci.mjs mirrors it (lines trimmed, comments dropped). */
const SMOKE_CI_RUN = [
  'node server/index.js > server.log 2>&1 &',
  'pid=$!',
  'ok=',
  'for i in $(seq 1 30); do',
  'if curl -fsS http://127.0.0.1:3000/healthz; then ok=1; break; fi',
  'sleep 1',
  'done',
  'echo',
  '[ -n "$ok" ] || { cat server.log; exit 1; }',
  'curl -fsS -o index.out http://127.0.0.1:3000/',
  "grep -qi '<html' index.out",
  'curl -fsS -o /dev/null http://127.0.0.1:3000/vendor/pixi.min.js',
  'node tools/doctor.mjs || true',
  'kill $pid || true',
];

test('every ci.yml step is mirrored by a tools/ci.mjs step or skipped on purpose, and none is invented', () => {
  const ciSteps = Object.entries(workflow.jobs).flatMap(([job, j]) => j.steps.map((s) => ({ job, ...s })));
  assert.ok(ciSteps.length >= 6, 'ci.yml was read');
  const mirror = (s) => STEPS.find((l) => jobsOf(l).includes(s.job) && l.ci.name === s.name);
  const unknown = ciSteps.filter((s) => !isSkippedCiStep(s) && !mirror(s));
  assert.deepEqual(unknown.map((s) => `${s.job}: ${s.name || s.uses}`), [], 'ci.yml steps tools/ci.mjs does not run');
  for (const l of STEPS) {
    for (const job of jobsOf(l)) assert.ok(ciSteps.some((s) => s.job === job && s.name === l.ci.name), `${l.id} mirrors no ci.yml step (${job}: ${l.ci.name})`);
  }
  for (const k of SKIPPED_CI_STEPS) assert.ok(ciSteps.some((s) => isSkippedCiStep(s) && (k.uses ? s.uses?.startsWith(k.uses) : s.name === k.name)), `stale skip ${k.uses || k.name}`);
  // the local order is the workflow's (job test, job quick, then job tooling; a step two jobs share counts once)
  const order = [...new Set(ciSteps.filter((s) => !isSkippedCiStep(s)).map((s) => mirror(s).id))];
  assert.deepEqual(order, STEPS.map((s) => s.id));
});

test('the commands match ci.yml: the run lines, the npm scripts ci.yml calls, the smoke script, the job env, no step config', () => {
  const run = (job, name) => workflow.jobs[job].steps.find((s) => s.name === name).run;
  for (const l of STEPS) {
    const r = run(l.ci.job, l.ci.name);
    if (l.npm) {
      assert.equal(r, `npm run ${l.npm}`, l.id);
      assert.equal(pkg.scripts[l.npm], l.describe, `package.json script ${l.npm} is what ${l.id} runs`);
    } else if (l.id !== 'smoke') assert.equal(r, l.ciArgs ? `${l.describe} ${l.ciArgs}` : l.describe, l.id);
    // a step two jobs share is the same step in both
    for (const job of l.alsoIn || []) assert.equal(run(job, l.ci.name), r, `${l.id}: job ${job} runs it the same way as job ${l.ci.job}`);
  }
  const smokeRun = run('test', STEPS.find((s) => s.id === 'smoke').ci.name);
  const urls = [...smokeRun.matchAll(/http:\/\/127\.0\.0\.1:3000([^\s;]*)/g)].map((m) => m[1] || '/');
  assert.deepEqual([...new Set(urls)].sort(), [...SMOKE_PATHS].sort());
  // The whole smoke script, comments and indentation aside: any edit to it (the wait loop, the page check, …) fails
  // here, so that smoke() in tools/ci.mjs is looked at and this copy updated with it.
  const normalized = smokeRun.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  assert.deepEqual(normalized, SMOKE_CI_RUN, "ci.yml's smoke step changed: update smoke() in tools/ci.mjs and SMOKE_CI_RUN");
  // job env: the test jobs' env is CI_TEST_ENV; any other job has none (stepEnv gives the tooling steps nothing)
  for (const [job, j] of Object.entries(workflow.jobs)) {
    assert.deepEqual(j.env, TEST_JOBS.includes(job) ? CI_TEST_ENV : {}, `env of job ${job}`);
  }
  // per-step config (env, if, continue-on-error, working-directory, with, …) on a mirrored step is not mirrored
  for (const l of STEPS) {
    for (const job of jobsOf(l)) {
      const s = workflow.jobs[job].steps.find((x) => x.name === l.ci.name);
      assert.deepEqual(s.other || [], [], `${l.id} (${job}): ci.yml step keys tools/ci.mjs does not mirror`);
      assert.ok(!s.shell || l.id === 'smoke', `${l.id}: shell: ${s.shell}`);
    }
  }
  assert.equal(pkg.scripts.ci, 'node tools/ci.mjs');
});

test('npm test and the CI test step run every test file and nothing else under test/: no helper, no child-process entry, no Forge fixture', () => {
  // `npm test` is node --test over TEST_FILES (the globs quoted: no shell expands them — Node's test runner does, the
  // same on every OS); the CI step (tools/test-tier.mjs) expands the same globs itself
  assert.equal(pkg.scripts.test, `node --test ${TEST_FILES.map((g) => `"${g}"`).join(' ')}`);
  // what Node's test runner expands them to (the same glob, node_modules left out the way --test leaves it out)
  const picked = tier.testFiles();
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));
  const underTest = walk('test');
  const tests = [...underTest, ...walk('plugins/_template')].filter((f) => f.endsWith('.test.js'));
  assert.deepEqual(picked, [...tests, 'test/e2e/coop.e2e.mjs'].sort());
  assert.ok(!picked.some((f) => /^test\/(fixtures|helpers)\/|\/fixtures\//.test(f)), 'a fixture or helper would run as a test');
  // every other module under test/ is imported by the tests (or is untrusted bait): one that uses node:test is a test
  // file the globs miss — name it *.test.js
  for (const f of underTest.filter((x) => /\.[cm]?js$/.test(x) && !picked.includes(x))) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, f), 'utf8'), /['"]node:test['"]/, `${f} uses node:test but npm test does not run it`);
  }
});

test('the workflow reader: jobs, flat env, named and uses steps, run blocks; comments and nested blocks skipped, other step keys named', () => {
  const yml = [
    'name: X', 'on:', '  push:', 'jobs:', '  a:', '    runs-on: x', '    env:', "      K: '1'", '      L: "two"', '    steps:',
    '      - uses: actions/checkout@v7', '      - uses: actions/setup-node@v7', '        with:', '          node-version: 22',
    '      # a comment', '      - name: One', '        if: always()', '        run: echo 1', '        env:', '          X: 1',
    '      - name: Block', '        shell: bash', '        run: |',
    '          a', '', '            b', '          c', '  b:', '    steps:', '      - run: x', 'other: 1', '  ignored: 2',
  ].join('\r\n');
  assert.deepEqual(parseWorkflow(yml), {
    jobs: {
      a: { env: { K: '1', L: 'two' }, steps: [
        { uses: 'actions/checkout@v7' }, { uses: 'actions/setup-node@v7', other: ['with'] }, { name: 'One', run: 'echo 1', other: ['if', 'env'] },
        { name: 'Block', shell: 'bash', run: 'a\n\n  b\nc' },
      ] },
      b: { env: {}, steps: [{ run: 'x' }] },
    },
  });
  assert.deepEqual(parseWorkflow('name: no jobs\n'), { jobs: {} });
});

test('arguments: --keep-going, --only (comma list, repeated, = form) in workflow order, --list, --help; bad ones throw', () => {
  assert.deepEqual(parseArgs([]), { keepGoing: false, only: null, quick: false, list: false, help: false });
  assert.deepEqual(parseArgs(['-k', '--only', 'lint,test', '--only=smoke']), { keepGoing: true, only: ['lint', 'test', 'smoke'], quick: false, list: false, help: false });
  assert.equal(parseArgs(['--quick']).quick, true);
  assert.deepEqual(selectSteps(['lint', 'test', 'smoke']).map((s) => s.id), ['test', 'smoke', 'lint']);
  // the tiers: the full one by default (the whole suite), the quick one with --quick (the quick tests instead)
  assert.deepEqual(selectSteps(null).map((s) => s.id), ['setup', 'test', 'smoke', 'lint', 'imports', 'typecheck']);
  assert.deepEqual(selectSteps(null, true).map((s) => s.id), ['setup', 'smoke', 'quick', 'lint', 'imports', 'typecheck']);
  assert.deepEqual(selectSteps(['quick'], false).map((s) => s.id), ['quick'], '--only names any step');
  assert.equal(parseArgs(['--list']).list, true);
  assert.equal(parseArgs(['-h']).help, true);
  assert.throws(() => parseArgs(['--only', 'golden']), /unknown step "golden"/);
  assert.throws(() => parseArgs(['--only']), /needs step names/);
  assert.throws(() => parseArgs(['--fast']), /unknown option --fast/);
});

test("env: the job test steps get ci.yml's env for unset keys only; the tooling steps get the caller's env as is", () => {
  const test_ = STEPS.find((s) => s.id === 'test');
  const lint = STEPS.find((s) => s.id === 'lint');
  assert.deepEqual(stepEnv(test_, { PATH: 'p', SP_E2E: '1' }), { PATH: 'p', SP_E2E: '1', SP_REAL_E2E: '0', RENDER_E2E: '0', NO_COLOR: '1' });
  assert.deepEqual(stepEnv(lint, { PATH: 'p' }), { PATH: 'p' });
  assert.equal(stepEnv(STEPS.find((s) => s.id === 'quick'), {}).SP_E2E, '0', 'job quick has the same env');
});

test("the workflow's tiers: the full suite in 3 shards on every OS × Node, the quick tier and the two summary checks", () => {
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  /** One job block of ci.yml: from `  <id>:` to the blank line before the next job (or its comment). */
  const job = (id) => { const at = yml.indexOf(`\n  ${id}:\n`); assert.ok(at >= 0, id); const m = /\n\n {2}(?=[#\w])/.exec(yml.slice(at + 1)); return yml.slice(at, m ? at + 1 + m.index : undefined); };
  // push runs: main only (a pull request's branch gets its run from pull_request)
  assert.match(yml, /\non:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n {2}workflow_dispatch:\n/);
  const test_ = job('test');
  assert.match(test_, /shard: \[1, 2, 3\]/);
  assert.ok(test_.includes("if: github.event_name != 'pull_request' || github.base_ref == 'main'"), test_);
  assert.ok(STEPS.find((s) => s.id === 'test').ciArgs.endsWith('/3'), 'the shard count of the matrix');
  assert.ok(job('quick').includes("if: github.event_name == 'pull_request' && github.base_ref != 'main'"));
  assert.match(job('full'), /name: full CI\n {4}needs: \[test, tooling\]/);
  assert.ok(job('full').includes("!cancelled() && (github.event_name != 'pull_request' || github.base_ref == 'main')"));
  assert.match(job('quick-ci'), /name: quick CI\n {4}needs: \[quick, tooling\]/);
  assert.ok(job('quick-ci').includes("!cancelled() && github.event_name == 'pull_request' && github.base_ref != 'main'"));
});

test('test-tier: --quick leaves out the slow files (each of them a test file), --shard k/n; bad arguments throw', () => {
  const files = tier.testFiles();
  assert.deepEqual(tier.SLOW_TEST_FILES, [...new Set(tier.SLOW_TEST_FILES)].sort(), 'sorted, no duplicates');
  for (const f of tier.SLOW_TEST_FILES) assert.ok(files.includes(f), `${f} is not a test file (renamed or removed?)`);
  const quick = tier.selectFiles(files, true);
  assert.equal(quick.length, files.length - tier.SLOW_TEST_FILES.length);
  assert.ok(!quick.includes('test/match/fullmatch-coop.test.js') && quick.includes('test/ci.test.js'));
  assert.deepEqual(tier.selectFiles(files, false), files);
  assert.deepEqual(tier.parseArgs([]), { quick: false, shard: null, help: false });
  assert.deepEqual(tier.parseArgs(['--quick', '--shard', '2/3']), { quick: true, shard: { index: 2, total: 3 }, help: false });
  assert.deepEqual(tier.parseArgs(['--shard=1/1']).shard, { index: 1, total: 1 });
  for (const bad of [['--shard', '0/3'], ['--shard', '4/3'], ['--shard'], ['--shard', 'x']]) assert.throws(() => tier.parseArgs(bad), /--shard needs k\/n/);
  assert.throws(() => tier.parseArgs(['--fast']), /unknown option --fast/);
  // the warning about a slow file outside the list
  const ms = new Map([['test/ui/a.test.js', 25_000], ['test/ui/b.test.js', 3_000], [tier.SLOW_TEST_FILES[0], 90_000]]);
  assert.deepEqual(tier.slowUnlisted(ms), [{ file: 'test/ui/a.test.js', s: 25 }]);
});

test('summary: one row per step (status, name, duration, note), the failed steps named; durations', () => {
  assert.equal(formatDuration(42.4), '42ms');
  assert.equal(formatDuration(1234), '1.2s');
  assert.equal(formatDuration(125_000), '2m05s');
  const s = formatSummary([
    { id: 'setup', status: 'ok', ms: 400 },
    { id: 'test', status: 'fail', ms: 61_000, note: 'exit 1' },
    { id: 'typecheck', status: 'not run' },
  ]);
  assert.equal(s, [
    '', '── ci summary ──',
    '  ok    setup        400ms',
    '  FAIL  test         1m01s  exit 1',
    '  -     typecheck',
    'FAILED: test', '',
  ].join('\n'));
  assert.match(formatSummary([{ id: 'lint', status: 'ok', ms: 1 }]), /all steps passed/);
});

test('the eslint and tsc entry points come from their package.json bin; a missing package says to run npm ci', () => {
  assert.ok(fs.existsSync(binPath('eslint', 'eslint')));
  assert.ok(fs.existsSync(binPath('typescript', 'tsc')));
  assert.throws(() => binPath('no-such-package-sp', 'x'), /npm ci/);
});

test('node tools/ci.mjs --list and a bad option run without npm (exit 0 / 2)', () => {
  const list = spawnSync(process.execPath, ['tools/ci.mjs', '--list'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(list.status, 0, list.stderr);
  for (const s of STEPS) assert.match(list.stdout, new RegExp(`^${s.id} `, 'm'));
  const bad = spawnSync(process.execPath, ['tools/ci.mjs', '--only', 'nope'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown step "nope"/);
});
