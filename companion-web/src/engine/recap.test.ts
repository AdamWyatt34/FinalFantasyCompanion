import { describe, expect, it } from "vitest";
import type { ProgressEvent } from "./events";
import { lastSessionRecap } from "./recap";

const evt = (
  type: "positionAdvanced" | "itemCollected",
  occurredAt: string,
  extra = 3,
): ProgressEvent =>
  type === "positionAdvanced"
    ? { type, to: extra, occurredAt }
    : { type, itemId: `item${extra}`, occurredAt };

describe("last-session recap", () => {
  it("returns null on an empty log", () => {
    expect(lastSessionRecap([], new Date("2026-07-19T12:00:00Z"))).toBeNull();
  });

  it("returns null mid-session (last event under the gap threshold)", () => {
    const events = [evt("itemCollected", "2026-07-19T11:00:00Z")];

    expect(
      lastSessionRecap(events, new Date("2026-07-19T12:00:00Z")),
    ).toBeNull();
  });

  it("summarizes only the newest session block", () => {
    const events: ProgressEvent[] = [
      // Old session — must not be counted.
      evt("itemCollected", "2026-07-01T10:00:00Z", 1),
      // New session, 6+ hours later.
      evt("positionAdvanced", "2026-07-10T18:00:00Z", 5),
      evt("itemCollected", "2026-07-10T18:10:00Z", 2),
      evt("itemCollected", "2026-07-10T18:20:00Z", 3),
    ];

    const recap = lastSessionRecap(events, new Date("2026-07-12T12:00:00Z"));

    expect(recap).not.toBeNull();
    expect(recap!.collected).toBe(2);
    expect(recap!.reachedOrder).toBe(5);
  });

  it("counts positive itemProgressed deltas as tallies", () => {
    const events: ProgressEvent[] = [
      {
        type: "itemProgressed",
        itemId: "primers",
        delta: 4,
        occurredAt: "2026-07-10T18:00:00Z",
      },
      {
        type: "itemProgressed",
        itemId: "primers",
        delta: -1,
        occurredAt: "2026-07-10T18:05:00Z",
      },
    ];

    const recap = lastSessionRecap(events, new Date("2026-07-12T12:00:00Z"));

    expect(recap!.progressed).toBe(4);
  });

  it("returns null when the last session had nothing worth recapping", () => {
    const events: ProgressEvent[] = [
      {
        type: "itemUncollected",
        itemId: "x",
        occurredAt: "2026-07-10T18:00:00Z",
      },
    ];

    expect(
      lastSessionRecap(events, new Date("2026-07-12T12:00:00Z")),
    ).toBeNull();
  });
});
