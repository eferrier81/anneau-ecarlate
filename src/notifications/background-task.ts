/**
 * Tâche exécutée par le système quand l'utilisatrice touche « C'est fait »
 * alors que l'appli est en arrière-plan ou fermée (Android).
 * Doit être définie au niveau module, dans un fichier chargé très tôt (index.ts).
 */
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { handleDoneAction } from './quick-action';
import { ACTION_DONE } from './scheduler';

export const NOTIFICATION_TASK = 'anneau-notification-action';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(
  NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error || !data || !('actionIdentifier' in data)) return;
    if (data.actionIdentifier !== ACTION_DONE) return;
    try {
      await handleDoneAction(data.notification?.request?.content);
    } catch {
      // Filet de sécurité : la réponse sera retraitée au prochain lancement.
    }
  },
);

Notifications.registerTaskAsync(NOTIFICATION_TASK).catch(() => {
  // Indisponible dans certains environnements (ex. Expo Go) : l'appli reste fonctionnelle.
});
