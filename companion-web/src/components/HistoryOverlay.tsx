import { useMemo } from "react";
import type { Pack } from "../api/types";
import { api } from "../api/client";
import type { ProgressEvent } from "../engine/events";
import { useApi } from "../hooks/useApi";
import { useDialog } from "../hooks/useDialog";

interface HistoryOverlayProps {
  pack: Pack;
  onChanged: () => void;
  onClose: () => void;
}

/**
 * Every tap of this playthrough, newest first, with one-step undo. Nothing
 * here can spoil: positions visited and items collected are already known.
 */
export function HistoryOverlay({
  pack,
  onChanged,
  onClose,
}: HistoryOverlayProps) {
  const events = useApi(() => api.getEvents(pack.game.id), []);
  const panelRef = useDialog(onClose);

  const itemNames = useMemo(
    () => Object.fromEntries(pack.items.map((i) => [i.id, i.name])),
    [pack],
  );
  const positionLabels = useMemo(
    () => Object.fromEntries(pack.positions.map((p) => [p.order, p.label])),
    [pack],
  );

  const describe = (evt: ProgressEvent): string => {
    switch (evt.type) {
      case "positionAdvanced":
        return `▶ Advanced to ${positionLabels[evt.to] ?? `beat ${evt.to}`}`;
      case "positionCorrected":
        return `↩ Corrected to ${positionLabels[evt.to] ?? `beat ${evt.to}`}`;
      case "itemCollected":
        return `✓ Collected ${itemNames[evt.itemId] ?? evt.itemId}`;
      case "itemUncollected":
        return `✗ Unmarked ${itemNames[evt.itemId] ?? evt.itemId}`;
    }
  };

  const when = (evt: ProgressEvent) => {
    const date = new Date(evt.occurredAt);
    return Number.isNaN(date.getTime())
      ? evt.occurredAt
      : date.toLocaleString();
  };

  const undo = async () => {
    try {
      await api.postUndo(pack.game.id);
      events.refetch();
      onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Undo failed.");
    }
  };

  const list = events.data ?? [];
  const newestFirst = [...list].reverse();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/70"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Playthrough history"
        className="ff-box p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono tracking-[0.25em] text-[var(--ff-gold)]">
            HISTORY
          </div>
          {list.length > 0 && (
            <button
              onClick={undo}
              className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
            >
              ↩ Undo last
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="text-center text-xs font-mono py-4 text-[var(--ff-dim)]">
            No actions yet this playthrough.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {newestFirst.map((evt, i) => (
              <div
                key={list.length - i}
                className="rounded border border-[var(--ff-bevel)] px-2.5 py-1.5"
              >
                <div className="text-sm text-[var(--ff-ink)]">
                  {describe(evt)}
                </div>
                <div className="text-[10px] font-mono mt-0.5 text-[var(--ff-dim)]">
                  {when(evt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
