// audit.js — integrity gate (PLAN §5), tailored to this mirror's shape.
//
// MISSION STUDIO is capture-class: a static Cloudflare Pages deploy served
// under the /apps/mission-studio/ sub-path (capture keeps that directory tree
// at the repo root). There is no authored source in the mirror, so the
// derived pipeline is:
//
//   capture index.html inline <script> #1 (classic, id="engine-src") -> readable/index-inline-1.pretty.js (pinned prettier 3.9.6, single pass idempotent)
//   capture index.html inline <script> #2 (ES module, renderer & UI)  -> readable/index-inline-2.pretty.js (same method)
//   capture index.html inline <style>  #1 (app stylesheet)             -> readable/index-inline-1.pretty.css (same method, css parser)
//   readable engine (inline #1) -> src/index-inline-1-NN.js (statement-aligned slices of the top-level program)
//   readable module (inline #2) -> src/index-inline-2-NN.js (same)
//   script opener banners (engine '// ---- core.js' head, module '// ==== 00_util.js' head) -> wholeFile sections
//   captured assets/*.js (4 vendored three.js modules) -> readable/assets__*.pretty.js, wholeFile sections (vendor rule)
//   binary/texture/data assets (GLB/JPG/WebP/JSON) -> hashed notRendered records (no pretty pass)
//
// split-spec.json records that pipeline and this gate keeps it honest:
//
//   1. split-spec.json parses, carries a note + renderOptions + notRendered, and a defaultFile exists.
//   2. Every section resolves: ranged slices have a src/*.js file on disk, a readable
//      *.pretty.js|css sourceFile and in-bounds startLine/endLine; wholeFile sections
//      (style twin, heads, vendor modules) must NOT have a src file.
//   3. The ranges of each sourceFile tile it exactly: first starts at line 1, each next
//      starts at previous end + 1, last ends at EOF — no gaps, no overlaps.
//   4. Byte-exact round-trip: every src slice minus its exact 2-line header
//      (`// <tag> NN — <marker>` + `// Lines A-B of <pretty> (statement-aligned).`)
//      equals its recorded sourceFile range byte for byte.
//   5. Every slice parses standalone with the exact gate command
//      `node --input-type=module --check -` (stdin), as does every readable *.pretty.js.
//   6. src/*.js on disk and the spec's ranged slices are the same set; wholeFile names are
//      not on disk.
//   7. Every readable pretty is referenced by the spec, its capture source exists (a
//      captured file or an inline byte range of the captured HTML), and it is NOT
//      byte-identical to that capture source. When the pinned prettier 3.9.6 is
//      importable, each pretty is re-rendered (single pass, the recorded method) from its
//      capture bytes and byte-compared (best-effort: missing prettier is a note).
//   8. The hard rule — src/ import resolution. Relative specifiers resolve against the
//      capture directory of their source document (apps/mission-studio/); this build's
//      one relative import is the module's './assets/three.module.min.<hash>.js', which
//      the capture carries. `node:`/`vite/`/absolute-path machinery is whitelisted as in
//      the fleet template; any other bare/URL specifier is flagged.
//   9. Inline-block scan: every inline <script>/<style> content block in the captured
//      entry document must have its readable twin and a readable/index-inline-map.json
//      entry whose byte range + sha256 match the capture bytes.
//  10. notRendered completeness: every captured non-JS/CSS/HTML file (models, textures,
//      data) has a hashed notRendered record whose sha256 matches the manifest.
//  11. Derived layers never enter the capture sums: no readable/, src/, legacy/ or
//      split-spec.json path may appear in .upstream/manifest.json.
//
// usage: node tools/audit.js
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const here = __dirname;
const proj = path.resolve(here, "..");
const srcDir = path.join(proj, "src");
const readableDir = path.join(proj, "readable");
const PINNED = "3.9.6";
const ROOT = "apps/mission-studio/"; // capture root = the served sub-path

const problems = [];
const problem = (msg) => problems.push(msg);

// ── helpers ─────────────────────────────────────────────────────────────
const readLines = (abs) => {
  const t = fs.readFileSync(abs, "utf8");
  const l = t.split("\n");
  if (l.length && l[l.length - 1] === "") l.pop();
  return l;
};
const linesCache = new Map();
const getLines = (abs) => {
  if (!linesCache.has(abs)) linesCache.set(abs, readLines(abs));
  return linesCache.get(abs);
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

// capture-relative name -> readable twin name (ROOT stripped, dirs flattened with __)
const prettyNameOf = (capRel) => {
  const rel = capRel.startsWith(ROOT) ? capRel.slice(ROOT.length) : capRel;
  const flat = rel.replace(/\.(js|css)$/i, "").split("/").join("__");
  return "readable/" + flat + (/\.css$/i.test(rel) ? ".pretty.css" : ".pretty.js");
};
const captureByPretty = new Map(); // readable/<x>.pretty.js|css -> capture rel

// parse check — the exact standalone gate: node --input-type=module --check - < file
function parseCheck(abs, rel) {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
    input: fs.readFileSync(abs),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0)
    problem(`standalone ESM parse failed: ${rel} — ${(r.stderr || "").trim().split("\n").slice(-2).join(" | ")}`);
  return r.status === 0;
}

// inline <script>/<style> scan (byte-exact, same shape as tools/derive.mjs)
function scanBlocks(buf) {
  const blocks = [];
  for (const [open, close, kind] of [
    ["<script", "</script", "script"],
    ["<style", "</style", "style"],
  ]) {
    let p = 0;
    let n = 0;
    while (true) {
      const i = buf.indexOf(open, p);
      if (i < 0) break;
      const after = buf[i + open.length];
      const boundary =
        after === 0x3e || after === 0x2f || after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d;
      if (!boundary) {
        p = i + open.length;
        continue;
      }
      const tagEnd = buf.indexOf(">", i);
      if (tagEnd < 0) break;
      const j = buf.indexOf(close, tagEnd + 1);
      if (j < 0) {
        problem(`unterminated <${kind}> opened at byte ${i}`);
        break;
      }
      const tag = buf.subarray(i, tagEnd + 1).toString("utf8");
      const external = /\bsrc\s*=\s*["']/i.test(tag);
      if (!external) {
        n++;
        const content = buf.subarray(tagEnd + 1, j);
        blocks.push({
          kind: /\btype\s*=\s*["']importmap["']/i.test(tag) ? "importmap" : kind,
          block: n,
          tag,
          contentStart: tagEnd + 1,
          contentEnd: j,
          bytes: content.length,
          sha256: sha256(content),
        });
      }
      p = j + close.length;
    }
  }
  return blocks.sort((a, b) => a.contentStart - b.contentStart);
}

// ── specifier extraction (the hard rule) ────────────────────────────────
function extractSpecifiers(code) {
  const out = [];
  const push = (spec, kind, clause) => out.push({ spec, kind, clause: clause || "" });
  let m;
  const fromRe = /\bimport\s+([^;('"]*?)\s*from\s*(["'])([^"']+)\2/g;
  while ((m = fromRe.exec(code))) push(m[3], "from", m[1]);
  const sideRe = /\bimport\s*(["'])([^"']+)\1/g;
  while ((m = sideRe.exec(code))) push(m[2], "side-effect", "");
  const reExpRe = /\bexport\s+[^;()]*?\bfrom\s*(["'])([^"']+)\1/g;
  while ((m = reExpRe.exec(code))) push(m[2], "re-export", "");
  const dynRe = /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g;
  while ((m = dynRe.exec(code))) push(m[2], "dynamic", "");
  const dynTplRe = /\bimport\s*\(\s*`([^`]*)`\s*\)/g;
  while ((m = dynTplRe.exec(code))) if (!m[1].includes("${")) push(m[1], "dynamic", "");
  const urlRe = /\bnew\s+URL\s*\(\s*(["'`])([^"'`]+)\1\s*,/g;
  while ((m = urlRe.exec(code))) push(m[2], "worker-url", "");
  if (/\brequire\s*\(/.test(code)) push("<require()>", "require", "");
  return out;
}

// ── capture manifest ────────────────────────────────────────────────────
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
} catch (e) {
  problem(`.upstream/manifest.json does not parse: ${e.message}`);
}
const captured = manifest?.files ? Object.keys(manifest.files).sort() : [];
const captureByPrettyRel = new Map(); // readable twin -> captured file rel
for (const rel of captured) {
  if (/\.(js|css)$/i.test(rel)) {
    captureByPretty.set(prettyNameOf(rel), rel);
    captureByPrettyRel.set(prettyNameOf(rel), rel);
  }
}

// ── split-spec.json ─────────────────────────────────────────────────────
const specPath = path.join(proj, "split-spec.json");
if (!fs.existsSync(specPath)) problem("split-spec.json missing at repo root");
let spec = null;
try {
  spec = specPath && JSON.parse(fs.readFileSync(specPath, "utf8"));
} catch (e) {
  problem(`split-spec.json does not parse: ${e.message}`);
}
const sections = Array.isArray(spec?.sections) ? spec.sections : [];
if (spec && !Array.isArray(spec?.sections)) problem("split-spec.json has no sections array");
if (!String(spec?.note ?? "").trim()) problem("split-spec.json has no note (derivation record)");
if (!spec?.renderOptions || typeof spec.renderOptions !== "object")
  problem("split-spec.json records no renderOptions (prettier options for re-derivation)");
if (!Array.isArray(spec?.notRendered))
  problem("split-spec.json records no notRendered array (non-captured external/data references)");
if (spec?.defaultFile) {
  const df = path.join(srcDir, path.basename(String(spec.defaultFile)));
  if (!fs.existsSync(df)) problem(`split-spec defaultFile "${spec.defaultFile}" does not exist`);
}

const seen = new Set();
const rangedFiles = new Set();
const indexOnlyFiles = new Set();
for (const s of sections) {
  if (!s.file) {
    problem("split-spec section without a file");
    continue;
  }
  if (seen.has(s.file)) problem(`split-spec lists ${s.file} twice`);
  seen.add(s.file);
  const isWhole = s.wholeFile === true;
  const isSkipped = s.skipped === true;
  if (isWhole && isSkipped) problem(`section ${s.file}: both wholeFile and skipped`);
  if (typeof s.startLine !== "number" || typeof s.endLine !== "number")
    problem(`section ${s.file}: no startLine/endLine range recorded`);
  if (typeof s.sourceFile !== "string") problem(`section ${s.file}: no sourceFile provenance recorded`);
  if (isWhole || isSkipped) indexOnlyFiles.add(s.file);
  else rangedFiles.add(s.file);
}
if (!rangedFiles.size) problem("no ranged src slices in split-spec.json (no reversed layer)");

const onDisk = fs.existsSync(srcDir)
  ? fs.readdirSync(srcDir).filter((f) => f.endsWith(".js")).sort()
  : [];
if (!onDisk.length) problem("src/ missing or empty (no reversed layer)");
for (const f of onDisk) if (!rangedFiles.has(f)) problem(`src/${f} exists but is not a ranged slice in split-spec.json`);
for (const f of rangedFiles) if (!onDisk.includes(f)) problem(`split-spec lists ${f} but it is not on disk`);
for (const f of indexOnlyFiles)
  if (onDisk.includes(f)) problem(`index-only section ${f} must not have a src file on disk (wholeFile/skipped)`);

// ── ranges: existence, bounds, tiling ───────────────────────────────────
const bySource = new Map();
for (const s of sections) {
  if (!s.file || typeof s.sourceFile !== "string") continue;
  const src = path.join(proj, s.sourceFile);
  if (!fs.existsSync(src)) {
    problem(`section ${s.file}: sourceFile missing: ${s.sourceFile}`);
    continue;
  }
  if (!/\.pretty\.(js|css)$/i.test(s.sourceFile)) {
    problem(`section ${s.file}: sourceFile is not a readable pretty: ${s.sourceFile}`);
    continue;
  }
  const srcLines = getLines(src);
  const A = s.startLine,
    B = s.endLine;
  if (!Number.isInteger(A) || !Number.isInteger(B) || A < 1 || B < A || B > srcLines.length) {
    problem(`section ${s.file}: bad range ${A}-${B} vs ${s.sourceFile} (${srcLines.length} lines)`);
    continue;
  }
  if (!bySource.has(s.sourceFile)) bySource.set(s.sourceFile, []);
  bySource.get(s.sourceFile).push({ s, A, B });
}
let tiledOK = 0;
for (const [sourceFile, list] of bySource) {
  let ok = true;
  list.sort((x, y) => x.A - y.A);
  const srcLines = getLines(path.join(proj, sourceFile));
  if (list[0].A !== 1) {
    problem(`${sourceFile}: first section starts at line ${list[0].A}, not 1`);
    ok = false;
  }
  for (let k = 1; k < list.length; k++) {
    if (list[k].A !== list[k - 1].B + 1) {
      problem(
        `${sourceFile}: ranges not contiguous at ${list[k].s.file} (starts ${list[k].A}, previous ends ${list[k - 1].B})`,
      );
      ok = false;
    }
  }
  if (list[list.length - 1].B !== srcLines.length) {
    problem(`${sourceFile}: last section ends at ${list[list.length - 1].B}, not ${srcLines.length}`);
    ok = false;
  }
  if (ok) tiledOK++;
}

// ── byte-exact round-trip + header provenance ───────────────────────────
let roundOK = 0,
  ranged = 0;
for (const [, list] of bySource) {
  for (const { s, A, B } of list) {
    if (s.wholeFile === true || s.skipped === true) continue;
    ranged++;
    const srcAbs = path.join(srcDir, path.basename(String(s.file)));
    if (!fs.existsSync(srcAbs)) continue; // already reported
    const text = fs.readFileSync(srcAbs, "utf8");
    const nl1 = text.indexOf("\n");
    const nl2 = nl1 >= 0 ? text.indexOf("\n", nl1 + 1) : -1;
    if (nl2 < 0) {
      problem(`src/${s.file}: missing 2-line header`);
      continue;
    }
    const header1 = text.slice(0, nl1);
    const header2 = text.slice(nl1 + 1, nl2);
    const nn = path.basename(String(s.file)).match(/-(\d+)\.js$/)?.[1];
    if (!nn) problem(`src/${s.file}: file name carries no -NN slice number`);
    else if (!new RegExp(`^// .+ ${nn} — .+$`).test(header1))
      problem(`src/${s.file}: header line 1 does not match "// <tag> ${nn} — <marker>": ${header1}`);
    const want2 = `// Lines ${A}-${B} of ${s.sourceFile} (statement-aligned).`;
    if (header2 !== want2) problem(`src/${s.file}: header line 2 is not the recorded range: ${header2}`);
    const body = text.slice(nl2 + 1);
    const srcLines = getLines(path.join(proj, s.sourceFile));
    const expected = srcLines.slice(A - 1, B).join("\n") + "\n";
    if (body !== expected)
      problem(`src/${s.file}: body is not a byte-exact round-trip of ${s.sourceFile} lines ${A}-${B}`);
    else roundOK++;
  }
}

// ── skipped sections: textual re-verification ───────────────────────────
let skippedOK = 0,
  skippedTotal = 0;
for (const s of sections) {
  if (s.skipped !== true || typeof s.sourceFile !== "string") continue;
  skippedTotal++;
  const src = path.join(proj, s.sourceFile);
  if (!fs.existsSync(src)) {
    problem(`skipped section ${s.file}: sourceFile missing: ${s.sourceFile}`);
    continue;
  }
  const lines = getLines(src);
  if (!Number.isInteger(s.startLine) || !Number.isInteger(s.endLine) || s.startLine < 1 || s.endLine > lines.length)
    continue;
  const first = lines[s.startLine - 1],
    last = lines[s.endLine - 1];
  if (typeof s.firstLine !== "string" || typeof s.lastLine !== "string")
    problem(`skipped section ${s.file}: no firstLine/lastLine recorded`);
  else if (first !== s.firstLine || last !== s.lastLine)
    problem(`skipped section ${s.file}: range text does not match the recorded first/last lines`);
  else skippedOK++;
}

// ── every src + pretty parses standalone ────────────────────────────────
let checkOK = 0;
for (const f of onDisk) if (parseCheck(path.join(srcDir, f), `src/${f}`)) checkOK++;

const prettyFiles = [];
const walkPretty = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkPretty(p);
    else if (/\.pretty\.(js|css)$/i.test(e.name)) prettyFiles.push(p);
  }
};
walkPretty(readableDir);
if (!prettyFiles.length) problem("readable/ has no *.pretty.js|css (derived layer missing)");
let prettyOK = 0,
  prettyParsed = 0;
for (const abs of prettyFiles) {
  const rel = path.relative(proj, abs).split(path.sep).join("/");
  if (!/\.pretty\.js$/i.test(rel)) continue; // CSS pretties are indexed, not ESM-parsed
  prettyParsed++;
  if (parseCheck(abs, rel)) prettyOK++;
}

// ── inline-block twins + map (deliverable rule) ─────────────────────────
const inlineMapPath = path.join(readableDir, "index-inline-map.json");
let inlineMap = null;
if (fs.existsSync(inlineMapPath)) {
  try {
    inlineMap = JSON.parse(fs.readFileSync(inlineMapPath, "utf8"));
  } catch (e) {
    problem(`readable/index-inline-map.json does not parse: ${e.message}`);
  }
}
const inlineRecFor = (rel) => {
  for (const src of inlineMap?.sources ?? []) {
    const rec = src.blocks?.find((x) => x.file === rel);
    if (rec) return { rec, source: src.source };
  }
  return null;
};
let inlineBlocks = 0;
for (const capRel of Object.keys(manifest?.files ?? {})) {
  if (!/\.html$/i.test(capRel)) continue;
  const buf = fs.readFileSync(path.join(proj, capRel));
  const blocks = scanBlocks(buf);
  inlineBlocks += blocks.length;
  const base = capRel.startsWith(ROOT) ? capRel.slice(ROOT.length) : capRel;
  const entryTag = base.replace(/\.html$/i, "").split("/").join("__");
  for (const b of blocks) {
    const twinExt = b.kind === "style" ? "css" : b.kind === "importmap" ? "json" : "js";
    const twin = `readable/${entryTag}-inline-${b.block}.pretty.${twinExt}`;
    if (!fs.existsSync(path.join(proj, twin))) problem(`${capRel}: inline ${b.kind} #${b.block} has no twin ${twin}`);
    const hit = inlineRecFor(twin);
    if (!hit) {
      problem(`${capRel}: inline ${b.kind} #${b.block} is missing from readable/index-inline-map.json`);
      continue;
    }
    if (hit.rec.byteStart !== b.contentStart || hit.rec.byteEnd !== b.contentEnd || hit.rec.sha256 !== b.sha256)
      problem(`${twin}: recorded inline byte range/sha256 does not match the capture bytes`);
  }
}
if (inlineMap && inlineBlocks === 0) problem("readable/index-inline-map.json exists but the capture has no inline blocks");

// ── every pretty referenced + provably derived ──────────────────────────
const referenced = new Set();
for (const [sourceFile] of bySource) referenced.add(sourceFile.split(path.sep).join("/"));
let derivedOK = 0;
for (const abs of prettyFiles) {
  const rel = path.relative(proj, abs).split(path.sep).join("/");
  if (!referenced.has(rel))
    problem(`readable/${path.basename(rel)} exists but is not referenced by split-spec.json`);
  const capRel = captureByPretty.get(rel);
  if (capRel && fs.existsSync(path.join(proj, capRel))) {
    if (manifest && !manifest.files?.[capRel])
      problem(`${rel}: capture source ${capRel} is not recorded in .upstream/manifest.json`);
    if (fs.readFileSync(path.join(proj, capRel)).equals(fs.readFileSync(abs)))
      problem(`${rel}: byte-identical to its capture source (prettier did not run?)`);
    else derivedOK++;
    continue;
  }
  // inline twin: its capture source is a byte range of the entry document
  const hit = inlineRecFor(rel);
  if (!hit) problem(`${rel}: no capture source known (neither a captured .js/.css nor an inline-map record)`);
  else {
    const block = fs.readFileSync(path.join(proj, hit.source)).subarray(hit.rec.byteStart, hit.rec.byteEnd);
    if (block.equals(fs.readFileSync(abs))) problem(`${rel}: byte-identical to its capture block (prettier did not run?)`);
    else derivedOK++;
  }
}
// every captured .js/.css must have a readable twin referenced by the spec
if (manifest) {
  for (const capRel of Object.keys(manifest.files)) {
    if (!/\.(js|css)$/i.test(capRel)) continue;
    const twin = prettyNameOf(capRel);
    if (!prettyFiles.some((abs) => path.relative(proj, abs).split(path.sep).join("/") === twin))
      problem(`captured ${capRel} has no readable twin (${twin}) referenced by the spec`);
  }
}

// ── wholeFile sections carry the recorded shape (content guards) ────────
const VENDOR_GUARDS = [
  ["apps/mission-studio/assets/three.module.min.3e690ac7d1.js", /WebGLRenderer/, /__THREE__/],
  ["apps/mission-studio/assets/GLTFLoader.8c75e4b72b.js", /GLTFLoader/, /DRACOLoader/],
  ["apps/mission-studio/assets/BufferGeometryUtils.1b11c30e00.js", /toTrianglesDrawMode/, /mergeGeometries/],
  ["apps/mission-studio/assets/meshopt_decoder.module.01f48524f4.js", /MeshoptDecoder/, /meshopt/],
  ["index-inline-1.css", /--bg: #03050a/, /--amber/],
  ["index-inline-1-head.js", /---- core\.js/, /Frame convention/],
  ["index-inline-2-head.js", /==== 00_util\.js/, /renderer & UI/],
];
for (const [file, reA, reB] of VENDOR_GUARDS) {
  // A guard may name the section by its served path or by its capture rel —
  // the section records both.
  const sec = sections.find((s) => s.file === file) || sections.find((s) => s.capture === file);
  if (!sec) continue; // absence is fine; presence must hold its guard
  if (sec.wholeFile !== true) {
    problem(`wholeFile section ${file} is not wholeFile`);
    continue;
  }
  const text = getLines(path.join(proj, sec.sourceFile))
    .slice(sec.startLine - 1, sec.endLine)
    .join("\n");
  if (!reA.test(text) || !reB.test(text)) problem(`wholeFile section ${file}: content guard failed — readable changed shape`);
}

// ── the hard rule: src/ import resolution ───────────────────────────────
// relative specifiers resolve against the capture directory of the slice's
// source document; for an inline twin that is the directory of the captured
// HTML (the served base the document runs from).
let checkedImports = 0,
  resolvedImports = 0,
  whitelisted = 0,
  externalWhitelisted = 0;
for (const s of sections) {
  if (s.wholeFile === true || s.skipped === true) continue;
  if (!s.file || typeof s.sourceFile !== "string") continue;
  const srcAbs = path.join(srcDir, path.basename(String(s.file)));
  if (!fs.existsSync(srcAbs)) continue;
  const capRel = captureByPretty.get(s.sourceFile);
  const hit = capRel ? null : inlineRecFor(s.sourceFile);
  const baseDir = capRel ? path.posix.dirname(capRel) : hit ? path.posix.dirname(hit.source) : null;
  const code = fs.readFileSync(srcAbs, "utf8");
  for (const { spec: sp, kind, clause } of extractSpecifiers(code)) {
    checkedImports++;
    if (sp.startsWith("./") || sp.startsWith("../")) {
      if (!baseDir) {
        problem(`src/${s.file}: ${kind} import "${sp}" but no capture provenance is known`);
        continue;
      }
      const target = path.posix.normalize(path.posix.join(baseDir, sp));
      if (!fs.existsSync(path.join(proj, target))) {
        problem(`src/${s.file}: unresolvable ${kind} import "${sp}" (capture carries no ${target})`);
        continue;
      }
      resolvedImports++;
      continue;
    }
    if (sp.startsWith("node:") || sp.startsWith("vite/") || sp.startsWith("/")) {
      whitelisted++;
      continue;
    }
    problem(`src/${s.file}: unresolvable ${kind} import "${sp}" — bare/URL specifier not whitelisted`);
  }
}

// ── notRendered completeness (models/textures/data recorded hashed) ─────
let notRenderedChecked = 0;
if (manifest && Array.isArray(spec?.notRendered)) {
  for (const rel of Object.keys(manifest.files)) {
    if (/\.(js|css|html)$/i.test(rel)) continue;
    const rec = spec.notRendered.find((n) => n.capture === rel);
    if (!rec) {
      problem(`captured ${rel} has no notRendered record (binary/data must be recorded hashed)`);
      continue;
    }
    if (rec.sha256 !== manifest.files[rel].sha256 || rec.bytes !== manifest.files[rel].bytes)
      problem(`notRendered record for ${rel} does not match the manifest bytes/sha256`);
    else notRenderedChecked++;
  }
}

// ── derived layers must never enter the capture sums ────────────────────
if (manifest) {
  for (const rel of Object.keys(manifest.files)) {
    const norm = rel.split(path.sep).join("/");
    if (/^(readable|src|legacy)\//.test(norm) || norm === "split-spec.json")
      problem(`derived layer leaked into the capture manifest: ${rel}`);
  }
}

// ── best-effort: re-render every pretty with the pinned prettier 3.9.6 ─
const prettierCandidates = [
  process.env.PRETTIER_MJS,
  path.join(proj, "node_modules", "prettier", "index.mjs"),
  path.join(proj, "tools", "vendor", "prettier", "index.mjs"),
].filter(Boolean);
function loadPinnedPrettier() {
  for (const c of prettierCandidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(c), "package.json"), "utf8"));
      if (pkg.version !== PINNED) continue;
      return c;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

(async () => {
  let renderNote = `prettier ${PINNED} not importable — renderOptions recorded, re-render check skipped`;
  const prettierPath = loadPinnedPrettier();
  if (prettierPath) {
    const prettier = (await import(pathToFileURL(prettierPath).href)).default;
    // same recorded method as tools/derive.mjs: single pass (idempotent)
    let renderOK = 0;
    for (const abs of prettyFiles) {
      const rel = path.relative(proj, abs).split(path.sep).join("/");
      const capRel = captureByPretty.get(rel);
      let parser = /\.pretty\.css$/i.test(rel) ? "css" : "babel";
      let sourceText = null;
      if (capRel && fs.existsSync(path.join(proj, capRel))) sourceText = fs.readFileSync(path.join(proj, capRel), "utf8");
      else {
        // inline twin: re-derive from the recorded capture byte range
        const hit = inlineRecFor(rel);
        if (!hit) {
          problem(`${rel}: no inline-map record for the twin (cannot re-render)`);
          continue;
        }
        if (hit.rec.parsedAs) parser = hit.rec.parsedAs;
        const entryBuf = fs.readFileSync(path.join(proj, hit.source));
        sourceText = entryBuf.subarray(hit.rec.byteStart, hit.rec.byteEnd).toString("utf8");
      }
      if (sourceText === null) continue; // already reported
      const want = fs.readFileSync(abs, "utf8");
      let got;
      try {
        got = await prettier.format(sourceText, { parser });
      } catch (e) {
        problem(`${rel}: re-render failed (${e.message})`);
        continue;
      }
      if (got === want) renderOK++;
      else problem(`${rel}: does not re-render byte-exact under pinned prettier ${PINNED} (single pass, {parser:${parser}})`);
    }
    renderNote = `${renderOK}/${prettyFiles.length} pretties re-render byte-exact under pinned prettier ${PINNED} (single pass method)`;
  }

  if (problems.length) {
    console.error(`AUDIT FAIL — ${problems.length} problem(s)`);
    for (const p of problems) console.error("  " + p);
    process.exit(1);
  }
  console.log(
    `AUDIT PASS — ${sections.length} spec sections (${roundOK}/${ranged} src↔pretty round-trips byte-exact, ` +
      `${tiledOK}/${bySource.size} pretty sources tiled contiguously, ` +
      `${skippedOK}/${skippedTotal} skipped sections re-verified textually, ` +
      `${checkOK}/${onDisk.length} src slices + ${prettyOK}/${prettyParsed} readable/*.pretty.js parse standalone (node --input-type=module --check -), ` +
      `${derivedOK}/${prettyFiles.length} pretties provably distinct from their capture source, ` +
      `${indexOnlyFiles.size} index-only wholeFile sections carry no src file, ` +
      `${inlineBlocks} inline content block(s) with twins + map, ` +
      `${resolvedImports}/${checkedImports} imports resolve inside the capture (${whitelisted} whitelisted machinery, ` +
      `${externalWhitelisted} documented external CDN import), ` +
      `${notRenderedChecked} binary/data asset(s) recorded hashed in notRendered, ` +
      `${renderNote}, capture manifest free of derived layers)`,
  );
})();
