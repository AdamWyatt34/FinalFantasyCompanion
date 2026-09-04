import type { ReactNode } from "react";
import type { Availability, AvailabilityEntry, Position } from "../api/types";
import { STATUS } from "../theme/statusColors";
import { groupByLeg } from "./legs";

interface PlanTabProps {
  positions: Position[];
  availability: Availability;
  position: number;
  hiddenIds: ReadonlySet<string>;
}

/**
 * The whole curated route at a glance: every beat in order with the items
 * routed to it — a spoiler-masked walkthrough to skim before a session.
 * Read-only by design; collecting happens in Route and All items.
 */
export function PlanTab({
  positions,
  availability,
  position,
  hiddenIds,
}: PlanTabProps) {
  const byBeat = new Map<number, AvailabilityEntry[]>();
  let unrouted = 0;
  for (const entry of availability.items) {
    if (entry.item.route === null) {
      unrouted++;
      continue;
    }
    const list = byBeat.get(entry.item.route.at) ?? [];
    list.push(entry);
    byBeat.set(entry.item.route.at, list);
  }
  for (const list of byBeat.values()) {
    list.sort(
      (a, b) =>
        a.item.route!.rank - b.item.route!.rank ||
        (a.item.name < b.item.name ? -1 : a.item.name > b.item.name ? 1 : 0),
    );
  }

  const renderEntry = (entry: AvailabilityEntry) => {
    const hidden = hiddenIds.has(entry.item.id);
    const done = entry.status === "collected";
    const gone = entry.status === "missed" || entry.status === "forgone";
    return (
      <div
        key={entry.item.id}
        className={`ml-4 text-xs leading-snug ${gone ? "opacity-60" : ""}`}
      >
        <span style={{ color: STATUS[entry.status].color }}>
          {done ? "✓" : gone ? "✗" : "•"}
        </span>{" "}
        <span
          className={`${gone ? "line-through" : ""} ${
            hidden ? "text-[var(--ff-dim)]" : "text-[var(--ff-ink)]"
          }`}
        >
          {hidden ? "— ？ ？ ？ —" : entry.item.name}
        </span>
        {!hidden && entry.item.route!.why && (
          <span className="text-[var(--ff-dimmer)]">
            {" "}
            — {entry.item.route!.why}
          </span>
        )}
      </div>
    );
  };

  // Legs render as sub-headings inside a beat, in rank order.
  const renderBeat = (entries: AvailabilityEntry[]) => {
    const nodes: ReactNode[] = [];
    for (const group of groupByLeg(entries, (e) => e.item)) {
      if (group.leg !== null) {
        const masked = group.entries.every((e) => hiddenIds.has(e.item.id));
        nodes.push(
          <div
            key={group.key}
            className="ml-4 mt-1 text-[10px] font-mono tracking-wider text-[var(--ff-cyan)]"
          >
            {masked ? "？？？" : group.leg.toUpperCase()}
          </div>,
        );
      }
      nodes.push(...group.entries.map(renderEntry));
    }
    return nodes;
  };

  return (
    <div className="flex flex-col gap-3">
      {positions.map((p) => {
        const entries = byBeat.get(p.order);
        const here = p.order === position;
        const reached = p.order <= position;
        return (
          <section key={p.id}>
            <div
              className={`text-[11px] font-mono tracking-wider flex items-center gap-1.5 ${
                here
                  ? "text-[var(--ff-cyan)]"
                  : p.order < position
                    ? "text-[var(--ff-faint)]"
                    : "text-[var(--ff-gold)]"
              }`}
            >
              {here && <span>▶</span>}
              {p.order}. {p.label.toUpperCase()}
              {p.pace && (
                <span className="text-[var(--ff-dim)] tracking-normal">
                  ⏱ {p.pace}
                </span>
              )}
            </div>
            {/* Tips stay hidden for beats the player hasn't reached — they read like spoilers. */}
            {reached && p.tips.length > 0 && (
              <ul className="ml-4 mt-0.5 flex flex-col gap-0.5">
                {p.tips.map((tip) => (
                  <li
                    key={tip}
                    className="text-[11px] leading-snug text-[var(--ff-dim)]"
                  >
                    ▶ {tip}
                  </li>
                ))}
              </ul>
            )}
            {!reached && p.tips.length > 0 && (
              <div className="text-[10px] font-mono ml-4 mt-0.5 text-[var(--ff-faint)]">
                — {p.tips.length} tip{p.tips.length === 1 ? "" : "s"} once you
                arrive —
              </div>
            )}
            {entries === undefined ? (
              p.tips.length === 0 && (
                <div className="text-[10px] font-mono ml-4 mt-0.5 text-[var(--ff-faint)]">
                  — story only —
                </div>
              )
            ) : (
              <div className="mt-1 flex flex-col gap-1">
                {renderBeat(entries)}
              </div>
            )}
          </section>
        );
      })}
      {unrouted > 0 && (
        <div className="text-center text-[10px] font-mono text-[var(--ff-faint)]">
          + {unrouted} unrouted item{unrouted === 1 ? "" : "s"} in All items
        </div>
      )}
    </div>
  );
}
