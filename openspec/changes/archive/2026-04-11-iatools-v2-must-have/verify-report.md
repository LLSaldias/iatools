# Verification Report

**Change**: iatools-v2-must-have  
**Version**: 2.0.0  
**Date**: 2026-04-11

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 45 |
| Tasks complete | 0 (all marked `[ ]`) |
| Tasks incomplete | 45 |

> **Note**: No tasks were marked complete in `tasks.md`, though most have corresponding implementations. The task checklist was never updated during development.

---

## Build & Tests Execution

**Build**: ✅ Passed (`tsc && tsc-alias` — exit code 0, zero errors)

**Tests**: ⚠️ 121 passed / 5 failed / 0 skipped

```
PASS test/unit/safety.test.ts          (30/30 passed)
PASS test/unit/pipeline.test.ts        (25/25 passed)
PASS test/unit/iatools.test.ts         (19/19 passed)
PASS test/unit/ui.test.ts              (32/32 passed)
PASS test/unit/cli-integration.test.ts (5/5 passed)
FAIL test/unit/memory-embeddings.test.ts (10 passed, 5 failed)
```

**5 Failing Tests** (all in `memory-embeddings.test.ts`):
- `stores 3 vectors and returns ranked results on search` — `better-sqlite3` binary incompatible with Node.js version (NODE_MODULE_VERSION 137 vs 127)
- `vectors table exists after MemoryDB construction` — same root cause
- `stores and retrieves a vector correctly` — same root cause
- `returns null for non-existent node` — same root cause
- `deleteVector removes the vector` — same root cause

**Root cause**: `better-sqlite3` native binary compiled for a different Node.js version. Needs `npm rebuild better-sqlite3` or reinstall. This is an environment issue, not a code bug.

**Coverage**: Not configured (no `rules.verify.coverage_threshold` in `openspec/config.yaml`)

---

## Spec Compliance Matrix

### SPEC-01: Safety Layer

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| SAF-1: Built-in regex patterns | SAF-SC1: AWS key detection | `safety.test.ts > detects AWS Access Key ID` | ✅ COMPLIANT |
| SAF-1: Built-in regex patterns | (all 9 patterns defined) | `safety.test.ts > should define exactly 9 patterns` | ✅ COMPLIANT |
| SAF-2: User-configurable patterns | SAF-SC3: ignore email | `safety.test.ts > ignores excluded pattern` | ✅ COMPLIANT |
| SAF-2: User-configurable patterns | SAF-SC4: no config file | `safety.test.ts > returns empty config when file does not exist` | ✅ COMPLIANT |
| SAF-3: Interactive review | SAF-SC2: reject redaction | `ui.test.ts > runSanitizeReview is an async function` | ⚠️ PARTIAL — function exists but no behavioral test proving approve/reject flow |
| SAF-4: Audit trail | — | `safety.test.ts > writes JSONL lines to file` + `does not include cleartext` | ✅ COMPLIANT |
| SAF-5: Sanitize before persist | — | (none found) | ❌ UNTESTED — no integration test proving ordering |

### SPEC-02: Memory Embeddings

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| MEM-1: Provider chain | MEM-SC1: OPENAI_API_KEY | `memory-embeddings.test.ts > returns ApiEmbeddingProvider when OPENAI_API_KEY is set` | ✅ COMPLIANT |
| MEM-1: Provider chain | MEM-SC2: ONNX fallback | (code exists but no test for ONNX path) | ⚠️ PARTIAL |
| MEM-1: Provider chain | MEM-SC3: No keys, no ONNX | `memory-embeddings.test.ts > returns null without any keys and no onnxruntime-node` | ✅ COMPLIANT |
| MEM-2: Vectors table | MEM-SC4: v1→v2 migration | `memory-embeddings.test.ts > vectors table exists after MemoryDB construction` | ❌ FAILING (env issue) |
| MEM-3: Hybrid retrieval/RRF | MEM-SC5: RRF fusion | `memory-embeddings.test.ts > ranks nodes in multiple channels higher` | ✅ COMPLIANT |
| MEM-4: Interactive query results | — | `ui.test.ts > renderQueryResults is an async function` | ⚠️ PARTIAL — function exists, no behavioral test |
| MEM-5: ONNX optional peer dep | — | `package.json peerDependencies: onnxruntime-node` | ✅ COMPLIANT (structural) |
| MEM-6: Embed after sanitization | — | (none found) | ❌ UNTESTED |

### SPEC-03: Caveman SDD Mode

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| CAV-1: .cave YAML format | — | `pipeline.test.ts > accepts a valid proposal/spec/design/tasks` | ✅ COMPLIANT |
| CAV-3: ≥70% token savings | CAV-SC1: compression | `pipeline.test.ts > token count of .cave is less than original markdown` | ✅ COMPLIANT |
| CAV-4: Decompress to readable .md | — | `pipeline.test.ts > round-trips compress → serialize → parse → decompress` | ✅ COMPLIANT |
| CAV-5: Code/URL passthrough | CAV-SC3: code block | `pipeline.test.ts > extracts and restores code blocks` + `extracts URLs` + `extracts file paths` | ✅ COMPLIANT |
| CAV-6: `iatools compress` | — | `cli-integration.test.ts > produces a .cave file from a sample .md` | ✅ COMPLIANT |
| CAV-7: `iatools review` | CAV-SC4: decompress on demand | `cli-integration.test.ts > logs error with nonexistent .cave file` | ⚠️ PARTIAL — error path tested, not happy path |

### SPEC-04: Decision Traceability

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| TRC-1: _parent linking | — | `pipeline.test.ts > validateLineage passes when parent exists` | ✅ COMPLIANT |
| TRC-2: Typed item IDs | — | (structural in profiles.ts, no dedicated test) | ⚠️ PARTIAL |
| TRC-3: Cross-refs via refs | TRC-SC1: trace item | `pipeline.test.ts > traceItem follows refs across artifacts` | ✅ COMPLIANT |
| TRC-4: `iatools trace` DAG | TRC-SC2: full DAG | `pipeline.test.ts > traceChange returns results for all items with refs` | ✅ COMPLIANT |
| TRC-5: Phase metadata | TRC-SC3: created_by stamp | `pipeline.test.ts > stampMetadata returns valid timestamps` | ✅ COMPLIANT |

### SPEC-05: Premium CLI UX

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| UI-1: Ink-based rendering | UI-SC1: TTY Ink banner | — | ❌ **NOT IMPLEMENTED** — Uses chalk/boxen/cli-table3, NOT Ink/React |
| UI-2: Theme system | — | `ui.test.ts > panel/statusBadge/header/keyHint` | ✅ COMPLIANT (theme exists, not Ink-based) |
| UI-3: Graceful non-TTY fallback | UI-SC2: piped output | `ui.test.ts > logger methods callable` | ⚠️ PARTIAL |
| UI-4: Ink multi-select | UI-SC3: Space toggle | — | ❌ **NOT IMPLEMENTED** — Uses inquirer checkboxes |
| UI-5: Memory query interactive table | UI-SC4: QueryScreen | `ui.test.ts > renderQueryResults is an async function` | ⚠️ PARTIAL |
| UI-6: Sanitization DiffView | — | `ui.test.ts > runSanitizeReview is an async function` | ⚠️ PARTIAL |

**Compliance summary**: 20/33 scenarios fully compliant, 7 partial, 3 untested, 1 failing (env), 2 not implemented

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Safety Layer (SAF-1 through SAF-5) | ✅ Implemented | All files exist: patterns.ts (9 patterns), scanner.ts, redactor.ts, audit.ts |
| Memory Embeddings (MEM-1 through MEM-6) | ✅ Implemented | Provider chain, vector-store, hybrid-retrieval with RRF all present |
| Caveman Mode (CAV-1 through CAV-7) | ✅ Implemented | Full pipeline: compressor, decompressor, profiles, preservers |
| Decision Traceability (TRC-1 through TRC-5) | ✅ Implemented | lineage.ts, chain.ts, metadata.ts all present |
| Premium CLI UX (UI-1 through UI-6) | ⚠️ **Deviated** | **Implemented with chalk/boxen/cli-table3 instead of Ink/React** |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| 4-layer architecture (UI→Pipeline→Memory→Safety) | ✅ Yes | Directory structure matches exactly |
| Ink over blessed/neo-blessed | ❌ **Not followed** | Uses chalk/boxen/inquirer instead of Ink. No .tsx files, no JSX in tsconfig, no ink/react in dependencies |
| `.cave` as YAML, not binary | ✅ Yes | |
| `.cave` is source of truth, `.md` derived | ✅ Yes | |
| Regex sanitization over ML | ✅ Yes | |
| Interactive review mandatory | ✅ Yes | sanitize-review.ts exists with inquirer prompts |
| RRF for hybrid ranking | ✅ Yes | hybrid-retrieval.ts with k=60 |
| ONNX as optional peer dep | ✅ Yes | peerDependencies in package.json |
| TSX stays in `ui/` only | ✅ Yes (vacuously) | No TSX files exist anywhere |

---

## Issues Found

**CRITICAL** (must fix before archive):

1. **SPEC-05 (Premium CLI UX): Ink/React NOT implemented** — The spec and design explicitly require Ink `^5`, `react ^18`, `.tsx` components (Banner.tsx, Panel.tsx, SelectInput.tsx, etc.), and JSX in tsconfig. None of this exists. The implementation uses chalk/boxen/cli-table3/inquirer instead. This is the fundamental deviation — **the "claude code"-style interactive TUI does not exist**.
   - No `ink`, `react`, `@types/react` in dependencies
   - No `jsx` setting in tsconfig.json
   - No `.tsx` files anywhere in the project
   - No `InitScreen.tsx`, `TraceScreen.tsx`, `SelectInput.tsx`
   - `init` command still uses legacy `inquirer` prompts

2. **5 failing tests** in `memory-embeddings.test.ts` — `better-sqlite3` native binary version mismatch. Needs `npm rebuild better-sqlite3`.

**WARNING** (should fix):

1. **Tasks checklist not updated** — All 45 tasks in `tasks.md` are marked `[ ]` despite most being implemented
2. **SAF-5 + MEM-6 untested** — No integration test proving sanitization runs before memory persist and before embedding
3. **SAF-3 interactive review** — Only existence test, no behavioral test for approve/reject flow
4. **CAV-7 review command** — Only error path tested, missing happy-path test

**SUGGESTION** (nice to have):

1. Add coverage threshold to `openspec/config.yaml`
2. Add integration test for full ingest pipeline (sanitize → redact → embed → persist)

---

## Verdict

### ❌ FAIL

The implementation is **substantially complete** for 4 of 5 spec areas (Safety, Memory, Pipeline, Traceability) with solid test coverage. However, **SPEC-05 (Premium CLI UX) is fundamentally unimplemented** — the entire Ink/React UI layer described in the specs, design, and proposal was replaced with a chalk/boxen approach. This is not a minor deviation; it's the complete absence of the specified technology stack for the UI layer.

The 5 failing tests are an environment issue (native module rebuild needed), not code bugs.

**Recommended next steps:**
1. Decide whether to **update the specs** to match the chalk/boxen implementation (accept the deviation), or **implement Ink/React** as specified
2. Run `npm rebuild better-sqlite3` to fix the 5 failing tests
3. Update `tasks.md` to reflect actual completion status
