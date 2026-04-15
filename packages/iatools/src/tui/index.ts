/**
 * Barrel file for the TUI module.
 * Re-exports all public types, constants, factories, components, and screens.
 */

// Foundation
export {
    createTuiContext, type DiffViewOpts, type ProgressOpts, type TableOpts, type TuiContext,
    type TuiContextOptions
} from './context';
export { createFallbackContext, requireTTY } from './fallback';
export { createAppRenderer, type AppRenderer } from './renderer';
export { THEME, type TuiTheme } from './theme';

// Components
export { createBanner } from './components/banner';
export { createDiffView } from './components/diff-view';
export { createLogPanel } from './components/log-panel';
export { createProgressBar } from './components/progress';
export { createTable } from './components/table';

// Screens
export { createCommandMenu } from './screens/command-menu';
export { createInitWizard } from './screens/init-wizard';
export { createQueryResultsScreen } from './screens/query-results';
export { createSanitizeReview } from './screens/sanitize-review';
export { createStaticOutput } from './screens/static-output';

