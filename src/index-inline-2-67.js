// index-inline-2 67 — add
// Lines 18990-19320 of readable/index-inline-2.pretty.js (statement-aligned).
function buildInfoPanel() {
  const md = MV.md,
    M = md.M,
    scn = md.scn,
    L = md.L,
    SC = md.SC,
    pane = $("#tab-info");
  pane.innerHTML = "";
  pane.append(
    h(
      "h3",
      { class: "h" },
      scn ? `${scn.agency} · ${scn.year} · ${scn.status}` : "Custom mission",
    ),
  );
  if (scn) pane.append(h("p", { class: "p" }, scn.blurb));
  if (scn && scn.crewNames)
    pane.append(h("p", { class: "p" }, h("b", null, "Crew: "), scn.crewNames));
  if (M.warnings.length)
    for (const w of M.warnings)
      pane.append(h("p", { class: "warn" }, "⚠ " + w));
  pane.append(h("h3", { class: "h" }, "Vehicle"));
  pane.append(
    h(
      "div",
      { class: "kv kv2" },
      h("div", { class: "k" }, "Launch vehicle"),
      h("div", { class: "v" }, L.name),
      h("div", { class: "k" }, "Height · diameter"),
      h("div", { class: "v" }, `${L.height} m · ${L.diameter} m`),
      h("div", { class: "k" }, "Spacecraft"),
      h("div", { class: "v" }, SC.name),
      h("div", { class: "k" }, "Spacecraft mass"),
      h("div", { class: "v" }, fMass(scTotalMass(SC))),
      h("div", { class: "k" }, "Crew"),
      h("div", { class: "v" }, String(md.cfg.crew || 0)),
    ),
  );
  const mt = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Module"),
        h("th", null, "Dry"),
        h("th", null, "Propellant"),
      ),
    ),
    h(
      "tbody",
      null,
      ...Object.values(SC.modules).map((m) =>
        h(
          "tr",
          null,
          h(
            "td",
            null,
            m.name,
            m.engine
              ? h(
                  "div",
                  { class: "note-s" },
                  `${m.engine.name} · ${fForce(m.engine.thrust)} · Isp ${m.engine.isp} s · ${(PROP[m.engine.prop] || {}).label}`,
                )
              : null,
          ),
          h("td", { class: "n" }, fMass(m.dry)),
          h("td", { class: "n" }, m.prop ? fMass(m.prop) : "—"),
        ),
      ),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, mt));
  // simulated vs real
  pane.append(h("h3", { class: "h" }, "Simulated results"));
  const rows = [];
  const add = (k, v) =>
    rows.push(h("div", { class: "k" }, k), h("div", { class: "v" }, v));
  add("Liftoff", fmtUTC(M.t0) + " UTC");
  const a = M.summary.ascent;
  if (a) {
    add(
      L.sideMount ? "Main engine cutoff" : "Orbit insertion",
      `${fMET(a.tIns)} · ${fx(a.hp, 0)} × ${fx(a.ha, 0)} km`,
    );
    add(
      "Ascent max g · max q",
      `${a.maxG.toFixed(2)} g · ${fx(a.maxQ / 1000, 1)} kPa`,
    );
    add("Launch azimuth", a.az.toFixed(1) + "°");
  }
  if (M.summary.design)
    add(
      "Departure C3 · v∞",
      `${M.summary.design.C3.toFixed(2)} km²/s² · ${M.summary.design.vinfDep.toFixed(2)} km/s`,
    );
  for (const e of md.events)
    if (
      ["touchdown", "landing"].includes(e.kind) &&
      /touchdown|splashdown|landing/i.test(e.name)
    )
      add(e.name, fmtUTC(e.t) + " UTC (" + fMET(e.t - M.t0) + ")");
  for (const e of md.events)
    if (e.kind === "flyby") add(e.name, fmtUTC(e.t) + " UTC");
  if (M.summary.landing && M.summary.landing.runway)
    add("Runway", M.summary.landing.runway);
  else if (M.summary.landing)
    add(
      "Landing accuracy",
      `${fx(M.summary.landing.miss * 1000, 0)} m from target`,
    );
  const ents =
    M.summary.entries ||
    (M.summary.entry ? [{ body: "earth", ...M.summary.entry }] : []);
  for (const en of ents)
    add(
      `Entry at ${BODIES[en.body || "earth"].name}`,
      `${en.vEI.toFixed(2)} km/s · peak ${en.maxG.toFixed(1)} g · ${fx(en.maxHeat, 0)} W/cm² · ` +
        (en.reversals != null
          ? `${en.reversals} roll reversals`
          : `${fx(en.miss, 0)} km from target`),
    );
  if (md.stats.maxDistEarth && (md.cfg.profile || "").startsWith("leo"))
    add(
      "Highest point",
      `${fDist(md.stats.maxDistEarth - BODIES.earth.R)} above the equator's radius`,
    );
  else if (md.stats.maxDistEarth)
    add(
      "Farthest from Earth",
      `${fDist(md.stats.maxDistEarth)} (${fmtUTC(md.stats.tMaxDist, false)})`,
    );
  for (const f of md.stats.flybys || [])
    add(
      `Gravity assist (${BODIES[f.body].name})`,
      `solar orbit ${f.before} → ${f.after}`,
    );
  add("Mission duration", fTime(M.tEnd - M.t0));
  pane.append(h("div", { class: "kv kv2" }, ...rows));
  if (scn && scn.real) {
    pane.append(
      h(
        "h3",
        { class: "h" },
        scn.status === "Flown" || scn.status === "In flight"
          ? "Real mission record"
          : "Reference",
      ),
    );
    pane.append(
      h(
        "div",
        { class: "kv kv2" },
        ...Object.entries(scn.real).flatMap(([k, v]) => [
          h("div", { class: "k" }, k),
          h("div", { class: "v", style: "color:var(--fg-2)" }, v),
        ]),
      ),
    );
  }
  if (M.notes.length) {
    pane.append(h("h3", { class: "h" }, "Flight-dynamics notes"));
    for (const n of M.notes) pane.append(h("p", { class: "note-s" }, n));
  }
}
// ---------------- timeline ----------------
const TL = { map: null };
function buildTimelineMap() {
  const md = MV.md;
  const t0 = md.tStart,
    t1 = md.tEnd;
  const pts = new Set([t0, t1, md.M.t0]);
  for (const p of md.phases) {
    if (p.t0 > t0 && p.t0 < t1) pts.add(p.t0);
    if (p.t1 > t0 && p.t1 < t1) pts.add(p.t1);
  }
  const arr = [...pts]
    .sort((a, b) => a - b)
    .filter((v, i, A) => i === 0 || v - A[i - 1] > 1);
  const w = [];
  for (let i = 0; i + 1 < arr.length; i++)
    w.push(Math.pow(arr[i + 1] - arr[i], 0.33));
  const W = w.reduce((a, b) => a + b, 0);
  const cum = [0];
  for (const x of w) cum.push(cum[cum.length - 1] + x / W);
  TL.map = { b: arr, cum };
}
function tlX(t) {
  const { b, cum } = TL.map;
  if (t <= b[0]) return 0;
  if (t >= b[b.length - 1]) return 1;
  let i = 0;
  while (i + 1 < b.length && b[i + 1] < t) i++;
  return cum[i] + ((cum[i + 1] - cum[i]) * (t - b[i])) / (b[i + 1] - b[i]);
}
function tlT(x) {
  const { b, cum } = TL.map;
  x = clamp(x, 0, 1);
  let i = 0;
  while (i + 1 < cum.length && cum[i + 1] < x) i++;
  if (i >= b.length - 1) return b[b.length - 1];
  return (
    b[i] +
    ((b[i + 1] - b[i]) * (x - cum[i])) / Math.max(cum[i + 1] - cum[i], 1e-12)
  );
}
function drawTimeline(t) {
  const cv = $("#tlc");
  const md = MV.md;
  if (!md || !TL.map) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = cv.clientWidth,
    Hh = cv.clientHeight;
  if (!W || !Hh) return; // timeline hidden (clean-frame mode)
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(Hh * dpr);
    TL.bg = null;
  }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 6,
    x0 = pad,
    x1 = W - pad,
    bw = x1 - x0;
  const X = (tt) => x0 + tlX(tt) * bw;
  if (!TL.bg || TL.bgW !== W) {
    g.clearRect(0, 0, W, Hh);
    g.fillStyle = "#0d1420";
    g.fillRect(x0, 16, bw, 14);
    const phases = md.phases
      .slice()
      .sort((a, b) => b.t1 - b.t0 - (a.t1 - a.t0));
    for (const p of phases) {
      const a = X(p.t0),
        b = X(p.t1);
      g.fillStyle = p.color;
      g.globalAlpha = 0.62;
      g.fillRect(a, 16, Math.max(b - a, 1.5), 14);
      g.globalAlpha = 1;
    }
    g.font = '600 10px "IBM Plex Sans Condensed", sans-serif';
    g.textBaseline = "middle";
    let lastEnd = -1e9;
    for (const p of md.phases) {
      const a = X(p.t0),
        b = X(p.t1);
      const tw = g.measureText(p.name).width;
      if (b - a > tw + 8 && a + 4 > lastEnd + 6) {
        g.fillStyle = "rgba(0,0,0,.75)";
        g.fillText(p.name, a + 4, 23.5);
        lastEnd = a + 4 + tw;
      }
    }
    for (const e of md.events) {
      const x = X(e.t);
      const big = [
        "burn",
        "launch",
        "landing",
        "touchdown",
        "flyby",
        "emergency",
        "dock",
      ].includes(e.kind);
      g.fillStyle =
        e.kind === "burn"
          ? "#ff9f43"
          : e.kind === "photo"
            ? "#b896ff"
            : e.kind === "emergency" || e.kind === "fail"
              ? "#ff6767"
              : "rgba(230,236,245,.55)";
      g.fillRect(Math.round(x), big ? 6 : 10, 1, big ? 8 : 5);
    }
    // engine strip: thin blue while coasting, orange blocks while any engine fires
    const sh = md.ship;
    if (sh) {
      const a = X(Math.max(sh.t0, md.M.t0)),
        b = X(Math.min(sh.t1, md.tEnd));
      g.fillStyle = hexA(PCOL.coast, 0.32);
      g.fillRect(a, 32.5, Math.max(b - a, 1), 3);
    }
    g.fillStyle = PCOL.burn;
    for (const x of md.powered) {
      const a = X(x.t0),
        b = X(x.t1);
      g.fillRect(Math.min(a, b - 2), 31, Math.max(b - a, 2), 6);
    }
    g.fillStyle = "rgba(135,148,168,.9)";
    g.font = '10px "IBM Plex Mono", monospace';
    g.textBaseline = "alphabetic";
    const days = (md.tEnd - md.M.t0) / DAY;
    const step =
      days > 400
        ? 100
        : days > 120
          ? 30
          : days > 30
            ? 7
            : days > 6
              ? 1
              : days > 1.5
                ? 0.5
                : 0.125;
    let last = -1e9;
    for (let d = 0; d <= days; d += step) {
      const x = X(md.M.t0 + d * DAY);
      if (x - last < 34) continue;
      g.fillRect(Math.round(x), 38, 1, 4);
      g.fillText(step >= 1 ? `${d}d` : `${fx(d * 24, 0)}h`, x + 2, 51);
      last = x;
    }
    TL.bg = g.getImageData(0, 0, cv.width, cv.height);
    TL.bgW = W;
  } else g.putImageData(TL.bg, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x = X(t);
  g.fillStyle = "#ffb547";
  g.fillRect(Math.round(x) - 1, 3, 2, 35);
  g.beginPath();
  g.moveTo(x - 5, 2);
  g.lineTo(x + 5, 2);
  g.lineTo(x, 8);
  g.fill();
}
