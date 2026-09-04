import { describe, expect, it } from "vitest";
import { projectAvailability } from "./availability";
import { fold } from "./state";
import { projectTrackers } from "./trackers";
import {
  adjusted,
  advanced,
  chose,
  collected,
  makeItem,
  makePack,
  makeTracker,
} from "./testing/builders";

/** A miniature of FF7's date mechanic. */
const date = () =>
  makeTracker("date", {
    opensAt: 1,
    locksAt: 10,
    values: [
      { id: "aerith", label: "Aerith", start: 50 },
      { id: "tifa", label: "Tifa", start: 30 },
      { id: "yuffie", label: "Yuffie", start: 10 },
      { id: "barret", label: "Barret", start: 0 },
    ],
  });

const pack = () =>
  makePack(
    [
      makeItem("flowers", { effects: { "date.aerith": 5, "date.tifa": -3 } }),
      makeItem("corneo", {
        options: [
          {
            id: "cloud",
            label: "Corneo picks Cloud",
            best: true,
            note: "",
            effects: { "date.tifa": 5, "date.aerith": 5 },
          },
          {
            id: "tifa",
            label: "Corneo picks Tifa",
            best: false,
            note: "",
            effects: { "date.tifa": -5 },
          },
        ],
      }),
    ],
    12,
    [date()],
  );

describe("tracker standings", () => {
  it("start at the declared values, highest first", () => {
    const [view] = projectTrackers(pack(), fold(pack(), []));

    expect(view.standings.map((s) => `${s.id}:${s.value}`)).toEqual([
      "aerith:50",
      "tifa:30",
      "yuffie:10",
      "barret:0",
    ]);
    expect(view.open).toBe(true);
    expect(view.locked).toBe(false);
  });

  it("collected items apply their effects; uncollecting removes them", () => {
    const p = pack();
    const [view] = projectTrackers(p, fold(p, [collected("flowers")]));

    expect(view.standings.find((s) => s.id === "aerith")!.value).toBe(55);
    expect(view.standings.find((s) => s.id === "tifa")!.value).toBe(27);
  });

  it("only the chosen option's effects apply, and re-choosing swaps them", () => {
    const p = pack();

    const first = projectTrackers(p, fold(p, [chose("corneo", "tifa")]))[0];
    expect(first.standings.find((s) => s.id === "tifa")!.value).toBe(25);

    const second = projectTrackers(
      p,
      fold(p, [chose("corneo", "tifa"), chose("corneo", "cloud")]),
    )[0];
    expect(second.standings.find((s) => s.id === "tifa")!.value).toBe(35);
    expect(second.standings.find((s) => s.id === "aerith")!.value).toBe(55);
  });

  it("manual adjustments accumulate and can go negative", () => {
    const p = pack();
    const state = fold(p, [
      adjusted("date", "barret", 3),
      adjusted("date", "barret", -5),
      adjusted("date", "tifa", 25),
    ]);

    const [view] = projectTrackers(p, state);

    expect(view.standings[0]).toEqual({ id: "tifa", label: "Tifa", value: 55 });
    expect(view.standings.find((s) => s.id === "barret")!.value).toBe(-2);
  });

  it("ties keep declaration order — the pack's tie-break stays visible", () => {
    const p = pack();
    const state = fold(p, [adjusted("date", "tifa", 20)]);

    const [view] = projectTrackers(p, state);

    expect(view.standings.slice(0, 2).map((s) => s.id)).toEqual([
      "aerith",
      "tifa",
    ]);
  });

  it("reports open and locked against the position", () => {
    const p = pack();

    expect(projectTrackers(p, fold(p, [advanced(10)]))[0].locked).toBe(false);
    expect(projectTrackers(p, fold(p, [advanced(11)]))[0].locked).toBe(true);

    const late = makePack([], 12, [makeTracker("t", { opensAt: 6 })]);
    expect(projectTrackers(late, fold(late, []))[0].open).toBe(false);
    expect(projectTrackers(late, fold(late, [advanced(6)]))[0].open).toBe(true);
  });

  it("rides along in the availability projection", () => {
    const p = pack();

    const view = projectAvailability(p, fold(p, []));

    expect(view.trackers).toHaveLength(1);
    expect(view.trackers[0].tracker.id).toBe("date");
  });

  it("packs without trackers project an empty list", () => {
    const plain = makePack([makeItem("x")]);

    expect(projectAvailability(plain, fold(plain, [])).trackers).toEqual([]);
  });
});
