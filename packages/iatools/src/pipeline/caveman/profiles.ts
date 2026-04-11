/**
 * @module pipeline/caveman/profiles
 * Cave artifact type definitions and validation for SDD phase schemas.
 */

/** Common header present in every .cave artifact. */
export interface CaveHeader {
  _v: number;
  _phase: 'proposal' | 'specs' | 'design' | 'tasks';
  _change: string;
  _parent: string | string[] | null;
  _ts: string;
}

/** Metadata stamped onto cave artifacts. */
export interface CaveMeta {
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  token_count?: number;
}

/** Proposal phase artifact. */
export interface CaveProposal extends CaveHeader {
  _phase: 'proposal';
  intent: string;
  scope: { in: string[]; out: string[] };
  constraints: string[];
  success: string[];
  risks: Array<{ id: string; desc: string; decision: string }>;
  _meta?: CaveMeta;
}

/** Specs phase artifact. */
export interface CaveSpec extends CaveHeader {
  _phase: 'specs';
  requirements: Array<{ id: string; desc: string; acceptance: string[] }>;
  scenarios: Array<{ id: string; given: string; when: string; then: string; refs?: string[] }>;
  _meta?: CaveMeta;
}

/** Design phase artifact. */
export interface CaveDesign extends CaveHeader {
  _phase: 'design';
  approach: string;
  components: Array<{ name: string; type: string; deps: string[]; interface: string }>;
  decisions: Array<{ id: string; question: string; choice: string; reason: string; refs?: string[] }>;
  _meta?: CaveMeta;
}

/** Tasks phase artifact. */
export interface CaveTasks extends CaveHeader {
  _phase: 'tasks';
  tasks: Array<{ id: string; title: string; refs: string[]; deps?: string[]; files?: string[]; tests?: string[] }>;
  _meta?: CaveMeta;
}

/** Union of all cave artifact types. */
export type CaveArtifact = CaveProposal | CaveSpec | CaveDesign | CaveTasks;

const KNOWN_PHASES = ['proposal', 'specs', 'design', 'tasks'] as const;

const PHASE_REQUIRED_FIELDS: Record<string, string[]> = {
  proposal: ['intent', 'scope', 'constraints', 'success', 'risks'],
  specs: ['requirements', 'scenarios'],
  design: ['approach', 'components', 'decisions'],
  tasks: ['tasks'],
};

/**
 * Validates a plain object against the CaveArtifact schema.
 * Returns `{ valid: true, errors: [] }` if valid, otherwise lists errors.
 */
export function validateCave(obj: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (obj === null || typeof obj !== 'object') {
    return { valid: false, errors: ['Input must be a non-null object'] };
  }

  const record = obj as Record<string, unknown>;

  // Header required fields
  for (const field of ['_v', '_phase', '_change', '_ts']) {
    if (record[field] === undefined || record[field] === null) {
      errors.push(`Missing required header field: ${field}`);
    }
  }

  // Phase validation
  const phase = record['_phase'];
  if (typeof phase === 'string' && !(KNOWN_PHASES as readonly string[]).includes(phase)) {
    errors.push(`Unknown _phase: ${phase}. Must be one of: ${KNOWN_PHASES.join(', ')}`);
  }

  // Phase-specific required fields
  if (typeof phase === 'string' && (KNOWN_PHASES as readonly string[]).includes(phase)) {
    const required = PHASE_REQUIRED_FIELDS[phase] ?? [];
    for (const field of required) {
      if (record[field] === undefined || record[field] === null) {
        errors.push(`Missing required field for phase '${phase}': ${field}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
