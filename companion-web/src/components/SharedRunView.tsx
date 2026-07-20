import { useEffect, useMemo } from "react";
import type { Status } from "../api/types";
import { projectAvailability } from "../engine/availability";
import type { PlaythroughState } from "../engine/state";
import { getPackById } from "../packs";
import type { SharedRun } from "../storage/shareLink";
import { applyTheme } from "../theme/applyTheme";
import { STATUS } from "../theme/statusColors";

interface SharedRunViewProps {
  run: SharedRun;
  onExit: () => void;
}

const SECTIONS: { title: string; statuses: Status[] }[] = [
  {
    title: "OPEN RIGHT NOW",
    statuses: ["lastChance", "closingSoon", "blocked", "available"],
  },
  { title: "COLLECTED", statuses: ["collected"] },
  { title: "MISSED", statuses: ["missed"] },
  { title: "FORGONE BY CHOICE", statuses: ["forgone"] },
];

/**
 * Read-only viewer for a run shared via URL fragment. Computes views straight
 * from the snapshot — never touches this browser's own saves. Upcoming items
 * stay masked: the viewer deserves spoiler protection too.
 */
export function SharedRunView({ run, onExit }: SharedRunViewProps) {
  const pack = getPackById(run.gameId);

  useEffect(() => {
    if (pack) {
      applyTheme(pack.theme);
    }
  }, [pack]);

  const availability = useMemo(() => {
    if (!pack) {
      return null;
    }
    const itemIds = new Set(pack.items.map((i) => i.id));
    const state: PlaythroughState = {
      position: run.position,
      collected: new Set(run.collected.filter((id) => itemIds.has(id))),
      progress: new Map(
        Object.entries(run.progress).filter(([id]) => itemIds.has(id)),
      ),
      version: run.version,
    };
    return projectAvailability(pack, state);
  }, [pack, run]);

  if (!pack || !availability) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-xs font-mono text-neutral-400">
        This link is for a game this app doesn't have ('{run.gameId}').
        <button onClick={onExit} className="underline">
          Open my companion
        </button>
      </div>
    );
  }

  const positionLabel =
    pack.positions.find((p) => p.order === run.position)?.label ??
    `beat ${run.position}`;
  const upcoming = availability.items.filter(
    (e) => e.status === "notYet",
  ).length;
  const collectedCount = availability.items.filter(
    (e) => e.status === "collected",
  ).length;

  return (
    <div className="ff-bg py-5 px-3 min-h-screen">
      <div className="max-w-md mx-auto flex flex-col gap-3">
        <div className="ff-box px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-[10px] font-mono tracking-[0.2em] text-[var(--ff-cyan)]">
            SHARED RUN · READ ONLY
          </div>
          <button
            onClick={onExit}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
          >
            Open my companion
          </button>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold tracking-widest text-[var(--ff-gold)] [text-shadow:0_2px_8px_#00000088]">
            {pack.game.title.toUpperCase()}
          </div>
          <div className="text-xs font-mono mt-1 text-[var(--ff-ink)]">
            {positionLabel}
          </div>
          <div className="text-[11px] font-mono mt-0.5 text-[var(--ff-cyan)]">
            {collectedCount}/{availability.items.length} collected
          </div>
        </div>

        {SECTIONS.map(({ title, statuses }) => {
          const entries = availability.items.filter((e) =>
            statuses.includes(e.status),
          );
          if (entries.length === 0) {
            return null;
          }
          return (
            <section key={title}>
              <div className="text-[10px] font-mono tracking-[0.3em] mb-1.5 text-[var(--ff-gold)]">
                {title}
              </div>
              <div className="ff-box px-3 py-2 flex flex-col gap-1">
                {entries.map((e) => (
                  <div key={e.item.id} className="text-xs leading-snug">
                    <span style={{ color: STATUS[e.status].color }}>
                      {e.status === "collected"
                        ? "✓"
                        : e.status === "missed" || e.status === "forgone"
                          ? "✗"
                          : "•"}
                    </span>{" "}
                    <span className="text-[var(--ff-ink)]">{e.item.name}</span>
                    {e.item.count > 1 && (
                      <span className="text-[var(--ff-dim)] font-mono">
                        {" "}
                        {e.progress}/{e.item.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {upcoming > 0 && (
          <div className="text-center text-[10px] font-mono text-[var(--ff-faint)]">
            + {upcoming} upcoming item{upcoming === 1 ? "" : "s"} hidden to
            avoid spoilers
          </div>
        )}
      </div>
    </div>
  );
}
