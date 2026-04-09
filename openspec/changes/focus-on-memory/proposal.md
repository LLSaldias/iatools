# Proposal: focus-on-memory

## Summary
Refocus `iatools` on its two core responsibilities — **Spec-Driven Development (SDD) scaffolding** and the **Memory System** — by removing all skills management capabilities. Skills management is a persistent maintenance burden: remote URLs go stale, skill files drift out of sync, security validation is manual, and the lock file creates friction. These concerns belong to the consuming project, not the framework bootstrapper.

## Problem Statement

The current `iatools` CLI has three areas of concern:

| Area | Commands / Code | Problem |
|---|---|---|
| SDD Scaffolding | `init`, `update` | Core value — keep and maintain |
| Memory System | `memory-export`, `memory/` module | Core value — keep and enhance |
| Skills Management | `skills add`, `maybeInstallSuggestedSkills`, `skills-lock.json` | High maintenance, low value from the tool's perspective |

Skills management issues:
- External GitHub URLs rot silently (HTTP 404, repo renames, branch changes)
- No automated security validation — any URL can inject arbitrary script into `.agents/`
- `skills-lock.json` duplicates package manager semantics in a bespoke format
- `update` command scans `templates/skills/` for `sdd-*` entries, coupling the binary to a specific remote skill taxonomy

## Proposed Changes

### 1. Remove `skills add` command
Delete `src/commands/skills-add.ts` and remove the `skills` subcommand registration from `cli.ts`. Skills management is a user-space concern.

### 2. Remove `maybeInstallSuggestedSkills` from `init`
The `init` wizard calls `maybeInstallSuggestedSkills(roles, projectRoot)` at the end of the setup. This step fetches remote content during project initialization. Remove this call entirely. `init` scaffolds the local structure — pulling remote resources is out of scope.

### 3. Simplify `update` to SDD-core only
The `update` command currently iterates `templates/skills/` to prune and re-copy `sdd-*` skill directories. Remove the skills-refresh logic. `update` should only refresh:
- `templates/agents/` → `.agents/` (constitution, roles)
- `templates/workflows/` → `.agents/workflows/`
- `templates/openspec/` → `openspec/` (schema files only, never `changes/`)

### 4. Remove `skills-lock.json`
Both the root `packages/skills-lock.json` and `packages/iatools/skills-lock.json` exist solely for skills management bookkeeping. Remove them as they no longer serve a purpose.

### 5. Preserve and stabilize the Memory System
The `memory/` module (`database.ts`, `ingestion.ts`, `retrieval.ts`, `types.ts`) and the `memory-export` command stay untouched and healthy. This is the differentiating feature of `iatools` versus a plain cookiecutter.

## Out of Scope
- Adding new memory features (separate change)
- Changing the SDD workflow skip/template behavior
- Modifying existing skill files in `templates/skills/`

## Success Criteria
1. `iatools init` completes without any remote network calls to GitHub skill repos
2. `iatools update` runs without accessing `templates/skills/` directory
3. `iatools skills` command no longer exists
4. `skills-lock.json` files are deleted from the monorepo
5. All existing tests pass
6. `memory-export` still works correctly
