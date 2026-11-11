import { Text, type TextProps } from 'react-native';

import { typeScale, useTheme, type TypeVariant } from '@/theme';

export type TextTone = 'default' | 'muted' | 'ember' | 'onAccent' | 'warning';

export function ThemedText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: TextTone }) {
  const { colors } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    ember: colors.emberText,
    onAccent: colors.onAccent,
    warning: colors.warning,
  }[tone];
  return <Text style={[typeScale[variant], { color }, style]} {...props} />;
}
