# Architecture Spec — iatools

> **Source of truth** — updated via `/sdd-archive` only.  
> Last updated: 2026-02-20

## System Overview

iatools is a Lerna monorepo managing multiple TypeScript packages published to the JFrog registry.

## Package Topology

```
packages/
├── domain/          # Domain entities, DTOs, decorators, interfaces
├── domain-events/   # Domain event classes and schema registry
├── proto/           # Protobuf definitions
├── iatools/         # CLI tooling: SDD framework bootstrapper
└── (future packages follow the same structure)
```

## Dependency Rules

- Packages may depend on `domain` and `domain-events`
- `domain` and `domain-events` have NO internal package dependencies
- Circular dependencies are forbidden
- All inter-package imports use `@nx-cardbuilding/<name>` scoped names

## Build Pipeline

```
tsc (compile) → jest (test) → eslint (lint) → depcheck → publish
```

## Key Decisions

| Decision | Rationale |
|---|---|
| Lerna monorepo | Independent versioning, shared tooling |
| CommonJS + ES2021 | NestJS / Node.js compatibility |
| JFrog registry | Internal artifact governance |
| Conventional commits | Automated changelog generation |
