import type { ProgressEvent } from "./events";

/**
 * "Since last time" summary. A session is a run of events with no gap larger
 * than `gapHours` between neighbors; the recap describes the most recent
 * session, but only when it ended at least `gapHours` ago — mid-session the
 * player doesn't need to be welcomed back. This is the one place event
 * timestamps carry meaning; folding still ignores them.
 */
export interface SessionRecap {
  collected: number;
  progressed: number;
  reachedOrder: number | null;
  endedAt: string;
}

const HOUR = 60 * 60 * 1000;

export function lastSessionRecap(
  events: readonly ProgressEvent[],
  now: Date,
  gapHours = 6,
): SessionRecap | null {
  if (events.length === 0) {
    return null;
  }
  const gapMs = gapHours * HOUR;
  const lastAt = new Date(events[events.length - 1].occurredAt);
  if (
    Number.isNaN(lastAt.getTime()) ||
    now.getTime() - lastAt.getTime() < gapMs
  ) {
    return null;
  }

  let start = events.length - 1;
  while (start > 0) {
    const prev = new Date(events[start - 1].occurredAt);
    const cur = new Date(events[start].occurredAt);
    if (
      Number.isNaN(prev.getTime()) ||
      cur.getTime() - prev.getTime() > gapMs
    ) {
      break;
    }
    start--;
  }

  const block = events.slice(start);
  let collected = 0;
  let progressed = 0;
  let reachedOrder: number | null = null;
  for (const evt of block) {
    if (evt.type === "itemCollected") {
      collected++;
    } else if (evt.type === "itemProgressed" && evt.delta > 0) {
      progressed += evt.delta;
    } else if (
      evt.type === "positionAdvanced" ||
      evt.type === "positionCorrected"
    ) {
      reachedOrder = evt.to;
    }
  }

  if (collected === 0 && progressed === 0 && reachedOrder === null) {
    return null;
  }
  return { collected, progressed, reachedOrder, endedAt: lastAt.toISOString() };
}
