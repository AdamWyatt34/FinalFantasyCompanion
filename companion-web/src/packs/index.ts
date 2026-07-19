import type { Item, ItemType, Pack, Position } from "../api/types";
import { validateOrThrow } from "../engine/validate";

/** On-disk pack JSON shapes: nested window/theme, optional fields. */
interface RawItem {
  id: string;
  name: string;
  type: string;
  location: string;
  window: { opensAt: number; closesAt?: number | null };
  prereqs?: string[];
  excludes?: string[];
  notes?: string;
  verified?: boolean;
  route?: { at: number; rank: number; why: string } | null;
}

interface RawPack {
  game: { id: string; title: string };
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

export function getPackById(gameId: string): Pack | undefined {
  return packs.get(gameId);
}
