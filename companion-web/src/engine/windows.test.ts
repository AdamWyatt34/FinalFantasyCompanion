import { describe, expect, it } from "vitest";
import { classify, windowsAt } from "./availability";
import { computeImpact } from "./impact";
import { projectRoute } from "./route";
import { at, makeItem, makePack } from "./testing/builders";

/** FF7's Elemental materia: Shinra HQ on beat 3, back during the Midgar raid at 19. */
const elemental = () =>
  makeItem("elemental", {
    windows: [
      { opensAt: 3, closesAt: 3 },
      { opensAt: 19, closesAt: 19 },
    ],
  });

describe("reopening windows", () => {
  it("derives opensAt from the first window and closesAt from the last", () => {
    const item = elemental();

    expect(item.opensAt).toBe(3);
    expect(item.closesAt).toBe(19);
  });

  it("windowsAt finds the current window and the next one ahead", () => {
    const item = elemental();

    expect(windowsAt(item, 3)).toEqual({
      current: { opensAt: 3, closesAt: 3 },
      next: { opensAt: 19, closesAt: 19 },
    });
    expect(windowsAt(item, 10)).toEqual({
      current: null,
      next: { opensAt: 19, closesAt: 19 },
    });
    expect(windowsAt(item, 19)).toEqual({
      current: { opensAt: 19, closesAt: 19 },
      next: null,
    });
    expect(windowsAt(item, 20)).toEqual({ current: null, next: null });
  });

  it("is notYet before the first window", () => {
    expect(classify(elemental(), at(1)).status).toBe("notYet");
  });

  it("the first window's close is still lastChance, but says when it reopens", () => {
    const entry = classify(elemental(), at(3));

    expect(entry.status).toBe("lastChance");
    expect(entry.reopensAt).toBe(19);
  });

  it("between windows it is reopensLater, not missed", () => {
    const entry = classify(elemental(), at(10));

    expect(entry.status).toBe("reopensLater");
    expect(entry.reopensAt).toBe(19);
  });

  it("the final window's close is lastChance with nothing after", () => {
    const entry = classify(elemental(), at(19));

    expect(entry.status).toBe("lastChance");
    expect(entry.reopensAt).toBeNull();
  });

  it("past the final window it is missed", () => {
    expect(classify(elemental(), at(20)).status).toBe("missed");
  });

  it("closingSoon looks at the current window only", () => {
    const item = makeItem("x", {
      windows: [
        { opensAt: 1, closesAt: 4 },
        { opensAt: 9, closesAt: null },
      ],
    });

    const entry = classify(item, at(2));

    expect(entry.status).toBe("closingSoon");
    expect(entry.reopensAt).toBe(9);
    expect(classify(item, at(9)).status).toBe("available");
  });

  it("a trailing open-ended window never finally closes", () => {
    const item = makeItem("x", {
      windows: [
        { opensAt: 1, closesAt: 2 },
        { opensAt: 5, closesAt: null },
      ],
    });

    expect(item.closesAt).toBeNull();
    expect(classify(item, at(3)).status).toBe("reopensLater");
    expect(classify(item, at(50)).status).toBe("available");
  });

  it("collected and forgone still win over everything", () => {
    expect(classify(elemental(), at(10, "elemental")).status).toBe("collected");
  });
});

describe("advance impact with reopening windows", () => {
  it("a window the jump skips lands in `reopening` when a later window exists", () => {
    const pack = makePack([elemental()], 22);

    const impact = computeImpact(pack, at(3), 4);

    expect(impact.closing).toHaveLength(0);
    expect(impact.reopening.map((e) => e.item.id)).toEqual(["elemental"]);
    expect(impact.reopening[0].reopensAt).toBe(19);
  });

  it("jumping past the final window is a real closure", () => {
    const pack = makePack([elemental()], 22);

    const impact = computeImpact(pack, at(3), 20);

    expect(impact.closing.map((e) => e.item.id)).toEqual(["elemental"]);
    expect(impact.reopening).toHaveLength(0);
  });

  it("an item already between windows is not warned about again", () => {
    const pack = makePack([elemental()], 22);

    const impact = computeImpact(pack, at(10), 12);

    expect(impact.closing).toHaveLength(0);
    expect(impact.reopening).toHaveLength(0);
  });

  it("single-window items keep the original semantics", () => {
    const pack = makePack([makeItem("x", { opensAt: 1, closesAt: 4 })]);

    const impact = computeImpact(pack, at(3), 5);

    expect(impact.closing.map((e) => e.item.id)).toEqual(["x"]);
    expect(impact.reopening).toHaveLength(0);
  });
});

describe("route flags", () => {
  it("marks items whose window opened at this beat as justOpened", () => {
    const pack = makePack([
      makeItem("fresh", { opensAt: 5 }),
      makeItem("old", { opensAt: 1 }),
      makeItem("back", {
        windows: [
          { opensAt: 1, closesAt: 2 },
          { opensAt: 5, closesAt: null },
        ],
      }),
    ]);

    const view = projectRoute(pack, at(5));
    const flag = (id: string) =>
      view.later.find((e) => e.item.id === id)!.justOpened;

    expect(flag("fresh")).toBe(true);
    expect(flag("old")).toBe(false);
    expect(flag("back")).toBe(true);
  });

  it("possibleNow: obtainable now but routed later, with the route's tradeoff", () => {
    const pack = makePack([
      makeItem("lure", {
        opensAt: 5,
        route: {
          at: 15,
          rank: 2,
          why: "Buy it on the way in",
          leg: null,
          tradeoff: "Cheap now, needed later",
        },
      }),
    ], 20);

    const early = projectRoute(pack, at(6));
    expect(early.later[0].possibleNow).toBe(true);

    const onTime = projectRoute(pack, at(15));
    expect(onTime.now[0].possibleNow).toBe(false);

    const notYet = projectRoute(pack, at(2));
    expect(notYet.later[0].possibleNow).toBe(false);
  });

  it("possibleNow is false for blocked items — the prereq is the real blocker", () => {
    const pack = makePack([
      makeItem("key"),
      makeItem("door", {
        prereqs: [["key"]],
        route: { at: 9, rank: 0, why: "", leg: null, tradeoff: null },
      }),
    ]);

    const view = projectRoute(pack, at(2));

    expect(view.later.find((e) => e.item.id === "door")!.possibleNow).toBe(
      false,
    );
  });

  it("reopensLater items stay in the route, unmasked, carrying reopensAt", () => {
    const pack = makePack([elemental()], 22);

    const view = projectRoute(pack, at(10));

    expect(view.later[0].status).toBe("reopensLater");
    expect(view.later[0].masked).toBe(false);
    expect(view.later[0].reopensAt).toBe(19);
  });

  it("a closed-for-now item never sits in Now, even when routed behind the position", () => {
    const routed = {
      ...elemental(),
      route: { at: 3, rank: 0, why: "", leg: null, tradeoff: null },
    };
    const pack = makePack([routed], 22);

    expect(projectRoute(pack, at(10)).now).toHaveLength(0);
    expect(projectRoute(pack, at(10)).later[0].item.id).toBe("elemental");
    // Within the lookahead of its reopening it moves up to Next.
    expect(projectRoute(pack, at(17)).next[0].item.id).toBe("elemental");
    // And it is Now again once the window reopens.
    expect(projectRoute(pack, at(19)).now[0].status).toBe("lastChance");
  });

  it("Later sorts closed-for-now items by their reopening beat", () => {
    const pack = makePack(
      [
        makeItem("late", { opensAt: 30 }),
        elemental(),
        makeItem("soon", { opensAt: 12 }),
      ],
      40,
    );

    const view = projectRoute(pack, at(10));

    expect(view.later.map((e) => e.item.id)).toEqual(["soon", "elemental", "late"]);
  });
});
