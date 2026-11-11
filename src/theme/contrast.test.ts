import { palettes } from './colors';
import { contrastRatio } from './contrast';

/** AA : 4.5:1 pour le texte normal, 3:1 pour le grand texte et les éléments graphiques. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

describe.each(['dark', 'light'] as const)('palette %s — WCAG AA', (mode) => {
  const p = palettes[mode];

  test.each([
    ['text / bg', p.text, p.bg],
    ['text / surface', p.text, p.surface],
    ['text / surfaceRaised', p.text, p.surfaceRaised],
    ['textMuted / bg', p.textMuted, p.bg],
    ['textMuted / surface', p.textMuted, p.surface],
    ['emberText / bg', p.emberText, p.bg],
    ['emberText / surface', p.emberText, p.surface],
    ['onAccent / scarlet', p.onAccent, p.scarlet],
    ['warning / surface', p.warning, p.surface],
    ['jour anneau', p.calOnDay, p.calRing],
    ['jour anneau prévu', p.calOnDayProjected, p.calRingProjected],
    ['jour pause', p.calOnDay, p.calPause],
    ['jour pause prévu', p.calOnDayProjected, p.calPauseProjected],
    ['jour vide', p.calEmptyText, p.surface],
  ])('%s ≥ 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  test.each([
    ['ember (grands titres) / bg', p.ember, p.bg],
    ['bordure décompte / surface', p.calExtraBorder, p.surface],
    ['pastille < 3 h / surface', p.dotShort, p.surface],
    ['pastille > 3 h / surface', p.dotLong, p.surface],
  ])('%s ≥ 3:1 (grand texte / graphique)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
