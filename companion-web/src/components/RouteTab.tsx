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
  const renderEntry = (entry: RouteEntry) => (
    <ItemCard
      key={entry.item.id}
      item={entry.item}
      status={entry.status}
      missingPrereqs={entry.missingPrereqs}
      masked={entry.masked && !revealed.has(entry.item.id)}
      why={entry.item.route?.why}
      itemNames={itemNames}
      positionLabels={positionLabels}
      onToggle={() => onToggle(entry.item.id, entry.status === "collected")}
      onReveal={() => onReveal(entry.item.id)}
    />
  );

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
            ) : (
              route[key].map(renderEntry)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
