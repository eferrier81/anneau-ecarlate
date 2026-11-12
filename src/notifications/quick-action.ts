/**
 * Traitement du bouton « C'est fait » d'une notification.
 * Appelé depuis la tâche headless (appli fermée, Android), depuis l'écouteur
 * (appli ouverte) et au lancement (dernière réponse non traitée). Idempotent.
 */
import { confirmationEvent, getCycleState } from '@/core/cycle';
import { readActionData, shouldConfirmFromNotification } from '@/core/notification-payload';
import { insertEvent, listEvents, loadSettings, newId } from '@/data/db';

import { dismissPresented, syncNotifications } from './scheduler';

// Un seul traitement à la fois (écouteur + tâche dans le même runtime JS).
let queue: Promise<unknown> = Promise.resolve();

export function handleDoneAction(content: unknown): Promise<boolean> {
  const run = () => processDoneAction(content);
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

async function processDoneAction(content: unknown): Promise<boolean> {
  const now = Date.now();
  let events = await listEvents();
  let recorded = false;

  if (shouldConfirmFromNotification(events, now, readActionData(content))) {
    const state = getCycleState(events, now);
    if (state) {
      await insertEvent(confirmationEvent(state, now, newId()));
      events = await listEvents();
      recorded = true;
    }
  }

  // Dans tous les cas : on retire les notifs affichées et on remet le plan à jour.
  await dismissPresented();
  const settings = await loadSettings();
  await syncNotifications(events, settings.repeatCount);
  return recorded;
}
