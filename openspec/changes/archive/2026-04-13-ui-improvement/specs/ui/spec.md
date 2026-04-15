# Delta Spec: UI Improvement — Logger Unification & Responsive Components

**Change**: 2026-04-13-ui-improvement  
**Parent spec**: `openspec/specs/iatools-v2.0.md` (SPEC-05: Premium CLI UX)  
**Date**: 2026-04-13

---

## MODIFIED Requirements

### Requirement: UI-1 — Unified Logger (updates SPEC-05 UI-1)

The system MUST provide a single logger module at `src/ui/logger.ts` as the only sanctioned console output interface for all commands.

The old logger at `src/utils/logger.ts` MUST be removed after migration. No command handler SHALL import from `@/utils/logger`.

The unified logger MUST expose at minimum these methods with identical call signatures: `success(message)`, `info(message)`, `warn(message)`, `error(message)`, `header(message)`, `label(message)`, `newline()`, `banner(version)`, `panel(content, options?)`, `table(options)`, `progress(options)`, `keyHint(keys)`.

(Previously: Two loggers existed — `utils/logger` with hardcoded chalk calls and `ui/logger` with theme integration and TTY awareness. Commands used the old logger exclusively.)

#### Scenario: LOG-SC1 — All commands use unified logger

- GIVEN the iatools codebase after migration is complete
- WHEN a developer searches for imports of `@/utils/logger` across `src/commands/`
- THEN zero matches are found
- AND the file `src/utils/logger.ts` does not exist
- AND the barrel export at `src/utils/index.ts` (if any) no longer re-exports a logger

#### Scenario: LOG-SC2 — Command output uses theme tokens

- GIVEN any command handler (e.g., `init`, `compress`, `review`)
- WHEN the command produces a success message
- THEN the output uses `theme.colors.success` and `theme.icons.success` from the theme system
- AND the output is visually identical regardless of which command emitted it

#### Scenario: LOG-SC3 — Logger method parity

- GIVEN the unified logger at `src/ui/logger.ts`
- WHEN a developer inspects its exported API
- THEN every method that existed on the old `utils/logger` is present on the unified logger with the same name and compatible call signature
- AND no command migration requires changing call-site argument types

---

### Requirement: UI-3 — TTY Awareness & NO_COLOR (updates SPEC-05 UI-3)

The unified logger MUST detect `process.stdout.isTTY` at module load time and branch output accordingly.

When `isTTY` is `true`, the logger MUST use themed chalk output with icons and box-drawing characters.

When `isTTY` is `false` (piped/CI), the logger MUST emit plain-text prefixes (`[OK]`, `[INFO]`, `[WARN]`, `[ERROR]`) with no ANSI escape sequences.

The logger MUST respect the `NO_COLOR` environment variable per the no-color.org specification. When `NO_COLOR` is set to any non-empty value, `chalk.level` MUST be set to `0` before any output.

(Previously: TTY awareness existed in `ui/logger` but was not active because no command used it. `NO_COLOR` support existed but was untested in integration.)

#### Scenario: LOG-SC4 — TTY terminal gets themed output

- GIVEN `process.stdout.isTTY` is `true`
- AND `NO_COLOR` is not set
- WHEN `logger.success("Done")` is called
- THEN the output contains the theme success icon (tick) and ANSI color codes

#### Scenario: LOG-SC5 — Piped output gets plain text

- GIVEN `process.stdout.isTTY` is `false`
- WHEN `logger.success("Done")` is called
- THEN the output contains `[OK] Done`
- AND the output contains no ANSI escape sequences (`\x1b[`)

#### Scenario: LOG-SC6 — NO_COLOR disables all coloring

- GIVEN `NO_COLOR=1` is set in the environment
- AND `process.stdout.isTTY` is `true`
- WHEN `logger.banner("2.0.0")` is called
- THEN the output contains no ANSI escape sequences
- AND the output still contains the text `iatools` and `2.0.0`

#### Scenario: LOG-SC7 — Empty NO_COLOR is ignored

- GIVEN `NO_COLOR=""` (empty string) is set in the environment
- WHEN the logger module is loaded
- THEN chalk level is NOT set to 0
- AND normal themed output is produced

---

## ADDED Requirements

### Requirement: UI-7 — Terminal Width Responsiveness

All visual components (table, banner, diff-view) MUST adapt their rendering to the current terminal width obtained from `process.stdout.columns`.

The system MUST define a minimum supported width of 60 columns. Below this threshold, components SHOULD fall back to a simplified raw-text rendering without box-drawing characters.

`renderTable` MUST auto-distribute column widths proportionally when no explicit `width` is set, fitting within `process.stdout.columns` minus border/padding overhead.

`renderBanner` MUST constrain its boxen width to not exceed `process.stdout.columns`.

`renderDiffView` MUST truncate context lines to fit within terminal width, preserving the matched region visibility.

Components MUST NOT hard-code widths that cause horizontal overflow on standard 80-column terminals.

#### Scenario: UI-SC5 — Table fits 80-column terminal

- GIVEN `process.stdout.columns` is `80`
- AND a table has 4 columns with no explicit widths
- WHEN `renderTable` is called
- THEN the rendered table total width (including borders) does not exceed 80 characters
- AND all column headers are visible (not truncated)

#### Scenario: UI-SC6 — Table on narrow terminal (60 cols)

- GIVEN `process.stdout.columns` is `60`
- AND a table has 4 columns
- WHEN `renderTable` is called
- THEN column widths are reduced proportionally
- AND the rendered table total width does not exceed 60 characters

#### Scenario: UI-SC7 — Table below minimum width falls back

- GIVEN `process.stdout.columns` is `40` (below the 60-col minimum)
- WHEN `renderTable` is called
- THEN the table renders in a simplified list format without box-drawing borders
- AND all data is still present in the output

#### Scenario: UI-SC8 — Banner adapts to terminal width

- GIVEN `process.stdout.columns` is `72`
- WHEN `renderBanner` is called
- THEN the banner box width does not exceed 72 characters

#### Scenario: UI-SC9 — Banner on narrow terminal

- GIVEN `process.stdout.columns` is `50` (below minimum)
- WHEN `renderBanner` is called
- THEN the banner renders as plain text without box-drawing characters

#### Scenario: UI-SC10 — DiffView respects terminal width

- GIVEN `process.stdout.columns` is `80`
- AND a diff has a long context line (200+ chars)
- WHEN `renderDiffView` is called
- THEN the before/after lines are truncated to fit within 80 columns
- AND the matched region (highlighted text) is always visible

#### Scenario: UI-SC11 — Undefined columns defaults to 80

- GIVEN `process.stdout.columns` is `undefined` (redirected output)
- WHEN any component renders
- THEN it uses 80 as the default terminal width

---

### Requirement: UI-8 — UI Module Test Coverage

The `packages/iatools/src/ui/` module MUST maintain ≥80% line and branch coverage via unit tests.

Tests MUST mock `process.stdout.columns` and `process.stdout.isTTY` to exercise all rendering branches deterministically. Tests MUST NOT rely on actual TTY detection.

Tests MUST cover every public method of the unified logger for both TTY and non-TTY paths.

Tests MUST cover responsive behavior at boundary widths (60, 80, 120 columns) for every visual component.

The `NO_COLOR` environment variable MUST be tested in an isolated module context (via `jest.resetModules()`).

#### Scenario: UI-SC12 — Logger TTY branch coverage

- GIVEN a test suite for `ui/logger`
- WHEN tests run with `process.stdout.isTTY` mocked to `true`
- THEN every logger method (`success`, `info`, `warn`, `error`, `header`, `label`, `newline`, `banner`, `panel`, `table`, `progress`, `keyHint`) is invoked and its themed output is asserted

#### Scenario: UI-SC13 — Logger non-TTY branch coverage

- GIVEN a test suite for `ui/logger`
- WHEN tests run with `process.stdout.isTTY` mocked to `false`
- THEN every logger method is invoked and its plain-text output is asserted
- AND no output contains ANSI escape sequences

#### Scenario: UI-SC14 — Table responsive tests at boundaries

- GIVEN a test suite for `ui/components/table`
- WHEN `process.stdout.columns` is mocked to `60`, `80`, and `120`
- THEN `renderTable` produces output that fits within the mocked width for each case
- AND the 60-column output is narrower than the 120-column output

#### Scenario: UI-SC15 — Banner responsive tests

- GIVEN a test suite for `ui/components/banner`
- WHEN `process.stdout.columns` is mocked to `50` and `80`
- THEN the 80-column render uses box-drawing characters
- AND the 50-column render uses plain-text fallback

#### Scenario: UI-SC16 — DiffView responsive tests

- GIVEN a test suite for `ui/components/diff-view`
- WHEN `process.stdout.columns` is mocked to `80`
- THEN no output line exceeds 80 characters

#### Scenario: UI-SC17 — Coverage gate passes

- GIVEN all UI tests pass
- WHEN `npm run test -- --coverage` is run for the iatools package
- THEN the `src/ui/` directory reports ≥80% line coverage and ≥80% branch coverage

---

## REMOVED Requirements

### Requirement: Legacy Logger (`src/utils/logger.ts`)

(Reason: Superseded by the unified `ui/logger`. The old logger hard-codes chalk calls without theme integration, has no TTY awareness, and duplicates functionality. It will be deleted after all 8 remaining command imports are migrated.)

---

## Traceability

| Spec ID | Traces to Proposal Section | Traces to Existing Spec |
|---------|---------------------------|------------------------|
| UI-1 (modified) | Logger unification | SPEC-05 UI-1 |
| UI-3 (modified) | Logger unification | SPEC-05 UI-3 |
| UI-7 (added) | Terminal width responsiveness | — (new) |
| UI-8 (added) | UI test coverage | — (new) |
| Legacy Logger (removed) | Logger unification | — |
