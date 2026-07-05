import type {
  AvailabilityEntry,
  Pack,
  RouteEntry,
  RouteView,
} from "../api/types";
import { classify, LOOKAHEAD } from "./availability";
import type { PlaythroughState } from "./state";

const UNROUTED_RANK = Number.MAX_SAFE_INTEGER;

/** Ordinal comparison to match the C# engine's StringComparer.Ordinal exactly. */
const ordinal = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const inNow = (e: AvailabilityEntry, p: number) =>
  e.status === "lastChance" || (e.item.route != null && e.item.route.at <= p);

const inNext = (e: AvailabilityEntry, p: number) =>
  e.item.route != null &&
  e.item.route.at > p &&
  e.item.route.at - p <= LOOKAHEAD;

const toEntry = (e: AvailabilityEntry, p: number): RouteEntry => ({
  item: e.item,
  status: e.status,
  masked: e.item.opensAt > p,
  missingPrereqs: e.missingPrereqs,
});

/**
 * Buckets authored route data over uncollected, non-missed items. The engine sorts
 * and filters; it never computes routes. Urgency always outranks curation: every
 * LastChance item lands in Now even without route data.
 */
export function projectRoute(pack: Pack, state: PlaythroughState): RouteView {
  const p = state.position;

  const candidates = pack.items
    .map((item) => classify(item, state))
    .filter((e) => e.status !== "collected" && e.status !== "missed");

  const now = candidates
    .filter((e) => inNow(e, p))
    .sort(
      (a, b) =>
        (a.status === "lastChance" ? 0 : 1) -
          (b.status === "lastChance" ? 0 : 1) ||
        (a.item.route?.rank ?? UNROUTED_RANK) -
          (b.item.route?.rank ?? UNROUTED_RANK) ||
        ordinal(a.item.name, b.item.name),
    )
    .map((e) => toEntry(e, p));

  const next = candidates
    .filter((e) => !inNow(e, p) && inNext(e, p))
    .sort(
      (a, b) =>
        a.item.route!.at - b.item.route!.at ||
        a.item.route!.rank - b.item.route!.rank ||
        ordinal(a.item.name, b.item.name),
    )
    .map((e) => toEntry(e, p));

  const later = candidates
    .filter((e) => !inNow(e, p) && !inNext(e, p))
    .sort(
      (a, b) =>
        (a.item.route?.at ?? a.item.opensAt) -
          (b.item.route?.at ?? b.item.opensAt) ||
        (a.item.route?.rank ?? UNROUTED_RANK) -
          (b.item.route?.rank ?? UNROUTED_RANK) ||
        ordinal(a.item.name, b.item.name),
    )
    .map((e) => toEntry(e, p));

  return { position: p, now, next, later };
}
