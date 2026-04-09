# Tasks: v1.4-humanLayers

## Phase 1: `handoff-template.md` Distribution
- [ ] Create the directory `packages/iatools/templates/human-layers/` (if it does not exist).
- [ ] Create `handoff-template.md` inside `packages/iatools/templates/human-layers/`.
- [ ] Populate `handoff-template.md` with the structured Markdown template (Phase, Tasks, Open Questions, File Pointers, Metadata).

## Phase 2: `create-handoff` Skill
- [ ] Create the directory `packages/iatools/templates/skills/create-handoff/`.
- [ ] Create `SKILL.md` inside `packages/iatools/templates/skills/create-handoff/`.
- [ ] Implement the logic in `SKILL.md` to:
  - Ask the user (or parse from context) for the current task/topic.
  - Read `handoff-template.md`.
  - Compile the current status and file pointers into a new document.
  - Save the resulting document (e.g., in the current directory or a designated `handoffs` folder).

## Phase 3: Human Layer Examples and Documentation
- [ ] Create the directory `packages/iatools/humanLayerExamples/` if it does not exist.
- [ ] Add a sample implementation or README inside `packages/iatools/humanLayerExamples/` demonstrating how to pause and handoff context safely.
- [ ] Update framework documentation (e.g., in `packages/iatools/README.md` or a docs site) to instruct users on using the `/create-handoff` skill.

## Phase 4: Integration and Verification
- [ ] Ensure the new template and skill are correctly copied or symbolically linked when a new project is initialized with `npx @nx-cardbuilding/iatools init`.
- [ ] Test `/create-handoff` manually to verify it successfully produces a readable Markdown file based on the template.
