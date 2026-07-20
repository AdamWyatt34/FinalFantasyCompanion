import type { Item, Pack, Position } from "../../api/types";
import type { ProgressEvent } from "../events";

export const TIMESTAMP = "2026-07-05T12:00:00.000Z";

/** Positions with orders 1..count, all on the given disc. */
export function makePositions(count: number, disc = 1): Position[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `pos${i + 1}`,
    order: i + 1,
    label: `Beat ${i + 1}`,
    disc,
  }));
}

export function makeItem(id: string, over: Partial<Item> = {}): Item {
  return {
    id,
    name: `Item ${id}`,
    type: "materia",
    location: `Location of ${id}`,
    opensAt: 1,
    closesAt: null,
    prereqs: [],
    excludes: [],
    count: 1,
    notes: `Notes for ${id}`,
    verified: false,
    route: null,
    ...over,
  };
}

export function makePack(items: Item[], positionCount = 10): Pack {
  return {
    game: { id: "test", title: "Test Game" },
    theme: {},
    positions: makePositions(positionCount),
    items,
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

export const at = (position: number, ...collectedIds: string[]) => ({
  position,
  collected: new Set(collectedIds),
  progress: new Map<string, number>(),
});
