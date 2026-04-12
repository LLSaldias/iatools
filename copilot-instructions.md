# Copilot Instructions - LS Framework Monorepo

## Project Context
This is a monorepo managed with **Lerna** and **Bun**, using **TypeScript**, **Jest**, and **Workspaces**. The project allows managing multiple packages independently within a single repository.

## Development Rules

### 1. File and Folder Structure
- **NEVER** create files outside the `packages/*` structure
- Each new package must follow the standard structure:
  ```
  packages/
  ├── package-name/
  │   ├── src/
  │   │   └── index.ts
  │   ├── test/
  │   │   └── unit/
  │   │       └── *.test.ts
  │   ├── package.json
  │   ├── tsconfig.json
  │   ├── jest.config.js
  │   └── CHANGELOG.md
  ```
- Shared modules go in `packages/sharedModules/`

### 2. Naming Conventions
- **Package names**: Use the format `@lsframework/{package-name}` in package.json
- **Files**: Use kebab-case for file names (`my-module.ts`)
- **Classes and interfaces**: PascalCase (`MyClass`, `IMyInterface`)
- **Functions and variables**: camelCase (`myFunction`, `myVariable`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)

### 3. Package.json Rules
- **ALWAYS** include these mandatory scripts in each package:
  ```json
  {
    "scripts": {
      "compile": "tsc",
      "test": "jest --detectOpenHandles",
      "coverage": "jest --coverage --detectOpenHandles",
      "lint": "eslint ./src ./test",
      "fix": "eslint --fix ./src ./test",
      "dependency-check": "depcheck ."
    }
  }
  ```
- Properly configure `main`, `typings`, `files`, and `directories`
- Use independent versioning (do not switch to `fixed` mode)

### 4. TypeScript Configuration
- **NEVER** modify the root `tsconfig.json` without justification
- Always extend from the root tsconfig in individual packages
- Maintain `target: "ES2021"` and `module: "CommonJS"`
- **ALWAYS** enable `strict: true`

### 5. Configuration Files Review
- **ALWAYS** review configuration files before making changes:
  - `.eslintrc.js` or ESLint configuration
  - `.prettierrc` or Prettier configuration
  - `jest.config.js` in each package
  - `tsconfig.json` both root and package-level
- Validate that configurations are consistent across packages
- Do not modify configurations without understanding the impact on the entire monorepo

### 6. Code Documentation Rules
- **FORBIDDEN** to write inline comments in code (// comments)
- **ONLY** use JSDoc for documentation:
  ```typescript
  /**
   * Function description
   * @param param1 Parameter description
   * @returns Return value description
   * @example
   * ```typescript
   * const result = myFunction('example');
   * ```
   */
  function myFunction(param1: string): string {
    return param1.toUpperCase();
  }
  ```
- JSDoc is mandatory for all public functions and classes
- Include usage examples when relevant

### 7. Testing Rules
- **MANDATORY** to write tests for every public function
- Unit tests go in `test/unit/`
- Use the predefined Jest configuration
- **Mandatory coverage**: 80% per package - NON-NEGOTIABLE
- Name test files: `*.test.ts`
- **ALWAYS ask** before implementing tests: Do you prefer TDD (Test-Driven Development)?

### 8. Commands and Scripts
#### Root-level commands (from the main folder):
```bash
npm install          # Install all dependencies
npm run compile      # Build all packages
npm run test         # Run tests for all packages
npm run lint         # Lint all packages
npm run clean        # Clean previous builds
```

#### To work on a specific package:
```bash
cd packages/{package-name}
npm run compile
npm run test
```

### 9. Dependency Management
- **NEVER** install dependencies directly in individual packages
- Common devDependencies go in the root package.json
- **ALWAYS** run `npm run dependency-check` before committing

### 10. Import/Export Patterns
#### To import between monorepo packages:
```typescript
import { myFunction } from '@lsframework/other-package';
import { sharedUtil } from '@lsframework/sharedModules';
```

#### To export from a package:
```typescript
// src/index.ts
export { MyClass } from './my-class';
export { myFunction } from './my-function';
export type { MyInterface } from './types';
```

### 11. Git and Versioning
- Follow the defined **Branching Strategy**
- **NEVER** commit without passing: lint, tests, dependency-check, security-check
- Commits should be package-specific when possible
- Use conventional commits: `feat(package-name): description`

### 12. Security and Quality
- **MANDATORY** to run `npm run security-check` before release
- Do not use unaudited dependencies
- Keep dependencies up to date
- Follow ESLint rules without exceptions

### 13. Publishing
#### Local testing before publishing:
```bash
npm run build
cd packages/{package-name}
npm pack --pack-destination ~
```

#### Official publishing:
- Use `npm run publish-artifacts` from the root
- Only from authorized branches per the branching strategy
- **NEVER** manually publish individual packages

### 14. Shared Modules Best Practices
- Place common utilities in `packages/sharedModules/`
- Avoid circular dependencies between packages
- Clearly document public APIs
- Maintain backward compatibility in shared modules

### 15. Important Prohibitions
❌ **DO NOT**:
- Modify `lerna.json` without approval
- Change the workspaces configuration
- Install dependencies globally in packages
- Bypass pre-commit hooks
- Use `any` type without documented justification
- Create packages outside of `packages/`
- Modify CI/CD scripts without review
- Write inline comments (// comments) - Only JSDoc allowed

### 16. Code Review Checklist
Before approving a PR, verify:
- [ ] Tests pass in all affected packages
- [ ] Linter passes without errors
- [ ] Coverage maintains the mandatory 80%
- [ ] Dependency check passes
- [ ] Security check passes
- [ ] Configurations reviewed (ESLint, Prettier, Jest, TSConfig)
- [ ] Only JSDoc used for documentation (no inline comments)
- [ ] Documentation updated if necessary
- [ ] Changelog updated in modified packages

### 17. Performance and Optimization
- Leverage workspace dependency hoisting
- Use `lerna run --parallel` for commands that support it
- Maintain incremental builds when possible
- Avoid code duplication between packages

---

**Remember**: This template is designed to facilitate collaborative development and managing multiple packages. Following these rules ensures consistency, quality, and maintainability of the project.
