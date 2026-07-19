import { describe, expect, it } from "vitest";
import { allPacks, getPackById } from "./index";

describe("shipped packs", () => {
  it("loads every pack in natural numeric order", () => {
    expect(allPacks.map((p) => p.game.id)).toEqual(["ff7", "ff8", "ff9"]);
  });

  it("ff8 pack is structurally sound", () => {
    const ff8 = getPackById("ff8")!;

    expect(ff8.game.title).toBe("Final Fantasy VIII");
    expect(ff8.positions.length).toBe(20);
    expect(ff8.items.length).toBeGreaterThanOrEqual(30);
    expect(ff8.items.length).toBeLessThanOrEqual(60);
    expect([...new Set(ff8.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2, 3, 4,
    ]);
    expect(ff8.items.every((i) => !i.verified)).toBe(true);
    // Signature chain: Eden's draw requires reaching Bahamut's dig first.
    expect(ff8.items.find((i) => i.id === "eden")!.prereqs).toEqual([
      "bahamut8",
    ]);
    // The disc-4 world lock: most windows close at beat 18.
    expect(
      ff8.items.filter((i) => i.closesAt === 18).length,
    ).toBeGreaterThanOrEqual(15);
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
