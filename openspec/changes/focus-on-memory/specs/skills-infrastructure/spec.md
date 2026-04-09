# Spec: Skills Infrastructure — focus-on-memory

> Delta spec. Applies to `packages/iatools`.

## Domain
Skills management utilities and lock file infrastructure.

## Requirements

### MUST
- **S-INFRA-01**: `src/utils/skills-helper.ts` MUST be deleted.
- **S-INFRA-02**: `src/utils/skills-installer.ts` MUST be deleted.
- **S-INFRA-03**: `src/commands/skills-add.ts` MUST be deleted.
- **S-INFRA-04**: `packages/skills-lock.json` (root level inside `packages/`) MUST be deleted.
- **S-INFRA-05**: `packages/iatools/skills-lock.json` MUST be deleted.
- **S-INFRA-06**: No remaining source file in `src/` MUST import from `skills-helper`, `skills-installer`, or `skills-add`.

### SHOULD
- **S-INFRA-07**: The `RoleProfile.suggestedExternalSkills` field SHOULD be removed from the `RoleProfile` interface to eliminate dead schema.
- **S-INFRA-08**: All `ROLES` entries SHOULD have their `suggestedExternalSkills` arrays removed.

### MAY
- **S-INFRA-09**: The `ExternalSkill` interface type MAY be removed along with the field.

## Scenarios

### Scenario 1: No orphan imports
```
Given the deleted files are removed
When TypeScript compiles the project
Then no TS2305/TS2307 errors appear referencing deleted modules
```

### Scenario 2: Roles still work without suggestedExternalSkills
```
Given the suggestedExternalSkills field is removed from all roles
When the Roles registry tests run
Then all existing role assertions pass
And no test references suggestedExternalSkills
```
