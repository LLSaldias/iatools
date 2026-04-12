# Delta Spec: Token Cost Tracking

**Change**: token-cost-tracking  
**Type**: NEW (no existing spec)  
**Affects**: sdd-archive skill, `.openspec.yaml` schema

---

## Requirements

### ADDED

#### REQ-TCT-01: Word Counting
The archive process MUST count words in all `.md` files within the change folder. Word counting uses whitespace splitting (`content.split(/\s+/)`, filtering empty strings).

#### REQ-TCT-02: Token Estimation
The archive process MUST compute estimated token count per artifact using `Math.round(words × 1.33)`.

#### REQ-TCT-03: Stats Persistence
The archive process MUST write a `stats` section to `.openspec.yaml` containing:
- Per-artifact entry with `words` and `tokens` (integer values)
- `total` entry with aggregate `words` and `tokens`

#### REQ-TCT-04: Output Display
The archive process MUST include a token cost summary line in its return output showing total words and estimated tokens across all artifacts.

---

## Scenarios

### SCN-01: Normal Archive With Multiple Artifacts

**GIVEN** a change folder with `proposal.md` (317 words), `specs.md` (296 words), `design.md` (406 words), `tasks.md` (320 words), and `verify-report.md` (746 words)  
**WHEN** the archive process runs  
**THEN** `.openspec.yaml` contains a `stats` section with:
- `proposal: { words: 317, tokens: 422 }`
- `specs: { words: 296, tokens: 394 }`
- `design: { words: 406, tokens: 540 }`
- `tasks: { words: 320, tokens: 426 }`
- `verify-report: { words: 746, tokens: 992 }`
- `total: { words: 2085, tokens: 2773 }`

AND the output includes `"Token cost: 2,085 words ≈ 2,773 tokens"`.

### SCN-02: Archive With Missing Optional Artifacts

**GIVEN** a change folder with `proposal.md`, `specs.md`, `design.md`, and `tasks.md` but NO `verify-report.md`  
**WHEN** the archive process runs  
**THEN** `.openspec.yaml` `stats` section contains entries only for existing `.md` files  
AND `verify-report` is NOT listed in stats  
AND `total` reflects only the files present.

### SCN-03: Empty or Zero-Word Markdown File

**GIVEN** a change folder containing a `design.md` that is empty (0 bytes)  
**WHEN** the archive process runs  
**THEN** `stats` includes `design: { words: 0, tokens: 0 }`  
AND the file is still counted in the artifact list  
AND `total` is not affected by the zero-word entry.
