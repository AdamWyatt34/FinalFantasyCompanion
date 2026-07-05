import type { Position } from "../api/types";

interface TimelineOverlayProps {
  positions: Position[];
  position: number;
  onSelect: (order: number) => void;
  onClose: () => void;
}

export function TimelineOverlay({
  positions,
  position,
  onSelect,
  onClose,
}: TimelineOverlayProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/70"
      onClick={onClose}
    >
      <div
        className="ff-box p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] font-mono tracking-[0.25em] mb-2 text-[var(--ff-gold)]">
          JUMP TO STORY BEAT
        </div>
        {positions.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              onClose();
              onSelect(p.order);
            }}
            className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
              p.order === position
                ? "text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
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
        ))}
      </div>
    </div>
  );
}
