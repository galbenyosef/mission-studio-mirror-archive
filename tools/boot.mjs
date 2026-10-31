// boot.mjs — offline boot test for the MISSION STUDIO mirror.
//
// Serves the repo root with tools/serve.mjs on a loopback port in 4700-4799,
// launches Chrome with the network pinned to loopback
// (`--host-resolver-rules=MAP * 127.0.0.1`), drives it over CDP, asserts the app
// actually rendered, and screenshots into docs/ as evidence.
//
// Everything the test needs lives inside this mirror: the static server is
// tools/serve.mjs, the browser is the Chrome already installed on the machine,
// and the CDP client is the Node global WebSocket (no dependency). The Chrome
// profile and the report are written under the gitignored `.scratch/` and
// removed by the caller.
//
// usage:
//   node tools/boot.mjs [--port 4718] [--session boot-missionstudio-refresh]
//                       [--shot docs/boot-<date>.png] [--headful]
//
// exit 0 rendered, 1 not rendered / harness failure, 2 could not launch.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, "..");
const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const PORT = Number(argOf("--port", 4718));
const SESSION = argOf("--session", "boot-missionstudio-refresh");
const SHOT = argOf("--shot", "docs/boot-2026-10-31-refresh.png");
const HEADFUL = argv.includes("--headful");
const URL = `http://127.0.0.1:${PORT}/apps/mission-studio/`;
const DEBUG_PORT = 4798;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const scratch = path.join(proj, ".scratch", SESSION);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!(PORT >= 4700 && PORT <= 4799)) throw new Error("port must be in 4700-4799");

const get = (url) =>
  new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { "user-agent": "boot-harness" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("timeout")));
  });

async function waitFor(fn, ms, label) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = e;
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${label}${last ? ": " + last.message : ""}`);
}

// --------------------------------------------------------------- CDP client
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.log = [];
    this.events = [];
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener("open", res, { once: true });
      this.ws.addEventListener("error", (e) => rej(new Error("cdp socket error")), { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { res, rej, timer } = this.pending.get(m.id);
        this.pending.delete(m.id);
        clearTimeout(timer);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      } else if (m.method) {
        this.events.push(m);
        if (this.onEvent) this.onEvent(m);
      }
    });
  }
  send(method, params = {}, timeoutMs = 30000) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rej(new Error(`cdp timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { res, rej, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}

const cleanup = { procs: [] };
function killAll() {
  for (const p of cleanup.procs) {
    try { p.kill("SIGKILL"); } catch { /* gone */ }
  }
}
process.on("exit", killAll);

// ------------------------------------------------------------------- run it
const report = {
  session: SESSION,
  date: "2026-10-31",
  entry: URL,
  network: "blocked — --host-resolver-rules=MAP * 127.0.0.1",
  port: PORT,
  chrome: HEADFUL ? "headful" : "headless=new",
  consoleErrors: [],
  pageExceptions: [],
  requestFailures: [],
  blockedCrossOrigin: [],
  responses: {},
  rendered: false,
};

let server, chrome, page, browserCdp;
let exitCode = 2;
try {
  // 1) static server
  server = spawn(process.execPath, [path.join(proj, "tools", "serve.mjs"), String(PORT)], {
    cwd: proj,
    stdio: ["ignore", "pipe", "pipe"],
  });
  cleanup.procs.push(server);
  let serveLog = "";
  server.stdout.on("data", (d) => (serveLog += d));
  server.stderr.on("data", (d) => (serveLog += d));
  const first = await waitFor(async () => {
    const r = await get(URL);
    return r.status === 200 ? r : null;
  }, 15000, `serve.mjs on ${PORT}`);
  console.log(`boot: server on ${PORT}, entry ${first.body.length} B`);

  // 2) Chrome, network pinned to loopback
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(scratch, { recursive: true });
  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${scratch}`,
    "--host-resolver-rules=MAP * 127.0.0.1",
    "--no-proxy-server",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--disable-default-apps",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-features=Translate,MediaRouter,OptimizationHints",
    "--window-size=1440,900",
    "--hide-scrollbars",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    ...(HEADFUL ? [] : ["--headless=new"]),
    URL,
  ];
  chrome = spawn(CHROME, args, { stdio: "ignore" });
  cleanup.procs.push(chrome);
  const version = await waitFor(async () => {
    const r = await get(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    return r.status === 200 ? JSON.parse(r.body.toString("utf8")) : null;
  }, 30000, "Chrome CDP endpoint");
  console.log(`boot: chrome ${version.Browser} (${report.chrome})`);
  browserCdp = new CDP(version.webSocketDebuggerUrl);
  await browserCdp.ready;

  const target = await waitFor(async () => {
    const r = await get(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const list = JSON.parse(r.body.toString("utf8"));
    return list.find((t) => t.type === "page" && t.url.startsWith("http://127.0.0.1")) || null;
  }, 15000, "page target");

  page = new CDP(target.webSocketDebuggerUrl);
  await page.ready;
  page.onEvent = (m) => {
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      report.consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 300));
    }
    if (m.method === "Runtime.exceptionThrown") {
      report.pageExceptions.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 300));
    }
    if (m.method === "Network.responseReceived") {
      const { status, url } = m.params.response;
      let host = "";
      try { host = new URL(url).host; } catch { /* data: */ }
      if (host && host !== `127.0.0.1:${PORT}`) {
        report.responses[`${status} ${host}`] = (report.responses[`${status} ${host}`] || 0) + 1;
      }
    }
    if (m.method === "Network.loadingFailed") {
      const url = page.urlByRequest?.get(m.params.requestId) || m.params.requestId;
      report.requestFailures.push({ error: m.params.errorText, url: String(url).slice(0, 160), blocked: m.params.blockedReason || "" });
    }
    if (m.method === "Network.requestWillBeSent") {
      page.urlByRequest ??= new Map();
      page.urlByRequest.set(m.params.requestId, m.params.request.url);
    }
  };
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  await page.send("Log.enable");

  // Reload with the domains enabled: the console and the network log then cover
  // the whole cold boot, not just what happened before the harness attached.
  await page.send("Page.reload", { ignoreCache: true });

  // 3) wait for the app to boot (the module sets window.__ms after the frame loop starts)
  await waitFor(async () => {
    const r = await page.send("Runtime.evaluate", { expression: "document.readyState === 'complete'", returnByValue: true });
    return r.result.value === true;
  }, 30000, "document readyState=complete");
  const booted = await waitFor(async () => {
    const r = await page.send("Runtime.evaluate", {
      expression: "!!(window.__ms && document.getElementById('gl') && document.querySelector('#goBtn'))",
      returnByValue: true,
    });
    return r.result.value === true;
  }, 45000, "app boot (window.__ms, #gl, #goBtn)");
  console.log(`boot: app booted (${booted})`);

  // 4) assert render before interaction
  const snap = async (label) =>
    (
      await page.send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const c = document.getElementById('gl');
          const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
          return {
            label: ${JSON.stringify(label)},
            title: document.title,
            url: location.href,
            bodyChars: document.body.innerText.length,
            bodyHead: document.body.innerText.slice(0, 160).replace(/\\s+/g, ' '),
            canvas: c ? { w: c.width, h: c.height } : null,
            webgl: !!gl,
            renderer: gl ? (gl.getParameter(gl.VERSION) || '') : '',
            setupVisible: (() => {
              const s = document.getElementById('setup');
              return !!s && getComputedStyle(s).display !== 'none';
            })(),
            labels: document.querySelectorAll('#labels *').length,
            ms: !!window.__ms,
          };
        })()`,
      })
    ).result.value;
  const before = await snap("pre-flight");
  console.log(`boot: pre-flight — body ${before.bodyChars} chars, canvas ${before.canvas?.w}x${before.canvas?.h}, webgl ${before.webgl}`);

  // 5) fly the default mission (the setup panel's primary action)
  await page.send("Runtime.evaluate", { expression: "document.getElementById('goBtn').click()", returnByValue: true });
  await sleep(4500);
  const flying = await snap("flying");
  console.log(`boot: after Fly — body ${flying.bodyChars} chars, labels ${flying.labels}, body head "${flying.bodyHead.slice(0, 90)}"`);

  // 6) screenshot
  const shot = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000);
  const shotAbs = path.join(proj, SHOT);
  fs.mkdirSync(path.dirname(shotAbs), { recursive: true });
  fs.writeFileSync(shotAbs, Buffer.from(shot.data, "base64"));
  console.log(`boot: screenshot ${SHOT} (${fs.statSync(shotAbs).size} B)`);

  // 7) verdict
  const sameOriginFailures = report.requestFailures.filter((f) => f.url.startsWith(`http://127.0.0.1:${PORT}`));
  report.rendered = before.bodyChars > 500 && !!before.canvas && before.canvas.w > 0 && before.webgl && flying.bodyChars > 0;
  report.preFlight = before;
  report.flying = flying;
  report.sameOriginFailures = sameOriginFailures.length;
  report.consoleErrorCount = report.consoleErrors.length;
  report.exceptionCount = report.pageExceptions.length;
  report.screenshot = { path: SHOT, bytes: fs.statSync(shotAbs).size };
  fs.mkdirSync(path.join(proj, ".scratch"), { recursive: true });
  fs.writeFileSync(path.join(proj, ".scratch", "boot-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    `boot: ${report.rendered ? "RENDERED" : "NOT RENDERED"} — consoleErrors ${report.consoleErrorCount}, exceptions ${report.exceptionCount}, ` +
      `failed requests ${report.requestFailures.length} (same-origin ${report.sameOriginFailures}), blocked cross-origin ${report.requestFailures.filter((f) => f.blocked).length}`,
  );
  exitCode = report.rendered ? 0 : 1;
} catch (e) {
  console.error("boot: FAILED —", e.message);
  fs.mkdirSync(path.join(proj, ".scratch"), { recursive: true });
  fs.writeFileSync(path.join(proj, ".scratch", "boot-report.json"), JSON.stringify({ ...report, error: e.message }, null, 2) + "\n");
  exitCode = 2;
} finally {
  page?.close();
  // close the browser through its own CDP connection, then make sure every
  // process this harness started is gone before the port check runs
  try {
    if (browserCdp) await browserCdp.send("Browser.close", {}, 3000);
  } catch { /* already gone */ }
  browserCdp?.close();
  await sleep(1200);
  killAll();
  cleanup.procs.length = 0;
  if (server) {
    try { server.kill("SIGKILL"); } catch { /* gone */ }
  }
  await sleep(400);
}
process.exit(exitCode);
