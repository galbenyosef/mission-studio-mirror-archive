// update.mjs — drift probe against the live Cloudflare Pages deploy, plus a
// GATED refresh (`--pull`) that is the only way this mirror's capture is
// rewritten. usage:
//
//   node tools/update.mjs                  read-only drift report (default)
//   node tools/update.mjs [--json]         same, machine-readable
//   node tools/update.mjs --pull           DRY RUN: fetch the live closure, run
//                                          the trust gate, print the refresh
//                                          plan — writes NOTHING
//   node tools/update.mjs --pull --apply   gate + preserve replaced files under
//                                          legacy/<date>/ + refresh the capture
//                                          + re-cut .upstream/manifest.json
//
// TRUST GATE (mandatory, runs before every write)
//   Every file still served upstream must come back from this tool as the
//   CURRENT capture bytes, byte for byte. The gate fetches all 33 captured
//   files, and for each one whose live sha256 equals the manifest record it
//   requires a byte-identical Buffer to what is on disk. A mismatch means the
//   fetch path (URL mapping, redirect handling, normalization) mangles bytes,
//   so the tool refuses to write anything. Files whose live bytes differ are
//   reported as drift; only those are replaced.
//
// WHAT A REFRESH DOES
//   1. gate (above);
//   2. runtime-closure scan of the NEW entry document: the ASSET_MAP table and
//      every concrete `assets/<name>.<hash>.<ext>` string is a real request
//      (PLAN §4 — the drift probe cannot see new files). Newly referenced files
//      are fetched; anything that 404s (or answers with the origin's HTML
//      soft-404) is recorded as upstream-gone, never invented;
//   3. copy every file that will be replaced, and every file that went away
//      upstream, into legacy/<date>/ before the write;
//   4. write the new bytes, then re-cut .upstream/manifest.json (Gen-A) and
//      append a refresh record to _mirror-report.json.
//
// Filled constants: ORIGIN / ENTRY / DISK_PREFIX. The app is a Cloudflare
// Pages deployment served under the /apps/mission-studio/ sub-path, and the
// capture root mirrors the served path exactly (apps/mission-studio/ at the
// repo root) — so DISK_PREFIX is "" and a disk rel maps 1:1 onto the served
// path (dead-world precedent for sub-path deploys: keep a matching directory
// at the repo root). Notes:
//   - https://sanghyunpark.pages.dev/apps/mission-studio/index.html 301s to
//     the trailing-slash directory URL and serves identical bytes (verified
//     2026-10-13); fetch follows the redirect, so the entry compare is exact;
//   - SOFT-404 CAVEAT: this Astro-hosted origin answers unknown paths with a
//     200 text/html site fallback (13,064 B homepage) instead of a 404 — a
//     non-HTML captured file coming back as text/html means the file is GONE
//     upstream (reported live-missing, not silently "changed");
//   - _mirror-report.json is a local capture record — never probed;
//   - rotating per-response noise is normalized before the entry compare;
//   - nothing under /api/ is ever fetched, and no cross-origin asset is
//     vendored (the Google Fonts stylesheet stays an external CDN dependency:
//     vendor-CDN rule).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const ORIGIN = "https://sanghyunpark.pages.dev";
const ENTRY = "apps/mission-studio/index.html"; // disk path of the entry document
const DISK_PREFIX = ""; // capture root mirrors the served sub-path exactly
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0" };
const MAX_PROBES = 1200;
const LEGACY_DATE = "2026-10-31";
// Runtime-closure names, as served: a concrete hashed asset path.
const ASSET_REF_RE = /assets\/([A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:js|css|json|glb|gltf|bin|jpg|jpeg|png|webp|hdr|ktx2|wasm))/g;

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const ARGS = new Set(process.argv.slice(2));
const PULL = ARGS.has("--pull");
const APPLY = ARGS.has("--apply");

// Fetch with a short backoff for network errors / 429 / 5xx. `buf` is the body
// of a 200 only: a 404 body is never a served file.
async function getBuf(url, tries = 3) {
  let last = { status: 0, ct: "", buf: null, error: "not fetched" };
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: "follow" });
      const buf = Buffer.from(await r.arrayBuffer());
      last = { status: r.status, ct: r.headers.get("content-type") || "", buf: r.ok ? buf : null };
      if (r.status === 200 || r.status === 404 || r.status === 410) return last;
      if (r.status !== 429 && r.status < 500) return last;
    } catch (e) {
      last = { status: 0, ct: "", buf: null, error: e.message };
    }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return last;
}
// disk rel -> served path ("" = the origin root)
const servedOf = (rel) => (rel.startsWith(DISK_PREFIX) ? rel.slice(DISK_PREFIX.length) : rel);
// disk rel -> live URL using the raw on-disk name (hashed names include "-"
// and "_" and must not be re-encoded).
const urlFor = (rel) => ORIGIN + "/" + servedOf(rel);
// Rotating per-response noise — everything else must be byte-identical.
const normalize = (s) =>
  s
    .replace(/ nonce="[^"]*"/g, "")
    .replace(/window\.__CF\$cv\$params=\{[^}]*\}/g, "window.__CF$cv$params=<token>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>");

const manifestPath = path.join(proj, ".upstream", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const diskPath = (rel) => path.join(proj, rel);
const isAssetExt = (rel) => !/\.html?$/i.test(rel);

// ------------------------------------------------------------------ probing
// One fetch per captured file; the same result feeds both the drift report and
// the pull gate, so what the gate proved is exactly what the refresh writes.
async function probeAll() {
  const live = new Map();
  const entryRes = await getBuf(urlFor(ENTRY));
  if (entryRes.status !== 200) {
    console.error(`live entry ${urlFor(ENTRY)} -> HTTP ${entryRes.status}`);
    process.exit(2);
  }
  live.set(ENTRY, entryRes);
  const rels = Object.keys(manifest.files)
    .filter((r) => r !== ENTRY && !r.endsWith("_mirror-report.json"))
    .sort()
    .slice(0, MAX_PROBES);
  // small concurrency pool — the origin rate-limits a wide burst
  let cursor = 0;
  const worker = async () => {
    while (cursor < rels.length) {
      const rel = rels[cursor++];
      live.set(rel, await getBuf(urlFor(rel)));
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return live;
}

// Exit-2-safe buffer: fetch() can answer 404 with a body; treat only 200 as served.
async function getServed(rel) {
  const r = await getBuf(urlFor(rel));
  return { ...r, served: r.status === 200 && !!r.buf };
}

// ------------------------------------------------------------- closure scan
// The ASSET_MAP table plus every concrete hashed asset string in the entry is
// the runtime closure. Logical map keys ("jwst.glb") are skipped — the table
// maps them to the served hashed names, which ARE scanned.
function closureOf(entryText) {
  const out = new Map(); // disk rel -> why
  let map = {};
  const at = entryText.indexOf("const ASSET_MAP = ");
  if (at >= 0) {
    const end = entryText.indexOf("};", at);
    try {
      map = JSON.parse(entryText.slice(at + "const ASSET_MAP = ".length, end + 1));
    } catch {
      throw new Error("ASSET_MAP does not parse in the live entry — refusing to guess the closure");
    }
  }
  const logical = new Set(Object.keys(map));
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== "string" || /^https?:/i.test(v)) continue;
    out.set("apps/mission-studio/assets/" + v, `ASSET_MAP["${k}"]`);
  }
  for (const m of entryText.matchAll(ASSET_REF_RE)) {
    if (logical.has(m[1])) continue; // logical name, served name is in the map
    if (/^api\//i.test(m[1])) continue; // never touch /api/*
    out.set("apps/mission-studio/" + m[0], "string literal in the entry document");
  }
  return out;
}

// ---------------------------------------------------------------- drift rows
function driftRows(live) {
  const rows = [];
  for (const [n, m] of Object.entries(manifest.files).sort()) {
    if (n.endsWith("_mirror-report.json")) continue;
    const l = live.get(n);
    if (!l || l.status !== 200 || !l.buf) {
      rows.push({ file: n, state: "live-missing" });
      continue;
    }
    if (m.dynamic) continue; // live-data payload: presence is the only stable signal
    // soft-404: a non-HTML capture answered by the HTML site fallback is gone upstream
    if (isAssetExt(n) && /text\/html/i.test(l.ct || "")) {
      rows.push({ file: n, state: "live-missing", note: "soft-404: origin served its HTML site fallback" });
      continue;
    }
    if (n === ENTRY || n.endsWith(".html")) {
      const cap = diskPath(n);
      if (!fs.existsSync(cap)) continue;
      const a = normalize(l.buf.toString("utf8"));
      const b = normalize(fs.readFileSync(cap, "utf8"));
      if (a !== b) rows.push({ file: n, state: "changed" });
    } else if (m.sha256 !== sha(l.buf)) {
      rows.push({ file: n, state: "changed", mirror: m.sha256.slice(0, 12), live: sha(l.buf).slice(0, 12) });
    }
  }
  return rows;
}

// =============================================================== plain probe
if (!PULL) {
  const live = await probeAll();
  const rows = driftRows(live);
  const changed = rows.filter((r) => r.state === "changed").length;
  const missing = rows.filter((r) => r.state === "live-missing").length;
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ origin: ORIGIN, entry: ENTRY, checked: Object.keys(manifest.files).length, changed, missing, rows }, null, 2));
  } else if (!rows.length) {
    console.log(`up to date: ${Object.keys(manifest.files).length} captured files identical upstream`);
  } else {
    console.log(`DRIFT: ${changed} changed, ${missing} live-missing (of ${Object.keys(manifest.files).length} captured)`);
    for (const r of rows.slice(0, 40)) console.log(`  ${r.state.padEnd(14)} ${r.file}`);
    process.exit(1);
  }
  process.exit(0);
}

// ================================================================ gated pull
console.log(`pull ${ORIGIN}/${servedOf(ENTRY)} ${APPLY ? "(--apply: will write)" : "(dry run: writes nothing)"}`);
const live = await probeAll();

// --- TRUST GATE -----------------------------------------------------------
// Every captured file that is still served with the SAME bytes upstream must be
// reproduced by this tool byte-for-byte from disk.
const gate = { reproduced: [], drift: [], gone: [], failures: [] };
for (const [n, m] of Object.entries(manifest.files).sort()) {
  if (n.endsWith("_mirror-report.json")) continue;
  const l = live.get(n);
  if (!l || l.status !== 200 || !l.buf) { gate.gone.push(n); continue; }
  if (m.dynamic) { gate.reproduced.push(n); continue; }
  if (isAssetExt(n) && /text\/html/i.test(l.ct || "")) { gate.gone.push(n); continue; }
  if (sha(l.buf) !== m.sha256) { gate.drift.push(n); continue; }
  const cap = diskPath(n);
  if (!fs.existsSync(cap)) { gate.failures.push(`${n}: manifest says unchanged but the file is missing on disk`); continue; }
  if (Buffer.compare(l.buf, fs.readFileSync(cap)) !== 0) {
    gate.failures.push(`${n}: live bytes hash to the captured sha256 but are not byte-identical to the disk capture`);
    continue;
  }
  gate.reproduced.push(n);
}
console.log(
  `trust gate: ${gate.reproduced.length}/${Object.keys(manifest.files).length} captured files reproduced byte-for-byte, ` +
    `${gate.drift.length} changed upstream, ${gate.gone.length} gone`,
);
if (gate.failures.length) {
  for (const f of gate.failures) console.error(`  GATE FAIL ${f}`);
  console.error("trust gate FAILED — refusing to write; fix the tool's fetch path first");
  process.exit(1);
}
console.log("trust gate: PASS");
if (gate.gone.length) for (const g of gate.gone) console.log(`  upstream-gone ${g} (recorded, not invented)`);

// --- closure of the new entry --------------------------------------------
const liveEntryText = live.get(ENTRY).buf.toString("utf8");
const closure = closureOf(liveEntryText);
const known = new Set(Object.keys(manifest.files));
const toAdd = [...closure.keys()].filter((r) => !known.has(r));
const unreferenced = [...known].filter((r) => isAssetExt(r) && !closure.has(r));

const added = [];
for (const rel of toAdd) {
  const r = await getServed(rel);
  if (!r.served) { added.push({ file: rel, state: "upstream-gone", status: r.status, why: closure.get(rel) }); continue; }
  if (isAssetExt(rel) && /text\/html/i.test(r.ct || "")) {
    added.push({ file: rel, state: "upstream-gone", why: "soft-404: HTML site fallback", ref: closure.get(rel) });
    continue;
  }
  added.push({ file: rel, state: "new", bytes: r.buf.length, sha256: sha(r.buf), why: closure.get(rel) });
}
const newFiles = added.filter((a) => a.state === "new");
const goneNew = added.filter((a) => a.state === "upstream-gone");

console.log(`closure: ${closure.size} referenced file(s) in the new entry — ${newFiles.length} new, ${goneNew.length} gone, ${unreferenced.length} captured asset(s) no longer referenced`);
for (const a of added) console.log(`  ${a.state.padEnd(13)} ${a.file}  <- ${a.why}`);
for (const u of unreferenced) console.log(`  unreferenced  ${u}  (still served: kept, not deleted)`);

// --- plan ----------------------------------------------------------------
const drift = gate.drift.slice();
console.log(`plan: replace ${drift.length} changed file(s), add ${newFiles.length} new file(s), remove ${gate.gone.length} upstream-gone file(s)`);
for (const d of drift) {
  const l = live.get(d);
  console.log(`  replace ${d}: ${manifest.files[d].bytes} B -> ${l.buf.length} B`);
}

// A drifted file is written from the bytes just fetched, so those bytes must be
// stable: a per-request nonce (or an A/B origin) would otherwise bake
// non-reproducible content into the capture.
for (const d of drift) {
  const again = await getBuf(urlFor(d));
  if (!again.buf || sha(again.buf) !== sha(live.get(d).buf)) gate.failures.push(`${d}: bytes are not stable across two fetches`);
  else console.log(`  stable ${d}: sha256 ${sha(again.buf).slice(0, 12)} on a second fetch`);
}
if (gate.failures.length) {
  for (const f of gate.failures) console.error(`  GATE FAIL ${f}`);
  console.error("trust gate FAILED after the stability check — refusing to write");
  process.exit(1);
}
if (!APPLY) {
  console.log("dry run complete — nothing was written. Re-run with --pull --apply to refresh.");
  process.exit(0);
}

// --- preserve replaced/removed files under legacy/<date>/ -----------------
const legacyRoot = path.join(proj, "legacy", LEGACY_DATE);
const preserve = (rel, buf) => {
  const dest = path.join(legacyRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`  legacy ${rel}`);
};
for (const rel of drift) preserve(rel, fs.readFileSync(diskPath(rel)));
for (const rel of gate.gone) {
  const abs = diskPath(rel);
  if (fs.existsSync(abs)) preserve(rel, fs.readFileSync(abs));
}

// --- write ---------------------------------------------------------------
for (const rel of drift) {
  fs.mkdirSync(path.dirname(diskPath(rel)), { recursive: true });
  fs.writeFileSync(diskPath(rel), live.get(rel).buf);
}
for (const a of newFiles) {
  const r = await getServed(a.file);
  if (!r.served) throw new Error(`${a.file} disappeared between plan and write`);
  fs.mkdirSync(path.dirname(diskPath(a.file)), { recursive: true });
  fs.writeFileSync(diskPath(a.file), r.buf);
}
for (const rel of gate.gone) {
  fs.rmSync(diskPath(rel), { force: true });
  // prune now-empty parent dirs, but never cull a tree other assets still use
  let dir = path.dirname(diskPath(rel));
  while (dir.startsWith(path.resolve(proj, "apps")) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
  console.log(`  removed upstream-gone ${rel}`);
}

// --- re-cut the manifest (Gen-A, unchanged shape) -------------------------
const next = { generated: LEGACY_DATE, origin: manifest.origin, files: {} };
for (const rel of Object.keys(manifest.files)) {
  if (gate.gone.includes(rel)) continue;
  if (drift.includes(rel)) {
    next.files[rel] = {
      bytes: fs.statSync(diskPath(rel)).size,
      sha256: sha(fs.readFileSync(diskPath(rel))),
      ...(manifest.files[rel].dynamic ? { dynamic: true } : {}),
    };
    continue;
  }
  next.files[rel] = manifest.files[rel];
}
for (const a of newFiles) {
  next.files[a.file] = { bytes: fs.statSync(diskPath(a.file)).size, sha256: sha(fs.readFileSync(diskPath(a.file))) };
}
const ordered = Object.fromEntries(Object.entries(next.files).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
next.files = ordered;
fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + "\n");
console.log(`manifest re-cut: ${Object.keys(next.files).length} files`);

// --- refresh record on the local capture report --------------------------
const reportPath = path.join(proj, "_mirror-report.json");
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const totals = { files: Object.keys(next.files).length, bytes: 0 };
  for (const v of Object.values(next.files)) totals.bytes += v.bytes;
  report.refreshes = report.refreshes || [];
  report.refreshes.push({
    date: LEGACY_DATE,
    tool: "tools/update.mjs --pull --apply",
    trustGate:
      `${gate.reproduced.length}/${Object.keys(manifest.files).length} captured files reproduced byte-for-byte; ` +
      `${drift.length} changed upstream`,
    replaced: drift.map((rel) => ({
      path: rel,
      from: { bytes: manifest.files[rel].bytes, sha256: manifest.files[rel].sha256 },
      to: { bytes: next.files[rel].bytes, sha256: next.files[rel].sha256 },
      legacy: `legacy/${LEGACY_DATE}/${rel}`,
    })),
    added: newFiles.map((a) => ({ path: a.file, bytes: a.bytes, sha256: a.sha256, why: a.why })),
    upstreamGone: [...gate.gone, ...goneNew.map((g) => g.file)],
    unreferencedStillServed: unreferenced,
    external: "unchanged — Google Fonts stays an external CDN dependency; nothing under /api/ fetched",
  });
  report.fetched = totals.files;
  report.bytes = totals.bytes;
  report.paths = Object.keys(next.files).sort();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
}
console.log(`refresh applied: ${drift.length} replaced, ${newFiles.length} added, ${gate.gone.length} removed upstream-gone`);
console.log("next: node tools/verify.mjs && re-derive the readable/src layer, then run the gates");
