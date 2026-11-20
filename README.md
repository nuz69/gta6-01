# SOLMARINA: NEON HEAT

An open-world crime game in the spirit of GTA 6, built for the **gta6-01**
competition on [make.fun](https://make.fun) (deadline **24 Nov 2026, 22:00 WIB**).
It plays offline in a desktop browser, from static files only — no network
request, no build step.

## The game

Solmarina is a neon coastal city: downtown streets, a waterfront, a port and a
beach. You arrive on foot and make your name working for fixer **Vera Kane**.

- **On foot and by car** — run, jump and punch through traffic and pedestrians;
  press **E** near any car to steal it and drive. Sedans, taxis, sports cars and
  pickups all handle differently.
- **Wanted system** — crime raises heat. Police escalate from 0 to 5 stars and
  chase you in patrol cars; lose them and the stars drop back down.
- **Five story missions** ($10,000 each from Vera Kane):
  1. **First Fare** — drive a client across town against the clock.
  2. **Package Run** — collect 3 packages around the downtown core while evading police.
  3. **Hot Wheels** — steal a high-end sports car off the waterfront and lose a 2-star wanted level.
  4. **The Getaway** — escape a 4-star dragnet spanning the downtown bridges.
  5. **Neon Heat** — the finale: rob the port vault and escape by boat.
- **HUD with minimap, cash, health and wanted stars**, a start screen, and
  progress saved to localStorage.
- **Procedural audio** — engine, sirens and music, generated in code; no audio files.
- **Tech** — Three.js (vendored under `game/vendor/`), plain ES modules,
  `game/index.html` as the entry point. Everything in the city, story, art and
  sound is original; no Rockstar name, logo, character, map or asset.

## Controls

| Keys | Action |
| ---- | ------ |
| W A S D / arrow keys | Move on foot / drive (steer + throttle) |
| Shift | Run |
| Space | Jump (on foot) / handbrake (driving) |
| E | Enter / exit car |
| F | Punch |
| C | Switch camera |
| Mouse | Orbit camera |

## Play it locally

```sh
node serve.ts
# open http://localhost:8080
```

`serve.ts` is a tiny static server (Node 22 standard library only) that serves
`game/` on port 8080 (`--port <n>` to change it).

## Build the entry dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json, plus copies of game/ and screenshots/
```

`main.ts` copies `game/` and `screenshots/` beside it into the output directory
and writes `dossier.json` with the vendored make.fun library
(`vendor/makefun-game.ts`, `buildDossier`). It is deterministic: running it
twice from different working directories produces a byte-identical dossier.
Caps enforced are the scorer's own: at most 4 screenshots at 256 KiB each,
`game/` at most 993 files / 48 MiB, paths at most 1000 bytes.

## Screenshots

Four in-game shots live in `screenshots/` (cover first, by name):

- `1-cover-driving.jpg` — driving downtown (cover)
- `2-onfoot-mission.jpg` — on foot during a mission
- `3-police-chase.jpg` — a police chase
- `4-beach-sunset.jpg` — the beach at sunset

## About (make.fun entry description)

There is no About field in the repo, the dossier or the kit — the entry's
public description lives on the make.fun website and is filled in at submit
time. The prepared text (copy-paste at submit):

> SOLMARINA: NEON HEAT is an open-world crime game in the spirit of GTA 6 that
> runs offline in a desktop browser. Steal cars, outrun a 5-star police
> wanted system, and work five story missions for fixer Vera Kane across a
> neon coastal city — downtown streets, waterfront, port and beach — with a
> minimap HUD, saves and procedural audio. Built on vendored Three.js, no
> network requests.

## License

MIT — see [LICENSE](LICENSE).
