import { createContext, memo, use } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DateData } from 'react-native-calendars';

import type { DayInfo } from '@/core/cycle';
import { fonts, useTheme } from '@/theme';

export interface CalendarDaysContext {
  days: Record<string, DayInfo>;
  selected: string | null;
  onSelect: (key: string) => void;
}

export const DaysContext = createContext<CalendarDaysContext>({
  days: {},
  selected: null,
  onSelect: () => {},
});

export const CELL = 42;

function describe(info: DayInfo | undefined): string {
  if (!info?.phase) return 'aucune donnée';
  const parts = [
    info.phase === 'anneau' ? 'avec anneau' : 'sans anneau',
    info.projected ? 'prévision' : '',
    info.extra ? 'contraception supplémentaire' : '',
    info.removals.length ? `${info.removals.length} retrait imprévu` : '',
  ];
  return parts.filter(Boolean).join(', ');
}

/** Case d'un jour du calendrier (utilisée comme `dayComponent`). */
export const DayCell = memo(function DayCell({
  date,
  state,
}: {
  date?: DateData;
  state?: string;
}) {
  const { colors } = useTheme();
  const { days, selected, onSelect } = use(DaysContext);
  if (!date) return <View style={{ width: CELL, height: CELL }} />;

  const info = days[date.dateString];
  const outside = state === 'disabled' || state === 'inactive';
  const isSelected = selected === date.dateString;

  let bg = 'transparent';
  let fg = colors.calEmptyText;
  if (info?.phase === 'anneau') {
    bg = info.projected ? colors.calRingProjected : colors.calRing;
    fg = info.projected ? colors.calOnDayProjected : colors.calOnDay;
  } else if (info?.phase === 'pause') {
    bg = info.projected ? colors.calPauseProjected : colors.calPause;
    fg = info.projected ? colors.calOnDayProjected : colors.calOnDay;
  }

  const hasShort = info?.removals.some((r) => r.duree === 'moins3h');
  const hasLong = info?.removals.some((r) => r.duree === 'plus3h');

  return (
    <Pressable
      onPress={() => onSelect(date.dateString)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${date.day}, ${describe(info)}${info?.isToday ? ", aujourd'hui" : ''}`}
      style={{ opacity: outside ? 0.35 : 1, alignItems: 'center' }}>
      <View
        style={{
          width: CELL,
          height: CELL,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: info?.extra ? 2 : isSelected ? 1.5 : 0,
          borderColor: info?.extra ? colors.calExtraBorder : colors.text,
          boxShadow: info?.extra
            ? `0 0 10px 1px ${colors.calExtraBorder}AA`
            : isSelected
              ? `0 0 12px 0 ${colors.glow}88`
              : undefined,
          transform: [{ scale: isSelected ? 1.06 : 1 }],
        }}>
        <Text
          style={{
            color: fg,
            fontFamily: info?.isToday ? fonts.bodySemiBold : fonts.body,
            fontSize: 15,
            textDecorationLine: info?.isToday ? 'underline' : 'none',
          }}>
          {date.day}
        </Text>
        {hasShort || hasLong ? (
          <View style={{ position: 'absolute', bottom: 3, flexDirection: 'row', gap: 3 }}>
            {hasShort ? <Dot color={colors.dotShort} outline={colors.dotOutline} /> : null}
            {hasLong ? <Dot color={colors.dotLong} outline={colors.dotOutline} /> : null}
          </View>
        ) : null}
      </View>
      {info?.isToday ? (
        <View
          style={{
            marginTop: 2,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.ember,
          }}
        />
      ) : (
        <View style={{ marginTop: 2, height: 4 }} />
      )}
    </Pressable>
  );
});

export function Dot({ color, outline, size = 7 }: { color: string; outline: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: outline,
      }}
    />
  );
}
