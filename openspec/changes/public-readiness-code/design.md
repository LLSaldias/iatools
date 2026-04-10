# Design: Public Readiness — Code

## Technical Approach

This change prepares `@lsframework/iatools` for its first public `npm publish` by addressing four categories: package.json hygiene (A), a new `changelog` CLI command (B), confidential data cleanup (C), and `NO_COLOR` support (D). Each category is independent and can be implemented/tested in isolation. The changelog command follows the existing command pattern established by `memory-ingest.ts` (async exported function, options interface, logger/ora, early validation). The NO_COLOR support is a single-point change in `logger.ts` using chalk v4's built-in `Level` API.

## Architecture Decisions

### Decision: Proposal Parsing Strategy

**Choice**: Simple regex/string-based section extraction using `## ` header detection and line-by-line accumulation.  
**Alternatives considered**: (1) Markdown AST library (e.g., `remark`, `unified`); (2) Manual line-splitting with indexOf.  
**Rationale**: All archived `proposal.md` files follow a consistent SDD template with `## Intent`, `## Scope`, `### In Scope` headings. A regex approach (`/^##\s+(.+)$/m`) is sufficient, adds zero dependencies, and matches the project's convention of avoiding unnecessary external packages. An AST library would add ~5 MB of dependencies for a parsing task that doesn't need tree traversal. The simple approach is also easier to test with plain string fixtures.

### Decision: Changelog Entry Categorization

**Choice**: Keyword heuristic mapping from proposal text to Keep-a-Changelog sections.  
**Alternatives considered**: (1) LLM-based categorization; (2) Manual category tags in proposals; (3) Freeform single section.  
**Rationale**: The spec explicitly forbids LLM calls. Adding category tags would require retroactive changes to archived proposals. Keyword heuristics (e.g., "add"/"new"/"create" → Added, "fix"/"bug"/"patch" → Fixed, "remove"/"delete"/"drop" → Removed, else → Changed) provide a reasonable 80/20 categorization that users can refine via `--dry-run` before committing. This matches how the proposal `## Intent` sections are naturally written.

### Decision: Semver Bump Suggestion Logic

**Choice**: Derive from categorized entries — if any "Removed" entries exist → `major` suggestion; if any "Added" entries → `minor`; otherwise → `patch`.  
**Alternatives considered**: (1) Parse conventional commit messages; (2) Count lines changed.  
**Rationale**: SDD doesn't use conventional commits. The categorization heuristic already classifies changes; deriving the bump from categories is consistent and predictable. This is a *suggestion* only — `--version` overrides it.

### Decision: NO_COLOR Implementation via chalk.level

**Choice**: Set `chalk.level = 0` when `process.env.NO_COLOR` is a non-empty string, at module initialization time in `logger.ts`.  
**Alternatives considered**: (1) Wrap every chalk call with a conditional; (2) Replace chalk with a custom no-op proxy; (3) Use `chalk.supportsColor`.  
**Rationale**: chalk v4 (the version used: `^4.1.2`, CommonJS) supports setting `chalk.level = 0` which disables all ANSI codes globally for that chalk instance. This is the officially documented approach, requires a single line of code at the top of `logger.ts`, and automatically affects all existing `chalk.*` calls without modifying any of them. Per the no-color.org spec, `NO_COLOR` is respected when set to any non-empty value.

### Decision: Changelog Output Target

**Choice**: Write to `packages/iatools/CHANGELOG.md` (the package-level changelog), not the root `CHANGELOG.md`.  
**Alternatives considered**: Writing to root changelog; writing to both.  
**Rationale**: The root `CHANGELOG.md` is a monorepo index that links to package changelogs. The detailed entries belong in the package changelog, consistent with the existing structure where `CHANGELOG.md` (root) contains `[Version X of package iatools](/packages/iatools/CHANGELOG.md#...)` references.

### Decision: No New Dependencies

**Choice**: Implement all new functionality using only the existing dependency set (fs-extra, chalk, commander, ora, path).  
**Alternatives considered**: Adding `marked` or `remark` for markdown parsing; adding `semver` for version validation.  
**Rationale**: The proposal explicitly states "No external package dependencies required." Simple regex parsing is sufficient for the structured proposal format. Semver validation can be done with a basic regex (`/^\d+\.\d+\.\d+$/`) since the scope is limited to stamping a version string, not computing ranges.

## Data Flow

### Changelog Command Flow

```
iatools changelog [--version X.Y.Z] [--dry-run] [--dir <path>]
     │
     ▼
 Resolve projectRoot (--dir or cwd)
     │
     ▼
 Scan openspec/changes/archive/
     │  fs.readdir(archiveDir, { withFileTypes: true })
     │  Filter: isDirectory()
     ▼
 For each archive dir:
     │  Read proposal.md
     │  Extract ## Intent section  ──→  entry summary text
     │  Extract ## Scope / ### In Scope ──→  detail bullets
     │  Categorize via keywords  ──→  Added | Changed | Removed | Fixed
     ▼
 Aggregate entries by category
     │
     ├── Suggest semver bump (if no --version)
     │   Removed present? → major
     │   Added present?   → minor
     │   else             → patch
     │
     ▼
 Format Keep-a-Changelog block
     │  ## [X.Y.Z] - YYYY-MM-DD
     │  ### Added
     │  - entry 1
     │  ### Fixed
     │  - entry 2
     │
     ├─── --dry-run? ──→ Print to stdout, exit
     │
     ▼
 Read existing CHANGELOG.md
     │  Insert new block after the header (before first ## [)
     │  Write back
     ▼
 logger.success("Changelog entry written")
```

### NO_COLOR Flow

```
Module load: logger.ts
     │
     ▼
 Check process.env.NO_COLOR
     │
     ├── Non-empty string? → chalk.level = 0  (all ANSI disabled)
     │
     └── Undefined or ""?  → chalk.level unchanged (colors preserved)
     │
     ▼
 All logger.* methods use chalk normally
 (chalk internally respects level = 0)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/iatools/package.json` | Modify | Remove both duplicate `@lsframework/iatools: workspace:*` entries from `dependencies`; add `repository`, `homepage`, `bugs`, `keywords` fields; add `prepublishOnly` script |
| `packages/iatools/src/commands/changelog.ts` | Create | New CLI command: scan archive, parse proposals, categorize, format KAC entries, write/preview |
| `packages/iatools/src/cli.ts` | Modify | Import and register `changelog` command with `--version`, `--dry-run`, `--dir` options |
| `packages/iatools/src/utils/logger.ts` | Modify | Add `NO_COLOR` check at module initialization: `if (process.env.NO_COLOR) chalk.level = 0;` |
| `CHANGELOG.md` (root) | Modify | Remove ghost `another-package` and `example-package` entries from `[1.0.0]` section |
| `README.md` (root) | Modify | Replace GitLab pipeline reference (line ~191, "El pipeline de GitLab en `master` publicará automáticamente los paquetes.") with generic publish guidance |
| `.gitignore` (root) | Modify | Remove `*/helm_vars/desa/secrets.yaml.dec` line |
| `openspec/changes/automatic-memory-ingest-on-archive/exploration.md` | Modify | Remove/redact the local absolute path `/Users/lucassaldias/.copilot/skills/sdd-archive/SKILL.md` |
| `packages/iatools/test/unit/changelog.test.ts` | Create | Unit tests for the changelog command |
| `packages/iatools/test/unit/logger-nocolor.test.ts` | Create | Unit tests for NO_COLOR behavior |

## Interfaces / Contracts

### Changelog Command Types

```typescript
// packages/iatools/src/commands/changelog.ts

/** A single changelog entry derived from one archived proposal */
export interface ChangelogEntry {
  /** Keep-a-Changelog category */
  category: 'Added' | 'Changed' | 'Removed' | 'Fixed';
  /** Single-line summary for the changelog bullet */
  summary: string;
  /** Source archive directory name (e.g., "2026-04-08-memory-ingest-batch") */
  source: string;
}

/** Parsed content from one archived proposal.md */
export interface ArchivedChange {
  /** Directory name (e.g., "2026-04-08-memory-ingest-batch") */
  dirName: string;
  /** Extracted Intent section text */
  intent: string;
  /** Extracted In Scope bullet points */
  scopeItems: string[];
}

/** Options accepted by the changelog command */
export interface ChangelogOptions {
  /** Target semver version string (e.g., "1.6.0"). If omitted, auto-suggests. */
  version?: string;
  /** Preview output to stdout without writing to CHANGELOG.md */
  dryRun: boolean;
  /** Project root directory */
  dir: string;
}

/** Suggested semver bump result */
export interface BumpSuggestion {
  /** Suggested bump type */
  type: 'major' | 'minor' | 'patch';
  /** Human-readable reason for the suggestion */
  reason: string;
}
```

### Function Signatures

```typescript
/**
 * Entry point for `iatools changelog`. Registered in cli.ts.
 * Follows the same async-function pattern as runMemoryIngest.
 */
export async function runChangelog(options: ChangelogOptions): Promise<void>;

/**
 * Scan the archive directory and return parsed proposals.
 * Logs a warning and skips proposals missing ## Intent.
 */
export function scanArchive(archiveDir: string): Promise<ArchivedChange[]>;

/**
 * Parse a single proposal.md content into an ArchivedChange.
 * Returns null if ## Intent section is not found.
 */
export function parseProposal(content: string, dirName: string): ArchivedChange | null;

/**
 * Categorize an ArchivedChange into ChangelogEntry items
 * using keyword heuristics on the intent and scope text.
 */
export function categorizeChange(change: ArchivedChange): ChangelogEntry[];

/**
 * Suggest a semver bump based on the categorized entries.
 */
export function suggestBump(entries: ChangelogEntry[]): BumpSuggestion;

/**
 * Format entries into a Keep-a-Changelog markdown block.
 */
export function formatChangelog(
  version: string,
  date: string,
  entries: ChangelogEntry[]
): string;
```

### CLI Registration (in cli.ts)

```typescript
program
  .command('changelog')
  .description('📋  Generate changelog entries from archived SDD changes')
  .option('--version <semver>', 'stamp this version on the entry')
  .option('--dry-run', 'preview to stdout without writing', false)
  .option('--dir <path>', 'target project directory', process.cwd())
  .action(async (options: { version?: string; dryRun: boolean; dir: string }) => {
    const projectRoot = path.resolve(options.dir);
    await runChangelog({ ...options, dir: projectRoot });
  });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `parseProposal` — extracts Intent and Scope from well-formed proposal | Feed real archive proposal strings; assert `intent` and `scopeItems` fields |
| Unit | `parseProposal` — returns null for proposal missing `## Intent` | Feed a proposal without that heading; assert null return |
| Unit | `categorizeChange` — maps "add"/"new" keywords to `Added` | Feed ArchivedChange with "Add batch mode" intent; assert category |
| Unit | `categorizeChange` — maps "remove"/"delete" keywords to `Removed` | Feed ArchivedChange with "Remove skills command" intent; assert category |
| Unit | `categorizeChange` — maps "fix"/"bug" keywords to `Fixed` | Feed ArchivedChange with "Fix duplicate dependency" intent; assert category |
| Unit | `categorizeChange` — defaults to `Changed` when no keywords match | Feed a generic proposal; assert `Changed` category |
| Unit | `suggestBump` — returns `major` when Removed entries present | Build entries array with Removed; assert `type === 'major'` |
| Unit | `suggestBump` — returns `minor` when Added entries present (no Removed) | Build entries array with Added only; assert `type === 'minor'` |
| Unit | `suggestBump` — returns `patch` when only Changed/Fixed present | Build entries; assert `type === 'patch'` |
| Unit | `formatChangelog` — produces valid KAC block | Pass version, date, entries; assert output matches expected markdown with `## [X.Y.Z] - YYYY-MM-DD` header and categorized subsections |
| Unit | `scanArchive` — reads directories and parses proposals | Use `memfs` or mock `fs-extra`; create fake archive dirs; assert ArchivedChange array |
| Unit | `scanArchive` — skips dirs without `proposal.md` | Mock archive with an empty dir; assert it's skipped with warning |
| Unit | `runChangelog --dry-run` — prints to stdout, does not write | Mock fs-extra, spy on console.log; assert no `writeFile` call |
| Unit | `runChangelog` — writes to CHANGELOG.md when not dry-run | Mock fs-extra read/write; assert `writeFile` called with correct content |
| Unit | `runChangelog` — empty archive prints warning, exits 0 | Mock empty archiveDir; assert logger.warn called, no crash |
| Unit | NO_COLOR set → chalk.level is 0 | Set `process.env.NO_COLOR = '1'`, re-import logger, capture output, assert no `\x1b[` sequences |
| Unit | NO_COLOR empty → chalk.level unchanged | Set `process.env.NO_COLOR = ''`, re-import logger, capture output, assert ANSI sequences present |
| Unit | NO_COLOR undefined → chalk.level unchanged | Delete `process.env.NO_COLOR`, re-import logger, assert default chalk behavior |
| Unit | Banner output respects NO_COLOR | Set NO_COLOR, call `logger.banner()`, assert output has box chars but no ANSI codes |

### Test File Organization

```
packages/iatools/test/unit/
├── iatools.test.ts              # Existing tests (unchanged)
├── changelog.test.ts            # New: all changelog command tests
└── logger-nocolor.test.ts       # New: NO_COLOR behavior tests
```

### Test Conventions (from existing codebase)

- Jest with `@/` path alias via `moduleNameMapper`
- Mock `fs-extra`, `ora`, and `@/memory/*` at the top of test files
- Use `jest.spyOn(console, 'log')` to capture logger output
- For NO_COLOR tests: use `jest.resetModules()` + dynamic `require()` to re-evaluate the module with different env values

## Migration / Rollout

No migration required. All changes are backward-compatible:
- The new `changelog` command is additive — no existing command behavior changes.
- `NO_COLOR` is opt-in via environment variable — default behavior is unchanged.
- package.json metadata additions do not affect runtime behavior.
- Confidential data removal is a one-way improvement.

## Open Questions

- [x] All questions resolved during design — no open items.
