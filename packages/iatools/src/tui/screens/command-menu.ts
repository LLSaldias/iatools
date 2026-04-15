/**
 * Interactive command menu screen — shown when `iatools` is run with no arguments.
 * Renders a banner + grouped SelectRenderable for browsing and launching commands.
 * Commands that require arguments (e.g. --change) show follow-up prompts.
 */

import {
    BoxRenderable,
    InputRenderable,
    InputRenderableEvents,
    SelectRenderable,
    SelectRenderableEvents,
    TextRenderable,
    type CliRenderer
} from '@opentui/core';
import * as fs from 'fs';
import * as path from 'path';
import { createBanner } from '../components/banner';
import { THEME } from '../theme';

export interface MenuChoice {
  /** Command string to execute (e.g. 'init', 'memory query') */
  command: string;
  /** Display label */
  name: string;
  /** Description shown next to name */
  description: string;
  /** Whether the command requires --change <name> */
  needsChange?: boolean;
  /** Whether the command requires a text argument (e.g. memory query <text>) */
  needsTextArg?: boolean;
  /** Whether the command requires a phase argument (e.g. review <phase>) */
  needsPhase?: boolean;
}

const REVIEW_PHASES = ['proposal', 'specs', 'design', 'tasks'];

const MENU_ITEMS: MenuChoice[] = [
  // ── Setup
  { command: 'init',           name: '🪄  init',            description: 'Interactive wizard — set up the SDD framework' },
  { command: 'update',         name: '🔄  update',          description: 'Refresh SDD skills and workflows' },
  // ── Artifacts
  { command: 'changelog',      name: '📋  changelog',       description: 'Generate changelog from archived changes' },
  { command: 'trace',          name: '🔗  trace',           description: 'Trace decision lineage for a change', needsChange: true },
  { command: 'review',         name: '📖  review',          description: 'Decompress and review a .cave artifact', needsChange: true, needsPhase: true },
  { command: 'compress',       name: '📦  compress',        description: 'Compress .md artifacts to .cave format', needsChange: true },
  // ── Memory
  { command: 'memory query',   name: '🔍  memory query',    description: 'Search memory with hybrid retrieval', needsTextArg: true },
  { command: 'memory ingest',  name: '📥  memory ingest',   description: 'Ingest extraction JSON into memory graph' },
  { command: 'memory export',  name: '📤  memory export',   description: 'Export memory graph to JSON' },
];

/** Scan openspec/changes/ for available change directories */
function listChanges(cwd: string): string[] {
  const changesDir = path.join(cwd, 'openspec', 'changes');
  try {
    return fs.readdirSync(changesDir)
      .filter((name) => {
        const full = path.join(changesDir, name);
        return fs.statSync(full).isDirectory() && name !== 'archive';
      })
      .sort();
  } catch {
    return [];
  }
}

/** Remove all children from root (clear screen for next prompt) */
function clearScreen(root: CliRenderer['root']): void {
  const ids = (root as any)._childrenInLayoutOrder?.map((c: any) => c.id) as string[] | undefined;
  if (ids) {
    for (const id of ids) {
      root.remove(id);
    }
  }
}

/** Show a Select prompt and return the selected value, or null on ESC */
function promptSelect(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  label: string,
  items: Array<{ name: string; description: string; value: string }>,
): Promise<string | null> {
  return new Promise((resolve) => {
    const sectionLabel = new TextRenderable(renderer, {
      id: 'prompt-label',
      content: `  ${label}`,
      fg: THEME.colors.primary,
    });
    root.add(sectionLabel);

    root.add(new TextRenderable(renderer, { id: 'prompt-spacer', content: '' }));

    const totalRows = items.length + 2;
    const select = new SelectRenderable(renderer, {
      id: 'prompt-select',
      width: Math.min(renderer.width - 4, 72),
      height: Math.min(totalRows, renderer.height - 6),
      options: items,
      selectedIndex: 0,
    });
    root.add(select);

    root.add(new TextRenderable(renderer, { id: 'prompt-spacer2', content: '' }));

    const hintsBox = new BoxRenderable(renderer, {
      id: 'prompt-hints-box',
      width: '100%',
      padding: 1,
    });
    hintsBox.add(new TextRenderable(renderer, {
      id: 'prompt-hints',
      content: '  [↑↓] Navigate    [Enter] Select    [ESC] Cancel',
      fg: THEME.colors.muted,
    }));
    root.add(hintsBox);

    select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number) => {
      resolve(items[index]?.value ?? null);
    });

    const onKey = (key: { name?: string }) => {
      if (key.name === 'escape') {
        renderer.keyInput.off('keypress', onKey);
        resolve(null);
      }
    };
    renderer.keyInput.on('keypress', onKey);

    select.focus();
  });
}

/** Show an Input prompt and return the entered text, or null on ESC */
function promptText(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  label: string,
  placeholder: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    const sectionLabel = new TextRenderable(renderer, {
      id: 'input-label',
      content: `  ${label}`,
      fg: THEME.colors.primary,
    });
    root.add(sectionLabel);

    root.add(new TextRenderable(renderer, { id: 'input-spacer', content: '' }));

    const input = new InputRenderable(renderer, {
      id: 'text-input',
      width: Math.min(renderer.width - 4, 60),
      placeholder,
    });
    root.add(input);

    root.add(new TextRenderable(renderer, { id: 'input-spacer2', content: '' }));

    const hintsBox = new BoxRenderable(renderer, {
      id: 'input-hints-box',
      width: '100%',
      padding: 1,
    });
    hintsBox.add(new TextRenderable(renderer, {
      id: 'input-hints',
      content: '  [Enter] Confirm    [ESC] Cancel',
      fg: THEME.colors.muted,
    }));
    root.add(hintsBox);

    input.on(InputRenderableEvents.ENTER, (value: string) => {
      if (value.trim()) {
        resolve(value.trim());
      }
    });

    const onKey = (key: { name?: string }) => {
      if (key.name === 'escape') {
        renderer.keyInput.off('keypress', onKey);
        resolve(null);
      }
    };
    renderer.keyInput.on('keypress', onKey);

    input.focus();
  });
}

/**
 * Show the interactive command menu. Returns the full command string, or null if ESC/cancel.
 */
export function createCommandMenu(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  version: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    // Banner
    createBanner(renderer, root, { version });

    // Section label
    const sectionLabel = new TextRenderable(renderer, {
      id: 'menu-section',
      content: '  Select a command:',
      fg: THEME.colors.muted,
    });
    root.add(sectionLabel);

    // Selectable items — all are valid commands
    const options = MENU_ITEMS.map((item) => ({
      name: item.name,
      description: item.description,
      value: item.command,
    }));

    // Select — height set to show ALL items without scrolling
    const totalRows = MENU_ITEMS.length + 2; // items + border
    const select = new SelectRenderable(renderer, {
      id: 'command-select',
      width: Math.min(renderer.width - 4, 72),
      height: Math.min(totalRows, renderer.height - 8),
      options,
      selectedIndex: 0,
    });
    root.add(select);

    // Hints bar
    const hintsBox = new BoxRenderable(renderer, {
      id: 'menu-hints-box',
      width: '100%',
      padding: 1,
    });
    hintsBox.add(new TextRenderable(renderer, {
      id: 'menu-hints',
      content: '  [↑↓] Navigate    [Enter] Launch    [ESC] Exit',
      fg: THEME.colors.muted,
    }));
    root.add(hintsBox);

    // Selection handler
    select.on(SelectRenderableEvents.ITEM_SELECTED, async (index: number) => {
      const item = MENU_ITEMS[index];
      if (!item) return;

      // Commands without follow-up args → resolve immediately
      if (!item.needsChange && !item.needsTextArg) {
        resolve(item.command);
        return;
      }

      // Clear screen for follow-up prompt
      clearScreen(root);

      // ── Text argument (e.g. memory query <text>)
      if (item.needsTextArg) {
        const text = await promptText(renderer, root, 'Enter search query:', 'type your query...');
        if (text) {
          resolve(`${item.command} ${text}`);
        } else {
          resolve(null);
        }
        return;
      }

      // ── Commands needing --change
      if (item.needsChange) {
        const changes = listChanges(process.cwd());
        let changeName: string | null = null;

        if (changes.length > 0) {
          changeName = await promptSelect(
            renderer,
            root,
            'Select a change:',
            changes.map((c) => ({ name: c, description: '', value: c })),
          );
        } else {
          changeName = await promptText(renderer, root, 'Enter change name:', 'e.g. 2026-04-15-my-change');
        }

        if (!changeName) {
          resolve(null);
          return;
        }

        // ── review also needs a phase
        if (item.needsPhase) {
          clearScreen(root);
          const phase = await promptSelect(
            renderer,
            root,
            'Select a phase to review:',
            REVIEW_PHASES.map((p) => ({ name: p, description: '', value: p })),
          );
          if (!phase) {
            resolve(null);
            return;
          }
          resolve(`${item.command} ${phase} --change ${changeName}`);
          return;
        }

        resolve(`${item.command} --change ${changeName}`);
      }
    });

    // ESC exits
    renderer.keyInput.on('keypress', (key: { name?: string }) => {
      if (key.name === 'escape') {
        resolve(null);
      }
    });

    select.focus();
  });
}
