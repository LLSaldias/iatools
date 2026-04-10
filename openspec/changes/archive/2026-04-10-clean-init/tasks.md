# Tasks — clean-init

> Change: `clean-init`  
> Created: 2026-04-08  
> Status: ready to implement

## Task List

---

### Task 1 — Delete `architecture.md` template

**File:** `packages/iatools/templates/openspec/specs/architecture.md`  
**Action:** Delete the file.  
**Verify:** File no longer exists at that path.

---

### Task 2 — Delete `coding-standards.md` template

**File:** `packages/iatools/templates/openspec/specs/coding-standards.md`  
**Action:** Delete the file.  
**Verify:** File no longer exists at that path.

---

### Task 3 — Update template README folder structure

**File:** `packages/iatools/templates/openspec/README.md`  
**Action:** Replace the `specs/` folder listing in the folder structure diagram.

**Find:**
```
├── specs/               # 📚 Source of truth — current system state
│   ├── architecture.md
│   ├── packages.md
│   └── coding-standards.md
```

**Replace with:**
```
├── specs/               # 📚 Source of truth — current system state
│   └── (your specs go here, created via /sdd-archive)
```

**Verify:** README renders the updated folder tree with no reference to the deleted files.

---

### Task 4 — Ensure `openspec/specs/` is created even when empty

**File:** `packages/iatools/src/utils/scaffolders.ts`  
**Function:** `scaffoldOpenspec`  
**Action:** Add an explicit `ensureDir` call for the `specs/` subdirectory, alongside the existing `ensureDir` call for `changes/`.

**Find (existing block):**
```typescript
  await copyTemplateDir(openspecSrc, openspecDest, vars, overwrite);
  await ensureDir(path.join(openspecDest, 'changes'));
```

**Replace with:**
```typescript
  await copyTemplateDir(openspecSrc, openspecDest, vars, overwrite);
  await ensureDir(path.join(openspecDest, 'changes'));
  await ensureDir(path.join(openspecDest, 'specs'));
```

**Rationale:** `copyTemplateDir` is recursive and only creates destination dirs when it encounters source subdirectories with contents. With an empty `templates/openspec/specs/` dir, it will never create `openspec/specs/` in the target project. The explicit `ensureDir` guarantees the directory exists regardless.

**Verify:** After `scaffoldOpenspec` runs against a temp dir, `openspec/specs/` exists and is empty.

---

### Task 5 — Run tests

**Action:** Run the full iatools test suite.  
**Command:** `cd packages/iatools && npm test`  
**Verify:** All tests pass with no regressions.

---

## Acceptance Checklist

- [x] `templates/openspec/specs/architecture.md` deleted
- [x] `templates/openspec/specs/coding-standards.md` deleted
- [x] `templates/openspec/README.md` updated — no mention of deleted files
- [x] `scaffoldOpenspec` explicitly ensures `openspec/specs/` is created
- [x] All tests pass
