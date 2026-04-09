/**
 * File writer utility that copies template files to the target project.
 * Handles conflict detection (skip / overwrite), directory creation, and
 * variable interpolation of {{PROJECT_NAME}} placeholders.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from './logger';

export interface WriteOptions {
  /** Absolute destination path */
  dest: string;
  /** Raw file content (already interpolated) */
  content: string;
  /** If true, overwrite existing files; if false, skip silently */
  overwrite?: boolean;
}

/**
 * Write a single file to disk, respecting the overwrite flag.
 * @param {WriteOptions} options WriteOptions
 * @return {boolean} true if the file was written, false if it was skipped
 */
export async function writeFile(options: WriteOptions): Promise<boolean> {
  const { dest, content, overwrite = false } = options;

  if ((await fs.pathExists(dest)) && !overwrite) {
    logger.warn(
      `Skipped (already exists): ${path.relative(process.cwd(), dest)}`
    );
    return false;
  }

  await fs.ensureDir(path.dirname(dest));
  await fs.writeFile(dest, content, 'utf8');
  logger.success(path.relative(process.cwd(), dest));
  return true;
}

/**
 * Interpolate template variables in a string.
 * Replaces {{PROJECT_NAME}}, {{ROLE}}, {{IDE}}, {{DATE}} with actual values.
 * @param {string} content Raw template string
 * @param {Record<string, string>} vars Key-value map of variable substitutions
 * @return {string} Interpolated string
 */
export function interpolate(
  content: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    content
  );
}

/**
 * Ensure a directory exists (creates recursively if needed).
 * @param {string} dirPath Absolute path to the directory
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Copy a directory of templates to a destination, interpolating all files.
 * @param {string} srcDir Absolute source template directory
 * @param {string} destDir Absolute destination directory
 * @param {Record<string, string>} vars Interpolation variables
 * @param {boolean} overwrite Whether to overwrite existing files
 */
export async function copyTemplateDir(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
  overwrite = false
): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyTemplateDir(srcPath, destPath, vars, overwrite);
    } else {
      const raw = await fs.readFile(srcPath, 'utf8');
      const content = interpolate(raw, vars);
      await writeFile({ dest: destPath, content, overwrite });
    }
  }
}
