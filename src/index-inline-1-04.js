// index-inline-1 04 — out
// Lines 1019-1331 of readable/index-inline-1.pretty.js (statement-aligned).
function hermiteState(t0, y0, f0, t1, y1, f1, t, n) {
  const h = t1 - t0,
    s = (t - t0) / h,
    s2 = s * s,
    s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1,
    h10 = s3 - 2 * s2 + s,
    h01 = -2 * s3 + 3 * s2,
    h11 = s3 - s2;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++)
    out[i] = h00 * y0[i] + h10 * h * f0[i] + h01 * y1[i] + h11 * h * f1[i];
  return out;
}

// integrate y' = f(t,y) from t0 to t1. opts: {rtol, atol, hmax, hmin, events:[{g, dir, terminal, name}], store:true, h0}
function integrate(f, t0, y0, t1, opts = {}) {
  const n = y0.length,
    dirT = Math.sign(t1 - t0) || 1;
  const rtol = opts.rtol ?? 1e-10,
    atol = opts.atol ?? 1e-8,
    hmax = opts.hmax ?? Infinity,
    hmin = opts.hmin ?? 1e-6;
  const ws = makeWS(n);
  let t = t0,
    y = Float64Array.from(y0),
    k1 = new Float64Array(n);
  f(t, y, k1);
  let h =
    dirT * Math.min(Math.abs(opts.h0 ?? 10), hmax, Math.abs(t1 - t0) || 1);
  const out = {
    t: [t],
    y: [Float64Array.from(y)],
    f: [Float64Array.from(k1)],
    events: [],
    tEnd: t1,
    stopped: false,
  };
  const evs = opts.events || [];
  let gPrev = evs.map((e) => e.g(t, y));
  let steps = 0;
  const maxSteps = opts.maxSteps ?? 2e6;
  while (dirT * (t1 - t) > 1e-9 && steps++ < maxSteps) {
    if (Math.abs(h) > Math.abs(t1 - t)) h = t1 - t;
    const { ynew, k7, err } = dopriStep(f, t, y, h, k1, ws);
    let en = 0;
    for (let i = 0; i < n; i++) {
      const sc = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(ynew[i]));
      const q = err[i] / sc;
      en += q * q;
    }
    en = Math.sqrt(en / n);
    if (en <= 1 || Math.abs(h) <= hmin) {
      const tn = t + h,
        yn = Float64Array.from(ynew),
        fn = Float64Array.from(k7);
      // events
      let stopAt = null;
      for (let e = 0; e < evs.length; e++) {
        const g1 = evs[e].g(tn, yn),
          g0 = gPrev[e];
        const crossed =
          (g0 < 0 && g1 >= 0 && evs[e].dir >= 0) ||
          (g0 > 0 && g1 <= 0 && evs[e].dir <= 0);
        if (crossed) {
          let a = t,
            b = tn,
            ga = g0;
          for (let it = 0; it < 80; it++) {
            const m = 0.5 * (a + b);
            const ym = hermiteState(t, y, k1, tn, yn, fn, m, n);
            const gm = evs[e].g(m, ym);
            if ((ga < 0 && gm < 0) || (ga > 0 && gm > 0)) {
              a = m;
              ga = gm;
            } else b = m;
            if (Math.abs(b - a) < 1e-6) break;
          }
          const te = 0.5 * (a + b);
          // accurate state at event via one DP step from t
          const st = dopriStep(f, t, y, te - t, k1, makeWS(n));
          const ye = Float64Array.from(st.ynew);
          const fe = new Float64Array(n);
          f(te, ye, fe);
          const rec = { name: evs[e].name, t: te, y: ye, f: fe, idx: e };
          out.events.push(rec);
          if (evs[e].terminal && (!stopAt || dirT * (te - stopAt.t) < 0))
            stopAt = rec;
        }
        gPrev[e] = g1;
      }
      if (stopAt) {
        out.t.push(stopAt.t);
        out.y.push(stopAt.y);
        out.f.push(stopAt.f);
        out.stopped = true;
        out.tEnd = stopAt.t;
        out.stopEvent = stopAt;
        return out;
      }
      t = tn;
      y = yn;
      k1 = fn;
      out.t.push(t);
      out.y.push(y);
      out.f.push(k1);
      const fac =
        en > 0 ? Math.min(5, Math.max(0.2, 0.9 * Math.pow(en, -0.2))) : 5;
      h = dirT * Math.min(Math.abs(h) * fac, hmax);
    } else {
      h = h * Math.max(0.1, 0.9 * Math.pow(en, -0.25));
    }
  }
  out.tEnd = t;
  return out;
}

// ---------------- cislunar dynamics (geocentric ECL) ----------------
// thrust spec: {T (N), mdot (kg/s), dir: function(t, r, v) -> unit vector}
const MU_E = BODIES.earth.mu,
  MU_M = BODIES.moon.mu,
  MU_S = BODIES.sun.mu;
function sunGeo(t) {
  const e = planetHelio("earth", t);
  return vscale(e.r, -1);
}
function cislunarAccel(t, r) {
  const rn2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2],
    rn = Math.sqrt(rn2),
    k = -MU_E / (rn2 * rn);
  const ax = [k * r[0], k * r[1], k * r[2]];
  const rm = moonGeo(t).r;
  const d = [rm[0] - r[0], rm[1] - r[1], rm[2] - r[2]];
  const dn = vnorm(d),
    rmn = vnorm(rm);
  const km = MU_M / (dn * dn * dn),
    km2 = MU_M / (rmn * rmn * rmn);
  const rs = sunGeo(t);
  const ds = [rs[0] - r[0], rs[1] - r[1], rs[2] - r[2]];
  const dsn = vnorm(ds),
    rsn = vnorm(rs);
  const ks = MU_S / (dsn * dsn * dsn),
    ks2 = MU_S / (rsn * rsn * rsn);
  return [
    ax[0] + km * d[0] - km2 * rm[0] + ks * ds[0] - ks2 * rs[0],
    ax[1] + km * d[1] - km2 * rm[1] + ks * ds[1] - ks2 * rs[1],
    ax[2] + km * d[2] - km2 * rm[2] + ks * ds[2] - ks2 * rs[2],
  ];
}
function makeCislunarODE(thrust) {
  return (t, y, out) => {
    const r = [y[0], y[1], y[2]];
    const a = cislunarAccel(t, r);
    out[0] = y[3];
    out[1] = y[4];
    out[2] = y[5];
    if (thrust && y[6] > 1) {
      const u = thrust.dir(t, r, [y[3], y[4], y[5]]);
      const at = thrust.T / y[6] / 1000; // km/s^2
      out[3] = a[0] + at * u[0];
      out[4] = a[1] + at * u[1];
      out[5] = a[2] + at * u[2];
      out[6] = -thrust.mdot;
    } else {
      out[3] = a[0];
      out[4] = a[1];
      out[5] = a[2];
      out[6] = 0;
    }
  };
}
// two-body ODE about a body (for local phases)
function makeTwoBodyODE(mu, thrust) {
  return (t, y, out) => {
    const rn2 = y[0] * y[0] + y[1] * y[1] + y[2] * y[2],
      rn = Math.sqrt(rn2),
      k = -mu / (rn2 * rn);
    out[0] = y[3];
    out[1] = y[4];
    out[2] = y[5];
    let ax = k * y[0],
      ay = k * y[1],
      az = k * y[2];
    if (thrust && y[6] > 1) {
      const u = thrust.dir(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]]);
      const at = thrust.T / y[6] / 1000;
      ax += at * u[0];
      ay += at * u[1];
      az += at * u[2];
      out[6] = -thrust.mdot;
    } else out[6] = 0;
    out[3] = ax;
    out[4] = ay;
    out[5] = az;
  };
}
// selenocentric relative state from geocentric state
function geoToSeleno(t, r, v) {
  const m = moonGeo(t);
  return { r: vsub(r, m.r), v: vsub(v, m.v) };
}

// ---- vehicles.js
// ============================================================================
// vehicles.js — real launch vehicles, spacecraft and launch sites
// Masses kg, thrust N, Isp s, lengths m.  Geometry parts: [len, rBottom, rTop, color, opts]
// ============================================================================
const PROP = {
  kerolox: { label: "RP-1 / LOX (kerosene)", plume: "#ffb347", smoke: true },
  hydrolox: {
    label: "LH₂ / LOX (liquid hydrogen)",
    plume: "#bcd7ff",
    smoke: false,
  },
  methalox: {
    label: "CH₄ / LOX (liquid methane)",
    plume: "#8fb6ff",
    smoke: false,
  },
  solid: {
    label: "Solid (PBAN / HTPB composite)",
    plume: "#fff1c4",
    smoke: true,
  },
  hypergolic: {
    label: "Aerozine-50 / N₂O₄ (hypergolic)",
    plume: "#ffd0a0",
    smoke: false,
  },
  udmh: { label: "UDMH / IRFNA (hypergolic)", plume: "#ffc890", smoke: false },
  mmh: { label: "MMH / MON (hypergolic)", plume: "#ffd8b0", smoke: false },
  hydrazine: {
    label: "Hydrazine (monopropellant)",
    plume: "#e8f0ff",
    smoke: false,
  },
  xenon: { label: "Xenon (electric)", plume: "#9ab8ff", smoke: false },
};
const C = {
  white: "#ecebe6",
  black: "#1b1b1d",
  orange: "#d0702a",
  grey: "#9ba0a6",
  dark: "#3b3e44",
  steel: "#b9bec5",
  gold: "#c9a043",
  silver: "#d6d9de",
  cream: "#efe7d4",
  red: "#c43c2c",
  foam: "#d98b4a",
};

const LAUNCH_SITES = {
  KSC39A: {
    name: "Kennedy LC-39A, Florida",
    lat: 28.6084,
    lon: -80.6043,
    azRange: [35, 120],
  },
  KSC39B: {
    name: "Kennedy LC-39B, Florida",
    lat: 28.6272,
    lon: -80.6208,
    azRange: [35, 120],
  },
  CCSFS41: {
    name: "Cape Canaveral SLC-41, Florida",
    lat: 28.5833,
    lon: -80.583,
    azRange: [35, 120],
  },
  CCSFS12: {
    name: "Cape Canaveral LC-12, Florida",
    lat: 28.4806,
    lon: -80.5422,
    azRange: [35, 120],
  },
  WENCHANG: {
    name: "Wenchang LC-101, Hainan",
    lat: 19.6145,
    lon: 110.951,
    azRange: [70, 180],
  },
  SDSC: {
    name: "Satish Dhawan SLP, Sriharikota",
    lat: 13.7199,
    lon: 80.2304,
    azRange: [90, 140],
  },
  STARBASE: {
    name: "Starbase, Texas",
    lat: 25.9971,
    lon: -97.1553,
    azRange: [80, 115],
  },
  TANEGASHIMA: {
    name: "Tanegashima, Japan",
    lat: 30.4,
    lon: 130.975,
    azRange: [90, 160],
  },
  BAIKONUR: {
    name: "Baikonur 81/24, Kazakhstan",
    lat: 46.07,
    lon: 63.65,
    azRange: [35, 65],
  },
};

// Shuttle landing runways: threshold of the landing end (lat, lon), true heading of the landing direction (°),
// length and width (km), elevation (km). KSC SLF from FAA data (KTTS); Edwards concrete 04/22 is today's 05R/23L
// (FAA data). The Rogers Dry Lake lakebed runway 23 has no published threshold coordinates: its position here is
// approximate (on the lakebed, parallel to the main runway).
