# Design: Automatic Memory Ingest on Archive

## Technical Approach

The archive workflow gains a new step (Step 3.5) that triggers prompt generation immediately before moving the change folder to `archive/`. This step calls the existing `runPromptMode` function from `memory-ingest.ts`, wrapped in error-handling to gracefully skip when the database is unavailable or prompt generation fails.

The hook is **workflow-driven** (agent-executed in the skill) rather than CLI-based. The workflow reads the `--skip-ingest` flag and conditionally invokes the helper. Since prompt generation is idempotent, it fits naturally into the archive sequence without creating a new CLI command.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Export `runPromptMode` | Yes, export as-is | Signature already matches; no wrapper needed. |
| Hook location | Archive workflow/skill (agent-executed) | Fits between spec merge and folder move; reuses existing orchestration. |
| Error handling | Try/catch → warn, continue | Archive must never fail due to prompt generation. |
| Flag mechanism | `--skip-ingest` in workflow | Passed via orchestrator to the skill. |

## Data Flow

```
Archive Trigger (/sdd-archive <name>)
         │
    Step 2: Merge delta specs → main specs
         │
    Step 3.5: [NEW] Check --skip-ingest flag
         ├─ true  → skip, log info
         └─ false → call runPromptMode
              ├─ Read openspec/changes/<name>/proposal.md
              ├─ Open .sdd/memory.db
              ├─ Generate + save .sdd/extraction-<name>.prompt.txt
              └─ On error → log warning, continue
         │
    Step 4: Move folder → archive/YYYY-MM-DD-<name>/
         │
    Step 5: Announce completion
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/iatools/src/commands/memory-ingest.ts` | Modify | Export `runPromptMode` (currently module-private). |
| `.agents/workflows/sdd-archive.md` | Modify | Add Step 3.5: prompt generation before folder move; document `--skip-ingest`. |
| `~/.copilot/skills/sdd-archive/SKILL.md` | Modify | Add "Step 3.5: Generate Extraction Prompt" with `--skip-ingest` behavior. |
| `packages/iatools/test/unit/iatools.test.ts` | Modify | Add 4 new tests: happy path, missing DB, `--skip-ingest`, error recovery. |

## Interfaces / Contracts

`runPromptMode` already accepts `MemoryIngestOptions`:

```typescript
// packages/iatools/src/commands/memory-ingest.ts — to be exported
export async function runPromptMode(options: MemoryIngestOptions): Promise<void>
```

No new interfaces needed. The archive skill calls it with:

```typescript
await runPromptMode({ change: name, dir: projectRoot, dryRun: false, all: false });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Happy path — prompt file created | Mock fs, call `runPromptMode`, assert file written |
| Unit | Missing DB — warn, no file | Mock `pathExists` → false, assert warning logged |
| Unit | `--skip-ingest` — no call | Assert `runPromptMode` not invoked |
| Unit | Error recovery — archive continues | Mock `runPromptMode` to throw, assert archive completes |

## Migration / Rollout

No migration required. The change is additive: existing archives are unaffected, and the new step only produces a `.prompt.txt` file.

## Open Questions

- (none)
