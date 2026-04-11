/**
 * @module pipeline/caveman/compressor
 * Compress markdown into structured CaveArtifact, serialize/parse YAML.
 */

import type {
    CaveArtifact,
    CaveDesign,
    CaveHeader,
    CaveProposal,
    CaveSpec,
    CaveTasks,
} from '@/pipeline/caveman/profiles';

/**
 * Compress markdown content into a structured CaveArtifact based on the phase.
 */
export function compress(
  markdown: string,
  phase: CaveHeader['_phase'],
  changeName: string,
  parent?: string | string[] | null,
): CaveArtifact {
  const header: CaveHeader = {
    _v: 1,
    _phase: phase,
    _change: changeName,
    _parent: parent ?? null,
    _ts: new Date().toISOString(),
  };

  switch (phase) {
    case 'proposal':
      return compressProposal(markdown, header);
    case 'specs':
      return compressSpecs(markdown, header);
    case 'design':
      return compressDesign(markdown, header);
    case 'tasks':
      return compressTasks(markdown, header);
  }
}

function extractBulletList(section: string): string[] {
  const items: string[] = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.+)/);
    if (m) items.push(m[1]!.trim());
  }
  return items;
}

function getSectionContent(md: string, headingPattern: RegExp): string {
  const match = md.match(headingPattern);
  if (!match) return '';

  const startIdx = (match.index ?? 0) + match[0].length;
  const rest = md.slice(startIdx);

  const headingLevel = match[0].match(/^#+/)?.[0].length ?? 2;
  const nextHeadingRe = new RegExp(`^#{1,${headingLevel}}\\s`, 'm');
  const nextMatch = rest.match(nextHeadingRe);

  return nextMatch ? rest.slice(0, nextMatch.index).trim() : rest.trim();
}

function compressProposal(md: string, header: CaveHeader): CaveProposal {
  const intent = getSectionContent(md, /^##\s+(?:Intent|Purpose)\s*$/im);

  const inScopeRaw = getSectionContent(md, /^###?\s+(?:In\s+Scope)\s*$/im);
  const outScopeRaw = getSectionContent(md, /^###?\s+(?:Out\s+(?:of\s+)?Scope)\s*$/im);
  const scopeIn = extractBulletList(inScopeRaw);
  const scopeOut = extractBulletList(outScopeRaw);

  const constraintsRaw = getSectionContent(md, /^##\s+Constraints?\s*$/im);
  const constraints = extractBulletList(constraintsRaw);

  const successRaw = getSectionContent(md, /^##\s+Success\s+Criteria\s*$/im);
  const success = extractBulletList(successRaw);

  const risksRaw = getSectionContent(md, /^##\s+Risks?\s*$/im);
  const risks = parseRisksTable(risksRaw);

  return {
    ...header,
    _phase: 'proposal',
    intent: intent || '(no intent found)',
    scope: { in: scopeIn, out: scopeOut },
    constraints,
    success,
    risks,
  };
}

function parseRisksTable(section: string): Array<{ id: string; desc: string; decision: string }> {
  const risks: Array<{ id: string; desc: string; decision: string }> = [];
  const lines = section.split('\n');
  let riskCounter = 1;

  for (const line of lines) {
    const m = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (m) {
      const col1 = m[1]!.trim();
      const col2 = m[2]!.trim();
      const col3 = m[3]!.trim();
      if (col1 === 'ID' || col1.startsWith('--') || col1.startsWith(':-')) continue;
      const id = col1.match(/^R\d+/) ? col1 : `R${riskCounter}`;
      riskCounter++;
      risks.push({ id, desc: col2, decision: col3 });
    }
  }

  return risks;
}

function compressSpecs(md: string, header: CaveHeader): CaveSpec {
  const requirements: Array<{ id: string; desc: string; acceptance: string[] }> = [];
  const scenarios: Array<{ id: string; given: string; when: string; then: string; refs?: string[] }> = [];

  const reqSection = getSectionContent(md, /^##\s+Requirements?\s*$/im);
  if (reqSection) {
    const lines = reqSection.split('\n');
    let reqCounter = 1;
    for (const line of lines) {
      const tableMatch = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
      if (tableMatch) {
        const col1 = tableMatch[1]!.trim();
        const col2 = tableMatch[2]!.trim();
        const col3 = tableMatch[3]!.trim();
        if (col1 === 'ID' || col1.startsWith('-')) continue;
        const id = col1.match(/^REQ-/) ? col1 : `REQ-${reqCounter}`;
        reqCounter++;
        requirements.push({ id, desc: col2, acceptance: col3.split(';').map(s => s.trim()).filter(Boolean) });
      } else {
        const bullet = line.match(/^\s*[-*]\s+(.+)/);
        if (bullet) {
          const id = `REQ-${reqCounter}`;
          reqCounter++;
          requirements.push({ id, desc: bullet[1]!.trim(), acceptance: [] });
        }
      }
    }
  }

  const scenSection = getSectionContent(md, /^##\s+Scenarios?\s*$/im);
  if (scenSection) {
    const scenRegex = /(?:###?\s+(?:SC-?\d+[:\s]*)?([^\n]+)\n)?\s*(?:Given|GIVEN)\s+([^\n]+)\n\s*(?:When|WHEN)\s+([^\n]+)\n\s*(?:Then|THEN)\s+([^\n]+)/gi;
    let scMatch;
    let scCounter = 1;
    while ((scMatch = scenRegex.exec(scenSection)) !== null) {
      const id = `SC-${scCounter}`;
      scCounter++;
      const rawThen = scMatch[4]!.trim();
      const refsMatch = rawThen.match(/\b(REQ-\d+|D\d+|R\d+)\b/g);
      scenarios.push({
        id,
        given: scMatch[2]!.trim(),
        when: scMatch[3]!.trim(),
        then: rawThen,
        ...(refsMatch ? { refs: refsMatch } : {}),
      });
    }

    if (scenarios.length === 0) {
      const lines = scenSection.split('\n');
      let scCounter2 = 1;
      for (const line of lines) {
        const tableMatch = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
        if (tableMatch) {
          const col1 = tableMatch[1]!.trim();
          if (col1 === 'ID' || col1.startsWith('-')) continue;
          const id = col1.match(/^SC-/) ? col1 : `SC-${scCounter2}`;
          scCounter2++;
          scenarios.push({
            id,
            given: tableMatch[2]!.trim(),
            when: tableMatch[3]!.trim(),
            then: tableMatch[4]!.trim(),
          });
        }
      }
    }
  }

  return { ...header, _phase: 'specs', requirements, scenarios };
}

function compressDesign(md: string, header: CaveHeader): CaveDesign {
  const approach = getSectionContent(md, /^##\s+Approach\s*$/im);

  const compSection = getSectionContent(md, /^##\s+Components?\s*$/im);
  const components: Array<{ name: string; type: string; deps: string[]; interface: string }> = [];
  if (compSection) {
    const compRegex = /###\s+([^\n]+)\n([\s\S]*?)(?=###\s|\n$|$)/g;
    let cm;
    while ((cm = compRegex.exec(compSection)) !== null) {
      const name = cm[1]!.trim();
      const body = cm[2]!.trim();
      const typeMatch = body.match(/(?:Type|type):\s*(.+)/i);
      const depsMatch = body.match(/(?:Deps|Dependencies|deps):\s*(.+)/i);
      const intMatch = body.match(/(?:Interface|interface):\s*(.+)/i);
      components.push({
        name,
        type: typeMatch ? typeMatch[1]!.trim() : 'module',
        deps: depsMatch ? depsMatch[1]!.split(',').map(s => s.trim()) : [],
        interface: intMatch ? intMatch[1]!.trim() : body.slice(0, 120),
      });
    }
  }

  const decSection = getSectionContent(md, /^##\s+Decisions?\s*$/im);
  const decisions: Array<{ id: string; question: string; choice: string; reason: string; refs?: string[] }> = [];
  if (decSection) {
    const lines = decSection.split('\n');
    let dCounter = 1;
    for (const line of lines) {
      const tableMatch = line.match(/^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
      if (tableMatch) {
        const col1 = tableMatch[1]!.trim();
        if (col1 === 'ID' || col1.startsWith('-')) continue;
        const id = col1.match(/^D\d+/) ? col1 : `D${dCounter}`;
        dCounter++;
        const reason = tableMatch[4]!.trim();
        const refsMatch = reason.match(/\b(REQ-\d+|R\d+)\b/g);
        decisions.push({
          id,
          question: tableMatch[2]!.trim(),
          choice: tableMatch[3]!.trim(),
          reason,
          ...(refsMatch ? { refs: refsMatch } : {}),
        });
      }
    }
  }

  return { ...header, _phase: 'design', approach: approach || '(no approach found)', components, decisions };
}

function compressTasks(md: string, header: CaveHeader): CaveTasks {
  const tasks: Array<{ id: string; title: string; refs: string[]; deps?: string[]; files?: string[]; tests?: string[] }> = [];
  const lines = md.split('\n');
  let tCounter = 1;

  for (const line of lines) {
    const m = line.match(/^\s*-\s+\[[ x]\]\s+(.+)/i);
    if (m) {
      const rawTitle = m[1]!.trim();
      const refs = rawTitle.match(/\b(REQ-\d+|D\d+|R\d+|SC-\d+)\b/g) || [];
      const id = `T${tCounter}`;
      tCounter++;
      const title = rawTitle.replace(/\s*\b(REQ-\d+|D\d+|R\d+|SC-\d+)\b/g, '').replace(/\s{2,}/g, ' ').trim() || rawTitle;
      tasks.push({ id, title, refs });
    }
  }

  return { ...header, _phase: 'tasks', tasks };
}

// ─── Serializer ─────────────────────────────────────────────

/**
 * Serialize a CaveArtifact to a YAML string (.cave format).
 */
export function serializeCave(artifact: CaveArtifact): string {
  const lines: string[] = [];

  lines.push(`_v: ${artifact._v}`);
  lines.push(`_phase: ${artifact._phase}`);
  lines.push(`_change: ${yamlStr(artifact._change)}`);
  lines.push(`_parent: ${serializeParent(artifact._parent)}`);
  lines.push(`_ts: ${yamlStr(artifact._ts)}`);

  switch (artifact._phase) {
    case 'proposal':
      serializeProposal(artifact, lines);
      break;
    case 'specs':
      serializeSpecs(artifact, lines);
      break;
    case 'design':
      serializeDesignYaml(artifact, lines);
      break;
    case 'tasks':
      serializeTasksYaml(artifact, lines);
      break;
  }

  if (artifact._meta) {
    lines.push('_meta:');
    lines.push(`  created_by: ${yamlStr(artifact._meta.created_by)}`);
    lines.push(`  created_at: ${yamlStr(artifact._meta.created_at)}`);
    if (artifact._meta.approved_by !== undefined) {
      lines.push(`  approved_by: ${yamlStr(artifact._meta.approved_by)}`);
    }
    if (artifact._meta.approved_at !== undefined) {
      lines.push(`  approved_at: ${yamlStr(artifact._meta.approved_at)}`);
    }
    if (artifact._meta.token_count !== undefined) {
      lines.push(`  token_count: ${artifact._meta.token_count}`);
    }
  }

  return lines.join('\n') + '\n';
}

function yamlStr(val: string): string {
  if (/[:#{}[\],&*?|>!%@`'"]/.test(val) || val.includes('\n') || val.trim() !== val) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

function serializeParent(parent: string | string[] | null): string {
  if (parent === null) return 'null';
  if (typeof parent === 'string') return yamlStr(parent);
  if (Array.isArray(parent)) {
    if (parent.length === 0) return '[]';
    return '\n' + parent.map(p => `  - ${yamlStr(p)}`).join('\n');
  }
  return 'null';
}

function pushStringArray(arr: string[], indent: string, lines: string[]): void {
  for (const item of arr) {
    lines.push(`${indent}- ${yamlStr(item)}`);
  }
}

function serializeProposal(a: CaveProposal, lines: string[]): void {
  lines.push(`intent: ${yamlStr(a.intent)}`);
  lines.push('scope:');
  lines.push('  in:');
  pushStringArray(a.scope.in, '    ', lines);
  lines.push('  out:');
  pushStringArray(a.scope.out, '    ', lines);
  lines.push('constraints:');
  pushStringArray(a.constraints, '  ', lines);
  lines.push('success:');
  pushStringArray(a.success, '  ', lines);
  lines.push('risks:');
  for (const r of a.risks) {
    lines.push(`  - id: ${yamlStr(r.id)}`);
    lines.push(`    desc: ${yamlStr(r.desc)}`);
    lines.push(`    decision: ${yamlStr(r.decision)}`);
  }
}

function serializeSpecs(a: CaveSpec, lines: string[]): void {
  lines.push('requirements:');
  for (const r of a.requirements) {
    lines.push(`  - id: ${yamlStr(r.id)}`);
    lines.push(`    desc: ${yamlStr(r.desc)}`);
    lines.push('    acceptance:');
    pushStringArray(r.acceptance, '      ', lines);
  }
  lines.push('scenarios:');
  for (const s of a.scenarios) {
    lines.push(`  - id: ${yamlStr(s.id)}`);
    lines.push(`    given: ${yamlStr(s.given)}`);
    lines.push(`    when: ${yamlStr(s.when)}`);
    lines.push(`    then: ${yamlStr(s.then)}`);
    if (s.refs && s.refs.length > 0) {
      lines.push('    refs:');
      pushStringArray(s.refs, '      ', lines);
    }
  }
}

function serializeDesignYaml(a: CaveDesign, lines: string[]): void {
  lines.push(`approach: ${yamlStr(a.approach)}`);
  lines.push('components:');
  for (const c of a.components) {
    lines.push(`  - name: ${yamlStr(c.name)}`);
    lines.push(`    type: ${yamlStr(c.type)}`);
    lines.push('    deps:');
    pushStringArray(c.deps, '      ', lines);
    lines.push(`    interface: ${yamlStr(c.interface)}`);
  }
  lines.push('decisions:');
  for (const d of a.decisions) {
    lines.push(`  - id: ${yamlStr(d.id)}`);
    lines.push(`    question: ${yamlStr(d.question)}`);
    lines.push(`    choice: ${yamlStr(d.choice)}`);
    lines.push(`    reason: ${yamlStr(d.reason)}`);
    if (d.refs && d.refs.length > 0) {
      lines.push('    refs:');
      pushStringArray(d.refs, '      ', lines);
    }
  }
}

function serializeTasksYaml(a: CaveTasks, lines: string[]): void {
  lines.push('tasks:');
  for (const t of a.tasks) {
    lines.push(`  - id: ${yamlStr(t.id)}`);
    lines.push(`    title: ${yamlStr(t.title)}`);
    lines.push('    refs:');
    pushStringArray(t.refs, '      ', lines);
    if (t.deps && t.deps.length > 0) {
      lines.push('    deps:');
      pushStringArray(t.deps, '      ', lines);
    }
    if (t.files && t.files.length > 0) {
      lines.push('    files:');
      pushStringArray(t.files, '      ', lines);
    }
    if (t.tests && t.tests.length > 0) {
      lines.push('    tests:');
      pushStringArray(t.tests, '      ', lines);
    }
  }
}

// ─── Parser ────────────────────────────────────────────────

/**
 * Parse a .cave YAML string back into a CaveArtifact.
 * Handles the specific shapes produced by serializeCave.
 */
export function parseCave(yaml: string): CaveArtifact {
  const root = parseYamlSimple(yaml);
  return root as unknown as CaveArtifact;
}

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

function parseYamlSimple(yaml: string): Record<string, YamlValue> {
  const lines = yaml.split('\n');
  return parseBlock(lines, 0, 0).value as Record<string, YamlValue>;
}

function parseBlock(
  lines: string[],
  start: number,
  baseIndent: number,
): { value: Record<string, YamlValue>; next: number } {
  const result: Record<string, YamlValue> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '' || line.trim().startsWith('#')) { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;
    if (line.trim().startsWith('- ')) break;

    const kvMatch = line.match(/^(\s*)([^:\s][^:]*?):\s*(.*)/);
    if (!kvMatch) { i++; continue; }

    if (kvMatch[1]!.length !== baseIndent) break;

    const key = kvMatch[2]!.trim();
    const rawVal = kvMatch[3]!.trim();

    if (rawVal !== '' && rawVal !== '|') {
      result[key] = scalar(rawVal);
      i++;
    } else {
      // Peek at next meaningful line
      const ni = nextNonEmpty(lines, i + 1);
      if (ni >= lines.length) { result[key] = ''; i++; continue; }
      const nextLine = lines[ni]!;
      const nextIndent = nextLine.search(/\S/);
      if (nextIndent <= baseIndent) { result[key] = ''; i++; continue; }

      if (nextLine.trim().startsWith('- ')) {
        const arr = parseArray(lines, ni, nextIndent);
        result[key] = arr.value;
        i = arr.next;
      } else {
        const nested = parseBlock(lines, ni, nextIndent);
        result[key] = nested.value;
        i = nested.next;
      }
    }
  }

  return { value: result, next: i };
}

function parseArray(
  lines: string[],
  start: number,
  baseIndent: number,
): { value: YamlValue[]; next: number } {
  const result: YamlValue[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === '') { i++; continue; }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }
    if (!line.trim().startsWith('- ')) break;

    const afterDash = line.slice(indent + 2);
    const kvMatch = afterDash.match(/^([^:\s][^:]*?):\s*(.*)/);

    if (kvMatch) {
      // Object item
      const obj: Record<string, YamlValue> = {};
      const key = kvMatch[1]!.trim();
      const rawVal = kvMatch[2]!.trim();

      if (rawVal === '' || rawVal === '|') {
        const ni = nextNonEmpty(lines, i + 1);
        if (ni < lines.length && lines[ni]!.trim().startsWith('- ')) {
          const arr = parseArray(lines, ni, lines[ni]!.search(/\S/));
          obj[key] = arr.value;
          i = arr.next;
        } else {
          obj[key] = '';
          i++;
        }
      } else if (rawVal === '[]') {
        obj[key] = [];
        i++;
      } else {
        obj[key] = scalar(rawVal);
        i++;
      }

      // Read remaining keys at indent + 2
      const objIndent = baseIndent + 2;
      while (i < lines.length) {
        const nl = lines[i]!;
        if (nl.trim() === '') { i++; continue; }
        const nlIndent = nl.search(/\S/);
        if (nlIndent < objIndent) break;
        if (nl.trim().startsWith('- ') && nlIndent === baseIndent) break;

        const nkv = nl.match(/^(\s*)([^:\s][^:]*?):\s*(.*)/);
        if (!nkv || nkv[1]!.length !== objIndent) break;

        const nKey = nkv[2]!.trim();
        const nVal = nkv[3]!.trim();

        if (nVal === '' || nVal === '|') {
          const ni = nextNonEmpty(lines, i + 1);
          if (ni < lines.length && lines[ni]!.trim().startsWith('- ')) {
            const arr = parseArray(lines, ni, lines[ni]!.search(/\S/));
            obj[nKey] = arr.value;
            i = arr.next;
          } else if (ni < lines.length) {
            const nnIndent = lines[ni]!.search(/\S/);
            if (nnIndent > objIndent) {
              const nested = parseBlock(lines, ni, nnIndent);
              obj[nKey] = nested.value;
              i = nested.next;
            } else {
              obj[nKey] = '';
              i++;
            }
          } else {
            obj[nKey] = '';
            i++;
          }
        } else if (nVal === '[]') {
          obj[nKey] = [];
          i++;
        } else {
          obj[nKey] = scalar(nVal);
          i++;
        }
      }

      result.push(obj);
    } else {
      result.push(scalar(afterDash.trim()));
      i++;
    }
  }

  return { value: result, next: i };
}

function nextNonEmpty(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length && lines[i]!.trim() === '') i++;
  return i;
}

function scalar(val: string): YamlValue {
  if (val === 'null') return null;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return unquote(val);
}

function unquote(val: string): string {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return val;
}
