import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, View } from 'react-native';

import { Card } from '@/components/card';
import { GlowButton } from '@/components/glow-button';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { formatDateTimeCompact } from '@/core/format';
import type { RingEvent } from '@/core/types';
import {
  CATEGORY_ID,
  CHANNEL_ID,
  hasExactAlarmPermission,
  hasNotificationPermission,
  requestExactAlarmPermission,
  requestNotificationPermission,
} from '@/notifications/scheduler';
import { useAppStore } from '@/state/app-store';
import { radius, spacing, useTheme } from '@/theme';

import { EventEditSheet, eventLabel } from './event-edit-sheet';

const HISTORY_LIMIT = 40;

interface NotifStatus {
  notifOk: boolean | null;
  exactOk: boolean;
  scheduledCount: number | null;
}

async function readNotifStatus(): Promise<NotifStatus> {
  const [notifOk, exactOk, scheduled] = await Promise.all([
    hasNotificationPermission(),
    hasExactAlarmPermission(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  return { notifOk, exactOk, scheduledCount: scheduled.length };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="overline" tone="muted" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function EventRow({ event, onPress }: { event: RingEvent; onPress: () => void }) {
  const { colors } = useTheme();
  const dot =
    event.type === 'retrait_imprevu'
      ? event.duree === 'moins3h'
        ? colors.dotShort
        : colors.dotLong
      : event.type === 'pose'
        ? colors.calRing
        : colors.calPause;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${eventLabel(event)}, ${formatDateTimeCompact(event.at)}. Toucher pour corriger`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
        minHeight: 48,
      })}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
      <ThemedText variant="label" style={{ flex: 1 }}>
        {eventLabel(event)}
      </ThemedText>
      <ThemedText variant="caption" tone="muted">
        {formatDateTimeCompact(event.at)}
      </ThemedText>
    </Pressable>
  );
}

export function SettingsScreen() {
  const { events, settings, state, setSetting, resetAll, resync } = useAppStore();
  const [editing, setEditing] = useState<RingEvent | null>(null);
  const [status, setStatus] = useState<NotifStatus>({
    notifOk: null,
    exactOk: true,
    scheduledCount: null,
  });
  const [statusVersion, setStatusVersion] = useState(0);
  const refreshStatus = useCallback(() => setStatusVersion((v) => v + 1), []);
  const { notifOk, exactOk, scheduledCount } = status;
  const setExactOk = (exact: boolean) => setStatus((s) => ({ ...s, exactOk: exact }));

  useEffect(() => {
    let alive = true;
    readNotifStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, [statusVersion, events, settings]);

  const history = [...events].sort((a, b) => b.at - a.at).slice(0, HISTORY_LIMIT);

  const sendTest = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Notification de test',
        body: 'Les rappels fonctionnent. (« C’est fait » est sans effet sur ce test.)',
        categoryIdentifier: CATEGORY_ID,
        data: { kind: 'test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: CHANNEL_ID,
      },
    });
    Alert.alert('Test programmé', 'La notification arrive dans 5 secondes. Tu peux fermer l’appli pour la voir.');
    // Remet le plan complet en place (le test s'ajoute simplement).
    setTimeout(refreshStatus, 500);
  };

  const confirmReset = () =>
    Alert.alert(
      'Tout effacer ?',
      'Toutes les dates, l’historique et les réglages seront supprimés définitivement de ce téléphone. Les rappels seront annulés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout effacer', style: 'destructive', onPress: () => resetAll() },
      ],
    );

  return (
    <Screen>
      <ThemedText variant="title" accessibilityRole="header">
        Réglages
      </ThemedText>

      <Section title="Cycle actuel">
        <Card>
          {state ? (
            <>
              <ThemedText variant="bodyStrong">
                {`${state.anchor.type === 'pose' ? 'Anneau posé le' : 'Anneau retiré le'} ${formatDateTimeCompact(state.anchor.at)}`}
              </ThemedText>
              <ThemedText variant="caption" tone="muted">
                Une erreur de date ? Corrige-la : le calendrier et les rappels seront recalculés.
              </ThemedText>
              <GlowButton title="Corriger cette date" variant="secondary" size="sm" onPress={() => setEditing(state.anchor)} />
            </>
          ) : (
            <ThemedText tone="muted">Aucun cycle enregistré.</ThemedText>
          )}
        </Card>
      </Section>

      <Section title="Notifications">
        <Card glowing={notifOk === false || !exactOk}>
          <ThemedText variant="bodyStrong" tone={notifOk === false ? 'warning' : 'default'}>
            {notifOk === null ? '…' : notifOk ? 'Rappels activés' : 'Notifications désactivées'}
          </ThemedText>
          {notifOk === false ? (
            <>
              <ThemedText variant="caption" tone="muted">
                Aucun rappel ne peut s’afficher. Active les notifications pour cette appli.
              </ThemedText>
              <GlowButton
                title="Activer"
                variant="secondary"
                size="sm"
                onPress={async () => {
                  const ok = await requestNotificationPermission();
                  if (!ok) Linking.openSettings();
                  await resync();
                  refreshStatus();
                }}
              />
            </>
          ) : null}
          {notifOk && !exactOk && Platform.OS === 'android' ? (
            <>
              <ThemedText variant="caption" tone="muted">
                Les rappels peuvent arriver avec quelques minutes de retard. Autorise « Alarmes et
                rappels » pour qu’ils soient pile à l’heure.
              </ThemedText>
              <GlowButton
                title="Autoriser les alarmes exactes"
                variant="secondary"
                size="sm"
                onPress={async () => {
                  setExactOk(await requestExactAlarmPermission());
                  await resync();
                }}
              />
            </>
          ) : null}
          {notifOk ? (
            <ThemedText variant="caption" tone="muted">
              {`${scheduledCount ?? '…'} rappels programmés à l’avance sur ce téléphone.`}
            </ThemedText>
          ) : null}
        </Card>
        <ThemedText variant="caption" tone="muted">
          Rappels horaires programmés à l’avance après l’heure prévue
        </ThemedText>
        <Segmented
          options={[
            { value: 24, label: '24 rappels' },
            { value: 48, label: '48 rappels' },
          ]}
          value={settings.repeatCount}
          onChange={(v) => setSetting('repeatCount', v)}
        />
        {notifOk ? (
          <GlowButton title="Envoyer une notification de test" variant="ghost" size="sm" onPress={sendTest} style={{ alignSelf: 'center' }} />
        ) : null}
      </Section>

      <Section title="Apparence">
        <Segmented
          options={[
            { value: 'sombre', label: 'Sombre' },
            { value: 'clair', label: 'Clair' },
            { value: 'systeme', label: 'Système' },
          ]}
          value={settings.theme}
          onChange={(v) => setSetting('theme', v)}
        />
      </Section>

      <Section title="Historique">
        <Card style={{ paddingHorizontal: spacing.xs, gap: 0 }}>
          {history.length === 0 ? (
            <ThemedText tone="muted" style={{ padding: spacing.sm }}>
              Rien pour l’instant.
            </ThemedText>
          ) : (
            history.map((e) => <EventRow key={e.id} event={e} onPress={() => setEditing(e)} />)
          )}
        </Card>
        <ThemedText variant="caption" tone="muted">
          Touche un événement pour corriger sa date ou le supprimer.
        </ThemedText>
      </Section>

      <Section title="Données">
        <Card>
          <ThemedText variant="caption" tone="muted">
            Toutes les données restent sur ce téléphone : aucun compte, aucun serveur, rien n’est
            envoyé sur Internet.
          </ThemedText>
          <GlowButton title="Tout effacer" variant="secondary" size="sm" onPress={confirmReset} />
        </Card>
      </Section>

      <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        Cette appli applique le rythme 21 jours avec / 7 jours sans. En cas de doute (oubli,
        retrait prolongé, saignements…), la notice du médicament et ton médecin ou pharmacien
        restent la référence.
      </ThemedText>

      <EventEditSheet event={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
