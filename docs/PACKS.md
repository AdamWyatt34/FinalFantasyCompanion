# Authoring a game pack

A pack is one JSON file in `companion-web/src/packs/<gameId>.json`. Drop it there and
it is auto-discovered, validated at load (the app refuses to start on a broken pack),
and appears in the game switcher. No code changes are required for a new game.

Packs can also be installed at runtime — **Add game** in the app footer loads a
pack JSON straight into the browser, validated the same way. Perfect for testing
your pack (or shipping one that never lands in this repo).

## Anatomy

```jsonc
{
  "game": {
    "id": "ff8",
    "title": "Final Fantasy VIII",
    // optional: release variants with differing content; first = default
    "versions": [{ "id": "ps2", "label": "PS2 original" }]
  },
  "theme": { "tokens": { /* all 17 tokens, see below */ } },
  "positions": [
    {
      "id": "balamb", "order": 1, "label": "Balamb Garden", "disc": 1,
      // optional briefing shown once the player arrives (spoiler-light)
      "tips": ["Occult Fan I is on the library's rear rack."],
      // optional playtime note for timed rewards
      "pace": "Excalibur II: finish Disc 1 by ≈2:00"
    }
  ],
  "trackers": [ /* optional hidden running totals — see Trackers */ ],
  "items": [
    {
      "id": "quezacotl",
      "name": "Quezacotl",
      "type": "gf",
      "location": "Balamb Garden — study panel",
      "window": { "opensAt": 1, "closesAt": 3 },
      "prereqs": [],
      "route": { "at": 1, "rank": 0, "why": "Junction before the fire cavern" },
      "notes": "Talk to the study panel before the SeeD exam.",
      "verified": false
    }
  ]
}
```

## Positions (story beats)

- `order` values must be contiguous integers starting anywhere (use `1..N`) — the
  Advance button steps by one and validation rejects gaps.
- `label` is what the player sees on the timeline **before reaching it** — keep labels
  spoiler-light ("Forgotten City", not "Aerith dies").
- `disc` is the act number: literal discs for PSX games, world/act number otherwise
  (e.g. FF6: 1 = World of Balance, 2 = World of Ruin).
- `tips` is the beat briefing: one to three sentences on what to set up or finish here
  ("Wall Market before Corneo's mansion: five one-shot picks…"). Shown at the top of
  the Route tab on arrival and in the Plan tab for beats already reached; future beats
  only show a tip count. Write them for a player mid-game on a phone.
- `pace` is an optional playtime note ("under 12:00:00 for Excalibur II") shown in the
  banner and the Plan tab.
- 20–24 beats is the sweet spot: fine enough that windows are meaningful, coarse
  enough that declaring "I'm here" stays a one-tap habit.

## Items

| Field | Meaning |
|---|---|
| `id` | Stable, unique, lowercase. Never rename — saves reference it forever. |
| `name` / `location` | Shown once the item's window opens (or the player reveals it). |
| `type` | Vocabulary chip. Prefer an existing type (see `src/api/types.ts`; `choice` and `sweep` are new); unknown types still work and get an auto-generated chip label. |
| `window.opensAt` | First beat (inclusive) the item is obtainable. |
| `window.closesAt` | Last beat (inclusive) it is obtainable; **omit for "never closes"**. |
| `windows` | Several windows for items that close and reopen (see below). Wins over `window`. |
| `prereqs` | Requirements that must be met first. A string is a plain item id; an inner array is an **any-of group**; `itemId:optionId` requires a specific choice outcome. See below. |
| `excludes` | Mutually exclusive item ids — taking either side marks the other **FORGONE** forever (FF6's Ragnarok esper vs sword). Symmetric; declare on both sides for clarity. |
| `count` | Target for counter items ("×26 primers" shows a tally with +/−). Omit for a plain checkbox. |
| `steps` | Labelled counter steps (`["Visit with Vincent", "~10 battles elsewhere", "Return"]`). Sets `count` to its length; the tally renders as an ordered checklist with a "✓ next step" button. |
| `options` | Makes the item a **choice**: `[{ "id", "label", "best": true, "note" }]`. The player picks one; picking counts as collecting. Mark the recommended outcome `best`. |
| `party` | Party members that must be present (`["Barret"]`). Rendered as "⚔ bring Barret" and echoed in the point-of-no-return warning. |
| `effects` | Tracker deltas applied while collected, keyed `trackerId.valueId` (`{ "date.tifa": 5 }`). Options carry their own `effects`, applied while chosen. |
| `refs` | External guides: `[{ "label", "url" }]` (http/https only). Keeps `notes` short. |
| `versions` | Version ids (from `game.versions`) this item exists in. Omit for all versions. |
| `route` | Optional curation: `at` = beat to do it, `rank` = order within that beat, `why` = one-line reason, `leg` = named group within the beat, `tradeoff` = why the route waits when the item is obtainable earlier. Unrouted items still appear everywhere they should. |
| `notes` | One or two sentences of how-to. Assume the player is mid-game on a phone. |
| `verified` | `false` until the window is confirmed in a real playthrough. Ship `false`. |

### Reopening windows

Some items close and come back: FF7's Elemental materia is on Shinra HQ's 62nd
floor and again during the Disc 2 raid. Declare every span:

```jsonc
"windows": [
  { "opensAt": 3, "closesAt": 3 },
  { "opensAt": 19, "closesAt": 19 }
]
```

Windows must be ascending and must not touch (`opensAt` at least two beats after the
previous `closesAt`); only the last may omit `closesAt`. Between windows the item is
**REOPENS LATER** — never Now, promoted to Next when the reopening is within the
lookahead. The first window's close still reads LAST CHANCE (pessimism), with
"reopens at X" beside it. The point-of-no-return dialog lists it under "closes for now"
rather than "closes forever". Prereqs apply to every window; if only the later window
needs something (FF7's Key to Sector 5), say so in `notes`.

### Any-of prerequisites and choice outcomes

`prereqs` is an AND of groups; each group is satisfied by any one member:

```jsonc
// Mime cave: a black or gold chocobo
"prereqs": [["blackchocobo", "goldchocobo"]]

// Gold chocobo: (Class S black AND Zeio Nut) OR the Desert Rose trade
"prereqs": [["racing3", "desertrose"], ["zeionut", "desertrose"]]

// Corneo picks Cloud: every slot at its best outcome
"prereqs": [["wmdress:silk"], ["wmwig:blonde"], ["wmtiara:diamond"]]
```

A plain string is a one-member group. Blocked cards say "Needs: A or B · C". Cycle
detection treats every ref as an edge, so an any-of that loops back is still rejected.

### Choices

A choice item is a decision with graded outcomes — Wall Market's dress, FF6's
Odin-or-Raiden, FF9's Festival of the Hunt winner:

```jsonc
{
  "id": "wmwig",
  "name": "Wall Market — the wig",
  "type": "choice",
  "window": { "opensAt": 2, "closesAt": 2 },
  "options": [
    { "id": "plain", "label": "Wig", "note": "Lose the squat contest." },
    { "id": "blonde", "label": "Blonde Wig", "best": true, "note": "Win it." }
  ]
}
```

Picking an option records a `choiceMade` event and counts as collecting; re-picking
replaces the earlier choice; "Clear choice" uncollects. Other items can require a
specific outcome with `itemId:optionId` refs. The report card lists choices made
below `best`. A choice cannot also be a counter.

### Trackers

A tracker is a hidden running total the game keeps — FF7's date affection:

```jsonc
"trackers": [{
  "id": "date",
  "name": "Gold Saucer date",
  "window": { "opensAt": 1, "locksAt": 10 },
  "notes": "Whoever leads when the party is stranded at the Gold Saucer takes Cloud out.",
  "values": [
    { "id": "aerith", "label": "Aerith", "start": 50 },
    { "id": "tifa", "label": "Tifa", "start": 30 }
  ],
  "verified": false
}]
```

Standings start at `start`, add the `effects` of every collected item and chosen option,
and add whatever the player logs with the ± buttons (`trackerAdjusted` events). The
panel shows from `opensAt`; after `locksAt` it is read-only. Ties keep declaration
order, so list the tie-break winner first. Only encode `effects` you are sure of — a
wrong delta misleads worse than a missing one.

### Route legs and tradeoffs

`route.leg` names a group inside a beat ("Breeding · leg 2 — the colored pair").
Consecutive entries sharing a leg collapse under one heading with a done count in
the Route tab (expanded in Now and Next, collapsed in Later) and appear as sub-headings
in the Plan tab. Rank legs contiguously.

`route.tradeoff` explains why the route waits when `opensAt` is earlier than
`route.at`. The card then reads "▷ Possible now · planned for Junon Escape — On sale
from your first Farm visit…" while the item is obtainable ahead of schedule.

### Window philosophy

**Pessimistic on dispute.** If sources disagree about when a window closes, close it
earlier — a false "grab it now" costs minutes; a false "you're fine" costs the item
forever. Encode the *practical* window, not the theoretical one (if returning is
technically possible but absurd, close the window). Opening early is the softer
claim: an item that turns out to be unreachable costs a walk, not a run.

### Engine semantics (what your data drives)

Status rule chain, first match wins, at player position P (against the window P is
inside, if any):
collected → forgone (an exclusion partner was taken) → missed (P past the last window)
→ notYet (P < first opensAt) → reopensLater (between windows) → blocked (an unmet
prereq group) → lastChance (current window closes at P) → closingSoon (closes within
2 beats) → available.

Route buckets: NOW (routed at ≤ P, plus every lastChance item), NEXT (routed within
2 beats, or reopening within 2 beats), LATER (everything else). A closingSoon item is
never allowed to sit in LATER; a reopensLater item is never allowed in NOW. Items with
`opensAt` in the future are masked as `？？？` until revealed. Entries whose window opened
at P are flagged NEW.

## Theme

`theme.tokens` needs exactly the same 17 token names as the shipped packs
(`bgTop bgMid bgBottom panelTop panelMid panelBottom border bevel ink dim dimmer
faint gold cyan buttonBorder tickDone tickTodo`) — a test enforces parity. They skin
the chrome only; status colors (available/missed/…) are app-constant. Pick a palette
that evokes the game's own menus and keep `ink`/`dim` readable on `panelMid`.

## Validation (load fails on any of these)

Duplicate position orders or ids · non-contiguous orders · empty tips · duplicate item
ids · unknown or cyclic prereqs · empty prereq groups · option refs naming a missing
option · an item requiring itself · unknown or self-referencing `excludes` · invalid
`count` · `steps` disagreeing with `count` · a choice that is also a counter · duplicate
or colon-bearing option ids · `versions` naming an undeclared game version · an item with
no window · windows referencing a missing beat, closing before opening, overlapping,
touching, or following an open-ended one · `route.at` referencing a missing beat ·
malformed `refs` · effects on unknown tracker values or with zero deltas · trackers with
duplicate ids or value ids, no values, non-integer starts, or beats that do not exist.
One caveat validation can't catch: don't give an item a prereq that only exists in a
different version than the item itself.

## Workflow

```powershell
cd companion-web
npm test        # pack validation + engine suite
npm run dev     # click through your pack
```

Add a case to `src/packs/packs.test.ts` asserting your pack's headline facts (item
count range, a signature prereq chain, disc list). Keep `verified: false` everywhere;
flip flags in follow-up PRs as a real playthrough confirms each window.
