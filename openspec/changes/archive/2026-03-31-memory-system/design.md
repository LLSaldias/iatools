# Design: memory-system

## 1. Architecture & Components

### Module Layout

```
packages/iatools/
├── src/
│   ├── commands/
│   │   ├── init.ts                    # [MODIFY] — call scaffoldMemory()
│   │   └── memory-export.ts           # [NEW]    — `iatools memory export`
│   ├── memory/
│   │   ├── index.ts                   # [NEW]    — barrel export
│   │   ├── database.ts                # [NEW]    — open/create DB, schema init
│   │   ├── ingestion.ts               # [NEW]    — extract nodes from proposals
│   │   ├── retrieval.ts               # [NEW]    — FTS5 search + radial expansion
│   │   └── types.ts                   # [NEW]    — MemoryNode, MemoryEdge, etc.
│   ├── utils/
│   │   └── scaffolders.ts             # [MODIFY] — add scaffoldMemory()
│   └── cli.ts                         # [MODIFY] — register `memory export` command
├── templates/
│   └── skills/
│       └── sdd-continue/
│           └── SKILL.md               # [MODIFY] — add memory retrieval steps
```

---

### 1.1. `memory/types.ts` — Type Definitions

```typescript
/** Node label enum */
export type NodeLabel = 'Decision' | 'Rule' | 'Feature';

/** Prefix map for ID generation */
export const NODE_PREFIX: Record<NodeLabel, string> = {
  Decision: 'dec',
  Rule: 'rul',
  Feature: 'fea',
};

/** A knowledge graph node */
export interface MemoryNode {
  id: string;
  label: NodeLabel;
  title: string;
  content: string;
  source: string | null;
  created_at: string;
}

/** A directed edge between two nodes */
export interface MemoryEdge {
  source_id: string;
  target_id: string;
  relation_type: 'DECIDED_IN' | 'CONSTRAINS' | 'DEPENDS_ON' | 'SUPERSEDES';
  created_at: string;
}

/** LLM extraction output (raw, pre-validation) */
export interface ExtractionResult {
  nodes: Array<{
    label: NodeLabel;
    title: string;
    content: string;
  }>;
  edges: Array<{
    source_title: string;
    target_id?: string;
    target_title?: string;
    relation_type: MemoryEdge['relation_type'];
  }>;
}

/** Retrieval result with ranked nodes + their edges */
export interface MemoryContext {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  formatted: string;  // pre-rendered Markdown for prompt injection
}

/** Export JSON structure */
export interface MemoryExport {
  exportedAt: string;
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}
```

---

### 1.2. `memory/database.ts` — Database Manager

**Responsibilities:**
- Open or create `memory.db` at a given path.
- Run schema migration (idempotent — uses `IF NOT EXISTS`).
- Set PRAGMAs (`WAL`, `foreign_keys`).
- Provide low-level CRUD: `insertNode()`, `insertEdge()`, `nodeExists()`, `getAllNodes()`, `getAllEdges()`.

**Design decisions:**
- Uses `better-sqlite3` synchronous API — no async overhead, simpler error handling.
- Constructor accepts a path string. Pass `:memory:` for tests.
- Class-based: `MemoryDB` class with `close()` method.
- Schema SQL stored as a constant string, executed via `.exec()`.

```typescript
export class MemoryDB {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) { /* open + pragma + schema */ }
  
  insertNode(node: Omit<MemoryNode, 'created_at'>): void;
  insertEdge(edge: Omit<MemoryEdge, 'created_at'>): void;
  nodeExists(id: string): boolean;
  findByFTS(query: string, limit?: number): MemoryNode[];
  getNeighbors(nodeId: string): MemoryNode[];
  getAllNodes(): MemoryNode[];
  getAllEdges(): MemoryEdge[];
  getEdgesForNode(nodeId: string): MemoryEdge[];
  
  transaction<T>(fn: () => T): T;  // wraps db.transaction()
  close(): void;
}
```

---

### 1.3. `memory/ingestion.ts` — Proposal → Graph

**Responsibilities:**
- Read a proposal Markdown file.
- Build the LLM extraction prompt (system prompt template embedded in the module).
- Parse the LLM's JSON response into `ExtractionResult`.
- Validate: node count ≤ 3, edge count ≤ 5, all `target_id` references exist.
- Generate IDs with `nanoid(7)`, prefixed by label.
- Insert within a single transaction.

**Key function:**

```typescript
export async function ingestProposal(
  db: MemoryDB,
  proposalContent: string,
  changeName: string
): Promise<{ nodesCreated: number; edgesCreated: number }>;
```

**Design note:** This function does NOT call an LLM directly. It builds and returns the prompt + expected schema. The **skill** (SKILL.md instructions) is responsible for executing the LLM call and passing the result back. This keeps the `iatools` library LLM-agnostic.

Instead, the module exports:

```typescript
export function buildExtractionPrompt(proposalContent: string, existingNodes: MemoryNode[]): string;
export function processExtractionResult(db: MemoryDB, raw: ExtractionResult, changeName: string): { nodesCreated: number; edgesCreated: number };
```

The skill calls `buildExtractionPrompt()` → sends to LLM → parses JSON → calls `processExtractionResult()`.

---

### 1.4. `memory/retrieval.ts` — Graph → Context

**Responsibilities:**
- Accept keywords (from change name + user input).
- Step 1: FTS5 search via `db.findByFTS()`.
- Step 2: For each hit, expand 1-hop via `db.getNeighbors()`.
- Step 3: Deduplicate, cap at 20, format as Markdown.

**Key function:**

```typescript
export function retrieveContext(
  db: MemoryDB,
  keywords: string[],
  maxNodes?: number   // default: 20
): MemoryContext;
```

**Formatting output:**

```markdown
## Memory Context (5 nodes retrieved)

### Decision: Use SQLite for memory storage [dec_xK9mP2]
Chosen over vector DBs due to zero-dep requirement...
↳ DECIDED_IN → memory-system proposal
↳ CONSTRAINS → Feature: Ingestion Pipeline

### Rule: Max 3 nodes per ingestion [rul_bT4kQ1]
...
```

---

### 1.5. `commands/memory-export.ts` — CLI Export

**Design:**
- Opens `MemoryDB` at `<projectRoot>/.sdd/memory.db`.
- Calls `getAllNodes()` + `getAllEdges()`.
- Writes `MemoryExport` JSON to `<projectRoot>/.sdd/memory.json`.
- Uses `ora` spinner for UX consistency with existing CLI commands.

---

### 1.6. `utils/scaffolders.ts` — `scaffoldMemory()`

```typescript
export async function scaffoldMemory(
  projectRoot: string,
  overwrite: boolean
): Promise<void>;
```

**Steps:**
1. `ensureDir(path.join(projectRoot, '.sdd'))`.
2. If `memory.db` exists and `overwrite` is false → skip (log warning).
3. Else → `new MemoryDB(dbPath)` (constructor runs schema init) → `db.close()`.
4. Read `.gitignore` → if `.sdd/memory.db` not present → append it.
5. Write empty `{}` to `.sdd/memory.json` if not exists.

Called from `performScaffolding()` in `init.ts` after `scaffoldCopilotConfig()`.

---

### 1.7. `sdd-continue` SKILL.md Updates

New steps inserted into the skill:

```
## Steps

1. **Identify the change** from argument or context.

2. **Read `.openspec.yaml`** to determine artifact statuses.

2b. **Load Memory Context** (if `.sdd/memory.db` exists):
    - Extract keywords from the change name and any user description.
    - Run retrieval: FTS5 search → 1-hop neighbors → cap at 20.
    - Include the formatted Memory Context in your system prompt.

3. **Show the artifact dashboard** (unchanged).

4. **Create the first ready artifact**:
    - Read all completed dependency artifacts for context
    - **Include retrieved Memory Context** alongside dependency artifacts
    - Generate the artifact with full detail
    - Update `.openspec.yaml` status

4b. **If the artifact was a proposal → Ingest into Memory**:
    - Extract 3 key Decision/Rule/Feature nodes.
    - Validate edges against existing node IDs.
    - Insert into `.sdd/memory.db`.
    - Log: "✓ Ingested 3 nodes, 2 edges into project memory"

5. **Show what's newly available** (unchanged).
```

---

## 2. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `better-sqlite3` | `^11.0.0` | SQLite driver with FTS5 support |
| `@types/better-sqlite3` | `^7.6.0` | TypeScript definitions (devDep) |
| `nanoid` | `^5.0.0` | Short unique ID generation |

> `nanoid` v5 is ESM-only. If the project uses CommonJS, pin `nanoid@3` instead.

## 3. Data Flow Diagram

```
┌─────────────────┐    Proposal approved     ┌──────────────────┐
│  /sdd-continue  │ ──────────────────────►  │   ingestion.ts   │
│   (SKILL.md)    │                           │                  │
│                 │   buildExtractionPrompt() │  ┌────────────┐  │
│  ┌───────────┐  │ ◄────────────────────────  │  LLM Prompt  │  │
│  │  LLM Call │  │                           │  └────────────┘  │
│  └─────┬─────┘  │   JSON extraction result  │                  │
│        │        │ ──────────────────────►   │  validate +      │
│        ▼        │                           │  insert nodes    │
│  Parse JSON     │                           └────────┬─────────┘
└─────────────────┘                                    │
                                                       ▼
┌─────────────────┐   Before generating artifact  ┌──────────────┐
│  /sdd-continue  │ ◄────── retrieveContext() ──  │ retrieval.ts │
│   (SKILL.md)    │                               │              │
│                 │   FTS5 + 1-hop expansion      │  ┌────────┐  │
│  ┌───────────┐  │   formatted Markdown          │  │memory  │  │
│  │ Generate  │  │                               │  │  .db   │  │
│  │ Artifact  │  │                               │  └────────┘  │
│  └───────────┘  │                               └──────────────┘
└─────────────────┘

┌─────────────────┐   iatools init            ┌──────────────────┐
│   init.ts       │ ──────────────────────►  │ scaffoldMemory() │
│                 │                           │  create .sdd/    │
│                 │                           │  init schema     │
└─────────────────┘                           └──────────────────┘

┌─────────────────┐   iatools memory export   ┌──────────────────┐
│ memory-export   │ ──────────────────────►  │  .sdd/memory.db  │
│   .ts           │                           │       ▼          │
│                 │ ◄────────────────────────  │ .sdd/memory.json │
└─────────────────┘                           └──────────────────┘
```

## 4. Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| `.sdd/memory.db` missing | Skip memory retrieval, log info. Continue without memory context. |
| `.sdd/memory.db` corrupted | Catch error, log warning, continue without memory. |
| LLM returns invalid JSON | Log warning, skip ingestion. Do not block artifact creation. |
| LLM suggests non-existent node ID | Skip that edge, log warning. Insert all valid edges. |
| `better-sqlite3` native build fails | `scaffoldMemory()` catches and logs error. Init continues without memory. |

All failures are **non-blocking**. The memory system is an enhancement, never a gate.
