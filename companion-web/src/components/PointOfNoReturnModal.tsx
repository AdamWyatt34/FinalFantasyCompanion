import type { AdvanceImpact, AvailabilityEntry, Position } from "../api/types";
import { useDialog } from "../hooks/useDialog";
import { STATUS } from "../theme/statusColors";

interface PointOfNoReturnModalProps {
  impact: AdvanceImpact;
  positions: Position[];
  hiddenIds: ReadonlySet<string>;
  onStay: () => void;
  onAdvance: () => void;
}

export function PointOfNoReturnModal({
  impact,
  positions,
  hiddenIds,
  onStay,
  onAdvance,
}: PointOfNoReturnModalProps) {
  const target = positions.find((p) => p.order === impact.to);
  const label = (order: number) =>
    positions.find((p) => p.order === order)?.label ?? `beat ${order}`;
  // Escape means "stay" — dismissing a warning must never advance.
  const panelRef = useDialog(onStay);
  const permanent = impact.closing.length > 0;

  // A jump can skip windows the player never saw open — those stay
  // masked here too, or the warning itself becomes the spoiler.
  const renderEntry = (entry: AvailabilityEntry, reopens: boolean) => {
    const hidden = hiddenIds.has(entry.item.id);
    return (
      <div key={entry.item.id} className="text-sm">
        <span className="text-[var(--ff-cyan)]">▶ </span>
        {hidden ? (
          <span className="text-[var(--ff-dim)]">— ？ ？ ？ —</span>
        ) : (
          entry.item.name
        )}
        <span className="text-[11px] text-[var(--ff-dim)]">
          {" "}
          · {hidden ? "hidden to avoid spoilers" : entry.item.location}
          {!hidden && entry.item.party.length > 0 && (
            <span className="text-[var(--ff-gold)]">
              {" "}
              · bring {entry.item.party.join(", ")}
            </span>
          )}
          {reopens && entry.reopensAt != null && (
            <span> · back at {label(entry.reopensAt)}</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/70">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={permanent ? "Point of no return warning" : "Closing for now warning"}
        className="ff-box p-4 w-full max-w-sm"
      >
        <div
          className={`text-xs font-mono tracking-[0.2em] ${permanent ? "animate-pulse" : ""}`}
          style={{
            color: permanent ? STATUS.lastChance.color : STATUS.closingSoon.color,
          }}
        >
          {permanent ? "⚠ POINT OF NO RETURN" : "⏳ CLOSING FOR NOW"}
        </div>
        <div className="text-sm mt-2">
          Advancing to{" "}
          <span className="text-[var(--ff-gold)]">
            {target?.label ?? `beat ${impact.to}`}
          </span>{" "}
          {permanent ? "permanently closes:" : "closes these until they reopen:"}
        </div>
        <div className="mt-2 flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
          {impact.closing.map((entry) => renderEntry(entry, false))}
          {permanent && impact.reopening.length > 0 && (
            <div
              className="text-[10px] font-mono tracking-wider mt-1"
              style={{ color: STATUS.closingSoon.color }}
            >
              CLOSES FOR NOW — REOPENS LATER
            </div>
          )}
          {impact.reopening.map((entry) => renderEntry(entry, true))}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onStay}
            className="text-xs font-mono px-3 py-2 rounded flex-1 border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
          >
            Stay — grab them first
          </button>
          <button
            onClick={onAdvance}
            className="text-xs font-mono px-3 py-2 rounded"
            style={{
              border: `1px solid ${permanent ? STATUS.lastChance.color : STATUS.closingSoon.color}88`,
              color: permanent ? STATUS.lastChance.color : STATUS.closingSoon.color,
            }}
          >
            Advance anyway
          </button>
        </div>
      </div>
    </div>
  );
}
