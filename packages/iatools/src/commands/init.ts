import {
  ALL_IDES,
  IDE_ADAPTERS,
  getIdeAdapter,
  type IdeId,
} from '@/ides/index';
import { ALL_ROLES, getRole, type RoleId } from '@/roles/index';
import { createTuiContext, type TuiContext } from '@/tui/context';
import { requireTTY } from '@/tui/fallback';
import { writeFile } from '@/utils/file-writer';
import {
  scaffoldAgents,
  scaffoldCopilotConfig,
  scaffoldMemory,
  scaffoldOpenspec,
  scaffoldSkills,
  scaffoldWorkflows,
} from '@/utils/scaffolders';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Run the interactive init wizard.
 * @param {string} projectRoot Absolute path to the target project root
 * @param {boolean} force If true, overwrite existing files
 * @return {Promise<void>}
 */
export async function runInit(
  projectRoot: string,
  force: boolean
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { version } = require('../../package.json') as { version: string };

  if (!process.stdout.isTTY) {
    requireTTY('init');
  }

  const tui = await createTuiContext({ interactive: true });
  tui.banner(version);
  tui.log.info('\u2728  SDD Framework Setup');

  const detected = await detectExistingSetup(projectRoot);
  if (detected.ides.length > 0) {
    const labels = detected.ides.map((id) => IDE_ADAPTERS[id].label).join(', ');
    tui.log.info(`\u2139\ufe0f  Detected existing configurations: ${labels}`);
  }

  // Use TUI wizard for IDE/role selection if available
  let answers: { ides: IdeId[]; roles: RoleId[] };
  if (process.stdout.isTTY) {
    const { createAppRenderer } = await import('@/tui/renderer');
    const { createInitWizard } = await import('@/tui/screens/init-wizard');
    const app = await createAppRenderer();
    const result = await createInitWizard(app.renderer, app.root, version);
    await app.destroy();
    if (!result) {
      tui.log.info('Init cancelled.');
      await tui.destroy();
      return;
    }
    // Map wizard selections to IdeId/RoleId
    const ideMap: Record<string, IdeId> = { vscode: 'copilot', cursor: 'cursor', windsurf: 'generic' };
    const ides: IdeId[] = result.ides.includes('all')
      ? ALL_IDES.slice()
      : result.ides.map(v => ideMap[v] ?? v as IdeId).filter(Boolean);
    answers = { ides, roles: result.roles as RoleId[] };
  } else {
    requireTTY('init');
  }

  await handleInitAnswers(projectRoot, force, answers, tui);
  await tui.destroy();
}

/**
 *
 * @param {string} projectRoot Absolute path to the target project root
 * @param {boolean} force If true, overwrite existing files
 * @param { object } detected Detected IDE and roles from the existing setup
 * @param { object } answers Answers from the user prompt
 */
async function handleInitAnswers(
  projectRoot: string,
  force: boolean,
  answers: { ides: IdeId[]; roles: RoleId[] },
  tui: TuiContext,
): Promise<void> {
  const { ides, roles } = answers;
  const vars = buildInitVars(projectRoot, ides, roles);

  tui.log.info('Creating SDD framework files...');

  for (const ide of ides) {
    const adapter = getIdeAdapter(ide);
    await scaffoldAll(projectRoot, adapter, roles, vars, force, tui);
    if (ide === 'copilot') {
      await scaffoldVsCodeSettings(projectRoot, force);
    }
    if (adapter.setupNote) {
      tui.log.info(adapter.setupNote);
    }
  }

  tui.log.success('\ud83d\ude80  Ready! Start your first change: /sdd-new <feature-name>');
}

/**
 * Build variables for template interpolation.
 * @param {string} projectRoot Absolute path to the target project root
 * @param {IdeId} ide IDE identifier
 * @param {RoleId[]} roles Array of role identifiers
 * @return {Record<string, string>} Interpolation variables
 */
function buildInitVars(
  projectRoot: string,
  ides: IdeId[],
  roles: RoleId[]
): Record<string, string> {
  const projectName = path.basename(projectRoot);
  const ideLabels = ides.map(id => getIdeAdapter(id).label).join(', ');
  const now =
    new Date().toISOString().split('T')[0] ?? new Date().toISOString();
  return {
    PROJECT_NAME: projectName,
    IDE: ideLabels,
    ROLES: roles.map((r) => getRole(r).label).join(', '),
    DATE: now,
  };
}

/**
 * Scaffold the entire SDD framework based on the selected IDE and roles.
 * @param {string} projectRoot Absolute path to the target project root
 * @param { promises } adapter IDE adapter instance
 * @param {RoleId[]} roles Array of role identifiers
 * @param {Record<string, string>} vars Variables for template interpolation
 * @param {boolean} force If true, overwrite existing files
 */
async function scaffoldAll(
  projectRoot: string,
  adapter: ReturnType<typeof getIdeAdapter>,
  roles: RoleId[],
  vars: Record<string, string>,
  force: boolean,
  tui: TuiContext,
): Promise<void> {
  const workflowsDir = adapter.workflowsDir(projectRoot);
  try {
    await performScaffolding(
      projectRoot,
      adapter,
      roles,
      vars,
      force,
      workflowsDir
    );
    tui.log.success('Scaffolding complete. Copilot is now SDD-aware.');
  } catch (error: unknown) {
    tui.log.error(
      `Scaffolding failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Perform the actual scaffolding of files and directories.
 * @param {string} projectRoot Absolute path to the target project root
 * @param { promises } adapter IDE adapter instance
 * @param {RoleId[]} roles Array of role identifiers
 * @param {Record<string, string>} vars Variables for template interpolation
 * @param {boolean} force If true, overwrite existing files
 * @param {string} workflowsDir Absolute path to the target workflows directory
 * @return {Promise<void>}
 */
async function performScaffolding(
  projectRoot: string,
  adapter: ReturnType<typeof getIdeAdapter>,
  roles: RoleId[],
  vars: Record<string, string>,
  force: boolean,
  workflowsDir: string
): Promise<void> {
  await scaffoldAgents(
    projectRoot,
    adapter.agentDir(projectRoot),
    roles,
    vars,
    force
  );
  await scaffoldSkills(adapter.skillsDir(projectRoot));
  await scaffoldWorkflows(workflowsDir, vars, force);
  await scaffoldOpenspec(projectRoot, vars, force);
  await scaffoldCopilotConfig(projectRoot, vars, force);
  await scaffoldMemory(projectRoot, force);
}

/**
 * Scaffold VS Code settings for the project.
 * @param {string} projectRoot Absolute path to the target project root
 * @param {boolean} overwrite If true, overwrite existing settings file
 * @return {Promise<void>}
 */
export async function scaffoldVsCodeSettings(
  projectRoot: string,
  overwrite: boolean
): Promise<void> {
  const settingsPath = path.join(projectRoot, '.vscode', 'settings.json');
  const settings = {
    'github.copilot.chat.codeGeneration.instructions': [
      {
        file: '.github/copilot-instructions.md',
      },
    ],
  };

  await writeFile({
    dest: settingsPath,
    content: JSON.stringify(settings, null, 2),
    overwrite,
  });
}

/**
 * Detect existing SDD setup in the project.
 * @param { string } projectRoot - Absolute path to the target project root
 * @return { object } Detected IDE and roles
 */
async function detectExistingSetup(
  projectRoot: string
): Promise<{ ides: IdeId[]; roles: RoleId[] }> {
  const result: { ides: IdeId[]; roles: RoleId[] } = { ides: [], roles: [] };
  for (const ideId of ALL_IDES) {
    const adapter = getIdeAdapter(ideId);
    const agentDir = adapter.agentDir(projectRoot);
    const constitutionPath = path.join(agentDir, 'constitution.agent.md');
    if (await fs.pathExists(constitutionPath)) {
      result.ides.push(ideId);
      await detectRoles(agentDir, result);
    }
  }
  // Deduplicate roles if found multiple times
  result.roles = Array.from(new Set(result.roles));
  return result;
}

/**
 * Detect roles present in the agent directory.
 * @param {string} agentDir Agent directory path
 * @param {{ roles: RoleId[] }} result Result object to populate
 */
async function detectRoles(
  agentDir: string,
  result: { roles: RoleId[] }
): Promise<void> {
  const rolesDir = path.join(agentDir, 'roles');
  if (await fs.pathExists(rolesDir)) {
    for (const roleId of ALL_ROLES) {
      if (await fs.pathExists(path.join(rolesDir, `${roleId}.agent.md`))) {
        result.roles.push(roleId);
      }
    }
  }
}
