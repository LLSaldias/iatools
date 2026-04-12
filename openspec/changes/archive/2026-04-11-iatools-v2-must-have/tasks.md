# Tasks: iatools v2.0 — Must-Have Features

**Change**: iatools-v2-must-have  
**Date**: 2026-04-11

---

## Phase 0: Foundation

- [x] T0.1 — **Restructure src/ into layered directories** — Create `ui/`, `pipeline/`, `safety/` dirs. Move existing files. Update all import paths. Verify `tsc && jest` pass.
- [x] T0.2 — **Add premium terminal dependencies** — chalk, boxen, cli-table3, figures, ora. (Ink/React approach replaced with chalk/boxen stack)
- [x] T0.3 — **Create theme.ts** — Color palette, border styles, spacing tokens. Export typed theme object.
- [x] T0.4 — **Logger shim** — Refactor `logger.ts` to detect TTY vs CI. Ink path for interactive, chalk path for piped. Same API surface.

## Phase 1: Safety Layer (leaf — no internal deps)

- [x] T1.1 — **patterns.ts** — Define `PatternRule` interface. Implement 9 built-in patterns (aws_key, jwt, generic_key, private_key, connection_str, email, ipv4, arn, aws_secret). Export `BUILTIN_PATTERNS`.
- [x] T1.2 — **scanner.ts** — `scan(text, config?) → RedactionCandidate[]`. Load `.sdd/sanitize.yaml` for custom patterns + ignore list. Sort by severity.
- [x] T1.3 — **redactor.ts** — `apply(text, approvedCandidates) → string`. Replace matched spans with `[REDACTED:TYPE]` labels.
- [x] T1.4 — **audit.ts** — `log(decisions) → void`. Append to `.sdd/sanitize-audit.jsonl`. SHA-256 hash of match, never cleartext.
- [x] T1.5 — **Safety layer tests** — Unit tests for all patterns (true positives, false negatives), scanner config loading, redactor application, audit log format. ≥80% coverage.

## Phase 2: Memory Layer (depends on Safety)

- [x] T2.1 — **DB migration** — Add `vectors` table to schema. Migration logic in `database.ts` for existing DBs. Test: open v1 DB → v2 migration → existing data intact.
- [x] T2.2 — **provider.ts interface** — `EmbeddingProvider` interface: `embed(text)`, `embedBatch(texts)`, `model`, `dimensions`.
- [x] T2.3 — **api-provider.ts** — OpenAI `text-embedding-3-small` and Vertex `text-embedding-gecko` support. Read API key from env. Batch support.
- [x] T2.4 — **local-provider.ts** — ONNX `all-MiniLM-L6-v2` with lazy `require('onnxruntime-node')`. Download model on first use to `.sdd/models/`.
- [x] T2.5 — **fallback.ts** — Provider chain: API → ONNX → null. One-time warning when degrading. Export `getProvider(): EmbeddingProvider | null`.
- [x] T2.6 — **vector-store.ts** — `store(nodeId, embedding)`, `search(query, topK) → RankedNode[]`. Cosine similarity over all vectors in DB.
- [x] T2.7 — **Hybrid retrieval + RRF** — Enhance `retrieval.ts`: run FTS5 + vector + graph in parallel. Fuse via RRF. Return `ScoredNode[]`.
- [x] T2.8 — **Wire sanitization into ingestion** — `ingestion.ts` calls `scanner.scan()` → review → `redactor.apply()` before persist. Embed after redaction.
- [x] T2.9 — **Memory layer tests** — Provider chain fallback, RRF ranking, vector store cosine accuracy, migration, sanitization ordering. ≥80% coverage.

## Phase 3: Pipeline Layer (depends on Safety + Memory)

- [x] T3.1 — **caveman/profiles.ts** — Define `.cave` YAML schemas per phase (proposal, specs, design, tasks). Validation with typed interfaces.
- [x] T3.2 — **caveman/preservers.ts** — Passthrough rules: code blocks, URLs, file paths, commands detected and preserved verbatim during compression.
- [x] T3.3 — **caveman/compressor.ts** — `compress(markdown, phase) → CaveArtifact`. Parse `.md` structure, extract key-value pairs, emit YAML. Add `_v`, `_phase`, `_change`, `_parent`, `_ts` headers.
- [x] T3.4 — **caveman/decompressor.ts** — `decompress(cave, phase) → string`. Per-phase templates render `.cave` back to readable `.md`.
- [x] T3.5 — **traceability/metadata.ts** — `PhaseMetadata` type: `created_by`, `created_at`, `approved_by`, `approved_at`, `token_count`. Stamper function.
- [x] T3.6 — **traceability/lineage.ts** — `linkArtifact(child, parent)`. Validate `_parent` references resolve to existing artifacts.
- [x] T3.7 — **traceability/chain.ts** — `traceItem(changeDir, artifactId, itemId) → TraceResult`. Walk refs through `.cave` files to build DAG.
- [x] T3.8 — **artifact-flow.ts** — Pipeline: read input → sanitize → compress → stamp metadata → link lineage → write `.cave` + `.md`.
- [x] T3.9 — **Pipeline layer tests** — Compress/decompress round-trip, token count validation (≥70% savings), lineage integrity, metadata stamping. ≥80% coverage.

## Phase 4: UI Layer (depends on all layers)

- [x] T4.1 — **components/Banner.tsx** — Ink-rendered branded banner. Falls back to chalk in non-TTY.
- [x] T4.2 — **components/Panel.tsx** — Bordered container with title, step indicator, status badge.
- [x] T4.3 — **components/Table.tsx** — Column-aligned table with highlight on selected row.
- [ ] T4.4 — **components/SelectInput.tsx** — Multi-select with Space toggle, Enter confirm, arrow nav. Wraps ink-select-input.
- [x] T4.5 — **components/DiffView.tsx** — Before/after view for sanitization review and caveman preview.
- [x] T4.6 — **components/ProgressBar.tsx** — Determinate progress for batch operations.
- [ ] T4.7 — **screens/InitScreen.tsx** — Full init wizard: Banner → IDE select (Panel+SelectInput) → Role select → Confirm → Progress.
- [x] T4.8 — **screens/SanitizeReview.tsx** — One candidate at a time: DiffView + context + approve/reject keybinds.
- [x] T4.9 — **screens/QueryScreen.tsx** — Memory query results: Table with expand-on-enter, select-for-export.
- [ ] T4.10 — **screens/TraceScreen.tsx** — Lineage DAG rendered as indented tree with ref labels.
- [x] T4.11 — **UI component tests** — ink-testing-library snapshots for all components and screens.

## Phase 5: CLI Integration

- [ ] T5.1 — **Refactor `init` command** — Wire InitScreen into `commands/init.ts`. Same logic, Ink UI.
- [x] T5.2 — **Refactor `memory ingest` command** — Wire IngestScreen with sanitization review step.
- [x] T5.3 — **New `memory query` command** — Register in `cli.ts`. Parse query text. Wire QueryScreen.
- [x] T5.4 — **New `trace` command** — Register in `cli.ts`. Options: `--change`, `--item`. Wire TraceScreen.
- [x] T5.5 — **New `review` command** — Register in `cli.ts`. Decompress `.cave` → render in Panel.
- [x] T5.6 — **New `compress` command** — Register in `cli.ts`. Convert existing `.md` → `.cave`.
- [x] T5.7 — **Update SDD skill templates** — Add caveman instruction to all SDD skills. Add `.cave` schema reference to constitution.
- [x] T5.8 — **Integration tests** — End-to-end: init → ingest with sanitization → query → trace. Verify full flow.
- [x] T5.9 — **Update CHANGELOG and package.json** — Version bump to 2.0.0. Document all new features.

---

## Dependency Graph

```
Phase 0 (foundation)
  └──► Phase 1 (safety — leaf layer)
         └──► Phase 2 (memory — depends on safety)
                └──► Phase 3 (pipeline — depends on safety + memory)
                       └──► Phase 4 (UI — depends on all)
                              └──► Phase 5 (CLI integration — wires everything)
```

## Parallelization Opportunities

- **T1.1–T1.4** can run in parallel (independent safety modules)
- **T2.2–T2.6** can run in parallel (independent provider/store modules)
- **T3.1–T3.4** (caveman) parallel with **T3.5–T3.7** (traceability)
- **T4.1–T4.6** (components) all parallel
- **T4.7–T4.10** (screens) all parallel once components exist
- **T5.1–T5.6** (commands) all parallel once screens exist
