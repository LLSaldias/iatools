# Delta Specs: public-readiness-code

> **Change**: public-readiness-code  
> **Type**: Delta (ADDED / MODIFIED / REMOVED)  
> **Base specs**: `architecture.md`, `coding-standards.md`, `iatools-v1.4.0.md`

---

## MODIFIED Requirements

### Requirement: Package Metadata Completeness

The `packages/iatools/package.json` MUST NOT contain duplicate dependency entries. It MUST include `repository`, `homepage`, `bugs`, and `keywords` fields conforming to npm public-package standards. It MUST include a `prepublishOnly` script that runs build and test as a publish safety gate.

#### Scenario: Duplicate self-dependency removed

- GIVEN `packages/iatools/package.json` contains two `@lsframework/iatools: workspace:*` entries in `dependencies`
- WHEN the change is applied
- THEN exactly zero `@lsframework/iatools` entries remain in `dependencies`

#### Scenario: Public metadata fields present

- GIVEN `packages/iatools/package.json` is read after the change
- WHEN inspecting the top-level fields
- THEN `repository` field exists with `type: "git"` and a valid `url`
- AND `homepage` field is a non-empty string
- AND `bugs.url` field is a non-empty string
- AND `keywords` is a non-empty array of strings

#### Scenario: prepublishOnly safety gate

- GIVEN `packages/iatools/package.json` has a `scripts` section
- WHEN `npm publish --dry-run` is executed
- THEN the `prepublishOnly` script runs `build` and `test` before publish proceeds

#### Scenario: npm publish dry-run succeeds

- GIVEN all metadata fields are present and no duplicate dependencies exist
- WHEN `npm publish --dry-run` is run from `packages/iatools/`
- THEN the command exits with code 0 and no validation errors

---

### Requirement: Logger NO_COLOR Support

The logger in `packages/iatools/src/utils/logger.ts` MUST respect the `NO_COLOR` environment variable per the [no-color.org](https://no-color.org/) standard. When `NO_COLOR` is set to any non-empty value, all ANSI escape codes (colors, bold, dim) MUST be suppressed. When `NO_COLOR` is unset or empty, existing colored output MUST be preserved.

#### Scenario: NO_COLOR disables all ANSI codes

- GIVEN `process.env.NO_COLOR` is set to `"1"`
- WHEN `logger.success("done")` is called
- THEN stdout contains `✓ done` with no ANSI escape sequences (`\x1b[`)

#### Scenario: NO_COLOR with empty string preserves colors

- GIVEN `process.env.NO_COLOR` is set to `""`
- WHEN `logger.info("hello")` is called
- THEN stdout contains ANSI escape sequences for cyan styling

#### Scenario: NO_COLOR unset preserves colors

- GIVEN `process.env.NO_COLOR` is not set (undefined)
- WHEN `logger.header("Title")` is called
- THEN stdout contains ANSI escape sequences for bold magenta styling

#### Scenario: Banner respects NO_COLOR

- GIVEN `process.env.NO_COLOR` is set to `"true"`
- WHEN `logger.banner()` is called
- THEN the banner box characters are printed without any ANSI escape sequences

---

## ADDED Requirements

### Requirement: Changelog CLI Command

The CLI MUST provide a `changelog` command registered in `packages/iatools/src/cli.ts`. The command MUST scan `openspec/changes/archive/` directories, extract summaries from `proposal.md` files, and generate Keep-a-Changelog formatted entries. All generation MUST be local — no external LLM calls SHALL be made.

#### Scenario: Command is registered and accessible

- GIVEN the iatools CLI is installed
- WHEN `iatools changelog --help` is executed
- THEN help output displays the `changelog` command with its description and flags

#### Scenario: Dry-run previews changelog output

- GIVEN `openspec/changes/archive/` contains at least one subdirectory with a `proposal.md`
- WHEN `iatools changelog --dry-run` is executed
- THEN Keep-a-Changelog formatted entries are printed to stdout
- AND no file is written or modified

#### Scenario: Version flag stamps the entry

- GIVEN `openspec/changes/archive/` contains change directories
- WHEN `iatools changelog --version 1.6.0` is executed
- THEN the generated entry header contains `## [1.6.0]` with the current date in `YYYY-MM-DD` format
- AND the entry is appended to the package `CHANGELOG.md`

#### Scenario: Auto-suggests semver bump

- GIVEN archive proposals contain feature additions (keywords: "new", "add", "feature")
- WHEN `iatools changelog --dry-run` is executed without `--version`
- THEN the output includes a suggested semver bump of `minor`

#### Scenario: Patch bump suggestion for fixes

- GIVEN archive proposals contain only fix-type changes (keywords: "fix", "bug", "patch", "cleanup")
- WHEN `iatools changelog --dry-run` is executed without `--version`
- THEN the output includes a suggested semver bump of `patch`

#### Scenario: Dir flag targets a specific directory

- GIVEN `openspec/changes/archive/` exists at `/tmp/myproject/openspec/changes/archive/`
- WHEN `iatools changelog --dir /tmp/myproject --dry-run` is executed
- THEN the command scans `/tmp/myproject/openspec/changes/archive/` for proposals

#### Scenario: No archive directories found

- GIVEN `openspec/changes/archive/` is empty or does not exist
- WHEN `iatools changelog --dry-run` is executed
- THEN the command prints a warning message and exits with code 0
- AND no changelog content is generated

#### Scenario: Proposal without Intent section

- GIVEN an archive directory contains a `proposal.md` missing the `## Intent` heading
- WHEN `iatools changelog --dry-run` is executed
- THEN that proposal is skipped with a warning
- AND other valid proposals are still processed

### Requirement: Changelog Output Format

Generated changelog entries MUST conform to the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Entries MUST be grouped under `### Added`, `### Changed`, `### Removed`, and/or `### Fixed` subsections. Each entry SHOULD be a single-line bullet derived from the proposal's intent or scope.

#### Scenario: Output follows Keep-a-Changelog structure

- GIVEN archive proposals cover feature additions and removals
- WHEN `iatools changelog --version 2.0.0 --dry-run` is executed
- THEN output contains a `## [2.0.0] - YYYY-MM-DD` header
- AND at least one of `### Added`, `### Changed`, `### Removed`, or `### Fixed` subsections
- AND each subsection contains bullet-point entries starting with `- `

---

## REMOVED Requirements

### Requirement: GitLab Pipeline Reference in README

The root `README.md` MUST NOT contain references to GitLab CI/CD pipelines.  
(Reason: Internal infrastructure detail not relevant for public consumers.)

#### Scenario: No GitLab references in README

- GIVEN the root `README.md` has been updated
- WHEN `grep -i "gitlab" README.md` is executed
- THEN no matches are found

### Requirement: Local Absolute Paths in Documentation

Files under `openspec/` MUST NOT contain local absolute paths (e.g., `/Users/*/`).  
(Reason: Exposes developer machine details to public consumers.)

#### Scenario: No absolute user paths in openspec

- GIVEN the `openspec/changes/automatic-memory-ingest-on-archive/exploration.md` file exists
- WHEN `grep -r "/Users/" openspec/` is executed
- THEN no matches are found

### Requirement: Ghost Package Entries in Root Changelog

The root `CHANGELOG.md` MUST NOT contain entries for packages that do not exist in the monorepo (e.g., `another-package`, `example-package`).  
(Reason: Misleading artifact from template or test data.)

#### Scenario: No ghost package entries

- GIVEN the root `CHANGELOG.md` has been cleaned
- WHEN `grep -E "another-package|example-package" CHANGELOG.md` is executed
- THEN no matches are found

### Requirement: Internal Infrastructure Reference in .gitignore

The `.gitignore` file MUST NOT contain paths referencing internal infrastructure secrets (e.g., `helm_vars`).  
(Reason: Leaks internal deployment topology to public consumers.)

#### Scenario: No internal infra paths in .gitignore

- GIVEN `.gitignore` has been updated
- WHEN `grep "helm_vars" .gitignore` is executed
- THEN no matches are found
