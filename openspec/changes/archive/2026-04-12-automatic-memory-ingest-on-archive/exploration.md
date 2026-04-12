<!-- exploration artifact — read-only context for sdd-propose -->
## Exploration: automatic-memory-ingest-on-archive

### Current State
The current memory flow is **not fully automatic**.

- `iatools memory ingest --change <name>` generates an extraction prompt from `openspec/changes/<name>/proposal.md` and saves it to `.sdd/extraction-<name>.prompt.txt`.
- Actual database writes only happen in JSON-ingestion mode (`--from <path>`), after an external LLM returns structured output.
- `memory ingest --all` explicitly excludes `openspec/changes/archive/` by spec and implementation.
- `/sdd-archive` is currently implemented as an SDD workflow/skill that syncs specs and moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`.

This means "automatic ingest on archive" cannot be truly end-to-end with the current architecture unless the project adds a provider-backed extraction step. Today, the safe automation point is **auto-generating the prompt during archive**, before the folder is moved.

### Affected Areas
- `packages/iatools/src/commands/memory-ingest.ts` — prompt mode resolves `openspec/changes/<name>/proposal.md`; batch mode excludes `archive/`.
- `openspec/specs/memory-ingest.md` — defines the human-in-the-loop, local-only ingestion contract.
- `openspec/specs/memory-ingest-batch.md` — requires `archive/` to be skipped for `--all`.
- `.agents/workflows/sdd-archive.md` — archive workflow currently merges specs, then moves the change to archive.
- `sdd-archive SKILL.md` — archive skill confirms the same ordering and archive behavior.
- `packages/iatools/test/unit/iatools.test.ts` — existing test `T-08c` verifies that `archive/` is excluded.

### Approaches
1. **Pre-archive prompt generation hook** — When `/sdd-archive` runs, automatically call the prompt-generation phase of `memory ingest` before moving the folder.
   - Pros: fits the current specs, preserves the human-in-the-loop design, does not break `archive/` exclusion.
   - Cons: it automates prompt creation, not final DB ingestion.
   - Effort: **Medium**

2. **Add archived-path support** — Extend `memory ingest` to also resolve archived change folders (or accept a direct proposal path), so ingest can run after archival.
   - Pros: more flexible and works on historical changes.
   - Cons: adds path-resolution complexity and still does not remove the manual `--from` step.
   - Effort: **Medium**

3. **True automatic provider-backed ingestion** — During archive, call an LLM/provider to extract nodes/edges and then write to `.sdd/memory.db` automatically.
   - Pros: fully automatic UX.
   - Cons: conflicts with the current local-only / no-external-HTTP contract, adds secrets/configuration, and is the highest-risk option.
   - Effort: **High**

### Recommendation
Recommend **Approach 1: pre-archive prompt generation hook**.

Why:
- It matches the existing `memory-ingest` design, which is intentionally human-in-the-loop.
- It avoids changing the documented behavior that `archive/` is excluded from batch scans.
- It works with the current file layout because prompt generation expects the proposal to still live under `openspec/changes/<name>/proposal.md`.

If the product goal is truly **automatic database ingestion**, that should be proposed as a broader follow-up change to the memory system spec, not just as an archive tweak.

### Risks
- `memory ingest` currently requires `.sdd/memory.db`; archive should not fail hard if the database is missing.
- If the archive step moves the folder first, prompt generation will fail because the proposal path changes.
- Existing specs and tests explicitly treat `archive/` as out-of-scope for `--all`; changing that behavior would require a spec update.
- Users may assume “automatic ingest” means DB writes, while the current system only supports automatic **prompt generation** without an external extraction result.

### Ready for Proposal
**Yes** — the change is clear enough to propose.

Best proposal framing:
- **Primary**: automatically generate the memory extraction prompt during `/sdd-archive` before the folder is moved.
- **Optional follow-up**: explore provider-backed end-to-end ingestion if full automation is desired.
