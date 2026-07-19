# FF Companion

A replay companion for classic RPGs, running entirely in your browser. Given your declared
story position and collected items, it answers: **what's available, what's about to close
forever, what you've missed, and what to do NOW** via a curated route. Two packs ship:
Final Fantasy VII (1997) and Final Fantasy IX (2000), each with its own theme, story beats,
and save.

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
- **New playthrough** archives the current save (recoverable in localStorage) and starts fresh.
- Small print: the same game open in two tabs at once can lose a tap to a race — one tab
  at a time per game is the supported mode.

## Demo script

From a fresh playthrough:

1. **Advance** twice → *Shinra HQ*. The Route tab's NOW bucket shows the Midgar missables
   as LAST CHANCE.
2. **Advance** again → the point-of-no-return dialog: leaving Midgar permanently closes the
   Turtle's Paradise flyer, Enemy Skill, and Elemental. *Stay — grab them first* or advance anyway.
3. **Timeline** → jump to *Junon Escape — the Highwind* (Disc 2). The dialog lists every
   window the jump skips; advance anyway.
4. The Route tab shows the full chocobo breeding chain in order — with **Knights of the
   Round Blocked** at the end.
5. Collect the chain top to bottom → KotR flips to **Available**.

## How it works

- **Packs** (`companion-web/src/packs/*.json`) — story positions, items with availability
  windows, prereqs, and optional curated route data (`at`, `rank`, `why`). Validated at
  load; the app refuses to start on unknown prereqs, cycles, or bad windows.
- **Engine** (`companion-web/src/engine/`) — pure functions `(pack, events) → views`: a
  seven-rule availability projection, Now/Next/Later route bucketing (a closing missable
  always outranks curation), and advance-impact ("what closes if I jump to X").
- **Saves** (`companion-web/src/storage/`) — an append-only event log
  (`positionAdvanced` / `positionCorrected` / `itemCollected` / `itemUncollected`) in
  localStorage, replayed through the engine on every view.
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
