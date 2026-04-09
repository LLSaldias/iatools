# Specs: v1.4-humanLayers

## 1. Feature Specifications

### 1.1. Standard `create-handoff` Skill
- A new interactive skill (`create-handoff`) will be bundled with the `iatools` package.
- The skill must guide the user or agent to systematically compile a Markdown-based handoff document.
- The handoff document must capture:
  - Current status (in-progress, paused, etc.)
  - Completed task lists and remaining tasks
  - Open questions or blockers
  - Necessary file pointers (`file:line` syntax)
- The skill should create the handoff document in a predictable location or allow specifying the output path.

### 1.2. `handoff-template.md` Distribution
- The standard `handoff-template.md` will be distributed alongside other `iatools` templates.
- Its location should be within the `packages/iatools/templates/` directory (e.g., `packages/iatools/templates/human-layers/handoff-template.md` or similar organizational structure).
- The template must provide a structured format (Markdown) with clear sections for task status, critical references, recent changes, learnings, artifacts, action items, and blockers.

### 1.3. Human Layers Documentation
- Comprehensive documentation must be provided on how to integrate and use Human Layers within the framework.
- The documentation should cover:
  - When to use a handoff (e.g., context too large, natural stopping point).
  - How to invoke the `create-handoff` skill.
  - Examples of passing context between agents or from an agent to a human reviewer.
- Scaffolded examples should be provided under `packages/iatools/humanLayerExamples/` to serve as reference implementations.

## 2. Technical Considerations
- The `create-handoff` skill needs to be integrated into the `iatools` CLI initialization so it can be automatically linked/installed like other native skills (e.g., `sdd-*` skills).
- Determine the appropriate template path resolution for `handoff-template.md` to ensure it is correctly copied during framework initialization or when explicitly requested.
