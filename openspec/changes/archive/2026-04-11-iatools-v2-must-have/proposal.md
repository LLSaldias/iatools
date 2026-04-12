# Proposal: iatools v2.0 — Must-Have Features

## Intent

Transform iatools from an SDD bootstrapper into a **must-have tool** for spec-driven development. Five features that address the three biggest adoption barriers: token cost, trust (compliance), and developer experience.

## Scope

### In Scope — v2.0 Core

| Feature | What | Why |
|---------|------|-----|
| **Premium CLI UX** | chalk/boxen/cli-table3 — themed panels, styled tables, diff views | First impressions drive adoption; polished themed UI with interactive inquirer prompts |
| **Caveman SDD Mode** | Compressed `.cave` artifact format for agent-to-agent communication | SDD artifacts are the main token cost; ~74% savings per change cycle |
| **Decision Traceability** | Linked artifact chain with lineage metadata | Makes iatools "sticky" — full audit trail of why decisions were made |
| **Sanitization** | Regex-based PII/secret detection with interactive review | Compliance requirement — users can't trust memory without it |
| **Memory Upgrade** | Embedding-based retrieval (API + local ONNX fallback) with hybrid ranking | Current FTS5 keyword search misses semantic matches |

### Out of Scope (v2.1+)

- `/autoskill` — stack detection + skill recommendations (lowest priority, manual call sufficient)
- Architect docs — domain model + change impact maps
- Declarative agent topology (LangGraph replacement)

## Approach

**Layered Core architecture** — single package, 4 internal layers with strict dependency direction:

```
UI Layer (Ink) → Pipeline Layer → Memory Layer → Safety Layer
```

No multi-package overhead. Optional heavy deps (ONNX) lazy-loaded. Each layer owns its tests.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| chalk/boxen over Ink — simpler dependency tree, CI-safe, no JSX toolchain needed | Mature ecosystem, zero-config, works in all terminal environments |
| `.cave` as YAML, not binary | Git-diffable, agent-readable without tooling, human-debuggable |
| `.cave` is source of truth, `.md` derived | Agents are primary consumers; humans review on-demand |
| Regex sanitization over ML classification | Zero external deps, deterministic, auditable |
| Interactive review mandatory | "Human in the middle" contract — no silent redaction |
| RRF for hybrid ranking | No training data needed, degrades gracefully when channels missing |
| ONNX as optional peer dep | Users who only run `init` never pay 23MB cost |
| API embeddings preferred over local | Better quality when keys available; local fallback for offline |

## Affected Areas

| Area | Impact |
|------|--------|
| `src/` structure | Reorganized into `ui/`, `pipeline/`, `memory/`, `safety/` layers |
| `package.json` | New deps: chalk, boxen, cli-table3, inquirer, ora, figures; optional peer: onnxruntime-node |
| `src/utils/logger.ts` | Becomes thin shim delegating to styled or plain chalk (CI fallback) |
| `src/commands/init.ts` | Refactored to use themed UI with inquirer prompts |
| `src/memory/` | Extended with `embeddings/` sub-module and `vector-store.ts` |
| `templates/skills/` | SDD skills get caveman instruction block |
| `templates/agents/constitution.md` | Gets caveman-sdd schema reference |
| `.sdd/memory.db` schema | New `vectors` table, migration on first run |
| `.sdd/sanitize.yaml` | New user-configurable pattern file |
| `.sdd/sanitize-audit.jsonl` | New append-only audit log |
| `openspec/changes/` artifacts | New `.cave` format alongside `.md` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `.cave` format not adopted by third-party SDD tools | Medium | `.md` always generated at review gates; `.cave` is internal optimization |
| ONNX model download fails on first use | Low | Clear error message + graceful BM25 fallback |
| Regex sanitization false positives | Medium | Interactive review + user-configurable ignore rules |
| Breaking change for existing `.sdd/memory.db` users | Low | Migration adds `vectors` table non-destructively |

## Rollback Plan

Each feature is independently deployable. If a specific layer causes issues:
- UI: chalk/boxen stack has no heavy deps to roll back; already the simpler approach
- Caveman: agents read `.md` files (always generated)
- Embeddings: BM25-only retrieval works without vectors table
- Sanitization: skip scan if `.sdd/sanitize.yaml` absent

## Dependencies

- chalk, boxen, cli-table3, inquirer, ora, figures (UI layer)
- onnxruntime-node ^1.17 (optional peer dep)
- Existing: better-sqlite3, commander, fs-extra

## Success Criteria

- [ ] `iatools init` renders with themed panels and interactive multi-select
- [ ] `/sdd-ff` produces `.cave` artifacts with ~70%+ token savings vs `.md`
- [ ] Every `.cave` artifact carries `_parent` traceability link
- [ ] Memory ingestion scans for secrets and presents interactive review
- [ ] `iatools memory query` returns hybrid-ranked results (FTS + vector + graph)
- [ ] Existing `memory.db` databases migrate non-destructively
- [ ] All features degrade gracefully without optional deps
