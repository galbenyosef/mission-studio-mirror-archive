// index-inline-1 02 — math
// Lines 346-675 of readable/index-inline-1.pretty.js (statement-aligned).
const MOON_LR = [
  // D, M, M', F, Σl(1e-6 deg), Σr(1e-3 km)
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
];
const MOON_B = [
  // D, M, M', F, Σb(1e-6 deg)
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
];
function moonGeoPosMeeus(t) {
  const T = t / (DAY * 36525);
  const Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T * T) * DEG;
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * DEG;
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * DEG;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * DEG;
  const F = (93.272095 + 483202.0175233 * T - 0.0036539 * T * T) * DEG;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let sl = 0,
    sr = 0,
    sb = 0;
  for (const [d, m, mp, f, cl, cr] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ef = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sl += cl * ef * Math.sin(arg);
    sr += cr * ef * Math.cos(arg);
  }
  for (const [d, m, mp, f, cb] of MOON_B) {
    const ef = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sb += cb * ef * Math.sin(d * D + m * M + mp * Mp + f * F);
  }
  // additive terms (Venus, Jupiter, flattening)
  const A1 = (119.75 + 131.849 * T) * DEG,
    A2 = (53.09 + 479264.29 * T) * DEG,
    A3 = (313.45 + 481266.484 * T) * DEG;
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(Lp - F) + 318 * Math.sin(A2);
  sb +=
    -2235 * Math.sin(Lp) +
    382 * Math.sin(A3) +
    175 * Math.sin(A1 - F) +
    175 * Math.sin(A1 + F) +
    127 * Math.sin(Lp - Mp) -
    115 * Math.sin(Lp + Mp);
  const lam = Lp + (sl / 1e6) * DEG - 1.396971 * T * DEG; // precess ecliptic-of-date → J2000 (approx.)
  const bet = (sb / 1e6) * DEG;
  const dist = 385000.56 + sr / 1000;
  const cb = Math.cos(bet);
  return [
    dist * cb * Math.cos(lam),
    dist * cb * Math.sin(lam),
    dist * Math.sin(bet),
  ];
}
// cached cubic-Hermite interpolation of Moon geocentric state (30-min grid)
const MOON_CACHE = new Map();
const MOON_STEP = 1800;
function moonNode(k) {
  let n = MOON_CACHE.get(k);
  if (!n) {
    const t = k * MOON_STEP,
      h = 30;
    const p = moonGeoPosMeeus(t),
      a = moonGeoPosMeeus(t - h),
      b = moonGeoPosMeeus(t + h);
    n = {
      p,
      v: [
        (b[0] - a[0]) / (2 * h),
        (b[1] - a[1]) / (2 * h),
        (b[2] - a[2]) / (2 * h),
      ],
    };
    if (MOON_CACHE.size > 200000) MOON_CACHE.clear();
    MOON_CACHE.set(k, n);
  }
  return n;
}
function hermite(p0, v0, p1, v1, h, s) {
  // s in [0,1]
  const s2 = s * s,
    s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1,
    h10 = s3 - 2 * s2 + s,
    h01 = -2 * s3 + 3 * s2,
    h11 = s3 - s2;
  const dh00 = (6 * s2 - 6 * s) / h,
    dh10 = 3 * s2 - 4 * s + 1,
    dh01 = (-6 * s2 + 6 * s) / h,
    dh11 = 3 * s2 - 2 * s;
  const r = new Array(3),
    v = new Array(3);
  for (let i = 0; i < 3; i++) {
    r[i] = h00 * p0[i] + h10 * h * v0[i] + h01 * p1[i] + h11 * h * v1[i];
    v[i] = dh00 * p0[i] + dh10 * v0[i] + dh01 * p1[i] + dh11 * v1[i];
  }
  return { r, v };
}
function moonGeo(t) {
  const k = Math.floor(t / MOON_STEP),
    s = (t - k * MOON_STEP) / MOON_STEP;
  const a = moonNode(k),
    b = moonNode(k + 1);
  return hermite(a.p, a.v, b.p, b.v, MOON_STEP, s);
}
const MU_EM_RATIO = BODIES.moon.mu / (BODIES.earth.mu + BODIES.moon.mu);
function planetHelio(name, t) {
  if (name === "sun") return { r: [0, 0, 0], v: [0, 0, 0] };
  if (name === "earth" || name === "moon") {
    const emb = planetHelioRaw("emb", t),
      m = moonGeo(t);
    const re = vaddScaled(emb.r, m.r, -MU_EM_RATIO),
      ve = vaddScaled(emb.v, m.v, -MU_EM_RATIO);
    if (name === "earth") return { r: re, v: ve };
    return { r: vadd(re, m.r), v: vadd(ve, m.v) };
  }
  if (MINOR_EL[name]) {
    const m = MINOR_EL[name];
    const n = Math.sqrt(BODIES.sun.mu / (m.a * m.a * m.a));
    return stateFromElemsM(
      m.a,
      m.e,
      m.i,
      m.Om,
      m.w,
      wrapPi(m.M0 + n * (t - m.t0)),
      BODIES.sun.mu,
    );
  }
  return planetHelioRaw(name, t);
}
const bodyPos = (name, t) => planetHelio(name, t).r;
// position of body B relative to body A
function relState(B, A, t) {
  if (A === B) return { r: [0, 0, 0], v: [0, 0, 0] };
  if (A === "earth" && B === "moon") return moonGeo(t);
  if (A === "moon" && B === "earth") {
    const m = moonGeo(t);
    return { r: vscale(m.r, -1), v: vscale(m.v, -1) };
  }
  const b = planetHelio(B, t),
    a = planetHelio(A, t);
  return { r: vsub(b.r, a.r), v: vsub(b.v, a.v) };
}

// ---------------- body orientation (IAU WGCCRE) ----------------
function iauPole(name, t) {
  const d = t / DAY,
    T = d / 36525;
  switch (name) {
    case "sun":
      return [286.13, 63.87, 84.176 + 14.1844 * d];
    case "mercury":
      return [
        281.0103 - 0.0328 * T,
        61.4155 - 0.0049 * T,
        329.5988 + 6.1385108 * d,
      ];
    case "venus":
      return [272.76, 67.16, 160.2 - 1.4813688 * d];
    case "moon": {
      const E1 = (125.045 - 0.0529921 * d) * DEG,
        E2 = (250.089 - 0.1059842 * d) * DEG,
        E3 = (260.008 + 13.0120009 * d) * DEG;
      const E4 = (176.625 + 13.3407154 * d) * DEG,
        E5 = (357.529 + 0.9856003 * d) * DEG;
      const a =
        269.9949 +
        0.0031 * T -
        3.8787 * Math.sin(E1) -
        0.1204 * Math.sin(E2) +
        0.07 * Math.sin(E3) -
        0.0172 * Math.sin(E4);
      const dd =
        66.5392 +
        0.013 * T +
        1.5419 * Math.cos(E1) +
        0.0239 * Math.cos(E2) -
        0.0278 * Math.cos(E3) +
        0.0068 * Math.cos(E4);
      const W =
        38.3213 +
        13.17635815 * d -
        1.4e-12 * d * d +
        3.561 * Math.sin(E1) +
        0.1208 * Math.sin(E2) -
        0.0642 * Math.sin(E3) +
        0.0158 * Math.sin(E4) +
        0.0252 * Math.sin(E5);
      return [a, dd, W];
    }
    case "mars":
      return [
        317.68143 - 0.1061 * T,
        52.8865 - 0.0609 * T,
        176.63 + 350.89198226 * d,
      ];
    case "jupiter":
      return [
        268.056595 - 0.006499 * T,
        64.495303 + 0.002413 * T,
        284.95 + 870.536 * d,
      ];
    case "saturn":
      return [40.589 - 0.036 * T, 83.537 - 0.004 * T, 38.9 + 810.7939024 * d];
    case "uranus":
      return [257.311, -15.175, 203.81 - 501.1600928 * d];
    case "neptune":
      return [299.36, 43.46, 253.18 + 536.3128492 * d];
  }
  return [0, 90, 0];
}
// returns 3x3 (row-major) mapping body-fixed vector -> ECL
function bodyFixedToEcl(name, t) {
  if (name === "earth") return mmul(EQ2ECL, Rz(gmst(t)));
  const [a, d, W] = iauPole(name, t);
  const Rbf2eq = mmul(
    mmul(Rz((a + 90) * DEG), Rx((90 - d) * DEG)),
    Rz(wrap2Pi(W * DEG)),
  );
  return mmul(EQ2ECL, Rbf2eq);
}
function bodyPoleEcl(name, t) {
  const M = bodyFixedToEcl(name, t);
  return [M[2], M[5], M[8]];
}
// lat/lon (deg, east +) → unit vector body-fixed
const llToBF = (lat, lon) => [
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
];
function bfToLL(v) {
  const r = vnorm(v);
  return [Math.asin(v[2] / r) * RAD, Math.atan2(v[1], v[0]) * RAD];
}
// inertial (ECL, body-centred) position of a surface site (alt km)
function sitePosEcl(body, lat, lon, alt, t) {
  const R =
    (BODIES[body].Rmean && body !== "earth"
      ? BODIES[body].Rmean
      : BODIES[body].R) + alt;
  return vscale(mvec(bodyFixedToEcl(body, t), llToBF(lat, lon)), R);
}
// angular velocity vector of body rotation (ECL)
function bodyOmegaEcl(body, t) {
  const w = body === "earth" ? BODIES.earth.rotRate : BODIES[body].rotRate || 0;
  return vscale(bodyPoleEcl(body, t), w);
}
function surfaceRadius(body) {
  return body === "earth"
    ? BODIES.earth.R
    : BODIES[body].Rmean || BODIES[body].R;
}
function subPointLL(body, rRel, t) {
  return bfToLL(mvec(mT(bodyFixedToEcl(body, t)), rRel));
}

// ---- kepler.js
// ============================================================================
// kepler.js — two-body mechanics: Stumpff, universal-variable propagation,
// orbital elements, Lambert solver, hyperbola / B-plane helpers
// ============================================================================
function stumpffC(z) {
  if (z > 1e-6) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-6) {
    const s = Math.sqrt(-z);
    return (Math.cosh(s) - 1) / -z;
  }
  return 0.5 - z / 24 + (z * z) / 720;
}
function stumpffS(z) {
  if (z > 1e-6) {
    const s = Math.sqrt(z);
    return (s - Math.sin(s)) / (s * s * s);
  }
  if (z < -1e-6) {
    const s = Math.sqrt(-z);
    return (Math.sinh(s) - s) / (s * s * s);
  }
  return 1 / 6 - z / 120 + (z * z) / 5040;
}
// universal-variable Kepler propagation; returns {r, v}
