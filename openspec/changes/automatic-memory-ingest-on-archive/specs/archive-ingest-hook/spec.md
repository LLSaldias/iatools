# Delta for archive-ingest-hook

> Change: `automatic-memory-ingest-on-archive`

## Domain
`sdd-archive` workflow / `iatools` CLI — memory ingest integration

## Context
When `/sdd-archive` completes, the memory extraction prompt is not generated — users must manually run `iatools memory ingest --change <name>` before archiving, or lose the chance since `archive/` is excluded from batch operations.

This delta adds a **pre-archive prompt-generation hook** so extraction prompts are created automatically before the change folder moves to `archive/`.

Related specs: `openspec/specs/memory-ingest.md`, `openspec/specs/memory-ingest-batch.md`

---

## ADDED Requirements

### Requirement: Pre-Archive Prompt Generation

The archive workflow **MUST** invoke prompt generation immediately before moving the change folder to `archive/`.

#### Scenario: Happy path — prompt generated and saved

- GIVEN a change is being archived with `/sdd-archive <name>`
- AND `.sdd/memory.db` exists
- AND the user has not provided `--skip-ingest`
- WHEN the archive workflow reaches the pre-move step
- THEN `runPromptMode` (or equivalent) is called with the change name
- AND `.sdd/extraction-<name>.prompt.txt` is created
- AND the workflow continues and moves the folder to `archive/`

#### Scenario: Ordering — prompt generated BEFORE folder move

- GIVEN the archive workflow is executing
- WHEN prompt generation is triggered
- THEN the extraction prompt file is written before any folder rename/move occurs

### Requirement: Graceful Handling of Missing Database

The archive workflow **MUST NOT** fail when `.sdd/memory.db` does not exist; it **MUST** skip prompt generation with a warning.

#### Scenario: Missing database during archive

- GIVEN `/sdd-archive <name>` is executing
- AND `.sdd/memory.db` does not exist
- WHEN the pre-archive prompt-generation step is reached
- THEN the workflow logs a warning: `"⚠ Memory database not found. Skipping prompt generation."`
- AND no extraction prompt file is created
- AND the archive completes successfully

### Requirement: `--skip-ingest` Suppression Flag

The archive command **MUST** accept a `--skip-ingest` boolean flag to opt out of automatic prompt generation.

#### Scenario: Archive with `--skip-ingest`

- GIVEN the user runs `/sdd-archive <name> --skip-ingest`
- WHEN the archive workflow reaches the pre-archive step
- THEN prompt generation is skipped entirely
- AND a note is printed: `"ℹ Prompt generation skipped (--skip-ingest)."`
- AND the archive completes normally

### Requirement: Graceful Error Recovery

The archive workflow **MUST** complete successfully even if prompt generation fails for any reason.

#### Scenario: Prompt generation encounters an error

- GIVEN a change is being archived
- AND the prompt generation step encounters an error (e.g., proposal parsing fails)
- WHEN the archive workflow catches the error
- THEN a warning is logged: `"⚠ Prompt generation failed: <message>. Continuing with archive."`
- AND the archive completes and moves the folder to `archive/`

### Requirement: Documentation Updates

The archive workflow and skill docs **MUST** describe the new step and the `--skip-ingest` option.

#### Scenario: Documentation reflects the new behavior

- GIVEN users consult `.agents/workflows/sdd-archive.md`
- WHEN they read the workflow steps
- THEN a step between spec-merge and folder-move describes prompt generation
- AND the documentation mentions `--skip-ingest`

---

## Scenarios Summary

| # | Scenario | Priority | Key assertion |
|---|----------|----------|---------------|
| 1 | Happy path: prompt generated | MUST | `.sdd/extraction-<name>.prompt.txt` exists after archive |
| 2 | Ordering: before folder move | MUST | Prompt written before rename |
| 3 | Missing DB: warn and continue | MUST | Archive exit 0, warning logged |
| 4 | `--skip-ingest`: skip | MUST | No prompt file, info logged |
| 5 | Generation failure: continue | MUST | Archive exit 0, warning logged |
| 6 | Docs updated | MUST | Workflow and skill mention step + flag |
