import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../api/client";
import { getPackById } from "../packs";
import { exportSave, importSave, installSave, parseSave } from "./saveFile";

const ff7 = () => getPackById("ff7")!;
const ff9 = () => getPackById("ff9")!;

beforeEach(async () => {
  await api.postReset("ff7");
  await api.postReset("ff9");
});

describe("save export/import", () => {
  it("round-trips a save: export, reset, import restores state", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });
    await api.postEvent("ff7", { type: "itemCollected", itemId: "beta" });

    const save = exportSave("ff7");
    expect(save.format).toBe("ffcompanion-save");
    expect(save.gameId).toBe("ff7");
    expect(save.events).toHaveLength(2);

    await api.postReset("ff7");
    expect((await api.getAvailability("ff7")).position).toBe(1);

    importSave(ff7(), JSON.stringify(save));

    const availability = await api.getAvailability("ff7");
    expect(availability.position).toBe(5);
    expect(availability.items.find((e) => e.item.id === "beta")!.status).toBe(
      "collected",
    );
  });

  it("rejects a save for a different game", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });
    const save = exportSave("ff7");

    expect(() => importSave(ff9(), JSON.stringify(save))).toThrow(
      "That save belongs to 'ff7', but the active game is 'ff9'.",
    );
  });

  it("parseSave + installSave supports installing into the save's own game", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });
    const text = JSON.stringify(exportSave("ff7"));
    await api.postReset("ff7");

    // What the app does on a cross-game import: parse, look up the pack, install.
    const save = parseSave(text);
    expect(save.gameId).toBe("ff7");
    installSave(getPackById(save.gameId)!, save);

    expect((await api.getAvailability("ff7")).position).toBe(5);
  });

  it("rejects a file that is not a save", () => {
    expect(() => importSave(ff7(), "not json")).toThrow("not valid JSON");
    expect(() => importSave(ff7(), JSON.stringify({ hello: "world" }))).toThrow(
      "not an FF Companion save",
    );
  });

  it("rejects malformed event entries with a readable error", () => {
    const bad = {
      format: "ffcompanion-save",
      version: 1,
      gameId: "ff7",
      exportedAt: "2026-07-05T12:00:00.000Z",
      events: [null],
    };

    expect(() => importSave(ff7(), JSON.stringify(bad))).toThrow(
      "malformed event",
    );
  });

  it("rejects a save referencing unknown items or positions", () => {
    const bad = {
      format: "ffcompanion-save",
      version: 1,
      gameId: "ff7",
      exportedAt: "2026-07-05T12:00:00.000Z",
      events: [
        {
          type: "itemCollected",
          itemId: "ghost",
          occurredAt: "2026-07-05T12:00:00.000Z",
        },
      ],
    };

    expect(() => importSave(ff7(), JSON.stringify(bad))).toThrow(
      "unknown item 'ghost'",
    );
  });
});
