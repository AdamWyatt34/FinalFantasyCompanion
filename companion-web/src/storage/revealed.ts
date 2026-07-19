import { kv } from "./kv";

/**
 * Ids the player chose to reveal despite spoiler masking. Deliberate clicks —
 * losing them on every refresh would force re-revealing the same spoilers.
 */
const revealedKey = (gameId: string) => `ffcompanion.${gameId}.revealed`;

export function readRevealed(gameId: string): Set<string> {
  const text = kv.get(revealedKey(gameId));
  if (text === null) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function writeRevealed(
  gameId: string,
  revealed: ReadonlySet<string>,
): void {
  if (revealed.size === 0) {
    kv.remove(revealedKey(gameId));
  } else {
    kv.set(revealedKey(gameId), JSON.stringify([...revealed]));
  }
}
