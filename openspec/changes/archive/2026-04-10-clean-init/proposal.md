# Proposal — clean-init

> Change: `clean-init`  
> Created: 2026-04-08  
> Status: planning

## Problem Statement

When the `init` command runs, `scaffoldOpenspec` copies the entire `templates/openspec/` directory into the target project. This includes two opinionated spec files:

- `openspec/specs/architecture.md` — hardcoded Lerna monorepo / JFrog / NestJS references
- `openspec/specs/coding-standards.md` — hardcoded JS/TS conventions with `@nx-cardbuilding` package names

These files contain card-building-framework–specific assumptions that are incorrect for any other project that runs `iatools init`. A fresh user's project ends up with specs that describe the wrong system, polluting their openspec from the start.

## Proposed Solution

Remove `architecture.md` and `coding-standards.md` from the set of files copied during `init`. Users will author their own specs after initialization.

### What changes

| File | Action |
|---|---|
| `packages/iatools/templates/openspec/specs/architecture.md` | Delete |
| `packages/iatools/templates/openspec/specs/coding-standards.md` | Delete |
| `packages/iatools/src/utils/scaffolders.ts` `scaffoldOpenspec` | No code change needed — files are gone, directory copy stops including them |
| `packages/iatools/templates/openspec/README.md` | Update spec listing to reflect no pre-built specs ship at init time |

### What does NOT change

- The `openspec/specs/` directory is still created (via `copyTemplateDir`)
- `openspec/changes/` still gets `.gitkeep`
- All other template content (agents, workflows, skills, schemas) remains unchanged
- Existing user projects are unaffected (files already written are not deleted)

## Rationale

- **Correctness over convenience** — a blank spec dir is better than a wrong one
- **Zero assumptions** — iatools should bootstrap structure, not content
- **User autonomy** — architecture and coding standards are team decisions, not defaults

## Out of Scope

- Generating project-specific specs via prompts during `init`
- Adding any new template stubs or placeholder files
- Modifying other scaffolding functions

## Success Criteria

1. Running `iatools init` on a clean project does **not** produce `openspec/specs/architecture.md` or `openspec/specs/coding-standards.md`
2. `openspec/specs/` directory still exists after init (empty)
3. `openspec/README.md` accurately reflects the empty initial state of `specs/`
4. All existing tests pass
