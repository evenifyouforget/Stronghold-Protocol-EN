## 2026-11-11

### A skill with a start animation plays it in full before the skill begins

- When an operator casts a skill that opens with a start animation, the animation now plays to its end before the skill takes effect, as in the official game, and the operator's attacks wait for it. This covers 138 skills of 91 operators, such as Mizuki S3, Ayerscarpe S2 and Gavial the Invincible S2; the start animations last 0.1 to 1.5 s.
- Being stunned, frozen or put to sleep during the animation cancels the cast and keeps the skill points.
- Before: the skill took effect at once, and the first attack cut its start animation off.
- Skills without a start animation, such as Mostima S3, are unchanged. This changes battle results a little; the stored test results (goldens) are regenerated with it.

Server cost:

| Measure | Typical | Worst case |
|---|---|---|
| Bandwidth out / in, per player | 0 / 0 MB/s (0 / 0 GB/day): battles run in the players' browsers; the server sends no battle events | 0 / 0 MB/s |
| Bandwidth out / in, per room | 0 / 0 MB/s | 0 / 0 MB/s |
| Bandwidth out / in, 300 players | 0 / 0 MB/s (0 / 0 GB/day) | 0 / 0 MB/s |
| Server CPU | 0 % of one core: the server only simulates fields with no player connected | no measurable change: a whole 4-bot match took 11.4 s of CPU before and 10.6 s after (medians); the battles differ a little, since attacks now wait for the start animation |
| Memory | 0 MB (one more field per skill) | 0 MB (one more field per skill) |
| Disk | 0 MB/day | 0 MB/day |
| Bot budget | no measurable change (about 800 ms/round of battle for 4 bots, before and after) | no measurable change (about 800 ms/round of battle for 4 bots, before and after) |

- Cap: nothing new is sent, kept or written; a skill waits at most its 0.1 to 1.5 s start animation.
- Measured: one 4-bot co-op match (NORMAL, seed 1, no rehearsals, so every run does the same work), timed in process CPU
  before and after this change, alternated 3 times. The same version varies by about 20 % between runs.
