import { useState } from "react";
import type { RouteEntry, RouteView } from "../api/types";
import { ItemCard } from "./ItemCard";

interface RouteTabProps {
  route: RouteView;
  revealed: Set<string>;
  itemNames: Record<string, string>;
  positionLabels: Record<number, string>;
  onToggle: (itemId: string, collected: boolean) => void;
  onReveal: (itemId: string) => void;
}

const SECTIONS: {
  key: keyof Pick<RouteView, "now" | "next" | "later">;
  title: string;
}[] = [
  { key: "now", title: "NOW" },
  { key: "next", title: "NEXT" },
  { key: "later", title: "LATER" },
];

export function RouteTab({
  route,
  revealed,
  itemNames,
  positionLabels,
  onToggle,
  onReveal,
}: RouteTabProps) {
  const [showHidden, setShowHidden] = useState(false);

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
      onToggle={() => onToggle(entry.item.id, entry.status === "collected")}
      onReveal={() => onReveal(entry.item.id)}
    />
  );

  // The Later bucket is dominated by masked upcoming items — dozens of identical
  // ？？？ cards. Collapse them behind one expander so the route reads like a plan.
  const renderLater = (entries: RouteEntry[]) => {
    const shown = entries.filter((e) => !isMasked(e));
    const hidden = entries.filter(isMasked);

    return (
      <>
        {shown.map(renderEntry)}
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

  return (
    <div className="flex flex-col gap-4">
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
              route[key].map(renderEntry)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
