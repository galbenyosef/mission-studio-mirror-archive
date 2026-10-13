// index-inline-1 09 — math
// Lines 2669-2825 of readable/index-inline-1.pretty.js (statement-aligned).
function scMass(sc, ids) {
  if (!ids) return 0;
  let m = 0;
  for (const id of ids) {
    const md = sc.modules[id];
    if (md) m += md.dry + md.prop;
  }
  return m;
}
function scTotalMass(sc) {
  let m = 0;
  for (const k in sc.modules) m += sc.modules[k].dry + sc.modules[k].prop;
  return m;
}

// ---- flight.js
// ============================================================================
// flight.js — atmospheric flight & powered phases (numerical, body-centred ECL)
//   * atmosphere models (US-1976 Earth, exponential Mars)
//   * guided ascent (gravity turn + closed-loop insertion guidance)
//   * powered descent & landing (ZEM/ZEV guidance + terminal descent)
//   * atmospheric entry (lifting capsule, Mars EDL with parachute & sky crane, propulsive landing)
// ============================================================================
const US76 = [
  [0, 288.15, -6.5, 101325],
  [11, 216.65, 0, 22632.06],
  [20, 216.65, 1.0, 5474.889],
  [32, 228.65, 2.8, 868.0187],
  [47, 270.65, 0, 110.9063],
  [51, 270.65, -2.8, 66.93887],
  [71, 214.65, -2.0, 3.95642],
  [84.852, 186.946, 0, 0.3734],
];
const US76_HI = [
  [86, 6.958e-6],
  [100, 5.604e-7],
  [110, 9.708e-8],
  [120, 2.222e-8],
  [130, 8.152e-9],
  [150, 2.076e-9],
  [180, 5.194e-10],
  [200, 2.541e-10],
  [250, 6.073e-11],
  [300, 1.916e-11],
  [400, 2.803e-12],
  [500, 5.215e-13],
  [700, 3.07e-14],
  [1000, 3.56e-15],
];
function earthAtmos(h) {
  if (h < 0) h = 0;
  if (h < 86) {
    const H = (6356.766 * h) / (6356.766 + h);
    let L = US76[0];
    for (const l of US76) if (H >= l[0]) L = l;
    const [Hb, Tb, lr, Pb] = L;
    const T = Tb + lr * (H - Hb);
    const P =
      lr !== 0
        ? Pb * Math.pow(Tb / T, 34.1632 / lr)
        : Pb * Math.exp((-34.1632 * (H - Hb)) / Tb);
    return { rho: P / (287.053 * T), p: P, a: Math.sqrt(1.4 * 287.053 * T), T };
  }
  let i = 0;
  while (i < US76_HI.length - 2 && h > US76_HI[i + 1][0]) i++;
  const [h0, r0] = US76_HI[i],
    [h1, r1] = US76_HI[i + 1];
  const rho = Math.exp(
    Math.log(r0) +
      ((Math.log(r1) - Math.log(r0)) * (Math.min(h, 1500) - h0)) / (h1 - h0),
  );
  return { rho, p: 0, a: 300, T: 900 };
}
function marsAtmos(h) {
  const hh = Math.max(h, -9);
  const T =
    hh < 7 ? 242.1 - 0.998 * hh : Math.max(150, 249.7 - 2.22 * hh * 0.5);
  const rho = 0.02 * Math.exp(-hh / 11.1);
  return {
    rho,
    p: 636 * Math.exp(-hh / 11.1),
    a: Math.sqrt(1.29 * 191.8 * Math.min(T, 240)),
    T,
  };
}
function atmosOf(body, h) {
  if (body === "earth") return earthAtmos(h);
  if (body === "mars")
    return h > 250 ? { rho: 0, p: 0, a: 230, T: 200 } : marsAtmos(h);
  return { rho: 0, p: 0, a: 1, T: 0 };
}
const P0_EARTH = 101325;
function rocketCd(M) {
  const tb = [
    [0, 0.25],
    [0.8, 0.3],
    [1.05, 0.55],
    [1.4, 0.5],
    [2.5, 0.36],
    [4, 0.28],
    [10, 0.25],
  ];
  if (M >= 10) return 0.25;
  for (let i = 0; i < tb.length - 1; i++)
    if (M < tb[i + 1][0]) {
      const [m0, c0] = tb[i],
        [m1, c1] = tb[i + 1];
      return c0 + ((c1 - c0) * (M - m0)) / (m1 - m0);
    }
  return 0.25;
}
function curveAt(curve, t) {
  if (!curve) return 1;
  if (t <= curve[0][0]) return curve[0][1];
  for (let i = 0; i < curve.length - 1; i++)
    if (t < curve[i + 1][0]) {
      const [a, x] = curve[i],
        [b, y] = curve[i + 1];
      return x + ((y - x) * (t - a)) / (b - a);
    }
  return curve[curve.length - 1][1];
}
function localFrame(body, r, t) {
  const up = vunit(r),
    pole = bodyPoleEcl(body, t);
  let east = vcross(pole, up);
  if (vnorm(east) < 1e-9) east = vperp(up);
  east = vunit(east);
  const north = vcross(up, east);
  return { up, east, north };
}

// ---------------------------------------------------------------------------
// ASCENT.  stack: {stages:[...], jettison:[...], payload (kg)}  (stages copied, propMass mutable)
// target: {normal (ECL unit), hp, ha (km)}.  Returns samples + events + final state
// ---------------------------------------------------------------------------
function buildAscentStack(launcher, payloadMass, opts = {}) {
  const st = launcher.stages.map((s) => ({
    ...s,
    propLeft: s.propMass,
    attached: true,
    ignited: false,
  }));
  return {
    name: launcher.name,
    stages: st,
    jettison: (launcher.jettison || []).map((j) => ({ ...j, done: false })),
    payload: payloadMass,
    upperOnly: !!opts.upperOnly,
  };
}
function stackMass(stack) {
  let m = stack.payload;
  for (const s of stack.stages) if (s.attached) m += s.dry + s.propLeft;
  for (const j of stack.jettison) if (!j.done) m += j.mass;
  return m;
}
