# Specs: iatools-v1.3.0

## 1. Feature Specifications

### 1.1. Direct Installation of Suggested Skills
- Instead of downloading and prompting for all available repository skills, the `init` or `install` command should directly install the predefined selected suggested skills aligned with the user's role/setup.
- The prompt listing all repository skills will be bypassed or only shown if explicitly requested.

### 1.2. Prune and Update `sdd-*` Skills Only
- The `--update` flag behavior should be modified.
- It will exclusively target skills matching the pattern `sdd-*`.
- The update process will prune existing `sdd-*` skills and download them again.
- Other existing skills should be ignored and left intact during this update process.

### 1.3. Windows Symlink Fallback
- Windows sometimes raises an `EPERM` error when attempting to create symlinks without administrator privileges or developer mode enabled.
- A fallback mechanism must be implemented:
  ```typescript
  try {
      await fs.ensureSymlink(srcPath, destPath);
  } catch (e) {
      if (e.code === 'EPERM') {
          await fs.copy(srcPath, destPath);
      } else {
          throw e;
      }
  }
  ```
- This ensures cross-platform reliability when installing templates.

### 1.4. Arguments in Workflow Commands
- The CLI must support passing commands with arguments natively in the workflow execution.
- Example syntax to support: `sdd:plan` or similar identifiers.
- Workflow parsing logic needs to extract base commands and their arguments to pass them correctly to the execution engine.

## 2. Technical Considerations
- Ensure robust error handling when `fs.copy` executes as the fallback.
- CLI argument parsing must accurately distinguish between flags (like `--update`), workflow commands, and workflow arguments.
- Safe deletion (pruning) of `sdd-*` skills to avoid unintended loss of custom user skills.
