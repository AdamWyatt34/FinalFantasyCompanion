import { useMemo, useState } from "react";
import type { Availability, ItemType, Status } from "../api/types";
import { STATUS, TYPE_LABEL } from "../theme/statusColors";
import { ItemCard } from "./ItemCard";

interface AllItemsTabProps {
  availability: Availability;
  revealed: Set<string>;
  itemNames: Record<string, string>;
  positionLabels: Record<number, string>;
  onToggle: (itemId: string, collected: boolean) => void;
  onReveal: (itemId: string) => void;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "upcoming", label: "Upcoming" },
  { id: "missed", label: "Missed" },
  { id: "done", label: "Done" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const FILTER_MAP: Record<FilterId, (s: Status) => boolean> = {
  all: () => true,
  open: (s) =>
    ["available", "closingSoon", "lastChance", "blocked"].includes(s),
  upcoming: (s) => s === "notYet",
  missed: (s) => s === "missed",
  done: (s) => s === "collected",
};

export function AllItemsTab({
  availability,
  revealed,
  itemNames,
  positionLabels,
  onToggle,
  onReveal,
}: AllItemsTabProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [typeFilter, setTypeFilter] = useState<ItemType | "all">("all");
  const [query, setQuery] = useState("");

  const presentTypes = useMemo(
    () => [...new Set(availability.items.map((e) => e.item.type))],
    [availability],
  );

  const sorted = useMemo(
    () =>
      [...availability.items].sort(
        (a, b) =>
          STATUS[a.status].rank - STATUS[b.status].rank ||
          (a.item.closesAt ?? 999) - (b.item.closesAt ?? 999) ||
          a.item.opensAt - b.item.opensAt,
      ),
    [availability],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<Status, number>> = {};
    for (const { status } of sorted) {
      c[status] = (c[status] ?? 0) + 1;
    }
    return c;
  }, [sorted]);

  const needle = query.trim().toLowerCase();
  const shown = sorted.filter((entry) => {
    if (!FILTER_MAP[filter](entry.status)) {
      return false;
    }
    if (typeFilter !== "all" && entry.item.type !== typeFilter) {
      return false;
    }
    if (needle.length > 0) {
      // Spoiler-safe: masked items never match a search — matching would
      // confirm a hidden item's existence by name.
      if (entry.status === "notYet" && !revealed.has(entry.item.id)) {
        return false;
      }
      const haystack =
        `${entry.item.name} ${entry.item.location} ${entry.item.notes}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] font-mono">
        {(Object.keys(STATUS) as Status[]).map((key) =>
          counts[key] ? (
            <span key={key} style={{ color: STATUS[key].color }}>
              {STATUS[key].label} {counts[key]}
            </span>
          ) : null,
        )}
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
              filter === f.id
                ? "border-[var(--ff-cyan)] text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/8"
                : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {presentTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...presentTypes] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                typeFilter === t
                  ? "border-[var(--ff-gold)] text-[var(--ff-gold)] bg-[var(--ff-gold)]/10"
                  : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
              }`}
            >
              {t === "all" ? "ALL TYPES" : (TYPE_LABEL[t] ?? t.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items…"
        className="w-full bg-transparent text-xs font-mono px-3 py-1.5 rounded border border-[var(--ff-bevel)] text-[var(--ff-ink)] placeholder:text-[var(--ff-faint)] focus:border-[var(--ff-cyan)] focus:outline-none"
      />

      <div className="flex flex-col gap-2.5">
        {shown.length === 0 && (
          <div className="text-center text-xs font-mono py-6 text-[var(--ff-dim)]">
            Nothing here at this story position.
          </div>
        )}
        {shown.map((entry) => (
          <ItemCard
            key={entry.item.id}
            item={entry.item}
            status={entry.status}
            missingPrereqs={entry.missingPrereqs}
            masked={entry.status === "notYet" && !revealed.has(entry.item.id)}
            itemNames={itemNames}
            positionLabels={positionLabels}
            onToggle={() =>
              onToggle(entry.item.id, entry.status === "collected")
            }
            onReveal={() => onReveal(entry.item.id)}
          />
        ))}
      </div>
    </div>
  );
}
