# Spec: Batch Ingest Command

## Domain
`iatools` CLI — `memory ingest` subcommand, `--all` flag

## Context
The `memory-ingest` change added per-change prompt generation. This spec adds batch operation via `--all`, scanning all active changes automatically.

---

## Requirements

### Functional

#### FR-01 — `--all` Flag
- **MUST** extend `iatools memory ingest` with an `--all` boolean flag.
- **MUST** scan `openspec/changes/` relative to `--dir` for direct subdirectories.
- **MUST** exclude the `archive/` subdirectory from the scan.
- **MUST** run prompt generation (equivalent to `--change <name>`) for each subdirectory that contains a `proposal.md`.
- **MUST** skip subdirectories without a `proposal.md`, emitting an informational note for each.
- **MUST** process changes sequentially.

#### FR-02 — Per-Change Status Summary
- **MUST** print a summary table after the batch completes showing each change and its result: `✓ done`, `⚠ skipped`, or `✗ error`.
- **MUST** continue processing remaining changes even if one fails.

#### FR-03 — Mutual Exclusivity
- **MUST** exit with a usage error if both `--all` and `--change` are provided.
- Error message: `"--all and --change are mutually exclusive. Use one or the other."`

#### FR-04 — Missing Database
- **MUST** exit immediately (before scanning) if `.sdd/memory.db` does not exist.
- Error message: `"No memory database found. Run \`iatools init\` first."`

#### FR-05 — Empty Changes Directory
- **MUST** handle the case where `openspec/changes/` has no eligible subdirectories gracefully.
- **SHOULD** print: `"No changes with a proposal found in openspec/changes/."`

### Non-Functional

#### NFR-01 — No new dependencies
- **MUST NOT** introduce any new npm dependencies. Use `fs-extra` and Node built-ins only.

#### NFR-02 — Reuse `runPromptMode`
- **MUST** reuse the existing single-change prompt generation logic (not duplicate it).

#### NFR-03 — TypeScript strict
- **MUST** compile with zero errors under the existing strict config.

---

## Scenarios

### Scenario 1 — Happy path: multiple changes

**Given** `openspec/changes/` contains `clean-init/proposal.md` and `simplify-initialization/proposal.md`  
**And** `.sdd/memory.db` exists  
**When** the user runs `iatools memory ingest --all`  
**Then** a prompt is generated for `clean-init` and saved to `.sdd/extraction-clean-init.prompt.txt`  
**And** a prompt is generated for `simplify-initialization` and saved to `.sdd/extraction-simplify-initialization.prompt.txt`  
**And** a summary table is printed showing both as `✓ done`

### Scenario 2 — Some changes missing proposal

**Given** `openspec/changes/` contains `clean-init/proposal.md` and `no-proposal/` (no proposal.md)  
**When** the user runs `iatools memory ingest --all`  
**Then** a prompt is generated for `clean-init`  
**And** `no-proposal` is listed as `⚠ skipped (no proposal.md)` in the summary

### Scenario 3 — archive/ is excluded

**Given** `openspec/changes/archive/2026-04-08-old-change/proposal.md` exists  
**When** the user runs `iatools memory ingest --all`  
**Then** `2026-04-08-old-change` is NOT processed

### Scenario 4 — `--all` and `--change` used together

**When** the user runs `iatools memory ingest --all --change my-change`  
**Then** the command exits with a non-zero code  
**And** prints: `"--all and --change are mutually exclusive."`

### Scenario 5 — Missing database

**Given** `.sdd/memory.db` does not exist  
**When** the user runs `iatools memory ingest --all`  
**Then** the command exits with a non-zero code  
**And** prints: `"No memory database found. Run \`iatools init\` first."`

### Scenario 6 — No eligible changes

**Given** `openspec/changes/` contains only `archive/` and `.gitkeep`  
**When** the user runs `iatools memory ingest --all`  
**Then** the command exits with code 0  
**And** prints: `"No changes with a proposal found in openspec/changes/."`

### Scenario 7 — One change fails, batch continues

**Given** two changes with proposals exist  
**And** reading the first proposal throws a filesystem error  
**When** the user runs `iatools memory ingest --all`  
**Then** the first change is listed as `✗ error` in the summary  
**And** the second change is still processed  
**And** the command exits with code 0 (batch errors are non-fatal)
