/**
 * SQLite-backed memory database for the SDD knowledge graph.
 * Manages nodes (Decisions, Rules, Features) and edges (relationships)
 * with FTS5 full-text search support.
 */

import Database from 'better-sqlite3';
import type { MemoryNode, MemoryEdge } from './types';

/** SQL schema for the knowledge graph database */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS nodes (
    id         TEXT PRIMARY KEY,
    label      TEXT NOT NULL CHECK(label IN ('Decision','Rule','Feature')),
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    source     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    vector     BLOB
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    title, content, content=nodes, content_rowid=rowid
  );

  CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(rowid, title, content)
    VALUES (new.rowid, new.title, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content)
    VALUES ('delete', old.rowid, old.title, old.content);
  END;

  CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, title, content)
    VALUES ('delete', old.rowid, old.title, old.content);
    INSERT INTO nodes_fts(rowid, title, content)
    VALUES (new.rowid, new.title, new.content);
  END;

  CREATE TABLE IF NOT EXISTS edges (
    source_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id     TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL
      CHECK(relation_type IN ('DECIDED_IN','CONSTRAINS','DEPENDS_ON','SUPERSEDES')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (source_id, target_id, relation_type)
  );

  CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
  CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
`;

/**
 * Memory database manager providing CRUD operations over the knowledge graph.
 * Uses better-sqlite3 for synchronous, zero-config SQLite access with FTS5.
 *
 * @example
 * ```typescript
 * const db = new MemoryDB('/path/to/.sdd/memory.db');
 * db.insertNode({ id: 'dec_abc1234', label: 'Decision', title: '...', content: '...', source: 'change-name' });
 * const results = db.findByFTS('authentication');
 * db.close();
 * ```
 */
export class MemoryDB {
  private db: Database.Database;

  /**
   * Open or create a memory database at the given path.
   * Sets WAL journal mode and foreign keys, then runs the idempotent schema migration.
   * @param {string} dbPath - Absolute path to the database file, or ':memory:' for tests.
   */
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
  }

  /**
   * Insert a knowledge node into the graph.
   * @param {Omit<MemoryNode, 'created_at'>} node - Node data without timestamp (auto-set by SQLite).
   */
  insertNode(node: Omit<MemoryNode, 'created_at'>): void {
    const stmt = this.db.prepare(
      'INSERT INTO nodes (id, label, title, content, source) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(node.id, node.label, node.title, node.content, node.source);
  }

  /**
   * Insert a directed edge between two existing nodes.
   * @param {Omit<MemoryEdge, 'created_at'>} edge - Edge data without timestamp.
   */
  insertEdge(edge: Omit<MemoryEdge, 'created_at'>): void {
    const stmt = this.db.prepare(
      'INSERT INTO edges (source_id, target_id, relation_type) VALUES (?, ?, ?)'
    );
    stmt.run(edge.source_id, edge.target_id, edge.relation_type);
  }

  /**
   * Check whether a node with the given ID exists in the graph.
   * @param {string} id - Node ID to check.
   * @returns {boolean} True if the node exists.
   */
  nodeExists(id: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
    return row !== undefined;
  }

  /**
   * Perform a full-text search over node titles and content using FTS5.
   * @param {string} query - FTS5 match expression (e.g. "authentication OR auth").
   * @param {number} [limit=10] - Maximum number of results to return.
   * @returns {MemoryNode[]} Nodes matching the query, ordered by relevance.
   */
  findByFTS(query: string, limit: number = 10): MemoryNode[] {
    const stmt = this.db.prepare(`
      SELECT n.id, n.label, n.title, n.content, n.source, n.created_at
      FROM nodes_fts fts
      JOIN nodes n ON n.rowid = fts.rowid
      WHERE nodes_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    return stmt.all(query, limit) as MemoryNode[];
  }

  /**
   * Get all directly connected nodes (1-hop neighbors) for a given node ID.
   * Traverses edges in both directions.
   * @param {string} nodeId - ID of the node to expand.
   * @returns {MemoryNode[]} Neighboring nodes.
   */
  getNeighbors(nodeId: string): MemoryNode[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT n.id, n.label, n.title, n.content, n.source, n.created_at
      FROM nodes n
      JOIN edges e ON (n.id = e.target_id AND e.source_id = ?)
                   OR (n.id = e.source_id AND e.target_id = ?)
    `);
    return stmt.all(nodeId, nodeId) as MemoryNode[];
  }

  /**
   * Retrieve all nodes in the graph.
   * @returns {MemoryNode[]} All nodes.
   */
  getAllNodes(): MemoryNode[] {
    return this.db.prepare(
      'SELECT id, label, title, content, source, created_at FROM nodes ORDER BY created_at'
    ).all() as MemoryNode[];
  }

  /**
   * Retrieve all edges in the graph.
   * @returns {MemoryEdge[]} All edges.
   */
  getAllEdges(): MemoryEdge[] {
    return this.db.prepare(
      'SELECT source_id, target_id, relation_type, created_at FROM edges ORDER BY created_at'
    ).all() as MemoryEdge[];
  }

  /**
   * Get all edges connected to a specific node (as source or target).
   * @param {string} nodeId - ID of the node.
   * @returns {MemoryEdge[]} Edges connected to the node.
   */
  getEdgesForNode(nodeId: string): MemoryEdge[] {
    const stmt = this.db.prepare(
      'SELECT source_id, target_id, relation_type, created_at FROM edges WHERE source_id = ? OR target_id = ?'
    );
    return stmt.all(nodeId, nodeId) as MemoryEdge[];
  }

  /**
   * Execute a function within a SQLite transaction.
   * Automatically commits on success, rolls back on error.
   * @param {() => T} fn - Function to execute within the transaction.
   * @returns {T} Return value of the function.
   */
  transaction<T>(fn: () => T): T {
    const wrapped = this.db.transaction(fn);
    return wrapped();
  }

  /**
   * Close the database connection. Must be called when done.
   */
  close(): void {
    this.db.close();
  }
}
