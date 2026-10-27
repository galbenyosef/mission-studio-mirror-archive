// derive.mjs — rebuild the derived layers (readable/ + src/ + split-spec.json)
// from the MISSION STUDIO capture (PLAN §3/§5). Mission Studio is a Cloudflare
// Pages deploy served under the /apps/mission-studio/ sub-path; the capture
// keeps that exact directory tree at the repo root (dead-world precedent for
// sub-path deploys), so a disk rel maps 1:1 onto the served path. §0.4
// fork-over-mirror was checked on 2026-10-13 — no public upstream repo exists
// (the deploy carries no repo link; GitHub search finds only unrelated
// projects), so the mirror stands. Capture-class; the capture is untouched —
// every source file is re-hashed against .upstream/manifest.json before it is
// rendered, so a drifted capture fails loudly instead of being silently
// re-derived.
//
// Pipeline:
//   inline <script> blocks  -> pinned prettier 3.9.6 (module API — the CLI
//                              respects .gitignore and can silently echo its
//                              input), single pass verified idempotent
//                              -> readable/index-inline-N.pretty.js
//   inline <style> blocks   -> same method, css parser
//                              -> readable/index-inline-N.pretty.css
//   captured *.js files     -> same method -> readable/<name>.pretty.js
//                              (capture-root-relative name with the
//                              apps/mission-studio/ prefix stripped, nested
//                              dirs flattened with __): the four vendored
//                              three.js modules — wholeFile sections, never
//                              sliced (vendor rule).
//   inline script #1        -> statement-aligned slices of the classic
//                              <script id="engine-src"> (the simulation
//                              engine: the app also runs this text in a
//                              Worker via a Blob), src/index-inline-1-NN.js
//   inline script #2        -> statement-aligned slices of the ES module
//                              (renderer & UI), src/index-inline-2-NN.js
//                              Both: top-level declaration boundaries only,
//                              ~250-350 line windows (oversized single
//                              declarations stay whole), exact 2-line
//                              provenance header; every slice is
//                              parse-checked with `node --input-type=module
//                              --check -` and round-trips byte-exact to its
//                              readable line range.
//   the head comments before each script's first statement (the `// ---- core.js`
//   banner / the `// ==== 00_util.js` module header) are wholeFile sections —
//   indexed, never sliced.
//   binary/texture/data assets (GLB/JPG/WebP/JSON) are hashed notRendered
//   records — carried byte-exact in the capture, no pretty pass.
//
// External (CDN rule, recorded in notRendered, never captured/backfilled):
// the Google Fonts stylesheet + preconnects in the entry head. No other
// off-origin request exists in the captured code (the favicon is an inline
// data: SVG; sound is synthesized WebAudio).
//
// usage: node tools/derive.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
// ── --check: prove the committed derived layer is current, writing NOTHING ─
// This tool used to ignore its command line entirely, so `node tools/derive.mjs
// --check` was a full in-place re-derivation: it rewrote readable/ + src/ +
// split-spec.json and (on a mirror whose derive does not re-apply the recorded
// rename map) stripped the rename layer off src/ -- damage that looks
// legitimate, because the files still parse. --check now runs the mirror's
// documented rebuild chain in a throwaway scratch copy OUTSIDE the mirror and
// compares the result with the committed tree; it writes nothing here.
if (process.argv.includes("--check")) {
  const { runDeriveCheck } = await import("./derive-check.mjs");
  process.exit(await runDeriveCheck());
}

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const PINNED = "3.9.6";
const MIN_WINDOW = 250;
const MAX_WINDOW = 350;
const TODAY = "2026-10-13";
const ROOT = "apps/mission-studio/"; // capture root = the served sub-path

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readLines = (abs) => {
  const t = fs.readFileSync(abs, "utf8");
  const l = t.split("\n");
  if (l.length && l[l.length - 1] === "") l.pop();
  return l;
};
const linesOf = (text) => text.replace(/\n$/, "").split("\n");
const lineOf = (text, offset) => text.slice(0, offset).split("\n").length;

// capture-relative name -> readable twin name (apps/mission-studio/ stripped,
// dirs flattened with __)
const tagOf = (capRel) => {
  const rel = capRel.startsWith(ROOT) ? capRel.slice(ROOT.length) : capRel;
  return rel.replace(/\.(js|css)$/i, "").split("/").join("__");
};
const prettyRelFor = (capRel) =>
  "readable/" + tagOf(capRel) + (/\.css$/i.test(capRel) ? ".pretty.css" : ".pretty.js");

// ── pinned prettier (module API, exactly 3.9.6) ─────────────────────────
async function loadPrettier() {
  const candidates = [
    process.env.PRETTIER_MJS,
    path.join(proj, "node_modules", "prettier", "index.mjs"),
    path.join(proj, "tools", "vendor", "prettier", "index.mjs"),
  ].filter(Boolean);
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(c), "package.json"), "utf8"));
      if (pkg.version !== PINNED) continue;
      const mod = (await import(pathToFileURL(c).href)).default;
      if (mod.version === PINNED) return { mod, at: c };
    } catch {
      /* try next */
    }
  }
  throw new Error(`pinned prettier ${PINNED} not found (set PRETTIER_MJS to its index.mjs)`);
}

// single pass + idempotency proof: prettier output must be a fixed point of
// the same call, so audit's one-pass re-render is byte-exact by construction
async function formatOnce(prettier, text, parser) {
  const out = await prettier.format(text, { parser });
  const again = await prettier.format(out, { parser });
  if (again !== out) throw new Error(`prettier ${parser} is not idempotent on this input`);
  return out;
}

// ── parse check: the exact standalone gate (ESM stdin) ──────────────────
function parses(text) {
  const r = spawnSync(process.execPath, ["--input-type=module", "--check", "-"], {
    input: text,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { ok: r.status === 0, why: (r.stderr || "").trim().split("\n").slice(-3).join(" | ") };
}

// ── markers for titles (top tokens, lowercase; fleet convention) ────────
const STOP = new Set(
  ("function return typeof undefined object string number boolean prototype length value default " +
    "exports import this that with from then else case break continue delete instanceof constructor " +
    "arguments void null true false call apply name type text target window document globalthis self " +
    "require module async await yield static class const let var new for while switch throw try catch " +
    "finally extends super using debugger of in do if has own hasown get set")
    .split(" ")
    .filter(Boolean),
);
function markers(text, n = 2) {
  // URLs/identifiers living inside string literals are not code tokens — strip
  // quoted strings and comments before counting
  const code = text.replace(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g, " ").replace(/\/\/[^\n]*/g, " ");
  const counts = new Map();
  for (const m of code.matchAll(/[A-Za-z][A-Za-z0-9_]{2,}/g)) {
    const w = m[0].toLowerCase();
    if (STOP.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
const markerText = (ms) => ms.map(([w, c]) => `${w}(${c})`).join(", ");

// ── windowize: cut only at statement starts; ≤350 lines, a single ───────
// ── oversized declaration is a window of its own ────────────────────────
function windowize(stmts) {
  const out = [];
  let cur = null;
  for (const s of stmts) {
    if (!cur) {
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
      continue;
    }
    const projected = s.endLine - cur.startLine + 1;
    if (projected > MAX_WINDOW) {
      out.push(cur);
      cur = { first: s, last: s, count: 1, startLine: s.startLine, endLine: s.endLine };
    } else {
      cur.last = s;
      cur.count++;
      cur.endLine = s.endLine;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// ── inline block scan (byte-exact, over the raw entry buffer) ───────────
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
      if (j < 0) throw new Error(`unterminated <${kind}> opened at byte ${i}`);
      const tag = buf.subarray(i, tagEnd + 1).toString("utf8");
      const external = /\bsrc\s*=\s*["']/i.test(tag);
      if (external) {
        blocks.push({ kind, external: true, tag, openStart: i, contentStart: tagEnd + 1, contentEnd: j });
      } else {
        n++;
        const content = buf.subarray(tagEnd + 1, j);
        blocks.push({
          kind: /\btype\s*=\s*["']importmap["']/i.test(tag) ? "importmap" : kind,
          external: false,
          block: n,
          tag,
          openStart: i,
          contentStart: tagEnd + 1,
          contentEnd: j,
          bytes: content.length,
          sha256: sha256(content),
          text: content.toString("utf8"),
        });
      }
      p = j + close.length;
    }
  }
  return blocks.sort((a, b) => a.openStart - b.openStart);
}

// ── content anchors for the two inline scripts (guards fail loudly) ─────
const ENGINE_HEAD_GUARD = (t) => /---- core\.js/.test(t) && /Frame convention/.test(t);
const ENGINE_FIRST_GUARD = (t) => /^const DEG = Math\.PI \/ 180/.test(t.trim()) && /TAU = 2 \* Math\.PI/.test(t);
const ENGINE_LAST_GUARD = (t) => /function planScenario\(cfg, progress\)/.test(t) && /planInterplanetary/.test(t);
const ENGINE_MIN_STMTS = 150;
const MODULE_HEAD_GUARD = (t) => /Mission Studio — renderer & UI \(ES module\)/.test(t);
const MODULE_FIRST_GUARD = (t) =>
  /^import \* as THREE from ['"]\.\/assets\/three\.module\.min\.[0-9a-f]+\.js['"]/.test(t.trim());
const MODULE_LAST_GUARD = (t) => /boot\(\)/.test(t) && /Startup error/.test(t);
const MODULE_MIN_STMTS = 400;

// ── vendor modules (wholeFile rule: indexed whole, never sliced) ────────
const VENDOR = {
  "assets__three.module.min.3e690ac7d1": {
    what: "three.js r160 (MIT) — the renderer core, vendored by the deploy",
    title: "assets__three.module.min.3e690ac7d1 — three.js r160 (vendor, whole-file, never sliced)",
    desc:
      "The vendored three.js r160 ES-module build (its MIT `@license` banner names the Three.js Authors; " +
      "`REVISION` 160) — renderer core, math, geometries, materials, textures, loaders and the WebGL " +
      "renderer, minified by the deploy. Vendor rule — indexed whole-file in readable/, never sliced or " +
      "rewritten; the capture keeps the minified bytes.",
    guard: (t) => /WebGLRenderer/.test(t) && /__THREE__/.test(t),
  },
  "assets__GLTFLoader.8c75e4b72b": {
    what: "three.js GLTFLoader addon (vendor) — imports ./BufferGeometryUtils.<hash>.js",
    title: "assets__GLTFLoader.8c75e4b72b — three.js GLTFLoader addon (vendor, whole-file, never sliced)",
    desc:
      "The three.js examples/jsm GLTFLoader addon the app dynamically imports (via its `ASSET()` map) to load " +
      "the GLB models — glTF/GLB parsing with the KHR/Meshopt plugin callbacks and DRACO glue; it imports " +
      "`./BufferGeometryUtils.<hash>.js` from the same assets/ directory. Vendor rule — indexed whole-file in " +
      "readable/, never sliced or rewritten.",
    guard: (t) => /GLTFLoader/.test(t) && /DRACOLoader/.test(t),
  },
  "assets__BufferGeometryUtils.1b11c30e00": {
    what: "three.js BufferGeometryUtils addon (vendor)",
    title: "assets__BufferGeometryUtils.1b11c30e00 — three.js BufferGeometryUtils addon (vendor, whole-file, never sliced)",
    desc:
      "The three.js examples/jsm BufferGeometryUtils addon (mergeGeometries, mergeVertices, interleaveAttributes, " +
      "toTrianglesDrawMode, …) imported by GLTFLoader and by the app; imports the vendored " +
      "`./three.module.min.<hash>.js`. Vendor rule — indexed whole-file in readable/, never sliced or rewritten.",
    guard: (t) => /toTrianglesDrawMode/.test(t) && /mergeGeometries/.test(t),
  },
  "assets__meshopt_decoder.module.01f48524f4": {
    what: "meshoptimizer MeshoptDecoder module (vendor) — embedded WASM base64",
    title: "assets__meshopt_decoder.module.01f48524f4 — meshoptimizer MeshoptDecoder (vendor, whole-file, never sliced)",
    desc:
      "The meshoptimizer project's MeshoptDecoder ESM module (Arseny Kapoulkine, MIT) the app dynamically " +
      "imports for mesh decompression, with the decoder WASM embedded as a base64 payload inside the file. " +
      "Vendor rule — indexed whole-file in readable/, never sliced or rewritten.",
    guard: (t) => /MeshoptDecoder/.test(t),
  },
};

// external CDN references recorded, never captured (CDN rule)
const EXTERNAL = [
  {
    kind: "external-stylesheet",
    url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@400;500;600;700&display=swap",
    reason:
      "Google Fonts stylesheet (IBM Plex Mono / IBM Plex Sans Condensed) — a CDN dependency that stays CDN " +
      "(fleet rule; socker precedent 2026-10-10); the app falls back to system fonts without it, so it is not " +
      "backfilled into the capture",
  },
  {
    kind: "external-preconnect",
    url: "https://fonts.googleapis.com",
    reason: "external preconnect hint — a connection warm-up, not content; not captured",
  },
  {
    kind: "external-preconnect",
    url: "https://fonts.gstatic.com",
    reason: "external preconnect hint for the font files — a connection warm-up, not content; not captured",
  },
  {
    kind: "inline-data-uri",
    url: "data:image/svg+xml,… (favicon)",
    reason: "the entry document's favicon is an inline data: SVG (an orange orb) — no file is requested; not captured",
  },
];

async function main() {
  const { mod: prettier, at } = await loadPrettier();
  console.log(`pinned prettier ${PINNED} (${at})`);

  const manifest = JSON.parse(fs.readFileSync(path.join(proj, ".upstream", "manifest.json"), "utf8"));
  const captured = Object.keys(manifest.files).map((r) => r.split(path.sep).join("/")).sort();
  const captureBytes = (rel) => {
    const abs = path.join(proj, rel);
    if (!fs.existsSync(abs)) throw new Error(`capture file missing: ${rel}`);
    const buf = fs.readFileSync(abs);
    if (sha256(buf) !== manifest.files[rel].sha256)
      throw new Error(`${rel} on disk does not match .upstream/manifest.json — re-verify the capture first`);
    return buf;
  };

  const readableDir = path.join(proj, "readable");
  const srcDir = path.join(proj, "src");
  fs.mkdirSync(readableDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  const written = { readable: new Set(), src: new Set() };

  const sources = [];
  const sections = [];
  const notRendered = [];
  const inlineFiles = [];
  let slicedTotal = 0;
  let skippedTotal = 0;
  let wholeTotal = 0;

  const htmlRels = captured.filter((r) => /\.html$/i.test(r));
  const jsRels = captured.filter((r) => /\.js$/i.test(r));
  const cssRels = captured.filter((r) => /\.css$/i.test(r));

  // ── 1) captured JS files: vendor modules -> readable twin + wholeFile ───
  for (const rel of jsRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(buf)) throw new Error(`${rel} does not round-trip through utf8`);
    const pretty = await formatOnce(prettier, text, "babel");
    if (pretty === text)
      throw new Error(`${rel}: prettier output is byte-identical to the capture — nothing to derive`);
    const sourceFile = prettyRelFor(rel);
    fs.writeFileSync(path.join(proj, sourceFile), pretty);
    written.readable.add(path.basename(sourceFile));
    const lines = linesOf(pretty);
    const tag = tagOf(rel);
    const cls = VENDOR[tag];
    if (!cls) throw new Error(`${rel}: captured JS file is not classified in VENDOR (vendor rule needs a record)`);
    if (!cls.guard(pretty)) throw new Error(`${rel}: vendor guard failed — readable changed shape`);
    wholeTotal++;
    // The vendor bundle is indexed WHOLE. The section's `file` is the
    // SERVED file itself (the capture rel — byte-exact, never rewritten) and
    // `capture` names the same path, so the public-export-name gate can pair
    // this section with the source it came from and read the export table out
    // of the readable twin. Naming a file the generator never wrote (a
    // "-vendor.js" label) left the gate with no derived text to compare.
    sections.push({
      file: rel,
      capture: rel,
      wholeFile: true,
      title: cls.title,
      desc: `Lines 1-${lines.length} of ${sourceFile}: ${cls.desc}`,
      note: "whole-file (vendor rule): indexed in readable/, never sliced",
      startLine: 1,
      endLine: lines.length,
      sourceFile,
    });
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: 0,
      derived: "readable only (vendor bundle, wholeFile)",
      what: cls.what,
    });
    console.log(`derive: ${rel} -> ${sourceFile} (${lines.length} lines, wholeFile vendor)`);
  }

  // captured CSS files: none in this capture, but keep the branch honest
  for (const rel of cssRels) {
    const buf = captureBytes(rel);
    const text = buf.toString("utf8");
    const pretty = await formatOnce(prettier, text, "css");
    if (pretty === text) throw new Error(`${rel}: prettier output is byte-identical to the capture`);
    const sourceFile = prettyRelFor(rel);
    fs.writeFileSync(path.join(proj, sourceFile), pretty);
    written.readable.add(path.basename(sourceFile));
    const lines = linesOf(pretty);
    const tag = tagOf(rel);
    wholeTotal++;
    sections.push({
      file: `${tag}.css`,
      wholeFile: true,
      title: `${tag} — stylesheet (whole-file, never sliced)`,
      desc: `Lines 1-${lines.length} of ${sourceFile}. Whole-file (stylesheet rule): the capture stylesheet is indexed whole in readable/, never sliced.`,
      note: "whole-file (stylesheet, not sliced): CSS is indexed whole in readable/",
      startLine: 1,
      endLine: lines.length,
      sourceFile,
    });
    sources.push({
      sourceFile,
      capture: rel,
      captureKind: "file",
      captureSha256: manifest.files[rel].sha256,
      captureBytes: buf.length,
      prettyLines: lines.length,
      prettyBytes: Buffer.byteLength(pretty, "utf8"),
      prettyPasses: 1,
      idempotent: true,
      tag,
      slices: 0,
      derived: "readable only (stylesheet, wholeFile)",
    });
    console.log(`derive: ${rel} -> ${sourceFile} (${lines.length} lines, wholeFile stylesheet)`);
  }

  // ── 2) binary/texture/data assets: hashed notRendered records ──────────
  for (const rel of captured) {
    const ext = path.extname(rel).toLowerCase();
    if ([".html", ".js", ".css"].includes(ext)) continue;
    const kind = [".glb", ".gltf"].includes(ext)
      ? "model"
      : [".jpg", ".jpeg", ".png", ".webp", ".ktx2", ".hdr", ".exr"].includes(ext)
        ? "image"
        : "data";
    notRendered.push({
      capture: rel,
      kind,
      bytes: manifest.files[rel].bytes,
      sha256: manifest.files[rel].sha256,
      rendered: false,
      reason:
        `${kind} payload (${ext}) — binary/data capture stays byte-exact under .upstream/manifest.json; ` +
        "recorded here hashed, no pretty pass",
    });
  }

  // ── 3) inline <script>/<style> blocks: twins, slices, wholeFile ────────
  const inlineMap = {
    note:
      "Content blocks of every inline <script>/<style> in the captured HTML documents. byteStart/byteEnd are content " +
      "offsets (tags excluded, end exclusive) into the source document; sha256 is over those exact bytes. Blocks that " +
      "are real JS/CSS were rendered to a readable twin with pinned prettier 3.9.6 (module API, single pass verified " +
      "idempotent); script twins are further sliced into src/ (except the wholeFile heads), style twins are wholeFile. " +
      "External references (link href, script src) are not blocks — they are recorded in split-spec.json notRendered " +
      "and left external by design.",
    sources: [],
  };

  for (const rel of htmlRels) {
    const buf = captureBytes(rel);
    const blocks = scanBlocks(buf);
    const inline = blocks.filter((b) => !b.external);
    const external = blocks.filter((b) => b.external);
    inlineFiles.push(rel);
    for (const b of external)
      console.log(`derive: ${rel}: external ${b.kind} (not captured/derived): ${b.tag.slice(0, 90)}`);
    // external <link> references (fonts CSS etc.) — recorded, never captured
    for (const m of buf.toString("utf8").matchAll(/<link\b[^>]*>/gi)) {
      const tagTxt = m[0];
      const href = /\bhref\s*=\s*["']([^"']+)["']/.exec(tagTxt)?.[1] ?? "";
      const relAttr = /\brel\s*=\s*["']?([^"'\s>]+)/.exec(tagTxt)?.[1] ?? "";
      if (!href || !/^https?:/i.test(href)) continue;
      const rec = EXTERNAL.find((e) => e.url === href);
      notRendered.push({
        capture: rel,
        kind: relAttr === "stylesheet" ? "external-stylesheet" : "external-preconnect",
        url: href,
        rendered: false,
        reason: rec
          ? rec.reason
          : `external ${relAttr || "link"} reference — left external by design (CDN rule), not captured`,
      });
      console.log(`derive: ${rel}: external link rel=${relAttr || "?"} (not captured): ${href.slice(0, 110)}`);
    }
    const entryRec = {
      source: rel,
      sourceBytes: buf.length,
      sourceSha256: manifest.files[rel].sha256,
      scripts: inline.filter((b) => b.kind === "script").length,
      styles: inline.filter((b) => b.kind === "style").length,
      dataBlocks: 0,
      blocks: [],
    };
    if (!inline.length) {
      console.log(`derive: ${rel}: no inline <script>/<style> content blocks — no inline twins`);
    } else {
      const entryTag = rel.replace(/\.html$/i, "");
      const flatTag = entryTag.startsWith(ROOT) ? entryTag.slice(ROOT.length) : entryTag;
      const tagBase = flatTag.split("/").join("__");
      for (const b of inline) {
        const isImportmap = b.kind === "importmap";
        const DATA_TYPES = new Set(["application/ld+json", "application/json", "importmap", "speculationrules"]);
        const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(b.tag)?.[1] ?? "").toLowerCase();
        if (b.kind === "script" && DATA_TYPES.has(type)) {
          entryRec.dataBlocks++;
          notRendered.push({
            capture: rel,
            kind: "inline-data",
            type,
            byteStart: b.contentStart,
            byteEnd: b.contentEnd,
            bytes: b.bytes,
            sha256: b.sha256,
            rendered: false,
            reason: `typed data block (<script type="${type}">) — data, not JS/CSS; recorded with range + sha256, no pretty pass`,
          });
          continue;
        }
        const tag = `${tagBase}-inline-${b.block}`;
        const twinExt = isImportmap ? "json" : b.kind === "style" ? "css" : "js";
        const parser = isImportmap ? "json" : b.kind === "style" ? "css" : "babel";
        const prettyFile = `${tag}.pretty.${twinExt}`;
        const pretty = await formatOnce(prettier, b.text, parser);
        if (pretty === b.text)
          throw new Error(`readable/${prettyFile} would be byte-identical to its capture source`);
        fs.writeFileSync(path.join(readableDir, prettyFile), pretty);
        written.readable.add(prettyFile);
        const lines = linesOf(pretty);
        const prettyBuf = Buffer.from(pretty, "utf8");
        const sourceFile = `readable/${prettyFile}`;
        entryRec.blocks.push({
          kind: b.kind === "style" ? "style" : "code",
          tagOpen: b.tag.split(">")[0] + ">",
          byteStart: b.contentStart,
          byteEnd: b.contentEnd,
          bytes: b.bytes,
          sha256: b.sha256,
          file: sourceFile,
          parsedAs: parser,
          prettyPasses: 1,
          prettyLines: lines.length,
          prettyBytes: prettyBuf.length,
          prettySha256: sha256(prettyBuf),
          note: `${lines.length} lines prettified from ${b.bytes} B of inline ${b.kind} #${b.block} (capture bytes ${b.contentStart}-${b.contentEnd} of ${rel})`,
        });

        if (b.kind === "style") {
          // stylesheet rule: wholeFile, never sliced
          wholeTotal++;
          sections.push({
            file: `${tag}.${twinExt}`,
            wholeFile: true,
            title: `${tag} — inline <style> block (whole-file, never sliced)`,
            desc: `Lines 1-${lines.length} of ${sourceFile}. Whole-file (stylesheet rule): the entry document's inline <style> #${b.block} (${b.bytes} B at bytes ${b.contentStart}-${b.contentEnd} of ${rel}) is indexed whole in readable/, never sliced.`,
            note: "whole-file (stylesheet, not sliced): CSS is indexed whole in readable/",
            startLine: 1,
            endLine: lines.length,
            sourceFile,
          });
          sources.push({
            sourceFile,
            capture: rel,
            captureKind: `inline-${b.kind}`,
            captureByteStart: b.contentStart,
            captureByteEnd: b.contentEnd,
            captureSha256: b.sha256,
            captureBytes: b.bytes,
            prettyLines: lines.length,
            prettyBytes: prettyBuf.length,
            prettySha256: sha256(prettyBuf),
            prettyPasses: 1,
            idempotent: true,
            tag,
            slices: 0,
            derived: "readable only (stylesheet, wholeFile)",
          });
          console.log(`derive: ${rel} inline ${b.kind} #${b.block} -> ${sourceFile} (${lines.length} lines, wholeFile stylesheet)`);
          continue;
        }

        // ── inline script: statement-aligned slicing ─────────────────────
        const dbg = await prettier.__debug.parse(pretty, { parser: "babel" });
        let rootBody = (dbg.ast.program || dbg.ast).body;
        let wrapper = null;
        if (rootBody.length === 1 && rootBody[0].type === "ExpressionStatement") {
          const e = rootBody[0].expression;
          if (
            e &&
            e.type === "CallExpression" &&
            e.callee &&
            e.callee.type === "ArrowFunctionExpression" &&
            e.callee.body &&
            e.callee.body.type === "BlockStatement"
          ) {
            wrapper = "IIFE";
            rootBody = e.callee.body.body;
          }
        }
        const stmts = rootBody.map((n) => ({
          node: n,
          startLine: lineOf(pretty, n.start),
          endLine: lineOf(pretty, n.end),
          text: pretty.slice(n.start, n.end),
        }));
        if (!stmts.length) throw new Error(`${sourceFile}: no sliceable statements`);
        for (let i = 1; i < stmts.length; i++)
          if (stmts[i].startLine <= stmts[i - 1].endLine)
            throw new Error(`${sourceFile}: statements ${i - 1}/${i} share a line — cannot slice at line boundaries`);

        const isEngine = tag === `${tagBase}-inline-1`;
        const isModule = tag === `${tagBase}-inline-2`;
        if (!isEngine && !isModule) throw new Error(`${sourceFile}: unexpected inline script tag ${tag}`);
        if (wrapper) throw new Error(`${sourceFile}: unexpected wrapper ${wrapper} — the capture changed shape`);
        if (isEngine) {
          if (stmts.length < ENGINE_MIN_STMTS)
            throw new Error(`${sourceFile}: only ${stmts.length} statements — the engine did not parse as expected`);
          if (!ENGINE_FIRST_GUARD(stmts[0].text))
            throw new Error(`${sourceFile}: first statement is not the core.js constants block`);
          if (!ENGINE_LAST_GUARD(stmts[stmts.length - 1].text))
            throw new Error(`${sourceFile}: last statement is not planScenario (planner.js)`);
        }
        if (isModule) {
          if (stmts.length < MODULE_MIN_STMTS)
            throw new Error(`${sourceFile}: only ${stmts.length} statements — the module did not parse as expected`);
          if (!MODULE_FIRST_GUARD(stmts[0].text))
            throw new Error(`${sourceFile}: first statement is not the three.js import`);
          if (!MODULE_LAST_GUARD(stmts[stmts.length - 1].text))
            throw new Error(`${sourceFile}: last statement is not the boot() try/catch`);
        }

        const specials = [];
        const lastStmt = stmts[stmts.length - 1];
        if (stmts[0].startLine > 1) {
          const headText = lines.slice(0, stmts[0].startLine - 1).join("\n");
          if (isEngine && !ENGINE_HEAD_GUARD(headText))
            throw new Error(`${sourceFile}: engine head guard failed — readable changed shape`);
          if (isModule && !MODULE_HEAD_GUARD(headText))
            throw new Error(`${sourceFile}: module head guard failed — readable changed shape`);
          specials.push({
            kind: "whole",
            file: `${tag}-head.js`,
            A: 1,
            B: stmts[0].startLine - 1,
            title: isEngine
              ? `${tag}-head — engine opener ('// ---- core.js' banner, whole-file, never sliced)`
              : `${tag}-head — module header ('// ==== 00_util.js' banner, whole-file, never sliced)`,
            body: isEngine
              ? "The classic engine script's opening comment block (`// ---- core.js` and the frame/units convention note) — the head of the concatenated author modules; indexed whole-file in readable/, never sliced (its body statements are the src/ slices)."
              : "The ES module's opening comment block (`// ==== 00_util.js` and the note that engine globals come from the classic `<script id=\"engine-src\">`) — the head of the concatenated author modules; indexed whole-file in readable/, never sliced.",
          });
        }
        if (lastStmt.endLine < lines.length) {
          specials.push({
            kind: "skip",
            file: `${tag}-tail.js`,
            A: lastStmt.endLine + 1,
            B: lines.length,
            title: `${tag}-tail — trailing lines after the last statement (not sliced)`,
            desc: `Lines ${lastStmt.endLine + 1}-${lines.length}. Trailing comment/blank lines after the last top-level statement — indexed only.`,
          });
        }

        // runs of statements -> windows
        const slices = windowize(stmts);

        // blocks in line order, then re-tile so every line of the pretty is owned
        const blocksAll = [
          ...specials,
          ...slices.map((w) => ({ kind: "slice", A: w.startLine, B: w.endLine, count: w.count })),
        ].sort((a, b) => a.A - b.A);
        for (let i = 0; i < blocksAll.length; i++) {
          if (i === 0) blocksAll[i].A = 1;
          if (i + 1 < blocksAll.length) blocksAll[i].B = blocksAll[i + 1].A - 1;
          else blocksAll[i].B = lines.length;
        }

        let nn = 0;
        let perFileSkipped = 0;
        let perFileWhole = 0;
        for (const bl of blocksAll) {
          if (bl.kind === "slice") {
            nn++;
            const num = String(nn).padStart(2, "0");
            const body = lines.slice(bl.A - 1, bl.B).join("\n") + "\n";
            const ms = markers(body);
            const topWord = ms.length ? ms[0][0] : tag.toLowerCase();
            const oversized = bl.count === 1 && bl.B - bl.A + 1 > MAX_WINDOW;
            const file = `${tag}-${num}.js`;
            const sliceText =
              `// ${tag} ${num} — ${topWord}\n` +
              `// Lines ${bl.A}-${bl.B} of ${sourceFile} (statement-aligned).\n` +
              body;
            const chk = parses(sliceText);
            if (!chk.ok) throw new Error(`generated src/${file} does not parse standalone: ${chk.why}`);
            fs.writeFileSync(path.join(srcDir, file), sliceText);
            written.src.add(file);
            sections.push({
              file,
              title: `${tag} ${num} — ${topWord}`,
              desc: `${oversized ? "Oversized single declaration (kept whole). " : ""}Lines ${bl.A}-${bl.B}. Markers: ${markerText(ms)}.`,
              startLine: bl.A,
              endLine: bl.B,
              sourceFile,
            });
          } else if (bl.kind === "whole") {
            perFileWhole++;
            wholeTotal++;
            sections.push({
              file: bl.file,
              wholeFile: true,
              title: bl.title,
              desc: `Lines ${bl.A}-${bl.B} of ${sourceFile}: ${bl.body}`,
              note: "whole-file region (banner-head rule): indexed in readable/, never sliced",
              startLine: bl.A,
              endLine: bl.B,
              sourceFile,
            });
          } else {
            perFileSkipped++;
            skippedTotal++;
            sections.push({
              file: bl.file,
              skipped: true,
              title: bl.title,
              desc: bl.desc,
              startLine: bl.A,
              endLine: bl.B,
              sourceFile,
              firstLine: lines[bl.A - 1],
              lastLine: lines[bl.B - 1],
            });
          }
        }
        slicedTotal += nn;
        sources.push({
          sourceFile,
          capture: rel,
          captureKind: `inline-${b.kind}`,
          captureByteStart: b.contentStart,
          captureByteEnd: b.contentEnd,
          captureSha256: b.sha256,
          captureBytes: b.bytes,
          prettyLines: lines.length,
          prettyBytes: prettyBuf.length,
          prettySha256: sha256(prettyBuf),
          prettyPasses: 1,
          idempotent: true,
          tag,
          slicingMode: "top-level-program",
          statements: stmts.length,
          slices: nn,
          derived:
            `readable + ${nn} statement-aligned slice(s)` +
            (perFileWhole ? ` + ${perFileWhole} wholeFile region(s)` : "") +
            (perFileSkipped ? ` + ${perFileSkipped} skipped section(s)` : ""),
        });
        console.log(
          `derive: ${rel} inline ${b.kind} #${b.block} -> ${sourceFile} (${lines.length} lines, ${stmts.length} stmts, ${nn} slices, ${perFileWhole} wholeFile, ${perFileSkipped} skipped)`,
        );
      }
    }
    if (entryRec.blocks.length) inlineMap.sources.push(entryRec);
  }
  fs.writeFileSync(path.join(readableDir, "index-inline-map.json"), JSON.stringify(inlineMap, null, 2) + "\n");

  // external CDN references recorded (never captured) — head of notRendered
  for (const e of EXTERNAL) {
    if (notRendered.some((n) => n.url === e.url)) continue;
    notRendered.unshift({ capture: htmlRels[0] ?? "apps/mission-studio/index.html", kind: e.kind, url: e.url, rendered: false, reason: e.reason });
  }

  // ── 4) prune orphan derived files (capture untouched) ──────────────────
  let pruned = 0;
  for (const [dir, keep, exts] of [
    [readableDir, written.readable, /\.(pretty\.js|pretty\.css)$/],
    [srcDir, written.src, /\.js$/],
  ]) {
    for (const f of fs.readdirSync(dir)) {
      if (exts.test(f) && !keep.has(f)) {
        fs.rmSync(path.join(dir, f));
        pruned++;
        console.log(`derive: pruned orphan derived file ${path.join(path.basename(dir), f)}`);
      }
    }
  }

  // ── 5) split-spec.json (2-space indent + trailing newline) ─────────────
  const jsSources = sources.filter((s) => s.sourceFile.endsWith(".pretty.js"));
  const cssSources = sources.filter((s) => s.sourceFile.endsWith(".pretty.css"));
  const slicedSources = jsSources.filter((s) => s.slices > 0);
  const vendorSources = jsSources.filter((s) => s.captureKind === "file");
  const firstSlice = sections.find((s) => !s.wholeFile && !s.skipped);
  const spec = {
    project: "mission-studio",
    kind: "statement-aligned-slices",
    defaultFile: `src/${firstSlice.file}`,
    note:
      "MISSION STUDIO (https://sanghyunpark.pages.dev/apps/mission-studio/) is capture-class: a static Cloudflare " +
      "Pages deploy served under the /apps/mission-studio/ sub-path and captured with that exact directory tree at " +
      "the repo root (dead-world precedent). §0.4 fork-over-mirror was checked on " +
      TODAY +
      " — no public upstream repo exists (the deploy carries no repo link and the captured bundle contains no " +
      "GitHub/GitLab reference; GitHub search finds only unrelated projects), so the mirror stands. Derived " +
      "pipeline: capture → pinned prettier 3.9.6 (module API, default options, single pass verified idempotent — " +
      "never the CLI: it respects .gitignore and can silently echo its input) → readable/index-inline-N.pretty.{js,css} " +
      "for the entry document's three inline blocks (style #1; script #1 the classic engine; script #2 the ES module) " +
      "and readable/assets__<name>.pretty.js for the four captured vendor modules — every pretty provably NOT " +
      "byte-identical to its capture source. src/: statement-aligned slices of the two inline scripts at top-level " +
      "declaration boundaries (~250-350 line windows; oversized single declarations stay whole) with the exact " +
      "2-line provenance header; every slice parses standalone under `node --input-type=module --check -` and " +
      "round-trips byte-exact to its recorded readable line range. Vendor rule — wholeFile sections, never sliced: " +
      "the four captured three.js modules (three.module.min r160, GLTFLoader, BufferGeometryUtils, meshopt_decoder) " +
      "and the inline stylesheet; the two scripts' opener banners are wholeFile heads, indexed and never sliced. " +
      "Binary payloads (GLB models, JPG/WebP textures, stars.json) are hashed notRendered records — carried " +
      "byte-exact in the capture, no pretty pass. External (CDN rule, recorded in notRendered, never captured): the " +
      "Google Fonts stylesheet + preconnects; the favicon is an inline data: SVG. Identifiers in src/ are the " +
      "author's own names (the captured code is commented, human-written source — the banner comments are its real " +
      "module names) — no rename campaign needed. Capture bytes are untouched by everything above; re-cut with " +
      "`node tools/derive.mjs` after any capture refresh. `node tools/audit.js` is the gate.",
    renderOptions: {
      _default:
        "prettier 3.9.6, module API, default options, single pass (re-format verified idempotent at derive time) — never the CLI: it respects .gitignore and can silently echo its input",
      js: "parser babel, no plugins",
      css: "parser css, no plugins",
      json: "parser json, no plugins (inline importmap blocks, if any)",
    },
    source:
      `readable/: ${jsSources.length} JS pretties (${slicedSources.length} inline script block(s) sliced, ` +
      `${vendorSources.length} vendor module(s) wholeFile) + ${cssSources.length} CSS pretties (wholeFile); ` +
      `src/: ${slicedSources.reduce((n, s) => n + s.slices, 0)} statement-aligned slices across ` +
      `${slicedSources.length} inline script block(s); ${sections.filter((s) => s.skipped).length} skipped section(s); ` +
      `${sections.filter((s) => s.wholeFile).length} wholeFile section(s); capture: ${captured.length} file(s) under ` +
      `.upstream/manifest.json; inline scan: ${inlineFiles.join(", ")} ` +
      `(${inlineMap.sources.reduce((n, s) => n + s.blocks.length, 0)} inline content block(s)); derived ${TODAY}.`,
    inline: {
      scanned: inlineFiles,
      contentBlocks: inlineMap.sources.reduce((n, s) => n + s.blocks.length, 0),
      notRendered: notRendered.length,
      note:
        "the captured entry document carries 3 inline content blocks: <style> #1 (the whole app stylesheet, " +
        "wholeFile) renders to readable/index-inline-1.pretty.css; <script> #1 (classic, id=\"engine-src\", the " +
        "simulation engine — also the Worker source the app runs via a Blob) and <script> #2 (the ES module " +
        "renderer & UI) render to readable/index-inline-{1,2}.pretty.js and are sliced into src/. The Google " +
        "Fonts <link> is an external reference, not a block: recorded in notRendered.",
    },
    externalDependencies: EXTERNAL.map((e) => ({ url: e.url, kind: e.kind.replace(/^external-/, ""), vendored: false })),
    sources,
    sections,
    notRendered,
  };
  fs.writeFileSync(path.join(proj, "split-spec.json"), JSON.stringify(spec, null, 2) + "\n");

  // ── 6) self-check (tools/audit.js is the authoritative gate) ────────────
  let bad = 0;
  const bySource = new Map();
  for (const s of sections) {
    if (!bySource.has(s.sourceFile)) bySource.set(s.sourceFile, []);
    bySource.get(s.sourceFile).push(s);
  }
  for (const [sourceFile, list] of bySource) {
    const lines = readLines(path.join(proj, sourceFile));
    const sorted = [...list].sort((a, b) => a.startLine - b.startLine);
    if (sorted[0].startLine !== 1) {
      console.error(`TILING FAIL ${sourceFile}: starts at line ${sorted[0].startLine}`);
      bad++;
    }
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i].startLine !== sorted[i - 1].endLine + 1) {
        console.error(`TILING FAIL ${sourceFile}: gap/overlap at ${sorted[i].file}`);
        bad++;
      }
    if (sorted[sorted.length - 1].endLine !== lines.length) {
      console.error(`TILING FAIL ${sourceFile}: does not reach EOF (${lines.length})`);
      bad++;
    }
  }
  let parsed = 0;
  let ranged = 0;
  let roundOK = 0;
  for (const s of sections) {
    if (s.wholeFile || s.skipped) continue;
    ranged++;
    const abs = path.join(srcDir, s.file);
    const text = fs.readFileSync(abs, "utf8");
    const nl2 = text.indexOf("\n", text.indexOf("\n") + 1);
    const body = text.slice(nl2 + 1);
    const expected = readLines(path.join(proj, s.sourceFile)).slice(s.startLine - 1, s.endLine).join("\n") + "\n";
    if (body !== expected) {
      console.error(`ROUND-TRIP FAIL ${s.file}`);
      bad++;
    } else roundOK++;
    if (!parses(text).ok) {
      console.error(`PARSE FAIL src/${s.file}`);
      bad++;
    } else parsed++;
  }
  let prettyParsed = 0;
  for (const s of sources) {
    if (!s.sourceFile?.endsWith(".pretty.js")) continue;
    if (!parses(fs.readFileSync(path.join(proj, s.sourceFile), "utf8")).ok) {
      console.error(`PARSE FAIL ${s.sourceFile}`);
      bad++;
    } else prettyParsed++;
  }
  console.log(
    `derive: ${written.readable.size} readable file(s), ${written.src.size} src slices ` +
      `(${parsed}/${ranged} parse standalone, ${roundOK}/${ranged} round-trip byte-exact), ` +
      `${skippedTotal} skipped, ${wholeTotal} wholeFile, ${prettyParsed} pretty js parse clean, ` +
      `${notRendered.length} notRendered, ${pruned} orphan(s) pruned — self-check ${bad ? bad + " FAILURE(S)" : "clean"}`,
  );
  if (bad) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
