---
name: sdd-apply
description: Implement the tasks listed in tasks.md for a given change, one by one.
argument-hint: [options]
---


# Skill: `/sdd-apply`

## Purpose
Work through the implementation checklist in `tasks.md`, writing code and checking off tasks as they are completed.

## Pre-conditions
- `openspec/changes/<name>/tasks.md` must exist
- `openspec/changes/<name>/design.md` must exist

## Steps

1. **Identify the change** from the argument or context.

2. **Read context files** in this order:
   - `tasks.md` — the implementation checklist
   - `design.md` — technical approach reference
   - `specs/` — requirements and scenarios
   - `proposal.md` — intent and scope

3. **Find the first unchecked task** `- [ ]`.

4. **Implement the task**:
   - Write or modify exactly the code needed for that task
   - Follow `copilot-instructions.md` and the active role profiles
   - Never implement more than the current task

5. **Mark the task complete**:
   - Change `- [ ]` to `- [x]` in `tasks.md`

6. **Report progress**:
   ```
   ✓ 1.1 <Task description>
   Working on 1.2...
   ```

7. **Repeat** until all tasks are checked.

8. **Final report**:
   ```
   All tasks complete!
   Run /sdd-verify to validate the implementation.
   ```

## Rules
- **One task at a time** — do not batch-implement multiple tasks
- **Read design.md** if uncertain about technical approach for a task
- **Write tests** as specified in tasks — do not skip test tasks
- **Follow JSDoc rules** — no inline comments
- If a task requires clarification, ask before implementing
- Do not modify `proposal.md`, `specs/`, or `design.md` during apply
