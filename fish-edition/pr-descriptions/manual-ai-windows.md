# CI: upstream's Windows fixes for the manual-seat tests

Base: `mini/0.3.1-4`. Branch `fix/manual-ai-windows`. Cherry-picks of two sganggs `dev` commits made after the one #111 synced.

#108's full CI fails on Windows shard 1, twice, in `test/match/manual-ai.test.js`. These are upstream's dev-only manual seats for agent playtests, and the failure is not a flake:
- **The cause:** both launcher tests end the tool with `child.kill('SIGTERM')` and expect its graceful stop, exit code 1. Windows has no POSIX signals, so the process ends at once with exit code `null`.
- **Upstream:** its own `dev` CI failed this way on every push since the manual seats, until these two commits.

## What it brings

- **sganggs 61e0debb:**
  - the launcher tests check the graceful stop off Windows only;
  - the file waits run on a 100 s clock (a loaded Windows runner took over 30 s to reach prep);
  - the stdio timeout test starts its child before timing.
- **sganggs 4bccd295:**
  - publishing a manual-seat page retries the rename on Windows while another process holds the file (EPERM / EACCES / EBUSY, about a second);
  - the agent's move of an invalid answer uses the same retry.

The upstream history notes (`docs/history/0.3.4.md`) are left out: they conflict with notes we haven't synced yet, and the next `dev` sync brings them. The next sync takes these two commits cleanly, since the changes are identical.

## Tests

- Local (Linux): `manual-ai` and `external-transports`, 31 of 31 pass; lint clean.
- The Windows run is #108's full CI after this merges.
