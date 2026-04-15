# Design: OpenTUI Full-Screen Rewrite

## Technical Approach

Replace the line-by-line chalk/ora/inquirer/boxen/cli-table3 UI with a full-screen TUI built on `@opentui/core` imperative API. Commander.js stays as arg parser; each command's `.action()` creates a renderer, mounts a screen, and destroys on exit. A non-TTY guard bypasses the renderer entirely for piped output.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Directory | New `src/tui/` parallel to `src/ui/` during migration; `src/ui/` deleted at end | In-place edit `src/ui/` | Clean cut avoids half-chalk/half-opentui states; commands switch one at a time |
| Renderer ownership | Each command creates/destroys its own renderer | Singleton in `cli.ts` | Commands are independent processes; no shared lifecycle needed |
| Non-TTY strategy | `isTTY()` guard at command entry returns plain-text renderer interface | Separate command implementations | Single interface (`TuiContext`) with two backends keeps commands DRY |
| Theme representation | Frozen `THEME` const with hex strings + icon literals | Class / runtime config | Spec TUI-02.6 mandates no runtime deps; a const is tree-shakeable |
| Testing | `createTestRenderer` + `captureCharFrame()` snapshots | DOM-like queries | Matches OpenTUI's built-in test tooling; char-frame is the canonical output |

## Module Structure

```
src/tui/
├── index.ts              # barrel re-exports
├── theme.ts              # THEME constant (colors, icons, borders)
├── context.ts            # TuiContext interface + createTuiContext()
├── renderer.ts           # createAppRenderer() lifecycle wrapper
├── components/
│   ├── banner.ts         # ASCIIFontRenderable + BoxRenderable
│   ├── table.ts          # BoxRenderable grid with ScrollBoxRenderable
│   ├── progress.ts       # BoxRenderable bar with fill ratio
│   ├── diff-view.ts      # Colored TextRenderables in BoxRenderable
│   └── log-panel.ts      # ScrollBoxRenderable of TextRenderable lines
├── screens/
│   ├── init-wizard.ts    # Multi-step SelectRenderable wizard
│   ├── query-results.ts  # SelectRenderable list + detail pane
│   ├── sanitize-review.ts# One-at-a-time candidate review
│   └── static-output.ts  # Non-interactive content + "press key to exit"
└── fallback.ts           # Plain-text implementations for non-TTY
```

## Data Flow

```
Commander.js parses args
        │
        ▼
command .action(opts)
        │
   ┌────┴────┐
   │ isTTY?  │
   └──┬───┬──┘
    yes│   │no
       ▼   ▼
  createAppRenderer()   createFallbackContext()
       │                      │
       ▼                      ▼
  mount screen()         console.log output
       │                      │
  keyboard loop          return / exit
       │
  renderer.destroy()
       │
  process.exit(0)
```

## Interfaces / Contracts

```typescript
interface TuiTheme {
  colors: Record<'primary'|'success'|'warning'|'error'|'muted'|'accent'|'highlight', string>;
  icons: Record<'success'|'error'|'arrow'|'warning'|'bullet'|'pointer'|'star'|'brain'|'shield'|'trace', string>;
  border: { style: 'rounded' };
}

interface TuiContext {
  banner(version: string): void;
  table(opts: TableOpts): void;
  progress(opts: ProgressOpts): void;
  diffView(opts: DiffViewOpts): void;
  log: { info(m: string): void; success(m: string): void; warn(m: string): void; error(m: string): void };
  destroy(): Promise<void>;
}

/** Factory: returns OpenTUI context or fallback based on TTY */
function createTuiContext(opts?: { interactive?: boolean }): Promise<TuiContext>;
```

## Screen Layouts (ASCII)

### Init Wizard (TUI-08)
```
╭─ iatools ──────────────────────────╮
│  ██ iatools  v2.0  · SDD           │ ← banner
╰────────────────────────────────────╯
  Step 1 of 3 — Select IDE(s)

  ● VS Code / Copilot
    Cursor
    Windsurf
    All

╭────────────────────────────────────╮
│ [↑↓] Navigate [Space] Select      │
│ [Enter] Confirm  [ESC] Exit       │
╰────────────────────────────────────╯
```

### Query Results (TUI-09)
```
╭─ Query: "architecture" ───────────╮
│ Score │ Type   │ Title       │ Src │
│ 0.95  │ spec   │ Arch docs   │ … │  ← SelectRenderable rows
│ 0.88  │ design │ Memory sys  │ … │
│ ▶ 0.81│ task   │ Init flow   │ … │  ← focused row
╰────────────────────────────────────╯
[↑↓] Navigate [Enter] Details [Space] Select [e] Export [ESC] Exit
```

### Sanitize Review (TUI-10)
```
  Candidate 3 of 5             [WARNING]
╭─ API Key ──────────────────────────╮
│  Before: ...config.apiKey = █████  │  ← error color on match
│  After:  ...config.apiKey = [REDACTED] │
╰────────────────────────────────────╯
[a/Enter] Approve  [r] Reject  [ESC] Abort
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/tui/theme.ts` | Create | Hex color map, icon literals, border config |
| `src/tui/context.ts` | Create | `TuiContext` interface + factory |
| `src/tui/renderer.ts` | Create | `createAppRenderer()` wrapping lifecycle, crash recovery, SIGINT |
| `src/tui/fallback.ts` | Create | Plain-text `TuiContext` for non-TTY |
| `src/tui/index.ts` | Create | Barrel exports |
| `src/tui/components/banner.ts` | Create | ASCIIFontRenderable + BoxRenderable |
| `src/tui/components/table.ts` | Create | BoxRenderable grid + ScrollBoxRenderable |
| `src/tui/components/progress.ts` | Create | Fill-ratio BoxRenderable bar |
| `src/tui/components/diff-view.ts` | Create | Line-colored TextRenderables in bordered box |
| `src/tui/components/log-panel.ts` | Create | Scrollable log with auto-scroll |
| `src/tui/screens/init-wizard.ts` | Create | Multi-step wizard with SelectRenderable |
| `src/tui/screens/query-results.ts` | Create | Interactive list + detail pane |
| `src/tui/screens/sanitize-review.ts` | Create | One-at-a-time candidate review |
| `src/tui/screens/static-output.ts` | Create | Non-interactive screen with "press key to exit" |
| `src/commands/init.ts` | Modify | Replace inquirer/ora calls with `TuiContext` |
| `src/commands/memory-query.ts` | Modify | Replace inquirer with query-results screen |
| `src/commands/memory-ingest.ts` | Modify | Replace ora/console with TUI progress + log |
| `src/commands/memory-export.ts` | Modify | Use static-output screen |
| `src/commands/review.ts` | Modify | Use static-output screen |
| `src/commands/trace.ts` | Modify | Use static-output screen |
| `src/commands/compress.ts` | Modify | Use static-output screen + progress |
| `src/commands/changelog.ts` | Modify | Use static-output screen |
| `src/commands/update.ts` | Modify | Use static-output screen + progress |
| `src/cli.ts` | Modify | Add Bun runtime check at startup |
| `package.json` | Modify | Add `@opentui/core`; remove chalk, ora, inquirer, boxen, cli-table3, figures + their `@types/*` |
| `src/ui/` (all files) | Delete | Entire legacy UI directory removed after migration |
| `test/unit/tui/` | Create | Snapshot + interaction tests for all components/screens |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Each component (banner, table, progress, diff-view, log-panel) | `createTestRenderer` → `captureCharFrame()` snapshot |
| Unit | Theme constant | Assert hex values, icon strings match spec |
| Integration | Each screen (init-wizard, query-results, sanitize-review) | Test renderer + simulated keypress sequences |
| Integration | Non-TTY fallback | Mock `process.stdout.isTTY = false`, assert console output |
| Integration | Renderer lifecycle | Verify destroy on ESC, Ctrl+C, uncaught exception |

## Migration Strategy

**Phase 1 — Foundation** (no command changes):
Create `src/tui/theme.ts`, `context.ts`, `renderer.ts`, `fallback.ts`, `index.ts`. All commands still use `src/ui/`.

**Phase 2 — Components** (still no command changes):
Build banner, table, progress, diff-view, log-panel in `src/tui/components/`. Unit-test each with snapshots.

**Phase 3 — Non-interactive commands first** (low risk):
Migrate `changelog`, `review`, `trace`, `compress`, `update`, `memory-export` to `static-output` screen. These have no user input — easiest to validate.

**Phase 4 — Interactive screens** (high value):
Build init-wizard, query-results, sanitize-review screens. Migrate `init`, `memory-query`, and the sanitize flow in `memory-ingest`.

**Phase 5 — Cleanup**:
Delete `src/ui/` entirely. Remove chalk, ora, inquirer, boxen, cli-table3, figures from `package.json`. Add Bun runtime guard in `cli.ts`. Run full test suite.

## Open Questions

- [ ] Does `@opentui/core` bundle a `createTestRenderer` or is it a separate `@opentui/testing` package?
- [ ] Should the Bun runtime check be a hard exit or a degraded-mode warning for Node.js users during transition?
