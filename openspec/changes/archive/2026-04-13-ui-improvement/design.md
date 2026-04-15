# Design: UI Improvement — Logger Unification & Responsive Components

## Technical Approach

Unify CLI output around the existing `src/ui/logger.ts` (TTY-aware, theme-integrated) by migrating all 8 remaining command imports from the old `src/utils/logger.ts`. Add a shared `getTerminalWidth()` helper and thread it through `renderTable`, `renderBanner`, and `renderDiffView` so every visual component respects the actual terminal width with a 60-column floor and an 80-column default for piped/redirected output.

## Architecture Decisions

### Decision: Single `getTerminalWidth()` in `src/ui/terminal.ts`

**Choice**: New file `src/ui/terminal.ts` exporting one pure-ish function that reads `process.stdout.columns`.
**Alternatives considered**: (a) Inline `process.stdout.columns ?? 80` at every call site; (b) Add to `theme.ts`.
**Rationale**: A single source avoids divergent defaults. Keeping it separate from `theme.ts` keeps theme purely about colors/icons and makes mocking in tests straightforward (one import to mock).

### Decision: Components accept optional `terminalWidth` parameter, default to `getTerminalWidth()`

**Choice**: Every render function (`renderTable`, `renderBanner`, `renderDiffView`) adds an optional `terminalWidth?: number` parameter. When omitted it calls `getTerminalWidth()`.
**Alternatives considered**: (a) Always read `process.stdout.columns` internally; (b) Global config object.
**Rationale**: The optional parameter enables deterministic testing (pass explicit width) while preserving the zero-config default for production code. No global state needed.

### Decision: Table fallback is a key-value list format

**Choice**: When `terminalWidth < 60`, `renderTable` switches to a vertical list: each row prints its column headers as labels on separate lines, separated by blank lines.
**Alternatives considered**: (a) Horizontal scroll hint; (b) Truncate columns with `…`.
**Rationale**: Vertical list guarantees all data is visible (spec UI-SC7 requires it). Horizontal hints are not interactable in non-interactive pipes. Truncation risks hiding critical info.

### Decision: In-place import replacement (no adapter/wrapper)

**Choice**: Replace `import { logger } from '@/utils/logger'` → `import { logger } from '@/ui/logger'` directly in each command file.
**Alternatives considered**: (a) Re-export the new logger from `@/utils/logger` temporarily; (b) Create an alias.
**Rationale**: The spec mandates zero imports from `@/utils/logger` after migration (UI-1, LOG-SC1). A shim delays that goal and adds a dead-code path. Direct replacement is simpler and verifiable with a grep.

### Decision: `banner()` call sites updated to pass version

**Choice**: `init.ts` and `update.ts` change from `logger.banner()` to `logger.banner(version)`, reading version from `package.json` or a constant.
**Alternatives considered**: (a) Make version optional in new logger.
**Rationale**: The version is already available in the CLI setup (Commander reads it from `package.json`). Making it optional would hide a real dependency and produce incomplete output.

## Data Flow

```
Command handler
    │
    └──→ import { logger } from '@/ui/logger'
              │
              ├── logger.success/info/warn/error/header/label/newline
              │       └── isTTY? → themed chalk output : plain-text prefix
              │
              ├── logger.banner(version)
              │       └── isTTY? → renderBanner(version, getTerminalWidth())
              │                  : plain-text fallback
              ├── logger.table(options)
              │       └── renderTable(options, getTerminalWidth())
              │               └── width ≥ 60? → cli-table3 with proportional cols
              │                              : vertical key-value list
              ├── logger.panel(content, opts)
              │       └── isTTY? → boxen(content, { width: min(boxWidth, termWidth) })
              │                  : plain-text panel
              └── logger.keyHint / progress
                      └── (unchanged — already width-agnostic)

getTerminalWidth()  ← src/ui/terminal.ts
    └── process.stdout.columns ?? 80
        └── clamp to min 60 (or return raw for < 60 fallback detection)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/ui/terminal.ts` | Create | `getTerminalWidth()` function and `MIN_TERMINAL_WIDTH` constant |
| `src/ui/logger.ts` | Modify | Thread `getTerminalWidth()` into `banner()` and `table()` calls; no API signature changes |
| `src/ui/components/banner.ts` | Modify | Accept optional `terminalWidth` param; constrain boxen width; plain-text fallback below 60 cols |
| `src/ui/components/table.ts` | Modify | Accept optional `terminalWidth` param; auto-distribute column widths; vertical fallback below 60 cols |
| `src/ui/components/diff-view.ts` | Modify | Accept optional `terminalWidth` param; clamp context line length to fit width |
| `src/ui/index.ts` | Modify | Re-export `getTerminalWidth` and `MIN_TERMINAL_WIDTH` from `terminal.ts` |
| `src/commands/init.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger`; pass version to `banner()` |
| `src/commands/update.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger`; pass version to `banner()` |
| `src/commands/review.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/commands/compress.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/commands/trace.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/commands/memory-ingest.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/commands/memory-export.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/commands/memory-query.ts` | Modify | Change import from `@/utils/logger` → `@/ui/logger` |
| `src/utils/logger.ts` | Delete | Removed after all 8 commands migrated |
| `test/unit/ui-logger.test.ts` | Create | TTY/non-TTY tests for every logger method |
| `test/unit/ui-terminal.test.ts` | Create | Tests for `getTerminalWidth()` with mocked `process.stdout.columns` |
| `test/unit/ui-responsive.test.ts` | Create | Responsive tests for table, banner, diff-view at 40/60/80/120 cols |

## Interfaces / Contracts

### `src/ui/terminal.ts`

```typescript
/** Minimum supported terminal width for box-drawing components. */
export const MIN_TERMINAL_WIDTH = 60;

/** Default width when `process.stdout.columns` is undefined (piped/redirected). */
export const DEFAULT_TERMINAL_WIDTH = 80;

/**
 * Return the current terminal width, floored at DEFAULT when undefined.
 * Does NOT clamp to MIN — callers decide whether to use fallback rendering.
 */
export function getTerminalWidth(): number;
```

### Updated `renderBanner` signature

```typescript
export function renderBanner(version: string, terminalWidth?: number): string;
```

When `terminalWidth < MIN_TERMINAL_WIDTH` → returns plain-text string (no box-drawing).

### Updated `renderTable` signature

```typescript
export interface TableOptions {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  title?: string;
  highlightRow?: number;
  terminalWidth?: number;  // NEW — defaults to getTerminalWidth()
}

export function renderTable(options: TableOptions): string;
```

When `terminalWidth < MIN_TERMINAL_WIDTH` → outputs vertical key-value list.
When `terminalWidth ≥ MIN_TERMINAL_WIDTH` → auto-distributes column widths proportionally within available space (total width = `terminalWidth - borderOverhead`).

### Updated `renderDiffView` signature

```typescript
export interface DiffViewOptions {
  before: string;
  after: string;
  matchStart: number;
  matchEnd: number;
  contextChars?: number;
  label?: string;
  severity?: 'critical' | 'warning';
  terminalWidth?: number;  // NEW — defaults to getTerminalWidth()
}

export function renderDiffView(options: DiffViewOptions): string;
```

Context lines are truncated to `terminalWidth - panelBorderOverhead` characters, centering the match region in the visible window.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getTerminalWidth()` returns columns or default | Mock `process.stdout.columns` to `undefined`, `80`, `40` |
| Unit | Logger TTY path — all 12 methods produce themed output | Set `isTTY = true`, spy `console.log`, assert ANSI codes + icons present |
| Unit | Logger non-TTY path — all 12 methods produce plain prefixes | Set `isTTY = false`, spy `console.log`, assert `[OK]`/`[INFO]`/etc. and no ANSI |
| Unit | `NO_COLOR` support | `jest.resetModules()` with `process.env.NO_COLOR = '1'`, assert `chalk.level === 0` |
| Unit | `renderTable` at 120/80/60 cols | Pass explicit `terminalWidth`, assert no line exceeds that width |
| Unit | `renderTable` at 40 cols (below min) | Assert output is vertical key-value format, no box-drawing chars |
| Unit | `renderBanner` at 80 cols | Assert boxen output fits within 80 chars |
| Unit | `renderBanner` at 50 cols (below min) | Assert plain-text output, no box-drawing chars |
| Unit | `renderDiffView` at 80 cols with 200-char context | Assert no output line exceeds 80 chars, match region visible |
| Unit | `renderDiffView` with undefined columns | Assert uses 80-col default |

**Mocking approach**: All tests mock `process.stdout.columns` and `process.stdout.isTTY` via direct property assignment (writable in Node). `NO_COLOR` tests use `jest.resetModules()` to force module re-evaluation. No real TTY detection.

## Migration / Rollout

### Migration order (by risk, lowest first)

| Step | Command | Risk | Notes |
|------|---------|------|-------|
| 1 | `review.ts` | Low | Simple: 2 logger calls (`error`, `success`) |
| 2 | `compress.ts` | Low | Simple: `error`, `success`, `info` calls |
| 3 | `trace.ts` | Low | Small file, few logger calls |
| 4 | `memory-export.ts` | Low | Few logger calls |
| 5 | `memory-query.ts` | Low | Few logger calls |
| 6 | `memory-ingest.ts` | Low | Few logger calls |
| 7 | `update.ts` | Med | Uses `banner()` — needs version arg |
| 8 | `init.ts` | Med | Uses `banner()` — needs version arg; most logger calls |
| 9 | Delete `src/utils/logger.ts` | — | After steps 1–8 pass tests |

**Verification per step**: After each import change, run `npm run test` and `npm run lint`. Grep for remaining `@/utils/logger` imports to confirm count decreases.

### Responsive changes (parallel track)

1. Create `src/ui/terminal.ts`
2. Update `renderBanner` → add `terminalWidth` param + fallback
3. Update `renderTable` → add `terminalWidth` param + proportional widths + vertical fallback
4. Update `renderDiffView` → add `terminalWidth` param + line clamping
5. Update `src/ui/logger.ts` to pass `getTerminalWidth()` into component calls
6. Add responsive test suite

## Open Questions

- [x] `changelog.ts` already imports from `@/ui` — no migration needed (confirmed in codebase audit)
- [ ] Should `renderProgress` also accept `terminalWidth`? Its `width` param already controls bar size; terminal width awareness is low priority since bars are short. Deferred unless spec changes.
