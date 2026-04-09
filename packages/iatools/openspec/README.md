# iatools — Spec-Driven Development

This project uses the **Spec-Driven Development (SDD)** framework, powered by `@nx-cardbuilding/iatools`.

## Quick Start

```
/sdd-explore [topic]          # Think before you build
/sdd-new <change-name>        # Start a new change
/sdd-ff [change-name]         # Generate all planning artifacts
/sdd-apply [change-name]      # Implement tasks
/sdd-verify [change-name]     # Validate implementation
/sdd-archive [change-name]    # Archive and merge specs
```

## Folder Structure

```
openspec/
├── config.yaml          # Project configuration
├── schemas/
│   └── spec-driven.yaml # Artifact dependency graph
├── specs/               # 📚 Source of truth — current system state
│   ├── architecture.md
│   ├── packages.md
│   └── coding-standards.md
└── changes/             # 🔄 In-progress changes
    └── <change-name>/
        ├── .openspec.yaml   # Change metadata
        ├── proposal.md      # Why + scope
        ├── specs/           # Delta specs (what changes)
        ├── design.md        # How (technical approach)
        └── tasks.md         # Implementation checklist
```

## The Lifecycle

```
explore → new → ff → apply → verify → archive
```

1. **explore**: Investigate freely, no artifacts created
2. **new**: Create `openspec/changes/<name>/`
3. **ff**: Generate `proposal → specs → design → tasks`
4. **apply**: Implement tasks one by one
5. **verify**: Validate completeness, correctness, coherence
6. **archive**: Merge specs, move change to `archive/`

## Adding External Skills

```bash
npx @nx-cardbuilding/iatools skills add <github-url> --skill <skill-id>
```

Example:
```bash
npx @nx-cardbuilding/iatools skills add \
  https://github.com/kadajett/agent-nestjs-skills \
  --skill nestjs-best-practices
```

## Updating the Framework

```bash
npx @nx-cardbuilding/iatools update
```
