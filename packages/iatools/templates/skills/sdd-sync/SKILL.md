---
name: sdd-sync
description: Merge outstanding delta specs from all active changes into openspec/specs/ without archiving the changes.
argument-hint: [options]
---


# Skill: `/sdd-sync`

## Purpose
Synchronize `openspec/specs/` with delta specs from all active (non-archived) changes. Useful when multiple parallel changes are in flight and you want a consistent view of the current system state.

## Steps

1. **List all active changes** in `openspec/changes/` (excluding `archive/`).

2. **For each active change**, find delta spec files in `changes/<name>/specs/`.

3. **Merge each delta** into `openspec/specs/` (same logic as `/sdd-archive` but without moving the change folder).

4. **Report**:
   ```
   Synced delta specs from 3 active changes:
   ✓ add-payment-gateway → openspec/specs/payments/spec.md
   ✓ refactor-auth       → openspec/specs/auth/spec.md
   ✓ add-notifications   → openspec/specs/notifications/spec.md
   ```

## Rules
- Only merge `ADD` and `MODIFY` sections from delta specs during sync
- Do not move or modify the change folders themselves
- Warn if two changes modify the same spec section (potential conflict)
- This does NOT replace archiving — always archive when a change is complete
