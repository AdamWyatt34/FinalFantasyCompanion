import { useMemo } from "react";
import type { Availability, Pack } from "../api/types";
import { useDialog } from "../hooks/useDialog";
import { encodeShareFragment, type SharedRun } from "../storage/shareLink";
import { useDialogs } from "../hooks/useDialogs";

interface ReportOverlayProps {
  pack: Pack;
  availability: Availability;
  onClose: () => void;
}

/**
 * Report card for the current run: overall and per-disc progress plus every
 * permanently missed item, copyable as plain text to share. Missed names are
 * shown unmasked — the All Items tab already does once a window closes.
 */
export function ReportOverlay({
  pack,
  availability,
  onClose,
}: ReportOverlayProps) {
  const panelRef = useDialog(onClose);
  const dialogs = useDialogs();

  const report = useMemo(() => {
    const discOfOrder = new Map(pack.positions.map((p) => [p.order, p.disc]));
    const discs = [...new Set(pack.positions.map((p) => p.disc))].sort(
      (a, b) => a - b,
    );

    const perDisc = discs.map((disc) => {
      const entries = availability.items.filter(
        (e) => discOfOrder.get(e.item.opensAt) === disc,
      );
      return {
        disc,
        total: entries.length,
        collected: entries.filter((e) => e.status === "collected").length,
        missed: entries.filter((e) => e.status === "missed").length,
      };
    });

    const collected = availability.items.filter(
      (e) => e.status === "collected",
    ).length;
    const missedNames = availability.items
      .filter((e) => e.status === "missed")
      .map((e) => e.item.name);
    const forgoneNames = availability.items
      .filter((e) => e.status === "forgone")
      .map((e) => e.item.name);
    // Choices made below the recommended outcome — the "could have been
    // better" list a replay report exists for.
    const belowBest = availability.items
      .filter((e) => e.chosen !== null && e.item.options.some((o) => o.best))
      .filter((e) => !e.item.options.find((o) => o.id === e.chosen)?.best)
      .map((e) => {
        const chosen = e.item.options.find((o) => o.id === e.chosen)!;
        const best = e.item.options.find((o) => o.best)!;
        return `${e.item.name} (chose ${chosen.label}, best ${best.label})`;
      });
    const choicesMade = availability.items.filter(
      (e) => e.chosen !== null,
    ).length;
    const standings = availability.trackers
      .filter((t) => t.open)
      .map(
        (t) =>
          `${t.tracker.name}${t.locked ? " (final)" : ""}: ${t.standings
            .map((s) => `${s.label} ${s.value}`)
            .join(" · ")}`,
      );
    const positionLabel =
      pack.positions.find((p) => p.order === availability.position)?.label ??
      `beat ${availability.position}`;

    return {
      perDisc,
      collected,
      missedNames,
      forgoneNames,
      belowBest,
      choicesMade,
      standings,
      positionLabel,
      total: availability.items.length,
    };
  }, [pack, availability]);

  const pct =
    report.total === 0
      ? 0
      : Math.round((report.collected / report.total) * 100);

  const asText = () =>
    [
      `${pack.game.title} — replay report`,
      `At: ${report.positionLabel}`,
      `Collected: ${report.collected}/${report.total} (${pct}%)`,
      ...report.perDisc.map(
        (d) =>
          `Disc ${d.disc}: ${d.collected}/${d.total} collected` +
          (d.missed > 0 ? `, ${d.missed} missed` : ""),
      ),
      report.missedNames.length > 0
        ? `Missed forever: ${report.missedNames.join(", ")}`
        : "Nothing missed so far.",
      ...(report.forgoneNames.length > 0
        ? [`Forgone by choice: ${report.forgoneNames.join(", ")}`]
        : []),
      ...(report.belowBest.length > 0
        ? [`Below best: ${report.belowBest.join("; ")}`]
        : []),
      ...report.standings,
    ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
    } catch {
      await dialogs.alert("Could not access the clipboard.");
    }
  };

  const copyShareLink = async () => {
    try {
      const run: SharedRun = {
        gameId: pack.game.id,
        position: availability.position,
        version: availability.version,
        collected: availability.items
          .filter((e) => e.status === "collected")
          .map((e) => e.item.id),
        progress: Object.fromEntries(
          availability.items
            .filter((e) => e.item.count > 1 && e.progress > 0)
            .map((e) => [e.item.id, e.progress]),
        ),
        choices: Object.fromEntries(
          availability.items
            .filter((e) => e.chosen !== null)
            .map((e) => [e.item.id, e.chosen!]),
        ),
        adjustments: availability.adjustments,
      };
      const fragment = await encodeShareFragment(run);
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}#run=${fragment}`,
      );
      await dialogs.alert(
        "Share link copied — anyone opening it sees this run, read-only.",
      );
    } catch {
      await dialogs.alert("Could not build the share link.");
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
        aria-label="Playthrough report"
        className="ff-box p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[10px] font-mono tracking-[0.25em] mb-2 text-[var(--ff-gold)]">
          REPORT CARD
        </div>

        <div className="text-sm text-[var(--ff-ink)]">
          {report.positionLabel}
        </div>
        <div className="text-xs font-mono mt-1 text-[var(--ff-cyan)]">
          {report.collected}/{report.total} collected · {pct}%
        </div>

        <div className="mt-2 flex flex-col gap-1">
          {report.perDisc.map((d) => (
            <div
              key={d.disc}
              className="flex justify-between text-[11px] font-mono text-[var(--ff-dim)]"
            >
              <span>Disc {d.disc}</span>
              <span>
                {d.collected}/{d.total}
                {d.missed > 0 && (
                  <span className="text-[var(--ff-gold)]">
                    {" "}
                    · {d.missed} missed
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {report.missedNames.length > 0 ? (
          <div className="mt-2 text-[11px] text-[var(--ff-dim)]">
            <span className="font-mono text-[var(--ff-gold)]">
              Missed forever:
            </span>{" "}
            {report.missedNames.join(", ")}
          </div>
        ) : (
          <div className="mt-2 text-[11px] italic text-[var(--ff-dim)]">
            Nothing missed so far.
          </div>
        )}

        {report.forgoneNames.length > 0 && (
          <div className="mt-1 text-[11px] text-[var(--ff-dim)]">
            <span className="font-mono text-[var(--ff-gold)]">
              Forgone by choice:
            </span>{" "}
            {report.forgoneNames.join(", ")}
          </div>
        )}

        {report.choicesMade > 0 && (
          <div className="mt-1 text-[11px] text-[var(--ff-dim)]">
            <span className="font-mono text-[var(--ff-gold)]">Choices:</span>{" "}
            {report.choicesMade - report.belowBest.length}/{report.choicesMade}{" "}
            at the best outcome
            {report.belowBest.length > 0 && <> — {report.belowBest.join("; ")}</>}
          </div>
        )}

        {report.standings.map((line) => (
          <div key={line} className="mt-1 text-[11px] text-[var(--ff-dim)]">
            <span className="font-mono text-[var(--ff-gold)]">Standings:</span>{" "}
            {line}
          </div>
        ))}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copy}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
          >
            Copy as text
          </button>
          <button
            onClick={copyShareLink}
            className="text-[11px] font-mono px-3 py-1 rounded border border-[var(--ff-gold)]/55 text-[var(--ff-gold)]"
          >
            Copy share link
          </button>
        </div>
      </div>
    </div>
  );
}
