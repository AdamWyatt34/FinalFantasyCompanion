import type { Item, Status } from "../api/types";
import { STATUS } from "../theme/statusColors";
import { StatusChip } from "./StatusChip";

interface ItemCardProps {
  item: Item;
  status: Status;
  missingPrereqs: string[];
  masked: boolean;
  why?: string;
  itemNames: Record<string, string>;
  positionLabels: Record<number, string>;
  hiddenIds: ReadonlySet<string>;
  onToggle: () => void;
  onReveal: () => void;
}

export function ItemCard({
  item,
  status,
  missingPrereqs,
  masked,
  why,
  itemNames,
  positionLabels,
  hiddenIds,
  onToggle,
  onReveal,
}: ItemCardProps) {
  const isCollected = status === "collected";
  const missed = status === "missed";

  return (
    <div className={`ff-box p-3 ${missed ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`text-sm font-semibold leading-snug ${missed ? "line-through" : ""} ${
              masked ? "text-[var(--ff-dim)]" : "text-[var(--ff-ink)]"
            }`}
          >
            {masked ? "— ？ ？ ？ —" : item.name}
          </div>
          {!masked && (
            <div className="text-[11px] mt-0.5 text-[var(--ff-dim)]">
              {item.location}
            </div>
          )}
        </div>
        <StatusChip status={status} />
      </div>

      {why && !masked && (
        <div className="text-[11px] mt-1 text-[var(--ff-cyan)]">▶ {why}</div>
      )}

      <div className="mt-2 text-[11px] font-mono text-[var(--ff-dim)]">
        {masked ? (
          <>Hidden to avoid spoilers · unlocks at beat {item.opensAt}</>
        ) : missed ? (
          <>
            Closed after:{" "}
            {positionLabels[item.closesAt!] ?? `beat ${item.closesAt}`}
          </>
        ) : item.closesAt == null ? (
          <>Never closes</>
        ) : (
          <>
            Closes after:{" "}
            <span
              style={
                status === "lastChance"
                  ? { color: STATUS.lastChance.color }
                  : undefined
              }
              className={status === "lastChance" ? "" : "text-[var(--ff-ink)]"}
            >
              {positionLabels[item.closesAt] ?? `beat ${item.closesAt}`}
            </span>
          </>
        )}
      </div>

      {status === "blocked" && (
        <div
          className="text-[11px] font-mono mt-1"
          style={{ color: STATUS.blocked.color }}
        >
          Needs:{" "}
          {/* A prereq that is itself still masked must not leak its name. */}
          {[
            ...new Set(
              missingPrereqs.map((p) =>
                hiddenIds.has(p) ? "？？？" : (itemNames[p] ?? p),
              ),
            ),
          ].join(", ")}
        </div>
      )}

      {!masked && item.notes && (
        <div className="text-[11px] italic mt-1 text-[var(--ff-dimmer)]">
          {item.notes}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        {masked ? (
          <button
            onClick={onReveal}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-dim)]/40 text-[var(--ff-dim)]"
          >
            Reveal anyway
          </button>
        ) : (
          <button
            onClick={onToggle}
            className={`text-[11px] font-mono px-3 py-1 rounded border ${
              isCollected
                ? "border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
                : "border-[var(--ff-button-border)] text-[var(--ff-ink)]"
            }`}
          >
            {isCollected ? "✓ Collected" : "Mark collected"}
          </button>
        )}
      </div>
    </div>
  );
}
