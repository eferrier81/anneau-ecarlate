import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { screenPadding, spacing, useTheme } from '@/theme';

/** Halo rouge diffus en haut de l'écran : de l'énergie qui flotte. */
function AmbientGlow() {
  const { colors, scheme } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="ambient" cx="50%" cy="8%" rx="85%" ry="45%">
          <Stop offset="0" stopColor={colors.glow} stopOpacity={scheme === 'dark' ? 0.2 : 0.1} />
          <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#ambient)" />
    </Svg>
  );
}

export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }]}>{children}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientGlow />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
});
