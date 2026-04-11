import boxen from 'boxen';
import chalk from 'chalk';

export function renderBanner(version: string): string {
  const line1 = `${chalk.bold.white('🪄  iatools')} ${chalk.magenta(`v${version}`)}  ${chalk.gray('·')}  ${chalk.white('Spec-Driven Development')}`;
  const line2 = chalk.gray('@lsframework/iatools');

  const content = `\n${line1}\n${line2}\n`;

  return boxen(content, {
    borderStyle: 'round',
    borderColor: 'magenta',
    padding: { top: 0, bottom: 0, left: 2, right: 2 },
  });
}
