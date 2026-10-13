// update.mjs — read-only drift probe against the live Cloudflare Pages deploy.
// Never rewrites the capture. usage: node tools/update.mjs [--json]
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
//   - a real 404 on a captured non-entry file is reported live-missing;
//   - _mirror-report.json is a local capture record — never probed;
//   - rotating per-response noise is normalized before the entry compare.
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

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
async function getBuf(url) {
  const r = await fetch(url, { headers: UA });
  return { status: r.status, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null };
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

const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));

const live = {};
const entry = await getBuf(urlFor(ENTRY));
if (entry.status !== 200) {
  console.error(`live entry ${urlFor(ENTRY)} -> HTTP ${entry.status}`);
  process.exit(2);
}
live[ENTRY] = { buf: entry.buf };

// Probe every captured file directly — the manifest is the authoritative closure.
const rels = Object.keys(manifest.files)
  .filter((r) => r !== ENTRY && !r.endsWith("_mirror-report.json"))
  .sort()
  .slice(0, MAX_PROBES);
for (const rel of rels) {
  const r = await getBuf(urlFor(rel));
  if (r.status === 200 && !live[rel]) live[rel] = { buf: r.buf };
}

const rows = [];
for (const [n, m] of Object.entries(manifest.files).sort()) {
  if (n.endsWith("_mirror-report.json")) continue;
  const l = live[n];
  if (!l) {
    rows.push({ file: n, state: "live-missing" });
    continue;
  }
  if (m.dynamic) continue; // live-data payload: presence is the only stable signal
  if (n === ENTRY || n.endsWith(".html")) {
    const cap = path.join(proj, n);
    if (!fs.existsSync(cap)) continue;
    const a = normalize(l.buf.toString("utf8"));
    const b = normalize(fs.readFileSync(cap, "utf8"));
    if (a !== b) rows.push({ file: n, state: "changed" });
  } else if (m.sha256 !== sha(l.buf)) {
    rows.push({ file: n, state: "changed", mirror: m.sha256.slice(0, 12), live: sha(l.buf).slice(0, 12) });
  }
}
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
