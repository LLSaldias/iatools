# Spec: Memory Ingest Command

> Merged from `openspec/changes/memory-ingest` on 2026-04-08.

## Domain
`iatools` CLI — `memory ingest` subcommand

## Context
The `focus-on-memory` change delivered `buildExtractionPrompt` and `processExtractionResult` as library primitives. This spec defines the requirements for the CLI command that exposes them.

---

## Requirements

### Functional

#### FR-01 — Prompt Generation Mode
- **MUST** accept `--change <name>` to identify the change whose proposal will be processed.
- **MUST** resolve the proposal at `openspec/changes/<name>/proposal.md` relative to the `--dir` root (default: `cwd`).
- **MUST** read all existing nodes from `.sdd/memory.db` and pass them to `buildExtractionPrompt`.
- **MUST** print the generated LLM extraction prompt to stdout.
- **SHOULD** also save the prompt to `.sdd/extraction-<name>.prompt.txt` for reuse.
- **MUST** print usage instructions after the prompt, telling the user to send it to an LLM and save the resulting JSON.

#### FR-02 — JSON Ingestion Mode
- **MUST** accept `--from <path>` pointing to a JSON file containing the LLM extraction result.
- **MUST** parse the JSON according to the `ExtractionResult` type (`nodes[]`, `edges[]`).
- **MUST** call `processExtractionResult(db, rawResult, changeName)` and commit to `.sdd/memory.db`.
- **MUST** report the number of nodes and edges created.

#### FR-03 — Dry-run Flag
- **MUST** accept `--dry-run` flag (usable only with `--from`).
- **MUST** validate the JSON structure and check edge target IDs without writing to the database.
- **MUST** report what *would* be inserted: node titles, labels, and edge connections.

#### FR-04 — Directory Override
- **MUST** accept `--dir <path>` to target a project other than `cwd`.
- Both `proposal.md` and `.sdd/memory.db` are resolved relative to `--dir`.

### Error Handling

#### ER-01 — Missing Proposal
- **MUST** exit with a clear error if `openspec/changes/<name>/proposal.md` does not exist.
- Error message: `"No proposal found for change '<name>'. Expected: openspec/changes/<name>/proposal.md"`

#### ER-02 — Missing Database
- **MUST** exit with a clear error if `.sdd/memory.db` does not exist.
- Error message: `"No memory database found. Run \`iatools init\` first."`

#### ER-03 — Missing `--change` argument
- **MUST** exit with a usage error if `--change` is not provided.

#### ER-04 — Invalid JSON
- **MUST** catch JSON parse errors and report them without crashing.
- Error message: `"Failed to parse extraction JSON: <message>"`

#### ER-05 — Invalid ExtractionResult shape
- **MUST** validate that parsed JSON has a `nodes` array and an `edges` array.
- Invalid JSON that passes parsing but lacks required fields must exit with a descriptive error.

### Non-Functional

#### NFR-01 — No external HTTP
- **MUST NOT** make any network requests. The command is purely local I/O.

#### NFR-02 — Spinner UX
- **SHOULD** use `ora` spinner for the ingestion step (consistent with `memory-export`).

#### NFR-03 — TypeScript strict
- **MUST** compile with `strict: true` and zero `any` types without explicit cast justification.

---

## Scenarios

### Scenario 1 — Happy path: prompt generation

**Given** `openspec/changes/my-change/proposal.md` exists and `.sdd/memory.db` exists  
**When** the user runs `iatools memory ingest --change my-change`  
**Then** the extraction prompt is printed to stdout  
**And** the prompt is saved to `.sdd/extraction-my-change.prompt.txt`  
**And** usage instructions appear, telling the user to send the prompt to an LLM

### Scenario 2 — Happy path: JSON ingestion

**Given** `openspec/changes/my-change/proposal.md` exists  
**And** `.sdd/memory.db` exists  
**And** `extraction.json` is a valid `ExtractionResult` JSON file  
**When** the user runs `iatools memory ingest --change my-change --from extraction.json`  
**Then** nodes and edges are committed to `.sdd/memory.db`  
**And** the command reports: `"Ingested 3 nodes and 2 edges for change 'my-change'."`

### Scenario 3 — Dry run

**Given** `extraction.json` is a valid `ExtractionResult` JSON file  
**When** the user runs `iatools memory ingest --change my-change --from extraction.json --dry-run`  
**Then** nothing is written to the database  
**And** the command prints the nodes and edges that *would* be inserted

### Scenario 4 — Missing proposal

**Given** `openspec/changes/unknown/proposal.md` does not exist  
**When** the user runs `iatools memory ingest --change unknown`  
**Then** the command exits with a non-zero code  
**And** prints: `"No proposal found for change 'unknown'."`

### Scenario 5 — Missing database

**Given** `.sdd/memory.db` does not exist  
**When** the user runs `iatools memory ingest --change my-change`  
**Then** the command exits with a non-zero code  
**And** prints: `"No memory database found. Run \`iatools init\` first."`

### Scenario 6 — Invalid JSON file

**Given** `bad.json` contains malformed JSON  
**When** the user runs `iatools memory ingest --change my-change --from bad.json`  
**Then** the command exits with a non-zero code  
**And** prints: `"Failed to parse extraction JSON: <parse error message>"`

---

## Implementation Notes
- Prompt file saved via `fs.outputFile` (fs-extra) which creates `.sdd/` if missing.
- `--dry-run` without `--from` silently falls through to prompt-generation mode.
- Jest `moduleNameMapper` (`^@/(.*)$` → `<rootDir>/src/$1`) required in `packages/iatools/jest.config.js` for the `@/` alias to resolve in tests.
