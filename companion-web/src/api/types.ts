export type Status =
  | "collected"
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

export interface GameSummary {
  id: string;
  title: string;
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
}

export interface Availability {
  position: number;
  items: AvailabilityEntry[];
}

export interface RouteEntry {
  item: Item;
  status: Status;
  masked: boolean;
  missingPrereqs: string[];
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
}
