import type { Pack } from "../api/types";
import type { ProgressEvent } from "./events";

/**
 * Pure fold of the event log. positionAdvanced and positionCorrected apply
 * identically — the distinction is recorded intent, never behavior.
 * Collect/uncollect are idempotent.
 *
 * Counter items (count > 1) accumulate via itemProgressed; `collected`
 * remains the single authoritative done-set — a counter enters it when its
 * progress reaches the target and leaves it when progress drops below.
 */
export interface PlaythroughState {
  position: number;
  collected: ReadonlySet<string>;
  progress: ReadonlyMap<string, number>;
  /** Active game version; the pack's first declared version until selected. */
  version: string | null;
}

const NO_COUNTS: ReadonlyMap<string, number> = new Map();

export function initialState(pack: Pack): PlaythroughState {
  return {
    position: Math.min(...pack.positions.map((p) => p.order)),
    collected: new Set(),
    progress: new Map(),
    version: pack.game.versions?.[0]?.id ?? null,
  };
}

export function applyEvent(
  state: PlaythroughState,
  e: ProgressEvent,
  counts: ReadonlyMap<string, number> = NO_COUNTS,
): PlaythroughState {
  switch (e.type) {
    case "positionAdvanced":
    case "positionCorrected":
      return { ...state, position: e.to };
    case "itemCollected": {
      const collected = new Set(state.collected);
      collected.add(e.itemId);
      const count = counts.get(e.itemId) ?? 1;
      if (count > 1) {
        const progress = new Map(state.progress);
        progress.set(e.itemId, count);
        return { ...state, collected, progress };
      }
      return { ...state, collected };
    }
    case "itemUncollected": {
      const collected = new Set(state.collected);
      collected.delete(e.itemId);
      const progress = new Map(state.progress);
      progress.delete(e.itemId);
      return { ...state, collected, progress };
    }
    case "versionSelected":
      return { ...state, version: e.version };
    case "itemProgressed": {
      const count = counts.get(e.itemId) ?? 1;
      const current = state.progress.get(e.itemId) ?? 0;
      const next = Math.max(0, Math.min(count, current + e.delta));
      const progress = new Map(state.progress);
      progress.set(e.itemId, next);
      const collected = new Set(state.collected);
      if (next >= count) {
        collected.add(e.itemId);
      } else {
        collected.delete(e.itemId);
      }
      return { ...state, collected, progress };
    }
  }
}

export function fold(
  pack: Pack,
  events: readonly ProgressEvent[],
): PlaythroughState {
  const counts = new Map(pack.items.map((i) => [i.id, i.count] as const));
  return events.reduce(
    (state, e) => applyEvent(state, e, counts),
    initialState(pack),
  );
}
