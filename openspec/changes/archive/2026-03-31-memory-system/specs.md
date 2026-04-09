# Specs: memory-system

## 1. Feature Specifications

### 1.1. Memory Database (`.sdd/memory.db`)

- The database engine is **SQLite** via the `better-sqlite3` npm package (synchronous, zero-config, FTS5 bundled).
- Location: `<projectRoot>/.sdd/memory.db`.
- Schema:

```sql
-- Knowledge nodes (Decisions, Rules, Features)
CREATE TABLE nodes (
  id         TEXT PRIMARY KEY,            -- nanoid, e.g. "dec_xK9mP2"
  label      TEXT NOT NULL                -- enum: 'Decision' | 'Rule' | 'Feature'
    CHECK(label IN ('Decision','Rule','Feature')),
  title      TEXT NOT NULL,               -- short human-readable title
  content    TEXT NOT NULL,               -- full Markdown description
  source     TEXT,                        -- origin change name, e.g. "memory-system"
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  vector     BLOB                         -- reserved for future embeddings
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE nodes_fts USING fts5(
  title, content, content=nodes, content_rowid=rowid
);

-- Triggers to keep FTS5 in sync
CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
  INSERT INTO nodes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;
CREATE TRIGGER nodes_ad AFTER DELETE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
END;
CREATE TRIGGER nodes_au AFTER UPDATE ON nodes BEGIN
  INSERT INTO nodes_fts(nodes_fts, rowid, title, content)
  VALUES ('delete', old.rowid, old.title, old.content);
  INSERT INTO nodes_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

-- Directed edges between nodes
CREATE TABLE edges (
  source_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK(relation_type IN ('DECIDED_IN','CONSTRAINS','DEPENDS_ON','SUPERSEDES')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_id, target_id, relation_type)
);

CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
```

- `PRAGMA journal_mode = WAL` must be set on connection open for concurrent read safety.
- `PRAGMA foreign_keys = ON` must be set for referential integrity enforcement.

---

### 1.2. Scaffolding Integration (`iatools init`)

- A new `scaffoldMemory()` function must be added to `src/utils/scaffolders.ts`.
- Called from `performScaffolding()` in `src/commands/init.ts` after `scaffoldOpenspec()`.
- Behavior:
  1. Create `.sdd/` directory at project root.
  2. Create `memory.db` with the full schema above (all tables, FTS5, triggers, indexes).
  3. Append `.sdd/memory.db` to the project's `.gitignore` (create it if missing; do not duplicate the entry).
  4. Create an empty `.sdd/memory.json` placeholder for Git-exportable snapshots.
- Must respect the `force`/`overwrite` flag — if the database already exists and `force` is false, skip creation.

---

### 1.3. Ingestion Pipeline

- Triggered when a **Proposal** artifact status transitions to `done` in `.openspec.yaml`.
- The ingestion is invoked by the `sdd-continue` skill after marking proposal as done.
- Process:
  1. Read the full proposal Markdown content.
  2. Present the content to the LLM with a structured extraction prompt requesting exactly **3 key points**, each classified as `Decision`, `Rule`, or `Feature`.
  3. For each extracted node, the LLM must also suggest connections to existing nodes (by ID or title match).
  4. **Validation**: Before inserting any edge, query `SELECT id FROM nodes WHERE id = ?` to confirm both `source_id` and `target_id` exist. Reject hallucinated edges silently (log a warning).
  5. Generate node IDs using the format `<prefix>_<nanoid(7)>` where prefix is `dec`, `rul`, or `fea`.
  6. Insert validated nodes and edges within a single SQLite transaction.

#### LLM Extraction Prompt Schema

The skill must send a prompt that requests output in this JSON format:

```json
{
  "nodes": [
    {
      "label": "Decision",
      "title": "Use SQLite for memory storage",
      "content": "Chosen over vector DBs due to zero-dep requirement..."
    }
  ],
  "edges": [
    {
      "source_title": "Use SQLite for memory storage",
      "target_id": "fea_xK9mP2",
      "relation_type": "DECIDED_IN"
    }
  ]
}
```

- The skill must parse, validate, and insert — it does **not** auto-execute LLM output.
- Maximum of **3 nodes** and **5 edges** per ingestion to prevent graph bloat.

---

### 1.4. Retrieval Strategy

- Used before generating any new artifact (proposal, specs, design) to provide memory context.
- **Step 1 — FTS5 Keyword Search**:
  1. Extract keywords from the new spec/user input (top 5-10 significant terms).
  2. Query: `SELECT id, label, title, content, rank FROM nodes_fts WHERE nodes_fts MATCH ? ORDER BY rank LIMIT 10`.
- **Step 2 — 1-Hop Radial Expansion**:
  1. For each node returned in Step 1, fetch neighbors:  
     `SELECT n.* FROM nodes n JOIN edges e ON (n.id = e.target_id AND e.source_id = ?) OR (n.id = e.source_id AND e.target_id = ?)`.
  2. Deduplicate results by `id`.
- **Step 3 — Cap & Format**:
  1. Hard limit: **max 20 nodes** total (direct + neighbors), sorted by FTS rank.
  2. Format as a Markdown context block for injection into the LLM prompt:
     ```
     ## Memory Context ({{count}} nodes retrieved)
     ### Decision: {{title}} [{{id}}]
     {{content}}
     Related: {{edge_type}} → {{connected_node_title}}
     ```

---

### 1.5. CLI Command: `memory export`

- New subcommand: `iatools memory export`.
- Behavior:
  1. Read all `nodes` and `edges` from `.sdd/memory.db`.
  2. Serialize to `.sdd/memory.json` in this format:
     ```json
     {
       "exportedAt": "2026-03-31T14:43:00Z",
       "nodes": [ { "id": "...", "label": "...", "title": "...", "content": "...", "source": "...", "created_at": "..." } ],
       "edges": [ { "source_id": "...", "target_id": "...", "relation_type": "...", "created_at": "..." } ]
     }
     ```
  3. Print confirmation with node/edge counts.
- Future: `iatools memory import` (out of scope for MVP, but schema should support it).

---

### 1.6. Updated `sdd-continue` Skill

- Before generating any artifact, the skill must:
  1. Open `.sdd/memory.db` (if it exists; gracefully skip if not).
  2. Run the retrieval strategy (§1.4) using the change name and any user-provided context as keywords.
  3. Inject the formatted memory context into the system prompt sent to the LLM.
  4. After a proposal is marked `done`, trigger the ingestion pipeline (§1.3).
- The skill instructions (`SKILL.md`) must be updated to document this behavior.

---

## 2. Technical Considerations

- **Dependency**: `better-sqlite3` must be added to `packages/iatools/package.json` as a production dependency. It is a native module — ensure build scripts handle prebuilds correctly.
- **ID generation**: `nanoid` (already common in Node ecosystem) for generating short unique IDs.
- **Error handling**: All database operations must be wrapped in try/catch. If the DB is corrupted or missing, log a warning and proceed without memory (graceful degradation).
- **Testing**: The `memory.db` schema creation and CRUD operations must be testable with an in-memory SQLite database (`:memory:`).
- **Template interpolation**: The retrieval context format uses `{{variables}}` — ensure it does not conflict with the existing `interpolate()` function in `file-writer.ts` (which only replaces known keys like `PROJECT_NAME`).
