import { useEffect, useMemo, useState } from "react";
import { api } from "./api/client";
import type { AdvanceImpact, GameSummary } from "./api/types";
import { applyTheme } from "./theme/applyTheme";
import { useApi } from "./hooks/useApi";
import { PositionBanner } from "./components/PositionBanner";
import { RouteTab } from "./components/RouteTab";
import { AllItemsTab } from "./components/AllItemsTab";
import { TimelineOverlay } from "./components/TimelineOverlay";
import { PointOfNoReturnModal } from "./components/PointOfNoReturnModal";

export default function App() {
  const games = useApi(() => api.getGames(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gameId = selectedId ?? games.data?.[0]?.id;

  if (games.error) {
    return (
      <Splash text={`Could not reach the companion API: ${games.error}`} />
    );
  }

  if (!gameId) {
    return <Splash text="Loading…" />;
  }

  // key remounts the whole game view on switch: per-game state (tab, reveals,
  // pending dialogs) must not leak between games.
  return (
    <GameApp
      key={gameId}
      gameId={gameId}
      games={games.data ?? []}
      onSelectGame={setSelectedId}
    />
  );
}

function GameSwitcher({
  games,
  currentId,
  onSelect,
}: {
  games: GameSummary[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  if (games.length < 2) {
    return null;
  }
  return (
    <div className="flex justify-center gap-1.5">
      {games.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className={`text-[10px] font-mono tracking-wider px-3 py-1 rounded-full border ${
            g.id === currentId
              ? "border-[var(--ff-cyan)] text-[var(--ff-cyan)] bg-[var(--ff-cyan)]/10"
              : "border-[var(--ff-bevel)] text-[var(--ff-dim)]"
          }`}
        >
          {g.title}
        </button>
      ))}
    </div>
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
}: {
  gameId: string;
  games: GameSummary[];
  onSelectGame: (id: string) => void;
}) {
  const pack = useApi(() => api.getPack(gameId), [gameId]);
  const availability = useApi(() => api.getAvailability(gameId), [gameId]);
  const route = useApi(() => api.getRoute(gameId), [gameId]);

  const [tab, setTab] = useState<"route" | "all">("route");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showTimeline, setShowTimeline] = useState(false);
  const [pendingImpact, setPendingImpact] = useState<AdvanceImpact | null>(
    null,
  );

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
  const refetchState = () => {
    availability.refetch();
    route.refetch();
  };

  const postEvent = async (event: {
    type: string;
    to?: number;
    itemId?: string;
  }) => {
    await api.postEvent(gameId, event);
    refetchState();
  };

  const requestMove = async (target: number) => {
    if (target === position) {
      return;
    }
    if (target < position) {
      await postEvent({ type: "positionCorrected", to: target });
      return;
    }
    const impact = await api.getAdvanceImpact(gameId, target);
    if (impact.closing.length > 0) {
      setPendingImpact(impact);
    } else {
      await postEvent({ type: "positionAdvanced", to: target });
    }
  };

  const toggleCollected = (itemId: string, collected: boolean) =>
    postEvent({
      type: collected ? "itemUncollected" : "itemCollected",
      itemId,
    });

  const reveal = (itemId: string) => setRevealed((r) => new Set(r).add(itemId));

  const resetPlaythrough = async () => {
    if (window.confirm("Archive this playthrough and start fresh?")) {
      await api.postReset(gameId);
      setRevealed(new Set());
      refetchState();
    }
  };

  return (
    <div className="ff-bg py-5 px-3">
      <div className="max-w-md mx-auto flex flex-col gap-3">
        <GameSwitcher
          games={games}
          currentId={gameId}
          onSelect={onSelectGame}
        />
        <div className="text-center">
          <div className="text-[10px] font-mono tracking-[0.3em] text-[var(--ff-dim)]">
            COMPANION · AVAILABILITY TRACKER
          </div>
          <div className="text-xl font-bold tracking-widest mt-0.5 text-[var(--ff-gold)] [text-shadow:0_2px_8px_#00000088]">
            {pack.data.game.title.toUpperCase()}
          </div>
        </div>

        <PositionBanner
          positions={pack.data.positions}
          position={position}
          onBack={() => requestMove(position - 1)}
          onAdvance={() => requestMove(position + 1)}
          onTimeline={() => setShowTimeline(true)}
        />

        <div className="flex gap-1.5">
          {(
            [
              { id: "route", label: "Route" },
              { id: "all", label: "All items" },
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
            onToggle={toggleCollected}
            onReveal={reveal}
          />
        ) : (
          <AllItemsTab
            availability={availability.data}
            revealed={revealed}
            itemNames={itemNames}
            positionLabels={positionLabels}
            onToggle={toggleCollected}
            onReveal={reveal}
          />
        )}

        <div className="text-center text-[10px] font-mono pb-4 text-[var(--ff-faint)]">
          Pack data is scaffolding — verified during play.{" "}
          <button onClick={resetPlaythrough} className="underline">
            New playthrough
          </button>
        </div>
      </div>

      {pendingImpact && (
        <PointOfNoReturnModal
          impact={pendingImpact}
          positions={pack.data.positions}
          onStay={() => setPendingImpact(null)}
          onAdvance={async () => {
            const target = pendingImpact.to;
            setPendingImpact(null);
            await postEvent({ type: "positionAdvanced", to: target });
          }}
        />
      )}

      {showTimeline && (
        <TimelineOverlay
          positions={pack.data.positions}
          position={position}
          onSelect={requestMove}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </div>
  );
}
