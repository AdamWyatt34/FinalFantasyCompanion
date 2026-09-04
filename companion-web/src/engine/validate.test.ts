import { describe, expect, it } from "vitest";
import { PackValidationError, validate, validateOrThrow } from "./validate";
import { makeItem, makePack, makePositions, makeTracker } from "./testing/builders";

describe("pack validation", () => {
  it("valid pack has no errors", () => {
    const pack = makePack(
      [
        makeItem("a", { opensAt: 1, closesAt: 3 }),
        makeItem("b", {
          opensAt: 2,
          prereqs: [["a"]],
          route: { at: 2, rank: 0, why: "w", leg: null, tradeoff: null },
        }),
      ],
      5,
    );

    expect(validate(pack)).toEqual([]);
    expect(() => validateOrThrow(pack)).not.toThrow();
  });

  it("unknown prereq id is reported", () => {
    const pack = makePack([makeItem("a", { prereqs: [["ghost"]] })], 5);

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("unknown prereq 'ghost'");
  });

  it("direct prereq cycle is reported", () => {
    const pack = makePack(
      [makeItem("a", { prereqs: [["b"]] }), makeItem("b", { prereqs: [["a"]] })],
      5,
    );

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("prereq cycle");
  });

  it("transitive prereq cycle is reported", () => {
    const pack = makePack(
      [
        makeItem("a", { prereqs: [["c"]] }),
        makeItem("b", { prereqs: [["a"]] }),
        makeItem("c", { prereqs: [["b"]] }),
      ],
      5,
    );

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("prereq cycle");
  });

  it("opensAt referencing a missing order is reported", () => {
    const pack = makePack([makeItem("a", { opensAt: 9 })], 5);

    expect(validate(pack)[0]).toContain("opensAt 9");
  });

  it("closesAt referencing a missing order is reported", () => {
    const pack = makePack([makeItem("a", { opensAt: 1, closesAt: 9 })], 5);

    expect(validate(pack)[0]).toContain("closesAt 9");
  });

  it("route.at referencing a missing order is reported", () => {
    const pack = makePack(
      [makeItem("a", { route: { at: 9, rank: 0, why: "w", leg: null, tradeoff: null } })],
      5,
    );

    expect(validate(pack)[0]).toContain("route.at 9");
  });

  it("closes before opens is reported", () => {
    const pack = makePack([makeItem("a", { opensAt: 4, closesAt: 2 })], 5);

    expect(validate(pack)[0]).toContain("closesAt 2 is before opensAt 4");
  });

  it("duplicate item ids are reported", () => {
    const pack = makePack([makeItem("a"), makeItem("a", { opensAt: 2 })], 5);

    expect(validate(pack)[0]).toContain("duplicate item id 'a'");
  });

  it("duplicate position orders are reported", () => {
    const pack = {
      ...makePack([], 3),
      positions: [
        ...makePositions(3),
        { id: "extra", order: 2, label: "Extra", disc: 1 },
      ],
    };

    expect(
      validate(pack).some((e) => e.includes("duplicate position order 2")),
    ).toBe(true);
  });

  it("a gap in position orders is reported — the stepper advances by one", () => {
    const pack = {
      ...makePack([], 3),
      positions: [
        { id: "a", order: 1, label: "A", disc: 1 },
        { id: "b", order: 2, label: "B", disc: 1 },
        { id: "c", order: 5, label: "C", disc: 1 },
      ],
    };

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("not contiguous: 2 is followed by 5");
  });

  it("all errors are collected, not just the first", () => {
    const pack = makePack(
      [makeItem("a", { opensAt: 9, prereqs: [["ghost"]] })],
      3,
    );

    expect(validate(pack)).toHaveLength(2);
  });

  it("validateOrThrow lists every error in the message", () => {
    const pack = makePack(
      [makeItem("a", { opensAt: 9, prereqs: [["ghost"]] })],
      3,
    );

    let caught: PackValidationError | null = null;
    try {
      validateOrThrow(pack);
    } catch (e) {
      caught = e as PackValidationError;
    }

    expect(caught).not.toBeNull();
    expect(caught!.packId).toBe("test");
    expect(caught!.errors).toHaveLength(2);
    expect(caught!.message).toContain("unknown prereq");
    expect(caught!.message).toContain("opensAt 9");
  });
});

describe("validation of the extended schema", () => {
  const option = (id: string) => ({
    id,
    label: id,
    best: false,
    note: "",
    effects: {},
  });

  it("accepts multi-window items, any-of groups, option refs, steps, trackers and effects", () => {
    const pack = makePack(
      [
        makeItem("elemental", {
          windows: [
            { opensAt: 1, closesAt: 1 },
            { opensAt: 4, closesAt: 4 },
          ],
        }),
        makeItem("dress", { options: [option("silk"), option("cotton")] }),
        makeItem("corneo", {
          prereqs: [["dress:silk"], ["elemental", "cave"]],
          effects: { "date.tifa": 5 },
        }),
        makeItem("cave", { steps: ["Visit", "Fight", "Return"] }),
      ],
      5,
      [makeTracker("date", { values: [{ id: "tifa", label: "Tifa", start: 30 }] })],
    );

    expect(validate(pack)).toEqual([]);
  });

  it("rejects windows that overlap or merely touch", () => {
    const overlap = makePack(
      [
        makeItem("a", {
          windows: [
            { opensAt: 1, closesAt: 3 },
            { opensAt: 3, closesAt: 4 },
          ],
        }),
      ],
      5,
    );
    const touching = makePack(
      [
        makeItem("a", {
          windows: [
            { opensAt: 1, closesAt: 2 },
            { opensAt: 3, closesAt: 4 },
          ],
        }),
      ],
      5,
    );

    expect(validate(overlap)[0]).toContain("overlap or touch");
    expect(validate(touching)[0]).toContain("overlap or touch");
  });

  it("rejects a window after one that never closes", () => {
    const pack = makePack(
      [
        makeItem("a", {
          windows: [
            { opensAt: 1, closesAt: null },
            { opensAt: 4, closesAt: 4 },
          ],
        }),
      ],
      5,
    );

    expect(validate(pack)[0]).toContain("after one that never closes");
  });

  it("rejects an item with no window", () => {
    const pack = makePack([{ ...makeItem("a"), windows: [] }], 5);

    expect(validate(pack).some((e) => e.includes("no availability window"))).toBe(true);
  });

  it("rejects empty prereq groups and option refs to options that do not exist", () => {
    const pack = makePack(
      [
        makeItem("dress", { options: [option("silk")] }),
        makeItem("a", { prereqs: [[]] }),
        makeItem("b", { prereqs: [["dress:velvet"]] }),
        makeItem("c", { prereqs: [["c"]] }),
      ],
      5,
    );

    const errors = validate(pack);

    expect(errors.some((e) => e.includes("empty prereq group"))).toBe(true);
    expect(errors.some((e) => e.includes("names an option 'dress' does not have"))).toBe(true);
    expect(errors.some((e) => e.includes("requires itself"))).toBe(true);
  });

  it("an any-of group member can still form a cycle", () => {
    const pack = makePack(
      [
        makeItem("a", { prereqs: [["b", "x"]] }),
        makeItem("b", { prereqs: [["a"]] }),
        makeItem("x"),
      ],
      5,
    );

    expect(validate(pack).some((e) => e.includes("prereq cycle"))).toBe(true);
  });

  it("rejects steps that disagree with count, and choices that are counters", () => {
    const mismatch = makePack(
      [{ ...makeItem("a", { steps: ["one", "two"] }), count: 5 }],
      5,
    );
    const counterChoice = makePack(
      [{ ...makeItem("a", { options: [option("x")] }), count: 3 }],
      5,
    );

    expect(validate(mismatch)[0]).toContain("declares 2 steps but count 5");
    expect(validate(counterChoice)[0]).toContain("both a choice and a counter");
  });

  it("rejects duplicate or colon-bearing option ids", () => {
    const pack = makePack(
      [
        makeItem("a", { options: [option("x"), option("x")] }),
        makeItem("b", { options: [option("bad:id")] }),
      ],
      5,
    );

    const errors = validate(pack);

    expect(errors.some((e) => e.includes("duplicate option id 'x'"))).toBe(true);
    expect(errors.some((e) => e.includes("invalid id"))).toBe(true);
  });

  it("rejects effects on unknown tracker values and zero deltas", () => {
    const pack = makePack(
      [
        makeItem("a", { effects: { "date.tifa": 5 } }),
        makeItem("b", { effects: { "date.aerith": 0 } }),
      ],
      5,
      [makeTracker("date", { values: [{ id: "aerith", label: "A", start: 50 }] })],
    );

    const errors = validate(pack);

    expect(errors.some((e) => e.includes("unknown tracker value 'date.tifa'"))).toBe(true);
    expect(errors.some((e) => e.includes("invalid effect delta"))).toBe(true);
  });

  it("validates trackers: ids, values, beats", () => {
    const pack = makePack([], 5, [
      makeTracker("t", { opensAt: 9, locksAt: 2, values: [] }),
      makeTracker("t"),
      makeTracker("u", {
        values: [
          { id: "a", label: "A", start: 1 },
          { id: "a", label: "A2", start: 1.5 },
        ],
      }),
    ]);

    const errors = validate(pack);

    expect(errors.some((e) => e.includes("duplicate tracker id 't'"))).toBe(true);
    expect(errors.some((e) => e.includes("has no values"))).toBe(true);
    expect(errors.some((e) => e.includes("opensAt 9"))).toBe(true);
    expect(errors.some((e) => e.includes("duplicate value id 'a'"))).toBe(true);
    expect(errors.some((e) => e.includes("non-integer start"))).toBe(true);
  });

  it("rejects malformed references and empty tips", () => {
    const pack = {
      ...makePack([makeItem("a", { refs: [{ label: "", url: "ftp://x" }] })], 5),
    };
    pack.positions[0].tips = [" "];

    const errors = validate(pack);

    expect(errors.some((e) => e.includes("malformed reference"))).toBe(true);
    expect(errors.some((e) => e.includes("empty tip"))).toBe(true);
  });
});
