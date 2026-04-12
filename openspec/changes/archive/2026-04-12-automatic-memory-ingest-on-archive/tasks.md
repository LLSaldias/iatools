# Tasks: Automatic Memory Ingest on Archive

## Phase 1: Foundation — Export Existing Function

- [x] **T-01** In `packages/iatools/src/commands/memory-ingest.ts`, change `async function runPromptMode` to `export async function runPromptMode` (line ~55). No other changes to the function body.

## Phase 2: Core Implementation — Archive Hook Logic

- [x] **T-02** In `packages/iatools/src/commands/memory-ingest.ts`, create and export a new helper `tryGenerateExtractionPrompt(changeName: string, dir: string): Promise<void>` that:
  1. Checks if `.sdd/memory.db` exists — if not, logs warning `"⚠ Memory database not found. Skipping prompt generation."` and returns.
  2. Calls `runPromptMode({ change: changeName, dir, dryRun: false, all: false })` wrapped in try/catch.
  3. On catch, logs warning `"⚠ Prompt generation failed: <message>. Continuing with archive."` and returns (never throws).

## Phase 3: Documentation — Workflow & Skill Updates

- [x] **T-03** In `.agents/workflows/sdd-archive.md`, insert a new Step 3.5 between steps 3 (merge delta specs) and 4 (move folder):
  ```
  3.5 Generate extraction prompt: run `tryGenerateExtractionPrompt(changeName, dir)`. Skip if `--skip-ingest` is set.
  ```
  Also add `--skip-ingest` to the Usage section.

- [x] **T-04** In `~/.copilot/skills/sdd-archive/SKILL.md`, add a "Step 2.5: Generate Extraction Prompt" section between Step 2 (Sync Delta Specs) and Step 3 (Move to Archive):
  - Describe calling `tryGenerateExtractionPrompt` before the folder move.
  - Document `--skip-ingest` behavior: when set, skip prompt generation and log info.
  - Emphasize: on error, log warning and continue; never block the archive.

## Phase 4: Testing

- [x] **T-05** In `packages/iatools/test/unit/iatools.test.ts`, add a new `describe('tryGenerateExtractionPrompt')` block with:
  - **T-05a** Happy path: `.sdd/memory.db` exists, proposal exists → `runPromptMode` is called, `.sdd/extraction-<name>.prompt.txt` is produced.
  - **T-05b** Missing DB: `.sdd/memory.db` does not exist → warning logged, `runPromptMode` not called, no error thrown.
  - **T-05c** Prompt generation error: `runPromptMode` throws → warning logged, function returns without throwing.

## Phase 5: Verification

- [x] **T-06** Run `npm test` from `packages/iatools/` and confirm all existing + new tests pass.
- [x] **T-07** Run `npm run build` from `packages/iatools/` and confirm zero TypeScript errors.
