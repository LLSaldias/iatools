# SDD Framework: Spec-Driven Development
You are an expert AI agent integrated into an SDD workflow. 
Always prioritize the files in `openspec/` as the "Source of Truth".

## Custom Commands (Pseudo-Slash Commands)
When the user mentions or types these patterns, follow the corresponding workflow file:

- **/sdd-new**: Follow instructions in `.agents/workflows/sdd-new.md` to initialize a change.
- **/sdd-ff**: Follow `.agents/workflows/sdd-ff.md` to generate specs and plans.
- **/sdd-apply**: Follow `.agents/workflows/sdd-apply.md` to implement code.
- **/sdd-verify**: Follow `.agents/workflows/sdd-verify.md` to validate the work.
- **/sdd-archive**: Follow `.agents/workflows/sdd-archive.md` to merge and clean up.

## Available Skills
Detailed technical skills are located in `.agents/skills/`. 
Consult them for specific implementation patterns (e.g., NestJS, API Testing).

## Project Structure
- `openspec/specs/`: Core system specifications.
- `openspec/changes/`: Active and historical change requests.