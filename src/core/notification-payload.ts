/**
 * Lecture des données d'une notification « C'est fait » — module PUR.
 *
 * Selon le chemin, Android ne livre pas les données sous la même forme :
 * - appli ouverte (écouteur JS)       : content.data = { kind, action, dueAt }
 * - appli fermée (tâche headless)     : content.dataString = '{"kind":"action",…}'
 *   (le natif sérialise le corps des notifications locales en texte JSON)
 * - anciens formats / push            : content.data.dataString = '…'
 */
import { getCycleState } from './cycle';
import { matchesPendingAction } from './notification-plan';
import type { NextAction, RingEvent } from './types';

export interface ActionNotificationData {
  kind: 'action' | 'extra_fin';
  action?: NextAction;
  dueAt?: number;
  [key: string]: unknown;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Extrait { action, dueAt } d'un contenu de notification, quelle que soit sa forme. */
export function readActionData(content: unknown): { action: NextAction; dueAt: number } | null {
  if (!content || typeof content !== 'object') return null;
  const c = content as Record<string, unknown>;

  let raw: unknown = null;
  if (typeof c.dataString === 'string') {
    raw = parseJson(c.dataString);
  } else if (c.data && typeof c.data === 'object') {
    const d = c.data as Record<string, unknown>;
    raw = typeof d.dataString === 'string' ? parseJson(d.dataString) : d;
  } else if (typeof c.data === 'string') {
    raw = parseJson(c.data);
  }

  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.kind !== 'action') return null;
  const action = d.action === 'retirer' || d.action === 'remettre' ? d.action : null;
  const dueAt = typeof d.dueAt === 'number' ? d.dueAt : Number(d.dueAt);
  if (!action || !Number.isFinite(dueAt)) return null;
  return { action, dueAt };
}

/**
 * Faut-il enregistrer l'action après un appui sur « C'est fait » ?
 * - Données lisibles : seulement si elles correspondent à l'action attendue (idempotent).
 * - Données illisibles (filet de sécurité) : seulement si l'action attendue est déjà due
 *   (les rappels ne sont programmés qu'à partir de l'échéance).
 */
export function shouldConfirmFromNotification(
  events: readonly RingEvent[],
  now: number,
  data: { action: NextAction; dueAt: number } | null,
): boolean {
  if (data) return matchesPendingAction(events, now, data.action, data.dueAt);
  return getCycleState(events, now)?.overdue ?? false;
}
