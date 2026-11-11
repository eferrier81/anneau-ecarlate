import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import type { RemovalDuration } from '@/core/types';
import { useAppStore } from '@/state/app-store';
import { radius, spacing, useTheme } from '@/theme';

function Option({
  title,
  description,
  dotColor,
  onPress,
}: {
  title: string;
  description: string;
  dotColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: pressed ? colors.ember : colors.border,
        backgroundColor: colors.surfaceRaised,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: dotColor,
          boxShadow: `0 0 10px 1px ${dotColor}`,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="bodyStrong">{title}</ThemedText>
        <ThemedText variant="caption" tone="muted">
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function RemovalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="J'ai dû retirer l'anneau">
      {visible ? <RemovalForm onDone={onClose} /> : null}
    </Sheet>
  );
}

/** Monté à chaque ouverture : l'heure par défaut est « maintenant ». */
function RemovalForm({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const { addUnplannedRemoval, state, now } = useAppStore();
  const [at, setAt] = useState(() => Date.now());

  const save = async (duree: RemovalDuration) => {
    await addUnplannedRemoval(duree, at);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onDone();
    if (duree === 'plus3h') {
      Alert.alert(
        'Retrait de plus de 3 h enregistré',
        'Remets l’anneau dès que possible et utilise une contraception supplémentaire (préservatif) pendant 7 jours. Le décompte s’affiche sur l’accueil.',
      );
    } else {
      Alert.alert('Retrait enregistré', 'Remets l’anneau dès que possible. Le cycle continue normalement.');
    }
  };

  return (
    <>
      <DateTimeField
        label="Moment du retrait"
        value={at}
        onChange={setAt}
        maximumDate={Math.max(now, at)}
        minimumDate={state?.anchor.at}
      />
      <ThemedText variant="caption" tone="muted">
        Combien de temps est-il resté retiré ?
      </ThemedText>
      <Option
        title="Moins de 3 h"
        description="Simple enregistrement, le cycle continue."
        dotColor={colors.dotShort}
        onPress={() => save('moins3h')}
      />
      <Option
        title="Plus de 3 h"
        description="Contraception supplémentaire pendant 7 jours."
        dotColor={colors.dotLong}
        onPress={() => save('plus3h')}
      />
    </>
  );
}
