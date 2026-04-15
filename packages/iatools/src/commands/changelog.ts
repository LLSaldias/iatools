/**
 * CLI command: `iatools changelog`
 * Generates changelog entries from archived SDD changes.
 */

import { createTuiContext } from '@/tui/context';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ChangelogEntry {
  category: 'Added' | 'Changed' | 'Removed' | 'Fixed';
  description: string;
}

export interface ArchivedChange {
  dirName: string;
  intent: string;
  scope: string;
}

export interface ChangelogOptions {
  version?: string;
  dryRun: boolean;
  dir: string;
}

export interface BumpSuggestion {
  level: 'major' | 'minor' | 'patch';
  reason: string;
}

/**
 * Extract Intent and In Scope sections from a proposal.
 */
export function parseProposal(content: string, dirName: string): ArchivedChange | null {
  const intentMatch = content.match(/## Intent\s*\n([\s\S]*?)(?=\n## |\n---|\n$)/);
  if (!intentMatch) return null;

  const scopeMatch = content.match(/### In Scope\s*\n([\s\S]*?)(?=\n### |\n## |\n---|\n$)/);
  const scope = scopeMatch?.[1]?.trim() ?? '';

  return {
    dirName,
    intent: intentMatch[1]!.trim(),
    scope,
  };
}

/**
 * Categorize a change into changelog entries using keyword heuristics.
 */
export function categorizeChange(change: ArchivedChange): ChangelogEntry[] {
  const text = `${change.intent} ${change.scope}`.toLowerCase();
  const entries: ChangelogEntry[] = [];

  if (/\b(add|new|create|introduce|implement)\b/.test(text)) {
    entries.push({ category: 'Added', description: change.intent });
  }
  if (/\b(fix|bug|patch|repair|resolve)\b/.test(text)) {
    entries.push({ category: 'Fixed', description: change.intent });
  }
  if (/\b(remove|delete|drop|deprecate)\b/.test(text)) {
    entries.push({ category: 'Removed', description: change.intent });
  }

  if (entries.length === 0) {
    entries.push({ category: 'Changed', description: change.intent });
  }

  return entries;
}

/**
 * Suggest a semver bump level based on the entries.
 */
export function suggestBump(entries: ChangelogEntry[]): BumpSuggestion {
  const categories = new Set(entries.map((e) => e.category));

  if (categories.has('Removed')) {
    return { level: 'major', reason: 'Contains removals (breaking changes)' };
  }
  if (categories.has('Added')) {
    return { level: 'minor', reason: 'Contains new additions' };
  }
  return { level: 'patch', reason: 'Bug fixes and minor changes only' };
}

/**
 * Format entries into Keep-a-Changelog format.
 */
export function formatChangelog(version: string, date: string, entries: ChangelogEntry[]): string {
  const grouped: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category]!.push(entry.description);
  }

  const sections: string[] = [];
  for (const category of ['Added', 'Changed', 'Removed', 'Fixed']) {
    const items = grouped[category];
    if (items && items.length > 0) {
      sections.push(`### ${category}\n${items.map((d) => `- ${d}`).join('\n')}`);
    }
  }

  return `## [${version}] - ${date}\n\n${sections.join('\n\n')}`;
}

/**
 * Scan archive directory for archived changes with proposals.
 */
export async function scanArchive(archiveDir: string, tui?: { log: { warn(msg: string): void } }): Promise<ArchivedChange[]> {
  if (!(await fs.pathExists(archiveDir))) {
    return [];
  }

  const dirs = await fs.readdir(archiveDir);
  const changes: ArchivedChange[] = [];

  for (const dirName of dirs) {
    const proposalPath = path.join(archiveDir, dirName, 'proposal.md');
    if (await fs.pathExists(proposalPath)) {
      const content = await fs.readFile(proposalPath, 'utf-8');
      const parsed = parseProposal(content, dirName);
      if (parsed) {
        changes.push(parsed);
      } else {
        tui?.log.warn(`Skipping ${dirName}: could not parse proposal`);
      }
    } else {
      tui?.log.warn(`Skipping ${dirName}: no proposal.md found`);
    }
  }

  return changes;
}

/**
 * Entry point for the `iatools changelog` command.
 */
export async function runChangelog(options: ChangelogOptions): Promise<void> {
  const tui = await createTuiContext();
  const projectRoot = options.dir;
  const archiveDir = path.join(projectRoot, 'openspec', 'changes', 'archive');

  tui.log.info('Changelog Generator');

  const changes = await scanArchive(archiveDir, tui);
  if (changes.length === 0) {
    tui.log.warn('No archived changes found. Nothing to generate.');
    await tui.destroy();
    return;
  }

  tui.log.info(`Found ${changes.length} archived change(s)`);

  const allEntries: ChangelogEntry[] = [];
  for (const change of changes) {
    allEntries.push(...categorizeChange(change));
  }

  const bump = suggestBump(allEntries);
  const version = options.version ?? `0.0.0-${bump.level}`;
  const date = new Date().toISOString().slice(0, 10);

  tui.log.info(`Suggested bump: ${bump.level} (${bump.reason})`);

  const output = formatChangelog(version, date, allEntries);

  if (options.dryRun) {
    tui.log.info('Dry-run mode \u2014 preview only:\n');
    tui.log.info(output);
    await tui.destroy();
    return;
  }

  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  let existing = '';
  if (await fs.pathExists(changelogPath)) {
    existing = await fs.readFile(changelogPath, 'utf-8');
  }

  const headerLine = '# Changelog\n\n';
  let newContent: string;
  if (existing.startsWith('# Changelog')) {
    newContent = existing.replace('# Changelog\n\n', `${headerLine}${output}\n\n`);
  } else {
    newContent = `${headerLine}${output}\n\n${existing}`;
  }

  await fs.writeFile(changelogPath, newContent, 'utf-8');
  tui.log.success(`Changelog updated: ${changelogPath}`);
  await tui.destroy();
}
