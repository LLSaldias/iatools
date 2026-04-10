# Tasks: focus-on-memory

## Group 1 — Delete removed files

- [x] **T-01** Delete `packages/iatools/src/commands/skills-add.ts`
- [x] **T-02** Delete `packages/iatools/src/utils/skills-helper.ts`
- [x] **T-03** Delete `packages/iatools/src/utils/skills-installer.ts`
- [x] **T-04** Delete `packages/skills-lock.json`
- [x] **T-05** Delete `packages/iatools/skills-lock.json`

## Group 2 — Modify `cli.ts`

- [x] **T-06** Remove `import { runSkillsAdd } from '@/commands/skills-add'` from `src/cli.ts`
- [x] **T-07** Remove the `const skillsCmd = program.command('skills')` block and its `.command('add')` child from `src/cli.ts`

## Group 3 — Modify `init.ts`

- [x] **T-08** Remove `import { maybeInstallSuggestedSkills } from '@/utils/skills-helper'` from `src/commands/init.ts`
- [x] **T-09** Remove the `await maybeInstallSuggestedSkills(roles, projectRoot)` call from `handleInitAnswers` in `src/commands/init.ts`

## Group 4 — Modify `update.ts`

- [x] **T-10** Remove the `const templatesSkillsDir` variable and `const skillEntries = await fs.readdir(...)` call from `src/commands/update.ts`
- [x] **T-11** Remove the `for (const entry of skillEntries)` loop (the entire skills-refresh block) from `src/commands/update.ts`
- [x] **T-12** Update the post-success log message in `src/commands/update.ts`: `'Skills and workflows refreshed from latest templates.'` → `'SDD framework files refreshed from latest templates.'`

## Group 5 — Modify `roles/index.ts`

- [x] **T-13** Remove the `ExternalSkill` interface from `src/roles/index.ts`
- [x] **T-14** Remove the `suggestedExternalSkills: ExternalSkill[]` field from the `RoleProfile` interface in `src/roles/index.ts`
- [x] **T-15** Remove the `suggestedExternalSkills: [...]` array from every role entry (`frontend`, `backend`, `qa`, `architect`, `product`) in `ROLES`

## Group 6 — Remove `axios` dependency

- [x] **T-16** Remove `"axios"` from `dependencies` in `packages/iatools/package.json`

## Group 7 — Update tests

- [x] **T-17** Remove the test case `'backend role should suggest nestjs-best-practices skill'` from `test/unit/iatools.test.ts`

## Group 8 — Verify

- [x] **T-18** Run `npx tsc --noEmit` in `packages/iatools/` — zero errors expected
- [x] **T-19** Run `jest` in `packages/iatools/` — all tests pass
- [x] **T-20** Run `iatools --help` — `skills` command must not appear in output
- [x] **T-21** Run `iatools init` in a network-restricted context (or verify no axios/https calls remain in init path)
