# Design: iatools v2.0 — Must-Have Features

**Change**: iatools-v2-must-have  
**Date**: 2026-04-11

---

## 1. Layered Architecture

Single package, 4 internal layers. Dependency direction: top → down, never up.

```
┌─────────────────────────────────────────────┐
│  UI Layer (chalk/boxen/cli-table3)            │
│  Panels, interactive widgets, theming          │
├─────────────────────────────────────────────┤
│  Pipeline Layer                              │
│  Caveman compression, artifact flow,         │
│  traceability links                          │
├─────────────────────────────────────────────┤
│  Memory Layer                                │
│  Embeddings (API/ONNX), retrieval, graph     │
├─────────────────────────────────────────────┤
│  Safety Layer                                │
│  Sanitization regex, interactive review,     │
│  audit log                                   │
└─────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── index.ts
├── cli.ts
│
├── ui/                               # UI Layer
│   ├── theme.ts                      # Color palette, box styles, spacing tokens
│   ├── banner.ts                     # Branded banner with boxen
│   ├── panel.ts                      # Bordered panel with title + status icon
│   ├── table.ts                      # Column-aligned data table via cli-table3
│   ├── diff-view.ts                  # Styled before/after diff
│   ├── progress.ts                   # Determinate progress via ora
│   └── prompts.ts                    # Inquirer-based interactive prompts
│
├── pipeline/                         # Pipeline Layer
│   ├── caveman/
│   │   ├── compressor.ts            # Prose → .cave YAML transformer
│   │   ├── decompressor.ts          # .cave → human-readable .md
│   │   ├── profiles.ts              # lite / full / ultra intensity configs
│   │   └── preservers.ts            # Code/URL/path passthrough rules
│   ├── traceability/
│   │   ├── lineage.ts               # Artifact → predecessor linking
│   │   ├── chain.ts                 # Full trace: proposal → spec → design → task
│   │   └── metadata.ts              # Change ID, timestamp, phase stamps
│   └── artifact-flow.ts             # Phase pipeline: compress → validate → persist
│
├── memory/                           # Memory Layer (existing, enhanced)
│   ├── database.ts                   # SQLite core (existing)
│   ├── types.ts                      # Node/Edge types (existing, extended)
│   ├── ingestion.ts                  # LLM extraction (existing)
│   ├── retrieval.ts                  # FTS5 + graph walk (existing, enhanced)
│   ├── embeddings/
│   │   ├── provider.ts              # Interface: embed(text) → Float32Array
│   │   ├── api-provider.ts          # OpenAI / Vertex API embeddings
│   │   ├── local-provider.ts        # ONNX all-MiniLM-L6-v2 (lazy-loaded)
│   │   └── fallback.ts              # Provider chain: API → ONNX → BM25-only
│   └── vector-store.ts              # Cosine similarity over stored embeddings
│
├── safety/                           # Safety Layer
│   ├── patterns.ts                   # Regex library for secrets/PII
│   ├── scanner.ts                    # Scan text → RedactionCandidate[]
│   ├── redactor.ts                   # Apply approved redactions
│   └── audit.ts                      # Append-only JSONL audit log
│
├── commands/                         # Existing commands (refactored)
├── ides/                             # Existing (unchanged)
├── roles/                            # Existing (unchanged)
└── utils/                            # logger.ts becomes chalk shim
```

### Dependency Rules

- `ui/` → calls `pipeline/`, `memory/`, `safety/`, `commands/`
- `pipeline/` → calls `memory/`, `safety/`
- `memory/` → calls `safety/` (sanitize before persist)
- `safety/` → calls nothing (leaf layer)
- `commands/` → calls `pipeline/`, `memory/`
- UI utilities stay in `ui/` only — no UI leaks into other layers

---

## 2. Caveman SDD Mode

### Dual Format Model

Every SDD artifact stored in two representations:

```
openspec/changes/my-feature/
├── proposal.cave             ← compressed (source of truth for agents)
├── proposal.md               ← human-readable (derived on-demand)
├── specs.cave
├── specs.md
├── design.cave
├── design.md
├── tasks.cave
└── tasks.md
```

`.cave` is the source of truth. `.md` is regenerated at review gates.

### .cave Format (Structured YAML)

```yaml
# proposal.cave
_v: 1
_phase: proposal
_change: my-feature
_parent: null
_ts: 2026-04-11T10:00:00Z

intent: "Add rate limiting to public API endpoints"
scope:
  in: [api-gateway, rate-limiter-middleware, redis-config]
  out: [auth-service, frontend]
constraints:
  - "Must not exceed 2ms latency overhead per request"
  - "Redis cluster already provisioned"
success:
  - "429 responses for exceeded limits"
  - "Per-tenant configurable thresholds"
risks:
  - id: R1
    desc: "Redis failover → open or closed?"
    decision: pending
```

### Compression Rules

- Strip all narrative prose → structured YAML key-values
- Keep technical precision (names, constraints, numbers) intact
- Decisions get IDs for traceability cross-references
- Code blocks, file paths, commands pass through untouched
- Each `.cave` carries `_parent` linking to the artifact that produced it

### Phase-Specific .cave Schemas

**specs.cave:**
```yaml
_v: 1
_phase: specs
_change: my-feature
_parent: proposal.cave
requirements:
  - id: REQ-1
    desc: "Per-endpoint rate limits"
    acceptance: ["429 on excess", "X-RateLimit-* headers"]
  - id: REQ-2
    desc: "Tenant-level configuration"
    acceptance: ["Admin API for threshold CRUD"]
scenarios:
  - id: SC-1
    given: "Request count exceeds limit"
    when: "Next request arrives"
    then: "429 with Retry-After header"
```

**design.cave:**
```yaml
_v: 1
_phase: design
_change: my-feature
_parent: proposal.cave
approach: "Token bucket algorithm via Redis MULTI/EXEC"
components:
  - name: rate-limiter-middleware
    type: middleware
    deps: [redis-client]
    interface: "(req, res, next) → void | 429"
  - name: rate-config-store
    type: service
    deps: [postgres]
    interface: "getTenantLimits(tenantId) → RateConfig"
decisions:
  - id: D1
    question: "Token bucket vs sliding window?"
    choice: "Token bucket"
    reason: "O(1) Redis ops, simpler burst handling"
    refs: [R1]
```

**tasks.cave:**
```yaml
_v: 1
_phase: tasks
_change: my-feature
_parent: [specs.cave, design.cave]
tasks:
  - id: T1
    title: "Create RateLimiterMiddleware"
    refs: [REQ-1, D1]
    files: [src/middleware/rate-limiter.ts]
    tests: [test/middleware/rate-limiter.test.ts]
  - id: T2
    title: "Add Redis token bucket logic"
    refs: [D1]
    deps: [T1]
    files: [src/services/token-bucket.ts]
```

### Decompression

`decompressor.ts` uses per-phase templates to render `.cave` → `.md`:

```typescript
interface DecompressOptions {
  phase: 'proposal' | 'specs' | 'design' | 'tasks';
  caveContent: CaveArtifact;
}

function decompress(opts: DecompressOptions): string {
  // Select template by phase → fill with structured data → return markdown
}
```

### Token Impact

| Artifact | .md tokens | .cave tokens | Savings |
|----------|-----------|-------------|---------|
| Proposal | ~500 | ~120 | ~76% |
| Specs | ~800 | ~200 | ~75% |
| Design | ~1200 | ~350 | ~71% |
| Tasks | ~600 | ~150 | ~75% |
| **Full /sdd-ff** | **~3100** | **~820** | **~74%** |

Cumulative across a full SDD cycle (each artifact read by 2-4 downstream phases): **~6000-9000 tokens saved per change.**

### SDD Skill Integration

Template skills get a one-line instruction:
```
When reading SDD artifacts, prefer .cave files over .md files.
Output artifacts in .cave format (structured YAML).
```

---

## 3. Decision Traceability

### Lineage Model

Every artifact, decision, and requirement carries an ID. Cross-references create a DAG:

```
proposal.cave
  ├── R1 (risk) ──────────────────────────────┐
  └── _parent: null                            │
                                               ▼
specs.cave                              design.cave
  ├── REQ-1 ────────────────┐             ├── D1 (refs: R1)
  ├── REQ-2                 │             └── _parent: proposal.cave
  ├── SC-1 (refs: REQ-1)   │
  └── _parent: proposal.cave│
                            ▼
                      tasks.cave
                        ├── T1 (refs: REQ-1, D1)
                        ├── T2 (refs: D1, deps: T1)
                        └── _parent: [specs.cave, design.cave]
```

### chain.ts — Full Trace Query

```typescript
interface TraceResult {
  artifact: string;       // "tasks.cave"
  item: string;           // "T1"
  trace: TraceLink[];     // [T1 → REQ-1 → proposal, T1 → D1 → R1 → proposal]
}

function traceItem(changeDir: string, artifactId: string, itemId: string): TraceResult;
function traceChange(changeDir: string): ChangeTrace; // full DAG for the change
```

### metadata.ts — Phase Stamps

Each `.cave` artifact gets metadata appended at creation:

```yaml
_meta:
  created_by: sdd-propose    # which phase created it
  created_at: 2026-04-11T10:00:00Z
  approved_by: human          # or "auto" if no review gate
  approved_at: 2026-04-11T10:05:00Z
  token_count: 120            # measured at creation
```

### CLI Command

```bash
iatools trace --change my-feature --item T1
```

Renders as a styled tree panel showing the full lineage from task → requirement → decision → risk → proposal.

---

## 4. Safety Layer (Sanitization)

### Pattern Library

```typescript
interface PatternRule {
  id: string;
  regex: RegExp;
  label: string;
  severity: 'critical' | 'warning';
  replacement: string;
}
```

**Built-in patterns (critical):**
- `aws_key` — `AKIA[0-9A-Z]{16}`
- `jwt` — `eyJ[A-Za-z0-9_-]{10,}.[...].[...]`
- `generic_key` — `api[_-]?key|token|secret|password\s*[:=]\s*[A-Za-z0-9_\-/.+=]{16,}`
- `private_key` — `-----BEGIN (RSA |EC )?PRIVATE KEY-----`
- `connection_str` — `(mongodb|postgres|mysql|redis)://[^\s"']+`

**Built-in patterns (warning):**
- `email` — standard email regex
- `ipv4` — dotted quad
- `arn` — `arn:aws[a-zA-Z-]*:[...]+`

### User Configuration

```yaml
# .sdd/sanitize.yaml
patterns:
  - id: internal_url
    regex: "https://internal\\.mycompany\\.com/[^\\s]+"
    label: "Internal URL"
    severity: critical
    replacement: "[REDACTED:INTERNAL_URL]"
ignore:
  - email    # disable email detection for this project
```

### Interactive Review Flow

```
scanner.scan(text) → RedactionCandidate[]
  → sort by severity (critical first)
  → render in styled SanitizeReview prompts
  → user approves/rejects per candidate
  → redactor.apply(text, approvedCandidates) → sanitized text
  → audit.log(decisions) → .sdd/sanitize-audit.jsonl
```

### SanitizeReview UI

```
╭─ Sanitization Review ── 3 candidates found ─────────────────╮
│                                                              │
│  1/3  ● CRITICAL  AWS Access Key                             │
│                                                              │
│  Context:                                                    │
│  ...configured with AKIA████████████████ in the              │
│  production environment settings...                          │
│                                                              │
│  Match:  AKIAIOSFODNN7EXAMPLE                                │
│  Replace: [REDACTED:AWS_KEY]                                 │
│                                                              │
│  [y] Redact  [n] Keep  [a] Redact all  [s] Skip all  [q]    │
╰──────────────────────────────────────────────────────────────╯
```

- Context window: 40 chars before/after match
- `Redact all` scoped to current pattern type only
- Review mandatory on first ingestion, subsequent reuse audit decisions

### Audit Trail

```jsonl
{"ts":"2026-04-11T10:00:00Z","change":"rate-limit","patternId":"aws_key","match_hash":"sha256:ab3f...","decision":"redact","user":"interactive"}
```

Logs SHA-256 hash of match, never cleartext. Even the audit log is safe.

### Integration Points

- **Before memory ingestion:** scan → review → redact → persist
- **Before `.cave` file write:** same pipeline
- **Embedding generation:** always after sanitization
- **Ordering constraint:** sanitize FIRST, embed SECOND — vectors never represent unsanitized content

---

## 5. Memory Upgrade — Embeddings + Hybrid Retrieval

### New Schema

```sql
CREATE TABLE IF NOT EXISTS vectors (
  node_id    TEXT PRIMARY KEY REFERENCES nodes(id) ON DELETE CASCADE,
  embedding  BLOB NOT NULL,
  model      TEXT NOT NULL,
  dim        INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

One embedding per node. Stale embeddings (model mismatch) flagged for re-computation.

### Provider Chain

```
fallback.ts:
1. OPENAI_API_KEY or VERTEX_API_KEY set?
   yes → api-provider (text-embedding-3-small or gecko)
   no  → 2. onnxruntime-node installed?
           yes → local-provider (all-MiniLM-L6-v2, lazy require())
           no  → 3. BM25-only (FTS5 with tf-idf ranking)
                    Log once: "Install onnxruntime-node for semantic search"
```

### provider.ts Interface

```typescript
interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}
```

### Hybrid Ranking: Reciprocal Rank Fusion

Three channels return independent ranked lists. Fused via RRF:

```typescript
function fuseResults(
  ftsResults: RankedNode[],
  vectorResults: RankedNode[],
  graphResults: RankedNode[],
  k = 60
): ScoredNode[] {
  const scores = new Map<string, number>();
  for (const channel of [ftsResults, vectorResults, graphResults]) {
    for (const { nodeId, rank } of channel) {
      scores.set(nodeId, (scores.get(nodeId) ?? 0) + 1 / (k + rank));
    }
  }
  return [...scores.entries()]
    .map(([nodeId, score]) => ({ nodeId, score }))
    .sort((a, b) => b.score - a.score);
}
```

**Why RRF:** No training data needed. Degrades gracefully when channels are missing.

### Retrieval Flow (Human-Gated)

```bash
iatools memory query "rate limiting decisions"
```

Renders as a styled interactive table. User selects which nodes to inject into agent context. No autonomous injection.

### Backward Compatibility

- Existing `.sdd/memory.db` gets `vectors` table via migration on first run
- Nodes without embeddings work — they don't appear in vector results
- `memory export` includes vectors as base64 (optional `--no-vectors` flag)
- FTS5 + graph walk unchanged — embeddings are additive

---

## 6. Premium CLI UX (chalk/boxen/cli-table3)

### Technology

- **chalk** — styled terminal output
- **boxen** — bordered boxes and panels
- **cli-table3** — column-aligned tables
- **inquirer** — interactive prompts and multi-select
- **ora** — animated spinners
- **figures** — unicode symbols

### Theme System

```typescript
// theme.ts
export const theme = {
  colors: {
    primary: '#A855F7',     // purple (brand)
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
    muted: '#6B7280',
    accent: '#06B6D4',
  },
  borders: {
    panel: 'round',         // ╭╮╰╯
    table: 'single',        // ┌┐└┘
  },
  spacing: {
    indent: 2,
    sectionGap: 1,
  },
};
```

### Core Components

**Panel** — bordered container with title and optional status badge:
```
╭─ SDD Init ── step 2/4 ──────────────────────────────────────╮
│  Select your IDE(s):                                         │
│                                                              │
│  › ◉ GitHub Copilot                                          │
│    ◯ Cursor                                                  │
│    ◯ Gemini                                                  │
│    ◯ Generic                                                 │
│                                                              │
│  [Space] Toggle  [Enter] Confirm  [↑↓] Navigate             │
╰──────────────────────────────────────────────────────────────╯
```

**Banner** — replaces current chalk box:
```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│   🪄  iatools v2.0  ·  Spec-Driven Development              │
│   @lsframework/iatools                                       │
│                                                              │
╰──────────────────────────────────────────────────────────────╯
```

**Table** — for memory query results, trace output, stats.

**DiffView** — for sanitization review and caveman compress preview.

### Logger Shim

`logger.ts` detects environment and delegates:

```typescript
const isInteractive = process.stdout.isTTY && !process.env.CI;

export const logger = isInteractive
  ? styledLogger   // chalk/boxen-rendered output
  : plainLogger;   // Plain chalk fallback (CI, piped output)
```

### Screen Architecture

Each command maps to a screen:

| Command | Screen | Key interactions |
|---------|--------|-----------------|
| `init` | InitScreen | Multi-select IDE/roles via inquirer, confirmation panel |
| `memory ingest` | IngestScreen | Progress bar via ora, sanitization review inline |
| `memory query` | QueryScreen | Results table via cli-table3, node detail expand, select for export |
| `trace` | TraceScreen | Tree view of lineage DAG |

---

## 7. New CLI Commands (Summary)

| Command | Description |
|---------|-------------|
| `iatools init` | Existing — refactored to themed UI |
| `iatools update` | Existing — refactored to themed UI |
| `iatools memory export` | Existing — add `--no-vectors` flag |
| `iatools memory ingest` | Existing — add sanitization step |
| `iatools memory query <text>` | **New** — hybrid retrieval with interactive results |
| `iatools trace --change <name>` | **New** — full lineage DAG visualization |
| `iatools review <phase> --change <name>` | **New** — decompress `.cave` → `.md` for human review |
| `iatools compress --change <name>` | **New** — compress existing `.md` → `.cave` (migration) |

---

## 8. Testing Strategy

Each layer gets its own test suite:

| Layer | Test focus | Strategy |
|-------|-----------|----------|
| `safety/` | Pattern matching accuracy, false positive rates | Unit tests with known-good/known-bad inputs |
| `memory/` | Embedding provider chain, RRF ranking, migration | Unit + integration with test SQLite DB |
| `pipeline/` | .cave schema validation, compress/decompress round-trip, lineage integrity | Unit tests |
| `ui/` | Component rendering, prompt interactions | Unit tests with mock stdin/stdout |

**Coverage target:** ≥80% line + branch (per coding standards).

---

## 9. Migration Path

Existing v1.x users upgrading:

1. `iatools update` installs new templates with caveman instructions
2. First `memory` command triggers DB migration (adds `vectors` table)
3. Existing `.md` artifacts continue working — `.cave` is opt-in via `/sdd-ff` with updated skills
4. `iatools compress --change <name>` to convert existing changes to `.cave`
5. No breaking changes to `init` or `update` — Ink renders same choices, better UI
