# Tasks: memory-ingest

## Group 1 — New command file

- [x] **T-01** Create `src/commands/memory-ingest.ts` with the `MemoryIngestOptions` interface and exported `runMemoryIngest(options: MemoryIngestOptions): Promise<void>` function stub.

- [x] **T-02** Implement **Prompt Generation Mode** in `runMemoryIngest`:
  - Resolve `openspec/changes/<change>/proposal.md` from `dir`; call `logger.error` + `process.exit(1)` if missing (FR-01, ER-01)
  - Resolve `.sdd/memory.db` from `dir`; call `logger.error` + `process.exit(1)` if missing (ER-02)
  - Open `MemoryDB`, call `getAllNodes()`, close the DB
  - Call `buildExtractionPrompt(proposalContent, existingNodes)` from `@/memory/ingestion`
  - Print the prompt to stdout with a separator line
  - Write the prompt to `.sdd/extraction-<change>.prompt.txt` using `fs.writeFile`
  - Print next-step instructions (tell user to send prompt to LLM and save JSON output)

- [x] **T-03** Implement **JSON Ingestion Mode** in `runMemoryIngest` (triggered when `options.from` is provided):
  - Resolve `.sdd/memory.db` from `dir`; fail if missing (ER-02)
  - Read and JSON-parse the file at `options.from`; catch parse errors → `logger.error` + `process.exit(1)` (ER-04)
  - Validate parsed object has `nodes` array and `edges` array; fail with descriptive message if not (ER-05)
  - If `options.dryRun === true`: print preview of nodes and edges that would be inserted, then `return` without writing

- [x] **T-04** Implement **DB write** in Ingestion Mode (non-dry-run path):
  - Start `ora` spinner: `'Ingesting into memory graph...'`
  - Open `MemoryDB(dbPath)`
  - Call `processExtractionResult(db, rawResult as ExtractionResult, options.change)`
  - Close the DB
  - Spinner succeed: `"Ingested <nodesCreated> nodes and <edgesCreated> edges for change '<change>'."`
  - Wrap in try/catch → spinner fail on error

## Group 2 — CLI registration

- [x] **T-05** Add `import { runMemoryIngest } from '@/commands/memory-ingest'` to `src/cli.ts`

- [x] **T-06** Register `memoryCmd.command('ingest')` in `src/cli.ts` with:
  - `.description('📥  Ingest an approved proposal into the memory graph')`
  - `.requiredOption('--change <name>', 'change name matching openspec/changes/<name>/')`
  - `.option('--dir <path>', 'target project directory', process.cwd())`
  - `.option('--from <path>', 'path to LLM extraction JSON file')`
  - `.option('--dry-run', 'validate and preview without writing to DB', false)`
  - `.action(...)` delegating to `runMemoryIngest`

## Group 3 — Tests

- [x] **T-07** In `test/unit/iatools.test.ts`, add `describe('memory ingest', ...)` block with the following test cases:

  - **T-07a** Prompt generation: mock `fs.pathExists` → true, `fs.readFile` → proposal markdown, `MemoryDB.getAllNodes` → [], assert `buildExtractionPrompt` is called and result is written to `.sdd/extraction-*.prompt.txt`
  - **T-07b** JSON ingestion: mock `fs.pathExists` → true, `fs.readFile` → valid JSON, assert `processExtractionResult` is called with correct args and counts are reported
  - **T-07c** Dry-run: same setup as T-07b but `dryRun: true`; assert `processExtractionResult` is NOT called
  - **T-07d** Missing proposal: mock `fs.pathExists(proposal)` → false; assert `process.exit(1)` is called
  - **T-07e** Missing database: mock `fs.pathExists(db)` → false; assert `process.exit(1)` is called
  - **T-07f** Invalid JSON: mock file content as `'not json'`; assert `process.exit(1)` is called

## Group 4 — Verify

- [x] **T-08** Run `npx tsc --noEmit` in `packages/iatools/` — zero errors expected
- [x] **T-09** Run `jest` in `packages/iatools/` — all tests pass
- [x] **T-10** Run `iatools memory --help` — `ingest` subcommand appears in output
- [x] **T-11** Smoke test: run `iatools memory ingest --change memory-ingest` in the repo root and verify the extraction prompt is printed to stdout
