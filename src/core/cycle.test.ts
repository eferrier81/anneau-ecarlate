import {
  buildTimeline,
  confirmationEvent,
  getCycleState,
  getExtraContraception,
  HOUR_MS,
  projectDays,
  validateCycleEventTime,
} from './cycle';
import type { RingEvent } from './types';

/** Date locale (fuseau Europe/Paris forcé par jest.global-setup.js). */
const d = (y: number, m: number, day: number, h = 0, min = 0) =>
  new Date(y, m - 1, day, h, min).getTime();

const DAY = 24 * HOUR_MS;

const pose = (at: number, id = `p${at}`): RingEvent => ({ id, type: 'pose', at });
const retrait = (at: number, id = `r${at}`): RingEvent => ({ id, type: 'retrait', at });
const imprevu = (at: number, duree: 'moins3h' | 'plus3h', id = `i${at}`): RingEvent => ({
  id,
  type: 'retrait_imprevu',
  at,
  duree,
});

test('le fuseau de test est bien Europe/Paris', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Paris');
});

describe('état initial', () => {
  test('aucun événement → null', () => {
    expect(getCycleState([], d(2026, 11, 1))).toBeNull();
  });

  test('les événements futurs sont ignorés', () => {
    expect(getCycleState([pose(d(2026, 11, 20))], d(2026, 11, 1))).toBeNull();
  });
});

describe('changement de phase', () => {
  const p = d(2026, 11, 1, 20, 0); // dimanche 1er nov. 20h00

  test('après une pose : anneau en place, retrait prévu 21 jours plus tard à la même heure', () => {
    const now = d(2026, 11, 5, 9, 0);
    const s = getCycleState([pose(p)], now)!;
    expect(s.phase).toBe('anneau');
    expect(s.nextAction).toBe('retirer');
    expect(s.dueAt).toBe(d(2026, 11, 22, 20, 0));
    expect(s.daysRemaining).toBe(17);
    expect(s.overdue).toBe(false);
    expect(s.dayOfPhase).toBe(5);
  });

  test("le jour J : 0 jour restant, pas encore en retard avant l'heure", () => {
    const s = getCycleState([pose(p)], d(2026, 11, 22, 19, 59))!;
    expect(s.daysRemaining).toBe(0);
    expect(s.overdue).toBe(false);
  });

  test("à l'heure prévue sans confirmation : toujours « anneau », mais en retard", () => {
    const s = getCycleState([pose(p)], d(2026, 11, 22, 20, 0))!;
    expect(s.phase).toBe('anneau');
    expect(s.overdue).toBe(true);
    expect(s.daysRemaining).toBe(0);
  });

  test('après confirmation du retrait : pause, pose prévue 7 jours plus tard', () => {
    const r = d(2026, 11, 22, 20, 5);
    const s = getCycleState([pose(p), retrait(r)], d(2026, 11, 23, 8, 0))!;
    expect(s.phase).toBe('pause');
    expect(s.nextAction).toBe('remettre');
    expect(s.dueAt).toBe(d(2026, 11, 29, 20, 5));
    expect(s.daysRemaining).toBe(6);
  });

  test('un retrait confirmé en retard décale la pose (pause de 7 jours exactement)', () => {
    const r = d(2026, 11, 23, 9, 30); // 13 h 30 de retard
    const s = getCycleState([pose(p), retrait(r)], d(2026, 11, 24))!;
    expect(s.dueAt).toBe(d(2026, 11, 30, 9, 30));
  });

  test('confirmationEvent produit le bon type selon la phase', () => {
    const sAnneau = getCycleState([pose(p)], d(2026, 11, 22, 21))!;
    expect(confirmationEvent(sAnneau, 123, 'x')).toEqual({ id: 'x', type: 'retrait', at: 123 });
    const sPause = getCycleState([pose(p), retrait(d(2026, 11, 22, 20))], d(2026, 11, 29, 21))!;
    expect(confirmationEvent(sPause, 456, 'y')).toEqual({ id: 'y', type: 'pose', at: 456 });
  });

  test("appli fermée 10 jours : l'état est recalculé juste depuis les timestamps", () => {
    const events = [pose(p), retrait(d(2026, 11, 22, 20)), pose(d(2026, 11, 29, 20))];
    const s = getCycleState(events, d(2026, 12, 9, 12))!;
    expect(s.phase).toBe('anneau');
    expect(s.dueAt).toBe(d(2026, 12, 20, 20));
    expect(s.daysRemaining).toBe(11);
    expect(s.dayOfPhase).toBe(11);
  });

  test("l'ordre de stockage des événements n'a pas d'importance", () => {
    const events = [pose(d(2026, 11, 29, 20)), pose(p), retrait(d(2026, 11, 22, 20))];
    expect(getCycleState(events, d(2026, 12, 1))!.anchor.at).toBe(d(2026, 11, 29, 20));
  });
});

describe('retraits imprévus', () => {
  const p = d(2026, 11, 1, 20, 0);

  test('moins de 3 h : simple enregistrement, le cycle continue', () => {
    const events = [pose(p), imprevu(d(2026, 11, 10, 14), 'moins3h')];
    const s = getCycleState(events, d(2026, 11, 11))!;
    expect(s.phase).toBe('anneau');
    expect(s.dueAt).toBe(d(2026, 11, 22, 20));
    expect(s.extra).toBeNull();
  });

  test('plus de 3 h : décompte de 7 jours, sans toucher au cycle', () => {
    const at = d(2026, 11, 10, 14);
    const events = [pose(p), imprevu(at, 'plus3h')];
    const s = getCycleState(events, d(2026, 11, 12, 9))!;
    expect(s.dueAt).toBe(d(2026, 11, 22, 20));
    expect(s.extra).not.toBeNull();
    expect(s.extra!.endsAt).toBe(d(2026, 11, 17, 14));
    expect(s.extra!.daysRemaining).toBe(5);
  });

  test('le décompte se termine exactement 7 jours après', () => {
    const at = d(2026, 11, 10, 14);
    const events = [pose(p), imprevu(at, 'plus3h')];
    expect(getExtraContraception(events, d(2026, 11, 17, 13, 59))).not.toBeNull();
    expect(getExtraContraception(events, d(2026, 11, 17, 14, 0))).toBeNull();
  });

  test('décompte qui chevauche un changement de phase : il continue pendant la pause', () => {
    const at = d(2026, 11, 19, 10); // 3 jours avant le retrait prévu
    const events = [pose(p), imprevu(at, 'plus3h'), retrait(d(2026, 11, 22, 20))];
    const s = getCycleState(events, d(2026, 11, 24, 12))!;
    expect(s.phase).toBe('pause');
    expect(s.dueAt).toBe(d(2026, 11, 29, 20)); // cycle non interrompu
    expect(s.extra!.endsAt).toBe(d(2026, 11, 26, 10));
    expect(s.extra!.daysRemaining).toBe(2);

    // calendrier : jours du décompte à cheval sur les deux phases
    const days = projectDays(events, d(2026, 11, 18), d(2026, 11, 27), d(2026, 11, 24, 12));
    expect(days['2026-11-18'].extra).toBe(false);
    expect(days['2026-11-19'].extra).toBe(true);
    expect(days['2026-11-21'].phase).toBe('anneau');
    expect(days['2026-11-21'].extra).toBe(true);
    expect(days['2026-11-23'].phase).toBe('pause');
    expect(days['2026-11-23'].extra).toBe(true);
    expect(days['2026-11-25'].extra).toBe(true);
    expect(days['2026-11-26'].extra).toBe(false); // 7 jours : du 19 au 25 inclus
  });

  test('deux décomptes qui se chevauchent : on garde la fin la plus tardive', () => {
    const events = [
      pose(p),
      imprevu(d(2026, 11, 5, 8), 'plus3h'),
      imprevu(d(2026, 11, 8, 18), 'plus3h'),
    ];
    const extra = getExtraContraception(events, d(2026, 11, 9))!;
    expect(extra.endsAt).toBe(d(2026, 11, 15, 18));
    expect(extra.startedAt).toBe(d(2026, 11, 5, 8));
  });

  test('un retrait < 3 h ne lance jamais de décompte', () => {
    const events = [pose(p), imprevu(d(2026, 11, 5, 8), 'moins3h')];
    expect(getExtraContraception(events, d(2026, 11, 6))).toBeNull();
  });
});

describe("passage à l'heure d'été / d'hiver (Europe/Paris)", () => {
  test("heure d'été (29 mars 2026) : le retrait reste à 20h00 heure locale", () => {
    const p = d(2026, 3, 15, 20, 0); // CET (UTC+1)
    const s = getCycleState([pose(p)], d(2026, 3, 20))!;
    expect(s.dueAt).toBe(d(2026, 4, 5, 20, 0)); // CEST (UTC+2)
    expect(new Date(s.dueAt).getHours()).toBe(20);
    expect(s.dueAt - p).toBe(21 * DAY - HOUR_MS); // une heure « réelle » de moins
  });

  test("heure d'hiver (25 octobre 2026) : le retrait reste à 20h00 heure locale", () => {
    const p = d(2026, 10, 10, 20, 0); // CEST
    const s = getCycleState([pose(p)], d(2026, 10, 20))!;
    expect(s.dueAt).toBe(d(2026, 10, 31, 20, 0)); // CET
    expect(new Date(s.dueAt).getHours()).toBe(20);
    expect(s.dueAt - p).toBe(21 * DAY + HOUR_MS);
  });

  test("la pause traverse le changement d'heure : pose à la même heure locale", () => {
    const events = [pose(d(2026, 3, 1, 21)), retrait(d(2026, 3, 22, 21))];
    const s = getCycleState(events, d(2026, 3, 27))!;
    expect(s.dueAt).toBe(d(2026, 3, 29, 21));
    expect(new Date(s.dueAt).getHours()).toBe(21);
  });

  test("le décompte de 7 jours traverse le changement d'heure en gardant l'heure locale", () => {
    const events = [pose(d(2026, 10, 10, 20)), imprevu(d(2026, 10, 22, 9), 'plus3h')];
    const extra = getExtraContraception(events, d(2026, 10, 23))!;
    expect(extra.endsAt).toBe(d(2026, 10, 29, 9));
  });

  test("les jours restants sont des jours calendaires, même à cheval sur l'heure d'été", () => {
    const s = getCycleState([pose(d(2026, 3, 15, 20))], d(2026, 3, 28, 23, 30))!;
    expect(s.daysRemaining).toBe(8); // 28 mars → 5 avril
  });
});

describe('frise et calendrier', () => {
  const p = d(2026, 11, 1, 20, 0);

  test('exactement 21 jours « anneau » puis 7 jours « pause » (convention fin de journée)', () => {
    const days = projectDays([pose(p)], d(2026, 11, 1), d(2026, 12, 28), d(2026, 11, 2));
    const keys = Object.keys(days).sort();
    const phases = keys.map((k) => days[k].phase);
    expect(phases.slice(0, 21).every((x) => x === 'anneau')).toBe(true);
    expect(phases.slice(21, 28).every((x) => x === 'pause')).toBe(true);
    expect(phases[28]).toBe('anneau');
    expect(days['2026-11-01'].transitions).toEqual([{ type: 'pose', at: p, projected: false }]);
    expect(days['2026-11-22'].transitions[0]).toMatchObject({ type: 'retrait', projected: true });
    expect(days['2026-11-29'].transitions[0]).toMatchObject({ type: 'pose', projected: true });
  });

  test('passé réel, futur projeté', () => {
    const days = projectDays([pose(p)], d(2026, 11, 1), d(2026, 11, 30), d(2026, 11, 10, 12));
    expect(days['2026-11-05'].projected).toBe(false);
    expect(days['2026-11-24'].projected).toBe(true);
    expect(days['2026-11-10'].isToday).toBe(true);
  });

  test("jours avant le premier événement : pas de phase", () => {
    const days = projectDays([pose(p)], d(2026, 10, 30), d(2026, 11, 2), d(2026, 11, 2));
    expect(days['2026-10-30'].phase).toBeNull();
    expect(days['2026-11-01'].phase).toBe('anneau');
  });

  test('retraits imprévus attachés au bon jour', () => {
    const events = [
      pose(p),
      imprevu(d(2026, 11, 5, 8), 'moins3h'),
      imprevu(d(2026, 11, 5, 22), 'plus3h'),
    ];
    const days = projectDays(events, d(2026, 11, 4), d(2026, 11, 6), d(2026, 11, 6));
    expect(days['2026-11-04'].removals).toHaveLength(0);
    expect(days['2026-11-05'].removals.map((r) => r.duree)).toEqual(['moins3h', 'plus3h']);
  });

  test('retard non confirmé : la phase actuelle se prolonge, la projection part de maintenant', () => {
    const now = d(2026, 11, 24, 10); // retrait prévu le 22 à 20h, pas confirmé
    const tl = buildTimeline([pose(p)], now, d(2027, 1, 1));
    expect(tl[0]).toMatchObject({ phase: 'anneau', end: now, projected: false });
    expect(tl[1]).toMatchObject({ phase: 'pause', start: now, projected: true });
  });
});

describe('corrections dans les réglages', () => {
  const events = [pose(d(2026, 11, 1, 20), 'a'), retrait(d(2026, 11, 22, 20), 'b')];
  const now = d(2026, 11, 25);

  test('modification valide', () => {
    expect(validateCycleEventTime(events, 'b', d(2026, 11, 22, 22), now)).toBeNull();
  });
  test('date dans le futur refusée', () => {
    expect(validateCycleEventTime(events, 'b', d(2026, 11, 26), now)).toBe('futur');
  });
  test("l'ordre chronologique doit être conservé", () => {
    expect(validateCycleEventTime(events, 'b', d(2026, 10, 30), now)).toBe('avant_precedent');
    expect(validateCycleEventTime(events, 'a', d(2026, 11, 23), now)).toBe('apres_suivant');
  });
  test('événement inconnu', () => {
    expect(validateCycleEventTime(events, 'zz', d(2026, 11, 2), now)).toBe('introuvable');
  });
});
