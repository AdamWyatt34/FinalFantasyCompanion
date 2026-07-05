import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../api/client";
import {
  deleteArchive,
  listArchives,
  readEvents,
  restoreArchive,
} from "./eventLog";

beforeEach(async () => {
  // Clear active logs and any archives left by earlier tests (memory store persists per file run).
  for (const gameId of ["ff7", "ff9"]) {
    await api.postReset(gameId);
    for (const archive of listArchives(gameId)) {
      deleteArchive(gameId, archive.key);
    }
  }
});

describe("playthrough archives", () => {
  it("reset creates an archive that listArchives can see", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });
    await api.postReset("ff7");

    const archives = listArchives("ff7");

    expect(archives).toHaveLength(1);
    expect(archives[0].events).toHaveLength(1);
    expect(archives[0].key).toContain("ffcompanion.ff7.archive.");
  });

  it("archives are per game", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });
    await api.postReset("ff7");

    expect(listArchives("ff9")).toHaveLength(0);
  });

  it("restore makes the archive active and archives the current run", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });
    await api.postReset("ff7");
    const [oldRun] = listArchives("ff7");

    await api.postEvent("ff7", { type: "positionAdvanced", to: 2 });
    restoreArchive("ff7", oldRun.key);

    expect((await api.getAvailability("ff7")).position).toBe(5);
    // The interrupted run (beat 2) became an archive; the restored one was consumed.
    const archives = listArchives("ff7");
    expect(archives).toHaveLength(1);
    expect(archives[0].key).not.toBe(oldRun.key);
    expect(archives[0].events).toEqual([
      expect.objectContaining({ type: "positionAdvanced", to: 2 }),
    ]);
  });

  it("restoring a fresh (empty) run does not create a junk archive", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 5 });
    await api.postReset("ff7");
    const [archive] = listArchives("ff7");

    restoreArchive("ff7", archive.key);

    expect(listArchives("ff7")).toHaveLength(0);
    expect(readEvents("ff7")).toHaveLength(1);
  });

  it("delete removes an archive permanently", async () => {
    await api.postEvent("ff7", { type: "positionAdvanced", to: 3 });
    await api.postReset("ff7");
    const [archive] = listArchives("ff7");

    deleteArchive("ff7", archive.key);

    expect(listArchives("ff7")).toHaveLength(0);
  });

  it("refuses to restore or delete keys outside the game's archive namespace", () => {
    expect(() => restoreArchive("ff7", "ffcompanion.ff9.archive.x")).toThrow(
      "Not an archive of this game.",
    );
    expect(() => deleteArchive("ff7", "some.random.key")).toThrow(
      "Not an archive of this game.",
    );
  });
});
