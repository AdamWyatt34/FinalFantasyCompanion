import type {
  ChoiceOption,
  Item,
  ItemType,
  Pack,
  Position,
  PrereqGroup,
  Reference,
  Tracker,
  Window,
} from "../api/types";
import { validateOrThrow } from "../engine/validate";
import { kv } from "../storage/kv";

/** On-disk pack JSON shapes: nested window/theme, optional fields. */
interface RawWindow {
  opensAt: number;
  closesAt?: number | null;
}

interface RawOption {
  id: string;
  label: string;
  best?: boolean;
  note?: string;
  effects?: Record<string, number>;
}

interface RawItem {
  id: string;
  name: string;
  type: string;
  location: string;
  /** Single window — the common case. */
  window?: RawWindow;
  /** Several windows for items that close and reopen; wins over `window`. */
  windows?: RawWindow[];
  /** A string is a plain requirement; an inner array is an any-of group. */
  prereqs?: (string | string[])[];
  excludes?: string[];
  count?: number;
  steps?: string[];
  options?: RawOption[];
  party?: string[];
  effects?: Record<string, number>;
  refs?: Reference[];
  versions?: string[];
  notes?: string;
  verified?: boolean;
  route?: {
    at: number;
    rank: number;
    why: string;
    leg?: string | null;
    tradeoff?: string | null;
  } | null;
}

interface RawPosition {
  id: string;
  order: number;
  label: string;
  disc: number;
  tips?: string[];
  pace?: string | null;
}

interface RawTracker {
  id: string;
  name: string;
  window?: { opensAt: number; locksAt?: number | null };
  notes?: string;
  values: { id: string; label: string; start?: number }[];
  verified?: boolean;
}

interface RawPack {
  game: {
    id: string;
    title: string;
    versions?: { id: string; label: string }[];
  };
  theme: { tokens: Record<string, string> };
  positions: RawPosition[];
  items: RawItem[];
  trackers?: RawTracker[];
}

const asArray = <T>(value: T[] | undefined | null): T[] =>
  Array.isArray(value) ? value : [];

const asRecord = (value: unknown): Record<string, number> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {};

function normalizeWindows(raw: RawItem): Window[] {
  const source =
    Array.isArray(raw.windows) && raw.windows.length > 0
      ? raw.windows
      : raw.window !== undefined
        ? [raw.window]
        : [];
  return source.map((w) => ({ opensAt: w.opensAt, closesAt: w.closesAt ?? null }));
}

function normalizePrereqs(raw: RawItem): PrereqGroup[] {
  return asArray(raw.prereqs).map((entry) =>
    Array.isArray(entry) ? [...entry] : [entry],
  );
}

function normalizeOptions(raw: RawItem): ChoiceOption[] {
  return asArray(raw.options).map((o) => ({
    id: o.id,
    label: o.label,
    best: o.best ?? false,
    note: o.note ?? "",
    effects: asRecord(o.effects),
  }));
}

function normalizeItem(i: RawItem): Item {
  const windows = normalizeWindows(i);
  const steps = asArray(i.steps);
  return {
    id: i.id,
    name: i.name,
    type: i.type as ItemType,
    location: i.location,
    windows,
    // Derived views of the window list — an empty list is a validation error,
    // so the placeholders below never survive to the app.
    opensAt: windows[0]?.opensAt ?? Number.NaN,
    closesAt: windows.length > 0 ? windows[windows.length - 1].closesAt : null,
    prereqs: normalizePrereqs(i),
    excludes: asArray(i.excludes),
    count: i.count ?? (steps.length > 0 ? steps.length : 1),
    steps,
    options: normalizeOptions(i),
    party: asArray(i.party),
    effects: asRecord(i.effects),
    refs: asArray(i.refs),
    versions: asArray(i.versions),
    notes: i.notes ?? "",
    verified: i.verified ?? false,
    route:
      i.route === undefined || i.route === null
        ? null
        : {
            at: i.route.at,
            rank: i.route.rank,
            why: i.route.why,
            leg: i.route.leg ?? null,
            tradeoff: i.route.tradeoff ?? null,
          },
  };
}

function normalizePosition(p: RawPosition): Position {
  return {
    id: p.id,
    order: p.order,
    label: p.label,
    disc: p.disc,
    tips: asArray(p.tips),
    pace: p.pace ?? null,
  };
}

function normalizeTracker(t: RawTracker): Tracker {
  return {
    id: t.id,
    name: t.name,
    opensAt: t.window?.opensAt ?? Number.NaN,
    locksAt: t.window?.locksAt ?? null,
    notes: t.notes ?? "",
    values: asArray(t.values).map((v) => ({
      id: v.id,
      label: v.label,
      start: v.start ?? 0,
    })),
    verified: t.verified ?? false,
  };
}

/** Normalizes raw pack JSON to the flattened shape the app consumes. */
export function normalizePack(raw: RawPack): Pack {
  return {
    game: raw.game,
    theme: raw.theme.tokens,
    positions: raw.positions.map(normalizePosition),
    items: raw.items.map(normalizeItem),
    trackers: asArray(raw.trackers).map(normalizeTracker),
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
