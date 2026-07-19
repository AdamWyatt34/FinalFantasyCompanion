import { useState } from "react";
import type { Pack } from "../api/types";
import { useDialog } from "../hooks/useDialog";
import { fold } from "../engine/state";
import {
  deleteArchive,
  listArchives,
  restoreArchive,
  type ArchiveInfo,
} from "../storage/eventLog";

interface ArchivesOverlayProps {
  pack: Pack;
  onRestored: () => void;
  onClose: () => void;
}

export function ArchivesOverlay({
  pack,
  onRestored,
  onClose,
}: ArchivesOverlayProps) {
  const [archives, setArchives] = useState<ArchiveInfo[]>(() =>
    listArchives(pack.game.id),
  );
  const panelRef = useDialog(onClose);

  const describe = (archive: ArchiveInfo) => {
    const state = fold(pack, archive.events);
    const label =
      pack.positions.find((p) => p.order === state.position)?.label ??
      `Beat ${state.position}`;
    return `${label} · ${state.collected.size}/${pack.items.length} collected`;
  };

  const when = (archive: ArchiveInfo) => {
    const date = new Date(archive.archivedAt);
    return Number.isNaN(date.getTime())
      ? archive.archivedAt
      : date.toLocaleString();
  };

  const restore = (archive: ArchiveInfo) => {
    if (
      window.confirm(
        "Restore this playthrough? Your current run will be archived first — nothing is lost.",
      )
    ) {
      try {
        restoreArchive(pack.game.id, archive.key);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Restore failed.");
        setArchives(listArchives(pack.game.id));
        return;
      }
      onRestored();
      onClose();
    }
  };

  const remove = (archive: ArchiveInfo) => {
    if (window.confirm("Delete this archived playthrough permanently?")) {
      deleteArchive(pack.game.id, archive.key);
      setArchives(listArchives(pack.game.id));
    }
  };

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
        aria-label="Previous playthroughs"
        className="ff-box p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] font-mono tracking-[0.25em] mb-2 text-[var(--ff-gold)]">
          PREVIOUS PLAYTHROUGHS
        </div>

        {archives.length === 0 ? (
          <div className="text-center text-xs font-mono py-4 text-[var(--ff-dim)]">
            No archived playthroughs. "New playthrough" archives the current
            run.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {archives.map((archive) => (
              <div
                key={archive.key}
                className="rounded border border-[var(--ff-bevel)] px-2.5 py-2"
              >
                <div className="text-sm text-[var(--ff-ink)]">
                  {describe(archive)}
                </div>
                <div className="text-[10px] font-mono mt-0.5 text-[var(--ff-dim)]">
                  archived {when(archive)} · {archive.events.length} events
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => restore(archive)}
                    className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => remove(archive)}
                    className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-button-border)] text-[var(--ff-dim)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
