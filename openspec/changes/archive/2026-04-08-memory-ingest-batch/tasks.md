# Tasks: memory-ingest-batch

## Group 1 — Extend `MemoryIngestOptions`

- [x] **T-01** Add `all: boolean` to the `MemoryIngestOptions` interface in `src/commands/memory-ingest.ts`

## Group 2 — Update dispatcher

- [x] **T-02** Update `runMemoryIngest` in `src/commands/memory-ingest.ts` to:
  - Check `options.all && options.change` → `logger.error` + `process.exit(1)` with message: `"--all and --change are mutually exclusive. Use one or the other."`
  - If `options.all` → call `await runBatchMode(options)`
  - Existing `options.from` and fallback branches remain unchanged

## Group 3 — Implement `runBatchMode`

- [x] **T-03** Add `runBatchMode(options: MemoryIngestOptions): Promise<void>` function to `src/commands/memory-ingest.ts`:
  - Resolve `dbPath = path.join(options.dir, '.sdd', 'memory.db')`; exit with error if missing (FR-04)
  - Read `openspec/changes/` with `fs.readdir(..., { withFileTypes: true })`
  - Filter: `entry.isDirectory() && entry.name !== 'archive'`
  - If no candidates after filter: print `"No changes with a proposal found in openspec/changes/."` and return (FR-05)

- [x] **T-04** Inside `runBatchMode`, iterate candidates and for each:
  - Check `pathExists(openspec/changes/<name>/proposal.md)`:
    - No → push `{ name, status: 'skipped', reason: 'no proposal.md' }`
    - Yes → try `await runPromptMode({ ...options, change: name })`, catch error → push `{ name, status: 'error', reason: msg }`; on success → push `{ name, status: 'done' }`

- [x] **T-05** Add `printBatchSummary` helper function that:
  - Prints `"Batch complete: N processed, N skipped, N errors"` header
  - Prints a per-change line: `✓ <name>`, `⚠ <name>   (no proposal.md)`, or `✗ <name>   (<reason>)`
  - Calls it at the end of `runBatchMode`

## Group 4 — CLI registration

- [x] **T-06** Add `.option('--all', 'generate prompts for all changes in openspec/changes/', false)` to the `memory ingest` command in `src/cli.ts`

- [x] **T-07** Pass `all: options.all` in the action's `runMemoryIngest({...})` call in `src/cli.ts`. Also update the action options type to include `all: boolean` and set `change` to default `''` when `--all` is used (so `--change` remains optional).

## Group 5 — Tests

- [x] **T-08** In `test/unit/iatools.test.ts`, inside the existing `describe('memory ingest')` block, add `describe('--all flag', ...)` with:

  - **T-08a** Happy path: two dirs with `proposal.md` → `runPromptMode` called twice, summary shows both `done`
  - **T-08b** One dir missing proposal → that change skipped, other processed
  - **T-08c** `archive/` directory present → excluded from processing
  - **T-08d** `--all` + `--change` → `process.exit(1)` called before scan
  - **T-08e** Missing DB → `process.exit(1)` before scan loop
  - **T-08f** One change throws → batch continues, error captured in results

## Group 6 — Verify

- [x] **T-09** Run `npx tsc --noEmit` in `packages/iatools/` — zero errors
- [x] **T-10** Run `jest` in `packages/iatools/` — all tests pass
- [x] **T-11** Run `iatools memory ingest --all --dir .` in the repo root and confirm prompts are generated for `clean-init`, `focus-on-memory`, `memory-ingest`, `simplify-initialization`
