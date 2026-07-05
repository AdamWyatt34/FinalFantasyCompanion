import type { Availability, AvailabilityEntry, Item, Pack } from "../api/types";
import type { PlaythroughState } from "./state";

export const LOOKAHEAD = 2;

/** Rule chain, first match wins — order is the contract. */
export function classify(
  item: Item,
  state: PlaythroughState,
): AvailabilityEntry {
  const p = state.position;

  if (state.collected.has(item.id)) {
    return { item, status: "collected", missingPrereqs: [] };
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
  return {
    position: state.position,
    items: pack.items.map((item) => classify(item, state)),
  };
}
