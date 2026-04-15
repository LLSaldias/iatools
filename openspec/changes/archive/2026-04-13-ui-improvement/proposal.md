# Proposal: UI Improvement — Logger Unification & Responsive Components

## Intent

The iatools CLI has a dual-logger problem: `src/utils/logger.ts` (old, used everywhere) and `src/ui/logger.ts` (new, TTY-aware, theme-integrated, used nowhere). All 9 commands use the old logger inconsistently, bypassing the theme system. Components also ignore terminal width, causing table overflow on narrow terminals.

## Scope

### In Scope
- **Logger unification**: Migrate all commands from `utils/logger` to `ui/logger`, then remove the old logger
- **Terminal width responsiveness**: Adapt table, banner, and diff-view components to `process.stdout.columns`
- **UI test coverage**: Add unit tests for logger and responsive components (≥80% coverage target)

### Out of Scope
- Tree view component (deferred — no current consumer)
- Markdown rendering in terminal (deferred — low priority)
- Progress bar for long operations (deferred — only spinners needed currently)
- New screen types beyond existing query-results and sanitize-review

## Approach

1. **Audit**: Map every import of `utils/logger` across all commands
2. **Adapt**: Ensure `ui/logger` covers all log-level methods currently used by commands
3. **Migrate**: Replace imports command-by-command, updating call signatures as needed
4. **Responsive**: Add width detection to `ui/components/table.ts`, `ui/components/banner.ts`, and `ui/components/diff-view.ts` with truncation/wrapping fallbacks
5. **Remove**: Delete `utils/logger.ts` and its barrel export once all references are gone
6. **Test**: Add unit tests mocking stdout for logger output and column-width scenarios

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/iatools/src/ui/logger.ts` | Modified | Extend API to cover all legacy log methods |
| `packages/iatools/src/utils/logger.ts` | Removed | Phase out after full migration |
| `packages/iatools/src/ui/theme.ts` | Read-only | Theme tokens consumed by migrated logger calls |
| `packages/iatools/src/ui/components/` | Modified | Add terminal-width responsiveness |
| `packages/iatools/src/commands/` | Modified | All 9 command handlers switch logger import |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Logger API mismatch breaks command output | Med | Audit all call sites before migration; run full test suite per command |
| Responsive truncation hides critical info | Low | Set minimum width threshold (60 cols); fall back to raw output below it |
| Test mocking of stdout causes flaky tests | Low | Use deterministic width fixtures, avoid real TTY detection in tests |

## Rollback Plan

Revert the migration commit(s). The old `utils/logger.ts` remains in git history. No database or config changes involved — purely source code.

## Dependencies

- None. All changes are internal to `packages/iatools/`.

## Success Criteria

- [ ] Zero imports of `utils/logger` remain in `src/commands/`
- [ ] `utils/logger.ts` is deleted
- [ ] All commands produce themed, TTY-aware output via `ui/logger`
- [ ] Tables and banners adapt to terminals ≥60 columns wide
- [ ] UI module test coverage ≥80%
- [ ] `npm run test` and `npm run lint` pass clean
