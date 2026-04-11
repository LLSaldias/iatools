# Specs: iatools v2.0 — Must-Have Features

**Change**: iatools-v2-must-have  
**Date**: 2026-04-11

---

## SPEC-01: Safety Layer

### Requirements

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| SAF-1 | Built-in regex patterns detect common secrets/PII | AWS keys, JWTs, generic secrets, private keys, connection strings, emails, IPs, ARNs all detected |
| SAF-2 | User-configurable patterns via `.sdd/sanitize.yaml` | Custom patterns loaded, `ignore` list suppresses built-ins |
| SAF-3 | Interactive review before any redaction | Ink screen shows each candidate with context, user approves/rejects individually |
| SAF-4 | Audit trail of all sanitization decisions | `.sdd/sanitize-audit.jsonl` with timestamp, pattern, hash (never cleartext), decision |
| SAF-5 | No unsanitized content reaches memory DB or embeddings | Sanitization runs before persist and before embed — hard ordering |

### Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| SAF-SC1 | Text contains `AKIAIOSFODNN7EXAMPLE` | Scanner runs | Returns RedactionCandidate with `severity: critical`, `label: AWS Access Key` |
| SAF-SC2 | User rejects a redaction candidate | Review complete | Original text preserved for that match, audit logs `decision: keep` |
| SAF-SC3 | `.sdd/sanitize.yaml` ignores `email` | Scanner runs on text with emails | No email candidates returned |
| SAF-SC4 | No `.sdd/sanitize.yaml` exists | Scanner runs | Uses built-in patterns only, no error |

---

## SPEC-02: Memory Embeddings

### Requirements

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| MEM-1 | Provider chain: API → ONNX → BM25 | Falls through gracefully; logs once when degrading |
| MEM-2 | `vectors` table stores one embedding per node | Schema migration adds table non-destructively on first run |
| MEM-3 | Hybrid retrieval with RRF ranking | FTS5 + vector + graph results fused into single ranked list |
| MEM-4 | `iatools memory query` renders interactive results | Ink table with scores, node details on expand, select-to-export |
| MEM-5 | ONNX is optional peer dependency | Users without ONNX get BM25-only; no install-time error |
| MEM-6 | Embeddings generated after sanitization | Vector content is always sanitized |

### Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| MEM-SC1 | OPENAI_API_KEY set | Embedding requested | Uses API provider, stores with `model: text-embedding-3-small` |
| MEM-SC2 | No API keys, ONNX installed | Embedding requested | Lazy-loads ONNX, uses local provider, stores with `model: all-MiniLM-L6-v2` |
| MEM-SC3 | No API keys, no ONNX | `memory query` runs | FTS5 + graph results only, one-time warning logged |
| MEM-SC4 | Existing v1.x memory.db | First v2 command | `vectors` table created via migration, existing data untouched |
| MEM-SC5 | 3 channels return overlapping nodes | RRF fusion | Nodes appearing in multiple channels ranked higher |

---

## SPEC-03: Caveman SDD Mode

### Requirements

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| CAV-1 | `.cave` structured YAML format for each SDD phase | proposal, specs, design, tasks each have a defined schema |
| CAV-2 | `.cave` is source of truth, `.md` derived | Agents read `.cave`; `.md` generated at review gates |
| CAV-3 | Compression achieves ≥70% token savings vs `.md` | Measured across representative samples |
| CAV-4 | Decompression produces readable `.md` from `.cave` | Round-trip: compress → decompress produces coherent prose |
| CAV-5 | Code blocks, URLs, file paths pass through untouched | Technical content preserved exactly in both formats |
| CAV-6 | `iatools compress` converts existing `.md` → `.cave` | Migration path for existing changes |
| CAV-7 | `iatools review` decompresses `.cave` → `.md` for human | On-demand human-readable view |

### Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| CAV-SC1 | Standard 500-token proposal.md | `iatools compress` | Produces proposal.cave with ≤150 tokens |
| CAV-SC2 | proposal.cave exists | Agent runs sdd-spec | Reads `.cave`, outputs specs.cave with `_parent: proposal.cave` |
| CAV-SC3 | design.cave with code block | Compression | Code block preserved verbatim |
| CAV-SC4 | User runs `iatools review proposal --change X` | Decompression | Readable .md rendered in Ink panel |

---

## SPEC-04: Decision Traceability

### Requirements

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| TRC-1 | Every `.cave` carries `_parent` linking to predecessor | proposal has null, specs/design link to proposal, tasks link to specs+design |
| TRC-2 | Items within artifacts carry typed IDs | Risks (R*), Requirements (REQ-*), Decisions (D*), Tasks (T*), Scenarios (SC-*) |
| TRC-3 | Cross-references via `refs` arrays | Tasks reference requirements and decisions they implement |
| TRC-4 | `iatools trace` renders full lineage DAG | From any item, walk back to proposal root |
| TRC-5 | Phase metadata stamped on each artifact | `_meta.created_by`, `created_at`, `approved_by`, `approved_at`, `token_count` |

### Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| TRC-SC1 | tasks.cave has T1 with refs [REQ-1, D1] | `iatools trace --change X --item T1` | Shows: T1 → REQ-1 → proposal, T1 → D1 → R1 → proposal |
| TRC-SC2 | A change has all 4 artifacts | `iatools trace --change X` | Full DAG with all cross-references rendered |
| TRC-SC3 | Artifact created by sdd-design | `.cave` saved | `_meta.created_by: sdd-design` stamped |

---

## SPEC-05: Premium CLI UX

### Requirements

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| UI-1 | Ink-based rendering for all interactive commands | Panel, Table, SelectInput, DiffView, Banner components |
| UI-2 | Theme system with consistent brand colors | Purple primary, round borders, configurable spacing |
| UI-3 | Graceful fallback for non-TTY environments | CI/piped mode uses chalk logger, same information |
| UI-4 | `init` wizard uses Ink multi-select with keyboard nav | Space toggle, Enter confirm, arrow navigate |
| UI-5 | Memory query results as interactive table | Expand details, select for export, keyboard-driven |
| UI-6 | Sanitization review as Ink DiffView | One candidate at a time, context window, approve/reject keybinds |

### Scenarios

| ID | Given | When | Then |
|----|-------|------|------|
| UI-SC1 | TTY terminal | `iatools init` | Ink Banner + Panel with multi-select rendered |
| UI-SC2 | Piped output (`iatools init \| cat`) | `iatools init` | Chalk fallback, same prompts in plain text |
| UI-SC3 | User presses Space on IDE option | InitScreen | Option toggled, visual feedback immediate |
| UI-SC4 | Memory query returns 5 results | QueryScreen | Table with Score, Type, Title, Source columns; arrow keys navigate |
