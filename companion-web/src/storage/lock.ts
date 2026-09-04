/**
 * Serializes read-modify-write of a game's log across tabs of the same
 * origin via the Web Locks API. Where the API is missing (tests, old
 * browsers) the callback simply runs — the documented single-tab trade-off.
 */
export async function withLock<T>(
  name: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const locks =
    typeof navigator !== "undefined" && "locks" in navigator
      ? navigator.locks
      : undefined;
  if (locks === undefined) {
    return fn();
  }
  return locks.request(name, async () => fn()) as Promise<T>;
}
