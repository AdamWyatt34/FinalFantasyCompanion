import type { Item, Pack, Position, Tracker } from "../../api/types";
import type { ProgressEvent } from "../events";
import type { PlaythroughState } from "../state";

export const TIMESTAMP = "2026-07-05T12:00:00.000Z";

/** Positions with orders 1..count, all on the given disc. */
export function makePositions(count: number, disc = 1): Position[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `pos${i + 1}`,
    order: i + 1,
    label: `Beat ${i + 1}`,
    disc,
    tips: [],
    pace: null,
  }));
}

/**
 * Item builder. `opensAt`/`closesAt` overrides describe a single window;
 * pass `windows` explicitly for multi-window items (the derived fields
 * follow the first/last window automatically).
 */
export function makeItem(id: string, over: Partial<Item> = {}): Item {
  const windows = over.windows ?? [
    { opensAt: over.opensAt ?? 1, closesAt: over.closesAt ?? null },
  ];
  const steps = over.steps ?? [];
  return {
    id,
    name: `Item ${id}`,
    type: "materia",
    location: `Location of ${id}`,
    prereqs: [],
    excludes: [],
    count: steps.length > 0 ? steps.length : 1,
    steps,
    options: [],
    party: [],
    effects: {},
    refs: [],
    versions: [],
    notes: `Notes for ${id}`,
    verified: false,
    route: null,
    ...over,
    windows,
    opensAt: windows[0].opensAt,
    closesAt: windows[windows.length - 1].closesAt,
  };
}

export function makeTracker(id: string, over: Partial<Tracker> = {}): Tracker {
  return {
    id,
    name: `Tracker ${id}`,
    opensAt: 1,
    locksAt: null,
    notes: "",
    values: [
      { id: "a", label: "A", start: 10 },
      { id: "b", label: "B", start: 5 },
    ],
    verified: false,
    ...over,
  };
}

export function makePack(
  items: Item[],
  positionCount = 10,
  trackers: Tracker[] = [],
): Pack {
  return {
    game: { id: "test", title: "Test Game" },
    theme: {},
    positions: makePositions(positionCount),
    items,
    trackers,
  };
}

export const advanced = (to: number): ProgressEvent => ({
  type: "positionAdvanced",
  to,
  occurredAt: TIMESTAMP,
});

export const corrected = (to: number): ProgressEvent => ({
  type: "positionCorrected",
  to,
  occurredAt: TIMESTAMP,
});

export const collected = (itemId: string): ProgressEvent => ({
  type: "itemCollected",
  itemId,
  occurredAt: TIMESTAMP,
});

export const uncollected = (itemId: string): ProgressEvent => ({
  type: "itemUncollected",
  itemId,
  occurredAt: TIMESTAMP,
});

export const progressed = (itemId: string, delta: number): ProgressEvent => ({
  type: "itemProgressed",
  itemId,
  delta,
  occurredAt: TIMESTAMP,
});

export const chose = (itemId: string, optionId: string): ProgressEvent => ({
  type: "choiceMade",
  itemId,
  optionId,
  occurredAt: TIMESTAMP,
});

export const adjusted = (
  trackerId: string,
  valueId: string,
  delta: number,
): ProgressEvent => ({
  type: "trackerAdjusted",
  trackerId,
  valueId,
  delta,
  occurredAt: TIMESTAMP,
});

export const at = (
  position: number,
  ...collectedIds: string[]
): PlaythroughState => ({
  position,
  collected: new Set(collectedIds),
  progress: new Map<string, number>(),
  version: null,
  choices: new Map<string, string>(),
  adjustments: new Map<string, number>(),
});
