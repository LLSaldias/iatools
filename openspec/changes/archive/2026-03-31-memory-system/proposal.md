# Proposal: memory-system

## 1. Problem Statement

The SDD framework currently operates in a **stateless** manner: each time an AI agent engages with a project, it starts from scratch — re-reading specs, re-discovering decisions, and lacking awareness of the project's architectural history. There is no mechanism for an agent to know *why* a particular design was chosen, *what rules* govern the system, or *how features relate to each other*. This leads to:

- **Contradictory proposals**: New features may violate past architectural decisions.
- **Redundant reasoning**: Agents waste context window re-deriving the same conclusions.
- **Lost institutional knowledge**: Decisions made in early specs disappear from agent awareness.

## 2. Proposed Solution

Introduce a **Project Memory System** backed by a **Knowledge Graph stored in SQLite**. This system gives the SDD framework persistent, queryable memory across all agent interactions.

### Core Components

1. **Memory Database** (`.sdd/memory.db`): A SQLite database storing a graph of `nodes` (Decisions, Rules, Features, Specs) and `edges` (relationships between them), using **FTS5** for fast full-text search.

2. **Ingestion Pipeline** (Spec → Graph): When a Proposal is approved, the framework extracts key decisions, rules, and feature nodes via structured LLM extraction, then validates and inserts them into the graph.

3. **Retrieval Strategy** (Graph → Prompt Context): Before generating any new artifact (proposal, spec, design), the framework queries the graph using a **2-step search** — keyword match via FTS5, then 1-hop radial expansion — to inject relevant memory nodes into the LLM's context.

4. **Memory-Aware Proposal Skill**: A new `/sdd-continue` (and `/sdd-new`) behavior where the proposal step automatically:
   - Retrieves semantically related nodes from the graph.
   - Detects conflicts with existing Rules/Decisions.
   - Includes an "Impact on Graph" section describing new nodes/edges.

### Integration with `iatools init`

The `init` command will scaffold the `.sdd/` directory and create an empty `memory.db` with the correct schema. The `.gitignore` will be updated to exclude `*.db` files, with an export mechanism for Git-friendly JSON snapshots.

## 3. Scope

### In Scope
- SQLite database schema (`nodes`, `edges`) with FTS5 index.
- `scaffoldMemory()` function called during `iatools init`.
- Ingestion logic: extracting Decision/Rule/Feature nodes from approved proposals.
- Retrieval logic: FTS5 keyword search + 1-hop neighbor expansion.
- Context window guardrail: max 15-20 nodes per retrieval.
- Node ID validation: prevent hallucinated edges by checking existence.
- `memory export` CLI command: export `.sdd/memory.db` → `.sdd/memory.json` for Git.
- Updated `sdd-continue` skill to consume memory context in proposal step.

### Out of Scope
- Vector embeddings / semantic similarity (future enhancement, optional `vector` BLOB column reserved).
- Multi-developer real-time sync (MVP uses JSON export workaround).
- Automatic ingestion of non-proposal artifacts (specs, design docs — future phase).
- Web UI for graph visualization.

## 4. Alternate Solutions Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Flat Markdown files** | Simple, Git-friendly | No relationships, poor search | ❌ No graph semantics |
| **JSON knowledge base** | Git-friendly, structured | No FTS, no relational queries | ❌ Doesn't scale |
| **Vector DB (ChromaDB/Pinecone)** | Semantic search | External dependency, complex setup | ❌ Too heavy for MVP |
| **SQLite + FTS5** ✅ | Zero deps, built-in FTS, graph via edges table | Binary file merge conflicts | ✅ Best MVP tradeoff |

## 5. Guardrails & Risks

| Risk | Mitigation |
|------|------------|
| Context window overflow | Hard cap of 15-20 retrieved nodes, ordered by relevance |
| Hallucinated edges | Validate all node IDs exist in DB before inserting edges |
| Git merge conflicts on `.db` | Provide `memory export` to `.sdd/memory.json`; add `.sdd/memory.db` to `.gitignore` |
| Graph noise / bloat | Only ingest 3 key points per approved proposal (LLM-extracted) |
| FTS5 availability | FTS5 is bundled with Node.js `better-sqlite3` — zero additional deps |

## 6. Graph Impact (If Accepted)

### New Node Types
- `Decision` — An architectural choice made and the reasoning behind it.  
- `Rule` — A constraint or invariant that must be respected.  
- `Feature` — A capability introduced by a change.  

### New Edge Relations
- `DECIDED_IN` — Links a Decision to the Spec/Proposal where it was made.  
- `CONSTRAINS` — Links a Rule to the features it governs.  
- `DEPENDS_ON` — Links a Feature to other features it relies on.  
- `SUPERSEDES` — Links a Decision to one it replaces.  
