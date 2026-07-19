# Authoring a game pack

A pack is one JSON file in `companion-web/src/packs/<gameId>.json`. Drop it there and
it is auto-discovered, validated at load (the app refuses to start on a broken pack),
and appears in the game switcher. No code changes are required for a new game.

## Anatomy

```jsonc
{
  "game": { "id": "ff8", "title": "Final Fantasy VIII" },
  "theme": { "tokens": { /* all 17 tokens, see below */ } },
  "positions": [
    { "id": "balamb", "order": 1, "label": "Balamb Garden", "disc": 1 }
  ],
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
- 20–24 beats is the sweet spot: fine enough that windows are meaningful, coarse
  enough that declaring "I'm here" stays a one-tap habit.

## Items

| Field | Meaning |
|---|---|
| `id` | Stable, unique, lowercase. Never rename — saves reference it forever. |
| `name` / `location` | Shown once the item's window opens (or the player reveals it). |
| `type` | Vocabulary chip. Prefer an existing type (see `src/api/types.ts`); unknown types still work and get an auto-generated chip label. |
| `window.opensAt` | First beat (inclusive) the item is obtainable. |
| `window.closesAt` | Last beat (inclusive) it is obtainable; **omit for "never closes"**. |
| `prereqs` | Item ids that must be collected first. Must exist, no cycles. |
| `route` | Optional curation: `at` = beat to do it, `rank` = order within that beat, `why` = one-line reason. Unrouted items still appear everywhere they should. |
| `notes` | One or two sentences of how-to. Assume the player is mid-game on a phone. |
| `verified` | `false` until the window is confirmed in a real playthrough. Ship `false`. |

### Window philosophy

**Pessimistic on dispute.** If sources disagree about when a window closes, close it
earlier — a false "grab it now" costs minutes; a false "you're fine" costs the item
forever. Encode the *practical* window, not the theoretical one (if returning is
technically possible but absurd, close the window).

### Engine semantics (what your data drives)

Status rule chain, first match wins, at player position P:
collected → missed (P > closesAt) → notYet (P < opensAt) → blocked (missing prereqs)
→ lastChance (closesAt == P) → closingSoon (closesAt − P ≤ 2) → available.

Route buckets: NOW (routed at ≤ P, plus every lastChance item), NEXT (routed within
2 beats), LATER (everything else). A closingSoon item is never allowed to sit in
LATER. Items with `opensAt` in the future are masked as `？？？` until revealed.

## Theme

`theme.tokens` needs exactly the same 17 token names as the shipped packs
(`bgTop bgMid bgBottom panelTop panelMid panelBottom border bevel ink dim dimmer
faint gold cyan buttonBorder tickDone tickTodo`) — a test enforces parity. They skin
the chrome only; status colors (available/missed/…) are app-constant. Pick a palette
that evokes the game's own menus and keep `ink`/`dim` readable on `panelMid`.

## Validation (load fails on any of these)

Duplicate position orders or ids · non-contiguous orders · duplicate item ids ·
unknown or cyclic prereqs · `opensAt`/`closesAt`/`route.at` referencing a missing
beat · `closesAt` before `opensAt`.

## Workflow

```powershell
cd companion-web
npm test        # pack validation + engine suite
npm run dev     # click through your pack
```

Add a case to `src/packs/packs.test.ts` asserting your pack's headline facts (item
count range, a signature prereq chain, disc list). Keep `verified: false` everywhere;
flip flags in follow-up PRs as a real playthrough confirms each window.
