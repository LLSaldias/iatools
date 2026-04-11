# Design: Token Cost Tracking

**Change**: token-cost-tracking  
**Date**: 2026-04-10

---

## 1. Approach

Insert a new step in the `sdd-archive` skill flow between **spec sync** (step 2) and **memory ingest prompt** (step 3). This step reads all `.md` files in the change folder, counts words, estimates tokens, and writes the results to `.openspec.yaml` before the folder is moved to the archive.

### Updated Archive Flow

1. Load artifacts
2. Sync delta specs to main specs
3. **NEW — Count words & estimate tokens for all `.md` files**
4. **NEW — Write `stats` section to `.openspec.yaml`**
5. Generate extraction prompt (memory ingest)
6. Move change folder to archive
7. Verify archive
8. Return summary (now includes token cost line)

## 2. Architecture Decision

**Decision**: Inline counting logic directly in the sdd-archive skill.

**Rationale**: The word-counting logic is ~10 lines of pseudocode. Creating a separate utility module adds indirection for a single call site. If a future `iatools stats` CLI command is added, the logic can be extracted then.

**Alternatives considered**:
- Utility function in `src/utils/` — Rejected; premature abstraction for single use.
- Post-archive hook — Rejected; stats must be written before folder move.

## 3. Data Flow

```
Read .md files from change folder
  → For each file: content.split(/\s+/).filter(Boolean).length → words
  → tokens = Math.round(words × 1.33)
  → Accumulate per-artifact stats + running totals
Write stats to .openspec.yaml
  → Add `stats:` section with per-artifact and total entries
Include in return envelope
  → Add summary line: "Token cost: {totalWords} words ≈ {totalTokens} tokens"
```

### Word Counting Method

```
words = fileContent.split(/\s+/).filter(Boolean).length
```

This handles multiple spaces, newlines, tabs. Empty files yield 0 words.

### Token Estimation Formula

```
tokens = Math.round(words * 1.33)
```

Based on the approximation that ~750 words ≈ 1,000 tokens.

## 4. `.openspec.yaml` Stats Schema

The `stats` key is added at the root level, sibling to `artifacts`:

```yaml
schema: spec-driven
change: example-change
created: 2026-04-10
status: archived
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
stats:
  proposal:
    words: 317
    tokens: 422
  specs:
    words: 296
    tokens: 394
  design:
    words: 406
    tokens: 540
  tasks:
    words: 320
    tokens: 426
  verify-report:
    words: 746
    tokens: 992
  total:
    words: 2085
    tokens: 2773
```

The `stats` key is **optional** — existing archives without it remain valid. The artifact key in stats is derived from the `.md` filename (without extension). For `specs/` directories containing multiple files, aggregate word count under the key `specs`.

## 5. File Changes

| File | Action | Description |
|------|--------|-------------|
| `~/.copilot/skills/sdd-archive/SKILL.md` | Modified | Add word/token counting step between spec sync and memory ingest |
| `openspec/schemas/spec-driven.yaml` | Modified | Document optional `stats` field |
| `.openspec.yaml` (per change) | Modified at archive time | New `stats` section written automatically |

## 6. Edge Cases

| Case | Handling |
|------|----------|
| Empty `.md` file | 0 words, 0 tokens — still included in stats |
| Missing optional artifact (e.g., no verify-report) | Skipped — not listed in stats |
| `specs/` is a directory | Read all `.md` files inside, sum words under `specs` key |
| Non-`.md` files in change folder | Ignored |
| `.openspec.yaml` itself | Excluded from word counting (not an artifact) |

## 7. Testing Strategy

**Manual verification**: Archive a test change and inspect:
1. `.openspec.yaml` contains `stats` section with correct values
2. Per-artifact word counts match `wc -w` output
3. Token estimates = `Math.round(words × 1.33)`
4. Archive return summary includes the token cost line
5. Existing archived changes are unaffected (no stats retroactively added)
