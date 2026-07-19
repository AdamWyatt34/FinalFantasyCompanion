import type { Pack } from "../api/types";
import type { ProgressEvent } from "../engine/events";
import { readEvents, replaceLog } from "./eventLog";

/**
 * Save export/import — localStorage is user-clearable, so saves need a way
 * out of the browser (backup, or moving between phone and desktop).
 */
export interface SaveFile {
  format: "ffcompanion-save";
  version: 1;
  gameId: string;
  exportedAt: string;
  events: ProgressEvent[];
}

export function exportSave(gameId: string): SaveFile {
  return {
    format: "ffcompanion-save",
    version: 1,
    gameId,
    exportedAt: new Date().toISOString(),
    events: readEvents(gameId),
  };
}

export function downloadSave(gameId: string): void {
  const save = exportSave(gameId);
  const blob = new Blob([JSON.stringify(save, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${gameId}-save-${save.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Parses and shape-checks a save file without touching any game's log. */
export function parseSave(text: string): SaveFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  const save = parsed as Partial<SaveFile>;
  if (
    save.format !== "ffcompanion-save" ||
    typeof save.gameId !== "string" ||
    !Array.isArray(save.events)
  ) {
    throw new Error("That file is not an FF Companion save.");
  }
  return save as SaveFile;
}

/**
 * Validates a parsed save against a pack and installs it. Throws with a
 * human-readable reason on any mismatch — installing an ff7 save into ff9 must
 * fail loudly, because the fold would silently tolerate the foreign item ids.
 */
export function installSave(pack: Pack, save: SaveFile): void {
  if (save.gameId !== pack.game.id) {
    throw new Error(
      `That save belongs to '${save.gameId}', but the active game is '${pack.game.id}'.`,
    );
  }

  const orders = new Set(pack.positions.map((p) => p.order));
  const itemIds = new Set(pack.items.map((i) => i.id));

  for (const raw of save.events as unknown[]) {
    // Guard the shape before touching .type — a hand-edited file with a null
    // or non-object element must produce a readable error, not a TypeError.
    if (raw === null || typeof raw !== "object") {
      throw new Error("Save contains a malformed event.");
    }
    const evt = raw as ProgressEvent;
    switch (evt.type) {
      case "positionAdvanced":
      case "positionCorrected":
        if (!orders.has(evt.to)) {
          throw new Error(`Save references unknown story position ${evt.to}.`);
        }
        break;
      case "itemCollected":
      case "itemUncollected":
        if (!itemIds.has(evt.itemId)) {
          throw new Error(`Save references unknown item '${evt.itemId}'.`);
        }
        break;
      default:
        throw new Error(`Save contains an unknown event type.`);
    }
  }

  replaceLog(pack.game.id, save.events as ProgressEvent[]);
}

/** Parse + install in one step, for when the active game is the only target. */
export function importSave(pack: Pack, text: string): void {
  installSave(pack, parseSave(text));
}
