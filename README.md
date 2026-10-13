# MISSION STUDIO — offline mirror

Full mirror of **Mission Studio — Space Shuttle, Moon & Mars**, a Cloudflare
Pages deploy served under the `/apps/mission-studio/` sub-path.

Source: https://sanghyunpark.pages.dev/apps/mission-studio/

![MISSION STUDIO](docs/cover.png)

## Stack

- **One self-contained HTML file + a hashed asset tree** — the entry document
  (`apps/mission-studio/index.html`, 1,151,899 B) carries the whole app in
  three inline blocks: one inline `<style>` (31,286 B, a single deliberate dark
  theme) and two inline scripts — a classic `<script id="engine-src">`
  (399,856 B, the simulation engine: constants/vector math, JPL ephemerides,
  Kepler solver, RK4 integrator, launch-vehicle models, flight phases,
  timeline, planner, lunar/LEO/interplanetary mission design) and an ES module
  `<script type="module">` (700,066 B, the three.js renderer + UI). The engine
  is also the Worker source: the app clones its own text into a `Blob` and
  runs it in a Web Worker for mission planning.
- **three.js r160, vendored by the deploy** — the module imports
  `./assets/three.module.min.3e690ac7d1.js` (670,681 B, `REVISION` 160,
  MIT), plus the same-origin `assets/GLTFLoader.<hash>.js`,
  `assets/BufferGeometryUtils.<hash>.js` and
  `assets/meshopt_decoder.module.<hash>.js` addons. All captured byte-exact.
- **Runtime asset map** — the module's `ASSET_MAP` maps 31 logical names to
  hashed deploy filenames (`assets/<name>.<hash>.<ext>`): six GLB models
  (Saturn V, Shuttle stack, ISS, Orion/orbiter, Apollo LM, Perseverance),
  18 planet texture JPGs (Earth day/night/clouds/aux at 2K + 8K, Moon, Mars
  at 2K/4K/8K + aux, Jupiter, Saturn, Venus), three orbiter-patch WebPs and a
  `stars.json` star catalog. Closure was iterated to fixpoint over the
  captured code and cross-checked with a live browser network log while the
  app ran — every on-origin request resolves inside the capture.
- **External (not captured, CDN rule)** — the Google Fonts stylesheet
  (IBM Plex Mono / IBM Plex Sans Condensed) and its `fonts.gstatic.com`
  files stay external exactly as served; the app falls back to system fonts
  offline. Sound is synthesized WebAudio (no audio files); the favicon is an
  inline `data:` SVG.

## What this is

Mission Studio (sanghyunpark.pages.dev/apps/mission-studio/) — “3D mission
simulator — Space Shuttle, Moon and Mars — with real launch vehicles, solved
trajectories, live telemetry and storyboard capture.” Pick a missions
scenario (e.g. Apollo 11, Artemis, a Mars transfer), configure the stack
(Saturn V, Shuttle, a Mars ascent vehicle), then fly it: the engine solves the
trajectory (patched-conic lunar design with an n-body refinement, Lambert
interplanetary legs) and the three.js view renders the Earth/Moon/Mars system
with real ephemerides, the vehicle in flight, live telemetry, and a
storyboard capture tool. The whole simulator is the two inline scripts.

The capture is **33 files, 55,868,895 bytes**: the entry document plus 32
hashed files under `assets/` (the three.js module, three three.js addons,
six GLB models, 18 JPG textures, three WebP patches, one JSON star catalog).
All captured byte-exact; the served `/apps/mission-studio/` path structure is
preserved at the repo root.

## Layout

- `apps/mission-studio/` — the served sub-path, byte-exact (open
  `apps/mission-studio/index.html` through any static server)
- `.upstream/manifest.json` — sha256 for every captured file (33 files)
- `readable/` — prettified derived layer (pinned prettier 3.9.6) for the
  three inline blocks (7 pretties, 70,878 lines) and
  `readable/index-inline-map.json` (inline block byte ranges + sha256)
- `src/` + `split-spec.json` — 123 statement-aligned slices of the two inline
  scripts with the recorded derivation spec (130 sections)
- `tools/derive.mjs` — rebuild `readable/` + `src/` + `split-spec.json`
- `tools/update.mjs` — read-only drift probe against the live deploy
- `tools/verify.mjs` — re-hash the capture against the manifest
- `tools/audit.js` — integrity gate for the derived layers (`AUDIT PASS`)
- `tools/serve.mjs` — loopback static server used for the boot test

## Assets

- **models** — 6 file(s): `apps/mission-studio/assets/` — saturnv, shuttle_stack,
  iss, orbiter (Orion), apollo_lm, perseverance (`.glb`)
- **images** — 21 file(s): `apps/mission-studio/assets/` — 18 planet/space
  texture JPGs (earth_day/night/clouds/aux ± 8K, moon, moon_4k, moon_8k,
  moon_aux, mars, mars_4k, mars_8k, mars_aux, jupiter, saturn, venus) and
  three orbiter mission-patch WebPs
- **data** — 1 file(s): `apps/mission-studio/assets/stars.<hash>.json`
  (star catalog — RA/Dec/magnitude quadruples)
- **libraries** — 4 file(s): `apps/mission-studio/assets/` — three.js r160
  (`three.module.min.<hash>.js`), GLTFLoader, BufferGeometryUtils,
  meshopt_decoder (all vendored by the deploy, byte-exact)
- **audio** — none carried — sound is synthesized WebAudio
- **fonts** — none carried — Google Fonts (IBM Plex Mono / IBM Plex Sans
  Condensed) stay an external CDN dependency
- **UI** — none carried — all icons are inline SVG / `data:` URIs

## Run

Serve the repo root as the site root (the capture keeps the served sub-path
directory, so a plain static server reproduces the exact requested URLs):

```
node tools/serve.mjs          # http://127.0.0.1:8095/apps/mission-studio/
# or: npx serve .
```

Open `http://127.0.0.1:8095/apps/mission-studio/` (the trailing slash
matters — the deploy serves the app from that directory).

## Verify

```
node tools/verify.mjs     # re-hash the capture against the manifest
node tools/audit.js       # derived-layer integrity gate (AUDIT PASS)
```

## Updating from upstream

```
node tools/update.mjs     # read-only drift probe: what changed upstream
```

The probe never rewrites the capture — a mirror is a point-in-time snapshot.
It probes `https://sanghyunpark.pages.dev/apps/mission-studio/` (the
`index.html` URL 301s to the trailing-slash directory URL; the two serve
identical bytes). **Soft-404 caveat:** the Astro-hosted origin answers unknown
paths with a 200 `text/html` site fallback (the 13,064 B homepage) instead of
a 404 — the probe therefore reports a non-HTML captured file that comes back
as HTML as `live-missing` (it is gone upstream), never as a silent "changed".
Refreshing means re-fetching the closure into a clean tree (entry + every
`ASSET_MAP` target + the imported three.js module/addons), re-cutting
`.upstream/manifest.json`, and re-deriving `readable/` + `src/` from the new
blocks.

### 2026-10-13 readable/src derivation

Both derived layers were cut from the recorded capture (capture bytes
untouched — `node tools/verify.mjs` re-hashes all 33 files; `node tools/audit.js`
gates the derived trees):

- `readable/` — pinned prettier 3.9.6 (module API, default options, single
  pass verified idempotent at derive time — never the CLI, it respects
  `.gitignore` and can silently echo its input) rendered the three inline
  content blocks and the four captured vendor modules to 7 pretties (70,878
  lines): `index-inline-1.pretty.css` (the app stylesheet, 1,870 lines),
  `index-inline-1.pretty.js` (the classic engine, 14,941 lines),
  `index-inline-2.pretty.js` (the ES module, 23,562 lines) and
  `assets__three.module.min.3e690ac7d1.pretty.js` (28,854 lines) +
  `assets__GLTFLoader…` (4,164) + `assets__BufferGeometryUtils…` (1,230) +
  `assets__meshopt_decoder.module…` (257). Every pretty is provably not a
  byte copy of its capture source and re-renders byte-exact under the
  recorded single-pass method (7/7); the inline blocks' byte ranges + sha256
  are recorded in `readable/index-inline-map.json`.
- `src/` — 123 statement-aligned slices across the two inline scripts
  (42 over the classic engine's 245 top-level statements, 81 over the ES
  module's 656), recorded in `split-spec.json` (130 sections: 123 ranged +
  7 wholeFile + 0 skipped): 123/123 parse standalone under
  `node --input-type=module --check -` and round-trip byte-exact to their
  readable line ranges, cuts land only on top-level declaration boundaries
  (~250-350 line windows; oversized single declarations stay whole). The
  banner heads (`// ---- core.js`, `// ==== 00_util.js` + the module header)
  are wholeFile sections, indexed and never sliced.
- Vendor rule — wholeFile sections, never sliced: the four captured three.js
  modules (three.js r160 core, GLTFLoader, BufferGeometryUtils,
  meshopt_decoder with its embedded WASM base64), content-guarded. The
  stylesheet rule keeps `index-inline-1.css` wholeFile. The 28 binary/data
  payloads (6 GLB models, 18 JPG textures, 3 WebP patches, `stars.json`) are
  hashed `notRendered` records — carried byte-exact, no pretty pass.
- Non-standalone parts: none outside the wholeFile heads — every slice of
  both scripts is a valid standalone ES module body (0 skipped sections).
- Gates: `node tools/verify.mjs` → `33 files checked, 0 problems`;
  `node tools/audit.js` → `AUDIT PASS` (123/123 round-trips, 7/7 pretties
  re-render byte-exact, 7/7 pretty sources tiled contiguously, 123/123 slices
  + 6/6 readable pretties parse standalone, 3 inline blocks with twins + map,
  28/28 binary assets recorded hashed, 1/1 import resolves — the module's
  `./assets/three.module.min.<hash>.js` inside the capture);
  `node tools/update.mjs` → the 33 captured files identical upstream.
  Rebuild with `node tools/derive.mjs`.
- Boot + closure cross-check: mirror root served on loopback
  (`node tools/serve.mjs`, port 8095), opened at
  `http://127.0.0.1:8095/apps/mission-studio/`. The app booted (Pre-flight
  mission setup), Apollo 11 was chosen and flown from the setup panel
  (`Fly this mission ▶`): pad countdown → ascent → … → powered descent →
  “The Eagle has landed.” Cover = `docs/cover.png` (actual gameplay: Eagle in
  powered descent over the Moon, 479 m, T+4d 07:34:30); boot evidence =
  `docs/boot-2026-10-13.png` (the Saturn V on LC-39A at T−00:00:10 with the
  full console UI). Because the automation window was background-throttled
  (rAF paused), the later mission epochs were reached through the app's own
  timeline scrub (`__ms.setTime` + `renderFrame`) — the same render path the
  frame loop uses. The live network log across load + play (39 entries: 23
  on-host, all HTTP 200 — entry, `three.module.min`, the three dynamically
  imported three.js addons, `saturnv`/`apollo_lm` GLBs, 8K/4K planet
  textures, `stars.json`, 6 worker blobs; plus the external Google Fonts CSS
  + 5 woff2 and 2 `data:` icons) shows **zero on-host misses**; the loopback
  serve log recorded zero 404s and the browser console was empty. Listener
  killed, port 8095 proved closed (netstat).
- §0.4 fork-over-mirror checked 2026-10-13 — **a public source repo exists**:
  the project's own page (`sanghyunpark.pages.dev/projects/mission-studio/`)
  links **https://github.com/sean-lab/mission-studio** (public, MIT, README
  links this very deploy; its `assets/` carries the un-hashed source assets
  the deploy's `build.js` hashes — created 2026-10-10, pushed 2026-10-12).
  The captured bundle itself contains no repo link and library credits do not
  count, but the portfolio page does. Per PLAN §0.4 the fleet prefers a fork
  over a mirror in this situation (kino-der-toten precedent) — this mirror is
  delivered as instructed and the repo is recorded here so the coordinator
  can decide: **retire the mirror in favour of a fork of `sean-lab/mission-studio`**
  (the MIT upstream), or keep it as the byte-exact deploy snapshot.

## Mirror conventions

- **Capture layer** — the captured files are byte-exact copies of what the
  origin served; nothing in them is edited.
- **Readable layer** — `readable/` is derived (prettified) and never shipped
  to a browser; it exists so the blocks and bundles can actually be read.
- **Provenance** — `.upstream/manifest.json` records sha256 for each captured
  artifact, and `tools/verify.mjs` re-checks it.
- **Drift** — `tools/update.mjs` is read-only: it reports what changed
  upstream and never rewrites the capture.

## Fleet status

<!-- mirror-status:start — feeds _standard/REPO-INDEX.md. Update ONLY your own mirror's block; never edit the shared index (PLAN §8). Rebuild: node _standard/build-index.mjs -->
<!-- cols: cls=classification · ver=verify 0 problems · upd=drift probe · man=manifest · rdbl=readable re-derived · src=reversed src · boot=boot test · top=offline-mirror topic · tag=backup tag · staged=staged not committed -->
| # | repo | cls | ver | upd | man | rdbl | src | boot | top | tag | staged |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 306 | mission-studio | mirror | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
<!-- mirror-status:end -->
