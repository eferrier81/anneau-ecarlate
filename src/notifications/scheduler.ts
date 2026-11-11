/**
 * Applique le plan de notifications (src/core/notification-plan.ts) via expo-notifications.
 *
 * Stratégie : pas de tâche de fond pour « répéter ». On programme à l'avance une série
 * de notifications horaires datées, on annule tout et on reprogramme à chaque ouverture
 * de l'appli et à chaque changement d'état. Idempotent.
 */
// Les enums d'expo-notifications sont ré-exportés via `export *` : faux positif d'import/namespace.
/* eslint-disable import/namespace */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { buildNotificationPlan } from '@/core/notification-plan';
import type { NextAction, RingEvent } from '@/core/types';
import { palettes } from '@/theme/colors';

export const CHANNEL_ID = 'rappels-anneau';
export const CATEGORY_ID = 'confirmer-anneau';
export const ACTION_DONE = 'cest-fait';

/** Données attachées à chaque notification d'action. */
export interface ActionNotificationData {
  kind: 'action' | 'extra_fin';
  action?: NextAction;
  dueAt?: number;
  [key: string]: unknown;
}

let setupDone = false;

/** Canal Android + catégorie avec le bouton « C'est fait ». À appeler au démarrage. */
export async function setupNotifications(): Promise<void> {
  if (setupDone) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels anneau',
      description: 'Rappels pour retirer ou remettre l’anneau, répétés toutes les heures.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: palettes.dark.ember,
      // Données de santé : contenu masqué sur l'écran verrouillé sécurisé.
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      enableVibrate: true,
      showBadge: true,
    });
  }
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: ACTION_DONE,
        buttonTitle: "C'est fait",
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // Si la plateforme refuse les actions (ex. certains environnements Expo Go),
    // les rappels restent programmés, simplement sans bouton « C'est fait ».
  }
  setupDone = true;
}

/** Affichage des notifications quand l'appli est ouverte. */
export function installForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermission(): Promise<boolean> {
  await setupNotifications(); // Android 13 : le canal doit exister avant la demande
  if (await hasNotificationPermission()) return true;
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return p.granted;
}

/** Alarmes exactes (Android 12+). Sans elles, les rappels peuvent arriver en retard. */
export async function hasExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const p = await Notifications.getExactAlarmPermissionsAsync();
    return p.granted;
  } catch {
    return true;
  }
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const p = await Notifications.requestExactAlarmPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

// Sérialise les reprogrammations (ouverture de l'appli + action rapide simultanées…).
let queue: Promise<unknown> = Promise.resolve();

export function syncNotifications(
  events: readonly RingEvent[],
  repeatCount: number,
): Promise<number> {
  const run = async () => {
    await setupNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await hasNotificationPermission())) return 0;

    const plan = buildNotificationPlan(events, Date.now(), { repeatCount });
    for (const n of plan) {
      const data: ActionNotificationData =
        n.kind === 'action'
          ? { kind: 'action', action: n.action, dueAt: n.dueAt }
          : { kind: 'extra_fin' };
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data,
          categoryIdentifier: n.kind === 'action' ? CATEGORY_ID : undefined,
          color: palettes.dark.ember,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.at,
          channelId: CHANNEL_ID,
        },
      });
    }
    return plan.length;
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** Retire les rappels déjà affichés (après confirmation). */
export async function dismissPresented(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // sans importance
  }
}

/** Extrait les données d'une notification, y compris depuis une tâche headless Android. */
export function readActionData(
  content: { data?: unknown } | undefined | null,
): ActionNotificationData | null {
  let raw: unknown = content?.data;
  if (raw && typeof raw === 'object' && 'dataString' in raw) {
    try {
      raw = JSON.parse(String((raw as { dataString: unknown }).dataString));
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.kind !== 'action') return null;
  const action = d.action === 'retirer' || d.action === 'remettre' ? d.action : undefined;
  const dueAt = typeof d.dueAt === 'number' ? d.dueAt : Number(d.dueAt);
  if (!action || !Number.isFinite(dueAt)) return null;
  return { kind: 'action', action, dueAt };
}
