// index-inline-2 84 — view
// Lines 24263-24612 of readable/index-inline-2.pretty.js (statement-aligned).
function copyShotList() {
  const txt = shotListText();
  try {
    navigator.clipboard.writeText(txt).then(
      () => toast("Shot list copied"),
      () => openSheet(),
    );
  } catch (e) {
    openSheet();
  }
}
function openSheet() {
  const shots = SHOTS.list;
  if (!shots.length) return;
  const cols = shots.length > 4 ? 3 : 2,
    cw = 640,
    ch = 360,
    capH = 64,
    pad = 24;
  const rows = Math.ceil(shots.length / cols);
  const cv = document.createElement("canvas");
  cv.width = pad + cols * (cw + pad);
  cv.height = 70 + rows * (ch + capH + pad) + pad;
  const g = cv.getContext("2d");
  g.fillStyle = "#0a0d13";
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#ffb547";
  g.font = '700 26px "IBM Plex Sans Condensed", sans-serif';
  g.fillText(MV.md.M.name + " — storyboard", pad, 44);
  let loaded = 0;
  shots.forEach((s, i) => {
    const im = new Image();
    im.onload = () => {
      const c = i % cols,
        r = Math.floor(i / cols);
      const x = pad + c * (cw + pad),
        y = 70 + r * (ch + capH + pad);
      const k = Math.min(cw / s.w, ch / s.h);
      const w = s.w * k,
        hh = s.h * k;
      g.fillStyle = "#000";
      g.fillRect(x, y, cw, ch);
      g.drawImage(im, x + (cw - w) / 2, y + (ch - hh) / 2, w, hh);
      g.fillStyle = "#e6ecf5";
      g.font = '15px "IBM Plex Sans Condensed", sans-serif';
      wrapText(
        g,
        `${i + 1}. ${s.caption || s.phase}`,
        x,
        y + ch + 22,
        cw,
        18,
        2,
      );
      if (++loaded === shots.length) {
        $("#sheetImg").src = cv.toDataURL("image/jpeg", 0.88);
      }
    };
    im.src = s.img;
  });
  $("#sheetText").value = shotListText();
  $("#sheet").hidden = false;
}
function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const words = text.split(/\s+/);
  let line = "",
    n = 0;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lh;
      line = w;
      if (++n >= maxLines) return;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
}
function toast(msg) {
  const t = h(
    "div",
    {
      style:
        "position:absolute;left:50%;top:60px;transform:translateX(-50%);background:var(--panel-solid);border:1px solid var(--line-2);padding:6px 12px;border-radius:6px;z-index:40;font-size:13px",
    },
    msg,
  );
  $("#app").append(t);
  setTimeout(() => t.remove(), 1800);
}

// ==== 75_minimap.js
// ============================================================================
// HUD map: where the spacecraft is in the Solar System. Top-down view of the
// ecliptic (north up, vernal equinox to the right) at three scales — the inner
// Solar System, the Earth–Moon system and the Mars system — chosen
// automatically from the body whose gravity dominates, or picked by hand.
// ============================================================================
const MM = {
  view: "auto",
  drawn: 0,
  lastT: null,
  lastKey: "",
  paths: {},
  rmax: {},
  orbits: {},
  moonOrb: null,
  moonOrbT: null,
  hits: [],
  flybyPts: null,
  burnPts: {},
};
const PLANET_LIST = ["mercury", "venus", "earth", "mars", "jupiter", "saturn"];
const MM_TITLES = {
  sun: "Solar System",
  earth: "Earth–Moon",
  mars: "Mars system",
  track: "Ground track",
};
function initMinimap() {
  $$("#minimap [data-mm]").forEach((b) =>
    b.addEventListener("click", () => {
      MM.view = b.dataset.mm;
      $$("#minimap [data-mm]").forEach((x) =>
        x.classList.toggle("on", x === b),
      );
      MM.lastT = null;
    }),
  );
  $("#mmCollapse").addEventListener("click", () => {
    const c = !$("#app").classList.contains("mm-collapsed");
    $("#app").classList.toggle("mm-collapsed", c);
    lsSet("mstudio-mm-collapsed", c);
    MM.lastT = null;
    setMMH();
  });
  if (lsGet("mstudio-mm-collapsed", false))
    $("#app").classList.add("mm-collapsed");
  $("#mmc").addEventListener("click", (e) => {
    const r = $("#mmc").getBoundingClientRect();
    const x = e.clientX - r.left,
      y = e.clientY - r.top;
    let best = null,
      bd = 16;
    for (const hh of MM.hits) {
      const d = Math.hypot(hh.x - x, hh.y - y);
      if (d < bd) {
        bd = d;
        best = hh;
      }
    }
    if (best) {
      setTarget(best.id);
      if (best.id.startsWith("body:") && CAM.mode !== "orbit") setMode("orbit");
    }
  });
  const ro = () => setMMH();
  try {
    new ResizeObserver(ro).observe($("#minimap"));
  } catch (e) {
    window.addEventListener("resize", ro);
  }
  setMMH();
}
function setMMH() {
  const el = $("#minimap");
  const vis =
    el &&
    el.offsetParent !== null &&
    getComputedStyle(el).position === "absolute";
  document.documentElement.style.setProperty(
    "--mmH",
    vis ? Math.round(el.getBoundingClientRect().height + 8) + "px" : "0px",
  );
}
function resetMinimap() {
  MM.paths = {};
  MM.rmax = {};
  MM.orbits = {};
  MM.moonOrb = null;
  MM.lastT = null;
  MM.flybyPts = null;
  MM.burnPts = {};
  const leo = !!(MV.md && (MV.md.cfg.profile || "").startsWith("leo")); // the ground track for Earth-orbit flights, Mars for the others
  const bt = $('#minimap [data-mm="track"]'),
    bm = $('#minimap [data-mm="mars"]');
  if (bt) bt.hidden = !leo;
  if (bm) bm.hidden = leo;
  if ((leo && MM.view === "mars") || (!leo && MM.view === "track")) {
    MM.view = "auto";
    $$("#minimap [data-mm]").forEach((x) =>
      x.classList.toggle("on", x.dataset.mm === "auto"),
    );
  }
}
function shipTrail() {
  return MV.trails.find((tr) => tr.o.id === "ship");
}
function mmViewFor(t) {
  if (MM.view !== "auto") return MM.view;
  if ((MV.md.cfg.profile || "").startsWith("leo")) return "track"; // Earth-orbit flights: where on Earth the craft is
  const c = activeCraft(t) || craftById("ship");
  if (!c || !c.P) return "earth";
  if (mmL2() && vnorm(vsub(c.P, helio("earth", t).r)) < 3e6) return "earth";
  const b = dominantBody(c.P, t);
  return b === "sun" ? "sun" : b === "mars" ? "mars" : "earth";
}
// on a flight to L2 the Earth map is drawn in the Sun–Earth rotating frame, where the halo orbit stands still
const mmL2 = () => !!(MV.md && MV.md.cfg.profile === "l2-halo");
function mmFrame(view) {
  return view === "earth" && mmL2() ? "serot" : view;
}
function mmCoords(view, tr) {
  return view === "sun" ? tr.P : tr.frameCoords(mmFrame(view));
}
function mmRmax(view) {
  if (MM.rmax[view]) return MM.rmax[view];
  const tr = shipTrail();
  let r;
  if (view === "sun") {
    r = 1.72 * AU;
    if (tr)
      for (let i = 0; i < tr.ts.length; i++) {
        const d = Math.hypot(tr.P[3 * i], tr.P[3 * i + 1]);
        if (d > r / 1.06) r = d * 1.06;
      }
    r = Math.min(r, 10.5 * AU);
  } else {
    const cap = view === "earth" ? (mmL2() ? 2.4e6 : 1.8e6) : 9e5;
    r = view === "earth" ? 4.3e5 : 2.7e4;
    if (tr) {
      const F = mmCoords(view, tr);
      // around Mars, frame the orbits once captured (or the flyby close to periapsis), not the long approach leg
      let tFrom = -Infinity,
        dMin = Infinity;
      if (view === "mars") {
        const cap1 = MV.md.burns.find(
          (b) =>
            /MOI|capture|insertion/i.test(b.name) && b.t > MV.md.M.t0 + 86400,
        );
        if (cap1) tFrom = cap1.t;
        for (let i = 0; i < tr.ts.length; i++)
          dMin = Math.min(
            dMin,
            Math.hypot(F[3 * i], F[3 * i + 1], F[3 * i + 2]),
          );
      }
      for (let i = 0; i < tr.ts.length; i++) {
        if (tr.ts[i] < tFrom) continue;
        const d = Math.hypot(F[3 * i], F[3 * i + 1]);
        if (d < cap && d * 1.08 > r) r = d * 1.08;
      }
      if (view === "mars" && tFrom === -Infinity && isFinite(dMin))
        r = Math.max(2.7e4, dMin * 7);
    }
  }
  MM.rmax[view] = r;
  return r;
}
function mmPath(view) {
  // decimated ecliptic-plane polyline of the primary craft's whole flight, in km, with engine-on flags
  const byPhase = !!MV.layers.phasecol,
    key = view + (byPhase ? ":ph" : "");
  if (MM.paths[key]) return MM.paths[key];
  const tr = shipTrail();
  const out = { x: [], y: [], t: [], b: [], p: [], c: [] };
  if (!tr) return out;
  const F = mmCoords(view, tr),
    Rm = mmRmax(view),
    tol = Rm / 260;
  let lx = Infinity,
    ly = Infinity;
  const n = tr.ts.length;
  for (let i = 0; i < n; i++) {
    const x = F[3 * i],
      y = F[3 * i + 1];
    const br = tr.brk[i],
      pw = tr.pw[i];
    const edge =
      (i > 0 && pw !== tr.pw[i - 1]) || (i + 1 < n && pw !== tr.pw[i + 1]); // keep every ignition and cutoff point
    if (
      br ||
      edge ||
      i === 0 ||
      i === n - 1 ||
      Math.abs(x - lx) + Math.abs(y - ly) > tol
    ) {
      let col = PCOL.coast;
      if (byPhase) {
        const ph = MV.md.phaseAt(tr.ts[i]);
        if (ph && ph.color) col = ph.color;
      }
      out.x.push(x);
      out.y.push(y);
      out.t.push(tr.ts[i]);
      out.b.push(br);
      out.p.push(pw);
      out.c.push(col);
      lx = x;
      ly = y;
    }
  }
  MM.paths[key] = out;
  return out;
}
function mmBurnPts(view) {
  // the middle of each engine burn of the primary craft, in map coordinates
  if (MM.burnPts[view]) return MM.burnPts[view];
  const md = MV.md,
    out = [],
    ts = [],
    P = [];
  for (const x of md.powered) {
    if (x.obj !== "ship") continue;
    const tm = (x.t0 + x.t1) / 2;
    const s = md.ship.stateAt(tm);
    if (!s || s.surface) continue;
    const H = planetHelio(s.ref, tm).r;
    ts.push(tm);
    P.push(H[0] + s.r[0], H[1] + s.r[1], H[2] + s.r[2]);
    out.push({ t: tm, x: 0, y: 0, name: x.name });
  }
  const F = view === "sun" ? P : toFrameArr(mmFrame(view), ts, P);
  out.forEach((o, i) => {
    o.x = F[3 * i];
    o.y = F[3 * i + 1];
  });
  MM.burnPts[view] = out;
  return out;
}
function planetOrbitPts(name, t) {
  const o = MM.orbits[name];
  if (o && Math.abs(o.t - t) < 400 * DAY) return o.pts;
  const el = planetElemsAt(name === "earth" ? "emb" : name, t);
  const pts = [];
  for (let i = 0; i <= 180; i++) {
    const s = stateFromElemsM(
      el.a,
      el.e,
      el.i,
      el.Om,
      el.w,
      (i / 180) * TAU,
      BODIES.sun.mu,
    );
    pts.push(s.r[0], s.r[1]);
  }
  MM.orbits[name] = { t, pts };
  return pts;
}
