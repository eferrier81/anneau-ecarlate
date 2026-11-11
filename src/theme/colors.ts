/**
 * Palette « magie écarlate » — 100 % originale.
 * Toutes les paires texte/fond utilisées sont vérifiées WCAG AA dans contrast.test.ts.
 */

export interface Palette {
  /** Fond de l'appli. */
  bg: string;
  /** Cartes, feuilles. */
  surface: string;
  /** Surface en relief (boutons secondaires, cellules). */
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  /** Rouge écarlate profond (marque). */
  scarlet: string;
  /** Rouge vif lumineux : bordures, lueurs, grands titres uniquement (≈ 4:1). */
  ember: string;
  /** Rouge lisible pour du petit texte (≥ 4.5:1). */
  emberText: string;
  /** Texte sur fond écarlate / rouge vif. */
  onAccent: string;
  /** Couleur des lueurs (glow). */
  glow: string;
  /** Voile derrière les feuilles modales. */
  scrim: string;
  /** Avertissement (contraception supplémentaire, notifs désactivées). */
  warning: string;

  /** Calendrier */
  calRing: string;
  calRingProjected: string;
  calPause: string;
  calPauseProjected: string;
  calOnDay: string;
  calOnDayProjected: string;
  calEmptyText: string;
  calExtraBorder: string;
  dotShort: string;
  dotLong: string;
  dotOutline: string;
}

export const palettes: Record<'dark' | 'light', Palette> = {
  dark: {
    bg: '#0D0A0B',
    surface: '#171012',
    surfaceRaised: '#21161A',
    border: '#3A2329',
    text: '#F5E9EA',
    textMuted: '#B8A3A6',
    scarlet: '#8B0A1A',
    ember: '#E0142B',
    emberText: '#FF5A6B',
    onAccent: '#FFFFFF',
    glow: '#E0142B',
    scrim: 'rgba(5, 3, 4, 0.72)',
    warning: '#F2B33D',

    calRing: '#8B0A1A',
    calRingProjected: '#4E0E18',
    calPause: '#4A2150',
    calPauseProjected: '#2E1733',
    calOnDay: '#FFFFFF',
    calOnDayProjected: '#E9D6DA',
    calEmptyText: '#8F7A7E',
    calExtraBorder: '#FF2A44',
    dotShort: '#F2B33D',
    dotLong: '#FF2A44',
    dotOutline: '#0D0A0B',
  },
  light: {
    bg: '#FAF3EE',
    surface: '#FFFFFF',
    surfaceRaised: '#F3E6E0',
    border: '#E2CDC6',
    text: '#1E1214',
    textMuted: '#5E4A4D',
    scarlet: '#8B0A1A',
    ember: '#C3112A',
    emberText: '#A00E21',
    onAccent: '#FFFFFF',
    glow: '#E0142B',
    scrim: 'rgba(30, 18, 20, 0.45)',
    warning: '#8A5A00',

    calRing: '#B3202F',
    calRingProjected: '#E7B7BC',
    calPause: '#7A4A85',
    calPauseProjected: '#D9C3DE',
    calOnDay: '#FFFFFF',
    calOnDayProjected: '#2A1A1D',
    calEmptyText: '#6E5A5D',
    calExtraBorder: '#E0142B',
    dotShort: '#A86E00',
    dotLong: '#E0142B',
    dotOutline: '#FFFFFF',
  },
};

/** Ajoute une opacité à une couleur hex (#RRGGBB → rgba). */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
