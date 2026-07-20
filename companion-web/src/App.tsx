import { useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import type { AdvanceImpact, GameSummary } from "./api/types";
import { applyTheme } from "./theme/applyTheme";
import { useApi } from "./hooks/useApi";
import { PositionBanner } from "./components/PositionBanner";
import { RouteTab } from "./components/RouteTab";
import { AllItemsTab } from "./components/AllItemsTab";
import { PlanTab } from "./components/PlanTab";
import { TimelineOverlay } from "./components/TimelineOverlay";
import { PointOfNoReturnModal } from "./components/PointOfNoReturnModal";
import { GameSwitcher, summarize } from "./components/GameSwitcher";
import { SharedRunView } from "./components/SharedRunView";
import { UpdateToast } from "./components/UpdateToast";
import { decodeShareFragment, type SharedRun } from "./storage/shareLink";
import { addCustomPack, isCustomPack, removeCustomPack } from "./packs";
import { downloadSave, installSave, parseSave } from "./storage/saveFile";
import { lastSessionRecap, type SessionRecap } from "./engine/recap";
import { readNotes, writeNote } from "./storage/notes";
import { readRevealed, writeRevealed } from "./storage/revealed";
import { ArchivesOverlay } from "./components/ArchivesOverlay";
import { HistoryOverlay } from "./components/HistoryOverlay";
import { ReportOverlay } from "./components/ReportOverlay";

export default function App() {
  const games = useApi(() => api.getGames(), []);
  // #run=… in the fragment means someone opened a shared-run link: show the
  // read-only viewer without touching this browser's own saves.
  const [shared, setShared] = useState<SharedRun | "error" | null>(null);
  const [hashChecked, setHashChecked] = useState(
    () => !window.location.hash.startsWith("#run="),
  );

  useEffect(() => {
    const match = window.location.hash.match(/^#run=(.+)$/);
    if (!match) {
      return;
    }
    decodeShareFragment(match[1])
      .then(setShared)
      .catch(() => setShared("error"))
      .finally(() => setHashChecked(true));
  }, []);

  const exitShared = () => {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    setShared(null);
  };
  // ?game=ff9 deep-links straight to a game; unknown ids fall back to the first.
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("game"),
  );
  const gameId =
    selectedId != null && games.data?.some((g) => g.id === selectedId)
      ? selectedId
      : games.data?.[0]?.id;

  const selectGame = (id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("game", id);
    window.history.replaceState(null, "", url);
  };

  if (!hashChecked) {
    return <Splash text="Loading…" />;
  }
  if (shared === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-xs font-mono text-neutral-400">
        That share link is damaged or truncated.
        <button onClick={exitShared} className="underline">
          Open my companion
        </button>
      </div>
    );
  }
  if (shared !== null) {
    return <SharedRunView run={shared} onExit={exitShared} />;
  }

  // key remounts the whole game view on switch: per-game state (tab, reveals,
  // pending dialogs) must not leak between games.
  const body = games.error ? (
    <Splash text={`Could not load the game packs: ${games.error}`} />
  ) : !gameId ? (
    <Splash text="Loading…" />
  ) : (
    <GameApp
      key={gameId}
      gameId={gameId}
      games={games.data ?? []}
      onSelectGame={selectGame}
      onGamesChanged={games.refetch}
    />
  );

  return (
    <>
      {body}
      <UpdateToast />
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-xs font-mono text-neutral-400">
      {text}
    </div>
  );
}

function GameApp({
  gameId,
  games,
  onSelectGame,
  onGamesChanged,
}: {
  gameId: string;
  games: GameSummary[];
  onSelectGame: (id: string) => void;
  onGamesChanged: () => void;
}) {
  const pack = useApi(() => api.getPack(gameId), [gameId]);
  const availability = useApi(() => api.getAvailability(gameId), [gameId]);
  const route = useApi(() => api.getRoute(gameId), [gameId]);

  const [tab, setTab] = useState<"route" | "all" | "plan">("route");
  const [revealed, setRevealed] = useState<Set<string>>(() =>
    readRevealed(gameId),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    readNotes(gameId),
  );
  const [showTimeline, setShowTimeline] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [pendingImpact, setPendingImpact] = useState<AdvanceImpact | null>(
    null,
  );
  const [recap, setRecap] = useState<SessionRecap | null>(null);

  useEffect(() => {
    api
      .getEvents(gameId)
      .then((events) => setRecap(lastSessionRecap(events, new Date())))
      .catch(() => {
        // Recap is a nicety; a broken log already surfaces elsewhere.
      });
  }, [gameId]);

  useEffect(() => {
    if (pack.data) {
      applyTheme(pack.data.theme);
    }
  }, [pack.data]);

  const itemNames = useMemo(
    () =>
      Object.fromEntries((pack.data?.items ?? []).map((i) => [i.id, i.name])),
    [pack.data],
  );
  const positionLabels = useMemo(
    () =>
      Object.fromEntries(
        (pack.data?.positions ?? []).map((p) => [p.order, p.label]),
      ),
    [pack.data],
  );
  // Items whose names must not appear anywhere — not yet open and not revealed.
  const hiddenIds = useMemo(
    () =>
      new Set(
        (availability.data?.items ?? [])
          .filter((e) => e.status === "notYet" && !revealed.has(e.item.id))
          .map((e) => e.item.id),
      ),
    [availability.data, revealed],
  );

  if (pack.error || availability.error || route.error) {
    return (
      <Splash
        text={`Something broke: ${pack.error ?? availability.error ?? route.error}`}
      />
    );
  }

  if (!pack.data || !availability.data || !route.data) {
    return <Splash text="Loading…" />;
  }

  const position = availability.data.position;
  const activeVersion = availability.data.version;
  const refetchState = () => {
    availability.refetch();
    route.refetch();
  };

  // Writes can fail (full localStorage quota, blocked storage) — a tap that
  // silently does nothing is worse than an ugly alert.
  const reportError = (e: unknown) =>
    window.alert(
      e instanceof Error ? e.message : "Something went wrong saving progress.",
    );

  const postEvent = async (event: {
    type: string;
    to?: number;
    itemId?: string;
    delta?: number;
    version?: string;
  }) => {
    try {
      await api.postEvent(gameId, event);
      refetchState();
    } catch (e) {
      reportError(e);
    }
  };

  const requestMove = async (target: number) => {
    if (target === position) {
      return;
    }
    if (target < position) {
      await postEvent({ type: "positionCorrected", to: target });
      return;
    }
    try {
      const impact = await api.getAdvanceImpact(gameId, target);
      if (impact.closing.length > 0) {
        setPendingImpact(impact);
      } else {
        await postEvent({ type: "positionAdvanced", to: target });
      }
    } catch (e) {
      reportError(e);
    }
  };

  const toggleCollected = (itemId: string, collected: boolean) => {
    if (!collected && pack.data && availability.data) {
      // Collecting one side of a mutually exclusive pair forecloses the other
      // forever — that deserves a confirm, spoiler-masked like everything else.
      const item = pack.data.items.find((i) => i.id === itemId);
      const partners = pack.data.items.filter(
        (other) =>
          other.id !== itemId &&
          (item?.excludes.includes(other.id) ||
            other.excludes.includes(itemId)) &&
          availability.data!.items.find((e) => e.item.id === other.id)
            ?.status !== "collected",
      );
      if (partners.length > 0) {
        const names = partners
          .map((p) => (hiddenIds.has(p.id) ? "a hidden item" : p.name))
          .join(", ");
        if (
          !window.confirm(
            `Taking this permanently forecloses: ${names}. Continue?`,
          )
        ) {
          return;
        }
      }
    }
    postEvent({
      type: collected ? "itemUncollected" : "itemCollected",
      itemId,
    });
  };

  const progressItem = (itemId: string, delta: number) =>
    postEvent({ type: "itemProgressed", itemId, delta });

  // The verification flywheel: every card can file a prefilled pack-data
  // issue. Real playthroughs are the only source of `verified: true`.
  const reportItem = (itemId: string) => {
    const item = pack.data?.items.find((i) => i.id === itemId);
    if (!item || !pack.data) {
      return;
    }
    const title = encodeURIComponent(
      `[pack] ${pack.data.game.id}/${item.id}: window correction`,
    );
    const body = encodeURIComponent(
      [
        `Game: ${pack.data.game.title} (${pack.data.game.id})`,
        `Item: ${item.name} (\`${item.id}\`)`,
        `Current window: opensAt ${item.opensAt}, closesAt ${item.closesAt ?? "never"}`,
        `Verified flag: ${item.verified}`,
        `My position when I noticed: beat ${position}`,
        "",
        "What did you see in-game?",
        "",
      ].join("\n"),
    );
    window.open(
      `https://github.com/AdamWyatt34/FinalFantasyCompanion/issues/new?title=${title}&body=${body}`,
      "_blank",
      "noopener",
    );
  };

  const changeVersion = (versionId: string, label: string) => {
    if (versionId === availability.data?.version) {
      return;
    }
    if (
      window.confirm(
        `Switch this run to ${label}? Availability recalculates for that version.`,
      )
    ) {
      postEvent({ type: "versionSelected", version: versionId });
    }
  };

  const reveal = (itemId: string) => {
    const next = new Set(revealed).add(itemId);
    writeRevealed(gameId, next);
    setRevealed(next);
  };

  const editNote = (itemId: string) => {
    const name = itemNames[itemId] ?? itemId;
    const next = window.prompt(
      `Your note for ${name} (empty to remove):`,
      notes[itemId] ?? "",
    );
    if (next === null) {
      return;
    }
    writeNote(gameId, itemId, next);
    setNotes(readNotes(gameId));
  };

  // A fresh or replaced playthrough starts fully masked again.
  const clearRevealed = () => {
    writeRevealed(gameId, new Set());
    setRevealed(new Set());
  };

  const resetPlaythrough = async () => {
    if (window.confirm("Archive this playthrough and start fresh?")) {
      try {
        await api.postReset(gameId);
        clearRevealed();
        refetchState();
      } catch (e) {
        reportError(e);
      }
    }
  };

  const addGameFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      try {
        const added = addCustomPack(await file.text());
        onGamesChanged();
        onSelectGame(added.game.id);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "Could not add that pack.",
        );
      }
    };
    input.click();
  };

  const removeGame = () => {
    if (
      window.confirm(
        `Remove ${pack.data?.game.title} from this device? Its saves, archives, and notes are deleted too.`,
      )
    ) {
      try {
        removeCustomPack(gameId);
        onGamesChanged();
      } catch (e) {
        reportError(e);
      }
    }
  };

  const importFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !pack.data) {
        return;
      }
      try {
        const save = parseSave(await file.text());

        if (save.gameId !== gameId) {
          // The save belongs to another game — offer to switch, don't just fail.
          const target = await api.getPack(save.gameId).catch(() => null);
          if (target === null) {
            throw new Error(
              `That save belongs to '${save.gameId}', which isn't a game in this app.`,
            );
          }
          if (
            window.confirm(
              `This save is for ${target.game.title}. Switch to it and import?`,
            )
          ) {
            installSave(target, save);
            writeRevealed(target.game.id, new Set());
            onSelectGame(target.game.id);
          }
          return;
        }

        if (
          !window.confirm(
            `Replace the current ${pack.data.game.title} playthrough with this save?`,
          )
        ) {
          return;
        }
        installSave(pack.data, save);
        clearRevealed();
        setNotes(readNotes(gameId));
        refetchState();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Import failed.");
      }
    };
    input.click();
  };

  return (
    <div className="ff-bg py-5 px-3">
      <div className="max-w-md mx-auto flex flex-col gap-3">
        <GameSwitcher
          games={games}
          currentId={gameId}
          currentProgress={summarize(pack.data, availability.data)}
          onSelect={onSelectGame}
        />
        <div className="text-center">
          <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--ff-dim)]">
            COMPANION · AVAILABILITY TRACKER
          </div>
          <div className="text-xl font-bold tracking-widest mt-0.5 text-[var(--ff-gold)] [text-shadow:0_2px_8px_#00000088]">
            {pack.data.game.title.toUpperCase()}
          </div>
          {pack.data.game.versions && (
            <div className="mt-1.5 flex justify-center gap-1.5">
              {pack.data.game.versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => changeVersion(v.id, v.label)}
                  aria-pressed={activeVersion === v.id}
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                    activeVersion === v.id
                      ? "border-[var(--ff-cyan)] text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/8"
                      : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <PositionBanner
          positions={pack.data.positions}
          position={position}
          onBack={() => requestMove(position - 1)}
          onAdvance={() => requestMove(position + 1)}
          onTimeline={() => setShowTimeline(true)}
        />

        {recap && (
          <div className="ff-box px-3 py-2 flex items-start justify-between gap-2">
            <div className="text-[11px] leading-snug text-[var(--ff-dim)]">
              <span className="font-mono text-[var(--ff-cyan)]">
                WELCOME BACK
              </span>{" "}
              — last session:{" "}
              {[
                recap.collected > 0 ? `${recap.collected} collected` : null,
                recap.progressed > 0 ? `+${recap.progressed} tallies` : null,
                recap.reachedOrder !== null
                  ? `reached ${positionLabels[recap.reachedOrder] ?? `beat ${recap.reachedOrder}`}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <button
              onClick={() => setRecap(null)}
              aria-label="Dismiss recap"
              className="text-[var(--ff-dim)] text-xs leading-none mt-0.5"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-1.5">
          {(
            [
              { id: "route", label: "Route" },
              { id: "all", label: "All items" },
              { id: "plan", label: "Plan" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs font-mono px-4 py-1.5 rounded-full border ${
                tab === t.id
                  ? "border-[var(--ff-gold)] text-[var(--ff-gold)] bg-[var(--ff-gold)]/10"
                  : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "route" ? (
          <RouteTab
            route={route.data}
            revealed={revealed}
            itemNames={itemNames}
            positionLabels={positionLabels}
            hiddenIds={hiddenIds}
            notes={notes}
            onToggle={toggleCollected}
            onReveal={reveal}
            onEditNote={editNote}
            onProgress={progressItem}
            onReport={reportItem}
          />
        ) : tab === "all" ? (
          <AllItemsTab
            availability={availability.data}
            revealed={revealed}
            itemNames={itemNames}
            positionLabels={positionLabels}
            hiddenIds={hiddenIds}
            notes={notes}
            onToggle={toggleCollected}
            onReveal={reveal}
            onEditNote={editNote}
            onProgress={progressItem}
            onReport={reportItem}
          />
        ) : (
          <PlanTab
            positions={pack.data.positions}
            availability={availability.data}
            position={position}
            hiddenIds={hiddenIds}
          />
        )}

        <div className="text-center text-[10px] font-mono pb-4 text-[var(--ff-faint)]">
          <div>
            Pack data is scaffolding —{" "}
            {availability.data.items.filter((e) => e.item.verified).length}/
            {availability.data.items.length} windows verified during play.
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            <button onClick={resetPlaythrough} className="underline">
              New playthrough
            </button>
            <button onClick={() => downloadSave(gameId)} className="underline">
              Export save
            </button>
            <button onClick={importFromFile} className="underline">
              Import save
            </button>
            <button onClick={() => setShowArchives(true)} className="underline">
              Playthroughs
            </button>
            <button onClick={() => setShowHistory(true)} className="underline">
              History
            </button>
            <button onClick={() => setShowReport(true)} className="underline">
              Report
            </button>
            <button onClick={addGameFromFile} className="underline">
              Add game
            </button>
            {isCustomPack(gameId) && (
              <button onClick={removeGame} className="underline">
                Remove game
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingImpact && (
        <PointOfNoReturnModal
          impact={pendingImpact}
          positions={pack.data.positions}
          hiddenIds={hiddenIds}
          onStay={() => setPendingImpact(null)}
          onAdvance={async () => {
            const target = pendingImpact.to;
            setPendingImpact(null);
            await postEvent({ type: "positionAdvanced", to: target });
          }}
        />
      )}

      {showReport && (
        <ReportOverlay
          pack={pack.data}
          availability={availability.data}
          onClose={() => setShowReport(false)}
        />
      )}

      {showHistory && (
        <HistoryOverlay
          pack={pack.data}
          onChanged={refetchState}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showArchives && (
        <ArchivesOverlay
          pack={pack.data}
          onRestored={() => {
            clearRevealed();
            refetchState();
          }}
          onClose={() => setShowArchives(false)}
        />
      )}

      {showTimeline && (
        <TimelineOverlay
          positions={pack.data.positions}
          position={position}
          hiddenIds={hiddenIds}
          getImpact={(target) => api.getAdvanceImpact(gameId, target)}
          upcomingOpens={(target) =>
            availability.data!.items.filter(
              (e) => e.item.opensAt > position && e.item.opensAt <= target,
            ).length
          }
          onSelect={requestMove}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </div>
  );
}
