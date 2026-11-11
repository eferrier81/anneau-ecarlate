/**
 * Traitement du bouton « C'est fait » d'une notification.
 * Appelé depuis la tâche headless (appli fermée, Android), depuis l'écouteur
 * (appli ouverte) et au lancement (dernière réponse non traitée). Idempotent.
 */
import { confirmationEvent, getCycleState } from '@/core/cycle';
import { matchesPendingAction } from '@/core/notification-plan';
import { insertEvent, listEvents, loadSettings, newId } from '@/data/db';

import { dismissPresented, readActionData, syncNotifications } from './scheduler';

export async function handleDoneAction(content: { data?: unknown } | null | undefined): Promise<boolean> {
  const data = readActionData(content);
  if (!data?.action || data.dueAt === undefined) return false;

  const now = Date.now();
  let events = await listEvents();
  let recorded = false;
  if (matchesPendingAction(events, now, data.action, data.dueAt)) {
    const state = getCycleState(events, now)!;
    await insertEvent(confirmationEvent(state, now, newId()));
    events = await listEvents();
    recorded = true;
  }
  const settings = await loadSettings();
  await syncNotifications(events, settings.repeatCount);
  await dismissPresented();
  return recorded;
}
