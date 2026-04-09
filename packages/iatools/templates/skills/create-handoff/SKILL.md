---
name: create-handoff
description: Create handoff document for transferring work to another session. Use this when ending a session with work in progress, needing to preserve context, or before switching tasks.
---

# Create Handoff

You are tasked with writing a handoff document to preserve context for resuming work later. The handoff should be thorough but **concise**. The goal is to compact and summarize context without losing key details.

## Resources

This skill includes supporting files:

- **References**:
  - [handoff-template.md](../../human-layers/handoff-template.md) - Handoff document template and guidelines

## When to Use

- Before ending a session with work in progress
- When context is getting large and needs compaction
- Before switching to a different task
- To preserve learnings for future reference

## Process

### Step 1: Gather Metadata

```bash
# Current date/time
date +"%Y-%m-%d %H:%M:%S"

# Current git state
git rev-parse HEAD
git branch --show-current
git status --short
```

### Step 2: Write the Handoff Document

Use this template:

```markdown
---
date: [Current date and time]
git_commit: [Current commit hash]
branch: [Current branch name]
topic: "[Feature/Task Name]"
status: in-progress
---

# Handoff: [Concise description]

## Task(s)

[Description of the task(s) you were working on, with status of each]

| Task     | Status         | Notes                   |
| -------- | -------------- | ----------------------- |
| [Task 1] | ✅ Complete    | [Brief note]            |
| [Task 2] | 🔄 In Progress | [Where you left off]    |
| [Task 3] | 📋 Planned     | [What needs to be done] |

## Critical References

[List 2-3 most important files/documents that must be understood]

- `path/to/critical/file.ts` - [Why it's critical]

## Recent Changes

[Files modified in this session with brief description]

- `src/auth/handler.ts:45-67` - Added JWT validation
- `src/api/routes.ts:12` - New auth endpoint

## Learnings

[Important discoveries that someone continuing this work should know]

1. **[Learning Title]**: [Description]
   - File: `path/to/relevant/file:line`

## Artifacts

[Files created or updated]

- `plans/2026-02-11-feature.md` - Implementation plan
- `src/new-feature/` - New feature directory

## Action Items & Next Steps

1. [ ] **[Action 1]** - [Details]
2. [ ] **[Action 2]** - [Details]

## Blockers / Open Questions

- **[Blocker/Question 1]**: [Description]

## Other Notes

- [Any other useful information]
```

### Step 3: Save the Handoff

Save to `handoffs/YYYY-MM-DD_HH-MM-SS_description.md`

### Step 4: Confirm

```
Handoff created!

Location: handoffs/2026-02-11_14-30-22_auth-implementation.md

To resume later, reference this file at the start of your next session.
```

## Guidelines

- **More information, not less**: Include details that might be forgotten
- **Be thorough and precise**: Top-level objectives AND lower-level details
- **Avoid excessive code snippets**: Use `file:line` references instead
- **Reference, don't duplicate**: Point to files rather than copying content
