---
name: sdd-ff
description: Fast-forward — generate all planning artifacts (proposal, specs, design, tasks) in one shot for a given change.
argument-hint: [options]
---


# Skill: `/sdd-ff`

## Purpose
Create all planning artifacts in dependency order for a change. Stops when all artifacts required for implementation are complete.

## Artifact Order
```
proposal.md  →  specs/  →  design.md  →  tasks.md
    why            what         how          steps
```

## Steps

1. **Identify the change** from the argument or context. Check `openspec/changes/` for the folder.

2. **Read `.openspec.yaml`** to determine which artifacts are missing.

3. **Create `proposal.md`** (if missing):
   - Intent: why are we doing this? What problem does it solve?
   - Scope: explicit in-scope and out-of-scope
   - Approach: high-level technical direction
   - Update `.openspec.yaml` → `proposal: done`

4. **Create `specs/` directory** and populate with delta spec files (if missing).  
   Each spec covers one domain area: `specs/<domain>/spec.md`
   - Requirements (MUST / SHOULD / MAY)
   - Scenarios (Given/When/Then or narrative)
   - Update `.openspec.yaml` → `specs: done`

5. **Create `design.md`** (if missing):
   - Technical approach and architecture decisions
   - Data flow diagrams (Mermaid if helpful)
   - File changes list
   - Update `.openspec.yaml` → `design: done`

6. **Create `tasks.md`** (if missing):
   - Grouped, numbered, checkbox tasks
   - Covers all requirements from specs
   - Update `.openspec.yaml` → `tasks: done`

7. **Announce completion**:
   ```
   ✓ proposal.md
   ✓ specs/<domain>/spec.md
   ✓ design.md
   ✓ tasks.md
   
   All planning artifacts complete!
   Run /sdd-apply to begin implementation.
   ```

## Rules
- Read the previous artifact before creating the next one
- Do not create code during this phase
- Each artifact must reference the one before it for consistency
- Apply role-specific focus areas when writing specs and design
