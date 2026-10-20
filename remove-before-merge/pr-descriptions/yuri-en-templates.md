# English issue and PR templates

Target: YuriRestia/Stronghold-Protocol-EN-translation `dev-0.2`. Branch `evenifyouforget:yuri/en-templates`, on
`a4a686cd`. Templates and one test only (no game code). Also fit for upstream, since it only adds files next to the
Chinese ones.

- **Issue forms:** `BugReport.en.yml` ("Bug report (English)") and `FeatureRequest.en.yml` ("Feature request
  (English)"). Both translate the Chinese forms field for field: the same field ids, labels (`bug` /
  `enhancement`), title prefixes and required fields, including the 0.3.1 version field and the plugin questions. They
  show up in the issue chooser next to the Chinese ones.
  - The in-game names follow the English UI: "Report a problem" (问题反馈) and "cosmetic plugin" (外观插件).
  - The *How To Ask Questions The Smart Way* link points to the English original.
- **PR template:** GitHub allows only one default, so the English one is
  `.github/PULL_REQUEST_TEMPLATE/en.md`, opened by adding `?template=en.md` to the PR page's URL. The Chinese
  default gets a one-line English pointer at the top, as an HTML comment, so it doesn't show in the PR text.
- **Test:** `test/issue-templates.test.js` checks the English forms for the required Version field (GitHub #693),
  like the Chinese ones.

Checked:
- All four forms parse as YAML.
- The English and Chinese forms have the same blocks (13 / 7) and the same required fields (7 / 5).
- `test/issue-templates.test.js`: 4 / 4 pass. Lint is clean.
