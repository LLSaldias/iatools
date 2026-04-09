# Tasks: iatools-v1.3.0

## Phase 1: Direct Installation of Suggested Skills
- [x] Determine where skill installation logic lives (e.g., `packages/iatools/src/commands/init.ts` or `install.ts`).
- [x] Update the fetching logic to bypass prompting for all repository skills.
- [x] Retrieve suggested skills from `packages/iatools/src/roles/index.ts` based on the user's role.
- [x] Implement the automatic installation of these suggested skills.
- [x] (Optional) Add an `--all` flag to support the legacy behavior of prompting for all skills.

## Phase 2: Prune and Update `sdd-*` Skills Only
- [x] Locate the update command handler (likely tied to an `--update` flag during init or a specific `update` command).
- [x] Modify the logic to filter skills based on the `sdd-*` prefix when `--update` is provided.
- [x] Implement pruning: delete the existing directory for each matched `sdd-*` skill before downloading it again.
- [x] Ensure skills without the `sdd-` prefix are skipped during this process.

## Phase 3: Windows Symlink Fallback
- [x] Find the function responsible for creating symlinks (e.g., `fs.ensureSymlink` calls).
- [x] Wrap the symlink creation in a `try...catch` block.
- [x] Catch `EPERM` errors specifically.
- [x] Fall back to using `fs.copy` (with overwrite enabled) when an `EPERM` error occurs.

## Phase 4: Arguments in Workflow Commands (N/A)
- [x] Locate the workflow parsing logic (e.g., `packages/iatools/src/workflows/runner.ts` or similar). *(N/A - Execution is purely AI-driven via Copilot context)*
- [x] Update the parsing mechanism to correctly tokenise workflow commands and their arguments (e.g., `/sdd-plan <arg>`). *(N/A - Natively handled by the AI)*
- [x] Ensure the execution engine (e.g., `child_process.spawn`) correctly receives and passes these arguments. *(N/A - Workflows execute autonomously via AI agents, no runner logic needed here)*
