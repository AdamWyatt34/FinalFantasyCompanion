import type { PrereqGroup } from "../api/types";
import { parseRef } from "../engine/validate";

/**
 * Renders unsatisfied prereq groups as "A · B or C". `itemNames` may carry
 * `item:option` keys for option refs; a ref whose item is still masked must
 * not leak its name.
 */
export function describePrereqs(
  groups: PrereqGroup[],
  itemNames: Record<string, string>,
  hiddenIds: ReadonlySet<string>,
): string {
  const label = (ref: string) => {
    const { itemId } = parseRef(ref);
    if (hiddenIds.has(itemId)) {
      return "？？？";
    }
    return itemNames[ref] ?? itemNames[itemId] ?? ref;
  };
  return groups
    .map((group) => [...new Set(group.map(label))].join(" or "))
    .join(" · ");
}
