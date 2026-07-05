import type { Position } from "../api/types";

export function ProgressTicks({
  positions,
  current,
}: {
  positions: Position[];
  current: number;
}) {
  return (
    <div className="flex gap-1 mt-2">
      {positions.map((p) => (
        <div
          key={p.id}
          className="h-1.5 flex-1 rounded-sm"
          style={{
            background:
              p.order === current
                ? "var(--ff-cyan)"
                : p.order < current
                  ? "var(--ff-tick-done)"
                  : "var(--ff-tick-todo)",
            boxShadow: p.order === current ? "0 0 6px var(--ff-cyan)" : "none",
          }}
        />
      ))}
    </div>
  );
}
