import type { Availability, Position } from "../api/types";
import { STATUS } from "../theme/statusColors";

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
  const byBeat = new Map<number, typeof availability.items>();
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

  return (
    <div className="flex flex-col gap-3">
      {positions.map((p) => {
        const entries = byBeat.get(p.order);
        const here = p.order === position;
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
            </div>
            {entries === undefined ? (
              <div className="text-[10px] font-mono ml-4 mt-0.5 text-[var(--ff-faint)]">
                — story only —
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-1">
                {entries.map((entry) => {
                  const hidden = hiddenIds.has(entry.item.id);
                  const done = entry.status === "collected";
                  const gone =
                    entry.status === "missed" || entry.status === "forgone";
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
                          hidden
                            ? "text-[var(--ff-dim)]"
                            : "text-[var(--ff-ink)]"
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
                })}
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
