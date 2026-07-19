import type { AdvanceImpact, Position } from "../api/types";
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

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/70">
      <div className="ff-box p-4 w-full max-w-sm">
        <div
          className="text-xs font-mono tracking-[0.2em] animate-pulse"
          style={{ color: STATUS.lastChance.color }}
        >
          ⚠ POINT OF NO RETURN
        </div>
        <div className="text-sm mt-2">
          Advancing to{" "}
          <span className="text-[var(--ff-gold)]">
            {target?.label ?? `beat ${impact.to}`}
          </span>{" "}
          permanently closes:
        </div>
        <div className="mt-2 flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto">
          {/* A jump can skip windows the player never saw open — those stay
              masked here too, or the warning itself becomes the spoiler. */}
          {impact.closing.map((entry) => {
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
                </span>
              </div>
            );
          })}
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
              border: `1px solid ${STATUS.lastChance.color}88`,
              color: STATUS.lastChance.color,
            }}
          >
            Advance anyway
          </button>
        </div>
      </div>
    </div>
  );
}
