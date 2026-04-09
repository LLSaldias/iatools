# Proposal: v1.4-humanLayers

## 1. Problem Statement
As the complexity of agentic tasks grows, agents often need to pause their work and hand off context, progress, and blockers seamlessly. Whether it's to another agent, to a different execution environment, or to a human for review and decision-making, the framework needs established conventions and tooling to support these "human-in-the-loop" or "agent-to-agent" handoffs without risking data loss or context degradation. Currently, there is a lack of standardized examples for handling these Human Layers.

## 2. Proposed Solution
Introduce and bundle standard "Human Layer" examples and utilities within the `iatools` package. This release will specifically focus on providing structured handoff tooling:
- Provide templates and skills (e.g., `create-handoff`) to systematically compile a Markdown-based handoff document containing current status, findings, task lists, open questions, and necessary file pointers.
- Scaffold example integrations under `packages/iatools/humanLayerExamples/` to serve as reference implementations for users needing to inject human layers within their workflows.

## 3. Scope
- **In Scope:**
  - Create and distribute a standard `create-handoff` skill.
  - Distribute the `handoff-template.md` as part of the `iatools` recommended templates structure.
  - Document how to use Human Layers in the framework.
- **Out of Scope:**
  - Fully automated orchestration platforms for handling humans-in-the-loop (focused only on the initial tooling/skills mapping).

## 4. Alternate Solutions Considered
- Relying exclusively on chat history for context handoffs. This approach is highly brittle with long contexts and often results in lost tasks or critical missing information, hence the emphasis on an explicit file-based handoff mechanism (`create-handoff`).
