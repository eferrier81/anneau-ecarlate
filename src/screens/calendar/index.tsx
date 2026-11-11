import { addDays, endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { dayKey, projectDays } from '@/core/cycle';
import { formatDayLong, formatTime } from '@/core/format';
import { useAppStore } from '@/state/app-store';
import { fonts, radius, spacing, useTheme } from '@/theme';

import { DayCell, DaysContext, Dot } from './day-cell';

LocaleConfig.locales.fr = {
  monthNames: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ],
  monthNamesShort: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  dayNames: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  dayNamesShort: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

function Swatch({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: '45%' }}>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          backgroundColor: color,
          borderWidth: border ? 2 : 0,
          borderColor: border,
          boxShadow: border ? `0 0 6px 0 ${border}` : undefined,
        }}
      />
      <ThemedText variant="caption">{label}</ThemedText>
    </View>
  );
}

function Legend() {
  const { colors } = useTheme();
  return (
    <Card>
      <ThemedText variant="overline" tone="muted">
        Légende
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, columnGap: spacing.md }}>
        <Swatch color={colors.calRing} label="Avec l’anneau" />
        <Swatch color={colors.calPause} label="Sans l’anneau" />
        <Swatch color={colors.calRingProjected} label="Avec (prévu)" />
        <Swatch color={colors.calPauseProjected} label="Sans (prévu)" />
        <Swatch color="transparent" border={colors.calExtraBorder} label="Contraception suppl." />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: '45%' }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Dot color={colors.dotShort} outline={colors.dotOutline} size={10} />
          </View>
          <ThemedText variant="caption">Retrait {'<'} 3 h</ThemedText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: '45%' }}>
          <Dot color={colors.dotLong} outline={colors.dotOutline} size={10} />
          <ThemedText variant="caption">Retrait {'>'} 3 h</ThemedText>
        </View>
      </View>
    </Card>
  );
}

export function CalendarScreen() {
  const { colors } = useTheme();
  const { events, now } = useAppStore();
  const [month, setMonth] = useState(() => startOfMonth(now).getTime());
  const [selected, setSelected] = useState<string>(() => dayKey(now));

  // Mois visible + jours débordants (6 semaines max).
  const days = useMemo(
    () => projectDays(events, addDays(month, -7).getTime(), addDays(endOfMonth(month), 14).getTime(), now),
    [events, month, now],
  );

  const onSelect = useCallback((key: string) => setSelected(key), []);
  const ctx = useMemo(() => ({ days, selected, onSelect }), [days, selected, onSelect]);

  const info = days[selected];

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: 'transparent',
      monthTextColor: colors.text,
      textMonthFontFamily: fonts.display,
      textMonthFontSize: 20,
      textSectionTitleColor: colors.textMuted,
      textDayHeaderFontFamily: fonts.bodyMedium,
      textDayHeaderFontSize: 12,
      arrowColor: colors.ember,
    }),
    [colors],
  );

  return (
    <Screen>
      <ThemedText variant="title" accessibilityRole="header">
        Calendrier
      </ThemedText>

      <DaysContext value={ctx}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
          }}>
          <Calendar
            key={`${colors.bg}`}
            current={dayKey(month)}
            firstDay={1}
            enableSwipeMonths
            showSixWeeks
            theme={calendarTheme}
            dayComponent={DayCell}
            markedDates={{ [selected]: { selected: true } }}
            onMonthChange={(d: DateData) => setMonth(startOfMonth(new Date(d.year, d.month - 1, 1)).getTime())}
          />
        </View>
      </DaysContext>

      {info ? (
        <Card glowing={info.extra}>
          <ThemedText variant="heading" style={{ textTransform: 'capitalize' }}>
            {formatDayLong(parseISO(info.key).getTime())}
          </ThemedText>
          <ThemedText variant="bodyStrong" tone={info.phase ? 'default' : 'muted'}>
            {info.phase === 'anneau'
              ? info.projected
                ? 'Anneau en place (prévision)'
                : 'Anneau en place'
              : info.phase === 'pause'
                ? info.projected
                  ? 'Pause sans anneau (prévision)'
                  : 'Pause sans anneau'
                : 'Aucune donnée pour ce jour'}
          </ThemedText>
          {info.transitions.map((t) => (
            <ThemedText key={`${t.type}-${t.at}`} variant="caption" tone="muted">
              {t.type === 'pose'
                ? t.projected
                  ? `Pose prévue à ${formatTime(t.at)}`
                  : `Anneau posé à ${formatTime(t.at)}`
                : t.projected
                  ? `Retrait prévu à ${formatTime(t.at)}`
                  : `Anneau retiré à ${formatTime(t.at)}`}
            </ThemedText>
          ))}
          {info.extra ? (
            <ThemedText variant="caption" tone="ember">
              Contraception supplémentaire ce jour-là
            </ThemedText>
          ) : null}
          {info.removals.map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Dot
                color={r.duree === 'moins3h' ? colors.dotShort : colors.dotLong}
                outline={colors.dotOutline}
                size={10}
              />
              <ThemedText variant="caption">
                {`Retrait imprévu à ${formatTime(r.at)} · ${r.duree === 'moins3h' ? 'moins de 3 h' : 'plus de 3 h'}`}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <Legend />
    </Screen>
  );
}
