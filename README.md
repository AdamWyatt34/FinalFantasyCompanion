# FF Companion

A single-player RPG companion you run locally while replaying a game. Given your declared
story position and collected items, it answers: **what's available, what's about to close
forever, what you've missed, and what to do NOW** via a curated route. Two packs ship:
Final Fantasy VII (1997) and Final Fantasy IX (2000) — each with its own theme, positions,
and playthrough log; a switcher appears in the header when more than one pack is present.

Personal tool by design: no auth, no cloud, no multi-user, no pack SDK.

## Run it

```powershell
dotnet run --project src/Companion.Api
```

That's the whole app — the API serves the built frontend from `wwwroot` and binds
`http://0.0.0.0:5000`. Open http://localhost:5000.

Requires the .NET 10 SDK. To rebuild the frontend first (only needed after changing
`companion-web/`): `cd companion-web; npm install; npm run build`.

### Phone on the LAN

The Steam Deck use case: run the server on your PC, open the app on your phone.

1. `dotnet run --project src/Companion.Api`
2. Find your PC's LAN address: `ipconfig` → IPv4 Address (e.g. `192.168.1.20`)
3. On the phone: `http://192.168.1.20:5000`

Windows will prompt to allow the app through the firewall on first run — allow it for
**private** networks. If you skipped the prompt: Settings → Windows Security → Firewall →
Allow an app, and permit `dotnet` on private networks.

## Demo script

From a fresh playthrough (or after **New playthrough** in the footer):

1. **Advance** twice → you're at *Shinra HQ*. The Route tab's NOW bucket shows the Midgar
   missables as LAST CHANCE.
2. **Advance** again → the point-of-no-return dialog fires: leaving Midgar permanently
   closes the Turtle's Paradise flyer, Enemy Skill, and Elemental. *Stay — grab them first*
   or advance anyway.
3. Open **Timeline** → jump to *Junon Escape — the Highwind* (Disc 2). The dialog lists
   every window the jump skips; advance anyway.
4. The Route tab now shows the full chocobo breeding chain in order — lure, stables, nuts,
   Good/Great pair, racing steps, Blue/Green, Black, Gold — with **Knights of the Round
   Blocked** at the end.
5. Collect the chain top to bottom → KotR flips to **Available**. That's the point of the
   whole app.

## How it works

- **Pack** (`data/packs/ff7.json`) — positions (story beats), items with availability
  windows, prereqs, and optional curated route data (`at`, `rank`, `why`). Validated at
  startup; the process refuses to boot on unknown prereqs, cycles, bad windows.
- **Events** (`data/playthroughs/*.events.jsonl`) — append-only JSONL log of
  `positionAdvanced` / `positionCorrected` / `itemCollected` / `itemUncollected`.
  **Reset** archives the log with a timestamp and starts fresh; that's the entire "new
  playthrough" feature. Deleting an archive file is safe.
- **Engine** (`Companion.Domain`) — pure functions `(pack, events) → views`: a seven-rule
  availability projection, Now/Next/Later route bucketing (a closing missable always
  outranks curation), and advance-impact ("what closes if I jump to X"). Zero I/O.
- **API** (`Companion.Api`) — minimal API over ModulusKit.Mediator commands/queries.
  The server is the source of truth; the React frontend (`companion-web/`) POSTs events
  and refetches.
- **Theming** — all chrome comes from pack theme tokens exposed as `--ff-*` CSS variables;
  components contain zero chrome color literals. Functional status colors are app-constant
  across games. Spoiler masking is client-side by design (soft protection — it's your own
  single-user app; the pack endpoint necessarily exposes everything).

### Dev loop

```powershell
dotnet run --project src/Companion.Api   # API on :5000
cd companion-web; npm run dev            # Vite on :5173, /api proxied to :5000
```

### Tests

```powershell
dotnet test
```

Domain rules, route bucketing invariants, advance-impact edges, pack validation, event-store
round-trip/archive, API smoke tests, and an end-to-end demo-script test against the real
`ff7.json`.

## Pack data honesty

**The pack data is scaffolding, not gospel.** Every item carries `"verified": false`;
windows and beat mappings were authored from general FF7 knowledge and are meant to be
verified (and corrected) during an actual playthrough. Flip `verified` to `true` as you
confirm each one.

## Out of scope, deliberately

Save-file reading, a second game pack, a pack editor/SDK, route optimization (routes are
authored data — the engine only sorts and filters), accounts, cloud anything.
