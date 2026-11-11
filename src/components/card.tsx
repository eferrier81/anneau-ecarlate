import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { glow, radius, spacing, useTheme } from '@/theme';

/** Carte du thème. `glowing` ajoute un halo rouge (éléments importants). */
export function Card({
  children,
  glowing,
  style,
}: {
  children: ReactNode;
  glowing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: glowing ? colors.ember : colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        },
        glowing && { boxShadow: glow(colors.glow, 'soft') },
        style,
      ]}>
      {children}
    </View>
  );
}
