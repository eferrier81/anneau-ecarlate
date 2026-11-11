/**
 * État global de l'appli : événements + réglages chargés depuis SQLite.
 * Chaque modification : écriture en base → rechargement → reprogrammation des notifications.
 */
import * as Notifications from 'expo-notifications';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { confirmationEvent, getCycleState, type CycleState } from '@/core/cycle';
import type { CycleEventType, RemovalDuration, RingEvent } from '@/core/types';
import {
  DEFAULT_SETTINGS,
  deleteAllData,
  deleteEvent as dbDeleteEvent,
  insertEvent,
  listEvents,
  loadSettings,
  newId,
  saveSetting,
  updateEvent as dbUpdateEvent,
  type Settings,
} from '@/data/db';
import { handleDoneAction } from '@/notifications/quick-action';
import { ACTION_DONE, dismissPresented, syncNotifications } from '@/notifications/scheduler';

interface AppStore {
  ready: boolean;
  events: RingEvent[];
  settings: Settings;
  /** Horloge partagée (rafraîchie toutes les 30 s et au retour dans l'appli). */
  now: number;
  state: CycleState | null;
  initialize: (type: CycleEventType, at: number) => Promise<void>;
  confirmAction: (at?: number) => Promise<void>;
  addUnplannedRemoval: (duree: RemovalDuration, at: number) => Promise<void>;
  updateEvent: (event: RingEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  resetAll: () => Promise<void>;
  resync: () => Promise<void>;
}

const StoreContext = createContext<AppStore | null>(null);

const TICK_MS = 30_000;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<RingEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(() => Date.now());

  /** Recharge depuis la base et reprogramme les notifications. */
  const reload = useCallback(async () => {
    const [evts, sets] = await Promise.all([listEvents(), loadSettings()]);
    setEvents(evts);
    setSettings(sets);
    setNow(Date.now());
    syncNotifications(evts, sets.repeatCount).catch(() => undefined);
    return evts;
  }, []);

  // Démarrage : traite d'abord une éventuelle action « C'est fait » non traitée.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last?.actionIdentifier === ACTION_DONE) {
          await handleDoneAction(last.notification.request.content);
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch {
        // pas de réponse en attente
      }
      await reload();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Action rapide pendant que l'appli est ouverte.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if (response.actionIdentifier !== ACTION_DONE) return;
      await handleDoneAction(response.notification.request.content);
      await reload();
    });
    return () => sub.remove();
  }, [reload]);

  // Retour au premier plan : la tâche headless a pu écrire en base → on recharge.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload().catch(() => undefined);
    });
    return () => sub.remove();
  }, [reload]);

  // Horloge.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const state = useMemo(() => getCycleState(events, now), [events, now]);

  const initialize = useCallback(
    async (type: CycleEventType, at: number) => {
      await insertEvent({ id: newId(), type, at });
      await reload();
    },
    [reload],
  );

  const confirmAction = useCallback(
    async (at = Date.now()) => {
      const current = getCycleState(await listEvents(), at);
      if (!current) return;
      await insertEvent(confirmationEvent(current, at, newId()));
      await dismissPresented();
      await reload();
    },
    [reload],
  );

  const addUnplannedRemoval = useCallback(
    async (duree: RemovalDuration, at: number) => {
      await insertEvent({ id: newId(), type: 'retrait_imprevu', at, duree });
      await reload();
    },
    [reload],
  );

  const updateEvent = useCallback(
    async (event: RingEvent) => {
      await dbUpdateEvent(event);
      await reload();
    },
    [reload],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      await dbDeleteEvent(id);
      await reload();
    },
    [reload],
  );

  const setSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
      await saveSetting(key, value);
      await reload();
    },
    [reload],
  );

  const resetAll = useCallback(async () => {
    await deleteAllData();
    await dismissPresented();
    await reload();
  }, [reload]);

  const resync = useCallback(async () => {
    await reload();
  }, [reload]);

  const value = useMemo<AppStore>(
    () => ({
      ready,
      events,
      settings,
      now,
      state,
      initialize,
      confirmAction,
      addUnplannedRemoval,
      updateEvent,
      deleteEvent,
      setSetting,
      resetAll,
      resync,
    }),
    [
      ready,
      events,
      settings,
      now,
      state,
      initialize,
      confirmAction,
      addUnplannedRemoval,
      updateEvent,
      deleteEvent,
      setSetting,
      resetAll,
      resync,
    ],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useAppStore(): AppStore {
  const ctx = use(StoreContext);
  if (!ctx) throw new Error('useAppStore doit être utilisé dans <AppStoreProvider>');
  return ctx;
}
