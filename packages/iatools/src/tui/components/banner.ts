/**
 * Banner component — ASCIIFontRenderable inside a BoxRenderable with rounded border.
 * (spec TUI-03)
 */

import {
    ASCIIFontRenderable,
    BoxRenderable,
    RGBA,
    TextRenderable,
    type CliRenderer,
} from '@opentui/core';
import { THEME } from '../theme';

export interface BannerOptions {
  title?: string;
  version: string;
}

export function createBanner(
  renderer: CliRenderer,
  root: CliRenderer['root'],
  opts: BannerOptions,
): BoxRenderable {
  const container = new BoxRenderable(renderer, {
    id: 'banner',
    border: true,
    borderStyle: 'rounded',
    borderColor: THEME.colors.primary,
    padding: 1,
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  });

  const title = new ASCIIFontRenderable(renderer, {
    id: 'banner-ascii',
    text: opts.title ?? 'iatools',
    font: 'tiny',
    color: RGBA.fromHex(THEME.colors.primary),
  });

  const subtitle = new TextRenderable(renderer, {
    id: 'banner-subtitle',
    content: `v${opts.version} · Spec-Driven Development`,
    fg: THEME.colors.muted,
  });

  container.add(title);
  container.add(subtitle);
  root.add(container);

  return container;
}
