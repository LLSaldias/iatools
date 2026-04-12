# Proposal: Automatic Memory Ingest on Archive

## Intent

When `/sdd-archive` completes, the memory extraction prompt is never generated — the user must remember to run `iatools memory ingest --change <name>` manually before archiving, or lose the chance because `archive/` is excluded from `--all`. This change adds a **pre-archive prompt-generation hook** so archiving a change always produces the extraction prompt automatically.

## Scope

### In Scope
- Add a `--skip-ingest` flag to the archive workflow/skill so prompt generation runs by default.
- Call `runPromptMode` (or equivalent) **before** the folder is moved to `archive/`.
- Gracefully skip prompt generation when `.sdd/memory.db` does not exist (warn, don't fail).
- Update the `sdd-archive` workflow doc and skill to document the new step.

### Out of Scope
- Provider-backed / automatic LLM extraction (future change).
- Modifying `--all` batch semantics or `archive/` exclusion rules.
- Changes to the JSON ingestion path (`--from`).

## Approach

1. In the archive workflow (step 3→4 gap), invoke `runMemoryIngest({ change, dir, all: false, dryRun: false })` in prompt-generation mode.
2. Wrap the call in a try/catch: if `.sdd/memory.db` is missing or prompt generation fails, log a warning and continue with the archive.
3. Accept `--skip-ingest` to let users opt out.
4. Update `.agents/workflows/sdd-archive.md` and the `sdd-archive` SKILL to mention the new step.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.agents/workflows/sdd-archive.md` | Modified | Add step between spec-merge and folder-move |
| `~/.copilot/skills/sdd-archive/SKILL.md` | Modified | Document optional prompt generation step |
| `packages/iatools/src/commands/memory-ingest.ts` | Modified | Export `runPromptMode` (currently private) or extract a callable helper |
| `packages/iatools/test/unit/iatools.test.ts` | Modified | Add tests for the archive-ingest integration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `.sdd/memory.db` missing at archive time | Medium | Catch & warn; never block archive |
| Folder moved before prompt generation | Low | Enforce ordering: prompt first, move second |
| Users expect automatic DB writes | Medium | Clear CLI output: "Prompt saved. Run `--from` to ingest." |

## Rollback Plan

Remove the prompt-generation call from the archive workflow/skill. No data is written to the DB by this change, so rollback is clean — delete the hook and revert the workflow doc.

## Dependencies

- Existing `runPromptMode` in `packages/iatools/src/commands/memory-ingest.ts` (already implemented).

## Success Criteria

- [ ] `/sdd-archive <name>` produces `.sdd/extraction-<name>.prompt.txt` automatically
- [ ] Archive completes successfully even when `.sdd/memory.db` is missing (warning only)
- [ ] `--skip-ingest` flag suppresses prompt generation
- [ ] Existing tests continue to pass; new tests cover the hook
