import { describe, expect, it } from "vitest";
import { allPacks, getPackById } from "./index";

describe("shipped packs", () => {
  it("loads both packs, ff7 first (ordinal filename order)", () => {
    expect(allPacks.map((p) => p.game.id)).toEqual(["ff7", "ff9"]);
  });

  it("ff7 pack is structurally sound", () => {
    const ff7 = getPackById("ff7")!;

    expect(ff7.game.title).toBe("Final Fantasy VII");
    expect(ff7.positions.length).toBeGreaterThanOrEqual(20);
    expect(ff7.positions.length).toBeLessThanOrEqual(24);
    expect(ff7.items.length).toBeGreaterThanOrEqual(70);
    expect(ff7.items.length).toBeLessThanOrEqual(100);
    expect([...new Set(ff7.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2, 3,
    ]);
    expect(ff7.items.every((i) => !i.verified)).toBe(true);
    expect(ff7.items.find((i) => i.id === "kotr")!.prereqs).toEqual([
      "goldchocobo",
    ]);
    expect(ff7.theme).toHaveProperty("gold");
  });

  it("ff9 pack is structurally sound", () => {
    const ff9 = getPackById("ff9")!;

    expect(ff9.game.title).toBe("Final Fantasy IX");
    expect(ff9.positions.length).toBeGreaterThanOrEqual(20);
    expect(ff9.positions.length).toBeLessThanOrEqual(24);
    expect(ff9.items.length).toBeGreaterThanOrEqual(50);
    expect(ff9.items.length).toBeLessThanOrEqual(80);
    expect([...new Set(ff9.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2, 3, 4,
    ]);
    expect(ff9.items.every((i) => !i.verified)).toBe(true);
    expect(ff9.items.find((i) => i.id === "ozma")!.prereqs).toEqual([
      "airgarden",
    ]);
  });

  it("all packs define the same theme token names — the frontend binds --ff-* by name", () => {
    const [reference, ...rest] = allPacks;
    const referenceKeys = Object.keys(reference.theme).sort();

    for (const pack of rest) {
      expect(Object.keys(pack.theme).sort()).toEqual(referenceKeys);
    }
  });

  it("normalization fills defaults: absent closesAt/route become null, prereqs an array", () => {
    for (const pack of allPacks) {
      for (const item of pack.items) {
        expect(
          item.closesAt === null || typeof item.closesAt === "number",
        ).toBe(true);
        expect(Array.isArray(item.prereqs)).toBe(true);
        expect(item.route === null || typeof item.route.at === "number").toBe(
          true,
        );
      }
    }
  });
});
