/**
 * Plan des notifications locales — module PUR.
 *
 * On ne compte pas sur des tâches en arrière-plan : on programme à l'avance une série
 * de rappels horaires à partir de l'échéance, et on annule / reprogramme tout à chaque
 * ouverture de l'appli et à chaque changement d'état.
 */
import { getCycleState, HOUR_MS } from './cycle';
import { formatTime } from './format';
import type { NextAction, RingEvent } from './types';

/** Limite iOS : 64 notifications programmées. On garde une marge. */
export const MAX_SCHEDULED = 60;
export const DEFAULT_REPEAT_COUNT = 48;

export type PlannedKind = 'action' | 'extra_fin';

export interface PlannedNotification {
  /** Identifiant stable (permet d'annuler / reprogrammer sans doublon). */
  id: string;
  at: number;
  kind: PlannedKind;
  action?: NextAction;
  /** Échéance de l'action concernée (pour vérifier qu'une confirmation porte sur la bonne). */
  dueAt?: number;
  /** 0 pour la notif principale, 1..n pour les rappels. */
  index: number;
  title: string;
  body: string;
}

export interface PlanOptions {
  repeatCount?: number;
}

export function actionLabel(action: NextAction): string {
  return action === 'retirer' ? 'retirer' : 'remettre';
}

/**
 * Premier créneau de rappel strictement futur, aligné sur la grille horaire de l'échéance.
 * (Si l'échéance est passée de 2 h 20, le prochain rappel est à échéance + 3 h.)
 */
export function firstReminderSlot(dueAt: number, now: number): number {
  if (dueAt > now) return dueAt;
  const elapsedHours = Math.floor((now - dueAt) / HOUR_MS) + 1;
  return dueAt + elapsedHours * HOUR_MS;
}

export function buildNotificationPlan(
  events: readonly RingEvent[],
  now: number,
  options: PlanOptions = {},
): PlannedNotification[] {
  const state = getCycleState(events, now);
  if (!state) return [];

  const plan: PlannedNotification[] = [];

  // Fin du décompte de contraception supplémentaire (prioritaire : 1 seule notif).
  if (state.extra) {
    plan.push({
      id: `extra-fin-${state.extra.endsAt}`,
      at: state.extra.endsAt,
      kind: 'extra_fin',
      index: 0,
      title: 'Contraception supplémentaire terminée',
      body: 'Les 7 jours sont passés, la protection de l’anneau suffit à nouveau.',
    });
  }

  const repeatCount = Math.min(
    options.repeatCount ?? DEFAULT_REPEAT_COUNT,
    MAX_SCHEDULED - plan.length,
  );
  const action = state.nextAction;
  const verb = actionLabel(action);
  const first = firstReminderSlot(state.dueAt, now);
  const firstIndex = Math.round((first - state.dueAt) / HOUR_MS);

  for (let i = 0; i < repeatCount; i++) {
    // Heures « réelles » (ms) : un rappel toutes les 60 minutes, même lors d'un changement d'heure.
    const at = first + i * HOUR_MS;
    const index = firstIndex + i;
    plan.push({
      id: `action-${action}-${state.dueAt}-${index}`,
      at,
      kind: 'action',
      action,
      dueAt: state.dueAt,
      index,
      title: index === 0 ? `C'est le moment de ${verb} ton anneau` : `Rappel : ${verb} ton anneau`,
      body:
        index === 0
          ? `Touche « C'est fait » une fois que c'est fait.`
          : `Prévu à ${formatTime(state.dueAt)}, pas encore confirmé. Touche « C'est fait » une fois que c'est fait.`,
    });
  }

  return plan.sort((a, b) => a.at - b.at);
}

/**
 * Vrai si une confirmation venant d'une notification (« C'est fait ») porte bien sur
 * l'action actuellement attendue. Rend l'action rapide idempotente : un second appui,
 * ou une vieille notification d'un cycle précédent, n'enregistre rien.
 */
export function matchesPendingAction(
  events: readonly RingEvent[],
  now: number,
  action: NextAction,
  dueAt: number,
): boolean {
  const state = getCycleState(events, now);
  return !!state && state.nextAction === action && state.dueAt === dueAt;
}
