import { describe, expect, it } from "vitest";
import { applyEvent, fold, initialState } from "./state";
import {
  advanced,
  collected,
  corrected,
  makeItem,
  makePack,
  uncollected,
} from "./testing/builders";

const pack = makePack([makeItem("beta")]);

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
