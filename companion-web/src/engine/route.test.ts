import { describe, expect, it } from "vitest";
import { projectRoute } from "./route";
import { at, makeItem, makePack } from "./testing/builders";

const route = (atBeat: number, rank = 0, why = "curated") => ({
  at: atBeat,
  rank,
  why,
});

describe("route bucketing", () => {
  it("routed at the current position lands in Now", () => {
    const pack = makePack([makeItem("x", { route: route(5) })]);

    const view = projectRoute(pack, at(5));

    expect(view.now.map((e) => e.item.id)).toEqual(["x"]);
  });

  it("catch-up: routed behind the position but still open lands in Now", () => {
    const pack = makePack([makeItem("x", { route: route(3) })]);

    const view = projectRoute(pack, at(7));

    expect(view.now.map((e) => e.item.id)).toEqual(["x"]);
  });

  it("unrouted lastChance lands in Now — urgency outranks curation", () => {
    const pack = makePack([makeItem("closing", { opensAt: 1, closesAt: 5 })]);

    const view = projectRoute(pack, at(5));

    expect(view.now).toHaveLength(1);
    expect(view.now[0].item.id).toBe("closing");
    expect(view.now[0].status).toBe("lastChance");
  });

  it("Now sorts lastChance first, then route rank", () => {
    const pack = makePack([
      makeItem("routed2", { name: "B", route: route(5, 2) }),
      makeItem("routed1", { name: "A", route: route(5, 1) }),
      makeItem("urgent", { name: "Z", opensAt: 1, closesAt: 5 }),
    ]);

    const view = projectRoute(pack, at(5));

    expect(view.now.map((e) => e.item.id)).toEqual([
      "urgent",
      "routed1",
      "routed2",
    ]);
  });

  it("unrouted closingSoon lands in Now, never buried in Later", () => {
    const pack = makePack([makeItem("soon", { opensAt: 1, closesAt: 5 })]);

    const view = projectRoute(pack, at(3));

    expect(view.now.map((e) => e.item.id)).toEqual(["soon"]);
    expect(view.now[0].status).toBe("closingSoon");
    expect(view.later).toHaveLength(0);
  });

  it("closingSoon routed within the lookahead stays in Next — curation holds", () => {
    const pack = makePack([
      makeItem("soon", { opensAt: 1, closesAt: 5, route: route(4) }),
    ]);

    const view = projectRoute(pack, at(3));

    expect(view.next.map((e) => e.item.id)).toEqual(["soon"]);
  });

  it("closingSoon routed beyond the lookahead is promoted to Now anyway", () => {
    // Route data that schedules an item after its window shuts is a pack bug;
    // the engine still refuses to hide the urgency.
    const pack = makePack([
      makeItem("soon", { opensAt: 1, closesAt: 5, route: route(8) }),
    ]);

    const view = projectRoute(pack, at(3));

    expect(view.now.map((e) => e.item.id)).toEqual(["soon"]);
  });

  it.each([1, 2])("routed %i ahead lands in Next", (distance) => {
    const pack = makePack([makeItem("x", { route: route(5 + distance) })]);

    const view = projectRoute(pack, at(5));

    expect(view.next.map((e) => e.item.id)).toEqual(["x"]);
  });

  it("routed three ahead lands in Later", () => {
    const pack = makePack([makeItem("x", { route: route(8) })]);

    const view = projectRoute(pack, at(5));

    expect(view.next).toHaveLength(0);
    expect(view.later.map((e) => e.item.id)).toEqual(["x"]);
  });

  it("unrouted open item lands in Later — the route view is complete", () => {
    const pack = makePack([makeItem("yuffie")]);

    const view = projectRoute(pack, at(5));

    expect(view.later.map((e) => e.item.id)).toEqual(["yuffie"]);
  });

  it("not-yet-open items are masked in Later", () => {
    const pack = makePack([makeItem("spoiler", { opensAt: 8 })]);

    const view = projectRoute(pack, at(5));

    expect(view.later[0].masked).toBe(true);
    expect(view.later[0].status).toBe("notYet");
  });

  it("open items are not masked", () => {
    const pack = makePack([makeItem("x", { route: route(5) })]);

    const view = projectRoute(pack, at(5));

    expect(view.now[0].masked).toBe(false);
  });

  it("forgone items appear nowhere in the route", () => {
    const pack = makePack([
      makeItem("taken", { excludes: ["lost"] }),
      makeItem("lost", { route: route(5) }),
    ]);

    const view = projectRoute(pack, at(5, "taken"));

    expect(view.now).toHaveLength(0);
    expect(view.next).toHaveLength(0);
    expect(view.later).toHaveLength(0);
  });

  it("collected and missed items appear nowhere", () => {
    const pack = makePack([
      makeItem("done", { route: route(5) }),
      makeItem("gone", { opensAt: 1, closesAt: 2, route: route(1) }),
    ]);

    const view = projectRoute(pack, at(5, "done"));

    expect(view.now).toHaveLength(0);
    expect(view.next).toHaveLength(0);
    expect(view.later).toHaveLength(0);
  });

  it("name tiebreak is ordinal, matching the C# engine — not locale collation", () => {
    // Real divergence from the shipped ff7 pack: ordinal puts 'HP↔MP' before
    // 'Hades' ('P' 0x50 < 'a' 0x61); localeCompare would reverse them.
    const pack = makePack([
      makeItem("hades", { name: "Hades Materia" }),
      makeItem("hpmp", { name: "HP↔MP Materia" }),
    ]);

    const view = projectRoute(pack, at(5));

    expect(view.later.map((e) => e.item.name)).toEqual([
      "HP↔MP Materia",
      "Hades Materia",
    ]);
  });

  it("blocked items keep their missing prereqs in the route entry", () => {
    const pack = makePack([
      makeItem("kotr", { prereqs: ["gold"], route: route(5) }),
    ]);

    const view = projectRoute(pack, at(5));

    expect(view.now[0].status).toBe("blocked");
    expect(view.now[0].missingPrereqs).toEqual(["gold"]);
  });
});
