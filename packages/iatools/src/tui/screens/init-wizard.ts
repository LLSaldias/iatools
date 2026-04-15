/**
 * Init wizard screen — multi-step wizard with SelectRenderable.
 * (spec TUI-08)
 */

import {
    BoxRenderable,
    SelectRenderable,
    SelectRenderableEvents,
    TextAttributes,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { createBanner } from '../components/banner';
import { THEME } from '../theme';

export interface InitWizardResult {
  ides: string[];
  roles: string[];
}

interface WizardStep {
  label: string;
  multi: boolean;
  options: Array<{ name: string; description: string; value: string }>;
}

const IDE_OPTIONS = [
  { name: 'VS Code / Copilot', description: 'GitHub Copilot integration', value: 'vscode' },
  { name: 'Cursor', description: 'Cursor AI IDE', value: 'cursor' },
  { name: 'Windsurf', description: 'Windsurf IDE', value: 'windsurf' },
  { name: 'All', description: 'Install for all IDEs', value: 'all' },
];

const ROLE_OPTIONS = [
  { name: 'Explorer', description: 'Explore and investigate', value: 'explorer' },
  { name: 'Proposer', description: 'Create proposals', value: 'proposer' },
  { name: 'Spec Writer', description: 'Write specifications', value: 'spec-writer' },
  { name: 'Designer', description: 'Create designs', value: 'designer' },
  { name: 'Task Planner', description: 'Break down tasks', value: 'task-planner' },
  { name: 'Implementer', description: 'Implement code', value: 'implementer' },
  { name: 'Verifier', description: 'Verify implementation', value: 'verifier' },
  { name: 'Archiver', description: 'Archive changes', value: 'archiver' },
];

export function createInitWizard(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  version: string,
): Promise<InitWizardResult | null> {
  return new Promise((resolve) => {
    let currentStep = 0;
    const selections: string[][] = [[], []];
    let currentSelect: SelectRenderable | null = null;

    const steps: WizardStep[] = [
      { label: 'Select IDE(s)', multi: false, options: IDE_OPTIONS },
      { label: 'Select Role(s)', multi: true, options: ROLE_OPTIONS },
    ];

    // Banner
    createBanner(renderer, root, { version });

    // Step indicator
    const stepIndicator = new TextRenderable(renderer, {
      id: 'step-indicator',
      content: `  Step 1 of ${steps.length + 1} — ${steps[0]!.label}`,
      fg: THEME.colors.highlight,
      attributes: TextAttributes.BOLD,
    });
    root.add(stepIndicator);

    // Select container
    const selectContainer = new BoxRenderable(renderer, {
      id: 'select-container',
      width: '100%',
      flexGrow: 1,
      padding: 1,
    });
    root.add(selectContainer);

    // Key hints bar
    const hintsBar = new BoxRenderable(renderer, {
      id: 'hints-bar',
      border: true,
      borderStyle: 'rounded',
      borderColor: THEME.colors.muted,
      width: '100%',
      padding: 1,
    });
    const hintsText = new TextRenderable(renderer, {
      id: 'hints-text',
      content: '[↑↓] Navigate  [Space] Select  [Enter] Confirm  [ESC] Exit',
      fg: THEME.colors.muted,
    });
    hintsBar.add(hintsText);
    root.add(hintsBar);

    function renderStep(stepIndex: number): void {
      const step = steps[stepIndex]!;

      // Update indicator
      (stepIndicator as any).content = `  Step ${stepIndex + 1} of ${steps.length + 1} — ${step.label}`;

      // Clear previous select
      if (currentSelect) {
        selectContainer.remove(currentSelect.id);
        currentSelect.destroy();
      }

      const select = new SelectRenderable(renderer, {
        id: `select-step-${stepIndex}`,
        width: 50,
        height: Math.min(step.options.length + 2, 12),
        options: step.options,
        selectedIndex: 0,
      });

      // Track toggled items for multi-select
      const toggled = new Set<number>();

      select.on(SelectRenderableEvents.ITEM_SELECTED, (_index: number, option: any) => {
        if (step.multi) {
          // In multi-select, Enter confirms all toggled items
          if (toggled.size > 0) {
            selections[stepIndex] = Array.from(toggled).map((i) => step.options[i]!.value);
          } else {
            // If nothing toggled, use the currently highlighted item
            selections[stepIndex] = [option.value];
          }
        } else {
          selections[stepIndex] = [option.value];
        }
        advanceStep();
      });

      selectContainer.add(select);
      select.focus();
      currentSelect = select;
      renderer.requestRender();
    }

    function advanceStep(): void {
      currentStep++;
      if (currentStep < steps.length) {
        renderStep(currentStep);
      } else {
        // Show confirmation step
        showConfirmation();
      }
    }

    function showConfirmation(): void {
      (stepIndicator as any).content = `  Step ${steps.length + 1} of ${steps.length + 1} — Confirm`;
      if (currentSelect) {
        selectContainer.remove(currentSelect.id);
        currentSelect.destroy();
        currentSelect = null;
      }

      const summary = new BoxRenderable(renderer, {
        id: 'confirm-box',
        flexDirection: 'column',
        gap: 1,
        padding: 1,
      });

      summary.add(new TextRenderable(renderer, {
        id: 'confirm-ides-label',
        content: `IDEs: ${selections[0]!.join(', ')}`,
        fg: THEME.colors.success,
      }));
      summary.add(new TextRenderable(renderer, {
        id: 'confirm-roles-label',
        content: `Roles: ${selections[1]!.join(', ')}`,
        fg: THEME.colors.success,
      }));
      summary.add(new TextRenderable(renderer, {
        id: 'confirm-hint',
        content: 'Press Enter to confirm, ESC to cancel',
        fg: THEME.colors.muted,
      }));

      selectContainer.add(summary);
      (hintsText as any).content = '[Enter] Confirm  [ESC] Cancel';
      renderer.requestRender();

      const confirmHandler = (key: { name?: string }) => {
        if (key.name === 'return') {
          renderer.keyInput.off('keypress', confirmHandler);
          resolve({ ides: selections[0]!, roles: selections[1]! });
        }
      };
      renderer.keyInput.on('keypress', confirmHandler);
    }

    // ESC exits (TUI-08.8)
    renderer.keyInput.on('keypress', (key: { name?: string }) => {
      if (key.name === 'escape') {
        resolve(null);
      }
    });

    // Start
    renderStep(0);
  });
}
