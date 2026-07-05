import type { Position } from "../api/types";
import { ProgressTicks } from "./ProgressTicks";

interface PositionBannerProps {
  positions: Position[];
  position: number;
  onBack: () => void;
  onAdvance: () => void;
  onTimeline: () => void;
}

export function PositionBanner({
  positions,
  position,
  onBack,
  onAdvance,
  onTimeline,
}: PositionBannerProps) {
  const current = positions.find((p) => p.order === position);
  const maxOrder = Math.max(...positions.map((p) => p.order));
  const minOrder = Math.min(...positions.map((p) => p.order));

  return (
    <div className="ff-box p-3">
      <div className="text-[10px] font-mono tracking-[0.25em] text-[var(--ff-gold)]">
        STORY POSITION
      </div>
      <div className="text-lg font-semibold mt-0.5">
        {current?.label ?? `Beat ${position}`}
      </div>
      <div className="text-[11px] font-mono text-[var(--ff-dim)]">
        Disc {current?.disc ?? 1} · beat {position} / {maxOrder}
      </div>

      <ProgressTicks positions={positions} current={position} />

      <div className="flex gap-2 mt-3">
        <button
          onClick={onBack}
          disabled={position <= minOrder}
          className="text-xs font-mono px-3 py-1.5 rounded disabled:opacity-30 border border-[var(--ff-button-border)] text-[var(--ff-ink)]"
        >
          ◀ Back
        </button>
        <button
          onClick={onTimeline}
          className="text-xs font-mono px-3 py-1.5 rounded flex-1 border border-[var(--ff-button-border)] text-[var(--ff-dim)]"
        >
          Timeline
        </button>
        <button
          onClick={onAdvance}
          disabled={position >= maxOrder}
          className="text-xs font-mono px-3 py-1.5 rounded disabled:opacity-30 border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
        >
          Advance ▶
        </button>
      </div>
    </div>
  );
}
