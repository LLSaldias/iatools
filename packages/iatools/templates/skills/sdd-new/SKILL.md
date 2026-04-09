---
name: sdd-new
description: Start a new SDD change. Creates the change folder and scaffolds it ready for artifact creation.
argument-hint: [options]
---


# Skill: `/sdd-new`

## Purpose
Create a new change folder in `openspec/changes/<change-name>/`. This is the first step of the SDD lifecycle — done before any planning or code.

## Steps

1. **Parse the change name** from the command argument. If not provided, ask: *"What would you like to build? (use kebab-case, e.g. add-payment-gateway)"*

2. **Create the change directory**:
   ```
   openspec/changes/<change-name>/
   └── .openspec.yaml
   ```

3. **Write `.openspec.yaml`** with:
   ```yaml
   schema: spec-driven
   change: <change-name>
   created: <ISO date>
   status: planning
   artifacts:
     proposal: pending
     specs: pending
     design: pending
     tasks: pending
   ```

4. **Confirm to the user**:
   ```
   ✓ Created openspec/changes/<change-name>/
   Schema: spec-driven
   
   Ready to create: proposal
   Run /sdd-ff to create all planning artifacts, or /sdd-continue for step-by-step.
   ```

## Rules
- Change name must be kebab-case, descriptive, and specific
- Never reuse an existing change name — check `openspec/changes/` first
- Do not create any code files during this step
