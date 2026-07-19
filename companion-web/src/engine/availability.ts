import type { Availability, AvailabilityEntry, Item, Pack } from "../api/types";
import type { PlaythroughState } from "./state";

export const LOOKAHEAD = 2;

/**
 * Ids permanently foreclosed by a collected counterpart. Exclusion is
 * symmetric: A excluding B forecloses whichever of the pair was NOT taken,
 * regardless of which side declared it.
 */
export function foreclosedIds(
  pack: Pack,
  state: PlaythroughState,
): Set<string> {
  const foreclosed = new Set<string>();
  for (const item of pack.items) {
    if (!state.collected.has(item.id)) {
      continue;
    }
    for (const other of item.excludes) {
      if (!state.collected.has(other)) {
        foreclosed.add(other);
      }
    }
  }
  for (const item of pack.items) {
    if (state.collected.has(item.id) || foreclosed.has(item.id)) {
      continue;
    }
    if (item.excludes.some((other) => state.collected.has(other))) {
      foreclosed.add(item.id);
    }
  }
  return foreclosed;
}

const NO_FORECLOSURES: ReadonlySet<string> = new Set();

/** Rule chain, first match wins — order is the contract. */
export function classify(
  item: Item,
  state: PlaythroughState,
  foreclosed: ReadonlySet<string> = NO_FORECLOSURES,
): AvailabilityEntry {
  const p = state.position;

  if (state.collected.has(item.id)) {
    return { item, status: "collected", missingPrereqs: [] };
  }

  if (foreclosed.has(item.id)) {
    return { item, status: "forgone", missingPrereqs: [] };
  }

  if (item.closesAt != null && p > item.closesAt) {
    return { item, status: "missed", missingPrereqs: [] };
  }

  if (p < item.opensAt) {
    return { item, status: "notYet", missingPrereqs: [] };
  }

  const missing = item.prereqs.filter((pr) => !state.collected.has(pr));
  if (missing.length > 0) {
    return { item, status: "blocked", missingPrereqs: missing };
  }

  if (item.closesAt === p) {
    return { item, status: "lastChance", missingPrereqs: [] };
  }

  if (item.closesAt != null && item.closesAt - p <= LOOKAHEAD) {
    return { item, status: "closingSoon", missingPrereqs: [] };
  }

  return { item, status: "available", missingPrereqs: [] };
}

export function projectAvailability(
  pack: Pack,
  state: PlaythroughState,
): Availability {
  const foreclosed = foreclosedIds(pack, state);
  return {
    position: state.position,
    items: pack.items.map((item) => classify(item, state, foreclosed)),
  };
}
