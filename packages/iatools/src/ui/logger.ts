import { renderBanner } from '@/ui/components/banner';
import { renderProgress, type ProgressOptions } from '@/ui/components/progress';
import { renderTable, type TableOptions } from '@/ui/components/table';
import { theme, keyHint as themeKeyHint, panel as themePanel } from '@/ui/theme';

const isTTY = process.stdout.isTTY ?? false;

export const logger = {
  success(message: string): void {
    if (isTTY) {
      console.log(`  ${theme.colors.success(theme.icons.success)} ${message}`);
    } else {
      console.log(`  [OK] ${message}`);
    }
  },

  info(message: string): void {
    if (isTTY) {
      console.log(`  ${theme.colors.accent(theme.icons.arrow)} ${message}`);
    } else {
      console.log(`  [INFO] ${message}`);
    }
  },

  warn(message: string): void {
    if (isTTY) {
      console.log(`  ${theme.colors.warning(theme.icons.warning)} ${message}`);
    } else {
      console.log(`  [WARN] ${message}`);
    }
  },

  error(message: string): void {
    if (isTTY) {
      console.log(`  ${theme.colors.error(theme.icons.error)} ${message}`);
    } else {
      console.log(`  [ERROR] ${message}`);
    }
  },

  header(message: string): void {
    if (isTTY) {
      console.log('\n' + theme.colors.highlight(`  ${message}`));
    } else {
      console.log(`\n  ${message}`);
    }
  },

  label(message: string): void {
    console.log(theme.colors.muted(message));
  },

  newline(): void {
    console.log('');
  },

  banner(version: string): void {
    if (isTTY) {
      console.log(renderBanner(version));
    } else {
      console.log(`iatools v${version} - Spec-Driven Development`);
    }
  },

  panel(content: string, options?: { title?: string }): void {
    if (isTTY) {
      console.log(themePanel(content, options));
    } else {
      if (options?.title) console.log(`--- ${options.title} ---`);
      console.log(content);
    }
  },

  table(options: TableOptions): void {
    console.log(renderTable(options));
  },

  progress(options: ProgressOptions): void {
    console.log(renderProgress(options));
  },

  keyHint(keys: Array<{ key: string; label: string }>): void {
    if (isTTY) {
      console.log(themeKeyHint(keys));
    } else {
      console.log(keys.map((k) => `[${k.key}] ${k.label}`).join('  '));
    }
  },
};
