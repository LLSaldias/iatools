# Design: iatools-v1.3.0

## 1. Architecture & Components

### 1.1. Direct Installation of Suggested Skills
- **Target File:** Likely `packages/iatools/src/commands/init.ts` or `packages/iatools/src/commands/install.ts` (wherever skill installation is triggered).
- **Changes:**
  - Retrieve the suggested skills based on the user's selected role from `packages/iatools/src/roles/index.ts`.
  - Bypass the logic that fetches the full list of repository skills and prompts the user to select them.
  - Automatically proceed to install the skills defined in the role's `suggestedExternalSkills` array.
  - Optionally, add an `--all` flag or similar to trigger the old prompt behavior if explicitly requested.

### 1.2. Prune and Update `sdd-*` Skills Only
- **Target File:** Skill installation logic handling the `--update` flag.
- **Changes:**
  - When `--update` is passed, filter the skills to be updated. Only process skills where the name starts with `sdd-`.
  - For each `sdd-*` skill, remove its existing directory before downloading the new version to ensure a clean slate (pruning).
  - All other skills (non-`sdd-*` prefixes) in the `.agent/skills/` directory should be explicitly ignored during the prune and update cycle.

### 1.3. Windows Symlink Fallback
- **Target File:** The utility function responsible for creating symlinks, potentially in a `utils/fs.ts` or directly within the install command.
- **Changes:**
  - Wrap the `fs.ensureSymlink` calls in a `try...catch` block.
  - If an `EPERM` error is caught (common on Windows without admin/dev mode), fallback to `fs.copy`.
  - Example implementation:
    ```typescript
    try {
        await fs.ensureSymlink(srcPath, destPath);
    } catch (e: any) {
        if (e.code === 'EPERM') {
            await fs.copy(srcPath, destPath, { overwrite: true });
        } else {
            throw e;
        }
    }
    ```

### 1.4. Arguments in Workflow Commands
- **Target File:** `packages/iatools/src/workflows/runner.ts` or similar workflow parsing logic.
- **Changes:**
  - Modify the regex or splitting logic used to parse workflow steps.
  - Ensure that when a command like `sdd:plan` or `/sdd-plan <arg>` is encountered, the command and its arguments are correctly tokenized and passed to the execution engine.
  - Update `child_process.spawn` or the relevant executor to accept the full array of arguments natively.

## 2. Dependencies
- `fs-extra`: Used for file operations (`ensureSymlink`, `copy`, `remove`).

## 3. Data Models / Schemas
- No new data models are required for these changes.
