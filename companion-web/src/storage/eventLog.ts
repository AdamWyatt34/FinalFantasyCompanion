import type { ProgressEvent } from "../engine/events";

/**
 * localStorage-backed event log per game. Known trade-off: two tabs on the same
 * game can race the whole-array rewrite and drop an event — acceptable for a
 * single-user tool. Every read parses storage fresh; there is no in-memory cache.
 */
interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

const kv: KeyValueStore = (() => {
  try {
    const probe = "__ffcompanion_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return {
      get: (key) => window.localStorage.getItem(key),
      set: (key, value) => window.localStorage.setItem(key, value),
      remove: (key) => window.localStorage.removeItem(key),
      keys: () => Object.keys(window.localStorage),
    };
  } catch {
    // Blocked storage (privacy settings) or non-browser environment (tests):
    // fall back to session-only memory so the app still runs.
    const memory = new Map<string, string>();
    return {
      get: (key) => memory.get(key) ?? null,
      set: (key, value) => {
        memory.set(key, value);
      },
      remove: (key) => {
        memory.delete(key);
      },
      keys: () => [...memory.keys()],
    };
  }
})();

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

  const archiveKey = `ffcompanion.${gameId}.archive.${new Date().toISOString()}`;
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
