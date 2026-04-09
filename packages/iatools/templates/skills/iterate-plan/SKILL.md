---
name: iterate-plan
description: Iterate on existing implementation plans with thorough research and updates. Use this when modifying a plan, updating requirements, or refining implementation approach.
---

# Iterate Implementation Plan

You are tasked with updating existing implementation plans based on user feedback. You should be skeptical, thorough, and ensure changes are grounded in actual codebase reality.

## Initial Response

1. **Parse the input to identify**:
   - Plan file path
   - Requested changes/feedback

2. **Handle different scenarios**:

   **If NO plan file provided**:

   ```
   I'll help you iterate on an existing implementation plan.

   Which plan would you like to update? Please provide the path.

   Tip: List recent plans with `ls -lt plans/ | head`
   ```

   **If plan file provided but NO feedback**:

   ```
   I've found the plan at [path]. What changes would you like to make?

   For example:
   - "Add a phase for migration handling"
   - "Update the success criteria"
   - "Adjust the scope to exclude feature X"
   ```

   **If BOTH provided**: Proceed immediately

## Process Steps

### Step 1: Read and Understand Current Plan

1. **Read the existing plan file COMPLETELY**
2. **Understand the current structure, phases, and scope**
3. **Note success criteria and implementation approach**

### Step 2: Research If Needed

**Only research if changes require new technical understanding.**

If the user's feedback requires understanding new code patterns:

1. Search for relevant files
2. Read and understand the code
3. Verify facts before making changes

### Step 3: Propose Changes

```markdown
## Proposed Plan Updates

### Changes to Scope

- [What's being added/removed/modified]

### Changes to Phases

- Phase [N]: [Change description]
- New Phase [M]: [Description]

### Changes to Success Criteria

- [Updated criteria]

### Changes to Timeline

- [Updated estimates if applicable]

Here's the updated plan section:
[Show the specific sections that will change]

Shall I apply these changes?
```

Wait for approval before modifying.

### Step 4: Apply Changes

1. **Update the plan file**
2. **Maintain consistent formatting**
3. **Update metadata** (last_updated date, etc.)
4. **Confirm the update**:

   ```
   Plan updated successfully at [path].

   Summary of changes:
   - [Change 1]
   - [Change 2]

   The plan is ready for implementation.
   ```

## Handling Conflicts

If requested changes conflict with codebase reality:

```
I found a conflict with the requested changes:

Requested: [What user asked for]
Codebase reality: [What actually exists with file:line references]

Options:
A) [Adjusted approach that accounts for reality]
B) [Alternative approach]
C) [Proceed with original request despite conflict]

Which would you prefer?
```

## Guidelines

- **Verify before changing**: Don't just accept feedback; verify it against the codebase
- **Maintain consistency**: Keep the plan's structure and formatting
- **Be thorough**: If one change affects other parts, update those too
- **Preserve intent**: Ensure the overall goal remains achievable
