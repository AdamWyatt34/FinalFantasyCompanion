import type { Pack } from "../api/types";
import type { ProgressEvent } from "./events";

/**
 * Pure fold of the event log. positionAdvanced and positionCorrected apply
 * identically — the distinction is recorded intent, never behavior.
 * Collect/uncollect are idempotent.
 */
export interface PlaythroughState {
  position: number;
  collected: ReadonlySet<string>;
}

export function initialState(pack: Pack): PlaythroughState {
  return {
    position: Math.min(...pack.positions.map((p) => p.order)),
    collected: new Set(),
  };
}

export function applyEvent(
  state: PlaythroughState,
  e: ProgressEvent,
): PlaythroughState {
  switch (e.type) {
    case "positionAdvanced":
    case "positionCorrected":
      return { ...state, position: e.to };
    case "itemCollected": {
      const collected = new Set(state.collected);
      collected.add(e.itemId);
      return { ...state, collected };
    }
    case "itemUncollected": {
      const collected = new Set(state.collected);
      collected.delete(e.itemId);
      return { ...state, collected };
    }
  }
}

export function fold(
  pack: Pack,
  events: readonly ProgressEvent[],
): PlaythroughState {
  return events.reduce(applyEvent, initialState(pack));
}
