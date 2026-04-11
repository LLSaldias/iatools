import type { MemoryNode } from '@/memory/types';
import { renderTable } from '@/ui/components/table';
import { theme } from '@/ui/theme';
import inquirer from 'inquirer';

export interface QueryResult {
  node: MemoryNode;
  score: number;
}

export async function renderQueryResults(query: string, results: QueryResult[]): Promise<string[]> {
  if (results.length === 0) {
    console.log(theme.colors.muted(`  No results for "${query}"`));
    return [];
  }

  const tableOutput = renderTable({
    title: `${theme.icons.brain} Query: "${query}"`,
    columns: [
      { header: '#', key: 'idx', width: 5, align: 'right' },
      { header: 'Score', key: 'score', width: 8, align: 'right' },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Source', key: 'source', width: 20 },
    ],
    rows: results.map((r, i) => ({
      idx: i + 1,
      score: r.score.toFixed(2),
      type: r.node.label,
      title: r.node.title,
      source: r.node.source ?? theme.colors.muted('—'),
    })),
  });

  console.log('');
  console.log(tableOutput);

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select nodes to export:',
      choices: results.map((r, i) => ({
        name: `${i + 1}. ${r.node.title} (${r.node.label})`,
        value: r.node.id,
      })),
    },
  ]);

  return selected as string[];
}
