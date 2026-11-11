/**
 * Logique métier du cycle de l'anneau — module PUR (aucune dépendance à React ou Expo).
 *
 * Règles :
 * - 21 jours avec l'anneau, puis 7 jours sans, puis on recommence.
 * - Les échéances sont recalculées depuis le dernier événement RÉEL confirmé :
 *     retrait prévu = dernière pose + 21 jours
 *     pose prévue   = dernier retrait + 7 jours
 * - Les ajouts de jours se font en jours calendaires LOCAUX (date-fns `addDays`) :
 *   une pose le dimanche à 20 h donne un retrait le dimanche à 20 h, même si on
 *   passe à l'heure d'été / d'hiver entre les deux.
 * - Retrait imprévu < 3 h : simple enregistrement.
 *   Retrait imprévu > 3 h : décompte de 7 jours de contraception supplémentaire,
 *   indépendant du cycle principal.
 * - Tout est dérivé des timestamps : l'appli reste juste même fermée des jours.
 */
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
} from 'date-fns';

import type {
  CycleEvent,
  NextAction,
  Phase,
  RingEvent,
  UnplannedRemovalEvent,
} from './types';

export const RING_DAYS = 21;
export const PAUSE_DAYS = 7;
export const EXTRA_CONTRACEPTION_DAYS = 7;

export const HOUR_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export function isCycleEvent(e: RingEvent): e is CycleEvent {
  return e.type === 'pose' || e.type === 'retrait';
}

export function isUnplannedRemoval(e: RingEvent): e is UnplannedRemovalEvent {
  return e.type === 'retrait_imprevu';
}

const byDate = (a: RingEvent, b: RingEvent) => a.at - b.at;

/** Événements de cycle passés (≤ now), triés chronologiquement. */
export function pastCycleEvents(events: readonly RingEvent[], now: number): CycleEvent[] {
  return events.filter(isCycleEvent).filter((e) => e.at <= now).sort(byDate);
}

export function phaseOf(type: CycleEvent['type']): Phase {
  return type === 'pose' ? 'anneau' : 'pause';
}

export function otherPhase(phase: Phase): Phase {
  return phase === 'anneau' ? 'pause' : 'anneau';
}

export function phaseLengthDays(phase: Phase): number {
  return phase === 'anneau' ? RING_DAYS : PAUSE_DAYS;
}

/** Ajoute `days` jours calendaires locaux (préserve l'heure murale malgré l'heure d'été). */
export function addLocalDays(at: number, days: number): number {
  return addDays(at, days).getTime();
}

/** Nombre de jours calendaires entre maintenant et une date (jamais négatif). */
export function calendarDaysUntil(target: number, now: number): number {
  return Math.max(0, differenceInCalendarDays(target, now));
}

// ---------------------------------------------------------------------------
// État courant
// ---------------------------------------------------------------------------

export interface ExtraContraception {
  /** Fin du décompte (ms). Si plusieurs décomptes se chevauchent : la fin la plus tardive. */
  endsAt: number;
  /** Début du décompte en cours (le retrait > 3 h le plus ancien encore actif). */
  startedAt: number;
  daysRemaining: number;
  msRemaining: number;
}

export interface CycleState {
  phase: Phase;
  /** Événement réel qui a démarré la phase actuelle. */
  anchor: CycleEvent;
  nextAction: NextAction;
  /** Date / heure prévue du prochain changement (ms). */
  dueAt: number;
  /** Jours calendaires restants avant `dueAt` (0 = aujourd'hui ou en retard). */
  daysRemaining: number;
  msRemaining: number;
  /** Vrai si l'heure prévue est passée et que l'utilisatrice n'a pas encore confirmé. */
  overdue: boolean;
  /** Jour du cycle (1 à 21 avec l'anneau, 1 à 7 en pause ; peut dépasser en cas de retard). */
  dayOfPhase: number;
  extra: ExtraContraception | null;
}

export function dueDateFor(anchor: CycleEvent): number {
  return addLocalDays(anchor.at, phaseLengthDays(phaseOf(anchor.type)));
}

/** Décompte de contraception supplémentaire actif à `now`, ou null. */
export function getExtraContraception(
  events: readonly RingEvent[],
  now: number,
): ExtraContraception | null {
  const active = events
    .filter(isUnplannedRemoval)
    .filter((e) => e.duree === 'plus3h' && e.at <= now)
    .map((e) => ({ start: e.at, end: addLocalDays(e.at, EXTRA_CONTRACEPTION_DAYS) }))
    .filter((w) => now < w.end);

  if (active.length === 0) return null;

  const endsAt = Math.max(...active.map((w) => w.end));
  const startedAt = Math.min(...active.map((w) => w.start));
  return {
    endsAt,
    startedAt,
    daysRemaining: calendarDaysUntil(endsAt, now),
    msRemaining: endsAt - now,
  };
}

/**
 * Calcule l'état du cycle à l'instant `now`.
 * Retourne null si le cycle n'a jamais été initialisé.
 */
export function getCycleState(events: readonly RingEvent[], now: number): CycleState | null {
  const cycle = pastCycleEvents(events, now);
  const anchor = cycle[cycle.length - 1];
  if (!anchor) return null;

  const phase = phaseOf(anchor.type);
  const dueAt = dueDateFor(anchor);

  return {
    phase,
    anchor,
    nextAction: phase === 'anneau' ? 'retirer' : 'remettre',
    dueAt,
    daysRemaining: calendarDaysUntil(dueAt, now),
    msRemaining: dueAt - now,
    overdue: now >= dueAt,
    dayOfPhase: differenceInCalendarDays(now, anchor.at) + 1,
    extra: getExtraContraception(events, now),
  };
}

/** Événement à enregistrer quand l'utilisatrice confirme l'action attendue. */
export function confirmationEvent(
  state: CycleState,
  at: number,
  id: string,
): CycleEvent {
  return { id, type: state.nextAction === 'retirer' ? 'retrait' : 'pose', at };
}

// ---------------------------------------------------------------------------
// Frise chronologique (passé réel + projection future)
// ---------------------------------------------------------------------------

export interface Segment {
  phase: Phase;
  start: number;
  /** Exclusif. */
  end: number;
  /** Vrai pour les phases futures prévues (pas encore confirmées). */
  projected: boolean;
}

/**
 * Construit la suite des phases, du premier événement jusqu'à `horizon`.
 * - Phases passées : délimitées par les événements réels.
 * - Phase actuelle : se prolonge jusqu'à max(échéance, maintenant) si non confirmée.
 * - Ensuite : projection 21 j / 7 j depuis cette date.
 */
export function buildTimeline(
  events: readonly RingEvent[],
  now: number,
  horizon: number,
): Segment[] {
  const cycle = pastCycleEvents(events, now);
  if (cycle.length === 0) return [];

  const segments: Segment[] = [];
  for (let i = 0; i < cycle.length - 1; i++) {
    segments.push({
      phase: phaseOf(cycle[i].type),
      start: cycle[i].at,
      end: cycle[i + 1].at,
      projected: false,
    });
  }

  const last = cycle[cycle.length - 1];
  const currentPhase = phaseOf(last.type);
  const currentEnd = Math.max(dueDateFor(last), now);
  segments.push({ phase: currentPhase, start: last.at, end: currentEnd, projected: false });

  let t = currentEnd;
  let phase = otherPhase(currentPhase);
  // garde-fou : jamais plus de 200 phases projetées
  for (let i = 0; t < horizon && i < 200; i++) {
    const next = addLocalDays(t, phaseLengthDays(phase));
    segments.push({ phase, start: t, end: next, projected: true });
    t = next;
    phase = otherPhase(phase);
  }
  return segments;
}

function segmentAt(segments: readonly Segment[], t: number): Segment | null {
  for (const s of segments) {
    if (t >= s.start && t < s.end) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Jours du calendrier
// ---------------------------------------------------------------------------

export interface DayTransition {
  type: CycleEvent['type'];
  at: number;
  projected: boolean;
}

export interface DayInfo {
  /** Clé 'yyyy-MM-dd' en heure locale. */
  key: string;
  /**
   * Phase « du jour » = phase en vigueur à la FIN de la journée.
   * Le jour de pose compte donc comme jour avec anneau et le jour de retrait comme
   * jour de pause : on obtient exactement 21 jours colorés « anneau » et 7 « pause ».
   * null si avant le tout premier événement.
   */
  phase: Phase | null;
  projected: boolean;
  /** Changements de phase ce jour-là (réels ou prévus). */
  transitions: DayTransition[];
  /** Retraits imprévus enregistrés ce jour-là. */
  removals: UnplannedRemovalEvent[];
  /** Jour couvert par un décompte de contraception supplémentaire. */
  extra: boolean;
  isToday: boolean;
}

export function dayKey(t: number | Date): string {
  return format(t, 'yyyy-MM-dd');
}

/**
 * Calcule les infos de chaque jour entre `from` et `to` (inclus), en heure locale.
 */
export function projectDays(
  events: readonly RingEvent[],
  from: number,
  to: number,
  now: number,
): Record<string, DayInfo> {
  const horizon = endOfDay(to).getTime() + 1;
  const timeline = buildTimeline(events, now, horizon);
  const removals = events.filter(isUnplannedRemoval).sort(byDate);
  const extraWindows = removals
    .filter((e) => e.duree === 'plus3h')
    .map((e) => ({ start: e.at, end: addLocalDays(e.at, EXTRA_CONTRACEPTION_DAYS) }));

  // Changements de phase : réels (événements) + prévus (débuts de segments projetés).
  const transitions: DayTransition[] = [
    ...pastCycleEvents(events, now).map((e) => ({ type: e.type, at: e.at, projected: false })),
    ...timeline
      .filter((s) => s.projected)
      .map((s) => ({
        type: (s.phase === 'anneau' ? 'pose' : 'retrait') as CycleEvent['type'],
        at: s.start,
        projected: true,
      })),
  ];

  const result: Record<string, DayInfo> = {};
  for (const day of eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) })) {
    const dayEnd = endOfDay(day).getTime();
    const seg = segmentAt(timeline, dayEnd);
    const key = dayKey(day);
    result[key] = {
      key,
      phase: seg?.phase ?? null,
      projected: seg?.projected ?? false,
      transitions: transitions.filter((tr) => isSameDay(tr.at, day)),
      removals: removals.filter((r) => isSameDay(r.at, day)),
      extra: extraWindows.some((w) => dayEnd >= w.start && dayEnd < w.end),
      isToday: isSameDay(day, now),
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Corrections (réglages)
// ---------------------------------------------------------------------------

export type EditError = 'futur' | 'avant_precedent' | 'apres_suivant' | 'introuvable';

/**
 * Vérifie qu'un événement de cycle peut être déplacé à `newAt` sans casser
 * l'ordre chronologique (pose → retrait → pose…).
 */
export function validateCycleEventTime(
  events: readonly RingEvent[],
  id: string,
  newAt: number,
  now: number,
): EditError | null {
  if (newAt > now) return 'futur';
  const cycle = events.filter(isCycleEvent).sort(byDate);
  const idx = cycle.findIndex((e) => e.id === id);
  if (idx === -1) return 'introuvable';
  const prev = cycle[idx - 1];
  const next = cycle[idx + 1];
  if (prev && newAt <= prev.at) return 'avant_precedent';
  if (next && newAt >= next.at) return 'apres_suivant';
  return null;
}
