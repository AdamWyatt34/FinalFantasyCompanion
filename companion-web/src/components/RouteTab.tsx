import { useMemo, useState } from "react";
import type { Availability, RouteEntry, RouteView } from "../api/types";
import { ItemCard } from "./ItemCard";
import { groupByLeg } from "./legs";
import { TrackerPanel } from "./TrackerPanel";

interface RouteTabProps {
  route: RouteView;
  availability: Availability;
  /** Briefing for the current beat, from the pack's position tips. */
  tips: string[];
  revealed: Set<string>;
  itemNames: Record<string, string>;
  positionLabels: Record<number, string>;
  hiddenIds: ReadonlySet<string>;
  notes: Record<string, string>;
  onToggle: (itemId: string, collected: boolean) => void;
  onReveal: (itemId: string) => void;
  onEditNote: (itemId: string) => void;
  onProgress: (itemId: string, delta: number) => void;
  onChoose: (itemId: string, optionId: string) => void;
  onAdjustTracker: (trackerId: string, valueId: string, delta: number) => void;
  onReport: (itemId: string) => void;
}

type SectionKey = keyof Pick<RouteView, "now" | "next" | "later">;

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "now", title: "NOW" },
  { key: "next", title: "NEXT" },
  { key: "later", title: "LATER" },
];

export function RouteTab({
  route,
  availability,
  tips,
  revealed,
  itemNames,
  positionLabels,
  hiddenIds,
  notes,
  onToggle,
  onReveal,
  onEditNote,
  onProgress,
  onChoose,
  onAdjustTracker,
  onReport,
}: RouteTabProps) {
  const [showHidden, setShowHidden] = useState(false);
  // Leg groups start expanded in Now and Next, collapsed in Later; a tap
  // flips whichever default applies.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  const legProgress = useMemo(() => {
    const totals = new Map<string, { done: number; total: number }>();
    for (const entry of availability.items) {
      const leg = entry.item.route?.leg;
      if (leg == null) {
        continue;
      }
      const key = `leg:${entry.item.route!.at}|${leg}`;
      const current = totals.get(key) ?? { done: 0, total: 0 };
      current.total++;
      if (entry.status === "collected") {
        current.done++;
      }
      totals.set(key, current);
    }
    return totals;
  }, [availability]);

  const isMasked = (entry: RouteEntry) =>
    entry.masked && !revealed.has(entry.item.id);

  const renderEntry = (entry: RouteEntry) => (
    <ItemCard
      key={entry.item.id}
      item={entry.item}
      status={entry.status}
      missingPrereqs={entry.missingPrereqs}
      masked={isMasked(entry)}
      why={entry.item.route?.why}
      itemNames={itemNames}
      positionLabels={positionLabels}
      hiddenIds={hiddenIds}
      note={notes[entry.item.id]}
      progress={entry.progress}
      windowClosesAt={entry.windowClosesAt}
      reopensAt={entry.reopensAt}
      chosen={entry.chosen}
      possibleNow={entry.possibleNow}
      justOpened={entry.justOpened}
      onToggle={() => onToggle(entry.item.id, entry.status === "collected")}
      onReveal={() => onReveal(entry.item.id)}
      onEditNote={() => onEditNote(entry.item.id)}
      onProgress={(delta) => onProgress(entry.item.id, delta)}
      onChoose={(optionId) => onChoose(entry.item.id, optionId)}
      onReport={() => onReport(entry.item.id)}
    />
  );

  const renderGroups = (entries: RouteEntry[], section: SectionKey) =>
    groupByLeg(entries, (e) => e.item).map((group) => {
      if (group.leg === null) {
        return group.entries.map(renderEntry);
      }
      const groupKey = `${section}:${group.key}`;
      const collapsed =
        section === "later"
          ? !flipped.has(groupKey)
          : flipped.has(groupKey);
      const progress = legProgress.get(group.key);
      const allMasked = group.entries.every(isMasked);
      return (
        <div key={groupKey} className="flex flex-col gap-2.5">
          <button
            onClick={() =>
              setFlipped((prev) => {
                const next = new Set(prev);
                if (next.has(groupKey)) {
                  next.delete(groupKey);
                } else {
                  next.add(groupKey);
                }
                return next;
              })
            }
            aria-expanded={!collapsed}
            className="text-left text-[10px] font-mono tracking-wider flex items-center gap-1.5 text-[var(--ff-cyan)]"
          >
            <span>{collapsed ? "▸" : "▾"}</span>
            <span>{allMasked ? "？？？" : group.leg.toUpperCase()}</span>
            {progress && (
              <span className="text-[var(--ff-dim)]">
                · {progress.done}/{progress.total} done
              </span>
            )}
            {group.at !== null && section !== "now" && (
              <span className="text-[var(--ff-faint)]">
                · {positionLabels[group.at] ?? `beat ${group.at}`}
              </span>
            )}
          </button>
          {!collapsed && group.entries.map(renderEntry)}
        </div>
      );
    });

  // The Later bucket is dominated by masked upcoming items — dozens of identical
  // ？？？ cards. Collapse them behind one expander so the route reads like a plan.
  const renderLater = (entries: RouteEntry[]) => {
    const shown = entries.filter((e) => !isMasked(e));
    const hidden = entries.filter(isMasked);

    return (
      <>
        {renderGroups(shown, "later")}
        {hidden.length > 0 && (
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs font-mono py-2.5 rounded border border-dashed border-[var(--ff-bevel)] text-[var(--ff-dim)]"
          >
            {showHidden
              ? "－ hide upcoming items －"
              : `－ ${hidden.length} upcoming item${hidden.length === 1 ? "" : "s"} hidden －`}
          </button>
        )}
        {showHidden && hidden.map(renderEntry)}
      </>
    );
  };

  const liveTrackers = availability.trackers.filter((t) => t.open);

  return (
    <div className="flex flex-col gap-4">
      {tips.length > 0 && (
        <section className="ff-box p-3">
          <div className="text-[10px] font-mono tracking-[0.25em] mb-1.5 text-[var(--ff-gold)]">
            AT THIS BEAT
          </div>
          <ul className="flex flex-col gap-1">
            {tips.map((tip) => (
              <li
                key={tip}
                className="text-xs leading-snug text-[var(--ff-ink)]"
              >
                <span className="text-[var(--ff-cyan)]">▶</span> {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {liveTrackers.map((view) => (
        <TrackerPanel
          key={view.tracker.id}
          view={view}
          positionLabels={positionLabels}
          onAdjust={onAdjustTracker}
        />
      ))}

      {SECTIONS.map(({ key, title }) => (
        <section key={key}>
          <div className="text-[10px] font-mono tracking-[0.3em] mb-2 text-[var(--ff-gold)]">
            {title}
          </div>
          <div className="flex flex-col gap-2.5">
            {route[key].length === 0 ? (
              <div className="text-center text-xs font-mono py-3 text-[var(--ff-dim)]">
                Nothing here at this story position.
              </div>
            ) : key === "later" ? (
              renderLater(route[key])
            ) : (
              renderGroups(route[key], key)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
