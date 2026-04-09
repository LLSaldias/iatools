# Proposal: iatools-v1.3.0

## 1. Problem Statement
*(Describe the problems or missing features this change addresses)*

## 2. Proposed Solution
*(High-level description of the solution for version 1.4.0)*

## 3. Scope
- **In Scope:**
  - install suggested skills directly without show all the repo's skils
  - --update command must prune and download again the sdd-* skills and ignore the rest
  - repair for windows that now allow symlink
    ```
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
  -  add arguments to the workflows commnand like https://skills.sh/neolabhq/context-engineering-kit/sdd:plan
- **Out of Scope:**
  - Precall to select the correct and eficient model that must handle the workflow step session

## 4. Alternate Solutions Considered
- *(Identify any alternative approaches and why they were not chosen)*
