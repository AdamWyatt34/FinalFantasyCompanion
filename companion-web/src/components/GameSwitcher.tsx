import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Availability, GameSummary, Pack } from "../api/types";
import { STATUS } from "../theme/statusColors";

export interface GameProgress {
  beat: number;
  maxBeat: number;
  disc: number;
  collected: number;
  total: number;
  missed: number;
}

export function summarize(
  pack: Pack,
  availability: Availability,
): GameProgress {
  return {
    beat: availability.position,
    maxBeat: Math.max(...pack.positions.map((p) => p.order)),
    disc:
      pack.positions.find((p) => p.order === availability.position)?.disc ?? 1,
    collected: availability.items.filter((e) => e.status === "collected")
      .length,
    // availability.items is already filtered to the run's game version.
    total: availability.items.length,
    missed: availability.items.filter((e) => e.status === "missed").length,
  };
}

interface GameSwitcherProps {
  games: GameSummary[];
  currentId: string;
  /** Live progress for the active game — derived from data the game view already has. */
  currentProgress: GameProgress | null;
  onSelect: (id: string) => void;
}

/**
 * One card per pack: title, story position, collected count, missed count.
 * The active card reads live data; inactive cards fetch their saved state once —
 * it can only change while that game is active, so mount-fresh is always current.
 */
export function GameSwitcher({
  games,
  currentId,
  currentProgress,
  onSelect,
}: GameSwitcherProps) {
  const [saved, setSaved] = useState<Record<string, GameProgress>>({});

  useEffect(() => {
    let cancelled = false;
    for (const game of games.filter((g) => g.id !== currentId)) {
      Promise.all([api.getPack(game.id), api.getAvailability(game.id)])
        .then(([pack, availability]) => {
          if (!cancelled) {
            setSaved((prev) => ({
              ...prev,
              [game.id]: summarize(pack, availability),
            }));
          }
        })
        .catch(() => {
          // Card falls back to title-only; the game is still selectable.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [games, currentId]);

  if (games.length < 2) {
    return null;
  }

  return (
    // Two columns: with 7 packs a single flex row would crush every card.
    <div className="grid grid-cols-2 gap-2">
      {games.map((game) => {
        const active = game.id === currentId;
        const progress = active ? currentProgress : (saved[game.id] ?? null);
        return (
          <button
            key={game.id}
            onClick={() => onSelect(game.id)}
            className={`min-w-0 text-left px-3 py-2 rounded-md border ${
              active
                ? "border-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
                : "border-[var(--ff-bevel)]"
            }`}
          >
            <div
              className={`text-[11px] font-semibold leading-snug truncate ${
                active ? "text-[var(--ff-cyan)]" : "text-[var(--ff-ink)]"
              }`}
            >
              {game.title}
            </div>
            <div className="text-[10px] font-mono mt-0.5 text-[var(--ff-dim)]">
              {progress
                ? `Disc ${progress.disc} · beat ${progress.beat}/${progress.maxBeat}`
                : "…"}
            </div>
            {progress && (
              <div className="text-[10px] font-mono text-[var(--ff-dim)]">
                {progress.collected}/{progress.total} collected
                {progress.missed > 0 && (
                  <span style={{ color: STATUS.missed.color }}>
                    {" "}
                    · {progress.missed} missed
                  </span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
