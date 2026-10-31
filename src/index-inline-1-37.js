// index-inline-1 37 — out
// Lines 12910-13037 of readable/index-inline-1.pretty.js (statement-aligned).
const J2_E = 1.08262668e-3,
  POLE_E = eqToEcl([0, 0, 1]);
function leoAccel(r) {
  // point-mass Earth + J2 (geocentric ECL, km/s²)
  const rn2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2],
    rn = Math.sqrt(rn2),
    k = -MU_E / (rn2 * rn);
  const z = r[0] * POLE_E[0] + r[1] * POLE_E[1] + r[2] * POLE_E[2];
  const f = (-1.5 * J2_E * MU_E * R_E * R_E) / (rn2 * rn2 * rn),
    q = 1 - (5 * z * z) / rn2;
  return [
    k * r[0] + f * (q * r[0] + 2 * z * POLE_E[0]),
    k * r[1] + f * (q * r[1] + 2 * z * POLE_E[1]),
    k * r[2] + f * (q * r[2] + 2 * z * POLE_E[2]),
  ];
}
function makeLeoODE(thrust) {
  return (t, y, out) => {
    const a = leoAccel([y[0], y[1], y[2]]);
    out[0] = y[3];
    out[1] = y[4];
    out[2] = y[5];
    if (thrust && y[6] > 1) {
      const u = thrust.dir(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]]);
      const at = thrust.T / y[6] / 1000;
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
function leoInt(t0, y0, t1, opt = {}) {
  return integrate(
    makeLeoODE(opt.thrust || null),
    t0,
    Float64Array.from(y0),
    t1,
    {
      rtol: opt.rtol ?? 1e-10,
      atol: opt.atol ?? 1e-7,
      hmax: opt.hmax ?? 60,
      events: opt.events || [],
      h0: opt.h0 ?? 5,
      maxSteps: opt.maxSteps ?? 800000,
    },
  );
}
// states of an integration on a regular time grid (Hermite interpolation with the stored derivatives)
function resGrid(res, ta, tb, dt) {
  const out = [];
  for (let tt = ta; tt <= tb + 1e-6; tt += dt) {
    const s = resState(res, Math.min(tt, tb));
    out.push({
      t: Math.min(tt, tb),
      r: [s[0], s[1], s[2]],
      v: [s[3], s[4], s[5]],
      m: s[6],
    });
    if (tt >= tb) break;
  }
  if (out.length && out[out.length - 1].t < tb - 1e-6) {
    const s = resState(res, tb);
    out.push({ t: tb, r: [s[0], s[1], s[2]], v: [s[3], s[4], s[5]], m: s[6] });
  }
  return out;
}
// local orbital frame (LVLH): x along track, y orbit normal, z radial up
function lvlh(r, v) {
  const z = vunit(r),
    y = vunit(vcross(r, v)),
    x = vcross(y, z);
  return { x, y, z };
}
const fromLvlh = (F, p) =>
  vadd(vadd(vscale(F.x, p[0]), vscale(F.y, p[1])), vscale(F.z, p[2]));
const toLvlh = (F, d) => [vdot(d, F.x), vdot(d, F.y), vdot(d, F.z)];
// time of the next apoapsis (or periapsis) after t for a geocentric state
function nextApsis(t, r, v, apo) {
  const el = rv2coe(r, v, MU_E);
  if (!(el.e < 1) || !isFinite(el.period)) return t;
  const tp = timeSincePeri(el.e, el.a, el.nu, MU_E);
  const P = el.period;
  let dt = (apo ? P / 2 : 0) - tp;
  dt = ((dt % P) + P) % P;
  if (dt < 60) dt += P;
  return t + dt;
}
function oceanName(lat, lon) {
  // rough name for where something falls
  if (lat < -55) return "Southern Ocean";
  if (lon > 20 && lon < 120 && lat < 25) return "Indian Ocean";
  if (lon >= 120 || lon < -70) return "Pacific Ocean";
  if (lon >= -70 && lon < 20 && lat > -60) return "Atlantic Ocean";
  return "ocean";
}
// launcher for a Shuttle flight: per-flight main-engine power level and throttle bucket, tank variant
function shuttleLauncher(cfg) {
  const L = JSON.parse(JSON.stringify(LAUNCHERS[cfg.launcher]));
  L.ign = LAUNCHERS[cfg.launcher].ign;
  const core = L.stages.find((s) => !s.parallel);
  if (cfg.ssme) {
    if (cfg.ssme.sched) core.sched = cfg.ssme.sched;
  }
  if (cfg.etDry) core.dry = cfg.etDry;
  return L;
}
// payload bay contents per flight (renderer reads these flags from the ship configuration)
function orbiterCfg(cfg, extra = {}) {
  return {
    key: "sc",
    sc: "shuttle",
    parts: ["orbiter"],
    orbiter: cfg.orbiterId || "OV-104",
    pay: cfg.bayPayload || null,
    bay: "closed",
    ...extra,
  };
}
const fLatLon = (ll) =>
  `${Math.abs(ll[0]).toFixed(1)}°${ll[0] >= 0 ? "N" : "S"} ${Math.abs(ll[1]).toFixed(1)}°${ll[1] >= 0 ? "E" : "W"}`;
const fmtNmi = (km) => `${Math.round(km)} km (${Math.round(km / 1.852)} nmi)`;

