# Design: v1.4-humanLayers

## 1. Architecture & Components

### 1.1. Standard `create-handoff` Skill
- **Target Location:** `packages/iatools/templates/skills/create-handoff/SKILL.md`
- **Design:**
  - The skill script will parse the current context (such as open files or active tasks) when invoked.
  - It will prompt the user (or read from arguments) to identify the current change or topic.
  - It will use a template file (`handoff-template.md`) to generate the output file.
  - The output will typically be placed in the current working directory, a dedicated `handoffs/` folder, or `openspec/changes/<change-name>/handoffs/`.

### 1.2. `handoff-template.md` Distribution
- **Target Location:** `packages/iatools/templates/human-layers/handoff-template.md` (or conceptually alongside other templates).
- **Design:**
  - Will include standard markdown sections: `Task(s)`, `Critical References`, `Recent Changes`, `Learnings`, `Artifacts`, `Action Items & Next Steps`, and `Blockers / Open Questions`.
  - Include frontmatter for metadata (date, git commit, branch, topic, status).

### 1.3. Human Layers Examples and Documentation

- **Design:**
  - Scaffold a complete reference implementation showing how a human layer operates inside a project.
  - Provide a README or standard framework documentation explaining how to leverage these tools to pause context and hand it off safely.

## 2. Dependencies
- No new runtime dependencies. The skill will rely on the existing SDD framework structure and standard shell/FS commands available to agents.

## 3. Data Models / Schemas
- No new database schemas. The primary data structure is the structured markdown document defined in `handoff-template.md`.
- **Target Location:** `packages/iatools/humanLayerExamples/`