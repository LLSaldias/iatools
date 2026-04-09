---
description: Structured template for creating handoff documents when transferring work context between sessions, agents, or humans.
---

# Handoff Document

> Use this template when ending a session with work in progress, switching tasks, or handing off to another agent/human.

---

## Metadata

```yaml
date: "{{DATE}}"
git_commit: "{{COMMIT}}"
branch: "{{BRANCH}}"
topic: "{{TOPIC}}"
status: in-progress
```

---

## Task(s)

| Task | Status | Notes |
|------|--------|-------|
| Task 1 | ✅ Complete | Brief note |
| Task 2 | 🔄 In Progress | Where you left off |
| Task 3 | 📋 Planned | What needs to be done |

---

## Critical References

> List 2-3 most important files/documents that must be understood to continue.

- `path/to/critical/file.ts` — Why it's critical

---

## Recent Changes

> Files modified in this session with brief descriptions.

- `src/module/handler.ts:45-67` — Added validation logic
- `src/api/routes.ts:12` — New endpoint registered

---

## Learnings

> Important discoveries that someone continuing this work should know.

1. **Learning Title**: Description
   - File: `path/to/relevant/file:line`

---

## Artifacts

> Files created or updated during this session.

- `plans/YYYY-MM-DD-feature.md` — Implementation plan
- `src/new-feature/` — New feature directory

---

## Action Items & Next Steps

1. [ ] **Action 1** — Details
2. [ ] **Action 2** — Details

---

## Blockers / Open Questions

- **Blocker/Question 1**: Description and context

---

## Other Notes

- Any additional useful information for the next session.
