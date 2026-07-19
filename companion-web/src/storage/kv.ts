/**
 * localStorage adapter with an in-memory fallback for blocked storage
 * (privacy settings) or non-browser environments (tests). Shared by every
 * storage module so they all read and write the same store.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export const kv: KeyValueStore = (() => {
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
