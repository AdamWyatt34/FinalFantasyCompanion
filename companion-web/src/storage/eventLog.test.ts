import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendEvent, readEvents } from "./eventLog";
import { kv } from "./kv";

const GAME = "ff7";
const activeKey = `ffcompanion.${GAME}.events`;
const corruptKeys = () =>
  kv.keys().filter((k) => k.startsWith(`ffcompanion.${GAME}.corrupt.`));

beforeEach(() => {
  kv.remove(activeKey);
  for (const key of corruptKeys()) {
    kv.remove(key);
  }
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("corrupt event log quarantine", () => {
  it("quarantines unparseable JSON and starts fresh", () => {
    kv.set(activeKey, "{not json");

    expect(readEvents(GAME)).toEqual([]);

    expect(kv.get(activeKey)).toBeNull();
    const quarantined = corruptKeys();
    expect(quarantined).toHaveLength(1);
    expect(kv.get(quarantined[0])).toBe("{not json");
  });

  it("quarantines a log that parses but is not an array", () => {
    kv.set(activeKey, JSON.stringify({ position: 5 }));

    expect(readEvents(GAME)).toEqual([]);
    expect(corruptKeys()).toHaveLength(1);
  });

  it("the log works again after quarantine", () => {
    kv.set(activeKey, "garbage");
    readEvents(GAME);

    appendEvent(GAME, {
      type: "positionAdvanced",
      to: 3,
      occurredAt: "2026-07-19T12:00:00.000Z",
    });

    expect(readEvents(GAME)).toHaveLength(1);
  });

  it("keeps only the newest three quarantined logs", () => {
    for (let i = 0; i < 5; i++) {
      kv.set(activeKey, `garbage ${i}`);
      readEvents(GAME);
    }

    const remaining = corruptKeys().sort();
    expect(remaining).toHaveLength(3);
    // Newest survive: the last of the five corruptions is still present.
    expect(remaining.map((k) => kv.get(k))).toContain("garbage 4");
    expect(remaining.map((k) => kv.get(k))).not.toContain("garbage 0");
  });
});
