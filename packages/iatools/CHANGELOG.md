# Changelog

## [1.6.0] - 2026-04-08

### Added
- **`memory ingest --all` flag**: New batch mode that scans all active changes in `openspec/changes/` (excluding `archive/`) and generates an LLM extraction prompt for each change that contains a `proposal.md`. Prints a per-change summary (`✓ done`, `⚠ skipped`, `✗ error`) on completion.
- **Mutual-exclusivity guard**: `--all` and `--change` cannot be used together; exits with a clear error message.

## [1.5.0] - 2026-04-08

### Added
- **`memory ingest` command**: New `iatools memory ingest --change <name>` command that drives the SDD Memory System ingestion loop. Generates an LLM extraction prompt from an approved proposal (`--change`) and ingests the resulting JSON into `.sdd/memory.db` (`--from <file>`).
- **Dry-run mode**: `--dry-run` flag previews nodes and edges that would be inserted without writing to the database.
- **Jest moduleNameMapper**: Added `@/` alias resolution to `packages/iatools/jest.config.js` so the `@/` path alias used throughout the source resolves correctly in tests.

## [1.4.0] - 2026-04-08

### Removed
- **`skills add` command**: Removed skills management from the CLI. Skills installation is a user-space concern outside the scope of the framework bootstrapper.
- **`maybeInstallSuggestedSkills`**: Removed automatic remote skill fetching from the `init` flow. `iatools init` no longer makes network calls to GitHub during project setup.
- **Skills lock files**: Removed `skills-lock.json` from the monorepo; no longer needed without skills management.
- **`axios` dependency**: Removed `axios` from runtime dependencies.
- **Opinionated spec templates**: Removed `architecture.md` and `coding-standards.md` from the `openspec/` template. These are project-specific and should be created via `/sdd-archive`.

### Changed
- **`update` command**: Simplified to refresh only SDD-core files (agents, workflows, openspec schemas). Skills directory is no longer scanned or updated.
- **`init` scaffolding**: `openspec/specs/` directory is now always created on init, even when empty, ensuring a predictable project structure.
- **Post-update log message**: `'Skills and workflows refreshed from latest templates.'` → `'SDD framework files refreshed from latest templates.'`

## [1.3.0] - 2026-02-26

### Added
- **Direct Skills Installation**: Added automatic installation of predefined role-driven skills during project initialization, bypassing the manual repository skill selection prompt.
- **Windows Symlink Fallback**: Implemented a fallback mechanism (`fs.copy`) for Windows users to gracefully handle `EPERM` errors when creating symlinks.

### Changed
- **Selective Skills Updates**: Modified the `--update` flag behavior to exclusively target and prune/reinstall skills starting with the `sdd-` prefix, preserving custom skills.


## [1.2.0] - 2026-02-23

- improve friction of init command

## [1.1.0] - 2026-02-23

### Added
- Enhanced `--help` output with "SDD Flows" section listing all slash commands
- Example usage for all SDD flow commands in help output

### Improved
- Frictionless `--init` flow:
  - Automatic detection of existing IDE and role configurations
  - Skills are now installed with symlinks for real-time updates and better IDE discovery
  - Direct installation of skills into the project's `.agents/skills/` directory
  - Option to skip IDE selection for manual configuration

## [1.0.0] - 2026-02-20

### Added
- Initial release of `@nx-cardbuilding/iatools`
- Interactive `--init` wizard: IDE selection + multi-role setup
- `--update` command to refresh agents and skills
- `skills add <url>` command for installing external skill packs from GitHub
- SDD skill templates: explore, new, ff, apply, verify, archive, continue, sync
- Workflow (slash command) templates for all SDD phases
- Role profiles: frontend, backend, qa, architect, product
- Role-specific bundled skills per role
- IDE adapters: Cursor, GitHub Copilot, Gemini/Antigravity, Generic
- `openspec/` directory scaffolding with config, schemas, and initial specs
# Changelog

## [1.0.0] - 2026-02-20

### Added
- Initial release of `@nx-cardbuilding/iatools`
- Interactive `--init` wizard: IDE selection + multi-role setup
- `--update` command to refresh agents and skills
- `skills add <url>` command for installing external skill packs from GitHub
- SDD skill templates: explore, new, ff, apply, verify, archive, continue, sync
- Workflow (slash command) templates for all SDD phases
- Role profiles: frontend, backend, qa, architect, product
- Role-specific bundled skills per role
- IDE adapters: Cursor, GitHub Copilot, Gemini/Antigravity, Generic
- `openspec/` directory scaffolding with config, schemas, and initial specs
