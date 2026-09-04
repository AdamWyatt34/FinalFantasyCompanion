import type { Item } from "../api/types";

export interface LegGroup<T> {
  key: string;
  leg: string | null;
  at: number | null;
  entries: T[];
}

/**
 * Folds entries sharing a route leg into one group at the leg's first
 * appearance, keeping each group's internal order. Adjacency is not
 * required: the Now bucket sorts by rank across every beat routed so far,
 * so a leg's members can be interleaved with catch-up items from other
 * beats — one heading per leg regardless. Entries without a leg stand alone.
 */
export function groupByLeg<T>(
  entries: readonly T[],
  itemOf: (entry: T) => Item,
): LegGroup<T>[] {
  const groups: LegGroup<T>[] = [];
  const byKey = new Map<string, LegGroup<T>>();
  for (const entry of entries) {
    const item = itemOf(entry);
    const leg = item.route?.leg ?? null;
    const at = item.route?.at ?? null;
    if (leg === null) {
      groups.push({ key: `item:${item.id}`, leg, at, entries: [entry] });
      continue;
    }
    const key = `leg:${at}|${leg}`;
    const existing = byKey.get(key);
    if (existing !== undefined) {
      existing.entries.push(entry);
    } else {
      const group = { key, leg, at, entries: [entry] };
      byKey.set(key, group);
      groups.push(group);
    }
  }
  return groups;
}
