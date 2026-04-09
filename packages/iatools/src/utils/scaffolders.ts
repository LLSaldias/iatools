/**
 * `--init` command: interactive wizard that guides the developer through
 * IDE selection and role(s) selection, then scaffolds the full SDD framework.
 */

import * as path from 'path';
import {
  copyTemplateDir,
  writeFile,
  interpolate,
  ensureDir,
} from '@/utils/file-writer';
import { type RoleId } from '@/roles/index';
import * as fs from 'fs-extra';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

/**
 * Scaffold the agent directory by creating necessary files and directories.
 * @param { string } projectRoot - Absolute path to the target project root
 * @param { string } agentDir - Absolute path to the target agent directory
 * @param { RoleId[] } roles - Array of role identifiers
 * @param { Record<string, string> } vars - Variables for template interpolation
 * @param { boolean } overwrite - If true, overwrite existing files
 */
export async function scaffoldAgents(
  projectRoot: string,
  agentDir: string,
  roles: RoleId[],
  vars: Record<string, string>,
  overwrite: boolean
): Promise<void> {
  await ensureDir(agentDir);

  const constitutionSrc = path.join(TEMPLATES_DIR, 'agents', 'constitution.md');
  const constitutionRaw = await fs.readFile(constitutionSrc, 'utf8');
  const constitutionContent = interpolate(constitutionRaw, vars);
  await writeFile({
    dest: path.join(agentDir, 'constitution.agent.md'),
    content: constitutionContent,
    overwrite,
  });

  for (const roleId of roles) {
    const roleSrc = path.join(TEMPLATES_DIR, 'agents', 'roles', `${roleId}.md`);
    const roleRaw = await fs.readFile(roleSrc, 'utf8');
    const roleContent = interpolate(roleRaw, vars);
    await writeFile({
      dest: path.join(agentDir, 'roles', `${roleId}.agent.md`),
      content: roleContent,
      overwrite,
    });
  }
}

/**
 * Scaffold the skills directory by creating symlinks to the template skills.
 * @param { string } skillsDir - Absolute path to the target skills directory
 */
export async function scaffoldSkills(skillsDir: string): Promise<void> {
  const skillsSrc = path.join(TEMPLATES_DIR, 'skills');
  await fs.ensureDir(skillsDir);

  const entries = await fs.readdir(skillsSrc);
  for (const entry of entries) {
    const srcPath = path.join(skillsSrc, entry);
    const destPath = path.join(skillsDir, entry);
    if (await fs.pathExists(destPath)) {
      await fs.remove(destPath);
    }

    try {
      await fs.ensureSymlink(srcPath, destPath);
    } catch (e: any) {
      if (e.code === 'EPERM') {
        await fs.copy(srcPath, destPath, { overwrite: true });
      } else {
        throw e;
      }
    }
  }
}

/**
 * Scaffold the workflows directory by copying template files.
 * @param { string } workflowsDir - Absolute path to the target workflows directory
 * @param { Record<string, string> } vars - Variables for template interpolation
 * @param { boolean } overwrite - If true, overwrite existing files
 */
export async function scaffoldWorkflows(
  workflowsDir: string,
  vars: Record<string, string>,
  overwrite: boolean
): Promise<void> {
  const workflowsSrc = path.join(TEMPLATES_DIR, 'workflows');
  await copyTemplateDir(workflowsSrc, workflowsDir, vars, overwrite);
}

/**
 * Scaffold the Copilot configuration file by creating necessary files and directories.
 * @param { string } projectRoot - Absolute path to the target project root
 * @param { Record<string, string> } vars - Variables for template interpolation
 * @param { boolean } overwrite - If true, overwrite existing files
 */
export async function scaffoldCopilotConfig(
  projectRoot: string,
  vars: Record<string, string>,
  overwrite: boolean
): Promise<void> {
  const copilotDir = path.join(projectRoot, '.github');
  const copilotFile = path.join(copilotDir, 'copilot-instructions.md');

  const content = `
# SDD Framework: Spec-Driven Development
You are an expert AI agent integrated into an SDD workflow. 
Always prioritize the files in \`openspec/\` as the "Source of Truth".

## Custom Commands (Pseudo-Slash Commands)
When the user mentions or types these patterns, follow the corresponding workflow file:

- **/sdd-new**: Follow instructions in \`.agents/workflows/sdd-new.md\` to initialize a change.
- **/sdd-ff**: Follow \`.agents/workflows/sdd-ff.md\` to generate specs and plans.
- **/sdd-apply**: Follow \`.agents/workflows/sdd-apply.md\` to implement code.
- **/sdd-verify**: Follow \`.agents/workflows/sdd-verify.md\` to validate the work.
- **/sdd-archive**: Follow \`.agents/workflows/sdd-archive.md\` to merge and clean up.

## Available Skills
Detailed technical skills are located in \`.agents/skills/\`. 
Consult them for specific implementation patterns (e.g., NestJS, API Testing).

## Project Structure
- \`openspec/specs/\`: Core system specifications.
- \`openspec/changes/\`: Active and historical change requests.
`.trim();

  await writeFile({
    dest: copilotFile,
    content,
    overwrite,
  });
}

/**
 * Scaffold the openspec directory by copying template files.
 * @param { string } projectRoot - Absolute path to the target project root
 * @param { Record<string, string> } vars - Variables for template interpolation
 * @param { boolean } overwrite - If true, overwrite existing files
 */
export async function scaffoldOpenspec(
  projectRoot: string,
  vars: Record<string, string>,
  overwrite: boolean
): Promise<void> {
  const openspecSrc = path.join(TEMPLATES_DIR, 'openspec');
  const openspecDest = path.join(projectRoot, 'openspec');
  await copyTemplateDir(openspecSrc, openspecDest, vars, overwrite);
  await ensureDir(path.join(openspecDest, 'changes'));
  await ensureDir(path.join(openspecDest, 'specs'));
  const gitkeep = path.join(openspecDest, 'changes', '.gitkeep');
  if (!(await fs.pathExists(gitkeep))) {
    await fs.writeFile(gitkeep, '', 'utf8');
  }
}

/**
 * Scaffold the memory system database and configuration.
 * Creates the .sdd/ directory, initializes memory.db with the knowledge graph
 * schema, updates .gitignore, and creates an empty memory.json for Git exports.
 * @param { string } projectRoot - Absolute path to the target project root
 * @param { boolean } overwrite - If true, overwrite existing database
 */
export async function scaffoldMemory(
  projectRoot: string,
  overwrite: boolean
): Promise<void> {
  const sddDir = path.join(projectRoot, '.sdd');
  const dbPath = path.join(sddDir, 'memory.db');
  const jsonPath = path.join(sddDir, 'memory.json');
  const gitignorePath = path.join(projectRoot, '.gitignore');

  await ensureDir(sddDir);

  if ((await fs.pathExists(dbPath)) && !overwrite) {
    return;
  }

  try {
    const { MemoryDB } = await import('@/memory/database');
    const db = new MemoryDB(dbPath);
    db.close();
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : String(error);
    console.warn(
      `⚠ Memory system unavailable (${msg}). Skipping database creation.`
    );
    return;
  }

  const gitignoreEntry = '.sdd/memory.db';
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf8');
    if (!content.includes(gitignoreEntry)) {
      await fs.appendFile(
        gitignorePath,
        `\n# SDD Memory System\n${gitignoreEntry}\n`,
        'utf8'
      );
    }
  } else {
    await fs.writeFile(
      gitignorePath,
      `# SDD Memory System\n${gitignoreEntry}\n`,
      'utf8'
    );
  }

  if (!(await fs.pathExists(jsonPath))) {
    await fs.writeFile(jsonPath, '{}', 'utf8');
  }
}

