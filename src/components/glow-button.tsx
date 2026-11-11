import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { glow, radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './themed-text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 },
  md: { paddingVertical: spacing.md - 2, paddingHorizontal: spacing.lg, minHeight: 52 },
  lg: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, minHeight: 60 },
};

/**
 * Bouton du thème : « primary » = écarlate avec halo lumineux, « secondary » = contour
 * rouge, « ghost » = texte discret. Retour visuel à l'appui (scale 0.97, 120 ms).
 */
export function GlowButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  accessibilityHint,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const look: Record<Variant, ViewStyle> = {
    primary: {
      backgroundColor: colors.scarlet,
      borderWidth: 1,
      borderColor: colors.ember,
      boxShadow: glow(colors.glow, 'medium'),
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.ember,
    },
    ghost: { backgroundColor: 'transparent' },
  };

  const textTone = variant === 'primary' ? 'onAccent' : variant === 'secondary' ? 'default' : 'muted';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      hitSlop={variant === 'ghost' ? 8 : 0}
      style={style}>
      <Animated.View
        style={[
          {
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: disabled ? 0.45 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            transitionProperty: 'transform',
            transitionDuration: 120,
          },
          sizes[size],
          look[variant],
        ]}>
        {loading ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <>
            {icon}
            <ThemedText
              variant={variant === 'ghost' ? 'label' : 'bodyStrong'}
              tone={textTone}
              style={variant === 'ghost' ? { textDecorationLine: 'underline' } : undefined}>
              {title}
            </ThemedText>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
