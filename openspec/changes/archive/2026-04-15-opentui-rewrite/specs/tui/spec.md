# TUI Specification — OpenTUI Full-Screen Rewrite

**Domain**: `tui/`  
**Change**: `2026-04-15-opentui-rewrite`  
**Replaces**: `SPEC-05: Premium CLI UX` (iatools-v2.0, UI-1 through UI-6)  
**Date**: 2026-04-15

---

## Purpose

This specification defines the full-screen terminal user interface for iatools, built entirely on `@opentui/core` (imperative API). It replaces the previous chalk/ora/inquirer/boxen/cli-table3 UI layer with a unified TUI that controls the entire terminal viewport, supports keyboard navigation, and runs exclusively on the Bun runtime.

---

## TUI-01: Application Lifecycle

### Requirements

| ID | Requirement |
|----|------------|
| TUI-01.1 | The system MUST create a `CliRenderer` instance at command entry and destroy it before process exit |
| TUI-01.2 | The system MUST enter the alternate terminal screen on renderer creation and restore the original screen on destroy |
| TUI-01.3 | The system MUST register a global `ESC` key handler that calls `renderer.destroy()` and exits cleanly |
| TUI-01.4 | The system MUST NOT call `process.exit()` directly; all exits MUST go through `renderer.destroy()` |
| TUI-01.5 | The system MUST catch uncaught exceptions and destroy the renderer before propagating, preventing terminal corruption |
| TUI-01.6 | For non-interactive commands, the renderer MUST auto-exit after rendering is complete (single render cycle) |
| TUI-01.7 | For interactive commands, the renderer MUST remain active and process keyboard input until the user completes the workflow or presses ESC |

#### Scenario: Interactive command starts and stops

- GIVEN the user runs `iatools init`
- WHEN the command handler executes
- THEN a `CliRenderer` is created and the terminal enters alternate screen
- AND the init wizard screen is rendered
- AND the renderer remains active, processing keyboard events

#### Scenario: Interactive command exits on ESC

- GIVEN an interactive screen is active (e.g., init wizard)
- WHEN the user presses `ESC`
- THEN `renderer.destroy()` is called
- AND the terminal restores the original screen
- AND the process exits with code 0

#### Scenario: Non-interactive command renders and exits

- GIVEN the user runs `iatools changelog`
- WHEN the content finishes rendering
- THEN the output is displayed in a single render cycle
- AND the renderer is destroyed automatically
- AND the terminal restores the original screen

#### Scenario: Crash recovery preserves terminal state

- GIVEN the TUI is rendering
- WHEN an uncaught exception occurs
- THEN the renderer is destroyed before the error propagates
- AND the terminal is restored to its pre-TUI state
- AND the error is printed to stderr

---

## TUI-02: Theme System

### Requirements

| ID | Requirement |
|----|------------|
| TUI-02.1 | The system MUST define a theme object with hex color constants replacing chalk function references |
| TUI-02.2 | The theme MUST define: `primary` (#a855f7 / purple), `success` (#22c55e / green), `warning` (#eab308 / yellow), `error` (#ef4444 / red), `muted` (#6b7280 / gray), `accent` (#06b6d4 / cyan), `highlight` (#ffffff / white) |
| TUI-02.3 | The theme MUST define border style as `"rounded"` for all panel-like containers |
| TUI-02.4 | The theme MUST define icon constants (unicode characters) for `success`, `error`, `arrow`, `warning`, `bullet`, `pointer`, and emoji icons for `star`, `brain`, `shield`, `trace` |
| TUI-02.5 | All OpenTUI renderables MUST consume colors via `fg` / `bg` hex string properties, never through chalk function calls |
| TUI-02.6 | The theme object MUST be a plain TypeScript constant (no runtime dependencies) |

#### Scenario: Theme colors applied to a text renderable

- GIVEN a `TextRenderable` is created with `fg: theme.colors.primary`
- WHEN the renderer paints the frame
- THEN the text is displayed in purple (#a855f7)

#### Scenario: Theme border style applied to a container

- GIVEN a `BoxRenderable` is created with `borderStyle: theme.border.style`
- WHEN the renderer paints the frame
- THEN the box displays rounded borders (╭─╮│ │╰─╯)

---

## TUI-03: Banner Component

### Requirements

| ID | Requirement |
|----|------------|
| TUI-03.1 | The system MUST render the iatools brand name using `ASCIIFontRenderable` |
| TUI-03.2 | The banner MUST be wrapped in a `BoxRenderable` with rounded borders and primary-colored border |
| TUI-03.3 | The banner MUST include a version subtitle rendered as a `TextRenderable` below the ASCII art |
| TUI-03.4 | The banner component MUST accept `title` and `version` parameters |

#### Scenario: Banner renders on command startup

- GIVEN the user runs any iatools command in a TTY terminal
- WHEN the TUI screen initializes
- THEN an ASCII-art banner displaying the tool name is rendered at the top
- AND a version string is displayed beneath the ASCII art
- AND the banner is enclosed in a rounded-border box with purple border color

---

## TUI-04: Table Component

### Requirements

| ID | Requirement |
|----|------------|
| TUI-04.1 | The system MUST render tabular data using a `BoxRenderable` grid layout (row of column containers) |
| TUI-04.2 | Each column MUST be a `BoxRenderable` with flex layout, containing `TextRenderable` cells |
| TUI-04.3 | The header row MUST be styled with bold text attributes and primary color foreground |
| TUI-04.4 | The table MUST accept columns definition (`{ key, label, width? }[]`) and rows data (`Record<string, string>[]`) |
| TUI-04.5 | Column widths MUST default to equal distribution within the available container width when not explicitly set |
| TUI-04.6 | The table MUST be wrapped in a `ScrollBoxRenderable` when row count exceeds the visible area |

#### Scenario: Table renders memory query results

- GIVEN memory query returns 5 results with fields Score, Type, Title, Source
- WHEN the table component receives the data
- THEN a 4-column grid is rendered with bold purple headers
- AND 5 data rows are displayed beneath the header row
- AND each cell is aligned within its column

#### Scenario: Table scrolls when content overflows

- GIVEN the table has 50 rows but the visible area fits 20
- WHEN the table is rendered
- THEN the table is wrapped in a scroll container
- AND the user can scroll with arrow keys to see remaining rows

---

## TUI-05: Progress Bar Component

### Requirements

| ID | Requirement |
|----|------------|
| TUI-05.1 | The system MUST render a progress bar as a `BoxRenderable` with a filled inner `BoxRenderable` |
| TUI-05.2 | The filled portion width MUST be calculated as `(current / total) * containerWidth` |
| TUI-05.3 | The filled portion MUST use success color background; the unfilled portion MUST use muted color |
| TUI-05.4 | A `TextRenderable` MUST display the label and percentage to the right of the bar |
| TUI-05.5 | The progress bar MUST accept `current`, `total`, and `label` parameters |
| TUI-05.6 | The progress bar MUST update in-place by mutating renderable properties (no re-creation) |

#### Scenario: Progress bar advances during memory ingest

- GIVEN a memory ingest operation processes 100 files
- WHEN 50 files are processed
- THEN the progress bar shows 50% fill with success-colored background
- AND the label reads "Processing... 50/100 (50%)"

#### Scenario: Progress bar reaches 100%

- GIVEN a progress operation completes
- WHEN current equals total
- THEN the bar is fully filled
- AND the label updates to show completion

---

## TUI-06: Diff View Component

### Requirements

| ID | Requirement |
|----|------------|
| TUI-06.1 | The system MUST render diff output using styled `TextRenderable` elements with line-by-line coloring |
| TUI-06.2 | Added lines (prefix `+`) MUST be displayed with success color foreground |
| TUI-06.3 | Removed lines (prefix `-`) MUST be displayed with error color foreground |
| TUI-06.4 | Context lines (no prefix) MUST be displayed with muted color foreground |
| TUI-06.5 | Diff section headers (prefix `@@`) MUST be displayed with accent color foreground |
| TUI-06.6 | The diff view MUST be contained in a `BoxRenderable` with border and title showing the file path |
| TUI-06.7 | The diff view MUST support scrolling via `ScrollBoxRenderable` for long diffs |

#### Scenario: Diff view shows sanitization changes

- GIVEN the sanitizer redacts 3 lines in a file
- WHEN the diff view renders
- THEN removed lines are shown in red
- AND added (redacted) lines are shown in green
- AND surrounding context lines are shown in gray
- AND the panel title shows the file name

#### Scenario: Long diff is scrollable

- GIVEN a diff output exceeds the visible area
- WHEN the diff view renders
- THEN the content is placed in a scroll container
- AND the user can scroll with arrow keys

---

## TUI-07: Logger

### Requirements

| ID | Requirement |
|----|------------|
| TUI-07.1 | The system MUST provide a logger that renders log lines as `TextRenderable` children within a scrollable log container |
| TUI-07.2 | Log levels MUST include `info`, `success`, `warn`, `error`, `debug` |
| TUI-07.3 | Each log level MUST be prefixed with the corresponding theme icon and colored with the corresponding theme color |
| TUI-07.4 | The logger MUST append new entries to the bottom of the log container and auto-scroll to latest |
| TUI-07.5 | In non-TTY environments, the logger MUST fall back to `console.log` / `console.error` with plain text (no TUI rendering) |

#### Scenario: Info message logged during command execution

- GIVEN a command is running inside the TUI
- WHEN `logger.info("Processing complete")` is called
- THEN a new `TextRenderable` with accent-colored info icon and white text is appended to the log area
- AND the scroll container auto-scrolls to show the new entry

#### Scenario: Non-TTY fallback

- GIVEN the output is piped (`iatools compress | cat`)
- WHEN any logger method is called
- THEN output is written via `console.log` with no TUI rendering
- AND no renderer is created

---

## TUI-08: Init Wizard Screen (Interactive)

### Requirements

| ID | Requirement |
|----|------------|
| TUI-08.1 | The system MUST render a full-screen wizard for `iatools init` using OpenTUI renderables |
| TUI-08.2 | The wizard MUST present IDE selection as a `SelectRenderable` with items: `vscode`, `cursor`, `windsurf`, `all` |
| TUI-08.3 | The wizard MUST present role selection as a `SelectRenderable` with multi-select enabled |
| TUI-08.4 | Navigation between wizard steps MUST use `Tab` (next) and `Shift+Tab` (previous) |
| TUI-08.5 | Within a `SelectRenderable`, arrow keys (`Up`/`Down`) MUST navigate items, `Space` MUST toggle selection, `Enter` MUST confirm |
| TUI-08.6 | The wizard screen MUST display a key hints bar at the bottom showing available keyboard shortcuts |
| TUI-08.7 | The wizard MUST show the current step indicator (e.g., "Step 1 of 3") |
| TUI-08.8 | `ESC` at any point MUST exit the wizard without applying changes |

#### Scenario: User selects IDE and roles

- GIVEN the user runs `iatools init`
- WHEN the wizard screen renders
- THEN step 1 shows a `SelectRenderable` with IDE options
- AND a key hints bar at the bottom shows `[↑↓] Navigate  [Space] Select  [Enter] Confirm  [ESC] Exit`

#### Scenario: User navigates between wizard steps

- GIVEN the user is on step 1 (IDE selection) and presses `Enter`
- WHEN the selection is confirmed
- THEN the wizard advances to step 2 (role selection)
- AND the step indicator updates to "Step 2 of 3"

#### Scenario: User presses ESC to cancel wizard

- GIVEN the user is on any step of the wizard
- WHEN the user presses `ESC`
- THEN the wizard exits without writing any configuration
- AND the renderer is destroyed and terminal restored

#### Scenario: Multi-select for roles

- GIVEN the user is on the roles selection step
- WHEN the user presses `Space` on two roles and then `Enter`
- THEN both roles are selected
- AND the wizard proceeds to the next step with both selections applied

---

## TUI-09: Query Results Screen (Interactive)

### Requirements

| ID | Requirement |
|----|------------|
| TUI-09.1 | The system MUST render memory query results as a full-screen interactive list using `SelectRenderable` |
| TUI-09.2 | Each list item MUST display: score, node type, title, and source (truncated to fit) |
| TUI-09.3 | Arrow keys (`Up`/`Down`) MUST navigate the result list |
| TUI-09.4 | Pressing `Enter` on a selected result MUST expand it to show full node details in a detail pane |
| TUI-09.5 | Pressing `Space` MUST toggle items for batch export |
| TUI-09.6 | Pressing `e` with items selected MUST trigger export of selected items |
| TUI-09.7 | `ESC` MUST close the detail pane if open, or exit the screen if no pane is open |
| TUI-09.8 | A key hints bar MUST be displayed at the bottom of the screen |

#### Scenario: Query results displayed as interactive list

- GIVEN `iatools memory query "architecture"` returns 8 results
- WHEN the results screen renders
- THEN an 8-item selectable list is displayed with Score, Type, Title columns
- AND the first item is highlighted (focused)
- AND the bottom bar shows `[↑↓] Navigate  [Enter] Details  [Space] Select  [e] Export  [ESC] Exit`

#### Scenario: User expands a result

- GIVEN the query results list is displayed
- WHEN the user navigates to result 3 and presses `Enter`
- THEN a detail pane appears showing the full node content, metadata, and relationships
- AND pressing `ESC` closes the detail pane and returns to the list

#### Scenario: User selects multiple results for export

- GIVEN the query results list is displayed
- WHEN the user presses `Space` on results 1, 3, and 5
- THEN those 3 items display a selection indicator (checkmark)
- AND pressing `e` triggers export of the 3 selected items

#### Scenario: Empty query results

- GIVEN a memory query returns 0 results
- WHEN the results screen renders
- THEN a centered message "No results found" is displayed with muted styling
- AND `ESC` exits the screen

---

## TUI-10: Sanitize Review Screen (Interactive)

### Requirements

| ID | Requirement |
|----|------------|
| TUI-10.1 | The system MUST render sanitization review as a full-screen TUI with one candidate shown at a time |
| TUI-10.2 | Each candidate MUST display: severity badge, label, matched text with surrounding context in a diff-view style panel |
| TUI-10.3 | The user MUST approve (`a` or `Enter`) or reject (`r`) each candidate |
| TUI-10.4 | A progress indicator MUST show "Candidate X of Y" |
| TUI-10.5 | After the last candidate is reviewed, the screen MUST display a summary of decisions (approved/rejected counts) |
| TUI-10.6 | `ESC` MUST abort the review; no decisions are persisted for unreviewed candidates |
| TUI-10.7 | The matched text MUST be highlighted in error color within its surrounding context |

#### Scenario: User reviews sanitization candidates

- GIVEN the sanitizer found 5 redaction candidates
- WHEN the review screen renders
- THEN candidate 1 of 5 is displayed with severity badge, label, and context window
- AND the matched text is highlighted in red
- AND the bottom bar shows `[a/Enter] Approve  [r] Reject  [ESC] Abort`

#### Scenario: User approves a candidate

- GIVEN candidate 2 of 5 is displayed
- WHEN the user presses `a`
- THEN the decision is recorded as "redact"
- AND the screen advances to candidate 3 of 5
- AND the progress indicator updates

#### Scenario: User rejects a candidate

- GIVEN candidate 3 of 5 is displayed
- WHEN the user presses `r`
- THEN the decision is recorded as "keep"
- AND the screen advances to candidate 4 of 5

#### Scenario: Review completes

- GIVEN the user has reviewed all 5 candidates
- WHEN the last decision is made
- THEN a summary panel displays: "Approved: 3 | Rejected: 2"
- AND pressing any key exits the review screen and returns decisions to the caller

#### Scenario: User aborts review

- GIVEN 2 of 5 candidates have been reviewed
- WHEN the user presses `ESC`
- THEN the review is aborted
- AND only the 2 completed decisions are returned (remaining candidates undecided)

---

## TUI-11: Non-Interactive Command Screens

### Requirements

| ID | Requirement |
|----|------------|
| TUI-11.1 | Non-interactive commands (`compress`, `changelog`, `review`, `trace`, `update`, `memory-export`) MUST render their output in the TUI and exit automatically |
| TUI-11.2 | The screen layout MUST include: banner at top, content area in the middle, status bar at the bottom |
| TUI-11.3 | The status bar MUST display elapsed time and a "Press any key to exit" hint for commands that complete |
| TUI-11.4 | Long-running operations MUST show a progress bar in the content area |
| TUI-11.5 | Command output (logs, tables, diffs) MUST be rendered within a scrollable content area |
| TUI-11.6 | On completion, the screen MUST wait for a keypress then destroy the renderer |

#### Scenario: Changelog command renders and exits

- GIVEN the user runs `iatools changelog`
- WHEN the changelog content is generated
- THEN the TUI displays the banner, changelog text in a scrollable area, and a status bar
- AND the status bar shows "Press any key to exit"
- AND pressing any key destroys the renderer and restores the terminal

#### Scenario: Compress command with progress

- GIVEN the user runs `iatools compress --change my-change`
- WHEN the compression processes 10 files
- THEN a progress bar advances from 0% to 100% as each file completes
- AND upon completion, the compressed output is displayed
- AND the status bar shows "Press any key to exit"

#### Scenario: Trace command renders DAG

- GIVEN the user runs `iatools trace --change X --item T1`
- WHEN the trace is computed
- THEN the lineage DAG is rendered as styled text in the content area
- AND the user can scroll through the DAG with arrow keys

---

## TUI-12: Keyboard Navigation

### Requirements

| ID | Requirement |
|----|------------|
| TUI-12.1 | Global `ESC` MUST exit the current screen (or the application if on root screen) |
| TUI-12.2 | `Up`/`Down` arrow keys MUST navigate within lists and scroll within scrollable containers |
| TUI-12.3 | `Tab` / `Shift+Tab` MUST cycle focus between focusable elements on multi-field screens |
| TUI-12.4 | `Space` MUST toggle selection in multi-select contexts |
| TUI-12.5 | `Enter` MUST confirm the current selection or action |
| TUI-12.6 | All screens MUST display a key hints bar at the bottom showing context-appropriate keyboard shortcuts |
| TUI-12.7 | The system MUST handle `Ctrl+C` by destroying the renderer and exiting (SIGINT behavior) |

#### Scenario: Ctrl+C exits at any point

- GIVEN the TUI is active on any screen
- WHEN the user presses `Ctrl+C`
- THEN the renderer is destroyed
- AND the terminal is restored
- AND the process exits with code 130 (SIGINT convention)

#### Scenario: Key hints update contextually

- GIVEN the user is on the query results screen
- WHEN the user opens a detail pane
- THEN the key hints bar updates to show `[ESC] Close  [↑↓] Scroll`
- AND when the pane is closed, the hints revert to the list view hints

---

## TUI-13: Non-TTY Fallback

### Requirements

| ID | Requirement |
|----|------------|
| TUI-13.1 | The system MUST detect non-TTY environments (`!process.stdout.isTTY`) before creating a renderer |
| TUI-13.2 | In non-TTY mode, no `CliRenderer` SHALL be created |
| TUI-13.3 | All commands MUST fall back to plain text output via `console.log` in non-TTY mode |
| TUI-13.4 | The fallback MUST produce the same informational content (tables as formatted text, results as lines) — only visual chrome is omitted |
| TUI-13.5 | Interactive commands (init, query, sanitize review) in non-TTY mode MUST exit with an error message stating "Interactive mode requires a TTY terminal" |

#### Scenario: Piped output uses plain text

- GIVEN the user runs `iatools changelog | cat`
- WHEN the output is piped (non-TTY)
- THEN changelog content is printed via `console.log` with no TUI rendering
- AND the output is human-readable plain text

#### Scenario: Interactive command in non-TTY fails gracefully

- GIVEN the user runs `iatools init | cat`
- WHEN non-TTY is detected
- THEN the command prints "Interactive mode requires a TTY terminal" to stderr
- AND the process exits with code 1

---

## TUI-14: Bun Runtime Requirement

### Requirements

| ID | Requirement |
|----|------------|
| TUI-14.1 | The TUI layer MUST import from `@opentui/core` which requires Bun runtime |
| TUI-14.2 | On startup, the system SHOULD detect the runtime and show a clear error if not running under Bun |
| TUI-14.3 | The `package.json` MUST list `@opentui/core` as a dependency |
| TUI-14.4 | The `package.json` MUST remove `chalk`, `ora`, `inquirer`, `boxen`, `cli-table3`, and `figures` from dependencies |

#### Scenario: Running under Bun

- GIVEN Bun is the active runtime
- WHEN `iatools` starts
- THEN `@opentui/core` loads successfully
- AND the TUI renders normally

#### Scenario: Running under Node.js

- GIVEN Node.js is the active runtime
- WHEN `iatools` starts
- THEN the system detects non-Bun runtime
- AND prints "iatools requires Bun runtime. Install from https://bun.sh" to stderr
- AND exits with code 1

---

## TUI-15: Testing

### Requirements

| ID | Requirement |
|----|------------|
| TUI-15.1 | All TUI components MUST be testable via `createTestRenderer` from `@opentui/core/testing` |
| TUI-15.2 | Each component (banner, table, progress, diff-view, logger) MUST have snapshot tests verifying visual output |
| TUI-15.3 | Interactive screens (init wizard, query results, sanitize review) MUST have interaction tests simulating keyboard input |
| TUI-15.4 | Test coverage for the `src/ui/` directory MUST meet or exceed 80% |
| TUI-15.5 | Tests MUST use the headless test renderer; no tests SHALL require a live terminal |

#### Scenario: Component snapshot test

- GIVEN a table component is instantiated via `createTestRenderer`
- WHEN `renderOnce()` is called with sample data
- THEN `captureCharFrame()` output matches the stored snapshot

#### Scenario: Interactive screen keyboard test

- GIVEN the init wizard screen is instantiated via `createTestRenderer`
- WHEN a `Down` key event followed by `Space` and `Enter` is dispatched
- THEN the second IDE option is selected and confirmed
- AND the wizard state advances to the next step

#### Scenario: Non-TTY fallback test

- GIVEN `process.stdout.isTTY` is mocked as `false`
- WHEN a non-interactive command runs
- THEN output is written to stdout without renderer creation
- AND the output string contains the expected content

---

## Cross-Reference to Replaced Specs

| Old Spec ID | Old Requirement | New Spec ID | Status |
|-------------|----------------|-------------|--------|
| UI-1 | Themed terminal rendering with chalk/boxen/cli-table3 | TUI-02, TUI-03, TUI-04, TUI-06 | Replaced |
| UI-2 | Theme system with consistent brand colors | TUI-02 | Replaced |
| UI-3 | Graceful fallback for non-TTY environments | TUI-13 | Replaced |
| UI-4 | Init wizard uses Inquirer multi-select | TUI-08 | Replaced |
| UI-5 | Memory query results as styled table with inquirer selection | TUI-09 | Replaced |
| UI-6 | Sanitization review as styled diff with inquirer prompts | TUI-10 | Replaced |
