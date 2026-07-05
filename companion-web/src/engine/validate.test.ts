import { describe, expect, it } from "vitest";
import { PackValidationError, validate, validateOrThrow } from "./validate";
import { makeItem, makePack, makePositions } from "./testing/builders";

describe("pack validation", () => {
  it("valid pack has no errors", () => {
    const pack = makePack(
      [
        makeItem("a", { opensAt: 1, closesAt: 3 }),
        makeItem("b", {
          opensAt: 2,
          prereqs: ["a"],
          route: { at: 2, rank: 0, why: "w" },
        }),
      ],
      5,
    );

    expect(validate(pack)).toEqual([]);
    expect(() => validateOrThrow(pack)).not.toThrow();
  });

  it("unknown prereq id is reported", () => {
    const pack = makePack([makeItem("a", { prereqs: ["ghost"] })], 5);

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("unknown prereq 'ghost'");
  });

  it("direct prereq cycle is reported", () => {
    const pack = makePack(
      [makeItem("a", { prereqs: ["b"] }), makeItem("b", { prereqs: ["a"] })],
      5,
    );

    const errors = validate(pack);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("prereq cycle");
  });

  it("transitive prereq cycle is reported", () => {
    const pack = makePack(
      [
        makeItem("a", { prereqs: ["c"] }),
        makeItem("b", { prereqs: ["a"] }),
        makeItem("c", { prereqs: ["b"] }),
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
      [makeItem("a", { route: { at: 9, rank: 0, why: "w" } })],
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

  it("all errors are collected, not just the first", () => {
    const pack = makePack(
      [makeItem("a", { opensAt: 9, prereqs: ["ghost"] })],
      3,
    );

    expect(validate(pack)).toHaveLength(2);
  });

  it("validateOrThrow lists every error in the message", () => {
    const pack = makePack(
      [makeItem("a", { opensAt: 9, prereqs: ["ghost"] })],
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
