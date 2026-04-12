---
description: Archive a completed change and move the artifacts
---
# Workflow: SDD Archive

Uses the `sdd-archive` skill to complete the SDD lifecycle.

## Usage

```
/sdd-archive [change-name]
```

## Steps

1. Read `.agents/skills/sdd-archive.md` for the full skill instructions.
2. Confirm all tasks are `[x]` and no CRITICAL verify issues exist.
3. Merge delta specs from `changes/<name>/specs/` into `openspec/specs/`.
4. Move `openspec/changes/<name>/` to `openspec/changes/archive/<date>-<name>/`.
5. Announce completion and prompt the user to start the next change.
