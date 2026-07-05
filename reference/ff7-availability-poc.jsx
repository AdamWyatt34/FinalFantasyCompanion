import { useState, useMemo } from "react";

// ============================================================
// CONTENT PACK — SAMPLE DATA (illustrative, unverified)
// In the real build this is data/ff7-disc1.json
// ============================================================

const POSITIONS = [
  { id: "reactor1", order: 1, label: "Sector 1 Reactor" },
  { id: "sector5", order: 2, label: "Sector 5 & Wall Market" },
  { id: "shinra", order: 3, label: "Shinra HQ" },
  { id: "kalm", order: 4, label: "Kalm & the World Map" },
  { id: "farm", order: 5, label: "Chocobo Farm & Mythril Mine" },
  { id: "junon", order: 6, label: "Junon" },
  { id: "costa", order: 7, label: "Costa del Sol & Corel" },
  { id: "saucer", order: 8, label: "Gold Saucer & Gongaga" },
  { id: "cosmo", order: 9, label: "Cosmo Canyon & Nibelheim" },
  { id: "rocket", order: 10, label: "Rocket Town" },
  { id: "temple", order: 11, label: "Temple of the Ancients" },
  { id: "city", order: 12, label: "Forgotten City" },
];

const ITEMS = [
  {
    id: "flyer1",
    name: "Turtle's Paradise Flyer #1",
    type: "quest",
    location: "Sector 5 slums — kid's house, upstairs",
    opens: 2,
    closes: 3,
    prereqs: [],
    notes: "First of six flyers. Widely listed as missable once you leave Midgar.",
  },
  {
    id: "enemyskill1",
    name: "Enemy Skill Materia",
    type: "materia",
    location: "Shinra HQ — Fl.67 specimen lab",
    opens: 3,
    closes: 3,
    prereqs: [],
    notes: "First of four Enemy Skill materia in the game.",
  },
  {
    id: "elemental",
    name: "Elemental Materia",
    type: "materia",
    location: "Shinra HQ — Fl.62, Mayor Domino's password",
    opens: 3,
    closes: 3,
    prereqs: [],
    notes: "Reopens on a later story return — a v2 'reopening window' case.",
  },
  {
    id: "beta",
    name: "Beta (Enemy Skill)",
    type: "materia",
    location: "Grasslands marshes — Midgar Zolom",
    opens: 5,
    closes: null,
    prereqs: [],
    notes: "Brutal fight this early; one of the best pickups in the game.",
  },
  {
    id: "yuffie",
    name: "Recruit Yuffie",
    type: "character",
    location: "Random encounter in any forest",
    opens: 4,
    closes: null,
    prereqs: [],
    notes: "Skippable but never missable.",
  },
  {
    id: "mythril",
    name: "Mythril",
    type: "key",
    location: "Sleeping Man's cave near Junon (Buggy required)",
    opens: 8,
    closes: 11,
    prereqs: [],
    notes: "Battle-count trick; trade it at the Weapon Seller's house.",
  },
  {
    id: "greatgospel",
    name: "Great Gospel",
    type: "limit",
    location: "Weapon Seller's house",
    opens: 8,
    closes: 11,
    prereqs: ["mythril"],
    notes: "Aerith's final Limit Break. Hard deadline — she leaves the party after the Temple.",
  },
  {
    id: "aerithlimits",
    name: "Aerith — Limit Lv.2 & 3",
    type: "limit",
    location: "Earned in battle with Aerith in the party",
    opens: 1,
    closes: 11,
    prereqs: [],
    notes: "Same deadline as Great Gospel.",
  },
  {
    id: "condor1",
    name: "Fort Condor — early skirmish reward",
    type: "quest",
    location: "Fort Condor",
    opens: 5,
    closes: 8,
    prereqs: [],
    notes: "Battles expire as the story advances (window illustrative).",
  },
  {
    id: "vincent",
    name: "Recruit Vincent + Odin Materia",
    type: "character",
    location: "Shinra Mansion safe — Nibelheim",
    opens: 9,
    closes: null,
    prereqs: [],
    notes: "Optional party member behind the safe puzzle.",
  },
  {
    id: "wutai",
    name: "Wutai — Pagoda of the Five Gods",
    type: "quest",
    location: "Wutai",
    opens: 10,
    closes: null,
    prereqs: ["yuffie"],
    notes: "Yuffie's personal questline.",
  },
];

const ITEM_NAME = Object.fromEntries(ITEMS.map((i) => [i.id, i.name]));
const POS_LABEL = Object.fromEntries(POSITIONS.map((p) => [p.order, p.label]));
const MAX_ORDER = POSITIONS.length;

const TYPE_LABEL = {
  materia: "MATERIA",
  limit: "LIMIT",
  character: "PARTY",
  key: "KEY ITEM",
  quest: "QUEST",
};

// ============================================================
// THE ENGINE — this is the whole domain
// (pack, position, collected) -> status per item
// ============================================================

const LOOKAHEAD = 2;

function statusOf(item, pos, collected) {
  if (collected.has(item.id)) return "collected";
  if (item.closes != null && pos > item.closes) return "missed";
  if (pos < item.opens) return "notyet";
  if (item.prereqs.some((p) => !collected.has(p))) return "blocked";
  if (item.closes === pos) return "lastchance";
  if (item.closes != null && item.closes - pos <= LOOKAHEAD) return "closing";
  return "available";
}

// AdvanceImpact: uncollected items whose window closes strictly
// before `to` — includes windows skipped entirely by the jump.
function advanceImpact(collected, from, to) {
  return ITEMS.filter(
    (i) =>
      !collected.has(i.id) &&
      i.closes != null &&
      i.closes >= from &&
      i.closes < to
  );
}

const STATUS = {
  lastchance: { label: "LAST CHANCE", color: "#ff8585", rank: 0, pulse: true },
  closing: { label: "CLOSING SOON", color: "#ffd06e", rank: 1 },
  blocked: { label: "NEEDS PREREQ", color: "#ffab66", rank: 2 },
  available: { label: "AVAILABLE", color: "#82ffb8", rank: 3 },
  notyet: { label: "UPCOMING", color: "#8a93b8", rank: 4 },
  missed: { label: "MISSED", color: "#f0526e", rank: 5 },
  collected: { label: "COLLECTED", color: "#7de8e0", rank: 6 },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "upcoming", label: "Upcoming" },
  { id: "missed", label: "Missed" },
  { id: "done", label: "Done" },
];

const FILTER_MAP = {
  all: () => true,
  open: (s) => ["available", "closing", "lastchance", "blocked"].includes(s),
  upcoming: (s) => s === "notyet",
  missed: (s) => s === "missed",
  done: (s) => s === "collected",
};

// ============================================================
// PSX MENU CHROME
// ============================================================

const ffBox = {
  background: "linear-gradient(170deg, #26339a 0%, #141d55 45%, #0a102e 100%)",
  border: "1.5px solid #c4cce6",
  boxShadow: "inset 0 0 0 1.5px #333e78, 0 3px 14px rgba(0,0,0,0.55)",
  borderRadius: 7,
};

const GOLD = "#e8c860";
const CYAN = "#7de8e0";
const INK = "#eef1ff";
const DIM = "#9aa3c8";

function Chip({ status }) {
  const s = STATUS[status];
  return (
    <span
      className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded whitespace-nowrap ${
        s.pulse ? "animate-pulse" : ""
      }`}
      style={{
        color: s.color,
        border: `1px solid ${s.color}55`,
        background: "#00000040",
      }}
    >
      {s.label}
    </span>
  );
}

function ItemCard({ item, status, collected, revealed, onToggle, onReveal }) {
  const masked = status === "notyet" && !revealed;
  const isCollected = status === "collected";
  const missed = status === "missed";

  return (
    <div style={ffBox} className={`p-3 ${missed ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`text-sm font-semibold leading-snug ${
              missed ? "line-through" : ""
            }`}
            style={{ color: masked ? DIM : INK }}
          >
            {masked ? "— ？ ？ ？ —" : item.name}
          </div>
          {!masked && (
            <div className="text-[11px] mt-0.5" style={{ color: DIM }}>
              {item.location}
            </div>
          )}
        </div>
        <Chip status={status} />
      </div>

      <div className="mt-2 text-[11px] font-mono" style={{ color: DIM }}>
        {masked ? (
          <>Hidden to avoid spoilers · unlocks at beat {item.opens}</>
        ) : missed ? (
          <>Closed after: {POS_LABEL[item.closes]}</>
        ) : item.closes == null ? (
          <>Never closes</>
        ) : (
          <>
            Closes after:{" "}
            <span style={{ color: status === "lastchance" ? "#ff8585" : INK }}>
              {POS_LABEL[item.closes]}
            </span>
          </>
        )}
      </div>

      {status === "blocked" && (
        <div className="text-[11px] font-mono mt-1" style={{ color: "#ffab66" }}>
          Needs:{" "}
          {item.prereqs
            .filter((p) => !collected.has(p))
            .map((p) => ITEM_NAME[p])
            .join(", ")}
        </div>
      )}

      {!masked && (
        <div className="text-[11px] italic mt-1" style={{ color: "#7b84ad" }}>
          {item.notes}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        {masked ? (
          <button
            onClick={onReveal}
            className="text-[11px] font-mono px-3 py-1 rounded"
            style={{ border: `1px solid ${DIM}66`, color: DIM }}
          >
            Reveal anyway
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-[11px] font-mono px-3 py-1 rounded"
            style={
              isCollected
                ? { border: `1px solid ${CYAN}88`, color: CYAN, background: "#7de8e01a" }
                : { border: "1px solid #5a648f", color: INK }
            }
          >
            {isCollected ? "✓ Collected" : "Mark collected"}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const [pos, setPos] = useState(3); // Shinra HQ — warnings ready to fire
  const [collected, setCollected] = useState(new Set());
  const [revealed, setRevealed] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [pendingTarget, setPendingTarget] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const view = useMemo(
    () =>
      ITEMS.map((item) => ({ item, status: statusOf(item, pos, collected) })).sort(
        (a, b) =>
          STATUS[a.status].rank - STATUS[b.status].rank ||
          (a.item.closes ?? 999) - (b.item.closes ?? 999) ||
          a.item.opens - b.item.opens
      ),
    [pos, collected]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const { status } of view) c[status] = (c[status] || 0) + 1;
    return c;
  }, [view]);

  const impact = pendingTarget != null ? advanceImpact(collected, pos, pendingTarget) : [];

  function requestMove(target) {
    if (target < 1 || target > MAX_ORDER) return;
    if (target <= pos) {
      setPos(target); // backward correction — no gate
      return;
    }
    const closing = advanceImpact(collected, pos, target);
    if (closing.length > 0) setPendingTarget(target);
    else setPos(target);
  }

  function toggle(id) {
    setCollected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const shown = view.filter(({ status }) => FILTER_MAP[filter](status));

  return (
    <div
      className="min-h-screen py-5 px-3"
      style={{
        background: "linear-gradient(180deg, #04061a 0%, #0a1030 60%, #060a22 100%)",
        color: INK,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="max-w-md mx-auto flex flex-col gap-3">
        {/* Title */}
        <div className="text-center">
          <div className="text-[10px] font-mono tracking-[0.3em]" style={{ color: DIM }}>
            COMPANION · AVAILABILITY TRACKER · POC
          </div>
          <div
            className="text-xl font-bold tracking-widest mt-0.5"
            style={{ color: GOLD, textShadow: "0 2px 8px #00000088" }}
          >
            FINAL FANTASY VII
          </div>
        </div>

        {/* Position banner */}
        <div style={ffBox} className="p-3">
          <div className="text-[10px] font-mono tracking-[0.25em]" style={{ color: GOLD }}>
            STORY POSITION
          </div>
          <div className="text-lg font-semibold mt-0.5">{POS_LABEL[pos]}</div>
          <div className="text-[11px] font-mono" style={{ color: DIM }}>
            Disc 1 · beat {pos} / {MAX_ORDER}
          </div>

          {/* progress ticks */}
          <div className="flex gap-1 mt-2">
            {POSITIONS.map((p) => (
              <div
                key={p.id}
                className="h-1.5 flex-1 rounded-sm"
                style={{
                  background:
                    p.order === pos ? CYAN : p.order < pos ? "#3a4a8a" : "#181f4a",
                  boxShadow: p.order === pos ? `0 0 6px ${CYAN}` : "none",
                }}
              />
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => requestMove(pos - 1)}
              disabled={pos <= 1}
              className="text-xs font-mono px-3 py-1.5 rounded disabled:opacity-30"
              style={{ border: "1px solid #5a648f", color: INK }}
            >
              ◀ Back
            </button>
            <button
              onClick={() => setShowTimeline(true)}
              className="text-xs font-mono px-3 py-1.5 rounded flex-1"
              style={{ border: "1px solid #5a648f", color: DIM }}
            >
              Timeline
            </button>
            <button
              onClick={() => requestMove(pos + 1)}
              disabled={pos >= MAX_ORDER}
              className="text-xs font-mono px-3 py-1.5 rounded disabled:opacity-30"
              style={{
                border: `1px solid ${CYAN}88`,
                color: CYAN,
                background: "#7de8e01a",
              }}
            >
              Advance ▶
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] font-mono">
          {Object.entries(STATUS).map(([key, s]) =>
            counts[key] ? (
              <span key={key} style={{ color: s.color }}>
                {s.label} {counts[key]}
              </span>
            ) : null
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-full"
              style={
                filter === f.id
                  ? { border: `1px solid ${CYAN}`, color: CYAN, background: "#7de8e014" }
                  : { border: "1px solid #3a4470", color: DIM }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2.5">
          {shown.length === 0 && (
            <div className="text-center text-xs font-mono py-6" style={{ color: DIM }}>
              Nothing here at this story position.
            </div>
          )}
          {shown.map(({ item, status }) => (
            <ItemCard
              key={item.id}
              item={item}
              status={status}
              collected={collected}
              revealed={revealed.has(item.id)}
              onToggle={() => toggle(item.id)}
              onReveal={() => setRevealed((r) => new Set(r).add(item.id))}
            />
          ))}
        </div>

        <div className="text-center text-[10px] font-mono pb-4" style={{ color: "#5b6494" }}>
          Sample pack — unverified, illustrative data. State is in-memory (POC).
        </div>
      </div>

      {/* Point-of-no-return dialog */}
      {pendingTarget != null && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "#000000b0" }}
        >
          <div style={ffBox} className="p-4 w-full max-w-sm">
            <div
              className="text-xs font-mono tracking-[0.2em] animate-pulse"
              style={{ color: "#ff8585" }}
            >
              ⚠ POINT OF NO RETURN
            </div>
            <div className="text-sm mt-2">
              Advancing to <span style={{ color: GOLD }}>{POS_LABEL[pendingTarget]}</span>{" "}
              permanently closes:
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {impact.map((i) => (
                <div key={i.id} className="text-sm">
                  <span style={{ color: CYAN }}>▶ </span>
                  {i.name}
                  <span className="text-[11px]" style={{ color: DIM }}>
                    {"  "}· {i.location}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setPendingTarget(null)}
                className="text-xs font-mono px-3 py-2 rounded flex-1"
                style={{ border: `1px solid ${CYAN}88`, color: CYAN }}
              >
                Stay — grab them first
              </button>
              <button
                onClick={() => {
                  setPos(pendingTarget);
                  setPendingTarget(null);
                }}
                className="text-xs font-mono px-3 py-2 rounded"
                style={{ border: "1px solid #ff858588", color: "#ff8585" }}
              >
                Advance anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline overlay */}
      {showTimeline && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: "#000000b0" }}
          onClick={() => setShowTimeline(false)}
        >
          <div
            style={ffBox}
            className="p-3 w-full max-w-sm max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-mono tracking-[0.25em] mb-2" style={{ color: GOLD }}>
              JUMP TO STORY BEAT
            </div>
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setShowTimeline(false);
                  requestMove(p.order);
                }}
                className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2"
                style={
                  p.order === pos
                    ? { color: CYAN, background: "#7de8e012" }
                    : { color: p.order < pos ? DIM : INK }
                }
              >
                <span className="font-mono text-[10px] w-5" style={{ color: DIM }}>
                  {p.order}
                </span>
                {p.order === pos && <span style={{ color: CYAN }}>▶</span>}
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
