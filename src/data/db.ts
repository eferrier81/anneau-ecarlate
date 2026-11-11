/**
 * Base SQLite locale (aucune donnée ne quitte le téléphone).
 * Utilisable aussi depuis la tâche en arrière-plan des notifications.
 */
import * as SQLite from 'expo-sqlite';

import type { RemovalDuration, RingEvent } from '@/core/types';

const DB_NAME = 'anneau.db';
const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('pose', 'retrait', 'retrait_imprevu')),
        at INTEGER NOT NULL,
        duree TEXT CHECK (duree IS NULL OR duree IN ('moins3h', 'plus3h')),
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_events_at ON events (at);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

interface EventRow {
  id: string;
  type: RingEvent['type'];
  at: number;
  duree: RemovalDuration | null;
}

function rowToEvent(r: EventRow): RingEvent {
  if (r.type === 'retrait_imprevu') {
    return { id: r.id, type: r.type, at: r.at, duree: r.duree ?? 'moins3h' };
  }
  return { id: r.id, type: r.type, at: r.at };
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listEvents(): Promise<RingEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>('SELECT id, type, at, duree FROM events ORDER BY at');
  return rows.map(rowToEvent);
}

export async function insertEvent(e: RingEvent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO events (id, type, at, duree, created_at) VALUES (?, ?, ?, ?, ?)',
    e.id,
    e.type,
    e.at,
    e.type === 'retrait_imprevu' ? e.duree : null,
    Date.now(),
  );
}

export async function updateEvent(e: RingEvent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE events SET at = ?, duree = ? WHERE id = ?',
    e.at,
    e.type === 'retrait_imprevu' ? e.duree : null,
    e.id,
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM events; DELETE FROM settings;');
}

// --- Réglages -------------------------------------------------------------

export interface Settings {
  theme: 'sombre' | 'clair' | 'systeme';
  /** Nombre de rappels horaires programmés à l'avance (24 ou 48). */
  repeatCount: number;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'sombre', repeatCount: 48 };

export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (key === 'theme' && (value === 'sombre' || value === 'clair' || value === 'systeme')) {
      out.theme = value;
    }
    if (key === 'repeatCount') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 1 && n <= 59) out.repeatCount = n;
    }
  }
  return out;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value),
  );
}
