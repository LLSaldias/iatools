# Spec: Test Coverage — focus-on-memory

> Delta spec. Applies to `packages/iatools/test/`.

## Domain
Unit test suite integrity post-removal.

## Requirements

### MUST
- **S-TEST-01**: All existing tests in `iatools.test.ts` MUST pass after the change.
- **S-TEST-02**: Any test that asserts `suggestedExternalSkills` on a role MUST be updated to remove that assertion.
- **S-TEST-03**: No test file MUST import from deleted modules (`skills-helper`, `skills-installer`, `skills-add`).

### SHOULD
- **S-TEST-04**: The test that asserts `backend role should suggest nestjs-best-practices skill` SHOULD be removed or replaced with a test that confirms `suggestedExternalSkills` no longer exists on roles.

## Scenarios

### Scenario 1: Full test suite passes
```
Given all code changes are applied
When `jest` runs the full test suite
Then 0 tests fail
And 0 tests are skipped due to removed functionality
```
