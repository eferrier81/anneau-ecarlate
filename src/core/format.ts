/** Formatage des dates en français (module pur). */
import { format, isSameDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

export function formatTime(at: number): string {
  return format(at, "HH'h'mm", { locale: fr });
}

/** « dimanche 16 novembre » */
export function formatDayLong(at: number): string {
  return format(at, 'EEEE d MMMM', { locale: fr });
}

/** « dim. 16 nov. » */
export function formatDayShort(at: number): string {
  return format(at, 'EEE d MMM', { locale: fr });
}

/** « aujourd'hui à 20h00 », « demain à 20h00 », « dimanche 16 novembre à 20h00 » */
export function formatRelativeDateTime(at: number, now: number): string {
  if (isSameDay(at, now)) return `aujourd'hui à ${formatTime(at)}`;
  if (isSameDay(at, addDays(now, 1))) return `demain à ${formatTime(at)}`;
  if (isSameDay(at, addDays(now, -1))) return `hier à ${formatTime(at)}`;
  return `${formatDayLong(at)} à ${formatTime(at)}`;
}

/** « 16/11/2026 20h00 » */
export function formatDateTimeCompact(at: number): string {
  return format(at, "dd/MM/yyyy HH'h'mm", { locale: fr });
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

/** Durée courte : « 3 h 20 », « 45 min ». */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}
