import { afterEach, describe, expect, it } from "vitest";
import { kv } from "../storage/kv";
import {
  addCustomPack,
  getPackById,
  isCustomPack,
  listPacks,
  removeCustomPack,
} from "./index";

const makeRawPack = (id: string) => ({
  game: { id, title: "Chrono Trigger" },
  theme: {
    tokens: Object.fromEntries(
      Object.keys(getPackById("ff7")!.theme).map((k) => [k, "#123456"]),
    ),
  },
  positions: [
    { id: "start", order: 1, label: "Millennial Fair", disc: 1 },
    { id: "end", order: 2, label: "Lavos", disc: 1 },
  ],
  items: [
    {
      id: "lucca",
      name: "Lucca's Gun Show",
      type: "quest",
      location: "Fair",
      window: { opensAt: 1, closesAt: 1 },
    },
  ],
});

afterEach(() => {
  for (const pack of listPacks().filter((p) => isCustomPack(p.game.id))) {
    removeCustomPack(pack.game.id);
  }
});

describe("runtime custom packs", () => {
  it("installs a valid pack, playable through the client surface", () => {
    const pack = addCustomPack(JSON.stringify(makeRawPack("ct")));

    expect(pack.game.title).toBe("Chrono Trigger");
    expect(getPackById("ct")).toBeDefined();
    expect(listPacks().map((p) => p.game.id)).toContain("ct");
    expect(isCustomPack("ct")).toBe(true);
    expect(isCustomPack("ff7")).toBe(false);
    // Persisted for the next session.
    expect(kv.get("ffcompanion.customPacks")).toContain("Chrono Trigger");
  });

  it("rejects invalid JSON, wrong shapes, and id collisions", () => {
    expect(() => addCustomPack("{nope")).toThrow("not valid JSON");
    expect(() => addCustomPack(JSON.stringify({ hello: 1 }))).toThrow(
      "not a game pack",
    );
    expect(() => addCustomPack(JSON.stringify(makeRawPack("ff7")))).toThrow(
      "already exists",
    );
  });

  it("rejects a pack that fails engine validation", () => {
    const raw = makeRawPack("bad");
    raw.items[0].window = { opensAt: 9, closesAt: 9 };

    expect(() => addCustomPack(JSON.stringify(raw))).toThrow(
      "missing position order",
    );
  });

  it("rejects a pack missing theme tokens", () => {
    const raw = makeRawPack("plain");
    raw.theme = { tokens: { gold: "#fff" } };

    expect(() => addCustomPack(JSON.stringify(raw))).toThrow("missing tokens");
  });

  it("removal uninstalls the pack and wipes its stored data", () => {
    addCustomPack(JSON.stringify(makeRawPack("ct")));
    kv.set("ffcompanion.ct.events", "[]");
    kv.set("ffcompanion.ct.notes", "{}");

    removeCustomPack("ct");

    expect(getPackById("ct")).toBeUndefined();
    expect(kv.get("ffcompanion.ct.events")).toBeNull();
    expect(kv.get("ffcompanion.ct.notes")).toBeNull();
    expect(kv.get("ffcompanion.customPacks")).toBeNull();
  });
});
