Draft: the DYYBot line (`fish-edition/ai-players/05-dyybot.md`) and the bot research tactics, plus the experiments
for Fish to run on a bigger machine. **Not for merging yet**: the tactics are a first draft, and the runs below decide
what stays.

Base: `main` (7bf71d0c, #130). Branch: `feature/fish-dyy-profile`, which merges `feature/bot-tactics-research`.

## What's in it

- `server/match/botTacticsDyy.js`: Fish's Du Yaoye tactics, each passing for any other Strategy:
  - `dyy-level`: a fixed levelling schedule (`fish` 2 / 4 / 5 / 7, or `human` 2 / 4 / 6 / 9);
  - `dyy-shop`: buy Yan and side-Alliance operators, sell Bench operators for them, hunt Yan with the 2 special refreshes;
  - `dyy-freeze`: freeze an unaffordable Yan operator.

  Profile `fish-dyy` (opt-in, in the room's list), and the tactics by id for profile data.
- From `feature/bot-tactics-research` (ai-players/07):
  - `server/match/botTacticsResearch.js`: nine research tactics;
  - `tools/evolve.mjs`: the evolution bench.
- Tests: `test/match/bot-tactics-dyy.test.js`, `test/match/bot-tactics-research.test.js`.

## Experiments for Fish to run

Plain Node, so Windows is fine (PowerShell below). Run from a checkout of this branch after `npm ci`. Each chunk
writes its own file, through a `.tmp` that is renamed when the chunk finishes. So a stopped run resumes by running the
same command again, and a chunk that crashed (e.g. out of memory) is simply redone. Send me the result folder (a zip
is fine); I join the chunks.

**Memory.** botbench's workers are threads of one process, so an out-of-memory kill loses the whole chunk. Here this
run ran out of memory at `--jobs 4` while other runs shared the 12 GB machine. Start with `$jobs` = your cores − 2 and about
1 GB per job, and lower it if a chunk dies.

### 1. Forced-Du Yaoye baseline and the draft (DYYBot "Process", 05)

Solo Ultimate, Du Yaoye forced, seeds 1–160, three bots on the same seeds:
- `legacy`: the baseline;
- `fish-dyy`: the draft;
- `fish-dyy-human`: the draft with the human levelling schedule.

First save this as `dyy-human.json` in the checkout:

```json
{ "id": "fish-dyy-human", "tactics": ["dyy-shop", "dyy-freeze", { "tactic": "dyy-level", "params": { "schedule": "human" } }] }
```

Then:

```powershell
$jobs = 8
New-Item -ItemType Directory -Force dyy-solo | Out-Null
$runs = @(@('legacy', '--bot', 'legacy'), @('fish-dyy', '--bot', 'fish-dyy'), @('fish-dyy-human', '--profile', 'dyy-human.json'))
foreach ($r in $runs) {
  for ($s = 1; $s -le 160; $s += 20) {
    $out = "dyy-solo/$($r[0]).s$s.json"
    if (Test-Path $out) { continue }
    node tools/botbench.mjs --configs solo:ABYSS --seeds 20 --seed $s --jobs $jobs $r[1] $r[2] --band band_duyaoy --json "$out.tmp" --quiet
    if ($LASTEXITCODE -eq 0) { Move-Item -Force "$out.tmp" $out } else { Write-Host "chunk $out failed (exit $LASTEXITCODE)" }
  }
}
```

The same on Linux (bash):

```bash
jobs=8; mkdir -p dyy-solo
for r in "legacy --bot legacy" "fish-dyy --bot fish-dyy" "fish-dyy-human --profile dyy-human.json"; do
  set -- $r
  for s in $(seq 1 20 160); do
    out="dyy-solo/$1.s$s.json"; [ -s "$out" ] && continue
    node tools/botbench.mjs --configs solo:ABYSS --seeds 20 --seed "$s" --jobs "$jobs" "$2" "$3" --band band_duyaoy --json "$out.tmp" --quiet \
      && mv "$out.tmp" "$out" || echo "chunk $out failed"
  done
done
```

Size: 480 matches. Here a match takes 20–60 s, so about an hour at 8 jobs.

What it answers: whether the draft beats legacy as Du Yaoye (wins, and boss damage paired by seed), and which
schedule does better. Step 1 (05, "Process step 1") found the humans level later than the `fish` schedule.

### 2. Later: the DYYBot evolution run (05 "Process", step 5)

About 3 hours at full threads. It waits for the step 3 tactics: the roll-down, cashing coins, the item freeze. I'll
add them and the command (with the band forced) to this PR first.

## Known issues

- The draft explains well under 90 % of human Du Yaoye behaviour (05, "Process step 1"). Most of the gap is the
  roll-down from round 9: refreshes, sells and equips.
