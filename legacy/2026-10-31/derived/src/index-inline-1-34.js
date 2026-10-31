// index-inline-1 34 — cfg
// Lines 11891-11964 of readable/index-inline-1.pretty.js (statement-aligned).
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

