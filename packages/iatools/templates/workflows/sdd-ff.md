---
description: Genera o actualiza Specs y Planes Automáticamente
---
# Workflow: SDD Fast-Forward

Uses the `sdd-ff` skill to create all planning artifacts at once.

## Usage

```
/sdd-ff [change-name]
```

## Steps

1. Read `.agent/skills/sdd-ff.md` for the full skill instructions.
2. Identify the change (from argument or context).
3. Follow the skill: create `proposal.md`, `specs/`, `design.md`, `tasks.md` in order.
4. Announce completion and prompt the user to run `/sdd-apply`.
