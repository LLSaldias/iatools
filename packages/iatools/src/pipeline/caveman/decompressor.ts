/**
 * @module pipeline/caveman/decompressor
 * Decompress a CaveArtifact back into human-readable markdown.
 */

import type {
    CaveArtifact,
    CaveDesign,
    CaveProposal,
    CaveSpec,
    CaveTasks,
} from '@/pipeline/caveman/profiles';

/**
 * Decompress a CaveArtifact into markdown text.
 */
export function decompress(artifact: CaveArtifact): string {
  switch (artifact._phase) {
    case 'proposal':
      return decompressProposal(artifact);
    case 'specs':
      return decompressSpecs(artifact);
    case 'design':
      return decompressDesign(artifact);
    case 'tasks':
      return decompressTasks(artifact);
  }
}

function decompressProposal(a: CaveProposal): string {
  const lines: string[] = [];
  lines.push(`# Proposal: ${a._change}`);
  lines.push('');
  lines.push('## Intent');
  lines.push('');
  lines.push(a.intent);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('### In Scope');
  for (const item of a.scope.in) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('### Out of Scope');
  for (const item of a.scope.out) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Constraints');
  for (const item of a.constraints) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Success Criteria');
  for (const item of a.success) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## Risks');
  lines.push('');
  lines.push('| ID | Description | Decision |');
  lines.push('|----|-------------|----------|');
  for (const r of a.risks) {
    lines.push(`| ${r.id} | ${r.desc} | ${r.decision} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function decompressSpecs(a: CaveSpec): string {
  const lines: string[] = [];
  lines.push(`# Specs: ${a._change}`);
  lines.push('');
  lines.push('## Requirements');
  lines.push('');
  lines.push('| ID | Description | Acceptance Criteria |');
  lines.push('|----|-------------|---------------------|');
  for (const r of a.requirements) {
    lines.push(`| ${r.id} | ${r.desc} | ${r.acceptance.join('; ')} |`);
  }
  lines.push('');
  lines.push('## Scenarios');
  lines.push('');
  for (const s of a.scenarios) {
    lines.push(`### ${s.id}`);
    lines.push(`Given ${s.given}`);
    lines.push(`When ${s.when}`);
    lines.push(`Then ${s.then}`);
    if (s.refs && s.refs.length > 0) {
      lines.push(`Refs: ${s.refs.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function decompressDesign(a: CaveDesign): string {
  const lines: string[] = [];
  lines.push(`# Design: ${a._change}`);
  lines.push('');
  lines.push('## Approach');
  lines.push('');
  lines.push(a.approach);
  lines.push('');
  lines.push('## Components');
  lines.push('');
  for (const c of a.components) {
    lines.push(`### ${c.name}`);
    lines.push(`Type: ${c.type}`);
    lines.push(`Dependencies: ${c.deps.join(', ')}`);
    lines.push(`Interface: ${c.interface}`);
    lines.push('');
  }
  lines.push('## Decisions');
  lines.push('');
  lines.push('| ID | Question | Choice | Reason |');
  lines.push('|----|----------|--------|--------|');
  for (const d of a.decisions) {
    lines.push(`| ${d.id} | ${d.question} | ${d.choice} | ${d.reason} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function decompressTasks(a: CaveTasks): string {
  const lines: string[] = [];
  lines.push(`# Tasks: ${a._change}`);
  lines.push('');
  for (const t of a.tasks) {
    const refsStr = t.refs.length > 0 ? ` (${t.refs.join(', ')})` : '';
    lines.push(`- [ ] **${t.id}**: ${t.title}${refsStr}`);
  }
  lines.push('');
  return lines.join('\n');
}
