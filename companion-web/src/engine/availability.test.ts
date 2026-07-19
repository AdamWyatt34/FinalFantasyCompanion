import { describe, expect, it } from "vitest";
import { classify, foreclosedIds, projectAvailability } from "./availability";
import { at, makeItem, makePack } from "./testing/builders";

describe("forgone (mutually exclusive choices)", () => {
  it("collecting one side forecloses the declared other side", () => {
    const pack = makePack([
      makeItem("esper", { excludes: ["sword"] }),
      makeItem("sword", { excludes: ["esper"] }),
    ]);

    const view = projectAvailability(pack, at(5, "esper"));

    expect(view.items.find((e) => e.item.id === "sword")!.status).toBe(
      "forgone",
    );
    expect(view.items.find((e) => e.item.id === "esper")!.status).toBe(
      "collected",
    );
  });

  it("exclusion is symmetric even when only one side declares it", () => {
    const pack = makePack([
      makeItem("declared", { excludes: ["silent"] }),
      makeItem("silent"),
    ]);

    // The silent side was collected; the declaring side is foreclosed.
    expect(foreclosedIds(pack, at(5, "silent"))).toEqual(new Set(["declared"]));
    // And the declared direction works too.
    expect(foreclosedIds(pack, at(5, "declared"))).toEqual(new Set(["silent"]));
  });

  it("forgone outranks missed in the rule chain", () => {
    const pack = makePack([
      makeItem("taken", { excludes: ["lost"] }),
      makeItem("lost", { opensAt: 1, closesAt: 2 }),
    ]);

    const view = projectAvailability(pack, at(5, "taken"));

    expect(view.items.find((e) => e.item.id === "lost")!.status).toBe(
      "forgone",
    );
  });

  it("nothing is foreclosed while neither side is collected", () => {
    const pack = makePack([
      makeItem("a", { excludes: ["b"] }),
      makeItem("b", { excludes: ["a"] }),
    ]);

    expect(foreclosedIds(pack, at(5))).toEqual(new Set());
  });
});

describe("availability rule chain (first match wins)", () => {
  it("rule 1: collected item is collected", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 3 });

    expect(classify(item, at(2, "x")).status).toBe("collected");
  });

  it("rule 2: position past close is missed", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 3 });

    expect(classify(item, at(4)).status).toBe("missed");
  });

  it("rule 3: position before open is notYet", () => {
    const item = makeItem("x", { opensAt: 5 });

    expect(classify(item, at(2)).status).toBe("notYet");
  });

  it("rule 4: uncollected prereq is blocked, listing the missing", () => {
    const item = makeItem("x", { prereqs: ["a", "b"] });

    const entry = classify(item, at(2, "a"));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual(["b"]);
  });

  it("rule 5: closes at current position is lastChance", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 4 });

    expect(classify(item, at(4)).status).toBe("lastChance");
  });

  it("rule 6: closes within lookahead is closingSoon", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 6 });

    expect(classify(item, at(4)).status).toBe("closingSoon");
  });

  it("rule 7: open with no deadline pressure is available", () => {
    const item = makeItem("x");

    expect(classify(item, at(4)).status).toBe("available");
  });

  it("precedence: collected beats missed", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 3 });

    expect(classify(item, at(9, "x")).status).toBe("collected");
  });

  it("precedence: blocked beats lastChance", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 4, prereqs: ["key"] });

    const entry = classify(item, at(4));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual(["key"]);
  });

  it("boundary: closesAt minus position of three is available, not closingSoon", () => {
    const item = makeItem("x", { opensAt: 1, closesAt: 7 });

    expect(classify(item, at(4)).status).toBe("available");
  });

  it("project emits one entry per pack item at the current position", () => {
    const pack = makePack([makeItem("a"), makeItem("b", { opensAt: 4 })], 5);

    const view = projectAvailability(pack, at(2));

    expect(view.position).toBe(2);
    expect(view.items.map((e) => e.status)).toEqual(["available", "notYet"]);
  });
});
