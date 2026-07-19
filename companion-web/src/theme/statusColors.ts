import type { Status } from "../api/types";

/**
 * Functional status colors are app constants, identical across game packs for
 * glanceability. Pack themes own chrome only — never these.
 */
export const STATUS: Record<
  Status,
  { label: string; color: string; rank: number; pulse?: boolean }
> = {
  lastChance: { label: "LAST CHANCE", color: "#ff8585", rank: 0, pulse: true },
  closingSoon: { label: "CLOSING SOON", color: "#ffd06e", rank: 1 },
  blocked: { label: "NEEDS PREREQ", color: "#ffab66", rank: 2 },
  available: { label: "AVAILABLE", color: "#82ffb8", rank: 3 },
  notYet: { label: "UPCOMING", color: "#8a93b8", rank: 4 },
  missed: { label: "MISSED", color: "#f0526e", rank: 5 },
  forgone: { label: "FORGONE", color: "#c894e8", rank: 6 },
  collected: { label: "COLLECTED", color: "#7de8e0", rank: 7 },
};

export const TYPE_LABEL: Record<string, string> = {
  materia: "MATERIA",
  limit: "LIMIT",
  character: "PARTY",
  key: "KEY ITEM",
  quest: "QUEST",
  summon: "SUMMON",
  chocobo: "CHOCOBO",
  weapon: "WEAPON",
  gf: "G.F.",
  card: "CARDS",
  magazine: "MAGAZINE",
  esper: "ESPER",
  aeon: "AEON",
  primer: "PRIMER",
  hunt: "HUNT",
};
