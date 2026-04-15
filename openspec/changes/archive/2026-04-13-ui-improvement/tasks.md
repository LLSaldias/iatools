# Tasks: UI Improvement — Logger Unification & Responsive Components

## Phase 1: Foundation (Terminal Width Helper + Logger API Parity)

- [x] 1.1 Create `packages/iatools/src/ui/terminal.ts` exporting `getTerminalWidth(): number`, `MIN_TERMINAL_WIDTH = 60`, and `DEFAULT_TERMINAL_WIDTH = 80`. Implementation: return `process.stdout.columns ?? DEFAULT_TERMINAL_WIDTH`. Do NOT clamp — callers decide fallback. (Ref: design "Interfaces / Contracts — src/ui/terminal.ts")
- [x] 1.2 Update `packages/iatools/src/ui/index.ts` to re-export `getTerminalWidth`, `MIN_TERMINAL_WIDTH`, and `DEFAULT_TERMINAL_WIDTH` from `./terminal`.
- [x] 1.3 Audit `packages/iatools/src/utils/logger.ts` and list every exported method/function. Compare against `packages/iatools/src/ui/logger.ts`. Add any missing methods to `ui/logger.ts` with identical names and compatible call signatures so that no command migration requires changing argument types. (Ref: spec UI-1, scenario LOG-SC3)
- [x] 1.4 Ensure `logger.banner(version)` in `packages/iatools/src/ui/logger.ts` accepts a `version: string` parameter and passes it through to `renderBanner`. (Ref: design decision "banner() call sites updated to pass version")

**Verification**: `getTerminalWidth()` callable from `ui/index.ts`. `ui/logger.ts` exports all 12 methods listed in spec (success, info, warn, error, header, label, newline, banner, panel, table, progress, keyHint). `npm run lint` passes.

---

## Phase 2: Responsive Components (Width-Aware Rendering)

- [x] 2.1 Modify `packages/iatools/src/ui/components/banner.ts` — add optional `terminalWidth?: number` parameter to `renderBanner`. When omitted, call `getTerminalWidth()`. Constrain boxen width to `terminalWidth`. When `terminalWidth < MIN_TERMINAL_WIDTH`, return plain-text string without box-drawing characters. (Ref: spec UI-SC8, UI-SC9)
- [x] 2.2 Modify `packages/iatools/src/ui/components/table.ts` — add optional `terminalWidth?: number` to `TableOptions` interface and `renderTable`. When omitted, call `getTerminalWidth()`. Auto-distribute column widths proportionally within `terminalWidth - borderOverhead`. When `terminalWidth < MIN_TERMINAL_WIDTH`, switch to vertical key-value list format (each row prints labels on separate lines, no box-drawing). (Ref: spec UI-SC5, UI-SC6, UI-SC7)
- [x] 2.3 Modify `packages/iatools/src/ui/components/diff-view.ts` — add optional `terminalWidth?: number` to `DiffViewOptions` and `renderDiffView`. When omitted, call `getTerminalWidth()`. Truncate context lines to `terminalWidth - panelBorderOverhead` characters, centering the matched region in the visible window. (Ref: spec UI-SC10)
- [x] 2.4 Update `packages/iatools/src/ui/logger.ts` to pass `getTerminalWidth()` into `renderBanner`, `renderTable`, and `renderDiffView` calls (connecting the terminal width plumbing end-to-end). (Ref: design "Data Flow")

**Verification**: All components accept `terminalWidth` parameter. Passing `terminalWidth: 80` produces output with no line exceeding 80 chars. Passing `terminalWidth: 40` (below min) produces fallback output for banner and table. `npm run lint` passes.

---

## Phase 3: Command Migration (utils/logger → ui/logger)

Migrate in order of risk (lowest first), per design migration table. After each sub-task: verify `npm run lint` passes and grep confirms one fewer `@/utils/logger` import.

- [x] 3.1 Migrate `packages/iatools/src/commands/review.ts` — replace `import { logger } from '@/utils/logger'` (or equivalent path) with `import { logger } from '@/ui/logger'`. Adjust any call-site differences if needed. (Ref: design step 1 — 2 logger calls)
- [x] 3.2 Migrate `packages/iatools/src/commands/compress.ts` — replace logger import to `@/ui/logger`. (Ref: design step 2)
- [x] 3.3 Migrate `packages/iatools/src/commands/trace.ts` — replace logger import to `@/ui/logger`. (Ref: design step 3)
- [x] 3.4 Migrate `packages/iatools/src/commands/memory-export.ts` — replace logger import to `@/ui/logger`. (Ref: design step 4)
- [x] 3.5 Migrate `packages/iatools/src/commands/memory-query.ts` — replace logger import to `@/ui/logger`. (Ref: design step 5)
- [x] 3.6 Migrate `packages/iatools/src/commands/memory-ingest.ts` — replace logger import to `@/ui/logger`. (Ref: design step 6)
- [x] 3.7 Migrate `packages/iatools/src/commands/update.ts` — replace logger import to `@/ui/logger`. Update `banner()` call to pass `version` argument. (Ref: design step 7)
- [x] 3.8 Migrate `packages/iatools/src/commands/init.ts` — replace logger import to `@/ui/logger`. Update `banner()` call to pass `version` argument. (Ref: design step 8 — most logger calls, highest risk)

**Verification**: `grep -r "utils/logger" packages/iatools/src/commands/` returns zero matches. All 8 command files import from `@/ui/logger`. `npm run test` and `npm run lint` pass.

---

## Phase 4: Cleanup (Remove Old Logger)

- [x] 4.1 Verify zero remaining imports of `utils/logger` across the entire `packages/iatools/src/` directory (not just commands — check pipeline, CLI entry, etc.). Fix any straggler imports found.
- [x] 4.2 Delete `packages/iatools/src/utils/logger.ts`. (Ref: spec UI-1, scenario LOG-SC1)
- [x] 4.3 Update `packages/iatools/src/utils/` barrel export (if `index.ts` or similar re-exports logger) to remove the logger re-export. Verify no broken imports remain.
- [x] 4.4 Run `npm run lint` and `npm run test` — confirm clean pass with zero references to the deleted file.

**Verification**: `src/utils/logger.ts` does not exist. `grep -r "utils/logger" packages/iatools/src/` returns zero matches. Build, lint, and tests pass.

---

## Phase 5: Testing (Unit Tests for Logger, Responsive Components, Terminal Width)

- [x] 5.1 Create `packages/iatools/test/unit/ui-terminal.test.ts` — test `getTerminalWidth()` with `process.stdout.columns` mocked to `undefined` (expect 80), `80` (expect 80), `40` (expect 40), and `120` (expect 120). Verify constants `MIN_TERMINAL_WIDTH` and `DEFAULT_TERMINAL_WIDTH` are exported. (Ref: spec UI-SC11, design testing table)
- [x] 5.2 Create `packages/iatools/test/unit/ui-logger.test.ts` — test all 12 logger methods (`success`, `info`, `warn`, `error`, `header`, `label`, `newline`, `banner`, `panel`, `table`, `progress`, `keyHint`) in TTY mode: mock `isTTY = true`, spy `console.log`, assert ANSI codes + theme icons present. Test all 12 in non-TTY mode: mock `isTTY = false`, assert plain-text prefixes `[OK]`/`[INFO]`/`[WARN]`/`[ERROR]` and no ANSI sequences. (Ref: spec LOG-SC4, LOG-SC5, scenarios UI-SC12, UI-SC13)
- [x] 5.3 Add `NO_COLOR` tests to `packages/iatools/test/unit/ui-logger.test.ts` (or extend existing `test/unit/logger-nocolor.test.ts`) — use `jest.resetModules()` to re-evaluate module with `NO_COLOR=1` set: assert `chalk.level === 0` and no ANSI in output. Also test `NO_COLOR=""` (empty) is ignored and chalk level is NOT forced to 0. (Ref: spec LOG-SC6, LOG-SC7)
- [x] 5.4 Create `packages/iatools/test/unit/ui-responsive.test.ts` — test `renderTable` at widths 60/80/120: assert output fits within given width and columns are proportional. Test at width 40: assert vertical key-value list format with no box-drawing chars. Test `renderBanner` at 80 cols (box-drawing present) and 50 cols (plain-text fallback). Test `renderDiffView` at 80 cols with 200-char context: assert no line exceeds 80 chars and matched region is visible. (Ref: spec UI-SC5 through UI-SC10, scenarios UI-SC14 through UI-SC16)
- [x] 5.5 Run `npm run test` across all test suites — confirm all tests pass and `packages/iatools/src/ui/` achieves ≥80% line and branch coverage. (Ref: spec UI-8, scenario UI-SC17)

**Verification**: All test files exist and pass. `ui/` module coverage ≥80%. `npm run test` exits cleanly.
