# Proposal: Public Readiness — Code

## Intent

The package `@lsframework/iatools` (v1.6.0, MIT license) is transitioning from a private/internal npm package to a publicly published one. A pre-publication audit has identified four categories of issues in the codebase that would cause publish failures, expose internal infrastructure details, or degrade the experience for external consumers. This change addresses all **code-level** blockers before the first public `npm publish`.

## Scope

### In Scope

- **A. Fix `packages/iatools/package.json`**: Remove duplicate self-dependency (`@lsframework/iatools: workspace:*` appears twice), add `repository`, `homepage`, `bugs`, `keywords` metadata, and add a `prepublishOnly` safety-gate script.
- **B. New `iatools changelog` CLI command**: Minimal v1 command that scans `openspec/changes/archive/`, extracts proposal summaries, suggests a semver bump, and generates Keep-a-Changelog formatted entries. Supports `--version <semver>` and `--dry-run`. No external LLM calls — all generation is local from proposal text.
- **C. Confidential/internal data cleanup**: Remove GitLab pipeline reference from `README.md` (line 191), remove local absolute path from `openspec/changes/automatic-memory-ingest-on-archive/exploration.md`, remove ghost packages from root `CHANGELOG.md`, remove internal infra reference from `.gitignore`.
- **D. Logger `NO_COLOR` support**: Respect the `NO_COLOR` environment variable (https://no-color.org/) in `packages/iatools/src/utils/logger.ts`.

### Out of Scope

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (separate `public-readiness-docs` change)
- README translation to English (separate change)
- `--json` output mode for CLI (future enhancement)
- Conventional commit enforcement via `commitlint` (future enhancement)
- i18n support

## Approach

### A. package.json Fixes

1. Remove the duplicate `@lsframework/iatools: workspace:*` lines from `dependencies` in `packages/iatools/package.json`.
2. Add standard npm public-package metadata fields: `repository`, `homepage`, `bugs`, `keywords`.
3. Add `"prepublishOnly": "npm run build && npm run test"` script as a safety gate.

### B. Changelog CLI Command

1. Create `packages/iatools/src/commands/changelog.ts` implementing a new `changelog` command.
2. The command scans `openspec/changes/archive/` directories, reads each `proposal.md`, and extracts the **Intent** and **Scope → In Scope** sections.
3. Maps proposal content to Keep-a-Changelog sections (Added / Changed / Removed / Fixed) using keyword heuristics from proposal text.
4. Accepts `--version <semver>` to stamp the release version, or auto-suggests a bump (major/minor/patch) based on change analysis (new features → minor, fixes → patch).
5. Accepts `--dry-run` to preview the generated changelog entry to stdout without writing to `CHANGELOG.md`.
6. Without `--dry-run`, appends the entry to the package's `CHANGELOG.md`.
7. Register the command in `packages/iatools/src/cli.ts`.

### C. Confidential Data Cleanup

1. **`README.md`** (root): Replace GitLab pipeline reference (line 191) with generic publish guidance.
2. **`openspec/changes/automatic-memory-ingest-on-archive/exploration.md`**: Remove or redact the local absolute path `/Users/lucassaldias/.copilot/skills/sdd-archive/SKILL.md`.
3. **Root `CHANGELOG.md`**: Remove ghost entries for `another-package` and `example-package`.
4. **`.gitignore`**: Remove the `*/helm_vars/desa/secrets.yaml.dec` line referencing internal infrastructure.

### D. Logger NO_COLOR Support

1. In `packages/iatools/src/utils/logger.ts`, check for `process.env.NO_COLOR` at initialization.
2. When `NO_COLOR` is set (any non-empty value), disable all ANSI color/style codes in logger output.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/iatools/package.json` | Modified | Remove duplicate self-dep, add metadata fields, add `prepublishOnly` script |
| `packages/iatools/src/cli.ts` | Modified | Register new `changelog` command |
| `packages/iatools/src/commands/changelog.ts` | New | CLI command to generate changelog entries from SDD archive |
| `packages/iatools/src/utils/logger.ts` | Modified | Add `NO_COLOR` environment variable support |
| `CHANGELOG.md` (root) | Modified | Remove ghost package entries |
| `README.md` (root) | Modified | Remove GitLab pipeline reference |
| `openspec/changes/automatic-memory-ingest-on-archive/exploration.md` | Modified | Remove local absolute path |
| `.gitignore` | Modified | Remove internal infra reference |
| `packages/iatools/test/unit/` | Modified/New | Tests for changelog command and NO_COLOR support |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Changelog command misparses archive proposals | Medium | Unit tests with real archive samples; `--dry-run` for user review before writing |
| Removing `.gitignore` entry exposes secrets file | Low | The entry is for a decrypted secrets file that should not exist in the repo; verify no such file is tracked |
| `prepublishOnly` blocks publish due to test failures | Low | Intentional — this is the safety gate working as designed; fix tests before publishing |
| NO_COLOR change breaks existing colored output tests | Low | Update affected test assertions to account for color-disabled path |

## Rollback Plan

All changes are additive or corrective edits to existing files:

1. **package.json**: Revert metadata additions; re-add self-dependency if somehow needed (it shouldn't be).
2. **Changelog command**: Remove `changelog.ts` and unregister from `cli.ts` — no other code depends on it.
3. **Confidential cleanup**: These are one-way improvements with no rollback need. If accidentally over-redacted, restore from git history.
4. **NO_COLOR**: Revert the conditional in `logger.ts` — single-point change.

All changes can be reverted via `git revert` on the merge commit.

## Dependencies

- No external package dependencies required.
- The `changelog` command depends on the existing `openspec/changes/archive/` directory structure and `proposal.md` format (already established by the SDD workflow).
- NO_COLOR support uses only `process.env` — no additional libraries.

## Success Criteria

- [ ] `npm publish --dry-run` succeeds for `@lsframework/iatools` without errors
- [ ] `packages/iatools/package.json` has no duplicate dependencies and includes `repository`, `homepage`, `bugs`, `keywords`
- [ ] `iatools changelog --dry-run` produces valid Keep-a-Changelog output from existing archive
- [ ] `iatools changelog --version 1.6.0` writes a correctly formatted entry to `CHANGELOG.md`
- [ ] `NO_COLOR=1 iatools init` produces no ANSI escape codes in output
- [ ] `grep -r "gitlab\|helm_vars\|another-package\|example-package\|/Users/" README.md CHANGELOG.md .gitignore openspec/` returns no matches for confidential/internal data
- [ ] All existing tests pass; new tests cover changelog command (≥80% coverage) and NO_COLOR behavior
