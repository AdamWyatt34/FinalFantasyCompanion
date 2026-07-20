import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./client";

// The storage layer falls back to an in-memory map under node; reset between
// tests keeps each scenario isolated (reset archives and clears the active log).
beforeEach(async () => {
  await api.postReset("ff7");
  await api.postReset("ff9");
});

describe("local client", () => {
  it("lists every game in series order", async () => {
    const games = await api.getGames();

    expect(games.map((g) => g.id)).toEqual([
      "ff4",
      "ff6",
      "ff7",
      "ff8",
      "ff9",
      "ff10",
      "ff12",
    ]);
  });

  it("rejects an unknown game", async () => {
    await expect(api.getAvailability("nope")).rejects.toThrow(
      "Unknown game 'nope'",
    );
  });

  it("rejects an unknown item id", async () => {
    await expect(
      api.postEvent("ff7", { type: "itemCollected", itemId: "ghost" }),
    ).rejects.toThrow("Unknown item id 'ghost'");
  });

  it("rejects an unknown position order", async () => {
    await expect(
      api.postEvent("ff7", { type: "positionAdvanced", to: 99 }),
    ).rejects.toThrow("No story position with order 99");
  });

  it("rejects an unknown event type", async () => {
    await expect(
      api.postEvent("ff7", { type: "teleported", to: 2 }),
    ).rejects.toThrow("Unknown event type 'teleported'");
  });

  it("itemProgressed advances a counter and completes it at the target", async () => {
    // ff9's stellazzio coins are a 12-count counter item.
    await api.postEvent("ff9", {
      type: "itemProgressed",
      itemId: "stellazzio",
      delta: 11,
    });
    let availability = await api.getAvailability("ff9");
    let entry = availability.items.find((e) => e.item.id === "stellazzio")!;
    expect(entry.progress).toBe(11);
    expect(entry.status).not.toBe("collected");

    await api.postEvent("ff9", {
      type: "itemProgressed",
      itemId: "stellazzio",
      delta: 1,
    });
    availability = await api.getAvailability("ff9");
    entry = availability.items.find((e) => e.item.id === "stellazzio")!;
    expect(entry.progress).toBe(12);
    expect(entry.status).toBe("collected");
  });

  it("rejects itemProgressed on a non-counter item and zero deltas", async () => {
    await expect(
      api.postEvent("ff7", {
        type: "itemProgressed",
        itemId: "kotr",
        delta: 1,
      }),
    ).rejects.toThrow("not a counter item");
    await expect(
      api.postEvent("ff9", {
        type: "itemProgressed",
        itemId: "stellazzio",
        delta: 0,
      }),
    ).rejects.toThrow("non-zero integer");
  });

  it("version selection swaps version-specific items", async () => {
    // ff12 defaults to the PS2 original: the cursed-chest pact exists,
    // the Zodiac Age spear chest does not.
    let ids = (await api.getAvailability("ff12")).items.map((e) => e.item.id);
    expect(ids).toContain("zodiacrestraint");
    expect(ids).not.toContain("zodiacspearza");

    await api.postEvent("ff12", { type: "versionSelected", version: "za" });

    ids = (await api.getAvailability("ff12")).items.map((e) => e.item.id);
    expect(ids).toContain("zodiacspearza");
    expect(ids).not.toContain("zodiacrestraint");

    await api.postReset("ff12");
  });

  it("rejects version selection on single-version games and unknown versions", async () => {
    await expect(
      api.postEvent("ff7", { type: "versionSelected", version: "hd" }),
    ).rejects.toThrow("does not have selectable versions");
    await expect(
      api.postEvent("ff12", { type: "versionSelected", version: "switch" }),
    ).rejects.toThrow("Unknown game version 'switch'");
  });

  it("undo removes exactly the newest event", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });
    await api.postEvent("ff7", { type: "itemCollected", itemId: "beta" });

    const after = await api.postUndo("ff7");

    expect(after.position).toBe(3);
    expect(after.collected).toEqual([]);
    expect(await api.getEvents("ff7")).toHaveLength(1);
  });

  it("undo on an empty log is a no-op", async () => {
    const after = await api.postUndo("ff7");

    expect(after.position).toBe(1);
    expect(await api.getEvents("ff7")).toHaveLength(0);
  });

  it("collecting an item flips it to collected and returns the snapshot", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 2 });
    const snapshot = await api.postEvent("ff7", {
      type: "itemCollected",
      itemId: "flyer1",
    });

    expect(snapshot.position).toBe(2);
    expect(snapshot.collected).toEqual(["flyer1"]);

    const availability = await api.getAvailability("ff7");
    const flyer = availability.items.find((e) => e.item.id === "flyer1")!;
    expect(flyer.status).toBe("collected");
  });

  it("games are isolated: ff7 progress never leaks into ff9", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });

    expect((await api.getAvailability("ff9")).position).toBe(1);
  });

  it("reset archives the log and starts fresh; resetting fresh state returns null", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });

    const reset = await api.postReset("ff7");
    expect(reset.position).toBe(1);
    expect(reset.archivedTo).toContain("ffcompanion.ff7.archive.");

    const again = await api.postReset("ff7");
    expect(again.archivedTo).toBeNull();
  });

  it("plays the demo script end to end", async () => {
    // Play through Midgar to Shinra HQ.
    await api.postEvent("ff7", { type: "positionAdvanced", to: 2 });
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });

    // Advancing out of Midgar fires the point-of-no-return warning.
    const impact = await api.getAdvanceImpact("ff7", 4);
    expect(impact.closing.map((e) => e.item.id).sort()).toEqual([
      "elemental",
      "enemyskill1",
      "flyer1",
    ]);

    // Jump straight to the Disc 2 Highwind beat.
    await api.postEvent("ff7", { type: "positionAdvanced", to: 15 });

    // The route's Now bucket carries the curated chocobo chain, KotR blocked at the end.
    const route = await api.getRoute("ff7");
    const chain = [
      "highwind",
      "chocobolure",
      "stables",
      "carobnuts",
      "goodchocobo",
      "greatchocobo",
      "racing1",
      "bluechocobo",
      "greenchocobo",
      "racing2",
      "blackchocobo",
      "racing3",
      "zeionut",
      "goldchocobo",
      "kotr",
    ];
    const nowIds = route.now.map((e) => e.item.id);
    for (const link of chain) {
      expect(nowIds).toContain(link);
    }

    const kotr = route.now.find((e) => e.item.id === "kotr")!;
    expect(kotr.status).toBe("blocked");
    expect(kotr.missingPrereqs).toEqual(["goldchocobo"]);
    expect(kotr.item.route!.why).toBe("The whole point of the gold bird");

    // Collect the chain; KotR flips to available.
    for (const link of chain.filter((id) => id !== "kotr")) {
      await api.postEvent("ff7", { type: "itemCollected", itemId: link });
    }

    const after = await api.getRoute("ff7");
    expect(after.now.find((e) => e.item.id === "kotr")!.status).toBe(
      "available",
    );
  });

  it("masks Disc 2 spoilers while still in Midgar", async () => {
    const route = await api.getRoute("ff7");

    const kotr = route.later.find((e) => e.item.id === "kotr")!;
    expect(kotr.masked).toBe(true);
  });
});
