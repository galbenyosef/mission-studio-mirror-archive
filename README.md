# MISSION STUDIO — offline mirror

Full mirror of **Mission Studio — Space Shuttle, Moon & Mars**, a Cloudflare
Pages deploy served under the `/apps/mission-studio/` sub-path.

Source: https://sanghyunpark.pages.dev/apps/mission-studio/

![MISSION STUDIO](docs/cover.png)

## Stack

- **One self-contained HTML file + a hashed asset tree** — the entry document
  (`apps/mission-studio/index.html`, 1,348,561 B after the 2026-10-31 refresh)
  carries the whole app in three inline blocks: one inline `<style>` (32,026 B,
  a single deliberate dark theme) and two inline scripts — a classic
  `<script id="engine-src">` (439,811 B, the simulation engine: constants/vector
  math, JPL ephemerides, Kepler solver, RK4 integrator, launch-vehicle models,
  flight phases, timeline, planner, lunar/LEO/interplanetary mission design) and
  an ES module `<script type="module">` (855,309 B, the three.js renderer + UI).
  The engine is also the Worker source: the app clones its own text into a
  `Blob` and runs it in a Web Worker for mission planning.
- **three.js r160, vendored by the deploy** — the module imports
  `./assets/three.module.min.3e690ac7d1.js` (670,681 B, `REVISION` 160,
  MIT), plus the same-origin `assets/GLTFLoader.<hash>.js`,
  `assets/BufferGeometryUtils.<hash>.js` and
  `assets/meshopt_decoder.module.<hash>.js` addons. All captured byte-exact.
- **Runtime asset map** — the module's `ASSET_MAP` maps 37 logical names to
  hashed deploy filenames (`assets/<name>.<hash>.<ext>`): eight GLB models
  (Saturn V, Shuttle stack, ISS, Orion/orbiter, Apollo LM, Perseverance, Ariane 5
  ECA, JWST), 18 planet texture JPGs (Earth day/night/clouds/aux at 2K + 8K,
  Moon, Mars at 2K/4K/8K + aux, Jupiter, Saturn, Venus), three orbiter-patch
  WebPs, a `stars.json` star catalog and four launch-site terrain heightfields
  (`terrain_{ksc,edwards,starbase,whitesands}.<hash>.json`). Closure was
  iterated to fixpoint over the captured code and cross-checked with a live
  browser network log while the app ran — every on-origin request resolves
  inside the capture.
- **External (not captured, CDN rule)** — the Google Fonts stylesheet
  (IBM Plex Mono / IBM Plex Sans Condensed) and its `fonts.gstatic.com`
  files stay external exactly as served (as does the Cloudflare Web Analytics
  beacon the Pages edge injects into the entry); the app falls back to system
  fonts offline. Sound is synthesized WebAudio (no audio files); the favicon is
  an inline `data:` SVG.

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

The capture is **39 files, 64,492,592 bytes**: the entry document plus 38
hashed files under `assets/` (the three.js module, three three.js addons, eight
GLB models, 18 JPG textures, three WebP patches, the `stars.json` star catalog
and four terrain heightfield JSONs). All captured byte-exact; the served
`/apps/mission-studio/` path structure is preserved at the repo root.

## Layout

- `apps/mission-studio/` — the served sub-path, byte-exact (open
  `apps/mission-studio/index.html` through any static server)
- `.upstream/manifest.json` — sha256 for every captured file (39 files)
- `readable/` — prettified derived layer (pinned prettier 3.9.6) for the
  three inline blocks (7 pretties, 80,825 lines) and
  `readable/index-inline-map.json` (inline block byte ranges + sha256)
- `src/` + `split-spec.json` — 142 statement-aligned slices of the two inline
  scripts with the recorded derivation spec (149 sections)
- `legacy/2026-10-31/` — the pre-refresh capture entry and the superseded
  `readable/` + `src/` + `split-spec.json` (rollback path)
- `tools/derive.mjs` — rebuild `readable/` + `src/` + `split-spec.json`
- `tools/derive-check.mjs` — prove the derived layer is current (writes nothing)
- `tools/update.mjs` — drift probe against the live deploy; `--pull` is the
  gated refresh (trust gate → legacy → write → manifest re-cut)
- `tools/verify.mjs` — re-hash the capture against the manifest
- `tools/audit.js` — integrity gate for the derived layers (`AUDIT PASS`)
- `tools/check-exports.mjs` — the derived layer still exports every public name
- `tools/serve.mjs` — loopback static server used for the boot test
- `tools/boot.mjs` — offline boot harness (serve → Chrome with the network
  pinned to loopback over CDP → assert render → screenshot)

## Assets

- **models** — 8 file(s): `apps/mission-studio/assets/` — saturnv,
  shuttle_stack, iss, orbiter (Orion), apollo_lm, perseverance, ariane5 (ECA),
  jwst (`.glb`)
- **images** — 21 file(s): `apps/mission-studio/assets/` — 18 planet/space
  texture JPGs (earth_day/night/clouds/aux ± 8K, moon, moon_4k, moon_8k,
  moon_aux, mars, mars_4k, mars_8k, mars_aux, jupiter, saturn, venus) and
  three orbiter mission-patch WebPs
- **data** — 5 file(s): `apps/mission-studio/assets/` — `stars.<hash>.json`
  (star catalog — RA/Dec/magnitude quadruples) and four launch-site terrain
  heightfields (`terrain_ksc`, `terrain_edwards`, `terrain_starbase`,
  `terrain_whitesands` — `<hash>.json`)
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
node tools/check-exports.mjs   # the derived layer still exports every public name
node tools/derive.mjs --check          # the derived layer is current? (compares a fresh rebuild; writes NOTHING)
```

## Updating from upstream

```
node tools/update.mjs                # read-only drift probe: what changed upstream
node tools/update.mjs --pull         # DRY RUN: trust gate + the refresh plan (writes NOTHING)
node tools/update.mjs --pull --apply # gated refresh (see below)
```

The plain probe never rewrites the capture — a mirror is a point-in-time
snapshot. It probes `https://sanghyunpark.pages.dev/apps/mission-studio/` (the
`index.html` URL 301s to the trailing-slash directory URL; the two serve
identical bytes). **Soft-404 caveat:** the Astro-hosted origin answers unknown
paths with a 200 `text/html` site fallback (the 13,064 B homepage) instead of
a 404 — the probe therefore reports a non-HTML captured file that comes back
as HTML as `live-missing` (it is gone upstream), never as a silent "changed".

`--pull` is the one write path, and it is gated. **Trust gate:** it fetches all
39 captured files and requires every file whose live sha256 still equals the
manifest record to come back byte-identical to the capture on disk; any
mismatch aborts before a single write (the gate proves the tool's URL mapping,
redirect handling and normalization do not mangle bytes). It then

1. re-scans the NEW entry's runtime closure — the `ASSET_MAP` table plus every
   concrete `assets/<name>.<hash>.<ext>` string — and fetches newly referenced
   files (this is how the 2026-10-31 refresh found +6 files the drift probe
   could never see); anything that 404s or answers with the HTML soft-404 is
   recorded as upstream-gone, never invented; nothing under `/api/` is fetched
   and no cross-origin asset is vendored;
2. copies every file it will replace into `legacy/<date>/` first;
3. writes the new bytes and re-cuts `.upstream/manifest.json` (plus a refresh
   record in `_mirror-report.json`);
4. leaves the derived layer stale on purpose — re-run `node tools/derive.mjs`.

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
  meshopt_decoder with its embedded WASM base64), content-guarded. Each
  vendor section is named by its SERVED path (`file`/`capture` =
  `apps/mission-studio/assets/<name>.js`) and carries the readable twin as
  its `sourceFile`, so the public-export-name gate can pair the section with
  the source it came from and read the export table out of that twin. The
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
  `node tools/check-exports.mjs` → `7 export table(s) checked` /
  `no public export name lost` — the four vendor bundles' export tables are
  reached (the vendor wholeFile sections name their served file, so the gate
  finds the readable twin to compare against);
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

## Boot test (2026-10-27)

- Entry: `http://127.0.0.1:4866/apps/mission-studio/` served by `tools/serve.mjs` with the network blocked (`MAP * 127.0.0.1`).
- Outcome: **rendered** — the Pre-flight mission setup appeared, and `Fly this mission ▶` launched Apollo 11: the 3D Saturn V lifting off LC-39A at T+00:00:29 with the live console, telemetry and mission timeline.
- Evidence: body 4563 chars; canvas 1262x568; 0 console errors; 0 failed same-origin requests, 1 blocked cross-origin; screenshot `docs/boot-2026-10-27.png`.
- Gaps seen: none.
- This confirms the mirror's existing playable-build claim (the 2026-10-13 boot record): the build is neither absent nor gated, and the boot refutes nothing.

## Refresh + boot (2026-10-31)

**Drift:** `node tools/update.mjs` found 1 of 33 captured files changed — the
entry document — 0 live-missing.

**Trust gate (before any write):** `node tools/update.mjs --pull` fetched all
33 captured files and reproduced **32/32 unchanged files byte-for-byte**
(`Buffer.compare`, not a hash comparison), classified the entry as drift, and
proved the new entry bytes stable across two fetches (sha256 `4daf66773242…`).
Gate PASS. Nothing was written by the dry run.

**Closure (PLAN §4):** re-scanning the NEW entry's `ASSET_MAP` (37 logical
names, was 31) plus every concrete hashed `assets/…` string found **6 new
files** — the drift probe cannot see additions. All 6 answered 200 and were
fetched; nothing was missing and nothing went away upstream:

| added | bytes |
|---|---|
| `assets/ariane5.cd8cebed0d.glb` | 603,448 |
| `assets/jwst.a6c3528675.glb` | 1,594,384 |
| `assets/terrain_edwards.8f322d03f6.json` | 2,681,807 |
| `assets/terrain_ksc.450146f0c2.json` | 1,288,515 |
| `assets/terrain_starbase.d6bfffa20c.json` | 1,063,816 |
| `assets/terrain_whitesands.ddda2f4cc9.json` | 1,195,065 |

`upstream-gone`: **none**. No `/api/*` endpoint exists or was fetched; the
Google Fonts stylesheet/fonts and the Cloudflare Web Analytics beacon stay
external exactly as served (no vendor-CDN vendoring).

**Refresh** (`--pull --apply`): the replaced entry was preserved at
`legacy/2026-10-31/apps/mission-studio/index.html` before the write, together
with the superseded derived layers (`legacy/2026-10-31/derived/{readable,src,split-spec.json}`);
`.upstream/manifest.json` was re-cut to **39 files / 64,492,592 B**, and
`_mirror-report.json` gained a `refreshes` record. Upstream change in one line:
the deploy grew the **JWST mission** (Ariane 5 ECA launch vehicle + JWST model)
and **four launch-site terrain heightfields**, so the entry document went from
1,151,899 → 1,348,561 B (inline `<style>` 31,286 → 32,026 B, classic engine
399,856 → 439,811 B, ES module 700,066 → 855,309 B).

**Re-derive** (README chain, `node tools/derive.mjs`): `readable/` = 7 pretties,
80,825 lines (stylesheet 1,911, engine 16,183, module 28,226, the four vendor
twin line counts unchanged); `src/` = 142 statement-aligned slices (46 engine +
96 module), 142/142 parse standalone and round-trip byte-exact; `split-spec.json`
= 149 sections (142 ranged + 7 wholeFile + 0 skipped); 38 binary/data assets
recorded hashed — the six new files are `notRendered` records, no pretty pass.

**Gates:** `node tools/verify.mjs` → `39 files checked, 0 problems`;
`node tools/audit.js` → `AUDIT PASS` (142/142 round-trips, 7/7 pretties
re-render byte-exact, 3 inline blocks with twins + map, 1/1 import resolves,
34 binary/data assets hashed in notRendered, manifest free of derived layers);
`node tools/check-exports.mjs` → `7 export table(s) checked` / `no public
export name lost`; `node tools/derive.mjs --check` → `DERIVE CHECK PASS`
(151 derived files compared against a fresh rebuild; nothing written).

**Boot (offline):** session `boot-missionstudio-refresh`, `tools/serve.mjs` on
`http://127.0.0.1:4718/apps/mission-studio/`, Chrome 156.0.8078.76 launched
with `--host-resolver-rules=MAP * 127.0.0.1` (every hostname pinned to
loopback, so the origin is unreachable) and driven over CDP by
`tools/boot.mjs`. Outcome: **rendered** — Pre-flight setup appeared (body 5,119
chars), then `Fly this mission ▶` launched Apollo 11: the Saturn V on LC-39A at
T−00:00:10 with the new KSC terrain, runway and tree line, full console,
telemetry, events and timeline. Canvas 1422×748, WebGL context present, 78
scene labels; 0 console errors, 0 page exceptions, 0 failed same-origin
requests; 3 failed requests, all cross-origin and expected offline (Google
Fonts CSS, the Cloudflare beacon, one aborted request). Screenshot
`docs/boot-2026-10-31-refresh.png`; the listener was killed and ports 4718 /
4798 verified closed, and the temporary Chrome profile was removed with
`.scratch/`.

## Mirror conventions

- **Capture layer** — the captured files are byte-exact copies of what the
  origin served; nothing in them is edited.
- **Readable layer** — `readable/` is derived (prettified) and never shipped
  to a browser; it exists so the blocks and bundles can actually be read.
- **Provenance** — `.upstream/manifest.json` records sha256 for each captured
  artifact, and `tools/verify.mjs` re-checks it.
- **Drift** — `tools/update.mjs` without flags is read-only: it reports what
  changed upstream and never rewrites the capture. `--pull` is the gated,
  trust-gated refresh; `--pull --apply` is the only path that writes.
- **Legacy** — every refresh copies the files it replaces into
  `legacy/<date>/`, which is the rollback path.

## Fleet status

<!-- mirror-status:start — feeds _standard/REPO-INDEX.md. Update ONLY your own mirror's block; never edit the shared index (PLAN §8). Rebuild: node _standard/build-index.mjs -->
<!-- cols: cls=classification · ver=verify 0 problems · upd=drift probe · man=manifest · rdbl=readable re-derived · src=reversed src · boot=boot test · top=offline-mirror topic · tag=backup tag · staged=staged not committed -->
| # | repo | cls | ver | upd | man | rdbl | src | boot | top | tag | staged |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 316 | mission-studio-mirror-archive | mirror | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
<!-- mirror-status:end -->
