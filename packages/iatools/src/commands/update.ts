/**
 * `--update` command: refreshes agent constitution and SDD skills/workflows
 * without overwriting custom changes in openspec/ or role agent files.
 */

import * as path from 'path';
import ora from 'ora';
import { logger } from '@/utils/logger';
import { copyTemplateDir, writeFile, interpolate } from '@/utils/file-writer';
import { getIdeAdapter, ALL_IDES } from '@/ides/index';
import * as fs from 'fs-extra';

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

/**
 * Refresh all SDD framework files from the embedded templates.
 * Skills and workflows are always overwritten.
 * The constitution is overwritten only if --force is passed.
 * The openspec/ directory and changes/ are never touched.
 * @param projectRoot Absolute path to the project root
 * @param force If true, also overwrite the constitution
 */
export async function runUpdate(projectRoot: string, force: boolean): Promise<void> {
    logger.banner();
    logger.header('🔄  Updating SDD Framework Files');
    logger.newline();

    const spinner = ora({ text: 'Refreshing skills and workflows...', color: 'cyan' }).start();

    try {
        let ideId: any = 'generic';
        for (const id of ALL_IDES) {
            const adapter = getIdeAdapter(id);
            if (await fs.pathExists(adapter.agentDir(projectRoot))) {
                ideId = id;
                break;
            }
        }
        const adapter = getIdeAdapter(ideId);
        const agentsDir = adapter.agentDir(projectRoot);
        const workflowsDir = adapter.workflowsDir(projectRoot);

        await copyTemplateDir(
            path.join(TEMPLATES_DIR, 'workflows'),
            workflowsDir,
            {},
            true,
        );

        if (force) {
            const constitutionSrc = path.join(TEMPLATES_DIR, 'agents', 'constitution.md');
            const raw = await fs.readFile(constitutionSrc, 'utf8');
            await writeFile({
                dest: path.join(agentsDir, 'constitution.agent.md'),
                content: interpolate(raw, {}),
                overwrite: true,
            });
        }

        spinner.succeed(`SDD framework updated! (Detected: ${adapter.label})`);
    } catch (err) {
        spinner.fail('Update failed');
        throw err;
    }

    logger.newline();
    logger.info('SDD framework files refreshed from latest templates.');
    if (!force) {
        logger.label('    (constitution preserved — use --force to also refresh it)');
    }
    logger.newline();
}
