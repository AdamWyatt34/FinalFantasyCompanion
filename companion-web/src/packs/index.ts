import type { Item, ItemType, Pack, Position } from "../api/types";
import { validateOrThrow } from "../engine/validate";
import { kv } from "../storage/kv";

/** On-disk pack JSON shapes: nested window/theme, optional fields. */
interface RawItem {
  id: string;
  name: string;
  type: string;
  location: string;
  window: { opensAt: number; closesAt?: number | null };
  prereqs?: string[];
  excludes?: string[];
  count?: number;
  versions?: string[];
  notes?: string;
  verified?: boolean;
  route?: { at: number; rank: number; why: string } | null;
}

interface RawPack {
  game: {
    id: string;
    title: string;
    versions?: { id: string; label: string }[];
  };
  theme: { tokens: Record<string, string> };
  positions: Position[];
  items: RawItem[];
}

/** Normalizes raw pack JSON to the flattened shape the app consumes. */
export function normalizePack(raw: RawPack): Pack {
  return {
    game: raw.game,
    theme: raw.theme.tokens,
    positions: raw.positions,
    items: raw.items.map((i): Item => ({
      id: i.id,
      name: i.name,
      type: i.type as ItemType,
      location: i.location,
      opensAt: i.window.opensAt,
      closesAt: i.window.closesAt ?? null,
      prereqs: i.prereqs ?? [],
      excludes: i.excludes ?? [],
      count: i.count ?? 1,
      versions: i.versions ?? [],
      notes: i.notes ?? "",
      verified: i.verified ?? false,
      route: i.route ?? null,
    })),
  };
}

const modules = import.meta.glob<RawPack>("./*.json", {
  eager: true,
  import: "default",
});

// Natural filename sort keeps game order deterministic AND numeric: digit runs
// are zero-padded before the ordinal compare so ff4 < ff10 (plain ordinal would
// put "ff10" before "ff4"). No locale collation — stable on every browser.
const naturalKey = (file: string) =>
  file.replace(/\d+/g, (digits) => digits.padStart(6, "0"));

const packs = new Map<string, Pack>(
  Object.keys(modules)
    .sort((a, b) => {
      const ka = naturalKey(a);
      const kb = naturalKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    })
    .map((file) => {
      const pack = normalizePack(modules[file]);
      validateOrThrow(pack);
      return [pack.game.id, pack] as const;
    }),
);

export const allPacks: readonly Pack[] = [...packs.values()];

/**
 * Community packs installed at runtime — raw pack JSON persisted in storage,
 * validated exactly like the shipped ones. A broken stored pack is skipped
 * with a warning rather than taking the whole app down.
 */
const CUSTOM_KEY = "ffcompanion.customPacks";
const customPacks = new Map<string, Pack>();

(() => {
  const text = kv.get(CUSTOM_KEY);
  if (text === null) {
    return;
  }
  try {
    const stored: unknown = JSON.parse(text);
    if (stored === null || typeof stored !== "object") {
      return;
    }
    for (const [id, raw] of Object.entries(stored)) {
      try {
        const pack = normalizePack(raw as RawPack);
        validateOrThrow(pack);
        if (!packs.has(id)) {
          customPacks.set(id, pack);
        }
      } catch (e) {
        console.warn(`Skipping stored custom pack '${id}':`, e);
      }
    }
  } catch {
    console.warn("Custom pack store is corrupt; ignoring it.");
  }
})();

function persistCustomPacks(rawById: Record<string, RawPack>): void {
  if (Object.keys(rawById).length === 0) {
    kv.remove(CUSTOM_KEY);
  } else {
    kv.set(CUSTOM_KEY, JSON.stringify(rawById));
  }
}

function readStoredRaw(): Record<string, RawPack> {
  try {
    const parsed: unknown = JSON.parse(kv.get(CUSTOM_KEY) ?? "{}");
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, RawPack>)
      : {};
  } catch {
    return {};
  }
}

/** Every playable pack: shipped ones in series order, then installed ones. */
export function listPacks(): Pack[] {
  return [...packs.values(), ...customPacks.values()];
}

export function getPackById(gameId: string): Pack | undefined {
  return packs.get(gameId) ?? customPacks.get(gameId);
}

export function isCustomPack(gameId: string): boolean {
  return customPacks.has(gameId);
}

/**
 * Parses, validates, installs, and persists a pack from user-supplied JSON.
 * Throws with a readable reason on anything wrong — id collisions included.
 */
export function addCustomPack(text: string): Pack {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  const raw = parsed as Partial<RawPack>;
  if (
    raw.game === undefined ||
    typeof raw.game.id !== "string" ||
    typeof raw.game.title !== "string" ||
    !Array.isArray(raw.positions) ||
    !Array.isArray(raw.items) ||
    raw.theme === undefined ||
    raw.theme.tokens === null ||
    typeof raw.theme.tokens !== "object"
  ) {
    throw new Error(
      "That file is not a game pack — see docs/PACKS.md for the format.",
    );
  }
  if (getPackById(raw.game.id) !== undefined) {
    throw new Error(`A game with id '${raw.game.id}' already exists.`);
  }

  const pack = normalizePack(raw as RawPack);
  validateOrThrow(pack);

  // The chrome binds theme tokens by name — a pack missing tokens would
  // render with broken styling everywhere.
  const reference = allPacks[0];
  const missing = Object.keys(reference.theme).filter(
    (token) => !(token in pack.theme),
  );
  if (missing.length > 0) {
    throw new Error(`Pack theme is missing tokens: ${missing.join(", ")}`);
  }

  customPacks.set(pack.game.id, pack);
  persistCustomPacks({ ...readStoredRaw(), [pack.game.id]: raw as RawPack });
  return pack;
}

/** Uninstalls a custom pack and wipes every stored trace of its game. */
export function removeCustomPack(gameId: string): void {
  if (!customPacks.has(gameId)) {
    throw new Error(`'${gameId}' is not an installed custom pack.`);
  }
  customPacks.delete(gameId);
  const stored = readStoredRaw();
  delete stored[gameId];
  persistCustomPacks(stored);

  const prefix = `ffcompanion.${gameId}.`;
  for (const key of kv.keys().filter((k) => k.startsWith(prefix))) {
    kv.remove(key);
  }
}
