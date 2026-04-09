---
name: sdd-archive
description: Archive a completed change — merge delta specs into openspec/specs/ and move the change folder to archive/.
argument-hint: [options]
---


# Skill: `/sdd-archive`

## Purpose
Complete the SDD lifecycle for a change. Merge its delta specs into the main `openspec/specs/` source of truth, then move the change folder to `openspec/changes/archive/`.

## Pre-conditions
- All tasks in `tasks.md` are checked `[x]`
- `/sdd-verify` has been run with no CRITICAL issues

## Steps

1. **Identify the change** from argument or context.

2. **Confirm readiness**: read `tasks.md` and verify all boxes are `[x]`. If not, warn and halt.

3. **Merge delta specs** into `openspec/specs/`:
   - For each file in `openspec/changes/<name>/specs/`:
     - If the corresponding `openspec/specs/<path>` exists: merge ADD/MODIFY/REMOVE sections intelligently
     - If it does not exist: copy the delta spec as a new spec file
   - Update `.openspec.yaml` → `status: archived`

4. **Move the change folder**:
   ```
   openspec/changes/<name>/  →  openspec/changes/archive/<YYYY-MM-DD>-<name>/
   ```

5. **Confirm**:
   ```
   ✓ Delta specs merged into openspec/specs/
   ✓ Archived to openspec/changes/archive/<date>-<name>/
   
   Ready for the next change!
   ```

## Rules
- Never archive with CRITICAL verify issues
- Never manually edit `openspec/specs/` — always use archive or sync
- The archive directory is permanent — do not delete archived changes
- After archiving, `openspec/specs/` becomes the updated source of truth
