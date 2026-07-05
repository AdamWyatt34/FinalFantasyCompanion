import type { Status } from "../api/types";
import { STATUS } from "../theme/statusColors";

export function StatusChip({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span
      className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded whitespace-nowrap ${
        s.pulse ? "animate-pulse" : ""
      }`}
      style={{
        color: s.color,
        border: `1px solid ${s.color}55`,
        background: "#00000040",
      }}
    >
      {s.label}
    </span>
  );
}
