import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type Palette } from './colors';

/** Préférence enregistrée dans les réglages. Sombre par défaut. */
export type ThemePreference = 'sombre' | 'clair' | 'systeme';

export interface Theme {
  scheme: 'dark' | 'light';
  colors: Palette;
}

const ThemeContext = createContext<Theme>({ scheme: 'dark', colors: palettes.dark });

export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): 'dark' | 'light' {
  if (preference === 'clair') return 'light';
  if (preference === 'sombre') return 'dark';
  return system === 'light' ? 'light' : 'dark';
}

export function AppThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);
  return <ThemeContext value={{ scheme, colors: palettes[scheme] }}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
