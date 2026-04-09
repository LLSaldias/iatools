/**
 * Role registry for the SDD framework.
 * Each role defines a developer persona, a set of bundled skills,
 * and configuration for IDE agent files.
 */

export type RoleId = 'frontend' | 'backend' | 'qa' | 'architect' | 'product';

export interface RoleProfile {
    /** Machine-readable identifier */
    id: RoleId;
    /** Human-readable display name */
    label: string;
    /** Short one-liner description shown in wizard */
    description: string;
    /** Emoji shown next to role in prompts */
    emoji: string;
    /** Bundled skill template files to copy from templates/skills/ */
    bundledSkills: string[];
    /** Persona injected into the agent constitution */
    persona: string;
    /** Focus areas injected into agent role file */
    focusAreas: string[];
}

export const ROLES: Record<RoleId, RoleProfile> = {
    frontend: {
        id: 'frontend',
        label: 'Frontend Developer',
        description: 'UI specs, accessibility, component design',
        emoji: '🎨',
        bundledSkills: [
            'sdd-new.md',
            'sdd-explore.md',
            'sdd-ff.md',
            'sdd-apply.md',
            'sdd-verify.md',
            'sdd-archive.md',
            'sdd-continue.md',
            'sdd-sync.md',
            'role-frontend.md',
        ],
        persona: 'You are a senior frontend developer. You prioritize component reusability, accessibility (WCAG 2.1), performance budgets, and clean UI specs.',
        focusAreas: [
            'Component architecture and design system alignment',
            'Accessibility requirements and WCAG scenarios',
            'Performance budgets and Core Web Vitals',
            'Responsive design and cross-browser compatibility',
            'UI state management patterns',
        ],
    },

    backend: {
        id: 'backend',
        label: 'Backend Developer',
        description: 'API contracts, domain events, performance',
        emoji: '⚙️',
        bundledSkills: [
            'sdd-new.md',
            'sdd-explore.md',
            'sdd-ff.md',
            'sdd-apply.md',
            'sdd-verify.md',
            'sdd-archive.md',
            'sdd-continue.md',
            'sdd-sync.md',
            'role-backend.md',
        ],
        persona: 'You are a senior backend developer. You prioritize clean API contracts, domain event design, SOLID principles, and performance at scale.',
        focusAreas: [
            'API contract design and versioning',
            'Domain event schema and payload definitions',
            'Database query performance and indexing',
            'Service boundary and bounded context definition',
            'Security: auth, authorization, input validation',
        ],
    },

    qa: {
        id: 'qa',
        label: 'QA / Testing Engineer',
        description: 'Scenario coverage, edge cases, test strategy',
        emoji: '🧪',
        bundledSkills: [
            'sdd-new.md',
            'sdd-explore.md',
            'sdd-ff.md',
            'sdd-apply.md',
            'sdd-verify.md',
            'sdd-archive.md',
            'sdd-continue.md',
            'sdd-sync.md',
            'role-qa.md',
        ],
        persona: 'You are a senior QA engineer. You push for comprehensive scenario coverage, explicit edge cases in specs, and testable task definitions.',
        focusAreas: [
            'Acceptance criteria and scenario completeness',
            'Edge cases and error path coverage',
            'Test task generation per spec requirement',
            'Coverage thresholds and test strategy',
            'Regression risk identification',
        ],
    },

    architect: {
        id: 'architect',
        label: 'Software Architect',
        description: 'ADRs, system diagrams, dependency decisions',
        emoji: '🏛️',
        bundledSkills: [
            'sdd-new.md',
            'sdd-explore.md',
            'sdd-ff.md',
            'sdd-apply.md',
            'sdd-verify.md',
            'sdd-archive.md',
            'sdd-continue.md',
            'sdd-sync.md',
            'role-architect.md',
        ],
        persona: 'You are a software architect. You focus on system-level design, architectural decision records (ADRs), dependency management, and long-term maintainability.',
        focusAreas: [
            'Architectural Decision Records (ADRs)',
            'System component and dependency diagrams',
            'Cross-cutting concerns: logging, tracing, security',
            'Scalability and fault tolerance patterns',
            'Monorepo package boundaries and coupling',
        ],
    },

    product: {
        id: 'product',
        label: 'Product Strategist',
        description: 'Proposals, scope definition, acceptance criteria',
        emoji: '🎯',
        bundledSkills: [
            'sdd-new.md',
            'sdd-explore.md',
            'sdd-ff.md',
            'sdd-apply.md',
            'sdd-verify.md',
            'sdd-archive.md',
            'sdd-continue.md',
            'sdd-sync.md',
            'role-product.md',
        ],
        persona: 'You are a product strategist. You frame work in terms of user value and business outcomes, define crisp scope boundaries, and write clear acceptance criteria.',
        focusAreas: [
            'Proposal framing: problem, opportunity, value',
            'Scope definition: in-scope / out-of-scope',
            'Acceptance criteria and success metrics',
            'Prioritization rationale and trade-off documentation',
            'Stakeholder alignment and change communication',
        ],
    },
};

export const ALL_ROLES: RoleId[] = Object.keys(ROLES) as RoleId[];

/**
 * Return a RoleProfile by its ID.
 * @param id The role identifier
 * @returns The matching RoleProfile
 */
export function getRole(id: RoleId): RoleProfile {
    return ROLES[id];
}
