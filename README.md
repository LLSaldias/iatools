# ls-framework

Agentic framework and library repository for AI-driven development.

## 🤖 The Agentic Framework

This repository implements a working environment based on **Spec-Driven Development (SDD)**, using AI agents to accelerate development while following rigorous architecture standards.

### 🛠️ CLI Tool: `iatools`

The core tool is `@lsframework/iatools`, which allows you to initialize and manage the agentic environment in any project. It requires the **Bun** runtime.

Run it directly via `bunx` to ensure you're using the latest version:

```bash
bunx @lsframework/iatools
```

Running with no arguments launches an **interactive TUI menu** (arrow keys to browse, Enter to launch). You can also run commands directly:

```bash
iatools init          # Interactive setup wizard
iatools update        # Refresh skills and workflows
iatools --help        # Show all commands
```

#### Commands

| Command | Description |
|---------|-------------|
| `iatools init` | Interactive wizard — set up the SDD framework |
| `iatools update` | Refresh SDD skills and workflows |
| `iatools changelog` | Generate changelog from archived changes |
| `iatools trace --change <name>` | Trace decision lineage for a change |
| `iatools review <phase> --change <name>` | Decompress and review a .cave artifact |
| `iatools compress --change <name>` | Compress .md artifacts to .cave format |
| `iatools memory query <text>` | Search memory with hybrid retrieval |
| `iatools memory ingest` | Ingest extraction JSON into memory graph |
| `iatools memory export` | Export memory graph to JSON |

---

### 🚀 Workflow Cycle: SDD (Spec-Driven Development)

The SDD workflow allows agents to implement changes based on technical specifications. Commands are executed via "slash commands" in the agent chat:

1.  **`/sdd-new <change-name>`**: Starts a new change, creating the structure in `openspec/changes/`.
2.  **`/sdd-ff` (Fast-Forward)**: Automatically generates planning artifacts (proposal, specifications, design, and tasks).
3.  **`/sdd-apply`**: Implements tasks one by one, writing the necessary code.
4.  **`/sdd-verify`**: Validates the implementation against the specifications and design.
5.  **`/sdd-archive`**: Archives the completed change, integrating the specifications into the "source of truth".

---

### ⏸️ Human Layers and Handoff

As agentic tasks become more complex, the agent may need to pause, delegate context to a human or another agent, and then resume. For this, the framework provides native skills:

1. **`/create-handoff`**: Instructs the agent to create a consolidated "handoff" document (status, changes, pending items, and blockers).
2. **`/iterate-plan`**: Allows iterating on existing implementation plans with research and validation.
3. **Resumption**: To continue work, start a new session and reference the generated handoff file (e.g., *"Read handoffs/file.md and let's continue"*).

---

## 🏗️ Project Structure

```
.
├── openspec/           # System specifications (Source of Truth)
│   ├── specs/          # Architecture, API, persistence, etc.
│   └── changes/        # History of changes made via SDD
├── .agents/            # Agent, skill, and workflow configuration
└── packages/           # Monorepo libraries (Lerna)
    └── iatools/        # SDD framework CLI
```

## 📦 Tech Stack

-   **Runtime**: [Bun](https://bun.sh/) + [TypeScript](https://www.typescriptlang.org/docs)
-   **TUI**: [@opentui/core](https://github.com/nicholasgasior/opentui) — full-screen terminal UI with keyboard navigation
-   **Monorepo Management**: [Lerna](https://lerna.js.org/) (`independent` mode)

---

## 🧑‍💻 Local Development

### Prerequisites

```bash
bun -v    # >= 1.x — install from https://bun.sh
```

### Installation

```bash
# Clone and install dependencies (workspaces)
git clone <repo-url>
cd ls-framework
bun install
```

### Build

```bash
# Build all monorepo packages
bun run compile

# Build only iatools
cd packages/iatools && bun run compile
```

### Tests

```bash
# Run all tests
bun run test

# Only iatools
cd packages/iatools && bun run test
```

### Lint

```bash
bun run lint        # Show errors
bun run fix         # Auto-fix
```

---

## 🔄 Version Bumping and Local Testing

### 1. Version bump with Lerna

The monorepo uses `independent` versioning — each package has its own version.

```bash
# Interactive — select packages and bump type (patch/minor/major)
npx lerna version --no-push

# iatools-specific bump
npx lerna version --scope=@lsframework/iatools --no-push
```

> This updates `package.json`, creates a commit, and a Git tag.

### 2. Manual bump (without Lerna)

Edit `packages/iatools/package.json` directly:

```json
{
  "version": "1.4.0"  // ← change the version here
}
```

### 3. Install locally for testing

After building, register `iatools` as a global link:

```bash
cd packages/iatools
bun run compile
bun link              # registers the package globally
iatools               # launches the interactive TUI menu
iatools --help        # shows styled help
```

### 4. Test in a target project

```bash
cd /path/to/target-project
bun link @lsframework/iatools
iatools init
```

### 5. Unlink

```bash
cd packages/iatools
bun unlink
```

---

## 📋 Release Generation

We recommend using the [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/) branching model.

1.  Create a `release-X.X.X` branch from `integration`.
2.  Run `lerna version` to update versions and create tags.
3.  Merge into `integration` and `master`.
4.  The CI/CD pipeline on the release branch will automatically publish the packages.

---

# Copyright
Copyright (c) Lucas Saldias.