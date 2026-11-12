import { HOUR_MS } from './cycle';
import { readActionData, shouldConfirmFromNotification } from './notification-payload';
import type { RingEvent } from './types';

const d = (y: number, m: number, day: number, h = 0, min = 0) =>
  new Date(y, m - 1, day, h, min).getTime();

const payload = { kind: 'action', action: 'retirer', dueAt: 1_800_000_000_000 };

describe('lecture des données de notification', () => {
  test('appli ouverte : content.data est un objet', () => {
    expect(readActionData({ title: 'x', data: payload })).toEqual({
      action: 'retirer',
      dueAt: 1_800_000_000_000,
    });
  });

  test('appli fermée (tâche headless Android) : content.dataString est un texte JSON', () => {
    // Forme réelle produite par NotificationSerializer.toBundle pour une notif locale programmée.
    const content = {
      title: "C'est le moment de retirer ton anneau",
      body: '…',
      categoryIdentifier: 'confirmer-anneau',
      dataString: JSON.stringify(payload),
    };
    expect(readActionData(content)).toEqual({ action: 'retirer', dueAt: 1_800_000_000_000 });
  });

  test('ancien format : content.data.dataString', () => {
    expect(readActionData({ data: { dataString: JSON.stringify(payload) } })).toEqual({
      action: 'retirer',
      dueAt: 1_800_000_000_000,
    });
  });

  test('dueAt sérialisé en texte', () => {
    expect(readActionData({ data: { ...payload, dueAt: '1800000000000' } })?.dueAt).toBe(
      1_800_000_000_000,
    );
  });

  test.each([
    ['contenu absent', undefined],
    ['notif de test', { data: { kind: 'test' } }],
    ['fin de contraception', { data: { kind: 'extra_fin' } }],
    ['JSON invalide', { dataString: '{oups' }],
    ['action inconnue', { data: { kind: 'action', action: 'danser', dueAt: 1 } }],
  ])('%s → null', (_label, content) => {
    expect(readActionData(content)).toBeNull();
  });
});

describe('décision après « C’est fait »', () => {
  const pose: RingEvent = { id: 'p', type: 'pose', at: d(2026, 11, 1, 20) };
  const due = d(2026, 11, 22, 20);

  test('données lisibles et correspondantes → on enregistre', () => {
    expect(shouldConfirmFromNotification([pose], due + HOUR_MS, { action: 'retirer', dueAt: due })).toBe(true);
  });

  test('données lisibles mais périmées → rien', () => {
    expect(shouldConfirmFromNotification([pose], due + HOUR_MS, { action: 'remettre', dueAt: due })).toBe(false);
  });

  test('données illisibles mais action due → on enregistre (filet de sécurité)', () => {
    expect(shouldConfirmFromNotification([pose], due + 5 * 60_000, null)).toBe(true);
  });

  test('données illisibles et action pas encore due → rien', () => {
    expect(shouldConfirmFromNotification([pose], due - HOUR_MS, null)).toBe(false);
  });
});
