// ==== 00_util.js
// ============================================================================
// Mission Studio — renderer & UI (ES module). Engine globals come from the
// classic <script id="engine-src"> loaded before this module.
// ============================================================================
import * as THREE from "./assets/three.module.min.3e690ac7d1.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs)
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "style") e.style.cssText = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.assign(e.dataset, v);
      else e.setAttribute(k, v === true ? "" : v);
    }
  for (const c of kids.flat())
    if (c != null && c !== false)
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch (e) {
    return false;
  }
};

// ---------------- number formatting ----------------
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function fx(x, d = 0) {
  if (x == null || !isFinite(x)) return "—";
  if (d === 0) return nf0.format(x);
  if (d === 1) return nf1.format(x);
  if (d === 2) return nf2.format(x);
  return x.toFixed(d);
}
function fDist(km) {
  if (km == null || !isFinite(km)) return "—";
  const a = Math.abs(km);
  if (a < 1) return fx(km * 1000, 0) + " m";
  if (a < 100) return fx(km, 2) + " km";
  if (a < 1e6) return fx(km, 0) + " km";
  if (a < 0.05 * AU) return fx(km / 1e6, 3) + " M km";
  return fx(km / AU, 3) + " AU";
}
function fSpeed(kms) {
  if (!isFinite(kms)) return "—";
  const a = Math.abs(kms);
  if (a > 1e-8 && a < 0.0005) return fx(kms * 1e5, 1) + " cm/s";
  return a < 1
    ? fx(kms * 1000, 0) + " m/s"
    : fx(kms, a < 100 ? 3 : 1) + " km/s";
}
function fAcc(ms2) {
  // m/s^2, wide dynamic range
  if (!isFinite(ms2)) return "—";
  const a = Math.abs(ms2);
  if (a === 0) return "0";
  if (a >= 0.1) return fx(ms2, 2) + " m/s²";
  if (a >= 1e-3) return fx(ms2 * 1000, 2) + " mm/s²";
  if (a >= 1e-6) return fx(ms2 * 1e6, 2) + " µm/s²";
  return (ms2 * 1e6).toExponential(1) + " µm/s²";
}
function fMass(kg) {
  if (!isFinite(kg)) return "—";
  const a = Math.abs(kg);
  return a >= 10000 ? fx(kg / 1000, 1) + " t" : fx(kg, 0) + " kg";
}
function fForce(N) {
  if (!isFinite(N)) return "—";
  const a = Math.abs(N);
  return a >= 1e6
    ? fx(N / 1e6, 2) + " MN"
    : a >= 1000
      ? fx(N / 1000, 1) + " kN"
      : fx(N, 0) + " N";
}
function fTime(s) {
  // compact duration
  if (!isFinite(s)) return "—";
  const a = Math.abs(s),
    sg = s < 0 ? "−" : "";
  if (a < 60) return sg + fx(a, 1) + " s";
  if (a < 3600)
    return (
      sg +
      Math.floor(a / 60) +
      " m " +
      String(Math.floor(a % 60)).padStart(2, "0") +
      " s"
    );
  if (a < 86400 * 2)
    return (
      sg +
      Math.floor(a / 3600) +
      " h " +
      String(Math.floor((a % 3600) / 60)).padStart(2, "0") +
      " m"
    );
  return sg + fx(a / 86400, 1) + " d";
}
function fMET(dt) {
  return fmtMET(dt).replace("T-", "T−");
}
function fLat(l) {
  return Math.abs(l).toFixed(2) + "°" + (l >= 0 ? "N" : "S");
}
function fLon(l) {
  l = ((l + 540) % 360) - 180;
  return Math.abs(l).toFixed(2) + "°" + (l >= 0 ? "E" : "W");
}
function isoLocalInput(t) {
  const d = tToDate(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function inputToIso(v) {
  return v ? (v.length === 16 ? v + ":00Z" : v + "Z") : null;
}
const hexToRgb = (hx) => {
  const n = parseInt(hx.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const hexA = (hx, a) => {
  const c = hexToRgb(hx);
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
};
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const BODY_LIST = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];
const GRAV_BODIES = ["sun", "earth", "moon", "mars", "venus", "jupiter"];
// propulsion colour code used everywhere (3D paths, map, timeline, HUD): engines firing vs coasting
const PCOL = { burn: "#ff7b2e", burnCore: "#ffe2bd", coast: "#63c7ff" };
const BODY_COLORS = {
  sun: "#ffd27a",
  mercury: "#b9b2a8",
  venus: "#e8cf9a",
  earth: "#5cc8ff",
  moon: "#d6d6d6",
  mars: "#ff8a5c",
  jupiter: "#d8b48c",
  saturn: "#e3cf98",
  uranus: "#9fd6dc",
  neptune: "#6f8fff",
};
// published payload capacities (for the vehicle card)
const CAPACITY = {
  saturnV: [
    ["Low Earth orbit", "≈ 140 t"],
    ["Trans-lunar injection", "≈ 48.6 t (Apollo 17)"],
  ],
  sls1: [
    ["Low Earth orbit", "≈ 95 t"],
    ["Trans-lunar injection", "> 27 t"],
  ],
  lm5: [
    ["Low Earth orbit", "≈ 25 t"],
    ["Geostationary transfer", "≈ 14 t"],
    ["Trans-lunar injection", "≈ 8.2 t"],
    ["Trans-Mars injection", "≈ 5 t"],
  ],
  atlasV541: [["Mars 2020 (C3 14.5 km²/s²)", "4,037 kg flown"]],
  atlasAgena: [["Mariner 4 to Mars (C3 ≈ 9.8)", "261 kg flown"]],
  falconHeavy: [
    ["Low Earth orbit (expendable)", "≈ 63.8 t"],
    ["Geostationary transfer", "≈ 26.7 t"],
    ["Mars", "≈ 16.8 t"],
  ],
  starship: [
    ["Low Earth orbit (reusable)", "100 – 150 t"],
    ["Mars (after refilling)", "≈ 100 t"],
  ],
  lvm3: [
    ["Geostationary transfer", "≈ 4 t"],
    ["Chandrayaan-3 (Earth parking orbit)", "3.9 t flown"],
  ],
  shuttle: [
    ["Low Earth orbit (204 km, 28.5°)", "≈ 24.4 t in the payload bay"],
    ["Space Station orbit (51.6°)", "≈ 16 t"],
    ["Brought back to Earth", "≈ 14.4 t"],
  ],
};
const LENSES = [12, 16, 24, 35, 50, 85, 135, 200, 400, 800, 1600, 3200];

// ==== 10_planner.js
// ============================================================================
// Planner: runs the flight-dynamics engine in a Web Worker (falls back to the
// main thread), then re-attaches class prototypes to the cloned mission.
// ============================================================================
const WORKER_MAIN = `
self.onmessage = (e) => {
  const { id, cfg } = e.data;
  try {
    const M = planScenario(cfg, msg => self.postMessage({ id, type: 'progress', msg }));
    self.postMessage({ id, type: 'done', M });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: (err && err.message) || String(err), stack: err && err.stack });
  }
};`;
const SEG_PROTO = {
  samples: SampleSeg.prototype,
  conic: ConicSeg.prototype,
  burn: BurnSeg.prototype,
  surface: SurfaceSeg.prototype,
};
function rehydrate(M) {
  Object.setPrototypeOf(M, Mission.prototype);
  for (const o of M.objects) {
    Object.setPrototypeOf(o, MObject.prototype);
    for (const s of o.segs)
      Object.setPrototypeOf(s, SEG_PROTO[s.type] || Object.prototype);
  }
  return M;
}
const Planner = {
  worker: null,
  url: null,
  seq: 0,
  cur: null,
  cache: new Map(),
  useWorker: true,
  ensure() {
    if (this.worker || !this.useWorker) return;
    try {
      if (!this.url)
        this.url = URL.createObjectURL(
          new Blob(
            [
              document.getElementById("engine-src").textContent +
                "\n" +
                WORKER_MAIN,
            ],
            { type: "text/javascript" },
          ),
        );
      this.worker = new Worker(this.url);
      this.worker.onmessage = (e) => this.onMsg(e.data);
      this.worker.onerror = (e) => {
        const c = this.cur;
        this.kill();
        this.useWorker = false;
        if (c) this.runMain(c);
      };
    } catch (e) {
      this.useWorker = false;
      this.worker = null;
    }
  },
  kill() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  },
  onMsg(d) {
    const c = this.cur;
    if (!c || d.id !== c.id) return;
    if (d.type === "progress") c.onProgress && c.onProgress(d.msg);
    else if (d.type === "done") {
      this.cur = null;
      const M = rehydrate(d.M);
      this.store(c.key, M);
      c.resolve(M);
    } else if (d.type === "error") {
      this.cur = null;
      c.reject(new Error(d.message));
    }
  },
  store(key, M) {
    this.cache.set(key, M);
    while (this.cache.size > 5)
      this.cache.delete(this.cache.keys().next().value);
  },
  runMain(c) {
    setTimeout(() => {
      try {
        const M = planScenario(
          JSON.parse(c.key),
          (m) => c.onProgress && c.onProgress(m),
        );
        this.store(c.key, M);
        if (this.cur === c) this.cur = null;
        c.resolve(M);
      } catch (err) {
        if (this.cur === c) this.cur = null;
        c.reject(err);
      }
    }, 30);
  },
  plan(cfg, onProgress) {
    const key = JSON.stringify(cfg);
    if (this.cache.has(key)) {
      const M = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, M);
      return Promise.resolve(M);
    }
    if (this.cur && this.cur.key === key) {
      // same request already running: chain
      const c = this.cur;
      const prev = c.onProgress;
      c.onProgress = (m) => {
        prev && prev(m);
        onProgress && onProgress(m);
      };
      return c.promise;
    }
    if (this.cur) {
      this.cur.reject(
        Object.assign(new Error("superseded"), { superseded: true }),
      );
      this.cur = null;
      this.kill();
    }
    const id = ++this.seq;
    const c = { id, key, onProgress };
    c.promise = new Promise((res, rej) => {
      c.resolve = res;
      c.reject = rej;
    });
    this.cur = c;
    this.ensure();
    if (this.worker) this.worker.postMessage({ id, cfg: JSON.parse(key) });
    else this.runMain(c);
    return c.promise;
  },
};

// ============================================================================
// Derived mission data used by the viewer (phases, tanks, cumulative Δv …)
// ============================================================================
class MissionData {
  constructor(M, scn) {
    this.M = M;
    this.scn = scn;
    this.cfg = M.cfg;
    this.L = LAUNCHERS[M.cfg.launcher];
    this.SC = JSON.parse(JSON.stringify(SPACECRAFT[M.cfg.spacecraft]));
    if (M.cfg.scOverride)
      for (const k in M.cfg.scOverride)
        Object.assign(this.SC.modules[k], M.cfg.scOverride[k]);
    if (M.cfg.payloadMass && this.SC.modules.CARGO)
      this.SC.modules.CARGO.dry = M.cfg.payloadMass;
    this.ship = M.obj("ship");
    this.tStart = M.t0 - 90;
    this.tEnd = M.tEnd;
    this.burns = M.burns.slice().sort((a, b) => a.t - b.t);
    this.events = M.events.slice().sort((a, b) => a.t - b.t);
    for (const e of this.events) e.met = e.t - M.t0;
    this.phases = M.phases.slice().sort((a, b) => a.t0 - b.t0);
    this.buildTanks();
    this.buildDv();
    this.buildStats();
    this.buildPowered();
    buildTraverse(this);
  }
  phaseAt(t) {
    let best = null;
    for (const p of this.phases)
      if (t >= p.t0 && t <= p.t1 && (!best || p.t0 >= best.t0)) best = p;
    return best;
  }
  burnAt(t, objId) {
    for (const b of this.burns)
      if (
        (!objId || b.obj === objId) &&
        t >= b.t &&
        t <= b.t + Math.max(b.dur, 0.5)
      )
        return b;
    return null;
  }
  // Engine-on intervals for every craft, read from the trajectory itself (thrust > 0), so the launch ascent,
  // landings and every finite or impulsive burn are included; short staging pauses are merged into the burn.
  buildPowered() {
    const out = [];
    const nameFor = (ph, o, t0) => {
      const p = String(ph || "").toLowerCase();
      if (o.id === "ship" && t0 < this.M.t0 + 30)
        return "Launch — ascent to orbit";
      if (/powered descent|landing|terminal|sky crane/.test(p))
        return "Powered descent & landing";
      if (/ascent/.test(p)) return "Ascent to orbit";
      return p ? p.charAt(0).toUpperCase() + p.slice(1) : "Engine burn";
    };
    for (const o of this.M.objects) {
      if (o.kind === "debris") continue;
      const iv = [];
      for (const sg of o.segs) {
        if (sg.type === "burn") {
          if (sg.thrust > 0)
            iv.push({ t0: sg.t0, t1: sg.t1, ph: sg.meta && sg.meta.phase });
        } else if (sg.type === "samples") {
          let s0 = -1;
          for (let i = 0; i < sg.n; i++) {
            const on = sg.T[i] > 0;
            if (on && s0 < 0) s0 = i;
            else if (!on && s0 >= 0) {
              iv.push({
                t0: sg.t[s0],
                t1: sg.t[i],
                ph:
                  (sg.extra[s0] && sg.extra[s0].phase) ||
                  (sg.meta && sg.meta.phase),
              });
              s0 = -1;
            }
          }
          if (s0 >= 0)
            iv.push({
              t0: sg.t[s0],
              t1: sg.t1,
              ph:
                (sg.extra[s0] && sg.extra[s0].phase) ||
                (sg.meta && sg.meta.phase),
            });
        }
      }
      iv.sort((a, b) => a.t0 - b.t0);
      const mg = [];
      for (const x of iv) {
        const L = mg[mg.length - 1];
        if (L && x.t0 - L.t1 <= 6) L.t1 = Math.max(L.t1, x.t1);
        else mg.push({ ...x });
      }
      const mine = this.burns.filter((b) => b.obj === o.id);
      for (const x of mg) {
        let best = null,
          bo = 0;
        for (const b of mine) {
          const ov =
            Math.min(x.t1 + 2, b.t + Math.max(b.dur, 1)) -
            Math.max(x.t0 - 2, b.t);
          if (ov > bo) {
            bo = ov;
            best = b;
          }
        }
        out.push({
          obj: o.id,
          t0: x.t0,
          t1: Math.max(x.t1, x.t0 + 1),
          burn: best,
          name: best ? best.name : nameFor(x.ph, o, x.t0),
        });
      }
      // a burn the flight plan applies as an instantaneous Δv (no thrusting segment): list it too, with the
      // direction of the velocity change where the trajectory segments meet, so the viewer can show it firing
      for (const b of mine)
        if (
          !mg.some((x) => b.t < x.t1 + 2 && b.t + Math.max(b.dur, 1) > x.t0 - 2)
        ) {
          const sA = o.segs.find((sg) => Math.abs(sg.t1 - b.t) < 0.01),
            sB = o.segs.find((sg) => sg !== sA && Math.abs(sg.t0 - b.t) < 0.01);
          let dir = null;
          if (
            sA &&
            sB &&
            sA.ref === sB.ref &&
            sA.type !== "surface" &&
            sB.type !== "surface"
          ) {
            const d = vsub(sB.stateAt(sB.t0).v, sA.stateAt(sA.t1).v);
            if (vnorm(d) > 1e-7) dir = vunit(d);
          }
          out.push({
            obj: o.id,
            t0: b.t,
            t1: b.t + Math.max(b.dur, 1),
            burn: b,
            name: b.name,
            imp: true,
            dir,
          });
        }
    }
    out.sort((a, b) => a.t0 - b.t0);
    // the launch burn starts on the pad: liquid engines light before liftoff while hold-down clamps hold the vehicle
    const IG = this.L.ign,
      lau = out.find(
        (x) => x.obj === "ship" && Math.abs(x.t0 - this.M.t0) < 30,
      );
    if (
      lau &&
      IG &&
      IG.t > 0 &&
      liftoffStages(this.L).some((s) => s.prop !== "solid")
    )
      lau.t0 = this.M.t0 - IG.t;
    this.powered = out;
    this.impList = out.filter((x) => x.imp);
  }
  impAt(t, objId) {
    for (const x of this.impList)
      if (x.obj === objId && t >= x.t0 && t < x.t1) return x;
    return null;
  }
  poweredAt(t, objId) {
    for (const x of this.powered)
      if (x.obj === objId && t >= x.t0 && t <= x.t1) return x;
    return null;
  }
  nextPowered(t, objId) {
    for (const x of this.powered) if (x.obj === objId && x.t0 > t) return x;
    return null;
  }
  buildTanks() {
    const SC = this.SC,
      L = this.L,
      M = this.M;
    const tanks = [];
    const upper = L.stages[L.stages.length - 1];
    const asc = M.summary.ascent;
    const upperStage =
      asc && asc.upper
        ? L.stages.find((s) => s.id === asc.upper) || upper
        : upper;
    const tIns =
      this.ship && this.ship.segs.length ? this.ship.segs[0].t1 : M.t0 + 600;
    if (asc)
      tanks.push({
        id: "upper",
        name: upperStage.name,
        engine: upperStage.engine,
        prop: upperStage.prop,
        cap: upperStage.propMass,
        t0: tIns,
        init: asc.upperProp,
        pts: [],
      });
    for (const k in SC.modules) {
      const md = SC.modules[k];
      if (md.prop > 0 && md.engine)
        tanks.push({
          id: k,
          name: md.name,
          engine: md.engine.name,
          prop: md.engine.prop,
          cap: md.prop,
          t0: M.t0,
          init: md.prop,
          pts: [],
        });
    }
    // consumption from burns
    for (const tk of tanks) {
      tk.pts.push([tk.t0, tk.init]);
    }
    const byEngine = (name) => tanks.find((t) => t.engine === name);
    let cur = new Map(tanks.map((t) => [t.id, t.init]));
    for (const b of this.burns) {
      let tk = byEngine(b.engine);
      if (!tk) continue;
      const v0 = cur.get(tk.id),
        v1 = Math.max(0, v0 - (b.prop || 0));
      tk.pts.push([b.t, v0], [b.t + Math.max(b.dur, 0.5), v1]);
      cur.set(tk.id, v1);
    }
    // refilling / ISRU jumps (upper tank)
    const up = tanks.find((t) => t.id === "upper");
    if (up) {
      const cfg = this.cfg;
      const evFull = this.events.find(
        (e) => e.kind === "refill" && /full/i.test(e.name),
      );
      if (cfg.refill && evFull) insertJump(up, evFull.t, cfg.refill.to);
      const isru = this.events.find((e) => e.kind === "isru");
      if (cfg.isru && isru) {
        // propellant rises linearly during the surface stay, until liftoff
        const lift = this.burns.find((b) => b.t > isru.t && b.obj === "ship");
        if (lift) {
          const v = valueAt(up, isru.t);
          insertRamp(up, isru.t, lift.t - 1, v, cfg.isru.to);
        }
      }
    }
    function valueAt(tk, t) {
      let v = tk.pts[0][1];
      for (let i = 0; i < tk.pts.length; i++) {
        const p = tk.pts[i];
        if (p[0] <= t) v = p[1];
        else {
          const q = tk.pts[i - 1];
          if (q)
            v =
              q[1] + ((p[1] - q[1]) * (t - q[0])) / Math.max(p[0] - q[0], 1e-9);
          break;
        }
      }
      return v;
    }
    function insertJump(tk, t, val) {
      const v = valueAt(tk, t);
      const before = tk.pts.filter((p) => p[0] < t),
        after = tk.pts.filter((p) => p[0] >= t);
      const dv = val - v;
      tk.pts = [
        ...before,
        [t, v],
        [t + 1, val],
        ...after.map((p) => [p[0], p[1] + dv]),
      ];
      tk.cap = Math.max(tk.cap, val);
    }
    function insertRamp(tk, ta, tb, va, vb) {
      const before = tk.pts.filter((p) => p[0] < ta),
        after = tk.pts.filter((p) => p[0] > tb);
      const dv = vb - valueAt(tk, tb);
      tk.pts = [
        ...before,
        [ta, va],
        [tb, vb],
        ...after.map((p) => [p[0], p[1] + dv]),
      ];
      tk.cap = Math.max(tk.cap, vb);
    }
    for (const tk of tanks) tk.pts.sort((a, b) => a[0] - b[0]);
    this.tanks = tanks;
    this.tankValue = (tk, t) => (t < tk.t0 ? null : valueAt(tk, t));
  }
  buildDv() {
    // ascent Δv by integrating thrust acceleration of the ascent samples (primary ship)
    const pts = [[this.M.t0, 0]];
    let acc = 0;
    const seg0 =
      this.ship &&
      this.ship.segs.find(
        (s) => s.type === "samples" && s.meta && s.meta.phase === "ascent",
      );
    if (seg0) {
      for (let i = 1; i < seg0.n; i++) {
        const dt = seg0.t[i] - seg0.t[i - 1];
        const a = seg0.m[i - 1] > 0 ? seg0.T[i - 1] / seg0.m[i - 1] : 0;
        acc += a * dt;
        if (i % 10 === 0 || i === seg0.n - 1) pts.push([seg0.t[i], acc]);
      }
    }
    this.ascentDv = acc; // m/s
    this.dvPts = pts;
  }
  dvSpent(t, objId = "ship") {
    let v = 0;
    if (objId === "ship") {
      const p = this.dvPts;
      if (t >= p[p.length - 1][0]) v = this.ascentDv;
      else
        for (let i = 1; i < p.length; i++)
          if (p[i][0] >= t) {
            const q = p[i - 1];
            v =
              q[1] +
              ((p[i][1] - q[1]) * (t - q[0])) / Math.max(p[i][0] - q[0], 1e-9);
            break;
          }
    }
    for (const b of this.burns) {
      if (b.obj !== objId) continue;
      if (t <= b.t) continue;
      const f = clamp((t - b.t) / Math.max(b.dur, 0.5), 0, 1);
      v += (b.dv || 0) * f;
    }
    return v;
  }
  buildStats() {
    const M = this.M;
    const ship = this.ship;
    const st = {};
    if (ship) {
      // max distance from Earth & from home planet
      let maxD = 0,
        tMax = 0;
      const t1 = Math.min(ship.t1, M.tEnd),
        stp = Math.max(60, (t1 - M.t0) / 4000);
      for (let t = M.t0; t <= t1; t += stp) {
        const s = ship.stateAt(t);
        if (!s) continue;
        const p = vsub(
          vadd(planetHelio(s.ref, t).r, s.r),
          planetHelio("earth", t).r,
        );
        const d = vnorm(p);
        if (d > maxD) {
          maxD = d;
          tMax = t;
        }
      }
      st.maxDistEarth = maxD;
      st.tMaxDist = tMax;
      // gravity-assist bookkeeping: heliocentric speed before/after flybys
      st.flybys = [];
      for (const e of this.events)
        if (e.kind === "flyby") {
          const body = /mars/i.test(e.name)
            ? "mars"
            : /earth/i.test(e.name)
              ? "earth"
              : /moon|lunar/i.test(e.name + e.desc)
                ? "moon"
                : null;
          if (!body || body === "moon") continue;
          const dt = 12 * DAY;
          const a = ship.stateAt(e.t - dt),
            b = ship.stateAt(e.t + dt);
          if (!a || !b) continue;
          const ha = {
              r: vadd(planetHelio(a.ref, e.t - dt).r, a.r),
              v: vadd(planetHelio(a.ref, e.t - dt).v, a.v),
            },
            hb = {
              r: vadd(planetHelio(b.ref, e.t + dt).r, b.r),
              v: vadd(planetHelio(b.ref, e.t + dt).v, b.v),
            };
          const ea = rv2coe(ha.r, ha.v, BODIES.sun.mu),
            eb = rv2coe(hb.r, hb.v, BODIES.sun.mu);
          const q = (el) =>
            el.e < 1
              ? `${(el.rp / AU).toFixed(2)} × ${(el.ra / AU).toFixed(2)} AU`
              : "escape from the Sun";
          st.flybys.push({
            t: e.t,
            body,
            name: e.name,
            before: q(ea),
            after: q(eb),
            dE: eb.energy - ea.energy,
          });
          e.gaNote = `Solar orbit before: ${q(ea)}; after: ${q(eb)} (perihelion × aphelion). Orbital energy ${eb.energy >= ea.energy ? "gained" : "lost"} ${Math.abs(eb.energy - ea.energy).toFixed(1)} km²/s² from ${BODIES[body].name}'s motion — with no propellant.`;
        }
    }
    this.stats = st;
  }
}

// ==== 15_atmos.js
// ============================================================================
// Atmospheres, physically based: Rayleigh and Mie scattering with ozone
// absorption, single scattering plus an approximation of all the higher orders.
// The sky (drawn in the background pass) and the planet surfaces (aerial
// perspective, sunlight and skylight on the ground) use the same model, so the
// haze over distant ground matches the sky behind it.
//   Transmittance table: Bruneton & Neyret 2008 (its (r, mu) mapping).
//   Multiple scattering: Hillaire 2020, "A Scalable and Production Ready Sky and
//   Atmosphere Rendering Technique" (an isotropic term per (height, Sun angle)).
//   Skylight: the sky's irradiance on level ground, integrated from the above.
// The tables are computed once on the CPU. Units: km, and the Sun's irradiance
// is 1 (ATMO_SUN_E converts to the scene's units, in which a white Lambertian
// surface facing the Sun shines at 1.05).
// ============================================================================
const AT_W = 128,
  AT_H = 32,
  AM_W = 32,
  AM_H = 16,
  AI_W = 40,
  AI_H = 6;
const ATMO_SUN_E = 1.05 * Math.PI;
const ATMOS = {
  // Earth, on the app's 6378 km sphere. Rayleigh and ozone at the wavelengths the sRGB channels effectively see in skylight
  // (610, 550, 460 nm: the usual 680/550/440 nm samples, taken as RGB, turn low-Sun skies olive); a light maritime aerosol
  // (optical depth ~0.04) in the lowest kilometres; the ozone layer peaking at 25 km. The green airglow line (557.7 nm)
  // shines at 85–105 km on the night side (far brighter here than in life, where only long exposures show it).
  earth: {
    Rg: 6378.137,
    top: 100,
    bR: [8.96e-3, 13.56e-3, 27.7e-3],
    HR: 8.0,
    bMs: [0.025, 0.025, 0.025],
    bMe: [0.028, 0.028, 0.028],
    HM: 1.4,
    g: [0.78, 0.78, 0.78],
    bO: [1.3e-3, 1.881e-3, 0.2e-3],
    ozC: 25,
    ozW: 15,
    albedo: 0.1,
    glow: [0.09e-4, 0.4e-4, 0.16e-4],
    glowH: 95,
    glowW: 3.5,
    wbFull: true,
    grade: [3.2, 1.35, 0.55],
    autoMax: 2,
  },
  // Mars: thin CO2 (Rayleigh ~2 % of Earth's) and a dust haze of optical depth ~0.35 (a clear season) mixed through the lower
  // 11 km. The dust absorbs blue and scatters it more narrowly forward: a butterscotch sky with a blue glow around the Sun.
  mars: {
    Rg: 3389.5,
    top: 80,
    bR: [0.11e-3, 0.26e-3, 0.63e-3],
    HR: 11.1,
    bMs: [0.031, 0.0236, 0.015],
    bMe: [0.0315, 0.0315, 0.0315],
    HM: 11.1,
    g: [0.6, 0.66, 0.76],
    bO: [0, 0, 0],
    ozC: 0,
    ozW: 1,
    albedo: 0.25,
    glow: [0, 0, 0],
    glowH: 0,
    glowW: 1,
    wbFull: false,
    grade: [2.6, 1.2, 1.1],
    autoMax: 1.4,
  },
};
function atmosDensity(A, h, out) {
  out[0] = Math.exp(-h / A.HR);
  out[1] = Math.exp(-h / A.HM);
  out[2] = Math.max(0, 1 - Math.abs(h - A.ozC) / A.ozW);
  return out;
}
function lut2(L, w, h, fx, fy, o) {
  // bilinear lookup in an RGBA float table; fx, fy in texels
  const x0 = Math.min(Math.floor(fx), w - 2),
    y0 = Math.min(Math.floor(fy), h - 2),
    tx = fx - x0,
    ty = fy - y0;
  for (let k = 0; k < 3; k++) {
    const i = 4 * (y0 * w + x0) + k,
      j = i + 4 * w;
    o[k] =
      (L[i] * (1 - tx) + L[i + 4] * tx) * (1 - ty) +
      (L[j] * (1 - tx) + L[j + 4] * tx) * ty;
  }
  return o;
}
// transmittance from radius r along mu (cosine from the zenith) to the top of the air, from the CPU copy of the table
function atmosT(A, r, mu, o = [0, 0, 0]) {
  const Rt = A.Rg + A.top,
    H = A.H,
    rho = Math.sqrt(Math.max(r * r - A.Rg * A.Rg, 0));
  const d = Math.max(
      -r * mu + Math.sqrt(Math.max(r * r * (mu * mu - 1) + Rt * Rt, 0)),
      0,
    ),
    dmin = Rt - r,
    dmax = rho + H;
  return lut2(
    A.lutT,
    AT_W,
    AT_H,
    clamp((d - dmin) / Math.max(dmax - dmin, 1e-9), 0, 1) * (AT_W - 1),
    clamp(rho / H, 0, 1) * (AT_H - 1),
    o,
  );
}
function atmosMS(A, r, mus, o = [0, 0, 0]) {
  return lut2(
    A.lutM,
    AM_W,
    AM_H,
    clamp(mus * 0.5 + 0.5, 0, 1) * (AM_W - 1),
    clamp((r - A.Rg) / A.top, 0, 1) * (AM_H - 1),
    o,
  );
}
// the sunlight reaching radius r with the Sun at mus: through the air, cut off by the planet as its disc (0.53°) sets
function atmosSunAt(A, r, mus, o = [0, 0, 0]) {
  const muh = -Math.sqrt(Math.max(1 - (A.Rg * A.Rg) / (r * r), 0)),
    vis = smoothstep((mus - muh) / 0.0094 + 0.5);
  if (vis <= 0) {
    o[0] = o[1] = o[2] = 0;
    return o;
  }
  atmosT(A, r, Math.max(mus, muh), o);
  o[0] *= vis;
  o[1] *= vis;
  o[2] *= vis;
  return o;
}
// light scattered towards the eye along cam + t·d (cam relative to the planet's centre) up to tMax (default: through the
// air), with the Sun along sun: single scattering and the multiple-scattering term, in the Sun's irradiance
function atmosInscatter(A, cam, d, sun, n, tMax = Infinity) {
  const Rt = A.Rg + A.top,
    r = vnorm(cam),
    b = vdot(cam, d),
    S = [0, 0, 0];
  const DT = b * b - (r * r - Rt * Rt);
  if (DT <= 0) return S;
  const t1 = Math.min(-b + Math.sqrt(DT), tMax);
  if (t1 <= 0) return S;
  const t0 = r > Rt ? -b - Math.sqrt(DT) : 0,
    DG = b * b - (r * r - A.Rg * A.Rg),
    tE = b < 0 && DG > 0 ? Math.min(t1, -b - Math.sqrt(DG)) : t1;
  const nu = vdot(d, sun),
    pR = (3 / (16 * Math.PI)) * (1 + nu * nu),
    Tr = [1, 1, 1],
    de = [0, 0, 0],
    Ts = [0, 0, 0],
    ms = [0, 0, 0];
  const pM = A.g.map(
    (g) =>
      ((3 / (8 * Math.PI)) * (1 - g * g) * (1 + nu * nu)) /
      ((2 + g * g) * Math.pow(1 + g * g - 2 * g * nu, 1.5)),
  );
  let tp = t0;
  const len = tE - t0,
    inside = r <= Rt;
  for (let i = 1; i <= n; i++) {
    const u = i / n,
      tn = inside ? t0 + len * u * u : t0 + len * u,
      dt = tn - tp,
      tm = 0.5 * (tn + tp);
    tp = tn;
    const px = cam[0] + d[0] * tm,
      py = cam[1] + d[1] * tm,
      pz = cam[2] + d[2] * tm,
      rr = Math.sqrt(px * px + py * py + pz * pz);
    atmosDensity(A, rr - A.Rg, de);
    const mus = (px * sun[0] + py * sun[1] + pz * sun[2]) / rr;
    atmosSunAt(A, rr, mus, Ts);
    atmosMS(A, rr, mus, ms);
    for (let k = 0; k < 3; k++) {
      const sR = A.bR[k] * de[0],
        sM = A.bMs[k] * de[1],
        ex = sR + A.bMe[k] * de[1] + A.bO[k] * de[2],
        ts = Math.exp(-ex * dt),
        I = ex * dt > 1e-6 ? (1 - ts) / ex : dt;
      S[k] += Tr[k] * ((sR * pR + sM * pM[k]) * Ts[k] + (sR + sM) * ms[k]) * I;
      Tr[k] *= ts;
    }
  }
  return S;
}
function atmosTables(A) {
  const Rt = A.Rg + A.top,
    H = Math.sqrt(Rt * Rt - A.Rg * A.Rg);
  A.H = H;
  const de = [0, 0, 0],
    Ts = [0, 0, 0];
  // transmittance: texel (i, j) ↔ the distance to the top of the air and the height (Bruneton's mapping); the samples
  // crowd towards the lowest point of each ray, where the air is densest
  const T = new Float32Array(AT_W * AT_H * 4);
  const od = (r, mu, t0, t1, n, acc) => {
    // ∫ densities over [t0, t1], samples crowded towards t0
    const len = t1 - t0;
    let tp = t0;
    for (let s = 1; s <= n; s++) {
      const u = s / n,
        tn = t0 + len * u * u,
        tm = 0.5 * (tn + tp),
        dt = tn - tp;
      tp = tn;
      atmosDensity(A, Math.sqrt(r * r + tm * tm + 2 * r * mu * tm) - A.Rg, de);
      acc[0] += de[0] * dt;
      acc[1] += de[1] * dt;
      acc[2] += de[2] * dt;
    }
  };
  for (let j = 0; j < AT_H; j++)
    for (let i = 0; i < AT_W; i++) {
      const rho = (H * j) / (AT_H - 1),
        r = Math.sqrt(rho * rho + A.Rg * A.Rg),
        dmin = Rt - r,
        dmax = rho + H,
        d = dmin + (i / (AT_W - 1)) * (dmax - dmin);
      const mu =
          d === 0 ? 1 : clamp((H * H - rho * rho - d * d) / (2 * r * d), -1, 1),
        acc = [0, 0, 0],
        tc = -r * mu;
      if (tc > 0 && tc < d) {
        // the ray dips to a lowest point first: integrate both ways from it
        const accA = [0, 0, 0];
        od(r, mu, tc, 0, 24, accA);
        od(r, mu, tc, d, 40, acc);
        acc[0] -= accA[0];
        acc[1] -= accA[1];
        acc[2] -= accA[2]; // (the first integral ran backwards: negative dt)
      } else od(r, mu, 0, d, 48, acc);
      for (let k = 0; k < 3; k++)
        T[4 * (j * AT_W + i) + k] = Math.exp(
          -(A.bR[k] * acc[0] + A.bMe[k] * acc[1] + A.bO[k] * acc[2]),
        );
      T[4 * (j * AT_W + i) + 3] = 1;
    }
  A.lutT = T;
  // multiple scattering (Hillaire 2020): at each (Sun angle, height), the once-scattered light arriving from all directions
  // (24 of them) and the fraction f of light scattered again; all the orders together are L2 / (1 − f)
  const M = new Float32Array(AM_W * AM_H * 4),
    dirs = [];
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 6; b++) {
      const ct = 1 - (2 * (a + 0.5)) / 4,
        st = Math.sqrt(1 - ct * ct),
        ph = (TAU * (b + 0.5 + 0.5 * (a & 1))) / 6;
      dirs.push([st * Math.cos(ph), st * Math.sin(ph), ct]);
    }
  for (let j = 0; j < AM_H; j++)
    for (let i = 0; i < AM_W; i++) {
      const mus = -1 + (2 * i) / (AM_W - 1),
        r = A.Rg + Math.max((A.top * j) / (AM_H - 1), 0.01),
        sun = [Math.sqrt(1 - mus * mus), 0, mus];
      const L2 = [0, 0, 0],
        F = [0, 0, 0];
      for (const w of dirs) {
        const b = r * w[2],
          tT = -b + Math.sqrt(Math.max(b * b - (r * r - Rt * Rt), 0)),
          DG = b * b - (r * r - A.Rg * A.Rg),
          hitG = w[2] < 0 && DG > 0;
        const tE = hitG ? -b - Math.sqrt(DG) : tT,
          n = 14,
          Tr = [1, 1, 1],
          Ls = [0, 0, 0],
          Fs = [0, 0, 0];
        let tp = 0;
        for (let s = 1; s <= n; s++) {
          const u = s / n,
            tn = tE * u * u,
            t = 0.5 * (tn + tp),
            dt = tn - tp;
          tp = tn;
          const px = w[0] * t,
            py = w[1] * t,
            pz = r + w[2] * t,
            rr = Math.sqrt(px * px + py * py + pz * pz);
          atmosDensity(A, rr - A.Rg, de);
          atmosSunAt(A, rr, (px * sun[0] + py * sun[1] + pz * sun[2]) / rr, Ts);
          for (let k = 0; k < 3; k++) {
            const ss = A.bR[k] * de[0] + A.bMs[k] * de[1],
              ex = A.bR[k] * de[0] + A.bMe[k] * de[1] + A.bO[k] * de[2],
              ts = Math.exp(-ex * dt),
              I = ex * dt > 1e-6 ? (1 - ts) / ex : dt;
            Ls[k] += ((Tr[k] * ss * Ts[k]) / (4 * Math.PI)) * I;
            Fs[k] += Tr[k] * ss * I;
            Tr[k] *= ts;
          }
        }
        if (hitG) {
          // sunlight reflected by the ground
          const gx = w[0] * tE,
            gy = w[1] * tE,
            gz = r + w[2] * tE,
            mg =
              (gx * sun[0] + gy * sun[1] + gz * sun[2]) /
              Math.sqrt(gx * gx + gy * gy + gz * gz);
          if (mg > 0) {
            atmosSunAt(A, A.Rg, mg, Ts);
            for (let k = 0; k < 3; k++)
              Ls[k] += (Tr[k] * Ts[k] * mg * A.albedo) / Math.PI;
          }
        }
        for (let k = 0; k < 3; k++) {
          L2[k] += Ls[k] / dirs.length;
          F[k] += Fs[k] / dirs.length;
        }
      }
      for (let k = 0; k < 3; k++)
        M[4 * (j * AM_W + i) + k] = L2[k] / (1 - F[k]);
      M[4 * (j * AM_W + i) + 3] = 1;
    }
  A.lutM = M;
  // skylight: the sky's irradiance on level ground (or cloud tops) at each (Sun angle, height), over π — the light a white
  // Lambertian surface sends back — in the scene's units
  const I = new Float32Array(AI_W * AI_H * 4),
    rings = 4,
    azs = 5;
  for (let j = 0; j < AI_H; j++)
    for (let i = 0; i < AI_W; i++) {
      const mus = aiMu(i),
        r = A.Rg + 0.002 + (20 * j) / (AI_H - 1),
        sun = [Math.sqrt(1 - mus * mus), 0, mus],
        cam = [0, 0, r],
        E = [0, 0, 0];
      for (let a = 0; a < rings; a++)
        for (let b = 0; b < azs; b++) {
          // cosine-weighted directions over the upper hemisphere, azimuths on the Sun's side mirrored
          const st = Math.sqrt((a + 0.5) / rings),
            ct = Math.sqrt(1 - st * st),
            ph = (Math.PI * (b + 0.5)) / azs;
          const L = atmosInscatter(
            A,
            cam,
            [st * Math.cos(ph), st * Math.sin(ph), ct],
            sun,
            10,
          );
          for (let k = 0; k < 3; k++) E[k] += L[k] / (rings * azs); // cosine-weighted mean radiance = E / π
        }
      for (let k = 0; k < 3; k++) I[4 * (j * AI_W + i) + k] = E[k] * ATMO_SUN_E;
      I[4 * (j * AI_W + i) + 3] = 1;
    }
  A.lutI = I;
  const tex = (data, w, h) => {
    const t = new THREE.DataTexture(
      halfData(data),
      w,
      h,
      THREE.RGBAFormat,
      THREE.HalfFloatType,
    );
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  A.texT = tex(T, AT_W, AT_H);
  A.texM = tex(M, AM_W, AM_H);
  A.texI = tex(I, AI_W, AI_H);
  return A;
}
// the skylight table's Sun angles crowd around sunset, where the light changes fastest
function aiMu(i) {
  const x = (i / (AI_W - 1)) * 2 - 1;
  return Math.sign(x) * x * x;
}
function halfData(f) {
  const u = new Uint16Array(f.length);
  for (let i = 0; i < f.length; i++) u[i] = THREE.DataUtils.toHalfFloat(f[i]);
  return u;
}
// the uniforms a material needs to draw one planet's air (shared objects: the scene updates them once per frame). The
// tables are computed now, or (later = true) when the browser is next idle — until then the air is clear and dark.
function atmosUniforms(name, later) {
  const A = ATMOS[name];
  if (A.U) return A.U;
  const v3 = (a) => new THREE.Vector3(...a),
    one = (v) => {
      const t = new THREE.DataTexture(new Uint8Array([v, v, v, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    };
  A.U = {
    tTrans: { value: one(255) },
    tMS: { value: one(0) },
    tSkyI: { value: one(0) },
    aRg: { value: A.Rg },
    aRt: { value: A.Rg + A.top },
    aBR: { value: v3(A.bR) },
    aHR: { value: A.HR },
    aBMs: { value: v3(A.bMs) },
    aBMe: { value: v3(A.bMe) },
    aG: { value: v3(A.g) },
    aHM: { value: A.HM },
    aBO: { value: v3(A.bO) },
    aOz: { value: new THREE.Vector2(A.ozC, A.ozW) },
    aGlow: { value: v3(A.glow) },
    aGlowH: { value: new THREE.Vector2(A.glowH, A.glowW) },
    aSunE: { value: ATMO_SUN_E },
    aGrade: { value: new THREE.Vector3(1, 1, 0) },
    aExpo: { value: 1 },
    aWB: { value: new THREE.Vector3(1, 1, 1) },
    aCam: { value: new THREE.Vector3(0, 0, A.Rg + 1000) },
    aCamR: { value: A.Rg + 1000 },
    aCamH: { value: 1000 },
    aSun: { value: new THREE.Vector3(1, 0, 0) },
    aRgE: { value: A.Rg },
  };
  const ready = () => {
    if (!A.lutT) atmosTables(A);
    A.U.tTrans.value = A.texT;
    A.U.tMS.value = A.texM;
    A.U.tSkyI.value = A.texI;
  };
  if (later) (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(ready);
  else ready();
  return A.U;
}
// the air between the camera and the Sun: its transmittance (reddens and dims the Sun near the horizon), or null when the
// line of sight misses the air. cam: the camera relative to the planet's centre (km), sun: unit vector.
function atmosSunTransmittance(name, cam, sun) {
  const A = ATMOS[name];
  if (!A.lutT) return null;
  const Rt = A.Rg + A.top,
    r = vnorm(cam),
    mu = vdot(cam, sun) / r,
    b = r * mu;
  if (r <= Rt) return atmosSunAt(A, r, mu);
  const D = b * b - (r * r - Rt * Rt);
  if (D <= 0 || b > 0) return null; // from outside: enter the air first
  const t0 = -b - Math.sqrt(D);
  return atmosSunAt(A, Rt, (r * mu + t0) / Rt);
}
// exposure for a camera at altitude h in the air: daylight white balance (the colour of the overhead Sun's light at that
// height, divided out; on Mars only its tint, so the dust does not brighten the scene), and the sky graded as a photograph
// shows it when seen from low in the air — brighter, more saturated, its highlights rolled off, a little brighter still
// when the Sun is low (sunT: the sunlight at the camera). From space the scattered light keeps its physical strength.
function atmosExposure(name, h, sunT) {
  const A = ATMOS[name],
    T = atmosT(A, A.Rg + clamp(h, 0, A.top), 1),
    k = 1 - smoothstep(h / 40);
  let wb = T.map((x) => 1 / Math.max(x, 1e-3));
  if (!A.wbFull) {
    const l = 0.2126 * wb[0] + 0.7152 * wb[1] + 0.0722 * wb[2];
    wb = wb.map((x) => x / l);
  }
  const lum = sunT
      ? 0.2126 * sunT[0] * wb[0] +
        0.7152 * sunT[1] * wb[1] +
        0.0722 * sunT[2] * wb[2]
      : 1,
    auto = clamp(Math.sqrt(0.7 / Math.max(lum, 0.05)), 1, A.autoMax);
  const G = A.grade;
  // expo: the same automatic exposure for the ground and the craft (dim low-Sun light shown a little brighter)
  return {
    wb,
    grade: [1 + k * (G[0] * auto - 1), 1 + (G[1] - 1) * k, G[2] * k],
    expo: 1 + k * (auto - 1),
  };
}

// GLSL: the same model, for the sky and the surfaces. Needs the uniforms of atmosUniforms(); PI from <common>.
const GLSL_ATMOS = `
uniform sampler2D tTrans; uniform sampler2D tMS; uniform sampler2D tSkyI;
uniform float aRg, aRt, aHR, aHM, aSunE, aExpo;
uniform vec3 aBR, aBMs, aBMe, aG, aBO, aGlow, aWB, aGrade; uniform vec2 aOz, aGlowH;
uniform vec3 aCam; uniform float aCamR, aCamH, aRgE; uniform vec3 aSun;
vec3 aDensity(float h) { return vec3(exp(-h / aHR), exp(-h / aHM), max(0.0, 1.0 - abs(h - aOz.x) / aOz.y)); }
// transmittance from radius r along mu to the top of the air (Bruneton's mapping of the table)
vec3 aTransmittance(float r, float mu) {
  float H = sqrt(aRt * aRt - aRg * aRg), rho = sqrt(max(r * r - aRg * aRg, 0.0));
  float d = max(-r * mu + sqrt(max(r * r * (mu * mu - 1.0) + aRt * aRt, 0.0)), 0.0), dmin = aRt - r, dmax = rho + H;
  vec2 x = clamp(vec2((d - dmin) / max(dmax - dmin, 1e-6), rho / H), 0.0, 1.0);
  return texture2D(tTrans, vec2(0.5 / ${AT_W}.0, 0.5 / ${AT_H}.0) + x * vec2(1.0 - 1.0 / ${AT_W}.0, 1.0 - 1.0 / ${AT_H}.0)).rgb;
}
vec3 aMS(float r, float mus) {
  vec2 x = clamp(vec2(mus * 0.5 + 0.5, (r - aRg) / (aRt - aRg)), 0.0, 1.0);
  return texture2D(tMS, vec2(0.5 / ${AM_W}.0, 0.5 / ${AM_H}.0) + x * vec2(1.0 - 1.0 / ${AM_W}.0, 1.0 - 1.0 / ${AM_H}.0)).rgb;
}
// skylight on level ground (or cloud tops) at radius r: the light a white Lambertian surface sends back, scene units
vec3 aSkyLight(float r, float mus) {
  float x = clamp(sign(mus) * sqrt(abs(mus)) * 0.5 + 0.5, 0.0, 1.0), y = clamp((r - aRg) / 20.0, 0.0, 1.0);
  return texture2D(tSkyI, vec2(0.5 / ${AI_W}.0, 0.5 / ${AI_H}.0) + vec2(x, y) * vec2(1.0 - 1.0 / ${AI_W}.0, 1.0 - 1.0 / ${AI_H}.0)).rgb;
}
// sunlight reaching radius r with the Sun at mus: reddened by the air, cut off by the planet (the Sun's disc sets over 0.53°)
vec3 aSunlight(float r, float mus) {
  float muh = -sqrt(max(1.0 - aRg * aRg / (r * r), 0.0));
  return aTransmittance(r, max(mus, muh)) * smoothstep(muh - 0.0047, muh + 0.0047, mus);
}
// the light scattered towards the eye along p0 + t·d, t0…t1 (p0 relative to the planet's centre), and the transmittance
// over it. Steps finer towards t0 (mode 1), towards t1 (mode 2), or even (mode 0); each step is integrated exactly for a
// constant medium (Hillaire), so a few dozen are enough.
void aIntegrate(vec3 p0, vec3 d, float t0, float t1, vec3 L, int mode, int N, out vec3 inscat, out vec3 trans) {
  float nu = dot(d, L);
  float pR = 3.0 / (16.0 * PI) * (1.0 + nu * nu);
  vec3 g2 = aG * aG;
  vec3 pM = 3.0 / (8.0 * PI) * (1.0 - g2) * (1.0 + nu * nu) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * aG * nu, vec3(1.5)));
  vec3 S = vec3(0.0), T = vec3(1.0);
  float tp = t0, len = max(t1 - t0, 0.0);
  for (int i = 1; i <= 32; i++) {
    if (i > N) break;
    float u = float(i) / float(N);
    float tn = mode == 1 ? t0 + len * u * u : (mode == 2 ? t1 - len * (1.0 - u) * (1.0 - u) : t0 + len * u);
    float dt = tn - tp, tm = 0.5 * (tn + tp); tp = tn;
    vec3 p = p0 + d * tm; float r = length(p), h = max(r - aRg, 0.0);
    vec3 de = aDensity(h);
    vec3 sR = aBR * de.x, sM = aBMs * de.y, ex = sR + aBMe * de.y + aBO * de.z;
    float mus = dot(p, L) / r;
    vec3 src = (sR * pR + sM * pM) * aSunlight(r, mus) + (sR + sM) * aMS(r, mus);
    float muh = -sqrt(max(1.0 - aRg * aRg / (r * r), 0.0)), zg = (h - aGlowH.x) / aGlowH.y; // (squared by hand: pow() is undefined below 0)
    src += aGlow * exp(-zg * zg) * (1.0 - smoothstep(muh - 0.25, muh + 0.05, mus)) / aSunE; // airglow, night side
    vec3 ts = exp(-ex * dt), thin = step(ex * dt, vec3(1e-3)); // ∫ e^(−ex·s) ds over the step (its series where 1 − e^… rounds away)
    S += T * src * (thin * dt * (1.0 - 0.5 * ex * dt) + (1.0 - thin) * (1.0 - ts) / max(ex, vec3(1e-12)));
    T *= ts;
  }
  inscat = S * aSunE; trans = T;
}
// scattered light as displayed: white-balanced, then graded (gain, saturation, shoulder)
vec3 aDisplay(vec3 S) {
  vec3 x = S * aWB * aGrade.x; float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
  x = max(mix(vec3(l), x, aGrade.y), 0.0);
  return x / (1.0 + x * aGrade.z);
}`;

// ==== 20_scene.js
// ============================================================================
// Scene: renderer, camera, Sun light, stars, planets (scientific orientation),
// Earth day/night shader, atmospheres, planet & Moon orbits.
// World units = km, axes = J2000 ecliptic. Floating origin: everything is
// placed relative to R.O (heliocentric km, double precision) each frame.
// ============================================================================
const R = { O: [0, 0, 0], helio: {}, texLoaded: 0 };
const ASSET_MAP = {
  "apollo_lm.glb": "apollo_lm.0c2c313482.glb",
  "earth_aux.jpg": "earth_aux.3bf717776b.jpg",
  "earth_clouds.jpg": "earth_clouds.85c42a93e9.jpg",
  "earth_clouds_8k.jpg": "earth_clouds_8k.87f5cced5f.jpg",
  "earth_day.jpg": "earth_day.f2cc89e242.jpg",
  "earth_day_8k.jpg": "earth_day_8k.65cfe8381b.jpg",
  "earth_night.jpg": "earth_night.c6529a7b12.jpg",
  "earth_night_8k.jpg": "earth_night_8k.d858fe1094.jpg",
  "iss.glb": "iss.93dcb2db5f.glb",
  "jupiter.jpg": "jupiter.efa4857ae7.jpg",
  "mars.jpg": "mars.55a8499eae.jpg",
  "mars_4k.jpg": "mars_4k.198fa949d9.jpg",
  "mars_8k.jpg": "mars_8k.2b287e5c8f.jpg",
  "mars_aux.jpg": "mars_aux.4ffcd109cd.jpg",
  "moon.jpg": "moon.c0b04ebfd5.jpg",
  "moon_4k.jpg": "moon_4k.70d18ad28c.jpg",
  "moon_8k.jpg": "moon_8k.e62eb34b75.jpg",
  "moon_aux.jpg": "moon_aux.b162388d4f.jpg",
  "orbiter-atlantis-2011.webp": "orbiter-atlantis-2011.8dd5d974b1.webp",
  "orbiter-columbia-1981.webp": "orbiter-columbia-1981.cbdd7a19fb.webp",
  "orbiter-discovery-1990.webp": "orbiter-discovery-1990.5e9bd01f14.webp",
  "orbiter.glb": "orbiter.a04192b5d6.glb",
  "perseverance.glb": "perseverance.3fe6618a01.glb",
  "saturn.jpg": "saturn.6c309cef02.jpg",
  "saturnv.glb": "saturnv.7a0913aa0b.glb",
  "shuttle_stack.glb": "shuttle_stack.9526e4715a.glb",
  "stars.json": "stars.b686ef8f1d.json",
  "venus.jpg": "venus.d02db3e21e.jpg",
  "BufferGeometryUtils.js": "BufferGeometryUtils.1b11c30e00.js",
  "GLTFLoader.js": "GLTFLoader.8c75e4b72b.js",
  "meshopt_decoder.module.js": "meshopt_decoder.module.01f48524f4.js",
};
const ASSET = (n) => "assets/" + (ASSET_MAP[n] || n);
// Planet surfaces are drawn with very large triangles that the near plane clips right under the camera; interpolating
// three.js's log-depth varying across them is numerically poor (errors of decimetres next to a landed craft), so these
// shaders take the depth from gl_FragCoord.w = 1/w, which the rasteriser computes exactly for every pixel.
const LOGDEPTH_EXACT = `
#ifdef USE_LOGDEPTHBUF
  gl_FragDepth = log2( 1.0 + 1.0 / gl_FragCoord.w ) * logDepthBufFC * 0.5;
#endif`;
const GLSL_DETAIL = `
uniform sampler2D tDetail; uniform float uDetailAmp; uniform vec2 uDetailRep;
varying vec2 vLocal; varying float vCap; varying vec3 vObj;
uniform vec3 uCapDir[4]; uniform float uCapCos[4];
void capHoles() { if (vCap < 0.5) { for (int i = 0; i < 4; i++) { if (dot(vObj, uCapDir[i]) > uCapCos[i]) discard; } } }
float detailAt(vec2 uv, float dist) {
  float w1 = 1.0 - smoothstep(150.0, 900.0, dist), w2 = 1.0 - smoothstep(30.0, 220.0, dist), w3 = 1.0 - smoothstep(1.5, 12.0, dist), w4 = 1.0 - smoothstep(0.08, 0.7, dist);
  float d = 0.0;
  if (w1 > 0.0) d += (texture2D(tDetail, uv * uDetailRep).r - 0.5) * w1;
  if (w2 > 0.0) d += (texture2D(tDetail, uv * uDetailRep * 17.0).r - 0.5) * w2;
  if (w3 > 0.0) d += (texture2D(tDetail, vLocal / 0.075).r - 0.5) * w3;
  if (w4 > 0.0) d += (texture2D(tDetail, vLocal / 0.0045).r - 0.5) * w4 * 0.8;
  return 1.0 + d * uDetailAmp;
}`;
const GLSL_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
attribute vec2 aLocal; varying vec2 vLocal; attribute float aCap; varying float vCap; varying vec3 vObj;
void main() {
  vUv = uv; vLocal = aLocal; vCap = aCap; vObj = normalize(position); vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;
// relief from a slope map (G, B: slopes east and north as 128 + slope·K): the normal tilted over the sphere's
const GLSL_RELIEF = `
uniform sampler2D tAux; uniform vec3 uPole; uniform float uSlopeK, uRelief; uniform vec2 uReliefNear;
vec3 reliefNormal(vec3 N, vec3 aux, float dist, out vec3 E, out vec3 Nn, out float cosLat) {
  E = cross(uPole, N); cosLat = length(E); E /= max(cosLat, 1e-5); Nn = cross(N, E);
  vec2 s = (aux.gb * 255.0 - 128.0) / uSlopeK * uRelief * smoothstep(uReliefNear.x, uReliefNear.y, dist); // (gone close up, where a texel would show as a facet)
  return normalize(N - E * s.x - Nn * s.y);
}`;
// Earth: the day map lit by sunlight and skylight from the atmosphere model (reddened near the terminator), relief from
// the slope map, clouds on a layer above the ground (seen with parallax, casting shadows along the sunlight, their tops
// lit a little past the ground's sunset), the sea's glint and sky reflection, towns' lights at night, and the air between
// the camera and the ground over all of it.
const GLSL_EARTH_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tClouds; uniform vec3 uSunDir; uniform float uLights; uniform vec3 uFill;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${GLSL_DETAIL}
${GLSL_ATMOS}
${GLSL_RELIEF}
const float CLOUD_H = 6.0; // km
// a horizontal displacement on the ground (km, world axes) in texture coordinates
vec2 uvShift(vec3 dv, vec3 E, vec3 Nn, float cosLat) { return vec2(dot(dv, E) / (2.0 * PI * aRg * max(cosLat, 0.05)), dot(dv, Nn) / (PI * aRg)); }
float cloudAt(vec2 uv) { return smoothstep(0.1, 0.92, texture2D(tClouds, uv).r); }
void main() {
  ${LOGDEPTH_EXACT}
  capHoles();
  vec3 N = normalize(vN), L = normalize(uSunDir);
  vec3 seg = vP - cameraPosition; float dist = length(seg); vec3 d = seg / dist, V = -d;
  vec3 aux = texture2D(tAux, vUv).rgb; float ocean = aux.r;
  vec3 E, Nn; float cosLat;
  vec3 Nb = normalize(mix(reliefNormal(N, aux, dist, E, Nn, cosLat), N, ocean));
  float mus = dot(N, L), muv = max(dot(N, V), 0.0);
  // clouds: where the line of sight crosses their layer, and the shadow they cast along the sunlight
  float cloud = cloudAt(vUv + uvShift((V - N * muv) * CLOUD_H / max(muv, 0.06), E, Nn, cosLat));
  float shadow = cloudAt(vUv + uvShift((L - N * mus) * CLOUD_H / max(mus, 0.06), E, Nn, cosLat)) * smoothstep(-0.02, 0.08, mus);
  // light on the ground: the Sun through the air, and the sky
  vec3 sun = aSunlight(aRg, mus) * (aSunE / PI) * (1.0 - 0.8 * shadow);
  vec3 sky = aSkyLight(aRg, mus) * (1.0 - 0.3 * shadow);
  vec3 alb = texture2D(tDay, vUv).rgb * mix(detailAt(vUv, dist), 1.0, ocean);
  alb = mix(alb, max(alb, vec3(0.004, 0.012, 0.036)), ocean); // deep water's own colour (the Blue Marble paints the open sea flat and darker)
  vec3 col = alb * (sun * max(dot(Nb, L), 0.0) + sky);
  // the sea: glint off wind-ruffled water (Cox–Munk slopes, ~6 m/s wind), the sky's reflection, both rising towards
  // grazing angles (Fresnel)
  vec3 H = normalize(L + V); float nh = max(dot(N, H), 1e-3), vh = max(dot(V, H), 0.0);
  const float S2 = 0.035;
  float D = exp(-(1.0 - nh * nh) / (nh * nh * S2)) / (PI * S2 * nh * nh * nh * nh);
  float F = 0.02 + 0.98 * pow(1.0 - vh, 5.0), Fv = 0.02 + 0.98 * pow(1.0 - muv, 5.0);
  vec3 sea = col * (1.0 - Fv) + sun * PI * F * D / (4.0 * max(muv, 0.05)) + sky * Fv;
  col = mix(col, sea, ocean);
  // the cloud tops CLOUD_H up see the Sun a little longer than the ground below
  float rc = aRg + CLOUD_H, muhc = -sqrt(max(1.0 - aRg * aRg / (rc * rc), 0.0));
  float cshade = pow(clamp((mus - muhc) / (1.0 - muhc), 0.0, 1.0), 0.65);
  vec3 cloudCol = 0.8 * (aSunlight(rc, mus) * (aSunE / PI) * cshade + aSkyLight(rc, mus));
  col = mix(col, cloudCol, cloud);
  // towns at night (with a soft glow from a coarser mip), switching on through dusk, dimmed by clouds, which they light
  // from below; seen close, a texel's glow breaks up into separate lights
  float nl = texture2D(tNight, vUv).r, ng = texture2D(tNight, vUv, 3.0).r;
  nl = pow(nl, 2.2); ng = pow(ng, 2.2);
  float near = 1.0 - smoothstep(250.0, 1500.0, dist);
  nl *= mix(1.0, smoothstep(0.5, 0.72, texture2D(tDetail, vUv * uDetailRep * 0.25).r) * 4.0, near);
  float dark = (1.0 - smoothstep(-0.14, 0.02, mus)) * uLights;
  vec3 warm = mix(vec3(1.0, 0.62, 0.30), vec3(1.0, 0.86, 0.62), smoothstep(0.1, 0.8, nl)); // sodium-orange outskirts, whiter centres
  vec3 lights = (nl * 2.4 + ng * (1.1 - 0.8 * near)) * warm * dark * (1.0 - cloud * 0.8);
  lights *= smoothstep(5.0, 60.0, dist); // from close by, a town's glow is its separate lights, not a lit patch of ground
  col += lights + ng * cloud * vec3(1.0, 0.7, 0.42) * 0.6 * dark;
  col += (alb * (1.0 - ocean * 0.7) + cloud * 0.6) * vec3(0.0016, 0.0022, 0.0030) * (1.0 - smoothstep(-0.2, 0.0, mus)); // airglow and starlight on the night side
  col += alb * uFill * (1.0 - smoothstep(-0.10, 0.12, mus)); // cinematic night fill near the camera: the ground stays readable after dark
  // the air between the camera and this point
  float t0 = 0.0;
  if (aCamH > aRt - aRg) { float b = dot(aCam, d); vec3 pc = aCam - b * d; float Dt = aRt * aRt - dot(pc, pc); t0 = Dt > 0.0 ? clamp(-b - sqrt(Dt), 0.0, dist) : dist; }
  vec3 S, T; aIntegrate(aCam, d, t0, dist, L, 2, aCamH > aRt - aRg ? 12 : 16, S, T);
  col = col * T * aWB * aExpo + aDisplay(S);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
// The Moon and the other bodies: lunar-Lambert photometry (the Moon's flat-looking full disc), relief from a slope map
// where there is one, and on Mars the dusty air (sunlight and skylight through it, and the haze over the ground).
const GLSL_ROCK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D map; uniform vec3 uSunDir; uniform float uAmb; uniform float uLS; uniform vec3 uTint; uniform float uHasMap; uniform float uHasAux; uniform vec3 uFogColor; uniform float uFogK; uniform vec3 uFill;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
${GLSL_DETAIL}
${GLSL_RELIEF}
#ifdef HAS_ATMO
${GLSL_ATMOS}
#endif
void main() {
  ${LOGDEPTH_EXACT}
  capHoles();
  vec3 N = normalize(vN); vec3 L = normalize(uSunDir); vec3 V = normalize(cameraPosition - vP);
  vec3 E, Nn; float cosLat;
  float dist = length(cameraPosition - vP);
  vec3 Nb = uHasAux > 0.5 ? reliefNormal(N, texture2D(tAux, vUv).rgb, dist, E, Nn, cosLat) : N;
  float mus = dot(N, L);
  float mu0 = max(dot(Nb, L), 0.0) * smoothstep(-0.03, 0.01, mus); float mu = max(dot(Nb, V), 0.0);
  float ls = min(2.0 * mu0 / max(mu0 + mu, 1e-4), 1.35);
  float shade = mix(mu0, ls * smoothstep(0.0, 0.04, mu0), uLS);
  vec3 alb = (uHasMap > 0.5 ? texture2D(map, vUv).rgb : vec3(1.0)) * uTint;
  if (uDetailAmp > 0.0) alb *= detailAt(vUv, dist);
#ifdef HAS_ATMO
  vec3 col = alb * (shade * aSunlight(aRg, mus) + aSkyLight(aRg, mus)) + alb * uFill * (1.0 - smoothstep(0.0, 0.25, mus));
  vec3 d = (vP - cameraPosition) / dist;
  float t0 = 0.0;
  if (aCamH > aRt - aRg) { float b = dot(aCam, d); vec3 pc = aCam - b * d; float Dt = aRt * aRt - dot(pc, pc); t0 = Dt > 0.0 ? clamp(-b - sqrt(Dt), 0.0, dist) : dist; }
  vec3 S, T; aIntegrate(aCam, d, t0, dist, L, 2, 12, S, T);
  col = col * T * aWB * aExpo + aDisplay(S);
#else
  vec3 col = alb * (shade + uAmb) + alb * uFill * (1.0 - smoothstep(0.0, 0.25, mu0)); // night fill (earthshine on the Moon, cinematic elsewhere)
  col = mix(col, uFogColor, 1.0 - exp(-dist * uFogK));
#endif
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const GLSL_ATMO_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunDir; uniform vec3 uColor; uniform vec3 uSunset; uniform float uStrength; uniform float uPow;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vP); vec3 L = normalize(uSunDir);
  float rim = 1.0 - abs(dot(N, V));
  float glow = pow(rim, uPow);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.30, 0.35, ndl);
  float dusk = smoothstep(-0.30, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.30, ndl));
  vec3 c = (uColor * lit + uSunset * dusk * 0.45) * glow * uStrength;
  gl_FragColor = vec4(c, 1.0);
}`;
const GLSL_STAR_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute vec3 aColor; uniform float uScale; varying vec3 vC;
void main() { vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale;
  #include <logdepthbuf_vertex>
}`;
const GLSL_STAR_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uBright; varying vec3 vC;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 4.0);
  gl_FragColor = vec4(vC * a * uBright, 1.0);
}`;

const GLSL_SKY_V = `
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.999; }`;
const GLSL_SKY_F = `
uniform vec3 uUp; uniform vec3 uSun; uniform float uDensity; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunset; uniform vec3 uHalo;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float mu = dot(d, uUp); float sunEl = dot(uSun, uUp);
  float day = smoothstep(-0.20, 0.06, sunEl);
  float hz = pow(1.0 - max(mu, 0.0), 4.0);
  vec3 col = mix(uZenith, uHorizon, hz);
  float cs = max(dot(d, uSun), 0.0);
  col += uHalo * (pow(cs, 600.0) * 1.5 + pow(cs, 24.0) * 0.30 + pow(cs, 4.0) * 0.08);
  float dusk = (1.0 - smoothstep(-0.05, 0.30, sunEl)) * day;
  col = mix(col, uSunset, clamp(dusk * pow(1.0 - abs(mu), 5.0) * (0.35 + 0.65 * pow(cs * 0.5 + 0.5, 4.0)), 0.0, 1.0));
  col *= mix(0.25, 1.0, day);
  if (mu < 0.0) col = mix(col, uHorizon * 0.55 * day, smoothstep(0.0, -0.25, mu));
  float a = clamp(uDensity * (0.15 + 0.85 * day), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
// The sky of a planet with air, from inside it or from space (the glowing limb): the atmosphere model along each line of
// sight, drawn in the background pass. Premultiplied: the stars behind are dimmed by the air's transmittance and hidden
// where the sky is bright (as the eye or a camera exposed for a sunlit scene would). Lines of sight that end on the
// ground beyond the planet's polygon edge (a sliver at its limb) are drawn opaque, as the haze that covers them.
const GLSL_ASKY_F = `
#include <common>
${GLSL_ATMOS}
uniform float aHide;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float b = dot(aCam, d);
  // distances along the line of sight to the top of the air and to the ground; near the planet from its altitude (precise
  // when the camera is low), from the point of closest approach otherwise (precise when it is far)
  bool near = aCamH < 1000.0;
  vec3 pc = aCam - b * d; float pc2 = dot(pc, pc);
  float DT = near ? b * b - (aCamH - (aRt - aRg)) * (aCamR + aRt) : aRt * aRt - pc2;
  if (DT <= 0.0) discard;
  float sq = sqrt(DT), t1 = -b + sq;
  if (t1 <= 0.0) discard;
  bool outside = aCamH > aRt - aRg;
  float t0 = outside ? -b - sq : 0.0;
  // the ground: the planet's sphere, or lower where the camera is in a basin below it (aRgE: the ground under the camera, as
  // the terrain there has it), so that lines of sight passing over the basin's rim show sky rather than nothing
  float cG = (aCamR - aRgE) * (aCamR + aRgE), DG = near ? b * b - cG : aRgE * aRgE - pc2;
  bool ground = b < 0.0 && DG > 0.0;
  // the planet's mesh covers lines of sight that dip more than its facets' depth (0.2 km) below the surface: only the sliver
  // at the limb is left to draw here
  if (ground && pc2 < (aRgE - 0.5) * (aRgE - 0.5)) discard;
  float tE = ground ? (near ? cG / (-b + sqrt(DG)) : -b - sqrt(DG)) : t1;
  vec3 S, T; aIntegrate(aCam, d, t0, tE, aSun, outside ? (ground ? 2 : 0) : 1, 24, S, T);
  vec3 c = aDisplay(S);
  float a = ground ? 1.0 : 1.0 - dot(T, vec3(1.0 / 3.0)) * exp(-aHide * dot(c, vec3(0.2126, 0.7152, 0.0722)));
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`;
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeDetailTexture() {
  // tileable value noise + craters, used to add surface texture below the resolution of the global maps
  const N = 512,
    rnd = mulberry32(7);
  const v = new Float32Array(N * N);
  for (const [S, amp] of [
    [8, 0.3],
    [16, 0.22],
    [32, 0.16],
    [64, 0.11],
    [128, 0.07],
    [256, 0.05],
  ]) {
    const L = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) L[i] = rnd() * 2 - 1;
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx_ = (x / N) * S,
          fy = (y / N) * S;
        const x0 = Math.floor(fx_),
          y0 = Math.floor(fy);
        const tx = fx_ - x0,
          ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const a = L[(y0 % S) * S + (x0 % S)],
          b = L[(y0 % S) * S + ((x0 + 1) % S)],
          c = L[((y0 + 1) % S) * S + (x0 % S)],
          d = L[((y0 + 1) % S) * S + ((x0 + 1) % S)];
        v[y * N + x] +=
          amp *
          ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
  }
  for (let k = 0; k < 260; k++) {
    // craters with raised rims, power-law sizes
    const r = 3 + 60 * Math.pow(rnd(), 3.2),
      cx = rnd() * N,
      cy = rnd() * N,
      depth = 0.35 + rnd() * 0.25;
    const R2 = Math.ceil(r * 1.6);
    for (let dy = -R2; dy <= R2; dy++)
      for (let dx = -R2; dx <= R2; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1.6) continue;
        const prof =
          d < 1
            ? -depth * (1 - d * d) * 0.8 + 0.25 * depth * Math.pow(d, 6)
            : 0.3 * depth * Math.exp(-(d - 1) * 6);
        const xx = ((Math.round(cx + dx) % N) + N) % N,
          yy = ((Math.round(cy + dy) % N) + N) % N;
        v[yy * N + xx] += prof;
      }
  }
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const q = clamp(128 + v[i] * 150, 0, 255);
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = q;
    img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function initScene() {
  const canvas = $("#gl");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  R.renderer = renderer;
  R.scene = new THREE.Scene();
  R.camera = new THREE.PerspectiveCamera(40, 1, 1e-6, 1e13);
  R.camera.up.set(0, 0, 1);
  R.scene.add(R.camera);
  R.sunLight = new THREE.PointLight(0xffffff, 3.0, 0, 0);
  R.scene.add(R.sunLight);
  R.ambient = new THREE.AmbientLight(0x8899bb, 0.05);
  R.scene.add(R.ambient);
  R.plasmaLight = new THREE.PointLight(0xff8a48, 0, 0.1, 0);
  R.scene.add(R.plasmaLight); // an entry's glowing shock layer (updatePlasmaLight); always in the scene, so lighting it does not recompile the materials
  R.maxAniso = renderer.capabilities.getMaxAnisotropy();
  R.renderer.autoClear = false;
  R.bgScene = new THREE.Scene();
  R.bgCam = new THREE.PerspectiveCamera(40, 1, 1, 1e10);
  R.sky = new THREE.Mesh(
    new THREE.SphereGeometry(5e8, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader: GLSL_SKY_V,
      fragmentShader: GLSL_SKY_F,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uUp: { value: new THREE.Vector3(0, 0, 1) },
        uSun: { value: new THREE.Vector3(1, 0, 0) },
        uDensity: { value: 0 },
        uZenith: { value: new THREE.Color("#3a76d6") },
        uHorizon: { value: new THREE.Color("#c6dcf2") },
        uSunset: { value: new THREE.Color("#ff9a52") },
        uHalo: { value: new THREE.Color("#fff2d8") },
      },
    }),
  );
  R.sky.renderOrder = 10;
  R.sky.frustumCulled = false;
  R.bgScene.add(R.sky);
  R.airSky = {}; // the physically based skies of Earth and Mars (Venus keeps a simple rim)
  for (const name of ["earth", "mars"]) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(5e8, 64, 32),
      new THREE.ShaderMaterial({
        vertexShader: GLSL_SKY_V,
        fragmentShader: GLSL_ASKY_F,
        side: THREE.BackSide,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        depthTest: false,
        uniforms: Object.assign(
          { aHide: { value: 150 } },
          atmosUniforms(name, name !== "earth"),
        ),
      }),
    );
    m.renderOrder = 11;
    m.frustumCulled = false;
    m.visible = false;
    R.bgScene.add(m);
    R.airSky[name] = m;
  }
  R.hemi = new THREE.HemisphereLight(0x9cc3ff, 0x6b5a45, 0);
  R.scene.add(R.hemi);
  // Image-based lighting: a small surround of the craft's world (sky and ground inside an atmosphere, the nearest planet's
  // sunlit disc in space, a faint fill) captured into a cube map, so metal and foil reflect their surroundings and faces
  // turned away from the Sun pick up light from the ground. 64 px, refreshed every few frames (updateSky).
  R.envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uUp: { value: new THREE.Vector3(0, 0, 1) },
      uZen: { value: new THREE.Color("#2f6bd0") },
      uHor: { value: new THREE.Color("#c3daf3") },
      uGnd: { value: new THREE.Color("#5a5040") },
      uDay: { value: 0 },
      uDens: { value: 0 },
      uPl: { value: new THREE.Vector3(0, 0, -1) },
      uPlCos: { value: 2 },
      uPlCol: { value: new THREE.Color("#000000") },
      uFill: { value: 0 },
    },
    vertexShader:
      "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uUp, uPl, uZen, uHor, uGnd, uPlCol; uniform float uDay, uDens, uPlCos, uFill; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float h = dot(d, uUp);
        vec3 sky = mix(uHor, uZen, smoothstep(0.0, 0.6, h)) * (0.05 + 0.55 * uDay);
        vec3 gnd = uGnd * (0.08 + 0.52 * uDay) * (0.7 + 0.3 * smoothstep(-1.0, 0.0, h));
        float disc = smoothstep(uPlCos - 0.01, uPlCos + 0.01, dot(d, uPl));
        gl_FragColor = vec4(mix(uPlCol * disc, h > 0.0 ? sky : gnd, uDens) + uFill, 1.0); }`,
  });
  R.envScene = new THREE.Scene();
  R.envScene.add(
    new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), R.envMat),
  );
  R.envRT = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType });
  R.envCam = new THREE.CubeCamera(0.5, 50, R.envRT);
  R.envScene.add(R.envCam);
  R.pmrem = new THREE.PMREMGenerator(renderer);
  R.envN = 0;
  R.envPM = null;
  R.loader = new THREE.TextureLoader();
  R.detailTex = makeDetailTexture();
  buildStars();
  buildBodies();
  buildPlanetOrbits();
  R.sunGlow = makeGlowSprite("#fff4dc", 1.0);
  R.scene.add(R.sunGlow);
  R.sunGlow2 = makeGlowSprite("#ffcf8a", 0.35, true);
  R.scene.add(R.sunGlow2);
}
// grey: a single-channel texture (a quarter of the memory of an RGBA one)
function loadTex(name, srgb = true, grey = false) {
  const tex = R.loader.load(ASSET(name), () => {
    R.texLoaded++;
  });
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (grey) tex.format = THREE.RedFormat;
  tex.anisotropy = Math.min(8, R.maxAniso || 1);
  return tex;
}
// Sharper maps for a body, loaded as the camera comes near it and released when it goes far away: each level of detail
// loads within `near` body radii and is dropped beyond `far`; `big` levels (8192 × 4096) only on devices that can hold
// them — a desktop GPU (16384 px textures) and a fine pointer; ?tex=8k or ?tex=4k forces the choice. The sharpest loaded
// level is used; maps decode off the main thread where the browser can. flag: a uniform set to 1 while a level is in use.
R.texLOD = [];
function texLOD(body, uniform, levels, srgb, grey, flag) {
  R.texLOD.push({
    body,
    U: uniform,
    base: uniform.value,
    srgb,
    grey,
    flag,
    levels: levels.map((l) => Object.assign({ tex: null, state: "idle" }, l)),
  });
}
function bigTexOK() {
  const q = (location.search.match(/[?&]tex=(\w+)/) || [])[1];
  if (q) return q === "8k";
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  return R.renderer.capabilities.maxTextureSize >= 16384 && !coarse;
}
function loadTexAsync(file, srgb, grey, done, fail) {
  const fin = (t) => {
    t.anisotropy = Math.min(8, R.maxAniso || 1);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (grey) t.format = THREE.RedFormat;
    t.needsUpdate = true;
    done(t);
  };
  // an image decoded before its upload (decode() works off the main thread), so the swap does not stall a frame
  const viaImage = () =>
    R.loader.load(
      ASSET(file),
      (t) => {
        const im = t.image;
        if (im && im.decode)
          im.decode().then(
            () => fin(t),
            () => fin(t),
          );
        else fin(t);
      },
      undefined,
      fail,
    );
  // Chromium decodes straight into an ImageBitmap, flipped as WebGL needs (other engines have not always honoured the options)
  const chromium =
    navigator.userAgentData &&
    navigator.userAgentData.brands &&
    navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand));
  if (typeof createImageBitmap !== "function" || !chromium) return viaImage();
  new THREE.ImageBitmapLoader()
    .setOptions({
      imageOrientation: "flipY",
      premultiplyAlpha: "none",
      colorSpaceConversion: "none",
    })
    .load(
      ASSET(file),
      (bmp) => {
        const t = new THREE.Texture(bmp);
        t.flipY = false;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        fin(t);
      },
      undefined,
      viaImage,
    );
}
function updateTexLOD() {
  if (R.bigTex === undefined) R.bigTex = bigTexOK();
  for (const e of R.texLOD) {
    const b = R.bodies[e.body],
      k = R.camera.position.distanceTo(b.group.position) / b.R;
    let use = null;
    for (const l of e.levels) {
      if (l.state === "idle" && k < l.near && (!l.big || R.bigTex)) {
        l.state = "loading";
        loadTexAsync(
          l.file,
          e.srgb,
          e.grey,
          (t) => {
            l.tex = t;
            l.state = "ready";
          },
          () => {
            l.state = "failed";
          },
        );
      } else if (l.state === "ready" && k > l.far) {
        l.tex.dispose();
        if (l.tex.image && l.tex.image.close) l.tex.image.close();
        l.tex = null;
        l.state = "idle";
      }
      if (l.state === "ready") use = l.tex;
    }
    const v = use || e.base;
    if (e.U.value !== v) e.U.value = v;
    if (e.flag) e.flag.value = v ? 1 : 0;
  }
}
function glowTexture(color, soft) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  const [r, gg, b] = hexToRgb(color).map((x) => Math.round(x * 255));
  if (soft) {
    gr.addColorStop(0, `rgba(${r},${gg},${b},0.9)`);
    gr.addColorStop(0.25, `rgba(${r},${gg},${b},0.25)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  } else {
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.08, `rgba(${r},${gg},${b},0.95)`);
    gr.addColorStop(0.22, `rgba(${r},${gg},${b},0.35)`);
    gr.addColorStop(0.5, `rgba(${r},${gg},${b},0.08)`);
    gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeGlowSprite(color, opacity, soft) {
  const m = new THREE.SpriteMaterial({
    map: glowTexture(color, soft),
    color: 0xffffff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const s = new THREE.Sprite(m);
  s.renderOrder = 5;
  return s;
}

// ---------------- stars (d3-celestial / Hipparcos bright stars) ----------------
function bvToRgb(bv) {
  bv = clamp(bv, -0.4, 2.0);
  const stops = [
    [-0.4, [0.62, 0.71, 1.0]],
    [0.0, [0.8, 0.86, 1.0]],
    [0.3, [0.98, 0.98, 1.0]],
    [0.6, [1.0, 0.95, 0.84]],
    [1.0, [1.0, 0.84, 0.62]],
    [1.5, [1.0, 0.72, 0.45]],
    [2.0, [1.0, 0.6, 0.35]],
  ];
  for (let i = 1; i < stops.length; i++)
    if (bv <= stops[i][0]) {
      const [a, ca] = stops[i - 1],
        [b, cb] = stops[i];
      const f = (bv - a) / (b - a);
      return ca.map((x, k) => x + (cb[k] - x) * f);
    }
  return stops[stops.length - 1][1];
}
function buildStars() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLSL_STAR_V,
    fragmentShader: GLSL_STAR_F,
    uniforms: { uScale: { value: 1 }, uBright: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  R.starMat = mat;
  const geo = new THREE.BufferGeometry();
  R.stars = new THREE.Points(geo, mat);
  R.stars.frustumCulled = false;
  R.stars.renderOrder = -10;
  R.bgScene.add(R.stars);
  fetch(ASSET("stars.json"))
    .then((r) => r.json())
    .then((arr) => {
      const n = arr.length / 4,
        pos = new Float32Array(n * 3),
        size = new Float32Array(n),
        col = new Float32Array(n * 3);
      const RS = 1e9;
      for (let i = 0; i < n; i++) {
        const ra = arr[4 * i] * DEG,
          dec = arr[4 * i + 1] * DEG,
          mag = arr[4 * i + 2],
          bv = arr[4 * i + 3];
        const eq = [
            Math.cos(dec) * Math.cos(ra),
            Math.cos(dec) * Math.sin(ra),
            Math.sin(dec),
          ],
          e = eqToEcl(eq);
        pos[3 * i] = e[0] * RS;
        pos[3 * i + 1] = e[1] * RS;
        pos[3 * i + 2] = e[2] * RS;
        const fl = Math.pow(10, -0.4 * (mag - 6.5));
        size[i] = clamp(1.6 + 1.25 * Math.sqrt(fl), 1.6, 9);
        const b = clamp(0.25 + (0.6 * Math.sqrt(fl)) / 3, 0.18, 1.6);
        const c = bvToRgb(bv);
        col[3 * i] = c[0] * b;
        col[3 * i + 1] = c[1] * b;
        col[3 * i + 2] = c[2] * b;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    })
    .catch(() => {});
}

// ---------------- planets ----------------
function capUniforms() {
  return {
    uCapDir: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, 1, 0)) },
    uCapCos: { value: [2, 2, 2, 2] },
  };
}
function bodyMaterial(name) {
  const sunU = { value: new THREE.Vector3(1, 0, 0) };
  if (name === "earth") {
    // earth_aux: R the sea, G and B the slopes east and north (128 + slope·1000), drawn 5× steeper
    const m = new THREE.ShaderMaterial({
      vertexShader: GLSL_V,
      fragmentShader: GLSL_EARTH_F,
      uniforms: {
        tDay: { value: loadTex("earth_day.jpg") },
        tNight: { value: loadTex("earth_night.jpg", false, true) },
        tClouds: { value: loadTex("earth_clouds.jpg", false, true) },
        tAux: { value: loadTex("earth_aux.jpg", false) },
        uSlopeK: { value: 1000 },
        uRelief: { value: 5 },
        uReliefNear: { value: new THREE.Vector2(20, 120) },
        uPole: { value: new THREE.Vector3(0, 0, 1) },
        uSunDir: sunU,
        uLights: { value: 1 },
        uFill: { value: new THREE.Vector3(0, 0, 0) },
        tDetail: { value: R.detailTex },
        uDetailAmp: { value: 0.55 },
        uDetailRep: { value: new THREE.Vector2(512, 256) },
        ...capUniforms(),
        ...atmosUniforms("earth"),
      },
    });
    const big = (f) => [{ file: f, near: 25, far: 60, big: true }];
    texLOD("earth", m.uniforms.tDay, big("earth_day_8k.jpg"), true, false);
    texLOD(
      "earth",
      m.uniforms.tClouds,
      big("earth_clouds_8k.jpg"),
      false,
      true,
    );
    texLOD("earth", m.uniforms.tNight, big("earth_night_8k.jpg"), false, true);
    return m;
  }
  if (name === "sun")
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.96, 0.86),
    });
  const maps = {
    moon: "moon.jpg",
    mars: "mars.jpg",
    venus: "venus.jpg",
    jupiter: "jupiter.jpg",
    saturn: "saturn.jpg",
  };
  const ls =
    {
      moon: 0.9,
      mercury: 0.9,
      mars: 0.45,
      venus: 0.0,
      jupiter: 0.0,
      saturn: 0.0,
      uranus: 0.0,
      neptune: 0.0,
    }[name] ?? 0;
  const amb = { moon: 0.012, mars: 0.006 }[name] ?? 0.004;
  const tint = name === "mars" ? [1.0, 0.95, 0.9] : [1, 1, 1];
  const plain = { mercury: "#9c958c", uranus: "#a9dde3", neptune: "#5c7fe6" }[
    name
  ];
  // relief: slope maps (128 + slope·400) from LRO LOLA and MGS MOLA, loaded with the 4096 px colour maps when the camera
  // heads for the body (until then a 1024 px map and no relief)
  const aux = { moon: ["moon_aux.jpg", 1.0], mars: ["mars_aux.jpg", 1.5] }[
    name
  ];
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_V,
    fragmentShader: GLSL_ROCK_F,
    defines: name === "mars" ? { HAS_ATMO: 1 } : {},
    uniforms: {
      map: { value: maps[name] ? loadTex(maps[name]) : null },
      uHasMap: { value: maps[name] ? 1 : 0 },
      uSunDir: sunU,
      uAmb: { value: amb },
      uLS: { value: ls },
      uTint: {
        value: plain
          ? new THREE.Color(plain).convertSRGBToLinear()
          : new THREE.Vector3(...tint),
      },
      uFogColor: { value: new THREE.Color(0, 0, 0) },
      uFogK: { value: 0 },
      uFill: { value: new THREE.Vector3(0, 0, 0) },
      tAux: { value: null },
      uHasAux: { value: 0 },
      uSlopeK: { value: 400 },
      uRelief: { value: aux ? aux[1] : 0 },
      uReliefNear: { value: new THREE.Vector2(8, 40) },
      uPole: { value: new THREE.Vector3(0, 0, 1) },
      tDetail: { value: R.detailTex },
      uDetailAmp: {
        value: { moon: 0.35, mars: 0.45, mercury: 0.8 }[name] || 0,
      },
      uDetailRep: { value: new THREE.Vector2(512, 256) },
      ...capUniforms(),
      ...(name === "mars" ? atmosUniforms("mars", true) : {}),
    },
  });
  if (aux) {
    texLOD(
      name,
      m.uniforms.map,
      [
        { file: name + "_4k.jpg", near: 100, far: 400 },
        { file: name + "_8k.jpg", near: 25, far: 60, big: true },
      ],
      true,
      false,
    );
    texLOD(
      name,
      m.uniforms.tAux,
      [{ file: aux[0], near: 100, far: 400 }],
      false,
      false,
      m.uniforms.uHasAux,
    );
  }
  return m;
}
function atmoShell(color, sunset, strength, pow, scale) {
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_V,
    fragmentShader: GLSL_ATMO_F,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uColor: { value: new THREE.Color(color) },
      uSunset: { value: new THREE.Color(sunset) },
      uStrength: { value: strength },
      uPow: { value: pow },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), m);
  mesh.scale.setScalar(scale);
  mesh.renderOrder = 2;
  return mesh;
}
function buildBodies() {
  R.bodies = {};
  // Earth's sphere is finer: its facets would otherwise sink up to 1.9 km below the true surface, enough to show at the limb
  // against the air drawn on the true sphere
  const geo = new THREE.SphereGeometry(1, 128, 64),
    geoFine = new THREE.SphereGeometry(1, 384, 192);
  for (const name of BODY_LIST) {
    const B = BODIES[name];
    const g = new THREE.Group();
    g.name = name;
    const mat = bodyMaterial(name);
    const mesh = new THREE.Mesh(name === "earth" ? geoFine : geo, mat);
    const Rb =
      name === "earth" ? B.R : B.Rmean && name !== "earth" ? B.Rmean : B.R;
    const flat = { jupiter: 0.06487, saturn: 0.09796 }[name] || 0; // Earth, Moon & Mars stay spherical, as in the flight planner
    mesh.scale.set(Rb, Rb * (1 - flat), Rb);
    g.add(mesh);
    const rec = { name, group: g, mesh, mat, R: Rb };
    if (name === "venus") {
      rec.atmo = atmoShell("#ffe7b8", "#ffb070", 0.6, 3.0, 1.0);
      rec.atmo.scale.setScalar(Rb * 1.015);
      g.add(rec.atmo);
    }
    if (name === "saturn") {
      const rg = new THREE.RingGeometry(74500, 136800, 256, 1);
      const pos = rg.attributes.position,
        uv = rg.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - 74500) / (136800 - 74500), 0.5);
      }
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 4;
      const cx = c.getContext("2d");
      for (let x = 0; x < 512; x++) {
        const f = x / 512;
        let a =
          0.25 +
          0.5 *
            Math.abs(Math.sin(f * 40)) *
            (f > 0.45 && f < 0.52 ? 0.05 : 1) *
            (f < 0.12 ? 0.3 : 1);
        const l = 190 + 40 * Math.sin(f * 17);
        cx.fillStyle = `rgba(${l},${l - 15},${l - 45},${a})`;
        cx.fillRect(x, 0, 1, 4);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const ring = new THREE.Mesh(
        rg,
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2; // ring plane = local xz (equator), local y = pole
      g.add(ring);
      rec.ring = ring;
    }
    if (name === "sun") mesh.renderOrder = 1;
    R.scene.add(g);
    R.bodies[name] = rec;
  }
}
const _m4 = new THREE.Matrix4(),
  _vx = new THREE.Vector3(),
  _vy = new THREE.Vector3(),
  _vz = new THREE.Vector3();
// orientation of a body mesh: local x = lon 0, local y = north pole, local −z = lon 90°E
function bodyQuat(name, t, q) {
  if (name === "sun") {
    const p = bodyPoleEcl("sun", t);
    _vy.set(p[0], p[1], p[2]);
    _vx.set(1, 0, 0);
    _vz.crossVectors(_vx, _vy).normalize();
    _vx.crossVectors(_vy, _vz);
    _m4.makeBasis(_vx, _vy, _vz);
    return q.setFromRotationMatrix(_m4);
  }
  const m = bodyFixedToEcl(name, t);
  _vx.set(m[0], m[3], m[6]);
  _vy.set(m[2], m[5], m[8]);
  _vz.set(-m[1], -m[4], -m[7]);
  _m4.makeBasis(_vx, _vy, _vz);
  return q.setFromRotationMatrix(_m4);
}
function helio(name, t) {
  // per-frame cache of heliocentric positions
  const k = name + "@" + t;
  if (R.helio[k]) return R.helio[k];
  const v = planetHelio(name, t);
  R.helio[k] = v;
  return v;
}
function updateBodies(t, camDist) {
  const O = R.O;
  for (const name of BODY_LIST) {
    const b = R.bodies[name];
    const P = helio(name, t).r;
    b.group.position.set(P[0] - O[0], P[1] - O[1], P[2] - O[2]);
    bodyQuat(name, t, b.mesh.quaternion);
    if (b.ring) {
      b.ring.quaternion
        .copy(b.mesh.quaternion)
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2,
          ),
        );
    }
    if (b.atmo) b.atmo.quaternion.copy(b.mesh.quaternion);
    const d = vnorm(P) || 1;
    const sd = [-P[0] / d, -P[1] / d, -P[2] / d];
    if (b.mat.uniforms && b.mat.uniforms.uSunDir)
      b.mat.uniforms.uSunDir.value.set(sd[0], sd[1], sd[2]);
    if (b.mat.uniforms && b.mat.uniforms.uPole)
      b.mat.uniforms.uPole.value
        .set(0, 1, 0)
        .applyQuaternion(b.mesh.quaternion);
    if (b.mat.uniforms && b.mat.uniforms.aSun)
      b.mat.uniforms.aSun.value.set(sd[0], sd[1], sd[2]);
    if (b.atmo) b.atmo.material.uniforms.uSunDir.value.set(sd[0], sd[1], sd[2]);
  }
  updateTexLOD();
  R.sunLight.position.set(-O[0], -O[1], -O[2]);
  // Sun glow: real corona size, but never smaller than a bright point
  const sunCam = R.camera.position.distanceTo(R.bodies.sun.group.position);
  const s1 = Math.max(BODIES.sun.R * 7, sunCam * 0.045),
    s2 = Math.max(BODIES.sun.R * 30, sunCam * 0.16);
  R.sunGlow.position.copy(R.bodies.sun.group.position);
  R.sunGlow.scale.set(s1, s1, 1);
  R.sunGlow2.position.copy(R.bodies.sun.group.position);
  R.sunGlow2.scale.set(s2, s2, 1);
}

// ---------------- orbits of planets and the Moon ----------------
function orbitLineMaterial(color, opacity) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}
function buildPlanetOrbits() {
  R.orbitGroup = new THREE.Group();
  R.scene.add(R.orbitGroup);
  R.planetOrbits = {};
  for (const name of [
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(3 * 721), 3),
    );
    const line = new THREE.Line(
      geo,
      orbitLineMaterial(BODY_COLORS[name], 0.35),
    );
    line.frustumCulled = false;
    R.orbitGroup.add(line);
    R.planetOrbits[name] = { line, tBuilt: null };
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3 * 400), 3),
  );
  R.moonOrbit = {
    line: new THREE.Line(mg, orbitLineMaterial("#9fb2c8", 0.35)),
    tBuilt: null,
  };
  R.moonOrbit.line.frustumCulled = false;
  R.scene.add(R.moonOrbit.line);
}
function updateOrbits(t, show, camDist, frameMode) {
  R.orbitGroup.visible = show && camDist > 4e6;
  const O = R.O;
  if (R.orbitGroup.visible) {
    for (const name in R.planetOrbits) {
      const po = R.planetOrbits[name];
      if (po.tBuilt == null || Math.abs(t - po.tBuilt) > 200 * DAY) {
        const el = planetElemsAt(name === "earth" ? "emb" : name, t),
          arr = po.line.geometry.attributes.position.array;
        for (let i = 0; i <= 720; i++) {
          const s = stateFromElemsM(
            el.a,
            el.e,
            el.i,
            el.Om,
            el.w,
            (i / 720) * TAU,
            BODIES.sun.mu,
          );
          arr[3 * i] = s.r[0];
          arr[3 * i + 1] = s.r[1];
          arr[3 * i + 2] = s.r[2];
        }
        po.line.geometry.attributes.position.needsUpdate = true;
        po.tBuilt = t;
      }
    }
    R.orbitGroup.position.set(-O[0], -O[1], -O[2]);
  }
  const mo = R.moonOrbit;
  mo.line.visible =
    show && camDist > 3e4 && camDist < 5e7 && frameMode !== "emrot";
  if (mo.line.visible) {
    if (mo.tBuilt == null || Math.abs(t - mo.tBuilt) > 0.5 * DAY) {
      const arr = mo.line.geometry.attributes.position.array;
      for (let i = 0; i < 400; i++) {
        const tt = t - 13.7 * DAY + (i / 399) * 27.4 * DAY;
        const m = moonGeo(tt).r;
        arr[3 * i] = m[0];
        arr[3 * i + 1] = m[1];
        arr[3 * i + 2] = m[2];
      }
      mo.line.geometry.attributes.position.needsUpdate = true;
      mo.tBuilt = t;
    }
    const E = helio("earth", t).r;
    mo.line.position.set(E[0] - O[0], E[1] - O[1], E[2] - O[2]);
  }
}

// atmosphere sky dome for cameras inside the air of Earth or Mars
const SKY_LOOK = {
  earth: {
    zen: "#2f6bd0",
    hor: "#c3daf3",
    set: "#ff8f4a",
    halo: "#fff2d8",
    H: 8.5,
    top: 85,
  },
  mars: {
    zen: "#b08a66",
    hor: "#dcbf98",
    set: "#6f9ad8",
    halo: "#d6e6ff",
    H: 11.1,
    top: 70,
  },
};
function updateSky() {
  const camH = vadd(R.O, [
    R.camera.position.x,
    R.camera.position.y,
    R.camera.position.z,
  ]);
  let best = null;
  for (const b of ["earth", "mars"]) {
    const P = helio(b, MV.tNow).r;
    const d = vsub(camH, P);
    const alt = vnorm(d) - surfaceRadius(b);
    if (alt < SKY_LOOK[b].top && (!best || alt < best.alt))
      best = { b, alt, up: vunit(d) };
  }
  const u = R.sky.material.uniforms;
  let dens = 0,
    day = 0;
  if (best) {
    const L = SKY_LOOK[best.b];
    dens = clamp(
      Math.exp(-Math.max(best.alt, 0) / L.H) *
        (1 - smoothstep(best.alt / L.top)),
      0,
      1,
    );
    const sun = vunit(vscale(camH, -1));
    u.uUp.value.set(...best.up);
    u.uSun.value.set(...sun);
    u.uZenith.value.set(L.zen);
    u.uHorizon.value.set(L.hor);
    u.uSunset.value.set(L.set);
    u.uHalo.value.set(L.halo);
    const el = vdot(sun, best.up);
    day = smoothstep((el + 0.2) / 0.26);
    R.hemi.position.set(...best.up);
    R.hemi.color.set(best.b === "mars" ? "#d8b48c" : "#9cc3ff");
    R.hemi.groundColor.set(best.b === "mars" ? "#7a4a30" : "#5a5040");
  }
  // bounce light from a sunlit lunar surface, ambient fill
  let moonFill = 0;
  if (!best) {
    const Pm = helio("moon", MV.tNow).r;
    const d = vsub(camH, Pm);
    const alt = vnorm(d) - BODIES.moon.R;
    if (alt < 400) {
      const up = vunit(d);
      const el = vdot(vunit(vscale(camH, -1)), up);
      moonFill = clamp(el * 3, 0, 1) * (1 - alt / 400);
      R.hemi.position.set(...up);
      R.hemi.color.set("#000000");
      R.hemi.groundColor.set("#8f8a84");
    }
  }
  R.ambient.intensity = MV.layers.fill === false ? 0.04 : 0.35;
  u.uDensity.value = dens;
  R.sky.visible = dens > 0.002 && !(best && R.airSky[best.b]);
  for (const b of ["mars"]) {
    const U = R.bodies[b].mat.uniforms;
    if (best && best.b === b) {
      U.uFogK.value = dens / 90;
      U.uFogColor.value
        .copy(u.uHorizon.value)
        .multiplyScalar(0.25 + 0.75 * day);
    } else U.uFogK.value = 0;
  }
  // the physically based air: the camera relative to each planet (double precision here, so the shaders get its altitude
  // exactly), and the Sun seen through the air (reddened and dimmed near the horizon, also from orbit at sunrise)
  let sunT = null;
  let wb = [1, 1, 1];
  for (const name in R.airSky) {
    const A = ATMOS[name],
      U = A.U;
    if (!A.lutT) {
      R.airSky[name].visible = false;
      continue;
    } // (tables still to come)
    const rel = vsub(camH, helio(name, MV.tNow).r),
      r = vnorm(rel),
      h = r - A.Rg,
      sunD = vunit(vscale(camH, -1));
    U.aCam.value.set(rel[0], rel[1], rel[2]);
    U.aCamR.value = r;
    U.aCamH.value = h;
    U.aRgE.value = Math.min(
      A.Rg,
      groundRadius(name, vscale(rel, 1 / r), MV.tNow),
    );
    R.airSky[name].visible = r < A.Rg * 120;
    const sT =
        r < A.Rg + A.top + 2000 ? atmosSunTransmittance(name, rel, sunD) : null,
      ex = atmosExposure(name, h, sT);
    U.aWB.value.set(...ex.wb);
    U.aGrade.value.set(...ex.grade);
    U.aExpo.value = ex.expo;
    // the airglow shows as a thin line on the limb seen from above it, not as a glow around a camera inside the layer
    const gk = smoothstep((h - 110) / 40);
    U.aGlow.value.set(A.glow[0] * gk, A.glow[1] * gk, A.glow[2] * gk);
    if (sT) {
      sunT = sT;
      wb = ex.wb.map((x) => x * ex.expo);
    }
  }
  const st = sunT ? sunT.map((x, i) => Math.min(x * wb[i], 1.2)) : [1, 1, 1];
  R.sunLight.color.setRGB(st[0], st[1], st[2]);
  R.bodies.sun.mat.color.setRGB(1.0 * st[0], 0.96 * st[1], 0.86 * st[2]);
  R.sunGlow.material.color.setRGB(st[0], st[1], st[2]);
  R.sunGlow2.material.color.setRGB(st[0], st[1], st[2]);
  R.hemi.intensity = best ? 1.6 * dens * day : 1.4 * moonFill;
  // night fill: with "Cinematic fill light" on, the ground near the camera stays readable after dark (on the Moon it stands in for earthshine)
  const fillOn = MV.layers.fill !== false;
  for (const n of ["earth", "moon", "mars"]) {
    const U = R.bodies[n].mat.uniforms;
    if (U.uFill) U.uFill.value.set(0, 0, 0);
  }
  if (fillOn) {
    let fb = null,
      near = 0,
      night = 0;
    if (best) {
      fb = best.b;
      near = 1 - smoothstep((best.alt - 40) / 400);
      night = 1 - day;
    } else {
      const Pm = helio("moon", MV.tNow).r;
      const d = vsub(camH, Pm);
      const alt = vnorm(d) - BODIES.moon.R;
      if (alt < 600) {
        fb = "moon";
        near = 1 - smoothstep((alt - 40) / 500);
        const el = vdot(vunit(vscale(camH, -1)), vunit(d));
        night = 1 - smoothstep((el + 0.05) / 0.2);
      }
    }
    if (fb && near * night > 0.001) {
      const k = near * night,
        c =
          fb === "mars"
            ? [0.2, 0.2, 0.26]
            : fb === "moon"
              ? [0.13, 0.15, 0.2]
              : [0.07, 0.08, 0.12];
      R.bodies[fb].mat.uniforms.uFill.value.set(c[0] * k, c[1] * k, c[2] * k);
      if (best) {
        R.hemi.intensity += 0.55 * k * dens;
        R.hemi.color.lerp(new THREE.Color("#8ea2cc"), k);
        R.hemi.groundColor.lerp(new THREE.Color("#3d3833"), k);
      }
    }
  }
  R.skyDens = dens * (0.15 + 0.85 * day);
  {
    // the surround for image-based lighting
    const U = R.envMat.uniforms,
      sunD = vunit(vscale(camH, -1));
    U.uDens.value = clamp(dens * 4, 0, 1);
    U.uDay.value = day;
    U.uFill.value = fillOn ? 0.035 : 0.01;
    if (best) {
      const L = SKY_LOOK[best.b];
      U.uUp.value.set(...best.up);
      U.uZen.value.set(L.zen);
      U.uHor.value.set(L.hor);
      U.uGnd.value.set(best.b === "mars" ? "#8a5a3a" : "#6a6050");
    }
    let pl = null;
    for (const b of ["earth", "moon", "mars"]) {
      const d = vsub(helio(b, MV.tNow).r, camH),
        r = vnorm(d),
        R0 = surfaceRadius(b);
      if (r < R0 * 60 && (!pl || r / R0 < pl.k))
        pl = { b, d, r, R0, k: r / R0 };
    }
    if (pl) {
      const dir = vunit(pl.d),
        lit = clamp(0.5 - 0.5 * vdot(dir, sunD), 0, 1);
      U.uPl.value.set(...dir);
      U.uPlCos.value = Math.sqrt(Math.max(0, 1 - (pl.R0 / pl.r) ** 2));
      U.uPlCol.value
        .set(
          pl.b === "earth"
            ? "#6f8fb8"
            : pl.b === "mars"
              ? "#a0704c"
              : "#8a8680",
        )
        .multiplyScalar(0.2 + 0.7 * lit);
    } else U.uPlCos.value = 2;
    if (R.envN++ % 6 === 0) {
      R.envCam.update(R.renderer, R.envScene);
      R.envPM = R.pmrem.fromCubemap(R.envRT.texture, R.envPM);
      R.scene.environment = R.envPM.texture;
    }
  }
}

// ==== 25_film.js
// ============================================================================
// Film look (the "Film look" layer): the frame as a camera on film would show it. Light brighter than white blooms
// into its surroundings (the Sun, a rocket's flame, the glow of an entry), highlights roll off instead of clipping, the
// corners fall off a little and fine grain moves over the picture. The scene is drawn into a floating-point target
// instead of the screen, so light keeps its strength above white, and a last pass draws it to the screen. With the layer
// off the scene goes straight to the screen as before.
// ============================================================================
// Materials write the same sRGB-encoded values into any target as onto the screen (three.js would write linear values
// into a target), so the scene looks the same either way; the app's own shaders already write display values.
THREE.ShaderChunk.colorspace_fragment =
  "gl_FragColor = sRGBTransferOETF( gl_FragColor );";
const FILM = {
  ok: null,
  rt: null,
  down: [],
  up: [],
  w: 0,
  h: 0,
  samples: -1,
  scene: null,
  cam: null,
  quad: null,
  mat: null,
};
const FILM_LEVELS = 6; // bloom levels, each half the size of the one before (from half the screen down to 1/64)
const GLSL_FILM_V =
  "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const GLSL_FILM_LIB = `
varying vec2 vUv;
// A texel holding NaN or infinity (all its exponent bits set), taken as no light. A shader can slip one into the float
// target (pow() of a negative number, a sum past the half float's 65504); on the screen it would be clamped away, but here
// it stays, and every filter that reads it turns its whole footprint black.
bvec3 nonFinite(vec3 c){ return equal(floatBitsToUint(c) & uvec3(0x7f800000u), uvec3(0x7f800000u)); }
vec3 finite(vec3 c){ return mix(c, vec3(0.0), nonFinite(c)); }
vec3 toLinear(vec3 c){ c = max(c, 0.0); return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
// a 2×2-texel box at the centre and four diagonal taps half a texel out (the "dual filter" downsample)
vec3 down(sampler2D t, vec2 uv, vec2 h){ return (finite(texture2D(t, uv).rgb) * 4.0 + finite(texture2D(t, uv - h).rgb) + finite(texture2D(t, uv + h).rgb) + finite(texture2D(t, uv + vec2(h.x, -h.y)).rgb) + finite(texture2D(t, uv - vec2(h.x, -h.y)).rgb)) / 8.0; }
// a tent of eight taps (the "dual filter" upsample)
vec3 up(sampler2D t, vec2 uv, vec2 h){
  vec3 s = texture2D(t, uv + vec2(-2.0 * h.x, 0.0)).rgb + texture2D(t, uv + vec2(2.0 * h.x, 0.0)).rgb + texture2D(t, uv + vec2(0.0, 2.0 * h.y)).rgb + texture2D(t, uv + vec2(0.0, -2.0 * h.y)).rgb;
  s += 2.0 * (texture2D(t, uv + vec2(-h.x, h.y)).rgb + texture2D(t, uv + vec2(h.x, h.y)).rgb + texture2D(t, uv + vec2(h.x, -h.y)).rgb + texture2D(t, uv + vec2(-h.x, -h.y)).rgb);
  return s / 12.0;
}`;
const GLSL_FILM_F = {
  // what blooms: the light above a soft threshold, taken in linear light from the screen-sized picture
  // (the light over the threshold eased off, so a glint ten times white does not throw a halo ten times as wide)
  bright: `uniform sampler2D tSrc; uniform vec2 uH; uniform float uThr, uKnee, uCap;
void main(){
  vec3 c = toLinear(down(tSrc, vUv, uH));
  float br = max(c.r, max(c.g, c.b)), q = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee);
  q = q * q / (4.0 * uKnee + 1e-4);
  float e = max(q, br - uThr); e /= 1.0 + e / uCap;
  gl_FragColor = vec4(c * e / max(br, 1e-4), 1.0);
}`,
  down: `uniform sampler2D tSrc; uniform vec2 uH; void main(){ gl_FragColor = vec4(down(tSrc, vUv, uH), 1.0); }`,
  // back up through the levels, each adding its own blur: a sum of ever wider glows that falls off smoothly
  up: `uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uH; uniform float uScatter;
void main(){ gl_FragColor = vec4(texture2D(tAdd, vUv).rgb + uScatter * up(tSrc, vUv, uH), 1.0); }`,
  comp: `uniform sampler2D tSrc; uniform sampler2D tBloom; uniform vec2 uH; uniform float uBloom, uVig, uGrain, uGrainPx, uTime; uniform vec4 uFrame;
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb;
  if (any(nonFinite(s))) { // a pixel the scene left without a number: its neighbours' light instead
    vec2 px = 1.0 / vec2(textureSize(tSrc, 0));
    s = 0.25 * (finite(texture2D(tSrc, vUv + vec2(px.x, 0.0)).rgb) + finite(texture2D(tSrc, vUv - vec2(px.x, 0.0)).rgb) + finite(texture2D(tSrc, vUv + vec2(0.0, px.y)).rgb) + finite(texture2D(tSrc, vUv - vec2(0.0, px.y)).rgb));
  }
  vec3 lin = toLinear(s) + uBloom * up(tBloom, vUv, uH);
  const float a = 0.85; // above this the light rolls off toward white instead of clipping
  lin = mix(lin, a + (1.0 - a) * (1.0 - exp(-(lin - a) / (1.0 - a))), step(a, lin));
  vec3 c = toSRGB(lin);
  vec2 d = gl_FragCoord.xy - (uFrame.xy + 0.5 * uFrame.zw); // fall-off toward the corners of the film frame
  c *= 1.0 - uVig * smoothstep(0.3, 1.0, length(d) / (0.5 * length(uFrame.zw)));
  vec2 g = floor(gl_FragCoord.xy / uGrainPx), o = vec2(fract(uTime * 7.31), fract(uTime * 11.17)) * 1031.0; // a new grain every frame
  float n = hash(g + o) + hash(g + o + 17.13) - 1.0, l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += n * uGrain * (0.3 + 2.8 * l * (1.0 - l)); // strongest in the mid-tones
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};
function filmSupported() {
  if (FILM.ok !== null) return FILM.ok;
  const r = R.renderer;
  FILM.ok = !!(
    r.capabilities.isWebGL2 &&
    (r.extensions.has("EXT_color_buffer_float") ||
      r.extensions.has("EXT_color_buffer_half_float"))
  );
  return FILM.ok;
}
function filmTarget(w, h, samples) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: samples >= 0,
    samples: Math.max(samples, 0),
  });
}
function filmFree() {
  if (FILM.rt) FILM.rt.dispose();
  for (const t of [...FILM.down, ...FILM.up]) t.dispose();
  FILM.rt = null;
  FILM.down = [];
  FILM.up = [];
  FILM.w = FILM.h = 0;
}
// Before the scene is drawn: true when it goes into the film target (sized to the screen), false to draw straight to it
const _filmSize = new THREE.Vector2();
function filmBegin() {
  if (!MV.layers.film || !filmSupported()) {
    if (FILM.rt) filmFree();
    return false;
  }
  const r = R.renderer;
  r.getDrawingBufferSize(_filmSize);
  const w = _filmSize.x,
    h = _filmSize.y;
  const aa = r.getContext().getContextAttributes().antialias,
    samples = aa ? 4 : 0;
  if (w !== FILM.w || h !== FILM.h || samples !== FILM.samples) {
    filmFree();
    FILM.w = w;
    FILM.h = h;
    FILM.samples = samples;
    FILM.rt = filmTarget(w, h, samples);
    for (let i = 0; i < FILM_LEVELS; i++) {
      const lw = Math.max(1, w >> (i + 1)),
        lh = Math.max(1, h >> (i + 1));
      FILM.down.push(filmTarget(lw, lh, -1));
      if (i < FILM_LEVELS - 1) FILM.up.push(filmTarget(lw, lh, -1));
    }
  }
  if (!FILM.scene) {
    FILM.scene = new THREE.Scene();
    FILM.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (f, u) =>
      new THREE.ShaderMaterial({
        vertexShader: GLSL_FILM_V,
        fragmentShader: GLSL_FILM_LIB + f,
        uniforms: u,
        depthTest: false,
        depthWrite: false,
      });
    const T = () => ({ value: null }),
      V = () => ({ value: new THREE.Vector2() });
    FILM.mat = {
      bright: mk(GLSL_FILM_F.bright, {
        tSrc: T(),
        uH: V(),
        uThr: { value: 1.3 },
        uKnee: { value: 0.3 },
        uCap: { value: 1.5 },
      }),
      down: mk(GLSL_FILM_F.down, { tSrc: T(), uH: V() }),
      up: mk(GLSL_FILM_F.up, {
        tSrc: T(),
        tAdd: T(),
        uH: V(),
        uScatter: { value: 0.75 },
      }),
      comp: mk(GLSL_FILM_F.comp, {
        tSrc: T(),
        tBloom: T(),
        uH: V(),
        uBloom: { value: 0.3 },
        uVig: { value: 0.18 },
        uGrain: { value: 0.028 },
        uGrainPx: { value: 1 },
        uTime: { value: 0 },
        uFrame: { value: new THREE.Vector4() },
      }),
    };
    FILM.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), FILM.mat.comp);
    FILM.quad.frustumCulled = false;
    FILM.scene.add(FILM.quad);
  }
  r.setRenderTarget(FILM.rt);
  return true;
}
function filmPass(mat, target) {
  FILM.quad.material = mat;
  R.renderer.setRenderTarget(target);
  R.renderer.render(FILM.scene, FILM.cam);
}
// After the scene: bloom, roll-off, vignette and grain, onto the screen
function filmEnd() {
  const M = FILM.mat,
    D = FILM.down,
    U = FILM.up,
    half = (t, v) => v.set(0.5 / t.width, 0.5 / t.height);
  M.bright.uniforms.tSrc.value = FILM.rt.texture;
  half(FILM.rt, M.bright.uniforms.uH.value);
  filmPass(M.bright, D[0]);
  for (let i = 1; i < D.length; i++) {
    M.down.uniforms.tSrc.value = D[i - 1].texture;
    half(D[i - 1], M.down.uniforms.uH.value);
    filmPass(M.down, D[i]);
  }
  for (let i = U.length - 1; i >= 0; i--) {
    const low = i === U.length - 1 ? D[i + 1] : U[i + 1];
    M.up.uniforms.tSrc.value = low.texture;
    M.up.uniforms.tAdd.value = D[i].texture;
    half(low, M.up.uniforms.uH.value);
    filmPass(M.up, U[i]);
  }
  const c = M.comp.uniforms,
    pr = R.renderer.getPixelRatio(),
    fr = frameRect();
  c.tSrc.value = FILM.rt.texture;
  c.tBloom.value = U[0].texture;
  half(U[0], c.uH.value);
  c.uTime.value = R.clock || 0;
  c.uFrame.value.set(
    fr.x * pr,
    (R.height - fr.y - fr.h) * pr,
    fr.w * pr,
    fr.h * pr,
  );
  c.uGrainPx.value = Math.max(1, Math.round(pr));
  c.uGrain.value = MV.filmGrain === false ? 0 : 0.028; // (a video can do without: grain costs bitrate)
  filmPass(M.comp, null);
}

// ==== 30_models.js
// ============================================================================
// Procedural vehicle models (metres, +Y = nose). Built from the engine's real
// launcher geometry (stage lengths/radii/engine layouts) and spacecraft specs.
// ============================================================================
const MATS = {};
function mat(color, kind = "paint", extra = {}) {
  const key = color + kind + JSON.stringify(extra);
  if (MATS[key]) return MATS[key];
  // [roughness, metalness]. Metals reflect the surround (image-based lighting, 20_scene.js) but keep some diffuse colour:
  // in deep space the surround is nearly black, and fully metallic surfaces would turn black away from the Sun.
  const p = {
    paint: [0.55, 0.05],
    metal: [0.35, 0.6],
    dark: [0.75, 0.2],
    gold: [0.3, 0.7],
    foil: [0.26, 0.7],
    solar: [0.4, 0.3],
    fabric: [0.9, 0.0],
    tile: [0.85, 0.05],
    glass: [0.08, 0.45],
  }[kind] || [0.6, 0.1];
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: p[0],
    metalness: p[1],
    ...extra,
  });
  MATS[key] = m;
  return m;
}
const M_DARKMETAL = () => mat("#3a3d42", "metal", { side: THREE.DoubleSide });
function cyl(rb, rt, len, material, seg = 40, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, len, seg, 1, open);
  g.translate(0, len / 2, 0);
  return new THREE.Mesh(g, material);
}
function box(w, hgt, d, material) {
  const g = new THREE.BoxGeometry(w, hgt, d);
  g.translate(0, hgt / 2, 0);
  return new THREE.Mesh(g, material);
}
function bell(len, rExit, material) {
  const pts = [
    [rExit * 0.34, len],
    [rExit * 0.3, len * 0.9],
    [rExit * 0.48, len * 0.65],
    [rExit * 0.72, len * 0.35],
    [rExit, 0],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, 28);
  return new THREE.Mesh(g, material || M_DARKMETAL());
}
function ogive(r, len, material, cylFrac = 0.45) {
  const pts = [];
  const nC = 2,
    nO = 16;
  const lc = len * cylFrac,
    lo = len - lc;
  pts.push(new THREE.Vector2(r, 0));
  pts.push(new THREE.Vector2(r, lc));
  for (let i = 1; i <= nO; i++) {
    const f = i / nO;
    pts.push(
      new THREE.Vector2(
        Math.max(r * Math.sqrt(1 - f * f) * (1 - 0.15 * f), 0.001),
        lc + lo * f,
      ),
    );
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 40), material);
}
function stripeTex(fn, w = 256, hh = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = hh;
  const g = c.getContext("2d");
  fn(g, w, hh);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const TEX = {};
function patternMat(kind, base) {
  const key = kind + "|" + base;
  if (TEX[key]) return TEX[key];
  let tex;
  if (kind === "sic")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      for (let q = 0; q < 4; q += 2)
        g.fillRect((q * w) / 4, hh * 0.78, w / 4, hh * 0.22);
      g.fillRect(0, hh * 0.4, w, hh * 0.035);
      g.fillRect(0, hh * 0.04, w, hh * 0.02);
      g.fillRect(w / 8, hh * 0.08, w / 8, hh * 0.25);
      g.fillRect((5 * w) / 8, hh * 0.08, w / 8, hh * 0.25);
      g.fillStyle = "#b22";
      g.font = "bold 34px sans-serif";
      g.save();
      g.translate(w * 0.62, hh * 0.45);
      g.rotate(Math.PI / 2);
      g.fillText("USA", 0, 0);
      g.restore();
    });
  else if (kind === "sivb")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      g.fillRect(0, hh * 0.7, w / 4, hh * 0.3);
      g.fillRect(w / 2, hh * 0.7, w / 4, hh * 0.3);
      g.fillRect(0, hh * 0.0, w, hh * 0.05);
    });
  else if (kind === "band")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#151515";
      g.fillRect(0, 0, w, hh * 0.08);
    });
  else if (kind === "bands")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "rgba(0,0,0,.25)";
      for (let i = 1; i < 5; i++) g.fillRect(0, (hh * i) / 5, w, 3);
    });
  else if (kind === "tiles")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = "#c4c9cf";
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#16181b";
      g.fillRect(w * 0.5, 0, w * 0.5, hh);
      g.strokeStyle = "rgba(255,255,255,.05)";
      for (let y = 0; y < hh; y += 6) {
        g.beginPath();
        g.moveTo(w * 0.5, y);
        g.lineTo(w, y);
        g.stroke();
      }
    });
  else if (kind === "flagcn")
    tex = stripeTex((g, w, hh) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, hh);
      g.fillStyle = "#d62a1e";
      g.fillRect(w * 0.42, hh * 0.62, w * 0.14, hh * 0.08);
      g.fillStyle = "#f5d000";
      g.fillRect(w * 0.43, hh * 0.68, w * 0.02, hh * 0.012);
    });
  else if (kind === "chute")
    tex = stripeTex(
      (g, w, hh) => {
        for (let i = 0; i < 16; i++) {
          g.fillStyle = i % 2 ? "#f2efe8" : base;
          g.fillRect((i * w) / 16, 0, w / 16 + 1, hh);
        }
        g.fillStyle = "rgba(0,0,0,.12)";
        g.fillRect(0, 0, w, hh * 0.06);
      },
      256,
      64,
    );
  const kindM = kind === "tiles" ? "metal" : "paint";
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: kind === "tiles" ? 0.45 : 0.55,
    metalness: kind === "tiles" ? 0.4 : 0.05,
    side: kind === "chute" ? THREE.DoubleSide : THREE.FrontSide,
  });
  TEX[key] = m;
  return m;
}
function engineLayout(eng) {
  const s = eng.spread || 0,
    out = [];
  switch (eng.layout) {
    case "pair":
      out.push([s / 2 + eng.r * 0.2, 0], [-(s / 2 + eng.r * 0.2), 0]);
      break;
    case "cross":
      out.push([0, 0]);
      for (let k = 0; k < 4; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 2 + Math.PI / 4),
          s * Math.sin((k * Math.PI) / 2 + Math.PI / 4),
        ]);
      break;
    case "square":
      for (let k = 0; k < 4; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 2 + Math.PI / 4),
          s * Math.sin((k * Math.PI) / 2 + Math.PI / 4),
        ]);
      break;
    case "octaweb":
      out.push([0, 0]);
      for (let k = 0; k < 8; k++)
        out.push([
          s * Math.cos((k * Math.PI) / 4),
          s * Math.sin((k * Math.PI) / 4),
        ]);
      break;
    case "raptor33":
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.22 * Math.cos((k * TAU) / 3),
          s * 0.22 * Math.sin((k * TAU) / 3),
        ]);
      for (let k = 0; k < 10; k++)
        out.push([
          s * 0.58 * Math.cos((k * TAU) / 10),
          s * 0.58 * Math.sin((k * TAU) / 10),
        ]);
      for (let k = 0; k < 20; k++)
        out.push([
          s * 0.95 * Math.cos((k * TAU) / 20 + 0.1),
          s * 0.95 * Math.sin((k * TAU) / 20 + 0.1),
        ]);
      break;
    case "ship6":
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.32 * Math.cos((k * TAU) / 3),
          s * 0.32 * Math.sin((k * TAU) / 3),
        ]);
      for (let k = 0; k < 3; k++)
        out.push([
          s * 0.9 * Math.cos((k * TAU) / 3 + Math.PI / 3),
          s * 0.9 * Math.sin((k * TAU) / 3 + Math.PI / 3),
          1,
        ]);
      break;
    default:
      out.push([0, 0]);
  }
  return out;
}
// one launcher stage: bottom at y = 0, engine bells hanging below (or, eng.y0, inside the interstage below the stage's own
// structure), returns {group, len, rTop, rBottom, engLen}. opts.ist === false: the aft interstage (geom piece ist) is gone.
function buildStage(st, opts = {}) {
  const g = new THREE.Group();
  let y = 0,
    rTop = 0,
    rBottom = st.geom[0][1];
  for (const [len, rb, rt, color, o = {}] of st.geom) {
    if (o.ist && opts.ist === false) {
      y += len;
      rTop = rt;
      continue;
    }
    let m;
    if (o.roll === "sic") m = patternMat("sic", color);
    else if (o.roll === "sivb") m = patternMat("sivb", color);
    else if (o.band) m = patternMat("band", color);
    else if (o.bands) m = patternMat("bands", color);
    else if (o.tiles) m = patternMat("tiles", color);
    else if (o.flag === "cn") m = patternMat("flagcn", color);
    else
      m = mat(color, /#b9bec5|#d6d9de|steel/.test(color) ? "metal" : "paint");
    const c = cyl(rb, rt, len, m, 48);
    c.position.y = y;
    g.add(c);
    y += len;
    rTop = rt;
  }
  const eng = st.eng;
  if (eng)
    for (const p of engineLayout(eng)) {
      const big = p[2] ? 1.7 : 1;
      const b = bell(eng.len * big, eng.r * big);
      b.position.set(p[0], eng.y0 ?? -eng.len * big, p[1]);
      g.add(b);
    }
  if (st.fins)
    for (let k = 0; k < st.fins.n; k++) {
      const f = box(0.35, st.fins.len, st.fins.span, mat(st.fins.color));
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      f.position.set(
        Math.cos(a) * (rBottom + st.fins.span / 2 - 0.3),
        -1.2,
        Math.sin(a) * (rBottom + st.fins.span / 2 - 0.3),
      );
      f.rotation.y = -a;
      g.add(f);
      const fa = cyl(1.1, 0.6, 4.5, mat(st.fins.color));
      fa.position.set(
        Math.cos(a) * rBottom * 0.92,
        -1.2,
        Math.sin(a) * rBottom * 0.92,
      );
      g.add(fa);
    }
  if (st.gridfins)
    for (let k = 0; k < 4; k++) {
      const f = box(3.0, 2.2, 0.3, mat("#2b2d30", "metal"));
      const a = (k * Math.PI) / 2;
      f.position.set(
        Math.cos(a) * (rTop + 1.2),
        y - 4,
        Math.sin(a) * (rTop + 1.2),
      );
      f.rotation.y = -a + Math.PI / 2;
      g.add(f);
    }
  if (st.flaps) {
    for (const [yy, sz] of [
      [y - 9, 6.5],
      [6, 9],
    ])
      for (const a of [Math.PI / 2, -Math.PI / 2]) {
        const f = box(0.25, sz, 3.6, mat("#1d1f22", "tile"));
        f.position.set(
          Math.cos(a) * (rTop + 1.0),
          yy,
          Math.sin(a) * (rTop + 1.0),
        );
        g.add(f);
      }
  }
  if (st.look && STAGE_LOOK[st.look]) STAGE_LOOK[st.look](g, st, opts); // drawn by hand over the plain geometry (app/35_atlas.js)
  return {
    group: st.detail ? stageD(st, g, opts) : g,
    len: y,
    rTop,
    rBottom,
    engLen: eng ? -(eng.y0 ?? -eng.len) : 0,
  };
}

// ---------------- spacecraft parts ----------------
function lmDescent(landed) {
  const g = new THREE.Group();
  const body = cyl(2.1, 2.1, 1.65, mat("#c9a043", "gold"), 8);
  body.position.y = 0.0;
  g.add(body);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const pad = cyl(0.47, 0.47, 0.08, mat("#c9a043", "gold"));
    pad.position.set(Math.cos(a) * 4.2, -1.75, Math.sin(a) * 4.2);
    g.add(pad);
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
      mat("#c9a043", "gold"),
    );
    const p0 = new THREE.Vector3(Math.cos(a) * 1.9, 1.2, Math.sin(a) * 1.9),
      p1 = new THREE.Vector3(Math.cos(a) * 4.2, -1.7, Math.sin(a) * 4.2);
    strut.scale.y = p0.distanceTo(p1);
    strut.position.copy(p0).add(p1).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      p1.clone().sub(p0).normalize(),
    );
    g.add(strut);
  }
  const b = bell(1.5, 0.75);
  b.position.y = -1.4;
  g.add(b);
  g.userData.len = 1.65;
  g.userData.engineY = -1.4;
  g.userData.engineR = 0.75;
  g.userData.footY = -1.8;
  return g;
}
function lmAscent() {
  const g = new THREE.Group();
  const cab = box(3.2, 2.4, 2.9, mat("#a7abb1", "metal"));
  g.add(cab);
  const front = box(2.4, 1.6, 0.5, mat("#4b4f55", "dark"));
  front.position.set(0, 0.5, 1.6);
  g.add(front);
  const tun = cyl(0.5, 0.5, 0.7, mat("#c4c8cd", "metal"));
  tun.position.y = 2.4;
  g.add(tun);
  const tank = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 12),
    mat("#b9bdc2", "metal"),
  );
  tank.position.set(-1.8, 1.0, -0.2);
  g.add(tank);
  const tank2 = tank.clone();
  tank2.position.x = 1.8;
  g.add(tank2);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 14, 8, 0, TAU, 0, Math.PI / 2.4),
    mat("#eeeeee", "paint", { side: THREE.DoubleSide }),
  );
  dish.position.set(-1.2, 2.9, -1.0);
  g.add(dish);
  const b = bell(0.9, 0.45);
  b.position.y = -0.85;
  g.add(b);
  g.userData.len = 3.1;
  g.userData.engineY = -0.85;
  g.userData.engineR = 0.45;
  return g;
}
// ---------------- detailed models ----------------
// Vehicles with a 3D model that may be used freely — NASA 3D Resources (free and without copyright), the Smithsonian's
// scans (CC0), models under CC BY (credited in the README and the app) — are drawn with them: assets/<name>.glb, built from
// the originals by tools/models, one node per part the app moves on its own. A file loads the first time a mission needs
// it (preloadDetailedModels at the start of a mission); until it arrives, or if it cannot be loaded, the craft shows its
// built-in model.
const DETAIL = { lib: null, files: {}, ready: {} };
function detailFile(name) {
  if (!DETAIL.files[name]) {
    DETAIL.lib =
      DETAIL.lib ||
      Promise.all([
        import("./" + ASSET("GLTFLoader.js")),
        import("./" + ASSET("meshopt_decoder.module.js")),
      ]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
        const ld = new GLTFLoader();
        ld.setMeshoptDecoder(MeshoptDecoder);
        return ld;
      });
    DETAIL.files[name] = DETAIL.lib
      .then((ld) => ld.loadAsync(ASSET(name + ".glb")))
      .then((gl) => {
        const parts = {};
        for (const n of gl.scene.children) parts[n.name] = n;
        gl.scene.traverse((o) => {
          if (o.isMesh) o.userData.keep = true;
        }); // geometry and materials shared by every copy: never disposed with a craft
        return (DETAIL.ready[name] = parts);
      })
      .catch((e) => {
        console.warn(
          `Detailed model ${name} could not be loaded; using the built-in one.`,
          e,
        );
        return (DETAIL.ready[name] = null);
      });
  }
  return DETAIL.files[name];
}
// A part of a detailed model in place of a built-in one (the fallback, shown until the file arrives). y: where the part's
// origin sits in the fallback's frame; extra(group): pieces the source model leaves out, added beside the part.
function detailPart(name, part, fallback, opt = {}) {
  const g = new THREE.Group();
  g.userData = { ...fallback.userData };
  g.add(fallback);
  const put = (parts) => {
    const src = parts && parts[part];
    if (!src) return;
    const m = new THREE.Group();
    m.add(src.clone());
    m.position.y = opt.y || 0; // (the part's own transform carries the dequantisation of its vertices)
    g.remove(fallback);
    g.add(m);
    if (opt.extra) opt.extra(g);
    refreshBounds(g);
  };
  if (DETAIL.ready[name] !== undefined) put(DETAIL.ready[name]);
  else detailFile(name).then(put);
  return g;
}
// the detailed models a mission will show, loaded while the countdown runs
function preloadDetailedModels(md) {
  const want = new Set();
  for (const o of md.M.objects)
    for (const cf of o.configs) {
      const L = cf.label || {},
        sc = L.sc || o.model,
        parts = L.parts || [];
      if (
        (sc === "apollo" || sc === "apolloCSM") &&
        parts.some((p) => p === "lander" || p === "descent" || p === "ascent")
      )
        want.add("apollo_lm");
      if (
        sc === "msl" &&
        (parts.includes("lander") ||
          (parts.includes("aeroshell") && L.hs === false))
      )
        want.add("perseverance"); // (the rover shows once the heat shield is gone)
      if (o.model === "shuttle") want.add("orbiter");
      if (L.orbiter) orbiterLivery(L.orbiter); // the flight's orbiter in its markings (the stack's and the orbiter's own configurations)
      if (o.model === "iss") want.add("iss");
      if (L.launcher && LAUNCHERS[L.launcher])
        for (const st of LAUNCHERS[L.launcher].stages)
          if (st.detail) want.add(st.detail); // launch stacks and spent stages
    }
  for (const n of want) detailFile(n);
}
// a model's bounds after a detailed part replaced its built-in one (the camera frames a standing vehicle with them)
function refreshBounds(o) {
  let w = o;
  while (w && !(w.userData && w.userData.wrapped)) w = w.parent;
  if (!w) return;
  w.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(w.matrixWorld).invert(),
    bb = new THREE.Box3();
  w.traverse((n) => {
    if (n.isMesh && n.visible && n.geometry) {
      n.geometry.computeBoundingBox &&
        !n.geometry.boundingBox &&
        n.geometry.computeBoundingBox();
      const b = n.geometry.boundingBox
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld));
      bb.union(b);
    }
  });
  if (bb.isEmpty()) return;
  const sz = new THREE.Vector3();
  bb.getSize(sz);
  w.userData.sizeM = Math.max(sz.x, sz.y, sz.z, 1);
  w.userData.bbox = { w: sz.x, h: sz.y, d: sz.z };
  w.userData.bbY = [bb.min.y, bb.max.y];
  const wheels = [];
  w.traverse((n) => {
    if (n.userData && n.userData.wheel) wheels.push(n);
  });
  w.userData.wheels = wheels;
}
// Apollo lunar module: NASA's model, ascent and descent stages apart. Its descent stage keeps the built-in one's frame (feet
// at −1.8 m); its ascent stage's origin is the top of the descent stage, 1.455 m up, where the built-in ascent stage sits
// 1.65 m up. The ascent engine's bell, hidden inside the descent stage in NASA's model, is added for liftoff.
// Mars 2020 Perseverance: NASA's model, its six wheels apart so they turn (each wheel's node carries its radius), its legs
// apart, and its mast apart, folded on the deck for the landing and raised on the surface (the node carries the axis and
// angle). Stowed for the landing (NASA's drawing of the spacecraft, PIA24128) the wheels are folded up beside the body and
// the legs are not shown; userData.mobility(f) unfolds them, from f = 0 (stowed) to 1 (as the model is).
const ROVER_STOW = [
  // wheel0 … wheel5 (rear, middle, front; left, right): its centre when stowed, and its turn (x, y, z, rad)
  [
    [-0.97, 0.97, -1.02],
    [0.35, 0, 0.3],
  ],
  [
    [0.97, 0.97, -1.02],
    [0.35, 0, -0.3],
  ],
  [
    [-1.0, 0.98, -0.07],
    [0, 0, 0.15],
  ],
  [
    [1.0, 0.98, -0.07],
    [0, 0, -0.15],
  ],
  [
    [-0.97, 0.97, 0.98],
    [-0.35, 0, 0.3],
  ],
  [
    [0.97, 0.97, 0.98],
    [-0.35, 0, -0.3],
  ],
];
function roverD(landed, stowed) {
  let f = stowed ? 0 : 1,
    legs = null;
  const W = [],
    q0 = new THREE.Quaternion();
  const pose = () => {
    for (const w of W) {
      w.piv.position.lerpVectors(w.p1, w.p0, f);
      w.piv.quaternion.slerpQuaternions(w.q1, q0, f);
    }
    if (legs) legs.visible = f > 0.85;
  };
  const g = detailPart("perseverance", "body", rover(1), {
    extra: (g) => {
      const P = DETAIL.ready.perseverance;
      for (let i = 0; i < 6; i++)
        if (P["wheel" + i]) {
          // each wheel in a pivot of its own (the wheel itself turns as it rolls)
          const w = P["wheel" + i].clone(),
            piv = new THREE.Group();
          piv.position.copy(w.position);
          w.position.set(0, 0, 0);
          piv.add(w);
          g.add(piv);
          W.push({
            piv,
            p0: piv.position.clone(),
            p1: new THREE.Vector3(...ROVER_STOW[i][0]),
            q1: new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...ROVER_STOW[i][1]),
            ),
          });
        }
      if (P.legs) {
        legs = P.legs.clone();
        g.add(legs);
      }
      if (P.mast) {
        const m = P.mast.clone(),
          d = m.userData.deploy;
        if (landed && d)
          m.quaternion.setFromAxisAngle(
            new THREE.Vector3(d[0], d[1], d[2]),
            d[3],
          );
        g.add(m);
      }
      pose();
    },
  });
  g.userData.mobility = (x) => {
    if (x !== f) {
      f = x;
      pose();
    }
  };
  return g;
}
function lmDescentD(landed) {
  return detailPart("apollo_lm", "descent", lmDescent(landed));
}
// Saturn V: a textured model (CC BY: BoldlyBuilding, credited in the README and the app), cut into its stages and stretched
// to their published lengths by tools/models; a stage of a launcher with detail: <file> is its part of that file, named
// after the stage, in the stage's own frame. The S-II's aft interstage is a part of its own, there until it is dropped.
// The model is a shell: where it is cut the stages are open, and the J-2s inside the interstages are not in it. These are
// added: a bulkhead or heat shield across each open end ([y, r, kind]) and the bells.
const STAGE_D = {
  "saturnv:S-IC": { caps: [[38.6, 5.0, "metal"]] }, // the forward bulkhead, under the top of the forward skirt
  "saturnv:S-II": {
    caps: [
      [5.52, 5.0, "dark"],
      [24.87, 5.0, "metal"],
    ],
    bells: true,
  }, // the heat shield at the base of the aft skirt; the forward bulkhead inside the cone
  "saturnv:S-IVB": {
    caps: [
      [0.3, 3.25, "dark"],
      [14.47, 3.25, "metal"],
    ],
    bells: true,
  }, // the thrust structure above the cone; the top of the instrument unit
};
// Space Shuttle: the external tank and the boosters of a CC BY model of the stack (paburoviii, credited in the README and the
// app), scaled to their published sizes by tools/models; the orbiter is the Smithsonian's scan. STS-1 and STS-2 flew tanks
// painted white (opts.white): the foam's colour map turns to white paint over the same foam, its texture and the darker
// intertank showing through more faintly (0.188: the map's mean luminance).
const ET_WHITE = new WeakMap();
function etWhite(foam) {
  let m = ET_WHITE.get(foam);
  if (m) return m;
  m = foam.clone();
  m.roughness = 0.6;
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\n  diffuseColor.rgb = vec3(0.79, 0.776, 0.716) * mix(1.0, dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / 0.188, 0.55);",
    );
  };
  m.customProgramCacheKey = () => "etWhite";
  ET_WHITE.set(foam, m);
  return m;
}
function stageD(st, fallback, opts) {
  const D = STAGE_D[st.detail + ":" + st.id] || {};
  return detailPart(st.detail, st.id, fallback, {
    extra: (g) => {
      const P = DETAIL.ready[st.detail];
      if (opts.white)
        g.traverse((o) => {
          if (
            o.isMesh &&
            o.material &&
            o.material.map &&
            /Orange/.test(o.material.name)
          )
            o.material = etWhite(o.material);
        });
      if (P.IST && st.geom[0][4] && st.geom[0][4].ist && opts.ist !== false)
        g.add(P.IST.clone());
      for (const [y, r, kind] of D.caps || []) {
        const c = cyl(
          r,
          r,
          0.06,
          kind === "dark" ? mat("#2e3135", "dark") : mat("#9a9fa5", "metal"),
          32,
        );
        c.position.y = y - 0.03;
        g.add(c);
      }
      if (D.bells)
        for (const p of engineLayout(st.eng)) {
          const b = bell(st.eng.len, st.eng.r);
          b.position.set(p[0], st.eng.y0, p[1]);
          g.add(b);
        }
    },
  });
}
function lmAscentD() {
  return detailPart("apollo_lm", "ascent", lmAscent(), {
    y: -0.195,
    extra: (g) => {
      const b = bell(0.75, 0.39);
      b.position.y = -0.85;
      g.add(b);
    },
  });
}
function solarWing(len, width, panels, color = "#1b2a4a") {
  const g = new THREE.Group();
  const pw = len / panels;
  for (let i = 0; i < panels; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(pw * 0.96, 0.05, width),
      mat(color, "solar"),
    );
    p.position.x = pw * (i + 0.5);
    g.add(p);
  }
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.08, 0.08),
    mat("#9aa0a6", "metal"),
  );
  boom.position.x = len / 2;
  g.add(boom);
  return g;
}
function orionCM(withLAS) {
  const g = new THREE.Group();
  const cm = cyl(2.51, 0.75, 3.3, mat("#b7bcc2", "metal"));
  g.add(cm);
  const hs = cyl(2.52, 2.51, 0.2, mat("#5a3b22", "dark"));
  hs.position.y = -0.2;
  g.add(hs);
  const win = box(0.35, 0.3, 0.05, mat("#0a0c10", "glass"));
  win.position.set(0, 1.6, 1.62);
  g.add(win);
  if (withLAS) {
    const fair = cyl(2.6, 0.7, 3.9, mat("#ecebe6"));
    fair.position.y = -0.1;
    g.add(fair);
    const tower = cyl(0.45, 0.45, 9.0, mat("#ecebe6"));
    tower.position.y = 3.8;
    g.add(tower);
    const nose = cyl(0.45, 0.05, 1.6, mat("#ecebe6"));
    nose.position.y = 12.8;
    g.add(nose);
    for (let k = 0; k < 4; k++) {
      const nz = cyl(0.25, 0.4, 0.6, mat("#2b2b2b", "dark"));
      const a = (k * Math.PI) / 2;
      nz.position.set(Math.cos(a) * 0.5, 4.3, Math.sin(a) * 0.5);
      g.add(nz);
    }
  }
  g.userData.len = withLAS ? 14.4 : 3.5;
  g.userData.r = 2.51;
  return g;
}
function orionESM(folded) {
  const g = new THREE.Group();
  const body = cyl(2.05, 2.05, 4.0, mat("#e9e7e2", "paint"));
  g.add(body);
  const top = cyl(2.05, 2.5, 0.6, mat("#d6d6d0", "paint"));
  top.position.y = 4.0;
  g.add(top);
  if (!folded)
    for (let k = 0; k < 4; k++) {
      const w = solarWing(7.0, 2.0, 3);
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      w.position.set(Math.cos(a) * 2.05, 1.2, Math.sin(a) * 2.05);
      w.rotation.y = -a;
      w.rotation.z = -0.35;
      g.add(w);
    }
  const b = bell(1.9, 0.6);
  b.position.y = -1.9;
  g.add(b);
  g.userData.len = 4.6;
  g.userData.engineY = -1.9;
  g.userData.engineR = 0.6;
  return g;
}
function probeBus(w, hgt, d, color = "#c9a043", kind = "gold") {
  return box(w, hgt, d, mat(color, kind));
}
function dish(r, color = "#ececec") {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 10, 0, TAU, 0, Math.PI / 3.2),
    mat(color, "paint", { side: THREE.DoubleSide }),
  );
  return m;
}
function legsQuad(r, h2, color = "#c9a043") {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    const p0 = new THREE.Vector3(
        Math.cos(a) * r * 0.7,
        0.3,
        Math.sin(a) * r * 0.7,
      ),
      p1 = new THREE.Vector3(Math.cos(a) * r * 1.5, -h2, Math.sin(a) * r * 1.5);
    const s = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
      mat(color, "gold"),
    );
    s.scale.y = p0.distanceTo(p1);
    s.position.copy(p0).add(p1).multiplyScalar(0.5);
    s.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      p1.clone().sub(p0).normalize(),
    );
    g.add(s);
    const pad = cyl(0.22, 0.22, 0.05, mat(color, "gold"));
    pad.position.copy(p1);
    g.add(pad);
  }
  return g;
}
function aeroshell(r, backH, color = "#e9e6df") {
  const g = new THREE.Group();
  const hs = cyl(r, r * 0.25, r * 0.36, mat("#6b4a2c", "dark"));
  hs.rotation.x = Math.PI;
  hs.position.y = r * 0.36;
  g.add(hs); // 70° sphere-cone, nose down
  const bs = cyl(r, r * 0.42, backH, mat(color, "paint"));
  bs.position.y = r * 0.36;
  g.add(bs);
  const cap = cyl(r * 0.42, r * 0.3, backH * 0.2, mat(color, "paint"));
  cap.position.y = r * 0.36 + backH;
  g.add(cap);
  g.userData.len = r * 0.36 + backH * 1.2;
  return g;
}
function rover(scale = 1, color = "#e9e6df") {
  const g = new THREE.Group();
  const body = box(2.2 * scale, 0.7 * scale, 2.9 * scale, mat(color, "paint"));
  body.position.y = 0.55 * scale;
  g.add(body);
  for (const sx of [-1, 1])
    for (const sz of [-1, 0, 1]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26 * scale, 0.26 * scale, 0.4 * scale, 16),
        mat("#6a6d72", "metal"),
      );
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.25 * scale, 0.26 * scale, sz * 1.1 * scale);
      w.userData.wheel = 0.26 * scale;
      g.add(w);
      // tread cleats so the wheels visibly turn
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const cl = new THREE.Mesh(
          new THREE.BoxGeometry(0.05 * scale, 0.42 * scale, 0.06 * scale),
          mat("#3e4044", "dark"),
        );
        cl.position.set(
          Math.cos(a) * 0.255 * scale,
          0,
          Math.sin(a) * 0.255 * scale,
        );
        cl.rotation.y = -a;
        w.add(cl);
      }
    }
  const mast = cyl(
    0.08 * scale,
    0.08 * scale,
    1.4 * scale,
    mat("#cfcfcf", "metal"),
  );
  mast.position.set(0.6 * scale, 1.2 * scale, 1.0 * scale);
  g.add(mast);
  const head = box(0.6 * scale, 0.3 * scale, 0.3 * scale, mat("#e5e5e5"));
  head.position.set(0.6 * scale, 2.6 * scale, 1.0 * scale);
  g.add(head);
  const rtg = cyl(
    0.3 * scale,
    0.3 * scale,
    0.9 * scale,
    mat("#3a3a3a", "dark"),
  );
  rtg.rotation.x = 1.0;
  rtg.position.set(0, 0.9 * scale, -1.6 * scale);
  g.add(rtg);
  return g;
}
function sampleLander(withRover, color = "#c9a043") {
  const g = new THREE.Group();
  const deck = cyl(1.6, 1.6, 0.9, mat(color, "gold"), 8);
  g.add(deck);
  g.add(legsQuad(1.6, 1.2, color));
  const b = bell(0.7, 0.35);
  b.position.y = -0.7;
  g.add(b);
  if (withRover) {
    const rv = rover(0.55, "#d8d3c4");
    rv.position.y = 0.9;
    g.add(rv);
    for (const s of [-1, 1]) {
      const w = solarWing(1.4, 0.8, 2, "#283a63");
      w.position.set(s * 0.5, 1.5, 0);
      if (s < 0) w.rotation.y = Math.PI;
      g.add(w);
    }
  }
  g.userData.len = 0.9;
  g.userData.engineY = -0.7;
  g.userData.engineR = 0.35;
  g.userData.footY = -1.2;
  return g;
}
function starshipShip(landed, withLegs) {
  const st = LAUNCHERS.starship.stages[1];
  const s = buildStage(st);
  const g = s.group;
  if (withLegs || landed)
    for (let k = 0; k < 6; k++) {
      const a = (k * TAU) / 6;
      const leg = box(0.6, 3.2, 0.6, mat("#9aa0a6", "metal"));
      leg.position.set(Math.cos(a) * 4.0, -3.0, Math.sin(a) * 4.0);
      g.add(leg);
    }
  g.userData.len = s.len;
  g.userData.engineY = -st.eng.len;
  g.userData.engineR = 4.0;
  g.userData.footY = withLegs || landed ? -3.0 : -st.eng.len;
  return g;
}

// ---------------- part assemblies by spacecraft model ----------------
// returns Group with userData {mounts:[{y, r, tag}], len, footY}
function stackParts(list) {
  // stack groups vertically (each part built from y=0 upward); returns group
  const g = new THREE.Group();
  let y = 0;
  const mounts = [];
  for (const it of list) {
    const p = it.g;
    p.position.y = y + (it.dy || 0);
    g.add(p);
    if (it.mount)
      mounts.push({
        y: y + (p.userData.engineY ?? 0),
        r: p.userData.engineR || it.r || 1,
        tag: it.mount,
      });
    y += (it.len ?? p.userData.len ?? 1) + (it.gap || 0);
  }
  g.userData.len = y;
  g.userData.mounts = mounts;
  return g;
}
function buildSC(model, parts, flags = {}) {
  if (model === "shuttle") return buildOrbiter(flags);
  if (model === "iss") return issModel(flags);
  if (model === "hubble")
    return hubbleModel({
      arrays: true,
      door: !!flags.door,
      doorT: flags.doorT,
    });
  const P = new Set(parts || []);
  const g = new THREE.Group();
  let inner;
  const mounts = [];
  const has = (k) => P.has(k);
  switch (model) {
    case "apollo":
    case "apolloCSM": {
      const LM = () => {
        const lm = new THREE.Group();
        const ds = lmDescentD();
        const as = lmAscentD();
        as.position.y = 1.65;
        lm.add(ds);
        lm.add(as);
        return lm;
      };
      // the docking ring on top of the ascent stage, above the ascent stage's origin (NASA's model, or the built-in one)
      const ringA = DETAIL.ready.apollo_lm ? 2.924 : 3.1,
        ringLM = 1.65 + ringA;
      if (has("orbiter") && has("lander")) {
        // CSM docked nose-to-nose with the LM (LM inverted above the CM)
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP },
        ]);
        const lm = LM();
        lm.rotation.x = Math.PI;
        lm.position.y = SM_LEN + CM_TOP + ringLM;
        inner.add(lm);
        mounts.push(...inner.userData.mounts, {
          y: SM_LEN + CM_TOP + ringLM + 1.4,
          r: 0.75,
          tag: "LMDS",
          flip: true,
        });
        inner.userData.len = SM_LEN + CM_TOP + ringLM + 1.8;
      } else if (has("capsule") && has("lander")) {
        inner = new THREE.Group();
        inner.add(apolloCM(false));
        const lm = LM();
        lm.rotation.x = Math.PI;
        lm.position.y = CM_TOP + ringLM;
        inner.add(lm);
        mounts.push({
          y: CM_TOP + ringLM + 1.4,
          r: 0.75,
          tag: "LMDS",
          flip: true,
        });
        inner.userData.len = CM_TOP + ringLM + 1.8;
      } else if (has("orbiter") && has("ascent")) {
        // the ascent stage back from the surface, docked to the CM's nose until it is jettisoned
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP },
        ]);
        const a = lmAscentD();
        a.rotation.x = Math.PI;
        a.position.y = SM_LEN + CM_TOP + ringA;
        inner.add(a);
        mounts.push(...inner.userData.mounts);
        inner.userData.len = SM_LEN + CM_TOP + ringA + 0.9;
      } else if (has("orbiter")) {
        inner = stackParts([
          { g: apolloSM(flags.damaged), len: SM_LEN, mount: "SM" },
          { g: apolloCM(false), len: CM_TOP + 0.25 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("lander")) {
        const ds = lmDescentD(flags.landed);
        const as = lmAscentD();
        as.position.y = 1.65;
        inner = new THREE.Group();
        inner.add(ds);
        inner.add(as);
        inner.userData.footY = -1.8;
        mounts.push({ y: -1.4, r: 0.75, tag: "LMDS" });
      } else if (has("descent")) {
        inner = lmDescentD(true);
        inner.userData.footY = -1.8;
      } else if (has("ascent")) {
        inner = lmAscentD();
        mounts.push({ y: -0.85, r: 0.45, tag: "LMAS" });
      } else if (has("capsule")) {
        inner = apolloCM(false, false);
        inner.userData.chuteY = CM_TOP - 0.3;
        inner.userData.capsuleR = 1.96;
      } // the probe stayed in the LM
      else if (has("service")) {
        inner = apolloSM(flags.damaged);
      }
      break;
    }
    case "orion": {
      if (has("orbiter")) {
        inner = stackParts([
          { g: orionESM(false), len: 4.6, mount: "ESM" },
          { g: orionCM(false), len: 3.5 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("capsule")) {
        inner = orionCM(false);
        inner.userData.chuteY = 3.4;
        inner.userData.capsuleR = 2.5;
      } else if (has("service")) inner = orionESM(false);
      break;
    }
    case "change5": {
      const r = ce5Assembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/38_change5.js
    case "mariner": {
      inner = marinerModel(flags);
      mounts.push({ y: -0.12, r: 0.06, tag: "BUS" });
      break;
    } // app/36_mariner.js
    case "msl": {
      const r = m20Assembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/33_mars2020.js
    case "tianwen": {
      const r = twAssembly(P, flags);
      inner = r.inner;
      mounts.push(...r.mounts);
      break;
    } // app/37_tianwen.js
    case "msr": {
      // the sample-return concept: generic parts
      const ORB = () => {
        const o = new THREE.Group();
        o.add(probeBus(2.4, 1.8, 2.4, "#c9a043"));
        for (const s of [-1, 1]) {
          const w = solarWing(5.0, 1.8, 3);
          w.position.set(s * 1.2, 0.9, 0);
          if (s < 0) w.rotation.y = Math.PI;
          o.add(w);
        }
        const dd = dish(1.0);
        dd.position.set(0, 1.9, -0.8);
        o.add(dd);
        const bl = bell(0.7, 0.35);
        bl.position.y = -0.7;
        o.add(bl);
        o.userData.len = 1.8;
        o.userData.engineY = -0.7;
        o.userData.engineR = 0.35;
        return o;
      };
      const CAP = () => {
        const c = aeroshell(1.7, 1.4, "#e8e4dc");
        return c;
      };
      if (has("cruise")) {
        const o = ORB();
        const c = CAP();
        c.rotation.x = Math.PI;
        c.position.y = 1.8 + 2.4;
        inner = new THREE.Group();
        inner.add(o);
        inner.add(c);
        inner.userData.len = 4.2;
        mounts.push({ y: -0.7, r: 0.35, tag: "ORB" });
      } else if (has("orbiter")) {
        inner = ORB();
        mounts.push({ y: -0.7, r: 0.35, tag: "ORB" });
      } else if (has("aeroshell")) {
        inner = CAP();
        inner.userData.chuteY = 2.2;
        inner.userData.capsuleR = 1.7;
        inner.userData.dgb = true;
      } else if (has("lander")) {
        // the lander with the ascent vehicle standing on it
        inner = sampleLander(false, "#d4d6da");
        inner.userData.footY = -1.2;
        if (!flags.landed) mounts.push({ y: -0.7, r: 0.35, tag: "LDR" });
        const mv = new THREE.Group();
        mv.add(cyl(0.28, 0.28, 2.8, mat("#ecebe6")));
        const nc = cyl(0.28, 0.02, 0.6, mat("#ecebe6"));
        nc.position.y = 2.8;
        mv.add(nc);
        mv.position.y = 0.95;
        inner.add(mv);
      } else if (has("mav")) {
        inner = new THREE.Group();
        const r1 = cyl(0.28, 0.28, 2.8, mat("#ecebe6"));
        inner.add(r1);
        const nc = cyl(0.28, 0.02, 0.6, mat("#ecebe6"));
        nc.position.y = 2.8;
        inner.add(nc);
        const b = bell(0.35, 0.22);
        b.position.y = -0.35;
        inner.add(b);
        inner.userData.len = 3.4;
        mounts.push({ y: -0.35, r: 0.22, tag: "MAV" });
      } else if (has("os")) {
        inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 12),
          mat("#e0e0e0", "metal"),
        );
        inner.userData.len = 0.3;
      }
      break;
    }
    case "clipper": {
      inner = new THREE.Group();
      const body = cyl(0.8, 0.8, 3.0, mat("#e6e3dc", "paint"));
      inner.add(body);
      const hga = dish(1.5, "#f2f2ee");
      hga.position.y = 3.6;
      inner.add(hga);
      for (const s of [-1, 1]) {
        const w = solarWing(13.5, 4.1, 5, "#16223e");
        w.position.set(s * 0.8, 1.3, 0);
        if (s < 0) w.rotation.y = Math.PI;
        inner.add(w);
      }
      const mag = cyl(0.03, 0.03, 8.5, mat("#9aa0a6", "metal"));
      mag.rotation.x = Math.PI / 2;
      mag.position.set(0, 0.6, 4.2);
      inner.add(mag);
      inner.userData.len = 3.0;
      mounts.push({ y: -0.1, r: 0.3, tag: "SC" });
      break;
    }
    case "starshipPayload": {
      inner = starshipShip(flags.landed, flags.landed || flags.powered);
      mounts.push({ y: inner.userData.engineY, r: 3.6, tag: "upper" });
      break;
    }
    case "capsuleHab": {
      const cap = () => {
        const c = new THREE.Group();
        c.add(cyl(1.85, 0.75, 2.6, mat("#ecebe6")));
        const hs = cyl(1.86, 1.85, 0.2, mat("#3b2a1a", "dark"));
        hs.position.y = -0.2;
        c.add(hs);
        c.userData.len = 2.6;
        return c;
      };
      if (has("orbiter")) {
        const sm = new THREE.Group();
        sm.add(cyl(1.8, 1.8, 2.2, mat("#dcdcdc", "metal")));
        for (const s of [-1, 1]) {
          const w = solarWing(5.0, 1.8, 3);
          w.position.set(s * 1.8, 1.0, 0);
          if (s < 0) w.rotation.y = Math.PI;
          sm.add(w);
        }
        const bl = bell(1.0, 0.45);
        bl.position.y = -1.0;
        sm.add(bl);
        sm.userData.len = 2.2;
        sm.userData.engineY = -1.0;
        sm.userData.engineR = 0.45;
        const hab = cyl(2.1, 2.1, 4.2, mat("#f1efe8", "fabric"), 32);
        hab.userData.len = 4.2;
        inner = stackParts([
          { g: sm, len: 2.2, mount: "PROP" },
          { g: hab, len: 4.2 },
          { g: cap(), len: 2.6 },
        ]);
        mounts.push(...inner.userData.mounts);
      } else if (has("capsule")) {
        inner = cap();
        inner.userData.chuteY = 2.6;
        inner.userData.capsuleR = 1.85;
      } else if (has("service")) {
        inner = cyl(2.1, 2.1, 4.2, mat("#f1efe8", "fabric"), 32);
      }
      break;
    }
    case "chandrayaan": {
      if (has("orbiter")) {
        inner = new THREE.Group();
        inner.add(probeBus(2.0, 1.6, 2.0));
        const w = solarWing(4.0, 1.4, 2);
        w.position.set(1.0, 0.8, 0);
        inner.add(w);
        const l = sampleLander(true);
        l.position.y = 1.6 + 1.2;
        inner.add(l);
        mounts.push({ y: -0.2, r: 0.3, tag: "PM" });
      } else {
        inner = sampleLander(true);
        inner.userData.footY = -1.2;
        if (!flags.landed) mounts.push({ y: -0.7, r: 0.35, tag: "LDR" });
      }
      break;
    }
  }
  if (!inner) {
    inner = probeBus(1.5, 1.5, 1.5, "#c9a043");
    inner.userData.len = 1.5;
    mounts.push({ y: 0, r: 0.3, tag: "any" });
  }
  g.add(inner);
  const iu = inner.userData;
  g.userData = {
    len: iu.len || 2,
    mounts,
    footY: iu.footY,
    chuteY: iu.chuteY,
    capsuleR: iu.capsuleR,
    dgb: iu.dgb,
    yc0: iu.yc0,
    animate: iu.animate,
  };
  return g;
}
// stowed spacecraft on top of an upper stage (inside adapters / fairings)
function buildStowed(model, rBelow, fl = {}) {
  const les = !!fl.les,
    saj = !!fl.saj;
  const g = new THREE.Group();
  let y = 0;
  if (model === "apollo" || model === "apolloCSM") {
    const sla = cyl(3.3, 1.96, 8.5, mat("#e7e5df"));
    g.add(sla);
    y = 8.5;
    const sm = apolloSM(false, true);
    sm.position.y = y;
    g.add(sm);
    y += SM_LEN;
    const cm = apolloCM(les);
    cm.position.y = y;
    g.add(cm);
    y += cm.userData.len;
    g.userData = {
      len: y,
      mounts: [
        { y: 8.5 + sm.userData.engineY, r: sm.userData.engineR, tag: "SM" },
      ],
    };
    return g;
  }
  if (model === "orion") {
    const ad = cyl(2.55, 2.05, 1.6, mat("#d9d6cf"));
    g.add(ad);
    y = 1.6;
    const esm = orionESM(true);
    esm.position.y = y + 1.9;
    g.add(esm);
    const fair = cyl(2.6, 2.6, 5.9, mat("#efeee9"));
    fair.position.y = y;
    if (saj) g.add(fair);
    y += 1.9 + 4.6;
    const cm = orionCM(les);
    cm.position.y = y;
    g.add(cm);
    y += cm.userData.len;
    g.userData = { len: y, mounts: [{ y: 1.6, r: 0.6, tag: "ESM" }] };
    return g;
  }
  if (model === "starshipPayload") {
    g.userData = { len: 0, mounts: [] };
    return g;
  }
  if (model === "mariner") {
    // on the Agena's adapter (app/35_atlas.js), the panels folded up
    const sc = buildSC(model, ["orbiter"], { stowed: true });
    sc.position.y = 0.35;
    g.add(sc);
    g.userData = {
      len: 0.35 + 2.89,
      mounts: sc.userData.mounts.map((m) => ({ ...m, y: m.y + 0.35 })),
    };
    return g;
  }
  const ad = cyl(Math.min(rBelow, 1.6), 0.8, 1.0, mat("#bdbdbd", "metal"));
  g.add(ad);
  if (model === "tianwen" || model === "change5") {
    // on Long March 5's adapter cone, folded up (app/37_tianwen.js, app/38_change5.js)
    const ad = cyl(
      1.55,
      0.62,
      1.0,
      mat("#c4c8cd", "metal", { side: THREE.DoubleSide }),
      48,
      true,
    );
    g.add(ad);
    const sc = buildSC(
      model,
      model === "tianwen" ? ["cruise"] : ["orbiter", "lander"],
      { stowed: true },
    );
    sc.position.y = 1.0 + 0.12;
    g.add(sc);
    g.userData = {
      len: 1.12 + sc.userData.len,
      mounts: sc.userData.mounts.map((m) => ({ ...m, y: m.y + 1.12 })),
    };
    return g;
  }
  const sc = buildSC(
    model,
    model === "msl" || model === "msr" ? ["cruise"] : ["orbiter"],
  );
  sc.position.y = 1.0 + 0.8;
  g.add(sc);
  g.userData = {
    len: 1.8 + (sc.userData.len || 2),
    mounts: (sc.userData.mounts || []).map((m) => ({ ...m, y: m.y + 1.8 })),
  };
  return g;
}
// full launch stack from launcher config
function buildLaunchStack(lkey, scModel, c) {
  const L = LAUNCHERS[lkey];
  if (L.sideMount) return buildShuttleStack(L, c);
  const g = new THREE.Group();
  const mounts = [];
  const core = L.stages
    .map((s, i) => ({ s, i }))
    .filter((o) => !o.s.parallel && o.i >= (c.stFrom || 0));
  let y = 0,
    firstCoreY = null,
    rCore = 1;
  for (const { s, i } of core) {
    const st = buildStage(s, { ist: c.ist });
    st.group.position.y = y;
    g.add(st.group);
    mounts.push({
      y: y - st.engLen,
      r: Math.max(s.geom[0][1] * 0.75, s.eng ? s.eng.r * 1.2 : 1),
      tag: "stage:" + s.id,
      prop: s.prop,
      idx: i,
    });
    if (firstCoreY == null) {
      firstCoreY = y;
      rCore = s.geom[0][1];
    }
    y += st.len;
  }
  const bst = L.stages[0].parallel ? L.stages[0] : null;
  if (bst && c.boosters) {
    const n = bst.booster.count,
      off = bst.booster.offset;
    for (let k = 0; k < n; k++) {
      const a = n === 2 ? k * Math.PI : (k * Math.PI) / 2 + Math.PI / 4;
      const b = buildStage(bst);
      b.group.position.set(
        Math.cos(a) * off,
        (firstCoreY || 0) + 0.5,
        Math.sin(a) * off,
      );
      g.add(b.group);
      mounts.push({
        y: (firstCoreY || 0) + 0.5 - b.engLen,
        r: Math.max(bst.geom[0][1] * 0.8, 0.6),
        x: Math.cos(a) * off,
        z: Math.sin(a) * off,
        tag: "stage:" + bst.id,
        prop: bst.prop,
        idx: 0,
      });
    }
  }
  const topR = core.length
    ? core[core.length - 1].s.geom[core[core.length - 1].s.geom.length - 1][2]
    : 2;
  const PF = L.payloadFairing;
  if (PF && c.fairing) {
    const yF =
      PF.encloseUpper && core.length >= 2
        ? y - core[core.length - 1].s.geom.reduce((a, gg) => a + gg[0], 0) - 0.5
        : y;
    const f = ogive(PF.r, PF.len, mat(PF.color), PF.cyl ?? 0.45);
    f.position.y = yF;
    g.add(f);
    y = yF + PF.len;
  } else if (lkey !== "starship") {
    const st = buildStowed(scModel, topR, { les: c.les, saj: c.saj });
    st.position.y = y;
    g.add(st);
    y += st.userData.len;
  }
  g.userData = { len: y, mounts };
  return g;
}
function buildStageOnly(lkey, idx, withAdapter, variant) {
  const L = LAUNCHERS[lkey];
  let s = L.stages[idx];
  if (variant === "sts1" && lkey === "shuttle" && idx === 1)
    s = {
      ...s,
      geom: s.geom.map((p) => [
        p[0],
        p[1],
        p[2],
        p[3] === "#4a4a4a" ? p[3] : "#e9e7e0",
        p[4],
      ]),
    }; // STS-1's painted (white) tank
  const st = buildStage(s, {
    ist: false,
    white: variant === "sts1" && lkey === "shuttle" && idx === 1,
  }); // (a spent stage's aft interstage went long before)
  if (s.parallel && s.booster) {
    // drop all boosters together
    const g = new THREE.Group();
    const n = s.booster.count,
      off = s.booster.offset;
    for (let k = 0; k < n; k++) {
      const a = n === 2 ? k * Math.PI : (k * Math.PI) / 2 + Math.PI / 4;
      const b = k === 0 ? st : buildStage(s);
      b.group.position.set(Math.cos(a) * off, 0, Math.sin(a) * off);
      if (n === 2 && k === 1) b.group.scale.x = -1;
      g.add(b.group);
    } // a pair: mirror images
    g.userData = { len: st.len, mounts: [] };
    return g;
  }
  if (withAdapter) {
    const sla = cyl(3.3, 3.3, 1.0, mat("#e7e5df"));
    sla.position.y = st.len;
    st.group.add(sla);
    for (let k = 0; k < 4; k++) {
      const p = box(2.6, 7.0, 0.1, mat("#e7e5df"));
      const a = (k * Math.PI) / 2;
      p.position.set(Math.cos(a) * 4.5, st.len - 1, Math.sin(a) * 4.5);
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.x = 0.7;
      st.group.add(p);
    }
  }
  st.group.userData = {
    len: st.len,
    mounts: [
      { y: -st.engLen, r: s.geom[0][1] * 0.6, tag: "upper", prop: s.prop },
    ],
  };
  return st.group;
}
// a launcher's aft interstage after it has been dropped (the S-II's): the first piece of its stage's geometry, an open ring
function buildInterstage(lkey) {
  const st = LAUNCHERS[lkey].stages.find(
      (s) => s.geom[0][4] && s.geom[0][4].ist,
    ),
    [len, rb, rt, color] = st.geom[0];
  const ring = cyl(rb, rt, len, patternMat("band", color), 48, true);
  ring.material = ring.material.clone();
  ring.material.side = THREE.DoubleSide;
  const g = st.detail ? detailPart(st.detail, "IST", ring) : ring;
  g.userData = { len, mounts: [] };
  return g;
}
// center a model on its bounding-box centre along Y and record offsets
function finishModel(g) {
  const len = g.userData.len || 1;
  const yc = g.userData.yc0 ?? len * 0.45; // yc0: models whose origin is their reference point (the orbiter's, the ISS's)
  const wrap = new THREE.Group();
  g.position.y = -yc;
  wrap.add(g);
  wrap.userData = { ...g.userData, yc, wrapped: true };
  wrap.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(wrap);
  const sz = new THREE.Vector3();
  bb.getSize(sz);
  wrap.userData.sizeM = Math.max(sz.x, sz.y, sz.z, 1); // largest dimension in metres (solar arrays included)
  wrap.userData.bbox = { w: sz.x, h: sz.y, d: sz.z };
  wrap.userData.bbY = [bb.min.y, bb.max.y]; // lowest and highest point along the axis, metres (the camera frames a standing vehicle with it)
  const wheels = [];
  wrap.traverse((n) => {
    if (n.userData && n.userData.wheel) wheels.push(n);
  });
  wrap.userData.wheels = wheels;
  return wrap;
}
function modelForConfig(cfgL, objModel) {
  const c = cfgL || { key: "sc", sc: objModel, parts: ["orbiter"] };
  let g;
  if (c.key === "launch") g = buildLaunchStack(c.launcher, objModel, c);
  else if (c.key === "stack") {
    const L = LAUNCHERS[c.launcher];
    const up = buildStageOnly(c.launcher, c.stage, false);
    const gg = new THREE.Group();
    gg.add(up);
    let y = up.userData.len;
    const mounts = [
      {
        y: up.userData.mounts[0].y,
        r: up.userData.mounts[0].r,
        tag: "upper",
        prop: L.stages[c.stage].prop,
      },
    ];
    if (c.launcher !== "starship") {
      const st = buildStowed(c.sc, L.stages[c.stage].geom.slice(-1)[0][2], {});
      st.position.y = y;
      gg.add(st);
      for (const m of st.userData.mounts) mounts.push({ ...m, y: m.y + y });
      y += st.userData.len;
    }
    gg.userData = { len: y, mounts };
    g = gg;
  } else if (c.key === "stage")
    g = buildStageOnly(c.launcher, c.stage, c.withAdapter, c.variant);
  else if (c.key === "ist") g = buildInterstage(c.launcher);
  else if (c.key === "capsule") g = buildSC(c.sc, ["capsule"], {});
  else g = buildSC(c.sc || objModel, c.parts, c);
  return finishModel(g);
}

// ---------------- plumes, chutes, plasma ----------------
const GLSL_PLUME_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const GLSL_PLUME_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform vec3 uCore; uniform float uI; uniform float uTime; uniform float uDiam; uniform float uDF; uniform float uDL; uniform float uCF;
varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){
  #include <logdepthbuf_fragment>
  // (clamped: with multisampling, a pixel on the cone's rim can be shaded at its centre just outside the cone, where vUv
  // runs past 0…1, and pow() of a number below 0 is undefined: NaN on most GPUs, a black dot under the film look)
  float along = clamp(1.0 - vUv.y, 0.0, 1.0);
  vec3 V = normalize(cameraPosition - vP);
  float edge = abs(dot(normalize(vN), V));
  float body = pow(edge, 1.3) * pow(1.0 - along, 1.6);
  float flick = 0.85 + 0.15 * sin(uTime * 37.0 + along * 23.0) * sin(uTime * 11.0);
  // shock diamonds: spaced by the nozzle size and confined to the stretch just behind it, however long the flame
  float diam = uDiam * smoothstep(0.55, 1.0, sin(along * uDF - uTime * 3.0)) * (1.0 - smoothstep(uDL * 0.55, uDL, along)) * (1.0 - along) * edge;
  vec3 col = mix(uCore, uColor, smoothstep(0.0, uCF, along));
  gl_FragColor = vec4(col * (body * flick + diam * 0.8) * uI, 1.0);
}`;
function makePlume() {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
  geo.translate(0, -0.5, 0); // top (v=1) at y=0, extends to y=-1
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_PLUME_V,
    fragmentShader: GLSL_PLUME_F,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uCore: { value: new THREE.Color() },
      uI: { value: 1 },
      uTime: { value: 0 },
      uDiam: { value: 0 },
      uDF: { value: 46 },
      uDL: { value: 1 },
      uCF: { value: 0.45 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return mesh;
}
// shapes the open cone: radius at the nozzle r0, at the tail r1, length len
function shapePlume(p, r0, r1, len) {
  const pos = p.geometry.attributes.position;
  if (!p.userData.base) p.userData.base = Float32Array.from(pos.array);
  const b = p.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const x = b[3 * i],
      y = b[3 * i + 1],
      z = b[3 * i + 2];
    const f = -y;
    const r = r0 + (r1 - r0) * Math.pow(f, 0.7);
    pos.array[3 * i] = x * r;
    pos.array[3 * i + 1] = y * len;
    pos.array[3 * i + 2] = z * r;
  }
  pos.needsUpdate = true;
}
function makeChutes(kind, n, diam, capR) {
  const g = new THREE.Group();
  const colr = kind === "dgb" ? "#d9662b" : "#e05a25";
  const canopy = new THREE.SphereGeometry(
    diam / 2,
    32,
    10,
    0,
    TAU,
    0,
    Math.PI / 2.4,
  );
  const matC = patternMat("chute", colr);
  const offs =
    n === 3
      ? [
          [-0.55, 0],
          [0.55, 0],
          [0, 0.6],
        ]
      : n === 2
        ? [
            [-0.5, 0],
            [0.5, 0],
          ]
        : [[0, 0]];
  const riser = diam * 1.25;
  for (const [ox, oz] of offs) {
    const c = new THREE.Mesh(canopy, matC);
    const cx = ox * diam * 0.85,
      cz = oz * diam * 0.85;
    c.position.set(cx, riser, cz);
    g.add(c);
    const pts = [];
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12;
      const rr = (diam / 2) * Math.sin(Math.PI / 2.4);
      pts.push(
        new THREE.Vector3(
          cx + Math.cos(a) * rr,
          riser + (diam / 2) * Math.cos(Math.PI / 2.4),
          cz + Math.sin(a) * rr,
        ),
        new THREE.Vector3(0, 0, 0),
      );
    }
    g.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: 0xbbbbbb,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );
  }
  return g;
}
// The shock layer of an entry and its glowing wake. Coming into an atmosphere at several km/s, a vehicle drives a shock wave
// ahead of the faces turned into the flow; the air squeezed between the shock and those faces is heated to thousands of
// degrees and glows. It is brightest where the flow meets the surface head on (a capsule's heat shield; the Shuttle's nose
// cap and wing leading edges, and at its 40° angle of attack its whole belly), pours round the edges and streams away behind
// as a wake. All of it is soft points scattered over the vehicle's own surface (plasmaGeometry): the shock layer stands a
// little off the faces that meet the flow and fades out toward the sheltered side, a wider, fainter copy of it is the glow
// of the hot gas around them, and the wake is gas from it carried back along the flow, spreading and cooling.
const PLASMA_N = 6000,
  HALO_N = 300,
  WAKE_N = 12000;
const GLSL_SHOCK_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aN; attribute float aR; attribute float aP; attribute vec3 aJ;
uniform vec3 uV; uniform float uOff, uSize, uScale, uPx, uTime, uLen, uWake, uSpread, uHeat; uniform vec2 uScreen;
varying float vT; varying float vA; varying vec2 vDir; varying float vAn;
void main(){
  float w = smoothstep(0.0, 1.0, dot(aN, uV)); // facing into the flow (uV: the way the vehicle moves through the air)
  vec3 p = position + uV * uOff * (0.3 + w) + aN * uOff * 0.3; // the shock stands off ahead of the face
  float size = uSize * (0.55 + 0.65 * w), a, temp = w * mix(0.5, 1.0, clamp(uHeat, 0.0, 1.0)); // a cooler, redder glow at first
  if (uWake > 0.5) { // carried back along the flow, spreading and fading; more of it near the vehicle, where it is brightest
    float f = fract(aP + uTime * (0.35 + 0.3 * aR)), age = f * f;
    vec3 lat = aJ - uV * dot(aJ, uV);
    p += -uV * age * uLen + lat * age * uLen * uSpread * (0.5 + aR);
    size *= 1.2 + 2.5 * age; a = 1.0 - age; a *= a * smoothstep(0.0, 0.04, age); temp *= 1.0 - 0.7 * sqrt(age);
  } else a = 0.85 + 0.15 * sin(dot(position, uV) * 0.9 - uTime * 6.0 + aR * 2.0); // the layer shimmers, in waves running back along it
  vT = temp; vA = a * w * w;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float px = size * uScale * uPx / max(-mv.z, 1e-9);
  gl_PointSize = clamp(px, 1.0, 640.0);
  vDir = vec2(1.0, 0.0); vAn = 1.0;
  if (uWake > 0.5) { // drawn as a streak along the flow, as far as the flow lies across the line of sight
    vec4 c1 = projectionMatrix * (modelViewMatrix * vec4(p - uV * size, 1.0));
    vec2 d = (c1.xy / c1.w - gl_Position.xy / gl_Position.w) * uScreen * 0.5; float ld = length(d);
    if (ld > 1e-6 && c1.w > 0.0) { vDir = vec2(d.x, -d.y) / ld; vAn = mix(1.0, 0.28, clamp(ld / max(px, 1e-6), 0.0, 1.0)); }
  }
  if (vA < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // nothing on the sheltered side
  #include <logdepthbuf_vertex>
}`;
const GLSL_SHOCK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uI; uniform vec3 uHot, uWarm, uCool;
varying float vT; varying float vA; varying vec2 vDir; varying float vAn;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5; float al = dot(q, vDir), ac = dot(q, vec2(-vDir.y, vDir.x)) / vAn;
  float d2 = (al * al + ac * ac) * 4.0; if (d2 > 1.0) discard;
  float s = exp(-3.0 * d2) * (1.0 - d2) / vAn; // a streak keeps the light of the round blob it is squeezed from
  vec3 col = mix(uCool, mix(uWarm, uHot, smoothstep(0.6, 1.0, vT)), smoothstep(0.05, 0.5, vT));
  gl_FragColor = vec4(col * s * vA * uI, 1.0);
}`;
// kind: 'shell' (the shock layer), 'halo' (the glow round it) or 'wake'
function plasmaPoints(kind) {
  const m = new THREE.ShaderMaterial({
    vertexShader: GLSL_SHOCK_V,
    fragmentShader: GLSL_SHOCK_F,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uV: { value: new THREE.Vector3(0, 1, 0) },
      uOff: { value: 1 },
      uSize: { value: 1 },
      uScale: { value: 0.001 },
      uPx: { value: 800 },
      uTime: { value: 0 },
      uLen: { value: 100 },
      uWake: { value: kind === "wake" ? 1 : 0 },
      uSpread: { value: 0.08 },
      uHeat: { value: 1 },
      uScreen: { value: new THREE.Vector2(1, 1) },
      uI: { value: 0 },
      uHot: { value: new THREE.Color("#fff0d2") },
      uWarm: { value: new THREE.Color("#ff9442") },
      uCool: { value: new THREE.Color("#ff3a52") },
    },
  });
  const p = new THREE.Points(new THREE.BufferGeometry(), m);
  p.frustumCulled = false;
  p.renderOrder = 6;
  p.userData.kind = kind;
  return p;
}
function makePlasma() {
  const g = new THREE.Group(),
    shell = plasmaPoints("shell"),
    halo = plasmaPoints("halo"),
    wake = plasmaPoints("wake");
  g.add(halo, shell, wake);
  g.userData = { shell, halo, wake, geo: null };
  return g;
}
// The space round a model: its surface drawn into voxels (each a 128th of the model's largest size), then the empty voxels
// flood-filled from the edges of the box round it. What the fill cannot reach is enclosed by the model: a payload in a
// closed bay, the bay doors' inner faces, a cabin behind its glass, a capsule's insides. tri: 18 numbers a triangle (its
// corners, then their normals), lo/hi: the box. Returns out(x, y, z): true in the space outside.
function outsideField(tri, lo, hi) {
  const v = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 128 || 1,
    o = lo.map((x) => x - 2 * v);
  const n = [0, 1, 2].map((k) => Math.ceil((hi[k] - lo[k]) / v) + 5),
    nxy = n[0] * n[1],
    cell = new Uint8Array(nxy * n[2]); // 1 surface, 2 outside
  const at = (x, y, z) => {
    const i = Math.floor((x - o[0]) / v),
      j = Math.floor((y - o[1]) / v),
      k = Math.floor((z - o[2]) / v);
    return i < 0 || j < 0 || k < 0 || i >= n[0] || j >= n[1] || k >= n[2]
      ? -1
      : i + j * n[0] + k * nxy;
  };
  for (let T = 0; T < tri.length; T += 18) {
    // points at most half a voxel apart over each triangle
    const e = Math.max(
      Math.hypot(
        tri[T + 3] - tri[T],
        tri[T + 4] - tri[T + 1],
        tri[T + 5] - tri[T + 2],
      ),
      Math.hypot(
        tri[T + 6] - tri[T],
        tri[T + 7] - tri[T + 1],
        tri[T + 8] - tri[T + 2],
      ),
      Math.hypot(
        tri[T + 6] - tri[T + 3],
        tri[T + 7] - tri[T + 4],
        tri[T + 8] - tri[T + 5],
      ),
    );
    const m = Math.max(1, Math.ceil(e / (0.5 * v)));
    for (let a = 0; a <= m; a++)
      for (let b = 0; a + b <= m; b++) {
        const u = a / m,
          w = b / m,
          s = 1 - u - w;
        const q = at(
          s * tri[T] + u * tri[T + 3] + w * tri[T + 6],
          s * tri[T + 1] + u * tri[T + 4] + w * tri[T + 7],
          s * tri[T + 2] + u * tri[T + 5] + w * tri[T + 8],
        );
        if (q >= 0) cell[q] = 1;
      }
  }
  const queue = new Int32Array(cell.length);
  let head = 0,
    tail = 0;
  queue[tail++] = 0;
  cell[0] = 2; // a corner of the box, outside the model
  while (head < tail) {
    const q = queue[head++],
      i = q % n[0],
      j = Math.floor(q / n[0]) % n[1],
      k = Math.floor(q / nxy);
    if (i > 0 && !cell[q - 1]) {
      cell[q - 1] = 2;
      queue[tail++] = q - 1;
    }
    if (i < n[0] - 1 && !cell[q + 1]) {
      cell[q + 1] = 2;
      queue[tail++] = q + 1;
    }
    if (j > 0 && !cell[q - n[0]]) {
      cell[q - n[0]] = 2;
      queue[tail++] = q - n[0];
    }
    if (j < n[1] - 1 && !cell[q + n[0]]) {
      cell[q + n[0]] = 2;
      queue[tail++] = q + n[0];
    }
    if (k > 0 && !cell[q - nxy]) {
      cell[q - nxy] = 2;
      queue[tail++] = q - nxy;
    }
    if (k < n[2] - 1 && !cell[q + nxy]) {
      cell[q + nxy] = 2;
      queue[tail++] = q + nxy;
    }
  }
  const out = (x, y, z) => {
    const q = at(x, y, z);
    return q < 0 || cell[q] === 2;
  };
  out.step = 1.5 * v; // how far off a surface to look
  return out;
}
// Points scattered evenly over a model's surface (by area), with the surface's outward normal, in the model's own axes;
// made once per model. Only on faces open to the space outside it (outsideField): a face with that space ahead of it, or
// behind it (its normal then turned round); the air never reaches a face shut inside the model, and points there would
// glow through any gap.
function plasmaGeometry(model) {
  const ud = model.userData;
  if (ud.plasmaGeo) return ud.plasmaGeo;
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert(),
    M = new THREE.Matrix4(),
    NM = new THREE.Matrix3();
  const tri = [],
    cum = [],
    lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  let total = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    na = new THREE.Vector3(),
    nb = new THREE.Vector3(),
    nc = new THREE.Vector3(),
    e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  model.traverse((o) => {
    if (
      !o.isMesh ||
      !o.visible ||
      !o.geometry ||
      !o.geometry.attributes.position ||
      !o.material ||
      o.material.transparent ||
      o.material.isShaderMaterial
    )
      return;
    M.multiplyMatrices(inv, o.matrixWorld);
    NM.getNormalMatrix(M);
    const g = o.geometry,
      P = g.attributes.position,
      N = g.attributes.normal,
      I = g.index,
      n = Math.floor((I ? I.count : P.count) / 3);
    for (let i = 0; i < n; i++) {
      const i0 = I ? I.getX(3 * i) : 3 * i,
        i1 = I ? I.getX(3 * i + 1) : 3 * i + 1,
        i2 = I ? I.getX(3 * i + 2) : 3 * i + 2;
      a.fromBufferAttribute(P, i0).applyMatrix4(M);
      b.fromBufferAttribute(P, i1).applyMatrix4(M);
      c.fromBufferAttribute(P, i2).applyMatrix4(M);
      e1.subVectors(b, a).cross(e2.subVectors(c, a));
      const ar = e1.length() / 2;
      if (!(ar > 1e-6)) continue;
      if (N) {
        na.fromBufferAttribute(N, i0).applyMatrix3(NM);
        nb.fromBufferAttribute(N, i1).applyMatrix3(NM);
        nc.fromBufferAttribute(N, i2).applyMatrix3(NM);
      } else {
        e1.normalize();
        na.copy(e1);
        nb.copy(e1);
        nc.copy(e1);
      }
      tri.push(
        a.x,
        a.y,
        a.z,
        b.x,
        b.y,
        b.z,
        c.x,
        c.y,
        c.z,
        na.x,
        na.y,
        na.z,
        nb.x,
        nb.y,
        nb.z,
        nc.x,
        nc.y,
        nc.z,
      );
      total += ar;
      cum.push(total);
      for (const p of [a, b, c])
        for (let k = 0; k < 3; k++) {
          const x = p.getComponent(k);
          if (x < lo[k]) lo[k] = x;
          if (x > hi[k]) hi[k] = x;
        }
    }
  });
  const rnd = mulberry32(20261012),
    L = ud.len || 8,
    out = cum.length ? outsideField(tri, lo, hi) : null;
  const make = (n) => {
    const pos = new Float32Array(3 * n),
      nrm = new Float32Array(3 * n),
      r = new Float32Array(n),
      ph = new Float32Array(n),
      jit = new Float32Array(3 * n);
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 16; tries++) {
        // a point on a face open to the outside (after 16 misses, one that will not glow)
        let lo = 0,
          hi = cum.length - 1;
        const x = rnd() * total;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (cum[m] < x) lo = m + 1;
          else hi = m;
        }
        let u = rnd(),
          v = rnd();
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        const w = 1 - u - v,
          T = 18 * lo;
        for (let j = 0; j < 3; j++) {
          pos[3 * k + j] =
            w * tri[T + j] + u * tri[T + 3 + j] + v * tri[T + 6 + j];
          nrm[3 * k + j] =
            w * tri[T + 9 + j] + u * tri[T + 12 + j] + v * tri[T + 15 + j];
        }
        const nl = Math.hypot(nrm[3 * k], nrm[3 * k + 1], nrm[3 * k + 2]) || 1;
        for (let j = 0; j < 3; j++) nrm[3 * k + j] /= nl;
        const px = pos[3 * k],
          py = pos[3 * k + 1],
          pz = pos[3 * k + 2],
          d = out.step,
          nx = nrm[3 * k],
          ny = nrm[3 * k + 1],
          nz = nrm[3 * k + 2];
        if (out(px + d * nx, py + d * ny, pz + d * nz)) break;
        if (out(px - d * nx, py - d * ny, pz - d * nz)) {
          for (let j = 0; j < 3; j++) nrm[3 * k + j] *= -1;
          break;
        }
        if (tries === 15) for (let j = 0; j < 3; j++) nrm[3 * k + j] = 0;
      }
      r[k] = rnd();
      ph[k] = rnd();
      const z = 2 * rnd() - 1,
        th = TAU * rnd(),
        s = Math.sqrt(1 - z * z);
      jit[3 * k] = s * Math.cos(th);
      jit[3 * k + 1] = s * Math.sin(th);
      jit[3 * k + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aN", new THREE.BufferAttribute(nrm, 3));
    g.setAttribute("aR", new THREE.BufferAttribute(r, 1));
    g.setAttribute("aP", new THREE.BufferAttribute(ph, 1));
    g.setAttribute("aJ", new THREE.BufferAttribute(jit, 3));
    return g;
  };
  if (!cum.length) {
    ud.plasmaGeo = {
      shell: new THREE.BufferGeometry(),
      halo: new THREE.BufferGeometry(),
      wake: new THREE.BufferGeometry(),
      L,
    };
    return ud.plasmaGeo;
  }
  const shell = make(PLASMA_N),
    halo = new THREE.BufferGeometry(); // the halo: a few of the shell's points, drawn wide
  for (const k in shell.attributes) halo.setAttribute(k, shell.attributes[k]);
  halo.setDrawRange(0, HALO_N);
  ud.plasmaGeo = { shell, halo, wake: make(WAKE_N), L };
  return ud.plasmaGeo;
}

// ==== 31_apollo.js
// ============================================================================
// Apollo command and service modules (metres, +Y along the stack, Y = 0 at the module's base).
// Command module: 3.91 m across, 3.23 m tall with its heat shield (3.48 m with the docking probe). Y = 0 at the toroidal
// shoulder where the aft heat shield (a 4.69 m-radius dome, 0.43 m deep) meets the 33° cone; the docking ring on top is
// CM_TOP up. The cone is covered in silver Mylar tape; five windows (two forward-looking rendezvous windows, two side
// windows, one in the hatch), the side hatch and the RCS thrusters. On the pad the boost protective cover and the launch
// escape tower sit on it. Service module: 3.91 m across, 4.52 m from its aft bulkhead to the CM's shoulder (a 3.94 m
// cylinder and the 0.58 m forward fairing with its eight radiators); four RCS quads, the two large radiator panels, the
// high-gain antenna at the aft end and the SPS engine, whose 2.5 m bell reaches 2.97 m below.
// ============================================================================
const CM_TOP = 2.8; // m above the shoulder: the top of the docking ring (where the LM's drogue meets it)
const SM_LEN = 4.52,
  SM_CYL = 3.94; // m: aft bulkhead to the CM's shoulder, and to the top of the cylinder (the fairing above)
const APOLLO = {};
// crinkled foil, Mylar or Kapton: a colour map and a matching normal map (a height field of soft creases), cached
function foilTex(base, hi, lo, seed = 1, w = 256, creases = 420) {
  const key = "tex" + base + hi + lo + seed + w;
  if (APOLLO[key]) return APOLLO[key];
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const H = new Float32Array(w * w);
  for (let n = 0; n < creases; n++) {
    const x0 = rnd() * w,
      y0 = rnd() * w,
      ang = rnd() * Math.PI,
      len = 10 + rnd() * w * 0.22,
      amp = (rnd() - 0.5) * 2,
      wid = 1 + rnd() * 4,
      dx = Math.cos(ang),
      dy = Math.sin(ang);
    for (let t = -len / 2; t < len / 2; t += 1) {
      const cx = x0 + dx * t,
        cy = y0 + dy * t;
      for (let o = -wid; o <= wid; o++) {
        const px = Math.round(cx - dy * o),
          py = Math.round(cy + dx * o);
        H[(((py % w) + w) % w) * w + (((px % w) + w) % w)] +=
          amp * (1 - Math.abs(o) / (wid + 1)) * 0.12;
      }
    }
  }
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = w;
    return c;
  };
  const col = mk(),
    nor = mk(),
    g = col.getContext("2d"),
    gn = nor.getContext("2d"),
    img = g.createImageData(w, w),
    imn = gn.createImageData(w, w);
  const cB = new THREE.Color(base),
    cH = new THREE.Color(hi),
    cL = new THREE.Color(lo),
    c = new THREE.Color();
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x,
        hx = H[y * w + ((x + 1) % w)] - H[y * w + ((x + w - 1) % w)],
        hy = H[((y + 1) % w) * w + x] - H[((y + w - 1) % w) * w + x];
      const sh = clamp(0.5 + hx * 1.6 - hy * 0.8, 0, 1);
      if (sh > 0.5) c.copy(cB).lerp(cH, (sh - 0.5) * 2);
      else c.copy(cL).lerp(cB, sh * 2);
      img.data[4 * k] = c.r * 255;
      img.data[4 * k + 1] = c.g * 255;
      img.data[4 * k + 2] = c.b * 255;
      img.data[4 * k + 3] = 255;
      const nx = -hx * 3,
        ny = -hy * 3,
        nl = Math.hypot(nx, ny, 1);
      imn.data[4 * k] = ((nx / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 1] = ((ny / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 2] = ((1 / nl) * 0.5 + 0.5) * 255;
      imn.data[4 * k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  gn.putImageData(imn, 0, 0);
  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const nmap = new THREE.CanvasTexture(nor);
  nmap.wrapS = nmap.wrapT = THREE.RepeatWrapping;
  return (APOLLO[key] = { map, nmap });
}
// foil materials: 'mylar' (the CM's silver tape), 'gold', 'amber' (Kapton), 'black'; repeat: tiles per UV unit
function foilMat(kind, repeat = 1) {
  const key = "mat" + kind + repeat;
  if (APOLLO[key]) return APOLLO[key];
  const T = {
    mylar: ["#c9ccd1", "#f4f6f8", "#7c8086", 2],
    gold: ["#d6a43a", "#f8e08c", "#7c5516", 3],
    amber: ["#c8862c", "#efbb5c", "#6a3f10", 5],
    black: ["#1d1e21", "#55575c", "#060607", 7],
  }[kind];
  const t = foilTex(T[0], T[1], T[2], T[3]),
    map = t.map.clone(),
    nmap = t.nmap.clone();
  map.repeat.set(repeat, repeat);
  nmap.repeat.set(repeat, repeat);
  map.needsUpdate = nmap.needsUpdate = true;
  const p = {
    mylar: [0.3, 0.55],
    gold: [0.34, 0.7],
    amber: [0.38, 0.6],
    black: [0.6, 0.15],
  }[kind];
  return (APOLLO[key] = new THREE.MeshStandardMaterial({
    map,
    normalMap: nmap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: p[0],
    metalness: p[1],
  }));
}
// the service module's skin: aluminium panels, the two large radiator panels and the panel seams, wrapped around once
function smSkinMat() {
  if (APOLLO.smSkin) return APOLLO.smSkin;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#c6cacf";
  g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 6; k++) {
    g.fillStyle = k % 2 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    g.fillRect((k * 1024) / 6, 0, 1024 / 6, 512);
  } // six bays
  g.fillStyle = "#eef0f2";
  for (const x0 of [96, 608]) g.fillRect(x0, 60, 210, 330); // the ECS/EPS radiator panels (white), on opposite sides
  g.strokeStyle = "rgba(160,166,172,0.9)";
  g.lineWidth = 2;
  for (const x0 of [96, 608])
    for (let i = 1; i < 10; i++) {
      g.beginPath();
      g.moveTo(x0 + i * 21, 62);
      g.lineTo(x0 + i * 21, 388);
      g.stroke();
    } // radiator tubes
  g.strokeStyle = "rgba(40,44,48,0.55)";
  g.lineWidth = 2;
  for (let k = 0; k <= 6; k++) {
    const x = (k * 1024) / 6;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  } // bay seams
  for (const y of [40, 470]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(1024, y);
    g.stroke();
  }
  g.fillStyle = "rgba(30,32,36,0.8)";
  for (let k = 0; k < 220; k++)
    g.fillRect((k * 197) % 1024, 40 + ((k * 89) % 430), 2, 2); // fasteners
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (APOLLO.smSkin = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.42,
    metalness: 0.45,
  }));
}
function lathe(pts, m, seg = 48) {
  return new THREE.Mesh(
    new THREE.LatheGeometry(
      pts.map((p) => new THREE.Vector2(p[0], p[1])),
      seg,
    ),
    m,
  );
}
// a flat patch on the CM's cone (half-angle 32.7°, radius 1.91 m at y = 0.16): azimuth a from +Z, centred at height y
const CM_CONE = { r0: 1.91, y0: 0.16, tan: Math.tan(32.7 * DEG) };
function cmConePatch(shape, a, y, m, lift = 0.012) {
  const r = CM_CONE.r0 - (y - CM_CONE.y0) * CM_CONE.tan,
    th = 32.7 * DEG;
  const n = new THREE.Vector3(
      Math.cos(th) * Math.sin(a),
      Math.sin(th),
      Math.cos(th) * Math.cos(a),
    ),
    t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)),
    b = new THREE.Vector3().crossVectors(n, t);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), m);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, b, n));
  mesh.position
    .set(Math.sin(a) * r, y, Math.cos(a) * r)
    .addScaledVector(n, lift);
  return mesh;
}
const rectShape = (w, h, rr = 0.03) => {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
};
function apolloCM(withLES, probe = !withLES) {
  const g = new THREE.Group();
  // aft heat shield (ablator) and the toroidal shoulder
  const hs = [];
  for (let i = 0; i <= 10; i++) {
    const r = (1.93 * i) / 10;
    hs.push([r, -0.43 + (4.69 - Math.sqrt(4.69 * 4.69 - r * r))]);
  }
  hs.push([1.955, 0.0], [1.95, 0.07]);
  g.add(lathe(hs, mat("#4a3424", "dark")));
  g.add(
    lathe(
      [
        [1.95, 0.07],
        [1.935, 0.12],
        [1.91, 0.16],
      ],
      mat("#4a3424", "dark"),
    ),
  );
  // the cone in silver Mylar tape, the forward heat shield, the docking tunnel and ring, the probe
  const coneTop = CM_CONE.y0 + (CM_CONE.r0 - 0.6) / CM_CONE.tan; // r 0.6
  g.add(
    lathe(
      [
        [1.91, 0.16],
        [0.6, coneTop],
      ],
      foilMat("mylar", 3),
    ),
  );
  g.add(
    lathe(
      [
        [0.6, coneTop],
        [0.55, coneTop + 0.12],
        [0.46, coneTop + 0.22],
        [0.42, coneTop + 0.26],
      ],
      foilMat("mylar", 1),
    ),
  );
  g.add(
    lathe(
      [
        [0.42, coneTop + 0.26],
        [0.42, CM_TOP - 0.1],
        [0.47, CM_TOP - 0.1],
        [0.47, CM_TOP],
        [0.3, CM_TOP],
      ],
      mat("#b9bec4", "metal"),
    ),
  );
  if (probe) {
    g.add(
      lmRodA(
        [0, CM_TOP - 0.2, 0],
        [0, CM_TOP + 0.25, 0],
        0.05,
        mat("#cfd3d8", "metal"),
      ),
    );
    const tip = cyl(0.09, 0.02, 0.08, mat("#cfd3d8", "metal"), 12);
    tip.position.y = CM_TOP + 0.25;
    g.add(tip);
  }
  // windows: two rendezvous windows looking forward, two side windows, one in the hatch; the hatch and its outline
  const glass = mat("#06080b", "glass"),
    frame = mat("#2a2c30", "dark");
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(rectShape(0.3, 0.36, 0.05), s * 0.42, 1.78, frame, 0.008),
    );
    g.add(
      cmConePatch(rectShape(0.22, 0.28, 0.04), s * 0.42, 1.78, glass, 0.014),
    );
  }
  for (const s of [-1, 1]) {
    g.add(
      cmConePatch(
        rectShape(0.4, 0.4, 0.06),
        (s * Math.PI) / 2,
        1.05,
        frame,
        0.008,
      ),
    );
    g.add(
      cmConePatch(
        rectShape(0.3, 0.3, 0.05),
        (s * Math.PI) / 2,
        1.05,
        glass,
        0.014,
      ),
    );
  }
  g.add(
    cmConePatch(
      rectShape(0.95, 1.05, 0.08),
      0,
      0.95,
      mat("#aeb3b9", "metal"),
      0.006,
    ),
  ); // hatch
  g.add(cmConePatch(rectShape(0.24, 0.24, 0.04), 0, 1.15, glass, 0.012));
  // RCS thruster ports (pitch, yaw and roll pairs) as dark recesses
  const port = mat("#1a1b1e", "dark");
  for (const [a, y] of [
    [0.2, 2.05],
    [-0.2, 2.05],
    [Math.PI + 0.2, 2.05],
    [Math.PI - 0.2, 2.05],
    [Math.PI / 2 + 0.25, 0.42],
    [Math.PI / 2 - 0.25, 0.42],
    [-Math.PI / 2 + 0.25, 0.42],
    [-Math.PI / 2 - 0.25, 0.42],
    [Math.PI + 0.6, 1.45],
    [Math.PI - 0.6, 1.45],
  ])
    g.add(cmConePatch(rectShape(0.13, 0.13, 0.03), a, y, port, 0.01));
  let len = CM_TOP;
  if (withLES) {
    const les = apolloLES();
    g.add(les);
    len = les.userData.top;
  }
  g.userData.len = len;
  g.userData.r = 1.96;
  return g;
}
// The launch escape system on the pad: the boost protective cover over the CM (white, one window left open), the tower
// (a four-legged truss, red), the escape motor with its four canted nozzles, the pitch-control motor and canard section,
// and the nose cone with the Q-ball. 10.2 m from the tower's base to the tip.
function apolloLES() {
  const g = new THREE.Group(),
    white = mat("#ecebe6", "paint"),
    red = mat("#c4441f", "paint"),
    black = mat("#151517", "dark");
  const bpcTop = CM_TOP + 0.08; // the cover closes over the docking tunnel; the tower stands on it
  const coneTopR = 0.62,
    coneTopY = CM_CONE.y0 + (CM_CONE.r0 + 0.07 - coneTopR) / CM_CONE.tan;
  g.add(
    lathe(
      [
        [1.99, 0.02],
        [1.98, 0.16],
        [coneTopR, coneTopY],
        [0.56, bpcTop - 0.06],
        [0.5, bpcTop],
        [0, bpcTop],
      ],
      white,
    ),
  );
  g.add(
    cmConePatch(
      rectShape(0.26, 0.32, 0.04),
      0.42,
      1.78,
      mat("#06080b", "glass"),
      0.068,
    ),
  ); // the commander's window, uncovered
  const t0 = bpcTop,
    t1 = t0 + 3.0,
    rb = 0.62,
    rt = 0.36;
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2,
      a2 = a + Math.PI / 2;
    g.add(
      lmRodA(
        [Math.cos(a) * rb, t0, Math.sin(a) * rb],
        [Math.cos(a) * rt, t1, Math.sin(a) * rt],
        0.06,
        red,
      ),
    );
    for (const [y0, y1] of [
      [t0, t0 + 1.5],
      [t0 + 1.5, t1],
    ]) {
      const r0 = rb + ((rt - rb) * (y0 - t0)) / 3,
        r1 = rb + ((rt - rb) * (y1 - t0)) / 3;
      g.add(
        lmRodA(
          [Math.cos(a) * r0, y0, Math.sin(a) * r0],
          [Math.cos(a2) * r1, y1, Math.sin(a2) * r1],
          0.03,
          red,
        ),
      );
    }
  }
  const m0 = t1;
  g.add(
    lathe(
      [
        [0.36, m0 - 0.05],
        [0.42, m0 + 0.15],
        [0.33, m0 + 0.4],
      ],
      black,
    ),
  ); // nozzle skirt
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4,
      b = bell(0.5, 0.17, black);
    b.position.set(Math.cos(a) * 0.3, m0 + 0.25, Math.sin(a) * 0.3);
    b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(b);
  }
  const motor = cyl(0.33, 0.33, 4.3, white, 32);
  motor.position.y = m0 + 0.4;
  g.add(motor);
  const band = cyl(0.335, 0.335, 0.25, black, 32);
  band.position.y = m0 + 3.2;
  g.add(band);
  const can = cyl(0.33, 0.27, 1.1, white, 32);
  can.position.y = m0 + 4.7;
  g.add(can);
  for (const s of [-1, 1]) {
    const c = box(0.03, 0.6, 0.45, white);
    c.position.set(s * 0.42, m0 + 5.0, 0);
    g.add(c);
  } // canards (folded)
  const nose = lathe(
    [
      [0.27, 0],
      [0.22, 0.45],
      [0.12, 0.9],
      [0.05, 1.05],
      [0, 1.1],
    ],
    black,
  );
  nose.position.y = m0 + 5.8;
  g.add(nose);
  g.userData.top = m0 + 6.9;
  return g;
}
function lmRodA(p0, p1, r, m) {
  // a cylinder between two points
  const a = new THREE.Vector3(...p0),
    b = new THREE.Vector3(...p1),
    d = b.clone().sub(a);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, d.length(), 8),
    m,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
function apolloSM(damaged, stowed = false) {
  // stowed: on the launch pad, the high-gain antenna folded inside the adapter
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_CYL, 64, 1, true),
    smSkinMat(),
  );
  body.geometry.translate(0, SM_CYL / 2, 0);
  g.add(body);
  const aft = new THREE.Mesh(
    new THREE.CircleGeometry(1.955, 64),
    mat("#3a3c40", "dark"),
  );
  aft.rotation.x = Math.PI / 2;
  g.add(aft); // aft bulkhead
  const fwd = new THREE.Mesh(
    new THREE.CircleGeometry(1.95, 64),
    mat("#5d6166", "metal"),
  );
  fwd.rotation.x = -Math.PI / 2;
  fwd.position.y = SM_CYL;
  g.add(fwd); // forward bulkhead, under the CM
  const fair = new THREE.Mesh(
    new THREE.CylinderGeometry(1.955, 1.955, SM_LEN - SM_CYL, 64, 1, true),
    fairingMat(),
  );
  fair.geometry.translate(0, (SM_CYL + SM_LEN) / 2, 0);
  g.add(fair); // the forward fairing
  const ring = cyl(1.968, 1.968, 0.05, mat("#9ca1a8", "metal"), 64);
  ring.position.y = SM_CYL - 0.025;
  g.add(ring); // the seam below the fairing
  // four RCS quads: a housing on the skin with four nozzles (up, down and both ways round)
  const noz = mat("#2a2622", "metal", { side: THREE.DoubleSide }),
    housing = mat("#d8dadd", "metal");
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 7.25 * DEG,
      ux = Math.sin(a),
      uz = Math.cos(a),
      q = new THREE.Group();
    q.position.set(ux * 2.02, 2.95, uz * 2.02);
    q.rotation.y = a;
    g.add(q);
    const h = box(0.55, 0.62, 0.16, housing);
    h.position.y = -0.31;
    q.add(h);
    for (const d of [
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, 0],
      [-1, 0, 0],
    ]) {
      const b = bell(0.24, 0.09, noz);
      b.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(...d),
      );
      b.position.set(d[0] * 0.28, d[1] * 0.31, 0.12);
      q.add(b);
    }
  }
  // the high-gain antenna on its boom at the aft end: four dishes round a wide-beam horn
  if (!stowed) {
    const a = Math.PI * 1.25,
      ux = Math.sin(a),
      uz = Math.cos(a),
      dishM = mat("#e9e9e6", "paint", { side: THREE.DoubleSide });
    const p0 = [ux * 1.9, 0.35, uz * 1.9],
      p1 = [ux * 2.9, -0.55, uz * 2.9];
    g.add(lmRodA(p0, p1, 0.06, mat("#9aa0a6", "metal")));
    const hg = new THREE.Group();
    hg.position.set(...p1);
    hg.rotation.y = a;
    hg.rotation.x = 0.6;
    g.add(hg);
    for (const [x, y] of [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ]) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 6, 0, TAU, 0, Math.PI / 5),
        dishM,
      );
      d.rotation.x = -Math.PI / 2;
      d.position.set(x, y, 0.15);
      hg.add(d);
    }
    const horn = cyl(0.12, 0.05, 0.3, dishM, 12);
    horn.rotation.x = -Math.PI / 2;
    hg.add(horn);
  }
  // the SPS engine: the combustion chamber and nozzle throat (dark) and the radiation-cooled extension (lighter)
  {
    const L = 2.97,
      R = 1.25,
      prof = [
        [R * 0.34, L],
        [R * 0.3, L * 0.9],
        [R * 0.48, L * 0.65],
        [R * 0.72, L * 0.35],
        [R, 0],
      ].map((p) => [p[0], p[1] - L]);
    const split = 2;
    g.add(
      lathe(
        prof.slice(0, split + 1),
        mat("#2b2c2f", "dark", { side: THREE.DoubleSide }),
        32,
      ),
    );
    g.add(
      lathe(
        prof.slice(split),
        mat("#8b9097", "metal", { side: THREE.DoubleSide }),
        32,
      ),
    );
  }
  if (damaged) {
    // Apollo 13: the outer panel of bay 4 blown away, the bay's shelves and tanks exposed
    const a = 0.8,
      hole = cmlessPanel(1.6, 3.1, a, 1.75, mat("#2a1d12", "dark"));
    g.add(hole);
    for (let k = 0; k < 7; k++) {
      const sh = new THREE.Shape([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.25 + 0.1 * (k % 3), 0.05),
        new THREE.Vector2(0.1, 0.3),
      ]);
      const m = new THREE.Mesh(
        new THREE.ShapeGeometry(sh),
        mat("#9aa0a6", "metal", { side: THREE.DoubleSide }),
      );
      m.position.set(
        Math.sin(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
        0.4 + k * 0.42,
        Math.cos(a + (k % 2 ? 0.42 : -0.42)) * 1.98,
      );
      m.rotation.y = a;
      g.add(m);
    }
  }
  g.userData.len = SM_LEN;
  g.userData.engineY = -2.97;
  g.userData.engineR = 1.25;
  return g;
}
// the forward fairing: eight electrical-power radiators (white, with their tubes) between narrow aluminium strips
function fairingMat() {
  if (APOLLO.fairing) return APOLLO.fairing;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#b9bec4";
  g.fillRect(0, 0, 1024, 64);
  for (let k = 0; k < 8; k++) {
    const x0 = k * 128 + 10;
    g.fillStyle = "#eceef0";
    g.fillRect(x0, 6, 108, 52);
    g.strokeStyle = "rgba(150,156,162,0.9)";
    g.lineWidth = 1.5;
    for (let i = 1; i < 9; i++) {
      g.beginPath();
      g.moveTo(x0 + i * 12, 8);
      g.lineTo(x0 + i * 12, 56);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (APOLLO.fairing = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.45,
    metalness: 0.35,
  }));
}
// a dark, recessed panel on the service module's cylinder (azimuth a from +Z, centred at height y)
function cmlessPanel(w, h, a, y, m) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.position.set(Math.sin(a) * 1.96, y, Math.cos(a) * 1.96);
  p.rotation.y = a;
  return p;
}

// ==== 32_shuttle.js
// ============================================================================
// Space Shuttle models (metres): the orbiter, the launch stack (External Tank, two boosters, the orbiter on the
// tank's belly side), the International Space Station and the Hubble Space Telescope.
// Orbiter axes: +Y nose, +Z top (payload bay side), +X right (starboard) wing. Y = 0 at the aft end of the
// fuselage (the base heat shield), Z = 0 at the payload bay centreline (structural plane Zo 400).
// Dimensions follow the orbiter structure: mid fuselage 18.4 m long, 5.2 m wide; aft fuselage 6.7 m wide and
// 6.1 m high; OMS pods 6.6 m long; wing root chord 18 m; vertical tail 8 m tall, swept 45°.
// The orbiter is drawn with the Smithsonian's 3D scan of Discovery (assets/orbiter.glb, built by tools/models: the body,
// the two payload bay doors and the landing gear apart). The built-in model below stands in while it loads; the landing
// gear, the engine nozzles and the payload bay follow the scan's measurements in both.
// ============================================================================
const SH_COL = {
  white: "#efede7",
  black: "#141517",
  rcc: "#3c3d41",
  grey: "#a3a8ae",
  bay: "#d4d7da",
  rad: "#e6ebf0",
  gold: "#c8a24a",
  base: "#2c2e31",
};
// Where the tyres touch the ground with the gear down, [Y, Z] (from the scan). The nose wheels touch 1.55 m higher than the
// main wheels, so the orbiter stands 4.4° nose down on its gear.
const SH_MAIN_CONTACT = [8.8, -6.03],
  SH_NOSE_CONTACT = [29.0, -4.48],
  SH_MAIN_TRACK = 3.72; // main wheels ±3.72 m out
const SH_GEAR_H = -SH_MAIN_CONTACT[1]; // m: the reference plane (Z = 0) above the main wheels' contact, wings level (the flight planner's gear height)
const SH_STANCE = -Math.atan2(
  SH_NOSE_CONTACT[1] - SH_MAIN_CONTACT[1],
  SH_NOSE_CONTACT[0] - SH_MAIN_CONTACT[0],
); // rad: the attitude on the ground, −4.4°
// engine nozzle exits (from the scan): [x, exit Y, z]; three RS-25s (2.29 m exits) and the two OMS engines
const SH_SSME = [
    [0.02, -1.81, 1.96],
    [-1.56, -2.49, -0.95],
    [1.58, -2.47, -1.01],
  ],
  SH_OMSE = [
    [-2.97, -1.0, 2.28],
    [2.97, -1.0, 2.28],
  ];
const SH_BAY = [5.6, 23.9]; // payload bay doors, Y range
const SH_HINGE = 24 * DEG; // door hinge on the fuselage section (superellipse angle)
const SH_OMS_X = 2.6; // OMS pod centrelines
const SH_E = 2 / 2.6,
  SH_EB = 2 / 4.5; // superellipse exponents: rounded-square top, flat belly
function vcMat(extra = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.66,
    metalness: 0.03,
    ...extra,
  });
}
// colour every vertex of a geometry from its position and normal
function paintGeo(g, fn) {
  const p = g.attributes.position,
    n = g.attributes.normal,
    c = new Float32Array(p.count * 3),
    col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    col.set(
      fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)),
    );
    c[3 * i] = col.r;
    c[3 * i + 1] = col.g;
    c[3 * i + 2] = col.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}
// point on a fuselage section s = [y, zc, a (half width), bTop, bBot] at angle th (0 = starboard side, 90° = top)
function shRing(s, th) {
  const c = Math.cos(th),
    sn = Math.sin(th);
  const x = s[2] * Math.sign(c) * Math.pow(Math.abs(c), sn >= 0 ? SH_E : SH_EB);
  const z =
    sn >= 0
      ? s[1] + s[3] * Math.pow(Math.abs(sn), SH_E)
      : s[1] - s[4] * Math.pow(Math.abs(sn), SH_EB);
  return [x, s[0], z];
}
// lofted surface through sections; skip(yMid, thMid) leaves quads out (the payload bay opening)
function loftGeo(st, nSeg, skip) {
  const pos = [],
    idx = [];
  for (const s of st)
    for (let k = 0; k <= nSeg; k++) pos.push(...shRing(s, (k / nSeg) * TAU));
  for (let i = 0; i < st.length - 1; i++)
    for (let k = 0; k < nSeg; k++) {
      if (
        skip &&
        skip(0.5 * (st[i][0] + st[i + 1][0]), ((k + 0.5) / nSeg) * TAU)
      )
        continue;
      const a = i * (nSeg + 1) + k,
        b = a + 1,
        c = a + nSeg + 1,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// flat cap closing a section (facing −Y when back = true)
function capGeo(s, nSeg, back) {
  const pos = [0, s[0], s[1]],
    idx = [];
  for (let k = 0; k <= nSeg; k++) pos.push(...shRing(s, (k / nSeg) * TAU));
  for (let k = 1; k <= nSeg; k++)
    back ? idx.push(0, k, k + 1) : idx.push(0, k + 1, k);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const SH_STATIONS = [
  [0.0, 0.35, 3.25, 2.95, 2.95],
  [2.6, 0.3, 3.1, 2.85, 2.9],
  [SH_BAY[0], -0.1, 2.62, 2.5, 2.5],
  [SH_BAY[1], -0.1, 2.62, 2.5, 2.5],
  [25.0, 0.05, 2.56, 2.75, 2.6],
  [26.8, 0.35, 2.45, 2.95, 2.75],
  [28.6, 0.2, 2.2, 2.6, 2.45],
  [30.3, -0.15, 1.75, 1.95, 2.0],
  [31.6, -0.55, 1.15, 1.25, 1.45],
  [32.35, -0.85, 0.6, 0.62, 0.85],
  [32.75, -1.0, 0.06, 0.06, 0.08],
];
function shuttleFuselage() {
  const bay = (y, th) =>
    y > SH_BAY[0] && y < SH_BAY[1] && th > SH_HINGE && th < Math.PI - SH_HINGE;
  const g = loftGeo(SH_STATIONS, 64, bay);
  paintGeo(g, (x, y, z, nx, ny, nz) => {
    if (
      y > 25.6 &&
      y < 28.9 &&
      z > 1.95 &&
      Math.abs(x) < 2.0 &&
      (nz > 0.3 || ny > 0.35)
    )
      return SH_COL.black; // flight-deck windows and their frame
    if (y > 31.3) return SH_COL.black; // nose cap
    if (nz < -0.3 || (y > 28.5 && nz < 0.1)) return SH_COL.black; // belly tiles, wrapping up around the chin
    return SH_COL.white;
  });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, vcMat()));
  grp.add(
    new THREE.Mesh(capGeo(SH_STATIONS[0], 64, true), mat(SH_COL.base, "dark")),
  ); // base heat shield around the main engines
  return grp;
}
function shuttleWing(side) {
  // double-delta planform: 81° glove, 45° main wing; dark leading edges, black underside
  const P = [
    [2.6, 1.0],
    [11.9, 2.3],
    [11.95, 4.4],
    [4.9, 11.4],
    [3.6, 16.0],
    [2.6, 19.6],
  ];
  const sh = new THREE.Shape();
  P.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 1.3,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 4,
  });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    const k = 1 - 0.75 * clamp((x - 2.6) / 9.4, 0, 1);
    p.setZ(i, z * k);
  } // thinner toward the tip
  if (side < 0) {
    for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
    const ix = g.index;
    if (ix)
      for (let i = 0; i < ix.count; i += 3) {
        const t = ix.getX(i + 1);
        ix.setX(i + 1, ix.getX(i + 2));
        ix.setX(i + 2, t);
      }
    else {
      for (let i = 0; i < p.count; i += 3)
        for (let k = 0; k < 3; k++) {
          const t = p.getComponent(i + 1, k);
          p.setComponent(i + 1, k, p.getComponent(i + 2, k));
          p.setComponent(i + 2, k, t);
        }
    }
  }
  g.computeVertexNormals();
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    nz < -0.35
      ? SH_COL.black
      : nz < 0.45 && (ny > 0.3 || Math.abs(nx) > 0.6)
        ? SH_COL.rcc
        : SH_COL.white,
  );
  const m = new THREE.Mesh(g, vcMat());
  m.position.z = -2.45;
  return m;
}
function shuttleFin() {
  // vertical tail with the split rudder / speed brake
  const sh = new THREE.Shape();
  [
    [5.8, 0],
    [-1.2, 0],
    [-5.1, 8.0],
    [-2.3, 8.0],
  ].forEach(([y, z], i) => (i ? sh.lineTo(y, z) : sh.moveTo(y, z)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  });
  const p = g.attributes.position; // shape (y, z) in the XY plane, extruded along Z: map to model (x = extrusion, y, z)
  for (let i = 0; i < p.count; i++) {
    const sy = p.getX(i),
      sz = p.getY(i),
      ex = p.getZ(i);
    const k = 1 - 0.55 * clamp(sz / 8, 0, 1);
    p.setXYZ(i, (ex - 0.25) * k, sy, sz);
  }
  g.computeVertexNormals();
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    ny > 0.5 && Math.abs(nx) < 0.7 ? SH_COL.rcc : SH_COL.white,
  );
  const m = new THREE.Mesh(g, vcMat());
  m.position.z = 3.05;
  return m;
}
function shuttleOmsPod(side) {
  // OMS/RCS pod: 6.6 m long, 2.6 m wide in front, 3.5 m at the aft end
  const g = loftGeo(
    [
      [-0.75, 0.0, 1.45, 1.05, 1.0],
      [-0.55, 0.0, 1.6, 1.12, 1.05],
      [2.4, 0.0, 1.5, 1.12, 1.05],
      [4.6, -0.05, 1.2, 0.9, 1.0],
      [5.6, -0.25, 0.8, 0.55, 0.9],
      [5.95, -0.4, 0.15, 0.12, 0.3],
    ],
    32,
  );
  paintGeo(g, (x, y, z, nx, ny, nz) =>
    nz > 0.15 && y > -0.4 && y < 5.4
      ? SH_COL.white
      : y <= -0.6
        ? SH_COL.base
        : SH_COL.grey,
  );
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, vcMat()));
  grp.add(
    new THREE.Mesh(
      capGeo([-0.75, 0.0, 1.45, 1.05, 1.0], 32, true),
      mat(SH_COL.base, "dark"),
    ),
  ); // aft end around the OMS engine
  grp.position.set(side * SH_OMS_X, 0, 2.6);
  return grp;
}
// one payload bay door, built at its hinge so it can swing open (175.5° when fully open); white outside, radiators inside
function shuttleBayDoor(side, open) {
  const s = SH_STATIONS[2],
    H = shRing(s, SH_HINGE),
    hx = H[0],
    hz = H[2],
    n = 20,
    ys = [SH_BAY[0], SH_BAY[1]];
  const pos = [];
  for (const y of ys)
    for (let k = 0; k <= n; k++) {
      const th = SH_HINGE + ((Math.PI / 2 - SH_HINGE) * k) / n;
      const q = shRing(s, th);
      pos.push(side * (q[0] - hx), y, q[2] - hz);
    }
  const outer = [],
    inner = [];
  for (let k = 0; k < n; k++) {
    const a = k,
      b = k + 1,
      c = n + 1 + k,
      d = c + 1;
    if (side > 0) {
      outer.push(a, c, b, b, c, d);
      inner.push(a, b, c, b, d, c);
    } else {
      outer.push(a, b, c, b, d, c);
      inner.push(a, c, b, b, c, d);
    }
  }
  const mk = (ix, m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    return new THREE.Mesh(g, m);
  };
  const grp = new THREE.Group();
  grp.add(mk(outer, mat(SH_COL.white, "paint")));
  grp.add(mk(inner, mat(SH_COL.rad, "metal")));
  grp.position.set(side * hx, 0, hz);
  if (open) grp.rotation.y = side * SH_DOOR.open;
  return grp;
}
// The payload bay's geometry: the door hinges (x, z) on the sills, the side walls, the floor and, for the scan, the arch of
// the fuselage's top (an ellipse over the walls) that the end bulkheads fill when the doors are open
const SH_BAY_BUILTIN = (() => {
  const H = shRing(SH_STATIONS[2], SH_HINGE);
  return { hx: H[0], hz: H[2], wall: H[0] - 0.12, floor: -2.25 };
})();
const SH_BAY_SCAN = {
  hx: 2.7,
  hz: 0.6,
  wall: 2.47,
  floor: -2.3,
  arch: [0.95, 1.4],
}; // the scan's skin is 2.67–2.72 m out; arch: centre z, height
function shuttleBayInterior(B = SH_BAY_BUILTIN) {
  const g = new THREE.Group(),
    m = mat(SH_COL.bay, "paint", { side: THREE.DoubleSide }),
    L = SH_BAY[1] - SH_BAY[0],
    yc = (SH_BAY[0] + SH_BAY[1]) / 2;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2 * B.wall + 0.1, L, 0.1),
    m,
  );
  floor.position.set(0, yc, B.floor);
  g.add(floor);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, L, B.hz - B.floor),
      m,
    );
    wall.position.set(s * B.wall, yc, (B.hz + B.floor) / 2);
    g.add(wall);
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, L, 0.16),
      mat("#b8bdc2", "metal"),
    );
    sill.position.set(s * (B.wall + 0.05), yc, B.hz - 0.04);
    g.add(sill); // the sill longeron, inside the skin
  }
  const bulk = (y, col, kind) => {
    let geo;
    if (B.arch) {
      // the walls, then the arch of the fuselage's top
      const [zc, b] = B.arch,
        sh = new THREE.Shape();
      sh.moveTo(-B.wall, B.floor);
      sh.lineTo(B.wall, B.floor);
      sh.lineTo(B.wall, zc);
      for (let k = 1; k <= 24; k++) {
        const t = (k / 24) * Math.PI;
        sh.lineTo(B.wall * Math.cos(t), zc + b * Math.sin(t));
      }
      sh.lineTo(-B.wall, B.floor);
      geo = new THREE.ShapeGeometry(sh);
      geo.rotateX(Math.PI / 2);
    } else {
      const st = SH_STATIONS[2];
      geo = capGeo(
        [0, st[1], st[2] * 0.985, st[3] * 0.985, st[4] * 0.985],
        48,
        false,
      );
    }
    const b = new THREE.Mesh(geo, mat(col, kind, { side: THREE.DoubleSide }));
    b.position.y = y;
    g.add(b);
  };
  bulk(SH_BAY[0] + 0.06, SH_COL.gold, "gold");
  bulk(SH_BAY[1] - 0.06, "#dfe2e5", "paint");
  return g;
}
function shuttleMainEngines() {
  // three RS-25s in a triangle, nozzles pointing aft (−Y), throats just inside the base
  const g = new THREE.Group();
  for (const [x, ey, z] of SH_SSME) {
    const len = 0.3 - ey,
      b = bell(len, 1.145, mat("#4d5055", "metal", { side: THREE.DoubleSide }));
    b.position.set(x, ey, z);
    g.add(b);
  }
  return g;
}
function shuttleGear(down) {
  // two-wheel main gears (1.13 m tyres) and the nose gear (0.81 m), tyres touching at the scan's contact points
  const g = new THREE.Group();
  if (!down) return g;
  const strutM = mat("#b9bec4", "metal"),
    tyre = mat("#1a1a1a", "dark");
  const wheel = (r, w) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), tyre);
    c.rotation.z = Math.PI / 2;
    return c;
  };
  const strut = (x, y, z0, z1, r) => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, z0 - z1, 10),
      strutM,
    );
    c.rotation.x = Math.PI / 2;
    c.position.set(x, y, (z0 + z1) / 2);
    return c;
  };
  const [ym, zm] = SH_MAIN_CONTACT,
    [yn, zn] = SH_NOSE_CONTACT,
    rw = 0.565,
    rn = 0.405;
  for (const s of [-1, 1]) {
    const x = s * SH_MAIN_TRACK;
    g.add(strut(x, ym, -3.5, zm + rw, 0.17));
    for (const dx of [-0.4, 0.4]) {
      const w = wheel(rw, 0.4);
      w.position.set(x + dx, ym, zm + rw);
      g.add(w);
    }
  }
  g.add(strut(0, yn, -3.1, zn + rn, 0.13));
  for (const dx of [-0.26, 0.26]) {
    const w = wheel(rn, 0.3);
    w.position.set(dx, yn, zn + rn);
    g.add(w);
  }
  return g;
}
// The scan's wheel wells with their doors closed: plates on the belly's tiles (the scan has the doors open, hanging beside
// the gear). Corners [x, y, z]: the main wells under the wing roots and the nose well.
function shuttleWellCovers() {
  const g = new THREE.Group(),
    m = mat("#17181a", "tile", { side: THREE.DoubleSide });
  const quad = (c) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(c.flat(), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  };
  for (const s of [-1, 1])
    g.add(
      quad([
        [s * 2.42, 7.8, -3.57],
        [s * 4.68, 7.8, -3.33],
        [s * 4.68, 12.6, -3.11],
        [s * 2.42, 12.6, -3.44],
      ]),
    );
  g.add(
    quad([
      [-0.82, 28.2, -3.2],
      [0.82, 28.2, -3.2],
      [0.82, 31.3, -3.18],
      [-0.82, 31.3, -3.18],
    ]),
  );
  return g;
}
function shuttleChute() {
  // 40-ft (12 m) ring-sail drag chute trailing behind the tail on a long riser
  const g = new THREE.Group();
  const c = new THREE.Mesh(
    new THREE.SphereGeometry(6.1, 24, 8, 0, TAU, 0, Math.PI / 2.3),
    patternMat("chute", "#e0662c"),
  );
  c.rotation.x = Math.PI;
  c.position.set(0, -40, 3.2);
  g.add(c); // crown trailing aft, mouth facing the orbiter
  const yM = -40 - 6.1 * Math.cos(Math.PI / 2.3),
    rM = 6.1 * Math.sin(Math.PI / 2.3);
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    pts.push(
      new THREE.Vector3(Math.cos(a) * rM, yM, 3.2 + Math.sin(a) * rM),
      new THREE.Vector3(0, -13.0, 2.6),
    );
  }
  pts.push(new THREE.Vector3(0, -13.0, 2.6), new THREE.Vector3(0, -1.6, 2.9));
  g.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );
  return g;
}
// Robot arm (Canadarm) on the port sill: the shoulder near the front of the bay, the upper boom 6.37 m and the lower boom
// 7.06 m to the wrist, then the wrist joints and end effector, 1.6 m, on to a grapple fixture. armRig(B): userData.pose(W,
// dir) bends it to put the wrist at W (or as near as it reaches), elbow up, the end effector along dir (else on along the
// lower boom). shuttleRMS: the arm in a fixed pose.
const RMS = { l1: 6.37, l2: 7.06, ee: 1.6 };
function rmsShoulder(B) {
  return new THREE.Vector3(-B.wall + 0.22, 22.9, B.hz + 0.25);
} // on the port sill, under the closed door
function armRig(B = SH_BAY_BUILTIN) {
  const g = new THREE.Group(),
    m = mat("#ecebe5", "paint"),
    jm = mat("#9aa0a6", "metal"),
    S = rmsShoulder(B);
  const rod = (r, mm) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), mm);
    g.add(c);
    return c;
  };
  const up = rod(0.19, m),
    lo = rod(0.17, m),
    ee = rod(0.2, jm);
  const J = [0, 1, 2].map(() => {
    const j = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), jm);
    g.add(j);
    return j;
  });
  const Y = new THREE.Vector3(0, 1, 0),
    Z = new THREE.Vector3(0, 0, 1),
    u = new THREE.Vector3(),
    side = new THREE.Vector3(),
    perp = new THREE.Vector3();
  const E = new THREE.Vector3(),
    Wr = new THREE.Vector3(),
    Tip = new THREE.Vector3(),
    d0 = new THREE.Vector3();
  const place = (c, A, P) => {
    c.scale.y = Math.max(A.distanceTo(P), 1e-3);
    c.position.copy(A).add(P).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(Y, d0.copy(P).sub(A).normalize());
  };
  g.userData.pose = (W, dir) => {
    u.copy(W).sub(S);
    const d = Math.min(u.length(), RMS.l1 + RMS.l2 - 0.005);
    u.normalize();
    side.crossVectors(u, Z);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    perp.crossVectors(side, u).normalize();
    if (perp.z < 0) perp.negate();
    const a = Math.acos(
      clamp(
        (RMS.l1 * RMS.l1 + d * d - RMS.l2 * RMS.l2) / (2 * RMS.l1 * d),
        -1,
        1,
      ),
    );
    E.copy(S)
      .addScaledVector(u, RMS.l1 * Math.cos(a))
      .addScaledVector(perp, RMS.l1 * Math.sin(a));
    Wr.copy(S).addScaledVector(u, d); // the wrist, where the arm reaches
    Tip.copy(Wr).addScaledVector(
      dir ? d0.copy(dir).normalize() : d0.copy(Wr).sub(E).normalize(),
      RMS.ee,
    );
    place(up, S, E);
    place(lo, E, Wr);
    place(ee, Wr, Tip);
    J[0].position.copy(S);
    J[1].position.copy(E);
    J[2].position.copy(Wr);
    g.userData.wrist = Wr;
  };
  return g;
}
function shuttleRMS(pose, B = SH_BAY_BUILTIN) {
  const g = armRig(B),
    S = rmsShoulder(B);
  g.userData.pose(
    pose === "raised"
      ? new THREE.Vector3(0.4, 14.5, 11.6)
      : pose === "grapple"
        ? new THREE.Vector3(0, 11.3, 3.0)
        : new THREE.Vector3(S.x, 8.9, S.z),
  );
  g.userData.wrist = g.userData.wrist.clone();
  return g;
}
// The Hubble deploy in motion (STS-31), from the mission's timeline: flags.armT, absolute times of the grapple (gr), the
// unberth (un), the arrays (arr) and the release (rel). Over the 25 minutes before the grapple the arm unstows and reaches
// down to the telescope's grapple fixture. From the unberth it lifts the telescope straight up out of the bay, 2.8 m in
// 8 minutes, clear of the sills (a few centimetres to spare), then in 20 minutes swings it upright above the bay, aperture
// to space. The solar arrays and antennas unfurl over 12 minutes from the arrays time. After the release the end effector
// backs off along the fixture and, half an hour later, the arm folds back onto the sill. The telescope is drawn here until
// the release (flags.armPay); from then on it flies on its own.
const HST_BAY = {
  p: new THREE.Vector3(0, 14.3, -0.05),
  q: new THREE.Quaternion(),
}; // in the bay, aperture forward
const HST_LIFT = {
  p: new THREE.Vector3(0, 14.3, 2.75),
  q: new THREE.Quaternion(),
};
const HST_UP = {
  p: new THREE.Vector3(0, 17.5, 12.0),
  q: new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2,
  ),
}; // released here
const HST_GRASP = new THREE.Vector3(0, -3.0, 4.15); // the wrist, in the telescope's frame: out along the grapple fixture at (0, −3.0, 2.3)
function deployRig(flags, B) {
  const T = flags.armT,
    g = new THREE.Group(),
    arm = armRig(B);
  g.add(arm);
  const S = rmsShoulder(B),
    Wst = new THREE.Vector3(S.x, 8.9, S.z),
    V = () => new THREE.Vector3();
  const hub = flags.armPay
    ? hubbleModel({ arrays: true, deployable: true })
    : null;
  if (hub) g.add(hub);
  const grasp = (P, out) => out.copy(HST_GRASP).applyQuaternion(P.q).add(P.p);
  const Wgr = grasp(HST_BAY, V()),
    Whov = Wgr.clone().add(new THREE.Vector3(0, 0, 1.5)),
    Wup = grasp(HST_UP, V());
  const fixUp = new THREE.Vector3(0, 0, 1).applyQuaternion(HST_UP.q),
    Wback = Wup.clone().addScaledVector(fixUp, 1.6);
  const P = { p: V(), q: new THREE.Quaternion() },
    W = V(),
    dir = V(),
    lift = V();
  const sm = (t, a, b) => smoothstep(clamp((t - a) / (b - a), 0, 1));
  const arc = (A, Bv, f, h, out) =>
    out.lerpVectors(A, Bv, f).add(lift.set(0, 0, h * Math.sin(Math.PI * f))); // up over the sill on the way
  g.userData.update = (t) => {
    if (t < T.un + 480) {
      P.p.lerpVectors(HST_BAY.p, HST_LIFT.p, sm(t, T.un, T.un + 480));
      P.q.copy(HST_BAY.q);
    } else {
      const f = sm(t, T.un + 480, T.un + 1680);
      P.p.lerpVectors(HST_LIFT.p, HST_UP.p, f);
      P.q.slerpQuaternions(HST_LIFT.q, HST_UP.q, f);
    }
    if (hub) {
      hub.position.copy(P.p);
      hub.quaternion.copy(P.q);
      hub.userData.deploy(clamp((t - T.arr) / 720, 0, 1));
    }
    let reach = true; // the end effector lined up on the fixture (reaching for it, holding it, just let go of it)
    if (t < T.gr - 1500) {
      W.copy(Wst);
      reach = false;
    } else if (t < T.gr - 300) {
      arc(Wst, Whov, sm(t, T.gr - 1500, T.gr - 300), 3.0, W);
      reach = false;
    } else if (t < T.gr) W.lerpVectors(Whov, Wgr, sm(t, T.gr - 300, T.gr));
    else if (t < T.rel) grasp(P, W);
    else if (t < T.rel + 180)
      W.lerpVectors(Wup, Wback, sm(t, T.rel, T.rel + 180));
    else {
      arc(Wback, Wst, sm(t, T.rel + 1800, T.rel + 3000), 2.0, W);
      reach = false;
    }
    arm.userData.pose(
      W,
      reach
        ? dir.set(0, 0, -1).applyQuaternion(t < T.rel ? P.q : HST_UP.q)
        : null,
    );
  };
  g.userData.update(T.gr - 3600);
  return g;
}
function shuttlePayload(kind, flags = {}, B = SH_BAY_BUILTIN) {
  const g = new THREE.Group();
  if (kind === "dfi") {
    const p = box(3.6, 3.0, 1.6, mat("#c9c6bd", "metal"));
    p.position.set(0, 8.4, -2.2);
    g.add(p);
    const t = cyl(0.5, 0.5, 1.6, mat("#d8d4c8", "paint"));
    t.rotation.x = Math.PI / 2;
    t.position.set(1.1, 12.2, -1.4);
    g.add(t);
  }
  if (kind === "hst") {
    const h = hubbleModel({ arrays: false });
    h.position.set(0, 14.3, -0.05);
    g.add(h);
  }
  if (kind === "mplm") {
    const c = cyl(2.25, 2.25, 6.4, mat("#e7e5df", "paint"), 32);
    c.position.set(0, 8.2, -0.05);
    g.add(c);
    const cap = cyl(2.25, 1.1, 0.9, mat("#d5d3cc", "paint"), 32);
    cap.position.set(0, 14.6, -0.05);
    g.add(cap);
    const cap2 = cyl(1.1, 2.25, 0.6, mat("#d5d3cc", "paint"), 32);
    cap2.position.set(0, 7.6, -0.05);
    g.add(cap2);
  }
  if (flags.ods) {
    // orbiter docking system: external airlock with the docking mechanism on top, at the front of the bay
    const al = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.0, 2.9, 24),
      mat("#e9e7e1", "paint"),
    );
    al.rotation.x = Math.PI / 2;
    al.position.set(0, 21.5, -0.65);
    g.add(al);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.8, 24),
      mat("#a6abb1", "metal"),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 21.5, 1.2);
    g.add(ring);
    const tr = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.4, 0.2),
      mat("#c4c8cc", "metal"),
    );
    tr.position.set(0, 21.5, 0.75);
    g.add(tr);
  }
  if (flags.obss) {
    const b = cyl(0.2, 0.2, 15.2, mat("#d8d6cf", "paint"), 10);
    b.position.set(B.wall - 0.22, 6.9, B.hz + 0.25);
    g.add(b);
  } // the boom on the starboard sill
  return g;
}
// Each flight's orbiter in its own markings. The scan is Discovery as she was retired, in the markings of 1998 on; for the
// orbiters of the app's flights tools/livery repaints its colour map as they flew them: Columbia in 1981 (the name on the
// payload bay doors, "USA" on the right wing, a flag on the left, the black chines), Discovery in 1990 (the NASA logotype
// on the wing and the doors, "USA" and a flag on the left wing, no insignia), Atlantis in 2011 (the scan's scheme, her name).
const ORBITER_LIVERY = {
  "OV-102": "columbia-1981",
  "OV-103": "discovery-1990",
  "OV-104": "atlantis-2011",
};
const LIVERIES = {};
let SCAN_MAT = null; // (the scan's own material, which a livery replaces)
function orbiterLivery(id) {
  // a promise of the scan's material with this orbiter's colour map (null: keep the scan's own)
  const key = ORBITER_LIVERY[id];
  if (!key) return Promise.resolve(null);
  if (!LIVERIES[key])
    LIVERIES[key] = detailFile("orbiter").then(
      (P) =>
        new Promise((ok) => {
          let base = null;
          if (P && P.body)
            P.body.traverse((o) => {
              if (
                !base &&
                o.isMesh &&
                o.material &&
                o.material.map &&
                o.material.name === "default"
              )
                base = o.material;
            });
          if (!base) return ok(null);
          SCAN_MAT = base;
          const done = (t) => {
            const b = base.map;
            t.flipY = false;
            t.colorSpace = b.colorSpace;
            t.wrapS = b.wrapS;
            t.wrapT = b.wrapT;
            t.magFilter = b.magFilter;
            t.minFilter = b.minFilter;
            t.anisotropy = b.anisotropy;
            t.needsUpdate = true;
            const m = base.clone();
            m.map = t;
            m.userData.livery = key;
            ok(m);
          };
          const file = ASSET("orbiter-" + key + ".webp"),
            fail = () => {
              console.warn(
                `Livery ${key} could not be loaded; the orbiter keeps the scan's markings.`,
              );
              ok(null);
            };
          // as the glTF loader reads the scan's own maps: decoded off the main thread where the browser can, not flipped
          const safari = /^((?!chrome|android).)*safari/i.test(
            navigator.userAgent,
          );
          if (typeof createImageBitmap === "function" && !safari)
            new THREE.ImageBitmapLoader()
              .setOptions({ premultiplyAlpha: "none" })
              .load(
                file,
                (bmp) => done(new THREE.Texture(bmp)),
                undefined,
                fail,
              );
          else new THREE.TextureLoader().load(file, done, undefined, fail);
        }),
    );
  return LIVERIES[key];
}
// the scan's parts in a model take the livery's material (when it has arrived)
function wearLivery(g, id) {
  orbiterLivery(id).then((m) => {
    if (m)
      g.traverse((o) => {
        if (o.isMesh && o.material === SCAN_MAT) o.material = m;
      });
  });
}
// The orbiter: the scan's body, doors (swung open 175.5° in orbit) and landing gear, with the payload bay's lining, the robot
// arm and the payloads; the built-in model until the scan arrives (or if it cannot be loaded).
function buildOrbiter(flags = {}) {
  const fb = orbiterBuiltIn(flags),
    open = flags.bay === "open";
  const g = detailPart("orbiter", "body", fb, {
    extra: (d) => {
      const P = DETAIL.ready.orbiter,
        doors = {};
      for (const [k, side] of [
        ["doorL", -1],
        ["doorR", 1],
      ])
        if (P[k]) {
          const n = P[k].clone();
          if (open) n.rotation.y = side * SH_DOOR.open;
          d.add(n);
          doors[k] = n;
        }
      if (flags.gear && P.gear) d.add(P.gear.clone());
      else if (!flags.gear) d.add(shuttleWellCovers());
      d.userData.doors = doors;
      d.userData.rig = orbiterFittings(d, flags, SH_BAY_SCAN);
      wearLivery(d, flags.orbiter);
    },
  });
  // doors and arm in motion (bay doors opening or closing from flags.bayT, the deploy from flags.armT)
  if (flags.bayT != null || flags.armT)
    g.userData.animate = (t) => {
      const D = g.userData.doors,
        [aL, aR] = bayDoorAngles(flags, t);
      if (D && flags.bayT != null) {
        if (D.doorL) D.doorL.rotation.y = -aL;
        if (D.doorR) D.doorR.rotation.y = aR;
      }
      if (g.userData.rig) g.userData.rig.userData.update(t);
    };
  return g;
}
// Payload bay doors in motion. Each swings out about its hinge on the sill, its free edge rising off the centreline and over
// the side (a turn about +Y of +angle for the right door, −angle for the left). The right door's edge laps over the left's
// on the centreline, so the right door opens first and closes last. Opening, from bayT: the latches let go (60 s), the
// right door swings open (63 s), and 15 s later the left; closing, from bayT: the left door, then the right, then the
// latches. The angles [left, right] at t (0 = shut).
const SH_DOOR = { latch: 60, swing: 63, gap: 15, open: 175.5 * DEG };
function bayDoorAngles(flags, t) {
  const A = SH_DOOR.open,
    sw = (x) => smoothstep(clamp(x / SH_DOOR.swing, 0, 1));
  if (flags.bayT == null) return flags.bay === "open" ? [A, A] : [0, 0];
  const d = t - flags.bayT;
  if (flags.bay === "open")
    return [
      A * sw(d - SH_DOOR.latch - SH_DOOR.swing - SH_DOOR.gap),
      A * sw(d - SH_DOOR.latch),
    ];
  return [A * (1 - sw(d)), A * (1 - sw(d - SH_DOOR.swing - SH_DOOR.gap))];
}
function orbiterBuiltIn(flags) {
  const g = new THREE.Group(),
    open = flags.bay === "open";
  g.add(shuttleFuselage());
  g.add(shuttleWing(1));
  g.add(shuttleWing(-1));
  g.add(shuttleFin());
  g.add(shuttleOmsPod(1));
  g.add(shuttleOmsPod(-1));
  const doorR = shuttleBayDoor(1, open),
    doorL = shuttleBayDoor(-1, open);
  g.add(doorR);
  g.add(doorL);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(6.3, 2.6, 0.42), vcMat());
  paintGeo(flap.geometry, (x, y, z, nx, ny, nz) =>
    nz > 0.5 ? SH_COL.white : SH_COL.black,
  );
  flap.position.set(0, -1.3, -2.38);
  g.add(flap); // body flap
  g.add(shuttleMainEngines());
  for (const [x, ey, z] of SH_OMSE) {
    const b = bell(
      1.45,
      0.58,
      mat("#5a5d62", "metal", { side: THREE.DoubleSide }),
    );
    b.position.set(x, ey, z);
    g.add(b);
  }
  g.add(shuttleGear(!!flags.gear));
  const rig = orbiterFittings(g, flags, SH_BAY_BUILTIN);
  // mounts: three main engines (used by the launch stack) and the two OMS engines; plumes along −Y
  const mounts = SH_SSME.map(([x, y, z]) => ({
    y,
    x,
    z,
    r: 1.145,
    tag: "ssme",
  })).concat(SH_OMSE.map(([x, y, z]) => ({ y, x, z, r: 0.58, tag: "OMS" })));
  g.userData = {
    len: 32.75,
    mounts,
    nose: true,
    yc0: 14.7,
    capsuleR: 5,
    doors: { doorL, doorR },
    rig,
  };
  return g;
}
// what goes in and on the payload bay, for a bay of geometry B: lining, payloads, the robot arm (and Hubble on it), drag chute
// (returns the deploy rig when the arm is in motion)
function orbiterFittings(g, flags, B) {
  g.add(shuttleBayInterior(B));
  if (flags.pay) g.add(shuttlePayload(flags.pay, {}, B));
  if (flags.orbiter === "OV-104" || flags.pay === "mplm" || flags.ods)
    g.add(shuttlePayload(null, { ods: true, obss: true }, B));
  let rig = null;
  if (flags.armT) {
    rig = deployRig(flags, B);
    g.add(rig);
  } else {
    const arm = shuttleRMS(flags.rms || "stowed", B);
    g.add(arm);
    if (flags.payArm) {
      const h = hubbleModel({ arrays: !!flags.payArrays });
      h.rotation.x = Math.PI / 2;
      h.position.copy(arm.userData.wrist).add(new THREE.Vector3(0, 1.8, 3.0));
      g.add(h);
    }
  } // held upright, aperture away from the bay
  if (flags.dragChute) g.add(shuttleChute());
  return rig;
}
// the stack on the pad and during ascent: tank in the middle, boosters on its sides (±X), orbiter on −Z
const SH_STACK = { orbY: -1.0, orbZ: -8.55 }; // orbiter reference plane 336.5 in from the tank's
function buildShuttleStack(L, c) {
  const g = new THREE.Group(),
    mounts = [],
    ET = L.stages[1],
    SRB = L.stages[0];
  const white = c.variant === "sts1";
  const etStage = buildStage(
    white
      ? {
          ...ET,
          geom: ET.geom.map((p) => [
            p[0],
            p[1],
            p[2],
            p[3] === "#4a4a4a" ? p[3] : "#e9e7e0",
            p[4],
          ]),
        }
      : ET,
    { white },
  );
  g.add(etStage.group);
  for (const s of [-1, 1]) {
    const bp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2.0, 8),
      mat("#9aa0a6", "metal"),
    );
    bp.rotation.x = Math.PI / 2;
    bp.rotation.y = s * 0.35;
    bp.position.set(s * 0.35, SH_STACK.orbY + 28.6, -5.1);
    g.add(bp);
  } // forward bipod
  if (c.boosters)
    for (const s of [-1, 1]) {
      const b = buildStage(SRB);
      b.group.position.set(s * SRB.booster.offset, SRB.booster.y0, 0);
      if (s < 0) b.group.scale.x = -1;
      g.add(b.group); // the left booster is the right one's mirror image
      mounts.push({
        y: SRB.booster.y0 - SRB.eng.len,
        x: s * SRB.booster.offset,
        z: 0,
        r: 1.5,
        tag: "stage:SRB",
        prop: "solid",
        idx: 0,
      });
    }
  const orb = buildOrbiter({ bay: "closed", gear: false, orbiter: c.orbiter });
  orb.rotation.y = Math.PI;
  orb.position.set(0, SH_STACK.orbY, SH_STACK.orbZ);
  g.add(orb);
  for (const m of orb.userData.mounts.filter((m) => m.tag === "ssme"))
    mounts.push({
      y: SH_STACK.orbY + m.y,
      x: -m.x,
      z: SH_STACK.orbZ - m.z,
      r: m.r,
      tag: "stage:ET",
      prop: "hydrolox",
      idx: 1,
    });
  g.userData = { len: 46.9, mounts };
  return g;
}
// International Space Station as in July 2011. Axes: +Y forward (direction of flight), +Z zenith, X along the main truss
// (+X starboard). The docking port (PMA-2 on Harmony) faces +Y at ISS_DOCK; the origin is 21.5 m behind it on the axis of
// the US modules. Drawn with NASA's model (assets/iss.glb: the IGOAL lab's model set back to 2011 by tools/models); the
// built-in one below stands in while it loads.
const ISS_DOCK = [0, 21.5, 0]; // m, PMA-2 docking interface
function issModel(flags = {}) {
  return detailPart("iss", "iss", issBuiltIn(flags), {
    extra: (g) => {
      if (flags.mplm) g.add(issMplm());
    },
  });
}
// the logistics module (Raffaello on STS-135) on Harmony's nadir port
function issMplm() {
  const g = new THREE.Group(),
    m = mat("#e7e5df", "paint");
  const c = cyl(2.25, 2.25, 4.9, m, 32);
  c.position.y = -4.9 / 2;
  g.add(c);
  const a = cyl(2.25, 1.1, 0.8, mat("#d5d3cc", "paint"), 32);
  a.position.y = 2.45;
  g.add(a); // the berthing end, up against Harmony
  const b = cyl(1.6, 2.25, 0.6, mat("#d5d3cc", "paint"), 32);
  b.position.y = -3.05;
  g.add(b);
  g.rotation.x = Math.PI / 2;
  g.position.set(0, 15.0, -2.2 - 3.25);
  return g;
}
function issBuiltIn(flags = {}) {
  const g = new THREE.Group(),
    white = mat("#e9e8e3", "paint"),
    metal = mat("#b8bcc1", "metal"),
    arr = mat("#a77a3a", "solar"),
    rad = mat("#f2f2ee", "paint", { side: THREE.DoubleSide });
  const yT = 7.3; // the integrated truss sits on top of the Destiny laboratory
  const T = new THREE.Mesh(new THREE.BoxGeometry(109, 3.6, 3.6), metal);
  T.position.set(0, yT, 5.6);
  g.add(T);
  for (const s of [-1, 1])
    for (const x0 of [33, 46])
      for (const dz of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.08, 34), arr);
        w.position.set(s * x0, yT, 5.6 + dz * 19.5);
        g.add(w); // solar array wings (each pair 73 m tip to tip)
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 34, 6),
          metal,
        );
        mast.rotation.x = Math.PI / 2;
        mast.position.set(s * x0, yT - 0.2, 5.6 + dz * 19.5);
        g.add(mast);
      }
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 13), rad);
      r.position.set(s * (14 + k * 3.4), yT, 5.6 - 8.5);
      g.add(r);
    } // radiators
  const mod = (r, len, y, x = 0, z = 0, rx = 0, rz = 0, m = white) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), m);
    c.position.set(x, y, z);
    c.rotation.set(rx, 0, rz);
    g.add(c);
    return c;
  };
  mod(2.2, 7.2, 15.1); // Harmony
  mod(1.1, 2.8, 20.1, 0, 0, 0, 0, metal); // PMA-2
  mod(2.2, 8.5, 7.3); // Destiny
  mod(2.2, 5.5, 0.6); // Unity
  mod(2.05, 12.6, -8.6); // Zarya
  mod(2.1, 13.1, -21.5); // Zvezda
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.06, 3.2),
      mat("#1d2a4a", "solar"),
    );
    w.position.set(s * 7.4, -24.5, 0);
    g.add(w);
  }
  mod(2.25, 6.9, 15.1, 5.6, 0, 0, Math.PI / 2); // Columbus (starboard)
  mod(2.2, 11.2, 15.1, -7.8, 0, 0, Math.PI / 2); // Kibo (port)
  mod(2.2, 6.7, 0.6, -5.6, 0, 0, Math.PI / 2); // Tranquility
  if (flags.mplm) mod(2.25, 6.6, 15.1, 0, -2.2 - 3.3, Math.PI / 2, 0); // the logistics module on Harmony's nadir port
  g.userData.len = 60;
  g.userData.yc0 = 0;
  return g;
}

// ==== 33_mars2020.js
// ============================================================================
// Mars 2020's flight system apart from the rover (metres): the cruise stage, the aeroshell (heat shield and backshell) and
// the descent stage, the "sky crane". Mars 2020 was built to Mars Science Laboratory's drawings, so the shapes are MSL's.
// Axes: +Y along the axis from the heat shield's nose (Y = 0) toward the cruise stage; the heat shield leads into the air.
// The parts' proportions and layout follow NASA's exploded drawing of the spacecraft (PIA24128) and photographs of it
// being put together (PIA23887, PIA23886; MSL's descent stage, PIA11425).
//
// Aeroshell (MSL entry papers: Edquist 2009, Johansen 2011, Schoenenberger 2013): 4.5 m across. The heat shield is a 70°
// sphere-cone (nose radius 1.125 m) rounded at its shoulder (radius 0.126 m), 0.835 m from the nose to its widest point,
// covered in about a hundred PICA tiles (dark) with filled gaps between them. The backshell, painted white, is two cones
// (half-angles 36.9° and 59.7°, meeting at the 3.04 m "hip") up to the backshell interface plate (1.31 m across); on it the
// 29° parachute closeout cone and its lid, which the parachute is fired through, 3.0 m from the nose. A row of round ports
// and an access panel on the lower cone, a gold-rimmed port on the upper cone, bolts round the interface plate.
// Cruise stage: a disc as wide as the aeroshell, its outward face covered in solar cells, bolted to the interface plate
// round the parachute cone; ten radiator panels hang from its rim toward the aeroshell, so that it looks like a drum. Inside
// it: two propellant tanks, the cooling loop's pipes, electronics in gold blankets; two clusters of four thrusters on
// struts below the rim, on opposite sides; the medium-gain antenna's horn in a gap between two radiators. The cruise stage
// and the aeroshell together are 3.0 m tall (MSL launch press kit).
// Descent stage: a tapered octagonal frame, wider at its foot, holding three propellant tanks and two pressurant tanks in
// blankets; below its centre a keel with the bridle device at its point; eight throttleable engines in pairs on outriggers
// at the four diagonals, one of each pair canted 5° outboard and the other 22.5°; the radar's six antennas on a plate on one
// side. The rover hangs under the keel with its wheels folded up beside its body until it is lowered on three bridles and
// an umbilical, 6.4 m long (Perseverance's: Curiosity's were 7.5 m).
// ============================================================================
const M20 = { mats: {} };
// the profile [r, y] of the aeroshell's outer surface, resampled evenly along its length (so a texture's rows follow it)
function m20Resample(pts, n) {
  const L = [0];
  for (let i = 1; i < pts.length; i++)
    L.push(
      L[i - 1] +
        Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]),
    );
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (L[L.length - 1] * k) / (n - 1);
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / Math.max(L[j + 1] - L[j], 1e-9);
    out.push([
      pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f,
      pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f,
    ]);
  }
  out.len = L[L.length - 1];
  out.at = (s) => {
    let i = 0;
    while (i < L.length - 2 && L[i + 1] < s) i++;
    const f = (s - L[i]) / Math.max(L[i + 1] - L[i], 1e-9);
    return [
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ];
  };
  out.sOf = L;
  return out;
}
// heat shield: nose sphere to its tangent cone (20° from the axis), the 70° cone, the shoulder round to the seal with the backshell
function m20HeatShieldProfile() {
  const p = [];
  for (let a = 0; a <= 20; a += 2)
    p.push([1.125 * Math.sin(a * DEG), 1.125 * (1 - Math.cos(a * DEG))]);
  for (let a = -70; a <= 37; a += 6)
    p.push([
      2.124 + 0.126 * Math.cos(a * DEG),
      0.835 + 0.126 * Math.sin(a * DEG),
    ]); // shoulder (centre r 2.124, y 0.835)
  p.push([
    2.124 + 0.126 * Math.cos(37 * DEG),
    0.835 + 0.126 * Math.sin(37 * DEG),
  ]);
  return p;
}
const M20_SEAL = [2.225, 0.911],
  M20_HIP = [1.519, 1.85],
  M20_BIP = [0.654, 2.355],
  M20_PCC = [0.366, 2.875],
  M20_TOP = 3.001;
function m20BackshellProfile() {
  const p = [M20_SEAL, M20_HIP, M20_BIP, M20_PCC];
  for (let k = 1; k <= 4; k++) {
    const f = k / 4;
    p.push([
      M20_PCC[0] * Math.cos((f * Math.PI) / 2),
      M20_PCC[1] + (M20_TOP - M20_PCC[1]) * Math.sin((f * Math.PI) / 2),
    ]);
  }
  return p;
}
// the inside of a shell: the profile moved in along its normals, in reverse order (its faces turned inward)
function m20Inner(pts, d) {
  const out = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)],
      tr = b[0] - a[0],
      ty = b[1] - a[1],
      l = Math.hypot(tr, ty) || 1;
    return [Math.max(0, p[0] - (d * ty) / l), p[1] + (d * tr) / l];
  });
  return out.reverse();
}
// a texture drawn on a canvas, its top row at v = 0 (where a lathe's profile starts)
function m20Canvas(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let m20Seed = 7;
const m20Rnd = () => (m20Seed = (m20Seed * 9301 + 49297) % 233280) / 233280;
// the heat shield's PICA tiles: rings of tiles about 0.4 m across from the nose cap out over the shoulder, each a slightly
// different dark brown-black, the filled gaps between them a little lighter; a few sensor plugs near the nose
function m20HeatShieldMat() {
  if (M20.mats.hs) return M20.mats.hs;
  const prof = m20Resample(m20HeatShieldProfile(), 200),
    L = prof.len,
    W = 2048,
    H = 512;
  const tex = m20Canvas(W, H, (g) => {
    m20Seed = 11;
    g.fillStyle = "#26221f";
    g.fillRect(0, 0, W, H);
    const rows = [0, 0.32];
    while (rows[rows.length - 1] < L - 0.25)
      rows.push(Math.min(L, rows[rows.length - 1] + 0.4));
    rows.push(L);
    for (let k = 0; k < rows.length - 1; k++) {
      const y0 = (rows[k] / L) * H,
        y1 = (rows[k + 1] / L) * H,
        r = prof.at((rows[k] + rows[k + 1]) / 2)[0],
        n = k === 0 ? 1 : Math.max(6, Math.round((2 * Math.PI * r) / 0.42)),
        off = m20Rnd();
      for (let j = 0; j < n; j++) {
        const x0 = ((j + off) / n) * W,
          x1 = ((j + 1 + off) / n) * W,
          v = 30 + Math.floor(m20Rnd() * 16);
        g.fillStyle = `rgb(${v + 8},${v + 2},${v - 2})`;
        g.fillRect(x0, y0, x1 - x0, y1 - y0);
        g.fillRect(x0 - W, y0, x1 - x0, y1 - y0);
      }
      g.fillStyle = "#5a4a3e";
      if (k > 0) g.fillRect(0, y0 - 1.5, W, 3); // the gap between two rings
      if (k > 0)
        for (let j = 0; j < n; j++) {
          const x = (((j + off) / n) * W) % W;
          g.fillRect(x - 1.5, y0, 3, y1 - y0);
        }
    }
    for (let i = 0; i < 9000; i++) {
      const v = m20Rnd();
      g.fillStyle = v > 0.5 ? "rgba(255,235,210,0.035)" : "rgba(0,0,0,0.06)";
      g.fillRect(
        m20Rnd() * W,
        m20Rnd() * H,
        2 + m20Rnd() * 6,
        1 + m20Rnd() * 3,
      );
    } // the ablator's fibrous mottle
    g.fillStyle = "#6a5c50";
    for (const [x, s] of [
      [0, 0.05],
      [0.25, 0.5],
      [0.75, 0.5],
      [0.1, 0.9],
      [0.6, 0.9],
      [0.35, 1.4],
      [0.85, 1.4],
    ]) {
      g.beginPath();
      g.arc(x * W, (s / L) * H, 3, 0, 2 * Math.PI);
      g.fill();
    } // sensor plugs
  });
  return (M20.mats.hs = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.05,
  }));
}
// the backshell's white paint and what shows on it: the dark rim of the seal with its bolts; round ports (grey, and
// smaller gold ones) in a row above the seal; an access panel with its rivets; the hip; on the upper cone two gold-rimmed
// ports and a ring of rivets below the interface plate; the plate's aluminium ring; the parachute closeout cone, a slightly
// warmer white, with a slot on one side; the lid
function m20BackshellMat() {
  if (M20.mats.bs) return M20.mats.bs;
  const prof = m20Resample(m20BackshellProfile(), 200),
    L = prof.len,
    W = 2048,
    H = 1024,
    S = (s) => (s / L) * H;
  const sHip = Math.hypot(M20_SEAL[0] - M20_HIP[0], M20_SEAL[1] - M20_HIP[1]),
    sBip = sHip + Math.hypot(M20_HIP[0] - M20_BIP[0], M20_HIP[1] - M20_BIP[1]),
    sPcc = sBip + Math.hypot(M20_BIP[0] - M20_PCC[0], M20_BIP[1] - M20_PCC[1]);
  // a disc of radius rho (m) on the shell at azimuth a (deg, from +Z toward +X) and distance s along the profile: an ellipse on the map
  const disc = (g, a, s, rho, fill, rim) => {
    const r = prof.at(s)[0],
      ex = (rho / (2 * Math.PI * r)) * W,
      ey = (rho / L) * H,
      x = ((((a / 360) % 1) + 1) % 1) * W;
    for (const dx of [0, -W, W]) {
      g.beginPath();
      g.ellipse(x + dx, S(s), ex, ey, 0, 0, 2 * Math.PI);
      g.fillStyle = fill;
      g.fill();
      if (rim) {
        g.lineWidth = 2;
        g.strokeStyle = rim;
        g.stroke();
      }
    }
  };
  const dots = (g, s, step, col) => {
    const r = prof.at(s)[0],
      n = Math.round((2 * Math.PI * r) / step);
    g.fillStyle = col;
    for (let k = 0; k < n; k++) {
      g.beginPath();
      g.arc(((k + 0.5) / n) * W, S(s), 1.6, 0, 2 * Math.PI);
      g.fill();
    }
  };
  const tex = m20Canvas(W, H, (g) => {
    m20Seed = 5;
    g.fillStyle = "#e9e8e3";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle =
        m20Rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(90,85,78,0.035)";
      g.fillRect(
        m20Rnd() * W,
        m20Rnd() * S(sBip),
        3 + m20Rnd() * 10,
        2 + m20Rnd() * 5,
      );
    }
    g.fillStyle = "#2f3034";
    g.fillRect(0, 0, W, S(0.035));
    dots(g, 0.018, 0.3, "#9a9ca0"); // the seal's rim and its bolts
    // round ports above the seal (azimuth, size): large grey ones and small gold ones
    for (const [a, big] of [
      [-78, 0],
      [-62, 0],
      [-40, 1],
      [-20, 0],
      [-2, 0],
      [15, 1],
      [33, 0],
      [52, 0],
      [70, 1],
      [118, 0],
      [160, 1],
      [205, 0],
      [250, 1],
      [290, 0],
      [318, 0],
    ])
      disc(
        g,
        a,
        big ? 0.36 : 0.33,
        big ? 0.11 : 0.055,
        big ? "#c3c3bf" : "#a8925a",
        big ? "#8f8f8b" : "#6f5f37",
      );
    // an access panel (rounded, rivets round its edge)
    {
      const s0 = 0.6,
        s1 = 1.0,
        r = prof.at((s0 + s1) / 2)[0],
        w = (0.55 / (2 * Math.PI * r)) * W,
        x = (1 - 55 / 360) * W,
        y0 = S(s0),
        y1 = S(s1);
      g.strokeStyle = "rgba(110,108,102,0.8)";
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(x - w / 2, y0, w, y1 - y0, 12);
      g.stroke();
      g.fillStyle = "rgba(95,92,86,0.9)";
      for (let k = 0; k <= 8; k++)
        for (const [px, py] of [
          [x - w / 2 + 6 + (k * (w - 12)) / 8, y0 + 6],
          [x - w / 2 + 6 + (k * (w - 12)) / 8, y1 - 6],
          [x - w / 2 + 6, y0 + 6 + (k * (y1 - y0 - 12)) / 8],
          [x + w / 2 - 6, y0 + 6 + (k * (y1 - y0 - 12)) / 8],
        ]) {
          g.beginPath();
          g.arc(px, py, 1.8, 0, 2 * Math.PI);
          g.fill();
        }
    }
    g.strokeStyle = "rgba(150,147,140,0.45)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, S(sHip));
    g.lineTo(W, S(sHip));
    g.stroke(); // the hip
    for (const a of [20, 200]) {
      disc(g, a, sHip + 0.6, 0.17, "#c49a42");
      disc(g, a, sHip + 0.6, 0.12, "#47474a");
      disc(g, a, sHip + 0.6, 0.07, "#7d7e82");
    } // gold-rimmed ports
    dots(g, sBip - 0.06, 0.07, "rgba(105,103,98,0.9)"); // rivets below the interface plate
    g.fillStyle = "#b5b8bc";
    g.fillRect(0, S(sBip) - 6, W, 12); // the interface plate's ring
    g.fillStyle = "#eeebe4";
    g.fillRect(0, S(sBip) + 6, W, S(sPcc) - S(sBip) - 6); // the parachute closeout cone
    dots(g, sBip + 0.05, 0.08, "rgba(120,118,112,0.8)");
    disc(g, -40, sBip + 0.3, 0.07, "rgba(60,60,64,0.85)"); // the slot in its side
    g.fillStyle = "#f2f0ea";
    g.fillRect(0, S(sPcc), W, H - S(sPcc)); // the lid
  });
  return (M20.mats.bs = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    metalness: 0.03,
  }));
}
const m20InnerMat = () =>
  M20.mats.inner ||
  (M20.mats.inner = new THREE.MeshStandardMaterial({
    color: "#3a3c40",
    roughness: 0.7,
    metalness: 0.3,
    side: THREE.DoubleSide,
  }));
// the heat shield (with its inner face, the structure it is bonded to), y = 0 at the nose
function m20HeatShield() {
  const g = new THREE.Group(),
    prof = m20Resample(m20HeatShieldProfile(), 70);
  g.add(lathe(prof, m20HeatShieldMat(), 96));
  const inner = m20Inner(prof, 0.06);
  g.add(lathe(inner, mat("#4a4740", "dark", { side: THREE.DoubleSide }), 72));
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(inner[0][0], prof[prof.length - 1][0], 72, 1),
    mat("#5a5048", "dark", { side: THREE.DoubleSide }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = prof[prof.length - 1][1];
  g.add(rim);
  g.userData.len = M20_SEAL[1];
  return g;
}
// the backshell with the interface plate, the parachute closeout cone and its lid; the bolts round the plate that hold the
// cruise stage; the parachute low-gain antenna's radome on the lid; the cruise balance masses (flags.cbm: there until the
// cruise stage goes)
function m20Backshell(flags = {}) {
  const g = new THREE.Group(),
    prof = m20Resample(m20BackshellProfile(), 90);
  g.add(lathe(prof, m20BackshellMat(), 96));
  g.add(
    lathe(
      m20Inner(m20Resample([M20_SEAL, M20_HIP, M20_BIP], 30), 0.05),
      m20InnerMat(),
      64,
    ),
  );
  const radome = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 20, 10, 0, TAU, 0, Math.PI / 2),
    mat("#f4f1ea", "paint"),
  );
  radome.position.set(0.15, M20_TOP - 0.03, 0.04);
  g.add(radome);
  for (let k = 0; k < 4; k++) {
    const b = cyl(0.03, 0.03, 0.05, mat("#c9a04a", "gold"), 10);
    b.position.set(...m20Polar(0.7, (30 + 90 * k) * DEG, M20_BIP[1] - 0.01));
    g.add(b);
  }
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.62, 32),
    m20InnerMat(),
  );
  plate.rotation.x = Math.PI / 2;
  plate.position.y = M20_BIP[1] - 0.05;
  g.add(plate); // the interface plate from inside (the parachute is packed above it)
  if (flags.cbm)
    for (const a of [0, Math.PI]) {
      const b = box(0.24, 0.16, 0.2, mat("#6f7378", "metal"));
      const r = M20_SEAL[0] - 0.2;
      b.position.set(Math.sin(a) * r, M20_SEAL[1] + 0.12, Math.cos(a) * r);
      b.rotation.y = a;
      b.rotateX(-0.64);
      g.add(b);
    }
  g.userData.len = M20_TOP;
  return g;
}
// small builders: a point at azimuth a (from +Z toward +X), radius r, height y; a round tube and a square beam from p to q
const m20Polar = (r, a, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
const M20_UP = new THREE.Vector3(0, 1, 0);
function m20Span(geo, p, q, m) {
  const a = new THREE.Vector3(...p),
    d = new THREE.Vector3(...q).sub(a),
    L = d.length(),
    o = new THREE.Mesh(geo(L), m);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(M20_UP, d.normalize());
  return o;
}
const m20Bar = (p, q, r, m) =>
  m20Span((L) => new THREE.CylinderGeometry(r, r, L, 8), p, q, m);
const m20Beam = (p, q, w, m) =>
  m20Span((L) => new THREE.BoxGeometry(w, L, w), p, q, m);
// the cruise stage's solar array: cells in ten panels round the central cylinder
function m20SolarTex() {
  if (M20.mats.solarTex) return M20.mats.solarTex;
  const R0 = 0.7,
    R1 = 2.25;
  return (M20.mats.solarTex = m20Canvas(2048, 2048, (g, W) => {
    m20Seed = 3;
    const c = W / 2,
      k = c / R1;
    g.fillStyle = "#9a9ea4";
    g.fillRect(0, 0, W, W);
    for (let p = 0; p < 10; p++) {
      const a0 = (p * TAU) / 10 + 0.01,
        a1 = ((p + 1) * TAU) / 10 - 0.01;
      g.beginPath();
      g.arc(c, c, (R1 - 0.03) * k, a0, a1);
      g.arc(c, c, (R0 + 0.03) * k, a1, a0, true);
      g.closePath();
      g.fillStyle = "#2a3046";
      g.fill(); // the panel between its cells
      g.save();
      g.clip();
      for (let r = R0 + 0.035; r < R1 - 0.07; r += 0.065) {
        const n = Math.round(((a1 - a0) * r) / 0.045);
        for (let j = 0; j < n; j++) {
          const a = a0 + ((j + 0.5) * (a1 - a0)) / n,
            v = 20 + m20Rnd() * 7;
          g.fillStyle = `rgb(${v},${v + 9},${v + 38})`;
          g.beginPath();
          g.arc(
            c,
            c,
            (r + 0.062) * k,
            a - (0.47 * (a1 - a0)) / n,
            a + (0.47 * (a1 - a0)) / n,
          );
          g.arc(
            c,
            c,
            (r + 0.003) * k,
            a + (0.47 * (a1 - a0)) / n,
            a - (0.47 * (a1 - a0)) / n,
            true,
          );
          g.closePath();
          g.fill();
        }
      }
      g.restore();
    }
  }));
}
const M20_CS_TOP = 2.98; // the solar array's face: the cruise stage and aeroshell stand 3.0 m tall
// the cruise stage, in the aeroshell's frame; userData.mounts: its two thruster clusters
function m20CruiseStage() {
  const g = new THREE.Group(),
    R = 2.25,
    top = M20_CS_TOP,
    y0 = top - 0.05,
    H = 0.75,
    yb = y0 - H,
    mounts = [];
  const white = mat("#ecebe6", "paint", { side: THREE.DoubleSide }),
    alu = mat("#b9bdc3", "metal"),
    copper = mat("#a86c3e", "metal"),
    dark = mat("#2b2c30", "dark");
  // the solar array: the cells outward, the panels' backs inward, its edge
  const face = new THREE.Mesh(
    new THREE.RingGeometry(0.7, R, 120, 2),
    new THREE.MeshStandardMaterial({
      map: m20SolarTex(),
      roughness: 0.32,
      metalness: 0.35,
    }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = top;
  g.add(face);
  const back = new THREE.Mesh(
    new THREE.RingGeometry(0.7, R, 120, 1),
    mat("#62666c", "metal"),
  );
  back.rotation.x = Math.PI / 2;
  back.position.y = y0;
  g.add(back);
  const edge = cyl(R, R, 0.05, mat("#26272a", "dark"), 120, true);
  edge.position.y = y0;
  g.add(edge);
  // the central cylinder, from the interface plate up through the array
  const core = cyl(
    0.7,
    0.7,
    top - M20_BIP[1],
    mat("#aeb2b8", "metal", { side: THREE.DoubleSide }),
    40,
    true,
  );
  core.position.y = M20_BIP[1];
  g.add(core);
  const flange = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.82, 40),
    mat("#9da2a8", "metal", { side: THREE.DoubleSide }),
  );
  flange.rotation.x = -Math.PI / 2;
  flange.position.y = M20_BIP[1] + 0.006;
  g.add(flange);
  // ten radiators round the rim, a wider gap at +Z for the medium-gain antenna; the cooling loop's pipes along them
  for (let k = 0; k < 10; k++) {
    const a0 = (k * 36 + 1.2 + (k === 0 ? 3.8 : 0)) * DEG,
      a1 = ((k + 1) * 36 - 1.2 - (k === 9 ? 3.8 : 0)) * DEG;
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(
        R - 0.012,
        R - 0.012,
        H,
        8,
        1,
        true,
        a0,
        a1 - a0,
      ),
      white,
    );
    p.position.y = yb + H / 2;
    g.add(p);
  }
  for (const y of [yb + 0.07, y0 - 0.12]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(R - 0.07, 0.016, 6, 96),
      copper,
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  // ribs under the array, struts from the central cylinder down and out to the radiators' feet
  for (let k = 0; k < 10; k++) {
    const a = (k * TAU) / 10;
    g.add(
      m20Beam(
        m20Polar(0.72, a, y0 - 0.04),
        m20Polar(R - 0.05, a, y0 - 0.04),
        0.06,
        alu,
      ),
    );
    g.add(
      m20Bar(
        m20Polar(0.72, a, M20_BIP[1] + 0.1),
        m20Polar(R - 0.06, a, yb + 0.06),
        0.022,
        copper,
      ),
    );
  }
  // propellant tanks, electronics in gold blankets
  for (const a of [60, 240]) {
    const t = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 24, 16),
      mat("#b08a5c", "metal"),
    );
    t.position.set(...m20Polar(1.6, a * DEG, yb + 0.32));
    g.add(t);
    g.add(
      m20Bar(
        m20Polar(1.6, a * DEG, yb + 0.5),
        m20Polar(1.6, a * DEG, y0 - 0.05),
        0.02,
        alu,
      ),
    );
  }
  for (const [a, w] of [
    [125, 0.4],
    [162, 0.3],
    [302, 0.36],
    [338, 0.3],
    [205, 0.32],
  ]) {
    const b = box(w, 0.2, 0.28, foilMat("gold", 1));
    b.position.set(...m20Polar(1.75, a * DEG, y0 - 0.3));
    b.rotation.y = a * DEG;
    g.add(b);
  }
  // two thruster clusters below the rim (±X), four nozzles each pointing down and out
  for (const s of [-1, 1]) {
    const cl = new THREE.Group();
    cl.position.set(s * (R + 0.06), yb - 0.05, 0);
    cl.rotation.y = (s * Math.PI) / 2;
    g.add(cl);
    cl.add(box(0.26, 0.08, 0.14, mat("#8c9096", "metal")));
    for (let i = 0; i < 4; i++) {
      const n = bell(
        0.09,
        0.028,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      const e = new THREE.Group();
      e.position.set((i - 1.5) * 0.06, 0, 0.03);
      e.rotation.x = -0.55;
      e.add(n);
      n.position.y = -0.09;
      cl.add(e);
    }
    g.add(
      m20Bar(
        [s * (R + 0.04), yb - 0.01, 0],
        [s * (R - 0.15), yb + 0.25, 0],
        0.016,
        alu,
      ),
    );
    const d = new THREE.Vector3(0, -1, 0)
        .applyEuler(new THREE.Euler(-0.55, 0, 0))
        .applyEuler(cl.rotation),
      ex = new THREE.Vector3(0, -0.09, 0)
        .applyEuler(new THREE.Euler(-0.55, 0, 0))
        .add(new THREE.Vector3(0, 0, 0.03))
        .applyEuler(cl.rotation)
        .add(cl.position);
    mounts.push({
      x: ex.x,
      y: ex.y,
      z: ex.z,
      r: 0.04,
      tag: "CRUISE",
      d: [d.x, d.y, d.z],
    });
  }
  // the medium-gain antenna's horn, looking out through the gap at +Z; a star scanner and sun sensors on the array
  const horn = cyl(
    0.07,
    0.15,
    0.3,
    mat("#2c2d31", "dark", { side: THREE.DoubleSide }),
    24,
    true,
  );
  horn.rotation.x = Math.PI / 2;
  horn.position.set(0, y0 - 0.22, R - 0.42);
  g.add(horn);
  const throat = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), dark);
  throat.position.set(0, y0 - 0.22, R - 0.42);
  g.add(throat);
  g.add(m20Bar([0, y0 - 0.05, R - 0.3], [0, y0 - 0.16, R - 0.3], 0.02, alu));
  const ss = box(0.16, 0.12, 0.16, dark);
  ss.position.set(...m20Polar(1.2, 200 * DEG, top));
  g.add(ss);
  const shade = cyl(
    0.06,
    0.09,
    0.12,
    mat("#1c1d20", "dark", { side: THREE.DoubleSide }),
    16,
    true,
  );
  shade.position.set(...m20Polar(1.2, 200 * DEG, top + 0.12));
  g.add(shade);
  for (const a of [100, 280]) {
    const sn = box(0.07, 0.04, 0.07, mat("#cfa64a", "gold"));
    sn.position.set(...m20Polar(2.1, a * DEG, top));
    g.add(sn);
  }
  g.userData.len = top;
  g.userData.mounts = mounts;
  return g;
}
// one descent engine: valve and chamber over its bell, canted outboard (+Z) by cant (deg); its exit 0.6 m below the origin
function m20Engine(cant) {
  const e = new THREE.Group();
  e.rotation.x = -cant * DEG;
  const v = box(0.13, 0.07, 0.11, mat("#8b8f95", "metal"));
  v.position.y = -0.07;
  e.add(v);
  const ch = cyl(0.072, 0.072, 0.21, mat("#b8bcc2", "metal"), 16);
  ch.position.y = -0.28;
  e.add(ch);
  const b = bell(
    0.32,
    0.12,
    mat("#6a6b6f", "metal", { side: THREE.DoubleSide }),
  );
  b.position.y = -0.6;
  e.add(b);
  return e;
}
// the descent stage, y = 0 at the foot of its frame; userData.mounts: its eight engines (tag DS, cant, exhaust direction d)
function m20DescentStage() {
  const g = new THREE.Group(),
    alu = mat("#c3c7cc", "metal"),
    grey = mat("#7b8086", "metal", { side: THREE.DoubleSide }),
    mli = foilMat("mylar", 2),
    mounts = [];
  const RB = 1.05,
    RT = 0.78,
    YT = 0.85,
    corner = (r, k, y) => m20Polar(r, ((k + 0.5) * TAU) / 8, y); // the frame's foot and top (octagons, by their corners)
  for (let k = 0; k < 8; k++) {
    g.add(m20Beam(corner(RB, k, 0.04), corner(RB, k + 1, 0.04), 0.07, alu));
    g.add(m20Beam(corner(RT, k, YT), corner(RT, k + 1, YT), 0.06, alu));
    g.add(m20Beam(corner(RB, k, 0.04), corner(RT, k, YT), 0.055, alu));
    if (k % 2 === 0)
      g.add(
        m20Beam(corner(RB, k, 0.06), corner(RT, k + 1, YT - 0.02), 0.035, alu),
      );
  }
  g.add(m20Beam([-0.68, YT, -0.28], [0.68, YT, -0.28], 0.06, alu));
  g.add(m20Beam([0.28, YT, -0.68], [0.28, YT, 0.68], 0.06, alu)); // two beams across the top
  // three sides closed by panels with equipment behind them; the deck at the foot
  for (const k of [1, 4, 6]) {
    const q = [
        corner(RB, k, 0.04),
        corner(RB, k + 1, 0.04),
        corner(RT, k + 1, YT),
        corner(RT, k, YT),
      ],
      geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]],
        3,
      ),
    );
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, grey));
  }
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(RB * 0.96, RB * 0.96, 0.03, 8),
    mat("#9fa4aa", "metal"),
  );
  deck.rotation.y = TAU / 16;
  deck.position.y = 0.02;
  g.add(deck);
  // propellant tanks and pressurant tanks, in blankets; electronics
  for (const a of [0, 120, 240]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), mli);
    t.position.set(...m20Polar(0.5, a * DEG, 0.42));
    g.add(t);
  }
  for (const a of [60, 300]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), mli);
    t.position.set(...m20Polar(0.74, a * DEG, 0.55));
    g.add(t);
  }
  for (const [a, w] of [
    [180, 0.42],
    [100, 0.3],
  ]) {
    const b = box(w, 0.22, 0.26, foilMat("mylar", 1));
    b.position.set(...m20Polar(0.62, a * DEG, 0.06));
    b.rotation.y = a * DEG;
    g.add(b);
  }
  // the keel under the centre and the bridle device at its point
  const keel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.12, 0.5, 4, 1),
    grey,
  );
  keel.rotation.y = Math.PI / 4;
  keel.position.y = -0.25;
  g.add(keel);
  const bud = cyl(0.15, 0.15, 0.1, mat("#a9adb3", "metal"), 20);
  bud.position.y = -M20_BUD;
  g.add(bud);
  // four engine pods on outriggers at the diagonals, two engines each
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      P = m20Polar(1.55, a, 0.08),
      pod = new THREE.Group();
    pod.position.set(...P);
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.44, 0.14, 0.24, grey));
    for (const [s, cant] of [
      [-1, k % 2 ? 22.5 : 5],
      [1, k % 2 ? 5 : 22.5],
    ]) {
      const e = m20Engine(cant);
      e.position.set(s * 0.12, 0.02, 0);
      pod.add(e);
      const ex = new THREE.Vector3(0, -0.6, 0)
        .applyEuler(e.rotation)
        .add(e.position)
        .applyEuler(pod.rotation)
        .add(pod.position);
      const d = new THREE.Vector3(0, -1, 0)
        .applyEuler(e.rotation)
        .applyEuler(pod.rotation);
      mounts.push({
        x: ex.x,
        y: ex.y,
        z: ex.z,
        r: 0.12,
        tag: "DS",
        cant,
        d: [d.x, d.y, d.z],
      });
    }
    for (const j of [2 * k, 2 * k + 1]) {
      g.add(m20Bar(corner(RB, j, 0.04), [P[0], 0.14, P[2]], 0.024, alu));
      g.add(m20Bar(corner(RT, j, YT), [P[0], 0.2, P[2]], 0.02, alu));
    }
    const fit = cyl(0.05, 0.05, 0.06, mat("#c9a04a", "gold"), 12);
    fit.position.set(...corner(RT, 2 * k, YT + 0.03));
    g.add(fit); // where it hangs from the backshell
  }
  // the radar's six antennas on a plate on the −X side, tilted down and out
  const rad = new THREE.Group();
  rad.position.set(-1.12, -0.14, 0);
  rad.rotation.set(0, -Math.PI / 2, 0);
  rad.rotateX(-0.35);
  g.add(rad);
  rad.add(box(0.9, 0.04, 0.4, mat("#dedcd5", "paint")));
  for (let i = 0; i < 6; i++) {
    const d = cyl(0.075, 0.075, 0.03, mat("#6d5c3e", "metal"), 16);
    d.position.set(
      ((i % 3) - 1) * 0.28,
      -0.06,
      (Math.floor(i / 3) - 0.5) * 0.19,
    );
    d.rotation.set((Math.floor(i / 3) - 0.5) * 0.5, 0, ((i % 3) - 1) * 0.35);
    rad.add(d);
  }
  g.add(m20Bar(corner(RB, 5, 0.04), [-1.05, -0.1, -0.25], 0.02, alu));
  g.add(m20Bar(corner(RB, 6, 0.04), [-1.05, -0.1, 0.25], 0.02, alu));
  g.add(
    m20Bar(
      [0.45, YT, 0.3],
      [0.45, YT + 0.5, 0.3],
      0.016,
      mat("#1d1e21", "dark"),
    ),
  ); // UHF antenna
  g.userData.len = YT;
  g.userData.mounts = mounts;
  return g;
}
// The stack inside the aeroshell: the descent stage's foot 1.35 m above the heat shield's nose (its top just under the
// backshell), the bridle device 0.6 m below it, the rover's deck against the device. Lowered, the rover hangs 6.4 m further
// down: the descent stage stands M20_HANG above the ground when the rover's wheels touch it (edl.hang in src/vehicles.js).
const M20_DS = 1.35,
  M20_BUD = 0.6,
  M20_DECK = 1.13,
  M20_BRIDLE = 6.4,
  M20_HANG = M20_BUD + M20_BRIDLE + M20_DECK;
// the assemblies the app shows, by part (buildSC 'msl'): the stack in cruise; the entry vehicle (with or without its heat
// shield; the descent stage and rover inside show once it is gone); the heat shield, backshell or cruise stage on their
// own (flags.rest: lying on the ground); the descent stage with the rover (stowed, then lowered from flags.skyT); the
// descent stage alone, flying away; the rover on the ground
function m20Assembly(P, flags) {
  const g = new THREE.Group();
  const mounts = [];
  let len = M20_TOP;
  if (P.has("cruise")) {
    g.add(m20HeatShield());
    g.add(m20Backshell({ cbm: true }));
    const cs = m20CruiseStage();
    g.add(cs);
    mounts.push(...cs.userData.mounts);
  } else if (P.has("cruisestage")) {
    const cs = m20CruiseStage();
    cs.position.y = -M20_BIP[1];
    g.add(cs);
    for (const m of cs.userData.mounts)
      mounts.push({ ...m, y: m.y - M20_BIP[1] });
    len = 0.7;
  } else if (P.has("aeroshell")) {
    if (flags.hs !== false) g.add(m20HeatShield());
    g.add(m20Backshell({}));
    if (flags.hs === false) {
      const ds = m20DescentStage();
      ds.position.y = M20_DS;
      g.add(ds);
      const rv = roverD(false, true);
      rv.position.y = M20_DS - M20_BUD - M20_DECK;
      g.add(rv);
    }
    g.userData.chuteY = M20_TOP;
    g.userData.capsuleR = 2.25;
    g.userData.dgb = true;
  } else if (P.has("heatshield")) {
    g.add(m20HeatShield());
    g.userData.footY = flags.rest ? 0 : 1.35;
  } else if (P.has("backshell")) {
    g.add(m20Backshell({}));
    g.userData.chuteY = M20_TOP;
    g.userData.capsuleR = 2.25;
    g.userData.dgb = true;
    g.userData.footY = flags.rest ? M20_SEAL[1] : 1.35;
  } else if (P.has("descentstage")) {
    const ds = m20DescentStage();
    g.add(ds);
    mounts.push(...ds.userData.mounts);
    len = 1;
    g.userData.yc0 = 0;
  } else if (P.has("lander")) {
    if (flags.landed) {
      const rv = roverD(true);
      g.add(rv);
      g.userData.footY = 0;
      len = 2.2;
    } else {
      const ds = m20DescentStage();
      g.add(ds);
      mounts.push(
        ...ds.userData.mounts.filter(
          (m) => !(flags.skyT != null && m.cant > 10),
        ),
      ); // four engines shut down for the sky crane
      const rv = roverD(false, true);
      rv.position.y = -M20_BUD - M20_DECK;
      g.add(rv);
      // three bridles from the bridle device down to the rover's deck, and the umbilical beside them; the rover's wheels
      // unfold a second after it starts down
      const lines = [
        [0.55, 0.45, 0.012],
        [-0.55, 0.45, 0.012],
        [0, -0.62, 0.012],
        [0.16, 0.05, 0.022],
      ].map(([x, z, w]) => {
        const l = new THREE.Mesh(
          new THREE.CylinderGeometry(w, w, 1, 6),
          mat(w > 0.015 ? "#3b3d41" : "#d9d4c6", "fabric"),
        );
        l.visible = false;
        g.add(l);
        return { l, a: new THREE.Vector3(x * 0.25, -M20_BUD, z * 0.25), x, z };
      });
      const b = new THREE.Vector3();
      if (flags.skyT != null)
        g.userData.animate = (t) => {
          const s = t - flags.skyT,
            d = M20_BRIDLE * smoothstep(clamp(s / 6.5, 0, 1));
          rv.position.y = -M20_BUD - M20_DECK - d;
          if (rv.userData.mobility)
            rv.userData.mobility(smoothstep(clamp((s - 1) / 2.5, 0, 1)));
          for (const L of lines) {
            b.set(L.x, rv.position.y + M20_DECK, L.z);
            const n = b.distanceTo(L.a);
            L.l.visible = d > 0.02;
            L.l.position.copy(L.a).add(b).multiplyScalar(0.5);
            L.l.scale.y = n;
            L.l.quaternion.setFromUnitVectors(M20_UP, b.sub(L.a).normalize());
          }
        };
      g.userData.yc0 = 0;
      len = 1;
    }
  }
  g.userData.len = g.userData.len || len;
  return { inner: g, mounts };
}

// ==== 34_hubble.js
// ============================================================================
// The Hubble Space Telescope as it was launched in 1990 (STS-31). Sizes from the HST media reference guide: the aft shroud,
// 4.3 m across and 3.5 m long, closed by the flat aft bulkhead; the equipment section, a ring of twelve bays as wide as the
// shroud and 1.1 m long, round the primary mirror; the forward shell and the light shield, 3.05 m across and 4 m long
// each; the aperture door, 3 m across, which opens 105°. Most of the outside is blanketed: aluminised Teflon over the
// forward shell and light shield, a quilt of blankets with the shell's reinforcing rings showing as bands; silvered tape on
// the aft shroud and the bays' doors. Yellow handrails run round it and along it; four magnetic torquers lie along the
// forward shell, 90° apart.
// The first solar arrays, ESA's: two "double roll-out" wings 12.1 m long and 2.5 m wide, each a pair of blankets rolled out
// both ways from a drum along two booms, the drum on a 1.2 m mast from the aft end of the forward shell; stowed, mast and
// drum lie folded forward along the forward shell. Two high-gain antennas, dishes on masts, stowed along the light shield
// and the forward shell.
// +Y toward the aperture; origin at the middle of the 13.2 m body; the arrays on ±X, the antennas and the grapple fixture
// (on the equipment section) on ±Z.
// ============================================================================
const HST = {
  mats: {},
  aft: -6.6,
  es: -3.1,
  fwd: -2.0,
  door: 6.45,
  R: 2.15,
  r: 1.53,
};
function hstCanvas(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
let hstSeed = 3;
const hstRnd = () => (hstSeed = (hstSeed * 9301 + 49297) % 233280) / 233280;
// the blankets over the forward shell and light shield (8.45 m, the map's height, from the shell's aft end): panels about
// 1.2 m round and 1.4 m along, each a slightly different silver, with darker seams; the shell's rings as bands under them
function hstBlanketMat() {
  if (HST.mats.mli) return HST.mats.mli;
  const L = HST.door - HST.fwd,
    C = TAU * HST.r;
  const tex = hstCanvas(1024, 1024, (g, W, H) => {
    hstSeed = 5;
    g.fillStyle = "#dcdee1";
    g.fillRect(0, 0, W, H);
    const nu = Math.round(C / 1.2),
      nv = Math.round(L / 1.4);
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const v = 216 + Math.floor(hstRnd() * 22);
        g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        g.fillRect((i / nu) * W + 2, (j / nv) * H + 2, W / nu - 4, H / nv - 4);
      }
    for (let k = 0; k < 2600; k++) {
      g.fillStyle =
        hstRnd() > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(60,64,70,0.07)";
      g.fillRect(
        hstRnd() * W,
        hstRnd() * H,
        2 + hstRnd() * 14,
        1 + hstRnd() * 3,
      );
    } // creases
    g.fillStyle = "rgba(120,124,130,0.35)";
    for (let y = 0.4; y < 4.0; y += 0.8)
      g.fillRect(0, (1 - y / L) * H - 3, W, 6); // the forward shell's rings
    g.strokeStyle = "rgba(95,98,104,0.8)";
    g.lineWidth = 2;
    for (let i = 0; i <= nu; i++) {
      g.beginPath();
      g.moveTo((i / nu) * W, 0);
      g.lineTo((i / nu) * W, H);
      g.stroke();
    }
    for (let j = 0; j <= nv; j++) {
      g.beginPath();
      g.moveTo(0, (j / nv) * H);
      g.lineTo(W, (j / nv) * H);
      g.stroke();
    }
  });
  return (HST.mats.mli = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
    metalness: 0.3,
  }));
}
// the aft shroud's silvered tape: sixteen panels between its longerons, the doors to the instruments
function hstShroudMat() {
  if (HST.mats.shroud) return HST.mats.shroud;
  const tex = hstCanvas(1024, 512, (g, W, H) => {
    hstSeed = 9;
    g.fillStyle = "#c9ccd0";
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const v = 188 + Math.floor(hstRnd() * 26);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect((i / 16) * W + 4, 0, W / 16 - 8, H);
    }
    for (let k = 0; k < 1600; k++) {
      g.fillStyle =
        hstRnd() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(40,44,50,0.06)";
      g.fillRect(
        hstRnd() * W,
        hstRnd() * H,
        2 + hstRnd() * 10,
        1 + hstRnd() * 2,
      );
    }
    g.fillStyle = "#7d8187";
    for (let i = 0; i <= 16; i++) g.fillRect((i / 16) * W - 4, 0, 8, H); // longerons
    g.strokeStyle = "rgba(80,84,90,0.9)";
    g.lineWidth = 3;
    for (const [u, w, v0, v1] of [
      [0.06, 0.1, 0.12, 0.85],
      [0.31, 0.1, 0.12, 0.85],
      [0.56, 0.1, 0.12, 0.85],
      [0.81, 0.1, 0.12, 0.85],
    ])
      g.strokeRect(u * W, v0 * H, w * W, (v1 - v0) * H); // instrument doors
  });
  return (HST.mats.shroud = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.28,
    metalness: 0.7,
  }));
}
// a solar array blanket: dark blue cells with silver bus bars on the face, the brown Kapton behind
function hstCellMat(back) {
  const k = back ? "kapton" : "cells";
  if (HST.mats[k]) return HST.mats[k];
  const tex = hstCanvas(256, 1024, (g, W, H) => {
    hstSeed = back ? 13 : 17;
    g.fillStyle = back ? "#7a5631" : "#1a2140";
    g.fillRect(0, 0, W, H);
    if (back) {
      g.strokeStyle = "rgba(40,26,12,0.5)";
      for (let y = 0; y < H; y += 16) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      return;
    }
    for (let x = 0; x < W; x += 16)
      for (let y = 0; y < H; y += 12) {
        const v = 22 + hstRnd() * 10;
        g.fillStyle = `rgb(${v},${v + 8},${v + 40})`;
        g.fillRect(x + 1, y + 1, 14, 10);
      }
    g.fillStyle = "#9da3ad";
    for (let y = 0; y < H; y += 96) g.fillRect(0, y, W, 3);
    g.fillRect(0, 0, 4, H);
    g.fillRect(W - 4, 0, 4, H);
  });
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  return (HST.mats[k] = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: back ? 0.6 : 0.35,
    metalness: back ? 0.3 : 0.4,
  }));
}
const hstYellow = () => mat("#e2b33a", "paint"),
  hstSilver = () => mat("#cfd3d8", "metal");
// one solar array wing in its mast's frame: the mast along +X from the drive, the drum and the blanket beyond it, the
// blanket rolled out both ways along ±Y. userData.unroll(u): u from 0 (rolled up on the drum) to 1.
function hstWing() {
  const g = new THREE.Group(),
    mastL = 1.2,
    drumL = 2.5,
    x0 = mastL + 0.05,
    xc = x0 + drumL / 2,
    half = 6.05;
  const mast = cyl(0.07, 0.07, mastL, hstSilver(), 10);
  mast.rotation.z = -Math.PI / 2;
  g.add(mast);
  const drive = cyl(0.16, 0.16, 0.2, mat("#8d9298", "metal"), 14);
  drive.rotation.z = -Math.PI / 2;
  g.add(drive);
  const drum = cyl(0.13, 0.13, drumL, mat("#b9bec4", "metal"), 16);
  drum.rotation.z = -Math.PI / 2;
  drum.position.x = x0;
  g.add(drum);
  const bl = new THREE.Group();
  bl.position.x = xc;
  g.add(bl); // the blankets, in the plane of X and Y: the cells face +Z
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(drumL - 0.1, 2 * half),
    hstCellMat(false),
  );
  face.position.z = 0.006;
  bl.add(face);
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(drumL - 0.1, 2 * half),
    hstCellMat(true),
  );
  back.rotation.y = Math.PI;
  back.position.z = -0.006;
  bl.add(back);
  const booms = [],
    spread = [];
  for (const s of [-1, 1])
    for (const e of [-1, 1]) {
      const b = cyl(0.025, 0.025, half, hstSilver(), 6);
      b.position.set(xc + e * (drumL / 2 - 0.04), 0, 0);
      b.rotation.x = s > 0 ? 0 : Math.PI;
      g.add(b);
      booms.push(b);
    }
  for (const s of [-1, 1]) {
    const sb = cyl(0.03, 0.03, drumL, mat("#9ca1a7", "metal"), 6);
    sb.rotation.z = -Math.PI / 2;
    sb.position.set(x0, s * half, 0);
    g.add(sb);
    spread.push({ sb, s });
  }
  g.userData.unroll = (u) => {
    const f = 0.012 + 0.988 * u;
    bl.scale.y = f;
    bl.visible = u > 0.002;
    for (const b of booms) b.scale.y = Math.max(f, 0.01);
    for (const { sb, s } of spread) sb.position.y = s * half * f;
  };
  g.userData.unroll(1);
  return g;
}
// a high-gain antenna on its mast, along +Z from the hinge, the dish on its gimbal at the end (userData.dish: facing out
// along the mast; turned 90° about X it lies flat against the body when the mast is stowed)
function hstAntenna() {
  const g = new THREE.Group(),
    L = 4.0,
    dg = new THREE.Group();
  dg.position.z = L;
  g.add(dg);
  const m = cyl(0.06, 0.06, L, hstSilver(), 8);
  m.rotation.x = Math.PI / 2;
  g.add(m);
  const gim = box(0.3, 0.25, 0.3, mat("#8d9298", "metal"));
  gim.position.y = -0.12;
  dg.add(gim);
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 28, 8, 0, TAU, 0, 0.88),
    mat("#e8e9ea", "paint", { side: THREE.DoubleSide }),
  );
  d.rotation.x = -Math.PI / 2;
  d.position.z = 0.95;
  dg.add(d); // 1.3 m across
  const feed = cyl(0.04, 0.04, 0.5, mat("#6d7177", "metal"), 8);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.25;
  dg.add(feed);
  g.userData.dish = dg;
  return g;
}
function hubbleModel(flags = {}) {
  const g = new THREE.Group(),
    H = HST,
    dark = mat("#141517", "dark", { side: THREE.DoubleSide });
  // aft bulkhead and shroud, the ring of bays, the forward shell and light shield in their blankets
  const shroud = cyl(H.R, H.R, H.es - H.aft, hstShroudMat(), 48, true);
  shroud.position.y = H.aft;
  g.add(shroud);
  const bulk = new THREE.Mesh(
    new THREE.CircleGeometry(H.R, 48),
    mat("#b8bcc1", "metal"),
  );
  bulk.rotation.x = Math.PI / 2;
  bulk.position.y = H.aft;
  g.add(bulk);
  for (let k = 0; k < 3; k++) {
    const b = box(0.12, 0.08, H.R * 1.9, mat("#8b9096", "metal"));
    b.rotation.y = (k * TAU) / 3;
    b.position.y = H.aft - 0.08;
    g.add(b);
  } // its radial beams
  const bays = new THREE.Mesh(
    new THREE.CylinderGeometry(H.R, H.R, H.fwd - H.es, 12, 1, true),
    mat("#c3c7cc", "metal", { flatShading: true }),
  );
  bays.position.y = (H.es + H.fwd) / 2;
  bays.rotation.y = TAU / 24;
  g.add(bays);
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12,
      d = box(0.9, 0.85, 0.02, mat("#d8dbdf", "metal"));
    d.position.set(
      Math.sin(a) * H.R * 0.985,
      H.es + 0.12,
      Math.cos(a) * H.R * 0.985,
    );
    d.rotation.y = a;
    g.add(d); // the bays' doors
    const hd = box(0.5, 0.04, 0.04, hstYellow());
    hd.position.set(
      Math.sin(a) * (H.R + 0.05),
      H.es + 0.55,
      Math.cos(a) * (H.R + 0.05),
    );
    hd.rotation.y = a;
    g.add(hd);
  }
  const step = new THREE.Mesh(
    new THREE.RingGeometry(H.r, H.R, 48),
    mat("#a4a9af", "paint", { side: THREE.DoubleSide, roughness: 0.7 }),
  );
  step.rotation.x = -Math.PI / 2;
  step.position.y = H.fwd;
  g.add(step); // the bays' forward face, blanketed
  const tube = cyl(H.r, H.r, H.door - H.fwd, hstBlanketMat(), 48, true);
  tube.position.y = H.fwd;
  g.add(tube);
  const rim = cyl(
    H.r + 0.03,
    H.r + 0.03,
    0.12,
    mat("#9ea3a9", "metal"),
    48,
    true,
  );
  rim.position.y = H.door - 0.12;
  g.add(rim);
  // inside the aperture: the dark light shield and its baffles, the secondary mirror's spider far down
  const inside = cyl(H.r - 0.02, H.r - 0.02, 3.0, dark, 32, true);
  inside.position.y = H.door - 3.0;
  g.add(inside);
  for (let k = 0; k < 4; k++) {
    const b = new THREE.Mesh(
      new THREE.RingGeometry(H.r - 0.22, H.r - 0.02, 32),
      dark,
    );
    b.rotation.x = -Math.PI / 2;
    b.position.y = H.door - 0.4 - k * 0.7;
    g.add(b);
  }
  const ap = new THREE.Mesh(
    new THREE.CircleGeometry(H.r - 0.02, 32),
    mat("#050506", "dark"),
  );
  ap.rotation.x = -Math.PI / 2;
  ap.position.y = H.door - 3.0;
  g.add(ap);
  // the aperture door, hinged at +Z
  const dg = new THREE.Group();
  dg.position.set(0, H.door + 0.06, H.r);
  g.add(dg);
  const door = new THREE.Mesh(
    new THREE.CylinderGeometry(1.52, 1.52, 0.1, 40),
    mat("#dfe2e5", "metal"),
  );
  door.position.set(0, 0, -H.r);
  dg.add(door);
  const hinge = cyl(0.08, 0.08, 0.6, mat("#8f949a", "metal"), 10);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(-0.3, 0, 0);
  dg.add(hinge);
  if (flags.doorT != null)
    g.userData.animate = (t) => {
      dg.rotation.x =
        105 * DEG * smoothstep(clamp((t - flags.doorT) / 60, 0, 1));
    }; // up and over, forward
  else if (flags.door) dg.rotation.x = 105 * DEG;
  // handrails: rings round the light shield and the shroud, rails along them; the magnetic torquers; sun sensors; the
  // low-gain antennas; trunnions; the grapple fixture
  for (const y of [3.2, 5.6]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(H.r + 0.1, 0.018, 6, 64),
      hstYellow(),
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  for (const y of [H.aft + 0.4]) {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(H.R + 0.1, 0.02, 6, 64),
      hstYellow(),
    );
    t.rotation.x = Math.PI / 2;
    t.position.y = y;
    g.add(t);
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * TAU) / 8,
      r = cyl(0.02, 0.02, 2.8, hstYellow(), 6);
    r.position.set(
      Math.sin(a) * (H.R + 0.1),
      H.aft + 0.4,
      Math.cos(a) * (H.R + 0.1),
    );
    g.add(r);
  }
  for (const a of [0.6, 2.2, 3.8, 5.3]) {
    const r = cyl(0.018, 0.018, 3.4, hstYellow(), 6);
    r.position.set(Math.sin(a) * (H.r + 0.1), 2.2, Math.cos(a) * (H.r + 0.1));
    g.add(r);
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2,
      m = box(0.1, 2.5, 0.1, mat("#5b5f65", "metal"));
    m.position.set(
      Math.sin(a) * (H.r + 0.14),
      -0.6,
      Math.cos(a) * (H.r + 0.14),
    );
    g.add(m);
  }
  for (const x of [-0.45, 0.45]) {
    const s = box(0.16, 0.12, 0.12, mat("#2c2e32", "dark"));
    s.position.set(x, H.door - 0.3, H.r + 0.06);
    g.add(s);
  }
  for (const [y, z, up] of [
    [H.door - 1.0, -(H.r + 0.05), 0],
    [H.aft - 0.05, -1.2, 1],
  ]) {
    const c = cyl(0.12, 0.02, 0.3, mat("#d9d9d4", "paint"), 12);
    if (up) {
      c.rotation.x = Math.PI;
      c.position.set(0.6, y, z);
    } else {
      c.rotation.x = -Math.PI / 2;
      c.position.set(0, y, z);
    }
    g.add(c);
  }
  for (const s of [-1, 1]) {
    const tr = cyl(0.1, 0.1, 0.45, hstSilver(), 10);
    tr.rotation.z = Math.PI / 2;
    tr.position.set(s * (H.R + 0.22), H.es + 0.3, 0);
    g.add(tr);
  } // aft trunnions
  const keel = cyl(0.1, 0.1, 0.4, hstSilver(), 10);
  keel.rotation.x = Math.PI / 2;
  keel.position.set(0, -0.2, -(H.r + 0.2));
  g.add(keel);
  const fix = cyl(0.25, 0.25, 0.15, mat("#e0e0e0", "metal"), 12);
  fix.rotation.x = Math.PI / 2;
  fix.position.set(0, -3.0, H.R + 0.07);
  g.add(fix); // grapple fixture
  const pin = cyl(0.04, 0.04, 0.3, mat("#d0d0d0", "metal"), 8);
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, -3.0, H.R + 0.27);
  g.add(pin);
  // the solar array wings (±X) and the high-gain antennas (±Z), from the aft end of the forward shell
  const wings = [-1, 1].map((s) => {
    const piv = new THREE.Group();
    piv.position.set(s * (H.r + 0.12), H.fwd + 0.15, 0);
    g.add(piv);
    const w = hstWing();
    if (s < 0) w.rotation.z = Math.PI;
    piv.add(w);
    return { piv, w, s };
  }); // (both wings' cells face +Z)
  const ants = [-1, 1].map((s) => {
    const piv = new THREE.Group();
    piv.position.set(0, H.fwd + 0.3, s * (H.r + 0.15));
    g.add(piv);
    const a = hstAntenna();
    if (s < 0) a.rotation.y = Math.PI;
    piv.add(a);
    return { piv, s, dish: a.userData.dish };
  });
  // f: 0 stowed (masts and drums folded forward along the forward shell, the blankets rolled up; the antenna masts along the
  // shell and light shield, dishes forward), 1 deployed. Wings swing out to f 0.25 and unroll to f 1; antennas out by f 0.4.
  const pose = (f) => {
    const sw = smoothstep(clamp(f / 0.25, 0, 1)),
      un = smoothstep(clamp((f - 0.25) / 0.75, 0, 1)),
      bm = smoothstep(clamp(f / 0.4, 0, 1));
    for (const { piv, w, s } of wings) {
      piv.rotation.z = ((s * Math.PI) / 2) * (1 - sw);
      w.userData.unroll(un);
    }
    for (const { piv, s, dish } of ants) {
      piv.rotation.x = ((-s * Math.PI) / 2) * (1 - bm);
      dish.rotation.x = (Math.PI / 2) * (1 - bm);
    }
  };
  if (flags.arrays && flags.deployable) g.userData.deploy = pose;
  pose(flags.arrays ? (flags.deployable ? 0 : 1) : 0);
  g.userData.len = 13.2;
  g.userData.yc0 = 0;
  return g;
}

// ==== 35_atlas.js
// ============================================================================
// Atlas LV-3 Agena-D as it launched Mariner 4 (1964), drawn over its stages' plain geometry (src/vehicles.js, look; called
// from buildStage with the stage's group, bottom at y = 0). The Atlas: a stainless-steel balloon tank 3.05 m across, its
// sheets welded in rings; the booster section a skirt round the foot of the tank with the two booster engines in fairings
// on its sides (±X), making the base 4.9 m wide; the sustainer engine in the middle, under the tank; two small vernier
// engines low on the tank's sides (±Z); a cone up to the Agena. The Agena-D, 1.52 m across: the aft rack, an open frame
// round the engine's top with the pressure spheres and the attitude-control jets; the propellant tanks; the forward
// equipment section; the adapter the spacecraft sits on.
// ============================================================================
const ATLAS = { mats: {} };
let atlasSeed = 21;
const atlasRnd = () =>
  (atlasSeed = (atlasSeed * 9301 + 49297) % 233280) / 233280;
// the Atlas tank's steel: faint seams between the welded rings (about 0.8 m tall) and along each sheet
function atlasSteelMat() {
  if (ATLAS.mats.steel) return ATLAS.mats.steel;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#bcc1c7";
  g.fillRect(0, 0, 512, 1024);
  atlasSeed = 21;
  for (let i = 0; i < 1600; i++) {
    g.fillStyle =
      atlasRnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(40,44,50,0.05)";
    g.fillRect(
      atlasRnd() * 512,
      atlasRnd() * 1024,
      1 + atlasRnd() * 3,
      6 + atlasRnd() * 40,
    );
  } // the sheets' grain, along the tank
  g.fillStyle = "rgba(85,90,96,0.45)";
  for (let y = 0; y < 1024; y += 43) g.fillRect(0, y, 512, 2);
  for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 2, 1024);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.anisotropy = 4;
  return (ATLAS.mats.steel = new THREE.MeshStandardMaterial({
    map: t,
    roughness: 0.3,
    metalness: 0.75,
  }));
}
const STAGE_LOOK = {
  // the booster section: the skirt round the foot of the tank (3 m up), the two engine fairings on its sides, a dark base
  atlasBooster(g) {
    const steel = mat("#b3b8be", "metal"),
      dark = mat("#2b2c2f", "dark");
    const skirt = cyl(
      1.6,
      1.58,
      3.0,
      mat("#b3b8be", "metal", { side: THREE.DoubleSide }),
      48,
      true,
    );
    g.add(skirt); // (an open ring once it slides off the tank)
    const base = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), dark);
    base.rotation.x = Math.PI / 2;
    base.position.y = 0.01;
    g.add(base);
    for (const s of [-1, 1]) {
      const pod = cyl(0.82, 0.82, 2.1, steel, 24);
      pod.position.set(s * 1.6, 0, 0);
      g.add(pod);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 24, 10, 0, TAU, 0, Math.PI / 2),
        steel,
      );
      top.position.set(s * 1.6, 2.1, 0);
      top.scale.y = 1.05;
      g.add(top); // the fairing's rounded top
      const pb = new THREE.Mesh(new THREE.CircleGeometry(0.82, 24), dark);
      pb.rotation.x = Math.PI / 2;
      pb.position.set(s * 1.6, 0.01, 0);
      g.add(pb);
    }
  },
  // the sustainer: the steel tank, the vernier engines (±Z) just above the skirt, a cone up to the Agena
  atlasSustainer(g) {
    const tank = g.children[0];
    if (tank && tank.isMesh) tank.material = atlasSteelMat();
    for (const s of [-1, 1]) {
      const v = new THREE.Group();
      v.position.set(0, 2.5, s * 1.6);
      v.rotation.x = -s * 0.25;
      g.add(v); // canted outboard
      v.add(box(0.22, 0.18, 0.22, mat("#7d8288", "metal")));
      const b = bell(
        0.38,
        0.11,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      b.position.y = -0.38;
      v.add(b);
    }
    const ring = cyl(1.535, 1.535, 0.12, mat("#8f949a", "metal"), 48, true);
    ring.position.y = 19.0 - 0.06;
    g.add(ring); // where the cone meets the tank
  },
  // the Agena-D: aft rack (y 0–0.7) round the top of the engine, propellant tanks (0.7–4.2), forward section (4.2–5.4)
  agenaD(g) {
    const body = g.children[0];
    if (body && body.isMesh) g.remove(body);
    const silver = mat("#d3d6da", "metal"),
      white = mat("#e7e6e1", "paint"),
      grey = mat("#8d9298", "metal"),
      dark = mat("#2e3034", "dark");
    const tanks = cyl(0.76, 0.76, 3.5, white, 40);
    tanks.position.y = 0.7;
    g.add(tanks);
    const fwd = cyl(0.76, 0.76, 1.2, silver, 40);
    fwd.position.y = 4.2;
    g.add(fwd);
    for (let k = 0; k < 8; k++) {
      const p = box(0.32, 0.5, 0.02, k % 2 ? dark : mat("#bfc3c8", "metal"));
      const a = ((k + 0.5) * TAU) / 8;
      p.position.set(Math.sin(a) * 0.765, 4.45, Math.cos(a) * 0.765);
      p.rotation.y = a;
      g.add(p);
    } // equipment panels
    const band = cyl(0.77, 0.77, 0.08, grey, 40, true);
    band.position.y = 4.18;
    g.add(band);
    // the aft rack: rings and struts round the engine, the pressure spheres, the jets on the rim
    const rim = cyl(0.76, 0.76, 0.08, grey, 40, true);
    rim.position.y = 0.62;
    g.add(rim);
    const foot = cyl(0.55, 0.55, 0.06, grey, 24, true);
    foot.position.y = 0.04;
    g.add(foot);
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8,
        b = ((k + 1) * TAU) / 8;
      const st = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 1, 6),
          grey,
        ),
        p0 = new THREE.Vector3(Math.sin(a) * 0.74, 0.62, Math.cos(a) * 0.74),
        p1 = new THREE.Vector3(Math.sin(b) * 0.53, 0.07, Math.cos(b) * 0.53);
      st.scale.y = p0.distanceTo(p1);
      st.position.copy(p0).add(p1).multiplyScalar(0.5);
      st.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p1.clone().sub(p0).normalize(),
      );
      g.add(st);
    }
    for (const a of [0.6, 2.2, 3.7, 5.3]) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 16, 12),
        mat("#c7a24f", "gold"),
      );
      s.position.set(Math.sin(a) * 0.5, 0.36, Math.cos(a) * 0.5);
      g.add(s);
    }
    for (const a of [0, Math.PI]) {
      const j = box(0.16, 0.14, 0.16, grey);
      j.position.set(Math.sin(a) * 0.82, 0.25, Math.cos(a) * 0.82);
      g.add(j);
    }
    const chamber = cyl(0.2, 0.2, 0.55, mat("#6a6e74", "metal"), 16);
    chamber.position.y = 0.0;
    g.add(chamber);
    // the spacecraft adapter on top
    const ad = cyl(0.76, 0.6, 0.35, grey, 32);
    ad.position.y = 5.4;
    g.add(ad);
  },
};

// ==== 36_mariner.js
// ============================================================================
// Mariner 4 (1964): an octagonal bus 1.27 m across its corners and 0.457 m high, louvres for its temperature on four of its
// sides; four solar panels, 1.76 × 0.90 m, from the top edge of the other four, each with a solar pressure vane at its tip
// (the vanes steered it a little by the push of sunlight); the elliptical high-gain dish, 1.17 × 0.53 m, on top; the low-
// gain antenna on a mast, 2.89 m from the foot of the bus to its tip, the magnetometer part way up; the television camera
// on its scan platform under the bus; the midcourse motor's nozzle on one side. For launch the panels are folded up
// round the mast, inside the shroud (flags.stowed); they open out after the spacecraft leaves the Agena (flags.deployT).
// y = 0 at the foot of the bus.
// ============================================================================
function marinerPanel() {
  // a solar panel along +X from its hinge, the cells on top; its vane at the tip (userData.vane)
  const g = new THREE.Group(),
    L = 1.76,
    W = 0.9;
  const cells = box(L, 0.03, W, mat("#1b2550", "solar"));
  cells.position.set(L / 2, 0, 0);
  cells.geometry.translate(0, -0.015, 0);
  g.add(cells);
  const frame = box(L + 0.02, 0.035, 0.03, mat("#c8ccd1", "metal"));
  for (const z of [-W / 2, W / 2]) {
    const f = frame.clone();
    f.position.set(L / 2, -0.02, z);
    g.add(f);
  }
  for (let i = 1; i < 6; i++) {
    const ln = box(0.012, 0.032, W, mat("#9aa0a8", "metal"));
    ln.position.set((i * L) / 6, -0.019, 0);
    g.add(ln);
  }
  const vane = new THREE.Group();
  vane.position.set(L, 0, 0);
  g.add(vane);
  const v = box(0.62, 0.012, 0.66, mat("#e3e5e8", "metal"));
  v.position.set(0.31, 0, 0);
  v.geometry.translate(0, -0.006, 0);
  vane.add(v);
  const act = cyl(0.03, 0.03, 0.1, mat("#5c6066", "metal"), 8);
  act.rotation.x = Math.PI / 2;
  act.position.set(0.02, 0.02, 0);
  vane.add(act);
  g.userData.vane = vane;
  return g;
}
function marinerModel(flags = {}) {
  const g = new THREE.Group(),
    H = 0.457,
    Rc = 0.635,
    Rf = Rc * Math.cos(Math.PI / 8);
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(Rc, Rc, H, 8, 1),
    mat("#3c3f45", "metal", { flatShading: true }),
  );
  bus.rotation.y = Math.PI / 8;
  bus.position.y = H / 2;
  g.add(bus);
  // the sides: louvres (bright slats) between the panel hinges, gold foil where the panels are
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      side = new THREE.Group();
    side.position.set(
      Math.sin(a) * (Rf + 0.006),
      H / 2,
      Math.cos(a) * (Rf + 0.006),
    );
    side.rotation.y = a;
    g.add(side);
    if (k % 2) {
      side.add(box(0.4, 0.36, 0.01, mat("#2a2c30", "dark")));
      for (let i = 0; i < 6; i++) {
        const s = box(0.05, 0.34, 0.015, mat("#e2e4e8", "metal"));
        s.position.set(-0.16 + i * 0.064, -0.17, 0.008);
        s.rotation.y = 0.5;
        side.add(s);
      }
    } else {
      const f = box(0.46, 0.4, 0.01, foilMat("gold", 1));
      f.position.y = -0.2;
      side.add(f);
    }
  }
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(Rc * 0.98, Rc * 0.98, 0.03, 8),
    mat("#9da2a8", "metal"),
  );
  lid.rotation.y = Math.PI / 8;
  lid.position.y = H + 0.015;
  g.add(lid);
  // high-gain dish (elliptical) on a short support, tilted; low-gain antenna mast with the magnetometer
  const hga = new THREE.Group();
  hga.position.set(0, H + 0.3, 0.08);
  hga.rotation.x = 0.35;
  g.add(hga);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 32, 8, 0, TAU, 0, 0.62),
    mat("#eef0f2", "paint", { side: THREE.DoubleSide }),
  );
  dish.rotation.x = Math.PI;
  dish.position.y = 0.62;
  dish.scale.set(1.62, 1, 0.74);
  hga.add(dish); // 1.17 × 0.53 m
  for (const [x, z] of [
    [-0.18, -0.08],
    [0.18, -0.08],
    [0, 0.14],
  ])
    hga.add(
      m20Bar(
        [x * 1.6, -0.3, z],
        [x * 0.3, 0.02, z * 0.3],
        0.012,
        mat("#9aa0a6", "metal"),
      ),
    ); // its tripod
  const feed = cyl(0.025, 0.025, 0.32, mat("#7f848a", "metal"), 8);
  feed.position.y = 0.05;
  hga.add(feed);
  const mx = -0.3,
    mz = -0.25,
    top = 2.89;
  g.add(
    m20Bar([mx, H, mz], [mx, top - 0.12, mz], 0.022, mat("#c9cdd2", "metal")),
  );
  const lga = cyl(0.06, 0.06, 0.12, mat("#e6e6e2", "paint"), 12);
  lga.position.set(mx, top - 0.12, mz);
  g.add(lga);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 6, 0, TAU, 0, Math.PI / 2),
    mat("#e6e6e2", "paint"),
  );
  dome.position.set(mx, top, mz);
  g.add(dome);
  const mag = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 14, 10),
    mat("#d7a94a", "gold"),
  );
  mag.position.set(mx, 1.75, mz);
  g.add(mag);
  // the scan platform and the camera under the bus; the midcourse motor's nozzle
  const plat = cyl(0.2, 0.2, 0.04, mat("#55595f", "metal"), 16);
  plat.position.set(0.15, -0.06, 0.1);
  g.add(plat);
  const cam = cyl(0.07, 0.07, 0.32, mat("#2c2e33", "dark"), 14);
  cam.rotation.z = 0.5;
  cam.position.set(0.15, -0.3, 0.1);
  g.add(cam);
  const noz = bell(
    0.12,
    0.05,
    mat("#4a4c50", "metal", { side: THREE.DoubleSide }),
  );
  noz.position.set(0, -0.12, 0);
  g.add(noz);
  // the four solar panels on the louvre-free sides (±X, ±Z)
  const panels = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2,
      piv = new THREE.Group();
    piv.position.set(Math.sin(a) * Rf, H - 0.02, Math.cos(a) * Rf);
    piv.rotation.y = a - Math.PI / 2;
    g.add(piv);
    const p = marinerPanel();
    piv.add(p);
    panels.push({ p, vane: p.userData.vane });
  }
  // folded (f = 0): panels up along the mast, vanes folded back flat; deployed (1): out flat, the vanes turned 25°
  const pose = (f) => {
    for (const { p, vane } of panels) {
      p.rotation.z = (Math.PI / 2) * (1 - f);
      vane.rotation.z = Math.PI * (1 - f) + 0.44 * f;
    }
  };
  if (flags.deployT != null)
    g.userData.animate = (t) =>
      pose(smoothstep(clamp((t - flags.deployT - 20) / 60, 0, 1)));
  pose(flags.stowed || flags.deployT != null ? 0 : 1);
  g.userData.len = H;
  return g;
}

// ==== 37_tianwen.js
// ============================================================================
// Tianwen-1 (2020–21), metres: the orbiter, which carried the entry capsule to Mars on its top; the capsule, heat shield
// and backshell; inside it the landing platform with the Zhurong rover on its deck.
// Published: the orbiter is an outer hexagonal prism round a central load-bearing cone, with a 3000 N main engine; the
// capsule's heat shield is a blunt 70° sphere-cone 3.4 m across, and a trim wing on the backshell swings out before the
// parachute opens; the platform comes down on a 7500 N throttleable engine and lets the rover down a two-rail ramp;
// Zhurong is 1.85 m tall and about 2.6 × 3.0 m with its four solar wings open, 240 kg, on six wheels with an active
// suspension, with two round windows on its deck over its heat-storing tanks. The rest (the orbiter's size, its wings and
// antenna, the backshell's shape, the platform's) is estimated and made to fit: the platform and the folded rover inside
// the capsule, the capsule on the orbiter, the whole in Long March 5's fairing.
// ============================================================================
const TW = { mats: {} };
const twMat = (key, make) => TW.mats[key] || (TW.mats[key] = make());
// a canvas texture for flat parts (upright on a PlaneGeometry)
function twTex(w, h, fn) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// the national flag of China (3:2): the large star, and four small ones each pointing at the large one's centre
function cnFlagMat() {
  return twMat(
    "flag",
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.6,
        metalness: 0.02,
        side: THREE.DoubleSide,
        map: twTex(300, 200, (g, W) => {
          const u = W / 30;
          g.fillStyle = "#de2910";
          g.fillRect(0, 0, W, W);
          const star = (cx, cy, R, rot) => {
            g.beginPath();
            for (let i = 0; i < 10; i++) {
              const r = i % 2 ? R * 0.382 : R,
                a = rot + (i * Math.PI) / 5;
              g.lineTo((cx + r * Math.sin(a)) * u, (cy - r * Math.cos(a)) * u);
            }
            g.closePath();
            g.fill();
          };
          g.fillStyle = "#ffde00";
          star(5, 5, 3, 0);
          for (const [x, y] of [
            [10, 2],
            [12, 4],
            [12, 7],
            [10, 9],
          ])
            star(x, y, 1, Math.atan2(5 - x, y - 5));
        }),
      }),
  );
}
// solar cells: nx × ny cells on a panel, dark blue with a little variety, on the light substrate
function twCellsMat(nx, ny) {
  return twMat("cells" + nx + "x" + ny, () => {
    let s = 3 + nx * 7 + ny;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = twTex(nx * 20, ny * 20, (g, W, H) => {
      g.fillStyle = "#5c6268";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const v = 30 + rnd() * 10;
          g.fillStyle = `rgb(${v},${v + 12},${v + 62})`;
          g.fillRect(i * 20 + 1, j * 20 + 1, 18, 18);
          g.fillStyle = "rgba(190,200,220,0.18)";
          g.fillRect(i * 20 + 1, j * 20 + 9.5, 18, 1);
        }
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.3,
      metalness: 0.3,
    });
  });
}
// a solar panel along +X from x = 0 (length L), W across (along Y), its cells facing +Z, a light frame round it
function twPanel(L, W, nx, ny, back = "#8d9399") {
  const g = new THREE.Group(),
    t = 0.025,
    fr = mat("#c5c9ce", "metal");
  const f = new THREE.Mesh(new THREE.PlaneGeometry(L, W), twCellsMat(nx, ny));
  f.position.set(L / 2, 0, t / 2);
  g.add(f);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(L, W), mat(back, "metal"));
  b.rotation.y = Math.PI;
  b.position.set(L / 2, 0, -t / 2);
  g.add(b);
  for (const y of [-W / 2, W / 2]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, t + 0.006), fr);
    e.position.set(L / 2, y, 0);
    g.add(e);
  }
  for (const x of [0, L]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, W, t + 0.006), fr);
    e.position.set(x, 0, 0);
    g.add(e);
  }
  return g;
}
// the side faces of a regular n-sided prism (circumradius R, from y0 to y1), each a plane of its own: face k faces azimuth
// a0 + k·360°/n (from +Z toward +X), its material m(k)
function twPrismSides(n, R, y0, y1, a0, m) {
  const g = new THREE.Group(),
    rf = R * Math.cos(Math.PI / n),
    w = 2 * R * Math.sin(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n,
      p = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), m(k));
    p.position.set(Math.sin(a) * rf, (y0 + y1) / 2, Math.cos(a) * rf);
    p.rotation.y = a;
    g.add(p);
  }
  return g;
}
// the matching n-gon deck (circumradius R) at height y, facing up (or down), with a round hole of radius rh
function twDeck(n, R, y, a0, m, rh = 0, down = false) {
  const s = new THREE.Shape();
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((k + 0.5) * TAU) / n;
    s[k ? "lineTo" : "moveTo"](Math.sin(a) * R, -Math.cos(a) * R);
  }
  if (rh > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, rh, 0, TAU, true);
    s.holes.push(h);
  }
  const d = new THREE.Mesh(new THREE.ShapeGeometry(s, 4), m);
  d.rotation.x = -Math.PI / 2;
  d.position.y = y;
  if (down) {
    d.rotation.x = Math.PI / 2;
    d.scale.y = -1;
  }
  return d;
}
// a stretchable round bar (twSetBar puts it between two points); a paraboloid dish (radius r, depth d, vertex at the
// origin, opening toward +Y)
const _twA = new THREE.Vector3(),
  _twB = new THREE.Vector3();
function twBarMesh(r, m, seg = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), m);
}
function twSetBar(o, p, q) {
  _twA.set(p[0], p[1], p[2]);
  _twB.set(q[0], q[1], q[2]).sub(_twA);
  const L = _twB.length();
  o.position.copy(_twA).addScaledVector(_twB, 0.5);
  o.scale.set(1, Math.max(L, 1e-4), 1);
  o.quaternion.setFromUnitVectors(M20_UP, _twB.normalize());
  return o;
}
function twDish(r, d, m, seg = 40) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const x = (r * i) / 12;
    pts.push(new THREE.Vector2(x, d * (x / r) ** 2));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, seg), m);
}
const twLerp = (a, b, f) => a + (b - a) * f;
const twPhase = (f, a, b) => smoothstep(clamp((f - a) / (b - a), 0, 1)); // a stage of a deployment: 0 → 1 while f goes from a to b

// ---------------------------------------------------------------------------------------------------------------------
// The orbiter (y = 0 at the foot of its body): the hexagonal body, 2.8 m across its corners and 2.2 m tall, in gold
// blankets with white radiators on two faces and the national flag on one; on top the central cone's ring, where the
// capsule sits; under it the main engine inside the launch adapter's ring and thrusters at the corners; a solar wing of
// three panels on each of the ±X faces; the 2.5 m high-gain antenna on a boom at the +Z corner; the high-resolution camera
// on a back face; the magnetometer on a boom. Stowed (flags.stowed), the wings fold against their faces, the antenna lies
// against its corner and the boom along its face; from flags.deployT (the separation from the rocket) they open out.
const TWO = { R: 1.4, H: 2.2, ring: 0.65, eng: 0.65 };
function twOrbiter(flags = {}) {
  const g = new THREE.Group(),
    { R, H } = TWO,
    rf = R * Math.cos(Math.PI / 6);
  const gold = foilMat("gold", 2),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    dark = mat("#2c2e33", "dark"),
    grey = mat("#8c9197", "metal");
  const face = (k, y = H / 2, out = 0) => {
    const a = (30 + 60 * k) * DEG;
    return { a, p: [Math.sin(a) * (rf + out), y, Math.cos(a) * (rf + out)] };
  };
  g.add(twPrismSides(6, R, 0, H, 30 * DEG, () => gold));
  g.add(
    twDeck(
      6,
      R,
      H,
      30 * DEG,
      mat("#d3d6da", "metal", { side: THREE.DoubleSide }),
      TWO.ring,
    ),
  );
  g.add(
    twDeck(
      6,
      R,
      0,
      30 * DEG,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0.6,
      true,
    ),
  );
  // radiators (white, inside a gold border) on the faces at 30° and 150°; the flag at the top of the 30° face
  for (const k of [0, 2]) {
    const { a, p } = face(k, H / 2 - 0.1, 0.004);
    const r = new THREE.Mesh(
      new THREE.PlaneGeometry(R - 0.22, H - 0.75),
      white,
    );
    r.position.set(...p);
    r.rotation.y = a;
    g.add(r);
  }
  {
    const { a, p } = face(0, H - 0.28, 0.006);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.36), cnFlagMat());
    f.position.set(...p);
    f.rotation.y = a;
    g.add(f);
  }
  // the central cone: its ring on the deck, the cone going down inside
  const ring = cyl(TWO.ring + 0.05, TWO.ring, 0.06, alu, 40);
  ring.position.y = H;
  g.add(ring);
  const cone = cyl(
    0.55,
    TWO.ring,
    0.9,
    mat("#55585e", "metal", { side: THREE.DoubleSide }),
    40,
    true,
  );
  cone.position.y = H - 0.9;
  g.add(cone);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.56, 32), dark);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = H - 0.88;
  g.add(floor);
  for (let k = 0; k < 6; k++) {
    const b = box(0.1, 0.07, 0.12, mat("#c9a04a", "gold"));
    b.position.set(...m20Polar(TWO.ring + 0.02, (k * TAU) / 6, H + 0.06));
    b.rotation.y = (k * TAU) / 6;
    g.add(b);
  } // the separation fittings
  // the launch adapter's ring and the main engine inside it; thruster pairs at the six lower corners
  const lv = cyl(0.62, 0.6, 0.12, alu, 40, true);
  lv.position.y = -0.12;
  g.add(lv);
  const valve = cyl(0.13, 0.13, 0.16, grey, 16);
  valve.position.y = -0.16;
  g.add(valve);
  const eng = bell(
    TWO.eng,
    0.22,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -TWO.eng;
  g.add(eng);
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.12, a, 0.04));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.16, 0.08, 0.12, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.1,
        0.035,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      const e = new THREE.Group();
      e.position.set(s * 0.05, 0, 0.03);
      e.rotation.x = 0.5;
      e.add(n);
      n.position.y = -0.1;
      pod.add(e);
    }
  }
  // star trackers and low-gain antennas on the deck
  for (const [a, r] of [
    [200, 1.0],
    [235, 1.0],
  ]) {
    const st = box(0.14, 0.12, 0.14, dark);
    st.position.set(...m20Polar(r, a * DEG, H));
    g.add(st);
    const sh = cyl(
      0.05,
      0.08,
      0.1,
      mat("#1c1d20", "dark", { side: THREE.DoubleSide }),
      14,
      true,
    );
    sh.position.set(...m20Polar(r, a * DEG, H + 0.12));
    g.add(sh);
  }
  for (const [a, y] of [
    [120, H],
    [300, H],
  ]) {
    const l = cyl(0.07, 0.03, 0.16, mat("#e9e7e1", "paint"), 14);
    l.position.set(...m20Polar(1.05, a * DEG, y));
    g.add(l);
  }
  // the high-resolution camera on the 150° face, looking down; the medium-resolution camera beside it
  {
    const { a, p } = face(2, 0.75, 0.3);
    const c = cyl(0.24, 0.24, 0.8, mat("#e4e3de", "paint"), 24);
    c.position.set(p[0], 0.35, p[2]);
    g.add(c);
    const hood = cyl(
      0.25,
      0.25,
      0.22,
      mat("#1e1f22", "dark", { side: THREE.DoubleSide }),
      24,
      true,
    );
    hood.position.set(p[0], 0.13, p[2]);
    g.add(hood);
    const br = box(0.3, 0.5, 0.12, grey);
    br.position.set(Math.sin(a) * (rf + 0.06), 0.5, Math.cos(a) * (rf + 0.06));
    br.rotation.y = a;
    g.add(br);
    const m = box(0.16, 0.18, 0.16, dark);
    m.position.set(...face(2, 0, 0.12).p);
    m.position.y = 1.3;
    g.add(m);
  }
  // the solar wings: a yoke and three panels (1.3 × 2.0 m) on hinges, folded like an accordion against the face when stowed
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Group();
    w.position.set(s * rf, H / 2, 0);
    if (s < 0) w.rotation.z = Math.PI;
    g.add(w);
    const yoke = [twBarMesh(0.022, alu), twBarMesh(0.022, alu)];
    w.add(...yoke);
    const root = box(0.12, 0.3, 0.12, grey);
    root.position.set(0.04, -0.15, 0);
    w.add(root);
    const h0 = new THREE.Group();
    w.add(h0);
    const hs = [h0];
    let par = h0;
    for (let i = 0; i < 3; i++) {
      par.add(twPanel(1.3, 2.0, 6, 9));
      if (i < 2) {
        const h = new THREE.Group();
        h.position.set(1.3, 0, i ? -0.035 : 0.035);
        par.add(h);
        hs.push(h);
        par = h;
      }
    }
    wings.push({ yoke, hs });
  }
  // the high-gain antenna: a dish 2.5 m across with its subreflector, on a boom from the +Z corner
  const hga = new THREE.Group();
  g.add(hga);
  const dish = twDish(
    1.25,
    0.28,
    mat("#efeee9", "paint", { side: THREE.DoubleSide }),
    48,
  );
  dish.rotation.x = Math.PI / 2;
  hga.add(dish);
  const hub = cyl(0.12, 0.12, 0.2, grey, 16);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.12;
  hga.add(hub);
  const sub = cyl(0.12, 0.12, 0.03, mat("#d9d8d2", "paint"), 20);
  sub.rotation.x = Math.PI / 2;
  sub.position.z = 0.55;
  hga.add(sub);
  for (let k = 0; k < 4; k++)
    hga.add(
      m20Bar(
        [
          Math.sin((k * TAU) / 4 + 0.785) * 0.85,
          Math.cos((k * TAU) / 4 + 0.785) * 0.85,
          0.15,
        ],
        [
          Math.sin((k * TAU) / 4 + 0.785) * 0.1,
          Math.cos((k * TAU) / 4 + 0.785) * 0.1,
          0.54,
        ],
        0.012,
        alu,
      ),
    );
  const feed = cyl(0.06, 0.04, 0.3, grey, 12);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.02;
  hga.add(feed);
  const boom = twBarMesh(0.05, alu, 12);
  g.add(boom);
  // the magnetometer's boom on the 210° face
  const mag = new THREE.Group();
  mag.rotation.order = "YXZ";
  {
    const { a, p } = face(3, H - 0.15, 0.08);
    mag.position.set(...p);
    mag.rotation.y = a;
    g.add(mag);
  }
  {
    const b = cyl(0.025, 0.025, 2.2, alu, 8);
    mag.add(b);
    const sn = box(0.12, 0.1, 0.12, mat("#d7d6d0", "paint"));
    sn.position.y = 2.2;
    mag.add(sn);
    const sn2 = box(0.08, 0.08, 0.08, mat("#c9a04a", "gold"));
    sn2.position.y = 1.4;
    mag.add(sn2);
  }
  // stowed (f = 0) → deployed (1): the wings open first, then the antenna swings out, then the magnetometer's boom
  const pose = (f) => {
    const fw = twPhase(f, 0, 0.5),
      fa = twPhase(f, 0.45, 0.8),
      fm = twPhase(f, 0.75, 1);
    for (const { yoke, hs } of wings) {
      const fu = twPhase(fw, 0, 0.35),
        fo = twPhase(fw, 0.25, 1); // the stack swings off the face, then unfolds
      hs[0].position.set(twLerp(0.14, 0.4, fu), 0, twLerp(0.65, 0, fu));
      hs[0].rotation.y = twLerp(Math.PI / 2, 0, fo);
      hs[1].rotation.y = twLerp(-Math.PI, 0, fo);
      hs[2].rotation.y = twLerp(Math.PI, 0, fo);
      const t0 = hs[0].position;
      twSetBar(yoke[0], [0, 0.55, 0], [t0.x, 0.25, t0.z]);
      twSetBar(yoke[1], [0, -0.55, 0], [t0.x, -0.25, t0.z]);
    }
    const v = [0, twLerp(1.1, 1.35, fa), twLerp(R + 0.42, R + 1.05, fa)];
    hga.position.set(...v);
    hga.rotation.x = -twLerp(0, 0.45, fa);
    twSetBar(boom, [0, 1.0, R - 0.1], [0, v[1] - 0.05, v[2] - 0.14]);
    mag.rotation.x = twLerp(Math.PI, Math.PI / 2 - 0.15, fm);
  };
  if (flags.deployT != null)
    g.userData.animate = (t) =>
      pose(clamp((t - flags.deployT - 30) / 300, 0, 1));
  pose(flags.stowed || flags.deployT != null ? 0 : 1);
  g.userData.len = H;
  g.userData.mounts = [{ y: -TWO.eng, r: 0.22, tag: "ORB" }];
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The entry capsule (y = 0 at the heat shield's nose): the heat shield, a 70° sphere-cone 3.4 m across (nose radius
// 0.85 m, rounded at its shoulder); the backshell, two cones (25° and 45° from the axis) up to the ring where it sits on
// the orbiter, the parachute's canister and its lid above that, 2.5 m from the nose; the trim wing hinged above the seal.
const TWC = {
  R: 1.7,
  seal: [1.681, 0.671],
  hip: [1.3, 1.49],
  bip: [0.62, 2.17],
  can: [0.5, 2.42],
  top: 2.5,
};
function twHeatShieldProfile() {
  const p = [],
    Rn = 0.85;
  for (let a = 0; a <= 20; a += 2)
    p.push([Rn * Math.sin(a * DEG), Rn * (1 - Math.cos(a * DEG))]);
  for (let a = -70; a <= 40; a += 6)
    p.push([1.62 + 0.08 * Math.cos(a * DEG), 0.62 + 0.08 * Math.sin(a * DEG)]); // the shoulder (centre r 1.62, y 0.62)
  p.push(TWC.seal);
  return p;
}
function twBackshellProfile() {
  const p = [TWC.seal, TWC.hip, TWC.bip, [TWC.can[0], TWC.bip[1]], TWC.can];
  for (let k = 1; k <= 5; k++) {
    const a = ((k / 5) * Math.PI) / 2;
    p.push([
      TWC.can[0] * Math.cos(a),
      TWC.can[1] + (TWC.top - TWC.can[1]) * Math.sin(a),
    ]);
  }
  return p;
}
// the heat shield's ablator: dark grey-brown, a faint grid of the honeycomb's panels, a mottle
function twHeatShieldMat() {
  return twMat("hs", () => {
    const prof = m20Resample(twHeatShieldProfile(), 160),
      L = prof.len,
      W = 2048,
      H = 512;
    let s = 13;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#332c27";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,230,200,0.035)" : "rgba(0,0,0,0.07)";
        g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 7, 1 + rnd() * 3);
      }
      g.strokeStyle = "rgba(120,104,90,0.28)";
      g.lineWidth = 1.5;
      for (let k = 1; k < 7; k++) {
        const y = ((0.18 + k * 0.24) / L) * H;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      for (let k = 0; k < 36; k++) {
        const x = (k / 36) * W;
        g.beginPath();
        g.moveTo(x, (0.4 / L) * H);
        g.lineTo(x, H);
        g.stroke();
      }
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.85,
      metalness: 0.04,
    });
  });
}
// the backshell's white coat: the seal's dark rim and its bolts, the hip's seam, eight thruster ports below the hip, round
// ports and two gold-rimmed sensor windows on the upper cone, the ring it sits on the orbiter by, the canister and its lid
function twBackshellMat() {
  return twMat("bs", () => {
    const prof = m20Resample(twBackshellProfile(), 160),
      L = prof.len,
      W = 2048,
      H = 1024,
      S = (x) => (x / L) * H;
    const sHip = Math.hypot(TWC.seal[0] - TWC.hip[0], TWC.seal[1] - TWC.hip[1]),
      sBip =
        sHip + Math.hypot(TWC.hip[0] - TWC.bip[0], TWC.hip[1] - TWC.bip[1]);
    const disc = (g, a, sp, rho, fill, rim) => {
      const r = prof.at(sp)[0],
        ex = (rho / (TAU * r)) * W,
        ey = (rho / L) * H,
        x = ((((a / 360) % 1) + 1) % 1) * W;
      for (const dx of [0, -W, W]) {
        g.beginPath();
        g.ellipse(x + dx, S(sp), ex, ey, 0, 0, TAU);
        g.fillStyle = fill;
        g.fill();
        if (rim) {
          g.lineWidth = 3;
          g.strokeStyle = rim;
          g.stroke();
        }
      }
    };
    const dots = (g, sp, step, col) => {
      const n = Math.round((TAU * prof.at(sp)[0]) / step);
      g.fillStyle = col;
      for (let k = 0; k < n; k++) {
        g.beginPath();
        g.arc(((k + 0.5) / n) * W, S(sp), 1.6, 0, TAU);
        g.fill();
      }
    };
    let s = 17;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#dedcd5";
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 5000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(90,85,78,0.04)";
        g.fillRect(rnd() * W, rnd() * S(sBip), 3 + rnd() * 10, 2 + rnd() * 5);
      }
      g.fillStyle = "#34353a";
      g.fillRect(0, 0, W, S(0.03));
      dots(g, 0.016, 0.25, "#9a9ca0");
      g.strokeStyle = "rgba(140,138,130,0.5)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, S(sHip));
      g.lineTo(W, S(sHip));
      g.stroke();
      for (let k = 0; k < 12; k++) {
        g.beginPath();
        g.moveTo((k / 12) * W, S(0.03));
        g.lineTo((k / 12) * W, S(sHip));
        g.strokeStyle = "rgba(150,147,140,0.35)";
        g.lineWidth = 2;
        g.stroke();
      } // the lower cone's panels
      for (let k = 0; k < 8; k++)
        disc(g, 22.5 + k * 45, sHip - 0.18, 0.06, "#2c2d31", "#8d8f93"); // thruster ports
      for (const a of [70, 160, 250, 340])
        disc(g, a, sHip - 0.45, 0.07, "#bdbcb7", "#8f8e89");
      for (const a of [120, 300]) {
        disc(g, a, sHip + 0.4, 0.13, "#c49a42");
        disc(g, a, sHip + 0.4, 0.08, "#3c3c40");
      }
      g.fillStyle = "#b3b6ba";
      g.fillRect(0, S(sBip) - 5, W, 10);
      dots(g, sBip + 0.03, 0.06, "rgba(110,108,102,0.9)");
      g.fillStyle = "#e8e6df";
      g.fillRect(0, S(sBip) + 5, W, H - S(sBip) - 5);
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.6,
      metalness: 0.03,
    });
  });
}
function twHeatShield() {
  const g = new THREE.Group(),
    prof = m20Resample(twHeatShieldProfile(), 60);
  g.add(lathe(prof, twHeatShieldMat(), 96));
  const inner = m20Inner(prof, 0.05);
  g.add(lathe(inner, mat("#4b4842", "dark", { side: THREE.DoubleSide }), 72));
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(inner[0][0], TWC.seal[0], 72, 1),
    mat("#57504a", "dark", { side: THREE.DoubleSide }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = TWC.seal[1];
  g.add(rim);
  g.userData.len = TWC.seal[1];
  return g;
}
// the trim wing: a plate on a hinge just above the seal (+Z); folded down onto the lower cone, or swung out into the air
function twTrimWing() {
  const h = new THREE.Group();
  h.position.set(0, 0.69, 1.71);
  const p = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.72, 0.035),
    mat("#d4d3cd", "paint"),
  );
  p.geometry.translate(0, 0.36, 0.018);
  h.add(p);
  for (const x of [-0.2, 0.2]) {
    const r = box(0.03, 0.66, 0.04, mat("#a9acb0", "metal"));
    r.position.set(x, 0.03, 0.04);
    h.add(r);
  }
  const hinge = cyl(0.03, 0.03, 0.6, mat("#8c9197", "metal"), 10);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.x = 0.3;
  h.add(hinge);
  h.userData.set = (f) => {
    h.rotation.x = twLerp(-25 * DEG, 50 * DEG, f);
  };
  return h;
}
function twBackshell(trim) {
  const g = new THREE.Group(),
    prof = m20Resample(twBackshellProfile(), 70);
  g.add(lathe(prof, twBackshellMat(), 96));
  g.add(
    lathe(
      m20Inner(m20Resample([TWC.seal, TWC.hip, TWC.bip], 30), 0.05),
      mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
      64,
    ),
  );
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 32),
    mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
  );
  plate.rotation.x = Math.PI / 2;
  plate.position.y = TWC.bip[1] - 0.04;
  g.add(plate);
  const tw = twTrimWing();
  tw.userData.set(trim);
  g.add(tw);
  g.userData.trim = tw;
  g.userData.len = TWC.top;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// Zhurong (y = 0 under its wheels, +Z forward): its body 1.3 m long, its deck white with the two round windows; six wheels
// 0.3 m across, each on its own steering post, on the active suspension that lifts and lowers the body; four solar wings
// hinged along the deck's sides that open like a butterfly's; the mast with the camera head at the front, 1.85 m up; the
// high-gain dish at the back. pose({ lift, wings, mast, dish }) from 0 (folded for the landing, the body let down) to 1.
const TWZ = { WR: 0.15, WX: 0.55, WZ: [0.62, 0, -0.62] };
function zhurong() {
  const g = new THREE.Group(),
    white = mat("#ecebe7", "paint"),
    alu = mat("#b8bdc3", "metal"),
    grey = mat("#7e838a", "metal"),
    dark = mat("#222428", "dark"),
    gold = foilMat("gold", 1);
  const { WR, WX, WZ } = TWZ;
  const body = new THREE.Group();
  g.add(body);
  body.add(box(0.84, 0.3, 1.3, white));
  for (const s of [-1, 1]) {
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), gold);
    sp.position.set(s * 0.421, 0.15, 0);
    sp.rotation.y = (s * Math.PI) / 2;
    body.add(sp);
  }
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.2),
    foilMat("mylar", 1),
  );
  back.position.set(0, 0.15, -0.651);
  back.rotation.y = Math.PI;
  body.add(back);
  for (const x of [-0.17, 0.17]) {
    const w = cyl(0.12, 0.12, 0.012, mat("#c9a04a", "gold"), 28);
    w.position.set(x, 0.3, -0.3);
    body.add(w);
    const gl = cyl(0.1, 0.1, 0.014, mat("#141a24", "glass"), 28);
    gl.position.set(x, 0.302, -0.3);
    body.add(gl);
  } // the windows
  for (const x of [-0.12, 0.12]) {
    const c = box(0.08, 0.06, 0.05, dark);
    c.position.set(x, 0.17, 0.66);
    body.add(c);
  } // front hazard cameras
  for (const x of [-0.25, 0.25]) {
    const r = box(0.12, 0.03, 0.4, grey);
    r.position.set(x, -0.03, 0.42);
    body.add(r);
  } // the radar's antennas under the front
  // wheels on their steering posts
  const wheels = [];
  for (const s of [-1, 1])
    for (const z of WZ) {
      const w = new THREE.Group();
      w.position.set(s * WX, WR, z);
      g.add(w);
      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(WR, WR, 0.17, 20),
        mat("#a7acb2", "metal"),
      );
      tyre.rotation.z = Math.PI / 2;
      w.add(tyre);
      for (let k = 0; k < 10; k++) {
        const a = (k * TAU) / 10,
          c = box(0.17, 0.018, 0.03, mat("#6c7076", "metal"));
        c.geometry.translate(0, -0.009, 0);
        c.position.set(0, Math.cos(a) * WR, Math.sin(a) * WR);
        c.rotation.x = a;
        w.add(c);
      }
      const hubc = cyl(0.05, 0.05, 0.02, dark, 14);
      hubc.rotation.z = Math.PI / 2;
      hubc.position.x = s * 0.09;
      w.add(hubc);
      const post = cyl(0.035, 0.035, 0.12, grey, 10);
      post.position.set(s * WX, 2 * WR, z);
      g.add(post);
      wheels.push(w);
    }
  // the suspension's arms (placed by pose)
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const b = twBarMesh(0.022, alu);
    g.add(b);
    arms.push(b);
  }
  // solar wings: front and rear on each side, hinged along the deck's edges (the right pair just below the left, so that
  // folded over the deck they lie one on the other)
  const wings = [];
  for (const s of [1, -1])
    for (const zc of [0.33, -0.33]) {
      const h = new THREE.Group();
      h.position.set(s * 0.42, s > 0 ? 0.32 : 0.355, zc);
      if (s < 0) h.rotation.y = Math.PI;
      body.add(h);
      const p = twPanel(0.95, 0.57, 6, 4, "#c7cacd");
      p.rotation.x = -Math.PI / 2;
      h.add(p);
      wings.push(h);
    }
  // the mast and its head; the high-gain dish
  const mast = new THREE.Group();
  mast.position.set(0, 0.42, 0.5);
  body.add(mast);
  const ped = cyl(0.06, 0.06, 0.12, grey, 12);
  ped.position.set(0, 0.3, 0.5);
  body.add(ped);
  mast.add(cyl(0.035, 0.035, 0.92, white, 12));
  const head = new THREE.Group();
  head.position.y = 0.92;
  mast.add(head);
  head.add(box(0.34, 0.13, 0.15, white));
  for (const [x, r] of [
    [-0.12, 0.028],
    [0.12, 0.028],
    [0.0, 0.045],
  ]) {
    const l = cyl(r, r, 0.03, dark, 16);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, 0.065, 0.085);
    head.add(l);
  }
  const dishP = new THREE.Group();
  dishP.position.set(0.25, 0.38, -0.5);
  body.add(dishP);
  const dd = twDish(
    0.17,
    0.05,
    mat("#f0efea", "paint", { side: THREE.DoubleSide }),
    24,
  );
  dd.position.y = 0.05;
  dishP.add(dd);
  const dpost = cyl(0.02, 0.02, 0.13, grey, 8);
  dpost.position.y = -0.08;
  dishP.add(dpost);
  const pose = ({
    lift = 1,
    wings: fw = 1,
    mast: fm = 1,
    dish: fd = 1,
  } = {}) => {
    const yb = twLerp(0.25, 0.38, lift);
    body.position.y = yb;
    for (const h of wings) h.rotation.z = twLerp(Math.PI - 0.02, 18 * DEG, fw);
    mast.rotation.x = twLerp(-Math.PI / 2, 0, fm);
    dishP.rotation.x = twLerp(0, -0.7, fd);
    for (const [i, s] of [
      [0, 1],
      [4, -1],
    ]) {
      // the rocker from the front wheel to the body's side, back to the bogie; the bogie to the middle and rear wheels
      const piv = [s * 0.43, yb + 0.1, 0.12],
        bog = [s * WX, 2 * WR + 0.2, -0.31],
        top = (z) => [s * WX, 2 * WR + 0.12, z];
      twSetBar(arms[i], top(WZ[0]), piv);
      twSetBar(arms[i + 1], piv, bog);
      twSetBar(arms[i + 2], bog, top(WZ[1]));
      twSetBar(arms[i + 3], bog, top(WZ[2]));
    }
  };
  g.userData.pose = pose;
  g.userData.wheelsZ = wheels;
  pose();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The landing platform (y = 0 at the foot of its body): an octagonal body 2.24 m across its corners and 0.45 m deep in gold
// blankets, the national flag on its +X side; four legs that fold up inside the capsule and open out to stand it 0.85 m
// off the ground (its deck 1.3 m up); the engine under its centre; two rails across the deck that carry the rover, and two
// ramps hinged at the front edge, folded back over the rover's front wheels until they swing down and run out to the
// ground. Zhurong sits on the rails, facing the ramps. pose: { legs(f), ramp(f) }.
const TWP = {
  R: 1.12,
  H: 0.45,
  clear: 0.85,
  roverZ: -0.2,
  rail: 0.03,
  ramp: 2.75,
};
function twPlatform() {
  const g = new THREE.Group(),
    { R, H } = TWP,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#dcdcd8", "paint", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#55585e", "metal", { side: THREE.DoubleSide }),
      0,
      true,
    ),
  );
  {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.32), cnFlagMat());
    f.position.set(rf + 0.005, H / 2, 0);
    f.rotation.y = Math.PI / 2;
    g.add(f);
  }
  const eng = bell(
    0.6,
    0.25,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -0.6;
  g.add(eng);
  const ch = cyl(0.12, 0.12, 0.12, grey, 16);
  ch.position.y = -0.12;
  g.add(ch);
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(rf - 0.1, a, 0));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.18, 0.08, 0.12, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.12,
        0.04,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.position.set(s * 0.05, -0.12, 0.02);
      pod.add(n);
    }
  }
  for (const [x, z] of [
    [0.45, -0.35],
    [-0.45, -0.35],
  ]) {
    const r = box(0.22, 0.06, 0.16, dark);
    r.position.set(x, -0.06, z);
    g.add(r);
  } // the radar and the laser altimeter
  // the rails on the deck
  for (const s of [-1, 1]) {
    const r = box(0.3, TWP.rail, 1.9, alu);
    r.position.set(s * TWZ.WX, H, 0.07);
    g.add(r);
  }
  // legs at the four diagonals: the main strut (it telescopes), two side struts, the footpad
  const legs = [];
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      L = new THREE.Group();
    L.position.set(...m20Polar(1.0, a, 0.32));
    L.rotation.y = a - Math.PI / 2;
    g.add(L);
    const main = twBarMesh(0.045, alu, 10),
      inner = twBarMesh(0.032, mat("#d9dcdf", "metal"), 10),
      side = [twBarMesh(0.022, alu), twBarMesh(0.022, alu)];
    const pad = cyl(0.19, 0.17, 0.06, mat("#c9a04a", "gold"), 18);
    L.add(main, inner, ...side, pad);
    legs.push({ main, inner, side, pad });
  }
  // the ramps: an outer rail and two that slide out of it, on a hinge at the deck's front edge
  const ramps = [];
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.position.set(s * TWZ.WX, H + TWP.rail, rf);
    g.add(h);
    const secs = [0.95, 0.92, 0.92].map((l, i) => {
      // a channel: its floor and two lips, each section a little narrower than the last
      const b = new THREE.Group(),
        w = 0.24 - i * 0.025,
        m = i ? mat("#cfd3d7", "metal") : alu;
      h.add(b);
      const fl = box(w, 0.012, l, m);
      fl.geometry.translate(0, -0.012 - i * 0.006, l / 2);
      b.add(fl);
      for (const s of [-1, 1]) {
        const lp = box(0.014, 0.05, l, m);
        lp.geometry.translate(s * (w / 2 - 0.007), -0.012 - i * 0.006, l / 2);
        b.add(lp);
      }
      return b;
    });
    ramps.push({ h, secs });
  }
  const legPose = (f) => {
    const len = twLerp(0.75, 1.36, f),
      b = twLerp(35, 33, f) * DEG,
      e = [len * Math.sin(b), -len * Math.cos(b), 0];
    for (const l of legs) {
      twSetBar(l.main, [0, 0, 0], [e[0] * 0.55, e[1] * 0.55, 0]);
      twSetBar(l.inner, [e[0] * 0.5, e[1] * 0.5, 0], e);
      twSetBar(l.side[0], [-0.22, -0.32, 0.33], [e[0] * 0.55, e[1] * 0.55, 0]);
      twSetBar(l.side[1], [-0.22, -0.32, -0.33], [e[0] * 0.55, e[1] * 0.55, 0]);
      l.pad.position.set(e[0], e[1] - 0.03, 0);
    }
  };
  const drop = H + TWP.rail + TWP.clear,
    ang = Math.asin(drop / TWP.ramp); // the ramp's slope to the ground
  const rampPose = (f) => {
    const fr = twPhase(f, 0, 0.55),
      fx = twPhase(f, 0.45, 1);
    for (const { h, secs } of ramps) {
      h.rotation.x = twLerp(-140 * DEG, ang, fr);
      secs[1].position.z = twLerp(0.02, 0.92, fx);
      secs[2].position.z = twLerp(0.04, 1.83, fx);
    }
  };
  g.userData.pose = { legs: legPose, ramp: rampPose };
  g.userData.slope = ang;
  legPose(1);
  rampPose(0);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The assemblies the app shows, by part (buildSC 'tianwen'): the orbiter carrying the capsule (flags.stowed in the
// fairing; flags.deployT: it unfolds after separation); the orbiter alone; the capsule (flags.trimT: the trim wing swings
// out, flags.trim: it is out; flags.hs === false: the heat shield gone and the platform's legs opening from flags.hsT); the
// heat shield and the backshell on their own (flags.rest: on the ground); the platform with the rover (flags.powered: on
// its engine; flags.landed: on the ground, the rover unfolding from flags.wingsT, the ramp from flags.rampT, and the rover
// driving down it from flags.rollT).
function twAssembly(P, flags) {
  const g = new THREE.Group(),
    mounts = [];
  if (P.has("cruise")) {
    const o = twOrbiter(flags);
    g.add(o);
    mounts.push(...o.userData.mounts);
    const c = new THREE.Group();
    c.add(twHeatShield(), twBackshell(0));
    c.rotation.x = Math.PI;
    c.position.y = TWO.H + 0.06 + TWC.bip[1];
    g.add(c);
    if (o.userData.animate) g.userData.animate = o.userData.animate;
    g.userData.len = TWO.H + 0.06 + TWC.bip[1];
    g.userData.yc0 = 1.9;
  } else if (P.has("orbiter")) {
    const o = twOrbiter(flags);
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.len = TWO.H;
  } else if (P.has("aeroshell")) {
    if (flags.hs !== false) g.add(twHeatShield());
    const bs = twBackshell(flags.trim || flags.hs === false ? 1 : 0);
    g.add(bs);
    const anim = [];
    if (flags.trimT != null && !flags.trim)
      anim.push((t) =>
        bs.userData.trim.userData.set(
          smoothstep(clamp((t - flags.trimT) / 2, 0, 1)),
        ),
      );
    if (flags.hs === false) {
      const pf = twPlatform();
      pf.position.y = TWP.clear;
      g.add(pf);
      const zr = zhurong();
      zr.userData.pose({ lift: 0, wings: 0, mast: 0, dish: 0 });
      zr.position.set(0, TWP.clear + TWP.H + TWP.rail, TWP.roverZ);
      g.add(zr);
      pf.userData.pose.legs(0);
      pf.userData.pose.ramp(0);
      if (flags.hsT != null)
        anim.push((t) =>
          pf.userData.pose.legs(
            smoothstep(clamp((t - flags.hsT - 3) / 5, 0, 1)),
          ),
        );
      else pf.userData.pose.legs(1);
    }
    if (anim.length)
      g.userData.animate = (t) => {
        for (const f of anim) f(t);
      };
    g.userData.chuteY = TWC.top;
    g.userData.capsuleR = TWC.R;
    g.userData.dgb = true;
    g.userData.len = TWC.top;
  } else if (P.has("heatshield")) {
    g.add(twHeatShield());
    g.userData.footY = flags.rest ? 0 : 0.8;
    g.userData.len = TWC.seal[1];
  } else if (P.has("backshell")) {
    g.add(twBackshell(1));
    g.userData.chuteY = TWC.top;
    g.userData.capsuleR = TWC.R;
    g.userData.dgb = true;
    g.userData.footY = flags.rest ? TWC.seal[1] : 0.8;
    g.userData.len = TWC.top;
  } else if (P.has("lander")) {
    const pf = twPlatform();
    g.add(pf);
    const zr = zhurong();
    const z0 = TWP.roverZ,
      y0 = TWP.H + TWP.rail;
    zr.position.set(0, y0, z0);
    g.add(zr);
    g.userData.footY = -TWP.clear;
    g.userData.len = 1.4;
    if (!flags.landed) {
      zr.userData.pose({ lift: 0, wings: 0, mast: 0, dish: 0 });
      mounts.push({ y: -0.6, r: 0.25, tag: "LDR" });
    } else {
      // the drive down the ramp: along the deck to its edge, down the slope, on over the ground (its path in the
      // platform's frame: z forward, y up; pitch, nose down positive), at about 4 cm/s
      const rf = TWP.R * Math.cos(Math.PI / 8),
        a = pf.userData.slope,
        run = TWP.ramp * Math.cos(a),
        yG = -TWP.clear;
      const path = [
          [z0, y0],
          [rf, y0],
          [rf + run, yG],
          [rf + run + 1.6, yG],
        ],
        segL = [],
        tot = [0];
      for (let i = 1; i < path.length; i++) {
        segL.push(
          Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]),
        );
        tot.push(tot[i - 1] + segL[i - 1]);
      }
      const at = (s) => {
        let i = 0;
        while (i < segL.length - 1 && tot[i + 1] < s) i++;
        const f = clamp((s - tot[i]) / segL[i], 0, 1);
        return [
          twLerp(path[i][0], path[i + 1][0], f),
          twLerp(path[i][1], path[i + 1][1], f),
        ];
      };
      const pitchAt = (s) =>
        a *
        twPhase(s, tot[1] - 0.6, tot[1] + 0.6) *
        (1 - twPhase(s, tot[2] - 0.6, tot[2] + 0.6));
      const total = tot[tot.length - 1],
        speed = 0.04;
      g.userData.animate = (t) => {
        const fu =
          flags.wingsT != null ? clamp((t - flags.wingsT) / 240, 0, 1) : 1;
        zr.userData.pose({
          lift: twPhase(fu, 0, 0.25),
          wings: twPhase(fu, 0.2, 0.7),
          mast: twPhase(fu, 0.65, 0.9),
          dish: twPhase(fu, 0.85, 1),
        });
        pf.userData.pose.ramp(
          flags.rampT != null
            ? smoothstep(clamp((t - flags.rampT) / 120, 0, 1))
            : 1,
        );
        const s =
            flags.rollT != null
              ? clamp((t - flags.rollT) * speed, 0, total)
              : 0,
          [z, y] = at(s);
        zr.position.set(0, y, z);
        zr.rotation.x = pitchAt(s);
        for (const w of zr.userData.wheelsZ) w.rotation.x = s / TWZ.WR;
      };
      g.userData.animate(-1e12);
    }
  }
  g.userData.len = g.userData.len || 2;
  return { inner: g, mounts };
}

// ==== 38_change5.js
// ============================================================================
// Chang'e 5 (2020), metres: the orbiter, the returner, the lander and the ascender, stacked for launch with the lander and
// ascender on top of the orbiter.
// Published: launch mass 8.2 t; the returner (about 300 kg) is a scaled-down Shenzhou capsule and rides in a cavity of the
// orbiter, which shortens the stack; the orbiter's docking mechanism is three K-shaped claws that close on three rods on
// the ascender's top, and its transfer mechanism pushes the sample container down into the returner; the orbiter has
// five separation planes (the rocket, the lander, the docking module with the ascender, the support module, the
// returner); the lander, built on Chang'e 3's, stands on four legs, lands on a 7500 N throttleable engine, has two solar
// wings that open and fold, a rotary-percussive drill, a four-jointed arm with a scoop, and the first fabric flag China
// put on the Moon; the ascender sits on the lander's deck on its 3000 N engine. The sizes are estimates made to fit the
// stack in Long March 5's fairing and the masses: the orbiter's propulsion module 2.7 m across, the lander's body 2.5 m,
// the ascender's 1.6 m, the returner 1.25 m across its heat shield.
// ============================================================================
const CE5 = {
  O: { R: 1.35, H: 1.6, eng: 0.7 }, // the orbiter's propulsion module (y = 0 at its foot)
  S: { y0: 1.6, y1: 3.3, r0: 1.15, r1: 0.95 }, // its support module, round the returner
  D: { y: 3.3, h: 0.1, r: 0.95, rc: 0.65 }, // the docking module's ring on top; its claws at radius rc
  RET: { y0: 1.62, r: 0.625, h: 1.18 }, // the returner, on the propulsion module's deck
  L: { y0: 3.6, R: 1.25, H: 0.95, eng: 0.75, foot: 0.95 }, // the lander (its own y = 0 at the foot of its body; feet 0.95 m below)
  A: { R: 0.8, H: 0.95, gap: 0.12, eng: 0.5 }, // the ascender (its own y = 0 at the foot of its body), on the lander's deck
};
CE5.dockY = CE5.D.y + CE5.D.h + 0.3; // the ascender's top deck, docked upside down on the claws

// ---------------------------------------------------------------------------------------------------------------------
// The returner (y = 0 at the centre of its heat shield): the heat shield a shallow spherical cap, the side wall flaring in
// to the flat top with its parachute hatch; the ablative coat dark grey-brown, its seams lighter; thruster ports.
function ce5ReturnerProfile() {
  const { r, h } = CE5.RET,
    Rc = 1.25,
    p = [];
  for (let k = 0; k <= 8; k++) {
    const x = ((r - 0.04) * k) / 8;
    p.push([x, Rc - Math.sqrt(Rc * Rc - x * x)]);
  }
  const y0 = p[p.length - 1][1];
  for (let a = -60; a <= 90; a += 30)
    p.push([
      r - 0.04 + 0.04 * Math.cos(a * DEG),
      y0 + 0.04 + 0.04 * Math.sin(a * DEG),
    ]); // the shoulder
  const ys = y0 + 0.08;
  for (let k = 1; k <= 8; k++) {
    const f = k / 8;
    p.push([r - (r - 0.3) * (0.15 * f + 0.85 * f * f), ys + (h - ys) * f]);
  } // the side wall, bowed out
  p.push([0.3, h]);
  p.push([0, h]);
  return p;
}
function ce5ReturnerMat() {
  return twMat("ce5ret", () => {
    const prof = m20Resample(ce5ReturnerProfile(), 120),
      L = prof.len,
      W = 1024,
      H = 512,
      sSide = (() => {
        let s = 0;
        for (let i = 1; i < prof.length; i++) {
          s += Math.hypot(
            prof[i][0] - prof[i - 1][0],
            prof[i][1] - prof[i - 1][1],
          );
          if (prof[i][1] > 0.2) return s;
        }
        return 0;
      })();
    let sd = 23;
    const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    const map = m20Canvas(W, H, (g) => {
      g.fillStyle = "#2f2a26";
      g.fillRect(0, 0, W, H); // the heat shield
      g.fillStyle = "#5d554d";
      g.fillRect(0, (sSide / L) * H, W, H); // the side wall
      for (let i = 0; i < 4000; i++) {
        g.fillStyle =
          rnd() > 0.5 ? "rgba(255,240,220,0.05)" : "rgba(0,0,0,0.08)";
        g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 5, 1 + rnd() * 3);
      }
      g.strokeStyle = "rgba(150,140,128,0.5)";
      g.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        g.beginPath();
        g.moveTo((k / 8) * W, (sSide / L) * H);
        g.lineTo((k / 8) * W, H * 0.97);
        g.stroke();
      }
      for (const f of [0.45, 0.7]) {
        g.beginPath();
        g.moveTo(0, ((sSide + (L - sSide) * f) / L) * H);
        g.lineTo(W, ((sSide + (L - sSide) * f) / L) * H);
        g.stroke();
      }
      g.fillStyle = "#1d1e21";
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(
          ((k + 0.5) / 6) * W,
          ((sSide + (L - sSide) * 0.82) / L) * H,
          9,
          7,
          0,
          0,
          TAU,
        );
        g.fill();
      } // thruster ports
      g.fillStyle = "#8a8d92";
      g.fillRect(0, H * 0.97, W, H * 0.03); // the top
    });
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.82,
      metalness: 0.05,
    });
  });
}
function ce5Returner() {
  const g = new THREE.Group();
  g.add(lathe(ce5ReturnerProfile(), ce5ReturnerMat(), 64));
  const hatch = cyl(0.2, 0.18, 0.04, mat("#a3a7ac", "metal"), 24);
  hatch.position.y = CE5.RET.h;
  g.add(hatch);
  for (let k = 0; k < 3; k++) {
    const b = box(0.06, 0.05, 0.1, mat("#c9a04a", "gold"));
    b.position.set(...m20Polar(0.24, (k * TAU) / 3, CE5.RET.h));
    g.add(b);
  }
  g.userData.len = CE5.RET.h;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The orbiter: the propulsion module, an octagonal prism in gold blankets with white radiators on two faces and the flag on
// one, the main engine under it, four 150 N engines and attitude thrusters round its foot, a solar wing of three panels on
// each of the ±X faces, a dish antenna on a boom; on its deck the returner, inside the support module (a truncated cone),
// and on top of that the docking module: a ring with the three claws, and the channel the sample container is pushed down.
// opts: support (the support and docking modules are there), claws ('open' | 'closed'), channel (the transfer channel
// out), stowed / deployT (the wings fold against their faces; they open after separation), returner.
function ce5Orbiter(opts = {}) {
  const g = new THREE.Group(),
    { R, H } = CE5.O,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 2),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2b2d31", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#d5d8db", "metal", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0.62,
      true,
    ),
  );
  for (const a of [0, Math.PI]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), white);
    r.position.set(
      Math.sin(a) * (rf + 0.004),
      0.68,
      Math.cos(a) * (rf + 0.004),
    );
    r.rotation.y = a;
    g.add(r);
  }
  {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), cnFlagMat());
    f.position.set(0, 1.38, rf + 0.006);
    g.add(f);
  }
  // the launch adapter's ring, the main engine, the four 150 N engines, thruster pods at the corners
  const lv = cyl(0.64, 0.62, 0.12, alu, 40, true);
  lv.position.y = -0.12;
  g.add(lv);
  const valve = cyl(0.13, 0.13, 0.16, grey, 16);
  valve.position.y = -0.16;
  g.add(valve);
  const eng = bell(
    CE5.O.eng,
    0.24,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.O.eng;
  g.add(eng);
  for (let k = 0; k < 4; k++) {
    const n = bell(
      0.2,
      0.06,
      mat("#45474b", "metal", { side: THREE.DoubleSide }),
    );
    n.position.set(...m20Polar(0.92, (45 + 90 * k) * DEG, -0.2));
    g.add(n);
  }
  for (let k = 0; k < 8; k++) {
    const a = (22.5 + 45 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.1, a, 0.05));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.12, 0.07, 0.1, grey));
    const n = bell(
      0.08,
      0.03,
      mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
    );
    n.position.set(0, -0.08, 0.02);
    pod.add(n);
  }
  // the dish antenna on a boom at the 135° face
  {
    const a = 135 * DEG,
      d = new THREE.Group();
    d.position.set(...m20Polar(rf + 0.55, a, 0.85));
    d.rotation.y = a;
    g.add(d);
    const dd = twDish(
      0.45,
      0.1,
      mat("#efeee9", "paint", { side: THREE.DoubleSide }),
      32,
    );
    dd.rotation.x = Math.PI / 2;
    d.add(dd);
    const fd = cyl(0.03, 0.03, 0.3, grey, 8);
    fd.rotation.x = Math.PI / 2;
    d.add(fd);
    g.add(
      m20Bar(m20Polar(rf, a, 0.85), m20Polar(rf + 0.52, a, 0.85), 0.03, alu),
    );
  }
  // the solar wings (accordions of three 1.3 × 1.5 m panels)
  const wings = [];
  for (const s of [1, -1]) {
    const w = new THREE.Group();
    w.position.set(s * rf, H / 2, 0);
    if (s < 0) w.rotation.z = Math.PI;
    g.add(w);
    const yoke = [twBarMesh(0.02, alu), twBarMesh(0.02, alu)];
    w.add(...yoke);
    const h0 = new THREE.Group();
    w.add(h0);
    const hs = [h0];
    let par = h0;
    for (let i = 0; i < 3; i++) {
      par.add(twPanel(1.3, 1.5, 6, 7));
      if (i < 2) {
        const h = new THREE.Group();
        h.position.set(1.3, 0, i ? -0.035 : 0.035);
        par.add(h);
        hs.push(h);
        par = h;
      }
    }
    wings.push({ yoke, hs });
  }
  const wingPose = (f) => {
    for (const { yoke, hs } of wings) {
      const fu = twPhase(f, 0, 0.35),
        fo = twPhase(f, 0.25, 1);
      hs[0].position.set(twLerp(0.14, 0.4, fu), 0, twLerp(0.65, 0, fu));
      hs[0].rotation.y = twLerp(Math.PI / 2, 0, fo);
      hs[1].rotation.y = twLerp(-Math.PI, 0, fo);
      hs[2].rotation.y = twLerp(Math.PI, 0, fo);
      const t0 = hs[0].position;
      twSetBar(yoke[0], [0, 0.45, 0], [t0.x, 0.2, t0.z]);
      twSetBar(yoke[1], [0, -0.45, 0], [t0.x, -0.2, t0.z]);
    }
  };
  if (opts.deployT != null)
    g.userData.animate = (t) =>
      wingPose(clamp((t - opts.deployT - 30) / 180, 0, 1));
  wingPose(opts.stowed || opts.deployT != null ? 0 : 1);
  // the returner on its ring
  const rr = cyl(0.6, 0.6, 0.04, alu, 32);
  rr.position.y = H - 0.02;
  g.add(rr);
  if (opts.returner !== false) {
    const r = ce5Returner();
    r.position.y = CE5.RET.y0;
    g.add(r);
  }
  if (opts.support) g.add(ce5Upper(opts));
  g.userData.len = opts.support ? CE5.D.y + CE5.D.h : H;
  g.userData.mounts = [{ y: -CE5.O.eng, r: 0.24, tag: "ORB" }];
  return g;
}

// the support module (a truncated cone round the returner) and the docking module on top of it: a ring with the three
// claws (opts.claws 'open' | 'closed') and the channel the sample container is pushed down (opts.channel)
function ce5Upper(opts = {}) {
  const g = new THREE.Group(),
    gold = foilMat("gold", 6),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#b9bec4", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2b2d31", "dark");
  const { y0, y1, r0, r1 } = CE5.S;
  const sh = cyl(r0, r1, y1 - y0, gold, 48, true);
  sh.position.y = y0;
  g.add(sh);
  const ins = cyl(
    r0 - 0.03,
    r1 - 0.03,
    y1 - y0,
    mat("#3a3c40", "metal", { side: THREE.BackSide }),
    48,
    true,
  );
  ins.position.y = y0;
  g.add(ins);
  for (const [y, h] of [
    [y0, 0.08],
    [y0 + 0.75, 0.1],
    [y1 - 0.08, 0.08],
  ]) {
    const f = (y + h / 2 - y0) / (y1 - y0),
      r = twLerp(r0, r1, f) + 0.006;
    const b = cyl(r + 0.004, r, h, white, 48, true);
    b.position.y = y;
    g.add(b);
  }
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) * TAU) / 8;
    g.add(
      m20Bar(
        m20Polar(r0 + 0.02, a, y0 + 0.05),
        m20Polar(r1 + 0.02, a, y1 - 0.05),
        0.018,
        alu,
      ),
    );
  }
  const { y, h, r, rc } = CE5.D;
  const ring = cyl(r, r, h, alu, 48);
  ring.position.y = y;
  g.add(ring);
  const top = new THREE.Mesh(
    new THREE.RingGeometry(rc - 0.12, r, 48),
    mat("#9da2a8", "metal", { side: THREE.DoubleSide }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = y + h + 0.002;
  g.add(top);
  const claws = [];
  for (let k = 0; k < 3; k++) {
    // a K-shaped claw: a post and two fingers that close on the ascender's rod
    const a = (k * TAU) / 3,
      c = new THREE.Group();
    c.position.set(...m20Polar(rc, a, y + h));
    c.rotation.y = a;
    g.add(c);
    c.add(box(0.12, 0.2, 0.1, grey));
    const fs = [-1, 1].map((s) => {
      const f = new THREE.Group();
      f.position.set(0, 0.18, s * 0.03);
      c.add(f);
      const b = box(0.1, 0.17, 0.035, mat("#c9cdd2", "metal"));
      b.geometry.translate(0, 0, s * 0.0175);
      f.add(b);
      f.userData.s = s;
      return f;
    });
    claws.push(fs);
  }
  const clawPose = (closed) => {
    for (const fs of claws)
      for (const f of fs) f.rotation.x = f.userData.s * (closed ? -0.12 : 0.55);
  };
  clawPose(opts.claws === "closed");
  if (opts.channel) {
    const ch = box(0.24, 0.6, 0.24, mat("#c6cacf", "metal"));
    ch.position.y = CE5.RET.y0 + CE5.RET.h + 0.02;
    g.add(ch);
    const cc = box(0.18, 0.04, 0.18, dark);
    cc.position.y = CE5.RET.y0 + CE5.RET.h + 0.6;
    g.add(cc);
    for (let k = 0; k < 3; k++)
      g.add(
        m20Bar(
          m20Polar(0.14, (k * TAU) / 3 + 0.5, CE5.D.y + 0.04),
          m20Polar(r - 0.04, (k * TAU) / 3 + 0.5, CE5.D.y + 0.04),
          0.02,
          alu,
        ),
      );
  }
  return g;
}
// ---------------------------------------------------------------------------------------------------------------------
// The ascender (y = 0 at the foot of its body): an octagonal body in gold blankets on four short feet, its 3000 N engine
// under its centre, a solar panel fixed on each of the ±X faces, thruster pods at four corners; on its top deck the sealed
// sample container in the middle, the three rods the orbiter's claws close on, the rendezvous laser and camera.
function ce5Ascender() {
  const g = new THREE.Group(),
    { R, H } = CE5.A,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(twPrismSides(8, R, 0, H, 0, () => gold));
  g.add(
    twDeck(8, R, H, 0, mat("#e2e2de", "paint", { side: THREE.DoubleSide })),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0,
      true,
    ),
  );
  const eng = bell(
    CE5.A.eng,
    0.2,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.A.eng;
  g.add(eng);
  for (let k = 0; k < 4; k++) {
    const ft = box(0.1, CE5.A.gap, 0.1, alu);
    ft.position.set(...m20Polar(0.55, (45 + 90 * k) * DEG, -CE5.A.gap));
    g.add(ft);
  }
  for (const s of [1, -1]) {
    const p = twPanel(0.8, 0.66, 5, 4, "#7d838a");
    p.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    p.position.set(s * (rf + 0.03), H / 2, s * 0.4);
    g.add(p);
  }
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(R - 0.06, a, H * 0.55));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.1, 0.1, 0.08, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.06,
        0.025,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.rotation.z = (s * Math.PI) / 2;
      n.position.set(s * 0.05, 0.03, 0.03);
      pod.add(n);
    }
  }
  // on the top deck
  const can = cyl(0.17, 0.17, 0.3, mat("#eeeeea", "paint"), 24);
  can.position.y = H;
  g.add(can);
  const lid = cyl(0.17, 0.12, 0.06, mat("#c9a04a", "gold"), 24);
  lid.position.y = H + 0.3;
  g.add(lid);
  for (let k = 0; k < 3; k++) {
    // the rods: a bar across two short posts, facing out, at the claws' radius
    const a = (k * TAU) / 3,
      r = new THREE.Group();
    r.position.set(...m20Polar(CE5.D.rc, a, H));
    r.rotation.y = a;
    g.add(r);
    for (const x of [-0.12, 0.12]) {
      const p = box(0.035, 0.16, 0.035, alu);
      p.position.x = x;
      r.add(p);
    }
    const bar = cyl(0.022, 0.022, 0.3, mat("#d8dbde", "metal"), 10);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0.15, 0.15, 0);
    r.add(bar);
  }
  const lz = box(0.16, 0.12, 0.16, dark);
  lz.position.set(...m20Polar(0.42, 60 * DEG, H));
  g.add(lz);
  const cam = cyl(0.05, 0.05, 0.12, dark, 12);
  cam.position.set(...m20Polar(0.42, 300 * DEG, H));
  g.add(cam);
  const ant = cyl(0.015, 0.015, 0.35, mat("#1d1e21", "dark"), 8);
  ant.position.set(...m20Polar(0.5, 180 * DEG, H));
  g.add(ant);
  g.userData.len = H;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// The lander (y = 0 at the foot of its body): an octagonal body in gold blankets, its deck white round the hole the
// ascender's engine sits in; four legs from the diagonal faces (folded close to the body for launch, then swung out),
// footpads; the engine under its centre; the two solar wings at the top of the ±X faces (hanging down for launch, out flat
// in flight, raised on the Moon); the drill's tower on the −Z face, its rod going down into the ground; the arm with its
// scoop along the +Z edge; the panoramic camera's mast, the dish antenna; the flag on its pole at the back. pose:
// { legs(f), wings(φ), drill(d), arm(k), flag(f) }.
function ce5Lander() {
  const g = new THREE.Group(),
    { R, H } = CE5.L,
    rf = R * Math.cos(Math.PI / 8);
  const gold = foilMat("gold", 1.5),
    white = mat("#e8e8e3", "paint"),
    alu = mat("#bfc4ca", "metal"),
    grey = mat("#80858c", "metal"),
    dark = mat("#2a2c30", "dark");
  g.add(
    twPrismSides(8, R, 0, H, 0, (k) => (k === 2 || k === 6 ? white : gold)),
  );
  g.add(
    twDeck(
      8,
      R,
      H,
      0,
      mat("#deded9", "paint", { side: THREE.DoubleSide }),
      0.3,
    ),
  );
  g.add(
    twDeck(
      8,
      R,
      0,
      0,
      mat("#5d6066", "metal", { side: THREE.DoubleSide }),
      0,
      true,
    ),
  );
  const well = cyl(
    0.3,
    0.3,
    0.5,
    mat("#3a3c40", "metal", { side: THREE.DoubleSide }),
    24,
    true,
  );
  well.position.y = H - 0.5;
  g.add(well);
  const eng = bell(
    CE5.L.eng,
    0.3,
    mat("#3c3e42", "metal", { side: THREE.DoubleSide }),
  );
  eng.position.y = -CE5.L.eng;
  g.add(eng);
  const ch = cyl(0.14, 0.14, 0.14, grey, 16);
  ch.position.y = -0.14;
  g.add(ch);
  for (let k = 0; k < 4; k++) {
    const a = (22.5 + 90 * k) * DEG,
      pod = new THREE.Group();
    pod.position.set(...m20Polar(rf - 0.12, a, 0));
    pod.rotation.y = a;
    g.add(pod);
    pod.add(box(0.2, 0.08, 0.14, grey));
    for (const s of [-1, 1]) {
      const n = bell(
        0.13,
        0.045,
        mat("#3a3b3f", "metal", { side: THREE.DoubleSide }),
      );
      n.position.set(s * 0.06, -0.13, 0.02);
      pod.add(n);
    }
  }
  for (const [x, z] of [
    [0.5, 0.45],
    [-0.5, 0.45],
  ]) {
    const r = box(0.24, 0.07, 0.18, dark);
    r.position.set(x, -0.07, z);
    g.add(r);
  } // the laser ranger and the altimeter
  // legs at the diagonal faces: the main strut on its hinge near the top, two side struts from the foot, the pad
  const legs = [],
    hingeY = 0.85,
    len = Math.hypot(0.85, hingeY + CE5.L.foot - 0.035);
  for (let k = 0; k < 4; k++) {
    const a = (45 + 90 * k) * DEG,
      Lg = new THREE.Group();
    Lg.position.set(...m20Polar(rf, a, hingeY));
    Lg.rotation.y = a - Math.PI / 2;
    g.add(Lg);
    const main = twBarMesh(0.05, alu, 10),
      side = [twBarMesh(0.024, alu), twBarMesh(0.024, alu)],
      pad = cyl(0.25, 0.22, 0.07, mat("#c9a04a", "gold"), 20);
    const cap = cyl(0.07, 0.07, 0.1, grey, 10);
    Lg.add(main, ...side, pad, cap);
    cap.position.y = -0.05;
    legs.push({ main, side, pad });
  }
  const legPose = (f) => {
    const b =
        twLerp(6, Math.atan2(0.85, hingeY + CE5.L.foot - 0.035) * RAD, f) * DEG,
      e = [len * Math.sin(b), -len * Math.cos(b), 0];
    for (const l of legs) {
      twSetBar(l.main, [0, 0, 0], e);
      for (const s of [0, 1])
        twSetBar(
          l.side[s],
          [-0.2, -hingeY, s ? 0.36 : -0.36],
          [e[0] * 0.62, e[1] * 0.62, 0],
        );
      l.pad.position.set(e[0], e[1] - 0.035, 0);
    }
  };
  // solar wings on the ±X faces' top edges: φ = −90° hanging, 0 flat, + raised
  const wings = [];
  for (const s of [1, -1]) {
    const h = new THREE.Group();
    h.position.set(s * (rf + 0.03), H, 0);
    if (s < 0) h.rotation.y = Math.PI;
    g.add(h);
    const p = twPanel(1.8, 1.2, 9, 6, "#5d6268");
    p.rotation.x = -Math.PI / 2;
    h.add(p);
    wings.push(h);
  }
  // the drill's tower on the −Z face, and its rod
  const drill = new THREE.Group();
  drill.position.set(0, 0, -(rf + 0.2));
  g.add(drill);
  {
    const tw = box(0.3, 1.75, 0.3, white);
    tw.position.y = -0.7;
    drill.add(tw);
    const st = box(0.34, 0.12, 0.34, grey);
    st.position.y = -0.72;
    drill.add(st);
    for (const y of [0.15, 0.75])
      g.add(m20Bar([0, y, -rf], [0, y, -(rf + 0.06)], 0.03, alu));
  }
  const rod = cyl(0.035, 0.035, 1, mat("#9ea3a9", "metal"), 10);
  rod.geometry.translate(0, -1, 0);
  drill.add(rod);
  rod.position.y = -0.72;
  // the arm: shoulder (yaw, pitch), elbow, wrist, the scoop; its base at the +Z edge of the deck
  const arm = new THREE.Group();
  arm.position.set(0.42, H + 0.12, rf - 0.05);
  g.add(arm);
  const base = cyl(0.09, 0.09, 0.12, grey, 16);
  base.position.set(0.42, H, rf - 0.05);
  g.add(base);
  const j1 = new THREE.Group();
  arm.add(j1);
  const up = box(1.3, 0.12, 0.12, white);
  up.geometry.translate(0.65, 0, 0);
  j1.add(up);
  const j2 = new THREE.Group();
  j2.position.set(1.3, 0, 0.13);
  j1.add(j2);
  const fo = box(1.15, 0.1, 0.1, white);
  fo.geometry.translate(0.575, 0, 0);
  j2.add(fo);
  for (const [j, x] of [
    [j1, 0],
    [j2, 0],
  ]) {
    const m = cyl(0.09, 0.09, 0.2, grey, 14);
    m.rotation.x = Math.PI / 2;
    m.position.x = x;
    j.add(m);
  }
  const j3 = new THREE.Group();
  j3.position.set(1.15, 0, 0);
  j2.add(j3);
  {
    const w = cyl(0.06, 0.06, 0.12, grey, 12);
    w.rotation.x = Math.PI / 2;
    j3.add(w);
    const sc = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 8, 0, TAU, 0, Math.PI / 2),
      mat("#c3c7cc", "metal", { side: THREE.DoubleSide }),
    );
    sc.rotation.z = -Math.PI / 2;
    sc.position.x = 0.14;
    j3.add(sc);
    const nc = box(0.06, 0.06, 0.06, dark);
    nc.position.set(0.08, 0.08, 0);
    j3.add(nc);
  }
  // arm poses [yaw, shoulder, elbow, wrist]: stowed along the edge; out over the ground in front, down into it; raised
  // upright (so that it turns clear of the ascender); over the ascender's sample container
  const ARM = {
    stow: [-Math.PI, 0.02, Math.PI - 0.02, 0],
    up: [-Math.PI / 2, 0.4, -1.2, -0.6],
    dig: [-Math.PI / 2, -0.62, -0.85, -0.55],
    lift: [-Math.PI / 2, 1.52, -1.3, -1.8],
    over: [1.936 - TAU, 1.52, -1.3, -1.8],
  };
  const armSet = (q) => {
    arm.rotation.y = q[0];
    j1.rotation.z = q[1];
    j2.rotation.z = q[2];
    j3.rotation.z = q[3];
  };
  // the panoramic camera's mast (front-left corner), the dish antenna (back-right)
  {
    const p = m20Polar(rf - 0.2, 315 * DEG, H),
      m = cyl(0.04, 0.04, 0.6, white, 10);
    m.position.set(...p);
    g.add(m);
    const hd = box(0.22, 0.14, 0.14, white);
    hd.position.set(p[0], H + 0.6, p[2]);
    g.add(hd);
    for (const x of [-0.06, 0.06]) {
      const l = cyl(0.025, 0.025, 0.03, dark, 12);
      l.rotation.x = Math.PI / 2;
      l.position.set(p[0] + x, H + 0.67, p[2] + 0.075);
      g.add(l);
    }
  }
  {
    const p = m20Polar(rf - 0.25, 135 * DEG, H),
      m = cyl(0.04, 0.04, 0.45, grey, 10);
    m.position.set(...p);
    g.add(m);
    const d = twDish(
      0.32,
      0.08,
      mat("#efeee9", "paint", { side: THREE.DoubleSide }),
      28,
    );
    d.position.set(p[0], H + 0.45, p[2]);
    d.rotation.x = -0.6;
    g.add(d);
  }
  // the flag: a pole that runs up from a box on the back-left face, the flag on a bar from its top
  const fa = 225 * DEG,
    flag = new THREE.Group();
  flag.position.set(...m20Polar(rf + 0.08, fa, 0.5));
  flag.rotation.y = fa - Math.PI / 2;
  g.add(flag);
  const fbox = box(0.16, 0.5, 0.12, grey);
  fbox.position.y = -0.25;
  flag.add(fbox);
  const pole = cyl(0.02, 0.02, 1, alu, 8);
  flag.add(pole);
  const fpiv = new THREE.Group();
  flag.add(fpiv);
  const bar = cyl(0.012, 0.012, 1.25, alu, 6);
  bar.rotation.z = Math.PI / 2;
  bar.position.x = 0.62;
  fpiv.add(bar);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), cnFlagMat());
  cloth.geometry.translate(0.6, -0.4, 0);
  fpiv.add(cloth);
  const flagPose = (f) => {
    const fp = twPhase(f, 0, 0.6),
      fc = twPhase(f, 0.5, 1),
      hgt = twLerp(0.3, 1.9, fp);
    pole.scale.y = hgt;
    fpiv.position.y = hgt;
    cloth.scale.set(Math.max(fc, 0.04), Math.max(fc, 0.15), 1);
    bar.scale.y = Math.max(fc, 0.05);
    bar.position.x = 0.62 * Math.max(fc, 0.05);
    cloth.visible = bar.visible = f > 0.3;
  };
  g.userData.pose = {
    legs: legPose,
    wings: (phi) => {
      for (const h of wings) h.rotation.z = phi;
    },
    drill: (d) => {
      rod.scale.y = Math.max(d, 0.02);
      rod.visible = d > 0.01;
    },
    arm: armSet,
    flag: flagPose,
    ARM,
  };
  legPose(1);
  wings.forEach((h) => (h.rotation.z = 0));
  rod.visible = false;
  armSet(ARM.stow);
  flagPose(0);
  g.userData.len = H;
  g.userData.footY = -CE5.L.foot;
  return g;
}
// the arm's work on the surface, k from 0 to 1 over the scooping: several scoops in front, each emptied into the container
// on the ascender's top; joint angles interpolated between key poses
function ce5ArmAt(A, k) {
  const keys = [
    [0, A.stow],
    [0.05, A.up],
  ];
  for (let i = 0; i < 3; i++) {
    const t0 = 0.06 + i * 0.3,
      yaw = -Math.PI / 2 + (i - 1) * 0.35,
      Y = (q) => [yaw, ...q.slice(1)];
    keys.push(
      [t0, Y(A.up)],
      [t0 + 0.05, Y(A.dig)],
      [t0 + 0.09, [yaw + 0.08, ...A.dig.slice(1)]],
      [t0 + 0.13, Y(A.up)],
      [t0 + 0.16, Y(A.lift)],
      [t0 + 0.2, A.over],
      [t0 + 0.23, A.over],
      [t0 + 0.27, Y(A.lift)],
    );
  }
  keys.push([0.97, A.up], [1, A.stow]);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] < k) i++;
  const [ta, qa] = keys[i],
    [tb, qb] = keys[i + 1],
    f = smoothstep(clamp((k - ta) / Math.max(tb - ta, 1e-6), 0, 1));
  return qa.map((v, j) => twLerp(v, qb[j], f));
}

// ---------------------------------------------------------------------------------------------------------------------
// The assemblies the app shows, by part (buildSC 'change5'): the four together (flags.stowed for launch, flags.deployT: the
// orbiter's wings and the lander's legs and wings open after separation); the orbiter with the returner (flags.dock ===
// false: the docking and support modules gone with the ascender); the orbiter with the ascender docked; the lander with
// the ascender (flags.landed: on the Moon, working from flags.tLand: the drill, the arm, the flag); the lander alone
// after the ascender has gone; the ascender (flags.dock: with the docking and support modules, released together); the
// orbiter without the returner; the returner.
const CE5_HOURS = { drill: [1.0, 5.7], arm: [6.0, 22.5], flag: 46.0 }; // after touchdown (2020-12-01 15:11 UTC: drilling done by 20:53, sampling sealed by 14:00 the next day; the flag before liftoff)
function ce5Assembly(P, flags) {
  const g = new THREE.Group(),
    mounts = [],
    H3 = 3600,
    has = (k) => P.has(k);
  const ascOnLander = (ln) => {
    const a = ce5Ascender();
    a.position.y = CE5.L.H + CE5.A.gap;
    ln.add(a);
    return a;
  };
  const dockedAsc = () => {
    const a = ce5Ascender();
    a.rotation.x = Math.PI;
    a.position.y = CE5.dockY + CE5.A.H;
    return a;
  };
  if (has("orbiter") && has("lander")) {
    const o = ce5Orbiter({
      support: true,
      claws: "open",
      stowed: flags.stowed,
      deployT: flags.deployT,
    });
    g.add(o);
    mounts.push(...o.userData.mounts);
    const ln = ce5Lander();
    ln.position.y = CE5.L.y0;
    g.add(ln);
    ascOnLander(ln);
    for (let k = 0; k < 4; k++) {
      const a = (45 + 90 * k) * DEG;
      g.add(
        m20Bar(
          m20Polar(CE5.D.r - 0.05, a, CE5.D.y + CE5.D.h),
          m20Polar(0.9, a, CE5.L.y0),
          0.04,
          mat("#b9bec4", "metal"),
        ),
      );
    }
    const lp = ln.userData.pose,
      fold = (f) => {
        lp.legs(twPhase(f, 0.5, 1));
        lp.wings(twLerp(-Math.PI / 2, 0, twPhase(f, 0, 0.5)));
      };
    if (flags.deployT != null) {
      const oa = o.userData.animate;
      g.userData.animate = (t) => {
        oa(t);
        fold(clamp((t - flags.deployT - 240) / 240, 0, 1));
      };
    }
    fold(flags.stowed || flags.deployT != null ? 0 : 1);
    g.userData.len = CE5.L.y0 + CE5.L.H + CE5.A.gap + CE5.A.H + 0.36;
    g.userData.yc0 = 2.4;
  } else if (has("orbiter") && has("ascent")) {
    const o = ce5Orbiter({ support: true, claws: "closed", channel: true });
    g.add(o, dockedAsc());
    mounts.push(...o.userData.mounts);
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } else if (has("orbiter")) {
    const sup = flags.dock !== false,
      o = ce5Orbiter({ support: sup, claws: "open", channel: sup });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("service")) {
    const o = ce5Orbiter({ returner: false });
    g.add(o);
    mounts.push(...o.userData.mounts);
    g.userData.yc0 = 2.0;
  } else if (has("ascent") && flags.dock) {
    g.add(ce5Upper({ claws: "closed", channel: true }), dockedAsc());
    g.userData.len = CE5.dockY + CE5.A.H + CE5.A.eng;
    g.userData.yc0 = 2.0;
  } // released with the docking and support modules (in the orbiter's frame)
  else if (has("ascent")) {
    const a = ce5Ascender();
    g.add(a);
    mounts.push({ y: -CE5.A.eng, r: 0.2, tag: "ASC" });
    g.userData.footY = -(CE5.L.H + CE5.A.gap + CE5.L.foot);
    g.userData.len = CE5.A.H;
  } else if (has("lander") || has("descent")) {
    const ln = ce5Lander();
    g.add(ln);
    const lp = ln.userData.pose;
    g.userData.footY = -CE5.L.foot;
    g.userData.len = has("lander") ? CE5.L.H + CE5.A.gap + CE5.A.H : CE5.L.H;
    if (has("lander")) ascOnLander(ln);
    if (has("descent")) {
      lp.wings(0.6);
      lp.flag(1);
    } else if (!flags.landed)
      mounts.push({ y: -CE5.L.eng, r: 0.3, tag: "LDR" });
    else if (flags.tLand != null) {
      const T = flags.tLand,
        h = (t) => (t - T) / H3,
        [d0, d1] = CE5_HOURS.drill,
        [a0, a1] = CE5_HOURS.arm;
      g.userData.animate = (t) => {
        const x = h(t);
        lp.wings(twLerp(0, 0.6, clamp(x / 0.1, 0, 1)));
        lp.drill(
          x < d0
            ? 0
            : x < d1 - 0.7
              ? (1.3 * (x - d0)) / (d1 - 0.7 - d0)
              : 1.3 * clamp((d1 - x) / 0.7, 0, 1),
        );
        lp.arm(
          x <= a0 || x >= a1
            ? lp.ARM.stow
            : ce5ArmAt(lp.ARM, (x - a0) / (a1 - a0)),
        );
        lp.flag(clamp((x - CE5_HOURS.flag) / 0.05, 0, 1));
      };
      g.userData.animate(T);
    } else lp.wings(0.6);
  } else if (has("capsule")) {
    g.add(ce5Returner());
    g.userData.chuteY = CE5.RET.h;
    g.userData.capsuleR = CE5.RET.r;
    g.userData.len = CE5.RET.h;
  }
  g.userData.len = g.userData.len || 2;
  return { inner: g, mounts };
}

// ==== 40_missionview.js
// ============================================================================
// Mission view: craft nodes (models, plumes, chutes, plasma), trajectory
// lines in selectable frames, labels, vectors, osculating orbit, surface caps.
// ============================================================================
const MV = {
  md: null,
  crafts: [],
  trails: [],
  caps: [],
  capInfo: [],
  frame: "earth",
  frameSel: "auto",
  layers: {},
  labels: [],
  vecs: [],
  tNow: 0,
};
const PROP_LOOK = {
  // plume look per propellant: [intensity, diamonds, core]
  kerolox: [1.25, 0.25, "#fff2c8"],
  solid: [1.5, 0.15, "#fffbe8"],
  hydrolox: [0.55, 0.9, "#e8f2ff"],
  methalox: [0.8, 0.6, "#eef0ff"],
  hypergolic: [0.5, 0.0, "#fff0dc"],
  udmh: [0.6, 0.1, "#fff0dc"],
  mmh: [0.45, 0.0, "#fff2e6"],
  hydrazine: [0.3, 0.0, "#f4f8ff"],
  xenon: [0.4, 0, "#e0e8ff"],
};
function disposeTree(o) {
  o.traverse((n) => {
    if (n.userData.keep) return;
    if (n.geometry) n.geometry.dispose();
    if (
      n.material &&
      !Object.values(MATS).includes(n.material) &&
      !Object.values(TEX).includes(n.material)
    ) {
      if (Array.isArray(n.material)) n.material.forEach((m) => m.dispose());
      else n.material.dispose();
    }
  });
}
function clearMissionView() {
  for (const c of MV.crafts) {
    R.scene.remove(c.node);
    disposeTree(c.node);
    c.label && c.label.remove();
    if (c.shadow) {
      R.scene.remove(c.shadow);
      c.shadow.geometry.dispose();
      c.shadow.material.dispose();
    }
  }
  if (MV.tracks) {
    MV.tracks.parent && MV.tracks.parent.remove(MV.tracks);
    MV.tracks.geometry.dispose();
    MV.tracks.material.dispose();
    MV.tracks = null;
  }
  for (const tr of MV.trails) tr.dispose();
  for (const cp of MV.caps) {
    cp.parent && cp.parent.remove(cp);
    cp.geometry.dispose();
  }
  if (MV.pad) {
    R.scene.remove(MV.pad);
    disposeTree(MV.pad);
    MV.pad = null;
  }
  disposeExhaust();
  disposeRunway();
  MV.crafts = [];
  MV.trails = [];
  MV.caps = [];
  MV.capInfo = [];
}
function setupMissionView(md) {
  clearMissionView();
  MV.md = md;
  const M = md.M;
  for (const o of M.objects) {
    const node = new THREE.Group();
    node.visible = false;
    R.scene.add(node);
    const c = {
      o,
      node,
      models: new Map(),
      cur: null,
      curKey: null,
      q: new THREE.Quaternion(),
      qInit: false,
      plumes: [],
      chute: null,
      chuteKey: null,
      plasma: null,
      P: null,
      s: null,
    };
    for (let i = 0; i < 8; i++) {
      const p = makePlume();
      p.visible = false;
      node.add(p);
      c.plumes.push(p);
    }
    c.plasma = makePlasma();
    c.plasma.visible = false;
    node.add(c.plasma);
    const isPrim = o.id === "ship";
    c.label = h(
      "div",
      {
        class: "lbl craft" + (isPrim ? " primary" : ""),
        style: `color:${isPrim ? "var(--amber)" : o.kind === "craft" ? "#7fd1ff" : "#9aa3ad"}`,
      },
      h("span", { class: "dot" }),
      h("span", { class: "nm" }, o.name),
      h("span", { class: "eng" }, "ENGINE ON"),
      h("span", { class: "sub" }),
    );
    c.label.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      setTarget("obj:" + o.id);
    });
    c.label.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.detail === 1) setTarget("obj:" + o.id);
    });
    $("#labels").append(c.label);
    MV.crafts.push(c);
    if (o.trail !== false && o.segs.length && o.kind !== "debris")
      MV.trails.push(new Trail(o, md, isPrim));
  }
  // Earth-orbit flights circle the planet hundreds of times: draw about two orbits behind and one ahead
  const leo = (md.cfg.profile || "").startsWith("leo");
  TRAIL_U.uWinP.value = leo ? 2 * 5560 : 1e12;
  TRAIL_U.uWinF.value = leo ? 5560 : 1e12;
  buildSurfaceCaps(md);
  buildTracks(md);
  buildPad(md);
  buildExhaust(md); // the trail through the air after liftoff (app/47_exhaust.js)
  MV.frameBuilt = null;
}
function craftById(id) {
  return MV.crafts.find((c) => c.o.id === id);
}

// ---------------- state helpers ----------------
function padState(md, t) {
  // the vehicle standing on the pad before liftoff
  const S = LAUNCH_SITES[md.cfg.site];
  const r = sitePosEcl("earth", S.lat, S.lon, 0, t);
  return {
    ref: "earth",
    r,
    v: vcross(bodyOmegaEcl("earth", t), r),
    m: 0,
    T: 0,
    dir: vunit(r),
    D: [0, 0, 0],
    extra: { phase: "on the pad", alt: 0 },
    pad: true,
    surface: true,
  };
}
function craftState(c, t) {
  let s = c.o.stateAt(t);
  if (!s && c.o.id === "ship" && t < c.o.t0 && t > c.o.t0 - 4 * 3600) {
    s = padState(MV.md, t);
    const s0 = c.o.segs[0] && c.o.segs[0].stateAt(c.o.t0);
    if (s0 && s0.m) s.m = s0.m;
    const ig = padIgnition(MV.md, t); // engines lit, clamps still holding
    if (ig && ig.f > 0) {
      s.T = ig.thrust;
      s.ign = ig;
      s.extra.phase = "ignition";
      s.extra.stage = ig.core;
      s.extra.throttle = ig.f;
    }
  }
  return s;
}
function cfgAt(c, t) {
  const x = c.o.configAt(t);
  if (x) return x.label;
  return c.o.configs.length ? c.o.configs[0].label : null;
}

// ---------------- crafts ----------------
const _q1 = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion(),
  _q3 = new THREE.Quaternion(),
  _axTumble = new THREE.Vector3(0.3, 0.2, 1).normalize();
const _qHalfY = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI,
);
function basisQuat(nose, upRef, q) {
  const Y = new THREE.Vector3(nose[0], nose[1], nose[2]).normalize();
  let U = new THREE.Vector3(upRef[0], upRef[1], upRef[2]);
  if (Math.abs(U.clone().normalize().dot(Y)) > 0.98)
    U =
      Math.abs(Y.z) < 0.9
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(1, 0, 0);
  const X = new THREE.Vector3().crossVectors(Y, U).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  _m4.makeBasis(X, Y, Z);
  return q.setFromRotationMatrix(_m4);
}
function activeMounts(c, s, t, cfgL, model) {
  const out = [];
  if (!(s.T > 0)) return out;
  const mounts = model.userData.mounts || [];
  if (cfgL && cfgL.key === "launch") {
    const st = s.extra && s.extra.stage;
    const L = LAUNCHERS[cfgL.launcher];
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    for (const m of mounts) {
      if (!m.tag.startsWith("stage:")) continue;
      const id = m.tag.slice(6);
      if (id === st) out.push(m);
      else if (bst && id === bst.id && cfgL.boosters) {
        const tb = t - MV.md.M.t0;
        if (tb < 0 && bst.prop === "solid") continue;
        const tEnd = bst.curve
          ? bst.curve.filter((p) => p[1] > 0.1).slice(-1)[0][0] + 1
          : (1.15 * bst.propMass) / (bst.thrustSL / (bst.ispSL * G0));
        if (tb < tEnd) out.push(m);
      } // a thrust curve tells when the solid motors burn out
    }
    return out;
  }
  const b = MV.md.burnAt(t, c.o.id);
  let tag = null;
  if (b) {
    const tk = MV.md.tanks.find((k) => k.engine === b.engine);
    tag = tk ? tk.id : null;
  }
  if (b && /\bRCS\b/.test(b.engine || "") && !tag) return out; // small reaction-control jets: no main-engine plume
  if (cfgL && cfgL.key === "stack") tag = "upper";
  const ms = tag ? mounts.filter((mm) => mm.tag === tag) : []; // every engine of that tank (e.g. the orbiter's two OMS engines)
  if (!ms.length) {
    const m = mounts.find((mm) => mm.tag === "upper") || mounts[0];
    if (m) ms.push(...mounts.filter((mm) => mm.tag === m.tag));
  } // no burn on record (a powered descent): the engines of the first mount's kind
  out.push(...ms);
  return out;
}
function noseDirection(c, s, t, cfgL, act) {
  const rD = c.rD || s.r,
    vD = c.vD || s.v,
    body = c.dom || s.ref;
  const up = vunit(rD),
    ex = s.extra || {};
  const rot = body === "earth" || body === "mars";
  const vAir = rot ? vsub(vD, vcross(bodyOmegaEcl(body, t), rD)) : vD;
  const alt = body === "sun" ? 1e9 : vnorm(rD) - surfaceRadius(body);
  if (MV.md && MV.md.shPrep !== null && isShuttle(MV.md)) {
    const sh = shuttleAttitude(c, s, t, cfgL);
    if (sh) return sh;
  }
  // near the ground the roll comes from the ground frame (41_attitude.js), handing over to the flight reference as a craft climbs away
  const G = groundFrame(c, t),
    upR = flightSign(c, t) < 0 ? vscale(up, -1) : up;
  const att = (nose, ref) => {
    if (!G) return { nose, roll: ref };
    const g = G.z ? G.P : vcross(G.P, nose);
    return G.w >= 1
      ? { nose, roll: g }
      : { nose, roll: g, roll2: ref, w2: 1 - G.w };
  };
  if (
    s.surface ||
    s.pad ||
    (cfgL && cfgL.landed) ||
    ex.phase === "landed" ||
    ex.phase === "touchdown" ||
    ex.phase === "recovery"
  )
    return s.rover && s.hdg
      ? { nose: up, roll: s.hdg }
      : att(up, s.hdg || vperp(up));
  // Starship lights its engines for landing while still lying belly-first and pitches up onto them over a few seconds
  const belly = (H) => {
    const va = vnorm(vAir) > 1e-9 ? vunit(vAir) : vscale(up, -1),
      e = Math.max(0, 60 * DEG - Math.asin(clamp(-vdot(va, up), -1, 1)));
    return { va, nose: vadd(vscale(H, Math.cos(e)), vscale(up, Math.sin(e))) };
  };
  if (s.T > 0 && s.dir && vnorm(s.dir) > 0.5) {
    const flip = act[0] && act[0].flip;
    let n = flip ? vscale(s.dir, -1) : s.dir;
    const ti = G && G.ep.tIgn;
    if (ti != null && t >= ti && t < ti + ATT.flip)
      n = pitchToward(
        belly(vunit(vcross(G.P, up))).nose,
        n,
        G.P,
        smoothstep((t - ti) / ATT.flip),
      );
    return att(n, upR);
  }
  // the seconds between one stage letting go and the next lighting up: the stack holds the attitude its guidance commands
  const asc = c.o.id === "ship" && c.o.segs[0];
  if (
    cfgL &&
    cfgL.key === "launch" &&
    !s.pad &&
    asc &&
    t > asc.t0 &&
    t < asc.t1 &&
    s.dir &&
    vnorm(s.dir) > 0.5
  )
    return att(vunit(s.dir), upR);
  if (
    cfgL &&
    (cfgL.key === "capsule" ||
      (cfgL.parts &&
        (cfgL.parts.includes("aeroshell") || cfgL.parts.includes("backshell"))))
  ) {
    if (cfgL.chutes || cfgL.chute || ex.chute) return att(up, vperp(up)); // hanging under its parachute (a backshell let go keeps its own)
    const vv = alt < 200 ? vAir : vD;
    return att(vscale(vunit(vv), -1), upR);
  }
  if (
    c.o.model === "starshipPayload" &&
    alt < 160 &&
    (body === "earth" || body === "mars") &&
    cfgL &&
    cfgL.key !== "launch"
  ) {
    // belly first into the airflow, the heat-shield tiles (−X) facing it: nose about 60° above the flight path at hypersonic
    // speed, level once the ship falls more steeply than that (the belly-flop). Heading: along the ground track until it
    // falls steeply toward the landing site, then the heading it will land with
    const hz = vsub(vAir, vscale(up, vdot(vAir, up)));
    const { va, nose } = belly(
      G ? vunit(vcross(G.P, up)) : vnorm(hz) > 1e-7 ? vunit(hz) : vperp(up),
    );
    return att(nose, vcross(nose, va));
  }
  if (cfgL && cfgL.key === "launch" && t < MV.md.M.t0 + 1)
    return att(up, vperp(up));
  const v = vnorm(vD) > 1e-6 ? vD : up;
  const a = att(vunit(v), upR);
  a.coast = true;
  return a;
}
// Where a model sits along its axis relative to the craft's position: feet on the ground when standing on a surface, the base
// for the whole launch stack (its state is its base) and for a spent stage or booster (it lets go from where it was in the
// stack); otherwise centred.
function anchorY(c, cfgL, model, s) {
  const ud = model.userData,
    altK = vnorm(s.r) - surfaceRadius(s.ref);
  const launch = cfgL && cfgL.key === "launch",
    debris = c.o.kind === "debris";
  if (!(
    s.surface ||
    s.pad ||
    (cfgL && cfgL.landed) ||
    launch ||
    debris ||
    (ud.footY != null && altK < 3)
  ))
    return 0;
  let fy = ud.footY;
  if (fy == null) {
    const ms = (ud.mounts || []).map((m) => m.y);
    fy = ms.length ? Math.min(...ms) : 0;
  }
  if (debris && fy === 0 && ud.bbY) fy = ud.bbY[0] + ud.yc; // boosters carry no mounts: their lowest point
  return (
    ud.yc - fy + ((launch || debris) && s.ref === "earth" ? padStandH() : 0)
  );
}
// When a stage drops away (or the launch stack becomes the orbital stack) the rest of the vehicle stays where it was: the
// model takes the offset that keeps its nose in place and lets it go over several seconds of flight.
const STAGE_TAU = 8; // s
function stagingShift(c, t, cfgL, model, s) {
  if (s.surface || s.pad || !cfgL) return 0;
  const cf = c.o.configs;
  let k = -1;
  for (let i = 0; i < cf.length && cf[i].t <= t; i++) k = i;
  if (k < 1 || t - cf[k].t > 6 * STAGE_TAU) return 0;
  const pl = cf[k - 1].label;
  if (
    !pl ||
    pl.key !== "launch" ||
    !(
      cfgL.key === "stack" ||
      (cfgL.key === "launch" && (cfgL.stFrom || 0) > (pl.stFrom || 0))
    )
  )
    return 0;
  const pm = craftModel(c, pl),
    top0 = anchorY(c, pl, pm, s) + pm.userData.bbY[1],
    top1 = anchorY(c, cfgL, model, s) + model.userData.bbY[1];
  return (top0 - top1) * Math.exp(-(t - cf[k].t) / STAGE_TAU);
}
function craftModel(c, cfgL) {
  const key = JSON.stringify(cfgL || {}) + "|" + c.o.model;
  let m = c.models.get(key);
  if (!m) {
    m = modelForConfig(
      cfgL || { key: "sc", sc: c.o.model, parts: ["orbiter"] },
      c.o.model,
    );
    c.models.set(key, m);
  }
  return m;
}
// a spent stage or booster keeps the attitude the stack had when it let go, then tumbles slowly
function sepAttitude(c) {
  if (c.sepQ !== undefined) return c.sepQ;
  c.sepQ = null;
  const ship = craftById("ship");
  if (!ship || ship === c) return null;
  const t = c.o.t0 - 0.02,
    tmp = { ...ship };
  computeCraft(tmp, t);
  if (!tmp.s) return null;
  const cfgL = cfgAt(ship, t);
  c.sepQ = craftAttitude(
    tmp,
    tmp.s,
    t,
    cfgL,
    activeMounts(tmp, tmp.s, t, cfgL, craftModel(ship, cfgL)),
    new THREE.Quaternion(),
  );
  return c.sepQ;
}
// A coasting craft turns to a burn's attitude over the minute before it lights its engines and holds the attitude a burn
// ended with for half a minute, instead of snapping between flying nose-first and the direction of the burn.
const BURN_PRE = 60,
  BURN_HOLD = 30; // s
function burnHold(c, t) {
  const md = MV.md;
  if (!md || !md.powered) return null;
  let prev = null,
    next = null;
  for (const x of md.powered) {
    if (x.obj !== c.o.id) continue;
    if (x.t1 <= t && t - x.t1 < BURN_HOLD && (!prev || x.t1 > prev.t1))
      prev = x;
    if (x.t0 >= t && x.t0 - t < BURN_PRE && (!next || x.t0 < next.t0)) next = x;
  }
  let x = null,
    edge = 0,
    w = 0;
  if (next && (!prev || (next.t0 - t) / BURN_PRE < (t - prev.t1) / BURN_HOLD)) {
    x = next;
    edge = next.t0 + 0.3;
    w = smoothstep(1 - (next.t0 - t) / BURN_PRE);
  } else if (prev) {
    x = prev;
    edge = prev.t1 - 0.3;
    w = 1 - smoothstep((t - prev.t1) / BURN_HOLD);
  }
  if (!x || w <= 0) return null;
  const q = burnEdgeQ(c, x, edge);
  return q ? { q, w } : null;
}
// the attitude at the start or end of a burn (cached: an attitude held in inertial space)
function burnEdgeQ(c, x, edge) {
  c.burnQ = c.burnQ || new Map();
  const k = x.t0 + ":" + edge;
  if (c.burnQ.has(k)) return c.burnQ.get(k);
  const tmp = { ...c };
  computeCraft(tmp, edge);
  let q = null;
  if (tmp.s && tmp.s.T > 0 && !tmp.s.surface) {
    const cfgL = cfgAt(c, edge);
    q = craftAttitude(
      tmp,
      tmp.s,
      edge,
      cfgL,
      activeMounts(tmp, tmp.s, edge, cfgL, craftModel(c, cfgL)),
      new THREE.Quaternion(),
    );
  }
  c.burnQ.set(k, q);
  return q;
}
// the attitude a craft is turning toward at t (the drawn one eases into it), into quaternion q
function craftAttitude(c, s, t, cfgL, act, q) {
  const hangs = cfgL && cfgL.chute; // under a parachute: no tumbling
  if (c.o.kind === "debris" && !s.surface && !hangs && sepAttitude(c)) {
    q.copy(c.sepQ);
    _q2.setFromAxisAngle(_axTumble, (t - c.o.t0) * 0.035);
    return q.multiply(_q2);
  }
  const nd = noseDirection(c, s, t, cfgL, act);
  basisQuat(nd.nose, nd.roll, q);
  if (nd.roll2 && nd.w2 > 0) {
    basisQuat(nd.nose, nd.roll2, _q3);
    q.slerp(_q3, nd.w2);
  } // handing over between two roll references
  applyShuttleSpin(nd, q);
  if (nd.coast && c.o.kind === "craft" && !s.surface && !s.pad) {
    const bh = burnHold(c, t);
    if (bh) q.slerp(bh.q, bh.w);
  }
  if (
    !s.surface &&
    !s.pad &&
    !hangs &&
    (c.o.kind === "debris" || (c.o.kind === "stage" && !(s.T > 0)))
  ) {
    // slow tumble after separation (not once it rests on a surface, e.g. the LM descent stage left on the Moon)
    const age = c.o.id === "et" ? Math.max(0, t - c.o.t0 - 90) : t - c.o.t0; // the Shuttle's tank drifts clear before it starts to tumble
    _q2.setFromAxisAngle(_axTumble, age * 0.035);
    q.multiply(_q2);
  }
  return q;
}
function computeCraft(c, t) {
  const s = craftState(c, t);
  c.s = s;
  if (!s) {
    c.P = null;
    return;
  }
  if (s.surface && !s.pad && MV.md) groundCraft(c, s, t);
  if (c.o.model === "shuttle" && MV.md && isShuttle(MV.md))
    shuttleGround(c, s, t);
  if (!(s.T > 0) && !s.surface && MV.md) {
    // a burn the plan applies as an instant Δv: show it firing for its real duration
    const x = MV.md.impAt(t, c.o.id);
    if (x) {
      const b = x.burn,
        dur = Math.max(x.t1 - x.t0, 1),
        m = s.m > 0 ? s.m : b.m0 || 1000;
      s.T = (m * (b.dv || 0)) / dur;
      s.dir =
        x.dir ||
        (/insertion|capture|braking|descent|deorbit|retro/i.test(x.name)
          ? vscale(vunit(s.v), -1)
          : vunit(s.v));
      s.imp = true;
    }
  }
  const Hs = helio(s.ref, t);
  c.P = vadd(Hs.r, s.r);
  c.Vh = vadd(Hs.v, s.v);
  const b = s.surface || s.pad ? s.ref : dominantBody(c.P, t);
  c.dom = b;
  if (b === s.ref) {
    c.rD = s.r;
    c.vD = s.v;
  } else {
    const B = helio(b, t);
    c.rD = vsub(c.P, B.r);
    c.vD = vsub(c.Vh, B.v);
  }
}
function updateCraft(c, t, camPos) {
  const s = c.s;
  if (!s) {
    c.node.visible = false;
    return;
  }
  const P = c.P;
  const O = R.O;
  c.node.position.set(P[0] - O[0], P[1] - O[1], P[2] - O[2]);
  c.node.visible = true;
  const cfgL = cfgAt(c, t);
  const key = JSON.stringify(cfgL || {}) + "|" + c.o.model;
  if (key !== c.curKey) {
    const m = craftModel(c, cfgL);
    if (c.cur) c.node.remove(c.cur);
    if (c.cur && c.qInit && shuttleHalfTurn(c, c.curCfg, cfgL))
      c.q.multiply(_qHalfY);
    c.node.add(m);
    c.cur = m;
    c.curKey = key;
    c.curCfg = cfgL;
  }
  const model = c.cur;
  const act = activeMounts(c, s, t, cfgL, model);
  craftAttitude(c, s, t, cfgL, act, _q1);
  const realDt = MV.realDt || 0.016;
  const jump =
    Math.abs(t - (c.lastT ?? t)) > Math.max(30, (MV.rate || 1) * 0.5) ||
    !c.qInit;
  // On the ground, ease relative to the turning planet: carry last frame's attitude round with it first. Easing in
  // inertial space lets the model trail the planet's spin, and under a fast time-warp (a frame can be most of a sol)
  // a lander standing still would lean and tumble end over end.
  if (!jump && s.surface && c.qGround === s.ref && t !== c.lastT) {
    bodyQuat(s.ref, c.lastT, _q2).invert();
    c.q.premultiply(_q2).premultiply(bodyQuat(s.ref, t, _q2));
  }
  if (jump) c.q.copy(_q1);
  else c.q.slerp(_q1, 1 - Math.exp(-realDt * 5));
  c.qInit = true;
  c.lastT = t;
  c.qGround = s.surface ? s.ref : null;
  c.node.quaternion.copy(c.q);
  // scale: metres → km; optionally enlarge distant craft
  const dist = Math.max(1e-9, camPos.distanceTo(c.node.position));
  let sc = 0.001;
  if (MV.layers.bigcraft) {
    const pxPerKm = R.pxPerRad / dist;
    const lenKm = (model.userData.len || 10) * 0.001;
    const px = lenKm * pxPerKm;
    if (px < 26) sc *= 26 / Math.max(px, 1e-6);
  }
  c.node.scale.setScalar(sc);
  const ud = model.userData;
  model.position.z = 0;
  if (c.o.model === "shuttle" && cfgL && cfgL.key === "sc")
    model.position.y = 0; // the orbiter's state is its reference point, in flight and on its wheels (shuttleGround)
  else
    model.position.y =
      anchorY(c, cfgL, model, s) + stagingShift(c, t, cfgL, model, s);
  const so = shuttleSepShift(c, t, cfgL, model, s);
  if (so) {
    model.position.y += so[1];
    model.position.z += so[2];
  }
  c.yOff = model.position.y;
  c.zOff = model.position.z;
  if (ud.wheels && ud.wheels.length) {
    const wo = s.rover ? s.rover.wodo : 0;
    for (const w of ud.wheels) w.rotation.x = -wo / w.userData.wheel;
  }
  if (ud.animate) ud.animate(t); // parts in motion on their own timeline (the Shuttle's bay doors and robot arm, Hubble's door)
  // plumes
  updatePlumes(c, s, t, act, model);
  // parachutes
  const ch =
    cfgL && (cfgL.chutes || cfgL.chute) ? cfgL.chutes || cfgL.chute : 0;
  const chKey = ch ? cfgL.key + ch + (model.userData.dgb ? "d" : "") : null;
  if (chKey !== c.chuteKey) {
    if (c.chute) {
      c.node.remove(c.chute);
      disposeTree(c.chute);
      c.chute = null;
    }
    if (chKey) {
      const capR = model.userData.capsuleR || 2;
      const dgb = model.userData.dgb;
      const n = dgb ? 1 : ch >= 2 ? (capR > 1.5 ? 3 : 1) : 2;
      const diam = dgb
        ? c.o.model === "msl"
          ? 21.5
          : 16
        : ch >= 2
          ? capR > 2.2
            ? 35
            : capR > 1.5
              ? 25.4
              : 9
          : capR > 1.5
            ? 5
            : 2;
      c.chute = makeChutes(dgb ? "dgb" : "ring", n, diam, capR);
      c.chute.position.y =
        (model.userData.chuteY || 3) - model.userData.yc + (c.yOff || 0);
      c.node.add(c.chute);
    }
    c.chuteKey = chKey;
  }
  updatePlasma(c, s, t, model, !!ch);
}
// the shock layer and wake of an entry (makePlasma), and the light it throws on the vehicle
const _vPl = new THREE.Vector3(),
  _qPl = new THREE.Quaternion();
function updatePlasma(c, s, t, model, chutes) {
  const heat = (s.extra && s.extra.heat) || 0,
    G = c.plasma,
    U = G.userData;
  if (heat > 0.3 && !model.userData.plasmaGeo && !U.pending) {
    // scatter the points over the model ahead of the glow, when the browser is idle (~0.2 s)
    U.pending = true;
    (window.requestIdleCallback || setTimeout)(() => {
      plasmaGeometry(model);
      U.pending = false;
    });
  }
  if (!(heat > 3) || chutes) {
    G.visible = false;
    return;
  }
  const k = clamp((Math.log10(heat) - 0.5) / 1.6, 0.05, 1.1),
    P = plasmaGeometry(model); // faint at first (a few W/cm²), full by ~70 W/cm²
  if (U.geo !== P) {
    U.shell.geometry = P.shell;
    U.halo.geometry = P.halo;
    U.wake.geometry = P.wake;
    U.geo = P;
  }
  G.visible = true;
  G.position.copy(model.position);
  G.quaternion.copy(model.quaternion);
  const vAir =
      s.ref === "earth" || s.ref === "mars"
        ? vsub(s.v, vcross(bodyOmegaEcl(s.ref, t), s.r))
        : s.v,
    dir = vunit(vAir); // through the air, which turns with the planet
  _vPl
    .set(dir[0], dir[1], dir[2])
    .applyQuaternion(
      _qPl.copy(c.node.quaternion).multiply(model.quaternion).invert(),
    );
  const L = P.L,
    sc = c.node.scale.x,
    px =
      (R.height * R.renderer.getPixelRatio()) /
      (2 * Math.tan((R.camera.fov * DEG) / 2));
  for (const p of [U.shell, U.halo, U.wake]) {
    const u = p.material.uniforms;
    u.uV.value.copy(_vPl);
    u.uHeat.value = k;
    u.uTime.value = R.clock;
    u.uPx.value = px;
    R.renderer.getDrawingBufferSize(u.uScreen.value);
    u.uScale.value = sc;
    u.uOff.value = L * 0.025;
    u.uSize.value = L * 0.11;
    u.uLen.value = L * (1.5 + 5 * k);
    u.uSpread.value = 0.05; // stand-off and point size (m), length of the wake
  }
  U.halo.material.uniforms.uSize.value *= 3.5;
  U.halo.material.uniforms.uOff.value *= 2.5; // the halo: wide points, further off
  U.shell.material.uniforms.uI.value = 0.22 * Math.min(k, 0.9);
  U.halo.material.uniforms.uI.value = 0.5 * k;
  U.wake.material.uniforms.uI.value = 0.065 * k;
  const d = c.node.position.distanceTo(R.camera.position); // one light, from the glowing craft nearest the camera
  if (!R.plasmaPick || d < R.plasmaPick.d)
    R.plasmaPick = { c, d, k, L: L * sc, dir };
}
function updatePlasmaLight() {
  const Lt = R.plasmaLight,
    p = R.plasmaPick;
  R.plasmaPick = null;
  if (!Lt) return;
  if (!p) {
    Lt.intensity = 0;
    return;
  }
  const n = p.c.node.position;
  Lt.position.set(
    n.x + p.dir[0] * p.L * 0.45,
    n.y + p.dir[1] * p.L * 0.45,
    n.z + p.dir[2] * p.L * 0.45,
  ); // in the shock layer, on the windward side
  Lt.distance = p.L * 3;
  Lt.intensity = 2.2 * p.k;
}
// ---------------- exhaust plumes, sized by propellant mass flow ----------------
// The visible flame of a rocket engine at sea level grows with the square root of the propellant it burns per second
// (a nozzle's area scales with its flow): about 1.6 m per √(kg/s), so the Saturn V's five F-1s (13 t/s) trail a flame
// longer than the rocket while a lunar module's descent engine (15 kg/s) shows a few metres. In thinning air the plume
// lengthens and balloons out; climbing through Earth's upper atmosphere it keeps swelling (the exhaust leaves the nozzles
// at far more than the air's pressure and spreads until it matches it) into a glowing envelope many times the vehicle's
// width, which fades above 100 km, where there is no air left for the exhaust to burn in.
const PLUME = { k: 1.6, solid: 1.25, grow: 1.6 };
const stageFlow = (st) => st.thrustVac / (st.ispVac * G0); // kg/s at full thrust
function curveAt(curve, x) {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++)
    if (x <= curve[i][0]) {
      const a = curve[i - 1],
        b = curve[i];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
    }
  return curve[curve.length - 1][1];
}
// propellant flow through one drawn plume (kg/s) and its share of full thrust. Launch-vehicle stages: solid boosters follow
// their thrust curve, liquid engines their throttle, shared by the boosters or engines drawn for that stage. A spacecraft or
// an upper stage flying alone: its current thrust over the engine's specific impulse, shared by the engines firing.
function mountFlow(c, s, t, m, act, cfgL) {
  const same = act.filter((x) => x.tag === m.tag).length || 1;
  const thr = s.extra && s.extra.throttle != null ? s.extra.throttle : 1;
  if (cfgL && cfgL.key === "launch" && m.idx != null) {
    const st = LAUNCHERS[cfgL.launcher].stages[m.idx];
    const f = st.parallel
      ? st.curve
        ? Math.max(curveAt(st.curve, t - MV.md.M.t0), 0)
        : 1
      : thr;
    return { flow: (stageFlow(st) * f) / same, f };
  }
  let isp = 0;
  if (cfgL && cfgL.key === "stack")
    isp = LAUNCHERS[cfgL.launcher].stages[cfgL.stage].ispVac;
  else {
    const b = MV.md.burnAt(t, c.o.id);
    if (b && b.isp) isp = b.isp;
  }
  if (!isp) {
    const mod = MV.md.SC.modules.DS || MV.md.SC.modules.LDR;
    isp = (mod && mod.engine && mod.engine.isp) || 300;
  }
  return { flow: (s.T || 0) / (isp * G0) / act.length, f: thr };
}
// all the propellant the vehicle burns at liftoff (kg/s): sizes the fire and smoke at the pad and the trail behind the rocket
function liftoffFlow(L) {
  return liftoffStages(L).reduce((a, st) => a + stageFlow(st), 0);
}
const blastScale = (L) => clamp(Math.sqrt(liftoffFlow(L) / 13000), 0.35, 1.35); // 1 for the Saturn V
const _vDown = new THREE.Vector3(0, -1, 0),
  _vPd = new THREE.Vector3();
function updatePlumes(c, s, t, act, model) {
  let i = 0;
  c.flameLen = 0;
  c.flameLum = 0;
  if (act.length && s.T > 0) {
    const alt = vnorm(s.r) - surfaceRadius(s.ref);
    const pr =
      s.ref === "earth"
        ? Math.exp(-Math.max(alt, 0) / 7.2)
        : s.ref === "mars"
          ? 0.006 * Math.exp(-Math.max(alt, 0) / 11)
          : 0;
    const vac = 1 - Math.min(1, pr * 1.2);
    const bal =
      s.ref === "earth"
        ? Math.max(
            Math.min(Math.pow(1 / Math.max(pr, 1e-12), 0.3), 20) - 3.5,
            0,
          ) *
          (1 - smoothstep((alt - 80) / 60))
        : 0; // the envelope's swelling, 0 below 30 km
    const g0 = 1.3 + 5.5 * vac,
      g1 = g0 + 1.5 * bal;
    const cfgL = cfgAt(c, t);
    for (const m of act) {
      if (i >= c.plumes.length) break;
      let prop = m.prop;
      if (!prop) {
        const b = MV.md.burnAt(t, c.o.id);
        prop =
          b && b.propType
            ? b.propType
            : cfgL && cfgL.key === "stack"
              ? LAUNCHERS[cfgL.launcher].stages[cfgL.stage].prop
              : "mmh";
        if (
          !b &&
          s.extra &&
          /powered|descent|landing/.test(s.extra.phase || "")
        )
          prop =
            (MV.md.SC.modules.DS || MV.md.SC.modules.LDR)?.engine?.prop || prop;
      }
      if (
        c.o.model === "starshipPayload" ||
        (cfgL && cfgL.launcher === "starship" && cfgL.key !== "launch")
      )
        prop = "methalox";
      const look = PROP_LOOK[prop] || PROP_LOOK.mmh;
      const colr = (PROP[prop] || PROP.mmh).plume;
      const p = c.plumes[i++];
      p.visible = true;
      const mf = mountFlow(c, s, t, m, act, cfgL),
        thr = clamp(mf.f, s.pad ? 0.04 : 0.2, 1);
      const Lsl =
        PLUME.k *
        Math.sqrt(Math.max(mf.flow, 0)) *
        (prop === "solid" ? PLUME.solid : 1); // m, at sea level
      const r0 = m.r * 0.85,
        len = Math.max(
          Lsl * (1 + PLUME.grow * vac * vac + 0.25 * bal),
          m.r * 1.5,
        );
      shapePlume(p, r0, Math.max(r0 * g1, r0 + (0.06 + 0.12 * vac) * Lsl), len);
      const yc = model.userData.yc || 0;
      p.position.set(
        m.x || 0,
        m.y - yc + (c.yOff || 0),
        (m.z || 0) + (c.zOff || 0),
      );
      if (m.d)
        p.quaternion.setFromUnitVectors(
          _vDown,
          _vPd.set(m.d[0], m.d[1], m.d[2]),
        );
      else p.rotation.set(m.flip ? Math.PI : 0, 0, 0); // a canted engine's exhaust leaves along its axis
      const u = p.material.uniforms;
      u.uColor.value.set(colr);
      u.uCore.value.set(look[2]);
      u.uI.value =
        look[0] *
        (0.35 + 0.65 * (1 - vac * 0.6)) *
        thr *
        Math.pow(g0 / g1, 0.7);
      u.uDiam.value = look[1] * (1 - vac);
      u.uTime.value = performance.now() / 1000;
      c.flameLen = Math.max(c.flameLen, len);
      c.flameLum = Math.max(c.flameLum, look[0] * thr * (1 - 0.7 * vac)); // for the smoke it lights (app/47_exhaust.js)
      const dl = 5 * m.r;
      u.uDF.value = (46 * len) / dl;
      u.uDL.value = clamp(dl / len, 0.03, 1); // diamonds as before, within ~5 nozzle radii
      u.uCF.value = clamp(
        ((9 * m.r) / len) * (prop === "solid" ? 1.8 : 1),
        0.12,
        0.45,
      ); // the white-hot core: a few nozzle diameters long
    }
  }
  for (; i < c.plumes.length; i++) c.plumes[i].visible = false;
}

// ---------------- launch pad & surface caps ----------------
const PAD_TOP = 0.8; // m: the deck top stands this far above the ground (never coplanar with it, so the two cannot z-fight)
// the height of the vehicle's lowest nozzle above the ground on its pad (the pad's own figure, or the generic pad's)
function padStandH() {
  return MV.pad && MV.pad.userData.stand != null
    ? MV.pad.userData.stand
    : PAD_TOP + MOUNT_H;
}
const MOUNT_H = 6; // m: the vehicle stands on hold-down posts this high above the deck; the exhaust goes down through an opening
// liquid engines lighting on the pad before liftoff: share of liftoff thrust built up so far (null outside the hold-down period)
function padIgnition(md, t) {
  const L = md.L,
    IG = L.ign;
  if (!IG || !(IG.t > 0) || t >= md.M.t0) return null;
  const dt = t - (md.M.t0 - IG.t);
  if (dt < 0) return null;
  const nG = IG.stagger ? 3 : 1;
  let f = 0;
  for (let k = 0; k < nG; k++)
    f +=
      smoothstep(
        clamp((dt - k * (IG.stagger || 0)) / Math.max(IG.ramp, 0.1), 0, 1),
      ) / nG;
  const liq = liftoffStages(L).filter((s) => s.prop !== "solid");
  return {
    f,
    full: f > 0.985,
    thrust: liq.reduce((a, s) => a + s.thrustSL, 0) * f,
    core: (liq.find((s) => !s.parallel) || liq[0] || {}).id,
    liq,
    dt,
  };
}
const GLSL_CLOUD_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute float aA; attribute float aG; varying float vA; varying float vG; uniform float uPx;
void main(){ vA = aA; vG = aG; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uPx / max(-mv.z, 1e-9), 1.0, 1000.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_CLOUD_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCol; uniform vec3 uGlow; varying float vA; varying float vG;
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; float a = (1.0 - smoothstep(0.2, 1.0, d)) * vA; if (a < 0.01) discard;
  vec3 c = mix(uCol * (0.8 + 0.25 * (0.5 - q.y)), uGlow, vG);
  gl_FragColor = vec4(c, a);
}`;
const CLOUD_N = 420;
const hash01 = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function buildPad(md) {
  const L = md.L,
    P = padModel(md);
  let g = new THREE.Group(),
    holeMat,
    foot,
    stand = PAD_TOP + MOUNT_H,
    deckY = PAD_TOP,
    trenchD = 70;
  if (P) {
    g = P.group;
    holeMat = P.glow;
    foot = P.foot;
    stand = P.stand;
    deckY = P.deckY;
    trenchD = P.trenchD || trenchD;
  } // the real pad (app/46_pads.js)
  else {
    // a generic pad
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    foot = Math.max(
      L.diameter / 2,
      bst && bst.booster ? bst.booster.offset + bst.geom[0][1] : 0,
    ); // footprint radius, m
    const hTower = Math.max(60, L.height * 0.95 + MOUNT_H);
    const tower = box(10, hTower, 10, mat("#8a2f22", "metal"));
    tower.position.set(foot + 15, 0, 0);
    g.add(tower);
    const deck = cyl(90, 90, 6 + PAD_TOP, mat("#a7a39a", "dark"), 8);
    deck.position.y = -6;
    g.add(deck);
    // flame trench across the deck, the exhaust opening under the engines (it glows while they fire) and the hold-down posts
    const trench = box(16, 0.15, 180, mat("#34312c", "dark"));
    trench.position.set(0, PAD_TOP, 0);
    g.add(trench);
    holeMat = new THREE.MeshBasicMaterial({ color: "#141210" });
    const hole = box(foot * 2 + 4, 0.2, foot * 2 + 4, holeMat);
    hole.position.y = PAD_TOP + 0.05;
    g.add(hole);
    const postMat = mat("#6d6a64", "metal"),
      rP = foot + 1.8;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const p = box(2.4, MOUNT_H, 2.4, postMat);
      p.position.set(Math.cos(a) * rP, PAD_TOP, Math.sin(a) * rP);
      g.add(p);
    }
  }
  // exhaust and steam billowing out of the flame trench (fixed to the pad, so it stays put as Earth turns)
  const cg = new THREE.BufferGeometry();
  cg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(3 * CLOUD_N), 3),
  );
  cg.setAttribute(
    "aSize",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  cg.setAttribute(
    "aA",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  cg.setAttribute(
    "aG",
    new THREE.BufferAttribute(new Float32Array(CLOUD_N), 1),
  );
  const cm = new THREE.ShaderMaterial({
    vertexShader: GLSL_CLOUD_V,
    fragmentShader: GLSL_CLOUD_F,
    uniforms: {
      uPx: { value: 800 },
      uCol: { value: new THREE.Color("#e8e4dc") },
      uGlow: { value: new THREE.Color("#ffb15c") },
    },
    transparent: true,
    depthWrite: false,
  });
  const cloud = new THREE.Points(cg, cm);
  cloud.frustumCulled = false;
  cloud.renderOrder = 4;
  g.add(cloud);
  g.scale.setScalar(0.001);
  g.userData = {
    site: LAUNCH_SITES[md.cfg.site],
    hole: holeMat,
    cloud,
    foot,
    stand,
    deckY,
    trenchD,
    animate: P && P.animate,
    block: P && P.block,
  };
  R.scene.add(g);
  MV.pad = g;
}
function updatePad(t) {
  const g = MV.pad;
  if (!g) return;
  const S = g.userData.site;
  const O = R.O;
  const md = MV.md;
  const r = sitePosEcl("earth", S.lat, S.lon, 0, t);
  const E = helio("earth", t).r;
  g.position.set(E[0] + r[0] - O[0], E[1] + r[1] - O[1], E[2] + r[2] - O[2]);
  basisQuat(vunit(r), localFrame("earth", r, t).north, g.quaternion);
  g.visible = t < md.M.t0 + 3600 && camDistTo(g.position) < 400;
  if (!g.visible) return;
  if (g.userData.animate) g.userData.animate(t); // arms swinging away
  const t0 = md.M.t0,
    IG = md.L.ign || { t: 0 },
    tIgn = t0 - (IG.t || 0);
  const ship = craftById("ship");
  const altM = (te) => {
    if (te < t0) return 0;
    const s = ship && ship.o.stateAt(te);
    return s ? (vnorm(s.r) - BODIES.earth.R) * 1000 : 1e9;
  };
  // how hard the exhaust hits the pad at time te: engine build-up before liftoff, fading as the vehicle climbs away — once it
  // is about one and a half flame lengths up. Bigger engines (more propellant per second) throw out more fire and smoke.
  const sC = blastScale(md.L),
    fadeAlt = Math.max(110, 1.5 * PLUME.k * Math.sqrt(liftoffFlow(md.L)));
  const blast = (te) => {
    if (te < tIgn) return 0;
    if (te < t0) {
      const ig = padIgnition(md, te);
      return ig ? ig.f : 0;
    }
    return clamp(1 - altM(te) / fadeAlt, 0, 1);
  };
  const bNow = blast(t);
  g.userData.hole.color.setRGB(
    0.08 + 0.92 * bNow,
    0.07 + 0.55 * bNow,
    0.06 + 0.2 * bNow,
  );
  // sunlight on the cloud (night launches get a dim cloud lit orange by the flames)
  const sunUp = vdot(vunit(vscale(E, -1)), vunit(r));
  const day = clamp(0.2 + sunUp * 3, 0.12, 1);
  const cl = g.userData.cloud,
    A = cl.geometry.attributes,
    pos = A.position.array,
    size = A.aSize.array,
    al = A.aA.array,
    gl = A.aG.array;
  cl.material.uniforms.uCol.value.setRGB(0.91 * day, 0.89 * day, 0.86 * day);
  cl.material.uniforms.uPx.value =
    R.height / (2 * Math.tan((R.camera.fov * DEG) / 2));
  const span = (IG.t || 0) + 24,
    foot = g.userData.foot;
  let live = 0;
  for (let i = 0; i < CLOUD_N; i++) {
    const r1 = hash01(3 * i + 1),
      r2 = hash01(3 * i + 2),
      r3 = hash01(3 * i + 3);
    const te = tIgn + (i / CLOUD_N) * span + r1 * 0.15,
      a = t - te;
    const k = a >= 0 ? blast(te) : 0;
    if (k < 0.03 || a > 200) {
      al[i] = 0;
      continue;
    }
    let x, y, z, sz;
    const kind = i % 5;
    if (kind < 4) {
      // fire, then smoke and steam, blasting out of both ends of the flame trench
      const side = kind % 2 ? 1 : -1,
        v0 = (45 + 40 * r2) * (0.35 + 0.65 * k) * (0.55 + 0.45 * sC),
        tau = 3.0;
      const d =
        g.userData.trenchD + v0 * tau * (1 - Math.exp(-a / tau)) + 1.5 * a;
      x = (r3 - 0.5) * (12 + 10 * a);
      z = side * d;
      y = 7 + (1.8 + 3 * r1) * a + 0.1 * a * a;
      sz = (20 + 9 * a + 14 * r2) * (0.45 + 0.55 * sC);
      gl[i] = clamp(k * (1 - a / (1.2 + 0.8 * sC)), 0, 1) * 0.9;
    } else {
      // steam from the water deluge, boiling up around the launch mount
      const ang = r2 * TAU,
        rr = foot + 6 + 8 * r3 + 3 * a;
      x = Math.cos(ang) * rr;
      z = Math.sin(ang) * rr;
      y = g.userData.deckY + 2 + (4 + 4 * r1) * a;
      sz = (10 + 6 * a) * (0.5 + 0.5 * sC);
      gl[i] = clamp(k * (1 - a / 1.2), 0, 1) * 0.5;
    }
    pos[3 * i] = x;
    pos[3 * i + 1] = y;
    pos[3 * i + 2] = z;
    size[i] = sz * 0.001;
    al[i] = k * 0.8 * clamp(a / 0.4, 0, 1) * Math.exp(-a / 60);
    live++;
  }
  A.position.needsUpdate = true;
  A.aSize.needsUpdate = true;
  A.aA.needsUpdate = true;
  A.aG.needsUpdate = true;
  cl.visible = live > 0;
}
function camDistTo(v) {
  return R.camera.position.distanceTo(v);
}
// local high-resolution patch of a planet's surface around a site; an elevation offset (e.g. a crater floor
// below the Martian datum) blends smoothly back to the mean radius at the patch edge
const capW = (f) => 1 - smoothstep((f - 0.5) / 0.42);
function capGeometry(lat, lon, ang, seg, Rb, elev = 0) {
  const dl = ang / Math.max(Math.cos(lat * DEG), 0.2);
  const g = new THREE.SphereGeometry(
    1,
    seg,
    seg,
    (lon - dl + 180) * DEG,
    2 * dl * DEG,
    (90 - lat - ang) * DEG,
    2 * ang * DEG,
  );
  const pos = g.attributes.position,
    uv = g.attributes.uv;
  const loc = new Float32Array(pos.count * 2),
    capA = new Float32Array(pos.count).fill(1);
  const cl = Math.cos(lat * DEG),
    sl = Math.sin(lat * DEG),
    co = Math.cos(lon * DEG),
    so = Math.sin(lon * DEG);
  const C = [cl * co, sl, -cl * so],
    E = [-so, 0, -co],
    N = [-sl * co, cl, sl * so];
  const p0 = (lon - dl + 180) * DEG,
    pL = 2 * dl * DEG,
    t0 = (90 - lat - ang) * DEG,
    tL = 2 * ang * DEG;
  for (let i = 0; i < pos.count; i++) {
    // the point on the unit sphere worked out again in double precision (as SphereGeometry places it): its own 32-bit
    // copy is up to 3e-8 out — 20 cm on Earth, enough to lift the ground through a launch pad's
    const ph = p0 + ((i % (seg + 1)) / seg) * pL,
      th0 = t0 + (Math.floor(i / (seg + 1)) / seg) * tL;
    const x = -Math.cos(ph) * Math.sin(th0),
      y = Math.cos(th0),
      z = Math.sin(ph) * Math.sin(th0);
    let phi = Math.atan2(z, -x);
    if (phi < 0) phi += TAU;
    uv.setXY(i, phi / TAU, 1 - Math.acos(clamp(y, -1, 1)) / Math.PI);
    loc[2 * i] = Rb * (x * E[0] + y * E[1] + z * E[2]);
    loc[2 * i + 1] = Rb * (x * N[0] + y * N[1] + z * N[2]);
    const th = Math.acos(clamp(x * C[0] + y * C[1] + z * C[2], -1, 1)) * RAD;
    const k = 1 + (elev / Rb) * capW(th / ang);
    // vertices are stored relative to the site, and the mesh sits at the site: the large planet-radius offsets then
    // cancel on the CPU in double precision, so the ground near the pad does not jitter (and flicker) in 32-bit floats
    pos.setXYZ(i, x * k - C[0], y * k - C[1], z * k - C[2]);
  }
  g.setAttribute("aLocal", new THREE.BufferAttribute(loc, 2));
  g.setAttribute("aCap", new THREE.BufferAttribute(capA, 1));
  if (elev) g.computeVertexNormals();
  g.userData.center = C;
  g.userData.grid = {
    phiStart: (lon - dl + 180) * DEG,
    phiLength: 2 * dl * DEG,
    thetaStart: (90 - lat - ang) * DEG,
    thetaLength: 2 * ang * DEG,
    seg,
  };
  return g;
}
function addCap(body, lat, lon, ang, elev = 0) {
  const b = R.bodies[body];
  if (!b) return;
  if (
    MV.capInfo.some(
      (c) =>
        c.body === body &&
        Math.abs(c.lat - lat) < 0.5 &&
        Math.abs(c.lon - lon) < 0.5,
    )
  )
    return;
  const g = capGeometry(lat, lon, ang, 128, b.R, elev);
  const mesh = new THREE.Mesh(g, b.mat);
  mesh.renderOrder = 1;
  const C = g.userData.center;
  mesh.position.set(C[0], C[1], C[2]);
  b.mesh.add(mesh);
  MV.caps.push(mesh);
  const n = MV.capInfo.filter((c) => c.body === body).length;
  if (n < 4) {
    const cl = Math.cos(lat * DEG);
    b.mat.uniforms.uCapDir.value[n].set(
      cl * Math.cos(lon * DEG),
      Math.sin(lat * DEG),
      -cl * Math.sin(lon * DEG),
    );
    b.mat.uniforms.uCapCos.value[n] = Math.cos(ang * 0.985 * DEG);
  }
  MV.capInfo.push({ body, lat, lon, ang, elev, mesh });
}
// ground radius under a direction (km), honouring cap elevations
function groundRadius(body, dirEcl, t) {
  let r = surfaceRadius(body);
  for (const c of MV.capInfo || []) {
    if (c.body !== body || !c.elev) continue;
    const sd = vunit(sitePosEcl(body, c.lat, c.lon, 0, t));
    const th = Math.acos(clamp(vdot(sd, dirEcl), -1, 1)) * RAD;
    if (th < c.ang) r += c.elev * capW(th / c.ang);
  }
  return r;
}
function buildSurfaceCaps(md) {
  const cfg = md.cfg;
  const S = LAUNCH_SITES[cfg.site];
  for (const b of ["earth", "moon", "mars"]) {
    const U = R.bodies[b].mat.uniforms;
    if (U.uCapCos) U.uCapCos.value = [2, 2, 2, 2];
  }
  const rw = cfg.runway && RUNWAYS[cfg.runway];
  if (rw) addCap("earth", rw.lat, rw.lon, 2.5, rw.elev || 0); // the landing runway first: its elevation (Edwards is 700 m up) shapes the ground
  addCap("earth", S.lat, S.lon, 2.5);
  if (cfg.landing && typeof cfg.landing === "object")
    addCap("moon", cfg.landing.lat, cfg.landing.lon, 5); // (a Shuttle flight's landing is a time)
  for (const l of cfg.legs || []) {
    if (l.site && l.body === "mars")
      addCap("mars", l.site.lat, l.site.lon, 4, l.site.elev || 0);
  }
  for (const o of md.M.objects)
    for (const sg of o.segs)
      if (
        sg.type === "surface" &&
        (sg.ref === "moon" || sg.ref === "mars" || sg.t0 > md.M.t0 + 3600)
      )
        addCap(
          sg.ref,
          sg.lat,
          sg.lon,
          sg.ref === "earth" ? 2.5 : sg.ref === "moon" ? 5 : 4,
          sg.ref === "mars" ? sg.elev || 0 : 0,
        );
  if (rw) buildRunway(md);
}

// ---------------- trajectory lines ----------------
const GLSL_TRAIL_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aT; attribute vec3 aC; varying float vT; varying vec3 vC;
void main(){ vT = aT; vC = aC; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_TRAIL_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform float uAlpha; uniform float uWinP; uniform float uWinF; varying float vT; varying vec3 vC;
void main(){
  #include <logdepthbuf_fragment>
  float past = step(vT, uNow);
  float a = past > 0.5 ? uAlpha : uFuture * uAlpha;
  a *= 1.0 - smoothstep(uWinP * 0.6, uWinP, uNow - vT); a *= 1.0 - smoothstep(uWinF * 0.6, uWinF, vT - uNow);
  if (a < 0.01) discard;
  vec3 c = past > 0.5 ? vC : mix(vC, vec3(0.55, 0.62, 0.72), 0.55);
  gl_FragColor = vec4(c, a);
}`;
// Engine-on arcs are drawn as a ribbon of constant on-screen width (WebGL lines are always 1 px):
// every segment is a quad whose corners are pushed sideways in screen space.
const GLSL_FAT_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aOther; attribute float aSide; attribute float aEdge; attribute float aT;
uniform vec2 uRes; uniform float uWidth;
varying float vT; varying float vSide;
void main(){
  vT = aT; vSide = aEdge;
  vec4 a = modelViewMatrix * vec4(position, 1.0);
  vec4 b = modelViewMatrix * vec4(aOther, 1.0);
  float zn = -2e-6;
  if (a.z > zn && b.z > zn) { gl_Position = vec4(4.0, 4.0, 4.0, 1.0); }
  else {
    if (a.z > zn) a = mix(a, b, (zn - a.z) / (b.z - a.z));
    else if (b.z > zn) b = mix(b, a, (zn - b.z) / (a.z - b.z));
    vec4 ca = projectionMatrix * a; vec4 cb = projectionMatrix * b;
    vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; float L = length(d);
    vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0);
    ca.xy += vec2(-dir.y, dir.x) * aSide * uWidth / uRes * ca.w;
    gl_Position = ca;
  }
#include <logdepthbuf_vertex>
}`;
const GLSL_FAT_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform float uAlpha; uniform vec3 uCol; uniform vec3 uCore; uniform float uWinP; uniform float uWinF;
varying float vT; varying float vSide;
void main(){
  #include <logdepthbuf_fragment>
  float past = step(vT, uNow); float s = abs(vSide);
  float a = (past > 0.5 ? uAlpha : min(1.0, uFuture * 1.6) * uAlpha) * (1.0 - smoothstep(0.62, 1.0, s));
  a *= 1.0 - smoothstep(uWinP * 0.6, uWinP, uNow - vT); a *= 1.0 - smoothstep(uWinF * 0.6, uWinF, vT - uNow);
  if (a < 0.01) discard;
  vec3 c = mix(uCol, uCore, (1.0 - smoothstep(0.0, 0.6, s)) * (past > 0.5 ? 0.85 : 0.3));
  if (past < 0.5) c = mix(c, vec3(0.62, 0.56, 0.5), 0.15);
  gl_FragColor = vec4(c, a);
}`;
// one dot per burn, so even a few-second correction burn is visible at any zoom: filled once fired, a ring while still ahead
const GLSL_MK_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aT; uniform float uSize; varying float vT;
void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize;
#include <logdepthbuf_vertex>
}`;
const GLSL_MK_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNow; uniform float uFuture; uniform vec3 uCol; uniform float uWinP; uniform float uWinF; varying float vT;
void main(){
  #include <logdepthbuf_fragment>
  float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
  if (uNow - vT > uWinP || vT - uNow > uWinF) discard;
  float past = step(vT, uNow);
  float disk = 1.0 - smoothstep(0.72, 1.0, r);
  float ring = smoothstep(0.48, 0.62, r) * (1.0 - smoothstep(0.84, 1.0, r));
  float a = past > 0.5 ? disk : ring * min(1.0, uFuture * 2.2);
  if (a < 0.02) discard;
  vec3 c = past > 0.5 ? mix(uCol, vec3(1.0, 0.93, 0.82), 1.0 - smoothstep(0.0, 0.42, r)) : uCol;
  gl_FragColor = vec4(c, a);
}`;
const TRAIL_PAD = 900; // s of path beyond the drawn window kept in the geometry, so it is rebuilt only every few minutes of flight
const TRAIL_U = {
  uRes: { value: new THREE.Vector2(1, 1) },
  uWidth: { value: 4 },
  uMk: { value: 9 },
  uWinP: { value: 1e12 },
  uWinF: { value: 1e12 },
}; // uWinP/F: seconds of path drawn behind / ahead of now
const _v2 = new THREE.Vector2();
// heliocentric points → coordinates in a display frame (planet-centred, Sun-centred or Earth–Moon rotating)
function toFrameArr(frame, ts, P) {
  const n = ts.length,
    F = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const t = ts[i];
    let x = P[3 * i],
      y = P[3 * i + 1],
      z = P[3 * i + 2];
    if (frame === "sun") {
      F[3 * i] = x;
      F[3 * i + 1] = y;
      F[3 * i + 2] = z;
      continue;
    }
    const ob = frame === "emrot" ? "earth" : frame;
    const B = planetHelio(ob, t).r;
    x -= B[0];
    y -= B[1];
    z -= B[2];
    if (frame === "emrot") {
      const Rm = emRot(t);
      F[3 * i] = Rm[0] * x + Rm[3] * y + Rm[6] * z;
      F[3 * i + 1] = Rm[1] * x + Rm[4] * y + Rm[7] * z;
      F[3 * i + 2] = Rm[2] * x + Rm[5] * y + Rm[8] * z;
    } else {
      F[3 * i] = x;
      F[3 * i + 1] = y;
      F[3 * i + 2] = z;
    }
  }
  return F;
}
class Trail {
  constructor(o, md, primary) {
    this.o = o;
    this.md = md;
    this.primary = primary;
    this.cache = {};
    this.mat = new THREE.ShaderMaterial({
      vertexShader: GLSL_TRAIL_V,
      fragmentShader: GLSL_TRAIL_F,
      uniforms: {
        uNow: { value: 0 },
        uFuture: { value: 0.45 },
        uAlpha: { value: primary ? 0.95 : 0.7 },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
    });
    this.line = new THREE.LineSegments(new THREE.BufferGeometry(), this.mat);
    this.line.frustumCulled = false;
    this.line.renderOrder = 3;
    const U = this.mat.uniforms;
    this.fatMat = new THREE.ShaderMaterial({
      vertexShader: GLSL_FAT_V,
      fragmentShader: GLSL_FAT_F,
      uniforms: {
        uNow: U.uNow,
        uFuture: U.uFuture,
        uAlpha: { value: primary ? 0.97 : 0.85 },
        uRes: TRAIL_U.uRes,
        uWidth: TRAIL_U.uWidth,
        uCol: { value: new THREE.Color(PCOL.burn) },
        uCore: { value: new THREE.Color(PCOL.burnCore) },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.fat = new THREE.Mesh(new THREE.BufferGeometry(), this.fatMat);
    this.fat.frustumCulled = false;
    this.fat.renderOrder = 4;
    this.fat.visible = false;
    this.line.add(this.fat);
    this.mkMat = new THREE.ShaderMaterial({
      vertexShader: GLSL_MK_V,
      fragmentShader: GLSL_MK_F,
      uniforms: {
        uNow: U.uNow,
        uFuture: U.uFuture,
        uSize: TRAIL_U.uMk,
        uCol: { value: new THREE.Color(PCOL.burn) },
        uWinP: TRAIL_U.uWinP,
        uWinF: TRAIL_U.uWinF,
      },
      transparent: true,
      depthWrite: false,
    });
    this.mk = new THREE.Points(new THREE.BufferGeometry(), this.mkMat);
    this.mk.frustumCulled = false;
    this.mk.renderOrder = 5;
    this.mk.visible = false;
    this.line.add(this.mk);
    R.scene.add(this.line);
    this.sample();
  }
  sample() {
    const o = this.o,
      ts = [],
      P = [],
      brk = [],
      pw = [];
    const imp = this.md.impList.filter((x) => x.obj === o.id); // burns applied as an instant Δv: sample their real duration too
    const inImp = (t) => {
      for (const x of imp) if (t >= x.t0 && t < x.t1) return true;
      return false;
    };
    let lastEnd = null;
    for (const sg of o.segs) {
      if (sg.type === "surface") {
        lastEnd = null;
        continue;
      }
      const push = (t, s, b) => {
        const H = helio(s.ref, t).r;
        ts.push(t);
        P.push(H[0] + s.r[0], H[1] + s.r[1], H[2] + s.r[2]);
        brk.push(b ? 1 : 0);
        pw.push(s.T > 0 || (imp.length && inImp(t)) ? 1 : 0);
      };
      let first = lastEnd == null || sg.t0 - lastEnd > 2;
      {
        let t = sg.t0;
        const span = sg.t1 - sg.t0;
        const s0 = sg.stateAt(t);
        const el = rv2coe(s0.r, s0.v, BODIES[s0.ref].mu);
        let k = 0.016;
        if (el.e < 1 && el.period && span / el.period > 25)
          k = 0.016 * Math.min(4, span / el.period / 25);
        let n = 0;
        while (t < sg.t1 && n < 200000) {
          const s = sg.stateAt(t);
          push(t, s, first);
          first = false;
          n++;
          const rr = vnorm(s.r),
            vv = Math.max(vnorm(s.v), 1e-4);
          let dt = (k * rr) / vv;
          dt = clamp(
            dt,
            s.ref === "sun" ? 1800 : 0.5,
            s.ref === "sun" ? 2 * DAY : 0.5 * DAY,
          );
          if (sg.type === "burn")
            dt = Math.min(dt, Math.max((sg.t1 - sg.t0) / 20, 0.5));
          if (sg.type === "samples")
            dt = Math.min(
              dt,
              Math.max((4 * (sg.t1 - sg.t0)) / Math.max(sg.n - 1, 1), 0.5),
            );
          for (const x of imp) {
            if (x.t0 > t && x.t0 < t + dt) dt = x.t0 - t;
            else if (t >= x.t0 && t < x.t1)
              dt = Math.min(dt, Math.max((x.t1 - x.t0) / 12, 0.5), x.t1 - t);
          }
          t += dt;
        }
        const s = sg.stateAt(sg.t1);
        push(sg.t1, s, false);
      }
      lastEnd = sg.t1;
    }
    this.ts = Float64Array.from(ts);
    this.P = Float64Array.from(P);
    this.brk = Uint8Array.from(brk);
    this.pw = Uint8Array.from(pw);
    const n = this.ts.length,
      tt = new Float32Array(n);
    for (let i = 0; i < n; i++) tt[i] = this.ts[i] - this.md.M.t0;
    this.tt = tt;
    this.colorize();
    const idx = [];
    for (let i = 0; i + 1 < n; i++) if (!this.brk[i + 1]) idx.push(i, i + 1);
    this.idx = idx.length > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
    const ps = [];
    for (let i = 0; i + 1 < n; i++)
      if (this.pw[i] && !this.brk[i + 1]) ps.push(i);
    this.pwSegs = ps;
    // burn markers at the middle of each engine-on interval of this craft
    const mt = [],
      mP = [];
    for (const x of this.md.powered) {
      if (x.obj !== o.id) continue;
      const tm = (x.t0 + x.t1) / 2;
      const s = o.stateAt(tm);
      if (!s || s.surface) continue;
      const H = helio(s.ref, tm).r;
      mt.push(tm);
      mP.push(H[0] + s.r[0], H[1] + s.r[1], H[2] + s.r[2]);
    }
    this.mts = Float64Array.from(mt);
    this.mP = Float64Array.from(mP);
  }
  colorize() {
    // coasting arcs: cool blue (or the mission-phase colour); engine-on arcs: hot orange
    const n = this.ts.length,
      col = new Float32Array(3 * n);
    const byPhase = !!MV.layers.phasecol;
    const coast = hexToRgb(
        this.primary ? PCOL.coast : this.o.color || "#7fd1ff",
      ),
      burn = hexToRgb(PCOL.burn);
    for (let i = 0; i < n; i++) {
      let c = coast;
      if (this.pw[i]) c = burn;
      else if (this.primary && byPhase) {
        const ph = this.md.phaseAt(this.ts[i]);
        if (ph && ph.color) c = hexToRgb(ph.color);
      }
      col[3 * i] = c[0];
      col[3 * i + 1] = c[1];
      col[3 * i + 2] = c[2];
    }
    this.col = col;
    this.byPhase = byPhase;
  }
  frameCoords(frame) {
    if (!this.cache[frame])
      this.cache[frame] = toFrameArr(frame, this.ts, this.P);
    return this.cache[frame];
  }
  markerCoords(frame) {
    const k = "mk:" + frame;
    if (!this.cache[k]) this.cache[k] = toFrameArr(frame, this.mts, this.mP);
    return this.cache[k];
  }
  build(frame, anchor, tNow) {
    // with a time window (Earth-orbit flights: a few orbits of a two-week flight), only the points inside it go to the GPU
    const F = this.frameCoords(frame),
      N = this.ts.length,
      wP = TRAIL_U.uWinP.value,
      wF = TRAIL_U.uWinF.value,
      win = wP < 1e11 && tNow != null;
    let i0 = 0,
      i1 = N - 1;
    if (win) {
      const lo = tNow - wP - TRAIL_PAD,
        hi = tNow + wF + TRAIL_PAD;
      i0 = Math.max(0, bsearch(this.ts, lo));
      i1 = Math.min(N - 1, bsearch(this.ts, hi) + 1);
    }
    const n = Math.max(0, i1 - i0 + 1),
      pos = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const k = 3 * (i0 + i);
      pos[3 * i] = F[k] - anchor[0];
      pos[3 * i + 1] = F[k + 1] - anchor[1];
      pos[3 * i + 2] = F[k + 2] - anchor[2];
    }
    const g = this.line.geometry;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute(
      "aC",
      new THREE.BufferAttribute(
        win ? this.col.subarray(3 * i0, 3 * (i1 + 1)) : this.col,
        3,
      ),
    );
    g.setAttribute(
      "aT",
      new THREE.BufferAttribute(
        win ? this.tt.subarray(i0, i1 + 1) : this.tt,
        1,
      ),
    );
    let idx = this.idx;
    if (win) {
      const a = [];
      for (let i = i0; i < i1; i++)
        if (!this.brk[i + 1]) a.push(i - i0, i + 1 - i0);
      idx = n > 65535 ? new Uint32Array(a) : new Uint16Array(a);
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    // engine-on ribbon: 4 corners per segment; the far-end corners carry the opposite side sign because their "other" point is behind them
    const segs = win
        ? this.pwSegs.filter((i) => i >= i0 && i < i1).map((i) => i - i0)
        : this.pwSegs,
      m = segs.length,
      ttW = win ? this.tt.subarray(i0, i1 + 1) : this.tt;
    if (m) {
      const P4 = new Float32Array(12 * m),
        O4 = new Float32Array(12 * m),
        S4 = new Float32Array(4 * m),
        E4 = new Float32Array(4 * m),
        T4 = new Float32Array(4 * m),
        I6 = 4 * m > 65535 ? new Uint32Array(6 * m) : new Uint16Array(6 * m);
      for (let k = 0; k < m; k++) {
        const i = segs[k],
          j = i + 1,
          v = 4 * k,
          o12 = 12 * k;
        for (let q = 0; q < 3; q++) {
          const A = pos[3 * i + q],
            B = pos[3 * j + q];
          P4[o12 + q] = A;
          P4[o12 + 3 + q] = A;
          P4[o12 + 6 + q] = B;
          P4[o12 + 9 + q] = B;
          O4[o12 + q] = B;
          O4[o12 + 3 + q] = B;
          O4[o12 + 6 + q] = A;
          O4[o12 + 9 + q] = A;
        }
        S4[v] = 1;
        S4[v + 1] = -1;
        S4[v + 2] = -1;
        S4[v + 3] = 1; // offset sign (relative to each corner's own direction)
        E4[v] = 1;
        E4[v + 1] = -1;
        E4[v + 2] = 1;
        E4[v + 3] = -1; // which edge of the ribbon the corner is on (for the soft edge)
        T4[v] = T4[v + 1] = ttW[i];
        T4[v + 2] = T4[v + 3] = ttW[j];
        I6[6 * k] = v;
        I6[6 * k + 1] = v + 1;
        I6[6 * k + 2] = v + 2;
        I6[6 * k + 3] = v + 1;
        I6[6 * k + 4] = v + 3;
        I6[6 * k + 5] = v + 2;
      }
      const fg = this.fat.geometry;
      fg.setAttribute("position", new THREE.BufferAttribute(P4, 3));
      fg.setAttribute("aOther", new THREE.BufferAttribute(O4, 3));
      fg.setAttribute("aSide", new THREE.BufferAttribute(S4, 1));
      fg.setAttribute("aEdge", new THREE.BufferAttribute(E4, 1));
      fg.setAttribute("aT", new THREE.BufferAttribute(T4, 1));
      fg.setIndex(new THREE.BufferAttribute(I6, 1));
    }
    this.fat.visible = m > 0;
    const nm = this.mts.length;
    if (nm) {
      const MF = this.markerCoords(frame),
        mp = new Float32Array(3 * nm),
        mt = new Float32Array(nm);
      for (let i = 0; i < nm; i++) {
        mp[3 * i] = MF[3 * i] - anchor[0];
        mp[3 * i + 1] = MF[3 * i + 1] - anchor[1];
        mp[3 * i + 2] = MF[3 * i + 2] - anchor[2];
        mt[i] = this.mts[i] - this.md.M.t0;
      }
      const mg = this.mk.geometry;
      mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
      mg.setAttribute("aT", new THREE.BufferAttribute(mt, 1));
    }
    this.mk.visible = nm > 0;
    this.anchor = anchor.slice();
    this.frame = frame;
    this.builtT = tNow;
  }
  dispose() {
    R.scene.remove(this.line);
    this.line.geometry.dispose();
    this.fat.geometry.dispose();
    this.mk.geometry.dispose();
    this.mat.dispose();
    this.fatMat.dispose();
    this.mkMat.dispose();
  }
}
// Earth–Moon rotating frame: columns x̂ (to Moon), ŷ, ẑ (orbit normal); returns row-major matrix with those columns
function emRot(t) {
  const m = moonGeo(t);
  const x = vunit(m.r),
    z = vunit(vcross(m.r, m.v)),
    y = vcross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}
function frameOrigin(frame, t) {
  return frame === "sun"
    ? [0, 0, 0]
    : helio(frame === "emrot" ? "earth" : frame, t).r;
}
function toFrame(frame, t, P) {
  const B = frameOrigin(frame, t);
  const d = vsub(P, B);
  if (frame !== "emrot") return d;
  const Rm = emRot(t);
  return [
    Rm[0] * d[0] + Rm[3] * d[1] + Rm[6] * d[2],
    Rm[1] * d[0] + Rm[4] * d[1] + Rm[7] * d[2],
    Rm[2] * d[0] + Rm[5] * d[1] + Rm[8] * d[2],
  ];
}
function chooseAutoFrame(t, P) {
  const md = MV.md;
  if (!md) return "earth";
  const dM = vnorm(vsub(P, helio("moon", t).r)),
    dE = vnorm(vsub(P, helio("earth", t).r)),
    dMa = vnorm(vsub(P, helio("mars", t).r));
  if (dM < BODIES.moon.soi * 1.2 && md.cfg.dest !== "mars") return "moon";
  if (dMa < BODIES.mars.soi * 1.5) return "mars";
  if (dE < BODIES.earth.soi * 1.3) return "earth";
  return "sun";
}
function updateTrails(t, focusP, camDist) {
  const frame =
    MV.frameSel === "auto" ? chooseAutoFrame(t, focusP) : MV.frameSel;
  const show = MV.layers.paths;
  const f = toFrame(frame, t, focusP);
  const pr = R.renderer.getPixelRatio();
  R.renderer.getDrawingBufferSize(_v2);
  TRAIL_U.uRes.value.copy(_v2);
  TRAIL_U.uWidth.value = 4.2 * pr;
  TRAIL_U.uMk.value = 10 * pr;
  for (const tr of MV.trails) {
    tr.line.visible = show && (MV.layers.future || t >= tr.o.t0);
    if (!tr.line.visible) continue;
    if (tr.byPhase !== !!MV.layers.phasecol) {
      tr.colorize();
      tr.anchor = null;
    } // rebuild with the new colours
    const need =
      tr.frame !== frame ||
      !tr.anchor ||
      vnorm(vsub(f, tr.anchor)) > Math.max(2000, camDist * 2e3) ||
      (TRAIL_U.uWinP.value < 1e11 &&
        !(Math.abs(t - tr.builtT) < TRAIL_PAD * 0.75));
    if (need) tr.build(frame, f, t);
    const B = frameOrigin(frame, t);
    const O = R.O;
    if (frame === "emrot") {
      const Rm = emRot(t);
      const A = tr.anchor;
      const wa = [
        Rm[0] * A[0] + Rm[1] * A[1] + Rm[2] * A[2],
        Rm[3] * A[0] + Rm[4] * A[1] + Rm[5] * A[2],
        Rm[6] * A[0] + Rm[7] * A[1] + Rm[8] * A[2],
      ];
      tr.line.position.set(
        B[0] + wa[0] - O[0],
        B[1] + wa[1] - O[1],
        B[2] + wa[2] - O[2],
      );
      _m4.set(
        Rm[0],
        Rm[1],
        Rm[2],
        0,
        Rm[3],
        Rm[4],
        Rm[5],
        0,
        Rm[6],
        Rm[7],
        Rm[8],
        0,
        0,
        0,
        0,
        1,
      );
      tr.line.quaternion.setFromRotationMatrix(_m4);
    } else {
      tr.line.position.set(
        B[0] + tr.anchor[0] - O[0],
        B[1] + tr.anchor[1] - O[1],
        B[2] + tr.anchor[2] - O[2],
      );
      tr.line.quaternion.identity();
    }
    tr.mat.uniforms.uNow.value = t - MV.md.M.t0;
    tr.mat.uniforms.uFuture.value = MV.layers.future ? 0.42 : 0;
  }
  MV.frame = frame;
}

// ---------------- osculating orbit ----------------
function dominantBody(P, t) {
  const dM = vnorm(vsub(P, helio("moon", t).r));
  if (dM < BODIES.moon.soi) return "moon";
  const dE = vnorm(vsub(P, helio("earth", t).r));
  if (dE < BODIES.earth.soi) return "earth";
  const dMa = vnorm(vsub(P, helio("mars", t).r));
  if (dMa < BODIES.mars.soi) return "mars";
  return "sun";
}
function updateOsc(c, t) {
  if (!MV.osc) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(3 * 721), 3),
    );
    MV.osc = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    MV.osc.frustumCulled = false;
    R.scene.add(MV.osc);
  }
  const L = MV.osc;
  if (!MV.layers.osc || !c || !c.s || !c.P || c.s.surface) {
    L.visible = false;
    return;
  }
  const b = dominantBody(c.P, t);
  const B = helio(b, t);
  const r = vsub(c.P, B.r),
    v = vsub(vadd(helio(c.s.ref, t).v, c.s.v), B.v);
  const mu = BODIES[b].mu;
  const el = rv2coe(r, v, mu);
  const arr = L.geometry.attributes.position.array;
  // anchor at the craft to keep precision near it
  let nmax;
  if (el.e < 0.999) {
    for (let i = 0; i <= 720; i++) {
      const p = coe2rv(el.p, el.e, el.i, el.Om, el.w, (i / 720) * TAU, mu).r;
      arr[3 * i] = p[0] - r[0];
      arr[3 * i + 1] = p[1] - r[1];
      arr[3 * i + 2] = p[2] - r[2];
    }
    nmax = 721;
  } else {
    const nuMax = Math.acos(-1 / el.e) - 0.02;
    for (let i = 0; i <= 720; i++) {
      const nu = -nuMax + (2 * nuMax * i) / 720;
      const p = coe2rv(el.p, el.e, el.i, el.Om, el.w, nu, mu).r;
      const k = vnorm(p) > 5 * (BODIES[b].soi || 1e9) ? 0 : 1;
      arr[3 * i] = (p[0] - r[0]) * k;
      arr[3 * i + 1] = (p[1] - r[1]) * k;
      arr[3 * i + 2] = (p[2] - r[2]) * k;
    }
    nmax = 721;
  }
  L.geometry.attributes.position.needsUpdate = true;
  L.geometry.setDrawRange(0, nmax);
  const O = R.O;
  L.position.set(c.P[0] - O[0], c.P[1] - O[1], c.P[2] - O[2]);
  L.visible = true;
  MV.oscEl = { body: b, el };
}

// ---------------- vectors (velocity, gravity, thrust, drag) ----------------
const VEC_DEF = [
  { id: "vel", name: "velocity", color: "#5fe3a1" },
  { id: "g:earth", name: "g Earth", color: "#5cc8ff" },
  { id: "g:moon", name: "g Moon", color: "#d6d6d6" },
  { id: "g:sun", name: "g Sun", color: "#ffd27a" },
  { id: "g:mars", name: "g Mars", color: "#ff8a5c" },
  { id: "thrust", name: "thrust", color: "#ff9f43" },
  { id: "drag", name: "drag", color: "#ff6767" },
];
function initVectors() {
  MV.vecs = VEC_DEF.map((d) => {
    const a = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      1,
      new THREE.Color(d.color),
      0.18,
      0.08,
    );
    a.visible = false;
    a.line.material.depthTest = false;
    a.cone.material.depthTest = false;
    a.renderOrder = 20;
    a.line.renderOrder = 20;
    a.cone.renderOrder = 20;
    R.scene.add(a);
    const lab = h("div", { class: "vlbl", style: `color:${d.color}` });
    $("#vecLabels").append(lab);
    return { ...d, arrow: a, lab };
  });
}
function updateVectors(c, t, tele) {
  const show = MV.layers.vectors && c && c.P && tele;
  for (const v of MV.vecs) {
    v.arrow.visible = false;
    v.lab.style.transform = "translate(-9999px,0)";
  }
  if (!show) return;
  const camD = R.camera.position.distanceTo(c.node.position);
  const base = camD * 0.16;
  const pos = c.node.position;
  const items = [];
  items.push({
    id: "vel",
    dir: tele.vRel,
    mag: vnorm(tele.vRel),
    txt: fSpeed(vnorm(tele.vRel)),
    scale: 1,
  });
  const gmax = Math.max(...tele.grav.map((g) => g.a));
  for (const g of tele.grav) {
    if (!["earth", "moon", "sun", "mars"].includes(g.body)) continue;
    if (g.a < gmax * 1e-3) continue;
    items.push({
      id: "g:" + g.body,
      dir: g.dir,
      mag: g.a,
      txt: fAcc(g.a),
      scale: clamp(
        0.45 + 0.18 * Math.log10((g.a / gmax) * 1000 + 1e-9),
        0.2,
        1,
      ),
    });
  }
  if (tele.thrustAcc > 0)
    items.push({
      id: "thrust",
      dir: tele.thrustDir,
      mag: tele.thrustAcc,
      txt: fAcc(tele.thrustAcc),
      scale: clamp(
        0.5 + 0.2 * Math.log10(tele.thrustAcc / 9.81 + 1e-6),
        0.3,
        1.1,
      ),
    });
  if (tele.dragAcc > 1e-4)
    items.push({
      id: "drag",
      dir: tele.dragDir,
      mag: tele.dragAcc,
      txt: fAcc(tele.dragAcc),
      scale: clamp(
        0.5 + 0.2 * Math.log10(tele.dragAcc / 9.81 + 1e-6),
        0.2,
        1.0,
      ),
    });
  const W = R.width,
    Hh = R.height;
  for (const it of items) {
    const v = MV.vecs.find((x) => x.id === it.id);
    if (!v || !it.dir || vnorm(it.dir) < 1e-12) continue;
    const d = vunit(it.dir);
    const len = base * it.scale;
    v.arrow.position.copy(pos);
    v.arrow.setDirection(new THREE.Vector3(d[0], d[1], d[2]));
    v.arrow.setLength(len, len * 0.16, len * 0.07);
    v.arrow.visible = true;
    const tip = pos
      .clone()
      .add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(len * 1.04))
      .project(R.camera);
    if (tip.z < 1 && tip.z > -1) {
      const x = ((tip.x + 1) / 2) * W,
        y = ((1 - tip.y) / 2) * Hh;
      v.lab.textContent = `${v.name} ${it.txt}`;
      v.lab.style.transform = `translate(${x + 4}px, ${y - 8}px)`;
    }
  }
}

// ---------------- labels ----------------
function initBodyLabels() {
  MV.bodyLabels = BODY_LIST.map((name) => {
    const el = h(
      "div",
      { class: "lbl body", style: `color:${BODY_COLORS[name]}` },
      h("span", { class: "dot" }),
      h("span", null, BODIES[name].name),
    );
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      setTarget("body:" + name);
    });
    $("#labels").append(el);
    return { name, el };
  });
}
const _pv = new THREE.Vector3();
function occluded(scenePos) {
  // is the point hidden behind a planet?
  const cam = R.camera.position;
  const d = _pv.copy(scenePos).sub(cam);
  const L = d.length();
  d.divideScalar(L);
  for (const name of ["earth", "moon", "mars", "venus", "jupiter", "sun"]) {
    const b = R.bodies[name];
    const C = b.group.position;
    const oc = C.clone().sub(cam);
    const tca = oc.dot(d);
    if (tca < 0 || tca > L) continue;
    const d2 = oc.lengthSq() - tca * tca;
    if (d2 < b.R * b.R * 0.995) {
      if (C.distanceTo(scenePos) < b.R * 1.001) continue;
      return true;
    }
  }
  return false;
}
function placeLabel(el, scenePos, rects, priority) {
  const p = _pv.copy(scenePos).project(R.camera);
  if (p.z > 1 || p.z < -1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) {
    el.style.transform = "translate(-9999px,0)";
    return false;
  }
  const x = ((p.x + 1) / 2) * R.width,
    y = ((1 - p.y) / 2) * R.height;
  if (priority < 3)
    for (const r of rects)
      if (Math.abs(r[0] - x) < 70 && Math.abs(r[1] - y) < 14) {
        el.style.transform = "translate(-9999px,0)";
        return false;
      }
  rects.push([x, y]);
  el.style.transform = `translate(${Math.round(x - 4)}px, ${Math.round(y - 7)}px)`;
  return true;
}
function updateLabels(t, focus) {
  const rects = [];
  const show = MV.layers.labels;
  const crafts = MV.crafts
    .slice()
    .sort((a, b) => (b.o.id === "ship") - (a.o.id === "ship"));
  for (const c of crafts) {
    if (
      !show ||
      !c.node.visible ||
      (c.o.kind === "debris" && t - c.o.t0 > 600)
    ) {
      c.label.style.transform = "translate(-9999px,0)";
      continue;
    }
    const pos = c.node.position;
    const d = R.camera.position.distanceTo(pos);
    if (focus === c && d < 0.15) {
      c.label.style.transform = "translate(-9999px,0)";
      continue;
    }
    if (occluded(pos)) {
      c.label.style.transform = "translate(-9999px,0)";
      continue;
    }
    const sub = c.label.querySelector(".sub");
    const ph = c.s && c.s.extra && c.s.extra.phase;
    if (sub) sub.textContent = c.o.id === "ship" && ph ? ph : "";
    const burning = !!(c.s && c.s.T > 0 && (!c.s.surface || c.s.pad));
    if (c.label.classList.contains("burning") !== burning)
      c.label.classList.toggle("burning", burning);
    placeLabel(c.label, pos, rects, c.o.id === "ship" ? 3 : 2);
  }
  for (const bl of MV.bodyLabels) {
    const b = R.bodies[bl.name];
    const pos = b.group.position;
    const d = R.camera.position.distanceTo(pos);
    const angR = b.R / Math.max(d, 1);
    if (!show || angR > 0.25 || (bl.name !== "sun" && occluded(pos))) {
      bl.el.style.transform = "translate(-9999px,0)";
      continue;
    }
    placeLabel(bl.el, pos, rects, 1);
  }
}

// ==== 41_attitude.js
// ============================================================================
// Roll near the ground: launches, landings and liftoffs.
// basisQuat builds an attitude from a nose direction and a reference vector — the craft's +X axis is nose × reference.
// In flight the reference is the local vertical, which fails exactly when a rocket stands on its tail: craft used to
// spin about their long axis the moment they lifted off and again as they settled onto their legs. Around launches,
// landings and liftoffs a craft therefore keeps a lateral axis fixed to the ground — the axis it pitches about. The
// nose can rise, lean or settle with no turn about it; only a deliberate roll program turns that axis (the Saturn V
// rolling from its pad azimuth to the flight azimuth, a lander lifting off and swinging round to its ascent heading).
// ============================================================================
const ATT = { ramp: 4, rollRate: 8 * DEG, minRoll: 3, flip: 5 }; // s to hand over to the flight frame; roll program rate; shortest roll (s); Starship's flip for the landing burn (s)
function azDir(lf, az) {
  return vadd(vscale(lf.north, Math.cos(az)), vscale(lf.east, Math.sin(az)));
} // horizontal unit vector at azimuth az (rad, from north through east)
function azOf(lf, v) {
  return Math.atan2(vdot(v, lf.east), vdot(v, lf.north));
}
function wrapPi(a) {
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}
// azimuth of a craft's travel over the ground at t (relative to the turning surface), or null if it moves slower than vMin (km/s)
function trackAz(o, t, vMin) {
  const s = o.stateAt(t);
  if (!s || s.surface) return null;
  const va = vsub(s.v, vcross(bodyOmegaEcl(s.ref, t), s.r)),
    up = vunit(s.r),
    vh = vsub(va, vscale(up, vdot(va, up)));
  return vnorm(vh) < vMin ? null : azOf(localFrame(s.ref, s.r, t), vh);
}
// The windows in which a craft rolls about a ground-fixed axis, worked out once per craft:
//   launch — from the pad through the ascent: the axis across the flight path (the Saturn V first rolls into it);
//   land   — from the start of the final descent (the engine burn that ends at touchdown, or the parachutes opening)
//            through the stay on the surface: the axis across the direction of travel then (a rover: across the way it
//            will first drive);
//   lift   — from liftoff until the craft is well on its way: a roll from the landed heading to the ascent heading.
// Each episode: {kind, tA, tB, body, az(t) → azimuth of the axis, z: the axis is the craft's Z (else X), out: hands over to
// the flight frame over its last ATT.ramp seconds, tIgn: Starship's landing-burn ignition}. Starship carries its heat
// shield on −X and pitches about Z.
function attEpisodes(c) {
  if (c.attEp) return c.attEp;
  const md = MV.md,
    o = c.o,
    eps = [];
  c.attEp = eps;
  if (!md) return eps;
  const shuttle = isShuttle(md);
  if (
    o.id === "ship" &&
    !shuttle &&
    md.L &&
    LAUNCH_SITES[md.cfg.site] &&
    o.segs.length &&
    o.segs[0].meta &&
    o.segs[0].meta.phase === "ascent"
  ) {
    const asc = o.segs[0],
      sE = asc.stateAt(asc.t1),
      t0 = md.M.t0;
    const h = vunit(vcross(sE.r, sE.v)); // orbit normal: the launch plane
    const S = LAUNCH_SITES[md.cfg.site],
      lf = localFrame("earth", sitePosEcl("earth", S.lat, S.lon, 0, t0), t0);
    const RP = md.L.roll,
      azA = azOf(lf, vcross(h, lf.up)); // flight azimuth
    const d0 = RP ? wrapPi(RP.padAz * DEG - azA) : 0;
    eps.push({
      kind: "launch",
      tA: t0 - 4 * 3600,
      tB: asc.t1,
      body: "earth",
      out: true,
      h,
      d0,
      RP,
      t0,
    });
  }
  if (shuttle && o.model === "shuttle") return eps;
  const zAxis = o.model === "starshipPayload";
  for (let i = 0; i < o.segs.length; i++) {
    const sg = o.segs[i];
    if (sg.type !== "surface") continue;
    const prev = o.segs[i - 1],
      next = o.segs[i + 1];
    const landed =
      prev && prev.type !== "surface" && Math.abs(prev.t1 - sg.t0) < 5;
    const lifts =
      next && next.type !== "surface" && Math.abs(next.t0 - sg.t1) < 5;
    let azF = null,
      tA = sg.t0,
      turn = null,
      pw = null;
    if (landed) {
      pw = md.powered.find(
        (x) => x.obj === o.id && !x.imp && x.t0 < sg.t0 && x.t1 >= sg.t0 - 5,
      );
      const ch = o.configs.find(
        (cf) =>
          cf.t <= sg.t0 &&
          cf.t >= sg.t0 - 1800 &&
          cf.label &&
          (cf.label.chute || cf.label.chutes),
      );
      let tCh = ch ? ch.t - 1 : Infinity; // parachutes: the descent samples may open them a moment before the configuration changes
      if (prev.type === "samples")
        for (let k = 0; k < prev.n; k++)
          if (prev.extra[k].chute >= 1) {
            tCh = Math.min(tCh, prev.t[k] - 1);
            break;
          }
      // a capsule falling steeper than 45° (before its parachutes open) would point its nose along the vertical in the flight frame
      let tSteep = Infinity;
      for (let tt = sg.t0 - 1; tt > sg.t0 - 1800 && tt > prev.t0; tt -= 2) {
        const s = o.stateAt(tt);
        if (!s) break;
        const va = vsub(s.v, vcross(bodyOmegaEcl(s.ref, tt), s.r)),
          up = vunit(s.r),
          vv = vdot(va, up);
        if (vnorm(vsub(va, vscale(up, vv))) > Math.abs(vv)) {
          tSteep = tt;
          break;
        }
      }
      tA = Math.max(
        Math.min(pw ? pw.t0 : sg.t0 - 30, tCh, tSteep),
        sg.t0 - 1800,
        prev.t0,
      );
      for (let tt = tA - 0.5; tt > tA - 1800 && azF == null; tt -= 5)
        azF = trackAz(o, tt, 0.001);
      const T = md.trav;
      if (T && T.seg === sg && o.id === "ship" && azF != null) {
        // a rover sets down facing the way it will first drive: the descent stage yaws round on its engines
        const p = roverPose(md, sg.t0),
          { E, N } = meshEN(T.seg.lat, T.seg.lon),
          r = sg.stateAt(sg.t0).r;
        const azR = azOf(
          localFrame(sg.ref, r, sg.t0),
          meshToEcl(
            sg.ref,
            vadd(vscale(E, Math.sin(p.h)), vscale(N, Math.cos(p.h))),
            sg.t0,
          ),
        );
        const d = wrapPi(azR - azF),
          t1 = pw ? pw.t0 + 4 : sg.t0 - 30;
        turn = {
          t1,
          d,
          dur: Math.max(ATT.minRoll, Math.abs(d) / ATT.rollRate),
        };
      }
    } else {
      // standing where another craft landed (a lunar module's descent stage, left behind): its heading
      for (const c2 of MV.crafts) {
        if (c2 === c) continue;
        const e2 = attEpisodes(c2).find(
          (e) =>
            e.kind === "land" &&
            e.body === sg.ref &&
            e.tA <= sg.t0 + 1 &&
            e.tB >= sg.t0 - 1 &&
            Math.abs(e.lat - sg.lat) < 1e-3 &&
            Math.abs(e.lon - sg.lon) < 1e-3,
        );
        if (e2) {
          azF = e2.azF;
          break;
        }
      }
    }
    if (azF == null) azF = 0;
    if (turn) azF += turn.d; // the heading it lands with
    const azP = azF - Math.PI / 2; // the pitch axis: across the direction of travel, to its left
    const az = turn
      ? (t) => azP - turn.d * (1 - smoothstep((t - turn.t1) / turn.dur))
      : () => azP;
    eps.push({
      kind: "land",
      tA,
      tB: sg.t1,
      body: sg.ref,
      lat: sg.lat,
      lon: sg.lon,
      azF,
      az,
      z: zAxis,
      tIgn: zAxis && pw ? pw.t0 : null,
    });
    if (!lifts) continue;
    // liftoff: a roll from the landed attitude (its X axis) to square across the ascent heading — whichever side is nearer,
    // so a lander that came down facing its way out leaves without turning. The heading is read where the craft crosses
    // the ground at a good clip; afterwards the flight frame keeps the same side (sign) of the local vertical.
    const tE = sg.t1,
      xLand = zAxis ? azF + Math.PI : azP;
    let tS = null,
      azA = null;
    for (
      let tt = tE + 8;
      tt < Math.min(next.t1, tE + 300) && azA == null;
      tt += 2
    ) {
      azA = trackAz(o, tt, 0.03);
      if (azA != null) tS = tt;
    }
    if (azA == null) {
      eps.push({
        kind: "lift",
        tA: tE,
        tB: tE + 10,
        body: sg.ref,
        az: () => xLand,
        z: false,
        out: true,
        sign: 1,
      });
      continue;
    }
    const plan = (a) => {
      const dR = wrapPi(a + Math.PI / 2 - xLand),
        dL = wrapPi(a - Math.PI / 2 - xLand),
        right = Math.abs(dR) <= Math.abs(dL),
        d = right ? dR : dL;
      const dur = Math.max(ATT.minRoll, Math.abs(d) / ATT.rollRate);
      return {
        d,
        dur,
        sign: right ? 1 : -1,
        tB: Math.max(tS, tE + 2 + dur + ATT.ramp),
      };
    };
    let P = plan(azA);
    const a2 = trackAz(o, P.tB, 0.03);
    if (a2 != null) P = plan(a2);
    eps.push({
      kind: "lift",
      tA: tE,
      tB: P.tB,
      body: sg.ref,
      z: false,
      out: true,
      sign: P.sign,
      az: (t) => xLand + P.d * smoothstep((t - tE - 2) / P.dur),
    });
  }
  return eps;
}
// Which side of the local vertical the flight frame takes as its roll reference: the craft's +X axis is nose × (±up).
// Either is as good in flight; after a liftoff it is the one the climb-out ended with, so the hand-over turns nothing.
function flightSign(c, t) {
  let s = 1;
  for (const e of attEpisodes(c))
    if (e.kind === "lift" && e.tA <= t) s = e.sign;
  return s;
}
// The ground frame at t, or null in free flight: {P: the pitch axis (world), z: it is the craft's Z axis, w: weight
// against the flight frame (1 = ground frame only), ep: the episode}
function groundFrame(c, t) {
  const eps = attEpisodes(c);
  if (!eps.length) return null;
  const e = eps.find((e) => t >= e.tA && t <= e.tB);
  if (!e) return null;
  const rB = c.dom === e.body ? c.rD : vsub(c.P, helio(e.body, t).r);
  if (!rB) return null;
  const lf = localFrame(e.body, rB, t);
  let P;
  if (e.kind === "launch") {
    // across the launch plane, after the roll program (if any) from the pad azimuth
    const hp = vsub(e.h, vscale(lf.up, vdot(e.h, lf.up)));
    P = vunit(vscale(hp, -1));
    const d = e.RP
      ? e.d0 *
        (1 - smoothstep((t - e.t0 - e.RP.t[0]) / (e.RP.t[1] - e.RP.t[0])))
      : 0;
    if (d)
      P = vadd(vscale(P, Math.cos(d)), vscale(vcross(P, lf.up), Math.sin(d)));
  } else P = azDir(lf, e.az(t));
  const w = e.out ? 1 - smoothstep((t - (e.tB - ATT.ramp)) / ATT.ramp) : 1;
  return { P, z: e.z, w, ep: e };
}
// turn unit vector a toward b about axis P by the fraction f of the way, the short way round (any part along P blends linearly)
function pitchToward(a, b, P, f) {
  const ap = vunit(vsub(a, vscale(P, vdot(a, P)))),
    bp = vunit(vsub(b, vscale(P, vdot(b, P))));
  const ang = Math.atan2(vdot(P, vcross(ap, bp)), vdot(ap, bp)) * f,
    cs = Math.cos(ang),
    sn = Math.sin(ang);
  const along = vdot(a, P) * (1 - f) + vdot(b, P) * f;
  return vunit(
    vadd(
      vscale(
        vadd(vscale(ap, cs), vscale(vcross(P, ap), sn)),
        Math.sqrt(Math.max(0, 1 - along * along)),
      ),
      vscale(P, along),
    ),
  ); // Rodrigues, ap square to P
}

// ==== 42_shuttleview.js
// ============================================================================
// The Space Shuttle in the mission view: attitudes (the roll program and the roll to heads-up during ascent,
// proximity operations around the ISS, the robot-arm deploy, the deorbit burn, entry at high angle of attack
// with banked turns, the approach, flare and rollout), the orbiter rolling on its landing gear, and the runway
// with its lights.
// ============================================================================
const SHV = { runway: null, lights: null, rwy: null };
const _qS = new THREE.Quaternion(),
  _axY = new THREE.Vector3(0, 1, 0),
  _axX = new THREE.Vector3(1, 0, 0);
const SH_MAIN_GEAR = [SH_MAIN_CONTACT[0] - 14.7, SH_MAIN_CONTACT[1]]; // main wheel contact relative to the orbiter's reference point (Y 14.7): [along, down] (m)
// the reference point's height above the ground with every wheel down, at the 4.4° nose-down stance
const SH_STAND_H = -(
  SH_MAIN_GEAR[0] * Math.sin(SH_STANCE) +
  SH_MAIN_GEAR[1] * Math.cos(SH_STANCE)
);
function isShuttle(md) {
  return !!(md && md.L && md.L.sideMount);
}
// per mission: launch plane, roll program, deorbit burn, runway
function shuttlePrep(md) {
  if (md.shPrep !== undefined) return md.shPrep;
  if (!isShuttle(md) || !md.ship || !md.ship.segs.length) {
    md.shPrep = null;
    return null;
  }
  const asc = md.ship.segs[0],
    sE = asc.stateAt(asc.t1),
    t0 = md.M.t0;
  const h = vunit(vcross(sE.r, sE.v)); // orbit normal: the launch plane
  // roll program: from the pad orientation (orbiter on the south side of the tank, tail facing south) to heads-down
  const S = LAUNCH_SITES[md.cfg.site],
    rP = sitePosEcl("earth", S.lat, S.lon, 0, t0),
    lf = localFrame("earth", rP, t0);
  const up = lf.up,
    A = vunit(vcross(h, up)),
    ref = vunit(vsub(up, A));
  basisQuat(up, ref, _qS);
  const Xw = new THREE.Vector3(1, 0, 0).applyQuaternion(_qS),
    Zw = new THREE.Vector3(0, 0, 1).applyQuaternion(_qS);
  const N = lf.north,
    phi0 = Math.atan2(
      N[0] * Xw.x + N[1] * Xw.y + N[2] * Xw.z,
      N[0] * Zw.x + N[1] * Zw.y + N[2] * Zw.z,
    );
  const deorbit =
    md.burns.find((b) => b.obj === "ship" && /^Deorbit/.test(b.name)) || null;
  const et = md.M.obj("et"),
    tSep = et ? et.t0 : asc.t1 + 18;
  md.shPrep = {
    h,
    phi0,
    deorbit,
    rwy: RUNWAYS[md.cfg.runway] || null,
    tHU: md.cfg.headsUpMET ? t0 + md.cfg.headsUpMET : null,
    t0,
    tSep,
  };
  return md.shPrep;
}
// At tank separation the vehicle stops being drawn as the stack, which stands ahead of its state (the state is its base),
// and the orbiter (centred on its state) and the tank are drawn on their own. Each starts where it was drawn in the stack
// and lets that offset go: the part they share over a few seconds, the rest (how far the tank's own state is from where
// it sat in the stack) over a minute or two, so neither jumps and they do not slide against each other.
// Returns the offset along the model's axes (model units), or null.
const SH_SEP_TAU = 12,
  SH_SEP_DRIFT = 60; // s
const _vSep = new THREE.Vector3(),
  _qSep = new THREE.Quaternion();
function shuttleSepShift(c, t, cfgL, model, s) {
  const md = MV.md;
  if (!md || !isShuttle(md) || s.surface || s.pad) return null;
  const orb =
      c.o.id === "ship" && cfgL && cfgL.key === "sc" && cfgL.sc === "shuttle",
    tank = c.o.id === "et";
  if (!orb && !tank) return null;
  const P = shuttlePrep(md);
  if (!P) return null;
  const dt = t - P.tSep;
  if (dt < 0 || dt > 8 * SH_SEP_DRIFT) return null;
  if (c.sepFor !== P) {
    c.sepFor = P;
    c.sepW = shuttleSepWorld(c, P, model);
  }
  const W = c.sepW;
  if (!W) return null;
  const fo = Math.exp(-dt / SH_SEP_TAU),
    fr = Math.exp(-dt / SH_SEP_DRIFT);
  _vSep
    .set(W[0] * fo + W[3] * fr, W[1] * fo + W[4] * fr, W[2] * fo + W[5] * fr)
    .applyQuaternion(_qSep.copy(c.node.quaternion).invert());
  return [_vSep.x, _vSep.y, _vSep.z];
}
// the offsets at separation, in the scene's axes: [shared part, the tank's remainder]
function shuttleSepWorld(c, P, model) {
  const ship = craftById("ship"),
    tB = P.tSep - 0.05,
    cfgS = ship && cfgAt(ship, tB);
  if (!cfgS || cfgS.key !== "launch") return null;
  const tmp = { ...ship };
  computeCraft(tmp, tB);
  if (!tmp.s) return null;
  const sm = craftModel(ship, cfgS),
    A =
      anchorY(ship, cfgS, sm, tmp.s) +
      stagingShift(ship, tB, cfgS, sm, tmp.s) -
      sm.userData.yc; // the stack's own origin (the tank's) along its axis
  const qS = craftAttitude(
    tmp,
    tmp.s,
    tB,
    cfgS,
    activeMounts(tmp, tmp.s, tB, cfgS, sm),
    new THREE.Quaternion(),
  );
  const rot = (v) =>
    new THREE.Vector3(v[0], v[1], v[2]).applyQuaternion(qS).toArray();
  // the orbiter: its reference point in the stack less where its own model puts it (the model is the stack's turned half
  // round about Y, which moves neither the origin nor the axis)
  const ycO = craftModel(ship, cfgAt(ship, P.tSep + 1)).userData.yc,
    So = rot([0, A + SH_STACK.orbY + ycO, SH_STACK.orbZ]);
  if (c.o.id === "ship") return [...So, 0, 0, 0];
  // the tank: its origin in the stack less where its own state and model put it (it leaves with the stack's attitude)
  const tA = P.tSep + 0.001,
    a = { ...ship },
    b = { ...c };
  computeCraft(a, tA);
  computeCraft(b, tA);
  if (!a.P || !b.P) return null;
  const k = 1 / (c.node.scale.x || 0.001),
    d = vsub(a.P, b.P),
    r = rot([0, A - (model.position.y - model.userData.yc), 0]);
  const Se = [d[0] * k + r[0], d[1] * k + r[1], d[2] * k + r[2]];
  return [...So, Se[0] - So[0], Se[1] - So[1], Se[2] - So[2]];
}
// the orbiter sits in the stack model turned half round about its long axis (buildShuttleStack): going between the two
// models, its eased attitude takes the half turn too instead of rolling over on screen
function shuttleHalfTurn(c, a, b) {
  const st = (x) => x && x.key === "launch",
    ob = (x) => x && x.key === "sc" && x.sc === "shuttle";
  return c.o.model === "shuttle" && ((st(a) && ob(b)) || (ob(a) && st(b)));
}
function runwayDir(rwy, rD, t) {
  const lf = localFrame("earth", rD, t),
    a = rwy.hdg * DEG;
  return vunit(
    vadd(vscale(lf.north, Math.cos(a)), vscale(lf.east, Math.sin(a))),
  );
}
// attitude {nose, roll, spin (about the nose), pitch (about the wings)} or null for the generic rules
function shuttleAttitude(c, s, t, cfgL) {
  const md = MV.md,
    P = shuttlePrep(md);
  if (!P || !cfgL) return null;
  const rD = c.rD || s.r,
    vD = c.vD || s.v,
    up = vunit(rD),
    ex = s.extra || {};
  if (cfgL.key === "launch") {
    // the stack: heads-down after the roll program, heads-up later on some flights
    const A = vunit(vcross(P.h, up)),
      ref = vunit(vsub(up, A));
    const nose =
      s.pad || t < P.t0
        ? up
        : s.T > 0 && s.dir && vnorm(s.dir) > 0.5
          ? s.dir
          : vunit(vD);
    let spin = P.phi0 * (1 - smoothstep((t - P.t0 - 7) / 13));
    if (P.tHU && t > P.tHU) spin += Math.PI * smoothstep((t - P.tHU) / 36);
    return { nose, roll: ref, spin };
  }
  if (c.o.model === "hubble") return { nose: up, roll: vscale(vunit(vD), -1) }; // released upright, as the arm held it
  if (c.o.id === "et") {
    const A = vunit(vcross(P.h, up));
    return {
      nose: vunit(vD),
      roll: vunit(vsub(up, A)),
      spin: P.tHU ? Math.PI : 0,
    };
  } // as it left the stack
  if (cfgL.sc !== "shuttle") return null;
  const w = bodyOmegaEcl("earth", t),
    vAir = vsub(vD, vcross(w, rD));
  if (s.surface)
    return {
      nose: P.rwy ? runwayDir(P.rwy, rD, t) : vperp(up),
      roll: up,
      pitch: SH_STANCE,
    }; // standing nose down on its gear
  const att = cfgL.att;
  if (att === "entry") {
    // along the airflow, raised by the angle of attack, the lift vector banked about the flight path
    let f = vunit(vAir);
    if (vnorm(vAir) < 0.004 && P.rwy) f = runwayDir(P.rwy, rD, t);
    const u0 = vsub(up, vscale(f, vdot(up, f))),
      u = vnorm(u0) > 1e-9 ? vunit(u0) : vperp(f),
      right = vcross(f, u);
    const mu = (ex.bank ?? 0) * DEG,
      al = (ex.alpha ?? 40) * DEG;
    const lift = vadd(vscale(u, Math.cos(mu)), vscale(right, Math.sin(mu)));
    return {
      nose: vadd(vscale(f, Math.cos(al)), vscale(lift, Math.sin(al))),
      roll: lift,
    };
  }
  const dB = P.deorbit; // deorbit: tail first and upside down, until the pitch-around to the entry attitude
  if (dB && t >= dB.t - 1200 && t <= dB.t + dB.dur + 600)
    return { nose: vscale(vunit(vD), -1), roll: vscale(up, -1) };
  // heads-down flights: the orbiter leaves the tank upside down and rolls over ten minutes later
  const spin = P.tHU ? 0 : Math.PI * (1 - smoothstep((t - P.tSep - 600) / 60));
  if (s.T > 0 && s.dir && vnorm(s.dir) > 0.5)
    return { nose: s.dir, roll: up, spin };
  if (att === "rbar" || att === "rpm" || att === "vbar" || att === "fly") {
    const iss = craftById("iss");
    const F =
      iss && iss.s ? lvlh(iss.rD || iss.s.r, iss.vD || iss.s.v) : lvlh(rD, vD);
    if (att === "rbar") return { nose: F.x, roll: F.z }; // payload bay up toward the station
    if (att === "rpm")
      return {
        nose: F.x,
        roll: F.z,
        pitch: TAU * smoothstep((t - cfgL.rpm0) / (cfgL.rpm1 - cfgL.rpm0)),
      }; // the back-flip
    if (att === "vbar")
      return {
        nose: F.x,
        roll: F.z,
        pitch:
          (Math.PI / 2) *
          (cfgL.sw0 != null
            ? smoothstep((t - cfgL.sw0) / (cfgL.sw1 - cfgL.sw0))
            : 1),
      }; // nose up, bay facing the station
    const rel = iss && iss.P ? toLvlh(F, vsub(c.P, iss.P)) : [1, 0, 0]; // flyaround: the bay keeps facing the station
    return {
      nose: F.x,
      roll: F.z,
      pitch: Math.PI / 2 + Math.atan2(rel[2], rel[0]),
    };
  }
  return { nose: vunit(vD), roll: up, spin }; // in orbit: nose forward, payload bay facing space
}
// rotate the attitude quaternion by the extra spin/pitch of a shuttle attitude
function applyShuttleSpin(nd, q) {
  if (nd.spin) {
    _qS.setFromAxisAngle(_axY, nd.spin);
    q.multiply(_qS);
  }
  if (nd.pitch) {
    _qS.setFromAxisAngle(_axX, nd.pitch);
    q.multiply(_qS);
  }
}
// With the gear down near the runway, the main wheels on the ground whatever the pitch: in the flare the reference point is
// raised where the planned path (for wings level and the reference plane at gear height) would sink them, and on the runway
// it rides at the height that keeps them on the paint as the nose comes down to the 4.4° stance. Standing after wheel stop
// it stays at that height (the ground under it is where groundCraft put the state): the chase camera and the scene's origin
// follow the reference point, and would drop 5.6 m at wheel stop if it went down to the ground.
function shuttleGround(c, s, t) {
  const P = shuttlePrep(MV.md);
  if (!P || !P.rwy || s.pad) return;
  const cf = c.o.configAt(t),
    lab = cf && cf.label;
  if (s.surface) {
    if (lab && lab.key === "sc") {
      s.r = vscale(s.r, 1 + SH_STAND_H / 1000 / vnorm(s.r));
      s.v = vcross(bodyOmegaEcl("earth", t), s.r);
    }
    return;
  }
  if (!lab || !lab.gear) return;
  const Rr = R_E + P.rwy.elev,
    h = vnorm(s.r) - Rr;
  if (h > 0.015) return;
  const al = ((s.extra && s.extra.alpha) || 0) * DEG,
    hMin =
      (-SH_MAIN_GEAR[0] * Math.sin(al) - SH_MAIN_GEAR[1] * Math.cos(al)) /
        1000 +
      SH_RWY_TOP +
      0.00002;
  const rolling = s.extra && /rollout|wheel stop/.test(s.extra.phase || "");
  if (h < hMin || rolling) s.r = vscale(s.r, (Rr + hMin) / vnorm(s.r)); // tyres 2 cm above the paint, as standing craft are
  if (rolling) {
    // and moving over it, not into it: the nose follows the way it rolls even as it comes to rest
    const w = vcross(bodyOmegaEcl("earth", t), s.r),
      up = vunit(s.r),
      vg = vsub(s.v, w);
    s.v = vadd(w, vsub(vg, vscale(up, vdot(vg, up))));
  }
}
// The runway is drawn on the true sphere, SH_RWY_TOP above its elevation, while the surface patch under it is made of flat
// facets that sag up to ~0.7 m below the sphere between their corners. Radius (km) of the drawn runway under a direction
// in the planet's mesh frame, or null off the runway: what an orbiter standing on it rests on.
const SH_RWY_TOP = 0.00003;
function runwayRadius(body, dLoc) {
  const rw = SHV.rwy;
  if (!rw || body !== "earth") return null;
  const b = R.bodies.earth,
    C = meshDir(rw.lat, rw.lon),
    { E, N } = meshEN(rw.lat, rw.lon),
    hd = rw.hdg * DEG;
  const f = vadd(vscale(E, Math.sin(hd)), vscale(N, Math.cos(hd))),
    l = vcross(C, f),
    d = vsub(dLoc, C);
  const x = vdot(d, f) * b.R,
    y = vdot(d, l) * b.R; // km along the runway from its threshold, and across
  if (x < -0.1 || x > rw.len + 0.1 || Math.abs(y) > rw.wid / 2 + 0.05)
    return null;
  return b.R + rw.elev + SH_RWY_TOP;
}
// ---------------- the runway ----------------
function runwayTexture(rw) {
  const lake = rw.surface === "lakebed",
    W = 128,
    Hh = 4096,
    c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const g = c.getContext("2d"),
    mPerPx = (rw.len * 1000) / Hh,
    px = (m) => m / mPerPx,
    wPx = (m) => (m / (rw.wid * 1000)) * W;
  g.fillStyle = lake ? "#d9cdb2" : "#6d6c69";
  g.fillRect(0, 0, W, Hh);
  if (!lake)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + Math.random() * 0.05})`;
      g.fillRect(
        Math.random() * W,
        Math.random() * Hh,
        2 + Math.random() * 10,
        2 + Math.random() * 30,
      );
    }
  const paint = lake ? "#1d1c1a" : "#f2f1ec";
  g.fillStyle = paint;
  // centreline dashes, edge stripes, threshold bars and touchdown-zone marks at both ends
  for (let y = px(120); y < Hh - px(120); y += px(60))
    g.fillRect(W / 2 - wPx(0.45), y, wPx(0.9), px(36));
  g.fillRect(wPx(1.5), 0, wPx(lake ? 3 : 0.9), Hh);
  g.fillRect(W - wPx(1.5) - wPx(lake ? 3 : 0.9), 0, wPx(lake ? 3 : 0.9), Hh);
  for (const end of [0, 1]) {
    const y0 = end ? Hh - px(8) - px(45) : px(8);
    if (!lake)
      for (let k = 0; k < 16; k++) {
        const x = wPx(4) + (k * (W - wPx(8))) / 16;
        g.fillRect(x, y0, wPx(1.8), px(45));
      }
    else g.fillRect(wPx(2), y0 + px(20), W - wPx(4), px(6));
    for (const d of [150, 300, 450, 600]) {
      const y = end ? Hh - px(d) - px(22) : px(d);
      g.fillRect(W / 2 - wPx(14), y, wPx(3), px(22));
      g.fillRect(W / 2 + wPx(11), y, wPx(3), px(22));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(16, R.maxAniso || 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function buildRunway(md) {
  disposeRunway();
  const rw = md.cfg.runway && RUNWAYS[md.cfg.runway];
  if (!rw) return;
  const b = R.bodies.earth,
    Rm = (b.R + rw.elev + SH_RWY_TOP) * 1000; // m, a few centimetres above the sphere
  const C = meshDir(rw.lat, rw.lon),
    { E, N } = meshEN(rw.lat, rw.lon),
    hd = rw.hdg * DEG;
  const f = vadd(vscale(E, Math.sin(hd)), vscale(N, Math.cos(hd))),
    l = vcross(C, f);
  const L = rw.len * 1000,
    Wd = rw.wid * 1000,
    nL = 64;
  const at = (x, y) =>
    vscale(
      vunit(vadd(vscale(C, b.R * 1000), vadd(vscale(f, x), vscale(l, y)))),
      Rm,
    ); // point on the sphere, m (mesh frame)
  const Pc = at(L / 2, 0),
    pos = [],
    uv = [],
    idx = [];
  for (let i = 0; i <= nL; i++)
    for (const j of [0, 1]) {
      const p = at((L * i) / nL, (j - 0.5) * Wd);
      pos.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2]);
      uv.push(1 - j, i / nL);
    }
  for (let i = 0; i < nL; i++) {
    const a = 2 * i,
      bq = a + 1,
      cq = a + 2,
      d = a + 3;
    idx.push(a, cq, bq, bq, cq, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({
      map: runwayTexture(rw),
      roughness: 0.92,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const grp = new THREE.Group();
  grp.add(m);
  // edge lights every 60 m, green threshold bars, red end bars
  const lp = [],
    lc = [],
    add = (x, y, col) => {
      const p = at(x, y);
      lp.push(p[0] - Pc[0], p[1] - Pc[1], p[2] - Pc[2] + 0);
      const cc = new THREE.Color(col);
      lc.push(cc.r, cc.g, cc.b);
    };
  for (let x = 0; x <= L + 1; x += 60)
    for (const s of [-1, 1]) add(x, s * (Wd / 2 + 1.5), "#fff1cf");
  for (let k = -12; k <= 12; k++) {
    add(-3, (k * Wd) / 24, "#7dff9a");
    add(L + 3, (k * Wd) / 24, "#ff5a4a");
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  lg.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
  const lights = new THREE.Points(
    lg,
    new THREE.PointsMaterial({
      size: 3.2,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lights.renderOrder = 6;
  grp.add(lights);
  // place the group at the runway centre in the planet's mesh frame (unit sphere scaled by R): metres → mesh units
  const k = 1 / (b.R * 1000);
  grp.position.set(Pc[0] * k, Pc[1] * k, Pc[2] * k);
  grp.scale.setScalar(k);
  b.mesh.add(grp);
  SHV.runway = grp;
  SHV.lights = lights;
  SHV.rwy = rw;
}
function disposeRunway() {
  if (!SHV.runway) return;
  const g = SHV.runway;
  g.parent && g.parent.remove(g);
  g.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) {
      if (n.material.map) n.material.map.dispose();
      n.material.dispose();
    }
  });
  SHV.runway = null;
  SHV.lights = null;
  SHV.rwy = null;
}
function updateRunway(t) {
  // lights on between dusk and dawn
  if (!SHV.lights) return;
  const rw = SHV.rwy;
  const r = sitePosEcl("earth", rw.lat, rw.lon, 0, t),
    sun = vunit(vscale(helio("earth", t).r, -1));
  const el = vdot(vunit(r), sun);
  SHV.lights.material.opacity = clamp((0.05 - el) / 0.1, 0, 1);
}

// ==== 45_rover.js
// ============================================================================
// Surface: craft standing exactly on the ground that is drawn (the flat facets of the
// high-resolution surface patch), contact shadows, and a rover that drives after landing
// (first drive as flown, then illustrative daily commutes) leaving wheel tracks.
// ============================================================================
const _qG = new THREE.Quaternion(),
  _vG = new THREE.Vector3(),
  _rayG = new THREE.Ray(),
  _ta = new THREE.Vector3(),
  _tb = new THREE.Vector3(),
  _tc = new THREE.Vector3(),
  _td = new THREE.Vector3(),
  _hitG = new THREE.Vector3();
// d: unit direction [x, y, z] in the planet mesh's own frame → point on the drawn ground (planet-radius units), or null outside the patches
function capHitLocal(body, d) {
  for (const ci of MV.capInfo) {
    if (ci.body !== body || !ci.mesh) continue;
    const C = ci.mesh.geometry.userData.center,
      G = ci.mesh.geometry.userData.grid;
    if (!G) continue;
    if (d[0] * C[0] + d[1] * C[1] + d[2] * C[2] < Math.cos(ci.ang * DEG))
      continue;
    let phi = Math.atan2(d[2], -d[0]);
    while (phi < G.phiStart) phi += TAU;
    while (phi >= G.phiStart + TAU) phi -= TAU;
    const fx = ((phi - G.phiStart) / G.phiLength) * G.seg,
      fy =
        ((Math.acos(clamp(d[1], -1, 1)) - G.thetaStart) / G.thetaLength) *
        G.seg;
    if (fx < 0 || fy < 0 || fx >= G.seg || fy >= G.seg) continue;
    const ix = Math.floor(fx),
      iy = Math.floor(fy),
      W = G.seg + 1,
      P = ci.mesh.geometry.attributes.position;
    _ta.fromBufferAttribute(P, iy * W + ix + 1);
    _tb.fromBufferAttribute(P, iy * W + ix);
    _tc.fromBufferAttribute(P, (iy + 1) * W + ix);
    _td.fromBufferAttribute(P, (iy + 1) * W + ix + 1);
    _rayG.origin.set(-C[0], -C[1], -C[2]);
    _rayG.direction.set(d[0], d[1], d[2]);
    if (
      _rayG.intersectTriangle(_ta, _tb, _td, false, _hitG) ||
      _rayG.intersectTriangle(_tb, _tc, _td, false, _hitG)
    )
      return [_hitG.x + C[0], _hitG.y + C[1], _hitG.z + C[2]];
  }
  return null;
}
const meshDir = (lat, lon) => {
  const cl = Math.cos(lat * DEG);
  return [
    cl * Math.cos(lon * DEG),
    Math.sin(lat * DEG),
    -cl * Math.sin(lon * DEG),
  ];
};
const meshEN = (lat, lon) => {
  const cl = Math.cos(lat * DEG),
    sl = Math.sin(lat * DEG),
    co = Math.cos(lon * DEG),
    so = Math.sin(lon * DEG);
  return { E: [-so, 0, -co], N: [-sl * co, cl, sl * so] };
};
// mesh-frame vector → ecliptic (body-relative) at time t
function meshToEcl(body, v, t) {
  bodyQuat(body, t, _qG);
  _vG.set(v[0], v[1], v[2]).applyQuaternion(_qG);
  return [_vG.x, _vG.y, _vG.z];
}
function eclToMesh(body, v, t) {
  bodyQuat(body, t, _qG);
  _vG.set(v[0], v[1], v[2]).applyQuaternion(_qG.invert());
  return [_vG.x, _vG.y, _vG.z];
}

// ---------------- rover drive plan ----------------
function buildTraverse(md) {
  md.trav = null;
  const rc = md.cfg.rover;
  const o = md.ship;
  if (!rc || !o) return;
  const seg = o.segs[o.segs.length - 1];
  if (!seg || seg.type !== "surface" || seg.ref !== (rc.body || "mars")) return;
  const body = seg.ref,
    SOL = body === "mars" ? 88775.244 : 86400,
    tL = seg.t0;
  const sunEl = (t) => {
    const r = sitePosEcl(body, seg.lat, seg.lon, 0, t);
    const B = planetHelio(body, t).r;
    return vdot(vunit(r), vunit(vscale(vadd(B, r), -1)));
  };
  const noon = (n) => {
    let best = -2,
      bt = tL + n * SOL;
    for (let k = -24; k <= 24; k++) {
      const tt = tL + n * SOL + (k * SOL) / 48;
      const e = sunEl(tt);
      if (e > best) {
        best = e;
        bt = tt;
      }
    }
    return bt;
  };
  const top = rc.top || 0.042,
    avg = rc.avg || 0.03,
    turnRate = 2.5 * DEG; // m/s, m/s, rad/s
  let e = 0,
    n = 0,
    h = (rc.heading || 0) * DEG,
    odo = 0,
    wodo = 0;
  const moves = [],
    events = [];
  for (const dv of rc.drives || []) {
    const t0 = noon(dv.sol) - 0.6 * 3600;
    if (t0 > seg.t1 - 600) break;
    let t = t0;
    const list = dv.moves || [
      ["turn", dv.turn || 0],
      ["fwd", dv.dist || 0],
    ];
    const odo0 = odo;
    let dist = 0;
    for (const [kind, val] of list) {
      if (kind === "turn") {
        if (!val) continue;
        const dh = val * DEG,
          dur = Math.abs(dh) / turnRate;
        moves.push({
          kind,
          t0: t,
          t1: t + dur,
          e,
          n,
          h0: h,
          h1: h + dh,
          odo,
          wodo,
        });
        h += dh;
        t += dur;
      } else {
        const sgn = kind === "back" ? -1 : 1,
          v = dv.moves ? top : avg,
          dur = val / v;
        moves.push({
          kind,
          t0: t,
          t1: t + dur,
          e,
          n,
          h0: h,
          h1: h,
          sgn,
          d: val,
          v,
          odo,
          wodo,
        });
        e += sgn * val * Math.sin(h);
        n += sgn * val * Math.cos(h);
        odo += val;
        wodo += sgn * val;
        dist += val;
        t += dur;
      }
      t += dv.pause || 0;
    }
    events.push({
      t: t0,
      obj: o.id,
      name: dv.name || `Drive — ${fx(dist, 0)} m`,
      desc:
        dv.desc ||
        `Illustrative commute (the real route is not modelled): ${fx(dist, 0)} m at up to ${fx(top * 100, 1)} cm/s, stopping to check for hazards. Odometer ${fx(odo, 0)} m.`,
      kind: "drive",
      met: t0 - md.M.t0,
      odo0,
      drive: true,
    });
  }
  if (!moves.length) return;
  md.trav = {
    body,
    seg,
    moves,
    sol: SOL,
    tL,
    end: { e, n, h, odo },
    h0: (rc.heading || 0) * DEG,
    top,
  };
  for (const ev of events) md.events.push(ev);
  md.events.sort((a, b) => a.t - b.t);
}
function roverPose(md, t) {
  // e, n (m east/north of the landing spot), heading h (rad, clockwise from north), speed v (m/s), odometer
  const T = md.trav;
  const M = T.moves;
  let p = {
    e: 0,
    n: 0,
    h: T.h0,
    v: 0,
    odo: 0,
    wodo: 0,
    driving: false,
    kind: null,
  };
  for (const m of M) {
    if (t < m.t0) return p;
    const f = clamp((t - m.t0) / Math.max(m.t1 - m.t0, 1e-6), 0, 1);
    if (m.kind === "turn")
      p = {
        e: m.e,
        n: m.n,
        h: m.h0 + (m.h1 - m.h0) * f,
        v: 0,
        odo: m.odo,
        wodo: m.wodo,
        driving: f < 1,
        kind: "turn",
      };
    else {
      const s = m.d * f;
      p = {
        e: m.e + m.sgn * s * Math.sin(m.h0),
        n: m.n + m.sgn * s * Math.cos(m.h0),
        h: m.h0,
        v: f < 1 ? m.sgn * m.v : 0,
        odo: m.odo + s,
        wodo: m.wodo + m.sgn * s,
        driving: f < 1,
        kind: m.kind,
      };
    }
    if (t < m.t1) return p;
  }
  return p;
}
// ---------------- placing landed craft on the drawn ground ----------------
// called from computeCraft for any state on a surface (not the launch pad)
function groundCraft(c, s, t) {
  const md = MV.md,
    body = s.ref,
    b = R.bodies[body];
  if (!b) return;
  let dLoc,
    fwd = null;
  const T = md.trav;
  if (T && c.o.id === "ship" && s.seg === T.seg && body === T.body) {
    const p = roverPose(md, t);
    const C = meshDir(T.seg.lat, T.seg.lon),
      { E, N } = meshEN(T.seg.lat, T.seg.lon);
    const k = 0.001 / b.R;
    dLoc = vunit([
      C[0] + (p.e * E[0] + p.n * N[0]) * k,
      C[1] + (p.e * E[1] + p.n * N[1]) * k,
      C[2] + (p.e * E[2] + p.n * N[2]) * k,
    ]);
    fwd = meshToEcl(
      body,
      [
        Math.sin(p.h) * E[0] + Math.cos(p.h) * N[0],
        Math.sin(p.h) * E[1] + Math.cos(p.h) * N[1],
        Math.sin(p.h) * E[2] + Math.cos(p.h) * N[2],
      ],
      t,
    );
    s.rover = p;
    s.extra = {
      ...(s.extra || {}),
      phase: p.driving
        ? p.kind === "turn"
          ? "driving — turning in place"
          : "driving"
        : "on surface",
    };
  } else dLoc = vunit(eclToMesh(body, s.r, t));
  const hit = capHitLocal(body, dLoc);
  const rad =
    runwayRadius(body, dLoc) ||
    (hit ? Math.hypot(hit[0], hit[1], hit[2]) * b.R : vnorm(s.r)); // a runway is drawn above the patch's facets
  const up = meshToEcl(body, dLoc, t);
  s.r = vscale(up, rad + 0.00002); // 2 cm: wheels and footpads touch the drawn ground
  const w = bodyOmegaEcl(body, t);
  s.v = vcross(w, s.r);
  if (fwd) {
    s.hdg = fwd;
    if (s.rover.v) s.v = vadd(s.v, vscale(fwd, s.rover.v * 0.001));
  } else {
    const lf = localFrame(body, s.r, t);
    s.hdg = lf.north;
  } // body-fixed heading: a lander does not slowly spin as the planet turns
}
// ---------------- wheel tracks ----------------
function buildTracks(md) {
  if (MV.tracks) {
    MV.tracks.parent && MV.tracks.parent.remove(MV.tracks);
    MV.tracks.geometry.dispose();
    MV.tracks = null;
  }
  const T = md.trav;
  if (!T) return;
  const b = R.bodies[T.body];
  if (!b) return;
  const C = meshDir(T.seg.lat, T.seg.lon),
    { E, N } = meshEN(T.seg.lat, T.seg.lon),
    k = 0.001 / b.R;
  const ground = (e, n, lift) => {
    const d = vunit([
      C[0] + (e * E[0] + n * N[0]) * k,
      C[1] + (e * E[1] + n * N[1]) * k,
      C[2] + (e * E[2] + n * N[2]) * k,
    ]);
    const hit = capHitLocal(T.body, d);
    const r = hit ? Math.hypot(...hit) : 1;
    return vscale(d, r + lift * k);
  };
  const P0 = ground(0, 0, 0);
  const pos = [],
    od = [],
    ax = [],
    idx = [];
  const half = 1.15,
    wTr = 0.2; // wheel lines ±1.15 m (Perseverance), tracks 0.4 m wide
  for (const m of T.moves) {
    if (m.kind === "turn") continue;
    const steps = Math.max(2, Math.ceil(m.d / 0.5));
    const sh = Math.sin(m.h0),
      ch = Math.cos(m.h0);
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= steps; i++) {
        const s = (m.d * i) / steps,
          ce = m.e + m.sgn * s * sh,
          cn = m.n + m.sgn * s * ch;
        for (const off of [-wTr, wTr]) {
          const lat = side * half + off;
          const pe = ce + lat * ch,
            pn = cn - lat * sh;
          const g = ground(pe, pn, 0.03);
          pos.push(g[0] - P0[0], g[1] - P0[1], g[2] - P0[2]);
          od.push(m.odo + s);
          ax.push(off > 0 ? 1 : -1);
        }
      }
      for (let i = 0; i < steps; i++) {
        const a = base + 2 * i;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(pos), 3),
  );
  g.setAttribute("aOdo", new THREE.BufferAttribute(new Float32Array(od), 1));
  g.setAttribute("aX", new THREE.BufferAttribute(new Float32Array(ax), 1));
  g.setIndex(idx);
  const mt = new THREE.ShaderMaterial({
    vertexShader: `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aOdo; attribute float aX; varying float vOdo; varying float vX;
void main(){ vOdo = aOdo; vX = aX; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOdo; uniform vec3 uCol; varying float vOdo; varying float vX;
void main(){
  #include <logdepthbuf_fragment>
  if (vOdo > uOdo) discard;
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vX));                 // soft rims of the rut
  float f = fract((vOdo + abs(vX) * 0.05) / 0.068);                 // chevron grouser prints
  float tread = mix(0.55, 1.0, smoothstep(0.2, 0.45, abs(f - 0.5)));
  float fw = clamp(fwidth(vOdo) / 0.068 * 1.5, 0.0, 1.0);            // fade the pattern where it would alias
  gl_FragColor = vec4(uCol, 0.36 * edge * mix(tread, 0.78, fw));
}`,
    uniforms: {
      uOdo: { value: 0 },
      uCol: { value: new THREE.Color("#3b2416") },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
  });
  const mesh = new THREE.Mesh(g, mt);
  mesh.position.set(P0[0], P0[1], P0[2]);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  b.mesh.add(mesh);
  MV.tracks = mesh;
}
// ---------------- contact shadow under landed craft ----------------
const GLSL_SHADOW_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uHalf; varying vec2 vXZ;
void main(){ vXZ = position.xz * uHalf; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`;
const GLSL_SHADOW_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uR; uniform float uLen; uniform float uK; uniform float uAO; uniform vec2 uW[8]; uniform int uNW; uniform float uWR; varying vec2 vXZ;
void main(){
  #include <logdepthbuf_fragment>
  float zc = clamp(vXZ.y, -uLen, 0.0); float d = length(vec2(vXZ.x, vXZ.y - zc));
  float sun = (1.0 - smoothstep(uR * 0.5, uR * 1.2, d)) * uK * (1.0 - 0.45 * clamp(-zc / max(uLen, 1e-3), 0.0, 1.0));
  float ao = (1.0 - smoothstep(uR * 0.3, uR * 1.25, length(vXZ))) * uAO;
  float wc = 0.0; // dark contact patch where each wheel presses into the soil
  for (int i = 0; i < 8; i++) { if (i >= uNW) break; wc = max(wc, 1.0 - smoothstep(uWR * 0.35, uWR * 1.7, length(vXZ - uW[i]))); }
  float a = max(max(sun, ao), wc * 0.55); if (a < 0.01) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`;
const _sx = new THREE.Vector3(),
  _sz = new THREE.Vector3(),
  _sw = new THREE.Vector3();
function updateShadows(t) {
  for (const c of MV.crafts) {
    const s = c.s;
    const on =
      s && s.surface && !s.pad && s.ref !== "earth" && c.node.visible && c.cur;
    if (!on) {
      if (c.shadow) c.shadow.visible = false;
      continue;
    }
    if (!c.shadow) {
      const g = new THREE.PlaneGeometry(2, 2);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.ShaderMaterial({
        vertexShader: GLSL_SHADOW_V,
        fragmentShader: GLSL_SHADOW_F,
        uniforms: {
          uHalf: { value: 1 },
          uR: { value: 1 },
          uLen: { value: 0 },
          uK: { value: 0 },
          uAO: { value: 0.3 },
          uW: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) },
          uNW: { value: 0 },
          uWR: { value: 0.3 },
        },
        transparent: true,
        depthWrite: false,
      });
      c.shadow = new THREE.Mesh(g, m);
      c.shadow.frustumCulled = false;
      c.shadow.renderOrder = 2;
      R.scene.add(c.shadow);
    }
    const sh = c.shadow,
      U = sh.material.uniforms,
      bb = c.cur.userData.bbox || { w: 3, h: 2, d: 3 };
    const up = vunit(s.r);
    const sunD = vunit(vscale(c.P, -1));
    const el = vdot(sunD, up);
    let hz = vsub(sunD, vscale(up, el));
    if (vnorm(hz) < 1e-6) hz = vperp(up);
    hz = vunit(hz);
    const rFoot = 0.42 * Math.max(bb.w, bb.d),
      hgt = bb.h;
    const len =
      el > 0.02
        ? Math.min(
            (hgt * 0.75) / Math.tan(Math.asin(clamp(el, -1, 1))),
            hgt * 7,
          )
        : 0;
    const half = len + rFoot * 1.3;
    U.uHalf.value = half;
    U.uR.value = rFoot;
    U.uLen.value = len;
    U.uK.value = clamp(el * 4, 0, 1) * 0.74;
    U.uAO.value = 0.5; // sunlit Mars soil is mostly direct light: shadows are dark
    const O = R.O;
    const p = vadd(c.P, vscale(up, (0.03 + half * 0.0006) * 0.001));
    sh.position.set(p[0] - O[0], p[1] - O[1], p[2] - O[2]);
    basisQuat(up, hz, sh.quaternion);
    sh.scale.setScalar(half * 0.001);
    const wl = c.cur.userData.wheels;
    U.uNW.value = 0;
    if (wl && wl.length) {
      // wheel contact points in the shadow plane's own x/z (metres)
      c.node.updateMatrixWorld(true);
      _sx.set(1, 0, 0).applyQuaternion(sh.quaternion);
      _sz.set(0, 0, 1).applyQuaternion(sh.quaternion);
      const n = Math.min(8, wl.length);
      for (let i = 0; i < n; i++) {
        wl[i].getWorldPosition(_sw).sub(sh.position);
        U.uW.value[i].set(_sw.dot(_sx) * 1000, _sw.dot(_sz) * 1000);
      }
      U.uNW.value = n;
      U.uWR.value =
        wl[0].userData.wheel * wl[0].getWorldScale(_sw).x * 1000 * 1.25;
    }
    sh.visible = camDistTo(sh.position) < 3;
  }
}
function updateTracks(t) {
  const T = MV.md && MV.md.trav,
    m = MV.tracks;
  if (!T || !m) return;
  const p = roverPose(MV.md, t);
  m.material.uniforms.uOdo.value = t < T.seg.t0 ? -1 : p.odo;
  m.visible = camDistTo(m.getWorldPosition(_vG)) < 6;
}

// ==== 46_pads.js
// ============================================================================
// Launch pads, each as it stood on its scenario's launch day: the raised pad and its flame trench, the mobile launcher or
// launch mount the vehicle stands on, the towers with their swing arms, lightning protection, propellant spheres, water
// towers and the buildings in view. Built from published dimensions (NASA and KSC fact sheets, the Historic American
// Engineering Record, Moonport (SP-4204), the NSTS News Reference Manual, ULA, SpaceX, CASC and ISRO material, FAA
// documents) and photographs; where nothing is published (an arm's length, the exact place of a sphere) the figure is read
// from photographs.
// Frame: metres, +Y up, +Z north, +X west (as buildPad turns it), y = 0 at the surrounding ground, the vehicle's axis at
// x = z = 0. padModel(md) → { group, stand (the height of the vehicle's lowest nozzle above the ground), deckY (the deck the
// steam boils up from), glow (material lit by the engines), trenchD (how far out the exhaust leaves the flame trench), foot
// (the vehicle's footprint radius), animate(t) (arms swinging away), block (camera directions a tower blocks: padBlock) }.
// ============================================================================
const PV = (e, y, n) => new THREE.Vector3(-e, y, n); // east, up, north → the pad's frame
const _padY = new THREE.Vector3(0, 1, 0);
// The ground and the pad's long slabs are big triangles that the near plane clips under the camera; three.js's interpolated
// log depth is then centimetres out, and the globe (a few centimetres below, its depth exact: app/20_scene.js) shows
// through in patches. These materials take their depth from gl_FragCoord.w as the globe's do.
function padExactDepth(m) {
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <logdepthbuf_fragment>",
      LOGDEPTH_EXACT,
    );
  };
  m.customProgramCacheKey = () => "padExactDepth";
  return m;
}
// the material the engines light up when they fire (updatePad sets its colour): the flame deflector, or the ground under the
// exhaust where there is no trench to look into
const padGlow = () =>
  padExactDepth(new THREE.MeshBasicMaterial({ color: "#141210" }));
function padMats() {
  const pm = (c, k) => padExactDepth(mat(c, k, { name: "pad" })); // the pad's own materials (not shared with the vehicles)
  return (
    padMats.m ||
    (padMats.m = {
      concrete: pm("#aeaba3", "fabric"),
      concreteD: pm("#8f8b83", "fabric"),
      soot: pm("#45403a", "fabric"),
      grass: pm("#6f7c57", "fabric"),
      sand: pm("#c9c0a7", "fabric"),
      rock: pm("#bdb9ae", "fabric"),
      asphalt: pm("#55575a", "fabric"),
      steel: pm("#8d9196", "metal"),
      steelD: pm("#5a5e63", "metal"),
      galv: pm("#a3a8ad", "metal"),
      floor: pm("#6f7378", "dark"),
      red: pm("#a9381f", "paint"),
      redD: pm("#7d2a18", "paint"),
      white: pm("#e4e3dd", "paint"),
      grey: pm("#a8acb0", "paint"),
      greyL: pm("#c8cbce", "paint"),
      greyD: pm("#6c7075", "paint"),
      black: pm("#26282b", "paint"),
      orange: pm("#c9652a", "paint"),
      yellow: pm("#d8b23a", "paint"),
      fibre: pm("#d9d2bd", "paint"),
      glass: pm("#2f3840", "glass"),
      wire: new THREE.LineBasicMaterial({
        color: 0x9aa0a6,
        transparent: true,
        opacity: 0.55,
      }),
    })
  );
}
// Simple solids collected per material and merged into one mesh per material: a tower's hundreds of beams draw in a call.
function padKit() {
  const parts = new Map(),
    k = {};
  const add = (m, g) => {
    if (!parts.has(m)) parts.set(m, []);
    parts.get(m).push(g.index ? g.toNonIndexed() : g);
    return k;
  };
  const q = new THREE.Quaternion(),
    d = new THREE.Vector3();
  k.geo = add;
  k.box = (m, e, y, n, se, sy, sn, rot = 0) => {
    const g = new THREE.BoxGeometry(se, sy, sn);
    if (rot) g.rotateY(rot);
    g.translate(-e, y + sy / 2, n);
    return add(m, g);
  }; // bottom at y
  k.beam = (m, a, b, w, h = w) => {
    d.subVectors(b, a);
    const L = d.length();
    if (L < 1e-4) return k;
    const g = new THREE.BoxGeometry(w, L, h);
    g.applyQuaternion(q.setFromUnitVectors(_padY, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return add(m, g);
  };
  k.rod = (m, a, b, r, seg = 8) => {
    d.subVectors(b, a);
    const L = d.length();
    if (L < 1e-4) return k;
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, true);
    g.applyQuaternion(q.setFromUnitVectors(_padY, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return add(m, g);
  };
  k.cyl = (m, e, y, n, r0, r1, h, seg = 24, open = false) => {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, open);
    g.translate(-e, y + h / 2, n);
    return add(m, g);
  };
  k.sphere = (m, e, y, n, r, seg = 24) => {
    const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6));
    g.translate(-e, y, n);
    return add(m, g);
  };
  const n0 = new THREE.Vector3(),
    n1 = new THREE.Vector3();
  k.quads = (m, quads, toward = null) => {
    // [[a, b, c, d] …] corners in order round the face, flat shaded; facing toward (a
    // direction, default up) whichever way the corners run
    const P = [];
    for (const [a, b, c, e] of quads) {
      n0.subVectors(b, a).cross(n1.subVectors(c, a));
      const t = toward || _padY;
      if (n0.dot(t) < 0) P.push(a, c, b, a, e, c);
      else P.push(a, b, c, a, c, e);
    }
    const g = new THREE.BufferGeometry().setFromPoints(P);
    g.computeVertexNormals();
    return add(m, g);
  };
  k.build = (grp = new THREE.Group()) => {
    for (const [m, gs] of parts) {
      let n = 0;
      for (const g of gs) n += g.attributes.position.count;
      const P = new Float32Array(n * 3),
        N = new Float32Array(n * 3);
      let o = 0;
      for (const g of gs) {
        P.set(g.attributes.position.array, o * 3);
        N.set(g.attributes.normal.array, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(P, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      grp.add(new THREE.Mesh(out, m));
    }
    parts.clear();
    return grp;
  };
  return k;
}
// a square lattice tower (side w, from y0, h tall, a ring of beams every step, the faces X-braced), with solid floors
// every floorStep and a core (elevators, stairs) of side core
function padLattice(k, m, e, n, w, y0, h, o = {}) {
  const M = padMats(),
    hw = w / 2,
    col = o.col || 0.75,
    bw = o.beam || 0.45,
    step = o.step || 6.1;
  const C = [
      [-hw, -hw],
      [hw, -hw],
      [hw, hw],
      [-hw, hw],
    ],
    lv = Math.max(1, Math.round(h / step));
  for (const [a, b] of C)
    k.beam(m, PV(e + a, y0, n + b), PV(e + a, y0 + h, n + b), col);
  for (let i = 0; i <= lv; i++) {
    const y = y0 + (h * i) / lv,
      y2 = y0 + (h * (i + 1)) / lv;
    for (let c = 0; c < 4; c++) {
      const [a1, b1] = C[c],
        [a2, b2] = C[(c + 1) % 4];
      k.beam(m, PV(e + a1, y, n + b1), PV(e + a2, y, n + b2), bw);
      if (i < lv) {
        k.beam(m, PV(e + a1, y, n + b1), PV(e + a2, y2, n + b2), bw * 0.6);
        k.beam(m, PV(e + a2, y, n + b2), PV(e + a1, y2, n + b1), bw * 0.6);
      }
    }
    if (o.floors !== false && i > 0 && i < lv && i % (o.floorEvery || 1) === 0)
      k.box(M.floor, e, y - 0.3, n, w - 0.6, 0.3, w - 0.6);
  }
  if (o.core)
    k.box(
      o.coreMat || M.greyD,
      e + (o.coreE || 0),
      y0,
      n + (o.coreN || 0),
      o.core,
      h,
      o.core,
    );
}
// a box-shaped steel frame (the Shuttle's rotating service structure): centred at (e, n), from y0, a across × b along × h
// high, its long axis on bearing br (radians); columns at every bay, a beam round it at every level, each bay X-braced
function padTrussBox(k, m, e, n, y0, a, b, h, br, o = {}) {
  const ca = Math.cos(br),
    sa = Math.sin(br),
    bay = o.bay || 6.5,
    bw = o.beam || 0.5;
  const P = (u, v, y) => PV(e + u * ca + v * sa, y0 + y, n - u * sa + v * ca); // u across, v along
  const lv = Math.max(1, Math.round(h / (o.step || 6.6))),
    nb = Math.max(1, Math.round(b / bay)),
    na = Math.max(1, Math.round(a / bay));
  const ring = []; // the perimeter's column positions, in order round the box
  for (let i = 0; i < nb; i++) ring.push([-a / 2, -b / 2 + (b * i) / nb]);
  for (let i = 0; i < na; i++) ring.push([-a / 2 + (a * i) / na, b / 2]);
  for (let i = 0; i < nb; i++) ring.push([a / 2, b / 2 - (b * i) / nb]);
  for (let i = 0; i < na; i++) ring.push([a / 2 - (a * i) / na, -b / 2]);
  for (const [u, v] of ring) k.beam(m, P(u, v, 0), P(u, v, h), bw * 1.4);
  for (let l = 0; l <= lv; l++) {
    const y = (h * l) / lv,
      y2 = (h * (l + 1)) / lv;
    for (let i = 0; i < ring.length; i++) {
      const [u1, v1] = ring[i],
        [u2, v2] = ring[(i + 1) % ring.length];
      k.beam(m, P(u1, v1, y), P(u2, v2, y), bw);
      if (l < lv) {
        k.beam(m, P(u1, v1, y), P(u2, v2, y2), bw * 0.6);
        k.beam(m, P(u2, v2, y), P(u1, v1, y2), bw * 0.6);
      }
    }
  }
}
// a swing arm: a truss box from its hinge on a tower face reaching len toward the vehicle; returned as its own group so it
// can swing away (rotation about the hinge's vertical axis)
function padArm(len, w, hgt, m, o = {}) {
  const k = padKit(),
    M = padMats(),
    b = 0.28;
  const top = [
      [-w / 2, hgt],
      [w / 2, hgt],
    ],
    bot = [
      [-w / 2, 0],
      [w / 2, 0],
    ];
  for (const [x, y] of [...top, ...bot])
    k.beam(m, new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -len), b);
  const nb = Math.max(2, Math.round(len / 2.2));
  for (let i = 0; i <= nb; i++) {
    const z = (-len * i) / nb,
      z2 = (-len * (i + 1)) / nb;
    k.beam(
      m,
      new THREE.Vector3(-w / 2, 0, z),
      new THREE.Vector3(w / 2, 0, z),
      b * 0.7,
    );
    k.beam(
      m,
      new THREE.Vector3(-w / 2, hgt, z),
      new THREE.Vector3(w / 2, hgt, z),
      b * 0.7,
    );
    for (const x of [-w / 2, w / 2]) {
      k.beam(
        m,
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, hgt, z),
        b * 0.7,
      );
      if (i < nb)
        k.beam(
          m,
          new THREE.Vector3(x, 0, z),
          new THREE.Vector3(x, hgt, z2),
          b * 0.55,
        );
    }
  }
  k.box(M.floor, 0, 0.05, -len / 2, w * 0.9, 0.12, len); // walkway
  if (o.room) {
    const r = o.room;
    const g = new THREE.BoxGeometry(r[0], r[1], r[2]);
    g.translate(0, r[1] / 2, -len + r[2] / 2 - 0.2);
    k.geo(o.roomMat || M.white, g);
  } // the white room at the end
  if (o.line)
    k.rod(
      M.steelD,
      new THREE.Vector3(0, -0.4, 0),
      new THREE.Vector3(0, -0.4, -len - 0.4),
      0.18,
    ); // a propellant line under it
  return k.build();
}
// a sphere tank on a ring of legs (LOX and LH2 storage)
function padSphere(k, e, n, r, m) {
  const M = padMats(),
    y = r * 1.25;
  k.sphere(m || M.white, e, y, n, r, 28);
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    k.beam(
      M.galv,
      PV(e + Math.cos(a) * r * 0.9, 0, n + Math.sin(a) * r * 0.9),
      PV(e + Math.cos(a) * r * 0.97, y, n + Math.sin(a) * r * 0.97),
      0.6,
    );
  }
  k.box(M.concreteD, e, 0, n, r * 2.4, 0.4, r * 2.4);
}
// a water tower: a cylindrical tank on a lattice of legs
function padWaterTower(k, e, n, h, rTank, hTank) {
  const M = padMats(),
    y0 = h - hTank;
  k.cyl(M.greyL, e, y0, n, rTank, rTank, hTank, 28);
  k.cyl(M.greyL, e, h, n, rTank, rTank * 0.3, 2.5, 28);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6,
      a2 = ((i + 1) * TAU) / 6,
      rb = rTank * 1.15,
      rt = rTank * 0.75;
    k.beam(
      M.galv,
      PV(e + Math.cos(a) * rb, 0, n + Math.sin(a) * rb),
      PV(e + Math.cos(a) * rt, y0, n + Math.sin(a) * rt),
      0.9,
    );
    for (let j = 1; j < 4; j++) {
      const f = j / 4,
        y = y0 * f,
        r = rb + (rt - rb) * f;
      k.beam(
        M.galv,
        PV(e + Math.cos(a) * r, y, n + Math.sin(a) * r),
        PV(e + Math.cos(a2) * r, y, n + Math.sin(a2) * r),
        0.4,
      );
    }
  }
  k.cyl(M.galv, e, 0, n, 1.2, 1.2, y0, 12);
}
// a lightning tower: a steel lattice of triangular section (side w) h tall, a fibreglass mast on top
function padLightningTower(k, e, n, h, mast, w = 3.2) {
  const M = padMats(),
    r = w / Math.sqrt(3),
    C = [0, 1, 2].map((i) => [
      Math.cos((i * TAU) / 3 + 0.5) * r,
      Math.sin((i * TAU) / 3 + 0.5) * r,
    ]);
  const top = r * 0.35,
    lv = Math.round(h / 5);
  for (const [a, b] of C)
    k.beam(
      M.galv,
      PV(e + a, 0, n + b),
      PV(e + (a * top) / r, h, n + (b * top) / r),
      0.45,
    );
  for (let i = 0; i < lv; i++) {
    const f = i / lv,
      f2 = (i + 1) / lv,
      s = 1 + (top / r - 1) * f,
      s2 = 1 + (top / r - 1) * f2;
    for (let c = 0; c < 3; c++) {
      const [a1, b1] = C[c],
        [a2, b2] = C[(c + 1) % 3];
      k.beam(
        M.galv,
        PV(e + a1 * s, h * f, n + b1 * s),
        PV(e + a2 * s, h * f, n + b2 * s),
        0.25,
      );
      k.beam(
        M.galv,
        PV(e + a1 * s, h * f, n + b1 * s),
        PV(e + a2 * s2, h * f2, n + b2 * s2),
        0.2,
      );
    }
  }
  k.cyl(M.fibre, e, h, n, 0.45, 0.18, mast, 10);
  return PV(e, h + mast, n);
}
// The automatic camera's launch shot looks at the vehicle from wherever the light is best; these are the directions it
// should not take, because a tower would stand in front of the vehicle: [azimuth, half-width] in degrees, the azimuth
// counted from east toward north as the chase camera counts it, for a structure centred at (e, n) w across (half-width)
// beside a vehicle rv across
const padBlock = (e, n, w, rv) => [
  Math.atan2(n, e) * RAD,
  Math.asin(Math.min(1, (w + rv * 0.5) / Math.hypot(e, n))) * RAD + 4,
];
const KSC_SPHERES = [
  [-260, 290],
  [270, 300],
]; // the oxygen (northwest) and hydrogen (northeast) spheres of Pads 39A and 39B
// a propellant sphere stands about half as far out as the launch shot's camera and would loom large in the frame: keep it
// out of the picture (w: the sideways clearance that takes, from the camera's usual distance)
const sphereBlock = (e, n, w = 140) => padBlock(e, n, w, 0);
// a sagging wire between two points (a lightning catenary)
function padWire(g, a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const f = i / 24;
    const p = a.clone().lerp(b, f);
    p.y -= sag * 4 * f * (1 - f);
    pts.push(p);
  }
  g.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      padMats().wire,
    ),
  );
}
// The ground around a pad: scrub and grass (a repeating mottled texture, 80 m to a tile) out to r, cut off at the coast
// (o.sea: the bearing of the sea, degrees; o.shore: the shoreline's distance) with a beach before it, and the roads given
// as strips [[e0, n0, e1, n1, width] …]. Without it the pad would stand on the globe's coarse texture (often sea there).
function padGround(g, o = {}) {
  const M = padMats(),
    R = o.r || 2200;
  const tex =
    padGround.tex ||
    (padGround.tex = stripeTex(
      (c, w, h) => {
        // tileable value noise in five octaves (random lattices that wrap at the edges): scrub, grass and bare patches with no
        // regular pattern to repeat from tile to tile
        const rnd = mulberry32(5),
          v = new Float32Array(w * h);
        for (const [S, amp] of [
          [4, 0.34],
          [8, 0.26],
          [16, 0.18],
          [32, 0.13],
          [64, 0.09],
        ]) {
          const L = new Float32Array(S * S);
          for (let i = 0; i < S * S; i++) L[i] = rnd();
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              const fx = (x / w) * S,
                fy = (y / h) * S,
                x0 = Math.floor(fx),
                y0 = Math.floor(fy),
                tx = fx - x0,
                ty = fy - y0,
                sx = tx * tx * (3 - 2 * tx),
                sy = ty * ty * (3 - 2 * ty);
              const a = L[(y0 % S) * S + (x0 % S)],
                b = L[(y0 % S) * S + ((x0 + 1) % S)],
                c2 = L[((y0 + 1) % S) * S + (x0 % S)],
                d = L[((y0 + 1) % S) * S + ((x0 + 1) % S)];
              v[y * w + x] +=
                amp *
                ((a * (1 - sx) + b * sx) * (1 - sy) +
                  (c2 * (1 - sx) + d * sx) * sy);
            }
        }
        const img = c.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
          const n = clamp((v[i] - 0.5) * 1.6 + 0.5, 0, 1),
            o4 = 4 * i;
          img.data[o4] = 92 + 70 * n;
          img.data[o4 + 1] = 102 + 54 * n;
          img.data[o4 + 2] = 64 + 38 * n;
          img.data[o4 + 3] = 255;
        }
        c.putImageData(img, 0, 0);
      },
      256,
      256,
    ));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const sea = o.sea != null ? o.sea * DEG : null,
    se = sea != null ? Math.sin(sea) : 0,
    sn = sea != null ? Math.cos(sea) : 0,
    shore = o.shore || 1e9;
  // the land: the disc on this side of the shoreline, as rings of modest triangles (long thin ones lose depth precision
  // at a distance, and the beach and roads on them flicker)
  const RINGS = [0, 0.03, 0.07, 0.13, 0.22, 0.35, 0.52, 0.75, 1],
    NA = 96,
    pt = (i, j) => {
      const a = (i * TAU) / NA,
        r = RINGS[j] * R;
      let e = Math.sin(a) * r,
        n = Math.cos(a) * r;
      const d = e * se + n * sn;
      if (sea != null && d > shore) {
        e -= (d - shore) * se;
        n -= (d - shore) * sn;
      }
      return [e, n];
    };
  const P = [],
    U = [],
    V = (e, n) => {
      P.push(-e, 0.03, n);
      U.push(-e / 80, n / 80);
    };
  for (let j = 0; j < RINGS.length - 1; j++)
    for (let i = 0; i < NA; i++) {
      const a = pt(i, j),
        b = pt(i + 1, j),
        c = pt(i + 1, j + 1),
        d = pt(i, j + 1);
      V(...a);
      V(...d);
      V(...c);
      if (j > 0) {
        V(...a);
        V(...c);
        V(...b);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  geo.computeVertexNormals();
  if (!padGround.mat) {
    // the texture again at two larger scales, so its 80-m tiles do not show as a grid
    const m = (padGround.mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    }));
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader
        .replace("#include <logdepthbuf_fragment>", LOGDEPTH_EXACT)
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
      float pgA = texture2D(map, vMapUv * 0.071 + vec2(0.37, 0.11)).g, pgB = texture2D(map, vMapUv * 0.23 + vec2(0.71, 0.53)).g;
      diffuseColor.rgb *= 0.45 + 0.55 * (pgA + pgB) / (2.0 * 0.2);`,
        );
    };
    m.customProgramCacheKey = () => "padGround";
  }
  const land = new THREE.Mesh(geo, padGround.mat);
  g.add(land);
  const k = padKit();
  // strips on the land (the beach along the shoreline, the roads), cut into pieces of about 80 m for the same reason
  const strip = (m, e0, n0, e1, n1, w, y) => {
    const dx = e1 - e0,
      dn = n1 - n0,
      l = Math.hypot(dx, dn),
      px = ((-dn / l) * w) / 2,
      pn = ((dx / l) * w) / 2,
      ns = Math.max(1, Math.ceil(l / 80));
    for (let s = 0; s < ns; s++) {
      const f0 = s / ns,
        f1 = (s + 1) / ns,
        A0 = e0 + dx * f0,
        B0 = n0 + dn * f0,
        A1 = e0 + dx * f1,
        B1 = n0 + dn * f1;
      k.quads(m, [
        [
          PV(A0 + px, y, B0 + pn),
          PV(A1 + px, y, B1 + pn),
          PV(A1 - px, y, B1 - pn),
          PV(A0 - px, y, B0 - pn),
        ],
      ]);
    }
  };
  if (sea != null) {
    const L = Math.sqrt(Math.max(R * R - shore * shore, 0)),
      b = 45,
      c = shore - b / 2; // the beach along the shoreline
    strip(
      M.sand,
      c * se + sn * L,
      c * sn - se * L,
      c * se - sn * L,
      c * sn + se * L,
      b,
      0.07,
    );
  }
  for (const [e0, n0, e1, n1, w] of o.roads || [])
    strip(o.roadMat || M.rock, e0, n0, e1, n1, w, 0.1);
  k.build(g);
}
// Launch Complex 39's raised pad: a flat concrete top 99 m east–west by 119 m north–south, h above the ground on a mound
// sloping out at 1 in 2.5 (grassed); the flame trench, 17.7 m wide with its floor at ground level, cut through it north–
// south, the flame deflector in it under the vehicle; the crawlerway climbing to it from the south at 5 %, its two lanes
// either side of the trench.
function ksc39Hardstand(k, h, glow) {
  const M = padMats(),
    W = 99.1 / 2,
    D = 118.9 / 2,
    tw = 17.7 / 2,
    s = 2.5 * h;
  for (const sd of [-1, 1]) {
    // the east and west halves, either side of the trench
    const P = (e, y, n) => PV(sd * e, y, n);
    const A = P(tw, h, -D),
      B = P(W, h, -D),
      C = P(W, h, D),
      Dd = P(tw, h, D),
      A0 = P(tw, 0, -D - s),
      B0 = P(W + s, 0, -D - s),
      C0 = P(W + s, 0, D + s),
      D0 = P(tw, 0, D + s);
    const out = PV(sd, 0.4, 0).normalize();
    k.quads(M.concrete, [[A, Dd, C, B]]);
    k.quads(M.grass, [[B, C, C0, B0]], out);
    k.quads(M.grass, [[Dd, D0, C0, C]], new THREE.Vector3(0, 0.4, 1));
    k.quads(M.grass, [[A, B, B0, A0]], new THREE.Vector3(0, 0.4, -1));
    k.quads(M.concreteD, [[A, A0, D0, Dd]], PV(-sd, 0, 0)); // the trench wall
  }
  k.box(M.soot, 0, 0, 0, 2 * tw, 0.08, 2 * (D + s) + 40); // the trench floor
  // the flame deflector: an inverted V across the trench, its ridge under the engines
  const dw = 14.9 / 2,
    dl = 22.9 / 2,
    dh = Math.min(11.9, h - 0.5);
  k.quads(
    glow,
    [[PV(dw, dh, 0), PV(-dw, dh, 0), PV(-dw, 0, dl), PV(dw, 0, dl)]],
    new THREE.Vector3(0, 1, 1),
  );
  k.quads(
    glow,
    [[PV(-dw, dh, 0), PV(dw, dh, 0), PV(dw, 0, -dl), PV(-dw, 0, -dl)]],
    new THREE.Vector3(0, 1, -1),
  ); // glowing while the engines fire
  // the ramp up the south side, two 12-m lanes of crushed river rock either side of the trench
  const rl = h / 0.05;
  for (const sd of [-1, 1]) {
    const e0 = sd * (tw + 1),
      e1 = sd * (tw + 13);
    k.quads(M.rock, [
      [
        PV(e0, h + 0.05, -D),
        PV(e1, h + 0.05, -D),
        PV(e1, 0.05, -D - rl),
        PV(e0, 0.05, -D - rl),
      ],
    ]);
  }
}
// the land round Pads 39A and 39B: the Atlantic 400 m to the east, the crawlerway from the foot of the ramp south and then
// west toward the Vehicle Assembly Building; out to 7 km, past the ground observer (6 km south-southwest)
const KSC_GROUND = (h) => ({
  r: 7000,
  sea: 75,
  shore: 420,
  roads: [
    [0, -59.5 - 2.5 * h - h / 0.05, 0, -560, 40],
    [0, -560, -5000, -560, 40],
  ],
});
// ---------------- Apollo: Mobile Launcher with its Launch Umbilical Tower on Pad 39A ----------------
// The launcher's base 48.8 m (north–south) × 41.1 m × 7.6 m on six 6.7-m pedestals, its deck 14.3 m above the pad, with a
// 13.7-m square opening for the exhaust; the red umbilical tower, 12.2 m square, rises 115.8 m from the deck at the north
// end, its centre 24.4 m north of the rocket's, with the 25-t hammerhead crane on top. Nine swing arms reach the rocket:
// four had swung clear before liftoff (the first stage's intertank and forward arms, the second stage's aft arm, the
// command module's access arm with its white room), five swung away in the seconds after it. Four hold-down arms (3.35 m)
// carry the first stage; three tail service masts stand between its fins.
function padApollo(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 12.8,
    deck = h + 14.3,
    stand = deck + 3.35 - LAUNCHERS.saturnV.stages[0].eng.len,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  // the launcher's base around its exhaust opening, on its pedestals
  const hw = 13.7 / 2,
    by = deck - 7.6;
  k.box(M.grey, 0, by, (30.5 + hw) / 2, 41.1, 7.6, 30.5 - hw).box(
    M.grey,
    0,
    by,
    (-18.3 - hw) / 2,
    41.1,
    7.6,
    18.3 - hw,
  );
  for (const sd of [-1, 1])
    k.box(M.grey, (sd * (hw + 20.55)) / 2, by, 0, 20.55 - hw, 7.6, 2 * hw);
  k.box(M.greyD, 0, deck - 0.05, 6, 41.1, 0.1, 48.8 - 0.4); // deck plating
  for (const [e, n] of [
    [-15, -14],
    [15, -14],
    [-15, 6],
    [15, 6],
    [-15, 26],
    [15, 26],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  // the umbilical tower, its crane and the arms' hinge posts
  const tn = 24.4,
    top = deck + 115.8;
  padLattice(k, M.red, 0, tn, 12.2, deck, 115.8, {
    step: 6.1,
    core: 4.5,
    coreMat: M.redD,
    floorEvery: 3,
  });
  k.box(M.red, 0, top, tn, 12.6, 1.2, 12.6); // the crane's deck
  k.cyl(M.redD, 0, top + 1.2, tn, 2.2, 2.2, 3.5, 12); // slewing ring and cab
  k.beam(
    M.red,
    PV(0, top + 5.2, tn + 9),
    PV(0, top + 5.2, tn - 25.9),
    1.6,
    2.2,
  ); // the boom, over the rocket
  k.box(M.redD, 0, top + 3.2, tn + 7, 3, 3, 4); // counterweight
  // hold-down arms under the first stage's base and tail service masts, between the fins (the fins point northeast,
  // northwest, southeast and southwest)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.box(
      M.steelD,
      Math.cos(a) * 5.6,
      deck,
      Math.sin(a) * 5.6,
      2.0,
      3.35,
      3.0,
      -a,
    );
  }
  for (const a of [0, Math.PI / 2, Math.PI])
    k.box(
      M.greyD,
      Math.cos(a) * 10.5,
      deck,
      Math.sin(a) * 10.5,
      1.6,
      7.5,
      2.2,
      -a,
    );
  // propellant spheres at the pad's northwest (oxygen) and northeast (hydrogen) corners
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  // the swing arms: hinged on the tower's south face, reaching south to the rocket; [height above the nozzles, radius of
  // the rocket there, retract start and end (s after liftoff), white room]
  const face = tn - 6.1;
  const ARMS = [
    [22, 5.05, -30, -17],
    [39, 5.05, -16.2, -11],
    [48, 5.05, -900, -880],
    [58, 5.05, 0, 6.4],
    [65, 5.05, 0, 7.4],
    [72, 3.3, 0, 7.7],
    [84, 3.3, 0, 8.4],
    [96, 1.96, 0, 9.0],
    [100.5, 1.96, -300, -290, true],
  ];
  const arms = ARMS.map(([y, r, t0, t1, room], i) => {
    const he = i % 2 ? 4.4 : -4.4,
      H = PV(he, stand + y - 1.0, face); // hinged near a corner of the face, alternately east and west
    const len = Math.hypot(H.x, H.z) - r - (room ? 1.2 : 0.5),
      a = padArm(len, room ? 2.2 : 1.6, room ? 2.4 : 1.8, M.red, {
        room: room ? [3.2, 3.0, 3.4] : null,
        roomMat: M.white,
        line: !room,
      });
    const piv = new THREE.Group();
    piv.position.copy(H);
    piv.add(a);
    g.add(piv);
    return { piv, t0, t1, b0: Math.atan2(H.x, H.z), dir: H.x > 0 ? 1 : -1 }; // b0 aims the arm (local −Z) at the rocket's axis
  });
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 +
        A.dir * 1.4 * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
  }; // swinging back along the tower's face
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    animate,
    foot: 9,
    trenchD: 95,
    block: [
      padBlock(0, tn, 8, 5),
      ...KSC_SPHERES.map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- Space Shuttle: Pads 39A and 39B with the fixed and rotating service structures ----------------
// The Mobile Launcher Platform (48.8 × 41.1 × 7.6 m, its deck 14.3 m above the pad) with the main engines' opening south
// of the tank and the boosters' openings east and west of it, two tail service masts beside the orbiter's tail and six
// sound-suppression water towers ("rainbirds") at its north end. West of the stack the Fixed Service Structure, 12.2 m
// square and 75.3 m tall, with its hammerhead crane (until 1994) and the 24.4-m fibreglass lightning mast topping out at
// 105.8 m, a cable from it to anchors 335 m north and south; the orbiter access arm (44.8 m up, retracted at T−7:24), the
// tank's oxygen vent arm with its hood (the "beanie cap" over the tank's nose: lifted at T−2:30, the arm swung back at
// T−1:45) and the hydrogen vent line, which falls away at liftoff. The Rotating Service Structure, 31 × 15 × 40 m on its
// hinge column, swung back 120° to the southwest. The 88-m water tower to the northeast; the propellant spheres.
function padShuttle(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    b39 = md.cfg.site === "KSC39B",
    h = b39 ? 15.0 : 12.8,
    deck = h + 14.3;
  const SRB = LAUNCHERS.shuttle.stages[0],
    stand = deck + 1.5 - SRB.eng.len,
    year = tToDate(md.M.t0).getUTCFullYear(),
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  // the platform: solid but for its three openings (main engines: e ±5.2, n −13.7…−4.3; boosters: e ±3.35…9.45, n ±6.4)
  const by = deck - 7.6,
    n0 = -22,
    n1 = 26.8,
    H7 = 7.6;
  const slab = (e0, e1, nA, nB) =>
    k.box(M.grey, (e0 + e1) / 2, by, (nA + nB) / 2, e1 - e0, H7, nB - nA);
  slab(-20.55, 20.55, n0, -13.7);
  slab(-20.55, -5.2, -13.7, -6.4);
  slab(5.2, 20.55, -13.7, -6.4);
  slab(-20.55, -9.45, -6.4, 6.4);
  slab(9.45, 20.55, -6.4, 6.4);
  slab(-3.35, 3.35, -4.3, 6.4);
  slab(-5.2, -3.35, -6.4, -4.3);
  slab(3.35, 5.2, -6.4, -4.3);
  slab(-20.55, 20.55, 6.4, n1);
  for (const [e, n] of [
    [-15, -16],
    [15, -16],
    [-15, 2],
    [15, 2],
    [-15, 21],
    [15, 21],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  for (const sd of [-1, 1]) {
    k.box(M.greyD, sd * 7.7, deck, -9.2, 4.6, 9.4, 2.7); // tail service masts
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      k.cyl(
        M.steelD,
        sd * 6.4 + Math.cos(a) * 2.4,
        deck,
        Math.sin(a) * 2.4,
        1.0,
        0.45,
        1.5,
        10,
      );
    }
  } // booster hold-down posts
  for (let i = 0; i < 6; i++)
    k.cyl(M.greyL, -12.5 + i * 5, deck, 22, 0.6, 0.45, 3.7, 10); // rainbirds
  // the fixed service structure, west of the stack
  const fe = -28,
    top = h + 75.3;
  padLattice(k, M.grey, fe, 0, 12.2, h, 75.3, {
    step: 6.1,
    core: 4,
    coreMat: M.greyD,
    floorEvery: 2,
  });
  if (year < 1994) {
    k.box(M.grey, fe, top, 0, 12.6, 1.0, 12.6);
    k.cyl(M.greyD, fe, top + 1, 0, 2, 2, 3, 12);
    k.beam(
      M.grey,
      PV(fe - 8, top + 4.5, 0),
      PV(fe + 20, top + 4.5, 0),
      1.4,
      1.8,
    );
  }
  k.beam(M.grey, PV(fe, top, 0), PV(fe, top + 6, 0), 1.2);
  k.cyl(M.fibre, fe, top + 6, 0, 0.5, 0.15, 24.4, 10); // the lightning mast
  // the rotating service structure, parked: its hinge column by the fixed tower's southeast corner, the structure 17–49 m
  // out from it on a bearing of 210°, 18–58 m up, its outer end on a column down to the wheels on the circular rail
  const hE = -21,
    hN = -10,
    br = 210 * DEG,
    ue = Math.sin(br),
    un = Math.cos(br);
  padLattice(k, M.greyL, hE, hN, 4, h, 58, { step: 6, floors: false });
  {
    const a0 = 17,
      a1 = 48.8,
      mid = (a0 + a1) / 2,
      cE = hE + ue * mid,
      cN = hN + un * mid,
      y0 = h + 18;
    padTrussBox(k, M.greyL, cE, cN, y0, 15.2, a1 - a0, 39.6, br, {
      bay: 6.3,
      step: 6.6,
      beam: 0.55,
    });
    // the payload changeout room, clad, filling most of the frame; the frame's roof
    const geo = new THREE.BoxGeometry(12.2, 27, a1 - a0 - 6);
    geo.rotateY(-Math.atan2(-ue, un));
    geo.translate(-cE, y0 + 4 + 13.5, cN);
    k.geo(M.white, geo);
    const roof = new THREE.BoxGeometry(15.2, 0.6, a1 - a0);
    roof.rotateY(-Math.atan2(-ue, un));
    roof.translate(-cE, y0 + 39.6, cN);
    k.geo(M.greyL, roof);
    k.beam(
      M.greyL,
      PV(hE, h + 50, hN),
      PV(hE + ue * a0, h + 50, hN + un * a0),
      2.5,
    );
    k.beam(
      M.greyL,
      PV(hE, h + 22, hN),
      PV(hE + ue * a0, h + 22, hN + un * a0),
      2.5,
    );
    k.box(M.greyD, hE + ue * (a1 - 2), h, hN + un * (a1 - 2), 4, 18, 4);
    // its circular rail on the pad, from the stack (bearing 90°) round to where it is parked
    for (let i = 0; i < 24; i++) {
      const b1 = (90 + (120 * i) / 24) * DEG,
        b2 = (90 + (120 * (i + 1)) / 24) * DEG;
      for (const rr of [a1 - 3.2, a1 - 0.8])
        k.beam(
          M.steelD,
          PV(hE + Math.sin(b1) * rr, h + 0.12, hN + Math.cos(b1) * rr),
          PV(hE + Math.sin(b2) * rr, h + 0.12, hN + Math.cos(b2) * rr),
          0.3,
          0.2,
        );
    }
  }
  // water tower, propellant spheres, the hypergolic farms
  padWaterTower(k, 130, 90, 88.4, 6.6, 9);
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  for (const e of [-230, 230])
    for (let i = 0; i < 3; i++) k.cyl(M.white, e + i * 9, 0, -260, 3, 3, 8, 16);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  // arms on the fixed tower (hinged on its east face, reaching east): the orbiter access arm with its white room, the oxygen
  // vent arm with its hood over the tank's nose; [height above the pad, reach, swing-away start and end (s from liftoff)]
  const face = fe + 6.1,
    etTop = stand + 9.26 + 46.9,
    arms = [];
  const mk = (y, nH, reach, t0, t1, sw, o) => {
    const a = padArm(reach, 2.0, 2.3, M.grey, o),
      piv = new THREE.Group();
    piv.position.copy(PV(face, y, nH));
    piv.add(a);
    g.add(piv);
    const tgt = PV(0, y, o.toN ?? 0),
      b0 = Math.atan2(tgt.x - piv.position.x, tgt.z - piv.position.z) + Math.PI;
    arms.push({ piv, b0, t0, t1, sw });
    return piv;
  };
  mk(h + 44.8, -4.5, 19.8, -444, -414, -70 * DEG, {
    room: [3.0, 3.0, 3.2],
    roomMat: M.white,
    toN: -8.5,
  }); // to the crew hatch on the orbiter's left side
  const gox = mk(etTop - 2.5, 0, Math.abs(face) - 2.2, -105, -80, 80 * DEG, {
    toN: 0,
  }); // to the tank's nose
  const hood = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.3, 2.8, 20),
    M.white,
  );
  hood.position.set(0, 1.4, -(Math.abs(face) - 0.6));
  gox.children[0].add(hood); // over the top of the nose cone
  const h2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 1, 8),
    M.steelD,
  );
  g.add(h2);
  const h2a = PV(face, h + 51, 0.5),
    h2b = PV(-4.0, stand + 9.26 + 31.0, 0.5); // the hydrogen vent line to the tank's intertank
  // lightning cable over the mast
  const tip = PV(fe, top + 30.4, 0);
  padWire(g, PV(fe, 2, 335), tip, 8);
  padWire(g, tip, PV(fe, 2, -335), 8);
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 + A.sw * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
    hood.position.y = 1.4 + 3.0 * smoothstep(clamp((tl + 150) / 25, 0, 1)); // the hood lifts off the vents before the arm swings back
    const drop = smoothstep(clamp(tl / 2.5, 0, 1)); // at liftoff the vent line lets go and swings down against the tower
    const b = h2b.clone().lerp(PV(face + 0.5, h + 40, 0.5), drop);
    h2.position.copy(h2a).add(b).multiplyScalar(0.5);
    h2.scale.y = h2a.distanceTo(b);
    h2.quaternion.setFromUnitVectors(_padY, b.clone().sub(h2a).normalize());
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    animate,
    foot: 12,
    trenchD: 95,
    block: [
      padBlock(fe, 0, 6.1, 8.4),
      padBlock(hE + ue * 32.9, hN + un * 32.9, 16, 8.4),
      ...KSC_SPHERES.map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- SLS: Mobile Launcher 1 on Pad 39B (Artemis) ----------------
// The launcher's base 50.3 × 41.1 × 7.6 m, deck 14.3 m above the pad, its exhaust opening 19.5 m across the boosters' line
// by 10.4 m; the grey tower, 12.2 m square, rises 105 m from the deck north of the rocket, flat-topped. Its arms reach south:
// the core stage's intertank umbilical (42.7 m above the deck), forward skirt umbilical (54.9), the vehicle stabiliser
// (61), the upper stage's umbilical (73.2), the crew access arm (83.5) and Orion's service module umbilical (85.3); the
// crew access arm swings back after the hatch is closed, the rest in the seconds after liftoff. Two tail service masts on
// the deck south of the core stage; eight posts under the boosters. A "clean pad": three 181-m lightning towers (steel
// lattice and fibreglass mast) with wires between their tips; the water tower; the oxygen sphere and the two hydrogen
// spheres (the 2022 one 25 m across).
function padSLS(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 15.0,
    deck = h + 14.3,
    stand = deck - 3.3,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  const by = deck - 7.6,
    n0 = -20,
    n1 = 30.3,
    hx = 19.5 / 2,
    hn = 10.4 / 2;
  const slab = (e0, e1, nA, nB) =>
    k.box(M.greyL, (e0 + e1) / 2, by, (nA + nB) / 2, e1 - e0, 7.6, nB - nA);
  slab(-20.55, 20.55, n0, -hn);
  slab(-20.55, 20.55, hn, n1);
  slab(-20.55, -hx, -hn, hn);
  slab(hx, 20.55, -hn, hn);
  for (const [e, n] of [
    [-15, -14],
    [15, -14],
    [-15, 6],
    [15, 6],
    [-15, 26],
    [15, 26],
  ])
    k.box(M.concreteD, e, h, n, 3.2, by - h, 3.2);
  for (const sd of [-1, 1]) {
    k.box(M.greyL, sd * 4.2, deck, -7.6, 4.0, 10.1, 3.0);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      k.cyl(
        M.steelD,
        sd * 6.1 + Math.cos(a) * 2.3,
        deck,
        Math.sin(a) * 2.3,
        0.6,
        0.4,
        1.5,
        8,
      );
    }
  }
  const tn = 18.5 + 6.1,
    ttop = deck + 105.2;
  padLattice(k, M.greyL, 0, tn, 12.2, deck, 105.2, {
    step: 6.1,
    core: 5,
    coreMat: M.grey,
    floorEvery: 2,
  });
  k.box(M.greyL, 0, ttop, tn, 12.6, 1.2, 12.6);
  k.cyl(M.fibre, 0, ttop + 1.2, tn, 0.4, 0.12, 8, 8);
  // lightning towers (northwest, northeast, south) and their wires
  const T1 = padLightningTower(k, -175, 160, 152, 29),
    T2 = padLightningTower(k, 175, 160, 152, 29),
    T3 = padLightningTower(k, 0, -235, 152, 29);
  padWaterTower(k, 115, 70, 88.4, 6.6, 9);
  for (const [e, n] of KSC_SPHERES) padSphere(k, e, n, 10.5);
  padSphere(k, 300, 215, 12.6);
  k.build(g);
  padGround(g, KSC_GROUND(h));
  padWire(g, T1, T2, 18);
  padWire(g, T2, T3, 18);
  padWire(g, T3, T1, 18);
  for (const T of [T1, T2, T3])
    for (const d of [-1, 1])
      padWire(
        g,
        T,
        T.clone().add(new THREE.Vector3(d * 60, -T.y + 1, -T.z * 0.15)),
        6,
      );
  const face = tn - 6.1,
    arms = [];
  const ARMS = [
    [42.7, 4.2, 0, 4],
    [54.9, 4.2, 0, 4.5],
    [61.0, 4.2, 0, 5],
    [73.2, 2.6, 0, 5.5],
    [83.5, 2.5, -1500, -1440, true],
    [85.3, 2.5, 0, 6],
  ]; // above the deck; rocket radius; swing-away; white room
  ARMS.forEach(([y, r, t0, t1, room], i) => {
    const he = i % 2 ? 4.0 : -4.0,
      H = PV(he, deck + y, face),
      len = Math.hypot(H.x, H.z) - r - (room ? 1.0 : 0.6);
    const a = padArm(
      len,
      room ? 2.4 : 1.8,
      room ? 2.6 : 2.0,
      room ? M.white : M.greyL,
      { room: room ? [3.0, 3.0, 3.4] : null, roomMat: M.white, line: !room },
    );
    const piv = new THREE.Group();
    piv.position.copy(H);
    piv.add(a);
    g.add(piv);
    arms.push({ piv, t0, t1, b0: Math.atan2(H.x, H.z), dir: H.x > 0 ? 1 : -1 });
  });
  const animate = (t) => {
    const tl = t - md.M.t0;
    for (const A of arms)
      A.piv.rotation.y =
        A.b0 +
        A.dir * 1.35 * smoothstep(clamp((tl - A.t0) / (A.t1 - A.t0), 0, 1));
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    animate,
    foot: 9,
    trenchD: 95,
    block: [
      padBlock(0, tn, 8, 8),
      ...[T1, T2, T3].map((T) => padBlock(-T.x, T.z, 2, 8)),
      ...[...KSC_SPHERES, [300, 215]].map((p) => sphereBlock(...p)),
    ],
  };
}
// ---------------- Falcon Heavy on Pad 39A (SpaceX) ----------------
// The rocket stands on SpaceX's launch mount over the covered flame trench, held by the transporter-erector: a 73-m steel
// strongback on its south side that brought it up the ramp from the hangar and raised it. A few minutes before launch it
// leans back 1.5°; at liftoff it swings clear. West of the pad the old fixed service structure, grey, with its lightning
// mast and SpaceX's crew access arm (66 m up, swung away for an uncrewed flight); the rotating structure is gone. The
// Horizontal Integration Facility 500 m south at the foot of the ramp; SpaceX's Starship tower 300 m east.
function padFH(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    h = 12.8,
    mountTop = h + 6.5,
    stand = mountTop - LAUNCHERS.falconHeavy.stages[1].eng.len,
    glow = padGlow();
  ksc39Hardstand(k, h, glow);
  k.box(M.concreteD, 0, h, -2, 24, 6.5, 18);
  k.box(M.greyD, 0, mountTop - 0.4, 0, 14, 0.4, 7); // the launch mount
  const fe = -28,
    top = h + 75.3;
  padLattice(k, M.grey, fe, 0, 12.2, h, 75.3, {
    step: 6.1,
    core: 4,
    coreMat: M.greyD,
    floorEvery: 2,
  });
  k.beam(M.grey, PV(fe, top, 0), PV(fe, top + 6, 0), 1.2);
  k.cyl(M.fibre, fe, top + 6, 0, 0.5, 0.15, 24.4, 10);
  {
    const piv = PV(fe + 6.1, h + 66.1, 0);
    const geo = new THREE.BoxGeometry(2.8, 3.0, 25.9);
    geo.translate(0, 1.5, -12.95);
    geo.rotateY(-0.35 - Math.PI / 2 - 1.3);
    geo.translate(piv.x, piv.y, piv.z);
    k.geo(M.white, geo);
  } // the crew access arm, swung back
  // the hangar at the foot of the ramp; SpaceX's Starship tower to the east
  k.box(M.white, 0, 0, -500, 87, 26, 37);
  k.box(M.greyL, 0, 0, -481.4, 60, 22, 0.4);
  padStarshipTower(k, 300, 0, 0);
  padWaterTower(k, 130, 90, 88.4, 6.6, 9);
  padSphere(k, -260, 290, 10.5);
  for (let i = 0; i < 3; i++)
    k.cyl(M.white, 240 + i * 9, 0, 250, 3.5, 3.5, 14, 16);
  k.build(g);
  padGround(g, {
    ...KSC_GROUND(h),
    roads: [[0, -59.5 - 2.5 * h - h / 0.05, 0, -480, 30]],
  });
  const tip = PV(fe, top + 30.4, 0);
  padWire(g, PV(fe, 2, 335), tip, 8);
  padWire(g, tip, PV(fe, 2, -335), 8);
  // the transporter-erector: its hinge at the launch mount's south edge, the strongback standing against the cores
  const te = new THREE.Group();
  te.position.copy(PV(0, mountTop - 1, -4.6));
  g.add(te);
  {
    const kk = padKit(),
      W = 9.5,
      L = 72.5;
    for (const sx of [-W / 2, W / 2])
      for (const sz of [0, -2.2])
        kk.beam(
          M.greyL,
          new THREE.Vector3(sx, 0, sz),
          new THREE.Vector3(sx, L, sz),
          0.55,
        );
    for (let i = 0; i <= 24; i++) {
      const y = (L * i) / 24,
        y2 = (L * (i + 1)) / 24;
      kk.beam(
        M.greyL,
        new THREE.Vector3(-W / 2, y, 0),
        new THREE.Vector3(W / 2, y, 0),
        0.4,
      );
      kk.beam(
        M.greyL,
        new THREE.Vector3(-W / 2, y, -2.2),
        new THREE.Vector3(W / 2, y, -2.2),
        0.4,
      );
      if (i < 24) {
        kk.beam(
          M.greyL,
          new THREE.Vector3(-W / 2, y, 0),
          new THREE.Vector3(W / 2, y2, 0),
          0.3,
        );
        kk.beam(
          M.greyL,
          new THREE.Vector3(-W / 2, y, -2.2),
          new THREE.Vector3(W / 2, y2, -2.2),
          0.3,
        );
      }
    }
    for (const y of [22, 40, 58])
      kk.beam(
        M.greyD,
        new THREE.Vector3(0, y, 0),
        new THREE.Vector3(0, y, 2.4),
        0.8,
      ); // clamp arms to the centre core
    kk.build(te);
  }
  const animate = (t) => {
    const tl = t - md.M.t0;
    te.rotation.x = -(
      1.5 * DEG * smoothstep(clamp((tl + 240) / 20, 0, 1)) +
      22 * DEG * smoothstep(clamp(tl / 4, 0, 1))
    );
  };
  animate(md.M.t0 - 3600);
  return {
    group: g,
    stand,
    glow,
    deckY: mountTop,
    animate,
    foot: 7,
    trenchD: 95,
    block: [[270, 30], padBlock(fe, 0, 6.1, 5.6), sphereBlock(-260, 290)],
  }; // the erector stands against the cores' south side
}
// SpaceX's launch and catch tower ("Mechazilla", as at Starbase and on Pad 39A): 143 m of dark steel modules, about 12 m
// square, a 3-m lightning rod; the two 36-m catch arms ("chopsticks") on their carriage and the ship's quick-disconnect
// arm, both reaching toward the launch mount (facing +E from a tower at e, n: arms toward dir, radians from east)
function padStarshipTower(k, e, n, dir = 0) {
  const M = padMats(),
    w = 12;
  padLattice(k, M.black, e, n, w, 0, 143, {
    step: 6,
    core: 6,
    coreMat: M.greyD,
    floors: false,
    col: 1.1,
    beam: 0.7,
  });
  k.cyl(M.galv, e, 143, n, 0.25, 0.1, 3, 6);
  const ce = Math.cos(dir),
    cn = Math.sin(dir),
    pe = -cn,
    pn = ce,
    y = 74,
    f0 = PV(e + (ce * w) / 2, y, n + (cn * w) / 2);
  k.box(M.greyD, e + ce * (w / 2 + 1), y - 3, n + cn * (w / 2 + 1), 5, 7, 5);
  for (const s of [-1, 1])
    k.beam(
      M.greyD,
      f0.clone().add(PV(pe * s * 3, 0, pn * s * 3)),
      PV(
        e + ce * (w / 2 + 34) + pe * s * 7,
        y,
        n + cn * (w / 2 + 34) + pn * s * 7,
      ),
      1.6,
      3.2,
    ); // the chopsticks, opened
  k.beam(
    M.greyD,
    PV(e + (ce * w) / 2, 91, n + (cn * w) / 2),
    PV(e + ce * (w / 2 + 14), 91, n + cn * (w / 2 + 14)),
    1.4,
    2.0,
  ); // the ship's quick-disconnect arm
}
// ---------------- Atlas V on Space Launch Complex 41 (Perseverance, 2020) ----------------
// A "clean pad": the rocket rolls the 550 m from the Vertical Integration Facility on its Mobile Launch Platform (16.8 ×
// 13.7 m, its 56-m umbilical mast on the north side carrying the Centaur's lines) and stands over the flame duct between
// four lightning towers (about 105 m, steel with a fibreglass mast) whose wires cage the pad. The Crew Access Tower (61 m,
// 2016) stands to the northwest, its arm (52 m up) swung away; the 89-m integration building to the south.
function padSLC41(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 9.0,
    stand = deck + 0.5 - LAUNCHERS.atlasV541.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 70, 0.3, 90);
  k.box(M.soot, 0, 0.3, 0, 9, 0.05, 30); // the pad apron and the duct's grating
  k.box(M.white, 0, 1.2, 0, 16.8, deck - 1.2, 13.7);
  k.box(M.greyD, 0, 0, 0, 14, 1.2, 11); // the platform on its trucks
  for (const e of [-3.6, 3.6]) k.box(M.steelD, e, 0, -300, 0.4, 0.3, 600); // the rails to the integration building
  padLattice(k, M.white, 0, 9.6, 4.2, deck, 47.4, {
    step: 4.8,
    floors: false,
    col: 0.5,
    beam: 0.3,
  });
  k.cyl(M.greyD, 0, deck + 47.4, 9.6, 0.9, 0.9, 2.2, 10); // the umbilical mast, its wind damper
  for (const y of [deck + 26, deck + 40])
    k.beam(M.greyD, PV(0, y, 7.5), PV(0, y - 1.5, 2.2), 0.5); // the Centaur's umbilicals
  padLattice(k, M.grey, -18, 26, 6.1, 0, 61, {
    step: 8.5,
    core: 2.2,
    coreMat: M.greyD,
    col: 0.55,
    beam: 0.35,
  }); // crew access tower
  {
    const geo = new THREE.BoxGeometry(2.4, 2.6, 13);
    geo.translate(0, 1.3, -6.5);
    geo.rotateY(Math.PI * 0.85);
    geo.translate(18 + 3, 52.4, 26 - 3);
    k.geo(M.white, geo);
  }
  const T = [
    [-80, 75],
    [80, 75],
    [80, -75],
    [-80, -75],
  ].map(([e, n]) => padLightningTower(k, e, n, 75, 30, 2.8));
  k.box(M.white, 0, 0, -549, 40, 89, 35);
  k.box(M.greyL, 0, 0, -531.4, 12.5, 83.8, 0.4); // the integration building and its door
  padSphere(k, -150, 130, 7.5);
  k.box(M.greyL, 0, 0, 60, 26, 7, 14); // oxygen sphere, the pad equipment building
  k.build(g);
  padGround(g, { sea: 80, shore: 900, roads: [[0, -60, 0, -530, 14]] });
  for (let i = 0; i < 4; i++) {
    padWire(g, T[i], T[(i + 1) % 4], 12);
    padWire(g, T[i], T[(i + 2) % 4], 16);
  }
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(9, 30), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 5,
    trenchD: 30,
    block: [
      padBlock(0, 9.6, 2.1, 3.5),
      padBlock(-18, 26, 3.05, 3.5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.6, 3.5)),
      sphereBlock(-150, 130, 87),
    ],
  };
}
// ---------------- Atlas-Agena on Launch Complex 12 (Mariner 4, 1964) ----------------
// The launch stand: a 6.1-m concrete pedestal (18 × 24 m) with the launcher ring on top, the flame bucket under it opening
// to the east, a ramp up its southwest side; the umbilical tower (31 m) beside the rocket with booms to the Atlas and the
// Agena; the red service tower (about 50 m, an A-frame), rolled back 90 m on its rails; the domed blockhouse 230 m west.
function padLC12(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 6.1,
    stand = deck + 0.6 - LAUNCHERS.atlasAgena.stages[0].eng.len;
  k.box(M.concrete, 0, 0, 0, 18.3, deck, 23.8);
  k.box(M.soot, 0, 0, 0, 7, 0.05, 40);
  k.box(M.steelD, 0, deck, 0, 6.2, 0.6, 6.2);
  k.quads(M.concrete, [
    [
      PV(-9.15, deck, -8),
      PV(-9.15, deck, -0.5),
      PV(-36, 0, -0.5),
      PV(-36, 0, -8),
    ],
  ]); // the ramp
  padLattice(k, M.red, -6.5, 0, 3.0, deck, 25, {
    step: 3.1,
    floors: false,
    col: 0.4,
    beam: 0.25,
  }); // umbilical tower
  for (const y of [deck + 14, deck + 23])
    k.beam(M.redD, PV(-5, y, 0), PV(-1.4, y - 1, 0), 0.4);
  // the service tower, rolled 90 m north along its rails
  const sn = 95;
  for (const e of [-6, 6]) k.box(M.steelD, e, 0, sn / 2, 0.4, 0.3, sn + 20);
  for (const sd of [-1, 1])
    for (const se of [-1, 1])
      k.beam(
        M.red,
        PV(sd * 9, 0, sn + se * 8),
        PV(sd * 4, 50, sn + se * 5),
        1.2,
      );
  padLattice(k, M.red, 0, sn, 8, 0, 50, {
    step: 5,
    floors: true,
    col: 0.5,
    beam: 0.35,
  });
  k.sphere(M.concrete, -230, -6, 0, 13, 24); // the blockhouse's dome
  k.build(g);
  padGround(g, { sea: 95, shore: 300, roads: [[-230, 0, -30, 0, 8]] });
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(7, 20), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.3;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 3,
    trenchD: 22,
    block: [padBlock(-6.5, 0, 1.5, 3), padBlock(0, sn, 9, 3)],
  };
}
// ---------------- Long March 5 on Wenchang LC-101 (2020) ----------------
// The rocket rolls 2.8 km from its 99-m assembly building on a 2,000-t mobile launch platform (16 wheels on 20-m-gauge
// rails) and stands beside the 91.7-m fixed service tower (12 levels, its three sets of rotating work platforms swung
// open for launch) over the two-way flame trench; four 120-m lightning towers with wires between them; the sea 600 m to
// the southeast.
function padWenchang(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    deck = 9.0,
    stand = deck + 1.0 - LAUNCHERS.lm5.stages[1].eng.len;
  k.box(M.concrete, 0, 0, 0, 80, 0.3, 80);
  k.box(M.soot, 0, 0.3, 0, 10, 0.05, 70);
  k.box(M.greyL, 0, 1.5, 0, 26, deck - 1.5, 22);
  for (const e of [-10, 10]) k.box(M.greyD, e, 0, 0, 4, 1.5, 20); // the platform on its bogies
  for (const e of [-10, 10]) {
    k.box(M.steelD, e, 0, -900, 0.5, 0.3, 1800);
  }
  // the fixed service tower, west of the rocket, its platforms swung open
  const fe = -17;
  padLattice(k, M.greyL, fe, 0, 10, 0, 91.7, {
    step: 7.6,
    core: 5,
    coreMat: M.white,
    floorEvery: 1,
  });
  for (const y of [28, 46, 64])
    for (const s of [-1, 1]) {
      const geo = new THREE.BoxGeometry(8, 2.2, 3);
      geo.translate(4, 1.1, 0);
      geo.rotateY(s * 1.2);
      geo.translate(-(fe + 5), y, s * 5);
      k.geo(M.white, geo);
    }
  k.box(M.white, fe, 91.7, 0, 10.5, 2.5, 10.5);
  const T = [
    [-70, 70],
    [70, 70],
    [70, -70],
    [-70, -70],
  ].map(([e, n]) => padLightningTower(k, e, n, 92, 28, 3.0));
  k.box(M.white, -1400, 0, 2400, 60, 99.4, 45); // the assembly building, 2.8 km up the rails
  k.build(g);
  padGround(g, { sea: 135, shore: 600, r: 3000 });
  for (let i = 0; i < 4; i++) padWire(g, T[i], T[(i + 1) % 4], 12);
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 0.4;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: deck,
    foot: 7,
    trenchD: 40,
    block: [
      padBlock(fe, 0, 5, 5),
      ...T.map((p) => padBlock(-p.x, p.z, 1.5, 5)),
    ],
  };
}
// ---------------- Starship at Starbase, Texas ----------------
// The orbital launch mount: a ring-shaped table on six legs, its top 20 m up, with twenty clamps for the booster; the water-
// cooled steel plate under it; the launch and catch tower 28 m west (143 m, its chopsticks and the ship's quick-disconnect
// arm toward the mount); the tank farm's white tanks to the west; the beach 700 m east.
function padStarbase(md) {
  const M = padMats(),
    k = padKit(),
    g = new THREE.Group(),
    top = 20,
    stand = top - LAUNCHERS.starship.stages[0].eng.len;
  k.box(M.concrete, 0, 0, 0, 120, 0.3, 120);
  k.box(M.steelD, 0, 0.3, 0, 22, 0.8, 22); // the pad and the steel plate
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + Math.PI / 6;
    k.cyl(
      M.greyD,
      Math.cos(a) * 9.5,
      0,
      Math.sin(a) * 9.5,
      1.3,
      1.3,
      top - 2.5,
      16,
    );
  }
  {
    const ring = new THREE.RingGeometry(5.6, 10.5, 36, 1);
    ring.rotateX(-Math.PI / 2);
    const tbl = new THREE.CylinderGeometry(10.5, 10.5, 2.5, 36, 1, true);
    tbl.translate(0, top - 1.25, 0);
    k.geo(M.greyD, tbl);
    const inn = new THREE.CylinderGeometry(5.6, 5.6, 2.5, 36, 1, true);
    inn.translate(0, top - 1.25, 0);
    k.geo(M.greyD, inn);
    ring.translate(0, top, 0);
    k.geo(M.greyD, ring);
    const ring2 = ring.clone();
    ring2.rotateX(Math.PI);
    ring2.translate(0, 2 * top - 2.5, 0);
    k.geo(M.greyD, ring2);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i * TAU) / 20;
    k.box(
      M.steelD,
      Math.cos(a) * 5.0,
      top,
      Math.sin(a) * 5.0,
      0.8,
      1.4,
      1.2,
      -a,
    );
  }
  padStarshipTower(k, -28, -3, 0);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.CylinderGeometry(3.2, 3.2, 26, 20);
      geo.rotateX(Math.PI / 2);
      geo.translate(-(-150 - i * 9), 3.6, -60 + r * 34);
      k.geo(M.white, geo);
    } // horizontal tanks
  k.build(g);
  padGround(g, {
    sea: 90,
    shore: 700,
    roads: [[-400, -80, 400, -80, 12]],
    roadMat: M.asphalt,
  });
  const glow = padGlow(),
    lit = new THREE.Mesh(new THREE.CircleGeometry(10, 32), glow);
  lit.rotation.x = -Math.PI / 2;
  lit.position.y = 1.2;
  g.add(lit);
  return {
    group: g,
    stand,
    glow,
    deckY: top,
    foot: 11,
    trenchD: 25,
    block: [padBlock(-28, -3, 6, 9)],
  };
}
// which pad a mission stands on
function padModel(md) {
  const site = md.cfg.site,
    lv = md.cfg.launcher;
  if ((site === "KSC39A" || site === "KSC39B") && lv === "saturnV")
    return padApollo(md);
  if ((site === "KSC39A" || site === "KSC39B") && lv === "shuttle")
    return padShuttle(md);
  if (site === "KSC39B" && lv === "sls1") return padSLS(md);
  if (site === "KSC39A" && lv === "falconHeavy") return padFH(md);
  if (site === "CCSFS41") return padSLC41(md);
  if (site === "CCSFS12") return padLC12(md);
  if (site === "WENCHANG") return padWenchang(md);
  if (site === "STARBASE") return padStarbase(md);
  return null;
}

// ==== 47_exhaust.js
// ============================================================================
// Exhaust in the air after liftoff: the trail a launch leaves through the atmosphere. Solid boosters lay a dense white
// column of aluminium-oxide smoke, kerosene engines a thinner grey one, hydrogen and methane engines little but a contrail
// where their water freezes in the cold upper troposphere. The trail spreads, fades over half an hour and drifts on the
// winds: kinked by the shear around the jet stream and, higher up, twisted into corkscrews by the tides and gravity waves of
// the upper atmosphere. Above 60 km the exhaust no longer mixes into the air: it expands into a vast thin cloud that freezes
// into ice.
// Sunlight reaches each part of it through the air between it and the Sun: reddened through the long path at dawn and dusk,
// cut off in Earth's shadow. After sunset the high exhaust is still in sunlight while the ground is dark, and glows against
// the night sky as a spreading, luminous cloud (the "twilight phenomenon"). Near the vehicle the flame lights the smoke.
// The trail is a ribbon along the path the engines took (where they were at each moment, carried round by the turning Earth
// and the wind since), turned to face the camera and shaded as a round column of smoke: thick through the middle, thin at the
// edges, billowing. Where a ribbon would show its edge (high up, where the trail spreads wider than it is long, and seen
// end-on or from close by) round puffs facing the camera carry the smoke instead.
// ============================================================================
const EXH = { n: 0, mesh: null, puffs: null, tex: null, off: false };
// what each propellant leaves in the air: optical thickness per kg burnt per metre of path (relative), extra for water
// freezing out where the air is cold, how long the trail lasts (s), its colour
const EXH_PROP = {
  solid: { k: 1.0, ice: 0.02, life: 1500, col: [0.93, 0.92, 0.9] }, // aluminium oxide smoke: the dense column of solid boosters
  kerolox: { k: 0.3, ice: 0.03, life: 700, col: [0.8, 0.78, 0.75] }, // soot and steam
  hydrolox: { k: 0.05, ice: 0.05, life: 420, col: [0.96, 0.97, 0.98] }, // water only: a contrail where it freezes
  methalox: { k: 0.08, ice: 0.05, life: 480, col: [0.95, 0.95, 0.96] },
  hypergolic: { k: 0.28, ice: 0.03, life: 600, col: [0.88, 0.78, 0.64] }, // nitrogen dioxide tints it orange-brown
};
EXH_PROP.udmh = EXH_PROP.hypergolic;
EXH_PROP.mmh = EXH_PROP.hypergolic;
const EXH_C = 100; // optical depth per (kg of exhaust per m² of trail), scaled by the propellant's k
const EXH_H = 8.5; // km: scale height of the air for the light's path
const EXH_EXT = [0.042, 0.085, 0.17]; // vertical optical depth of the air down to sea level, red, green, blue (scattering and haze)
// The exhaust's spread at emission (m) for a vehicle w across at the base: the plume widens as the air thins (an under-
// expanded jet), up to 20 km
const exhW0 = (w, h) =>
  Math.min(w * Math.pow(Math.exp(Math.max(h, 0) / 7.2), 0.4), 20000);
// how fast the exhaust expands into the near-vacuum above 60 km (m/s)
const exhVx = (h) => 600 * Math.pow(smoothstep((h - 60) / 90), 1.3);
// water freezing out of the exhaust: in the cold upper troposphere, and into the ice clouds of the mesosphere and above
const exhIce = (h) =>
  3 * Math.exp(-Math.pow((h - 11) / 3.5, 2)) + 40 * smoothstep((h - 62) / 40);
// A wind profile for the launch (m/s toward east and north at height h, km), drawn from the date and site: a surface wind
// veering into the westerlies, the jet stream near 11 km, stratospheric winds turning with height, and gravity waves whose
// winds grow as the air thins and turn with height.
function exhWind(seed) {
  const rnd = mulberry32(seed);
  const jetDir = (rnd() * 2 - 1) * 0.7,
    jet = 15 + 25 * rnd(),
    jetH = 10 + 3 * rnd(),
    sfc = 3 + 6 * rnd(),
    sfcDir = rnd() * TAU,
    str = 5 + 15 * rnd(),
    strDir = rnd() * TAU;
  const waves = [3.6, 5.9, 9.4, 14.5, 22].map((l) => ({
    lam: l * (0.8 + 0.4 * rnd()),
    ph: rnd() * TAU,
    a: (0.5 + 0.5 * rnd()) * Math.sqrt(l / 9),
    s: rnd() < 0.5 ? 1 : -1,
  })); // vertical wavelengths (km): the short ones weaker
  return (h) => {
    const fs = Math.exp(-h / 1.5),
      fj =
        Math.exp(-Math.pow((h - jetH) / 4.5, 2)) +
        0.2 * smoothstep(h / 6) * (1 - smoothstep((h - 20) / 10)),
      fu = smoothstep((h - 18) / 12);
    let e =
      sfc * fs * Math.cos(sfcDir) +
      jet * fj * Math.cos(jetDir) +
      str * fu * Math.cos(strDir + h / 25);
    let n =
      sfc * fs * Math.sin(sfcDir) +
      jet * fj * Math.sin(jetDir) +
      str * fu * Math.sin(strDir + h / 25);
    const A = (2.5 + 55 * smoothstep((h - 50) / 40)) * 0.45; // m/s per wave
    for (const w of waves) {
      const ph = (w.s * TAU * h) / w.lam + w.ph;
      e += A * w.a * Math.cos(ph);
      n += A * w.a * Math.sin(ph);
    }
    return [e, n];
  };
}
// the engines firing at te: [[propellant, kg/s] …], from the launch configuration (the core stage's throttle, the boosters'
// thrust curve) or the upper stage's thrust
function exhFlows(c, L, te, t0) {
  const s = c.o.stateAt(te);
  if (!s || !(s.T > 0)) return { s, flows: [] };
  const cf = cfgAt(c, te),
    out = [];
  if (cf && cf.key === "launch") {
    const st = L.stages.find((x) => x.id === (s.extra && s.extra.stage));
    if (st) out.push([st.prop, stageFlow(st) * (s.extra.throttle ?? 1)]);
    const b = L.stages[0].parallel ? L.stages[0] : null;
    if (b && cf.boosters) {
      const f = b.curve ? Math.max(curveAt(b.curve, te - t0), 0) : 1;
      if (f > 0.02) out.push([b.prop, stageFlow(b) * f]);
    }
  } else if (cf && cf.key === "stack") {
    const st = L.stages[cf.stage];
    if (st) out.push([st.prop, s.T / (st.ispVac * G0)]);
  }
  return { s, flows: out };
}
function initExhaust() {
  // tileable billows: value noise in a few octaves
  const N = 256,
    rnd = mulberry32(11),
    v = new Float32Array(N * N);
  for (const [S, amp] of [
    [4, 0.4],
    [8, 0.27],
    [16, 0.17],
    [32, 0.1],
    [64, 0.06],
  ]) {
    const L = new Float32Array(S * S);
    for (let i = 0; i < S * S; i++) L[i] = rnd();
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * S,
          fy = (y / N) * S,
          x0 = Math.floor(fx),
          y0 = Math.floor(fy),
          tx = fx - x0,
          ty = fy - y0,
          sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const a = L[(y0 % S) * S + (x0 % S)],
          b = L[(y0 % S) * S + ((x0 + 1) % S)],
          c = L[((y0 + 1) % S) * S + (x0 % S)],
          d = L[((y0 + 1) % S) * S + ((x0 + 1) % S)];
        v[y * N + x] +=
          amp *
          ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
  }
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d"),
    img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const q = clamp(Math.round(255 * smoothstep((v[i] - 0.18) / 0.64)), 0, 255);
    img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = q;
    img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  EXH.tex = new THREE.CanvasTexture(cv);
  EXH.tex.wrapS = EXH.tex.wrapT = THREE.RepeatWrapping;
  EXH.tex.generateMipmaps = true;
  EXH.tex.minFilter = THREE.LinearMipmapLinearFilter;
}
const GLSL_EXH_COMMON = `
uniform sampler2D tNoise; uniform vec3 uSunDir; uniform vec3 uFogCol; uniform float uExpo;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vWP; varying float vFade;
// Smoke of optical depth tau seen at a point where its surface (a column's or a puff's) faces N. Dense smoke scatters like a
// matt surface (light diffusing through it reaches its far side too); thin smoke glows looking toward the Sun (forward
// scattering, Henyey–Greenstein g = 0.6). Premultiplied: a thin veil in sunlight against a dark sky (exposed for the dark:
// uExpo) can outshine its own opacity many times over, so the light is not capped by it.
vec4 smoke(float tau, float edge, vec3 N, float n) {
  // out of the flame the smoke billows into view, the bulging parts (n high) first (vFade: 0 at the flame, 1 clear of it)
  float fd = clamp((vFade - 0.45 * (1.0 - n)) / 0.55, 0.0, 1.0);
  float a = (1.0 - exp(-tau)) * edge * fd * fd;
  vec3 V = normalize(cameraPosition - vWP);
  float wrap = clamp((dot(N, uSunDir) + 0.8) / 1.8, 0.0, 1.0);
  float ct = dot(-V, uSunDir), hg = 0.64 / pow(1.36 - 1.2 * ct, 1.5);
  vec3 sunL = vSun * mix(wrap, 0.12 + 0.3 * hg, exp(-tau)) * uExpo, ambL = vAmb * (0.8 + 0.4 * n);
  float af = a * (1.0 - 0.7 * vFog);
  vec3 col = mix(sunL + ambL, uFogCol, vFog) * af;
  float mx = max(max(col.r, col.g), col.b); if (mx > 1.0) col /= mx; // overexposed: keep the hue
  return vec4(col, af);
}
float bil(vec2 p) { return texture2D(tNoise, p * vec2(0.37, 0.19) + vec2(0.0, 0.5)).r * 0.62 + texture2D(tNoise, p * vec2(1.21, 0.47) + vec2(0.31, 0.17)).r * 0.38; }`;
const GLSL_EXH_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aUV; attribute float aTau; attribute vec3 aSun; attribute vec3 aAmb; attribute float aFog; attribute vec3 aSide; attribute float aFade;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vSide; varying vec3 vWP; varying float vFade;
void main(){ vUV = aUV; vTau = aTau; vSun = aSun; vAmb = aAmb; vFog = aFog; vSide = aSide; vFade = aFade;
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
// the ribbon: a round column seen from the side; vUV = (along the trail, across it −1.25 … 1.25, log2 of its spread)
const GLSL_EXH_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_EXH_COMMON}
varying vec3 vSide;
void main(){
  #include <logdepthbuf_fragment>
  float v = vUV.y;
  // billows fixed to the smoke push its edge in and out and vary its thickness. They are sized to the trail's width now:
  // as it spreads, the pattern it was emitted with gives way to one twice, four times … as coarse
  float k = floor(vUV.z), f = vUV.z - k, s0 = exp2(-k);
  float n = mix(bil(vec2(vUV.x * s0 + 0.43 * k, v)), bil(vec2(vUV.x * s0 * 0.5 + 0.43 * (k + 1.0), v)), f);
  float rEdge = 0.62 + 0.62 * n, x = abs(v) / rEdge; if (x >= 1.0) discard; // the column's edge, in its nominal radius
  float chord = sqrt(1.0 - x * x);
  vec3 V = normalize(cameraPosition - vWP);
  vec4 c = smoke(vTau * chord * (0.45 + 1.1 * n), 1.0 - smoothstep(0.62, 1.0, x), normalize(vSide * (v / rEdge) + V * chord), n);
  if (max(max(c.r, c.g), c.b) < 0.0015 && c.a < 0.002) discard;
  gl_FragColor = vec4(c.rgb, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = c.a;
}`;
// the puffs: the exhaust high up, which spreads into a wide, thin cloud, as overlapping round puffs facing the camera (a
// ribbon would fold on itself seen end-on); vUV = (corner −1 … 1, −1 … 1, a number for the puff's own billows)
const GLSL_PUFF_V = `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aUV; attribute float aTau; attribute vec3 aSun; attribute vec3 aAmb; attribute float aFog; attribute float aFade;
varying vec3 vUV; varying float vTau; varying vec3 vSun; varying vec3 vAmb; varying float vFog; varying vec3 vWP; varying float vFade;
void main(){ vUV = aUV; vTau = aTau; vSun = aSun; vAmb = aAmb; vFog = aFog; vFade = aFade;
  vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
#include <logdepthbuf_vertex>
}`;
const GLSL_PUFF_F = `
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL_EXH_COMMON}
void main(){
  #include <logdepthbuf_fragment>
  vec2 q = vUV.xy; float n = bil(q * 0.45 + vec2(vUV.z * 0.137, vUV.z * 0.071));
  float rEdge = 0.75 * (0.7 + 0.6 * n), x = length(q) / rEdge; if (x >= 1.0) discard; // the puff's radius is 0.75 of the quad's half-size
  float chord = sqrt(1.0 - x * x);
  vec3 V = normalize(cameraPosition - vWP), right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // a soft blob, its outline faded over most of its radius; shaded nearly flat, as the smoke it stands for (a stretch of
  // column seen end-on, a patch of the wide cloud high up) has no round surface to catch the light
  vec4 c = smoke(vTau * chord * (0.45 + 1.1 * n), 1.0 - smoothstep(0.25, 1.0, x), normalize(0.4 * (right * q.x + up * q.y) / rEdge + V * chord), n);
  if (max(max(c.r, c.g), c.b) < 0.0015 && c.a < 0.002) discard;
  gl_FragColor = vec4(c.rgb, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = c.a;
}`;
const EXH_PUFF_H = [50, 68]; // km: the ribbon gives way to puffs between these heights
const EXH_SUB = 400; // points the ribbon may add between samples near the engines
function disposeExhaust() {
  for (const k of ["mesh", "puffs"])
    if (EXH[k]) {
      R.scene.remove(EXH[k]);
      EXH[k].geometry.dispose();
      EXH[k].material.dispose();
      EXH[k] = null;
    }
  EXH.n = 0;
}
// Samples along the ascent, from liftoff until the vehicle reaches orbit (or rises out of the atmosphere's reach): where the
// engines were, their exhaust's spread, thickness, colour and lifetime, the wind there, a coordinate along the trail for the
// billows.
function buildExhaust(md) {
  disposeExhaust();
  const c = craftById("ship"),
    L = md.L,
    site = LAUNCH_SITES[md.cfg.site];
  if (!c || !L || !site || !c.o.segs.length) return;
  const asc = c.o.segs[0];
  if (!asc.meta || asc.meta.phase !== "ascent") return;
  const t0 = md.M.t0,
    R0 = BODIES.earth.R,
    stand = padStandH() / 1000;
  let seed = 0;
  for (const ch of md.cfg.launch + md.cfg.site)
    seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const wind = exhWind(seed);
  const bst = L.stages[0].parallel ? L.stages[0] : null;
  const base =
    3.5 *
    Math.max(
      L.diameter,
      bst && bst.booster ? 2 * (bst.booster.offset + bst.geom[0][1]) : 0,
    ); // m: the column just behind the engines
  const S = [];
  let te = t0 + 0.05,
    u = 0,
    prev = null,
    dtP = 0,
    vP = 0;
  while (te < asc.t1) {
    const { s, flows } = exhFlows(c, L, te, t0);
    if (!s) break;
    const h = vnorm(s.r) - R0;
    if (h > 450) break;
    const om = bodyOmegaEcl("earth", te),
      va = vsub(s.v, vcross(om, s.r)),
      vAir = vnorm(va) * 1000;
    const ax = s.dir && vnorm(s.dir) > 0.5 ? vunit(s.dir) : vunit(s.r);
    const r = vadd(s.r, vscale(ax, stand)); // the engines: the stack stands on its state point (app/40_missionview.js anchorY)
    const w0 = exhW0(base, h),
      ice = exhIce(h);
    let kf = 0,
      life = 0,
      col = [0, 0, 0];
    for (const [p, f] of flows) {
      const P = EXH_PROP[p] || EXH_PROP.kerolox,
        k = (P.k + P.ice * ice) * f;
      kf += k;
      life += P.life * k;
      for (let j = 0; j < 3; j++) col[j] += P.col[j] * k;
    }
    if (kf > 0) {
      life /= kf;
      col = col.map((x) => x / kf);
    } else {
      life = 600;
      col = [0.9, 0.9, 0.9];
    }
    life *= 1 + 2 * smoothstep((h - 60) / 40); // ice high up lasts
    const tau0 = (EXH_C * kf) / Math.max(vAir, 15) / w0;
    const lf = localFrame("earth", s.r, te),
      [we, wn] = wind(h),
      dW = vscale(vadd(vscale(lf.east, we), vscale(lf.north, wn)), 0.001); // km/s
    if (prev)
      u += (0.5 * (vAir + vP) * dtP) / Math.max(0.5 * (w0 + prev.w0), 1); // along the path through the air, in trail widths
    const x = { te, r, dW, h, w0, tau0, col, life, u, vx: exhVx(h) };
    S.push(x);
    prev = x;
    dtP = clamp((0.35 * w0) / Math.max(vAir, 1), 0.08, 2.5);
    vP = vAir;
    te += dtP;
  }
  if (S.length < 2) return;
  EXH.n = S.length;
  EXH.t0 = t0;
  EXH.t1 = asc.t1;
  const N = S.length,
    F = (k) => new Float64Array(k * N); // the samples as flat arrays, for the work done every frame
  const NR = N + 1 + EXH_SUB; // the ribbon's points: kept samples and the extra ones near the engines
  Object.assign(EXH, {
    TE: F(1),
    RX: F(3),
    DW: F(3),
    W0: F(1),
    TAU0: F(1),
    LIFE: F(1),
    U: F(1),
    VX: F(1),
    H: F(1),
    COL: F(3),
    P: new Float64Array(3 * (N + 1)),
    dH: new Float64Array(N + 1),
    W: new Float64Array(N + 1),
    keep: new Int32Array(N + 1),
    ra: new Int32Array(NR),
    rb: new Int32Array(NR),
    rf: new Float64Array(NR),
    rg: new Float64Array(3 * NR),
  });
  S.forEach((x, i) => {
    EXH.TE[i] = x.te;
    EXH.W0[i] = x.w0;
    EXH.TAU0[i] = x.tau0;
    EXH.LIFE[i] = x.life;
    EXH.U[i] = x.u;
    EXH.VX[i] = x.vx;
    EXH.H[i] = x.h;
    for (let k = 0; k < 3; k++) {
      EXH.RX[3 * i + k] = x.r[k];
      EXH.DW[3 * i + k] = x.dW[k];
      EXH.COL[3 * i + k] = x.col[k];
    }
  });
  const cap = NR;
  const g = new THREE.BufferGeometry(),
    A = (k) =>
      new THREE.BufferAttribute(new Float32Array(2 * cap * k), k).setUsage(
        THREE.DynamicDrawUsage,
      );
  g.setAttribute("position", A(3));
  g.setAttribute("aUV", A(3));
  g.setAttribute("aTau", A(1));
  g.setAttribute("aSun", A(3));
  g.setAttribute("aAmb", A(3));
  g.setAttribute("aFog", A(1));
  g.setAttribute("aSide", A(3));
  g.setAttribute("aFade", A(1));
  const idx = new Uint32Array(6 * (cap - 1));
  for (let i = 0; i < cap - 1; i++) {
    const a = 2 * i;
    idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], 6 * i);
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const U = {
    tNoise: { value: EXH.tex },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uFogCol: { value: new THREE.Color(0, 0, 0) },
    uExpo: { value: 1 },
  }; // shared by both
  const mk = (geo, vs, fs) => {
    const ms = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: U,
      }),
    );
    ms.frustumCulled = false;
    ms.renderOrder = 4;
    ms.visible = false;
    R.scene.add(ms);
    return ms;
  };
  EXH.mesh = mk(g, GLSL_EXH_V, GLSL_EXH_F);
  {
    // the puffs: as many as the trail could need (one per ribbon point at most)
    const np = NR,
      gp = new THREE.BufferGeometry(),
      B = (k) =>
        new THREE.BufferAttribute(new Float32Array(4 * np * k), k).setUsage(
          THREE.DynamicDrawUsage,
        );
    gp.setAttribute("position", B(3));
    gp.setAttribute("aUV", B(3));
    gp.setAttribute("aTau", B(1));
    gp.setAttribute("aSun", B(3));
    gp.setAttribute("aAmb", B(3));
    gp.setAttribute("aFog", B(1));
    gp.setAttribute("aFade", B(1));
    const ix = new Uint32Array(6 * np);
    for (let i = 0; i < np; i++) {
      const a = 4 * i;
      ix.set([a, a + 1, a + 2, a, a + 2, a + 3], 6 * i);
    }
    gp.setIndex(new THREE.BufferAttribute(ix, 1));
    const uvA = gp.attributes.aUV.array;
    for (let i = 0; i < np; i++)
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].forEach(([x, y], k) => {
        uvA[12 * i + 3 * k] = x;
        uvA[12 * i + 3 * k + 1] = y;
      });
    EXH.puffs = mk(gp, GLSL_PUFF_V, GLSL_PUFF_F);
  }
}
// sunlight reaching geocentric point p (km) along direction sd (unit, toward the Sun): [r, g, b], 0 in Earth's shadow
const _exhT = [0, 0, 0];
function exhSunlight(px, py, pz, sd) {
  const R0 = BODIES.earth.R,
    rr = Math.sqrt(px * px + py * py + pz * pz),
    h = rr - R0,
    d = px * sd[0] + py * sd[1] + pz * sd[2];
  let ht, am, sh;
  // the shadow's soft edge: haze, clouds and hills block light that skims the ground
  if (d >= 0) {
    ht = h;
    const mu = d / rr,
      k = (R0 + Math.max(h, 0)) / EXH_H;
    am = Math.sqrt(k * k * mu * mu + 2 * k + 1) - k * mu;
    sh = 1 - (1 - smoothstep((h + 1.5) / 7.5)) * (1 - smoothstep(mu / 0.035));
  } // air mass along the slant path up and out
  else {
    ht = Math.sqrt(Math.max(rr * rr - d * d, 0)) - R0;
    am =
      Math.sqrt((Math.PI * (R0 + Math.max(ht, 0))) / (2 * EXH_H)) *
      (1 + smoothstep((h - ht) / (3 * EXH_H)));
    sh = smoothstep((ht + 1.5) / 7.5);
  } // through the air down to the ray's lowest point (and up again)
  const tr = Math.exp(-Math.max(ht, 0) / EXH_H) * am;
  for (let j = 0; j < 3; j++)
    _exhT[j] = sh * Math.min(1, Math.exp(-EXH_EXT[j] * (tr - 1)));
  return _exhT;
}
const _exhV = new THREE.Vector3(),
  _exhR = new THREE.Vector3(),
  _exhU = new THREE.Vector3();
const EXH_TINT = [0.82, 0.9, 1.0],
  EXH_FIRE = [1.0, 0.55, 0.24]; // skylight; the flame's light
function updateExhaust(t) {
  const mesh = EXH.mesh;
  if (!mesh) return;
  const N = EXH.n,
    t0 = EXH.t0,
    pf = EXH.puffs;
  const hide = () => {
    mesh.visible = false;
    if (pf) pf.visible = false;
  };
  if (t < t0 + 0.2 || t > t0 + 2700 || EXH.off) {
    hide();
    return;
  }
  const O = R.O,
    E = helio("earth", t).r,
    om = bodyOmegaEcl("earth", t),
    wm = vnorm(om),
    kx = om[0] / wm,
    ky = om[1] / wm,
    kz = om[2] / wm,
    R0 = BODIES.earth.R;
  const cam = R.camera.position,
    cgx = cam.x + O[0] - E[0],
    cgy = cam.y + O[1] - E[1],
    cgz = cam.z + O[2] - E[2],
    hc = Math.hypot(cgx, cgy, cgz) - R0;
  const { TE, RX, DW, W0, TAU0, LIFE, U, VX, H, COL, P, dH, W, keep } = EXH;
  // the samples emitted so far, carried round by the turning Earth and moved by the wind since (geocentric, km)
  let n = 0;
  while (n < N && TE[n] <= t) n++;
  if (n < 2) {
    hide();
    return;
  }
  for (let i = 0; i < n; i++) {
    const a = t - TE[i],
      c = Math.cos(wm * a),
      sn = Math.sin(wm * a),
      vx = RX[3 * i] + DW[3 * i] * a,
      vy = RX[3 * i + 1] + DW[3 * i + 1] * a,
      vz = RX[3 * i + 2] + DW[3 * i + 2] * a,
      kv = (kx * vx + ky * vy + kz * vz) * (1 - c);
    P[3 * i] = vx * c + (ky * vz - kz * vy) * sn + kx * kv;
    P[3 * i + 1] = vy * c + (kz * vx - kx * vz) * sn + ky * kv;
    P[3 * i + 2] = vz * c + (kx * vy - ky * vx) * sn + kz * kv;
  }
  // the head: where the engines are now (the ship's plumes), while it climbs on them
  const ship = craftById("ship");
  let m = n,
    lum = 0,
    Lf = 0;
  if (ship && ship.s && t < EXH.t1 && ship.node.visible) {
    let k = 0;
    _exhV.set(0, 0, 0);
    const sc = ship.node.scale.x;
    for (const p of ship.plumes)
      if (p.visible) {
        k++;
        _exhU
          .copy(p.position)
          .multiplyScalar(sc)
          .applyQuaternion(ship.node.quaternion)
          .add(ship.node.position);
        _exhV.add(_exhU);
      }
    if (k) {
      _exhV.multiplyScalar(1 / k);
      P[3 * n] = _exhV.x + O[0] - E[0];
      P[3 * n + 1] = _exhV.y + O[1] - E[1];
      P[3 * n + 2] = _exhV.z + O[2] - E[2];
      m = n + 1;
      lum = ship.flameLum || 0;
      Lf = (ship.flameLen || 50) / 1000;
    }
  }
  const dc = (j) =>
    Math.hypot(P[3 * j] - cgx, P[3 * j + 1] - cgy, P[3 * j + 2] - cgz);
  if (dc(m - 1) > 3000 && dc(0) > 3000) {
    hide();
    return;
  }
  // distance back from the head (m) and the width now (m): turbulent mixing and, high up, free expansion. Behind the engines
  // the plume opens out like a cone, over its own width or twice the flame's length, whichever is longer
  const Lm = Lf * 1000; // m
  dH[m - 1] = 0;
  for (let i = m - 2; i >= 0; i--)
    dH[i] =
      dH[i + 1] +
      1000 *
        Math.hypot(
          P[3 * i + 3] - P[3 * i],
          P[3 * i + 4] - P[3 * i + 1],
          P[3 * i + 5] - P[3 * i + 2],
        );
  for (let i = 0; i < m; i++) {
    const j = Math.min(i, n - 1),
      a = Math.max(t - TE[j], 0),
      w0 = W0[j],
      x = Math.min(dH[i] / Math.max(1.5 * w0, 2 * Lm), 1);
    W[i] =
      w0 * (0.25 + 0.75 * x * (2 - x)) +
      4 * Math.sqrt(a) +
      0.25 * a +
      VX[j] * a;
  }
  // the samples the ribbon runs through: one every third of its width or so (or every half degree, seen from afar), and all
  // of them near the engines, where the plume opens and the smoke comes out of the flame
  const zone = (i) => Math.max(3 * W[i], 2.5 * Lm);
  let nk = 0;
  keep[nk++] = 0;
  for (let i = 1, acc = 0; i < m; i++) {
    acc += dH[i - 1] - dH[i];
    if (
      i === m - 1 ||
      acc >= Math.max(0.3 * W[i], 8 * dc(i)) ||
      dH[i] < zone(i)
    ) {
      keep[nk++] = i;
      acc = 0;
    }
  }
  // its points: those samples and, near the engines, more in between (every sixth of the width, every eighth of the flame),
  // so the cone and the smoke fading in are smooth however far apart the samples were laid. A point lies a fraction f of the
  // way from point a to point b of P.
  const { ra, rb, rf, rg } = EXH;
  let nr = 0,
    extra = 0;
  for (let kk = 0; kk < nk; kk++) {
    const a = keep[kk];
    ra[nr] = a;
    rb[nr] = a;
    rf[nr] = 0;
    nr++;
    const b = keep[kk + 1];
    if (kk + 1 >= nk || dH[b] >= zone(b)) continue;
    const step = Math.max(Lm > 0 ? Math.min(W[b] / 6, Lm / 8) : W[b] / 6, 0.5),
      ns = Math.min(Math.ceil((dH[a] - dH[b]) / step), 24, EXH_SUB - extra + 1);
    for (let k = 1; k < ns; k++) {
      ra[nr] = a;
      rb[nr] = b;
      rf[nr] = k / ns;
      nr++;
      extra++;
    }
  }
  for (let r = 0; r < nr; r++) {
    const a = ra[r],
      b = rb[r],
      f = rf[r];
    for (let k = 0; k < 3; k++)
      rg[3 * r + k] = P[3 * a + k] + (P[3 * b + k] - P[3 * a + k]) * f;
  }
  // light
  const sd = vunit(vscale(E, -1)),
    sun = [1.0, 0.97, 0.92];
  const elS =
      Math.asin(
        clamp((cgx * sd[0] + cgy * sd[1] + cgz * sd[2]) / (hc + R0), -1, 1),
      ) * RAD,
    day = smoothstep((elS + 7) / 17),
    fill = MV.layers.fill !== false;
  // exposure: after sunset the sky darkens about tenfold for every 4° the Sun sinks below the camera's horizon, and eyes and
  // cameras open up to match; the exhaust high overhead, still in sunlight, then blazes against it
  const dip = Math.acos(clamp(R0 / (R0 + Math.max(hc, 0)), -1, 1)) * RAD;
  const u = mesh.material.uniforms;
  u.uSunDir.value.set(sd[0], sd[1], sd[2]);
  u.uExpo.value = Math.pow(10, clamp(-(elS + dip), 0, 11) / 4);
  u.uFogCol.value
    .copy(R.sky.material.uniforms.uHorizon.value)
    .multiplyScalar(0.25 + 0.75 * day);
  const G = mesh.geometry.attributes,
    pos = G.position.array,
    uv = G.aUV.array,
    ta = G.aTau.array,
    su = G.aSun.array,
    am = G.aAmb.array,
    fo = G.aFog.array,
    si = G.aSide.array,
    fa = G.aFade.array;
  const PG = pf && pf.geometry.attributes,
    cap = pf ? PG.aTau.count / 4 : 0;
  const crR = _exhR.set(1, 0, 0).applyQuaternion(R.camera.quaternion),
    crU = _exhU.set(0, 1, 0).applyQuaternion(R.camera.quaternion);
  const ox = E[0] - O[0],
    oy = E[1] - O[1],
    oz = E[2] - O[2]; // geocentric → scene
  let px0 = 0,
    py0 = 0,
    pz0 = 0,
    hasPs = false,
    nv = 0,
    np = 0,
    pAcc = 0,
    dPrev = 0;
  const col = [0, 0, 0];
  for (let r = 0; r < nr; r++) {
    const a = ra[r],
      b = rb[r],
      f = rf[r],
      ja = Math.min(a, n - 1),
      jb = Math.min(b, n - 1),
      isHead = a === n;
    const lerp = (A) => A[ja] + (A[jb] - A[ja]) * f;
    const age = Math.max(t - lerp(TE), 0),
      w0 = lerp(W0),
      dHr = dH[a] + (dH[b] - dH[a]) * f,
      w = W[a] + (W[b] - W[a]) * f;
    for (let k = 0; k < 3; k++)
      col[k] = COL[3 * ja + k] + (COL[3 * jb + k] - COL[3 * ja + k]) * f;
    const gx = rg[3 * r],
      gy = rg[3 * r + 1],
      gz = rg[3 * r + 2],
      sx = gx + ox,
      sy = gy + oy,
      sz = gz + oz; // geocentric; in the scene
    const tau0 = isHead
      ? 0
      : lerp(TAU0) * (w0 / w) * Math.exp(-age / lerp(LIFE));
    // the smoke shows beyond the bright flame (from a third of its length, fully past it); with the engines off, the trail's
    // end thins out over its width
    const fade =
      Lm > 0
        ? smoothstep((dHr - 0.3 * Lm) / (0.8 * Lm))
        : smoothstep(dHr / (0.6 * w));
    // the ribbon's side: across the trail and across the line of sight. Seen end-on that side is ill-defined: it keeps
    // turning smoothly from the last one, and the puffs take over from the ribbon there (as they do high up, where the
    // exhaust spreads into a wide, thin cloud)
    const rp = Math.max(r - 1, 0),
      rq = Math.min(r + 1, nr - 1);
    const tx = rg[3 * rq] - rg[3 * rp],
      ty = rg[3 * rq + 1] - rg[3 * rp + 1],
      tz = rg[3 * rq + 2] - rg[3 * rp + 2],
      cx = cam.x - sx,
      cy = cam.y - sy,
      cz = cam.z - sz;
    let vx = ty * cz - tz * cy,
      vy = tz * cx - tx * cz,
      vz = tx * cy - ty * cx;
    const sl = Math.hypot(vx, vy, vz),
      D = Math.hypot(cx, cy, cz),
      sn = sl / Math.max(Math.hypot(tx, ty, tz) * D, 1e-30);
    if (sl > 1e-15) {
      vx /= sl;
      vy /= sl;
      vz /= sl;
    } else if (hasPs) {
      vx = px0;
      vy = py0;
      vz = pz0;
    } else {
      const q = vperp([cx, cy, cz]);
      vx = q[0];
      vy = q[1];
      vz = q[2];
    }
    if (hasPs) {
      if (vx * px0 + vy * py0 + vz * pz0 < 0) {
        vx = -vx;
        vy = -vy;
        vz = -vz;
      }
      const wgt = clamp(sn / 0.25, 0, 1);
      if (wgt < 1) {
        vx = px0 * (1 - wgt) + vx * wgt;
        vy = py0 * (1 - wgt) + vy * wgt;
        vz = pz0 * (1 - wgt) + vz * wgt;
        const d = (vx * cx + vy * cy + vz * cz) / Math.max(D * D, 1e-30);
        vx -= cx * d;
        vy -= cy * d;
        vz -= cz * d;
        const l = Math.hypot(vx, vy, vz);
        if (l > 1e-12) {
          vx /= l;
          vy /= l;
          vz /= l;
        } else {
          vx = px0;
          vy = py0;
          vz = pz0;
        }
      }
    }
    px0 = vx;
    py0 = vy;
    pz0 = vz;
    hasPs = true;
    // the ribbon's share: high up, seen end-on or from close by (a camera beside the column would see the ribbon twist round
    // it) the puffs draw the smoke instead
    const fr =
      (1 -
        smoothstep(
          (lerp(H) - EXH_PUFF_H[0]) / (EXH_PUFF_H[1] - EXH_PUFF_H[0]),
        )) *
      (pf
        ? smoothstep((sn - 0.05) / 0.12) *
          smoothstep(((D * 1000) / w - 0.6) / 0.8)
        : 1);
    // seen at an angle to its axis the line of sight crosses more of the column: thicker by 1 / sin of that angle
    const tau = tau0 / Math.max(sn, 0.17);
    const Lt = exhSunlight(gx, gy, gz, sd),
      rgl = Math.hypot(gx, gy, gz),
      hv = rgl - R0,
      mu = (gx * sd[0] + gy * sd[1] + gz * sd[2]) / rgl;
    const dayV =
        smoothstep((mu + 0.1) / 0.3) * (1 - 0.7 * smoothstep((hv - 15) / 50)),
      amb = 0.42 * dayV + (fill ? 0.035 : 0.012);
    const fire =
      lum > 0 ? (0.7 * lum) / (1 + Math.pow(dHr / (0.45 * Lm), 2)) : 0; // the flame lighting the smoke near it
    const h1 = Math.min(hc, hv),
      h2 = Math.max(hc, hv),
      air =
        h2 - h1 > 0.05
          ? (EXH_H * (Math.exp(-h1 / EXH_H) - Math.exp(-h2 / EXH_H))) /
            (h2 - h1)
          : Math.exp(-h1 / EXH_H);
    const fog = 1 - Math.exp((-D * Math.max(air, 0)) / 80); // haze between the camera and the smoke
    const hw = w * 0.000625,
      lod = Math.max(Math.log2(w / w0), 0),
      uu = lerp(U); // km: half its width, with a quarter more for the billows
    for (let s = 0; s < 2; s++) {
      const q = 2 * nv + s,
        sg = s ? hw : -hw;
      pos[3 * q] = sx + vx * sg;
      pos[3 * q + 1] = sy + vy * sg;
      pos[3 * q + 2] = sz + vz * sg;
      uv[3 * q] = uu;
      uv[3 * q + 1] = s ? 1.25 : -1.25;
      uv[3 * q + 2] = lod;
      ta[q] = tau * fr;
      fo[q] = fog;
      fa[q] = fade;
      si[3 * q] = vx;
      si[3 * q + 1] = vy;
      si[3 * q + 2] = vz;
      for (let k = 0; k < 3; k++) {
        su[3 * q + k] = col[k] * sun[k] * Lt[k];
        am[3 * q + k] = col[k] * (amb * EXH_TINT[k] + fire * EXH_FIRE[k]);
      }
    }
    nv++;
    // a puff gathers the trail since the last one (out to a third of its width or so) into a ball as wide as the trail: the
    // same smoke, so seen from the side the puffs add up to the column, and seen end-on they add up along it
    if (pf && r > 0) pAcc += (dPrev - dHr) * (1 - fr);
    dPrev = dHr;
    if (
      pf &&
      !isHead &&
      pAcc > 0 &&
      (pAcc >= 0.33 * w || r >= nr - 2) &&
      np < cap
    ) {
      const rq2 = 0.000667 * w,
        tp = ((1.5 * tau0 * pAcc) / w) * smoothstep((D / rq2 - 1.2) / 1.5);
      pAcc = 0; // its half-size (km); τ through its middle, gone once the camera is in it
      const PP = PG.position.array;
      for (let k = 0; k < 4; k++) {
        const q = 4 * np + k,
          ex = k === 1 || k === 2 ? rq2 : -rq2,
          ey = k >= 2 ? rq2 : -rq2;
        PP[3 * q] = sx + crR.x * ex + crU.x * ey;
        PP[3 * q + 1] = sy + crR.y * ex + crU.y * ey;
        PP[3 * q + 2] = sz + crR.z * ex + crU.z * ey;
        PG.aUV.array[3 * q + 2] = (7 * a + Math.round(7 * f)) % 97;
        PG.aTau.array[q] = tp;
        PG.aFog.array[q] = fog;
        PG.aFade.array[q] = fade;
        for (let c = 0; c < 3; c++) {
          PG.aSun.array[3 * q + c] = col[c] * sun[c] * Lt[c];
          PG.aAmb.array[3 * q + c] =
            col[c] * (amb * EXH_TINT[c] + fire * EXH_FIRE[c]);
        }
      }
      np++;
    }
  }
  const upload = (A, nVert) => {
    for (const k in A) {
      const at = A[k];
      at.clearUpdateRanges();
      at.addUpdateRange(0, nVert * at.itemSize);
      at.needsUpdate = true;
    }
  }; // only the part in use
  upload(G, 2 * nv);
  mesh.geometry.setDrawRange(0, 6 * (nv - 1));
  mesh.visible = nv > 1;
  if (pf) {
    upload(PG, 4 * np);
    pf.geometry.setDrawRange(0, 6 * np);
    pf.visible = np > 0;
  }
}

// ==== 50_camera.js
// ============================================================================
// Camera: orbit / chase / look-at / ground observer / top-down, with film
// lenses (35 mm full-frame equivalent) and letterbox framing.
// ============================================================================
const CAM = {
  mode: "auto",
  target: "obj:ship",
  look: "body:moon",
  az: 200 * DEG,
  el: 10 * DEG,
  dist: 0.3,
  roll: 0,
  lens: 35,
  aspect: 0,
  ground: { yaw: 0, pitch: 10 * DEG, track: true },
  trans: null,
  lastTargetP: null,
};
function targetPos(id, t) {
  if (!id) return null;
  if (id.startsWith("body:")) return helio(id.slice(5), t).r;
  const c = craftById(id.slice(4));
  if (c && c.P) return c.P;
  if (c) {
    const s = craftState(c, t);
    if (s) return vadd(helio(s.ref, t).r, s.r);
  }
  return null;
}
function targetRadius(id) {
  if (id && id.startsWith("body:")) {
    const b = R.bodies[id.slice(5)];
    return b ? b.R : 1;
  }
  return 0;
}
function targetCraft() {
  return CAM.target.startsWith("obj:") ? craftById(CAM.target.slice(4)) : null;
}
function setTarget(id, opts = {}) {
  if (id === CAM.target && !opts.force) return;
  const t = MV.tNow;
  const from = targetPos(CAM.target, t);
  const prevId = CAM.target;
  CAM.target = id;
  const rT = targetRadius(id);
  const c = targetCraft();
  let dist = CAM.dist;
  if (rT > 0) dist = Math.max(dist, rT * 3.2);
  else if (c && c.cur)
    dist = Math.max(0.03, (c.cur.userData.len || 10) * 0.001 * 3.5);
  if (opts.dist) dist = opts.dist;
  if (from)
    CAM.trans = {
      fromId: prevId,
      fromP: from,
      t0: performance.now(),
      dur: 1100,
      distFrom: CAM.dist,
      distTo: dist,
    };
  CAM.dist = dist;
  if (CAM.mode === "ground" && id.startsWith("body:")) setMode("orbit");
  if (CAM.mode === "auto" && !opts.keepMode)
    setMode(id.startsWith("body:") ? "orbit" : "chase");
  syncCamUI();
}
function setMode(m) {
  const wasAuto = CAM.mode === "auto";
  CAM.mode = m;
  $("#lookWrap").hidden = m !== "lookat";
  if (m === "auto") {
    DIR.key = "";
    DIR.lastT = null;
    DIR.blend = null;
  }
  if (wasAuto && m !== "auto" && DIR.prm) {
    CAM.dist = DIR.prm.dist;
    CAM.az = DIR.prm.az;
    CAM.el = DIR.prm.el;
  }
  if (m === "ground") {
    CAM.ground.track = true;
    if (CAM.lens < 85) CAM.lens = 200;
  }
  if (m === "top") {
    CAM.el = 89 * DEG;
  }
  if (m === "chase") {
    CAM.az = 200 * DEG;
    CAM.el = 12 * DEG;
  }
  if (m === "lookat") {
    CAM.az = 12 * DEG;
    CAM.el = 6 * DEG;
  }
  applyLens();
  syncCamUI();
}
function frameRect() {
  const W = R.width,
    Hh = R.height,
    A = CAM.aspect;
  if (!A) return { x: 0, y: 0, w: W, h: Hh };
  if (W / Hh > A) {
    const w = Hh * A;
    return { x: (W - w) / 2, y: 0, w, h: Hh };
  }
  const hh = W / A;
  return { x: 0, y: (Hh - hh) / 2, w: W, h: hh };
}
function applyLens() {
  const fr = frameRect();
  const tanH = 18 / CAM.lens; // 36 mm wide full-frame sensor
  const tanV = (tanH * R.height) / fr.w;
  R.camera.fov = 2 * Math.atan(tanV) * RAD;
  R.camera.aspect = R.width / R.height;
  R.camera.updateProjectionMatrix();
  R.pxPerRad = R.height / (2 * tanV);
  const lb = (id, css) => {
    $(id).style.cssText = css;
  };
  lb("#lbT", `left:0;right:0;top:0;height:${fr.y}px`);
  lb("#lbB", `left:0;right:0;bottom:0;height:${R.height - fr.y - fr.h}px`);
  lb("#lbL", `top:0;bottom:0;left:0;width:${fr.x}px`);
  lb("#lbR", `top:0;bottom:0;right:0;width:${R.width - fr.x - fr.w}px`);
  const gd = $("#guides");
  gd.style.cssText = `left:${fr.x}px;top:${fr.y}px;width:${fr.w}px;height:${fr.h}px`;
  const bi = $("#burnin");
  bi.style.left = fr.x + 14 + "px";
  bi.style.bottom = R.height - fr.y - fr.h + 10 + "px";
}
// where a craft actually stands on a body (its surface segment), preferring the camera target
function surfaceSpotOn(body, after = -Infinity) {
  const order = [
    targetCraft(),
    craftById("ship"),
    craftById("lander"),
    ...MV.crafts,
  ].filter(Boolean);
  for (const c of order)
    for (const sg of c.o.segs)
      if (sg.type === "surface" && sg.ref === body && sg.t0 > after)
        return { lat: sg.lat, lon: sg.lon, elev: sg.elev || 0 };
  return null;
}
function groundSite(t) {
  const md = MV.md;
  const P = targetPos(CAM.target, t) || helio("earth", t).r;
  const near = (b, d) => vnorm(vsub(P, helio(b, t).r)) < d;
  const cfg = md.cfg;
  const off = (body, lat, lon, elev, dE, dN) => {
    const Rb = surfaceRadius(body);
    return {
      body,
      lat: lat + (dN / Rb) * RAD,
      lon: lon + (dE / (Rb * Math.cos(lat * DEG))) * RAD,
      alt: (elev || 0) + 0.0018,
    };
  };
  if (near("moon", 30000)) {
    const sp =
      surfaceSpotOn("moon") ||
      (typeof cfg.landing === "object" ? cfg.landing : null);
    if (sp) return off("moon", sp.lat, sp.lon, sp.elev || 0, -0.35, -0.12);
  }
  if (near("mars", 50000)) {
    const l = (cfg.legs || []).find((x) => x.body === "mars" && x.site);
    const sp = surfaceSpotOn("mars") || (l && l.site);
    if (sp) return off("mars", sp.lat, sp.lon, sp.elev || 0, -0.6, -0.25);
  }
  if (near("earth", 60000)) {
    const S = LAUNCH_SITES[cfg.site],
      rw = cfg.runway && RUNWAYS[cfg.runway];
    if (rw && t > md.M.t0 + 3 * 3600) {
      // a Shuttle landing: beside the runway, 1.2 km past the threshold, like the photographers at the landing strip
      const pe = sitePosEcl("earth", rw.lat, rw.lon, 0, t);
      if (vnorm(vsub(vsub(P, helio("earth", t).r), pe)) < 800) {
        const hd = rw.hdg * DEG,
          a = 1.2,
          sd = 0.42;
        return off(
          "earth",
          rw.lat,
          rw.lon,
          rw.elev || 0,
          a * Math.sin(hd) - sd * Math.cos(hd),
          a * Math.cos(hd) + sd * Math.sin(hd),
        );
      }
    }
    if (t > md.M.t0 + 3 * 3600) {
      const sp = surfaceSpotOn("earth", md.M.t0 + 3600);
      if (sp) {
        const pe = sitePosEcl("earth", sp.lat, sp.lon, 0, t);
        if (vnorm(vsub(vsub(P, helio("earth", t).r), pe)) < 1500)
          return off("earth", sp.lat, sp.lon, 0, -4, -3);
      }
    }
    return off("earth", S.lat, S.lon, 0, -2.2, -5.5);
  }
  return null;
}
const _up = new THREE.Vector3(),
  _look = new THREE.Vector3();
// never let the camera sink below the ground of a nearby body (offset is relative to the origin P)
function keepAboveGround(P, off, t) {
  const Pc = vadd(P, off);
  for (const b of ["earth", "moon", "mars"]) {
    const B = helio(b, t).r;
    const d = vsub(Pc, B);
    const n = vnorm(d);
    if (n > surfaceRadius(b) + 15) continue;
    const Rb = groundRadius(b, vscale(d, 1 / Math.max(n, 1e-9)), t) + 0.0025;
    if (n < Rb) {
      const fixed = vadd(B, vscale(d, Rb / Math.max(n, 1e-9)));
      return vsub(fixed, P);
    }
  }
  return off;
}
// ---------------- framing a standing vehicle around the HUD ----------------
// The screen rows the HUD leaves free in the middle column, where a rocket stands: below the top bar and the propulsion pill,
// above the bottom bar (and the small map on phones), and clear of the countdown card — mid-screen on wide screens, near
// the top on phones. The card's place is remembered after it hides, so the framing holds steady through liftoff.
const BAND = { at: 0, W: 0, H: 0, v: null, card: null, cardKey: "" };
function screenBand() {
  const now = performance.now(),
    W = R.width,
    H = R.height;
  if (BAND.v && now - BAND.at < 500 && BAND.W === W && BAND.H === H)
    return BAND.v;
  const fr = frameRect(),
    cx = W / 2,
    half = clamp(W * 0.12, 60, 110),
    clean = $("#app").classList.contains("hide-ui");
  const rectOf = (sel) => {
    const el = $(sel);
    if (!el || el.hidden) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 &&
      r.height > 0 &&
      r.right > cx - half &&
      r.left < cx + half
      ? r
      : null;
  };
  let top = fr.y,
    bot = fr.y + fr.h,
    card = null;
  if (!clean) {
    top = Math.max(top, 84); // the top bar (48 px) and the propulsion pill under it (shown from liftoff on)
    for (const sel of ["#bottom", "#minimap"]) {
      const r = rectOf(sel);
      if (r) bot = Math.min(bot, r.top);
    }
    const key = W + "x" + H;
    card = rectOf("#countdown");
    if (card) {
      BAND.card = { top: card.top, bottom: card.bottom };
      BAND.cardKey = key;
    } else
      card =
        BAND.cardKey === key
          ? BAND.card
          : H <= 520
            ? null
            : W <= 860
              ? { top: 96, bottom: 270 }
              : { top: 0.6 * H - 78, bottom: 0.6 * H + 78 }; // (on short screens the card sits at the side)
  }
  let t2 = top,
    b2 = bot;
  if (card) {
    if (card.top + card.bottom < top + bot) t2 = Math.max(top, card.bottom);
    else b2 = Math.min(bot, card.top);
  }
  const minH = Math.max(110, 0.15 * fr.h); // too little room beside the card (a phone held sideways): let the card overlap instead
  const v =
    b2 - t2 >= minH
      ? { top: t2, bot: b2 }
      : bot - top >= minH
        ? { top, bot }
        : { top: fr.y + 0.06 * fr.h, bot: fr.y + 0.94 * fr.h };
  Object.assign(BAND, { at: now, W, H, v });
  return v;
}
// camera distance and aim height (km above the base point) that put a vertical column — from the base point up to zTop km —
// exactly between screen rows yT and yB, for a chase camera at elevation el looking at the aim point (pinhole projection)
function fitColumn(zTop, el, yT, yB) {
  const k = R.pxPerRad,
    Hc = R.height / 2,
    ce = Math.cos(el),
    se = Math.sin(el);
  const p1 = Hc - yT,
    p2 = Hc - yB,
    q1 = ce * k + p1 * se,
    q2 = ce * k + p2 * se; // px above the centre (negative below)
  const den = p1 / q1 - p2 / q2;
  if (!(zTop > 0) || !(den > 1e-6) || !(q1 > 0) || !(q2 > 0)) return null;
  const d = zTop / den;
  return { dist: d, aimH: (-p2 * d) / q2 };
}
// how high the vehicle reaches above its base point (km): its model's top, standing on the launch mount
function standingHeight(c, Lkm) {
  const ud = c.cur && c.cur.userData;
  return ud && ud.bbY
    ? Math.max(((c.yOff || 0) + ud.bbY[1]) * 0.001, 0.002)
    : Lkm + (PAD_TOP + MOUNT_H) * 0.001;
}
// camera pose for a mode, relative to the floating origin P: {pos, up, look}
function poseFor(mode, prm, P, t) {
  const c = targetCraft();
  const dist = prm.dist;
  if (mode === "lookat") {
    const PL = targetPos(prm.look, t) || helio("moon", t).r;
    const Ld = vunit(vsub(PL, P));
    let up = [0, 0, 1];
    if (c && c.s) up = vunit(c.rD || c.s.r);
    let u3 = vsub(up, vscale(Ld, vdot(up, Ld)));
    if (vnorm(u3) < 1e-6) u3 = vperp(Ld);
    u3 = vunit(u3);
    const u2 = vcross(u3, Ld);
    const D = vadd(
      vadd(
        vscale(Ld, Math.cos(prm.el) * Math.cos(prm.az)),
        vscale(u2, Math.cos(prm.el) * Math.sin(prm.az)),
      ),
      vscale(u3, Math.sin(prm.el)),
    );
    return {
      pos: keepAboveGround(P, vscale(D, -dist), t),
      up: u3,
      look: vsub(PL, P),
      center: false,
    };
  }
  if (mode === "site") {
    // a camera on the ground by the launch site, looking up at the target
    const g = groundSite(t);
    if (g) {
      const site = sitePosEcl(g.body, g.lat, g.lon, g.alt, t);
      return {
        pos: vsub(vadd(helio(g.body, t).r, site), P),
        up: localFrame(g.body, site, t).up,
        look: [0, 0, 0],
        center: false,
      };
    }
    mode = "chase";
  }
  if (mode === "from") {
    // a camera on another craft (the station's windows), looking at the target
    const fc = prm.from && craftById(prm.from.slice(4));
    if (fc && fc.P && fc.s) {
      const F = lvlh(fc.rD || fc.s.r, fc.vD || fc.s.v),
        off = prm.off || [0, 0, 0],
        pos = vadd(vsub(fc.P, P), fromLvlh(F, vscale(off, 0.001)));
      return {
        pos,
        up: Math.abs(vdot(vunit(pos), F.z)) > 0.85 ? F.x : F.z,
        look: [0, 0, 0],
        center: false,
      };
    } // looking straight down: keep the direction of flight up the frame
    mode = "chase";
  }
  let e1 = [1, 0, 0],
    e2 = [0, 1, 0],
    e3 = [0, 0, 1];
  if (mode === "chase") {
    if (c && c.s) {
      const rr = c.rD || c.s.r,
        vv0 = c.vD || c.s.v;
      const up = vunit(rr);
      let vh = vsub(vv0, vscale(up, vdot(vv0, up)));
      if (vnorm(vh) < 1e-6) vh = vperp(up);
      e1 = vunit(vh);
      e3 = up;
      e2 = vcross(e3, e1);
    } else if (CAM.target.startsWith("body:")) {
      const name = CAM.target.slice(5);
      const pole = name === "sun" ? [0, 0, 1] : bodyPoleEcl(name, t);
      e3 = pole;
      e1 = vperp(pole);
      e2 = vcross(e3, e1);
    }
  }
  const ce = Math.cos(prm.el),
    se = Math.sin(prm.el),
    ca = Math.cos(prm.az),
    sa = Math.sin(prm.az);
  const A = (mode === "chase" && prm.aim) || [0, 0, 0]; // the point the camera looks at, relative to P (e.g. halfway up a standing rocket)
  const off = keepAboveGround(
    P,
    vadd(
      A,
      vadd(
        vadd(vscale(e1, dist * ce * ca), vscale(e2, dist * ce * sa)),
        vscale(e3, dist * se),
      ),
    ),
    t,
  );
  const up = mode === "top" ? vadd(vscale(e1, -ca), vscale(e2, -sa)) : e3;
  return { pos: off, up, look: A, center: true, basis: [e1, e2, e3] };
}
function setPose(pose) {
  const cam = R.camera;
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
  cam.up.set(pose.up[0], pose.up[1], pose.up[2]);
  _look.set(pose.look[0], pose.look[1], pose.look[2]);
  cam.lookAt(_look);
  if (CAM.roll) cam.rotateZ(CAM.roll);
}
// ---------------- auto-follow director ----------------
// Picks the craft where the action is and a framing for each situation (pad, ascent, burn, entry,
// parachutes, landing, surface, low orbit, coast toward the next destination) and blends between shots.
const DIR = {
  key: "",
  since: 0,
  blend: null,
  offAz: 0,
  offEl: 0,
  zoomK: 1,
  lensUser: null,
  lastT: null,
  dist: null,
  prm: null,
  shot: null,
};
function activeCraft(t) {
  const L = craftById("lander");
  if (L && L.s && t >= L.o.t0 + 1 && t <= L.o.t1 - 1) return L;
  return craftById("ship");
}
function domRaw(P, t) {
  const d = (b) => vnorm(vsub(P, planetHelio(b, t).r));
  if (d("moon") < BODIES.moon.soi) return "moon";
  if (d("earth") < BODIES.earth.soi) return "earth";
  if (d("mars") < BODIES.mars.soi) return "mars";
  return "sun";
}
function domTimeline(md) {
  // where the primary craft is, sampled over the mission: [{t, b}] at each change of dominant body
  if (md.domTL) return md.domTL;
  const out = [];
  let prev = null;
  const dt = Math.max(600, (md.tEnd - md.M.t0) / 4000);
  for (let t = md.M.t0; t <= md.tEnd; t += dt) {
    const s = md.ship.stateAt(t);
    if (!s) continue;
    const b = domRaw(vadd(planetHelio(s.ref, t).r, s.r), t);
    if (b !== prev) {
      out.push({ t, b });
      prev = b;
    }
  }
  md.domTL = out;
  return out;
}
function nextDestination(md, t, cur) {
  for (const x of domTimeline(md))
    if (x.t > t && x.b !== cur && x.b !== "sun") return x.b;
  const leg = (md.cfg.legs || []).find(
    (l) => isoToT(l.t) > t && l.body !== cur && BODIES[l.body],
  ); // e.g. Jupiter, the design point beyond the simulated flight
  return leg ? leg.body : null;
}
function directorShot(c, t) {
  const md = MV.md;
  const s = c.s;
  if (!s) return null;
  const ex = s.extra || {};
  const cfgL = cfgAt(c, t);
  const L =
    Math.max(
      (c.cur && (c.cur.userData.sizeM || c.cur.userData.len)) ||
        (cfgL && cfgL.key === "launch" ? md.L.height : 10),
      2,
    ) * 0.001; // vehicle size, km
  const body = c.dom || s.ref;
  const R0 = body === "sun" ? 0 : surfaceRadius(body);
  const alt = body === "sun" ? Infinity : vnorm(c.rD || s.r) - R0;
  const tIns =
    md.ship && md.ship.segs.length ? md.ship.segs[0].t1 : md.M.t0 + 600;
  const sunAz = () => {
    const p = poseFor("chase", { az: 0, el: 0, dist: 1 }, c.P, t);
    const [e1, e2] = p.basis;
    const sd = vunit(vscale(c.P, -1));
    return Math.atan2(vdot(sd, e2), vdot(sd, e1));
  };
  if (c.o.id === "ship" && (s.pad || t < md.M.t0 + 45)) {
    // the whole vehicle, pad to tip, in the rows the HUD leaves free
    const shot = {
      key: "pad",
      mode: "chase",
      az: sunAz() + 38 * DEG,
      el: 4 * DEG,
      dist: L * 4.2,
      lens: 35,
      label: "Launch",
    };
    const blk = MV.pad && MV.pad.userData.block; // not through a tower: round to the nearer side of it
    if (blk)
      for (let k = 0; k < 4; k++) {
        let moved = false;
        for (const [a, w] of blk) {
          const d = wrapPi(shot.az - a * DEG);
          if (Math.abs(d) < w * DEG - 1e-9) {
            shot.az = a * DEG + (d < 0 ? -w : w) * DEG;
            moved = true;
          }
        }
        if (!moved) break;
      }
    const B = screenBand(),
      m = (B.bot - B.top) * 0.07,
      f = fitColumn(standingHeight(c, L), shot.el, B.top + m, B.bot - m * 0.6);
    if (f) {
      shot.dist = f.dist;
      shot.aimH = f.aimH;
    }
    return shot;
  }
  // Launched in twilight: once the vehicle climbs into sunlight over the dark ground, watch from the ground by the launch site
  // as its exhaust lights up against the sky (app/47_exhaust.js)
  if (
    c.o.id === "ship" &&
    t > md.M.t0 + 75 &&
    t < tIns + 90 &&
    twilightLaunch(md, c, t)
  )
    return {
      key: "twilight",
      mode: "site",
      az: 0,
      el: 0,
      dist: 1,
      lens: 20,
      label: "Exhaust in sunlight over the dark ground",
      blend: 1,
    };
  if (c.o.id === "ship" && t < tIns + 5) {
    let dist = L * (4.5 + (4 * Math.min(Math.max(alt, 0), 100)) / 100);
    const el = 9 * DEG;
    // the camera looks at the engines, so the vehicle stands above the centre of the frame: back off far enough on wide screens to keep its nose below the top bar
    const B = screenBand(),
      p1 = R.height / 2 - (B.top + (B.bot - B.top) * 0.04);
    if (p1 > 20)
      dist = Math.max(
        dist,
        standingHeight(c, L) *
          ((Math.cos(el) * R.pxPerRad) / p1 + Math.sin(el)),
      );
    return {
      key: "ascent",
      mode: "chase",
      az: 200 * DEG,
      el,
      dist,
      lens: 35,
      label: "Ascent",
      blend: 4500,
    };
  }
  if (isShuttle(md)) {
    const sh = shuttleShot(c, t, s, ex, cfgL, L);
    if (sh) return sh;
  }
  if (ex.chute)
    return {
      key: "chute",
      mode: "chase",
      az: 120 * DEG,
      el: -8 * DEG,
      dist: Math.max(L * 25, 0.09),
      lens: 35,
      drift: 0.05,
      label: "Parachutes",
    };
  if ((ex.heat > 2 || ex.q > 300) && alt < 140)
    return {
      key: "entry",
      mode: "chase",
      az: 65 * DEG,
      el: 8 * DEG,
      dist: L * 7,
      lens: 35,
      label: "Entry",
    };
  if (s.surface || (cfgL && cfgL.landed))
    return {
      key: "surface",
      mode: "chase",
      az: 150 * DEG,
      el: 10 * DEG,
      dist: Math.max(L * 6, 0.025),
      lens: 35,
      drift: 0.025,
      label: "Surface",
    };
  if (s.T > 0) {
    if (alt < 30)
      return {
        key: "landing",
        mode: "chase",
        az: 140 * DEG,
        el: 6 * DEG,
        dist: Math.max(L * 5, 0.03),
        lens: 35,
        label: "Powered flight near the ground",
      };
    return {
      key: "burn",
      mode: "chase",
      az: 160 * DEG,
      el: 18 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Engine burn",
    };
  }
  if (body !== "sun" && alt < R0 * 0.6)
    return {
      key: "orbit-" + body,
      mode: "chase",
      az: 195 * DEG,
      el: 22 * DEG,
      dist: Math.max(L * 6, 0.03),
      lens: 35,
      label: "Orbit",
    };
  // coasting: craft in the foreground, the body it is heading for (or orbiting) behind it
  let look = null;
  if (body !== "sun") {
    const vr = vdot(vunit(c.rD), c.vD);
    if (vr < 0 || alt < 3 * R0) look = body;
  }
  if (!look)
    look = nextDestination(md, t, body) || (body !== "sun" ? body : "earth");
  return {
    key: "coast-" + look,
    mode: "lookat",
    look: "body:" + look,
    az: 7 * DEG,
    el: 4 * DEG,
    dist: Math.max(L * 4, 0.025),
    lens: 50,
    drift: 0.006,
    label: "Coasting toward " + BODIES[look].name,
  };
}
// Space Shuttle: proximity operations seen from the station, the docked stack, the deploy, the glide to the runway
// the ground at the launch site in twilight or darkness (the Sun more than 2° below the horizon) while the vehicle, high up, is
// in sunlight
function twilightLaunch(md, c, t) {
  const S = LAUNCH_SITES[md.cfg.site];
  if (!S || !c.s || c.dom !== "earth" || !EXH.mesh) return false;
  const E = helio("earth", t).r,
    sd = vunit(vscale(E, -1)),
    site = sitePosEcl("earth", S.lat, S.lon, 0, t);
  if (Math.asin(clamp(vdot(vunit(site), sd), -1, 1)) * RAD > -2) return false;
  const r = c.rD || c.s.r,
    L = exhSunlight(r[0], r[1], r[2], sd);
  return L[1] > 0.25;
}
function shuttleShot(c, t, s, ex, cfgL, L) {
  if (c.o.id !== "ship" || !cfgL) return null;
  const ph = ex.phase || "",
    iss = craftById("iss");
  if (cfgL.sc === "shuttle") {
    const att = cfgL.att;
    if (
      iss &&
      iss.P &&
      c.P &&
      /^(rbar|rpm|vbar|fly)$/.test(att || "") &&
      !cfgL.docked
    ) {
      const d = vnorm(vsub(c.P, iss.P)) * 1000; // m
      if (d < 1500 && !(att === "vbar" && d < 75)) {
        const v = att === "vbar" || att === "fly";
        return {
          key: "from-iss-" + (v ? "v" : "r"),
          mode: "from",
          from: "obj:iss",
          off: v ? [23, -7, 5] : [-3, -7, -9],
          lens: clamp(Math.round((0.24 * d) / 5) * 5, 24, 400),
          dist: L * 3,
          label: "Seen from the station",
          blend: 2500,
        };
      }
    }
    if (
      cfgL.docked ||
      (att === "vbar" && iss && iss.P && c.P && vnorm(vsub(c.P, iss.P)) < 0.075)
    )
      return {
        key: "docked",
        mode: "chase",
        az: 300 * DEG,
        el: 24 * DEG,
        dist: 0.21,
        lens: 35,
        drift: 0.01,
        label: "Docked to the station",
      };
    if (cfgL.bayT != null && t >= cfgL.bayT - 30 && t < cfgL.bayT + 240)
      return {
        key: "bay-doors",
        mode: "chase",
        az: 125 * DEG,
        el: 42 * DEG,
        dist: Math.max(L * 1.9, 0.055),
        lens: 35,
        drift: 0.006,
        label:
          cfgL.bay === "open"
            ? "Payload bay doors opening"
            : "Payload bay doors closing",
      };
    if (att === "deploy")
      return {
        key: "deploy",
        mode: "chase",
        az: 140 * DEG,
        el: 30 * DEG,
        dist: Math.max(L * 2.4, 0.07),
        lens: 35,
        drift: 0.008,
        label: "Payload deploy",
      };
  }
  if (ph === "entry" && (ex.heat > 1 || ex.q > 200))
    return {
      key: "sh-entry",
      mode: "chase",
      az: 112 * DEG,
      el: -3 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Entry",
    };
  if (/TAEM/.test(ph))
    return {
      key: "taem",
      mode: "chase",
      az: 150 * DEG,
      el: 7 * DEG,
      dist: L * 3.2,
      lens: 35,
      label: "Gliding to the runway",
    };
  if (/heading alignment/.test(ph))
    return {
      key: "hac",
      mode: "chase",
      az: 215 * DEG,
      el: 14 * DEG,
      dist: L * 3.4,
      lens: 35,
      label: "Heading alignment cone",
    };
  if (/outer glideslope/.test(ph))
    return {
      key: "ogs",
      mode: "chase",
      az: 162 * DEG,
      el: 5 * DEG,
      dist: L * 2.8,
      lens: 35,
      label: "Final approach",
    };
  if (/flare|rollout/.test(ph))
    return {
      key: "touchdown",
      mode: "chase",
      az: 120 * DEG,
      el: 3 * DEG,
      dist: L * 2.3,
      lens: 35,
      label: "Touchdown",
    };
  if (s.surface)
    return {
      key: "surface",
      mode: "chase",
      az: 145 * DEG,
      el: 9 * DEG,
      dist: L * 2.6,
      lens: 35,
      drift: 0.02,
      label: "Wheel stop",
    };
  return null;
}
function directorUpdate(t, realDt) {
  const md = MV.md;
  const c = activeCraft(t);
  if (!c) return;
  const now = performance.now();
  const jump =
    DIR.lastT == null ||
    Math.abs(t - DIR.lastT) >
      Math.max(120, (STATE.playing ? STATE.rate : 1) * 0.6);
  DIR.lastT = t;
  if (CAM.target !== "obj:" + c.o.id) {
    if (jump) {
      CAM.target = "obj:" + c.o.id;
      CAM.trans = null;
      syncCamUI();
    } else setTarget("obj:" + c.o.id, { force: true, keepMode: true });
  }
  const shot = directorShot(c, t);
  if (!shot) return;
  if (shot.key !== DIR.key) {
    if (!jump && DIR.key)
      DIR.blend = {
        pos: R.camera.position.clone(),
        quat: R.camera.quaternion.clone(),
        up: R.camera.up.clone(),
        center: DIR.prm ? DIR.prm.mode !== "lookat" : true,
        t0: now,
        dur: shot.blend || 1800,
      };
    else DIR.blend = null;
    DIR.key = shot.key;
    DIR.since = now;
    DIR.offAz = 0;
    DIR.offEl = 0;
    DIR.zoomK = 1;
    DIR.lensUser = null;
    DIR.dist = null;
    DIR.aimH = null;
  }
  const drift = shot.drift ? ((now - DIR.since) / 1000) * shot.drift : 0;
  const target = shot.dist * DIR.zoomK;
  DIR.dist =
    DIR.dist == null || jump
      ? target
      : Math.exp(
          Math.log(DIR.dist) +
            (Math.log(target) - Math.log(DIR.dist)) * Math.min(1, realDt * 1.5),
        );
  if (shot.aimH == null)
    DIR.aimH = null; // look above the base point (a standing rocket is framed around its middle)
  else
    DIR.aimH =
      DIR.aimH == null || jump
        ? shot.aimH
        : DIR.aimH + (shot.aimH - DIR.aimH) * Math.min(1, realDt * 1.5);
  const aim =
    DIR.aimH != null && c.s ? vscale(vunit(c.rD || c.s.r), DIR.aimH) : null;
  let az, el;
  if (shot.mode === "lookat") {
    // keep the craft inside the middle of the film frame, whatever the lens and screen shape
    const fr = frameRect(),
      tH = 18 / CAM.lens,
      tV = (tH * fr.h) / fr.w;
    const aL = Math.atan(0.42 * tH),
      eL = Math.atan(0.5 * tV);
    DIR.offAz = clamp(DIR.offAz, -aL - shot.az, aL - shot.az);
    DIR.offEl = clamp(DIR.offEl, -eL - shot.el, eL - shot.el);
    az = clamp(
      shot.az + DIR.offAz + Math.sin(drift) * Math.min(0.05, aL * 0.3),
      -aL,
      aL,
    );
    el = clamp(shot.el + DIR.offEl, -eL, eL);
  } else {
    az = shot.az + DIR.offAz + drift;
    el = clamp(shot.el + DIR.offEl, -1.5, 1.5);
  }
  DIR.prm = {
    mode: shot.mode,
    look: shot.look,
    from: shot.from,
    off: shot.off,
    az,
    el,
    dist: DIR.dist,
    aim,
  };
  DIR.shot = shot;
  const lens = DIR.lensUser || shot.lens;
  if (Math.abs(CAM.lens - lens) > 0.5) {
    CAM.lens = jump
      ? lens
      : Math.exp(
          Math.log(CAM.lens) +
            (Math.log(lens) - Math.log(CAM.lens)) * Math.min(1, realDt * 2),
        );
    applyLens();
    syncCamUI();
  }
  if (CAM.look !== shot.look && shot.look) CAM.look = shot.look;
}
function updateCamera(t, realDt) {
  const cam = R.camera;
  if (CAM.mode === "auto" && MV.md) directorUpdate(t, realDt);
  let P = targetPos(CAM.target, t);
  if (!P) P = targetPos("obj:ship", t) || helio("earth", t).r; // target not in flight yet (e.g. a lander still docked): follow the ship meanwhile
  // transition between targets
  let dist = CAM.dist;
  if (CAM.trans) {
    const f = clamp((performance.now() - CAM.trans.t0) / CAM.trans.dur, 0, 1);
    const e = f * f * (3 - 2 * f);
    const from = targetPos(CAM.trans.fromId, t) || CAM.trans.fromP;
    P = vlerp(from, P, e);
    dist = Math.exp(
      Math.log(CAM.trans.distFrom) +
        (Math.log(CAM.trans.distTo) - Math.log(CAM.trans.distFrom)) * e,
    );
    if (f >= 1) CAM.trans = null;
  }
  const rT = targetRadius(CAM.target);
  if (CAM.mode === "ground") {
    const g = groundSite(t);
    if (g) {
      const Bp = helio(g.body, t).r;
      const site = sitePosEcl(g.body, g.lat, g.lon, g.alt, t);
      const Pobs = vadd(Bp, site);
      R.O = Pobs;
      cam.position.set(0, 0, 0);
      const lf = localFrame(g.body, site, t);
      _up.set(lf.up[0], lf.up[1], lf.up[2]);
      cam.up.copy(_up);
      if (CAM.ground.track) {
        const d = vsub(P, Pobs);
        _look.set(d[0], d[1], d[2]);
        if (_look.length() < 1e-6) _look.copy(_up);
        cam.lookAt(_look);
        const dn = vunit(d);
        CAM.ground.pitch = Math.asin(clamp(vdot(dn, lf.up), -1, 1));
        CAM.ground.yaw = Math.atan2(vdot(dn, lf.east), vdot(dn, lf.north));
      } else {
        const cp = Math.cos(CAM.ground.pitch);
        const d = vadd(
          vadd(
            vscale(lf.north, cp * Math.cos(CAM.ground.yaw)),
            vscale(lf.east, cp * Math.sin(CAM.ground.yaw)),
          ),
          vscale(lf.up, Math.sin(CAM.ground.pitch)),
        );
        _look.set(d[0], d[1], d[2]);
        cam.lookAt(_look);
      }
      if (CAM.roll) cam.rotateZ(CAM.roll);
      CAM.groundInfo = g;
      CAM.camDist = vnorm(vsub(P, Pobs));
      return;
    }
  }
  CAM.groundInfo = null;
  R.O = P;
  if (CAM.mode === "auto" && MV.md && DIR.prm) {
    const pose = poseFor(DIR.prm.mode, DIR.prm, P, t);
    setPose(pose);
    if (DIR.blend) {
      const f = smoothstep((performance.now() - DIR.blend.t0) / DIR.blend.dur);
      if (f >= 1) DIR.blend = null;
      else {
        const pT = cam.position.clone(),
          qT = cam.quaternion.clone();
        const pos = vlerp(
          [DIR.blend.pos.x, DIR.blend.pos.y, DIR.blend.pos.z],
          [pT.x, pT.y, pT.z],
          f,
        );
        const safe = keepAboveGround(P, pos, t);
        cam.position.set(safe[0], safe[1], safe[2]);
        if (DIR.blend.center && pose.center) {
          cam.up
            .copy(DIR.blend.up)
            .lerp(_up.set(pose.up[0], pose.up[1], pose.up[2]), f)
            .normalize();
          cam.lookAt(pose.look[0], pose.look[1], pose.look[2]);
          if (CAM.roll) cam.rotateZ(CAM.roll);
        } else cam.quaternion.slerpQuaternions(DIR.blend.quat, qT, f);
      }
    }
    CAM.camDist =
      DIR.prm.mode === "site" ? cam.position.length() : DIR.prm.dist;
    return;
  }
  const minD = rT > 0 ? rT * 1.003 + 0.002 : 0.004;
  dist = Math.max(dist, minD);
  if (!CAM.trans) CAM.dist = Math.max(CAM.dist, minD);
  const mode = CAM.mode === "auto" ? "chase" : CAM.mode;
  setPose(
    poseFor(mode, { az: CAM.az, el: CAM.el, dist, look: CAM.look }, P, t),
  );
  CAM.camDist = dist;
}
// ---------------- input ----------------
function initCameraInput() {
  const el = $("#gl");
  const ptrs = new Map();
  let pinch0 = null,
    lastTap = 0;
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("pointerdown", (e) => {
    el.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      b: e.button,
      shift: e.shiftKey,
    });
    el.classList.add("dragging");
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch0 = {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        dist: CAM.dist,
        lens: CAM.lens,
        zk: DIR.zoomK,
      };
    }
  });
  el.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = pinch0.d / Math.max(d, 1);
      if (CAM.mode === "ground") CAM.lens = clamp(pinch0.lens / k, 8, 3200);
      else if (CAM.mode === "auto") DIR.zoomK = clamp(pinch0.zk * k, 0.05, 2e4);
      else CAM.dist = clamp(pinch0.dist * k, 0.004, 5e10);
      CAM.trans = null;
      applyLens();
      syncCamUI();
      return;
    }
    const fovK = Math.min(1, CAM.lens > 0 ? 50 / CAM.lens : 1);
    if (p.b === 2 || p.shift) {
      CAM.roll += dx * 0.004;
      return;
    }
    if (CAM.mode === "ground") {
      CAM.ground.track = false;
      CAM.ground.yaw -= dx * 0.0035 * fovK;
      CAM.ground.pitch = clamp(
        CAM.ground.pitch + dy * 0.0035 * fovK,
        -1.55,
        1.55,
      );
      return;
    }
    if (CAM.mode === "auto") {
      DIR.offAz -= dx * 0.006;
      DIR.offEl = clamp(DIR.offEl + dy * 0.006, -1.5, 1.5);
      DIR.blend = null;
      return;
    }
    CAM.az -= dx * 0.006;
    CAM.el = clamp(CAM.el + dy * 0.006, -1.55, 1.55);
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch0 = null;
    if (!ptrs.size) el.classList.remove("dragging");
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      if (CAM.mode === "ground") {
        CAM.lens = clamp(CAM.lens * Math.exp(-dy * 0.0012), 8, 3200);
        applyLens();
        syncCamUI();
        return;
      }
      if (CAM.mode === "auto") {
        DIR.zoomK = clamp(DIR.zoomK * Math.exp(dy * 0.0012), 0.05, 2e4);
        return;
      }
      CAM.trans = null;
      CAM.dist = clamp(CAM.dist * Math.exp(dy * 0.0012), 0.004, 5e10);
    },
    { passive: false },
  );
  el.addEventListener("dblclick", (e) => {
    // pick nearest label
    let best = null,
      bd = 40;
    for (const lbl of [...$$("#labels .lbl")]) {
      const r = lbl.getBoundingClientRect();
      if (r.left < -1000) continue;
      const d = Math.hypot(r.left + 4 - e.clientX, r.top + 7 - e.clientY);
      if (d < bd) {
        bd = d;
        best = lbl;
      }
    }
    if (best) best.click();
  });
}
function syncCamUI() {
  const sm = $("#selMode");
  if (sm.value !== CAM.mode) sm.value = CAM.mode;
  const st = $("#selTarget");
  if (st.value !== CAM.target) st.value = CAM.target;
  const sl = $("#selLook");
  if (sl.value !== CAM.look) sl.value = CAM.look;
  const ln = $("#selLens");
  const lv = String(Math.round(CAM.lens));
  if (![...ln.options].some((o) => o.value === lv)) {
    const o =
      ln.querySelector("option[data-custom]") ||
      h("option", { "data-custom": "1" });
    o.value = lv;
    o.textContent = lv + " mm";
    if (!o.parentNode) ln.prepend(o);
  }
  ln.value = lv;
  $("#lookWrap").hidden = CAM.mode !== "lookat";
}

// ==== 60_telemetry.js
// ============================================================================
// Telemetry: physics read-outs for the followed craft at the current instant.
// ============================================================================
const PHASE_TEXT = [
  [
    /ignition/i,
    "Ignition: the engines light seconds before liftoff and build up to full thrust while hold-down clamps keep the rocket on the pad. The computers check every engine and can still shut everything down safely; only then do the clamps let go. Water pours onto the pad to absorb heat and sound — the white clouds are mostly steam.",
  ],
  [
    /on the pad/i,
    "Final countdown. The tanks are topped off and the vehicle stands on the pad, held down by clamps until the engines reach full thrust.",
  ],
  [/^vertical/i, EXPLAIN.vertical],
  [
    /pitch-?over/i,
    "Pitch-over: clear of the tower, the rocket tips a few degrees toward its launch azimuth. From here on it flies nose into the airflow and gravity bends the path toward horizontal.",
  ],
  [/gravity turn/i, EXPLAIN.gravityTurn],
  [
    /closed-loop/i,
    "Closed-loop guidance: above the dense atmosphere the flight computer steers to hit the target orbit exactly — altitude, speed and flight-path angle.",
  ],
  [
    /stranded|shortfall|drift/i,
    "The vehicle did not have enough propellant for this burn, so it stays on the trajectory it reached. Choose a more capable rocket or a lighter payload in the setup.",
  ],
  [/parking|low Earth orbit|Earth orbits/i, EXPLAIN.parking],
  [
    /high Earth orbit/i,
    "High Earth orbit: an elongated orbit reaching tens of thousands of kilometres, used to check out the spacecraft before committing to the Moon.",
  ],
  [/trans-lunar injection/i, EXPLAIN.tli],
  [/trans-mars|departure burn/i, EXPLAIN.tmi],
  [/trans-earth injection/i, EXPLAIN.tei],
  [
    /translunar|outbound coast/i,
    EXPLAIN.coast +
      " The craft climbs out of Earth’s gravity well, slowing from 10.8 km/s to under 1 km/s near the Moon.",
  ],
  [/free return|lunar flyby|circumlunar/i, EXPLAIN.freeReturn],
  [/lunar orbit insertion|LOI/i, EXPLAIN.loi],
  [
    /lunar orbit|orbit around the Moon/i,
    "Lunar orbit: about 2 hours per revolution at 110 km altitude. Each pass behind the Moon cuts radio contact with Earth.",
  ],
  [
    /approach to (earth|mars|the moon)|final approach/i,
    "Final approach: the craft falls toward the planet, gaining speed. A last trajectory correction sets the entry angle — too steep and the g-load and heating are lethal, too shallow and the craft skips off the atmosphere.",
  ],
  [
    /powered descent|braking phase|approach phase|terminal|landing burn/i,
    EXPLAIN.pdi,
  ],
  [
    /sky crane/i,
    "Sky crane: the descent stage hovers and lowers the rover on bridles, then flies away to crash at a safe distance.",
  ],
  [
    /driving/i,
    "Driving: each of the six wheels has its own motor; top speed is 4.2 cm/s (0.15 km/h). AutoNav builds a 3D map of the ground ahead and steers around hazards by itself, because commands from Earth take 5–20 minutes to arrive. Drives are planned on Earth the day before and run around local midday.",
  ],
  [/surface|landed|touchdown|making propellant/i, EXPLAIN.surface],
  [/lunar ascent|mars ascent|ascent/i, EXPLAIN.ascent],
  [/rendezvous|docking/i, EXPLAIN.rendezvous],
  [
    /transearth|return coast|return to Earth/i,
    "Coasting home: Earth’s gravity accelerates the craft to about 11 km/s by the time it reaches the atmosphere.",
  ],
  [
    /parachute/i,
    "Parachutes: drogues stabilise the capsule at supersonic or high-subsonic speed, then the mains slow it to a few metres per second.",
  ],
  [
    /skip/i,
    "Skip entry: the capsule uses lift to bounce back out of the upper atmosphere, then re-enters — spreading out the heat and extending the range.",
  ],
  [/entry|plasma/i, EXPLAIN.entry],
  [/edl/i, EXPLAIN.edl],
  [/mars orbit insertion|capture/i, EXPLAIN.moi],
  [
    /mars orbit|orbit around mars|parking orbit at mars|aerobrak/i,
    "Orbiting Mars: one Martian day (sol) is 24 h 37 min. Elliptical orbits are cheap to enter and let the orbiter survey the surface below.",
  ],
  [/flyby|gravity assist/i, EXPLAIN.flyby],
  [/cruise|heliocentric|solar orbit|interplanetary/i, EXPLAIN.cruise],
  [
    /departure hyperbola/i,
    "Departure hyperbola: the craft is escaping Earth. Its speed relative to Earth tends toward v∞, the hyperbolic excess speed.",
  ],
  [
    /spent|stage/i,
    "A spent stage: empty tanks and engines, discarded to save mass.",
  ],
  [
    /recovery/i,
    "Recovery: ships and helicopters reach the capsule within the hour.",
  ],
];
// Space Shuttle flights: checked before the general texts (their phase names overlap: entry, approach, docking)
const SHUTTLE_TEXT = [
  [
    /coasting with the tank/i,
    "Main engine cutoff. The empty External Tank is still attached; eighteen seconds later it is released and the orbiter moves clear with its small reaction-control jets.",
  ],
  [
    /External Tank — falling/i,
    "The External Tank on its own: 26 tonnes of empty aluminium. Its orbit dips into the atmosphere, so half an orbit later it breaks up and falls into a remote stretch of ocean — the only part of the Shuttle not reused.",
  ],
  [
    /climbing to apogee|MECO — coasting/i,
    "Coasting up to the high point of the orbit. The low point is still inside the atmosphere; at the top the OMS engines will fire to lift it out (OMS-2).",
  ],
  [
    /\bOMS-\d|orbit insertion|circularis/i,
    "Orbital Maneuvering System: two 27 kN engines in the pods beside the tail. Their propellants — monomethylhydrazine and nitrogen tetroxide — ignite on contact, so the engines start reliably every time.",
  ],
  [
    /NC-\d|catching up|closing in/i,
    "Phasing: the orbiter starts thousands of kilometres behind the station. A lower orbit is a faster one, so each burn adjusts the height to close the gap at just the right rate — arriving half an orbit after terminal initiation.",
  ],
  [
    /terminal initiation|TI —|closing on the station/i,
    "Terminal initiation: the burn that commits to the rendezvous. Half an orbit later the orbiter arrives 600 m below the station; the crew flies the last part by hand, watching radar and laser range-finder data.",
  ],
  [
    /R-bar approach/i,
    "R-bar approach: the orbiter closes in from directly below the station, along the line to Earth’s centre. Orbital mechanics help: anything below the station tends to drift up toward it, so the approach is gentle.",
  ],
  [
    /R-bar pitch/i,
    "R-bar pitch maneuver: a slow 360° back-flip, 183 m below the station. For nine minutes the belly faces the station crew, who photograph every heat-shield tile — a check added after Columbia was lost in 2003.",
  ],
  [
    /moving to the V-bar/i,
    "Swinging to the V-bar: a quarter circle up and in front of the station, to its line of flight. The orbiter pitches nose-up so its docking port faces the station.",
  ],
  [
    /docked to the ISS/i,
    "Docked: orbiter and station fly as one 500-tonne spacecraft. The station’s robot arm moves cargo between them, and the orbiter can even draw power from the station to stay longer.",
  ],
  [
    /backing away/i,
    "Undocking: springs push the spacecraft apart; the orbiter backs away slowly along the V-bar with its small jets, careful not to blast the station’s solar arrays.",
  ],
  [
    /flyaround/i,
    "Flyaround: a last lap around the station at about 180 m, so the crew can photograph every side of it for engineers on the ground.",
  ],
  [
    /V-bar approach|docking/i,
    "Final approach along the V-bar at a few centimetres per second. The docking mechanism’s capture ring latches on, then retracts to pull the two spacecraft together and seal the hatches.",
  ],
  [
    /deploy/i,
    "Payload deploy: the 15 m Canadarm, flown from the aft flight-deck windows, lifts the payload out of the bay, holds it while its systems come alive, and lets go.",
  ],
  [
    /hubble in orbit/i,
    "Free flying: the Hubble Space Telescope on its own, 615 km up, its two solar array wings unrolled.",
  ],
  [
    /deorbit preparations|deorbit burn/i,
    "Deorbit: about an hour before landing, half a world away from the runway, the orbiter fires both OMS engines against its direction of flight. The orbit’s far side drops into the atmosphere — there is no turning back.",
  ],
  [
    /falling toward the atmosphere/i,
    "Falling toward the atmosphere. The orbiter has turned around to fly nose-first with its nose 40° up, so the black heat-shield tiles on its belly will take the heat.",
  ],
  [
    /entry/i,
    "Entry: the orbiter meets the air at 7.8 km/s and a 40° angle of attack. It is a glider: it steers by banking, and each roll reversal swings its path back toward the runway. The tiles on its belly reach 1,260 °C, the wing leading edges 1,500 °C.",
  ],
  [
    /TAEM/i,
    "Terminal area energy management: below 25 km and Mach 2.5 the orbiter is a supersonic glider. The computers manage its energy — speed and height — so it arrives at the runway with just enough to land.",
  ],
  [
    /heading alignment/i,
    "Heading alignment cone: a turn around an imaginary cylinder to line up with the runway. Wider for more energy, tighter for less: this is the last big correction.",
  ],
  [
    /outer glideslope/i,
    "Outer glideslope: a 19° dive at about 290 knots — seven times steeper than an airliner’s. The split rudder opens as a speed brake to hold the airspeed.",
  ],
  [
    /flare|inner glideslope/i,
    "Preflare and flare: the commander pulls the nose up to flatten the dive onto a 1.5° glideslope, the landing gear comes down, and the orbiter floats toward the runway, slowing to about 200 knots.",
  ],
  [
    /rollout/i,
    "Rollout: main gear first at about 200 knots (370 km/h), then the nose comes down; the drag chute and the brakes stop the 100-tonne glider within about 2.7 km.",
  ],
  [
    /wheel stop|on the runway/i,
    "“Wheel stop.” Ground crews in protective suits approach first, checking for toxic propellant vapours; purge and cooling air is connected to the orbiter before the crew can leave, about an hour later.",
  ],
  [
    /^in orbit|flight tests|in orbit —/i,
    "In orbit: one lap every 90 minutes at about 28,000 km/h, sixteen sunrises and sunsets a day. The payload bay doors stay open: their inner faces are the radiators that keep the orbiter cool.",
  ],
];
const MARS_TEXT = [
  [
    /parachute/i,
    "Supersonic parachute: a 21.5 m disk-gap-band canopy opens at about Mach 1.7. The air is only 1 % as dense as Earth’s, so the parachute slows the craft to about 100 m/s — not enough to land.",
  ],
  [
    /powered|sky crane|terminal|approach/i,
    "Powered descent in thin Martian air: the final ~100 m/s must be removed by rocket engines. The radar measures altitude and terrain-relative navigation picks a safe spot.",
  ],
  [/entry|plasma/i, EXPLAIN.edl],
];
function explainPhase(...names) {
  const s = names.filter(Boolean).join(" | ");
  if (MV.md && isShuttle(MV.md))
    for (const [re, txt] of SHUTTLE_TEXT) if (re.test(s)) return txt;
  if (/\[mars\]/.test(s))
    for (const [re, txt] of MARS_TEXT) if (re.test(s)) return txt;
  for (const [re, txt] of PHASE_TEXT) if (re.test(s)) return txt;
  return "";
}
function computeTele(c, t) {
  if (!c || !c.s || !c.P) return null;
  const md = MV.md,
    s = c.s,
    P = c.P;
  const ref = c.dom || s.ref;
  const rD = c.rD || s.r,
    vD = c.vD || s.v;
  const Rb = ref === "sun" ? BODIES.sun.R : surfaceRadius(ref);
  const T = { c, s, ref, t };
  T.alt = vnorm(rD) - Rb;
  T.vIn = vnorm(vD);
  const rotB = ref === "earth" || ref === "mars" || ref === "moon";
  const vRel = rotB ? vsub(vD, vcross(bodyOmegaEcl(ref, t), rD)) : vD;
  T.vRel = vD;
  T.vSurf = vnorm(vRel);
  T.vVert = vdot(vD, vunit(rD));
  T.ll = ref !== "sun" ? subPointLL(ref, rD, t) : null;
  T.grav = GRAV_BODIES.map((b) => {
    const d = vsub(helio(b, t).r, P);
    const dist = vnorm(d);
    return {
      body: b,
      a: (BODIES[b].mu / (dist * dist)) * 1000,
      dir: vunit(d),
      dist,
    };
  }).sort((x, y) => y.a - x.a);
  T.dEarth = vnorm(vsub(P, helio("earth", t).r));
  T.dMoon = vnorm(vsub(P, helio("moon", t).r));
  T.dMars = vnorm(vsub(P, helio("mars", t).r));
  T.dSun = vnorm(P);
  T.light = T.dEarth / C_KMS;
  const m = s.m > 0 ? s.m : null;
  T.m = m;
  T.thrust = s.T || 0;
  T.thrustAcc = m && T.thrust ? T.thrust / m : 0;
  T.thrustDir = s.dir;
  const Dm = s.D ? vnorm(s.D) : 0;
  T.dragAcc = m ? Dm / m : 0;
  T.dragDir = s.D;
  const gLoc = BODIES[ref]
    ? (BODIES[ref].mu / Math.pow(Math.max(vnorm(rD), Rb), 2)) * 1000
    : 0;
  T.gLocal = gLoc;
  if (s.surface || s.pad) {
    T.proper = gLoc;
    T.properNote =
      s.pad && s.T > 0 ? "held down by clamps" : "standing on the surface";
  } else if (s.extra && s.extra.gload != null) {
    T.proper = s.extra.gload * G0;
  } else {
    const f = vadd(vscale(s.dir || [0, 0, 0], T.thrust), s.D || [0, 0, 0]);
    T.proper = m ? vnorm(f) / m : 0;
  }
  // orbit about the dominant body
  const b = ref;
  const r = rD,
    v = vD;
  T.orbBody = b;
  T.orbR = r;
  T.orbV = v;
  T.el = rv2coe(r, v, BODIES[b].mu);
  T.orbRb = b === "sun" ? BODIES.sun.R : surfaceRadius(b);
  T.vEsc = Math.sqrt((2 * BODIES[b].mu) / vnorm(r));
  // vehicle
  T.cfg = cfgAt(c, t);
  T.burn = md.burnAt(t, c.o.id);
  return T;
}
// ---------------- propulsion status: engines firing vs coasting (inertial flight) ----------------
const PSTAT = { cur: null, key: "" };
function engineName(T) {
  const md = MV.md,
    cf = T.cfg,
    L = md.L,
    s = T.s;
  if (cf && cf.key === "launch") {
    const st =
      L.stages.find((x) => x.id === (s.extra && s.extra.stage)) ||
      L.stages[cf.stFrom] ||
      L.stages[0];
    return `${st.n} × ${st.engine}`;
  }
  const x = md.poweredAt(T.t, T.c.o.id);
  const b = (x && x.burn) || T.burn;
  if (b && b.engine) return b.engine;
  const mod =
    md.SC.modules.DS ||
    md.SC.modules.LDR ||
    Object.values(md.SC.modules).find((m) => m.engine);
  if (mod && mod.engine) return mod.engine.name;
  const up = L.stages[L.stages.length - 1];
  return up ? `${up.n} × ${up.engine}` : ""; // e.g. Starship lands on its own upper-stage engines
}
function propStatus(T, t) {
  const md = MV.md;
  if (!md || !T) return null;
  const c = T.c,
    s = T.s,
    id = c.o.id;
  const cur = md.poweredAt(t, id),
    next = md.nextPowered(t, id);
  const short = (n) =>
    String(n || "")
      .split("—")[0]
      .trim();
  if (s.pad && s.ign)
    return {
      k: "burn",
      l: "IGNITION",
      name: "Ignition",
      d: `${engineCounts(s.ign.liq)} at ${Math.round(s.ign.f * 100)} % thrust · hold-down clamps holding · liftoff in ${fTime(Math.max(0, md.M.t0 - t))}`,
    };
  if (s.pad)
    return {
      k: "rest",
      l: "ON THE PAD",
      d: `liftoff in ${fTime(Math.max(0, md.M.t0 - t))}`,
    };
  if (cur && !s.surface && !(T.thrust > 0) && T.cfg && T.cfg.key === "launch")
    return {
      k: "burn",
      l: "STAGING",
      name: cur.name,
      d: `${cur.name} · engines off for a moment between stages`,
    };
  if ((T.thrust > 0 || cur) && !s.surface) {
    const nm = cur ? cur.name : "Engine burn";
    const parts = [nm];
    const eng = engineName(T);
    if (eng) parts.push(eng);
    if (T.thrustAcc > 0) parts.push(`${fx(T.thrustAcc / G0, 2)} g`);
    if (cur) parts.push(`${fTime(Math.max(0, cur.t1 - t))} left`);
    return { k: "burn", l: "ENGINE ON", name: nm, d: parts.join(" · ") };
  }
  const nxt = next
    ? `next burn: ${short(next.name)} in ${fTime(next.t0 - t)}`
    : "no more burns planned";
  if (s.surface)
    return {
      k: "rest",
      l: "ON THE SURFACE",
      d: `${BODIES[s.ref].name} · ${nxt}`,
    };
  const ex = s.extra || {};
  if (ex.chute)
    return {
      k: "aero",
      l: "ENGINES OFF",
      d: `under parachutes, descending at ${fSpeed(Math.abs(Math.min(T.vVert, 0)))}`,
    };
  if (isShuttle(md) && c.o.id === "ship") {
    // the orbiter after entry: a glider, then a vehicle rolling on its wheels
    const ph = ex.phase || "";
    if (/rollout/.test(ph))
      return {
        k: "aero",
        l: "ROLLOUT",
        d: `on the runway at ${fx((T.vSurf * 1000) / 0.5144, 0)} knots — ${T.cfg && T.cfg.dragChute ? "drag chute and brakes" : "brakes and air drag"} slowing the orbiter`,
      };
    if (/TAEM|alignment|glideslope|flare/.test(ph))
      return {
        k: "aero",
        l: "GLIDING",
        d: `engines off, trading height for speed — ${fx((T.vSurf * 1000) / 0.5144, 0)} knots, sinking ${fx(Math.max(0, -T.vVert * 1000), 0)} m/s`,
      };
  }
  if (T.dragAcc > 0.05 || ex.q > 50)
    return {
      k: "aero",
      l: "ENGINES OFF",
      d: `atmospheric entry — air drag is braking the craft (${fx(T.dragAcc / G0, 1)} g)`,
    };
  const ph = md.phaseAt(t);
  const fly = ph && /flyby|gravity assist/i.test(ph.name);
  const who = !fly
    ? ""
    : /lunar|moon/i.test(ph.name)
      ? "the Moon’s"
      : /mars/i.test(ph.name)
        ? "Mars’s"
        : /earth/i.test(ph.name)
          ? "Earth’s"
          : /venus/i.test(ph.name)
            ? "Venus’s"
            : /jupiter/i.test(ph.name)
              ? "Jupiter’s"
              : "the planet’s";
  return {
    k: "coast",
    l: "COASTING",
    d: `${fly ? `gravity assist, engines off — ${who} pull bends the path` : "inertial flight, engines off"} · ${nxt}`,
  };
}
function drawProp(T, t) {
  const el = $("#prop");
  const st = propStatus(T, t);
  PSTAT.cur = st;
  const met = t - MV.md.M.t0;
  if (!st || (met > -10.0001 && met < 0)) {
    if (!el.hidden) el.hidden = true;
    return;
  } // the big launch countdown already says it
  if (el.hidden) el.hidden = false;
  if (el.className !== st.k) el.className = st.k;
  const pl = el.children[1],
    pd = el.children[2];
  if (pl.textContent !== st.l) pl.textContent = st.l;
  if (pd.textContent !== st.d) pd.textContent = st.d;
}
const TELE = { built: null, els: {}, lastDraw: 0, objSel: "ship" };
function buildTelePanel() {
  const root = $("#tele");
  root.innerHTML = "";
  const kv = (id, k) => [
    h("div", { class: "k" }, k),
    h("div", { class: "v", id: "tv-" + id }, "—"),
  ];
  const sec = (title, rt, ...kids) =>
    h(
      "div",
      { class: "sec" },
      h(
        "h4",
        null,
        title,
        h(
          "span",
          { class: "rt", id: "trt-" + title.replace(/\W/g, "") },
          rt || "",
        ),
      ),
      ...kids,
    );
  root.append(
    h(
      "div",
      { class: "t-obj" },
      h("span", { id: "tv-obj" }, ""),
      h("span", { id: "tv-crew" }, ""),
    ),
    h(
      "div",
      { class: "t-phase" },
      h("span", { class: "chip", id: "tv-chip" }),
      h("span", { class: "name", id: "tv-phase" }, "—"),
    ),
    h("div", { class: "t-explain", id: "tv-explain" }),
    sec(
      "Flight",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("alt", "Altitude"),
        ...kv("vin", "Speed (inertial)"),
        ...kv("vsurf", "Speed over the surface"),
        ...kv("vvert", "Vertical speed"),
        ...kv("ll", "Ground track"),
        ...kv("dE", "Distance from Earth"),
        ...kv("dX", "Distance from Moon"),
        ...kv("light", "Radio delay (one way)"),
      ),
    ),
    sec(
      "Forces",
      "",
      h(
        "div",
        { class: "gauge" },
        h("span", { class: "big", id: "tv-g" }, "0.00"),
        h("span", { class: "unit" }, "g felt"),
        h("span", { class: "note", id: "tv-gnote" }, ""),
      ),
      h(
        "div",
        { class: "kv", style: "margin-top:6px" },
        ...kv("thr", "Thrust acceleration"),
        ...kv("drag", "Aerodynamic deceleration"),
      ),
      h(
        "div",
        { class: "note-s", style: "margin:8px 0 4px" },
        "Gravitational pull here (log scale)",
      ),
      h("div", { class: "bars", id: "tv-bars" }),
    ),
    sec(
      "Orbit",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("pa", "Periapsis × apoapsis"),
        ...kv("ae", "Semi-major axis · eccentricity"),
        ...kv("inc", "Inclination"),
        ...kv("per", "Period"),
        ...kv("c3", "Specific energy · C3"),
        ...kv("vesc", "Escape speed here"),
      ),
    ),
    sec(
      "Vehicle",
      "",
      h(
        "div",
        { class: "kv" },
        ...kv("cfg", "Configuration"),
        ...kv("mass", "Mass"),
        ...kv("eng", "Engine"),
        ...kv("prop", "Propellant"),
        ...kv("thrN", "Thrust · Isp"),
        ...kv("mdot", "Propellant flow"),
        ...kv("tw", "Thrust-to-weight"),
        ...kv("burn", "Burn"),
        ...kv("dv", "Δv spent so far"),
      ),
      h("div", { id: "tv-tanks" }),
    ),
    h(
      "div",
      { class: "sec", id: "tv-atmoSec" },
      h("h4", null, "Atmosphere"),
      h(
        "div",
        { class: "kv" },
        ...kv("q", "Dynamic pressure q"),
        ...kv("mach", "Mach"),
        ...kv("heat", "Heat flux (stagnation)"),
        ...kv("bo", "Radio blackout"),
        ...kv("chute", "Parachutes"),
        ...kv("bank", "Bank angle"),
        ...kv("alpha", "Angle of attack"),
      ),
    ),
  );
  TELE.els = {};
  for (const e of root.querySelectorAll('[id^="tv-"]'))
    TELE.els[e.id.slice(3)] = e;
}
function setv(id, txt, cls) {
  const e = TELE.els[id];
  if (!e) return;
  if (e.textContent !== txt) e.textContent = txt;
  if (cls !== undefined) e.className = "v" + (cls ? " " + cls : "");
}
function drawTele(T, t) {
  if (!TELE.els.alt) return;
  const md = MV.md;
  const E = TELE.els;
  if (!T) {
    setv("phase", t < md.M.t0 ? "Countdown" : "—");
    return;
  }
  const c = T.c,
    s = T.s;
  E.obj.textContent = c.o.name;
  E.crew.textContent = c.o.crew
    ? `${c.o.crew} crew`
    : c.o.kind === "craft"
      ? "uncrewed"
      : c.o.kind;
  const ph = md.phaseAt(t);
  const exPh = s.extra && s.extra.phase;
  const label = exPh
    ? exPh.charAt(0).toUpperCase() + exPh.slice(1)
    : ph
      ? ph.name
      : "—";
  E.phase.textContent = label;
  E.chip.style.background = ph ? ph.color : "#666";
  const b = T.burn;
  const ex = explainPhase(
    b && b.name,
    exPh,
    ph && ph.name,
    T.ref === "mars" && T.alt < 200 ? "[mars]" : "",
  );
  if (E.explain.textContent !== ex) E.explain.textContent = ex;
  const RB = { earth: "Earth", moon: "Moon", mars: "Mars", sun: "Sun" };
  if (T.ref === "earth" && (s.surface || s.pad)) T.alt = Math.max(T.alt, 0); // the drawn ground sits a fraction of a metre under the datum
  setv(
    "alt",
    T.ref === "sun"
      ? "—"
      : (T.alt < -0.0005
          ? "−" + fDist(-T.alt) + " (below datum)"
          : fDist(Math.max(T.alt, 0))) +
          " · " +
          RB[T.ref],
  );
  setv("vin", fSpeed(T.vIn));
  setv("vsurf", T.ref === "sun" || T.alt > 1500 ? "—" : fSpeed(T.vSurf));
  setv(
    "vvert",
    Math.abs(T.vVert) < 5e-4
      ? "0 m/s"
      : (T.vVert >= 0 ? "+" : "−") + fSpeed(Math.abs(T.vVert)),
  );
  setv("ll", T.ll ? `${fLat(T.ll[0])} ${fLon(T.ll[1])}` : "heliocentric");
  setv("dE", fDist(T.dEarth));
  const other =
    md.cfg.dest === "mars" ||
    (md.cfg.profile || "").startsWith("mars") ||
    md.cfg.profile === "multi-flyby"
      ? ["Mars", T.dMars]
      : ["Moon", T.dMoon];
  E.dX.previousSibling.textContent = "Distance from " + other[0];
  setv("dX", fDist(other[1]));
  setv(
    "light",
    T.light < 1
      ? fx(T.light * 1000, 0) + " ms"
      : T.light < 120
        ? fx(T.light, 2) + " s"
        : fTime(T.light),
  );
  // forces
  const g = T.proper / G0;
  E.g.textContent =
    g < 0.01 ? (g < 1e-4 ? "0.0000" : g.toFixed(4)) : g.toFixed(2);
  E.gnote.textContent =
    T.properNote ||
    (g < 1e-3 && !(T.thrust > 0)
      ? "free fall — weightless"
      : T.thrust > 0
        ? "engines firing"
        : T.dragAcc > 0.05
          ? "air braking"
          : "");
  setv(
    "thr",
    T.thrustAcc > 0
      ? fAcc(T.thrustAcc) + ` (${(T.thrustAcc / G0).toFixed(2)} g)`
      : "—",
  );
  setv(
    "drag",
    T.dragAcc > 1e-5
      ? fAcc(T.dragAcc) + ` (${(T.dragAcc / G0).toFixed(2)} g)`
      : "—",
  );
  const bars = E.bars;
  const top = T.grav.slice(0, 5);
  const amax = top[0].a;
  if (bars.childElementCount !== top.length) {
    bars.innerHTML = "";
    for (let i = 0; i < top.length; i++)
      bars.append(
        h(
          "div",
          { class: "bar" },
          h("span", { class: "n" }),
          h("div", { class: "track" }, h("div", { class: "fill" })),
          h("span", { class: "val" }),
        ),
      );
  }
  top.forEach((gr, i) => {
    const row = bars.children[i];
    row.children[0].textContent = BODIES[gr.body].name;
    const f = clamp(1 + Math.log10(gr.a / amax) / 6, 0.02, 1);
    row.children[1].firstChild.style.cssText = `width:${(f * 100).toFixed(1)}%;background:${BODY_COLORS[gr.body]}`;
    row.children[2].textContent = fAcc(gr.a);
  });
  // orbit
  const el = T.el,
    ob = T.orbBody;
  const Rb = T.orbRb;
  $("#trt-Orbit").textContent = "around " + BODIES[ob].name;
  if (el.rp < Rb && (s.surface || s.pad || (T.alt < 200 && ob !== "sun"))) {
    setv(
      "pa",
      el.e < 1 ? `suborbital · apoapsis ${fDist(el.ra - Rb)}` : "escape",
      "",
    );
    setv("per", "—");
  } else if (el.e < 1) {
    setv(
      "pa",
      `${fDist(el.rp - Rb)} × ${fDist(el.ra - Rb)}`,
      el.rp < Rb ? "bad" : "",
    );
    setv("per", fTime(el.period));
  } else {
    setv("pa", `${fDist(el.rp - Rb)} × ∞ (escape)`, el.rp < Rb ? "bad" : "hi");
    setv("per", "v∞ " + fSpeed(el.vinf));
  }
  setv(
    "ae",
    `${fDist(el.a > 0 ? el.a : -Math.abs(el.a))} · ${el.e.toFixed(4)}`,
  );
  const pole = ob === "sun" ? [0, 0, 1] : bodyPoleEcl(ob, t);
  setv(
    "inc",
    (vangle(vcross(T.orbR, T.orbV), pole) * RAD).toFixed(2) +
      "°" +
      (ob === "sun" ? " (ecliptic)" : " (equator)"),
  );
  setv(
    "c3",
    `${fx(el.energy, 2)} km²/s² · C3 ${fx(2 * el.energy, 2)}`,
    el.energy > 0 ? "hi" : "",
  );
  setv("vesc", fSpeed(T.vEsc));
  // vehicle
  const cf = T.cfg;
  let cfgTxt = "—";
  const L = md.L;
  if (cf) {
    if (cf.key === "launch")
      cfgTxt = L.sideMount
        ? ["Orbiter", "External Tank", cf.boosters ? "2 boosters" : null]
            .filter(Boolean)
            .join(" + ")
        : L.stages
            .filter((st, i) => (st.parallel ? cf.boosters : i >= cf.stFrom))
            .map((st) => st.id)
            .join(" + ") +
          (cf.fairing ? " + fairing" : "") +
          (cf.les ? " + escape tower" : "");
    else if (cf.sc === "shuttle")
      cfgTxt = [
        "Orbiter",
        cf.docked ? "docked to the ISS" : null,
        cf.bay === "open" ? "payload bay open" : "bay doors closed",
        cf.payArm || (cf.armPay && cf.armT && t >= cf.armT.un)
          ? "payload on the arm"
          : cf.armPay && cf.armT && t >= cf.armT.gr
            ? "arm on the payload"
            : null,
        cf.gear ? "gear down" : null,
        cf.dragChute ? "drag chute" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    else if (cf.sc === "iss")
      cfgTxt =
        "International Space Station" + (cf.mplm ? " + logistics module" : "");
    else if (cf.key === "stack")
      cfgTxt = `${L.stages[cf.stage].id} + spacecraft`;
    else if (cf.key === "stage") cfgTxt = L.stages[cf.stage].name;
    else if (cf.key === "ist")
      cfgTxt =
        (L.jettison.find((j) => j.part === "IST") || {}).name || "Interstage";
    else if (cf.key === "capsule")
      cfgTxt = "Capsule" + (cf.chutes ? " under parachutes" : "");
    else cfgTxt = (cf.parts || []).join(" + ") + (cf.landed ? " (landed)" : "");
  }
  setv("cfg", cfgTxt);
  setv("mass", T.m ? fMass(T.m) : "—");
  let eng = "—",
    prop = "—",
    thrTxt = "—",
    mdot = "—",
    tw = "—",
    burnTxt = "—";
  if (T.thrust > 0) {
    if (cf && cf.key === "launch") {
      const st =
        L.stages.find((x) => x.id === (s.extra && s.extra.stage)) ||
        L.stages[cf.stFrom] ||
        L.stages[0];
      const bst = L.stages[0].parallel && cf.boosters ? L.stages[0] : null;
      eng =
        `${st.n} × ${st.engine}` +
        (bst && bst !== st ? ` + ${bst.n} × ${bst.engine}` : "");
      prop =
        PROP[st.prop].label +
        (bst && bst !== st && bst.prop !== st.prop
          ? " + " + PROP[bst.prop].label
          : "");
      const pr = Math.exp(-Math.max(T.alt, 0) / 7.2);
      const isp = st.ispVac + (st.ispSL - st.ispVac) * pr;
      thrTxt = `${fForce(T.thrust)} · ${isp.toFixed(0)} s`;
      mdot = fx(T.thrust / (isp * G0), 0) + " kg/s";
    } else if (b) {
      eng = b.engine;
      prop = (PROP[b.propType] || {}).label || b.propType || "—";
      thrTxt = `${fForce(T.thrust)} · ${fx(b.isp, 0)} s`;
      mdot = fx(T.thrust / (b.isp * G0), 1) + " kg/s";
      burnTxt = `${b.name.split("—")[0].trim()} ${fTime(t - b.t)} / ${fTime(b.dur)} · Δv ${fx(b.dv, 0)} m/s`;
    } else {
      const mod = md.SC.modules.DS || md.SC.modules.LDR;
      if (mod && mod.engine) {
        eng = mod.engine.name;
        prop = PROP[mod.engine.prop].label;
        thrTxt = `${fForce(T.thrust)} · ${mod.engine.isp} s`;
        mdot = fx(T.thrust / (mod.engine.isp * G0), 1) + " kg/s";
      } else thrTxt = fForce(T.thrust);
    }
    if (T.gLocal > 0 && T.m) tw = (T.thrust / (T.m * T.gLocal)).toFixed(2);
  } else if (cf && (cf.key === "launch" || cf.key === "stack")) {
    const st = cf.key === "launch" ? L.stages[cf.stFrom] : L.stages[cf.stage];
    eng = `${st.n} × ${st.engine} (off)`;
    prop = PROP[st.prop].label;
  }
  setv("eng", eng);
  setv("prop", prop);
  setv("thrN", thrTxt);
  setv("mdot", mdot);
  setv("tw", tw);
  setv("burn", burnTxt);
  setv("dv", fx(md.dvSpent(t, c.o.id), 0) + " m/s");
  // tanks
  const tanksEl = E.tanks;
  const tks = md.tanks;
  if (tanksEl.childElementCount !== tks.length + 1) {
    tanksEl.innerHTML = "";
    tanksEl.append(
      h(
        "div",
        { class: "note-s", style: "margin:8px 0 2px" },
        "Propellant remaining",
      ),
    );
    for (const tk of tks)
      tanksEl.append(
        h(
          "div",
          { class: "tank" },
          h("span", { class: "tn" }),
          h("span", { class: "tv" }),
          h("div", { class: "track" }, h("div", { class: "fill" })),
        ),
      );
  }
  const upObj = md.M.obj("upper");
  tks.forEach((tk, i) => {
    const row = tanksEl.children[i + 1];
    const v = md.tankValue(tk, t);
    const active = b && b.engine === tk.engine;
    const gone = tk.id === "upper" && upObj && t > upObj.t0;
    row.children[0].textContent =
      (active ? "▶ " : "") + tk.name + (gone ? " (separated)" : "");
    row.children[0].style.color = active
      ? "var(--amber)"
      : gone
        ? "var(--dim)"
        : "";
    row.children[1].textContent = v == null ? "—" : fMass(v);
    row.children[2].firstChild.style.cssText = `width:${v == null ? 0 : clamp((v / tk.cap) * 100, 0, 100).toFixed(1)}%;background:${(PROP[tk.prop] || {}).plume || "#5cc8ff"}`;
  });
  if (cf && cf.key === "launch" && t >= md.M.t0 && s.m) {
    let dry = 0;
    L.stages.forEach((st, i) => {
      if (st.parallel ? cf.boosters : i >= cf.stFrom) dry += st.dry;
    });
    const jet = L.jettison
      .filter(
        (j) =>
          (j.part === "fairing" && cf.fairing) ||
          (j.part === "LES" && cf.les) ||
          (j.part === "SAJ" && cf.saj) ||
          (j.part === "IST" && cf.ist !== false),
      )
      .reduce((a, j) => a + j.mass, 0);
    const lvProp = s.m - dry - scTotalMass(md.SC) - jet;
    setv("prop", (E.prop.textContent || "") + "");
    E.prop.title = "Launch-vehicle propellant on board: " + fMass(lvProp);
    setv(
      "mass",
      fMass(s.m) + " (" + fMass(Math.max(lvProp, 0)) + " propellant)",
    );
  }
  // atmosphere
  const ex2 = s.extra || {};
  const inAtm =
    (T.ref === "earth" && T.alt < 130) || (T.ref === "mars" && T.alt < 130);
  E.atmoSec.style.display = inAtm && !s.surface ? "" : "none";
  if (inAtm) {
    setv("q", ex2.q != null ? fx(ex2.q / 1000, 2) + " kPa" : "—");
    setv("mach", ex2.mach != null ? fx(ex2.mach, 2) : "—");
    setv(
      "heat",
      ex2.heat != null ? fx(ex2.heat, 1) + " W/cm²" : "—",
      ex2.heat > 50 ? "bad" : "",
    );
    setv(
      "bo",
      ex2.blackout ? "NO SIGNAL" : "clear",
      ex2.blackout ? "bad" : "ok",
    );
    setv(
      "chute",
      ex2.chute
        ? ex2.chute >= 2
          ? "main canopies"
          : "drogue / supersonic"
        : cf && cf.dragChute
          ? "drag chute"
          : "—",
    );
    setv("bank", ex2.bank != null ? fx(ex2.bank, 0) + "°" : "—");
    setv("alpha", ex2.alpha != null ? fx(ex2.alpha, 1) + "°" : "—");
    E.alpha.parentNode &&
      (E.alpha.style.display = E.alpha.previousSibling.style.display =
        ex2.alpha != null ? "" : "none");
  }
}

// ==== 70_panels.js
// ============================================================================
// Panels: event log, Δv & fuel budget, mission sheet, timeline, captions,
// storyboard shots and contact sheet.
// ============================================================================
const KIND_LABEL = {
  launch: "launch",
  ascent: "ascent",
  maxq: "max-Q",
  staging: "staging",
  ignition: "ignition",
  jettison: "jettison",
  insertion: "orbit",
  burn: "burn",
  sep: "separation",
  soi: "gravity",
  los: "radio",
  flyby: "flyby",
  record: "record",
  photo: "photo",
  info: "note",
  emergency: "emergency",
  entry: "entry",
  skip: "entry",
  chute: "parachute",
  blackout: "radio",
  heat: "heating",
  gload: "g-load",
  landing: "landing",
  touchdown: "landing",
  powered: "descent",
  skycrane: "descent",
  dock: "docking",
  refill: "refilling",
  isru: "ISRU",
  fail: "failure",
  approach: "descent",
  terminal: "descent",
  trim: "entry",
  deploy: "deploy",
};
const EVF = {
  all: () => true,
  key: (e) =>
    ![
      "ascent",
      "heat",
      "gload",
      "blackout",
      "los",
      "soi",
      "approach",
      "terminal",
    ].includes(e.kind),
  burns: (e) =>
    [
      "burn",
      "ignition",
      "staging",
      "sep",
      "jettison",
      "insertion",
      "powered",
      "dock",
      "launch",
      "refill",
    ].includes(e.kind),
  photo: (e) =>
    [
      "photo",
      "info",
      "record",
      "flyby",
      "emergency",
      "landing",
      "touchdown",
    ].includes(e.kind),
};
const PANEL = { evFilter: "key", curEv: -2, userScroll: 0 };
function buildEventsPanel() {
  const md = MV.md;
  const pane = $("#tab-events");
  pane.innerHTML = "";
  const fl = h(
    "div",
    { class: "filter" },
    ...[
      ["key", "Key events"],
      ["all", "All"],
      ["burns", "Burns & staging"],
      ["photo", "Story moments"],
    ].map(([k, l]) =>
      h(
        "button",
        {
          class: PANEL.evFilter === k ? "on" : "",
          onclick: () => {
            PANEL.evFilter = k;
            buildEventsPanel();
          },
        },
        l,
      ),
    ),
  );
  pane.append(fl);
  const list = h("div", { id: "evList" });
  pane.append(list);
  md.events.forEach((e, i) => {
    if (!EVF[PANEL.evFilter](e)) return;
    const obj = md.M.obj(e.obj);
    const objName = obj && obj.id !== "ship" ? obj.name : "";
    const row = h(
      "div",
      { class: `ev kind-${e.kind}`, dataset: { i } },
      h("div", { class: "em" }, fMET(e.t - md.M.t0)),
      h(
        "div",
        { class: "en" },
        h("span", null, e.name),
        h("span", { class: "kind" }, KIND_LABEL[e.kind] || e.kind),
      ),
      h(
        "div",
        { class: "ed" },
        e.desc,
        e.gaNote
          ? h("div", { style: "color:var(--cyan);margin-top:3px" }, e.gaNote)
          : null,
        h(
          "div",
          { class: "obj" },
          fmtUTC(e.t) + " UTC" + (objName ? " · " + objName : ""),
        ),
      ),
    );
    row.addEventListener("click", () => {
      jumpToEvent(e);
      row.classList.toggle("open");
    });
    list.append(row);
  });
  list.addEventListener(
    "wheel",
    () => {
      PANEL.userScroll = performance.now();
    },
    { passive: true },
  );
  list.addEventListener(
    "touchmove",
    () => {
      PANEL.userScroll = performance.now();
    },
    { passive: true },
  );
  PANEL.curEv = -2;
}
function updateEventsPanel(t) {
  const md = MV.md;
  if (!md) return;
  let ci = -1;
  for (let i = 0; i < md.events.length; i++)
    if (md.events[i].t <= t + 0.01) ci = i;
    else break;
  if (ci === PANEL.curEv) return;
  PANEL.curEv = ci;
  const rows = $$("#evList .ev");
  let curRow = null;
  for (const r of rows) {
    const i = +r.dataset.i;
    r.classList.toggle("future", i > ci);
    r.classList.remove("cur");
    if (i <= ci) curRow = r;
  }
  if (curRow) {
    curRow.classList.add("cur");
    if (
      performance.now() - PANEL.userScroll > 6000 &&
      !$("#tab-events").hidden
    ) {
      const pane = $("#tab-events");
      const top = curRow.offsetTop - pane.clientHeight * 0.35;
      pane.scrollTo({ top, behavior: "smooth" });
    }
  }
}
function jumpToEvent(e) {
  const lead = ["launch"].includes(e.kind)
    ? 15
    : [
          "flyby",
          "landing",
          "touchdown",
          "entry",
          "photo",
          "info",
          "emergency",
          "record",
          "soi",
        ].includes(e.kind)
      ? 25
      : 6;
  setTime(e.t - lead);
  STATE.lastCaptionEv = -1;
  if (STATE.auto) STATE.rateTarget = 1;
}
// ---------------- Δv & fuel ----------------
function buildBudgetPanel() {
  const md = MV.md;
  const M = md.M;
  const L = md.L;
  const pane = $("#tab-budget");
  pane.innerHTML = "";
  const liftoffMass = (() => {
    let m = scTotalMass(md.SC);
    for (const s of L.stages) m += s.dry + s.propMass;
    m += L.jettison.reduce((a, j) => a + j.mass, 0);
    return m;
  })();
  const liftoffThrust = L.stages
    .filter(
      (s, i) => i === 0 || (L.stages[0].parallel && i === 1 && !s.ignition),
    )
    .reduce((a, s) => a + s.thrustSL, 0);
  const lvProp = L.stages.reduce((a, s) => a + s.propMass, 0);
  const scProp = md.burns.reduce((a, b) => a + (b.prop || 0), 0);
  const dvTot = md.burns.reduce((a, b) => a + (b.dv || 0), 0);
  pane.append(
    h("h3", { class: "h" }, "Launch"),
    h(
      "div",
      { class: "kv" },
      h("div", { class: "k" }, "Liftoff mass"),
      h("div", { class: "v" }, fMass(liftoffMass)),
      h("div", { class: "k" }, "Liftoff thrust"),
      h("div", { class: "v" }, fForce(liftoffThrust)),
      h("div", { class: "k" }, "Thrust-to-weight at liftoff"),
      h("div", { class: "v" }, (liftoffThrust / (liftoffMass * G0)).toFixed(2)),
      h("div", { class: "k" }, "Launch-vehicle propellant"),
      h("div", { class: "v" }, fMass(lvProp)),
      h("div", { class: "k" }, "Δv delivered by ascent"),
      h("div", { class: "v" }, fx(md.ascentDv, 0) + " m/s"),
      md.cfg.refill
        ? [
            h("div", { class: "k" }, "Refilled in orbit"),
            h(
              "div",
              { class: "v" },
              fMass(md.cfg.refill.to) + ` (${md.cfg.refill.tankers} tankers)`,
            ),
          ]
        : null,
    ),
  );
  const stTable = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Stage"),
        h("th", { style: "text-align:right" }, "Loaded · burn"),
      ),
    ),
    h(
      "tbody",
      null,
      ...L.stages.map((s) => {
        const mdot = s.thrustVac / (s.ispVac * G0);
        return h(
          "tr",
          null,
          h(
            "td",
            null,
            h("b", null, s.name),
            h(
              "div",
              { class: "note-s" },
              `${s.n} × ${s.engine} · ${(PROP[s.prop] || {}).label}`,
            ),
            h(
              "div",
              { class: "note-s" },
              `${fForce(s.thrustSL)} sea level / ${fForce(s.thrustVac)} vacuum · Isp ${s.ispSL}/${s.ispVac} s`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fMass(s.propMass),
            h("div", { class: "note-s" }, fTime(s.propMass / mdot)),
          ),
        );
      }),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, stTable));
  pane.append(h("h3", { class: "h" }, "Spacecraft & upper-stage burns"));
  const bt = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Burn"),
        h("th", { style: "text-align:right" }, "Δv · propellant"),
      ),
    ),
    h(
      "tbody",
      null,
      ...md.burns.map((b) => {
        const tr = h(
          "tr",
          { class: "click" },
          h(
            "td",
            null,
            h("b", null, b.name),
            h(
              "div",
              { class: "note-s mono" },
              fMET(b.t - M.t0) + " · " + fTime(b.dur),
            ),
            h(
              "div",
              { class: "note-s" },
              `${b.engine} · ${(PROP[b.propType] || {}).label || b.propType || ""}${b.obj !== "ship" ? " · " + (M.obj(b.obj) || {}).name : ""}`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fx(b.dv, 0) + " m/s",
            h("div", { class: "note-s" }, fMass(b.prop)),
          ),
        );
        tr.addEventListener("click", () => setTime(b.t - 8));
        return tr;
      }),
      h(
        "tr",
        { class: "tot" },
        h("td", null, "Total"),
        h(
          "td",
          { class: "n" },
          fx(dvTot, 0) + " m/s",
          h("div", { class: "note-s" }, fMass(scProp)),
        ),
      ),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, bt));
  pane.append(
    h(
      "p",
      { class: "note-s" },
      "Each burn obeys the rocket equation Δv = Isp · g₀ · ln(m₀ / m₁): the propellant needed grows exponentially with the Δv asked of it, which is why staging and low-mass spacecraft matter.",
    ),
  );
  pane.append(h("h3", { class: "h" }, "Propellant tanks"));
  const tt = h(
    "table",
    { class: "t" },
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        h("th", null, "Tank"),
        h("th", { style: "text-align:right" }, "Loaded · left"),
      ),
    ),
    h(
      "tbody",
      null,
      ...md.tanks.map((tk) =>
        h(
          "tr",
          null,
          h(
            "td",
            null,
            h("b", null, tk.name),
            h(
              "div",
              { class: "note-s" },
              `${tk.engine} · ${(PROP[tk.prop] || {}).label || tk.prop}`,
            ),
          ),
          h(
            "td",
            { class: "n" },
            fMass(tk.init),
            h("div", { class: "note-s" }, fMass(md.tankValue(tk, md.tEnd))),
          ),
        ),
      ),
    ),
  );
  pane.append(h("div", { class: "scroll-x" }, tt));
}
// ---------------- mission sheet ----------------
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
function initTimeline() {
  const el = $("#timeline");
  const hov = $("#tlHover");
  let drag = false;
  const tAt = (e) => {
    const r = el.getBoundingClientRect();
    return tlT((e.clientX - r.left - 6) / (r.width - 12));
  };
  el.addEventListener("pointerdown", (e) => {
    if (!MV.md) return;
    drag = true;
    el.setPointerCapture(e.pointerId);
    setTime(tAt(e));
  });
  el.addEventListener("pointermove", (e) => {
    if (!MV.md || !TL.map) return;
    const t = tAt(e);
    if (drag) setTime(t);
    const md = MV.md;
    let near = null,
      nd = 1e9;
    const r = el.getBoundingClientRect();
    for (const ev of md.events) {
      const d = Math.abs(tlX(ev.t) * (r.width - 12) + 6 - (e.clientX - r.left));
      if (d < nd) {
        nd = d;
        near = ev;
      }
    }
    const ph = md.phaseAt(t);
    const px = e.clientX - r.left;
    let burn = null;
    for (const x of md.powered) {
      const a = tlX(x.t0) * (r.width - 12) + 6,
        b = tlX(x.t1) * (r.width - 12) + 6;
      if (px >= a - 3 && px <= b + 3) {
        burn = x;
        break;
      }
    }
    hov.style.display = "block";
    hov.style.left = px + "px";
    hov.textContent = `${fMET(t - md.M.t0)} · ${ph ? ph.name : ""}${burn ? " · ENGINE ON: " + burn.name : near && nd < 6 ? " · " + near.name : ""}`;
  });
  const end = () => {
    drag = false;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", () => {
    hov.style.display = "none";
  });
}
// ---------------- captions ----------------
const CAP = { until: 0, ev: null };
function showCaption(e) {
  if (!MV.layers.captions) return;
  const el = $("#caption");
  el.querySelector(".cap-name").textContent = e.name;
  let d = e.desc || "";
  const sentences = d.split(/(?<=[.!?”])\s+/);
  d = sentences.slice(0, 2).join(" ");
  el.querySelector(".cap-desc").textContent = d;
  el.classList.remove("fade");
  CAP.until = performance.now() + clamp(3500 + d.length * 45, 4000, 11000);
  CAP.ev = e;
}
function updateCaption() {
  if (CAP.until && performance.now() > CAP.until) {
    $("#caption").classList.add("fade");
    CAP.until = 0;
  }
}
// ---------------- storyboard ----------------
const SHOTS = { list: [], key: "" };
function shotsKey() {
  return (
    "mstudio-shots-" + (MV.md ? (MV.md.scn ? MV.md.scn.id : "custom") : "none")
  );
}
function loadShots() {
  SHOTS.key = shotsKey();
  SHOTS.list = lsGet(SHOTS.key, []) || [];
  renderShots();
}
function saveShots() {
  if (!lsSet(SHOTS.key, SHOTS.list)) {
    /* storage full: keep in memory */
  }
}
function camDesc(c) {
  const lens = `${Math.round(c.lens)} mm`;
  const tgt = c.target.startsWith("obj:")
    ? (MV.md.M.obj(c.target.slice(4)) || {}).name || c.target
    : BODIES[c.target.slice(5)].name;
  const mode = {
    orbit: "Orbit cam",
    chase: "Chase cam",
    lookat: "Look-at",
    ground: "Ground observer",
    top: "Top-down map",
  }[c.mode];
  return `${mode} · ${lens} · on ${tgt}${c.mode === "lookat" ? " → " + (c.look.startsWith("body:") ? BODIES[c.look.slice(5)].name : c.look.slice(4)) : ""}`;
}
function captureShot() {
  const md = MV.md;
  if (!md) return;
  renderFrame(true);
  const src = R.renderer.domElement;
  const pr = R.renderer.getPixelRatio();
  const fr = frameRect();
  const sx = fr.x * pr,
    sy = fr.y * pr,
    sw = fr.w * pr,
    sh = fr.h * pr;
  const W = 960,
    Hh = Math.round((W * fr.h) / fr.w);
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = Hh;
  const g = cv.getContext("2d");
  g.drawImage(src, sx, sy, sw, sh, 0, 0, W, Hh);
  const t = STATE.t;
  const ph = md.phaseAt(t);
  const prevEv = [...md.events]
    .reverse()
    .find((e) => e.t <= t && t - e.t < 1800);
  const ps = PSTAT.cur;
  const propTxt = ps
    ? ps.k === "burn"
      ? `${ps.l}: ${String(ps.name || "")
          .split("—")[0]
          .trim()}`
      : ps.l
    : "";
  const camS = {
    mode: CAM.mode,
    target: CAM.target,
    look: CAM.look,
    lens: CAM.lens,
    az: CAM.az,
    el: CAM.el,
    dist: CAM.dist,
    roll: CAM.roll,
    aspect: CAM.aspect,
    ground: { ...CAM.ground },
  };
  const n = SHOTS.list.length ? Math.max(...SHOTS.list.map((s) => s.n)) + 1 : 1;
  // slate strip
  g.fillStyle = "rgba(0,0,0,.55)";
  g.fillRect(0, Hh - 26, W, 26);
  g.fillStyle = "#ffb547";
  g.font = '600 14px "IBM Plex Mono", monospace';
  g.fillText(`SHOT ${n}`, 10, Hh - 8);
  g.fillStyle = "#e6ecf5";
  g.font = '13px "IBM Plex Mono", monospace';
  g.fillText(
    `${fMET(t - md.M.t0)}  ·  ${camDesc(camS)}  ·  ${ph ? ph.name : ""}${propTxt ? "  ·  " + propTxt : ""}`,
    92,
    Hh - 8,
  );
  const img = cv.toDataURL("image/jpeg", 0.82);
  const shot = {
    n,
    t,
    met: fMET(t - md.M.t0),
    utc: fmtUTC(t),
    phase: ph ? ph.name : "",
    prop: propTxt,
    cam: camS,
    img,
    caption: prevEv ? prevEv.name + " — " : ph ? ph.name + " — " : "",
    w: W,
    h: Hh,
  };
  SHOTS.list.push(shot);
  saveShots();
  renderShots();
  const b = $("#bShot");
  b.textContent = "✓ Saved";
  setTimeout(() => {
    b.textContent = "● Shot";
  }, 900);
  const flash = h("div", {
    style:
      "position:absolute;inset:0;background:#fff;opacity:.35;pointer-events:none;transition:opacity .35s;z-index:30",
  });
  $("#app").append(flash);
  requestAnimationFrame(() => {
    flash.style.opacity = "0";
    setTimeout(() => flash.remove(), 400);
  });
}
function gotoShot(s) {
  Object.assign(CAM, {
    mode: s.cam.mode,
    target: s.cam.target,
    look: s.cam.look,
    lens: s.cam.lens,
    az: s.cam.az,
    el: s.cam.el,
    dist: s.cam.dist,
    roll: s.cam.roll || 0,
    aspect: s.cam.aspect || 0,
  });
  CAM.ground = { ...s.cam.ground };
  CAM.trans = null;
  $("#selAspect").value = String(CAM.aspect || 0);
  applyLens();
  syncCamUI();
  setTime(s.t);
  STATE.playing = false;
  syncPlayUI();
}
function renderShots() {
  const pane = $("#tab-shots");
  pane.innerHTML = "";
  $("#shotCount").textContent = SHOTS.list.length
    ? `(${SHOTS.list.length})`
    : "";
  pane.append(
    h(
      "p",
      { class: "note-s" },
      "Frame the view, pick a lens and aspect ratio, then capture. Each shot stores the time, camera and lens so you can return to it exactly.",
    ),
  );
  pane.append(
    h(
      "div",
      { class: "btnrow" },
      h(
        "button",
        { class: "tb primary", onclick: captureShot },
        "● Capture shot",
      ),
      h(
        "button",
        { class: "tb", onclick: openSheet, disabled: !SHOTS.list.length },
        "Contact sheet",
      ),
      h(
        "button",
        { class: "tb", onclick: copyShotList, disabled: !SHOTS.list.length },
        "Copy shot list",
      ),
    ),
  );
  SHOTS.list.forEach((s, i) => {
    const ta = h("textarea", { placeholder: "Caption / action / dialogue…" });
    ta.value = s.caption || "";
    ta.addEventListener("input", () => {
      s.caption = ta.value;
      saveShots();
    });
    const del = h("button", null, "Delete");
    let armed = false;
    del.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        del.textContent = "Confirm delete";
        del.style.color = "var(--red)";
        setTimeout(() => {
          armed = false;
          del.textContent = "Delete";
          del.style.color = "";
        }, 2500);
        return;
      }
      SHOTS.list.splice(i, 1);
      saveShots();
      renderShots();
    });
    pane.append(
      h(
        "div",
        { class: "shot" },
        h("img", {
          src: s.img,
          alt: "Shot " + s.n,
          onclick: () => gotoShot(s),
        }),
        h(
          "div",
          { style: "min-width:0" },
          h(
            "div",
            { class: "meta" },
            h("b", null, `#${s.n}`),
            ` ${s.met}`,
            h("br"),
            `${camDesc(s.cam)}`,
          ),
          ta,
          h(
            "div",
            { class: "acts" },
            h("button", { onclick: () => gotoShot(s) }, "Go to"),
            h(
              "button",
              {
                onclick: () => {
                  if (i > 0) {
                    SHOTS.list.splice(i - 1, 0, SHOTS.list.splice(i, 1)[0]);
                    saveShots();
                    renderShots();
                  }
                },
              },
              "↑",
            ),
            h(
              "button",
              {
                onclick: () => {
                  if (i < SHOTS.list.length - 1) {
                    SHOTS.list.splice(i + 1, 0, SHOTS.list.splice(i, 1)[0]);
                    saveShots();
                    renderShots();
                  }
                },
              },
              "↓",
            ),
            del,
          ),
        ),
      ),
    );
  });
}
function shotListText() {
  const md = MV.md;
  const lines = [`${md.M.name} — storyboard shot list`, ""];
  SHOTS.list.forEach((s, i) =>
    lines.push(
      `${i + 1}. [Shot ${s.n}] ${s.met}  (${s.utc} UTC)  ${s.phase}${s.prop ? " · " + s.prop : ""}\n   Camera: ${camDesc(s.cam)}${s.cam.aspect ? " · " + s.cam.aspect + ":1" : ""}\n   ${s.caption || ""}`,
    ),
  );
  return lines.join("\n");
}
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
  const b = dominantBody(c.P, t);
  return b === "sun" ? "sun" : b === "mars" ? "mars" : "earth";
}
function mmCoords(view, tr) {
  return view === "sun" ? tr.P : tr.frameCoords(view);
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
    const cap = view === "earth" ? 1.8e6 : 9e5;
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
  const F = view === "sun" ? P : toFrameArr(view, ts, P);
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
function regionText(rSun) {
  const a = PLANET_LIST.map((p) => [
    p,
    planetElemsAt(p === "earth" ? "emb" : p, MV.tNow).a,
  ]);
  if (rSun < a[0][1]) return "inside Mercury’s orbit";
  for (let i = 0; i + 1 < a.length; i++)
    if (rSun < a[i + 1][1])
      return `between the orbits of ${BODIES[a[i][0]].name} and ${BODIES[a[i + 1][0]].name}`;
  return "beyond Saturn’s orbit";
}
function drawMinimap(t, force) {
  const md = MV.md;
  const cv = $("#mmc");
  if (!md || !cv || cv.offsetParent === null) return;
  const now = performance.now();
  const view = mmViewFor(t);
  if (!force && now - MM.drawn < 100 && MM.lastT === t && MM.lastKey === view)
    return;
  MM.drawn = now;
  MM.lastT = t;
  MM.lastKey = view;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = cv.clientWidth,
    Hh = cv.clientHeight;
  if (!W || !Hh) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(Hh * dpr);
  }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, Hh);
  if (view === "track") {
    drawGroundTrack(g, W, Hh, t, now);
    return;
  }
  const cx = W / 2,
    cy = Hh / 2,
    Rm = mmRmax(view),
    k = (Math.min(W, Hh) / 2 - 10) / Rm;
  const center = view === "sun" ? [0, 0, 0] : helio(view, t).r;
  const X = (x) => clamp(cx + x * k, -4000, 4000),
    Y = (y) => clamp(cy - y * k, -4000, 4000);
  MM.hits = [];
  $("#mmTitle").textContent =
    MM_TITLES[view] + (MM.view === "auto" ? "" : " · fixed");
  // background
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) * 0.7);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#05080e");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, Hh);
  g.font = '10px "IBM Plex Sans Condensed", sans-serif';
  g.textBaseline = "middle";
  const dot = (x, y, r, col, label, id, labCol) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    if (label) {
      g.fillStyle = labCol || col;
      g.fillText(label, x + r + 3, y - 1);
    }
    if (id) MM.hits.push({ x, y, id });
  };
  // reference rings / scale
  g.strokeStyle = "rgba(120,140,170,.16)";
  g.lineWidth = 1;
  g.setLineDash([2, 4]);
  if (view === "sun") {
    for (let au = 1; au * AU < Rm; au += Rm > 4 * AU ? 2 : 1) {
      g.beginPath();
      g.arc(cx, cy, au * AU * k, 0, TAU);
      g.stroke();
      g.fillStyle = "rgba(135,148,168,.55)";
      g.fillText(
        `${au} AU`,
        cx + au * AU * k * 0.71 + 2,
        cy - au * AU * k * 0.71 - 6,
      );
    }
  } else {
    const step =
      view === "earth"
        ? Rm > 9e5
          ? 5e5
          : 1e5
        : Rm > 2e5
          ? 1e5
          : Rm > 6e4
            ? 2e4
            : 1e4;
    for (let r = step; r < Rm; r += step) {
      g.beginPath();
      g.arc(cx, cy, r * k, 0, TAU);
      g.stroke();
    }
    g.fillStyle = "rgba(135,148,168,.55)";
    g.fillText(`rings every ${fx(step, 0)} km`, 8, Hh - 10);
  }
  g.setLineDash([]);
  // orbits and bodies
  if (view === "sun") {
    for (const p of PLANET_LIST) {
      const a = planetElemsAt(p === "earth" ? "emb" : p, t).a;
      if (a > Rm * 1.05) continue;
      const pts = planetOrbitPts(p, t);
      g.strokeStyle = BODY_COLORS[p] + "55";
      g.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = X(pts[i]),
          y = Y(pts[i + 1]);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    const sg = g.createRadialGradient(cx, cy, 0, cx, cy, 14);
    sg.addColorStop(0, "rgba(255,230,170,.9)");
    sg.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = sg;
    g.fillRect(cx - 14, cy - 14, 28, 28);
    dot(cx, cy, 3.5, "#ffd27a", null, "body:sun");
    for (const p of PLANET_LIST) {
      const a = planetElemsAt(p === "earth" ? "emb" : p, t).a;
      if (a > Rm * 1.05) continue;
      const P = helio(p, t).r;
      dot(
        X(P[0]),
        Y(P[1]),
        p === "earth" || p === "mars" ? 3.6 : 2.8,
        BODY_COLORS[p],
        BODIES[p].name,
        "body:" + p,
      );
    }
  } else if (view === "earth") {
    if (!MM.moonOrb || Math.abs(t - MM.moonOrbT) > 0.5 * DAY) {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const m = moonGeo(t - 13.7 * DAY + (i / 160) * 27.4 * DAY).r;
        pts.push(m[0], m[1]);
      }
      MM.moonOrb = pts;
      MM.moonOrbT = t;
    }
    g.strokeStyle = "rgba(200,210,225,.35)";
    g.beginPath();
    MM.moonOrb.forEach((v, i) => {
      if (i % 2) return;
      const x = X(MM.moonOrb[i]),
        y = Y(MM.moonOrb[i + 1]);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    dot(
      cx,
      cy,
      Math.max(4.5, BODIES.earth.R * k),
      "#4f8dff",
      "Earth",
      "body:earth",
      "#9cc3ff",
    );
    const Mo = moonGeo(t).r;
    dot(
      X(Mo[0]),
      Y(Mo[1]),
      Math.max(3, BODIES.moon.R * k),
      "#cfd3d8",
      "Moon",
      "body:moon",
    );
  } else {
    const pole = bodyPoleEcl("mars", t);
    const e1 = vperp(pole),
      e2 = vcross(pole, e1);
    for (const [nm, a] of [
      ["Phobos", 9376],
      ["Deimos", 23463],
    ]) {
      if (a > Rm * 1.1) continue;
      g.strokeStyle = "rgba(200,170,150,.3)";
      g.beginPath();
      for (let i = 0; i <= 96; i++) {
        const th = (i / 96) * TAU;
        const p = vadd(
          vscale(e1, a * Math.cos(th)),
          vscale(e2, a * Math.sin(th)),
        );
        const x = X(p[0]),
          y = Y(p[1]);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
      g.fillStyle = "rgba(200,170,150,.6)";
      g.fillText(nm, cx + a * k * 0.72 + 3, cy + a * k * 0.72);
    }
    dot(
      cx,
      cy,
      Math.max(5, BODIES.mars.Rmean * k),
      "#ff8a5c",
      "Mars",
      "body:mars",
    );
  }
  if (view !== "sun") {
    // direction of the Sun
    const sd = vunit(vscale(center, -1));
    const ang = Math.atan2(sd[1], sd[0]);
    const rr = Math.min(W, Hh) / 2 - 12;
    const ax = cx + Math.cos(ang) * rr,
      ay = cy - Math.sin(ang) * rr;
    g.fillStyle = "#ffd27a";
    g.beginPath();
    g.arc(ax, ay, 3, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(255,210,122,.45)";
    g.beginPath();
    g.moveTo(cx + Math.cos(ang) * (rr - 22), cy - Math.sin(ang) * (rr - 22));
    g.lineTo(ax - Math.cos(ang) * 6, ay + Math.sin(ang) * 6);
    g.stroke();
    g.fillStyle = "rgba(255,210,122,.8)";
    g.fillText(
      "Sun",
      ax + (Math.cos(ang) > 0 ? -22 : 6),
      ay + (Math.sin(ang) > 0 ? 10 : -10),
    );
  }
  // flight path: flown part bright, the plan ahead dim; engine burns thick orange, coasting thin blue
  const pth = mmPath(view);
  const n = pth.x.length;
  if (n > 1) {
    let iNow = 0;
    while (iNow + 1 < n && pth.t[iNow + 1] <= t) iNow++;
    const runs = (from, to, fut) => {
      // segments i → i+1 for i in [from, to), batched by style
      let i = from;
      while (i < to) {
        const pw = pth.p[i],
          col = pth.c[i];
        let j = i;
        g.beginPath();
        g.moveTo(X(pth.x[i]), Y(pth.y[i]));
        while (j < to && pth.p[j] === pw && pth.c[j] === col) {
          const x = X(pth.x[j + 1]),
            y = Y(pth.y[j + 1]);
          pth.b[j + 1] ? g.moveTo(x, y) : g.lineTo(x, y);
          j++;
        }
        if (pw) {
          g.setLineDash([]);
          g.lineWidth = fut ? 2.4 : 3.2;
          g.strokeStyle = fut ? hexA(PCOL.burn, 0.6) : PCOL.burn;
        } else {
          g.setLineDash(fut ? [3, 3] : []);
          g.lineWidth = fut ? 1 : 1.6;
          g.strokeStyle = fut ? hexA(col, 0.42) : col;
        }
        g.stroke();
        i = j;
      }
      g.setLineDash([]);
    };
    g.lineCap = "round";
    runs(iNow, n - 1, true);
    runs(0, iNow, false);
    g.lineCap = "butt";
    g.lineWidth = 1;
    // a dot for every burn (filled once fired, a ring while ahead) — even a few-second correction shows up
    const rBody =
      view === "sun"
        ? 0
        : Math.max(
            view === "earth" ? 4.5 : 5,
            (view === "earth" ? BODIES.earth.R : BODIES.mars.Rmean) * k,
          ) + 2;
    for (const b of mmBurnPts(view)) {
      const x = X(b.x),
        y = Y(b.y);
      if (
        Math.hypot(x - cx, y - cy) < rBody ||
        x < 0 ||
        y < 0 ||
        x > W ||
        y > Hh
      )
        continue;
      g.beginPath();
      g.arc(x, y, 2.9, 0, TAU);
      if (b.t <= t) {
        g.fillStyle = PCOL.burn;
        g.fill();
        g.strokeStyle = "rgba(5,8,14,.9)";
        g.lineWidth = 1;
        g.stroke();
      } else {
        g.strokeStyle = hexA(PCOL.burn, 0.85);
        g.lineWidth = 1.3;
        g.stroke();
        g.lineWidth = 1;
      }
    }
  }
  if (view === "sun") {
    // gravity-assist and arrival markers
    if (!MM.flybyPts) {
      MM.flybyPts = [];
      for (const e of md.events)
        if (
          ["flyby", "landing", "touchdown"].includes(e.kind) ||
          (e.kind === "burn" && /insertion|MOI|capture/i.test(e.name))
        ) {
          const s = md.ship.stateAt(e.t);
          if (s) {
            const P = vadd(planetHelio(s.ref, e.t).r, s.r);
            MM.flybyPts.push({ x: P[0], y: P[1], kind: e.kind, name: e.name });
          }
        }
    }
    for (const f of MM.flybyPts) {
      g.strokeStyle = f.kind === "flyby" ? "#b896ff" : "#ff6767";
      g.beginPath();
      g.arc(X(f.x), Y(f.y), 5, 0, TAU);
      g.stroke();
    }
  }
  // the craft(s)
  const crafts = [craftById("ship"), activeCraft(t)].filter(
    (c, i, A) => c && c.P && A.indexOf(c) === i,
  );
  for (const c of crafts) {
    const p = vsub(c.P, center);
    let x = cx + p[0] * k,
      y = cy - p[1] * k;
    const off = x < 4 || x > W - 4 || y < 4 || y > Hh - 4;
    const prim = c.o.id === "ship";
    if (off) {
      const ang = Math.atan2(cy - y, x - cx);
      x = cx + Math.cos(ang) * (Math.min(W, Hh) / 2 - 8);
      y = cy - Math.sin(ang) * (Math.min(W, Hh) / 2 - 8);
    }
    const v = c.Vh
      ? vsub(c.Vh, view === "sun" ? [0, 0, 0] : helio(view, t).v)
      : null;
    const burning = !!(c.s && c.s.T > 0 && (!c.s.surface || c.s.pad));
    const pulse = burning
      ? 6 + 4 * (0.5 + 0.5 * Math.sin(now / 120))
      : 5 + 3 * (0.5 + 0.5 * Math.sin(now / 260));
    g.strokeStyle = burning
      ? hexA(PCOL.burn, 0.8)
      : prim
        ? "rgba(255,181,71,.55)"
        : "rgba(127,209,255,.55)";
    g.beginPath();
    g.arc(x, y, pulse, 0, TAU);
    g.stroke();
    g.fillStyle = burning ? PCOL.burn : prim ? "#ffb547" : "#7fd1ff";
    g.beginPath();
    g.moveTo(x, y - 4);
    g.lineTo(x + 4, y);
    g.lineTo(x, y + 4);
    g.lineTo(x - 4, y);
    g.closePath();
    g.fill();
    if (v && vnorm(v) > 1e-6 && !off) {
      const vd = vunit(v);
      g.strokeStyle = g.fillStyle;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + vd[0] * 14, y - vd[1] * 14);
      g.stroke();
    }
    if (off) {
      g.fillStyle = "#ffb547";
      g.fillText(
        "off map →",
        clamp(x - 52, 4, W - 60),
        y + (y > cy ? -10 : 10),
      );
    }
    MM.hits.push({ x, y, id: "obj:" + c.o.id });
  }
  // locator inset: where this local system is around the Sun
  if (view !== "sun") {
    const ix = W - 34,
      iy = 34,
      ir = 26;
    g.fillStyle = "rgba(5,8,14,.85)";
    g.strokeStyle = "rgba(120,140,170,.35)";
    g.beginPath();
    g.arc(ix, iy, ir + 3, 0, TAU);
    g.fill();
    g.stroke();
    const ik = ir / (1.7 * AU);
    for (const p of ["earth", "mars"]) {
      const pts = planetOrbitPts(p, t);
      g.strokeStyle = BODY_COLORS[p] + "66";
      g.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        const x = ix + pts[i] * ik,
          y = iy - pts[i + 1] * ik;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = "#ffd27a";
    g.beginPath();
    g.arc(ix, iy, 2, 0, TAU);
    g.fill();
    for (const p of ["earth", "mars"]) {
      const P = helio(p, t).r;
      g.fillStyle = BODY_COLORS[p];
      g.beginPath();
      g.arc(ix + P[0] * ik, iy - P[1] * ik, p === view ? 2.8 : 1.8, 0, TAU);
      g.fill();
    }
    g.fillStyle = "rgba(135,148,168,.8)";
    g.fillText("Sun", ix - 8, iy + ir + 10);
  }
  g.fillStyle = "rgba(135,148,168,.5)";
  g.textAlign = "right";
  g.fillText("ecliptic · north up · ♈ →", W - 6, Hh - 10);
  g.textAlign = "left";
  // legend: engine burn vs coasting (skipped on the small phone-size map)
  if (W >= 220) {
    g.fillStyle = "rgba(5,8,14,.6)";
    g.fillRect(4, 4, 78, 30);
    g.lineCap = "round";
    g.strokeStyle = PCOL.burn;
    g.lineWidth = 3.2;
    g.beginPath();
    g.moveTo(10, 12);
    g.lineTo(22, 12);
    g.stroke();
    g.strokeStyle = MV.layers.phasecol ? "rgba(195,205,218,.8)" : PCOL.coast;
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(10, 26);
    g.lineTo(22, 26);
    g.stroke();
    g.lineCap = "butt";
    g.lineWidth = 1;
    g.fillStyle = "rgba(205,214,226,.85)";
    g.fillText("engine burn", 28, 12);
    g.fillText("coasting", 28, 26);
  }
  // where are we, in words
  const c = activeCraft(t) || craftById("ship");
  const info = $("#mmInfo");
  if (c && c.P) {
    const dS = vnorm(c.P),
      dE = vnorm(vsub(c.P, helio("earth", t).r)),
      dMo = vnorm(vsub(c.P, helio("moon", t).r)),
      dMa = vnorm(vsub(c.P, helio("mars", t).r));
    const dom = dominantBody(c.P, t);
    let txt;
    if (dom === "sun") {
      const dest = nextDestination(md, t, "sun");
      txt = `Interplanetary space, ${regionText(dS)} · ${fDist(dS)} from the Sun · ${fDist(dE)} from Earth${dest && dest !== "earth" ? ` · ${fDist(vnorm(vsub(c.P, helio(dest, t).r)))} to ${BODIES[dest].name}` : ""}`;
    } else if (dom === "moon")
      txt = `Inside the Moon’s sphere of influence · ${fDist(dMo - BODIES.moon.R)} above the Moon · ${fDist(dE)} from Earth`;
    else if (dom === "earth")
      txt = `Earth–Moon space · ${fDist(dE)} from Earth’s centre · ${fDist(dMo)} from the Moon`;
    else
      txt = `Inside Mars’s sphere of influence · ${fDist(dMa - BODIES.mars.Rmean)} above Mars · ${fDist(dE)} from Earth`;
    const who = c.o.id === "ship" ? "" : c.o.name + ": ";
    if (info.textContent !== who + txt) info.textContent = who + txt;
  }
}

// ---------------- ground track (Earth-orbit flights) ----------------
// The world map (equirectangular, the planet texture itself) with night shaded, the flight's ground track about an
// orbit and a half behind and one ahead, the launch site and the landing runway.
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
function fieldsFor(cfg, scn) {
  const F = [];
  const SC = SPACECRAFT[cfg.spacecraft];
  const lunar = (cfg.profile || "").startsWith("lunar");
  const grp = (title, ...items) =>
    F.push({ group: title, items: items.filter(Boolean) });
  const launchers = Object.entries(LAUNCHERS)
    .filter(([k, L]) =>
      SC.usesUpperStage
        ? k === "starship"
        : SC.winged
          ? !!L.sideMount
          : k !== "starship" && !L.sideMount,
    )
    .map(([k, L]) => [k, `${L.name} — ${L.org}`]);
  if (isLEO(cfg)) return fieldsLEO(cfg, SC, launchers, grp, F);
  grp(
    "Launch",
    {
      path: "launcher",
      label: "Launch vehicle",
      type: "select",
      options: launchers,
      wide: true,
      onSet: (c) => {
        delete c.launchAz;
      },
    },
    {
      path: "site",
      label: "Launch site",
      type: "select",
      options: Object.entries(LAUNCH_SITES).map(([k, s]) => [k, s.name]),
      wide: true,
      onSet: (c) => {
        delete c.launchAz;
      },
    },
    {
      path: "launch",
      label: "Liftoff (UTC)",
      type: "datetime",
      wide: true,
      onSet: (c, v, old) => {
        delete c.launchAz;
      },
    },
    {
      path: "parking.hp",
      label: "Parking orbit perigee",
      unit: "km",
      type: "number",
      min: 150,
      max: 1000,
      step: 1,
    },
    {
      path: "parking.ha",
      label: "Parking orbit apogee",
      unit: "km",
      type: "number",
      min: 150,
      max: 60000,
      step: 1,
    },
  );
  grp(
    "Crew & payload",
    { path: "name", label: "Mission name", type: "text", wide: true },
    { path: "shipName", label: "Spacecraft name", type: "text", wide: true },
    SC.crewMax > 0 && {
      path: "crew",
      label: "Crew",
      type: "number",
      min: 1,
      max: SC.crewMax,
      step: 1,
      unit: `max ${SC.crewMax}`,
    },
    cfg.payloadMass != null && {
      path: "payloadMass",
      label: "Habitat + cargo mass",
      unit: "kg",
      type: "number",
      min: 10000,
      max: 200000,
      step: 1000,
    },
    cfg.refill && {
      path: "refill.tankers",
      label: "Tanker flights",
      type: "number",
      min: 0,
      max: 20,
      step: 1,
      onSet: (c, v) => {
        c.refill.to = Math.min(1500000, Math.round(80000 + v * 150000));
      },
    },
    cfg.refill && {
      path: "refill.to",
      label: "Propellant after refilling",
      unit: "kg",
      type: "number",
      min: 0,
      max: 1500000,
      step: 10000,
    },
    cfg.isru && {
      path: "isru.to",
      label: "Propellant made on Mars (ISRU)",
      unit: "kg",
      type: "number",
      min: 0,
      max: 1500000,
      step: 10000,
    },
  );
  if (lunar) {
    grp(
      "To the Moon",
      cfg.tliMET != null && {
        path: "tliMET",
        label: "Trans-lunar injection",
        unit: "h after liftoff",
        type: "number",
        min: 1.5,
        max: 6,
        step: 0.01,
      },
      cfg.heo && {
        path: "heo.ha",
        label: "High Earth orbit apogee",
        unit: "km",
        type: "number",
        min: 20000,
        max: 100000,
        step: 100,
      },
      {
        path: "tof",
        label: "Earth → Moon flight time",
        unit: "h",
        type: "number",
        min: 55,
        max: 130,
        step: 0.1,
      },
      {
        path: "perilune",
        label:
          cfg.profile === "lunar-flyby"
            ? "Closest approach to the Moon"
            : "Arrival perilune altitude",
        unit: "km",
        type: "number",
        min: 60,
        max: 20000,
        step: 1,
      },
      cfg.loi && {
        path: "loi.circ",
        label: "Lunar orbit altitude",
        unit: "km",
        type: "number",
        min: 60,
        max: 500,
        step: 1,
        onSet: (c, v) => {
          if (c.perilune < v * 0.6) c.perilune = v;
        },
      },
      cfg.loi && {
        path: "loi.apo",
        label: "Initial capture apolune",
        unit: "km",
        type: "number",
        min: 100,
        max: 10000,
        step: 1,
      },
    );
    if (cfg.landing)
      grp(
        "Lunar landing",
        {
          kind: "preset",
          label: "Landing site",
          list: MOON_SITES,
          path: "landing",
          wide: true,
        },
        {
          path: "landing.lat",
          label: "Latitude",
          unit: "°N",
          type: "number",
          min: -60,
          max: 60,
          step: 0.001,
        },
        {
          path: "landing.lon",
          label: "Longitude",
          unit: "°E",
          type: "number",
          min: -180,
          max: 180,
          step: 0.001,
        },
        {
          path: "landMET",
          label: "Touchdown",
          unit: "h after liftoff",
          type: "number",
          min: 60,
          max: 400,
          step: 0.01,
          onSet: (c, v, old) => {
            const d = v - old;
            for (const k of ["undockMET", "pdiMET", "ascentMET", "teiMET"])
              if (c[k] != null) c[k] = +(c[k] + d).toFixed(3);
          },
        },
        {
          kind: "calc",
          label: "Surface stay",
          unit: "h",
          get: (c) => +(c.ascentMET - c.landMET).toFixed(2),
          set: (c, v) => {
            const old = c.ascentMET;
            c.ascentMET = +(c.landMET + v).toFixed(3);
            if (c.teiMET != null)
              c.teiMET = +(c.teiMET + (c.ascentMET - old)).toFixed(3);
          },
          min: 2,
          max: 400,
          step: 0.1,
        },
      );
    grp(
      "Home",
      cfg.teiMET != null && {
        path: "teiMET",
        label: "Trans-Earth injection",
        unit: "h after liftoff",
        type: "number",
        min: 70,
        max: 600,
        step: 0.01,
      },
      cfg.returnTof != null && {
        path: "returnTof",
        label: "Moon → Earth flight time",
        unit: "h",
        type: "number",
        min: 50,
        max: 120,
        step: 0.1,
      },
      {
        kind: "preset",
        label: "Splashdown / landing zone",
        list: EARTH_SITES,
        path: "splash",
        wide: true,
      },
      {
        path: "splash.lat",
        label: "Latitude",
        unit: "°N",
        type: "number",
        min: -60,
        max: 60,
        step: 0.01,
      },
      {
        path: "splash.lon",
        label: "Longitude",
        unit: "°E",
        type: "number",
        min: -180,
        max: 180,
        step: 0.01,
      },
      {
        path: "entry.fpa",
        label: "Entry flight-path angle",
        unit: "°",
        type: "number",
        min: -8,
        max: -5,
        step: 0.01,
      },
    );
  } else {
    (cfg.legs || []).forEach((leg, i) => {
      const P = `legs.${i}.`;
      const body = BODIES[leg.body].name;
      const ret = leg.body === "earth" && leg.departMars;
      const title =
        leg.type === "flyby"
          ? `${body} flyby`
          : leg.type === "orbit"
            ? `${body} orbit`
            : leg.type === "entry"
              ? ret
                ? "Return to Earth"
                : `${body} entry & landing`
              : `${body} (design point)`;
      const items = [];
      if (ret)
        items.push({
          path: P + "departMars",
          label: "Leave Mars (UTC)",
          type: "datetime",
          wide: true,
        });
      items.push({
        path: P + "t",
        label:
          leg.type === "entry"
            ? `Atmospheric entry (UTC)`
            : leg.type === "flyby"
              ? "Closest approach (UTC)"
              : "Arrival (UTC)",
        type: "datetime",
        wide: true,
        onSet: (c, v, old) => {
          if (leg.tLand && old) {
            const d = isoToT(v) - isoToT(old);
            c.legs[i].tLand = new Date(
              (isoToT(c.legs[i].tLand) + d + J2000_UNIX) * 1000,
            )
              .toISOString()
              .replace(".000", "");
          }
        },
      });
      if (leg.type === "flyby")
        items.push(
          leg.alt != null
            ? {
                path: P + "alt",
                label: "Flyby altitude",
                unit: "km",
                type: "number",
                min: 100,
                max: 200000,
                step: 1,
              }
            : {
                path: P + "minAlt",
                label: "Minimum flyby altitude",
                unit: "km",
                type: "number",
                min: 100,
                max: 20000,
                step: 1,
              },
        );
      if (leg.type === "orbit")
        items.push(
          {
            path: P + "alt",
            label: "Capture periapsis altitude",
            unit: "km",
            type: "number",
            min: 150,
            max: 5000,
            step: 1,
          },
          {
            path: P + "apo",
            label: "Capture apoapsis altitude",
            unit: "km",
            type: "number",
            min: 1000,
            max: 300000,
            step: 100,
          },
          {
            path: P + "incl",
            label: "Arrival inclination",
            unit: "°",
            type: "number",
            min: 0,
            max: 180,
            step: 0.1,
          },
        );
      if (leg.site && leg.body === "mars")
        items.push(
          {
            kind: "preset",
            label: "Landing site",
            list: MARS_SITES,
            path: P + "site",
            wide: true,
          },
          {
            path: P + "site.lat",
            label: "Latitude",
            unit: "°N",
            type: "number",
            min: -60,
            max: 60,
            step: 0.001,
          },
          {
            path: P + "site.lon",
            label: "Longitude",
            unit: "°E",
            type: "number",
            min: -180,
            max: 180,
            step: 0.001,
          },
        );
      if (leg.next === "land" && leg.tLand)
        items.push({
          path: P + "tLand",
          label: "Landing (UTC)",
          type: "datetime",
          wide: true,
        });
      if (leg.site && leg.body === "earth")
        items.push(
          {
            kind: "preset",
            label: "Landing zone",
            list: EARTH_SITES,
            path: P + "site",
            wide: true,
          },
          {
            path: P + "site.lat",
            label: "Latitude",
            unit: "°N",
            type: "number",
            min: -60,
            max: 60,
            step: 0.01,
          },
          {
            path: P + "site.lon",
            label: "Longitude",
            unit: "°E",
            type: "number",
            min: -180,
            max: 180,
            step: 0.01,
          },
        );
      if (leg.entry && leg.entry.fpa != null)
        items.push({
          path: P + "entry.fpa",
          label: "Entry flight-path angle",
          unit: "°",
          type: "number",
          min: -20,
          max: -4,
          step: 0.1,
        });
      grp(title, ...items);
    });
  }
  return F;
}
// Space Shuttle flights: launch, orbit, payload and the runway landing
function fieldsLEO(cfg, SC, launchers, grp, F) {
  const pads = Object.entries(LAUNCH_SITES)
    .filter(([k]) => /^KSC39/.test(k))
    .map(([k, s]) => [k, s.name]);
  grp(
    "Launch",
    {
      path: "launcher",
      label: "Launch vehicle",
      type: "select",
      options: launchers,
      wide: true,
    },
    {
      path: "site",
      label: "Launch pad",
      type: "select",
      options: pads,
      wide: true,
    },
    { path: "launch", label: "Liftoff (UTC)", type: "datetime", wide: true },
    {
      path: "incl",
      label: "Orbit inclination",
      unit: "°",
      type: "number",
      min: 28.5,
      max: 57,
      step: 0.01,
    },
    {
      path: "parking.ha",
      label: "Apogee at main engine cutoff",
      unit: "km",
      type: "number",
      min: 160,
      max: 700,
      step: 1,
    },
    {
      path: "oms2.hp",
      label: "Perigee after OMS-2",
      unit: "km",
      type: "number",
      min: 150,
      max: 650,
      step: 1,
    },
  );
  grp(
    "Crew & payload",
    { path: "name", label: "Mission name", type: "text", wide: true },
    { path: "shipName", label: "Orbiter", type: "text", wide: true },
    {
      path: "crew",
      label: "Crew",
      type: "number",
      min: 2,
      max: SC.crewMax,
      step: 1,
      unit: `max ${SC.crewMax}`,
    },
    {
      path: "scOverride.PAY.dry",
      label: "Payload in the bay",
      unit: "kg",
      type: "number",
      min: 0,
      max: 25000,
      step: 100,
    },
    {
      path: "scOverride.OMS.prop",
      label: "OMS propellant",
      unit: "kg",
      type: "number",
      min: 4000,
      max: 12800,
      step: 100,
    },
  );
  grp(
    "Landing",
    {
      path: "runway",
      label: "Runway",
      type: "select",
      options: RUNWAY_LIST(),
      wide: true,
    },
    {
      path: "landing",
      label: "Landing (UTC) — the nearest pass is chosen",
      type: "datetime",
      wide: true,
    },
    {
      path: "dragChute",
      label: "Drag chute",
      type: "select",
      options: [
        ["true", "Yes (flown from 1992)"],
        ["false", "No"],
      ],
      wide: true,
      parse: (v) => v === "true",
    },
  );
  return F;
}
function renderDetail() {
  const s = SETUP.scn,
    cfg = SETUP.cfg;
  const root = $("#scnDetail");
  root.innerHTML = "";
  root.append(
    h(
      "div",
      { class: "det-head" },
      h(
        "div",
        null,
        h("h2", null, s.title),
        h("div", { class: "det-sub" }, `${s.agency} · ${s.year} · ${s.status}`),
      ),
      h(
        "div",
        { class: "chipline" },
        h(
          "span",
          { class: "pill " + (s.crewed ? "crew" : "robot") },
          s.crewed ? "Crewed" : "Robotic",
        ),
        h("span", { class: "pill st" }, s.tag),
      ),
    ),
  );
  root.append(
    h("p", { class: "p", style: "max-width:75ch;margin-top:8px" }, s.blurb),
  );
  if (s.crewNames)
    root.append(h("p", { class: "p" }, h("b", null, "Crew: "), s.crewNames));
  const colA = h("div"),
    colB = h("div");
  root.append(h("div", { class: "det-cols" }, colA, colB));
  // inputs
  colA.append(h("h3", { class: "h" }, "Mission inputs"));
  const form = h("form", {
    id: "cfgForm",
    onsubmit: (e) => e.preventDefault(),
  });
  for (const g of fieldsFor(cfg, s)) {
    const fs = h("fieldset", null, h("legend", null, g.group));
    const grid = h("div", { class: "fgrid" });
    fs.append(grid);
    for (const f of g.items) grid.append(fieldEl(f));
    form.append(fs);
  }
  form.append(
    h(
      "div",
      { class: "btnrow" },
      h(
        "button",
        {
          type: "button",
          class: "tb",
          onclick: () => {
            SETUP.cfg = JSON.parse(JSON.stringify(SETUP.orig));
            renderDetail();
            schedulePlan(0);
          },
        },
        "Reset to the real mission",
      ),
    ),
  );
  colA.append(form);
  if (cfg.legs && cfg.legs[0] && cfg.legs[0].body === "mars") {
    colA.append(h("h3", { class: "h" }, "Launch window — porkchop plot"));
    colA.append(
      h(
        "p",
        { class: "note-s" },
        "Departure energy C3 (km²/s²) for every departure date and flight time to Mars. Darker = cheaper. Click to pick a departure and arrival; the planner re-targets the whole flight.",
      ),
    );
    colA.append(
      h(
        "div",
        { id: "porkWrap" },
        h("canvas", { id: "pork", width: 640, height: 400 }),
        h("div", { id: "porkInfo" }),
      ),
    );
    setTimeout(drawPorkchop, 30);
  }
  // vehicle card
  colB.append(
    h("h3", { class: "h" }, "Launch vehicle"),
    h("div", { id: "vehCard" }),
  );
  colB.append(
    h("h3", { class: "h" }, "Spacecraft"),
    h("div", { id: "scCard" }),
  );
  if (s.real)
    colB.append(
      h(
        "h3",
        { class: "h" },
        s.status === "Flown" || s.status === "In flight"
          ? "What really happened"
          : "Reference",
      ),
      h(
        "div",
        { class: "kv kv2" },
        ...Object.entries(s.real).flatMap(([k, v]) => [
          h("div", { class: "k" }, k),
          h("div", { class: "v", style: "color:var(--fg-2)" }, v),
        ]),
      ),
    );
  // plan box
  root.append(
    h(
      "div",
      { class: "plan-box" },
      h(
        "div",
        { style: "min-width:0" },
        h("div", { class: "plan-status", id: "planStatus" }),
        h("div", { class: "plan-kpis", id: "planKpis" }),
      ),
      h(
        "div",
        { class: "go-wrap" },
        h(
          "label",
          {
            class: "chk go-sound",
            title: "Sound (M) — engines, countdown, separations, ambient music",
          },
          h("input", {
            type: "checkbox",
            id: "goSound",
            checked: SND.on,
            onchange: (e) => setSound(e.target.checked),
          }),
          "Sound",
        ),
        h(
          "button",
          { class: "tb primary go", id: "goBtn", onclick: launchFromSetup },
          "Fly this mission ▶",
        ),
      ),
    ),
  );
  renderVehicleCard();
  renderScCard();
  renderPlanStatus();
}
function fieldEl(f) {
  const cfg = SETUP.cfg;
  const wrap = h("label", { class: "f" + (f.wide ? " wide" : "") });
  const lab = h(
    "span",
    null,
    f.label,
    f.unit ? h("em", null, ` (${f.unit})`) : null,
  );
  wrap.append(lab);
  let input;
  if (f.kind === "preset") {
    input = h(
      "select",
      null,
      h("option", { value: "" }, "Choose a known site…"),
      ...f.list.map((x, i) => h("option", { value: i }, x[0])),
    );
    const cur = gp(cfg, f.path);
    const idx = cur
      ? f.list.findIndex(
          (x) =>
            Math.abs(x[1] - cur.lat) < 0.01 && Math.abs(x[2] - cur.lon) < 0.01,
        )
      : -1;
    if (idx >= 0) input.value = idx;
    input.addEventListener("change", () => {
      if (input.value === "") return;
      const x = f.list[+input.value];
      const o = gp(SETUP.cfg, f.path) || {};
      o.lat = x[1];
      o.lon = x[2];
      o.name = x[0].replace(/\s*\(.*\)/, "");
      if (x[3] != null) o.elev = x[3];
      sp(SETUP.cfg, f.path, o);
      renderDetail();
      schedulePlan();
    });
    wrap.append(input);
    return wrap;
  }
  const val = f.kind === "calc" ? f.get(cfg) : gp(cfg, f.path);
  if (f.type === "select") {
    input = h(
      "select",
      null,
      ...f.options.map(([v, l]) => h("option", { value: v }, l)),
    );
    input.value = String(val);
  } else if (f.type === "datetime") {
    input = h("input", {
      type: "datetime-local",
      value: val ? isoLocalInput(isoToT(val)) : "",
      step: 60,
    });
  } else if (f.type === "number") {
    input = h("input", {
      type: "number",
      value: val ?? "",
      min: f.min,
      max: f.max,
      step: f.step || "any",
      inputmode: "decimal",
    });
  } else input = h("input", { type: "text", value: val ?? "" });
  const origV = f.kind === "calc" ? f.get(SETUP.orig) : gp(SETUP.orig, f.path);
  const mark = () => {
    const cur = f.kind === "calc" ? f.get(SETUP.cfg) : gp(SETUP.cfg, f.path);
    wrap.classList.toggle(
      "changed",
      JSON.stringify(cur) !== JSON.stringify(origV),
    );
  };
  input.addEventListener("change", () => {
    const old = f.kind === "calc" ? f.get(SETUP.cfg) : gp(SETUP.cfg, f.path);
    let v = input.value;
    if (f.type === "number" || f.kind === "calc") {
      v = parseFloat(v);
      if (!isFinite(v)) {
        input.value = old;
        return;
      }
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      input.value = v;
    }
    if (f.type === "datetime") {
      v = inputToIso(v);
      if (!v || !isFinite(isoToT(v))) {
        input.value = isoLocalInput(isoToT(old));
        return;
      }
    }
    if (f.parse) v = f.parse(v);
    if (f.kind === "calc") f.set(SETUP.cfg, v);
    else sp(SETUP.cfg, f.path, v);
    if (f.onSet) f.onSet(SETUP.cfg, v, old);
    mark();
    if (
      ["launcher", "crew", "payloadMass"].includes(f.path) ||
      /^scOverride/.test(f.path || "")
    ) {
      renderVehicleCard();
      renderScCard();
    }
    if (f.path === "launch" || /legs\.0\.t$/.test(f.path)) drawPorkchop();
    if ((f.path && f.path.startsWith("landMET")) || f.kind === "calc")
      renderDetailSoft();
    schedulePlan();
  });
  mark();
  wrap.append(input);
  return wrap;
}
function renderDetailSoft() {
  const y = $("#setup").scrollTop;
  renderDetail();
  $("#setup").scrollTop = y;
}
// ---------------- vehicle & spacecraft cards ----------------
function stackDeltaV(L, payload) {
  const st = L.stages;
  let m =
    payload +
    st.reduce((a, s) => a + s.dry + s.propMass, 0) +
    L.jettison.reduce((a, j) => a + j.mass, 0);
  let dv = 0,
    i = 0;
  const jet = L.jettison.reduce((a, j) => a + j.mass, 0);
  if (st[0].parallel) {
    const B = st[0],
      Cc = st[1];
    const FB = (B.thrustSL + B.thrustVac) / 2,
      FC = (Cc.thrustSL + Cc.thrustVac) / 2;
    const mdB = FB / (((B.ispSL + B.ispVac) / 2) * G0),
      mdC = FC / (((Cc.ispSL + Cc.ispVac) / 2) * G0);
    const tB = B.propMass / mdB;
    const coreUsed = Cc.ignition ? 0 : Math.min(Cc.propMass * 0.9, mdC * tB);
    const isp =
      (FB + (Cc.ignition ? 0 : FC)) / ((mdB + (Cc.ignition ? 0 : mdC)) * G0);
    const m1 = m - B.propMass - coreUsed;
    dv += isp * G0 * Math.log(m / m1);
    m = m1 - B.dry - jet;
    const rem = Cc.propMass - coreUsed;
    dv += Cc.ispVac * G0 * Math.log(m / (m - rem));
    m -= rem + Cc.dry;
    i = 2;
  }
  for (; i < st.length; i++) {
    const s = st[i];
    const isp = i === 0 ? (s.ispSL + s.ispVac) / 2 : s.ispVac;
    dv += isp * G0 * Math.log(m / (m - s.propMass));
    m -= s.propMass + s.dry;
    if (i === 0) m -= jet;
  }
  return dv / 1000;
}
const SHORT_NAMES = {
  shuttle: "Space Shuttle",
  saturnV: "Saturn V",
  sls1: "SLS Block 1",
  lm5: "Long March 5",
  atlasV541: "Atlas V 541",
  atlasAgena: "Atlas-Agena",
  falconHeavy: "Falcon Heavy",
  starship: "Starship",
  lvm3: "LVM3",
};
function shuttleSVG(L, cx, base, k, parts, variant) {
  const S = L.stages[0],
    E = L.stages[1],
    low = S.booster.y0 - S.eng.len; // the boosters' nozzles stand on the ground
  const Y = (yy) => base - (yy - low) * k,
    cone = (x0, y0, len, rb, rt, col, extra = "") =>
      `<path d="M${x0 - rb * k},${Y(y0)} L${x0 + rb * k},${Y(y0)} L${x0 + rt * k},${Y(y0 + len)} L${x0 - rt * k},${Y(y0 + len)}Z" fill="${col}" ${extra}/>`;
  for (const sgn of [-1, 1]) {
    const xb = cx + sgn * S.booster.offset * k;
    parts.push(cone(xb, low, S.eng.len, S.eng.r * 0.85, 0.5, "#4a4c50"));
    let yb = S.booster.y0;
    for (const [len, rb, rt, col] of S.geom) {
      parts.push(cone(xb, yb, len, rb, rt, col));
      yb += len;
    }
  }
  let ye = 0;
  for (const [len, rb, rt, col] of E.geom) {
    parts.push(
      cone(
        cx,
        ye,
        len,
        rb,
        rt,
        variant === "sts1" && col !== "#4a4a4a" ? "#e9e7e0" : col,
        'stroke="rgba(0,0,0,.25)" stroke-width=".4"',
      ),
    );
    ye += len;
  } // STS-1 and STS-2 flew painted tanks
  // the orbiter, seen from above its payload bay doors: fuselage, double-delta wings, OMS pods
  const oy = SH_STACK.orbY,
    pt = (x, yy) => `${cx + x * k},${Y(oy + yy)}`;
  parts.push(
    `<path d="M${pt(-11.95, 2.3)} L${pt(-4.9, 11.4)} L${pt(-2.6, 19.6)} L${pt(-2.62, 24)} L${pt(-2.2, 28.6)} Q${pt(-1.4, 32.4)} ${pt(0, 32.75)} Q${pt(1.4, 32.4)} ${pt(2.2, 28.6)} L${pt(2.62, 24)} L${pt(2.6, 19.6)} L${pt(4.9, 11.4)} L${pt(11.95, 2.3)} L${pt(11.9, 1)} L${pt(3.25, 0.5)} L${pt(3.25, -0.6)} L${pt(-3.25, -0.6)} L${pt(-3.25, 0.5)} L${pt(-11.9, 1)}Z" fill="#efede7" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>`,
  );
  parts.push(
    `<path d="M${pt(-2.3, 25.8)} L${pt(2.3, 25.8)} L${pt(1.8, 28.4)} L${pt(-1.8, 28.4)}Z" fill="#141517"/><path d="M${pt(-0.9, 31.3)} Q${pt(0, 32.9)} ${pt(0.9, 31.3)}Z" fill="#141517"/>`,
  );
  parts.push(
    `<line x1="${cx}" y1="${Y(oy + 5.6)}" x2="${cx}" y2="${Y(oy + 23.9)}" stroke="rgba(0,0,0,.3)" stroke-width=".6"/><path d="M${pt(-0.25, 5.8)} L${pt(0.25, 5.8)} L${pt(0.2, -4)} L${pt(-0.2, -4)}Z" fill="#9ea3a9"/>`,
  );
}
function launcherSVG(selKey, variant) {
  const keys = Object.keys(LAUNCHERS);
  const Hh = 300,
    base = 266,
    k = 225 / 125;
  let x = 30;
  const out = [];
  const grid = [0, 25, 50, 75, 100, 125];
  for (const key of keys) {
    const L = LAUNCHERS[key];
    const sel = key === selKey;
    const op = sel ? 1 : 0.38;
    const core = L.stages.filter((s) => !s.parallel);
    const bst = L.stages[0].parallel ? L.stages[0] : null;
    const maxR = Math.max(
      ...L.stages.map((s) => Math.max(...s.geom.map((g) => g[1]))),
      bst ? bst.booster.offset + bst.geom[0][1] : 0,
    );
    const slot = Math.max(66, 2 * maxR * k + 18);
    const cx = x + slot / 2;
    let y = base;
    const parts = [];
    if (L.sideMount) {
      shuttleSVG(L, cx, base, k, parts, sel ? variant : null);
      out.push(
        `<g opacity="${op}" style="cursor:pointer" data-key="${key}"><rect x="${x}" y="0" width="${slot}" height="${Hh}" fill="transparent"/>${parts.join("")}<text x="${cx}" y="${base + 16}" fill="${sel ? "#ffb547" : "#8794a8"}" font-size="11" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="${sel ? 700 : 500}">${esc(SHORT_NAMES[key] || L.name)}</text><text x="${cx}" y="${base - L.height * k - 7}" fill="${sel ? "#ffb547" : "#56647a"}" font-size="10" text-anchor="middle" font-family="IBM Plex Mono, monospace">${L.height} m</text></g>`,
      );
      x += slot;
      continue;
    }
    if (bst) {
      const off = bst.booster.offset;
      for (const sgn of [-1, 1]) {
        let yb = base;
        for (const [len, rb, rt, col] of bst.geom) {
          parts.push(
            `<path d="M${cx + sgn * off * k - rb * k},${yb} L${cx + sgn * off * k + rb * k},${yb} L${cx + sgn * off * k + rt * k},${yb - len * k} L${cx + sgn * off * k - rt * k},${yb - len * k}Z" fill="${col}"/>`,
          );
          yb -= len * k;
        }
      }
    }
    for (const s of core)
      for (const [len, rb, rt, col] of s.geom) {
        parts.push(
          `<path d="M${cx - rb * k},${y} L${cx + rb * k},${y} L${cx + rt * k},${y - len * k} L${cx - rt * k},${y - len * k}Z" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width=".4"/>`,
        );
        y -= len * k;
      }
    const rest = L.height * k - (base - y);
    if (rest > 1) {
      const r =
        (L.payloadFairing
          ? L.payloadFairing.r
          : core[core.length - 1].geom.slice(-1)[0][2]) * k;
      parts.push(
        `<path d="M${cx - r},${y} L${cx + r},${y} L${cx + r},${y - rest * 0.45} Q${cx + r},${y - rest * 0.8} ${cx},${y - rest} Q${cx - r},${y - rest * 0.8} ${cx - r},${y - rest * 0.45}Z" fill="${L.payloadFairing ? L.payloadFairing.color : "#d9dde2"}"/>`,
      );
    }
    out.push(
      `<g opacity="${op}" style="cursor:pointer" data-key="${key}"><rect x="${x}" y="0" width="${slot}" height="${Hh}" fill="transparent"/>${parts.join("")}<text x="${cx}" y="${base + 16}" fill="${sel ? "#ffb547" : "#8794a8"}" font-size="11" text-anchor="middle" font-family="IBM Plex Sans Condensed, sans-serif" font-weight="${sel ? 700 : 500}">${esc(SHORT_NAMES[key] || L.name)}</text><text x="${cx}" y="${base - L.height * k - 7}" fill="${sel ? "#ffb547" : "#56647a"}" font-size="10" text-anchor="middle" font-family="IBM Plex Mono, monospace">${L.height} m</text></g>`,
    );
    x += slot;
  }
  const W = x + 10;
  const g = `<g stroke="#1c2738">${grid.map((m) => `<line x1="24" x2="${W - 4}" y1="${base - m * k}" y2="${base - m * k}"/><text x="2" y="${base - m * k + 3}" fill="#56647a" stroke="none" font-size="9" font-family="IBM Plex Mono, monospace">${m}</text>`).join("")}</g>`;
  return `<div class="scroll-x"><svg class="vehicle-svg" viewBox="0 0 ${W} ${Hh}" style="min-width:${Math.round(W * 0.82)}px" role="img" aria-label="Launch vehicles drawn to scale; heights in metres">${g}${out.join("")}</svg></div>`;
}
function renderVehicleCard() {
  const el = $("#vehCard");
  if (!el) return;
  const cfg = SETUP.cfg;
  const L = LAUNCHERS[cfg.launcher];
  const SC = scWithOverrides(cfg);
  const pay = scTotalMass(SC);
  const dvCap = stackDeltaV(L, pay);
  const lunar = (cfg.profile || "").startsWith("lunar");
  let dep = 3.13,
    depTxt = "trans-lunar injection";
  if (isLEO(cfg)) {
    dep = 0;
    depTxt = "";
  } else if (!lunar) {
    try {
      const tDep =
        isoToT(cfg.launch) + (cfg.refill ? cfg.refill.days * DAY : 0);
      const leg = cfg.legs[0];
      const a = planetHelio("earth", tDep),
        b = planetHelio(leg.body, isoToT(leg.t));
      const Lm = lambert(
        a.r,
        b.r,
        isoToT(leg.t) - tDep,
        BODIES.sun.mu,
        [0, 0, 1],
      );
      const vinf = vsub(Lm.v1, a.v);
      const rp = BODIES.earth.R + 200;
      dep =
        Math.sqrt(vdot(vinf, vinf) + (2 * BODIES.earth.mu) / rp) -
        Math.sqrt(BODIES.earth.mu / rp);
      depTxt = `escape to ${BODIES[leg.body].name} (C3 ${vdot(vinf, vinf).toFixed(1)})`;
    } catch (e) {
      dep = 3.6;
    }
  }
  const leo = 9.3;
  const need = leo + (cfg.refill || (lunar && cfg.tliBy === "sc") ? 0 : dep);
  const margin = dvCap - need;
  el.innerHTML = launcherSVG(cfg.launcher, cfg.lvVariant);
  {
    const sx = el.querySelector(".scroll-x"),
      gs = el.querySelector(`g[data-key="${cfg.launcher}"]`); // keep the chosen vehicle in view
    if (sx && gs)
      requestAnimationFrame(() => {
        const a = gs.getBoundingClientRect(),
          b = sx.getBoundingClientRect();
        if (a.right > b.right || a.left < b.left)
          sx.scrollLeft += a.left - b.left - (b.width - a.width) / 2;
      });
  }
  el.querySelector("svg").addEventListener("click", (e) => {
    const g = e.target.closest("g[data-key]");
    if (!g) return;
    const k = g.dataset.key;
    const ok = $$("#cfgForm select").find((s) =>
      [...s.options].some((o) => o.value === k),
    );
    if (!ok) return;
    ok.value = k;
    ok.dispatchEvent(new Event("change"));
  });
  el.append(h("p", { class: "p", style: "margin-top:8px" }, L.blurb));
  el.append(
    h(
      "div",
      { class: "kv" },
      h("div", { class: "k" }, "Height · diameter"),
      h("div", { class: "v" }, `${L.height} m · ${L.diameter} m`),
      h("div", { class: "k" }, "Liftoff mass with this payload"),
      h(
        "div",
        { class: "v" },
        fMass(
          pay +
            L.stages.reduce((a, s) => a + s.dry + s.propMass, 0) +
            L.jettison.reduce((a, j) => a + j.mass, 0),
        ),
      ),
      ...(CAPACITY[cfg.launcher] || []).flatMap(([k, v]) => [
        h("div", { class: "k" }, "Capacity: " + k),
        h("div", { class: "v" }, v),
      ]),
      h("div", { class: "k" }, "Ideal stack Δv with this payload"),
      h("div", { class: "v" }, fx(dvCap, 2) + " km/s"),
      h(
        "div",
        { class: "k" },
        `Needed: orbit ≈ ${leo} km/s${need > leo ? " + " + depTxt + " " + fx(dep, 2) : ""}`,
      ),
      h(
        "div",
        { class: "v " + (margin >= 0 ? "ok" : "bad") },
        fx(need, 2) + " km/s",
      ),
      h(
        "div",
        { class: "full note-s" },
        margin >= 0
          ? `Margin ≈ ${fx(margin, 2)} km/s (rough rocket-equation check; the full simulation decides).`
          : `Short by ≈ ${fx(-margin, 2)} km/s — expect the simulation to fall short.` +
              (cfg.refill ? "" : ""),
      ),
    ),
  );
  el.append(
    h(
      "div",
      { class: "scroll-x" },
      h(
        "table",
        { class: "t", style: "margin-top:8px" },
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            h("th", null, "Stage"),
            h("th", null, "Propellant"),
            h("th", null, "Prop. mass"),
            h("th", null, "Thrust (vac)"),
          ),
        ),
        h(
          "tbody",
          null,
          ...L.stages.map((s) =>
            h(
              "tr",
              null,
              h("td", null, s.name),
              h("td", null, PROP[s.prop].label),
              h("td", { class: "n" }, fMass(s.propMass)),
              h("td", { class: "n" }, fForce(s.thrustVac)),
            ),
          ),
        ),
      ),
    ),
  );
}
function scWithOverrides(cfg) {
  const SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.payloadMass && SC.modules.CARGO)
    SC.modules.CARGO.dry = cfg.payloadMass;
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      if (SC.modules[k]) Object.assign(SC.modules[k], cfg.scOverride[k]);
  return SC;
}
function renderScCard() {
  const el = $("#scCard");
  if (!el) return;
  const cfg = SETUP.cfg;
  const SC = scWithOverrides(cfg);
  el.innerHTML = "";
  el.append(
    h(
      "p",
      { class: "p" },
      h("b", null, SC.name),
      ` — ${fMass(scTotalMass(SC))} total${SC.crewMax ? `, up to ${SC.crewMax} crew` : ""}.`,
    ),
  );
  el.append(
    h(
      "div",
      { class: "scroll-x" },
      h(
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
                      `${m.engine.name} · ${fForce(m.engine.thrust)} · Isp ${m.engine.isp} s · ${PROP[m.engine.prop].label}`,
                    )
                  : null,
              ),
              h("td", { class: "n" }, fMass(m.dry)),
              h("td", { class: "n" }, m.prop ? fMass(m.prop) : "—"),
            ),
          ),
        ),
      ),
    ),
  );
}
// ---------------- porkchop ----------------
function drawPorkchop() {
  const cv = $("#pork");
  if (!cv) return;
  const cfg = SETUP.cfg;
  const leg = cfg.legs[0];
  const extra =
    (cfg.refill ? cfg.refill.days * DAY : 0) + (cfg.tmiDelay ?? 1) * 3600;
  const tDepCur = isoToT(cfg.launch) + extra,
    tArrCur = isoToT(leg.t),
    tofCur = tArrCur - tDepCur;
  const tD0 = tDepCur - 50 * DAY,
    tD1 = tDepCur + 50 * DAY,
    tf0 = 110 * DAY,
    tf1 = 360 * DAY;
  const nx = 80,
    ny = 60;
  const pc = porkchop("earth", leg.body, tD0, tD1, tf0, tf1, nx, ny);
  const W = cv.width,
    Hh = cv.height,
    L = 46,
    B = 30,
    Tp = 8,
    Rr = 10;
  const pw = W - L - Rr,
    ph = Hh - B - Tp;
  const g = cv.getContext("2d");
  g.fillStyle = "#060a12";
  g.fillRect(0, 0, W, Hh);
  const img = g.createImageData(pw, ph);
  const col = (c3) => {
    if (!isFinite(c3)) return [10, 14, 22];
    const f = clamp(
      (Math.log(c3) - Math.log(8)) / (Math.log(120) - Math.log(8)),
      0,
      1,
    );
    const band = Math.floor(f * 14) / 14;
    const a = [
      [20, 70, 110],
      [40, 160, 170],
      [230, 200, 90],
      [200, 80, 40],
      [60, 20, 30],
    ];
    const p = band * (a.length - 1);
    const i = Math.floor(p),
      r = p - i;
    const c0 = a[i],
      c1 = a[Math.min(i + 1, a.length - 1)];
    return c0.map((v, k) => v + (c1[k] - v) * r);
  };
  for (let py = 0; py < ph; py++)
    for (let px = 0; px < pw; px++) {
      const fx_ = (px / (pw - 1)) * (nx - 1),
        fy = (1 - py / (ph - 1)) * (ny - 1);
      const i = Math.round(fx_),
        j = Math.round(fy);
      const c = col(pc.c3[j * nx + i]);
      const o = 4 * (py * pw + px);
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  g.putImageData(img, L, Tp);
  g.fillStyle = "#8794a8";
  g.font = '11px "IBM Plex Mono", monospace';
  for (let d = 0; d <= 100; d += 25) {
    const x = L + (d / 100) * pw;
    const dt = tToDate(tD0 + (d / 100) * (tD1 - tD0));
    const lab = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
    const tw = g.measureText(lab).width;
    g.fillText(lab, clamp(x - tw / 2, 2, W - tw - 2), Hh - 10);
    g.fillRect(x, Tp + ph, 1, 4);
  }
  for (let tf = 120; tf <= 360; tf += 60) {
    const y = Tp + (1 - (tf * DAY - tf0) / (tf1 - tf0)) * ph;
    g.fillText(tf + "d", 6, y + 4);
    g.fillRect(L - 4, y, 4, 1);
  }
  const X = (td) => L + ((td - tD0) / (tD1 - tD0)) * pw,
    Y = (tf) => Tp + (1 - (tf - tf0) / (tf1 - tf0)) * ph;
  if (tofCur > tf0 && tofCur < tf1) {
    g.strokeStyle = "#ffb547";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(X(tDepCur), Y(tofCur), 7, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(X(tDepCur) - 12, Y(tofCur));
    g.lineTo(X(tDepCur) + 12, Y(tofCur));
    g.moveTo(X(tDepCur), Y(tofCur) - 12);
    g.lineTo(X(tDepCur), Y(tofCur) + 12);
    g.stroke();
  }
  // minimum marker
  let bi = 0;
  for (let i = 0; i < pc.c3.length; i++)
    if (isFinite(pc.c3[i]) && pc.c3[i] < pc.c3[bi]) bi = i;
  const bx = bi % nx,
    by = Math.floor(bi / nx);
  g.fillStyle = "#5fe3a1";
  g.beginPath();
  g.arc(L + (bx / (nx - 1)) * pw, Tp + (1 - by / (ny - 1)) * ph, 4, 0, TAU);
  g.fill();
  const c3Cur = (() => {
    const a = planetHelio("earth", tDepCur),
      b = planetHelio(leg.body, tArrCur);
    const Lm = lambert(a.r, b.r, tofCur, BODIES.sun.mu, [0, 0, 1]);
    if (!Lm) return NaN;
    const d = vsub(Lm.v1, a.v);
    return vdot(d, d);
  })();
  $("#porkInfo").textContent =
    `Selected: depart ${fmtUTC(tDepCur, false)}, ${fx(tofCur / DAY, 0)} d → C3 ${fx(c3Cur, 1)} km²/s² · green dot = cheapest (C3 ${fx(pc.c3[bi], 1)})`;
  cv.onclick = (e) => {
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W,
      py = ((e.clientY - r.top) / r.height) * Hh;
    if (px < L || px > L + pw || py < Tp || py > Tp + ph) return;
    const td = tD0 + ((px - L) / pw) * (tD1 - tD0),
      tf = tf0 + (1 - (py - Tp) / ph) * (tf1 - tf0);
    const launchT = td - extra;
    const iso = (t) =>
      tToDate(t)
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z");
    const oldArr = isoToT(leg.t);
    SETUP.cfg.launch = iso(Math.round(launchT / 60) * 60);
    delete SETUP.cfg.launchAz;
    const newArr = Math.round((td + tf) / 60) * 60;
    const dShift = newArr - oldArr;
    leg.t = iso(newArr);
    if (leg.tLand) leg.tLand = iso(isoToT(leg.tLand) + dShift);
    renderDetailSoft();
    schedulePlan();
  };
}
// ---------------- background planning ----------------
function schedulePlan(delay = 650) {
  clearTimeout(SETUP.debounce);
  SETUP.plan = null;
  SETUP.planErr = null;
  SETUP.planning = true;
  SETUP.progress = "waiting for inputs…";
  renderPlanStatus();
  SETUP.debounce = setTimeout(() => {
    const cfg = JSON.parse(JSON.stringify(SETUP.cfg));
    const scn = SETUP.scn;
    const t0 = performance.now();
    SETUP.planning = true;
    SETUP.progress = "starting…";
    renderPlanStatus();
    Planner.plan(cfg, (m) => {
      SETUP.progress = m;
      renderPlanStatus();
      SETUP.onProgress && SETUP.onProgress(m);
    })
      .then((M) => {
        if (JSON.stringify(SETUP.cfg) !== JSON.stringify(cfg)) return;
        SETUP.plan = M;
        SETUP.planMs = performance.now() - t0;
        SETUP.planning = false;
        renderPlanStatus();
        SETUP.onDone && SETUP.onDone(M);
      })
      .catch((err) => {
        if (err && err.superseded) return;
        SETUP.planErr = err;
        SETUP.planning = false;
        renderPlanStatus();
        SETUP.onFail && SETUP.onFail(err);
      });
  }, delay);
}
function renderPlanStatus() {
  const st = $("#planStatus"),
    kp = $("#planKpis"),
    go = $("#goBtn");
  if (!st) return;
  kp.innerHTML = "";
  if (SETUP.planErr) {
    st.innerHTML = `<b style="color:var(--red)">The planner could not solve this mission.</b> ${esc(SETUP.planErr.message || "")} — try values closer to the original.`;
    go.disabled = true;
    return;
  }
  if (SETUP.planning || !SETUP.plan) {
    st.innerHTML = `<span class="spinner"></span><b>Solving the trajectory…</b> <span style="color:var(--muted)">${esc(SETUP.progress)}</span>`;
    go.disabled = false;
    go.textContent = "Fly this mission ▶";
    return;
  }
  const M = SETUP.plan;
  const fail = M.failed;
  st.innerHTML = fail
    ? `<b style="color:var(--red)">Solved — but the mission falls short.</b> ${esc(M.warnings[0] || "")}`
    : `<b style="color:var(--green)">Trajectory solved</b> in ${(SETUP.planMs / 1000).toFixed(1)} s.${M.warnings.length ? ' <span style="color:var(--amber)">⚠ ' + esc(M.warnings.join(" ")) + "</span>" : ""}`;
  const dvTot = M.burns.reduce((a, b) => a + (b.dv || 0), 0),
    prop = M.burns.reduce((a, b) => a + (b.prop || 0), 0);
  const kpi = (l, v) =>
    h(
      "div",
      { class: "kpi" },
      h("span", { class: "kl" }, l),
      h("span", { class: "kv2" }, v),
    );
  kp.append(
    kpi("Duration", fTime(M.tEnd - M.t0)),
    kpi("Burns", String(M.burns.length)),
    kpi("Total Δv (burns)", fx(dvTot, 0) + " m/s"),
    kpi("Propellant burned", fMass(prop)),
  );
  if (M.summary.ascent)
    kp.append(kpi("Ascent peak", M.summary.ascent.maxG.toFixed(1) + " g"));
  const ents = M.summary.entries || (M.summary.entry ? [M.summary.entry] : []);
  if (ents.length) {
    const e = ents[ents.length - 1];
    kp.append(
      kpi("Entry", `${e.vEI.toFixed(1)} km/s · ${e.maxG.toFixed(1)} g`),
      M.summary.landing && M.summary.landing.runway
        ? kpi("Landing", M.summary.landing.runway)
        : kpi("Landing error", fx(e.miss, 0) + " km"),
    );
  }
  go.disabled = false;
  go.textContent = "Fly this mission ▶";
}
function launchFromSetup() {
  if (SETUP.plan) {
    startMission(SETUP.plan, SETUP.scn);
    return;
  }
  if (SETUP.planErr) return;
  const ov = $("#planning");
  ov.hidden = false;
  $("#planTitle").textContent = "Solving " + SETUP.cfg.name + "…";
  $("#planLog").innerHTML = "";
  const log = (m) => {
    $("#planLog").append(h("div", null, m));
    $("#planLog").scrollTop = 1e9;
  };
  if (SETUP.progress) log(SETUP.progress);
  SETUP.onProgress = log;
  SETUP.onDone = (M) => {
    SETUP.onProgress = SETUP.onDone = SETUP.onFail = null;
    ov.hidden = true;
    startMission(M, SETUP.scn);
  };
  SETUP.onFail = (err) => {
    SETUP.onProgress = SETUP.onDone = SETUP.onFail = null;
    ov.hidden = true;
  };
  if (!SETUP.planning) schedulePlan(0);
}

// ==== 85_audio.js
// ============================================================================
// Sound — synthesised live with the Web Audio API, no recordings: rocket roar,
// air rush, re-entry plasma, parachutes, the rover's motors, countdown beeps,
// pyro bangs, touchdowns and an ambient score. Off until the viewer turns it on
// (browsers only start audio after a click or a key press).
// ============================================================================
const SND = {
  ctx: null,
  g: null,
  armed: false,
  on: lsGet("mstudio-sound", false),
  music: lsGet("mstudio-music", true),
  silentVacuum: lsGet("mstudio-silent-vacuum", false),
  vol: lsGet("mstudio-volume", 0.8),
  beepSec: null,
  chordIdx: -1,
  chordEnd: 0,
};
// D-major pad (MIDI notes): Dmaj9, Bm9, Gmaj9, Asus2, D/F#, Gmaj7, Em9, Asus4
const AUD_CHORDS = [
  [50, 57, 64, 66, 69, 73],
  [47, 54, 57, 62, 66, 73],
  [43, 55, 59, 62, 66, 69],
  [45, 57, 59, 64, 69, 71],
  [42, 54, 57, 62, 64, 69],
  [43, 55, 59, 62, 66, 71],
  [40, 55, 59, 62, 66, 74],
  [45, 57, 62, 64, 69, 74],
];
const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// looping noise buffers; the tail is cross-faded into the head so the loop point is seamless
function audNoise(ctx, sec, kind) {
  const n = Math.floor(ctx.sampleRate * sec),
    m = Math.floor(ctx.sampleRate * 0.25),
    buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const x = new Float32Array(n + m);
    let b = 0;
    for (let i = 0; i < n + m; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") {
        b = (b + 0.02 * w) / 1.02;
        x[i] = b * 3.5;
      } else if (kind === "crackle")
        x[i] =
          Math.random() < 0.0022
            ? (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6)
            : w * 0.05;
      else x[i] = w;
    }
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++)
      d[i] = i < m ? x[i] * (i / m) + x[n + i] * (1 - i / m) : x[i];
  }
  return buf;
}
function audImpulse(ctx, sec) {
  // synthetic hall for the score
  const n = Math.floor(ctx.sampleRate * sec),
    b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8) * 0.5;
  }
  return b;
}
function audInit() {
  if (SND.ctx) return SND.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try {
    ctx = new AC();
  } catch (e) {
    return null;
  }
  const g = {};
  SND.ctx = ctx;
  SND.g = g;
  const gain = (v = 0) => {
    const x = ctx.createGain();
    x.gain.value = v;
    return x;
  };
  const filt = (type, f, q = 0.7) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };
  g.master = gain(0);
  g.comp = ctx.createDynamicsCompressor();
  g.comp.threshold.value = -14;
  g.comp.knee.value = 10;
  g.comp.ratio.value = 5;
  g.comp.attack.value = 0.004;
  g.comp.release.value = 0.25;
  g.lim = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = i / 511.5 - 1;
    curve[i] = Math.tanh(1.4 * x) / Math.tanh(1.4);
  }
  g.lim.curve = curve;
  g.lim.oversample = "2x";
  g.master.connect(g.comp);
  g.comp.connect(g.lim);
  g.lim.connect(ctx.destination);
  g.cue = gain(0);
  g.cue.connect(g.lim); // countdown beeps skip the compressor so the engines' roar does not duck them
  g.sfx = gain(1);
  g.sfx.connect(g.master);
  // score: pad → low-pass → dry + hall
  g.mus = gain(0);
  g.mus.connect(g.master);
  g.musIn = gain(1);
  const mlp = filt("lowpass", 3000);
  g.musIn.connect(mlp);
  mlp.connect(g.mus);
  const verb = ctx.createConvolver();
  verb.buffer = audImpulse(ctx, 3.4);
  const wet = gain(0.8);
  mlp.connect(verb);
  verb.connect(wet);
  wet.connect(g.mus);
  g.white = audNoise(ctx, 5, "white");
  g.brown = audNoise(ctx, 6, "brown");
  const crackle = audNoise(ctx, 4, "crackle");
  const loop = (buf, rate = 1) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start(0, Math.random() * buf.duration);
    return s;
  };
  const voice = (src, ...nodes) => {
    let n = src;
    for (const x of nodes) {
      n.connect(x);
      n = x;
    }
    const out = gain(0);
    n.connect(out);
    out.connect(g.sfx);
    return out;
  };
  // rocket roar: brown-noise body, band-passed texture, crackle (big engines in air), sub-bass
  g.roarF = filt("lowpass", 400);
  g.roar = voice(loop(g.brown), g.roarF);
  g.texF = filt("bandpass", 700, 0.6);
  g.tex = voice(loop(g.white), g.texF);
  g.crk = voice(loop(crackle), filt("highpass", 900));
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 36;
  const subLfo = ctx.createOscillator();
  subLfo.frequency.value = 0.7;
  const subLfoG = gain(4);
  subLfo.connect(subLfoG);
  subLfoG.connect(sub.frequency);
  sub.start();
  subLfo.start();
  g.sub = voice(sub);
  // air rush (ascent, entry, parachutes) and re-entry plasma
  g.airF = filt("bandpass", 600, 0.5);
  g.air = voice(loop(g.white, 0.9), g.airF);
  g.plasmaF = filt("lowpass", 520);
  g.plasma = voice(loop(g.brown, 0.7), g.plasmaF);
  // rover drive motors: a buzzing saw with a little wobble
  g.mot = ctx.createOscillator();
  g.mot.type = "sawtooth";
  g.mot.frequency.value = 95;
  const vib = ctx.createOscillator();
  vib.frequency.value = 7;
  const vibG = gain(3);
  vib.connect(vibG);
  vibG.connect(g.mot.frequency);
  g.mot.start();
  vib.start();
  g.motG = voice(g.mot, filt("lowpass", 750, 2));
  document.addEventListener("visibilitychange", () => {
    if (!SND.ctx) return;
    if (document.hidden) SND.ctx.suspend();
    else if (SND.on) SND.ctx.resume();
  });
  return ctx;
}
function setSound(on) {
  SND.on = on;
  lsSet("mstudio-sound", on);
  if (on) {
    const ctx = audInit();
    if (!ctx) {
      SND.on = false;
      syncSoundUI();
      toast("Sound is not available in this browser");
      return;
    }
    ctx.resume();
    SND.g.master.gain.setTargetAtTime(SND.vol, ctx.currentTime, 0.05);
    SND.g.cue.gain.setTargetAtTime(SND.vol, ctx.currentTime, 0.05);
  } else if (SND.ctx) {
    SND.g.master.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.04);
    SND.g.cue.gain.setTargetAtTime(0, SND.ctx.currentTime, 0.04);
    setTimeout(() => {
      if (!SND.on && SND.ctx) SND.ctx.suspend();
    }, 400);
  }
  syncSoundUI();
}
function syncSoundUI() {
  const b = $("#btnSound");
  if (!b) return;
  b.classList.toggle("on", SND.on);
  b.setAttribute("aria-pressed", SND.on ? "true" : "false");
  b.querySelector(".ico-on").style.display = SND.on ? "" : "none";
  b.querySelector(".ico-off").style.display = SND.on ? "none" : "";
  $("#sndOn").checked = SND.on;
  $("#sndVol").value = SND.vol;
  $("#sndMusic").checked = SND.music;
  $("#sndVac").checked = SND.silentVacuum;
  const gs = $("#goSound");
  if (gs) gs.checked = SND.on;
}
function initSound() {
  $("#btnSound").addEventListener("click", (e) => {
    e.stopPropagation();
    const pop = $("#soundPop");
    if (!SND.on) {
      setSound(true);
      pop.hidden = false;
    } else pop.hidden = !pop.hidden;
    $("#top").classList.toggle("pop-open", !pop.hidden);
  });
  document.addEventListener("click", (e) => {
    const pop = $("#soundPop");
    if (
      !pop.hidden &&
      !e.target.closest("#soundPop") &&
      !e.target.closest("#btnSound")
    ) {
      pop.hidden = true;
      $("#top").classList.remove("pop-open");
    }
  });
  $("#sndOn").addEventListener("change", (e) => setSound(e.target.checked));
  $("#sndVol").addEventListener("input", (e) => {
    SND.vol = +e.target.value;
    lsSet("mstudio-volume", SND.vol);
    if (SND.ctx && SND.on) {
      SND.g.master.gain.setTargetAtTime(SND.vol, SND.ctx.currentTime, 0.05);
      SND.g.cue.gain.setTargetAtTime(SND.vol, SND.ctx.currentTime, 0.05);
    }
  });
  $("#sndMusic").addEventListener("change", (e) => {
    SND.music = e.target.checked;
    lsSet("mstudio-music", SND.music);
  });
  $("#sndVac").addEventListener("change", (e) => {
    SND.silentVacuum = e.target.checked;
    lsSet("mstudio-silent-vacuum", SND.silentVacuum);
  });
  // sound was left on last time: start it with the first click or key press (browsers block it before that)
  const arm = () => {
    if (SND.on && !SND.armed) {
      SND.armed = true;
      setSound(true);
    }
    window.removeEventListener("pointerdown", arm, true);
    window.removeEventListener("keydown", arm, true);
  };
  if (SND.on) {
    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("keydown", arm, true);
  }
  syncSoundUI();
}

// ---------------- per-frame mix, driven by the craft in view ----------------
function updateAudio(t, T) {
  const ctx = SND.ctx;
  if (!ctx || !SND.on || ctx.state !== "running") return;
  const g = SND.g,
    now = ctx.currentTime,
    md = MV.md,
    live = !!md && STATE.playing;
  let roar = 0,
    tex = 0,
    crk = 0,
    sub = 0,
    air = 0,
    plasma = 0,
    mot = 0,
    cut = 300,
    airF = 600,
    motF = 95;
  if (md && T && T.c && T.c.node && T.c.node.visible) {
    const c = T.c,
      s = T.s,
      isTarget = CAM.target === "obj:" + c.o.id;
    const d = Math.max(1e-4, R.camera.position.distanceTo(c.node.position)); // km
    const rho =
      T.ref === "earth" || T.ref === "mars"
        ? atmosOf(T.ref, Math.max(0, T.alt)).rho
        : 0; // kg/m³
    const airK =
      rho > 1e-5
        ? clamp(Math.log10(rho / 1e-5) / Math.log10(1.225 / 1e-5), 0, 1)
        : 0; // 0 in vacuum … 1 at sea level
    const inAir = airK > 0.02;
    const medium = inAir ? 1 : SND.silentVacuum ? 0 : 0.55; // cinematic: engines in vacuum still rumble, muffled
    const thrust = live ? T.thrust || 0 : 0;
    if (thrust > 0) {
      const loud = clamp(
        0.2 + (0.8 * Math.log10(thrust / 2e4)) / Math.log10(3.5e7 / 2e4),
        0.12,
        1,
      ); // Saturn V ≈ 1, lunar module ≈ 0.3
      const att = 1 / (1 + Math.pow(d / (0.15 + 1.2 * loud), 1.3));
      const k = loud * Math.max(att, isTarget ? 0.22 : 0) * medium;
      roar = 0.9 * k;
      tex = (inAir ? 0.32 : 0.06) * k;
      sub = (inAir ? 0.7 : 0.35) * k;
      crk = inAir && thrust > 4e6 ? 0.5 * k * airK : 0;
      cut = inAir ? 260 + 1200 * loud * att * (0.4 + 0.6 * airK) : 240;
    }
    if (inAir && live && !s.surface && !s.pad) {
      // wind: dynamic pressure q = ½ρv² from the speed through the air
      const v = T.vSurf * 1000,
        q = 0.5 * rho * v * v;
      const attA = Math.max(
        1 / (1 + Math.pow(d / 0.4, 1.2)),
        isTarget ? 0.3 : 0,
      );
      if (q > 5) {
        const qK = clamp(Math.sqrt(q / 35000), 0, 1);
        if (v > 2600) {
          plasma = 0.85 * qK * attA;
          air = 0.22 * qK * attA;
        } else air = 0.55 * qK * attA;
        airF = 300 + 2200 * clamp(v / 2500, 0, 1);
      }
      if (s.extra && s.extra.chute) {
        air = Math.max(air, 0.28 * attA);
        airF = 420 + 140 * Math.sin(now * 9);
      }
    }
    if (live && s.rover && s.rover.driving && d < 0.12) {
      mot =
        0.12 *
        (1 - d / 0.12) *
        (T.ref === "mars" ? 0.75 : 1) *
        (SND.silentVacuum && !inAir ? 0 : 1);
      motF = s.rover.kind === "turn" ? 80 : 100 + 600 * Math.abs(s.rover.v);
    }
  }
  const set = (node, v, tc = 0.1) => node.gain.setTargetAtTime(v, now, tc);
  set(g.roar, roar);
  set(g.tex, tex);
  set(g.crk, crk);
  set(g.sub, sub);
  set(g.air, air, 0.2);
  set(g.plasma, plasma, 0.25);
  set(g.motG, mot, 0.15);
  g.roarF.frequency.setTargetAtTime(cut, now, 0.15);
  g.texF.frequency.setTargetAtTime(500 + cut * 0.5, now, 0.2);
  g.airF.frequency.setTargetAtTime(airF, now, 0.2);
  g.mot.frequency.setTargetAtTime(motF, now, 0.2);
  // final launch countdown: a beep each second from T−10 (higher for the last three)
  if (live && STATE.rate <= 2.5) {
    const met = t - md.M.t0;
    if (met > -10.05 && met < 0) {
      const sec = Math.ceil(-met - 1e-6);
      if (sec !== SND.beepSec) {
        if (SND.beepSec == null || sec < SND.beepSec)
          audBeep(sec <= 3 ? 1318.5 : 987.8, sec <= 3 ? 0.16 : 0.1);
        SND.beepSec = sec;
      }
    } else SND.beepSec = null;
  }
  updateMusic();
}
function updateMusic() {
  const ctx = SND.ctx,
    g = SND.g,
    now = ctx.currentTime;
  g.mus.gain.setTargetAtTime(SND.music ? 0.32 : 0, now, 0.8);
  if (!SND.music || now < SND.chordEnd - 3.2) return; // the next chord fades in while this one fades out
  SND.chordIdx = (SND.chordIdx + 1) % AUD_CHORDS.length;
  const ch = AUD_CHORDS[SND.chordIdx],
    t0 = now + 0.05,
    t1 = t0 + 10.5;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 3.2);
  env.gain.setValueAtTime(1, t1 - 3.2);
  env.gain.linearRampToValueAtTime(0, t1);
  env.connect(g.musIn);
  ch.forEach((m, j) => {
    for (const det of [-0.0017, 0.0017]) {
      const o = ctx.createOscillator();
      o.type = j === 0 ? "sine" : "triangle";
      o.frequency.value = midiHz(m) * (1 + det);
      const vg = ctx.createGain();
      vg.gain.value = (j === 0 ? 0.12 : 0.045) * (m > 68 ? 0.7 : 1);
      o.connect(vg);
      vg.connect(env);
      o.start(t0);
      o.stop(t1 + 0.1);
    }
  });
  for (let k = 0; k < 2; k++) {
    // a soft bell or two, high above the pad
    if (Math.random() < 0.35) continue;
    const tb = t0 + 1.5 + Math.random() * 7,
      m = ch[2 + Math.floor(Math.random() * 4)] + 12;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midiHz(m);
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, tb);
    vg.gain.linearRampToValueAtTime(0.05, tb + 0.01);
    vg.gain.exponentialRampToValueAtTime(0.0005, tb + 3.2);
    o.connect(vg);
    vg.connect(g.musIn);
    o.start(tb);
    o.stop(tb + 3.3);
  }
  SND.chordEnd = t1;
}

// ---------------- one-shot effects ----------------
function audEnv(node, now, peak, attack, decay) {
  node.gain.setValueAtTime(0, now);
  node.gain.linearRampToValueAtTime(peak, now + attack);
  node.gain.exponentialRampToValueAtTime(0.0005, now + attack + decay);
}
function audThump(now, k, f0, f1, dur) {
  const ctx = SND.ctx,
    o = ctx.createOscillator(),
    ga = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(f1, now + dur);
  audEnv(ga, now, k, 0.008, dur);
  o.connect(ga);
  ga.connect(SND.g.sfx);
  o.start(now);
  o.stop(now + dur + 0.05);
}
function audNoiseHit(now, buf, type, f, k, attack, decay, q = 0.7) {
  const ctx = SND.ctx,
    src = ctx.createBufferSource(),
    fl = ctx.createBiquadFilter(),
    ga = ctx.createGain();
  src.buffer = buf;
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  audEnv(ga, now, k, attack, decay);
  src.connect(fl);
  fl.connect(ga);
  ga.connect(SND.g.sfx);
  src.start(now, Math.random() * (buf.duration - 2));
  src.stop(now + attack + decay + 0.05);
  return fl;
}
function audBeep(f, dur) {
  const ctx = SND.ctx,
    now = ctx.currentTime,
    o = ctx.createOscillator(),
    ga = ctx.createGain();
  o.type = "sine";
  o.frequency.value = f;
  audEnv(ga, now, 0.32, 0.005, dur);
  o.connect(ga);
  ga.connect(SND.g.cue);
  o.start(now);
  o.stop(now + dur + 0.05);
}
const AUD_FX = {
  bang(now, k) {
    audNoiseHit(now, SND.g.white, "highpass", 900, 0.9 * k, 0.003, 0.22);
    audThump(now, 0.8 * k, 95, 38, 0.35);
  }, // pyrotechnic separation
  whoomp(now, k) {
    const f = audNoiseHit(now, SND.g.brown, "lowpass", 120, 0.9 * k, 0.25, 1.0);
    f.frequency.setValueAtTime(120, now);
    f.frequency.exponentialRampToValueAtTime(900, now + 0.5);
    audThump(now, 0.5 * k, 70, 32, 0.6);
  }, // engine start
  boom(now, k) {
    AUD_FX.bang(now, k);
    audThump(now + 0.04, 1.0 * k, 60, 24, 1.2);
    audNoiseHit(
      now + 0.05,
      SND.g.white,
      "bandpass",
      1800,
      0.5 * k,
      0.02,
      1.4,
      0.5,
    );
  }, // liftoff
  fwump(now, k) {
    audNoiseHit(now, SND.g.white, "bandpass", 420, 0.8 * k, 0.06, 0.8, 0.9);
    audThump(now + 0.15, 0.6 * k, 62, 38, 0.3);
  }, // canopy opens
  thud(now, k) {
    audThump(now, 0.9 * k, 72, 28, 0.5);
    audNoiseHit(now, SND.g.brown, "lowpass", 300, 0.5 * k, 0.004, 0.18);
  }, // touchdown
  sonic(now, k) {
    for (const dt of [0, 0.38]) {
      audNoiseHit(now + dt, SND.g.brown, "lowpass", 260, 1.0 * k, 0.002, 0.28);
      audThump(now + dt, 0.9 * k, 48, 26, 0.45);
    }
  }, // the orbiter's twin sonic boom
  clunk(now, k) {
    audThump(now, 0.6 * k, 150, 60, 0.18);
    audThump(now + 0.12, 0.5 * k, 130, 55, 0.2);
    audNoiseHit(now, SND.g.white, "bandpass", 2400, 0.12 * k, 0.002, 0.3, 6);
  }, // docking latches
};
const AUD_EVENT = {
  staging: "bang",
  sep: "bang",
  jettison: "bang",
  skycrane: "bang",
  ignition: "whoomp",
  burn: "whoomp",
  powered: "whoomp",
  chute: "fwump",
  touchdown: "thud",
  landing: "thud",
  dock: "clunk",
  trim: "clunk",
};
function audioEvent(e) {
  const ctx = SND.ctx;
  if (
    !ctx ||
    !SND.on ||
    ctx.state !== "running" ||
    !STATE.playing ||
    STATE.rate > 150
  )
    return;
  let fx = AUD_EVENT[e.kind];
  if (e.kind === "launch") fx = e.ign ? "whoomp" : "boom";
  if (/^Sonic booms?/.test(e.name || "")) fx = "sonic";
  if (!fx) return;
  const c = e.obj ? craftById(e.obj) : null;
  let k = 1;
  if (c && c.s && c.node && c.node.visible) {
    const d = R.camera.position.distanceTo(c.node.position);
    const alt = vnorm(c.s.r) - surfaceRadius(c.s.ref),
      rho =
        c.s.ref === "earth" || c.s.ref === "mars"
          ? atmosOf(c.s.ref, Math.max(0, alt)).rho
          : 0;
    if (rho < 1e-5 && SND.silentVacuum) return; // nothing carries the sound in vacuum
    k =
      Math.max(
        1 / (1 + Math.pow(d / 0.6, 1.2)),
        CAM.target === "obj:" + c.o.id ? 0.3 : 0.12,
      ) * (rho < 1e-5 ? 0.6 : 1);
  }
  AUD_FX[fx](ctx.currentTime + 0.01, k);
}

// ==== 90_main.js
// ============================================================================
// Main: state, playback & auto time-warp, frame loop, UI wiring, boot.
// ============================================================================
const STATE = {
  t: 0,
  playing: false,
  rate: 1,
  rateTarget: 1,
  auto: true,
  last: performance.now(),
  dwellUntil: 0,
  lastCaptionEv: -1,
  teleAt: 0,
  idle: true,
  idleT0: 0,
  idleStart: performance.now(),
  hudAt: 0,
};
const WARPS = [
  1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200, 21600, 86400, 259200,
  864000, 2592000,
];
function setTime(t) {
  const md = MV.md;
  if (!md) return;
  STATE.t = clamp(t, md.tStart, md.tEnd);
  for (const c of MV.crafts) c.qInit = false;
  PANEL.curEv = -2;
  STATE.lastCaptionEv = -1;
}
function syncPlayUI() {
  $("#bPlay").textContent = STATE.playing ? "❚❚" : "▶";
  $("#autoWarp").checked = STATE.auto;
}
function fmtRate(r) {
  if (r < 1.5) return "1×";
  if (r < 100) return Math.round(r) + "×";
  if (r < 3600) return fx(r / 60, r < 600 ? 1 : 0) + " min/s";
  if (r < 86400) return fx(r / 3600, r < 36000 ? 1 : 0) + " h/s";
  return fx(r / 86400, r < 864000 ? 1 : 0) + " d/s";
}
function stepWarp(dir) {
  STATE.auto = false;
  let i = WARPS.findIndex((w) => w >= STATE.rate * 0.999);
  if (i < 0) i = WARPS.length - 1;
  i = clamp(i + dir, 0, WARPS.length - 1);
  STATE.rate = WARPS[i];
  syncPlayUI();
}
// Stretches of a mission when parts move on their own timeline (app/32_shuttle.js): [start, end, top speed]. The automatic
// time-warp slows down to arrive at the start and plays them through at a pace that can be watched: the bay doors swinging
// open or shut, the robot arm reaching for the telescope, lifting it out and swinging it upright, its arrays unfurling, the
// release and the arm folding back, the telescope's aperture door.
function animWindows(md) {
  if (md.animWin) return md.animWin;
  const W = new Map(),
    add = (a, b, r) => W.set(a + ":" + b, [a, b, r]);
  for (const o of md.M.objects)
    for (const cf of o.configs) {
      const L = cf.label || {};
      if (L.bayT != null) add(L.bayT, L.bayT + 210, 12);
      if (L.armT) {
        const T = L.armT;
        add(T.gr - 1500, T.gr, 60);
        add(T.un, T.un + 480, 24);
        add(T.un + 480, T.un + 1680, 60);
        add(T.arr, T.arr + 720, 40);
        add(T.rel, T.rel + 180, 12);
        add(T.rel + 1800, T.rel + 3000, 60);
      }
      if (L.doorT != null) add(L.doorT, L.doorT + 60, 6);
    }
  return (md.animWin = [...W.values()]);
}
function autoWarp(realDt) {
  const md = MV.md,
    t = STATE.t;
  const c = craftById("ship");
  const s = c && c.s;
  let next = null;
  for (const e of md.events)
    if (e.t > t + 0.25 && !["heat", "gload", "blackout"].includes(e.kind)) {
      next = e;
      break;
    }
  const dtNext = next ? next.t - t : 1e9;
  let target = Math.max(1, dtNext / 4.5);
  let active = false;
  if (s && s.T > 0) {
    active = true;
    const b = md.burnAt(t, "ship");
    if (t < md.M.t0 + 20) target = 1;
    else if (t < md.M.t0 + 60) target = Math.min(target, 2);
    else if (b) target = Math.min(target, clamp(b.dur / 25, 1, 60));
    else target = Math.min(target, 6);
  }
  for (const cc of MV.crafts)
    if (cc !== c && cc.s && cc.s.T > 0 && cc.o.kind === "craft") {
      active = true;
      target = Math.min(target, 6);
    }
  if (s && s.extra && s.extra.chute) {
    active = true;
    target = Math.min(target, 10);
  } else if (s && s.extra && (s.extra.q > 200 || s.extra.heat > 1)) {
    active = true;
    target = Math.min(target, 4);
  }
  if (s && !s.surface && !active) {
    const rr = vnorm(s.r),
      vv = vnorm(s.v);
    if (vv > 0) target = Math.min(target, (0.9 * rr) / vv);
  }
  if (performance.now() < STATE.dwellUntil)
    target = Math.min(target, active ? 2 : 8);
  for (const [a, b, r] of animWindows(md)) {
    if (t >= a && t < b) target = Math.min(target, r);
    else if (a > t) target = Math.min(target, Math.max(r, (a - t) / 4.5));
  }
  if (t >= md.M.t0 - 12 && t < md.M.t0) target = 1; // the final countdown runs in real time
  if (md.trav && t >= md.trav.seg.t0) {
    const p = roverPose(md, t);
    if (p.driving) target = Math.min(target, 90);
  } // rover drives: watchable speed
  target = clamp(target, 1, 4e6);
  const lr = Math.log(STATE.rate),
    lt = Math.log(target);
  const k = lt < lr ? 7 : 1.2;
  STATE.rate = Math.exp(lr + (lt - lr) * Math.min(1, realDt * k));
}
function crossEvents(t0, t1) {
  const md = MV.md;
  let last = -1,
    sounds = 0;
  for (let i = 0; i < md.events.length; i++) {
    const e = md.events[i];
    if (e.t > t0 && e.t <= t1) {
      last = i;
      if (sounds++ < 3) audioEvent(e);
    }
    if (e.t > t1) break;
  }
  if (last >= 0 && last !== STATE.lastCaptionEv) {
    STATE.lastCaptionEv = last;
    const e = md.events[last];
    if (
      !["heat", "gload", "ascent", "los", "terminal", "approach"].includes(
        e.kind,
      ) ||
      STATE.rate < 20
    )
      showCaption(e);
    STATE.dwellUntil = performance.now() + 2600;
  }
}
// ---------------- frame loop ----------------
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = clamp((now - STATE.last) / 1000, 0, 0.1);
  STATE.last = now;
  MV.realDt = realDt;
  if (MV.md && STATE.playing) {
    if (STATE.auto) autoWarp(realDt);
    const md = MV.md;
    const t1 = clamp(STATE.t + realDt * STATE.rate, md.tStart, md.tEnd);
    crossEvents(STATE.t, t1);
    STATE.t = t1;
    if (STATE.t >= md.tEnd) {
      STATE.playing = false;
      syncPlayUI();
    }
  }
  if (!MV.md) {
    CAM.az += realDt * 0.03;
  }
  renderFrame(false);
}
function renderFrame(forCapture) {
  R.helio = {};
  const md = MV.md;
  const t = md
    ? STATE.t
    : STATE.idleT0 + ((performance.now() - STATE.idleStart) / 1000) * 120;
  MV.tNow = t;
  MV.rate = STATE.playing ? STATE.rate : 1;
  R.clock = (R.clock || 0) + (MV.realDt || 0.016); // s of rendering (real time; a video's own frame time), for things that shimmer
  if (md) for (const c of MV.crafts) computeCraft(c, t);
  updateCamera(t, MV.realDt || 0.016);
  updateBodies(t, CAM.camDist);
  const camD = CAM.camDist || 1;
  if (md) {
    for (const c of MV.crafts) updateCraft(c, t, R.camera.position);
    updatePlasmaLight();
    updatePad(t);
    updateRunway(t);
    updateTrails(t, R.O, camD);
    updateExhaust(t);
    updateShadows(t);
    updateTracks(t);
  }
  updateOrbits(
    t,
    MV.layers.orbits,
    Math.max(camD, R.camera.position.length()),
    MV.frame,
  );
  // stars sit at infinity around the camera; dim them when a bright, sunlit body fills the frame
  R.stars.visible = MV.layers.stars !== false;
  updateSky();
  let bright = 1;
  if (MV.layers.exposure) {
    const dir = new THREE.Vector3();
    R.camera.getWorldDirection(dir);
    const half = ((R.camera.fov * DEG) / 2) * Math.max(1, R.camera.aspect);
    const sunV = R.bodies.sun.group.position.clone().sub(R.camera.position);
    if (sunV.angleTo(dir) < half + 0.1) bright = 0.0;
    for (const n of ["earth", "moon", "mars"]) {
      const b = R.bodies[n];
      const v = b.group.position.clone().sub(R.camera.position);
      const ang = Math.asin(Math.min(1, b.R / Math.max(v.length(), b.R)));
      if (v.angleTo(dir) < half + ang && ang > half * 0.05)
        bright = Math.min(bright, 0.06);
    }
  }
  R.starMat.uniforms.uBright.value +=
    (bright - R.starMat.uniforms.uBright.value) * 0.15;
  R.starMat.uniforms.uScale.value = Math.min(window.devicePixelRatio || 1, 2);
  const focus = targetCraft() || craftById("ship");
  let tele = null;
  if (md) {
    tele = computeTele(focus && focus.s ? focus : craftById("ship"), t);
    const nowP = performance.now();
    if (nowP - STATE.teleAt > 110 || forCapture) {
      STATE.teleAt = nowP;
      drawTele(tele, t);
      drawProp(tele, t);
      updateEventsPanel(t);
    }
    const clean = $("#app").classList.contains("hide-ui");
    updateVectors(targetCraft() && tele && !clean ? tele.c : null, t, tele);
    updateOsc(focus, t);
  }
  updateAudio(t, tele);
  updateLabels(t, focus);
  if (md && MV.layers.minimap !== false) drawMinimap(t, forCapture);
  const bc = R.bgCam;
  bc.quaternion.copy(R.camera.quaternion);
  if (bc.fov !== R.camera.fov || bc.aspect !== R.camera.aspect) {
    bc.fov = R.camera.fov;
    bc.aspect = R.camera.aspect;
    bc.updateProjectionMatrix();
  }
  const film = filmBegin(); // the film look: draw into its target, then finish onto the screen (app/25_film.js)
  R.renderer.clear();
  R.renderer.render(R.bgScene, bc);
  R.renderer.clearDepth();
  R.renderer.render(R.scene, R.camera);
  if (film) filmEnd();
  updateHUD(t);
}
// ---------------- launch countdown: T−10 … 1, then LIFTOFF ----------------
const CD = {
  reduce: (() => {
    try {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  })(),
};
function drawCountdown(t) {
  const el = $("#countdown");
  const md = MV.md;
  const met = md ? t - md.M.t0 : NaN;
  if (!md || !(met > -10.0001 && met < 2.8)) {
    if (!el.hidden) el.hidden = true;
    return;
  }
  if (el.hidden) el.hidden = false;
  const lift = met >= 0,
    ig = lift ? null : padIgnition(md, t),
    ign = !!(ig && ig.f > 0);
  if (el.classList.contains("liftoff") !== lift)
    el.classList.toggle("liftoff", lift);
  if (el.classList.contains("ign") !== ign) el.classList.toggle("ign", ign);
  const S = LAUNCH_SITES[md.cfg.site],
    sol = liftoffStages(md.L).filter((x) => x.prop === "solid");
  const eng = ig ? engineCounts(ig.liq) : "";
  const label = ign
    ? ig.full
      ? "All engines running"
      : "Ignition"
    : "Liftoff in";
  const sub = ign
    ? `${eng} ${ig.full ? "at full thrust" : "igniting"} · clamps holding${sol.length ? " · boosters light at T−0" : ""}`
    : `${md.L.name}${S ? " · " + S.name : ""}`;
  const lb = el.querySelector(".cd-label"),
    sb = el.querySelector(".cd-sub");
  if (lb.textContent !== label) lb.textContent = label;
  if (sb.textContent !== sub) sb.textContent = sub;
  const n = el.querySelector(".cd-n");
  const txt = lift ? "LIFTOFF" : String(Math.max(1, Math.ceil(-met - 1e-6)));
  if (n.textContent !== txt) {
    n.textContent = txt;
    if (!CD.reduce && n.animate)
      n.animate(
        [
          { transform: "scale(1.22)", opacity: 0.35 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
  }
  const op = met < 2 ? "" : String(clamp(1 - (met - 2) / 0.8, 0, 1));
  if (el.style.opacity !== op) el.style.opacity = op;
}
function updateHUD(t) {
  const md = MV.md;
  const nowP = performance.now();
  drawCountdown(t);
  if (md) {
    const met = fMET(t - md.M.t0);
    if ($("#met").textContent !== met) $("#met").textContent = met;
    const utc = fmtUTC(t) + " UTC";
    if ($("#utc").textContent !== utc) $("#utc").textContent = utc;
    const w = STATE.playing ? fmtRate(STATE.rate) : "paused";
    if ($("#warp").textContent !== w) $("#warp").textContent = w;
    drawTimeline(t);
    if (MV.layers.burnin) {
      const ph = md.phaseAt(t);
      const ps = PSTAT.cur;
      $("#burnin").textContent =
        `${md.M.name}\n${met}   ${fmtUTC(t)} UTC\n${Math.round(CAM.lens)} mm · ${CAM.aspect ? CAM.aspect + ":1" : "full"} · ${ph ? ph.name : ""}${ps ? " · " + (ps.k === "burn" ? "ENGINE ON" : ps.l) : ""}`;
    }
  } else {
    const utc = fmtUTC(t, false) + " UTC";
    if ($("#utc").textContent !== utc) $("#utc").textContent = utc;
  }
  updateCaption();
}
// ---------------- mission start ----------------
function startMission(M, scn) {
  const md = new MissionData(M, scn);
  setupMissionView(md);
  preloadDetailedModels(md);
  buildTelePanel();
  buildEventsPanel();
  buildBudgetPanel();
  buildInfoPanel();
  buildTimelineMap();
  TL.bg = null;
  loadShots();
  $("#missionName").textContent = M.name;
  $("#app").classList.remove("idle");
  $("#setup").hidden = true;
  $("#setupClose").hidden = false;
  // camera & time
  const st = $("#selTarget");
  st.innerHTML = "";
  st.append(
    h(
      "optgroup",
      { label: "Spacecraft" },
      ...M.objects
        .filter((o) => o.kind !== "debris")
        .map((o) => h("option", { value: "obj:" + o.id }, o.name)),
    ),
  );
  st.append(
    h(
      "optgroup",
      { label: "Bodies" },
      ...["earth", "moon", "mars", "sun", "venus", "jupiter", "saturn"].map(
        (b) => h("option", { value: "body:" + b }, BODIES[b].name),
      ),
    ),
  );
  const sl = $("#selLook");
  sl.innerHTML = "";
  sl.append(
    ...["moon", "earth", "mars", "sun", "venus", "jupiter"].map((b) =>
      h("option", { value: "body:" + b }, BODIES[b].name),
    ),
    ...M.objects
      .filter((o) => o.kind === "craft")
      .map((o) => h("option", { value: "obj:" + o.id }, o.name)),
  );
  resetMinimap();
  CAM.target = "obj:ship";
  CAM.mode = "chase";
  CAM.az = 205 * DEG;
  CAM.el = 4 * DEG;
  CAM.roll = 0;
  CAM.trans = null;
  CAM.dist = Math.max(0.06, md.L.height * 0.0042);
  CAM.lens = 35;
  CAM.look =
    md.cfg.dest === "mars" || (md.cfg.legs || []).length
      ? "body:mars"
      : "body:moon";
  {
    const S = LAUNCH_SITES[M.cfg.site];
    const r = sitePosEcl("earth", S.lat, S.lon, 0, M.t0);
    const lf = localFrame("earth", r, M.t0);
    const sun = vunit(vscale(planetHelio("earth", M.t0).r, -1));
    const azS = Math.atan2(vdot(sun, lf.north), vdot(sun, lf.east));
    CAM.az = azS + 38 * DEG;
  }
  setMode("auto");
  applyLens();
  syncCamUI();
  STATE.t = M.t0 - 10;
  STATE.playing = true;
  STATE.auto = true;
  STATE.rate = 1;
  STATE.lastCaptionEv = -1;
  syncPlayUI();
  for (const c of MV.crafts) c.qInit = false;
  MV.frameSel = "auto";
  $("#selFrame").value = "auto";
  showCaption({
    name: M.name,
    desc:
      (scn ? scn.tag + ". " : "") +
      `Liftoff ${fmtUTC(M.t0, false)} UTC from ${LAUNCH_SITES[M.cfg.site].name}.`,
  });
}
// ---------------- UI wiring ----------------
function initUI() {
  $$("#right .tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#right .tabs button").forEach((x) =>
        x.classList.toggle("on", x === b),
      );
      for (const p of ["events", "budget", "info", "shots"])
        $("#tab-" + p).hidden = p !== b.dataset.tab;
      if (b.dataset.tab === "events") PANEL.curEv = -2;
    }),
  );
  $("#bPlay").addEventListener("click", () => {
    if (!MV.md) return;
    if (STATE.t >= MV.md.tEnd) setTime(MV.md.tStart);
    STATE.playing = !STATE.playing;
    syncPlayUI();
  });
  $("#bPrev").addEventListener("click", () => jumpEvent(-1));
  $("#bNext").addEventListener("click", () => jumpEvent(1));
  $("#bSlower").addEventListener("click", () => stepWarp(-1));
  $("#bFaster").addEventListener("click", () => stepWarp(1));
  $("#autoWarp").addEventListener("change", (e) => {
    STATE.auto = e.target.checked;
  });
  $("#selTarget").addEventListener("change", (e) => setTarget(e.target.value));
  $("#selMode").addEventListener("change", (e) => setMode(e.target.value));
  $("#selLook").addEventListener("change", (e) => {
    CAM.look = e.target.value;
  });
  const ln = $("#selLens");
  for (const mm of LENSES) ln.append(h("option", { value: mm }, mm + " mm"));
  ln.addEventListener("change", (e) => {
    CAM.lens = +e.target.value;
    if (CAM.mode === "auto") DIR.lensUser = CAM.lens;
    applyLens();
  });
  $("#selAspect").addEventListener("change", (e) => {
    CAM.aspect = +e.target.value;
    applyLens();
  });
  $("#selFrame").addEventListener("change", (e) => {
    MV.frameSel = e.target.value;
  });
  $("#bLayers").addEventListener("click", (e) => {
    e.stopPropagation();
    $("#layers").hidden = !$("#layers").hidden;
  });
  document.addEventListener("click", (e) => {
    if (
      !$("#layers").hidden &&
      !e.target.closest("#layers") &&
      !e.target.closest("#bLayers")
    )
      $("#layers").hidden = true;
  });
  $$("#layers input[data-layer]").forEach((cb) => {
    MV.layers[cb.dataset.layer] = cb.checked;
    cb.addEventListener("change", () => {
      MV.layers[cb.dataset.layer] = cb.checked;
      applyLayers();
    });
  });
  applyLayers();
  $("#bShot").addEventListener("click", captureShot);
  $("#cdSkip").addEventListener("click", () => {
    const md = MV.md;
    if (!md) return;
    setTime(md.M.t0 - 0.05);
    STATE.playing = true;
    syncPlayUI();
  });
  $("#btnSetup").addEventListener("click", openSetup);
  $("#setupClose").addEventListener("click", () => {
    $("#setup").hidden = true;
  });
  $("#btnHelp").addEventListener("click", () => {
    $("#help").hidden = false;
  });
  $("#helpClose").addEventListener("click", () => {
    $("#help").hidden = true;
  });
  $("#btnHide").addEventListener("click", () =>
    $("#app").classList.toggle("hide-ui"),
  );
  $("#sheetClose").addEventListener("click", () => {
    $("#sheet").hidden = true;
  });
  $("#sheetCopy").addEventListener("click", () => {
    const ta = $("#sheetText");
    try {
      navigator.clipboard.writeText(ta.value).then(
        () => toast("Shot list copied"),
        () => {
          ta.select();
        },
      );
    } catch (e) {
      ta.select();
    }
  });
  $("#btnTele").addEventListener("click", () => {
    $("#left").classList.toggle("open");
    $("#right").classList.remove("open");
  });
  $("#btnSide").addEventListener("click", () => {
    $("#right").classList.toggle("open");
    $("#left").classList.remove("open");
  });
  // keep side panels and captions clear of the (wrapping) bottom bar
  const setBH = () => {
    const hgt = $("#bottom").getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--bottomH",
      Math.round(hgt) + "px",
    );
  };
  try {
    new ResizeObserver(setBH).observe($("#bottom"));
  } catch (e) {
    window.addEventListener("resize", setBH);
  }
  setBH();
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResize);
}
function applyLayers() {
  $("#app").classList.toggle("mm-off", MV.layers.minimap === false);
  if (typeof setMMH === "function") setMMH();
  $("#guides").classList.toggle("on", !!MV.layers.guides);
  $("#burnin").style.display = MV.layers.burnin ? "" : "none";
  if (!MV.layers.captions) $("#caption").classList.add("fade");
  const fl = $('#layers input[data-layer="film"]'); // the film look needs WebGL 2 with floating-point targets
  if (fl && R.renderer && !filmSupported()) {
    fl.checked = false;
    fl.disabled = true;
    MV.layers.film = false;
    fl.parentElement.title =
      "Not available: this browser cannot draw into floating-point targets";
  }
}
function openSetup() {
  $("#setup").hidden = false;
  if (MV.md) {
    STATE.playing = false;
    syncPlayUI();
  }
  if (SETUP.scn) {
    renderDetail();
    renderPlanStatus();
  }
}
function jumpEvent(dir) {
  const md = MV.md;
  if (!md) return;
  const t = STATE.t;
  const evs = md.events.filter(EVF.key);
  if (dir > 0) {
    const e = evs.find((e) => e.t > t + 30);
    if (e) jumpToEvent(e);
  } else {
    const prev = evs.filter((e) => e.t < t - 40);
    const e = prev[prev.length - 1];
    if (e) jumpToEvent(e);
  }
}
function onKey(e) {
  if (e.target.closest("input, textarea, select")) return;
  if (!$("#help").hidden && e.key === "Escape") {
    $("#help").hidden = true;
    return;
  }
  if (!$("#sheet").hidden && e.key === "Escape") {
    $("#sheet").hidden = true;
    return;
  }
  if (e.key === "m" || e.key === "M") {
    setSound(!SND.on);
    return;
  }
  if (!$("#setup").hidden) {
    if (e.key === "Escape" && MV.md) $("#setup").hidden = true;
    return;
  }
  const k = e.key;
  if (k === " ") {
    e.preventDefault();
    $("#bPlay").click();
  } else if (k === "ArrowRight") jumpEvent(1);
  else if (k === "ArrowLeft") jumpEvent(-1);
  else if (k === "]") stepWarp(1);
  else if (k === "[") stepWarp(-1);
  else if (k === "c" || k === "C") captureShot();
  else if (k === "h" || k === "H") $("#app").classList.toggle("hide-ui");
  else if (k === "f" || k === "F") setMode("auto");
  else if (k === "?") $("#help").hidden = false;
  else if ("123456".includes(k))
    setMode(["auto", "orbit", "chase", "lookat", "ground", "top"][+k - 1]);
}
function onResize() {
  const cv = R.renderer.domElement;
  R.width = cv.clientWidth || window.innerWidth;
  R.height = cv.clientHeight || window.innerHeight;
  R.renderer.setSize(R.width, R.height, false);
  applyLens();
  TL.bg = null;
}
// ---------------- boot ----------------
function boot() {
  initScene();
  initBodyLabels();
  initVectors();
  initExhaust();
  initCameraInput();
  initTimeline();
  initUI();
  initMinimap();
  initSound();
  $("#app").classList.add("idle");
  onResize();
  STATE.idleT0 = dateToT(new Date());
  CAM.target = "body:earth";
  CAM.mode = "orbit";
  CAM.dist = 21000;
  CAM.el = 12 * DEG;
  CAM.az = 40 * DEG;
  CAM.lens = 35;
  applyLens();
  buildScenarioList();
  const last = lsGet("mstudio-last", "apollo11");
  selectScenario(scenarioById(last) ? last : "apollo11");
  requestAnimationFrame(frame);
}
window.__ms = {
  STATE,
  CAM,
  DIR,
  MM,
  MV,
  R,
  DETAIL,
  setTime,
  setTarget,
  setMode,
  applyLens,
  SETUP,
  Planner,
  renderFrame,
  autoWarp,
  crossEvents,
  computeCraft,
  craftAttitude,
  cfgAt,
  activeMounts,
  modelForConfig,
  attEpisodes,
  groundFrame,
  helioReset: () => {
    R.helio = {};
  },
  capHitLocal,
  eclToMesh,
  roverPose,
  meshDir,
  SND,
  setSound,
  THREE,
};
try {
  boot();
} catch (err) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="position:fixed;left:16px;top:16px;right:16px;color:#ff6767;background:#000;padding:12px;z-index:99;white-space:pre-wrap">Startup error: ${esc((err && err.stack) || err)}</pre>`,
  );
  throw err;
}
