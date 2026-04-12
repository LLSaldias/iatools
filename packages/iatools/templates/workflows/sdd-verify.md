---
description: Verify that the implemented code complies with the Spec
---
# Workflow: SDD Verify

Uses the `sdd-verify` skill to validate implementation.

## Usage

```
/sdd-verify [change-name]
```

## Steps

1. Read `.agent/skills/sdd-verify.md` for the full instructions.
2. Check Completeness, Correctness, and Coherence dimensions.
3. Report issues categorized as CRITICAL, WARNING, or SUGGESTION.
4. If no CRITICAL issues: prompt the user to run `/sdd-archive`.
