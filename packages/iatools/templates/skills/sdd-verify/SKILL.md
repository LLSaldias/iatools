---
name: sdd-verify
description: Validate implementation against the change's specs, design, and tasks. Reports CRITICAL, WARNING, and SUGGESTION issues.
argument-hint: [options]
---


# Skill: `/sdd-verify`

## Purpose
Check that the implementation matches what was specified. Surfaces issues before archiving.

## Verification Dimensions

| Dimension | What to check |
|---|---|
| **Completeness** | All tasks checked, all requirements implemented, all scenarios covered |
| **Correctness** | Implementation matches spec intent, edge cases handled |
| **Coherence** | Design decisions reflected in code, naming consistent, no drift |

## Steps

1. **Identify the change** from argument or context.

2. **Read all artifacts**:
   - `tasks.md` — check completion status
   - `specs/` — requirements and scenarios
   - `design.md` — technical decisions
   - `proposal.md` — intent and scope

3. **Search the codebase** for evidence of each requirement and task.

4. **For each dimension, produce a report**:
   ```
   COMPLETENESS
   ✓ All N tasks in tasks.md are checked [x]
   ✓ Requirement "..." has corresponding code in <file>
   ⚠ Scenario "..." has no test coverage
   
   CORRECTNESS
   ✓ Implementation matches spec intent
   ✗ Edge case "empty list" not handled (CRITICAL)
   
   COHERENCE
   ✓ Design decisions reflected in code
   ⚠ Design says "use CSS variables" but code uses inline styles
   ```

5. **Summary**:
   ```
   SUMMARY
   ──────────────────
   Critical issues: N
   Warnings: N
   Suggestions: N
   Ready to archive: Yes / No
   ```

## Severity Levels
- **CRITICAL** — blocks archive; must be resolved
- **WARNING** — should be addressed; does not block archive
- **SUGGESTION** — improvement opportunity; informational only

## Rules
- Do not modify any files during verify
- Do not archive if CRITICAL issues exist
- Report honestly — do not suppress warnings
