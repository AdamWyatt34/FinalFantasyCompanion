import { describe, expect, it } from "vitest";
import { allPacks, getPackById } from "./index";

describe("shipped packs", () => {
  it("loads every pack in natural numeric order", () => {
    expect(allPacks.map((p) => p.game.id)).toEqual([
      "ff4",
      "ff6",
      "ff7",
      "ff8",
      "ff9",
      "ff10",
      "ff12",
    ]);
  });

  it("ff4 pack is structurally sound", () => {
    const ff4 = getPackById("ff4")!;

    expect(ff4.game.title).toBe("Final Fantasy IV");
    expect(ff4.positions.length).toBe(17);
    expect(ff4.items.length).toBeGreaterThanOrEqual(18);
    expect(ff4.items.length).toBeLessThanOrEqual(40);
    expect(ff4.items.every((i) => !i.verified)).toBe(true);
    // The Excalibur chain: Rat Tail → Adamantite → the forge.
    expect(ff4.items.find((i) => i.id === "adamantite")!.prereqs).toEqual([["rattail"]]);
    expect(ff4.items.find((i) => i.id === "excalibur4")!.prereqs).toEqual([["adamantite"]]);
  });

  it("ff12 pack is structurally sound", () => {
    const ff12 = getPackById("ff12")!;

    expect(ff12.game.title).toBe("Final Fantasy XII");
    // Two release variants; the spear works completely differently in each.
    expect(ff12.game.versions?.map((v) => v.id)).toEqual(["ps2", "za"]);
    expect(ff12.items.find((i) => i.id === "zodiacspear")!.versions).toEqual([
      "ps2",
    ]);
    expect(ff12.items.find((i) => i.id === "zodiacspearza")!.versions).toEqual([
      "za",
    ]);
    expect(ff12.positions.length).toBe(18);
    expect(ff12.items.length).toBeGreaterThanOrEqual(14);
    expect(ff12.items.length).toBeLessThanOrEqual(35);
    expect(ff12.items.every((i) => !i.verified)).toBe(true);
    // The most famous missable in the series: the spear requires having left
    // the four cursed chests closed.
    expect(ff12.items.find((i) => i.id === "zodiacspear")!.prereqs).toEqual([["zodiacrestraint"]]);
  });

  it("ff10 pack is structurally sound", () => {
    const ff10 = getPackById("ff10")!;

    expect(ff10.game.title).toBe("Final Fantasy X");
    expect(ff10.positions.length).toBe(18);
    expect(ff10.items.length).toBeGreaterThanOrEqual(20);
    expect(ff10.items.length).toBeLessThanOrEqual(40);
    expect([...new Set(ff10.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2, 3,
    ]);
    expect(ff10.items.every((i) => !i.verified)).toBe(true);
    // The Home primers are the pack's signature one-beat window.
    const home = ff10.items.find((i) => i.id === "primershome")!;
    expect(home.opensAt).toBe(12);
    expect(home.closesAt).toBe(12);
    // Anima requires every Destruction Sphere treasure.
    expect(ff10.items.find((i) => i.id === "anima")!.prereqs).toEqual([["destructionspheres"]]);
  });

  it("ff6 pack is structurally sound", () => {
    const ff6 = getPackById("ff6")!;

    expect(ff6.game.title).toBe("Final Fantasy VI");
    expect(ff6.positions.length).toBe(22);
    expect(ff6.items.length).toBeGreaterThanOrEqual(25);
    expect(ff6.items.length).toBeLessThanOrEqual(50);
    // Two worlds, not discs: 1 = Balance, 2 = Ruin.
    expect([...new Set(ff6.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2,
    ]);
    expect(ff6.items.every((i) => !i.verified)).toBe(true);
    // The signature chain: recruiting Shadow in the WoR requires having
    // waited for him on the Floating Continent.
    expect(ff6.items.find((i) => i.id === "shadowor")!.prereqs).toEqual([["shadowwait"]]);
    // Mutually exclusive pairs are declared on both sides.
    expect(ff6.items.find((i) => i.id === "ragnarokesper")!.excludes).toEqual([
      "lightbringer",
    ]);
    expect(ff6.items.find((i) => i.id === "lightbringer")!.excludes).toEqual([
      "ragnarokesper",
    ]);
    const wait = ff6.items.find((i) => i.id === "shadowwait")!;
    expect(wait.opensAt).toBe(12);
    expect(wait.closesAt).toBe(12);
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
    expect(ff8.items.find((i) => i.id === "eden")!.prereqs).toEqual([["bahamut8"]]);
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
    expect(ff7.items.length).toBeGreaterThanOrEqual(90);
    expect(ff7.items.length).toBeLessThanOrEqual(130);
    expect([...new Set(ff7.positions.map((p) => p.disc))].sort()).toEqual([
      1, 2, 3,
    ]);
    expect(ff7.items.every((i) => !i.verified)).toBe(true);
    expect(ff7.items.find((i) => i.id === "kotr")!.prereqs).toEqual([["goldchocobo"]]);
    expect(ff7.theme).toHaveProperty("gold");
  });

  it("ff7 pack exercises every extended-schema feature", () => {
    const ff7 = getPackById("ff7")!;
    const item = (id: string) => ff7.items.find((i) => i.id === id)!;

    // Wall Market: five choice slots feeding one outcome via option refs.
    const slots = ["wmdress", "wmwig", "wmtiara", "wmcologne", "wmunderwear"];
    for (const id of slots) {
      expect(item(id).options.length).toBeGreaterThanOrEqual(2);
      expect(item(id).options.filter((o) => o.best)).toHaveLength(1);
    }
    expect(item("wmcorneo").prereqs.flat()).toEqual([
      "wmdress:silk",
      "wmwig:blonde",
      "wmtiara:diamond",
      "wmcologne:sexy",
      "wmunderwear:lingerie",
    ]);

    // The date tracker starts at the game's own values.
    expect(ff7.trackers.map((t) => t.id)).toEqual(["date"]);
    expect(ff7.trackers[0].values.map((v) => `${v.id}:${v.start}`)).toEqual([
      "aerith:50",
      "tifa:30",
      "yuffie:10",
      "barret:0",
    ]);
    expect(ff7.trackers[0].locksAt).toBe(10);

    // Reopening windows: Elemental comes back during the raid.
    expect(item("elemental").windows).toEqual([
      { opensAt: 3, closesAt: 3 },
      { opensAt: 19, closesAt: 19 },
    ]);

    // Any-of prereqs: the caves need the right bird; the gold has two routes.
    expect(item("mime").prereqs).toEqual([["blackchocobo", "goldchocobo"]]);
    expect(item("goldchocobo").prereqs).toEqual([
      ["racing3", "desertrose"],
      ["zeionut", "desertrose"],
    ]);

    // Legs, tradeoffs, steps, party, tips.
    expect(item("bluechocobo").route!.leg).toContain("leg 2");
    expect(item("chocobolure").route!.tradeoff).not.toBeNull();
    expect(item("deathpenalty").steps).toHaveLength(3);
    expect(item("deathpenalty").count).toBe(3);
    expect(item("missingscore").party).toEqual(["Barret"]);
    expect(item("guidebook").prereqs).toEqual([["morph"]]);
    expect(ff7.positions.every((p) => p.tips.length > 0)).toBe(true);
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
    expect(ff9.items.find((i) => i.id === "ozma")!.prereqs).toEqual([["airgarden"]]);
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
