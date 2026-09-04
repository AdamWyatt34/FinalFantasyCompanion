import type { AdvanceImpact, Item, Pack } from "../api/types";
import { activeItems, classify, foreclosedIds } from "./availability";
import type { PlaythroughState } from "./state";

/** True when some window of the item shuts inside [from, to). */
const closesInside = (item: Item, from: number, to: number) =>
  item.windows.some(
    (w) => w.closesAt != null && w.closesAt >= from && w.closesAt < to,
  );

/**
 * Uncollected items whose window closes strictly before the target position —
 * including windows that open AND close entirely inside the jump.
 * Already-missed and choice-foreclosed items are excluded: they are gone
 * regardless of the jump, so warning about them would be noise.
 *
 * With reopening windows the jump has two grades: `closing` is final (the
 * last window shuts before the target), `reopening` shuts a window the jump
 * skips but a later window still brings the item back.
 */
export function computeImpact(
  pack: Pack,
  state: PlaythroughState,
  target: number,
): AdvanceImpact {
  const p = state.position;
  const foreclosed = foreclosedIds(pack, state);

  const affected = activeItems(pack, state).filter(
    (i) =>
      !state.collected.has(i.id) &&
      !foreclosed.has(i.id) &&
      closesInside(i, p, target),
  );

  const closing = affected
    .filter(
      (i) => i.closesAt != null && i.closesAt >= p && i.closesAt < target,
    )
    .map((i) => classify(i, state, foreclosed));

  const reopening = affected
    .filter((i) => i.closesAt == null || i.closesAt >= target)
    .map((i) => classify(i, state, foreclosed));

  return { from: p, to: target, closing, reopening };
}
