import { useState } from 'react';
import { Alert, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { GlowButton } from '@/components/glow-button';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { validateCycleEventTime, type EditError } from '@/core/cycle';
import type { RemovalDuration, RingEvent } from '@/core/types';
import { useAppStore } from '@/state/app-store';
import { spacing } from '@/theme';

export function eventLabel(e: RingEvent): string {
  if (e.type === 'retrait_imprevu') {
    return e.duree === 'moins3h' ? 'Retrait imprévu (< 3 h)' : 'Retrait imprévu (> 3 h)';
  }
  return e.type === 'pose' ? 'Anneau posé' : 'Anneau retiré';
}

const ERRORS: Record<EditError, string> = {
  futur: 'La date ne peut pas être dans le futur.',
  avant_precedent: 'La date doit rester après l’événement précédent (pose / retrait).',
  apres_suivant: 'La date doit rester avant l’événement suivant (pose / retrait).',
  introuvable: 'Événement introuvable.',
};

export function EventEditSheet({ event, onClose }: { event: RingEvent | null; onClose: () => void }) {
  return (
    <Sheet
      visible={!!event}
      onClose={onClose}
      title={event ? `Corriger : ${eventLabel(event)}` : ''}>
      {event ? <EventEditForm key={event.id} event={event} onDone={onClose} /> : null}
    </Sheet>
  );
}

function EventEditForm({ event, onDone }: { event: RingEvent; onDone: () => void }) {
  const { events, now, updateEvent, deleteEvent } = useAppStore();
  const [at, setAt] = useState(event.at);
  const [duree, setDuree] = useState<RemovalDuration>(
    event.type === 'retrait_imprevu' ? event.duree : 'moins3h',
  );
  const maxDate = Math.max(now, event.at);

  const error =
    event.type === 'retrait_imprevu'
      ? at > maxDate
        ? ERRORS.futur
        : null
      : (() => {
          const e = validateCycleEventTime(events, event.id, at, maxDate);
          return e ? ERRORS[e] : null;
        })();

  const save = async () => {
    if (error) return;
    if (event.type === 'retrait_imprevu') await updateEvent({ ...event, at, duree });
    else await updateEvent({ ...event, at });
    onDone();
  };

  const remove = () => {
    Alert.alert(
      'Supprimer cet événement ?',
      `${eventLabel(event)} — cette suppression est définitive. Le cycle sera recalculé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(event.id);
            onDone();
          },
        },
      ],
    );
  };

  return (
    <>
      <DateTimeField label="Date et heure" value={at} onChange={setAt} maximumDate={maxDate} />
      {event.type === 'retrait_imprevu' ? (
        <Segmented
          options={[
            { value: 'moins3h', label: 'Moins de 3 h' },
            { value: 'plus3h', label: 'Plus de 3 h' },
          ]}
          value={duree}
          onChange={setDuree}
        />
      ) : null}
      {error ? (
        <ThemedText variant="caption" tone="ember">
          {error}
        </ThemedText>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        <GlowButton title="Enregistrer" onPress={save} disabled={!!error} />
        <GlowButton title="Supprimer" variant="ghost" size="sm" onPress={remove} style={{ alignSelf: 'center' }} />
      </View>
    </>
  );
}
