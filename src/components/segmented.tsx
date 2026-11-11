import { Pressable, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './themed-text';

/** Choix exclusif entre quelques options (boutons radio côte à côte). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 48,
              padding: spacing.sm + 2,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              borderWidth: selected ? 1.5 : 1,
              borderColor: selected ? colors.ember : colors.border,
              backgroundColor: selected ? colors.surfaceRaised : colors.surface,
              boxShadow: selected ? `0 0 14px 0 ${colors.glow}55` : undefined,
              justifyContent: 'center',
            }}>
            <ThemedText variant="label" style={{ textAlign: 'center' }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
