# Design: memory-ingest-batch

## Overview

Minimal extension to the existing `memory-ingest` command. No new files are created. The `--all` flag is added to `MemoryIngestOptions`, a new `runBatchMode` function is added to `memory-ingest.ts`, and the dispatcher in `runMemoryIngest` is updated with mutual-exclusivity logic.

`runPromptMode` is reused as-is for each change in the batch. The only behavioural change is that per-change errors are caught and reported rather than calling `process.exit(1)`.

---

## Architecture

```
iatools memory ingest --all
  │
  └─ runMemoryIngest(options: { all: true })
        │
        ├─ Guard: --all + --change → error exit
        ├─ Guard: .sdd/memory.db missing → error exit
        │
        └─ runBatchMode(options)
              ├─ fs.readdir(openspec/changes/)
              ├─ filter: is directory & name !== 'archive'
              ├─ for each candidate:
              │     pathExists(proposal.md)?
              │       No  → results.push({ name, status: 'skipped' })
              │       Yes → try runPromptMode({ ...options, change: name })
              │               catch → results.push({ name, status: 'error', reason })
              │               ok  → results.push({ name, status: 'done' })
              └─ printBatchSummary(results)
```

---

## File Changes

### Modified: `src/commands/memory-ingest.ts`

#### 1. `MemoryIngestOptions` — add `all` field
```typescript
export interface MemoryIngestOptions {
  change: string;
  dir: string;
  from?: string;
  dryRun: boolean;
  all: boolean;       // new
}
```

#### 2. `runMemoryIngest` — update dispatcher
```typescript
export async function runMemoryIngest(options: MemoryIngestOptions): Promise<void> {
  if (options.all && options.change) {
    logger.error('--all and --change are mutually exclusive. Use one or the other.');
    process.exit(1);
  }
  if (options.all) {
    await runBatchMode(options);
  } else if (options.from) {
    await runIngestionMode(options);
  } else {
    await runPromptMode(options);
  }
}
```

#### 3. New `runBatchMode` function
- Reads `openspec/changes/` entries with `fs.readdir(..., { withFileTypes: true })`
- Filters: `entry.isDirectory() && entry.name !== 'archive'`
- Checks `pathExists(proposal.md)` for each candidate
- Calls `runPromptMode({ ...options, change: name })` inside a try/catch
- Collects results: `{ name: string; status: 'done' | 'skipped' | 'error'; reason?: string }[]`
- Calls `printBatchSummary(results)` when done

#### 4. New `printBatchSummary` helper
- Prints a table-style summary:
  ```
  Batch complete: 3 processed, 1 skipped, 0 errors
  ────────────────────────────────────────
    ✓  clean-init
    ✓  focus-on-memory
    ⚠  no-proposal         (no proposal.md)
    ✓  simplify-init
  ```

### Modified: `src/cli.ts`

Add `--all` option to the `memory ingest` command registration:
```typescript
.option('--all', 'generate prompts for all changes in openspec/changes/', false)
```
Pass it through in the action:
```typescript
all: options.all,
```

### Modified: `test/unit/iatools.test.ts`

Add `describe('memory ingest --all', ...)` block inside the existing `memory ingest` describe covering:
- **T-batch-a**: happy path — two changes with proposals → both processed
- **T-batch-b**: one change missing proposal → skipped, other processed
- **T-batch-c**: `archive/` directory → excluded
- **T-batch-d**: `--all` + `--change` together → `process.exit(1)`
- **T-batch-e**: missing DB → `process.exit(1)` before scan
- **T-batch-f**: one change throws → batch continues, error reported

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| No new file | The function belongs logically with the other ingest modes |
| Reuse `runPromptMode` | Avoids duplication and keeps single-change behaviour identical |
| Catch per-change errors instead of `process.exit` | Batch must be resilient; one bad change shouldn't block others |
| Sequential processing | Simpler, avoids concurrent DB open on `getAllNodes()` |
| Skip `.gitkeep` and files | `entry.isDirectory()` guard handles non-directory entries |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `runPromptMode` calls `process.exit(1)` on missing DB | Medium | DB check moved to `runBatchMode` entry guard before the loop; `runPromptMode` DB check becomes unreachable in batch mode |
| `runPromptMode` still calls `process.exit(1)` for missing proposal in batch | Low | Per-change guard checks `pathExists(proposal.md)` before calling `runPromptMode`, so the missing-proposal branch is never reached |
| `MemoryIngestOptions.change` is `string` (non-optional) — conflicts with `--all` mode where no `--change` is given | Low | `change` defaults to `''` when `--all` is used; `runBatchMode` never reads `options.change` |
