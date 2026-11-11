import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { formatDayLong, formatTime } from '@/core/format';
import { radius, spacing, useTheme } from '@/theme';

import { ThemedText } from './themed-text';

/**
 * Choix d'une date + heure. Android : dialogues natifs (date puis heure).
 * iOS : sélecteurs compacts.
 */
export function DateTimeField({
  value,
  onChange,
  maximumDate,
  minimumDate,
  label,
}: {
  value: number;
  onChange: (at: number) => void;
  maximumDate?: number;
  minimumDate?: number;
  label?: string;
}) {
  const { colors, scheme } = useTheme();

  const clamp = (t: number) => {
    let out = t;
    if (maximumDate !== undefined) out = Math.min(out, maximumDate);
    if (minimumDate !== undefined) out = Math.max(out, minimumDate);
    return out;
  };

  const openAndroid = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value: new Date(value),
      mode,
      is24Hour: true,
      maximumDate: mode === 'date' && maximumDate !== undefined ? new Date(maximumDate) : undefined,
      minimumDate: mode === 'date' && minimumDate !== undefined ? new Date(minimumDate) : undefined,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const next = new Date(value);
        if (mode === 'date') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        else next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        onChange(clamp(next.getTime()));
      },
    });
  };

  const chip = (text: string, mode: 'date' | 'time', a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${a11y} : ${text}. Toucher pour modifier`}
      onPress={() => openAndroid(mode)}
      style={({ pressed }) => ({
        flex: mode === 'date' ? 1 : undefined,
        paddingVertical: spacing.sm + 4,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: pressed ? colors.ember : colors.border,
        backgroundColor: colors.surfaceRaised,
        minHeight: 48,
        justifyContent: 'center',
      })}>
      <ThemedText variant="label" style={{ textTransform: mode === 'date' ? 'capitalize' : 'none' }}>
        {text}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <ThemedText variant="caption" tone="muted">
          {label}
        </ThemedText>
      ) : null}
      {Platform.OS === 'android' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {chip(formatDayLong(value), 'date', 'Date')}
          {chip(formatTime(value), 'time', 'Heure')}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <DateTimePicker
            value={new Date(value)}
            mode="datetime"
            display="compact"
            locale="fr-FR"
            themeVariant={scheme}
            accentColor={colors.ember}
            maximumDate={maximumDate !== undefined ? new Date(maximumDate) : undefined}
            minimumDate={minimumDate !== undefined ? new Date(minimumDate) : undefined}
            onChange={(_e, date) => date && onChange(clamp(date.getTime()))}
          />
        </View>
      )}
    </View>
  );
}
