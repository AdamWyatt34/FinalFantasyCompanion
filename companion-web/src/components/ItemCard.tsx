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
  note?: string;
  progress: number;
  onToggle: () => void;
  onReveal: () => void;
  onEditNote: () => void;
  onProgress: (delta: number) => void;
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
  note,
  progress,
  onToggle,
  onReveal,
  onEditNote,
  onProgress,
}: ItemCardProps) {
  const isCollected = status === "collected";
  const missed = status === "missed";
  const gone = missed || status === "forgone";

  return (
    <div className={`ff-box p-3 ${gone ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`text-sm font-semibold leading-snug ${gone ? "line-through" : ""} ${
              masked ? "text-[var(--ff-dim)]" : "text-[var(--ff-ink)]"
            }`}
          >
            {masked ? "— ？ ？ ？ —" : item.name}
          </div>
          {!masked && (
            <div className="text-[11px] mt-0.5 text-[var(--ff-dim)]">
              {item.location}
              {item.verified && (
                <span
                  className="text-[var(--ff-cyan)]"
                  title="Window confirmed during a real playthrough"
                >
                  {" "}
                  · ✓ verified
                </span>
              )}
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
        ) : status === "forgone" ? (
          <>
            Forgone by choice
            {item.excludes.length > 0 && (
              <>
                {" — took "}
                {[
                  ...new Set(
                    item.excludes.map((ex) =>
                      hiddenIds.has(ex) ? "？？？" : (itemNames[ex] ?? ex),
                    ),
                  ),
                ].join(", ")}
              </>
            )}
          </>
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

      {!masked && note && (
        <div className="text-[11px] mt-1 text-[var(--ff-gold)]">✎ {note}</div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {masked ? (
          <button
            onClick={onReveal}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-dim)]/40 text-[var(--ff-dim)]"
          >
            Reveal anyway
          </button>
        ) : (
          <>
            {item.count > 1 ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => onProgress(-1)}
                  disabled={progress <= 0}
                  aria-label={`Decrease ${item.name} tally`}
                  className="text-[13px] font-mono w-7 py-0.5 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)] disabled:opacity-40"
                >
                  −
                </button>
                <span
                  className={`text-[11px] font-mono min-w-12 text-center ${
                    isCollected
                      ? "text-[var(--ff-cyan)]"
                      : "text-[var(--ff-ink)]"
                  }`}
                >
                  {progress} / {item.count}
                </span>
                <button
                  onClick={() => onProgress(1)}
                  disabled={progress >= item.count}
                  aria-label={`Increase ${item.name} tally`}
                  className="text-[13px] font-mono w-7 py-0.5 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)] disabled:opacity-40"
                >
                  ＋
                </button>
              </span>
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
            <button
              onClick={onEditNote}
              aria-label={`Edit note for ${item.name}`}
              className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-bevel)] text-[var(--ff-dim)]"
            >
              ✎ {note ? "Edit note" : "Note"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
