/**
 * Sanitize review screen — one candidate at a time review.
 * (spec TUI-10)
 */

import {
    BoxRenderable,
    TextAttributes,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface SanitizeCandidate {
  id: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  match: string;
  context: string;
  replacement: string;
  patternId: string;
}

export interface SanitizeDecision {
  candidateId: string;
  decision: 'redact' | 'keep';
}

export function createSanitizeReview(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  candidates: SanitizeCandidate[],
): Promise<SanitizeDecision[]> {
  return new Promise((resolve) => {
    if (candidates.length === 0) {
      resolve([]);
      return;
    }

    const decisions: SanitizeDecision[] = [];
    let currentIndex = 0;

    // Progress indicator
    const progressText = new TextRenderable(renderer, {
      id: 'sanitize-progress',
      content: `  Candidate 1 of ${candidates.length}`,
      fg: THEME.colors.highlight,
      attributes: TextAttributes.BOLD,
    });
    root.add(progressText);

    // Candidate display area
    const candidateBox = new BoxRenderable(renderer, {
      id: 'candidate-box',
      border: true,
      borderStyle: 'rounded',
      borderColor: THEME.colors.muted,
      flexDirection: 'column',
      width: '100%',
      padding: 1,
    });
    root.add(candidateBox);

    // Key hints
    const hintsText = new TextRenderable(renderer, {
      id: 'sanitize-hints',
      content: '[a/Enter] Approve  [r] Reject  [ESC] Abort',
      fg: THEME.colors.muted,
    });
    root.add(hintsText);

    function renderCandidate(index: number): void {
      const candidate = candidates[index]!;

      // Clear previous content
      while ((candidateBox as any).children?.length > 0) {
        const child = (candidateBox as any).children[0];
        if (child) candidateBox.remove(child.id);
        else break;
      }

      (progressText as any).content = `  Candidate ${index + 1} of ${candidates.length}`;

      // Severity badge
      const severityColors: Record<string, string> = {
        high: THEME.colors.error,
        medium: THEME.colors.warning,
        low: THEME.colors.accent,
      };
      const severityBadge = new TextRenderable(renderer, {
        id: 'severity-badge',
        content: `[${candidate.severity.toUpperCase()}]`,
        fg: severityColors[candidate.severity] ?? THEME.colors.muted,
        attributes: TextAttributes.BOLD,
      });
      candidateBox.add(severityBadge);

      // Label
      candidateBox.add(new TextRenderable(renderer, {
        id: 'candidate-label',
        content: candidate.label,
        fg: THEME.colors.highlight,
      }));

      // Context with match highlighted
      const matchStart = candidate.context.indexOf(candidate.match);
      if (matchStart >= 0) {
        const before = candidate.context.slice(0, matchStart);
        const after = candidate.context.slice(matchStart + candidate.match.length);
        
        const contextRow = new BoxRenderable(renderer, {
          id: 'context-row',
          flexDirection: 'row',
        });

        if (before) {
          contextRow.add(new TextRenderable(renderer, {
            id: 'ctx-before',
            content: before,
            fg: THEME.colors.muted,
          }));
        }
        contextRow.add(new TextRenderable(renderer, {
          id: 'ctx-match',
          content: candidate.match,
          fg: THEME.colors.error,
          attributes: TextAttributes.BOLD,
        }));
        if (after) {
          contextRow.add(new TextRenderable(renderer, {
            id: 'ctx-after',
            content: after,
            fg: THEME.colors.muted,
          }));
        }

        candidateBox.add(contextRow);
      } else {
        candidateBox.add(new TextRenderable(renderer, {
          id: 'candidate-context',
          content: candidate.context,
          fg: THEME.colors.muted,
        }));
      }

      // Replacement preview
      candidateBox.add(new TextRenderable(renderer, {
        id: 'replacement-preview',
        content: `→ ${candidate.replacement}`,
        fg: THEME.colors.success,
      }));

      (candidateBox as any).borderColor = severityColors[candidate.severity] ?? THEME.colors.muted;
      renderer.requestRender();
    }

    function showSummary(): void {
      while ((candidateBox as any).children?.length > 0) {
        const child = (candidateBox as any).children[0];
        if (child) candidateBox.remove(child.id);
        else break;
      }

      const approved = decisions.filter((d) => d.decision === 'redact').length;
      const rejected = decisions.filter((d) => d.decision === 'keep').length;

      (progressText as any).content = '  Review Complete';
      (candidateBox as any).borderColor = THEME.colors.success;

      candidateBox.add(new TextRenderable(renderer, {
        id: 'summary-approved',
        content: `${THEME.icons.success} Approved (redact): ${approved}`,
        fg: THEME.colors.success,
      }));
      candidateBox.add(new TextRenderable(renderer, {
        id: 'summary-rejected',
        content: `${THEME.icons.error} Rejected (keep): ${rejected}`,
        fg: THEME.colors.warning,
      }));

      (hintsText as any).content = 'Press any key to continue';
      renderer.requestRender();

      const exitHandler = () => {
        renderer.keyInput.off('keypress', exitHandler);
        resolve(decisions);
      };
      renderer.keyInput.on('keypress', exitHandler);
    }

    // Keyboard handler
    const keyHandler = (key: { name?: string; sequence?: string }) => {
      if (key.name === 'escape') {
        renderer.keyInput.off('keypress', keyHandler);
        resolve(decisions); // return partial decisions
        return;
      }

      if (key.sequence === 'a' || key.name === 'return') {
        decisions.push({ candidateId: candidates[currentIndex]!.id, decision: 'redact' });
        currentIndex++;
        if (currentIndex < candidates.length) {
          renderCandidate(currentIndex);
        } else {
          renderer.keyInput.off('keypress', keyHandler);
          showSummary();
        }
        return;
      }

      if (key.sequence === 'r') {
        decisions.push({ candidateId: candidates[currentIndex]!.id, decision: 'keep' });
        currentIndex++;
        if (currentIndex < candidates.length) {
          renderCandidate(currentIndex);
        } else {
          renderer.keyInput.off('keypress', keyHandler);
          showSummary();
        }
        return;
      }
    };

    renderer.keyInput.on('keypress', keyHandler);
    renderCandidate(0);
  });
}
