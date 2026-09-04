import type { Item, PrereqGroup, Status } from "../api/types";
import { STATUS } from "../theme/statusColors";
import { describePrereqs } from "./prereqLabels";
import { StatusChip } from "./StatusChip";

interface ItemCardProps {
  item: Item;
  status: Status;
  missingPrereqs: PrereqGroup[];
  masked: boolean;
  why?: string;
  itemNames: Record<string, string>;
  positionLabels: Record<number, string>;
  hiddenIds: ReadonlySet<string>;
  note?: string;
  progress: number;
  windowClosesAt: number | null;
  reopensAt: number | null;
  chosen: string | null;
  possibleNow?: boolean;
  justOpened?: boolean;
  onToggle: () => void;
  onReveal: () => void;
  onEditNote: () => void;
  onProgress: (delta: number) => void;
  onChoose: (optionId: string) => void;
  onReport: () => void;
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
  windowClosesAt,
  reopensAt,
  chosen,
  possibleNow = false,
  justOpened = false,
  onToggle,
  onReveal,
  onEditNote,
  onProgress,
  onChoose,
  onReport,
}: ItemCardProps) {
  const isCollected = status === "collected";
  const missed = status === "missed";
  const gone = missed || status === "forgone";
  const isChoice = item.options.length > 0;
  const hasSteps = item.steps.length > 0;
  const beat = (order: number) => positionLabels[order] ?? `beat ${order}`;
  const bestOption = item.options.find((o) => o.best) ?? null;
  const chosenOption = item.options.find((o) => o.id === chosen) ?? null;
  const guidance = chosenOption?.note || bestOption?.note || "";

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
            {!masked && justOpened && !isCollected && !gone && (
              <span className="ml-2 align-middle text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-[var(--ff-cyan)]/50 text-[var(--ff-cyan)]">
                NEW
              </span>
            )}
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

      {!masked && item.party.length > 0 && !isCollected && !gone && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.party.map((member) => (
            <span
              key={member}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--ff-gold)]/45 text-[var(--ff-gold)]"
            >
              ⚔ bring {member}
            </span>
          ))}
        </div>
      )}

      {why && !masked && (
        <div className="text-[11px] mt-1 text-[var(--ff-cyan)]">▶ {why}</div>
      )}

      {possibleNow && !masked && item.route && (
        <div className="text-[11px] mt-1 text-[var(--ff-gold)]">
          ▷ Possible now · planned for {beat(item.route.at)}
          {item.route.tradeoff && (
            <span className="text-[var(--ff-dimmer)]">
              {" "}
              — {item.route.tradeoff}
            </span>
          )}
        </div>
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
          <>Closed after: {beat(item.closesAt!)}</>
        ) : status === "reopensLater" ? (
          <>
            Closed for now · reopens at{" "}
            <span className="text-[var(--ff-ink)]">{beat(reopensAt!)}</span>
          </>
        ) : status === "notYet" ? (
          <>
            Opens at: <span className="text-[var(--ff-ink)]">{beat(item.opensAt)}</span>
            {item.closesAt != null && <> · closes after {beat(item.closesAt)}</>}
          </>
        ) : windowClosesAt == null ? (
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
              {beat(windowClosesAt)}
            </span>
            {reopensAt != null && <> · reopens at {beat(reopensAt)}</>}
          </>
        )}
      </div>

      {status === "blocked" && (
        <div
          className="text-[11px] font-mono mt-1"
          style={{ color: STATUS.blocked.color }}
        >
          Needs: {describePrereqs(missingPrereqs, itemNames, hiddenIds)}
        </div>
      )}

      {!masked && item.notes && (
        <div className="text-[11px] italic mt-1 text-[var(--ff-dimmer)]">
          {item.notes}
        </div>
      )}

      {!masked && hasSteps && (
        <ol className="mt-1.5 flex flex-col gap-0.5">
          {item.steps.map((step, index) => {
            const done = index < progress;
            const next = index === progress;
            return (
              <li
                key={step}
                className={`text-[11px] leading-snug ${
                  done
                    ? "text-[var(--ff-cyan)]"
                    : next
                      ? "text-[var(--ff-ink)]"
                      : "text-[var(--ff-dim)]"
                }`}
              >
                {done ? "✓" : next ? "▶" : "○"} {step}
              </li>
            );
          })}
        </ol>
      )}

      {!masked && isChoice && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1.5">
            {item.options.map((option) => {
              const picked = option.id === chosen;
              return (
                <button
                  key={option.id}
                  onClick={() => onChoose(option.id)}
                  aria-pressed={picked}
                  title={option.note || undefined}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                    picked
                      ? "border-[var(--ff-cyan)] text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
                      : option.best
                        ? "border-[var(--ff-gold)]/60 text-[var(--ff-gold)]"
                        : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
                  }`}
                >
                  {option.best ? "★ " : ""}
                  {option.label}
                </button>
              );
            })}
          </div>
          {guidance && (
            <div className="text-[11px] italic mt-1 text-[var(--ff-dimmer)]">
              {guidance}
            </div>
          )}
          {chosenOption !== null &&
            bestOption !== null &&
            chosenOption.id !== bestOption.id && (
              <div className="text-[11px] mt-1 text-[var(--ff-gold)]">
                Better: {bestOption.label}
              </div>
            )}
        </div>
      )}

      {!masked && note && (
        <div className="text-[11px] mt-1 text-[var(--ff-gold)]">✎ {note}</div>
      )}

      {!masked && item.refs.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {item.refs.map((ref) => (
            <a
              key={ref.url}
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono underline text-[var(--ff-dim)]"
            >
              ↗ {ref.label}
            </a>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {masked ? (
          <button
            onClick={onReveal}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-dim)]/40 text-[var(--ff-dim)]"
          >
            Reveal anyway
          </button>
        ) : (
          <>
            {isChoice ? (
              chosen !== null && (
                <button
                  onClick={onToggle}
                  className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-button-border)] text-[var(--ff-dim)]"
                >
                  ✕ Clear choice
                </button>
              )
            ) : hasSteps ? (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => onProgress(-1)}
                  disabled={progress <= 0}
                  aria-label={`Undo last step of ${item.name}`}
                  className="text-[13px] font-mono w-7 py-0.5 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)] disabled:opacity-40"
                >
                  −
                </button>
                {progress < item.count ? (
                  <button
                    onClick={() => onProgress(1)}
                    className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-button-border)] text-[var(--ff-ink)]"
                  >
                    ✓ {item.steps[progress]}
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--ff-cyan)]">
                    ✓ All steps done
                  </span>
                )}
              </span>
            ) : item.count > 1 ? (
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
            <button
              onClick={onReport}
              aria-label={`Report wrong data for ${item.name}`}
              title="Window wrong? Report it — every report improves the pack"
              className="text-[11px] font-mono px-2 py-1 rounded border border-[var(--ff-bevel)] text-[var(--ff-faint)]"
            >
              ⚑
            </button>
          </>
        )}
      </div>
    </div>
  );
}
