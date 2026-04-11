# Tasks: Token Cost Tracking

**Change**: token-cost-tracking  
**Date**: 2026-04-10

---

## Phase 1: Add Word/Token Counting to sdd-archive

### Task 1.1: Add counting step to SKILL.md ✅
- **File**: `~/.copilot/skills/sdd-archive/SKILL.md`
- **Action**: Insert a new step between "Sync delta specs to main specs" and "Generate extraction prompt"
- **Details**:
  - Read all `.md` files in the change folder (excluding `.openspec.yaml`)
  - For each file: count words via `content.split(/\s+/).filter(Boolean).length`
  - Compute tokens: `Math.round(words * 1.33)`
  - If `specs/` is a directory, read all `.md` files inside and aggregate under key `specs`
  - Accumulate per-artifact stats and running totals
- **Acceptance**: The skill instructions describe the counting step clearly enough for an agent to execute

### Task 1.2: Define artifact key derivation ✅
- **File**: `~/.copilot/skills/sdd-archive/SKILL.md`
- **Action**: Document how artifact keys are derived from filenames
- **Details**: `proposal.md` → `proposal`, `verify-report.md` → `verify-report`, `specs/` directory → `specs`
- **Acceptance**: Key derivation is unambiguous in the skill text

---

## Phase 2: Stats Persistence in .openspec.yaml

### Task 2.1: Write stats section to .openspec.yaml ✅
- **File**: `~/.copilot/skills/sdd-archive/SKILL.md`
- **Action**: Add instruction to write `stats` block to `.openspec.yaml` after counting
- **Details**:
  - Add `stats:` key at root level with per-artifact `{ words, tokens }` entries
  - Add `total: { words, tokens }` entry with sums
  - Write before the folder move step (so stats are archived with the change)
- **Acceptance**: `.openspec.yaml` in archived folder contains valid `stats` section

### Task 2.2: Update schema to document stats field ✅
- **File**: `openspec/schemas/spec-driven.yaml`
- **Action**: Add optional `stats` field documentation
- **Details**: Add a comment or field indicating `stats` is an optional root-level key populated at archive time
- **Acceptance**: Schema reflects the new optional field

---

## Phase 3: Update Archive Output

### Task 3.1: Include token cost in return summary ✅
- **File**: `~/.copilot/skills/sdd-archive/SKILL.md`
- **Action**: Update the archive return envelope to include a token cost summary line
- **Details**: Add line: `Token cost: {totalWords} words ≈ {totalTokens} tokens`
- **Acceptance**: Archive output displays word and token totals

---

## Phase 4: Verification

### Task 4.1: Manual verification
- **Action**: Archive a test change (e.g., `token-cost-tracking` itself or a dummy change)
- **Verify**:
  - [ ] `.openspec.yaml` has `stats` section with per-artifact and total entries
  - [ ] Word counts match `wc -w *.md` output (±1 word tolerance for whitespace handling)
  - [ ] Token values equal `Math.round(words × 1.33)`
  - [ ] Archive return summary includes token cost line
  - [ ] Previously archived changes are untouched

### Task 4.2: Edge case check
- **Action**: Test with a change that has missing optional artifacts (no `verify-report.md`)
- **Verify**:
  - [ ] Stats section only lists existing artifacts
  - [ ] Totals are correct for present files only
