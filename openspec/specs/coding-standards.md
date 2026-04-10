# Coding Standards Spec — ls-framework

> **Source of truth** — distilled from `copilot-instructions.md`.  
> Last updated: 2026-04-06

## Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Files | kebab-case | `my-module.ts` |
| Classes / Interfaces | PascalCase | `MyClass`, `IMyInterface` |
| Functions / Variables | camelCase | `myFunction` |
| Constants | UPPER_SNAKE_CASE | `MY_CONSTANT` |
| Package names | `@lsframework/<name>` | `@lsframework/domain` |

## Documentation

- **JSDoc only** — inline `//` comments are forbidden
- Every public function, class, and method requires JSDoc with `@param`, `@returns`, `@example`

## Testing

- Coverage ≥ **80%** per package (line + branch) — non-negotiable
- Test files: `*.test.ts` in `test/unit/`
- Run with `jest --detectOpenHandles`

## TypeScript

- `strict: true` — always enabled
- No `any` without documented justification
- `target: ES2021`, `module: CommonJS`
- Extend root `tsconfig.json` in every package

## Package Structure (mandatory)

```
packages/<name>/
├── src/index.ts
├── test/unit/
├── package.json   (with all required scripts)
├── tsconfig.json  (extends ../../tsconfig.json)
├── jest.config.js
└── CHANGELOG.md
```

## Quality Gates (before every commit)

1. `npm run lint` — passes clean
2. `npm run test` — all pass, ≥80% coverage
3. `npm run dependency-check` — passes
4. `npm run security-check` — passes
