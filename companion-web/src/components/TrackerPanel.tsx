import type { TrackerView } from "../api/types";

interface TrackerPanelProps {
  view: TrackerView;
  positionLabels: Record<number, string>;
  onAdjust: (trackerId: string, valueId: string, delta: number) => void;
}

/**
 * Live standings for a hidden running total (FF7's date). Decisions and
 * choices move the numbers automatically; the +/− buttons log an off-list
 * nudge for anything the pack does not model.
 */
export function TrackerPanel({
  view,
  positionLabels,
  onAdjust,
}: TrackerPanelProps) {
  const { tracker, standings, locked } = view;
  const leader = standings[0];
  const lockLabel =
    tracker.locksAt == null
      ? null
      : (positionLabels[tracker.locksAt] ?? `beat ${tracker.locksAt}`);

  return (
    <section className="ff-box p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono tracking-[0.25em] text-[var(--ff-gold)]">
            STANDINGS
          </div>
          <div className="text-sm font-semibold leading-snug text-[var(--ff-ink)]">
            {tracker.name}
          </div>
        </div>
        <span
          className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded whitespace-nowrap border ${
            locked
              ? "border-[var(--ff-dim)]/50 text-[var(--ff-dim)]"
              : "border-[var(--ff-cyan)]/50 text-[var(--ff-cyan)]"
          }`}
        >
          {locked ? "LOCKED" : lockLabel ? `LOCKS AFTER ${lockLabel.toUpperCase()}` : "LIVE"}
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {standings.map((standing, index) => (
          <div
            key={standing.id}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span
              className={
                index === 0 && leader.value !== standings[1]?.value
                  ? "text-[var(--ff-cyan)]"
                  : "text-[var(--ff-ink)]"
              }
            >
              {index === 0 ? "▶ " : "　"}
              {standing.label}
            </span>
            <span className="flex items-center gap-1.5">
              <button
                onClick={() => onAdjust(tracker.id, standing.id, -1)}
                disabled={locked}
                aria-label={`Lower ${standing.label}`}
                className="text-[13px] font-mono w-7 py-0.5 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)] disabled:opacity-40"
              >
                −
              </button>
              <span className="font-mono min-w-8 text-center text-[var(--ff-ink)]">
                {standing.value}
              </span>
              <button
                onClick={() => onAdjust(tracker.id, standing.id, 1)}
                disabled={locked}
                aria-label={`Raise ${standing.label}`}
                className="text-[13px] font-mono w-7 py-0.5 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)] disabled:opacity-40"
              >
                ＋
              </button>
            </span>
          </div>
        ))}
      </div>

      {tracker.notes && (
        <div className="text-[11px] italic mt-2 text-[var(--ff-dimmer)]">
          {tracker.notes}
        </div>
      )}
      {!tracker.verified && (
        <div className="text-[10px] font-mono mt-1 text-[var(--ff-faint)]">
          Values are scaffolding — log ± for anything the pack does not model.
        </div>
      )}
    </section>
  );
}
