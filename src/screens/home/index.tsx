import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, useWindowDimensions, View } from 'react-native';

import { Card } from '@/components/card';
import { GlowButton } from '@/components/glow-button';
import { MagicCircle } from '@/components/magic-circle';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { HOUR_MS, PAUSE_DAYS, RING_DAYS, type CycleState } from '@/core/cycle';
import { formatDuration, formatRelativeDateTime, formatTime, plural } from '@/core/format';
import { useAppStore } from '@/state/app-store';
import { spacing, useTheme } from '@/theme';

import { RemovalSheet } from './removal-sheet';

/** Une action est « imminente » dans les 24 h qui précèdent l'échéance (ou en retard). */
const IMMINENT_MS = 24 * HOUR_MS;

function Countdown({ state, now }: { state: CycleState; now: number }) {
  if (state.overdue) {
    return (
      <>
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          Maintenant
        </ThemedText>
        <ThemedText variant="caption" tone="ember" style={{ textAlign: 'center' }}>
          {`en retard de ${formatDuration(now - state.dueAt)}`}
        </ThemedText>
      </>
    );
  }
  if (state.daysRemaining === 0) {
    return (
      <>
        <ThemedText variant="title" style={{ textAlign: 'center' }}>
          Aujourd’hui
        </ThemedText>
        <ThemedText variant="label" tone="muted" style={{ textAlign: 'center' }}>
          {`à ${formatTime(state.dueAt)}`}
        </ThemedText>
      </>
    );
  }
  return (
    <>
      <ThemedText variant="counter" style={{ textAlign: 'center' }}>
        {state.daysRemaining}
      </ThemedText>
      <ThemedText variant="overline" tone="muted" style={{ textAlign: 'center' }}>
        {state.daysRemaining > 1 ? 'jours restants' : 'jour restant'}
      </ThemedText>
    </>
  );
}

export function Home() {
  const { colors } = useTheme();
  const { state, now, confirmAction } = useAppStore();
  const { width } = useWindowDimensions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state) return <Screen>{null}</Screen>;

  const inRing = state.phase === 'anneau';
  const imminent = state.overdue || state.msRemaining <= IMMINENT_MS;
  const circleSize = Math.min(width - spacing.xl, 340);
  const phaseLength = inRing ? RING_DAYS : PAUSE_DAYS;

  const actionLabel = inRing ? 'J’ai retiré l’anneau' : 'J’ai remis l’anneau';

  const doConfirm = async () => {
    setBusy(true);
    try {
      await confirmAction();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = () => {
    if (imminent) {
      doConfirm();
      return;
    }
    Alert.alert(
      'C’est en avance',
      `${inRing ? 'Le retrait' : 'La pose'} est prévu${inRing ? '' : 'e'} ${formatRelativeDateTime(state.dueAt, now)}. Confirmer quand même maintenant ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: doConfirm },
      ],
    );
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm }}>
        <ThemedText variant="overline" tone="muted">
          {`Jour ${Math.min(state.dayOfPhase, 99)} sur ${phaseLength}`}
        </ThemedText>
        <ThemedText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {inRing ? 'Anneau en place' : 'Pause sans anneau'}
        </ThemedText>
      </View>

      <View
        style={{ alignItems: 'center' }}
        accessible
        accessibilityLabel={
          state.overdue
            ? `C'est le moment de ${inRing ? 'retirer' : 'remettre'} l'anneau, en retard de ${formatDuration(now - state.dueAt)}`
            : `${plural(state.daysRemaining, 'jour restant', 'jours restants')} avant ${inRing ? 'le retrait' : 'la pose'}`
        }>
        <MagicCircle size={circleSize} intensity={imminent ? 'urgent' : 'calm'}>
          <Countdown state={state} now={now} />
        </MagicCircle>
      </View>

      <View style={{ alignItems: 'center', gap: 2 }}>
        <ThemedText variant="caption" tone="muted">
          {inRing ? 'Retrait prévu' : 'Pose prévue'}
        </ThemedText>
        <ThemedText variant="bodyStrong" style={{ textAlign: 'center' }}>
          {formatRelativeDateTime(state.dueAt, now)}
        </ThemedText>
      </View>

      {state.extra ? (
        <Card glowing>
          <ThemedText variant="overline" tone="ember">
            Contraception supplémentaire
          </ThemedText>
          <ThemedText variant="heading">
            {state.extra.daysRemaining === 0
              ? `Se termine aujourd’hui à ${formatTime(state.extra.endsAt)}`
              : `${plural(state.extra.daysRemaining, 'jour restant', 'jours restants')}`}
          </ThemedText>
          <ThemedText variant="caption" tone="muted">
            {`Jusqu’à ${formatRelativeDateTime(state.extra.endsAt, now)}, suite à un retrait de plus de 3 h.`}
          </ThemedText>
        </Card>
      ) : null}

      <View style={{ gap: spacing.md, alignItems: 'stretch' }}>
        <GlowButton
          title={actionLabel}
          size="lg"
          variant={imminent ? 'primary' : 'secondary'}
          loading={busy}
          onPress={onConfirm}
          accessibilityHint="Enregistre l'action maintenant et arrête les rappels"
        />
        {inRing ? (
          <GlowButton
            title="J’ai dû retirer l’anneau"
            variant="ghost"
            size="sm"
            onPress={() => setSheetOpen(true)}
            style={{ alignSelf: 'center' }}
          />
        ) : null}
      </View>

      {!imminent ? (
        <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center', color: colors.textMuted }}>
          Un rappel arrivera à l’heure prévue, puis toutes les heures jusqu’à confirmation.
        </ThemedText>
      ) : null}

      <RemovalSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
