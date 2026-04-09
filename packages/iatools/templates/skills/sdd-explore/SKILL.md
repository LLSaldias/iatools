---
name: sdd-explore
description: Think through ideas and investigate before committing to a change. No artifacts are created.
argument-hint: [options]
---


# Skill: `/sdd-explore`

## Purpose
Open exploratory conversation about ideas, problems, or approaches. Investigate the codebase, compare options, and clarify requirements — all without creating any artifacts or code.

## Steps

1. **Ask what to explore** if no topic was specified: *"What would you like to explore or investigate?"*

2. **Investigate freely**: read relevant files, search the codebase, analyze existing patterns, compare approaches.

3. **Synthesize findings** with appropriate detail:
   - Current state of the codebase in the relevant area
   - Available options / approaches with trade-offs
   - Recommended path forward (if asked)

4. **Offer to proceed**:
   - If the direction is clear: *"Ready to start? Run /sdd-new <change-name> to begin."*
   - If more exploration is needed: continue the conversation

## Rules
- No files are created during `explore`
- No code is written during `explore`
- This is a free-form thinking phase — no structure required
- Can read ANY file in the project for context
- Focus on answering the user's questions, not generating output
