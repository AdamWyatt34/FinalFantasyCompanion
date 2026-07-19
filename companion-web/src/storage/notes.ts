import { kv } from "./kv";

/**
 * Personal per-item annotations ("got the Ziedrich here"). Deliberately NOT
 * part of the event log: notes are knowledge about the game, not progress —
 * they survive "New playthrough" and travel with save export/import.
 */
const notesKey = (gameId: string) => `ffcompanion.${gameId}.notes`;

export function readNotes(gameId: string): Record<string, string> {
  const text = kv.get(notesKey(gameId));
  if (text === null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/** Empty or whitespace-only text removes the note. */
export function writeNote(gameId: string, itemId: string, text: string): void {
  const notes = readNotes(gameId);
  const trimmed = text.trim();
  if (trimmed === "") {
    delete notes[itemId];
  } else {
    notes[itemId] = trimmed;
  }

  if (Object.keys(notes).length === 0) {
    kv.remove(notesKey(gameId));
  } else {
    kv.set(notesKey(gameId), JSON.stringify(notes));
  }
}
