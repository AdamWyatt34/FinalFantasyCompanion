import type { AdvanceImpact, Pack } from "../api/types";
import { classify } from "./availability";
import type { PlaythroughState } from "./state";

/**
 * Uncollected items whose window closes strictly before the target position —
 * including windows that open AND close entirely inside the jump.
 * Already-missed items are excluded.
 */
export function computeImpact(
  pack: Pack,
  state: PlaythroughState,
  target: number,
): AdvanceImpact {
  const p = state.position;

  const closing = pack.items
    .filter(
      (i) =>
        !state.collected.has(i.id) &&
        i.closesAt != null &&
        i.closesAt >= p &&
        i.closesAt < target,
    )
    .map((i) => classify(i, state));

  return { from: p, to: target, closing };
}
