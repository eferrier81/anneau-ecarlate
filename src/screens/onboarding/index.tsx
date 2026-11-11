import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Card } from '@/components/card';
import { DateTimeField } from '@/components/date-time-field';
import { GlowButton } from '@/components/glow-button';
import { MagicCircle } from '@/components/magic-circle';
import { Segmented } from '@/components/segmented';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { PAUSE_DAYS, RING_DAYS } from '@/core/cycle';
import type { CycleEventType } from '@/core/types';
import {
  hasExactAlarmPermission,
  requestExactAlarmPermission,
  requestNotificationPermission,
} from '@/notifications/scheduler';
import { useAppStore } from '@/state/app-store';
import { spacing } from '@/theme';

type Step = 'bienvenue' | 'notifications' | 'cycle';

export function Onboarding() {
  const { initialize, now } = useAppStore();
  const [step, setStep] = useState<Step>('bienvenue');
  const [type, setType] = useState<CycleEventType>('pose');
  const [at, setAt] = useState(() => Date.now());
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [exactOk, setExactOk] = useState(true);
  const [saving, setSaving] = useState(false);

  const askNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (granted && Platform.OS === 'android') setExactOk(await hasExactAlarmPermission());
  };

  const longAgoDays = Math.floor((now - at) / 86_400_000);
  const limit = type === 'pose' ? RING_DAYS : PAUSE_DAYS;

  if (step === 'bienvenue') {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xl }}>
          <MagicCircle size={220}>
            <ThemedText variant="heading" style={{ textAlign: 'center' }}>
              21 / 7
            </ThemedText>
          </MagicCircle>
          <ThemedText variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            Bienvenue
          </ThemedText>
          <ThemedText tone="muted" style={{ textAlign: 'center' }}>
            Cette appli suit ton anneau : 21 jours avec, 7 jours sans. Elle te prévient au bon
            moment et garde une trace des retraits imprévus.
          </ThemedText>
          <ThemedText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            Tout reste sur ce téléphone. Aucun compte, aucune donnée envoyée sur Internet.
          </ThemedText>
        </View>
        <GlowButton title="Commencer" size="lg" onPress={() => setStep('notifications')} />
      </Screen>
    );
  }

  if (step === 'notifications') {
    return (
      <Screen>
        <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
          <ThemedText variant="overline" tone="ember">
            Étape 1 sur 2
          </ThemedText>
          <ThemedText variant="title" accessibilityRole="header">
            Les rappels
          </ThemedText>
          <ThemedText tone="muted">
            Au moment de retirer ou de remettre l’anneau, tu reçois une notification. Si tu ne
            confirmes pas, elle revient toutes les heures. Tu peux confirmer directement depuis la
            notification avec « C’est fait ».
          </ThemedText>
        </View>

        {notifGranted === false ? (
          <Card glowing>
            <ThemedText variant="bodyStrong" tone="warning">
              Notifications refusées
            </ThemedText>
            <ThemedText variant="caption" tone="muted">
              Sans elles, aucun rappel ne pourra s’afficher. Tu pourras les activer plus tard dans
              les Réglages.
            </ThemedText>
          </Card>
        ) : null}

        {notifGranted && !exactOk ? (
          <Card glowing>
            <ThemedText variant="bodyStrong">Rappels à l’heure exacte</ThemedText>
            <ThemedText variant="caption" tone="muted">
              Android peut retarder les rappels de quelques minutes. Autorise les « alarmes et
              rappels » pour qu’ils arrivent pile à l’heure.
            </ThemedText>
            <GlowButton
              title="Autoriser"
              variant="secondary"
              size="sm"
              onPress={async () => setExactOk(await requestExactAlarmPermission())}
            />
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {notifGranted === null ? (
            <GlowButton title="Activer les rappels" size="lg" onPress={askNotifications} />
          ) : (
            <GlowButton title="Continuer" size="lg" onPress={() => setStep('cycle')} />
          )}
          {notifGranted === null ? (
            <GlowButton
              title="Plus tard"
              variant="ghost"
              size="sm"
              onPress={() => setStep('cycle')}
              style={{ alignSelf: 'center' }}
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.md, paddingTop: spacing.xl }}>
        <ThemedText variant="overline" tone="ember">
          Étape 2 sur 2
        </ThemedText>
        <ThemedText variant="title" accessibilityRole="header">
          Où en es-tu ?
        </ThemedText>
      </View>

      <Segmented
        options={[
          { value: 'pose', label: 'L’anneau est en place' },
          { value: 'retrait', label: 'L’anneau est retiré' },
        ]}
        value={type}
        onChange={setType}
      />

      <DateTimeField
        label={type === 'pose' ? 'Date et heure de pose' : 'Date et heure du retrait'}
        value={at}
        onChange={setAt}
        maximumDate={now}
      />

      {longAgoDays >= limit ? (
        <ThemedText variant="caption" tone="warning">
          {type === 'pose'
            ? `C’était il y a plus de ${RING_DAYS} jours : l’appli te proposera de le retirer tout de suite.`
            : `C’était il y a plus de ${PAUSE_DAYS} jours : l’appli te proposera de remettre l’anneau tout de suite.`}
        </ThemedText>
      ) : null}

      <ThemedText variant="caption" tone="muted">
        Tu pourras corriger cette date plus tard dans les Réglages.
      </ThemedText>

      <GlowButton
        title="Valider"
        size="lg"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await initialize(type, Math.min(at, Date.now()));
          } finally {
            setSaving(false);
          }
        }}
      />
    </Screen>
  );
}
