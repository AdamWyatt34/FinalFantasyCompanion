import type { AdvanceImpact, Pack } from "../api/types";
import { classify, foreclosedIds } from "./availability";
import type { PlaythroughState } from "./state";

/**
 * Uncollected items whose window closes strictly before the target position —
 * including windows that open AND close entirely inside the jump.
 * Already-missed and choice-foreclosed items are excluded: they are gone
 * regardless of the jump, so warning about them would be noise.
 */
export function computeImpact(
  pack: Pack,
  state: PlaythroughState,
  target: number,
): AdvanceImpact {
  const p = state.position;
  const foreclosed = foreclosedIds(pack, state);

  const closing = pack.items
    .filter(
      (i) =>
        !state.collected.has(i.id) &&
        !foreclosed.has(i.id) &&
        i.closesAt != null &&
        i.closesAt >= p &&
        i.closesAt < target,
    )
    .map((i) => classify(i, state, foreclosed));

  return { from: p, to: target, closing };
}
