# Proposal: OpenTUI Full-Screen Rewrite

## Intent

The iatools CLI renders output via line-by-line `console.log` calls using chalk, ora, inquirer, boxen, and cli-table3. This limits interactivity, prevents scroll-back control, and makes complex workflows (sanitize review, query results) feel disjointed. Rewriting the entire UI layer to **@opentui/core** delivers a native full-screen TUI with keyboard navigation, focus management, and Flexbox layout — all on the Bun runtime iatools already targets.

## Scope

### In Scope
- Replace all 10 `src/ui/` files with OpenTUI imperative-API renderables
- Migrate 9 commands to render via OpenTUI screens instead of console output
- Add `@opentui/core` dependency; remove `chalk`, `ora`, `inquirer`, `boxen`, `cli-table3`, `figures`
- Verify `better-sqlite3` builds under Bun
- Update unit tests for new UI layer (maintain ≥ 80% coverage)

### Out of Scope
- React or Solid reconciler — imperative API only
- New commands or features beyond UI parity
- Replacing Commander.js for argument parsing
- Changes to memory, safety, or pipeline internals

## Approach

1. **Foundation** — Create OpenTUI app shell, theme constants, and base screen layout
2. **Components** — Rewrite `banner`, `table`, `progress`, `diff-view`, `logger` as OpenTUI renderables
3. **Screens** — Rewrite `query-results` and `sanitize-review` as full-screen interactive screens with `SelectRenderable` and keyboard nav
4. **Commands** — Wire each of the 9 commands to render through OpenTUI screens
5. **Cleanup** — Remove legacy deps, verify Bun build, update tests

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/ui/theme.ts` | Rewrite | chalk colors → OpenTUI color constants |
| `src/ui/logger.ts` | Rewrite | print-based → OpenTUI TextRenderable |
| `src/ui/terminal.ts` | Remove | OpenTUI handles terminal natively |
| `src/ui/components/banner.ts` | Rewrite | boxen → ASCIIFontRenderable |
| `src/ui/components/table.ts` | Rewrite | cli-table3 → BoxRenderable grid |
| `src/ui/components/progress.ts` | Rewrite | manual bar → OpenTUI renderable |
| `src/ui/components/diff-view.ts` | Rewrite | chalk diff → styled TextRenderable |
| `src/ui/screens/query-results.ts` | Rewrite | inquirer checkbox → SelectRenderable |
| `src/ui/screens/sanitize-review.ts` | Rewrite | inquirer list → TUI review screen |
| `src/ui/index.ts` | Modified | Re-export new modules |
| `src/commands/*.ts` (9 files) | Modified | Swap UI calls to OpenTUI screens |
| `package.json` | Modified | Add @opentui/core, remove 6 legacy deps |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `better-sqlite3` native module fails under Bun | Med | Test build early in foundation phase; fallback to `bun:sqlite` if needed |
| OpenTUI API gaps for specific UI patterns | Low | Imperative API is flexible; compose primitives to fill gaps |
| Test mocking for full-screen TUI | Med | Use OpenTUI's headless/test mode; mock at screen boundary |

## Rollback Plan

Revert the feature branch. Legacy UI files exist in git history unchanged. No database or spec migrations involved.

## Dependencies

- `@opentui/core` (Bun-native, Zig bindings)

## Success Criteria

- [ ] All 9 commands render through OpenTUI screens
- [ ] Zero legacy UI dependencies remain in `package.json`
- [ ] `npm run test` passes with ≥ 80% coverage on `src/ui/`
- [ ] Interactive commands (init, memory query, memory ingest) support full keyboard navigation
- [ ] `bunx @lsframework/iatools` launches without Node.js
