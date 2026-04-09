# Design — clean-init

> Change: `clean-init`  
> Created: 2026-04-08

## Overview

This change requires three surgical file operations. No logic changes, no new abstractions. The full effect is achieved by modifying the template directory that `scaffoldOpenspec` copies.

---

## 1. Delete Template Spec Files

**Files to delete:**
- `packages/iatools/templates/openspec/specs/architecture.md`
- `packages/iatools/templates/openspec/specs/coding-standards.md`

**Mechanism:** `scaffoldOpenspec` calls `copyTemplateDir(openspecSrc, openspecDest, vars, overwrite)`. Removing these two files from the source tree means they will never appear in the destination. No code in `scaffoldOpenspec` needs to change.

**Edge case — empty directory:** After deletion, `templates/openspec/specs/` will be an empty directory. `copyTemplateDir` must still create `openspec/specs/` at the destination even when the source dir is empty. Verify this behavior holds; if not, add an explicit `ensureDir` call in `scaffoldOpenspec` for the `specs/` subdirectory.

```
templates/openspec/specs/   ← empty after this change
         ↓ copyTemplateDir
openspec/specs/             ← still created, just empty
```

---

## 2. Update Template README

**File:** `packages/iatools/templates/openspec/README.md`

**Change:** Replace the `specs/` block in the folder structure diagram.

**Before:**
```
├── specs/               # 📚 Source of truth — current system state
│   ├── architecture.md
│   ├── packages.md
│   └── coding-standards.md
```

**After:**
```
├── specs/               # 📚 Source of truth — current system state
│   └── (your specs go here, created via /sdd-archive)
```

This is a string replacement in a single Markdown file — no logic involved.

---

## 3. Verify `copyTemplateDir` Handles Empty Source Dirs

**File:** `packages/iatools/src/utils/file-writer.ts` (or wherever `copyTemplateDir` is defined)

**Action (read-only verification):** Confirm that `copyTemplateDir` calls `fs.ensureDir` or equivalent on the destination before iterating source entries. If it does, no change is needed. If it only creates directories when it finds files to copy, add an explicit `ensureDir` for `specs/` inside `scaffoldOpenspec`.

**Decision rule:** Make the minimal change needed. Prefer adding `ensureDir` in `scaffoldOpenspec` over modifying `copyTemplateDir` (single-responsibility).

---

## Implementation Order

1. Read `copyTemplateDir` implementation → decide if `ensureDir` is needed
2. Delete the two template files
3. Update `README.md` template
4. (If needed) add `ensureDir` call for `specs/` in `scaffoldOpenspec`
5. Run existing tests to confirm no regressions

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| `openspec/specs/` not created on empty src dir | Low | Verify `copyTemplateDir`; add `ensureDir` if needed |
| Test asserting file existence of deleted templates | None | Confirmed via search — no such assertions exist |
| Existing user projects broken | None | `init` does not delete files, only writes new ones |
