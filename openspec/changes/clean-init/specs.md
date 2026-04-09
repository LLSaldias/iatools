# Specs — clean-init

> Change: `clean-init`  
> Created: 2026-04-08

## Scope

This spec covers the changes required to stop the `init` command from writing opinionated spec files (`architecture.md`, `coding-standards.md`) into user projects.

---

## Spec 1 — Template Files Removed

**What:** Delete the two spec template files from the `templates/openspec/specs/` directory.

**Files deleted:**
- `packages/iatools/templates/openspec/specs/architecture.md`
- `packages/iatools/templates/openspec/specs/coding-standards.md`

**Invariant:** The `templates/openspec/specs/` directory itself is retained (empty). The existing `copyTemplateDir` call in `scaffoldOpenspec` will continue to create `openspec/specs/` in the target project — just without any files inside.

**Constraint:** No changes to `scaffoldOpenspec` logic are required; removing the template files is sufficient.

---

## Spec 2 — Template README Updated

**What:** Update `packages/iatools/templates/openspec/README.md` to remove the references to `architecture.md` and `coding-standards.md` from the folder structure diagram.

**Before (folder structure section):**
```
└── specs/               # 📚 Source of truth — current system state
    ├── architecture.md
    ├── packages.md
    └── coding-standards.md
```

**After:**
```
└── specs/               # 📚 Source of truth — current system state
    └── (your specs go here, created via /sdd-archive)
```

**Constraint:** No other content in the README changes.

---

## Spec 3 — No Scaffolding Code Changes

**What:** `packages/iatools/src/utils/scaffolders.ts` — `scaffoldOpenspec` — is **not** modified.

**Rationale:** The function uses `copyTemplateDir` which copies whatever is in `templates/openspec/`. Once the two spec files are removed from the template, the function's behavior automatically becomes correct. Adding an exclusion list would be unnecessary complexity.

---

## Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Backward compatibility | Existing projects with the files already written are unaffected |
| Empty dir creation | `openspec/specs/` is still created by `scaffoldOpenspec` |
| Test coverage | Existing unit tests for `scaffoldOpenspec` must continue to pass |
