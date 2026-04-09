import * as path from 'path';
import inquirer from 'inquirer';
import ora from 'ora';
import { logger } from '@/utils/logger';
import { ALL_ROLES, ROLES, getRole, type RoleId } from '@/roles/index';
import {
  ALL_IDES,
  IDE_ADAPTERS,
  getIdeAdapter,
  type IdeId,
} from '@/ides/index';
import * as fs from 'fs-extra';
import {
  scaffoldAgents,
  scaffoldCopilotConfig,
  scaffoldMemory,
  scaffoldOpenspec,
  scaffoldSkills,
  scaffoldWorkflows,
} from '@/utils/scaffolders';
import { writeFile } from '@/utils/file-writer';

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
  logger.banner();
  logger.header('✨  SDD Framework Setup');
  logger.newline();

  const detected = await detectExistingSetup(projectRoot);
  if (detected.ides.length > 0) {
    const labels = detected.ides.map((id) => IDE_ADAPTERS[id].label).join(', ');
    logger.info(`ℹ️  Detected existing configurations: ${labels}`);
  }

  const answers = await promptForInit(detected);
  await handleInitAnswers(projectRoot, force, answers);
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
  answers: { ides: IdeId[]; roles: RoleId[] }
): Promise<void> {
  const { ides, roles } = answers;
  const vars = buildInitVars(projectRoot, ides, roles);

  await logScaffoldStart();

  for (const ide of ides) {
    const adapter = getIdeAdapter(ide);
    await scaffoldAll(projectRoot, adapter, roles, vars, force);
    if (ide === 'copilot') {
      await scaffoldVsCodeSettings(projectRoot, force);
    }
    await postInitMessages(adapter);
  }

  logger.newline();
}

/**
 * Log the start of the scaffolding process.
 * @return {Promise<void>}
 */
async function logScaffoldStart(): Promise<void> {
  logger.newline();
  logger.label('  Creating SDD framework files...');
  logger.newline();
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
 *
 * @param { object } adapter IDE adapter instance
 * @return {Promise<void>}
 */
async function postInitMessages(
  adapter: ReturnType<typeof getIdeAdapter>
): Promise<void> {
  logger.newline();
  if (adapter.setupNote) {
    logger.info(adapter.setupNote);
    logger.newline();
  }
  logger.header('🚀  Ready! Start your first change:');
  logger.label('     /sdd-new <feature-name>');
  logger.newline();
  logger.newline();
}

/**
 * Prompt the user for IDE and role selection.
 * @param { object } detected Detected IDE and roles from the existing setup
 * @return { promises } Answers from the user prompt
 */
async function promptForInit(detected: {
  ides: IdeId[];
  roles: RoleId[];
}): Promise<{ ides: IdeId[]; roles: RoleId[] }> {
  return inquirer.prompt([
    {
      type: 'checkbox',
      name: 'ides',
      message: 'Which IDE(s) / AI assistant(s) are you using? (spacebar to select)',
      default: detected.ides,
      choices: ALL_IDES.map((id) => {
        const adapter = IDE_ADAPTERS[id];
        return {
          name: `${adapter.emoji}  ${adapter.label}  —  ${adapter.description}`,
          value: id,
        };
      }),
      validate: (answer) => {
        if (answer.length < 1) {
          return 'You must select at least one IDE.';
        }
        return true;
      },
    },
    {
      type: 'checkbox',
      name: 'roles',
      message:
        'Select your developer role(s): (spacebar to select, at least one)',
      default: detected.roles,
      choices: ALL_ROLES.map((id) => ({
        name: `${ROLES[id].emoji}  ${ROLES[id].label}  —  ${ROLES[id].description}`,
        value: id,
      }))
    },
  ]);
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
  force: boolean
): Promise<void> {
  const spinner = ora({ text: 'Scaffolding...', color: 'magenta' }).start();
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
    spinner.succeed('Scaffolding complete. Copilot is now SDD-aware.');
  } catch (error: unknown) {
    spinner.fail(
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
