# Init Scaffolding Spec — ls-framework

> **Source of truth** — updated via `/sdd-archive` only.  
> Last updated: 2026-04-10  
> Origin: `clean-init` change

## Scope

Defines what the `iatools init` command scaffolds into user projects via `scaffoldOpenspec`.

---

## Spec 1 — No Opinionated Spec Templates

The `init` command does **not** ship pre-built spec files (`architecture.md`, `coding-standards.md`) into user projects. The `templates/openspec/specs/` directory is empty.

**Invariant:** Users author their own specs after initialization. The framework bootstraps structure, not content.

---

## Spec 2 — Template README Reflects Empty State

`packages/iatools/templates/openspec/README.md` shows the `specs/` directory as empty with a placeholder:

```
├── specs/               # 📚 Source of truth — current system state
│   └── (your specs go here, created via /sdd-archive)
```

---

## Spec 3 — Explicit `ensureDir` for `specs/`

`scaffoldOpenspec` in `packages/iatools/src/utils/scaffolders.ts` includes an explicit `ensureDir` call for the `specs/` subdirectory, guaranteeing it exists even when the template directory is empty.

---

## Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Backward compatibility | Existing projects with spec files already written are unaffected |
| Empty dir creation | `openspec/specs/` is always created by `scaffoldOpenspec` |
| Test coverage | Existing unit tests for `scaffoldOpenspec` must continue to pass |
