import { describe, expect, it } from "vitest";
import { classify } from "./availability";
import { fold } from "./state";
import {
  chose,
  collected,
  makeItem,
  makePack,
  uncollected,
} from "./testing/builders";

const wig = () =>
  makeItem("wig", {
    opensAt: 2,
    closesAt: 2,
    options: [
      { id: "plain", label: "Wig", best: false, note: "", effects: {} },
      { id: "dyed", label: "Dyed Wig", best: false, note: "", effects: {} },
      { id: "blonde", label: "Blonde Wig", best: true, note: "", effects: {} },
    ],
  });

describe("choice items", () => {
  it("choosing an outcome marks the item collected and records the option", () => {
    const pack = makePack([wig()]);

    const state = fold(pack, [chose("wig", "dyed")]);

    expect(state.collected.has("wig")).toBe(true);
    expect(state.choices.get("wig")).toBe("dyed");
    const entry = classify(pack.items[0], { ...state, position: 2 });
    expect(entry.status).toBe("collected");
    expect(entry.chosen).toBe("dyed");
  });

  it("an unchosen choice is classified like any other item", () => {
    const pack = makePack([wig()]);

    const entry = classify(pack.items[0], { ...fold(pack, []), position: 2 });

    expect(entry.status).toBe("lastChance");
    expect(entry.chosen).toBeNull();
  });

  it("uncollecting clears the choice too", () => {
    const pack = makePack([wig()]);

    const state = fold(pack, [chose("wig", "blonde"), uncollected("wig")]);

    expect(state.collected.has("wig")).toBe(false);
    expect(state.choices.has("wig")).toBe(false);
  });

  it("a plain itemCollected on a choice item leaves no option recorded", () => {
    // The fold is permissive (the client rejects this at the API edge); the
    // projection reports it honestly as collected-with-no-choice.
    const pack = makePack([wig()]);

    const state = fold(pack, [collected("wig")]);

    expect(state.collected.has("wig")).toBe(true);
    expect(state.choices.has("wig")).toBe(false);
  });
});
