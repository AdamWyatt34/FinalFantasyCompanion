import type { ProgressEvent } from "../engine/events";
import { kv } from "./kv";

/**
 * localStorage-backed event log per game. Known trade-off: two tabs on the same
 * game can race the whole-array rewrite and drop an event — acceptable for a
 * single-user tool. Every read parses storage fresh; there is no in-memory cache.
 */

const activeKey = (gameId: string) => `ffcompanion.${gameId}.events`;

export function readEvents(gameId: string): ProgressEvent[] {
  const text = kv.get(activeKey(gameId));
  if (text === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("event log is not an array");
    }
    return parsed as ProgressEvent[];
  } catch {
    // Quarantine rather than dead-end: the user has no other way to recover.
    const quarantineKey = `ffcompanion.${gameId}.corrupt.${new Date().toISOString()}`;
    kv.set(quarantineKey, text);
    kv.remove(activeKey(gameId));
    console.warn(
      `Corrupt event log for '${gameId}' moved to ${quarantineKey}; starting fresh.`,
    );
    return [];
  }
}

export function appendEvent(gameId: string, evt: ProgressEvent): void {
  const events = readEvents(gameId);
  events.push(evt);
  kv.set(activeKey(gameId), JSON.stringify(events));
}

/** Archives the current log and starts fresh. Returns the archive key, or null if the log was empty. */
export function resetLog(gameId: string): string | null {
  const text = kv.get(activeKey(gameId));
  if (text === null) {
    return null;
  }

  // Suffix on collision — two resets in the same millisecond must not
  // overwrite each other's archives (restore + reset can race the clock).
  const base = `ffcompanion.${gameId}.archive.${new Date().toISOString()}`;
  let archiveKey = base;
  for (let n = 2; kv.get(archiveKey) !== null; n++) {
    archiveKey = `${base}-${n}`;
  }

  kv.set(archiveKey, text);
  kv.remove(activeKey(gameId));
  return archiveKey;
}

/** Replaces the whole log — used by save import. */
export function replaceLog(
  gameId: string,
  events: readonly ProgressEvent[],
): void {
  kv.set(activeKey(gameId), JSON.stringify(events));
}

export interface ArchiveInfo {
  key: string;
  archivedAt: string;
  events: ProgressEvent[];
}

const archivePrefix = (gameId: string) => `ffcompanion.${gameId}.archive.`;

/** All archived playthroughs for a game, newest first. Unparseable archives are skipped. */
export function listArchives(gameId: string): ArchiveInfo[] {
  const prefix = archivePrefix(gameId);
  return kv
    .keys()
    .filter((key) => key.startsWith(prefix))
    .sort()
    .reverse()
    .flatMap((key) => {
      try {
        const parsed: unknown = JSON.parse(kv.get(key) ?? "");
        if (!Array.isArray(parsed)) {
          return [];
        }
        return [
          {
            key,
            archivedAt: key.slice(prefix.length),
            events: parsed as ProgressEvent[],
          },
        ];
      } catch {
        return [];
      }
    });
}

/**
 * Makes an archived playthrough the active one. The current run is archived
 * first, so restoring never destroys anything; the restored archive entry is
 * consumed (moved, not copied).
 */
export function restoreArchive(gameId: string, archiveKey: string): void {
  if (!archiveKey.startsWith(archivePrefix(gameId))) {
    throw new Error("Not an archive of this game.");
  }
  const text = kv.get(archiveKey);
  if (text === null) {
    throw new Error("That archive no longer exists.");
  }

  resetLog(gameId);
  kv.set(activeKey(gameId), text);
  kv.remove(archiveKey);
}

export function deleteArchive(gameId: string, archiveKey: string): void {
  if (!archiveKey.startsWith(archivePrefix(gameId))) {
    throw new Error("Not an archive of this game.");
  }
  kv.remove(archiveKey);
}
