---
name: sdd-continue
description: Create the next artifact in the dependency chain, one at a time.
argument-hint: [options]
---


# Skill: `/sdd-continue`

## Purpose
Create the next ready artifact for a change, giving the user control to review each artifact before proceeding.

## Artifact Dependency Graph
```
proposal  →  specs  →  design  →  tasks
  (done)       (ready once proposal done)
                          (ready once specs done)
                                    (ready once specs done)
```

## Steps

1. **Identify the change** from argument or context.

2. **Read `.openspec.yaml`** to determine artifact statuses.

2b. **Load Memory Context** (if `.sdd/memory.db` exists):
    - Extract keywords from the change name and any user description.
    - Run retrieval: FTS5 search → 1-hop neighbors → cap at 20 nodes.
    - Include the formatted Memory Context in your system prompt.
    - If the database does not exist, skip this step silently.

3. **Show the artifact dashboard**:
   ```
   Change: <name>
   
   ✓ proposal    (done)
   ◆ specs       (ready)
   ◆ design      (ready)
   ○ tasks       (blocked — needs: specs)
   ```

4. **Create the first ready artifact** (in dependency order):
   - Read all completed dependency artifacts for context
   - **Include retrieved Memory Context** alongside dependency artifacts
   - Generate the artifact with full detail
   - Update `.openspec.yaml` status

4b. **If the artifact was a proposal → Ingest into Memory**:
    - Extract 3 key Decision/Rule/Feature nodes from the proposal.
    - Use the following JSON schema for extraction:
      ```json
      {
        "nodes": [
          { "label": "Decision|Rule|Feature", "title": "...", "content": "..." }
        ],
        "edges": [
          { "source_title": "...", "target_id": "existing_id", "relation_type": "DECIDED_IN|CONSTRAINS|DEPENDS_ON|SUPERSEDES" }
        ]
      }
      ```
    - Validate edges against existing node IDs (skip invalid ones).
    - Insert into `.sdd/memory.db`.
    - Log: "✓ Ingested N nodes, N edges into project memory"

5. **Show what's newly available**:
   ```
   ✓ Created specs/domain/spec.md
   
   Now available: design, tasks
   Run /sdd-continue to create the next artifact.
   ```

## Rules
- Create only ONE artifact per `/sdd-continue` call
- Always read dependencies before creating
- Do not skip artifacts in the dependency chain
- Show the dashboard before and after artifact creation
- Memory retrieval is optional — gracefully skip if `.sdd/memory.db` is missing
- Memory ingestion only triggers after proposal artifacts are marked done
