# Design: focus-on-memory

## Overview

This is a surgical removal change — no new abstractions, no refactoring beyond what is required. Every decision is aimed at the minimal diff that satisfies the specs.

## File Changes

### Deletions

| File | Reason |
|---|---|
| `src/commands/skills-add.ts` | Entire skills-add command removed |
| `src/utils/skills-helper.ts` | Only consumed by skills-add and init's post-install hook |
| `src/utils/skills-installer.ts` | Only consumed by skills-helper |
| `packages/skills-lock.json` | Skills management bookkeeping — no longer meaningful |
| `packages/iatools/skills-lock.json` | Same |

### Modifications

#### `src/cli.ts`
- Remove `import { runSkillsAdd } from '@/commands/skills-add'`
- Remove the `const skillsCmd = program.command('skills')` block and its `.command('add')` subcommand
- No other changes

#### `src/commands/init.ts`
- Remove `import { maybeInstallSuggestedSkills } from '@/utils/skills-helper'`
- Remove the call `await maybeInstallSuggestedSkills(roles, projectRoot)` inside `handleInitAnswers`
- No other changes

#### `src/commands/update.ts`
- Remove the `for (const entry of skillEntries)` loop that iterates `templates/skills/`
- Remove the `const skillEntries = await fs.readdir(templatesSkillsDir, ...)` and `const templatesSkillsDir = ...` lines
- Update the post-success log message: `'Skills and workflows refreshed from latest templates.'` → `'SDD framework files refreshed from latest templates.'`
- No other changes

#### `src/roles/index.ts`
- Remove the `ExternalSkill` interface
- Remove the `suggestedExternalSkills` field from the `RoleProfile` interface
- Remove `suggestedExternalSkills: [...]` arrays from every role entry in `ROLES`
- No other changes

#### `test/unit/iatools.test.ts`
- Remove the test `'backend role should suggest nestjs-best-practices skill'`
- No other changes

## Data Flow: init (after change)

```
iatools init
  └─► promptForInit()
        └─► handleInitAnswers()
              ├─► scaffoldAll() — copies local templates only
              ├─► scaffoldVsCodeSettings() (if copilot)
              └─► postInitMessages()
              [END — no network call]
```

## Data Flow: update (after change)

```
iatools update
  └─► copyTemplateDir(templates/agents/  → .agents/)
  └─► copyTemplateDir(templates/workflows/ → .agents/workflows/)
  └─► copyTemplateDir(templates/openspec/ → openspec/ schemas only)
  └─► [optionally] overwrite constitution (--force)
  [END — templates/skills/ never touched]
```

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Orphan import leaving TS error | Low | Removing both the import and the call in same edit |
| Test asserting `suggestedExternalSkills` breaks build | Medium | Explicitly remove that test case |
| `axios` dep left unused after removing skills-add | Low | Check `package.json` — `axios` may be used elsewhere; verify before removing |

## Dependencies to Check

`axios` is imported only in `skills-add.ts` and nowhere else in `src/`. It MUST be removed from `packages/iatools/package.json` `dependencies` after the file is deleted.
