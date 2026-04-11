/**
 * @module pipeline/caveman/preservers
 * Extract and restore content blocks that must not be compressed.
 */

/** A block of content preserved through compression. */
export interface PreservedBlock {
  placeholder: string;
  original: string;
  start: number;
  end: number;
}

/**
 * Extracts preserved blocks (code fences, inline code, URLs, file paths, shell commands)
 * from text, replacing them with placeholders.
 */
export function extractPreserved(text: string): { cleaned: string; blocks: PreservedBlock[] } {
  const blocks: PreservedBlock[] = [];
  let cleaned = text;
  let counter = 0;

  const createPlaceholder = (type: string): string => {
    const ph = `{{${type}_${counter}}}`;
    counter++;
    return ph;
  };

  // 1. Fenced code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match, offset: number) => {
    const placeholder = createPlaceholder('CODE_BLOCK');
    blocks.push({ placeholder, original: match, start: offset, end: offset + match.length });
    return placeholder;
  });

  // 2. Inline code (`...`) — avoid matching already-replaced placeholders
  cleaned = cleaned.replace(/`[^`\n]+`/g, (match, offset: number) => {
    const placeholder = createPlaceholder('INLINE_CODE');
    blocks.push({ placeholder, original: match, start: offset, end: offset + match.length });
    return placeholder;
  });

  // 3. URLs (http/https)
  cleaned = cleaned.replace(/https?:\/\/[^\s)>\]]+/g, (match, offset: number) => {
    if (match.startsWith('{{')) return match; // skip placeholders
    const placeholder = createPlaceholder('URL');
    blocks.push({ placeholder, original: match, start: offset, end: offset + match.length });
    return placeholder;
  });

  // 4. File paths (starting with / or ./ or containing /src/)
  cleaned = cleaned.replace(/(?:^|\s)((?:\.{0,2}\/[\w./@-]+)+)/gm, (match, path: string, offset: number) => {
    const leadingSpace = match.slice(0, match.length - path.length);
    const placeholder = createPlaceholder('FILE_PATH');
    blocks.push({ placeholder, original: path, start: offset + leadingSpace.length, end: offset + match.length });
    return leadingSpace + placeholder;
  });

  // 5. Shell commands (lines starting with $)
  cleaned = cleaned.replace(/^\$\s+.+$/gm, (match, offset: number) => {
    const placeholder = createPlaceholder('SHELL_CMD');
    blocks.push({ placeholder, original: match, start: offset, end: offset + match.length });
    return placeholder;
  });

  return { cleaned, blocks };
}

/**
 * Restores preserved blocks back into the text by replacing placeholders.
 */
export function restorePreserved(text: string, blocks: PreservedBlock[]): string {
  let result = text;
  for (const block of blocks) {
    result = result.replace(block.placeholder, block.original);
  }
  return result;
}
