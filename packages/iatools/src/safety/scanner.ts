/**
 * Scanner module for the Safety Layer.
 * Scans text for sensitive data using built-in and custom patterns,
 * returning redaction candidates sorted by severity and position.
 */

import { BUILTIN_PATTERNS, PatternRule } from '@/safety/patterns';
import * as fs from 'fs-extra';
import * as path from 'path';

/** A single detected occurrence of sensitive data in the scanned text */
export interface RedactionCandidate {
  /** ID of the pattern that matched */
  patternId: string;
  /** Human-readable label of the pattern */
  label: string;
  /** Severity level of the match */
  severity: 'critical' | 'warning';
  /** The matched text */
  match: string;
  /** Start index of the match in the original text */
  start: number;
  /** End index (exclusive) of the match in the original text */
  end: number;
  /** Surrounding context: up to 40 chars before + after the match */
  context: string;
  /** Replacement string to apply during redaction */
  replacement: string;
}

/** Configuration for the scanner, loaded from `.sdd/sanitize.yaml` or provided directly */
export interface SanitizeConfig {
  /** Additional custom patterns to scan for */
  patterns?: PatternRule[];
  /** Pattern IDs to exclude from scanning */
  ignore?: string[];
}

/**
 * Load sanitize configuration from the project's `.sdd/sanitize.yaml` file.
 * Returns an empty config if the file does not exist.
 *
 * @param projectRoot - Absolute path to the project root directory.
 * @returns Parsed sanitize configuration.
 */
export function loadConfig(projectRoot: string): SanitizeConfig {
  const configPath = path.join(projectRoot, '.sdd', 'sanitize.yaml');
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    return parseSanitizeConfig(parsed as Record<string, unknown>);
  } catch {
    return parseSimpleYaml(content);
  }
}

/**
 * Extract context around a match: up to 40 characters before and after.
 *
 * @param text - The full input text.
 * @param start - Start index of the match.
 * @param end - End index (exclusive) of the match.
 * @returns Context string with the surrounding text.
 */
function extractContext(text: string, start: number, end: number): string {
  const ctxStart = Math.max(0, start - 40);
  const ctxEnd = Math.min(text.length, end + 40);
  return text.slice(ctxStart, ctxEnd);
}

/**
 * Scan text for sensitive data using built-in and custom patterns.
 * Returns candidates sorted by severity (critical first), then by position.
 *
 * @param text - The text to scan for sensitive data.
 * @param config - Optional configuration with custom patterns and ignore list.
 * @returns Array of redaction candidates found in the text.
 */
export function scan(text: string, config?: SanitizeConfig): RedactionCandidate[] {
  const ignoreSet = new Set(config?.ignore ?? []);
  const allPatterns: PatternRule[] = [
    ...BUILTIN_PATTERNS,
    ...(config?.patterns ?? []),
  ].filter((p) => !ignoreSet.has(p.id));

  const candidates: RedactionCandidate[] = [];

  for (const pattern of allPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      candidates.push({
        patternId: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
        match: match[0],
        start,
        end,
        context: extractContext(text, start, end),
        replacement: pattern.replacement,
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.start - b.start;
  });

  return candidates;
}

/**
 * Parse a raw object into a SanitizeConfig, validating structure.
 */
function parseSanitizeConfig(raw: Record<string, unknown>): SanitizeConfig {
  const config: SanitizeConfig = {};

  if (Array.isArray(raw['ignore'])) {
    config.ignore = (raw['ignore'] as unknown[])
      .filter((item): item is string => typeof item === 'string');
  }

  if (Array.isArray(raw['patterns'])) {
    config.patterns = (raw['patterns'] as Record<string, unknown>[])
      .filter((p) => typeof p['id'] === 'string' && typeof p['regex'] === 'string')
      .map((p) => ({
        id: p['id'] as string,
        regex: new RegExp(p['regex'] as string, (p['flags'] as string) ?? 'g'),
        label: (p['label'] as string) ?? p['id'] as string,
        severity: (p['severity'] === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        replacement: (p['replacement'] as string) ?? `[${(p['id'] as string).toUpperCase()}_REDACTED]`,
      }));
  }

  return config;
}

/**
 * Minimal YAML parser for the limited sanitize config format.
 * Supports top-level keys with string arrays (ignore list).
 */
function parseSimpleYaml(content: string): SanitizeConfig {
  const result: Record<string, string[]> = {};
  let currentKey = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const keyMatch = trimmed.match(/^(\w+):\s*$/);
    if (keyMatch && keyMatch[1]) {
      currentKey = keyMatch[1];
      result[currentKey] = [];
      continue;
    }

    const itemMatch = trimmed.match(/^-\s+(.+)$/);
    if (itemMatch && itemMatch[1] && currentKey) {
      const arr = result[currentKey];
      if (arr) {
        arr.push(itemMatch[1].replace(/^["']|["']$/g, ''));
      }
    }
  }

  return parseSanitizeConfig(result as unknown as Record<string, unknown>);
}
