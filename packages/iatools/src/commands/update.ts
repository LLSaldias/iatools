/**
 * `--update` command: refreshes agent constitution and SDD skills/workflows
 * without overwriting custom changes in openspec/ or role agent files.
 */

import { ALL_IDES, getIdeAdapter } from '@/ides/index';
import { createTuiContext } from '@/tui/context';
import { copyTemplateDir, interpolate, writeFile } from '@/utils/file-writer';
import * as fs from 'fs-extra';
import * as path from 'path';

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
    const tui = await createTuiContext();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { version } = require('../../package.json') as { version: string };
    tui.banner(version);
    tui.log.info('🔄  Updating SDD Framework Files');
    tui.log.info('');

    const progress = tui.progress({ current: 0, total: 3, label: 'Refreshing skills and workflows...' });

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

        progress.update(1, 3, 'Copying workflows...');

        await copyTemplateDir(
            path.join(TEMPLATES_DIR, 'workflows'),
            workflowsDir,
            {},
            true,
        );

        if (force) {
            progress.update(2, 3, 'Updating constitution...');
            const constitutionSrc = path.join(TEMPLATES_DIR, 'agents', 'constitution.md');
            const raw = await fs.readFile(constitutionSrc, 'utf8');
            await writeFile({
                dest: path.join(agentsDir, 'constitution.agent.md'),
                content: interpolate(raw, {}),
                overwrite: true,
            });
        }

        progress.update(3, 3, 'Done');
        tui.log.success(`SDD framework updated! (Detected: ${adapter.label})`);
    } catch (err) {
        tui.log.error('Update failed');
        await tui.destroy();
        throw err;
    }

    tui.log.info('');
    tui.log.info('SDD framework files refreshed from latest templates.');
    if (!force) {
        tui.log.info('    (constitution preserved — use --force to also refresh it)');
    }
    tui.log.info('');
    await tui.destroy();
}
