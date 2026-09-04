import type {
  Availability,
  AvailabilityEntry,
  Item,
  Pack,
  PrereqGroup,
  Window,
} from "../api/types";
import type { PlaythroughState } from "./state";
import { projectTrackers } from "./trackers";
import { parseRef } from "./validate";

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

/** Items that exist in the run's active game version. */
export function activeItems(pack: Pack, state: PlaythroughState): Item[] {
  return pack.items.filter(
    (i) =>
      i.versions.length === 0 ||
      state.version === null ||
      i.versions.includes(state.version),
  );
}

/** A single ref is met by a collected item, or by the named option being the chosen one. */
export function refSatisfied(ref: string, state: PlaythroughState): boolean {
  const { itemId, optionId } = parseRef(ref);
  return optionId === null
    ? state.collected.has(itemId)
    : state.choices.get(itemId) === optionId;
}

/** The prereq groups (AND of any-of) that are not yet met. */
export function missingPrereqGroups(
  item: Item,
  state: PlaythroughState,
): PrereqGroup[] {
  return item.prereqs.filter(
    (group) => !group.some((ref) => refSatisfied(ref, state)),
  );
}

/**
 * Where position `p` sits relative to an item's windows: the window it is
 * inside (if any) and the first window still ahead of it.
 */
export function windowsAt(
  item: Item,
  p: number,
): { current: Window | null; next: Window | null } {
  let current: Window | null = null;
  let next: Window | null = null;
  for (const window of item.windows) {
    if (window.opensAt <= p && (window.closesAt == null || p <= window.closesAt)) {
      current = window;
    } else if (window.opensAt > p && next === null) {
      next = window;
    }
  }
  return { current, next };
}

/** Rule chain, first match wins — order is the contract. */
export function classify(
  item: Item,
  state: PlaythroughState,
  foreclosed: ReadonlySet<string> = NO_FORECLOSURES,
): AvailabilityEntry {
  const p = state.position;
  const progress =
    state.progress.get(item.id) ??
    (state.collected.has(item.id) ? item.count : 0);
  const chosen = state.choices.get(item.id) ?? null;
  const { current, next } = windowsAt(item, p);
  const entry = (
    status: AvailabilityEntry["status"],
    missingPrereqs: PrereqGroup[] = [],
    reopensAt: number | null = null,
  ): AvailabilityEntry => ({
    item,
    status,
    missingPrereqs,
    progress,
    windowClosesAt: current?.closesAt ?? null,
    reopensAt,
    chosen,
  });

  if (state.collected.has(item.id)) {
    return entry("collected");
  }

  if (foreclosed.has(item.id)) {
    return entry("forgone");
  }

  if (current === null) {
    if (p < item.opensAt) {
      return entry("notYet");
    }
    // Between windows: closed for now, but a later window brings it back.
    return next === null
      ? entry("missed")
      : entry("reopensLater", [], next.opensAt);
  }

  const missing = missingPrereqGroups(item, state);
  if (missing.length > 0) {
    return entry("blocked", missing);
  }

  const reopensAt = next?.opensAt ?? null;

  if (current.closesAt === p) {
    return entry("lastChance", [], reopensAt);
  }

  if (current.closesAt != null && current.closesAt - p <= LOOKAHEAD) {
    return entry("closingSoon", [], reopensAt);
  }

  return entry("available");
}

export function projectAvailability(
  pack: Pack,
  state: PlaythroughState,
): Availability {
  const foreclosed = foreclosedIds(pack, state);
  return {
    position: state.position,
    version: state.version,
    items: activeItems(pack, state).map((item) =>
      classify(item, state, foreclosed),
    ),
    trackers: projectTrackers(pack, state),
    adjustments: Object.fromEntries(state.adjustments),
  };
}
