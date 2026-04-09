# Spec: CLI Commands — focus-on-memory

> Delta spec. Applies to `packages/iatools`.

## Domain
`iatools` CLI command surface.

## Requirements

### MUST
- **S-CLI-01**: The `skills add <url>` command and the `skills` parent command MUST be removed from the CLI.
- **S-CLI-02**: The `cli.ts` file MUST NOT import or reference `skills-add.ts` after this change.
- **S-CLI-03**: The `init` command MUST NOT trigger any remote network call during its execution.
- **S-CLI-04**: The `init` command MUST NOT call `maybeInstallSuggestedSkills` or any equivalent function.
- **S-CLI-05**: The `update` command MUST NOT iterate over `templates/skills/` or prune/copy any skill directories.
- **S-CLI-06**: Running `iatools --help` MUST NOT list a `skills` command.

### SHOULD
- **S-CLI-07**: The `update` command output message SHOULD NOT reference skills (e.g., "Skills and workflows refreshed" → "SDD framework files refreshed").

### MAY
- **S-CLI-08**: The `update` command MAY retain all other behavior (constitution refresh, workflows, openspec schemas).

## Scenarios

### Scenario 1: init completes offline
```
Given a user runs `iatools init` in a project with no network
When they complete the wizard prompts
Then the command finishes successfully
And no external URLs are requested
```

### Scenario 2: skills command does not exist
```
Given a user runs `iatools skills add https://github.com/org/repo`
When the CLI parses the command
Then it exits with an unknown command error
And does not download any files
```

### Scenario 3: update skips skills
```
Given a user runs `iatools update`
When the update command runs
Then only agents/, workflows/, and openspec schema files are refreshed
And no entry in templates/skills/ is read, pruned, or copied
```
