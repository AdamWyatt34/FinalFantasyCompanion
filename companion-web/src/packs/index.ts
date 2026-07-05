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

// Ordinal filename sort keeps game order deterministic (ff7 before ff9),
// matching how the old server enumerated the pack directory.
const packs = new Map<string, Pack>(
  Object.keys(modules)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
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
