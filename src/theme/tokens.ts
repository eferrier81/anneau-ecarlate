/** Tokens statiques : espacements, rayons, typographie, lueurs, animations. */
import type { TextStyle } from 'react-native';

import { withAlpha } from './colors';

/** Grille de 4 points. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Marge latérale des écrans. */
export const screenPadding = spacing.lg;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  full: 9999,
} as const;

/** Familles de polices chargées dans le layout racine. */
export const fonts = {
  display: 'Cinzel_600SemiBold',
  displayBold: 'Cinzel_700Bold',
  displayRegular: 'Cinzel_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

/** Rampe typographique (sans couleur : appliquée par <ThemedText>). */
export const typeScale = {
  /** Grand compteur au centre du cercle. */
  counter: { fontFamily: fonts.displayBold, fontSize: 76, lineHeight: 84 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34, letterSpacing: 1 },
  heading: { fontFamily: fonts.display, fontSize: 19, lineHeight: 26, letterSpacing: 0.6 },
  /** Sur-titres : Cinzel dessine déjà ses minuscules en petites capitales. */
  overline: {
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 1.2,
  },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;

/** Lueurs « énergie magique » (boxShadow, nouvelle architecture RN). */
export function glow(color: string, strength: 'soft' | 'medium' | 'strong' = 'medium'): string {
  switch (strength) {
    case 'soft':
      return `0 0 18px 0 ${withAlpha(color, 0.28)}`;
    case 'strong':
      return `0 0 36px 4px ${withAlpha(color, 0.55)}, 0 0 10px 0 ${withAlpha(color, 0.6)}`;
    default:
      return `0 0 26px 2px ${withAlpha(color, 0.42)}`;
  }
}

export const motion = {
  fast: 150,
  base: 260,
  slow: 420,
  /** Respiration du cercle magique. */
  breathe: 4200,
  /** Rotation très lente des runes. */
  runeRotation: 120_000,
  springSnappy: { damping: 18, stiffness: 260, mass: 0.8 },
} as const;
