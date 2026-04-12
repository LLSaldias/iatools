# Proposal: Token Cost Tracking

## Intent

SDD changes produce markdown artifacts (proposal, specs, design, tasks, verify-report) but there's no visibility into the token cost of each change. Add archive-time word/token calculation so teams can understand the cost footprint of their changes.

## Scope

### In Scope
- Calculate word count and estimated token count for all `.md` artifacts in a change at archive time
- Use the formula: `words × 1.33 ≈ tokens` (~750 words ≈ 1000 tokens)
- Add a `stats` section to `.openspec.yaml` with per-artifact and total counts
- Include a token cost summary line in the archive process output

### Out of Scope
- Real-time per-phase token tracking (future enhancement)
- Actual LLM API cost estimation (requires model/pricing data)
- CLI `iatools stats` command (separate change)
- Modifying any existing SDD phase skill other than sdd-archive

## Approach

Enhance the `sdd-archive` skill to count words in all `.md` files within the change folder before archiving. Compute `tokens = words × 1.33` (rounded). Write stats into `.openspec.yaml` under a new `stats` key. Print summary to user.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `sdd-archive` skill | Modified | Add word/token counting step |
| `.openspec.yaml` | Modified | Add `stats` section with per-artifact metrics |
| `openspec/schemas/spec-driven.yaml` | Modified | Add optional `stats` schema |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Markdown syntax inflates token count vs plain text | Medium | Document that estimate is approximate |
| `.openspec.yaml` schema change breaks existing tooling | Low | `stats` is additive/optional, no existing code reads it |

## Rollback Plan

Remove the stats calculation block from sdd-archive skill. The `stats` key in `.openspec.yaml` is optional and can be ignored by all other phases.

## Dependencies

- None — this is a self-contained enhancement to the archive phase

## Success Criteria

- [ ] Archiving a change adds `stats` section to `.openspec.yaml` with word count and token estimate per artifact
- [ ] Total words and tokens are displayed during archive
- [ ] Existing archives are not affected (stats only added to new archives)
