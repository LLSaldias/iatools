# Proposal: memory-ingest-batch

## Summary

Extend `iatools memory ingest` with an `--all` flag that scans `openspec/changes/` for every active change that has a `proposal.md` and runs prompt generation for all of them in a single command. Removes the need for a manual shell loop.

## Problem Statement

After the `memory-ingest` change, users can ingest one change at a time:

```bash
iatools memory ingest --change my-feature
```

When a project has multiple active changes — a common situation when onboarding or catching up after a sprint — users must run the command separately for each change, or write a shell loop. Neither is discoverable or ergonomic.

A concrete pain point:

```bash
# Today — verbose and error-prone
iatools memory ingest --change clean-init
iatools memory ingest --change focus-on-memory
iatools memory ingest --change simplify-initialization
```

Desired:

```bash
iatools memory ingest --all
```

## Proposed Solution

Add an `--all` flag to `iatools memory ingest`. When present:

1. Scan `openspec/changes/` for direct subdirectories (non-recursive, skipping `archive/`)
2. For each subdirectory that contains a `proposal.md`, run prompt generation (equivalent to `--change <name>`)
3. Report per-change success/skip/error status
4. Continue on per-change errors — do not abort the batch

## Scope

**In scope:**
- `--all` flag on the existing `memory ingest` subcommand
- Batch prompt generation only (not batch JSON ingestion — that requires per-change LLM output)
- Skip changes without a `proposal.md` (silently or with a note)
- Skip the `archive/` subdirectory
- Per-change status summary at the end

**Out of scope:**
- Batch JSON ingestion (`--all --from` is not meaningful)
- Recursive scanning of nested change directories
- Filtering by change status from `.openspec.yaml`
- Parallelisation — sequential is fine for CLI I/O

## Success Criteria

1. `iatools memory ingest --all` generates a prompt for every change with a `proposal.md`
2. Changes without `proposal.md` are skipped with an informational note
3. `archive/` is always excluded
4. A per-change result table is printed at the end
5. A single failing change does not abort the batch
6. `--all` and `--change` are mutually exclusive — using both exits with an error
7. TypeScript compiles with zero errors
8. All new and existing tests pass
