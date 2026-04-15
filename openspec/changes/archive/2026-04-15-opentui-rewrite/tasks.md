# Tasks: OpenTUI Full-Screen Rewrite

## Phase 1: Foundation

- [x] 1.1 Install `@opentui/core` as a dependency in `packages/iatools/package.json`
  - Verify: `import { CliRenderer } from '@opentui/core'` resolves without error

- [x] 1.2 Create `packages/iatools/src/tui/theme.ts` — export a frozen `THEME` constant implementing `TuiTheme` interface with hex colors (`primary: #a855f7`, `success: #22c55e`, `warning: #eab308`, `error: #ef4444`, `muted: #6b7280`, `accent: #06b6d4`, `highlight: #ffffff`), icon literals (`success`, `error`, `arrow`, `warning`, `bullet`, `pointer`, `star`, `brain`, `shield`, `trace`), and `border: { style: 'rounded' }`. No runtime dependencies (spec TUI-02.6).
  - Verify: `THEME.colors.primary === '#a855f7'`; object is frozen; no imports other than type imports

- [x] 1.3 Create `packages/iatools/src/tui/context.ts` — define `TuiContext` interface with methods `banner(version)`, `table(opts)`, `progress(opts)`, `diffView(opts)`, `log.{info,success,warn,error}(msg)`, `destroy()`. Export `createTuiContext(opts?)` factory that returns an OpenTUI-backed context when `process.stdout.isTTY` is true, or a fallback context otherwise.
  - Verify: Calling `createTuiContext()` in TTY returns an object implementing all `TuiContext` methods

- [x] 1.4 Create `packages/iatools/src/tui/renderer.ts` — export `createAppRenderer()` that wraps `CliRenderer` lifecycle: creates renderer, enters alternate screen, registers `ESC` key handler for destroy, catches uncaught exceptions to destroy before propagating (spec TUI-01.3, TUI-01.5), handles `SIGINT`/`Ctrl+C` (spec TUI-12.7).
  - Verify: Calling `createAppRenderer()` returns an object with `renderer`, `root`, and `destroy()` method

- [x] 1.5 Create `packages/iatools/src/tui/fallback.ts` — implement `TuiContext` using `console.log`/`console.error` for non-TTY environments. Interactive methods (`initWizard`, `queryResults`, `sanitizeReview`) must print `"Interactive mode requires a TTY terminal"` to stderr and exit with code 1 (spec TUI-13.5).
  - Verify: All `TuiContext` methods are implemented; log methods write to stdout; interactive methods write error to stderr

- [x] 1.6 Create `packages/iatools/src/tui/index.ts` — barrel file re-exporting `THEME`, `TuiContext`, `createTuiContext`, `createAppRenderer`, and all component/screen modules.
  - Verify: `import { THEME, createTuiContext } from './tui'` resolves correctly

- [x] 1.7 Add Bun runtime detection in `packages/iatools/src/index.ts` — at startup, check `typeof Bun !== 'undefined'`. If runtime is not Bun, print `"iatools requires Bun runtime. Install from https://bun.sh"` to stderr and exit with code 1 (spec TUI-14.2).
  - Verify: Running under Node.js shows error message and exits; running under Bun proceeds normally

## Phase 2: Components

- [x] 2.1 Create `packages/iatools/src/tui/components/banner.ts` — export `createBanner(root, { title, version })` that renders the tool name via `ASCIIFontRenderable` inside a `BoxRenderable` with rounded border and primary-colored border. Version subtitle as `TextRenderable` below the ASCII art (spec TUI-03).
  - Verify: `createTestRenderer` + `captureCharFrame()` shows ASCII art text within rounded border box

- [x] 2.2 Create `packages/iatools/src/tui/components/table.ts` — export `createTable(root, { columns, rows })` that builds a `BoxRenderable` grid layout with column `BoxRenderable` containers and `TextRenderable` cells. Header row bold + primary color. Wrap in `ScrollBoxRenderable` when row count exceeds visible area (spec TUI-04).
  - Verify: Snapshot shows aligned columns, bold header; 50-row table is scrollable

- [x] 2.3 Create `packages/iatools/src/tui/components/progress.ts` — export `createProgressBar(root, { current, total, label })` returning `{ update(current, total, label) }`. Renders filled `BoxRenderable` (success bg) inside a container `BoxRenderable` (muted bg) with percentage `TextRenderable` (spec TUI-05). Update must mutate in-place (TUI-05.6).
  - Verify: `update(50, 100, 'Processing...')` renders 50% fill; `update(100, 100, 'Done')` renders full bar

- [x] 2.4 Create `packages/iatools/src/tui/components/diff-view.ts` — export `createDiffView(root, { filePath, lines })` rendering each line as a colored `TextRenderable`: `+` lines in success, `-` lines in error, context in muted, `@@` headers in accent. Wrapped in bordered `BoxRenderable` with file path title. Scrollable via `ScrollBoxRenderable` (spec TUI-06).
  - Verify: Snapshot shows colored lines matching prefix rules; long diff is scrollable

- [x] 2.5 Create `packages/iatools/src/tui/components/log-panel.ts` — export `createLogPanel(root)` returning `{ info, success, warn, error, debug }` methods. Each appends a `TextRenderable` (icon + colored text) to a `ScrollBoxRenderable` that auto-scrolls to latest entry (spec TUI-07).
  - Verify: Calling `info('msg')` appends a new child; container scrolls to bottom

## Phase 3: Interactive Screens

- [x] 3.1 Create `packages/iatools/src/tui/screens/init-wizard.ts` — export `createInitWizard(renderer)` that renders a multi-step wizard: Step 1 IDE selection (`SelectRenderable`: `vscode`, `cursor`, `windsurf`, `all`), Step 2 role selection (multi-select `SelectRenderable`), Step 3 confirmation. `Tab`/`Shift+Tab` between steps, `Up`/`Down` + `Space` + `Enter` within selects, `ESC` exits without applying. Step indicator + key hints bar (spec TUI-08).
  - Verify: Simulated keypress sequences advance steps; `ESC` exits returning `null`; completed wizard returns `{ ides, roles }`

- [x] 3.2 Create `packages/iatools/src/tui/screens/query-results.ts` — export `createQueryResultsScreen(renderer, results)` rendering a `SelectRenderable` list with columns (score, type, title, source). `Enter` opens detail pane, `Space` toggles batch selection, `e` exports selected, `ESC` closes pane or exits. Key hints bar updates contextually (spec TUI-09).
  - Verify: Simulated `Down` + `Enter` opens detail pane; `Space` toggles checkmark; `e` returns selected items; empty results show "No results found"

- [x] 3.3 Create `packages/iatools/src/tui/screens/sanitize-review.ts` — export `createSanitizeReview(renderer, candidates)` showing one candidate at a time: severity badge, label, matched text highlighted in error color with context. `a`/`Enter` approves (redact), `r` rejects (keep), `ESC` aborts. Progress indicator "Candidate X of Y". After last candidate, summary panel (spec TUI-10).
  - Verify: Simulated `a` advances to next candidate; `r` records keep; after last candidate, summary shows correct counts; `ESC` mid-review returns partial decisions

## Phase 4: Non-Interactive Screen Pattern

- [x] 4.1 Create `packages/iatools/src/tui/screens/static-output.ts` — export `createStaticOutput(renderer, { title })` returning `{ setContent(renderables), setProgress(current, total, label), waitForExit() }`. Layout: banner top, scrollable content area center, status bar bottom ("Press any key to exit" + elapsed time). Auto-exits for non-interactive after content renders. Arrow keys scroll content (spec TUI-11).
  - Verify: Mounting with content shows banner + content + status bar; keypress after completion destroys renderer

- [x] 4.2 Wire `packages/iatools/src/commands/review.ts` to use `createStaticOutput` screen — replace current console output with TUI static-output screen. Pass review content as scrollable text.
  - Verify: `iatools review` renders in full-screen TUI with scrollable content; non-TTY falls back to plain text

- [x] 4.3 Wire `packages/iatools/src/commands/trace.ts` to use `createStaticOutput` screen — render lineage DAG as styled text content in the static-output screen.
  - Verify: `iatools trace` renders DAG in scrollable TUI area

- [x] 4.4 Wire `packages/iatools/src/commands/compress.ts` to use `createStaticOutput` + progress bar — show progress during compression, then final output in scrollable area.
  - Verify: Progress bar advances during compression; final output is displayed

- [x] 4.5 Wire `packages/iatools/src/commands/changelog.ts` to use `createStaticOutput` screen — render changelog text in the scrollable content area.
  - Verify: `iatools changelog` renders in TUI with scrollable changelog content

- [x] 4.6 Wire `packages/iatools/src/commands/update.ts` to use `createStaticOutput` + progress bar — show progress during update, then summary in scrollable area.
  - Verify: Progress bar advances during update; completion summary displayed

- [x] 4.7 Wire `packages/iatools/src/commands/memory-export.ts` to use `createStaticOutput` screen — render export result in the scrollable content area.
  - Verify: `iatools memory export` renders in TUI; non-TTY falls back to plain text

## Phase 5: Interactive Command Wiring

- [x] 5.1 Wire `packages/iatools/src/commands/init.ts` to use `createInitWizard` screen — replace `inquirer` prompts with the TUI init wizard. Pass wizard results to the existing init logic.
  - Verify: `iatools init` launches full-screen wizard; selections produce same config as before; `ESC` cancels without changes

- [x] 5.2 Wire `packages/iatools/src/commands/memory-query.ts` to use `createQueryResultsScreen` — replace `inquirer` checkbox prompts with TUI query results screen. Pass results to existing export logic when user presses `e`.
  - Verify: `iatools memory query "term"` shows interactive result list; `Enter` opens detail; `Space` + `e` exports selected

- [x] 5.3 Wire `packages/iatools/src/commands/memory-ingest.ts` to use TUI progress bar + log panel for ingestion progress, and `createSanitizeReview` screen for the sanitize review flow. Replace `ora` spinner and `inquirer` prompts.
  - Verify: `iatools memory ingest` shows progress bar during ingestion; sanitize review launches TUI screen; non-TTY falls back

## Phase 6: Cleanup

- [x] 6.1 Delete the entire `packages/iatools/src/ui/` directory (files: `theme.ts`, `logger.ts`, `terminal.ts`, `index.ts`, `components/banner.ts`, `components/table.ts`, `components/progress.ts`, `components/diff-view.ts`, `screens/query-results.ts`, `screens/sanitize-review.ts`).
  - Verify: `src/ui/` directory does not exist; no imports reference `src/ui/`

- [x] 6.2 Remove legacy dependencies from `packages/iatools/package.json`: `chalk`, `ora`, `inquirer`, `boxen`, `cli-table3`, `figures` from `dependencies`; `@types/inquirer` from `devDependencies`.
  - Verify: `grep -r "chalk\|ora\|inquirer\|boxen\|cli-table3\|figures" packages/iatools/package.json` returns nothing

- [x] 6.3 Update `packages/iatools/src/tui/index.ts` barrel exports to include all components and screens. Update any residual imports across `src/commands/*.ts` and `src/cli.ts` that still reference `src/ui/` to point to `src/tui/`.
  - Verify: `grep -r "from.*['\"].*ui/" packages/iatools/src/` returns nothing; `tsc --noEmit` passes clean

- [x] 6.4 Run `bun install` (or `npm install`) to sync the lockfile after dependency changes.
  - Verify: Lockfile updated; `bun run compile` (or `npm run compile`) succeeds without errors

## Phase 7: Testing

- [x] 7.1 Create `packages/iatools/test/unit/tui/theme.test.ts` — assert all hex color values match spec TUI-02.2, all icon keys exist, border style is `'rounded'`, object is frozen.
  - Verify: `npm run test -- --testPathPattern=tui/theme` passes

- [x] 7.2 Create `packages/iatools/test/unit/tui/components/banner.test.ts` — snapshot test using `createTestRenderer` + `captureCharFrame()`. Verify ASCII art text, rounded border, version subtitle present.
  - Verify: Snapshot file generated; test passes on re-run

- [x] 7.3 Create `packages/iatools/test/unit/tui/components/table.test.ts` — snapshot test for table with sample data (3 columns, 5 rows). Test scroll behavior with 50-row dataset.
  - Verify: Snapshot matches expected grid layout; scrollable test passes

- [x] 7.4 Create `packages/iatools/test/unit/tui/components/progress.test.ts` — test `update()` at 0%, 50%, 100%. Verify fill width calculation and label text.
  - Verify: All three states render correctly in snapshots

- [x] 7.5 Create `packages/iatools/test/unit/tui/components/diff-view.test.ts` — snapshot test with mixed `+`, `-`, context, and `@@` lines. Verify correct color assignments per prefix.
  - Verify: Snapshot shows color-coded lines

- [x] 7.6 Create `packages/iatools/test/unit/tui/components/log-panel.test.ts` — test appending multiple log levels; verify icon prefixes, auto-scroll to latest.
  - Verify: Test passes; log entries ordered correctly

- [x] 7.7 Create `packages/iatools/test/unit/tui/screens/init-wizard.test.ts` — simulate keyboard sequences: `Down` + `Space` + `Enter` to select IDE, `Down` + `Space` + `Enter` to select role, `Enter` to confirm. Test `ESC` exits with null.
  - Verify: Wizard returns expected `{ ides, roles }` selection; ESC returns null

- [x] 7.8 Create `packages/iatools/test/unit/tui/screens/query-results.test.ts` — simulate: navigate list, `Enter` to open detail, `ESC` to close detail, `Space` to select, `e` to export. Test empty results shows "No results found".
  - Verify: Exported items match selected items; empty state renders message

- [x] 7.9 Create `packages/iatools/test/unit/tui/screens/sanitize-review.test.ts` — simulate: `a` to approve, `r` to reject, `ESC` to abort mid-review. Verify summary counts and partial decisions on abort.
  - Verify: Summary shows correct approve/reject counts; abort returns partial list

- [x] 7.10 Create `packages/iatools/test/unit/tui/fallback.test.ts` — mock `process.stdout.isTTY = false`. Verify `createTuiContext()` returns fallback context. Verify log methods write to stdout. Verify interactive methods print error to stderr and exit.
  - Verify: All fallback behaviors match spec TUI-13

- [x] 7.11 Run full test suite and verify ≥ 80% coverage on `packages/iatools/src/tui/`.
  - Verify: `npm run coverage` reports ≥ 80% line and branch coverage for `src/tui/`
