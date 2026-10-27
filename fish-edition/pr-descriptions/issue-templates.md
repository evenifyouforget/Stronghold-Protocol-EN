The issue templates' "latest version" checkbox shows our main's version, and their links point at this repo.

Base: `mini/0.3.1-3`. Branch `wip/issue-templates`.

Closes #79

The four templates in `.github/ISSUE_TEMPLATE/` came from sganggs unchanged:
- their badges showed sganggs's latest release (0.3.3), which we don't have, so the required "I have tested on the latest version" checkbox couldn't be ticked honestly;
- their "latest commits" and "existing issues" links went to sganggs's repo.

Now:
- one badge, `github/package-json/v/evenifyouforget/Stronghold-Protocol-EN/main`: the version in our main's `package.json` (renders `v0.3.1` today). We have no GitHub releases, so a release badge would be empty;
- the links go to this repo's `commits/main` and `issues`;
- the Version field's hint says the badge is the version on our main (zh and en).

## Known issues

- `.github/README.md` still tells people to clone sganggs's repo (not part of #79, not changed).

## Tests

- `test/issue-templates.test.js` pinned the sganggs badge; it now pins ours. It passes (4 of 4).
