import { useState } from "react";
import type { AdvanceImpact, Position } from "../api/types";
import { useDialog } from "../hooks/useDialog";
import { STATUS } from "../theme/statusColors";

interface TimelineOverlayProps {
  positions: Position[];
  position: number;
  hiddenIds: ReadonlySet<string>;
  /** What closes if the run jumps to `target` — the engine's impact view. */
  getImpact: (target: number) => Promise<AdvanceImpact>;
  /** How many not-yet-open items open up between here and `target`. */
  upcomingOpens: (target: number) => number;
  onSelect: (order: number) => void;
  onClose: () => void;
}

/**
 * Timeline browser with what-if preview: tapping a beat shows what closes
 * (spoiler-masked) and how much opens before anything is committed. The
 * point-of-no-return dialog still guards the actual jump.
 */
export function TimelineOverlay({
  positions,
  position,
  hiddenIds,
  getImpact,
  upcomingOpens,
  onSelect,
  onClose,
}: TimelineOverlayProps) {
  const panelRef = useDialog(onClose);
  const [selected, setSelected] = useState<number | null>(null);
  const [impact, setImpact] = useState<AdvanceImpact | null>(null);

  const pick = (order: number) => {
    if (order === position || order === selected) {
      setSelected(null);
      setImpact(null);
      return;
    }
    setSelected(order);
    setImpact(null);
    if (order > position) {
      getImpact(order)
        .then(setImpact)
        .catch(() => {
          // Preview is best-effort; the Go button still works without it.
        });
    }
  };

  const go = (order: number) => {
    onClose();
    onSelect(order);
  };

  const renderPreview = (order: number) => (
    <div className="mx-2 mb-1.5 rounded border border-[var(--ff-bevel)] px-2.5 py-2">
      {order < position ? (
        <div className="text-[11px] text-[var(--ff-dim)]">
          Moves your position back to this beat. Windows re-open; nothing you
          collected is lost.
        </div>
      ) : (
        <>
          {impact === null ? (
            <div className="text-[11px] font-mono text-[var(--ff-dim)]">…</div>
          ) : impact.closing.length === 0 ? (
            <div className="text-[11px] text-[var(--ff-dim)]">
              Nothing closes between here and this beat.
            </div>
          ) : (
            <div className="text-[11px]">
              <span
                className="font-mono"
                style={{ color: STATUS.lastChance.color }}
              >
                Closes forever ({impact.closing.length}):
              </span>{" "}
              <span className="text-[var(--ff-dim)]">
                {impact.closing
                  .map((e) =>
                    hiddenIds.has(e.item.id) ? "？？？" : e.item.name,
                  )
                  .join(", ")}
              </span>
            </div>
          )}
          <div className="text-[11px] mt-1 text-[var(--ff-dim)]">
            {upcomingOpens(order)} new item
            {upcomingOpens(order) === 1 ? "" : "s"} open up by then.
          </div>
        </>
      )}
      <button
        onClick={() => go(order)}
        className="mt-1.5 text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
      >
        {order < position ? "Move here" : "Jump here"}
      </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/70"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Jump to story beat"
        className="ff-box p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] font-mono tracking-[0.25em] mb-2 text-[var(--ff-gold)]">
          JUMP TO STORY BEAT
        </div>
        {positions.map((p) => (
          <div key={p.id}>
            <button
              onClick={() => pick(p.order)}
              aria-expanded={p.order === selected}
              className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
                p.order === position
                  ? "text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
                  : p.order === selected
                    ? "text-[var(--ff-gold)] bg-[var(--ff-gold)]/10"
                    : p.order < position
                      ? "text-[var(--ff-dim)]"
                      : "text-[var(--ff-ink)]"
              }`}
            >
              <span className="font-mono text-[10px] w-5 text-[var(--ff-dim)]">
                {p.order}
              </span>
              {p.order === position && (
                <span className="text-[var(--ff-cyan)]">▶</span>
              )}
              {p.label}
            </button>
            {p.order === selected && renderPreview(p.order)}
          </div>
        ))}
      </div>
    </div>
  );
}
