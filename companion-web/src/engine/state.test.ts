import { describe, expect, it } from "vitest";
import { applyEvent, fold, initialState } from "./state";
import {
  advanced,
  collected,
  corrected,
  makeItem,
  makePack,
  progressed,
  uncollected,
} from "./testing/builders";

const pack = makePack([makeItem("beta")]);

describe("game versions", () => {
  const versionedPack = {
    ...makePack([makeItem("x")]),
    game: {
      id: "test",
      title: "Test Game",
      versions: [
        { id: "ps2", label: "PS2" },
        { id: "za", label: "Zodiac Age" },
      ],
    },
  };

  it("defaults to the first declared version", () => {
    expect(fold(versionedPack, []).version).toBe("ps2");
    expect(fold(pack, []).version).toBeNull();
  });

  it("versionSelected switches the run's version", () => {
    const state = fold(versionedPack, [
      { type: "versionSelected", version: "za", occurredAt: "2026-01-01" },
    ]);

    expect(state.version).toBe("za");
  });
});

describe("counter items (itemProgressed)", () => {
  const counterPack = makePack([makeItem("primers", { count: 5 })]);

  it("progress accumulates and clamps to [0, count]", () => {
    const state = fold(counterPack, [
      progressed("primers", 2),
      progressed("primers", 9),
      progressed("primers", -1),
    ]);

    expect(state.progress.get("primers")).toBe(4);
    expect(state.collected.has("primers")).toBe(false);
  });

  it("reaching the count marks the item collected; dropping below unmarks it", () => {
    const full = fold(counterPack, [progressed("primers", 5)]);
    expect(full.collected.has("primers")).toBe(true);

    const dropped = fold(counterPack, [
      progressed("primers", 5),
      progressed("primers", -1),
    ]);
    expect(dropped.collected.has("primers")).toBe(false);
    expect(dropped.progress.get("primers")).toBe(4);
  });

  it("itemCollected on a counter fills its progress; uncollect resets it", () => {
    const filled = fold(counterPack, [collected("primers")]);
    expect(filled.progress.get("primers")).toBe(5);

    const reset = fold(counterPack, [
      collected("primers"),
      uncollected("primers"),
    ]);
    expect(reset.progress.get("primers") ?? 0).toBe(0);
    expect(reset.collected.has("primers")).toBe(false);
  });
});

describe("PlaythroughState fold", () => {
  it("empty log starts at the lowest position order with nothing collected", () => {
    const state = fold(pack, []);

    expect(state.position).toBe(1);
    expect(state.collected.size).toBe(0);
  });

  it("positionAdvanced moves position", () => {
    expect(fold(pack, [advanced(4)]).position).toBe(4);
  });

  it("advanced and corrected fold identically", () => {
    expect(fold(pack, [corrected(7)]).position).toBe(
      fold(pack, [advanced(7)]).position,
    );
  });

  it("corrected moves backward", () => {
    expect(fold(pack, [advanced(6), corrected(2)]).position).toBe(2);
  });

  it("itemCollected adds to the collected set", () => {
    expect([...fold(pack, [collected("beta")]).collected]).toEqual(["beta"]);
  });

  it("duplicate collect is idempotent", () => {
    expect(
      fold(pack, [collected("beta"), collected("beta")]).collected.size,
    ).toBe(1);
  });

  it("uncollect removes the item", () => {
    expect(
      fold(pack, [collected("beta"), uncollected("beta")]).collected.size,
    ).toBe(0);
  });

  it("uncollect of a never-collected item is a no-op", () => {
    expect(fold(pack, [uncollected("ghost")]).collected.size).toBe(0);
  });

  it("applyEvent does not mutate prior state", () => {
    const before = fold(pack, [collected("beta")]);

    applyEvent(before, collected("gamma"));

    expect([...before.collected]).toEqual(["beta"]);
  });

  it("initialState uses the lowest order even when positions do not start at 1", () => {
    const oddPack = {
      ...pack,
      positions: [
        { id: "a", order: 5, label: "Five", disc: 1 },
        { id: "b", order: 3, label: "Three", disc: 1 },
      ],
    };

    expect(initialState(oddPack).position).toBe(3);
  });
});
