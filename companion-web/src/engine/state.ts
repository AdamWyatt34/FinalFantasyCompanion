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
 *
 * Choice items enter `collected` the moment an outcome is chosen; the chosen
 * option lives in `choices`. Tracker nudges accumulate in `adjustments`,
 * keyed `trackerId.valueId` — the tracker projection adds them to the
 * starting values and to the effects of whatever is collected or chosen.
 */
export interface PlaythroughState {
  position: number;
  collected: ReadonlySet<string>;
  progress: ReadonlyMap<string, number>;
  /** Active game version; the pack's first declared version until selected. */
  version: string | null;
  choices: ReadonlyMap<string, string>;
  adjustments: ReadonlyMap<string, number>;
}

const NO_COUNTS: ReadonlyMap<string, number> = new Map();

export function initialState(pack: Pack): PlaythroughState {
  return {
    position: Math.min(...pack.positions.map((p) => p.order)),
    collected: new Set(),
    progress: new Map(),
    version: pack.game.versions?.[0]?.id ?? null,
    choices: new Map(),
    adjustments: new Map(),
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
      const choices = new Map(state.choices);
      choices.delete(e.itemId);
      return { ...state, collected, progress, choices };
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
    case "choiceMade": {
      const choices = new Map(state.choices);
      choices.set(e.itemId, e.optionId);
      const collected = new Set(state.collected);
      collected.add(e.itemId);
      return { ...state, choices, collected };
    }
    case "trackerAdjusted": {
      const key = `${e.trackerId}.${e.valueId}`;
      const adjustments = new Map(state.adjustments);
      adjustments.set(key, (adjustments.get(key) ?? 0) + e.delta);
      return { ...state, adjustments };
    }
    default:
      // Forward compatibility: a log written by a newer build may carry event
      // types this build does not know. Ignoring them keeps the fold total —
      // the alternative is a playthrough that refuses to load after a rollback.
      return state;
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
