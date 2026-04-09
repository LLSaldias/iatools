# Tasks: memory-system

## Phase 1: Core Types & Database Module

- [x] Add `better-sqlite3` and `nanoid@3` as production dependencies in `packages/iatools/package.json`.
- [x] Add `@types/better-sqlite3` as a dev dependency in `packages/iatools/package.json`.
- [x] Create `src/memory/types.ts` with `NodeLabel`, `NODE_PREFIX`, `MemoryNode`, `MemoryEdge`, `ExtractionResult`, `MemoryContext`, and `MemoryExport` interfaces.
- [x] Create `src/memory/database.ts` with the `MemoryDB` class:
  - Constructor: open DB at path, set `PRAGMA journal_mode=WAL`, `PRAGMA foreign_keys=ON`, run idempotent schema (`CREATE TABLE IF NOT EXISTS` for `nodes`, `edges`, FTS5 virtual table, triggers, indexes).
  - Methods: `insertNode()`, `insertEdge()`, `nodeExists()`, `findByFTS()`, `getNeighbors()`, `getAllNodes()`, `getAllEdges()`, `getEdgesForNode()`, `transaction()`, `close()`.
- [x] Create `src/memory/index.ts` barrel export re-exporting `database.ts`, `types.ts`.
- [ ] Write unit tests for `MemoryDB` using `:memory:` database — test schema creation, insert/query nodes, insert/query edges, FTS5 search, neighbor expansion, and foreign key cascade.

## Phase 2: Retrieval Module

- [x] Create `src/memory/retrieval.ts` with `retrieveContext(db, keywords, maxNodes?)`:
  - Step 1: Join keywords into FTS5 query, call `db.findByFTS()` (limit 10).
  - Step 2: For each result, call `db.getNeighbors()`, collect and deduplicate.
  - Step 3: Cap at `maxNodes` (default 20), sort by FTS rank.
  - Step 4: Format as Markdown context block (`## Memory Context (N nodes retrieved)`).
  - Return `MemoryContext` with `nodes`, `edges`, `formatted`.
- [x] Update `src/memory/index.ts` to re-export `retrieval.ts`.
- [ ] Write unit tests: verify FTS matching, neighbor expansion, deduplication, cap enforcement, and Markdown formatting.

## Phase 3: Ingestion Module

- [x] Create `src/memory/ingestion.ts` with two exported functions:
  - `buildExtractionPrompt(proposalContent, existingNodes)`: returns a system prompt string asking the LLM to extract max 3 nodes and 5 edges in the `ExtractionResult` JSON schema.
  - `processExtractionResult(db, raw, changeName)`: validates node count ≤ 3, edge count ≤ 5, generates `<prefix>_<nanoid(7)>` IDs, checks `db.nodeExists()` for all edge targets, inserts within `db.transaction()`. Returns `{ nodesCreated, edgesCreated }`.
- [x] Update `src/memory/index.ts` to re-export `ingestion.ts`.
- [ ] Write unit tests: verify prompt generation includes existing nodes, validation rejects excess nodes/edges, hallucinated edge IDs are skipped, valid nodes+edges are inserted transactionally.

## Phase 4: Scaffolding Integration

- [x] Add `scaffoldMemory(projectRoot, overwrite)` to `src/utils/scaffolders.ts`:
  - `ensureDir('.sdd/')`.
  - If `memory.db` exists and `!overwrite` → skip with log.
  - Else → `new MemoryDB(dbPath)` then `db.close()`.
  - Read/create `.gitignore` → append `.sdd/memory.db` if not present.
  - Write `{}` to `.sdd/memory.json` if not exists.
- [x] Modify `performScaffolding()` in `src/commands/init.ts` to call `scaffoldMemory()` after `scaffoldCopilotConfig()`.
- [x] Wrap the entire `scaffoldMemory()` call in try/catch so native build failures don't block init.

## Phase 5: CLI `memory export` Command

- [x] Create `src/commands/memory-export.ts` with `runMemoryExport(projectRoot)`:
  - Open `MemoryDB` at `<projectRoot>/.sdd/memory.db` (error if missing).
  - Read `getAllNodes()` + `getAllEdges()`.
  - Write `MemoryExport` JSON to `<projectRoot>/.sdd/memory.json`.
  - Log node/edge counts with `ora` spinner.
- [x] Register the command in `src/cli.ts`: `iatools memory export` subcommand with `--dir` option.

## Phase 6: Skill Update (`sdd-continue`)

- [x] Update `templates/skills/sdd-continue/SKILL.md`:
  - Add step 2b: "Load Memory Context" — read `.sdd/memory.db`, extract keywords, run retrieval, inject formatted context.
  - Add step 4b: "If proposal → Ingest into Memory" — extract nodes, validate edges, insert, log summary.
  - Document the JSON schema the LLM must output for ingestion.

## Phase 7: Integration Testing & Verification

- [ ] End-to-end test: run `iatools init` → verify `.sdd/memory.db` exists with correct schema and `.gitignore` entry.
- [ ] End-to-end test: manually insert test nodes → run `retrieveContext()` → verify formatted output.
- [ ] End-to-end test: run `iatools memory export` → verify `.sdd/memory.json` contains expected data.
- [ ] Verify `sdd-continue` skill reads memory context without errors when DB is empty.
- [ ] Verify graceful degradation when `.sdd/memory.db` is missing or corrupted.
