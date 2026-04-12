---
description: Start a new SDD change and create the base structure
---
# Workflow: SDD New

Uses the `sdd-new` skill to start a new Spec-Driven Development change.

## Usage

```
/sdd-new <change-name>
```

## Steps

// turbo
1. Read `.agent/skills/sdd-new.md` for the full skill instructions.
2. Follow all steps in the skill to create `openspec/changes/<change-name>/` and write `.openspec.yaml`.
3. Confirm creation and tell the user to run `/sdd-ff` or `/sdd-continue`.
