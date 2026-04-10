---
name: constitution
description: Master constitution for all AI agents working on ls-framework. Defines hard rules, SDD workflow phases, and quality gates.
---

# Agent Constitution — ls-framework

**Project**: ls-framework  
**Setup date**: 2026-04-06  
**Roles active**:   
**IDE**: GitHub Copilot (VS Code), Gemini / Antigravity

---

## 1. Spec-Driven Development (SDD) — First Principle

> **Never write code before specs exist.**

All work follows the SDD lifecycle:

```
/sdd-explore  →  /sdd-new  →  /sdd-ff  →  /sdd-apply  →  /sdd-verify  →  /sdd-archive
```

- `explore`: Think through ideas without structure  
- `new`: Create `openspec/changes/<name>/`  
- `ff (fast-forward)`: Generate `proposal.md → specs/ → design.md → tasks.md`  
- `apply`: Implement tasks from `tasks.md` one by one  
- `verify`: Validate implementation vs. all artifacts  
- `archive`: Merge delta specs into `openspec/specs/`  

---

## 2. Coding Standards

All coding work must follow the rules in `copilot-instructions.md` at the project root:

- **No inline comments** — JSDoc only on all public functions and classes
- **TypeScript strict mode** — `strict: true`, no `any` without documented justification
- **Test coverage ≥ 80%** per package — not negotiable
- **Naming**: kebab-case files, PascalCase classes, camelCase functions, UPPER_SNAKE_CASE constants
- **Package names**: `@lsframework/<package-name>`
- **Never create files outside `packages/`** (except SDD framework files in `openspec/` and `.agents/`)

---

## 3. SDD Hard Rules

1. **A change folder must exist** before any implementation begins
2. **`tasks.md` must exist** before running `/sdd-apply`
3. **`/sdd-verify` must pass** (no CRITICAL issues) before archiving
4. **Delta specs must be merged** via `/sdd-archive` or `/sdd-sync` — never manually
5. **`openspec/specs/`** is read-only during a change — update only via archive
6. **Do not delete** `openspec/changes/` folders without archiving

---

## 4. Quality Gates (must pass before `/sdd-archive`)

- [ ] All `tasks.md` checkboxes are checked `[x]`
- [ ] `npm run test` passes in all affected packages
- [ ] `npm run lint` passes clean
- [ ] `npm run dependency-check` passes
- [ ] `/sdd-verify` reports zero CRITICAL issues

---

## 5. Role-Specific Behavior

See `.agents/roles/` for role-specific personas and focus areas. When multiple roles are active, apply all focus areas and pick the most rigorous standard.

---

## 6. Context Hygiene

- Start `/sdd-apply` with a clean context window
- Read `openspec/changes/<name>/tasks.md` first, then `design.md`, then `specs/`
- Do not load unrelated files into context during implementation
