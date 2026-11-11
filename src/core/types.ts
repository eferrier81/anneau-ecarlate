/**
 * Modèle de données de l'appli.
 *
 * Tout est stocké sous forme d'événements horodatés (timestamps en millisecondes).
 * Aucun compteur n'est jamais persisté : l'état du cycle, le calendrier et les
 * notifications sont toujours recalculés à partir de ces événements.
 */

/** Phase du cycle : anneau en place, ou pause sans anneau. */
export type Phase = 'anneau' | 'pause';

/** Durée déclarée d'un retrait imprévu. */
export type RemovalDuration = 'moins3h' | 'plus3h';

/** Événements qui délimitent le cycle (pose / retrait « normal »). */
export type CycleEventType = 'pose' | 'retrait';

export interface CycleEvent {
  id: string;
  type: CycleEventType;
  /** Timestamp (ms) de l'action réelle. */
  at: number;
}

export interface UnplannedRemovalEvent {
  id: string;
  type: 'retrait_imprevu';
  /** Timestamp (ms) déclaré par l'utilisatrice. */
  at: number;
  duree: RemovalDuration;
}

export type RingEvent = CycleEvent | UnplannedRemovalEvent;

/** Action attendue au prochain changement de phase. */
export type NextAction = 'retirer' | 'remettre';
