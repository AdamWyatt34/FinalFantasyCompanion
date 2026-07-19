import { describe, expect, it } from "vitest";
import { classify } from "./availability";
import { computeImpact } from "./impact";
import { fold } from "./state";
import {
  advanced,
  at,
  corrected,
  makeItem,
  makePack,
} from "./testing/builders";

describe("advance impact", () => {
  it("includes a window closing before the target", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 4 })]);

    const impact = computeImpact(pack, at(3), 5);

    expect(impact.closing.map((e) => e.item.id)).toEqual(["x"]);
  });

  it("includes a window skipped entirely by the jump", () => {
    const pack = makePack(
      [makeItem("inside", { opensAt: 7, closesAt: 9 })],
      20,
    );

    const impact = computeImpact(pack, at(3), 15);

    expect(impact.closing.map((e) => e.item.id)).toEqual(["inside"]);
  });

  it("excludes a window closing exactly at the target", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 5 })]);

    expect(computeImpact(pack, at(3), 5).closing).toHaveLength(0);
  });

  it("includes a lastChance window at the current position", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 3 })]);

    expect(computeImpact(pack, at(3), 4).closing.map((e) => e.item.id)).toEqual(
      ["x"],
    );
  });

  it("excludes collected items", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 4 })]);

    expect(computeImpact(pack, at(3, "x"), 6).closing).toHaveLength(0);
  });

  it("excludes already-missed items", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 2 })]);

    expect(computeImpact(pack, at(4), 8).closing).toHaveLength(0);
  });

  it("excludes choice-foreclosed items — they are gone regardless of the jump", () => {
    const pack = makePack([
      makeItem("taken", { excludes: ["lost"] }),
      makeItem("lost", { opensAt: 1, closesAt: 4 }),
    ]);

    expect(computeImpact(pack, at(3, "taken"), 6).closing).toHaveLength(0);
  });

  it("includes blocked items with their missing prereqs", () => {
    const pack = makePack([
      makeItem("x", { opensAt: 1, closesAt: 4, prereqs: ["key"] }),
    ]);

    const impact = computeImpact(pack, at(3), 6);

    expect(impact.closing[0].status).toBe("blocked");
    expect(impact.closing[0].missingPrereqs).toEqual(["key"]);
  });

  it("backward correction un-misses an item and it reappears in impact", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 3 })]);
    const item = pack.items[0];

    const missed = fold(pack, [advanced(6)]);
    expect(classify(item, missed).status).toBe("missed");

    const correctedState = fold(pack, [advanced(6), corrected(2)]);
    expect(classify(item, correctedState).status).toBe("closingSoon");

    expect(
      computeImpact(pack, correctedState, 6).closing.map((e) => e.item.id),
    ).toEqual(["x"]);
  });
});
