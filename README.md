# FF Companion

A replay companion for classic RPGs, running entirely in your browser. Given your declared
story position and collected items, it answers: **what's available, what's about to close
forever, what you've missed, and what to do NOW** via a curated route. Seven packs ship —
Final Fantasy IV, VI, VII, VIII, IX, X (HD Remaster), and XII (original PS2) — each with
its own theme, story beats, and save.

Fully static — no server, no accounts. Every visitor gets their own save, stored in their
own browser.

## Run it

```powershell
cd companion-web
npm install
npm run dev
```

Open http://localhost:5173. That's the whole dev loop; `npm test` runs the engine suite.

## Deploy (GitHub Pages)

Pushes to `main` build, test, and deploy automatically via `.github/workflows/deploy.yml`.
One-time setup after creating the GitHub repo:

1. Push the repo (public, unless you have a paid plan — Pages on private repos requires one).
2. Settings → Pages → Source: **GitHub Actions**.

The build uses a relative base path, so it works at any `https://<user>.github.io/<repo>/` URL.

## Saves

- Progress is saved automatically in the browser's localStorage, per game, on every tap.
  Close the tab, come back next week — it's there.
- **Saves are per browser.** Your phone and your desktop have separate saves; friends
  visiting the site never see yours.
- Clearing site data clears saves. Use **Export save** (footer) to download a backup, and
  **Import save** to restore it or move it to another device.
- **New playthrough** archives the current save; **Playthroughs** browses and restores
  archives. **History** shows every tap with one-step undo. **Report** is a shareable
  per-disc report card with a **copyable share link** — a read-only snapshot of your
  run encoded in the URL itself, no server involved. Personal per-item notes (✎ on
  any card) travel with exports.
- The **Plan** tab shows the whole curated route beat by beat, legs and all. Counter
  items track tallies (26 primers, 99 frogs) or labelled step checklists (Lucrecia's
  cave: visit, ten battles, return). Mutually exclusive choices (FF6's Ragnarok esper
  vs sword) mark the road not taken as FORGONE. Games with meaningfully different
  releases (FF4 2D/3D, FF6 GBA, FF10 HD, FF12 Zodiac Age) have a version picker per run.
- **Choices** are decisions with graded outcomes — Wall Market's five dress-up slots,
  FF6's Odin or Raiden, FF9's Festival winner. Pick the outcome you got; the best one is
  starred, and the report card lists anything you settled for.
- **Trackers** show hidden running totals the game never tells you about (FF7's
  Gold Saucer date affection), fed by your choices and by ± nudges you log from a guide.
- **Reopening windows**: an item that closes and comes back (FF7's Elemental materia,
  Shinra HQ then the Midgar raid) reads REOPENS LATER in between instead of MISSED, and
  the point-of-no-return dialog separates "closes forever" from "closes for now".
- Every beat carries a **briefing** (what to set up here, what shuts behind you) and,
  where a game has a clock, a **pace** note (FF9's Excalibur II splits). Cards say when
  something is **possible now but planned for later**, and why the route waits.
- **Add game** installs a community pack from JSON at runtime — see
  [docs/PACKS.md](docs/PACKS.md). The ⚑ on any card files a prefilled data-correction
  issue; that's how `verified: false` becomes `true`.
- Small print: two tabs on the same game serialize their writes through the Web Locks
  API where the browser has it, and re-read each other's changes; older browsers fall
  back to last-write-wins, so one tab at a time per game is still the safest mode.

## Demo script

Pick **Final Fantasy VII** in the switcher (games list in series order, so FF4 is the
default), then from a fresh playthrough:

1. **Advance** twice → *Shinra HQ*. The Route tab's NOW bucket shows the Midgar missables
   as LAST CHANCE.
2. **Advance** again → the point-of-no-return dialog: leaving Midgar permanently closes the
   Turtle's Paradise flyer, Enemy Skill, and Elemental. *Stay — grab them first* or advance anyway.
3. **Timeline** → jump to *Junon Escape — the Highwind* (Disc 2). The dialog lists every
   window the jump skips; advance anyway.
4. The Route tab shows the chocobo breeding chain as four legs — set up, the colored
   pair, the black, the gold — with **Knights of the Round Blocked** at the end and the
   materia caves waiting on the right bird.
5. Collect the chain top to bottom → KotR flips to **Available**.
6. Jump back to *Sector 5 & Wall Market* → the five dress-up choices, "Corneo picks
   Cloud" blocked until every slot is at its best, and the date standings panel above.

## How it works

- **Packs** (`companion-web/src/packs/*.json`) — story positions with briefings, items
  with one or more availability windows, any-of prereqs (including `item:option`
  outcomes), choices, step checklists, party requirements, trackers, and optional
  curated route data (`at`, `rank`, `why`, `leg`, `tradeoff`). Validated at load; the
  app refuses to start on unknown prereqs, cycles, or bad windows.
- **Engine** (`companion-web/src/engine/`) — pure functions `(pack, events) → views`: a
  nine-rule availability projection, Now/Next/Later route bucketing (a closing missable
  always outranks curation; a closed-for-now item never sits in Now), advance-impact
  ("what closes forever, what closes for now, if I jump to X"), and tracker standings.
- **Saves** (`companion-web/src/storage/`) — an append-only event log
  (`positionAdvanced` / `positionCorrected` / `itemCollected` / `itemUncollected` /
  `itemProgressed` / `choiceMade` / `trackerAdjusted` / `versionSelected`) in
  localStorage, replayed through the engine on every view. Unknown event types from a
  newer build are ignored rather than breaking the fold.
- **Theming** — all chrome comes from pack theme tokens exposed as `--ff-*` CSS variables;
  components contain zero chrome color literals. Functional status colors are app-constant
  across games. Spoiler masking is soft by design ("Reveal anyway" is always there).

## Adding a game

A game is one JSON pack — no code. See [docs/PACKS.md](docs/PACKS.md) for the format,
window-authoring philosophy, and validation rules.

## Pack data honesty

**The pack data is scaffolding, not gospel.** Every item carries `"verified": false`;
windows and beat mappings were authored from general game knowledge and are meant to be
verified (and corrected) during an actual playthrough. Windows with disputed behavior are
set pessimistically — a false "grab it now" beats a false "you're fine."

## Out of scope, deliberately

Save-file reading, a pack editor/SDK, route optimization (routes are authored data — the
engine only sorts and filters), accounts, servers, cloud anything.
