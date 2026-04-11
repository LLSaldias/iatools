import type { RedactionCandidate } from '@/safety/scanner';
import { renderDiffView } from '@/ui/components/diff-view';
import { keyHint, theme } from '@/ui/theme';
import inquirer from 'inquirer';

export interface ReviewDecision {
  candidate: RedactionCandidate;
  decision: 'redact' | 'keep';
}

export async function runSanitizeReview(candidates: RedactionCandidate[]): Promise<ReviewDecision[]> {
  const decisions: ReviewDecision[] = [];
  const autoRedactPatterns = new Set<string>();
  const autoSkipPatterns = new Set<string>();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;

    if (autoRedactPatterns.has(candidate.patternId)) {
      decisions.push({ candidate, decision: 'redact' });
      continue;
    }
    if (autoSkipPatterns.has(candidate.patternId)) {
      decisions.push({ candidate, decision: 'keep' });
      continue;
    }

    const before = candidate.context;
    const ctxOffset = candidate.context.indexOf(candidate.match);
    const matchStart = ctxOffset >= 0 ? ctxOffset : 0;
    const matchEnd = matchStart + candidate.match.length;

    const afterText = before.slice(0, matchStart) + candidate.replacement + before.slice(matchEnd);

    const diffView = renderDiffView({
      before,
      after: afterText,
      matchStart,
      matchEnd,
      label: candidate.label,
      severity: candidate.severity,
      contextChars: 40,
    });

    console.log('');
    console.log(theme.colors.muted(`  Finding ${i + 1}/${candidates.length}`));
    console.log(diffView);
    console.log(keyHint([
      { key: 'y', label: 'Redact' },
      { key: 'n', label: 'Keep' },
      { key: 'a', label: 'Redact all (this type)' },
      { key: 's', label: 'Skip all (this type)' },
    ]));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Action:',
        choices: [
          { name: 'Redact this match', value: 'redact' },
          { name: 'Keep original', value: 'keep' },
          { name: `Redact ALL "${candidate.label}" matches`, value: 'redact-all' },
          { name: `Skip ALL "${candidate.label}" matches`, value: 'skip-all' },
        ],
      },
    ]);

    if (action === 'redact') {
      decisions.push({ candidate, decision: 'redact' });
    } else if (action === 'keep') {
      decisions.push({ candidate, decision: 'keep' });
    } else if (action === 'redact-all') {
      autoRedactPatterns.add(candidate.patternId);
      decisions.push({ candidate, decision: 'redact' });
    } else if (action === 'skip-all') {
      autoSkipPatterns.add(candidate.patternId);
      decisions.push({ candidate, decision: 'keep' });
    }
  }

  return decisions;
}
