/**
 * IDE adapter registry.
 * Each adapter knows how to map SDD files to the correct
 * agent/rules directories for that IDE.
 */

export type IdeId = 'cursor' | 'copilot' | 'gemini' | 'generic';

export interface IdeAdapter {
    /** Machine-readable identifier */
    id: IdeId;
    /** Human-readable display label */
    label: string;
    /** Short description */
    description: string;
    /** Emoji shown in prompts */
    emoji: string;
    /**
     * Given the CWD of the target project, return the absolute path
     * where the constitution and role agent files should be written.
     */
    agentDir: (projectRoot: string) => string;
    /**
     * Absolute path where skills should be installed.
     */
    skillsDir: (projectRoot: string) => string;
    /**
     * Absolute path where workflow/slash-command files should be installed.
     */
    workflowsDir: (projectRoot: string) => string;
    /**
     * Optional post-setup note shown to the user after --init.
     */
    setupNote?: string;
}

import * as path from 'path';

export const IDE_ADAPTERS: Record<IdeId, IdeAdapter> = {
    cursor: {
        id: 'cursor',
        label: 'Cursor',
        description: '.cursor/rules/ for agent files',
        emoji: '🖱️',
        agentDir: (root) => path.join(root, '.cursor', 'rules'),
        skillsDir: (root) => path.join(root, '.agents', 'skills'),
        workflowsDir: (root) => path.join(root, '.agents', 'workflows'),
        setupNote: 'Cursor will automatically load rules from .cursor/rules/. Restart Cursor to pick up new rules.',
    },

    copilot: {
        id: 'copilot',
        label: 'GitHub Copilot (VS Code)',
        description: '.github/agents/ for agent files',
        emoji: '🤖',
        agentDir: (root) => path.join(root, '.github', 'agents'),
        skillsDir: (root) => path.join(root, '.agents', 'skills'),
        workflowsDir: (root) => path.join(root, '.agents', 'workflows'),
        setupNote: 'The agent constitution and roles are in .github/agents/ as .agent.md files. Restart VS Code to pick up changes.',
    },

    gemini: {
        id: 'gemini',
        label: 'Gemini / Antigravity',
        description: '.agent/rules/ for agent files',
        emoji: '✨',
        agentDir: (root) => path.join(root, '.agent', 'rules'),
        skillsDir: (root) => path.join(root, '.agent', 'skills'),
        workflowsDir: (root) => path.join(root, '.agent', 'workflows'),
        setupNote: 'Agent files are in .agent/rules/ with .agent.md extension. Global rules can be defined in ~/.gemini/GEMINI.md.',
    },

    generic: {
        id: 'generic',
        label: 'Other / Generic',
        description: '.github/agents/ directory (works with any AI assistant)',
        emoji: '🔧',
        agentDir: (root) => path.join(root, '.github', 'agents'),
        skillsDir: (root) => path.join(root, '.agents', 'skills'),
        workflowsDir: (root) => path.join(root, '.agents', 'workflows'),
        setupNote: 'Files are in .github/agents/. Point your AI assistant to the .agent.md files in that directory.',
    },
};

export const ALL_IDES: IdeId[] = Object.keys(IDE_ADAPTERS) as IdeId[];

/**
 * Return an IdeAdapter by its ID.
 * @param id The IDE identifier
 * @returns The matching IdeAdapter
 */
export function getIdeAdapter(id: IdeId): IdeAdapter {
    return IDE_ADAPTERS[id];
}
