import { HOUR_MS } from './cycle';
import {
  buildNotificationPlan,
  firstReminderSlot,
  matchesPendingAction,
  MAX_SCHEDULED,
} from './notification-plan';
import type { RingEvent } from './types';

const d = (y: number, m: number, day: number, h = 0, min = 0) =>
  new Date(y, m - 1, day, h, min).getTime();

const pose = (at: number): RingEvent => ({ id: `p${at}`, type: 'pose', at });
const retrait = (at: number): RingEvent => ({ id: `r${at}`, type: 'retrait', at });

describe('plan de notifications', () => {
  const p = d(2026, 11, 1, 20);
  const due = d(2026, 11, 22, 20);

  test('aucune notif tant que le cycle n’est pas initialisé', () => {
    expect(buildNotificationPlan([], d(2026, 11, 1))).toEqual([]);
  });

  test('48 rappels horaires à partir de l’échéance', () => {
    const plan = buildNotificationPlan([pose(p)], d(2026, 11, 10));
    expect(plan).toHaveLength(48);
    expect(plan[0].at).toBe(due);
    expect(plan[0].index).toBe(0);
    expect(plan[0].action).toBe('retirer');
    expect(plan[0].title).toBe("C'est le moment de retirer ton anneau");
    expect(plan[1].at - plan[0].at).toBe(HOUR_MS);
    expect(plan[47].at).toBe(due + 47 * HOUR_MS);
    expect(new Set(plan.map((n) => n.id)).size).toBe(48);
  });

  test('en pause : rappels pour remettre l’anneau', () => {
    const plan = buildNotificationPlan([pose(p), retrait(due)], d(2026, 11, 23));
    expect(plan[0].action).toBe('remettre');
    expect(plan[0].at).toBe(d(2026, 11, 29, 20));
    expect(plan[0].title).toContain('remettre');
  });

  test('en retard : les rappels repartent du prochain créneau horaire, sans fin tant que l’appli est rouverte', () => {
    const now = due + 2 * HOUR_MS + 20 * 60 * 1000; // 2 h 20 de retard
    const plan = buildNotificationPlan([pose(p)], now);
    expect(plan[0].at).toBe(due + 3 * HOUR_MS);
    expect(plan[0].index).toBe(3);
    expect(plan[0].title).toContain('Rappel');
    expect(plan.every((n) => n.at > now)).toBe(true);
    expect(plan).toHaveLength(48);
  });

  test('firstReminderSlot pile sur un créneau → créneau suivant (strictement futur)', () => {
    expect(firstReminderSlot(1000, 1000)).toBe(1000 + HOUR_MS);
    expect(firstReminderSlot(5000, 1000)).toBe(5000);
  });

  test('ajoute la notif de fin de contraception supplémentaire', () => {
    const events: RingEvent[] = [
      pose(p),
      { id: 'x', type: 'retrait_imprevu', at: d(2026, 11, 10, 9), duree: 'plus3h' },
    ];
    const plan = buildNotificationPlan(events, d(2026, 11, 11));
    const fin = plan.filter((n) => n.kind === 'extra_fin');
    expect(fin).toHaveLength(1);
    expect(fin[0].at).toBe(d(2026, 11, 17, 9));
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
  });

  test('ne dépasse jamais la limite iOS de 64', () => {
    const plan = buildNotificationPlan([pose(p)], d(2026, 11, 10), { repeatCount: 500 });
    expect(plan.length).toBeLessThanOrEqual(64);
  });

  test("rappels horaires réguliers même pendant le changement d'heure", () => {
    // retrait prévu le samedi 24 oct. 2026 à 20h ; passage à l'heure d'hiver la nuit suivante
    const plan = buildNotificationPlan([pose(d(2026, 10, 3, 20))], d(2026, 10, 20));
    expect(plan[0].at).toBe(d(2026, 10, 24, 20));
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].at - plan[i - 1].at).toBe(HOUR_MS);
    }
  });
});

describe('action rapide « C’est fait »', () => {
  const p = d(2026, 11, 1, 20);
  const due = d(2026, 11, 22, 20);

  test('confirme l’action attendue', () => {
    expect(matchesPendingAction([pose(p)], due + HOUR_MS, 'retirer', due)).toBe(true);
  });
  test('second appui (déjà confirmé) : ignoré', () => {
    expect(matchesPendingAction([pose(p), retrait(due + HOUR_MS)], due + 2 * HOUR_MS, 'retirer', due)).toBe(false);
  });
  test('notification d’un ancien cycle : ignorée', () => {
    const events = [pose(p), retrait(due), pose(d(2026, 11, 29, 20))];
    expect(matchesPendingAction(events, d(2026, 12, 1), 'retirer', due)).toBe(false);
  });
});
