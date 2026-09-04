export type Status =
  | "collected"
  | "forgone"
  | "missed"
  | "notYet"
  | "reopensLater"
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
  | "hunt"
  | "choice"
  | "sweep";

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
  /** Beat briefing: what to set up or finish here before moving on. Shown once the player arrives. */
  tips: string[];
  /** Playtime pace note for timed rewards ("under 6:30 for Excalibur II"); null when none. */
  pace: string | null;
}

/** One span of beats during which an item is obtainable. `closesAt` null = never closes. */
export interface Window {
  opensAt: number;
  closesAt: number | null;
}

/**
 * One prereq clause: any single ref in the group satisfies it. A ref is an
 * item id, or `itemId:optionId` to require a specific choice outcome. An
 * item's prereqs are the AND of its groups.
 */
export type PrereqGroup = string[];

export interface ChoiceOption {
  id: string;
  label: string;
  /** The outcome the route recommends. */
  best: boolean;
  note: string;
  /** Tracker deltas applied while this option is the chosen one, keyed `trackerId.valueId`. */
  effects: Record<string, number>;
}

export interface RouteInfo {
  at: number;
  rank: number;
  why: string;
  /** Named leg within the beat ("Leg 2 · after ~10 battles"); Now groups entries by it. */
  leg: string | null;
  /** Why the route waits when the item is obtainable earlier ("possible on Disc 1, easier with the Highwind"). */
  tradeoff: string | null;
}

export interface Reference {
  label: string;
  url: string;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  location: string;
  /** Every span the item is obtainable in, ascending and non-touching. At least one. */
  windows: Window[];
  /** First window's open — derived, kept for masking and sorting. */
  opensAt: number;
  /** Last window's close — derived; null when the item never finally closes. */
  closesAt: number | null;
  prereqs: PrereqGroup[];
  /** Mutually exclusive counterparts — collecting either forecloses the other. */
  excludes: string[];
  /** Target for counter items ("×26 primers"); 1 = plain checkbox. */
  count: number;
  /** Labelled counter steps; when present, `count` equals its length and the tally reads as a checklist. */
  steps: string[];
  /** Choice items: the outcomes the player picks between. Empty = not a choice. */
  options: ChoiceOption[];
  /** Party members that must be present ("Barret"). */
  party: string[];
  /** Tracker deltas applied while collected, keyed `trackerId.valueId`. */
  effects: Record<string, number>;
  /** External guides for the long version of the how-to. */
  refs: Reference[];
  /** Version ids this item exists in; empty = every version. */
  versions: string[];
  notes: string;
  verified: boolean;
  route: RouteInfo | null;
}

export interface TrackerValue {
  id: string;
  label: string;
  start: number;
}

/**
 * A hidden running total the game keeps (FF7's date affection): several
 * named values moved by decisions and manual adjustments, read at a deadline.
 */
export interface Tracker {
  id: string;
  name: string;
  /** Beat the standings start mattering (shown from here). */
  opensAt: number;
  /** Beat after which the standings are locked in; null = never. */
  locksAt: number | null;
  /** What the standings decide, and the rules of thumb. */
  notes: string;
  values: TrackerValue[];
  verified: boolean;
}

export interface Pack {
  game: GameSummary;
  theme: Record<string, string>;
  positions: Position[];
  items: Item[];
  trackers: Tracker[];
}

export interface AvailabilityEntry {
  item: Item;
  status: Status;
  /** Unsatisfied prereq groups, each listed as its refs. */
  missingPrereqs: PrereqGroup[];
  /** Current tally for counter items; equals item.count once done. */
  progress: number;
  /** Close of the window the position is inside; null when inside none or it never closes. */
  windowClosesAt: number | null;
  /**
   * Next window's opening beat when the item is closed for now, or when its
   * current window is closing but another follows. Null otherwise.
   */
  reopensAt: number | null;
  /** Choice items: the option chosen, or null. */
  chosen: string | null;
}

export interface TrackerStanding {
  id: string;
  label: string;
  value: number;
}

export interface TrackerView {
  tracker: Tracker;
  /** Position has passed `locksAt` — the standings are final. */
  locked: boolean;
  /** Position has reached `opensAt`. */
  open: boolean;
  /** Current standings, highest first. */
  standings: TrackerStanding[];
}

export interface Availability {
  position: number;
  /** Active game version for this run; null when the pack has only one. */
  version: string | null;
  items: AvailabilityEntry[];
  trackers: TrackerView[];
  /** Manual tracker nudges so far, keyed `trackerId.valueId` — carried so a shared run can be rebuilt. */
  adjustments: Record<string, number>;
}

export interface RouteEntry {
  item: Item;
  status: Status;
  masked: boolean;
  missingPrereqs: PrereqGroup[];
  progress: number;
  windowClosesAt: number | null;
  reopensAt: number | null;
  chosen: string | null;
  /** Obtainable right now even though the route schedules it for a later beat. */
  possibleNow: boolean;
  /** A window of this item opened at the current beat. */
  justOpened: boolean;
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
  /** Closes for good before the target beat. */
  closing: AvailabilityEntry[];
  /** A window closes before the target, but a later window reopens. */
  reopening: AvailabilityEntry[];
}

export interface StateSnapshot {
  position: number;
  collected: string[];
  progress: Record<string, number>;
  choices: Record<string, string>;
}
