// index-inline-2 87 — math
// Lines 25116-25433 of readable/index-inline-2.pretty.js (statement-aligned).
function mmEarthImage() {
  if (!MM.earthImg) {
    MM.earthImg = new Image();
    MM.earthImg.src = ASSET("earth_day.jpg");
  }
  return MM.earthImg.complete && MM.earthImg.naturalWidth ? MM.earthImg : null;
}
function mmNight(t) {
  // 180 × 90 night overlay with a soft terminator, recomputed every few minutes of mission time
  if (MM.night && Math.abs(MM.night.t - t) < 240) return MM.night.cv;
  const cv = MM.night ? MM.night.cv : document.createElement("canvas");
  cv.width = 180;
  cv.height = 90;
  const g = cv.getContext("2d"),
    img = g.createImageData(180, 90);
  const sun = mvec(
    mT(bodyFixedToEcl("earth", t)),
    vunit(vscale(planetHelio("earth", t).r, -1)),
  );
  for (let j = 0; j < 90; j++) {
    const la = (89.5 - 2 * j) * DEG;
    for (let i = 0; i < 180; i++) {
      const lo = (-179 + 2 * i) * DEG;
      const c =
        Math.cos(la) * Math.cos(lo) * sun[0] +
        Math.cos(la) * Math.sin(lo) * sun[1] +
        Math.sin(la) * sun[2];
      const o = 4 * (j * 180 + i);
      img.data[o] = 4;
      img.data[o + 1] = 8;
      img.data[o + 2] = 22;
      img.data[o + 3] = Math.round(175 * clamp((0.08 - c) / 0.16, 0, 1));
    }
  }
  g.putImageData(img, 0, 0);
  MM.night = { t, cv };
  return cv;
}
function drawGroundTrack(g, W, Hh, t, now) {
  const md = MV.md,
    mw = Math.min(W, 2 * Hh),
    mh = mw / 2,
    x0 = (W - mw) / 2,
    y0 = (Hh - mh) / 2;
  const X = (lon) => x0 + ((lon + 180) / 360) * mw,
    Y = (lat) => y0 + ((90 - lat) / 180) * mh;
  MM.hits = [];
  $("#mmTitle").textContent =
    MM_TITLES.track + (MM.view === "auto" ? "" : " · fixed");
  g.fillStyle = "#05080e";
  g.fillRect(0, 0, W, Hh);
  const img = mmEarthImage();
  if (img) {
    g.globalAlpha = 0.85;
    g.drawImage(img, x0, y0, mw, mh);
    g.globalAlpha = 1;
  } else {
    g.fillStyle = "#0d2340";
    g.fillRect(x0, y0, mw, mh);
  }
  g.imageSmoothingEnabled = true;
  g.drawImage(mmNight(t), x0, y0, mw, mh);
  g.strokeStyle = "rgba(200,215,235,.12)";
  g.lineWidth = 1;
  g.beginPath();
  for (let lo = -150; lo <= 150; lo += 30) {
    g.moveTo(X(lo), y0);
    g.lineTo(X(lo), y0 + mh);
  }
  for (let la = -60; la <= 60; la += 30) {
    g.moveTo(x0, Y(la));
    g.lineTo(x0 + mw, Y(la));
  }
  g.stroke();
  g.font = '10px "IBM Plex Sans Condensed", sans-serif';
  g.textBaseline = "middle";
  const ship = craftById("ship"),
    o = ship && ship.o;
  if (!o) return;
  const ll = (obj, tt) => {
    const s = obj.stateAt(tt);
    return s && s.ref === "earth" ? subPointLL("earth", s.r, tt) : null;
  };
  // ground track: an orbit and a half behind (solid), one ahead (dashed)
  const P = 5560,
    ta = Math.max(o.t0, t - 1.5 * P),
    tb = Math.min(o.t1, t + P),
    step = 30;
  const seg = (from, to, past) => {
    g.beginPath();
    let prev = null;
    const n = Math.max(1, Math.ceil((to - from) / step));
    for (let i = 0; i <= n; i++) {
      const tt = from + ((to - from) * i) / n,
        p = ll(o, tt);
      if (!p) {
        prev = null;
        continue;
      }
      const x = X(p[1]),
        y = Y(p[0]);
      if (!prev || Math.abs(p[1] - prev[1]) > 180) g.moveTo(x, y);
      else g.lineTo(x, y);
      prev = p;
    } // break at the date line
    g.setLineDash(past ? [] : [3, 3]);
    g.strokeStyle = past ? "rgba(255,181,71,.95)" : "rgba(99,199,255,.75)";
    g.lineWidth = past ? 1.6 : 1.1;
    g.stroke();
    g.setLineDash([]);
  };
  if (t > ta) seg(ta, Math.min(t, tb), true);
  if (MV.layers.future !== false && tb > t) seg(Math.max(t, ta), tb, false);
  // sites
  const site = (lat, lon, col, lab) => {
    const x = X(lon),
      y = Y(lat);
    g.strokeStyle = col;
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(x, y, 3.2, 0, TAU);
    g.stroke();
    if (lab && mw >= 220) {
      g.fillStyle = col;
      g.fillText(lab, x + 5, y + (lat > 30 ? 7 : -7));
    }
  };
  const S = LAUNCH_SITES[md.cfg.site];
  if (S) site(S.lat, S.lon, "#ffd166", "KSC");
  const rw = md.cfg.runway && RUNWAYS[md.cfg.runway];
  if (
    rw &&
    !(S && Math.abs(rw.lat - S.lat) < 1 && Math.abs(rw.lon - S.lon) < 1)
  )
    site(rw.lat, rw.lon, "#f15bb5", rw.short.split(" ")[0]);
  // other craft (station, telescope) and the orbiter
  for (const c of MV.crafts) {
    if (c.o.id === "ship" || c.o.kind !== "craft" || !c.P || !c.s) continue;
    const p = ll(c.o, t);
    if (!p) continue;
    const x = X(p[1]),
      y = Y(p[0]);
    g.fillStyle = "#9fd3ff";
    g.beginPath();
    g.arc(x, y, 2.6, 0, TAU);
    g.fill();
    if (mw >= 220)
      g.fillText(
        c.o.id === "iss" ? "ISS" : c.o.name.split(" ")[0],
        x + 5,
        y - 7,
      );
    MM.hits.push({ x, y, id: "obj:" + c.o.id });
  }
  const p =
    ship.s && ship.s.ref === "earth"
      ? subPointLL("earth", ship.s.r, t)
      : t < o.t0 && S
        ? [S.lat, S.lon]
        : null;
  if (p) {
    const x = X(p[1]),
      y = Y(p[0]),
      burning = !!(ship.s && ship.s.T > 0);
    const pulse = burning
      ? 6 + 4 * (0.5 + 0.5 * Math.sin(now / 120))
      : 5 + 3 * (0.5 + 0.5 * Math.sin(now / 260));
    g.strokeStyle = burning ? hexA(PCOL.burn, 0.8) : "rgba(255,181,71,.6)";
    g.beginPath();
    g.arc(x, y, pulse, 0, TAU);
    g.stroke();
    g.fillStyle = burning ? PCOL.burn : "#ffb547";
    g.beginPath();
    g.moveTo(x, y - 4);
    g.lineTo(x + 4, y);
    g.lineTo(x, y + 4);
    g.lineTo(x - 4, y);
    g.closePath();
    g.fill();
    MM.hits.push({ x, y, id: "obj:ship" });
  }
  g.fillStyle = "rgba(135,148,168,.6)";
  g.textAlign = "right";
  g.fillText("night shaded", W - 6, Hh - 9);
  g.textAlign = "left";
  // in words
  const info = $("#mmInfo");
  const s = ship.s;
  if (s && p) {
    const alt = vnorm(s.r) - BODIES.earth.R;
    const txt =
      s.surface || s.pad
        ? `On the ground · ${fLat(p[0])} ${fLon(p[1])}`
        : `${fDist(Math.max(alt, 0))} up over ${fLat(p[0])} ${fLon(p[1])} · ${t < o.t0 + 600 ? "climbing to orbit" : "orbit " + (1 + Math.floor((t - md.M.t0) / P))}`;
    if (info.textContent !== txt) info.textContent = txt;
  }
}

// ==== 80_setup.js
// ============================================================================
// Setup: scenario library, mission inputs, vehicle card, porkchop plot,
// live planning (the flight is solved in the background as you edit).
// ============================================================================
const SETUP = {
  scn: null,
  cfg: null,
  orig: null,
  plan: null,
  planErr: null,
  planning: false,
  debounce: 0,
  progress: "",
};
const MOON_SITES = [
  ["Tranquility Base (Apollo 11)", 0.674, 23.473],
  ["Ocean of Storms (Apollo 12)", -3.012, -23.422],
  ["Fra Mauro (Apollo 14)", -3.645, -17.471],
  ["Hadley–Apennine (Apollo 15)", 26.132, 3.634],
  ["Descartes (Apollo 16)", -8.973, 15.5],
  ["Taurus–Littrow (Apollo 17)", 20.191, 30.772],
  ["Mons Rümker (Chang’e 5)", 43.058, -51.916],
  ["Copernicus crater rim", 9.62, -20.08],
];
const MARS_SITES = [
  ["Jezero Crater (Perseverance)", 18.4447, 77.4508, -2.57],
  ["Gale Crater (Curiosity)", -4.5895, 137.4417, -4.5],
  ["Utopia Planitia (Zhurong)", 25.066, 109.925, -4.1],
  ["Arcadia Planitia (Starship candidate)", 40.8, 150.0, -4.0],
  ["Elysium Planitia (InSight)", 4.502, 135.623, -2.6],
  ["Meridiani Planum (Opportunity)", -1.946, -5.527, -1.4],
  ["Chryse Planitia (Viking 1)", 22.27, -47.95, -3.6],
];
const RUNWAY_LIST = () => Object.entries(RUNWAYS).map(([k, r]) => [k, r.name]);
const EARTH_SITES = [
  ["Pacific, SW of Hawaii (Apollo)", 13.3, -169.15],
  ["Pacific off San Diego (Artemis)", 32.3, -117.8],
  ["Siziwang Banner, Inner Mongolia", 42.0, 111.5],
  ["Starbase, Texas", 25.99, -97.15],
  ["Utah Test and Training Range", 40.2, -113.5],
  ["Atlantic off Florida", 29.0, -79.0],
];
const isLEO = (c) => (c.profile || "").startsWith("leo");
function scnGroups() {
  return [
    ["Earth orbit", SCENARIOS.filter((s) => isLEO(s.cfg))],
    ["Moon", SCENARIOS.filter((s) => s.dest === "moon")],
    [
      "Mars",
      SCENARIOS.filter(
        (s) => s.dest === "mars" && s.cfg.profile !== "multi-flyby",
      ),
    ],
    [
      "Gravity assist",
      SCENARIOS.filter((s) => s.cfg.profile === "multi-flyby"),
    ],
    ["Sun–Earth L2", SCENARIOS.filter((s) => s.dest === "l2")],
  ];
}
function buildScenarioList() {
  const nav = $("#scnList");
  nav.innerHTML = "";
  for (const [g, list] of scnGroups()) {
    nav.append(h("div", { class: "scn-group" }, g));
    for (const s of list)
      nav.append(
        h(
          "button",
          {
            class: "scn" + (SETUP.scn === s ? " on" : ""),
            dataset: { id: s.id },
            onclick: () => selectScenario(s.id),
          },
          h(
            "div",
            { class: "st" },
            h("span", null, s.title),
            h("span", { class: "yr" }, s.year),
          ),
          h("div", { class: "tg" }, s.tag),
          h(
            "div",
            { class: "ag" },
            h(
              "span",
              { class: "pill " + (s.crewed ? "crew" : "robot") },
              s.crewed ? "Crewed" : "Robotic",
            ),
            s.agency,
          ),
        ),
      );
  }
}
function selectScenario(id) {
  const s = scenarioById(id);
  SETUP.scn = s;
  SETUP.orig = JSON.parse(JSON.stringify(s.cfg));
  SETUP.cfg = JSON.parse(JSON.stringify(s.cfg));
  SETUP.plan = null;
  SETUP.planErr = null;
  lsSet("mstudio-last", id);
  buildScenarioList();
  renderDetail();
  schedulePlan(0);
}
// ---------------- field model ----------------
const gp = (o, path) =>
  path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
function sp(o, path, v) {
  const ks = path.split(".");
  let a = o;
  for (let i = 0; i < ks.length - 1; i++) {
    if (a[ks[i]] == null) a[ks[i]] = {};
    a = a[ks[i]];
  }
  a[ks[ks.length - 1]] = v;
}
