import type { Pack, TrackerView } from "../api/types";
import type { PlaythroughState } from "./state";

/**
 * Tracker standings: each value starts at its pack-declared number, then
 * gains the effects of every collected item and every chosen option, plus
 * whatever manual adjustments the player logged. Standings sort highest
 * first; ties keep pack order so a declared tie-break stays visible.
 */
export function projectTrackers(
  pack: Pack,
  state: PlaythroughState,
): TrackerView[] {
  if (pack.trackers.length === 0) {
    return [];
  }

  const totals = new Map<string, number>();
  const add = (effects: Record<string, number>) => {
    for (const [key, delta] of Object.entries(effects)) {
      totals.set(key, (totals.get(key) ?? 0) + delta);
    }
  };

  for (const item of pack.items) {
    if (!state.collected.has(item.id)) {
      continue;
    }
    add(item.effects);
    const chosen = state.choices.get(item.id);
    if (chosen !== undefined) {
      const option = item.options.find((o) => o.id === chosen);
      if (option !== undefined) {
        add(option.effects);
      }
    }
  }
  for (const [key, delta] of state.adjustments) {
    totals.set(key, (totals.get(key) ?? 0) + delta);
  }

  const p = state.position;
  return pack.trackers.map((tracker) => {
    const standings = tracker.values.map((value) => ({
      id: value.id,
      label: value.label,
      value: value.start + (totals.get(`${tracker.id}.${value.id}`) ?? 0),
    }));
    // Stable sort: equal values keep declaration order.
    standings.sort((a, b) => b.value - a.value);
    return {
      tracker,
      open: p >= tracker.opensAt,
      locked: tracker.locksAt != null && p > tracker.locksAt,
      standings,
    };
  });
}
