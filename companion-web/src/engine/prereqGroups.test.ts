import { describe, expect, it } from "vitest";
import { classify, missingPrereqGroups, refSatisfied } from "./availability";
import { fold } from "./state";
import { at, chose, makeItem, makePack } from "./testing/builders";

/** FF7's Mime cave: any river-capable bird gets you there. */
const mime = () =>
  makeItem("mime", {
    prereqs: [["bluechocobo", "blackchocobo", "goldchocobo"]],
  });

describe("any-of prereq groups", () => {
  it("one satisfied ref satisfies the whole group", () => {
    expect(classify(mime(), at(5, "blackchocobo")).status).toBe("available");
  });

  it("an unsatisfied group is reported whole, so the UI can say 'A, B or C'", () => {
    const entry = classify(mime(), at(5));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual([
      ["bluechocobo", "blackchocobo", "goldchocobo"],
    ]);
  });

  it("groups are ANDed: every group must have a satisfied member", () => {
    const item = makeItem("x", { prereqs: [["a", "b"], ["c"]] });

    expect(missingPrereqGroups(item, at(1, "a"))).toEqual([["c"]]);
    expect(missingPrereqGroups(item, at(1, "c"))).toEqual([["a", "b"]]);
    expect(missingPrereqGroups(item, at(1, "b", "c"))).toEqual([]);
  });

  it("plain prereqs are singleton groups", () => {
    const item = makeItem("x", { prereqs: [["a"], ["b"]] });

    const entry = classify(item, at(1, "a"));

    expect(entry.status).toBe("blocked");
    expect(entry.missingPrereqs).toEqual([["b"]]);
  });
});

describe("option refs (`item:option`)", () => {
  const dress = () =>
    makeItem("dress", {
      options: [
        { id: "cotton", label: "Cotton", best: false, note: "", effects: {} },
        { id: "silk", label: "Silk", best: true, note: "", effects: {} },
      ],
    });

  it("is satisfied only by the named option being chosen", () => {
    const pack = makePack([dress()]);

    expect(refSatisfied("dress:silk", fold(pack, [chose("dress", "silk")]))).toBe(
      true,
    );
    expect(
      refSatisfied("dress:silk", fold(pack, [chose("dress", "cotton")])),
    ).toBe(false);
    expect(refSatisfied("dress:silk", fold(pack, []))).toBe(false);
  });

  it("an outcome item stays blocked until the right outcome is picked", () => {
    const pack = makePack([
      dress(),
      makeItem("corneo", { prereqs: [["dress:silk"]] }),
    ]);
    const corneo = pack.items[1];

    const wrong = classify(corneo, fold(pack, [chose("dress", "cotton")]));
    expect(wrong.status).toBe("blocked");
    expect(wrong.missingPrereqs).toEqual([["dress:silk"]]);

    const right = classify(corneo, fold(pack, [chose("dress", "silk")]));
    expect(right.status).toBe("available");
  });

  it("re-picking replaces the earlier choice", () => {
    const pack = makePack([dress()]);

    const state = fold(pack, [chose("dress", "cotton"), chose("dress", "silk")]);

    expect(state.choices.get("dress")).toBe("silk");
    expect(refSatisfied("dress:silk", state)).toBe(true);
  });
});
