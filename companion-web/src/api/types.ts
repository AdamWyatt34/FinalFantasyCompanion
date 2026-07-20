export type Status =
  | "collected"
  | "forgone"
  | "missed"
  | "notYet"
  | "blocked"
  | "lastChance"
  | "closingSoon"
  | "available";

export type ItemType =
  | "materia"
  | "limit"
  | "character"
  | "key"
  | "quest"
  | "summon"
  | "chocobo"
  | "weapon"
  | "gf"
  | "card"
  | "magazine"
  | "esper"
  | "aeon"
  | "primer"
  | "hunt";

export interface GameVersion {
  id: string;
  label: string;
}

export interface GameSummary {
  id: string;
  title: string;
  /** Release variants with differing content (PS2 vs Zodiac Age). Absent = one version. */
  versions?: GameVersion[];
}

export interface Position {
  id: string;
  order: number;
  label: string;
  disc: number;
}

export interface RouteInfo {
  at: number;
  rank: number;
  why: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  location: string;
  opensAt: number;
  closesAt: number | null;
  prereqs: string[];
  /** Mutually exclusive counterparts — collecting either forecloses the other. */
  excludes: string[];
  /** Target for counter items ("×26 primers"); 1 = plain checkbox. */
  count: number;
  /** Version ids this item exists in; empty = every version. */
  versions: string[];
  notes: string;
  verified: boolean;
  route: RouteInfo | null;
}

export interface Pack {
  game: GameSummary;
  theme: Record<string, string>;
  positions: Position[];
  items: Item[];
}

export interface AvailabilityEntry {
  item: Item;
  status: Status;
  missingPrereqs: string[];
  /** Current tally for counter items; equals item.count once done. */
  progress: number;
}

export interface Availability {
  position: number;
  /** Active game version for this run; null when the pack has only one. */
  version: string | null;
  items: AvailabilityEntry[];
}

export interface RouteEntry {
  item: Item;
  status: Status;
  masked: boolean;
  missingPrereqs: string[];
  progress: number;
}

export interface RouteView {
  position: number;
  now: RouteEntry[];
  next: RouteEntry[];
  later: RouteEntry[];
}

export interface AdvanceImpact {
  from: number;
  to: number;
  closing: AvailabilityEntry[];
}

export interface StateSnapshot {
  position: number;
  collected: string[];
  progress: Record<string, number>;
}
