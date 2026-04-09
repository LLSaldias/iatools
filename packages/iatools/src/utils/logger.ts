/**
 * Logger utility for styled CLI output using chalk.
 * Provides consistent formatting across all iatools commands.
 */

import chalk from 'chalk';

export const logger = {
    /**
     * Print a success message with a green checkmark.
     * @param message The message to display
     */
    success: (message: string): void => {
        console.log(chalk.green('  ✓') + ' ' + message);
    },

    /**
     * Print an informational message.
     * @param message The message to display
     */
    info: (message: string): void => {
        console.log(chalk.cyan('  →') + ' ' + message);
    },

    /**
     * Print a warning message.
     * @param message The message to display
     */
    warn: (message: string): void => {
        console.log(chalk.yellow('  ⚠') + ' ' + message);
    },

    /**
     * Print an error message.
     * @param message The message to display
     */
    error: (message: string): void => {
        console.log(chalk.red('  ✗') + ' ' + message);
    },

    /**
     * Print a section header.
     * @param message The header text
     */
    header: (message: string): void => {
        console.log('\n' + chalk.bold.magenta(message));
    },

    /**
     * Print a plain dimmed label/sub-heading.
     * @param message The label text
     */
    label: (message: string): void => {
        console.log(chalk.dim(message));
    },

    /**
     * Print a blank line for spacing.
     */
    newline: (): void => {
        console.log('');
    },

    /**
     * Print the iatools banner on startup.
     */
    banner: (): void => {
        console.log('');
        console.log(chalk.bold.magenta('  ╔══════════════════════════════════════╗'));
        console.log(chalk.bold.magenta('  ║') + chalk.bold.white('   🪄  iatools  ·  SDD Framework       ') + chalk.bold.magenta('║'));
        console.log(chalk.bold.magenta('  ║') + chalk.dim('   @nx-cardbuilding/iatools               ') + chalk.bold.magenta('║'));
        console.log(chalk.bold.magenta('  ╚══════════════════════════════════════╝'));
        console.log('');
    },
};
