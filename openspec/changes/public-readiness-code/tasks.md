# Tasks: Public Readiness — Code

## Phase 1: Foundation (Package & Cleanup — no code dependencies)

- [ ] 1.1 Modify `packages/iatools/package.json`: remove both duplicate `@lsframework/iatools: workspace:*` entries from `dependencies`
- [ ] 1.2 Modify `packages/iatools/package.json`: add `repository` field with `type: "git"` and valid `url`
- [ ] 1.3 Modify `packages/iatools/package.json`: add `homepage` field (non-empty string)
- [ ] 1.4 Modify `packages/iatools/package.json`: add `bugs` field with `url` property
- [ ] 1.5 Modify `packages/iatools/package.json`: add `keywords` field (non-empty array of strings)
- [ ] 1.6 Modify `packages/iatools/package.json`: add `"prepublishOnly": "npm run build && npm run test"` to `scripts`
- [ ] 1.7 Modify `CHANGELOG.md` (root): remove ghost `another-package` and `example-package` entries from the `[1.0.0]` section
- [ ] 1.8 Modify `README.md` (root): replace GitLab pipeline reference (line ~191, "El pipeline de GitLab en `master` publicará automáticamente los paquetes.") with generic publish guidance
- [ ] 1.9 Modify `.gitignore` (root): remove the `*/helm_vars/desa/secrets.yaml.dec` line
- [ ] 1.10 Modify `openspec/changes/automatic-memory-ingest-on-archive/exploration.md`: remove/redact the local absolute path `/Users/lucassaldias/.copilot/skills/sdd-archive/SKILL.md`
- [ ] 1.11 Modify `packages/iatools/src/utils/logger.ts`: add `NO_COLOR` check at module initialization — if `process.env.NO_COLOR` is a non-empty string, set `chalk.level = 0`

## Phase 2: Core Implementation (Changelog command logic)

- [ ] 2.1 Create `packages/iatools/src/commands/changelog.ts`: define `ChangelogEntry`, `ArchivedChange`, `ChangelogOptions`, and `BumpSuggestion` interfaces as specified in the design
- [ ] 2.2 Implement `parseProposal(content: string, dirName: string): ArchivedChange | null` — extract `## Intent` and `### In Scope` sections via regex; return `null` if `## Intent` is missing
- [ ] 2.3 Implement `categorizeChange(change: ArchivedChange): ChangelogEntry[]` — map keywords ("add"/"new"/"create" → Added, "fix"/"bug"/"patch" → Fixed, "remove"/"delete"/"drop" → Removed, else → Changed) from intent and scope text
- [ ] 2.4 Implement `suggestBump(entries: ChangelogEntry[]): BumpSuggestion` — Removed present → major; Added present → minor; else → patch
- [ ] 2.5 Implement `formatChangelog(version: string, date: string, entries: ChangelogEntry[]): string` — produce Keep-a-Changelog block with `## [X.Y.Z] - YYYY-MM-DD` header and `### Added`/`### Changed`/`### Removed`/`### Fixed` subsections
- [ ] 2.6 Implement `scanArchive(archiveDir: string): Promise<ArchivedChange[]>` — read archive directories with `fs-extra`, read each `proposal.md`, call `parseProposal`, skip dirs without `proposal.md` with warning
- [ ] 2.7 Implement `runChangelog(options: ChangelogOptions): Promise<void>` — orchestrate: resolve projectRoot, call `scanArchive`, handle empty archive (warn + exit 0), categorize/suggest bump, format, handle `--dry-run` (stdout only) vs write to `packages/iatools/CHANGELOG.md`

## Phase 3: Integration (CLI wiring)

- [ ] 3.1 Modify `packages/iatools/src/cli.ts`: import `runChangelog` from `./commands/changelog`
- [ ] 3.2 Modify `packages/iatools/src/cli.ts`: register `changelog` command with `.option('--version <semver>')`, `.option('--dry-run')`, `.option('--dir <path>')` and action handler that calls `runChangelog`

## Phase 4: Testing

- [ ] 4.1 Create `packages/iatools/test/unit/changelog.test.ts`: test `parseProposal` extracts Intent and Scope from a well-formed proposal string
- [ ] 4.2 Test `parseProposal` returns `null` when proposal is missing `## Intent` heading
- [ ] 4.3 Test `categorizeChange` maps "add"/"new" keywords to `Added` category
- [ ] 4.4 Test `categorizeChange` maps "remove"/"delete" keywords to `Removed` category
- [ ] 4.5 Test `categorizeChange` maps "fix"/"bug" keywords to `Fixed` category
- [ ] 4.6 Test `categorizeChange` defaults to `Changed` when no keywords match
- [ ] 4.7 Test `suggestBump` returns `major` when Removed entries are present
- [ ] 4.8 Test `suggestBump` returns `minor` when Added entries are present (no Removed)
- [ ] 4.9 Test `suggestBump` returns `patch` when only Changed/Fixed entries are present
- [ ] 4.10 Test `formatChangelog` produces valid KAC block with `## [X.Y.Z] - YYYY-MM-DD` header and categorized subsections
- [ ] 4.11 Test `scanArchive` reads directories and parses proposals (mock `fs-extra`)
- [ ] 4.12 Test `scanArchive` skips directories without `proposal.md` with warning
- [ ] 4.13 Test `runChangelog` with `--dry-run` prints to stdout and does not write any file
- [ ] 4.14 Test `runChangelog` without `--dry-run` writes to `CHANGELOG.md`
- [ ] 4.15 Test `runChangelog` with empty archive prints warning and exits cleanly
- [ ] 4.16 Create `packages/iatools/test/unit/logger-nocolor.test.ts`: test that `NO_COLOR=1` results in `chalk.level === 0` and output contains no `\x1b[` sequences
- [ ] 4.17 Test that `NO_COLOR=""` preserves ANSI color sequences in output
- [ ] 4.18 Test that `NO_COLOR` undefined preserves default chalk behavior
- [ ] 4.19 Test that `logger.banner()` output respects `NO_COLOR` (box chars without ANSI codes)

## Phase 5: Verification

- [ ] 5.1 Run TypeScript compilation: `npm run build` in `packages/iatools/` — must succeed with zero errors
- [ ] 5.2 Run full test suite: `npx jest --no-cache` in `packages/iatools/` — all tests must pass
- [ ] 5.3 Run `npm publish --dry-run` in `packages/iatools/` — must exit 0 with no validation errors
- [ ] 5.4 Run confidential data grep: `grep -rE "gitlab|helm_vars|another-package|example-package|/Users/" README.md CHANGELOG.md .gitignore openspec/` from root — must return no matches
- [ ] 5.5 Run `NO_COLOR=1 npx iatools init --help` and verify output contains no ANSI escape sequences
- [ ] 5.6 Run `npx iatools changelog --dry-run` from project root and verify Keep-a-Changelog formatted output
