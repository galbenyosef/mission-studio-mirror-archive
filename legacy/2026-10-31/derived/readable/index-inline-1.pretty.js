// ---- core.js
// ============================================================================
// core.js — constants, vector math, time, ephemerides, body orientation
// Frame convention: ECL = J2000 ecliptic (x → vernal equinox, z → ecliptic N)
// Units: km, s, kg, km/s.  Time t = seconds since J2000.0 (2000-01-01 12:00 UTC)
// ============================================================================
const DEG = Math.PI / 180,
  RAD = 180 / Math.PI,
  TAU = 2 * Math.PI;
const AU = 149597870.7; // km
const G0 = 9.80665; // m/s^2 (standard gravity)
const DAY = 86400;
const J2000_UNIX = 946728000; // unix seconds of J2000.0 epoch
const OBLIQ = 23.4392911 * DEG; // J2000 obliquity of the ecliptic
const C_KMS = 299792.458; // speed of light km/s

const BODIES = {
  sun: { name: "Sun", mu: 1.32712440018e11, R: 695700, color: "#ffd27a" },
  mercury: { name: "Mercury", mu: 22031.86855, R: 2439.7, color: "#a8a39c" },
  venus: { name: "Venus", mu: 324858.592, R: 6051.8, color: "#e8cf9a" },
  earth: {
    name: "Earth",
    mu: 398600.4418,
    R: 6378.137,
    Rmean: 6371.0,
    color: "#5aa0ff",
    J2: 1.08263e-3,
    rotRate: 7.2921159e-5,
    soi: 924000,
    atmH: 122,
  },
  moon: {
    name: "Moon",
    mu: 4902.800066,
    R: 1737.4,
    color: "#cfcfcf",
    soi: 66100,
    rotRate: 2.6616995e-6,
  },
  mars: {
    name: "Mars",
    mu: 42828.37362,
    R: 3396.19,
    Rmean: 3389.5,
    color: "#d9774a",
    soi: 577000,
    rotRate: 7.0882181e-5,
    atmH: 125,
  },
  jupiter: {
    name: "Jupiter",
    mu: 126686531.9,
    R: 71492,
    color: "#d8b48c",
    soi: 48.2e6,
  },
  saturn: {
    name: "Saturn",
    mu: 37931206.2,
    R: 60268,
    color: "#e3cf98",
    soi: 54.8e6,
  },
  uranus: { name: "Uranus", mu: 5793951.3, R: 25559, color: "#9fd6dc" },
  neptune: { name: "Neptune", mu: 6835099.5, R: 24764, color: "#5b7fe0" },
};

// ---------------- vector helpers (plain arrays) ----------------
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vscale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vnorm = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const vunit = (a) => {
  const n = vnorm(a) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};
const vlerp = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const vaddScaled = (a, b, s) => [
  a[0] + b[0] * s,
  a[1] + b[1] * s,
  a[2] + b[2] * s,
];
const vangle = (a, b) => {
  const c = vdot(a, b) / (vnorm(a) * vnorm(b) || 1);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};
const vcopy = (a) => [a[0], a[1], a[2]];
// rotate vector v about unit axis k by angle th (Rodrigues)
function vrot(v, k, th) {
  const c = Math.cos(th),
    s = Math.sin(th),
    kd = vdot(k, v),
    kx = vcross(k, v);
  return [
    v[0] * c + kx[0] * s + k[0] * kd * (1 - c),
    v[1] * c + kx[1] * s + k[1] * kd * (1 - c),
    v[2] * c + kx[2] * s + k[2] * kd * (1 - c),
  ];
}
// any unit vector perpendicular to a
function vperp(a) {
  const u = vunit(a);
  const t = Math.abs(u[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
  return vunit(vcross(u, t));
}
// 3x3 matrices, row-major flat arrays of 9
const mmul = (A, B) => {
  const C = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      C[i * 3 + j] =
        A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
const mvec = (M, v) => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
  M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
  M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
];
const mT = (M) => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
const Rx = (a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const Ry = (a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
const Rz = (a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
const wrapPi = (a) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const wrap2Pi = (a) => {
  a = a % TAU;
  return a < 0 ? a + TAU : a;
};
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};

// equatorial (J2000) <-> ecliptic (J2000)
const EQ2ECL = Rx(-OBLIQ);
const ECL2EQ = Rx(OBLIQ);
const eqToEcl = (v) => mvec(EQ2ECL, v);
const eclToEq = (v) => mvec(ECL2EQ, v);

// ---------------- time ----------------
const dateToT = (d) => d.getTime() / 1000 - J2000_UNIX;
const isoToT = (s) => dateToT(new Date(s));
const tToDate = (t) => new Date((t + J2000_UNIX) * 1000);
const tToJD = (t) => 2451545.0 + t / DAY;
function fmtUTC(t, withSec = true) {
  const d = tToDate(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}${withSec ? ":" + p(d.getUTCSeconds()) : ""}`;
}
function fmtMET(dt) {
  const sgn = dt < 0 ? "-" : "+";
  dt = dt < 0 ? Math.ceil(-dt - 1e-6) : dt; // counting down, show the seconds still to go (T−1, then T+0 at liftoff)
  const d = Math.floor(dt / DAY);
  dt -= d * DAY;
  const h = Math.floor(dt / 3600);
  dt -= h * 3600;
  const m = Math.floor(dt / 60);
  const s = Math.floor(dt - m * 60);
  const p = (n) => String(n).padStart(2, "0");
  return `T${sgn}${d > 0 ? d + "d " : ""}${p(h)}:${p(m)}:${p(s)}`;
}
function fmtDur(dt) {
  dt = Math.abs(dt);
  if (dt < 120) return dt.toFixed(1) + " s";
  if (dt < 7200) return (dt / 60).toFixed(1) + " min";
  if (dt < 3 * DAY) return (dt / 3600).toFixed(1) + " h";
  return (dt / DAY).toFixed(1) + " d";
}
// Greenwich mean sidereal time (rad)
function gmst(t) {
  const d = t / DAY,
    T = d / 36525;
  const th =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return wrap2Pi(th * DEG);
}

// ---------------- planetary ephemeris (JPL approximate elements, 1800-2050) ----------------
// [a(AU), e, I, L, varpi, Omega] and rates per Julian century
const PLANET_EL = {
  mercury: [
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [
      0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689,
      -0.12534081,
    ],
  ],
  venus: [
    [
      0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718,
      76.67984255,
    ],
    [
      0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329,
      -0.27769418,
    ],
  ],
  emb: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [
      0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088,
      -0.29257343,
    ],
  ],
  jupiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [
      -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668,
      0.20469106,
    ],
  ],
  saturn: [
    [
      9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831,
      113.66242448,
    ],
    [
      -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216,
      -0.28867794,
    ],
  ],
  uranus: [
    [
      19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763,
      74.01692503,
    ],
    [
      -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281,
      0.04240589,
    ],
  ],
  neptune: [
    [
      30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227,
      131.78422574,
    ],
    [
      0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464,
      -0.00508664,
    ],
  ],
};
// Small asteroid-like bodies (osculating elements, epoch t0) used by scenarios
const MINOR_EL = {};

function solveKeplerE(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 50; k++) {
    const f = E - e * Math.sin(E) - M,
      fp = 1 - e * Math.cos(E);
    const dE = -f / fp;
    E += dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  return E;
}
// heliocentric ecliptic state of planet from approximate elements
function planetElemsAt(name, t) {
  const T = t / (DAY * 36525);
  const [e0, r] = PLANET_EL[name];
  const a = (e0[0] + r[0] * T) * AU,
    e = e0[1] + r[1] * T,
    I = (e0[2] + r[2] * T) * DEG;
  const L = (e0[3] + r[3] * T) * DEG,
    vp = (e0[4] + r[4] * T) * DEG,
    Om = (e0[5] + r[5] * T) * DEG;
  return {
    a,
    e,
    i: I,
    Om,
    w: vp - Om,
    M: wrapPi(L - vp),
    nRate: (r[3] * DEG) / (DAY * 36525),
  };
}
function stateFromElemsM(a, e, i, Om, w, M, mu) {
  const E = solveKeplerE(M, e);
  const cE = Math.cos(E),
    sE = Math.sin(E),
    sq = Math.sqrt(1 - e * e);
  const n = Math.sqrt(mu / (a * a * a));
  const xp = a * (cE - e),
    yp = a * sq * sE;
  const Ed = n / (1 - e * cE);
  const vxp = -a * sE * Ed,
    vyp = a * sq * cE * Ed;
  const cO = Math.cos(Om),
    sO = Math.sin(Om),
    cw = Math.cos(w),
    sw = Math.sin(w),
    ci = Math.cos(i),
    si = Math.sin(i);
  const P = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si];
  const Q = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  return {
    r: [P[0] * xp + Q[0] * yp, P[1] * xp + Q[1] * yp, P[2] * xp + Q[2] * yp],
    v: [
      P[0] * vxp + Q[0] * vyp,
      P[1] * vxp + Q[1] * vyp,
      P[2] * vxp + Q[2] * vyp,
    ],
  };
}
function planetHelioRaw(name, t) {
  const el = planetElemsAt(name, t);
  return stateFromElemsM(el.a, el.e, el.i, el.Om, el.w, el.M, BODIES.sun.mu);
}

// ---------------- Moon (truncated Meeus ch.47 / ELP2000) ----------------
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
function kepProp(r0, v0, dt, mu) {
  if (dt === 0) return { r: vcopy(r0), v: vcopy(v0) };
  const r0n = vnorm(r0),
    v0n2 = vdot(v0, v0),
    smu = Math.sqrt(mu);
  const vr0 = vdot(r0, v0) / r0n;
  const alpha = 2 / r0n - v0n2 / mu;
  // reduce dt modulo period for ellipses
  if (alpha > 1e-12) {
    const P = TAU / Math.sqrt(mu * alpha * alpha * alpha);
    if (Math.abs(dt) > P) dt = dt % P;
  }
  const A = (r0n * vr0) / smu,
    B = 1 - alpha * r0n;
  const F = (x) => {
    const z = alpha * x * x;
    return (
      A * x * x * stumpffC(z) + B * x * x * x * stumpffS(z) + r0n * x - smu * dt
    );
  };
  const Fp = (x) => {
    const z = alpha * x * x;
    return A * x * (1 - z * stumpffS(z)) + B * x * x * stumpffC(z) + r0n;
  };
  // bracket (F is monotonic increasing in x since F' = r > 0)
  let x =
    alpha > 1e-12
      ? smu * alpha * dt
      : Math.sign(dt) * Math.sqrt(Math.abs(dt)) * 10;
  if (alpha < -1e-12) {
    const a = 1 / alpha,
      sgn = Math.sign(dt);
    const arg =
      (-2 * mu * alpha * dt) /
      (vdot(r0, v0) + sgn * Math.sqrt(-mu * a) * (1 - r0n * alpha));
    if (arg > 0) x = sgn * Math.sqrt(-a) * Math.log(arg);
  }
  let lo = Math.min(0, x),
    hi = Math.max(0, x);
  let flo = F(lo),
    fhi = F(hi),
    guard = 0;
  while (flo > 0 && guard++ < 200) {
    lo = lo * 2 - 1;
    flo = F(lo);
  }
  guard = 0;
  while (fhi < 0 && guard++ < 200) {
    hi = hi * 2 + 1;
    fhi = F(hi);
  }
  if (!(x > lo && x < hi)) x = 0.5 * (lo + hi);
  for (let k = 0; k < 200; k++) {
    const f = F(x);
    if (Math.abs(f) < 1e-9 * Math.max(1, smu * Math.abs(dt)) * 1e-3) break;
    if (f > 0) hi = x;
    else lo = x;
    let xn = x - f / Fp(x);
    if (!(xn > lo && xn < hi) || !isFinite(xn)) xn = 0.5 * (lo + hi);
    if (Math.abs(xn - x) < 1e-13 * Math.max(1, Math.abs(x))) {
      x = xn;
      break;
    }
    x = xn;
  }
  const z = alpha * x * x,
    Cz = stumpffC(z),
    Sz = stumpffS(z);
  const f = 1 - ((x * x) / r0n) * Cz,
    g = dt - ((x * x * x) / smu) * Sz;
  const r = [
    f * r0[0] + g * v0[0],
    f * r0[1] + g * v0[1],
    f * r0[2] + g * v0[2],
  ];
  const rn = vnorm(r);
  const fd = (smu / (rn * r0n)) * (alpha * x * x * x * Sz - x),
    gd = 1 - ((x * x) / rn) * Cz;
  return {
    r,
    v: [
      fd * r0[0] + gd * v0[0],
      fd * r0[1] + gd * v0[1],
      fd * r0[2] + gd * v0[2],
    ],
  };
}
// classical elements from state
function rv2coe(r, v, mu) {
  const rn = vnorm(r),
    vn = vnorm(v);
  const h = vcross(r, v),
    hn = vnorm(h);
  const i = Math.acos(clamp(h[2] / hn, -1, 1));
  const N = [-h[1], h[0], 0],
    Nn = vnorm(N);
  const vr = vdot(r, v) / rn;
  const evec = vscale(
    vsub(vscale(r, vn * vn - mu / rn), vscale(v, rn * vr)),
    1 / mu,
  );
  const e = vnorm(evec);
  const energy = (vn * vn) / 2 - mu / rn;
  const a = Math.abs(energy) > 1e-12 ? -mu / (2 * energy) : Infinity;
  let Om = Nn > 1e-10 ? Math.acos(clamp(N[0] / Nn, -1, 1)) : 0;
  if (N[1] < 0) Om = TAU - Om;
  let w = 0;
  if (Nn > 1e-10 && e > 1e-10) {
    w = Math.acos(clamp(vdot(N, evec) / (Nn * e), -1, 1));
    if (evec[2] < 0) w = TAU - w;
  } else if (e > 1e-10) {
    w = Math.atan2(evec[1], evec[0]);
    if (h[2] < 0) w = TAU - w;
  }
  let nu;
  if (e > 1e-10) {
    nu = Math.acos(clamp(vdot(evec, r) / (e * rn), -1, 1));
    if (vr < 0) nu = TAU - nu;
  } else {
    const ref = Nn > 1e-10 ? N : [1, 0, 0];
    nu = Math.acos(clamp(vdot(ref, r) / (vnorm(ref) * rn), -1, 1));
    if (vdot(vcross(ref, r), h) < 0) nu = TAU - nu;
  }
  const p = (hn * hn) / mu;
  const rp = p / (1 + e),
    ra = e < 1 ? p / (1 - e) : Infinity;
  const period = e < 1 ? TAU * Math.sqrt((a * a * a) / mu) : Infinity;
  const vinf = energy > 0 ? Math.sqrt(2 * energy) : 0;
  return {
    a,
    e,
    i,
    Om,
    w,
    nu,
    h,
    hn,
    evec,
    energy,
    rp,
    ra,
    p,
    period,
    vinf,
    C3: 2 * energy,
  };
}
// state from elements (true anomaly)
function coe2rv(p, e, i, Om, w, nu, mu) {
  const r = p / (1 + e * Math.cos(nu));
  const xp = r * Math.cos(nu),
    yp = r * Math.sin(nu);
  const vxp = -Math.sqrt(mu / p) * Math.sin(nu),
    vyp = Math.sqrt(mu / p) * (e + Math.cos(nu));
  const cO = Math.cos(Om),
    sO = Math.sin(Om),
    cw = Math.cos(w),
    sw = Math.sin(w),
    ci = Math.cos(i),
    si = Math.sin(i);
  const P = [cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si];
  const Q = [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si];
  return {
    r: vadd(vscale(P, xp), vscale(Q, yp)),
    v: vadd(vscale(P, vxp), vscale(Q, vyp)),
  };
}
// time from periapsis to true anomaly nu (ellipse or hyperbola)
function timeSincePeri(e, a, nu, mu) {
  if (e < 1) {
    const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
    const M = E - e * Math.sin(E);
    return M * Math.sqrt((a * a * a) / mu);
  }
  const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
  const M = e * Math.sinh(F) - F;
  return M * Math.sqrt((-a * a * a) / mu);
}
// Lambert (universal variables, bisection).  href: reference normal for prograde sense.
function lambert(r1, r2, tof, mu, href = [0, 0, 1], longWay = false) {
  const r1n = vnorm(r1),
    r2n = vnorm(r2);
  const cdn = clamp(vdot(r1, r2) / (r1n * r2n), -1, 1);
  let dnu = Math.acos(cdn);
  const cz = vdot(vcross(r1, r2), href);
  if (cz < 0) dnu = TAU - dnu;
  if (longWay) dnu = TAU - dnu;
  const A = Math.sin(dnu) * Math.sqrt((r1n * r2n) / (1 - Math.cos(dnu)));
  if (!isFinite(A) || Math.abs(A) < 1e-9) return null;
  const smu = Math.sqrt(mu);
  const yOf = (z) =>
    r1n + r2n + (A * (z * stumpffS(z) - 1)) / Math.sqrt(stumpffC(z));
  const tOf = (z) => {
    const y = yOf(z);
    if (y < 0) return -1;
    const C = stumpffC(z),
      S = stumpffS(z);
    const x = Math.sqrt(y / C);
    return (x * x * x * S + A * Math.sqrt(y)) / smu;
  };
  let lo = -4 * Math.PI * Math.PI,
    hi = 4 * Math.PI * Math.PI * 0.999999;
  let g = 0;
  while (tOf(lo) > tof && g++ < 60) lo *= 2;
  let z = 0;
  for (let k = 0; k < 200; k++) {
    z = 0.5 * (lo + hi);
    const tz = tOf(z);
    if (tz <= tof) lo = z;
    else hi = z;
    if (hi - lo < 1e-13) break;
  }
  const y = yOf(z);
  if (!(y > 0)) return null;
  const f = 1 - y / r1n,
    gg = A * Math.sqrt(y / mu),
    gd = 1 - y / r2n;
  const v1 = vscale(vsub(r2, vscale(r1, f)), 1 / gg);
  const v2 = vscale(vsub(vscale(r2, gd), r1), 1 / gg);
  return { v1, v2, dnu };
}
// hyperbola: periapsis radius from v_inf and impact parameter |B|, and inverse
const bFromRp = (rp, vinf, mu) =>
  rp * Math.sqrt(1 + (2 * mu) / (rp * vinf * vinf));
const rpFromB = (b, vinf, mu) => {
  const q = mu / (vinf * vinf);
  return -q + Math.sqrt(q * q + b * b);
};
// B-plane frame: S = v_inf unit (incoming), T = S x k_ref, R = S x T
function bPlaneFrame(S, kref = [0, 0, 1]) {
  let T = vcross(S, kref);
  if (vnorm(T) < 1e-8) T = vperp(S);
  T = vunit(T);
  const R = vcross(S, T);
  return { S, T, R };
}
// B-vector for an incoming relative state (r,v) about body mu
function bVector(r, v, mu) {
  const el = rv2coe(r, v, mu);
  if (el.e <= 1) return null;
  const vinf = Math.sqrt(2 * el.energy);
  const ehat = vscale(el.evec, 1 / el.e),
    hhat = vscale(el.h, 1 / el.hn);
  const cosT = -1 / el.e,
    sinT = Math.sqrt(1 - cosT * cosT); // true anomaly of asymptote
  // incoming asymptote direction S: velocity direction at nu → -nu_inf
  const pvec = vcross(hhat, ehat);
  const S = vunit(vadd(vscale(ehat, cosT), vscale(pvec, -sinT))).map((x) => -x); // pointing along incoming velocity
  // B vector: perpendicular to S, in orbit plane, B x S ∥ h? (h = B x v_inf)
  const b = -el.a * Math.sqrt(el.e * el.e - 1);
  const Bdir = vunit(vcross(S, hhat));
  return { B: vscale(Bdir, b), S, vinf, b, el };
}
// build hyperbolic/elliptic state at periapsis given plane normal hhat, periapsis direction, rp, and C3/energy
function periapsisState(phat, hhat, rp, vp) {
  return { r: vscale(phat, rp), v: vscale(vunit(vcross(hhat, phat)), vp) };
}
// departure hyperbola geometry: given outgoing v_inf vector and plane normal (must be ⊥ vinf),
// return periapsis direction and periapsis speed
function departureHyperbola(vinfVec, hhat, rp, mu) {
  const vinf = vnorm(vinfVec),
    e = 1 + (rp * vinf * vinf) / mu;
  const thInf = Math.acos(-1 / e);
  const S = vunit(vinfVec);
  // periapsis direction: rotate asymptote direction backwards by thInf about h
  const phat = vunit(vrot(S, hhat, -thInf));
  const vp = Math.sqrt(vinf * vinf + (2 * mu) / rp);
  return { phat, vp, e, thInf };
}
// arrival hyperbola: incoming v_inf vector, plane normal, periapsis radius
function arrivalHyperbola(vinfVec, hhat, rp, mu) {
  const vinf = vnorm(vinfVec),
    e = 1 + (rp * vinf * vinf) / mu;
  const thInf = Math.acos(-1 / e);
  const S = vunit(vinfVec);
  // incoming asymptote direction (pointing from craft toward motion) = S; periapsis reached after turning
  // position direction at -thInf is -S (craft comes from far away opposite to S)
  const phat = vunit(vrot(vscale(S, -1), hhat, thInf));
  const vp = Math.sqrt(vinf * vinf + (2 * mu) / rp);
  return { phat, vp, e, thInf };
}

// ---- integrator.js
// ============================================================================
// integrator.js — Dormand–Prince 5(4) adaptive integrator with event location,
// cislunar n-body force model (geocentric: Earth + Moon + Sun), finite burns
// ============================================================================
const DP = {
  c: [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1],
  a: [
    [],
    [1 / 5],
    [3 / 40, 9 / 40],
    [44 / 45, -56 / 15, 32 / 9],
    [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
    [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
    [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
  ],
  e: [
    71 / 57600,
    0,
    -71 / 16695,
    71 / 1920,
    -17253 / 339200,
    22 / 525,
    -1 / 40,
  ],
};
function dopriStep(f, t, y, h, k1, ws) {
  const n = y.length;
  const K = ws.K;
  K[0].set(k1);
  const yt = ws.yt;
  for (let s = 1; s < 7; s++) {
    const as = DP.a[s];
    for (let i = 0; i < n; i++) {
      let acc = y[i];
      for (let j = 0; j < s; j++) acc += h * as[j] * K[j][i];
      yt[i] = acc;
    }
    f(t + DP.c[s] * h, yt, K[s]);
  }
  // 5th order solution = yt after stage 7 input (FSAL): y_new = y + h*sum(a7j*Kj) which is yt computed at s=6
  const ynew = ws.ynew;
  ynew.set(yt);
  const err = ws.err;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = 0; j < 7; j++) acc += DP.e[j] * K[j][i];
    err[i] = h * acc;
  }
  return { ynew, k7: K[6], err };
}
function makeWS(n) {
  return {
    K: Array.from({ length: 7 }, () => new Float64Array(n)),
    yt: new Float64Array(n),
    ynew: new Float64Array(n),
    err: new Float64Array(n),
  };
}

// Hermite interpolation of state between two steps (positions use velocities; velocities use accelerations)
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
const RUNWAYS = {
  KSC15: {
    name: "Kennedy Space Center, Shuttle Landing Facility Runway 15",
    short: "KSC Runway 15",
    lat: 28.632753,
    lon: -80.706062,
    hdg: 150,
    len: 4.572,
    wid: 0.091,
    elev: 0,
    surface: "concrete",
    num: "15",
    ground: "florida",
  },
  KSC33: {
    name: "Kennedy Space Center, Shuttle Landing Facility Runway 33",
    short: "KSC Runway 33",
    lat: 28.597026,
    lon: -80.68268,
    hdg: 330,
    len: 4.572,
    wid: 0.091,
    elev: 0,
    surface: "concrete",
    num: "33",
    ground: "florida",
  },
  EDW22: {
    name: "Edwards Air Force Base, Runway 22 (concrete)",
    short: "Edwards Runway 22",
    lat: 34.91633,
    lon: -117.8625,
    hdg: 238,
    len: 4.579,
    wid: 0.091,
    elev: 0.696,
    surface: "concrete",
    num: "22",
    ground: "desert",
  },
  EDW04: {
    name: "Edwards Air Force Base, Runway 04 (concrete)",
    short: "Edwards Runway 04",
    lat: 34.8945,
    lon: -117.905,
    hdg: 58,
    len: 4.579,
    wid: 0.091,
    elev: 0.702,
    surface: "concrete",
    num: "04",
    ground: "desert",
  },
  EDW23L: {
    name: "Edwards Air Force Base, Rogers Dry Lake Runway 23 (lakebed)",
    short: "Rogers Dry Lake Runway 23",
    lat: 34.97,
    lon: -117.77,
    hdg: 238,
    len: 8.0,
    wid: 0.27,
    elev: 0.693,
    surface: "lakebed",
    num: "23",
    ground: "lakebed",
    approx: true,
  },
  WSSH17: {
    name: "White Sands Space Harbor, Runway 17 (gypsum)",
    short: "White Sands Runway 17",
    lat: 32.99,
    lon: -106.425,
    hdg: 170,
    len: 10.7,
    wid: 0.09,
    elev: 1.193,
    surface: "lakebed",
    num: "17",
    ground: "gypsum",
    approx: true,
  },
};

// Each launcher: stages in ignition order. parallel:true → burns together with the next stage from liftoff (boosters).
const LAUNCHERS = {
  saturnV: {
    name: "Saturn V",
    org: "NASA (USA)",
    years: "1967–1973",
    height: 110.6,
    diameter: 10.1,
    crewRated: true,
    blurb:
      "Three-stage super heavy-lift rocket of the Apollo program. Still the most powerful rocket ever to fly crews to the Moon.",
    stages: [
      // Lengths as stacked (the S-IC with its engines 42.06 m, the S-II with its aft interstage 24.87 m, the S-IVB with the
      // cone to the S-II 17.86 m, the instrument unit 0.91 m; 110.6 m with the Apollo spacecraft). geom starts at the base of
      // each stage's structure; eng.y0: the nozzles' exit plane from there (the S-II's and S-IVB's J-2s hang inside the
      // interstage below them). Drawn with the detailed model 'saturnv' (app/30_models.js) once it has loaded.
      {
        id: "S-IC",
        name: "S-IC first stage",
        prop: "kerolox",
        engine: "F-1",
        n: 5,
        thrustSL: 5 * 6770e3,
        thrustVac: 5 * 7770e3,
        ispSL: 263,
        ispVac: 304,
        dry: 130000,
        propMass: 2077000,
        maxG: 4.0,
        minThr: 0.8,
        geom: [[38.82, 5.05, 5.05, C.white, { roll: "sic" }]],
        eng: { n: 5, len: 3.24, r: 1.85, layout: "cross", spread: 4.7 },
        fins: { n: 4, len: 9.0, span: 3.4, color: C.white },
        detail: "saturnv",
      },
      {
        id: "S-II",
        name: "S-II second stage",
        prop: "hydrolox",
        engine: "J-2",
        n: 5,
        thrustSL: 5 * 486e3,
        thrustVac: 5 * 1033e3,
        ispSL: 200,
        ispVac: 421,
        dry: 36200,
        propMass: 443000,
        geom: [
          [5.49, 5.05, 5.05, C.white, { band: true, ist: true }],
          [19.38, 5.05, 5.05, C.white],
          [4.2, 5.05, 3.3, C.white],
        ],
        eng: { n: 5, len: 3.0, r: 1.0, layout: "cross", spread: 3.0, y0: 2.5 },
        detail: "saturnv",
      },
      {
        id: "S-IVB",
        name: "S-IVB third stage",
        prop: "hydrolox",
        engine: "J-2",
        n: 1,
        thrustSL: 486e3,
        thrustVac: 1033e3,
        ispSL: 200,
        ispVac: 421,
        dry: 11300,
        propMass: 107000,
        restart: true,
        geom: [
          [13.66, 3.3, 3.3, C.white, { roll: "sivb" }],
          [0.91, 3.3, 3.3, C.grey],
        ],
        eng: { n: 1, len: 3.0, r: 1.0, layout: "single", y0: -3.0 },
        detail: "saturnv",
      },
    ],
    jettison: [
      {
        name: "S-II aft interstage",
        mass: 5200,
        afterStage: 0,
        delay: 30,
        part: "IST",
      },
      {
        name: "Launch Escape System",
        mass: 4170,
        afterStage: 0,
        delay: 35,
        part: "LES",
      },
    ],
    payloadFairing: null,
    ascent: { hp: 185, ha: 190, vert: 12, kickGuess: 1.5 },
    roll: { padAz: 90, t: [13.2, 31.1] }, // roll program: from the pad azimuth (90°) to the flight azimuth, T+13.2 s to T+31.1 s (Apollo 11)
  },
  sls1: {
    name: "SLS Block 1",
    org: "NASA (USA)",
    years: "2022–",
    height: 98.1,
    diameter: 8.4,
    crewRated: true,
    blurb:
      "Space Launch System Block 1 — RS-25 core stage, two five-segment solid boosters and the ICPS upper stage. Launched Artemis I and the crewed Artemis II.",
    stages: [
      {
        id: "SRB",
        name: "2 × five-segment solid rocket boosters",
        prop: "solid",
        engine: "RSRMV",
        n: 2,
        thrustSL: 2 * 11.88e6,
        thrustVac: 2 * 13.2e6,
        ispSL: 242,
        ispVac: 268.8,
        dry: 2 * 98000,
        propMass: 2 * 631000,
        parallel: true,
        curve: [
          [0, 1.22],
          [20, 1.18],
          [45, 0.94],
          [62, 0.95],
          [85, 1.04],
          [108, 0.78],
          [122, 0.4],
          [135, 0.05],
        ],
        booster: { count: 2, offset: 6.1 },
        geom: [
          [2.6, 2.6, 1.86, C.white],
          [46.0, 1.855, 1.855, C.white, { bands: 4 }],
          [5.5, 1.855, 0.35, C.white],
        ],
        eng: { n: 1, len: 3.6, r: 1.9, layout: "single" },
      },
      {
        id: "Core",
        name: "Core stage (4 × RS-25)",
        prop: "hydrolox",
        engine: "RS-25",
        n: 4,
        thrustSL: 4 * 1860e3,
        thrustVac: 4 * 2280e3,
        ispSL: 366,
        ispVac: 452,
        dry: 85000,
        propMass: 980000,
        maxG: 3.5,
        minThr: 0.67,
        geom: [
          [4.5, 4.6, 4.2, C.white],
          [60.1, 4.2, 4.2, C.orange],
          [8.3, 4.2, 2.55, C.white],
        ],
        eng: { n: 4, len: 4.3, r: 1.2, layout: "square", spread: 2.0 },
      },
      {
        id: "ICPS",
        name: "Interim Cryogenic Propulsion Stage",
        prop: "hydrolox",
        engine: "RL10B-2",
        n: 1,
        thrustSL: 60e3,
        thrustVac: 110.1e3,
        ispSL: 300,
        ispVac: 465.5,
        dry: 3490,
        propMass: 27220,
        restart: true,
        geom: [
          [13.7, 2.55, 2.55, C.white],
          [1.5, 2.55, 2.05, C.white],
        ],
        eng: { n: 1, len: 2.4, r: 1.1, layout: "single" },
      },
    ],
    jettison: [
      { name: "Launch Abort System", mass: 7700, time: 195, part: "LES" },
      { name: "Service module fairings", mass: 1350, time: 190, part: "SAJ" },
    ],
    payloadFairing: null,
    ascent: { hp: 185, ha: 2300, vert: 10, kickGuess: 1.2 },
    roll: { padAz: 0, t: [8, 20] }, // on the pad the boosters stand east and west of the core, the launcher's tower to the north; it rolls to the flight azimuth once clear of the tower
  },
  lm5: {
    name: "Long March 5",
    org: "CASC (China)",
    years: "2016–",
    height: 57.0,
    diameter: 5.0,
    blurb:
      "China’s heavy-lift launcher: hydrolox core with four kerosene boosters. Launched Chang’e 5 and Tianwen-1.",
    stages: [
      {
        id: "K3-1",
        name: "4 × K3-1 boosters (2 × YF-100 each)",
        prop: "kerolox",
        engine: "YF-100",
        n: 8,
        thrustSL: 8 * 1200e3,
        thrustVac: 8 * 1340e3,
        ispSL: 300,
        ispVac: 335,
        dry: 4 * 13000,
        propMass: 4 * 143000,
        parallel: true,
        booster: { count: 4, offset: 4.2 },
        geom: [
          [22.6, 1.675, 1.675, C.white],
          [5.0, 1.675, 0.3, C.white],
        ],
        eng: { n: 2, len: 2.3, r: 0.75, layout: "pair", spread: 0.8 },
      },
      {
        id: "Core",
        name: "Core stage (2 × YF-77)",
        prop: "hydrolox",
        engine: "YF-77",
        n: 2,
        thrustSL: 2 * 510e3,
        thrustVac: 2 * 700e3,
        ispSL: 310,
        ispVac: 430,
        dry: 21600,
        propMass: 158500,
        geom: [[33.2, 2.5, 2.5, C.white, { flag: "cn" }]],
        eng: { n: 2, len: 2.8, r: 0.9, layout: "pair", spread: 1.1 },
      },
      {
        id: "Stage 2",
        name: "Second stage (2 × YF-75D)",
        prop: "hydrolox",
        engine: "YF-75D",
        n: 2,
        thrustSL: 2 * 50e3,
        thrustVac: 2 * 88.36e3,
        ispSL: 300,
        ispVac: 442.6,
        dry: 3400,
        propMass: 26100,
        restart: true,
        geom: [[11.5, 2.5, 2.5, C.white]],
        eng: { n: 2, len: 1.6, r: 0.55, layout: "pair", spread: 0.8 },
      },
    ],
    jettison: [
      { name: "Payload fairing", mass: 3000, alt: 115, part: "fairing" },
    ],
    payloadFairing: { len: 12.5, r: 2.6, color: C.white },
    ascent: { hp: 200, ha: 200, vert: 12, kickGuess: 1.6 },
  },
  atlasV541: {
    name: "Atlas V 541",
    org: "ULA (USA)",
    years: "2011–",
    height: 59.7,
    diameter: 3.81,
    blurb:
      "RD-180 powered common core, four solid boosters, single-engine Centaur upper stage and 5-m fairing. Launched Curiosity and Perseverance.",
    stages: [
      {
        id: "SRB",
        name: "4 × AJ-60A solid boosters",
        prop: "solid",
        engine: "AJ-60A",
        n: 4,
        thrustSL: 4 * 1170e3,
        thrustVac: 4 * 1330e3,
        ispSL: 245,
        ispVac: 279,
        dry: 4 * 4100,
        propMass: 4 * 42630,
        parallel: true,
        curve: [
          [0, 1.15],
          [30, 1.05],
          [70, 0.95],
          [85, 0.6],
          [95, 0.05],
        ],
        booster: { count: 4, offset: 2.75 },
        geom: [
          [17.0, 0.79, 0.79, C.white],
          [3.0, 0.79, 0.15, C.white],
        ],
        eng: { n: 1, len: 1.6, r: 0.75, layout: "single" },
      },
      {
        id: "CCB",
        name: "Common Core Booster (RD-180)",
        prop: "kerolox",
        engine: "RD-180",
        n: 1,
        thrustSL: 3827e3,
        thrustVac: 4152e3,
        ispSL: 311.3,
        ispVac: 337.8,
        dry: 21054,
        propMass: 284089,
        maxG: 4.8,
        minThr: 0.47,
        geom: [[32.5, 1.905, 1.905, "#d9864e"]],
        eng: { n: 2, len: 3.6, r: 0.75, layout: "pair", spread: 0.8 },
      },
      {
        id: "Centaur",
        name: "Centaur III (single RL10C-1)",
        prop: "hydrolox",
        engine: "RL10C-1",
        n: 1,
        thrustSL: 50e3,
        thrustVac: 101.8e3,
        ispSL: 300,
        ispVac: 449.7,
        dry: 2316,
        propMass: 20830,
        restart: true,
        geom: [[12.7, 1.525, 1.525, C.silver]],
        eng: { n: 1, len: 2.3, r: 0.75, layout: "single" },
      },
    ],
    jettison: [
      { name: "5-m payload fairing", mass: 4000, alt: 120, part: "fairing" },
    ],
    payloadFairing: { len: 20.7, r: 2.7, color: C.white, encloseUpper: true },
    ascent: { hp: 185, ha: 185, vert: 10, kickGuess: 2.5 },
  },
  atlasAgena: {
    // As Mariner 4 flew it: the Atlas 19.8 m from its base to the Agena adapter and 3.05 m across, the booster section a
    // skirt round the foot of the tank (its tank and sustainer engine stay when the section drops away); the Agena-D 6.3 m
    // long and 1.52 m across; the shroud enclosing the Agena and the spacecraft; 28.4 m in all. look: drawn over the plain
    // geometry by app/35_atlas.js
    name: "Atlas LV-3 Agena-D",
    org: "USAF / NASA (USA)",
    years: "1963–1978",
    height: 28.4,
    diameter: 3.05,
    blurb:
      "“Stage-and-a-half” Atlas with balloon tanks plus a restartable Agena-D upper stage. Sent Mariner 4 to the first Mars flyby.",
    stages: [
      {
        id: "Booster",
        name: "Atlas booster section (2 × LR89 + sustainer)",
        prop: "kerolox",
        engine: "LR89 ×2 + LR105",
        n: 3,
        thrustSL: 1590e3,
        thrustVac: 1850e3,
        ispSL: 258,
        ispVac: 290,
        dry: 3050,
        propMass: 87000,
        geom: [[0.8, 1.6, 1.6, C.steel]],
        eng: { n: 2, len: 2.1, r: 0.6, layout: "pair", spread: 3.0 },
        look: "atlasBooster",
      },
      {
        id: "Sustainer",
        name: "Atlas sustainer (LR105)",
        prop: "kerolox",
        engine: "LR105",
        n: 1,
        thrustSL: 254e3,
        thrustVac: 363e3,
        ispSL: 220,
        ispVac: 316,
        dry: 2350,
        propMass: 26500,
        geom: [
          [19.0, 1.525, 1.525, C.steel],
          [1.4, 1.525, 0.76, C.steel],
        ],
        eng: { n: 1, len: 2.1, r: 0.5, layout: "single" },
        look: "atlasSustainer",
      },
      {
        id: "Agena-D",
        name: "Agena-D (Bell 8247)",
        prop: "udmh",
        engine: "Bell 8247",
        n: 1,
        thrustSL: 40e3,
        thrustVac: 71.2e3,
        ispSL: 200,
        ispVac: 290,
        dry: 670,
        propMass: 6100,
        restart: true,
        geom: [[5.4, 0.76, 0.76, C.silver]],
        eng: { n: 1, len: 0.9, r: 0.4, layout: "single" },
        look: "agenaD",
      },
    ],
    jettison: [
      { name: "Mariner shroud", mass: 400, alt: 110, part: "fairing" },
    ],
    payloadFairing: {
      len: 9.0,
      r: 0.82,
      cyl: 0.78,
      color: C.silver,
      encloseUpper: true,
    },
    ascent: { hp: 185, ha: 185, vert: 10, kickGuess: 2.0 },
  },
  falconHeavy: {
    name: "Falcon Heavy (expendable)",
    org: "SpaceX (USA)",
    years: "2018–",
    height: 70.0,
    diameter: 3.66,
    blurb:
      "Three Falcon 9-derived cores (27 Merlin engines). Flown fully expendable for Europa Clipper.",
    stages: [
      {
        id: "Side boosters",
        name: "2 × side boosters (9 × Merlin 1D each)",
        prop: "kerolox",
        engine: "Merlin 1D",
        n: 18,
        thrustSL: 18 * 845e3,
        thrustVac: 18 * 914e3,
        ispSL: 282,
        ispVac: 311,
        dry: 2 * 22200,
        propMass: 2 * 411000,
        parallel: true,
        booster: { count: 2, offset: 3.75 },
        geom: [
          [37.0, 1.83, 1.83, C.white],
          [4.2, 1.83, 1.83, C.black],
          [3.2, 1.83, 0.25, C.white],
        ],
        eng: { n: 9, len: 1.4, r: 0.45, layout: "octaweb", spread: 1.25 },
      },
      {
        id: "Center core",
        name: "Center core (9 × Merlin 1D)",
        prop: "kerolox",
        engine: "Merlin 1D",
        n: 9,
        thrustSL: 9 * 845e3,
        thrustVac: 9 * 914e3,
        ispSL: 282,
        ispVac: 311,
        dry: 25000,
        propMass: 411000,
        thrWithBoosters: 0.55,
        maxG: 4.5,
        minThr: 0.4,
        geom: [
          [37.0, 1.83, 1.83, C.white],
          [4.2, 1.83, 1.83, C.black],
        ],
        eng: { n: 9, len: 1.4, r: 0.45, layout: "octaweb", spread: 1.25 },
      },
      {
        id: "Stage 2",
        name: "Second stage (Merlin Vacuum)",
        prop: "kerolox",
        engine: "MVac",
        n: 1,
        thrustSL: 600e3,
        thrustVac: 981e3,
        ispSL: 200,
        ispVac: 348,
        dry: 4000,
        propMass: 107500,
        restart: true,
        geom: [[12.6, 1.83, 1.83, C.white]],
        eng: { n: 1, len: 3.0, r: 1.5, layout: "single" },
      },
    ],
    jettison: [
      { name: "Payload fairing", mass: 1900, alt: 110, part: "fairing" },
    ],
    payloadFairing: { len: 13.1, r: 2.6, color: C.white },
    ascent: { hp: 185, ha: 185, vert: 10, kickGuess: 2.0 },
    roll: { padAz: 0, t: [10, 22] }, // on Pad 39A the three cores stand in a row east–west, the transporter-erector to the south
  },
  starship: {
    name: "Starship (Super Heavy + Ship, Block 2)",
    org: "SpaceX (USA)",
    years: "2025–",
    height: 123.0,
    diameter: 9.0,
    crewRated: true,
    blurb:
      "Fully reusable methalox two-stage vehicle (33 + 6 Raptor engines). Mars missions require refilling the Ship with ~8–10 tanker flights in Earth orbit.",
    stages: [
      {
        id: "Super Heavy",
        name: "Super Heavy booster (33 × Raptor 2)",
        prop: "methalox",
        engine: "Raptor 2",
        n: 33,
        thrustSL: 73.5e6,
        thrustVac: 78.0e6,
        ispSL: 327,
        ispVac: 347,
        dry: 275000,
        propMass: 3400000,
        maxG: 3.5,
        minThr: 0.4,
        geom: [
          [69.0, 4.5, 4.5, C.steel, { chines: true }],
          [2.0, 4.5, 4.5, C.dark],
        ],
        eng: { n: 33, len: 2.5, r: 0.65, layout: "raptor33", spread: 4.0 },
        gridfins: true,
      },
      {
        id: "Ship",
        name: "Ship (3 Raptor + 3 Raptor Vacuum)",
        prop: "methalox",
        engine: "Raptor / RVac",
        n: 6,
        thrustSL: 10.5e6,
        thrustVac: 15.0e6,
        ispSL: 327,
        ispVac: 368,
        dry: 100000,
        propMass: 1500000,
        restart: true,
        geom: [
          [44.0, 4.5, 4.5, C.steel, { tiles: true }],
          [8.1, 4.5, 0.6, C.steel, { tiles: true }],
        ],
        eng: { n: 6, len: 2.8, r: 0.9, layout: "ship6", spread: 2.2 },
        flaps: true,
      },
    ],
    jettison: [],
    payloadFairing: null,
    ascent: { hp: 200, ha: 200, vert: 8, kickGuess: 1.5 },
  },
  lvm3: {
    name: "LVM3",
    org: "ISRO (India)",
    years: "2017–",
    height: 43.5,
    diameter: 4.0,
    blurb:
      "India’s heaviest launcher: two S200 solid boosters, L110 liquid core and C25 cryogenic upper stage. Launched Chandrayaan-2 and -3.",
    stages: [
      {
        id: "S200",
        name: "2 × S200 solid boosters",
        prop: "solid",
        engine: "S200",
        n: 2,
        thrustSL: 2 * 4.6e6,
        thrustVac: 2 * 5.15e6,
        ispSL: 247,
        ispVac: 274.5,
        dry: 2 * 31300,
        propMass: 2 * 207000,
        parallel: true,
        curve: [
          [0, 1.12],
          [40, 1.05],
          [80, 0.95],
          [115, 0.7],
          [130, 0.05],
        ],
        booster: { count: 2, offset: 3.6 },
        geom: [
          [22.0, 1.6, 1.6, C.white],
          [4.0, 1.6, 0.3, C.white],
        ],
        eng: { n: 1, len: 2.6, r: 1.3, layout: "single" },
      },
      {
        id: "L110",
        name: "L110 core (2 × Vikas)",
        prop: "udmh",
        engine: "Vikas",
        n: 2,
        thrustSL: 2 * 600e3,
        thrustVac: 2 * 806e3,
        ispSL: 230,
        ispVac: 293,
        dry: 9000,
        propMass: 116000,
        ignition: 110,
        geom: [[17.0, 2.0, 2.0, C.cream]],
        eng: { n: 2, len: 2.1, r: 0.6, layout: "pair", spread: 0.8 },
      },
      {
        id: "C25",
        name: "C25 cryogenic stage (CE-20)",
        prop: "hydrolox",
        engine: "CE-20",
        n: 1,
        thrustSL: 100e3,
        thrustVac: 186e3,
        ispSL: 300,
        ispVac: 442,
        dry: 5000,
        propMass: 28000,
        geom: [[13.5, 2.0, 2.0, C.white]],
        eng: { n: 1, len: 2.0, r: 0.8, layout: "single" },
      },
    ],
    jettison: [
      { name: "Payload fairing", mass: 2400, alt: 115, part: "fairing" },
    ],
    payloadFairing: { len: 10.75, r: 2.5, color: C.white },
    ascent: { hp: 170, ha: 36500, vert: 10, kickGuess: 2.5 },
  },
};

// Space Shuttle: the stack is the External Tank with two solid boosters on its sides and the orbiter on its belly.
// The three RS-25 main engines sit on the orbiter but burn the tank's propellant, so the "core stage" here is the
// ET (dry mass) with the RS-25s' thrust; the engines' own mass is part of the orbiter (spacecraft).
//   RSRM (per booster): 2.80 Mlbf sea level at liftoff, 3.07 Mlbf peak at T+20 s, propellant 1,107,000 lb, inert
//   ≈ 192,000 lb, action time ≈ 124 s, shaped grain with a thrust bucket around Max-Q (NASA RSRM overview, NTRS).
//   RS-25 at 104.5 %: 491,900 lbf vacuum / ≈ 397,700 lbf sea level, Isp 452 / 365 s; minimum power 67 %.
//   Super Lightweight Tank: 58,500 lb dry, ≈ 1.62 Mlb of LOX + LH2.
// The curve below is the booster's vacuum thrust relative to its liftoff value (1985 SRM data scaled to the RSRM).
LAUNCHERS.shuttle = {
  name: "Space Shuttle",
  org: "NASA (USA)",
  years: "1981–2011",
  height: 56.1,
  diameter: 8.4,
  crewRated: true,
  sideMount: true,
  blurb:
    "Two solid rocket boosters and three RS-25 engines on the winged orbiter, all burning at liftoff; the RS-25s draw on the orange External Tank. The boosters fall away after two minutes, the tank at orbit, and the orbiter glides home to a runway.",
  stages: [
    {
      id: "SRB",
      name: "2 × Solid Rocket Boosters (RSRM)",
      prop: "solid",
      engine: "RSRM",
      n: 2,
      thrustSL: 2 * 12.45e6,
      thrustVac: 2 * 13.61e6,
      ispSL: 242,
      ispVac: 268,
      dry: 2 * 87000,
      propMass: 2 * 501000,
      parallel: true,
      curve: [
        [0, 1.0],
        [10, 1.062],
        [20, 1.088],
        [30, 0.938],
        [50, 0.775],
        [60, 0.8],
        [75, 0.85],
        [100, 0.732],
        [110, 0.369],
        [115, 0.258],
        [120, 0.144],
        [124, 0.016],
        [130, 0.016],
      ],
      // 45.46 m from the nozzle's exit to the nose, 3.71 m across; the nozzle's exit 9.26 m below the tank's aft dome (the stack
      // stands 56.1 m tall). Drawn with the detailed model 'shuttle_stack' once it has loaded (the left booster mirrored).
      booster: { count: 2, offset: 6.4, y0: -8.38 },
      geom: [
        [2.5, 2.6, 1.86, C.white],
        [35.9, 1.855, 1.855, C.white, { bands: 4 }],
        [3.3, 1.855, 1.6, C.white],
        [2.4, 1.6, 0.6, C.white],
        [0.48, 0.6, 0.1, C.white],
      ],
      eng: { n: 1, len: 0.88, r: 1.9, layout: "single" },
      detail: "shuttle_stack",
    },
    {
      id: "ET",
      name: "External Tank (3 × RS-25 on the orbiter)",
      prop: "hydrolox",
      engine: "RS-25",
      n: 3,
      thrustSL: 3 * 1.769e6,
      thrustVac: 3 * 2.188e6,
      ispSL: 365,
      ispVac: 452.3,
      dry: 26500,
      propMass: 729000,
      maxG: 3.0,
      minThr: 0.67,
      sched: [
        [0, 1],
        [30, 1],
        [32, 0.69],
        [50, 0.69],
        [53, 1],
      ],
      geom: [
        [0.9, 2.4, 4.2, C.foam],
        [26.1, 4.2, 4.2, C.foam],
        [6.9, 4.2, 4.2, "#c9803f", { bands: true }],
        [1.9, 4.2, 4.2, C.foam],
        [4.4, 4.2, 3.55, C.foam],
        [3.8, 3.55, 2.3, C.foam],
        [2.4, 2.3, 0.75, C.foam],
        [0.5, 0.75, 0.15, "#4a4a4a"],
      ],
      eng: null,
      detail: "shuttle_stack",
    },
  ],
  jettison: [],
  payloadFairing: null,
  // direct insertion: main engine cutoff (MECO) at ≈ 105 km on a 58 × 225 km orbit; the OMS raises the perigee later
  ascent: {
    hp: 58,
    ha: 225,
    hCut: 105,
    vert: 7,
    kickGuess: 3,
    qMax: 36000,
    gTgo: true,
  },
  arefExtra: 25,
};
// Engine start on the pad: liquid engines light t seconds before liftoff and build up to full thrust (ramp, s; stagger
// between engine groups, s) while hold-down clamps keep the vehicle down; solid boosters always light at T−0.
//   Saturn V: engine start sequence at T−8.9 s, centre F-1 first, then opposing pairs 300 ms apart (NASA)
//   SLS: RS-25 start-up at T−6.36 s, boosters at T−0 (NASA Artemis II countdown)
//   Atlas V: RD-180 ignition at T−2.7 s, solids at T−0 (ULA timelines)
//   Falcon Heavy: 27 Merlins at about T−2 s (Spaceflight Now) · Starship: about T−3 s (press reports)
//   Long March 5: core and boosters ignite before liftoff (time approximate) · Atlas LV-3: approximate
//   LVM3: the S200 solids light at T−0 and the L110 core is air-started, so nothing burns on the pad beforehand
const PAD_IGNITION = {
  saturnV: {
    t: 8.9,
    ramp: 4.0,
    stagger: 0.3,
    seq: "centre engine first, then opposing pairs 0.3 s apart",
  },
  sls1: {
    t: 6.36,
    ramp: 3.0,
    stagger: 0.12,
    seq: "the four RS-25s start 0.12 s apart",
  },
  atlasV541: { t: 2.7, ramp: 1.4 },
  atlasAgena: { t: 2.0, ramp: 1.2, approx: true },
  falconHeavy: { t: 2.0, ramp: 1.2 },
  lm5: { t: 3.0, ramp: 1.6, approx: true },
  starship: { t: 3.0, ramp: 1.6, approx: true },
  lvm3: { t: 0, ramp: 0 },
  shuttle: {
    t: 6.6,
    ramp: 3.0,
    stagger: 0.12,
    seq: "main engines 3, 2 and 1 start 0.12 s apart",
  }, // NSTS News Reference Manual
};
for (const k in PAD_IGNITION)
  if (LAUNCHERS[k]) LAUNCHERS[k].ign = PAD_IGNITION[k];
// stages whose engines are burning at liftoff: boosters plus the first core stage (unless that core is air-started)
function liftoffStages(L) {
  const iCore = L.stages.findIndex((s) => !s.parallel);
  return L.stages.filter(
    (s, i) => (s.parallel || i === iCore) && !(s.ignition > 0),
  );
}
// "27 × Merlin 1D", "8 × YF-100 + 2 × YF-77": engine counts, identical engines merged
function engineCounts(stages) {
  const m = new Map();
  for (const s of stages) m.set(s.engine, (m.get(s.engine) || 0) + s.n);
  return [...m].map(([e, n]) => `${n} × ${e}`).join(" + ");
}

// ---------------- spacecraft (payload stacks) ----------------
// modules: dry kg, prop kg, engine {name, thrust N, isp s, prop}
const SPACECRAFT = {
  apolloCSMLM: {
    name: "Apollo CSM + LM",
    crewMax: 3,
    modules: {
      CM: {
        name: "Command Module “Columbia”",
        dry: 5557,
        prop: 0,
        heat: { diam: 3.91, LD: 0.3, cd: 1.3, rn: 4.7, chutes: "apollo" },
      },
      SM: {
        name: "Service Module",
        dry: 4831,
        prop: 18413,
        engine: {
          name: "SPS (AJ10-137)",
          thrust: 91190,
          isp: 314,
          prop: "hypergolic",
        },
      },
      LMDS: {
        name: "LM Descent Stage",
        dry: 2034,
        prop: 8248,
        engine: {
          name: "DPS (LMDE)",
          thrust: 45040,
          isp: 311,
          prop: "hypergolic",
          minThr: 0.1,
        },
      },
      LMAS: {
        name: "LM Ascent Stage “Eagle”",
        dry: 2416,
        prop: 2353,
        engine: { name: "APS", thrust: 15570, isp: 311, prop: "hypergolic" },
      },
      SLA: { name: "Spacecraft–LM Adapter panels", dry: 1800, prop: 0 },
    },
    orbiter: ["CM", "SM"],
    lander: ["LMDS", "LMAS"],
    ascender: ["LMAS"],
    adapter: ["SLA"],
    prop: { orbiter: "SM", lander: "LMDS", ascender: "LMAS" },
    capsule: "CM",
    model: "apollo",
  },
  apolloCSMLTA: {
    name: "Apollo CSM + LTA-B test mass",
    crewMax: 3,
    modules: {
      CM: {
        name: "Command Module",
        dry: 5621,
        prop: 0,
        heat: { diam: 3.91, LD: 0.3, cd: 1.3, rn: 4.7, chutes: "apollo" },
      },
      SM: {
        name: "Service Module",
        dry: 4901,
        prop: 18413,
        engine: {
          name: "SPS (AJ10-137)",
          thrust: 91190,
          isp: 314,
          prop: "hypergolic",
        },
      },
      LTA: { name: "LM Test Article B (ballast)", dry: 9026, prop: 0 },
      SLA: { name: "Spacecraft–LM Adapter panels", dry: 1800, prop: 0 },
    },
    orbiter: ["CM", "SM"],
    lander: null,
    adapter: ["SLA", "LTA"],
    prop: { orbiter: "SM" },
    capsule: "CM",
    model: "apolloCSM",
  },
  orion: {
    name: "Orion (CM + European Service Module)",
    crewMax: 4,
    modules: {
      CM: {
        name: "Orion Crew Module “Integrity”",
        dry: 9520,
        prop: 0,
        heat: { diam: 5.02, LD: 0.27, cd: 1.3, rn: 6.0, chutes: "orion" },
      },
      ESM: {
        name: "European Service Module",
        dry: 6858,
        prop: 8600,
        engine: {
          name: "OMS-E (AJ10-190)",
          thrust: 26600,
          isp: 316,
          prop: "mmh",
        },
      },
    },
    orbiter: ["CM", "ESM"],
    lander: null,
    prop: { orbiter: "ESM" },
    capsule: "CM",
    model: "orion",
  },
  change5: {
    name: "Chang’e 5 (orbiter + returner + lander + ascender)",
    crewMax: 0,
    modules: {
      RET: {
        name: "Returner capsule",
        dry: 300,
        prop: 0,
        heat: { diam: 1.25, LD: 0.25, cd: 1.3, rn: 1.2, chutes: "probe" },
      },
      ORB: {
        name: "Orbiter",
        dry: 1250,
        prop: 2750,
        engine: {
          name: "3000 N main engine",
          thrust: 3000,
          isp: 315,
          prop: "mmh",
        },
      },
      LDR: {
        name: "Lander",
        dry: 900,
        prop: 2300,
        engine: {
          name: "7500 N variable-thrust engine",
          thrust: 7500,
          isp: 310,
          prop: "mmh",
          minThr: 0.2,
        },
      },
      ASC: {
        name: "Ascender",
        dry: 330,
        prop: 370,
        engine: {
          name: "3000 N ascent engine",
          thrust: 3000,
          isp: 310,
          prop: "mmh",
        },
      },
    },
    orbiter: ["RET", "ORB"],
    lander: ["LDR", "ASC"],
    ascender: ["ASC"],
    prop: { orbiter: "ORB", lander: "LDR", ascender: "ASC" },
    capsule: "RET",
    model: "change5",
  },
  mariner4: {
    name: "Mariner 4",
    crewMax: 0,
    modules: {
      BUS: {
        name: "Mariner 4 spacecraft",
        dry: 255,
        prop: 6,
        engine: {
          name: "222 N midcourse motor",
          thrust: 222,
          isp: 230,
          prop: "hydrazine",
        },
      },
    },
    orbiter: ["BUS"],
    lander: null,
    prop: { orbiter: "BUS" },
    model: "mariner",
  },
  perseverance: {
    name: "Mars 2020: cruise stage + aeroshell + descent stage + Perseverance",
    crewMax: 0,
    modules: {
      CRUISE: {
        name: "Cruise stage",
        dry: 469,
        prop: 70,
        engine: {
          name: "8 × MR-111 thrusters",
          thrust: 35,
          isp: 220,
          prop: "hydrazine",
        },
      },
      AEROSHELL: {
        name: "Heat shield + backshell + parachute",
        dry: 1425,
        prop: 0,
      },
      DS: {
        name: "Descent stage (sky crane)",
        dry: 670,
        prop: 400,
        engine: {
          name: "8 × MLE (Mars Landing Engines)",
          thrust: 8 * 3060,
          isp: 220,
          prop: "hydrazine",
          minThr: 0.08,
        },
      },
      ROVER: { name: "Perseverance rover + Ingenuity", dry: 1027, prop: 0 },
    },
    orbiter: ["CRUISE"],
    entry: ["AEROSHELL", "DS", "ROVER"],
    prop: { orbiter: "CRUISE", lander: "DS" },
    // sky crane (Perseverance's landing press kit): from 20 m up the descent stage lets the rover down on 6.4 m bridles and
    // stands hang = 8.1 m above the ground when its wheels touch (the bridle device 0.6 m under the stage, the bridles, the
    // rover's deck 1.13 m above its wheels: app/33_mars2020.js); then it flies off and comes down about 650 m away. Just
    // after it drops from the backshell it flies sideways, clear of the backshell and parachute coming down behind it
    edl: {
      diam: 4.5,
      LD: 0.24,
      cd: 1.65,
      rn: 1.125,
      chute: { diam: 21.5, cd: 0.6, mach: 1.75 },
      heatshieldSepMach: 0.8,
      backshellSepAlt: 2.1,
      skycrane: true,
      hang: 8.1,
      skyAlt: 20,
      bridle: 6.4,
      flyaway: 650,
      divert: [30, 15],
    },
    model: "msl",
  },
  tianwen1: {
    name: "Tianwen-1 (orbiter + entry capsule with Zhurong)",
    crewMax: 0,
    modules: {
      ORB: {
        name: "Orbiter",
        dry: 1265,
        prop: 2450,
        engine: {
          name: "3000 N main engine",
          thrust: 3000,
          isp: 315,
          prop: "mmh",
        },
      },
      CAPS: {
        name: "Entry capsule (heat shield + backshell)",
        dry: 450,
        prop: 0,
      },
      LDR: {
        name: "Lander",
        dry: 330,
        prop: 265,
        engine: {
          name: "7500 N variable-thrust engine",
          thrust: 7500,
          isp: 300,
          prop: "mmh",
          minThr: 0.2,
        },
      },
      ROVER: { name: "Zhurong rover", dry: 240, prop: 0 },
    },
    orbiter: ["ORB"],
    entry: ["CAPS", "LDR", "ROVER"],
    prop: { orbiter: "ORB", lander: "LDR" },
    edl: {
      diam: 3.4,
      LD: 0.2,
      cd: 1.6,
      rn: 1.0,
      chute: { diam: 16, cd: 0.6, mach: 1.8 },
      heatshieldSepMach: 0.8,
      backshellSepAlt: 1.5,
      skycrane: false,
      trimWing: true,
      divert: [25, 12],
    },
    model: "tianwen",
  },
  europaClipper: {
    name: "Europa Clipper",
    crewMax: 0,
    modules: {
      SC: {
        name: "Europa Clipper spacecraft",
        dry: 3315,
        prop: 2750,
        engine: {
          name: "16 × 27.5 N + main thrusters",
          thrust: 16 * 27.5,
          isp: 225,
          prop: "mmh",
        },
      },
    },
    orbiter: ["SC"],
    lander: null,
    prop: { orbiter: "SC" },
    model: "clipper",
  },
  starshipCrew: {
    name: "Starship (crewed Mars configuration)",
    crewMax: 12,
    modules: { CARGO: { name: "Crew habitat + cargo", dry: 100000, prop: 0 } },
    orbiter: ["CARGO"],
    lander: null,
    usesUpperStage: true,
    prop: {},
    model: "starshipPayload",
    edl: { diam: 9, LD: 0.25, cd: 1.1, rn: 4.5, propulsive: true },
  },
  msrConcept: {
    name: "Sample-return stack (orbiter/returner + lander/ascent vehicle)",
    crewMax: 0,
    modules: {
      RET: {
        name: "Earth entry capsule",
        dry: 110,
        prop: 0,
        heat: { diam: 1.25, LD: 0, cd: 1.2, rn: 0.6, chutes: "none" },
      },
      ORB: {
        name: "Orbiter / Earth-return vehicle",
        dry: 1400,
        prop: 6200,
        engine: {
          name: "3000 N main engine",
          thrust: 3000,
          isp: 318,
          prop: "mmh",
        },
      },
      CAPS: { name: "Entry aeroshell", dry: 700, prop: 0 },
      LDR: {
        name: "Lander",
        dry: 650,
        prop: 500,
        engine: {
          name: "7500 N variable-thrust engine",
          thrust: 7500,
          isp: 300,
          prop: "mmh",
          minThr: 0.2,
        },
      },
      MAV: {
        name: "Mars Ascent Vehicle (2-stage, modelled as 1)",
        dry: 100,
        prop: 470,
        engine: {
          name: "Solid rocket motors",
          thrust: 9000,
          isp: 292,
          prop: "solid",
        },
      },
    },
    orbiter: ["RET", "ORB"],
    entry: ["CAPS", "LDR", "MAV"],
    ascender: ["MAV"],
    prop: { orbiter: "ORB", lander: "LDR", ascender: "MAV" },
    capsule: "RET",
    orbiterStays: true,
    edl: {
      diam: 4.0,
      LD: 0.22,
      cd: 1.6,
      rn: 1.0,
      chute: { diam: 18, cd: 0.6, mach: 1.8 },
      heatshieldSepMach: 0.8,
      backshellSepAlt: 1.8,
      skycrane: false,
    },
    model: "msr",
  },
  inspirationMars: {
    name: "Crew capsule + inflatable habitat (Inspiration Mars concept)",
    crewMax: 2,
    modules: {
      CAP: {
        name: "Crew capsule (Dragon-class)",
        dry: 5000,
        prop: 0,
        heat: { diam: 3.7, LD: 0.25, cd: 1.3, rn: 4.0, chutes: "orion" },
      },
      HAB: {
        name: "Inflatable habitat + 501 days of consumables",
        dry: 3500,
        prop: 0,
      },
      PROP: {
        name: "Service module",
        dry: 800,
        prop: 700,
        engine: {
          name: "Service module engine",
          thrust: 30000,
          isp: 320,
          prop: "mmh",
        },
      },
    },
    orbiter: ["CAP", "HAB", "PROP"],
    lander: null,
    prop: { orbiter: "PROP" },
    capsule: "CAP",
    model: "capsuleHab",
  },
  // Space Shuttle orbiter. ORB: empty orbiter with its three RS-25s (≈ 79 t), plus crew, consumables and RCS
  // propellant; scenarios override it per vehicle and flight. OMS: two AJ10-190 engines, 6,000 lbf each, Isp 313 s.
  shuttle: {
    name: "Space Shuttle orbiter",
    crewMax: 8,
    modules: {
      ORB: {
        name: "Orbiter (with 3 × RS-25, crew, consumables, RCS)",
        dry: 84000,
        prop: 0,
      },
      OMS: {
        name: "Orbital Maneuvering System (two pods)",
        dry: 0,
        prop: 10800,
        engine: {
          name: "2 × OMS (AJ10-190)",
          thrust: 2 * 26690,
          isp: 313,
          prop: "mmh",
        },
      },
      PAY: { name: "Payload in the bay", dry: 0, prop: 0 },
    },
    orbiter: ["ORB", "OMS", "PAY"],
    lander: null,
    prop: { orbiter: "OMS" },
    model: "shuttle",
    winged: { S: 249.9, rn: 1.0, span: 23.79, len: 37.24 },
  },
  chandrayaan3: {
    name: "Chandrayaan-3 (propulsion module + Vikram lander + Pragyan)",
    crewMax: 0,
    modules: {
      PM: {
        name: "Propulsion module",
        dry: 448,
        prop: 1696,
        engine: { name: "440 N LAM", thrust: 440, isp: 315, prop: "mmh" },
      },
      LDR: {
        name: "Vikram lander + Pragyan rover",
        dry: 620,
        prop: 1132,
        engine: {
          name: "4 × 800 N throttleable engines",
          thrust: 3200,
          isp: 305,
          prop: "mmh",
          minThr: 0.3,
        },
      },
    },
    orbiter: ["PM"],
    lander: ["LDR"],
    prop: { orbiter: "PM", lander: "LDR" },
    model: "chandrayaan",
  },
};
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
function simulateAscent(opt) {
  const body = opt.body || "earth",
    B = BODIES[body],
    mu = B.mu,
    Rb = surfaceRadius(body) + (opt.siteElev || 0);
  const stack = opt.stack,
    t0 = opt.t0,
    dt = opt.dt || 0.2,
    record = opt.record !== false;
  const omega = bodyOmegaEcl(body, t0);
  const site = vscale(vunit(sitePosEcl(body, opt.lat, opt.lon, 0, t0)), Rb);
  let r = vcopy(site),
    v = vcross(omega, r);
  const nT = vunit(opt.target.normal),
    hp = opt.target.hp,
    ha = opt.target.ha ?? hp;
  const rpT = surfaceRadius(body) + hp,
    raT = surfaceRadius(body) + ha,
    aT = (rpT + raT) / 2;
  const epsT = -mu / (2 * aT);
  // cutoff point on the target orbit: its perigee, or (direct insertion, e.g. the Shuttle's MECO) a given altitude on
  // the way up to apogee, with the radial speed the target orbit has there
  const rCut =
    opt.target.hCut != null ? surfaceRadius(body) + opt.target.hCut : rpT;
  const hAngT = Math.sqrt((mu * 2 * rpT * raT) / (rpT + raT));
  const vtCut =
    opt.target.hCut != null ? hAngT / rCut : Math.sqrt(mu * (2 / rpT - 1 / aT));
  const vrCut =
    opt.target.hCut != null
      ? Math.sqrt(Math.max(0, 2 * (epsT + mu / rCut) - vtCut * vtCut))
      : 0;
  // inertial launch azimuth from target plane, then rotating-frame correction
  const lf0 = localFrame(body, r, t0);
  let dIn = vcross(nT, lf0.up);
  dIn = vsub(dIn, vscale(lf0.up, vdot(dIn, lf0.up)));
  dIn = vunit(dIn);
  const azI = Math.atan2(vdot(dIn, lf0.east), vdot(dIn, lf0.north));
  const vOrb = Math.sqrt(mu / rpT),
    vEq = vdot(v, lf0.east);
  const azR = Math.atan2(vOrb * Math.sin(azI) - vEq, vOrb * Math.cos(azI));
  const kick = (opt.kick ?? 2) * DEG,
    vert = opt.vert ?? 10,
    kickDur = 8;
  const samples = record ? [] : null,
    events = [];
  const ev = (name, desc, extra) =>
    events.push({ t: t, name, desc, ...(extra || {}) });
  let t = t0,
    phase = "vertical",
    closedLoop = false,
    lastDir = vcopy(lf0.up),
    stageIdx = 0,
    prevDir = null,
    qPast = false,
    qOn = 0;
  const qBlend = body === "earth" && opt.qBlend !== false,
    QA = (opt.qAlpha ?? 100000) * DEG; // Pa·rad: dynamic pressure × angle of attack the guidance may use
  const swingLog = [];
  let swing10 = 0,
    swingT = 0; // the most the steering turned within any 10 s after the pitch-over (deg), and when
  const maxTurn = (opt.maxRate ?? 6) * DEG * dt; // attitude control turns the vehicle at most this far per step
  let maxQ = 0,
    maxQt = t0,
    maxQlogged = false,
    maxG = 0,
    coastUntil = -Infinity,
    firstStaging = false;
  // ignite first stage(s)
  const st = stack.stages;
  st[0].ignited = true;
  st[0].tIgn = t0;
  if (st[0].parallel && st[1]) {
    st[1].ignited = true;
    st[1].tIgn = t0;
  }
  const activeStages = () =>
    st.filter(
      (s) =>
        s.attached &&
        s.ignited &&
        s.propLeft > 0 &&
        !(s.ignition && t - t0 < s.ignition),
    );
  const anyBoosters = () => st.some((s) => s.attached && s.parallel);
  let mdotNow = 0,
    thrustNow = 0,
    dragNow = [0, 0, 0],
    qNow = 0,
    machNow = 0,
    thrDir = lf0.up;
  let result = { ok: false };
  const g0 = G0;
  // time to burn dvKms more with the stages still attached, in order — boosters burning alongside the core first
  function burnTimeFor(dvKms) {
    let dv = dvKms * 1000,
      m0 = stackMass(stack),
      tt = 0;
    const bst = st.filter(
        (s) => s.attached && s.parallel && s.ignited && s.propLeft > 0,
      ),
      core0 = st.find((s) => s.attached && !s.parallel && s.propLeft > 0);
    let coreUsed = 0;
    if (bst.length && core0) {
      let F = 0,
        md = 0,
        tB = Infinity;
      for (const b of bst) {
        const ve = b.ispVac * g0,
          mdB = b._mdot > 0 ? b._mdot : b.thrustVac / ve; // the flow now (solid motors follow their thrust curve)
        F += mdB * ve;
        md += mdB;
        tB = Math.min(
          tB,
          b.propLeft / mdB,
          b.curve
            ? Math.max(1, b.curve[b.curve.length - 1][0] - (t - b.tIgn))
            : Infinity,
        );
      }
      const veC = core0.ispVac * g0,
        mdC = (core0.thrustVac / veC) * (core0._thr || 1);
      F += mdC * veC;
      md += mdC;
      const ve = F / md,
        m1 = Math.max(m0 - md * tB, 1),
        dvB = ve * Math.log(m0 / m1);
      if (dv <= dvB) return (m0 - m0 * Math.exp(-dv / ve)) / md;
      tt += tB;
      dv -= dvB;
      m0 = m1;
      coreUsed = mdC * tB;
      for (const b of bst)
        m0 -=
          b.dry +
          Math.max(
            0,
            b.propLeft -
              (b._mdot > 0 ? b._mdot : b.thrustVac / (b.ispVac * g0)) * tB,
          ); // they drop away
    }
    for (const s of st) {
      if (!s.attached || s.parallel) continue;
      const pl = s.propLeft - (s === core0 ? coreUsed : 0);
      if (pl <= 0) continue;
      const ve = s.ispVac * g0,
        mdot = s.thrustVac / ve;
      const dvAv = ve * Math.log(m0 / (m0 - pl));
      if (opt.gTgo && s.maxG) {
        // engines throttled to hold the g limit once the stack is light enough (Shuttle: 3 g)
        const aMax = s.maxG * g0,
          mLim = s.thrustVac / aMax;
        if (mLim < m0) {
          const dv1 = ve * Math.log(m0 / Math.max(mLim, m0 - pl));
          if (dv <= dv1) {
            tt += (m0 - m0 * Math.exp(-dv / ve)) / mdot;
            return tt;
          }
          if (mLim > m0 - pl) {
            tt += (m0 - mLim) / mdot;
            const dv2 = Math.min(dv - dv1, ve * Math.log(mLim / (m0 - pl)));
            tt += dv2 / aMax;
            if (dv - dv1 <= dv2 + 1e-9) return tt;
            dv -= dv1 + dv2;
            m0 -= pl + s.dry;
            continue;
          }
        }
      }
      if (dv <= dvAv) {
        tt += (m0 - m0 * Math.exp(-dv / ve)) / mdot;
        return tt;
      }
      tt += pl / mdot;
      dv -= dvAv;
      m0 -= pl + s.dry;
    }
    return tt + 1e4;
  }
  const maxT = opt.maxTime || 1500;
  while (t - t0 < maxT) {
    const rn = vnorm(r),
      alt = rn - surfaceRadius(body),
      altG = rn - Rb;
    if (altG < -0.05 && t - t0 > 5) {
      ev("Vehicle lost", "Trajectory intersected the surface.");
      result = { ok: false, reason: "crash" };
      break;
    }
    const atm = atmosOf(body, alt);
    const vrel = vsub(v, vcross(omega, r)),
      vreln = vnorm(vrel);
    const lf = localFrame(body, r, t);
    // --- jettisons
    for (const j of stack.jettison) {
      if (j.done) continue;
      let go = false;
      if (j.alt != null && alt >= j.alt) go = true;
      if (j.time != null && t - t0 >= j.time) go = true;
      if (
        j.afterStage != null &&
        st[j.afterStage] &&
        !st[j.afterStage].attached &&
        st[j.afterStage].tSep != null &&
        t - st[j.afterStage].tSep >= (j.delay || 0)
      )
        go = true;
      if (go) {
        j.done = true;
        ev(
          j.name + " jettisoned",
          `Dropping ${Math.round(j.mass).toLocaleString()} kg of structure no longer needed.`,
          { kind: "jettison", part: j.part },
        );
      }
    }
    // --- staging
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      if (
        s.attached &&
        s.ignited &&
        (s.propLeft <= 0 ||
          (s.curve && t - s.tIgn >= s.curve[s.curve.length - 1][0]))
      ) {
        // spent, or its thrust has tailed off (solid motors)
        s.attached = false;
        s.tSep = t;
        const kind = s.parallel
          ? "Booster separation"
          : i === st.length - 1
            ? "Upper stage depletion"
            : `${s.id} cutoff & separation`;
        ev(
          kind,
          s.parallel
            ? `${s.name} burn out and separate. The core continues alone.`
            : `${s.name} exhausted its ${Math.round(s.propMass / 1000).toLocaleString()} t of propellant and separates.`,
          { kind: "staging", stage: s.id },
        );
        if (!firstStaging) {
          firstStaging = true;
          if (!opt.noClosedLoop) closedLoop = true;
        }
        if (!s.parallel) {
          const nx = st.slice(i + 1).find((x) => x.attached);
          if (nx && !nx.ignited) {
            coastUntil = t + (opt.sepCoast ?? 2.0);
            nx.pendingIgnition = true;
          } else if (!nx) {
            result = { ok: false, reason: "propellant" };
          }
        }
      }
    }
    if (result.reason === "propellant") {
      ev(
        "Insufficient performance",
        "All stages are exhausted before reaching orbit — the payload is too heavy for this vehicle.",
      );
      break;
    }
    for (const s of st)
      if (s.pendingIgnition && t >= coastUntil) {
        s.pendingIgnition = false;
        s.ignited = true;
        s.tIgn = t;
        ev(
          `${s.id} ignition`,
          `${s.engine} engine${s.n > 1 ? "s" : ""} ignite${s.n > 1 ? "" : "s"}: ${PROP[s.prop].label}.`,
          { kind: "ignition", stage: s.id },
        );
      }
    // --- forces
    const act = coastUntil > t ? [] : activeStages();
    const m = stackMass(stack);
    let Ttot = 0,
      mdot = 0;
    const pr = atm.p / P0_EARTH;
    for (const s of act) {
      let thr = 1;
      if (s.thrWithBoosters && anyBoosters()) thr = s.thrWithBoosters;
      if (s.sched) thr *= curveAt(s.sched, t - s.tIgn); // scheduled throttle (e.g. the Shuttle's Max-Q bucket)
      const cv = curveAt(s.curve, t - s.tIgn);
      const Tv = s.thrustVac * cv,
        Ts = s.thrustSL * cv;
      const T = Math.max(0, Tv - (Tv - Ts) * Math.min(pr, 1)) * thr;
      Ttot += T;
      s._T = T;
      s._mdot = (Tv / (s.ispVac * g0)) * thr;
      s._thr = thr;
      mdot += s._mdot;
    }
    // g-limit & max-Q throttling (applied to the non-parallel stage)
    const core = act.find((s) => !s.parallel);
    const qNowPre = 0.5 * atm.rho * Math.pow(vreln * 1000, 2);
    if (
      core &&
      core.minThr &&
      opt.qMax &&
      qNowPre > opt.qMax &&
      core._T > 0 &&
      body === "earth"
    ) {
      const k = clamp(
        Math.pow(opt.qMax / qNowPre, 2),
        core.sched
          ? Math.min(1, core.minThr / Math.max(core._thr, 1e-6))
          : core.minThr,
        1,
      );
      Ttot = Ttot - core._T + core._T * k;
      mdot = mdot - core._mdot + core._mdot * k;
      core._mdot *= k;
      core._thr *= k;
      core._T *= k;
    }
    if (core && core.maxG) {
      const allowed = core.maxG * g0 * m;
      if (Ttot > allowed && core._T > 0) {
        const other = Ttot - core._T;
        const k = clamp((allowed - other) / core._T, core.minThr || 0.4, 1);
        Ttot = other + core._T * k;
        mdot = mdot - core._mdot + core._mdot * k;
        core._mdot *= k;
        core._thr *= k;
      }
    }
    // drag
    let Aref = 0;
    {
      let rmax = 0;
      for (const s of st)
        if (s.attached && !s.parallel) {
          rmax = Math.max(
            rmax,
            s.geom ? Math.max(...s.geom.map((gg) => gg[1])) : 2,
          );
          break;
        }
      if (
        opt.fairingR &&
        stack.jettison.some((j) => j.part === "fairing" && !j.done)
      )
        rmax = Math.max(rmax, opt.fairingR);
      Aref = Math.PI * rmax * rmax + (opt.arefExtra || 0);
      for (const s of st)
        if (s.attached && s.parallel && s.booster)
          Aref += s.booster.count * Math.PI * Math.pow(s.geom[0][1], 2);
      if (Aref === 0) Aref = 10;
    }
    const M = (vreln * 1000) / (atm.a || 300),
      q = 0.5 * atm.rho * Math.pow(vreln * 1000, 2);
    const Dmag = q * rocketCd(M) * Aref; // N
    const Dvec = vreln > 1e-6 ? vscale(vrel, -Dmag / vreln) : [0, 0, 0];
    // --- guidance
    let dir;
    const tf = t - t0;
    {
      // open loop (and, from Earth, the path the guidance is phased in from)
      const az = vadd(
        vscale(lf.north, Math.cos(azR)),
        vscale(lf.east, Math.sin(azR)),
      ); // heading held at the launch azimuth (yaw steering)
      if (tf < vert) {
        dir = lf.up;
        phase = "vertical";
      } else if (tf < vert + kickDur || vreln < 0.05) {
        const k = kick * clamp((tf - vert) / kickDur, 0, 1);
        dir = vunit(vadd(vscale(lf.up, Math.cos(k)), vscale(az, Math.sin(k))));
        phase = "pitchover";
      } else {
        // gravity turn: pitch follows the air-relative flight-path angle
        const gam = Math.asin(clamp(vdot(vunit(vrel), lf.up), -1, 1));
        dir = vunit(
          vadd(vscale(lf.up, Math.sin(gam)), vscale(az, Math.cos(gam))),
        );
        phase = "gravity turn";
      }
      if (opt.closedLoopAt != null && tf >= opt.closedLoopAt) closedLoop = true;
    }
    const dirOL = dir;
    // closed-loop insertion guidance: radial and out-of-plane acceleration profiles that reach the cutoff state at time-to-go
    const clCommand = () => {
      const up = vunit(r);
      let ed = vcross(nT, up);
      ed = vunit(vsub(ed, vscale(up, vdot(ed, up))));
      const vr = vdot(v, up),
        vd = vdot(v, ed),
        vn = vdot(v, nT),
        npos = vdot(r, nT);
      const dvNeed = Math.sqrt((vtCut - vd) ** 2 + (vrCut - vr) ** 2 + vn * vn);
      const tgo = Math.max(1, burnTimeFor(dvNeed));
      const aTh = m > 0 ? Ttot / m / 1000 : 0; // km/s^2
      if (!(tgo > 6 && aTh > 0)) return null;
      const geff = mu / (rn * rn) - (vd * vd + vn * vn) / rn;
      const tg = Math.max(tgo, 8);
      let ar =
        (6 * (rCut - rn - vr * tg)) / (tg * tg) - (2 * (vrCut - vr)) / tg;
      if (opt.target.hCut != null && tgo < 60) {
        // direct insertion: over the last minute steer more and more only the climb rate, toward the one the target orbit has at this radius
        const vtr = hAngT / rn,
          vrNow = Math.sqrt(Math.max(0, 2 * (epsT + mu / rn) - vtr * vtr)),
          f = smoothstep((60 - tgo) / 30);
        ar = ar * (1 - f) + (f * 2 * (vrNow - vr)) / Math.max(tgo, 4);
      }
      ar = ar + geff;
      let an = (6 * (-npos - vn * tg)) / (tg * tg) + (2 * vn) / tg;
      // the attitude splits the thrust between the channels as for the average acceleration still to come (the Δv left over
      // the time left), so it carries straight through staging instead of jumping with the thrust of the stage now burning
      const aRef = clamp(dvNeed / tgo, 0.25 * aTh, 4 * aTh);
      ar = clamp(ar, -0.7 * aRef, 0.95 * aRef);
      an = clamp(an, -0.3 * aRef, 0.3 * aRef);
      const ad = Math.sqrt(Math.max(0, aRef * aRef - ar * ar - an * an));
      return vunit(vadd(vadd(vscale(up, ar), vscale(nT, an)), vscale(ed, ad)));
    };
    // From Earth the guidance steers from the end of the pitch-over, held within the angle of attack the air allows: none
    // before max-Q (the stack flies its gravity turn through the dense atmosphere), then widening from zero as the air
    // thins (q·α ≤ QA·(1 − q/q₀), q₀ the pressure when it starts, 90% of max-Q, so the allowance opens without a step).
    // The stack eases onto the guided path while it climbs, and nothing switches when a stage drops away — handing over
    // at staging made it swing tens of degrees. Elsewhere the guidance takes over at the set time or at the first staging.
    if (qBlend && tf >= vert + kickDur) {
      if (!qPast && maxQ > 5000 && qNowPre < 0.9 * maxQ) {
        qPast = true;
        qOn = qNowPre;
      }
      const cmd = clCommand(),
        aMax = qPast
          ? clamp(QA / Math.max(qNowPre, 1) - QA / qOn, 0, Math.PI)
          : 0;
      if (cmd) {
        const th = Math.acos(clamp(vdot(dirOL, cmd), -1, 1));
        if (th <= aMax) dir = cmd;
        else if (aMax > 0 && th < Math.PI - 1e-3) {
          const sn = Math.sin(th);
          dir = vunit(
            vadd(
              vscale(dirOL, Math.sin(th - aMax) / sn),
              vscale(cmd, Math.sin(aMax) / sn),
            ),
          );
        }
        if (aMax > 10 * DEG) phase = "closed-loop guidance";
        lastDir = dir;
      } else if (qPast) {
        dir = lastDir;
        phase = "closed-loop guidance";
      }
      if (opt.debug)
        opt.debug({ t: tf, q: qNowPre, aMax: aMax * RAD, dirOL, cmd, lf }); // diagnostics
    } else if (closedLoop) {
      phase = "closed-loop guidance";
      const cmd = clCommand();
      dir = cmd || lastDir;
      lastDir = dir;
    } else lastDir = dir || lastDir;
    // the vehicle swings round at a finite rate: any jump left in the steering command is flown over several seconds
    if (prevDir && dir && tf > vert) {
      const th = Math.acos(clamp(vdot(prevDir, dir), -1, 1));
      if (th > maxTurn && th < Math.PI - 1e-3) {
        const sn = Math.sin(th);
        dir = vunit(
          vadd(
            vscale(prevDir, Math.sin(th - maxTurn) / sn),
            vscale(dir, Math.sin(maxTurn) / sn),
          ),
        );
        lastDir = dir;
      }
    }
    if (dir) prevDir = dir;
    thrDir = dir;
    if (
      dir &&
      tf > vert + kickDur &&
      Ttot > 0 &&
      (!swingLog.length || t - swingLog[swingLog.length - 1][0] >= 1)
    ) {
      swingLog.push([t, vcopy(dir)]);
      while (swingLog.length > 1 && t - swingLog[0][0] > 10) swingLog.shift();
      const sw = Math.acos(clamp(vdot(swingLog[0][1], dir), -1, 1)) * RAD;
      if (sw > swing10) {
        swing10 = sw;
        swingT = t - t0;
      }
    }
    // --- record
    if (q > maxQ) {
      maxQ = q;
      maxQt = t;
    } else if (
      !maxQlogged &&
      maxQ > 1000 &&
      q < 0.9 * maxQ &&
      body === "earth"
    ) {
      maxQlogged = true;
      events.push({
        t: maxQt,
        name: "Max-Q",
        desc: `Maximum dynamic pressure ≈ ${(maxQ / 1000).toFixed(1)} kPa — peak aerodynamic stress on the vehicle.`,
        kind: "maxq",
      });
    }
    const aProper = (Ttot + Dmag) / m;
    if (aProper > maxG) maxG = aProper;
    if (
      record &&
      (samples.length === 0 ||
        t - samples[samples.length - 1].t >= 0.999 * (opt.sampleDt || 1))
    ) {
      const up = lf.up;
      const down = vsub(r, vscale(up, 0));
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: Ttot,
        thrDir: vcopy(dir),
        D: Dvec,
        q,
        mach: M,
        alt,
        stage: (act.find((s) => !s.parallel) || act[0] || {}).id || "—",
        phase,
        throttle: core ? core._thr : 1,
      });
    }
    // --- cutoff test
    const eps = vdot(v, v) / 2 - mu / rn;
    let rpNow = 0;
    if (eps >= epsT) {
      const hv = vnorm(vcross(r, v)),
        ee = Math.sqrt(Math.max(0, 1 + (2 * eps * hv * hv) / (mu * mu)));
      rpNow = (hv * hv) / mu / (1 + ee);
    }
    if (
      eps >= epsT &&
      alt > hp * 0.5 &&
      (rpNow >= surfaceRadius(body) + 0.6 * hp ||
        eps >= epsT + 0.25 * Math.abs(epsT))
    ) {
      ev(
        "Orbit insertion",
        `Engine cutoff. Target orbit ${hp.toFixed(0)} × ${ha.toFixed(0)} km reached.`,
        { kind: "insertion" },
      );
      result = { ok: true };
      break;
    }
    if (
      Ttot === 0 &&
      coastUntil < t &&
      act.length === 0 &&
      !st.some((s) => s.pendingIgnition)
    ) {
      if (!st.some((s) => s.attached && s.propLeft > 0)) {
        ev(
          "Insufficient performance",
          "All stages are exhausted before reaching orbit.",
        );
        result = { ok: false, reason: "propellant" };
        break;
      }
    }
    // --- integrate (RK4, thrust direction & magnitude held over the step)
    const Tk = Ttot / m / 1000; // km/s^2 initial
    const f = (rr, vv, mm) => {
      const rn2 = vdot(rr, rr),
        rn1 = Math.sqrt(rn2);
      const g = vscale(rr, -mu / (rn2 * rn1));
      const at = mm > 0 ? Ttot / mm / 1000 : 0;
      const ad = mm > 0 ? vscale(Dvec, 1 / mm / 1000) : [0, 0, 0];
      return vadd(vadd(g, vscale(dir, at)), ad);
    };
    const m1 = m,
      mdt = mdot * dt;
    const k1v = f(r, v, m1),
      k1r = v;
    const k2v = f(
        vaddScaled(r, k1r, dt / 2),
        vaddScaled(v, k1v, dt / 2),
        m1 - mdt / 2,
      ),
      k2r = vaddScaled(v, k1v, dt / 2);
    const k3v = f(
        vaddScaled(r, k2r, dt / 2),
        vaddScaled(v, k2v, dt / 2),
        m1 - mdt / 2,
      ),
      k3r = vaddScaled(v, k2v, dt / 2);
    const k4v = f(vaddScaled(r, k3r, dt), vaddScaled(v, k3v, dt), m1 - mdt),
      k4r = vaddScaled(v, k3v, dt);
    r = vadd(
      r,
      vscale(
        vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)),
        dt / 6,
      ),
    );
    v = vadd(
      v,
      vscale(
        vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)),
        dt / 6,
      ),
    );
    for (const s of act) s.propLeft = Math.max(0, s.propLeft - s._mdot * dt);
    t += dt;
  }
  const rn = vnorm(r);
  const el = rv2coe(r, v, mu);
  const upper = st.find((s) => s.attached && !s.parallel) || null;
  return {
    ...result,
    t,
    r,
    v,
    m: stackMass(stack),
    samples,
    events,
    el,
    hpAch: el.rp - surfaceRadius(body),
    haAch: el.ra - surfaceRadius(body),
    upper,
    upperProp: upper ? upper.propLeft : 0,
    maxG: maxG / g0,
    maxQ,
    azI: azI * RAD,
    azR: azR * RAD,
    stack,
    swing10,
    swingT,
  };
}
// optimise pitch-kick for maximum remaining propellant
function optimizeAscent(base) {
  const run = (k, rec) => {
    const stack = cloneStack(base.stack);
    return simulateAscent({
      ...base,
      stack,
      kick: k,
      record: rec,
      dt: rec ? base.dt || 0.2 : 0.4,
    });
  };
  const qLim = base.qLimit || 36000;
  const score = (res) =>
    (res.ok
      ? res.upperProp + 1e5
      : -1e6 + (res.el && isFinite(res.el.rp) ? res.el.rp : 0)) -
    Math.max(0, res.maxQ - qLim) * 3 -
    (base.swingW ?? 30) * Math.max(0, (res.swing10 || 0) - 10) ** 2; // fuel first, but steering that turns more than 10° within 10 s is charged 30 kg per square degree over
  let a = 0.2,
    b = base.kickMax || 14,
    gr = (Math.sqrt(5) - 1) / 2;
  // coarse scan first
  let best = { k: base.kickGuess || 2, s: -Infinity };
  for (let k = 0.3; k <= b; k += (b - 0.3) / 13) {
    const s = score(run(k, false));
    if (s > best.s) best = { k, s };
  }
  a = Math.max(0.1, best.k - (b - 0.3) / 13);
  b = best.k + (b - 0.3) / 13;
  let c = b - gr * (b - a),
    d = a + gr * (b - a),
    fc = score(run(c, false)),
    fd = score(run(d, false));
  for (let i = 0; i < 12; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - gr * (b - a);
      fc = score(run(c, false));
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + gr * (b - a);
      fd = score(run(d, false));
    }
  }
  const kOpt = fc > fd ? c : d;
  const res = run(kOpt, true);
  res.kick = kOpt;
  return res;
}
function cloneStack(s) {
  return {
    ...s,
    stages: s.stages.map((x) => ({ ...x })),
    jettison: s.jettison.map((j) => ({ ...j })),
  };
}

// ---------------------------------------------------------------------------
// POWERED DESCENT (Moon / Mars final phase).  Frame: body-centred ECL.
// ---------------------------------------------------------------------------
function simulateDescent(opt) {
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0),
    m = opt.m0;
  const Tmax = opt.Tmax,
    ve = opt.isp * G0,
    minThr = opt.minThr ?? 0.1;
  const tgo0 = opt.tgo,
    tEnd = opt.t0 + tgo0;
  const omega = bodyOmegaEcl(body, opt.t0);
  const hover = opt.hoverAlt ?? 0.15,
    elev = opt.elev || 0;
  const samples = [],
    events = [];
  let mode = "braking",
    dt = 0.25,
    propUsed = 0,
    saturated = 0,
    steps = 0,
    landed = false;
  const site = (tt) => sitePosEcl(body, opt.lat, opt.lon, elev, tt);
  const rT0 = site(tEnd),
    upT = vunit(rT0);
  const rT = vadd(rT0, vscale(upT, hover)),
    vT = vadd(vcross(omega, rT), vscale(upT, -0.0012));
  while (steps++ < 20000) {
    const rn = vnorm(r),
      up = vunit(r);
    const ground = site(t),
      alt = vdot(vsub(r, ground), up);
    const g = vscale(r, -mu / (rn * rn * rn));
    const vrel = vsub(v, vcross(omega, r));
    let acmd;
    const tgo = tEnd - t;
    if (mode !== "terminal" && (tgo < 4 || alt < hover * 0.9)) {
      mode = "terminal";
      events.push({
        t,
        name: opt.terminalName || "Terminal descent",
        desc: "Vertical descent at ~1 m/s to touchdown.",
        kind: "terminal",
      });
    }
    if (mode !== "terminal") {
      const zem = vsub(
        rT,
        vadd(vadd(r, vscale(v, tgo)), vscale(g, 0.5 * tgo * tgo)),
      );
      const zev = vsub(vT, vadd(v, vscale(g, tgo)));
      acmd = vsub(vscale(zem, 6 / (tgo * tgo)), vscale(zev, 2 / tgo));
      if (mode === "braking" && alt < 2.5) {
        mode = "approach";
        events.push({
          t,
          name: opt.approachName || "Approach phase",
          desc: "Pitching upright — the landing site comes into view.",
          kind: "approach",
        });
      }
    } else {
      const vdes = vadd(vscale(up, -(alt > 0.03 ? 0.0012 : 0.0009)), [0, 0, 0]);
      const hz = vsub(vrel, vscale(up, vdot(vrel, up)));
      const err = vsub(vsub(vdes, vscale(up, vdot(vrel, up))), hz);
      acmd = vadd(vscale(g, -1), vscale(err, 0.6));
    }
    let amag = vnorm(acmd);
    const amax = Tmax / m / 1000,
      amin = minThr * amax;
    let dir = amag > 1e-12 ? vscale(acmd, 1 / amag) : up;
    if (amag > amax) {
      amag = amax;
      saturated += dt;
    }
    if (amag < amin) amag = amin;
    const T = amag * m * 1000,
      mdot = T / ve;
    if (samples.length === 0 || t - samples[samples.length - 1].t >= 0.999)
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T,
        thrDir: dir,
        alt,
        phase: mode,
        D: [0, 0, 0],
      });
    if (alt <= 0.0005 && t > opt.t0 + 5) {
      landed = true;
      break;
    }
    if (m - mdot * dt < opt.dryLimit) {
      events.push({
        t,
        name: "Propellant depleted",
        desc: "Descent propellant exhausted before touchdown.",
        kind: "fail",
      });
      break;
    }
    // integrate (semi-implicit RK2)
    const a1 = vadd(g, vscale(dir, amag));
    const rm = vaddScaled(r, v, dt / 2),
      vm = vaddScaled(v, a1, dt / 2);
    const rmn = vnorm(rm),
      gm = vscale(rm, -mu / (rmn * rmn * rmn));
    const a2 = vadd(gm, vscale(dir, (amag * m) / (m - (mdot * dt) / 2)));
    r = vaddScaled(r, vm, dt);
    v = vaddScaled(v, a2, dt);
    m -= mdot * dt;
    propUsed += mdot * dt;
    t += dt;
  }
  const ll = subPointLL(body, r, t);
  const miss = vnorm(vsub(r, site(t))) - 0;
  events.push({
    t,
    name: landed ? "Touchdown" : "Descent ended",
    desc: landed
      ? `Touchdown at ${ll[0].toFixed(3)}°, ${ll[1].toFixed(3)}° — ${miss.toFixed(2)} km from the planned site.`
      : "Descent did not complete.",
    kind: "touchdown",
  });
  samples.push({
    t,
    r: vcopy(r),
    v: vcopy(v),
    m,
    T: 0,
    thrDir: vunit(r),
    alt: 0,
    phase: "landed",
    D: [0, 0, 0],
  });
  return { landed, t, r, v, m, propUsed, samples, events, miss, saturated, ll };
}

// ---------------------------------------------------------------------------
// ATMOSPHERIC ENTRY.  opt: body, t0, r0, v0 (body-centred ECL), m0, diam, cd, LD, rn, bank (deg),
// skip (bool), chutes ('apollo'|'orion'|'probe'|'none'), edl (Mars descent config), siteElev, landing {Tmax, isp...}
// ---------------------------------------------------------------------------
function simulateEntry(opt) {
  // a sky crane lands its rover with the descent stage hanging above it: the stage, whose path this is, stops edl.hang up
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body),
    elev = (opt.siteElev || 0) + ((opt.edl && opt.edl.hang) || 0) / 1000;
  const omega = bodyOmegaEcl(body, opt.t0);
  const kSG = body === "earth" ? 1.7415e-4 : 1.9027e-4;
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0),
    m = opt.m0;
  const A0 = Math.PI * (opt.diam / 2) ** 2;
  let CdA = opt.cd * A0,
    LD = opt.LD || 0,
    bank = (opt.bank ?? 0) * DEG;
  const samples = [],
    events = [];
  let phase = "entry",
    maxG = 0,
    maxHeat = 0,
    maxQ = 0,
    tPeakG = t,
    tPeakHeat = t,
    skipPhase = opt.skip ? 1 : 0,
    dt = 0.25;
  let blackout = false,
    chuteState = 0,
    tChute = 0,
    landed = false,
    thrust = 0,
    thrDir = null,
    propUsed = 0;
  const edl = opt.edl || null,
    land = opt.land || null;
  let poweredT0 = 0,
    powered = false,
    sky = false,
    divertDir = null;
  const sky0 = edl && edl.skycrane ? (edl.skyAlt + 10 - edl.hang) / 1000 : null; // a sky crane is down to its last 0.75 m/s by the time it lets the rover down
  const evt = (name, desc, kind) =>
    events.push({ t, name, desc, kind, r: vcopy(r), v: vcopy(v), m }); // (where it happened: the parts let go there)
  // propulsive landing (Starship): a retro-burn against the airflow at full thrust, lit as late as it can be — once a burn
  // begun now would only just bring the speed down to vHover a few hundred metres above the site — then the hover-down
  // guidance below. The fixed light-up altitude is the latest it may wait (thin Martian air cannot slow the ship enough).
  const PL = opt.propulsiveLanding,
    vHover = PL ? (PL.vHover ?? 0.06) : 0;
  let retro = false,
    nextCheck = -Infinity;
  const retroEndAlt = (r0, v0, m0) => {
    // km above the site where a full-thrust retro-burn from this state is down to vHover (−1: it hits first)
    let rr = vcopy(r0),
      vv = vcopy(v0),
      mm = m0;
    for (let k = 0; k < 2400; k++) {
      const n = vnorm(rr),
        a = n - R - elev;
      if (a <= 0) return -1;
      const vr_ = vsub(vv, vcross(omega, rr)),
        sp = vnorm(vr_);
      if (sp < vHover) return a;
      const D =
        0.5 *
        atmosOf(body, n - R).rho *
        (sp * 1000) ** 2 *
        (PL.bellyCdA || CdA);
      vv = vaddScaled(
        vv,
        vadd(
          vscale(rr, -mu / (n * n * n)),
          vscale(vr_, -(land.Tmax + D) / mm / 1000 / sp),
        ),
        0.5,
      );
      rr = vaddScaled(rr, vv, 0.5);
      mm = Math.max(mm - (land.Tmax / (land.isp * G0)) * 0.5, m0 * 0.3);
    }
    return 0;
  };
  for (let step = 0; step < 200000; step++) {
    const rn = vnorm(r),
      up = vunit(r),
      alt = rn - R - elev;
    const atm = atmosOf(body, rn - R);
    const vrel = vsub(v, vcross(omega, r)),
      vrn = vnorm(vrel);
    const vms = vrn * 1000,
      q = 0.5 * atm.rho * vms * vms,
      mach = vms / (atm.a || 250);
    // --- phase logic
    if (skipPhase === 1 && vdot(vrel, up) > 0 && alt > 50) {
      skipPhase = 2;
      evt(
        "Skip-out",
        "The capsule bounces off the upper atmosphere, coasting for minutes before the final entry — spreading the heat load and extending range.",
        "skip",
      );
    }
    if (skipPhase === 2 && vdot(vrel, up) < 0 && alt < 100) {
      skipPhase = 3;
      evt(
        "Second entry",
        "The returner dives back in for its final, lower-speed entry.",
        "entry2",
      );
    }
    let bankNow = bank;
    if (skipPhase === 1) bankNow = 0;
    if (skipPhase >= 2) bankNow = (opt.bank2 ?? 60) * DEG;
    if (opt.chutes && opt.chutes !== "none" && body === "earth") {
      const drogueAlt =
        opt.chutes === "apollo" ? 7.3 : opt.chutes === "orion" ? 7.6 : 10.0;
      const mainAlt =
        opt.chutes === "apollo" ? 3.0 : opt.chutes === "orion" ? 2.9 : 5.0;
      if (chuteState === 0 && alt < drogueAlt && vrn < 0.4) {
        chuteState = 1;
        tChute = t;
        evt(
          opt.chutes === "probe" ? "Parachute deploy" : "Drogue parachutes",
          opt.chutes === "probe"
            ? "Main parachute opens."
            : "Drogue chutes stabilise and slow the capsule to ~80 m/s.",
          "chute",
        );
      }
      if (chuteState === 1 && alt < mainAlt && opt.chutes !== "probe") {
        chuteState = 2;
        tChute = t;
        evt(
          "Main parachutes",
          "Main chutes open — descent rate falls to ~8 m/s for splashdown.",
          "chute",
        );
      }
    }
    if (edl && body === "mars") {
      // a trim wing (Tianwen-1) swings out shortly before the parachute: the capsule stops flying at the angle its offset
      // centre of mass gave it for lift and turns into the airflow, ready for the parachute (the moment is approximate)
      if (
        edl.trimWing &&
        !opt._trim &&
        chuteState === 0 &&
        mach < edl.chute.mach * 1.5 &&
        alt > 3
      ) {
        opt._trim = true;
        evt(
          "Trim wing deploys",
          "A flap on the side of the backshell swings out into the airflow. It shifts the capsule’s trim from the tilted attitude it has flown at for lift to one nearly head-on into the wind, ready for the parachute.",
          "trim",
        );
      }
      if (chuteState === 0 && mach < edl.chute.mach && alt > 3) {
        chuteState = 1;
        tChute = t;
        evt(
          "Supersonic parachute",
          `${edl.chute.diam} m parachute deploys at Mach ${mach.toFixed(1)}.`,
          "chute",
        );
      }
      if (chuteState === 1 && !opt._hsSep && mach < edl.heatshieldSepMach) {
        opt._hsSep = true;
        m -= opt.heatshieldMass || 0;
        evt(
          "Heat shield separation",
          "The heat shield drops away; radar and cameras see the ground (terrain-relative navigation).",
          "jettison",
        );
      }
      if (chuteState === 1 && alt < edl.backshellSepAlt) {
        chuteState = 3;
        m -= opt.backshellMass || 0;
        powered = true;
        poweredT0 = t;
        evt(
          "Backshell separation · powered descent",
          "The descent stage drops free of the backshell and parachute and lights its engines.",
          "powered",
        );
        if (edl.divert) {
          const h0 = vsub(vrel, vscale(up, vdot(vrel, up)));
          divertDir = vunit(vcross(up, vnorm(h0) > 1e-6 ? h0 : vperp(up)));
        } // to the side of the track the parachute drifts along
      }
    }
    if (PL && land && !powered) {
      let go = alt < PL.ignAlt;
      if (!go && alt < 90 && vdot(vrel, up) < 0 && t >= nextCheck) {
        nextCheck = t + 1;
        go = retroEndAlt(r, v, m) < (PL.stopAlt ?? 0.6);
      }
      if (go) {
        powered = true;
        poweredT0 = t;
        retro = vrn > 2.5 * vHover;
        evt(
          "Landing burn",
          retro
            ? `Engines relight ${alt.toFixed(1)} km up at ${vms.toFixed(0)} m/s: the ship turns tail-first into its direction of travel and brakes against the airflow at full thrust (supersonic retropropulsion).`
            : "Engines relight; the vehicle flips upright and decelerates for touchdown.",
          "powered",
        );
      }
    }
    // chute drag area
    let CdAnow = CdA;
    if (chuteState === 1) {
      const inf = clamp((t - tChute) / 3, 0, 1);
      if (body === "earth")
        CdAnow =
          CdA +
          inf *
            (opt.chutes === "probe" ? 180 : opt.chutes === "orion" ? 60 : 28);
      else
        CdAnow = CdA + inf * Math.PI * (edl.chute.diam / 2) ** 2 * edl.chute.cd;
    } else if (chuteState === 2) {
      const inf = clamp((t - tChute) / 5, 0, 1);
      CdAnow = CdA + 28 + inf * (opt.chutes === "orion" ? 1900 : 1200);
    } else if (chuteState === 3) CdAnow = 0.8 * Math.PI * 1.5 * 1.5;
    if (opt.propulsiveLanding && chuteState === 0)
      CdAnow = opt.propulsiveLanding.bellyCdA || CdA;
    // --- forces (closure so RK4 re-evaluates aero at intermediate states)
    const bankUse = bankNow,
      cdaUse = CdAnow,
      liftOn = LD > 0 && chuteState === 0 && !powered;
    const aeroAt = (rr, vv) => {
      const rr_n = vnorm(rr),
        at = atmosOf(body, rr_n - R);
      const vr_ = vsub(vv, vcross(omega, rr)),
        vrn_ = vnorm(vr_);
      if (vrn_ < 1e-9 || at.rho <= 0) return [0, 0, 0];
      const qq = 0.5 * at.rho * (vrn_ * 1000) ** 2,
        DD = qq * cdaUse;
      const vh = vscale(vr_, 1 / vrn_);
      let aa = vscale(vh, -DD / m / 1000);
      if (liftOn) {
        const u = vscale(rr, 1 / rr_n);
        let lu = vsub(u, vscale(vh, vdot(u, vh)));
        const lun = vnorm(lu);
        if (lun > 1e-9) {
          lu = vscale(lu, 1 / lun);
          const side = vcross(vh, lu);
          const ldir = vadd(
            vscale(lu, Math.cos(bankUse)),
            vscale(side, Math.sin(bankUse)),
          );
          aa = vadd(aa, vscale(ldir, (LD * DD) / m / 1000));
        }
      }
      return aa;
    };
    const aAero = aeroAt(r, v);
    const g = vscale(r, -mu / (rn * rn * rn));
    let aT = [0, 0, 0];
    thrust = 0;
    if (powered && land && retro && vrn < vHover) {
      retro = false;
      evt(
        "Landing flip",
        "Down to hover speed: the ship swings upright on its engines for the vertical descent to touchdown.",
        "powered",
      );
    }
    if (powered && land && retro) {
      thrDir = vscale(vrel, -1 / vrn);
      aT = vscale(thrDir, land.Tmax / m / 1000);
      thrust = land.Tmax;
    } else if (powered && land) {
      const vr = vdot(vrel, up),
        hz = vsub(vrel, vscale(up, vr));
      // braking at a steady 1.8 m/s² toward 20 m up, the last 60 m at 0.75 m/s; a sky crane brakes toward its last 0.75 m/s
      const vdesTarget =
        alt > (sky0 ?? 0.06)
          ? -Math.max(
              sky0 != null ? 0.00075 : 0.002,
              Math.min(
                0.09,
                Math.sqrt(2 * 0.0018 * Math.max(alt - (sky0 ?? 0.02), 0)),
              ),
            )
          : -0.00075;
      const gmag = mu / (rn * rn);
      // a sky crane follows its braking curve closely, to be at 0.75 m/s in time: the deceleration the curve asks for at the
      // speed it is falling, fed forward (1.8 m/s² when it falls as fast as the curve; nothing when it hovers)
      const ff =
        sky0 != null && alt > sky0
          ? Math.min(
              0.0036,
              (0.0018 * Math.max(0, -vr)) / Math.max(-vdesTarget, 0.001),
            )
          : 0;
      const aUp = Math.max(0.1 * gmag, gmag + ff + (vdesTarget - vr) / 2.0); // engines push, never pull: falling slower than planned means minimum throttle, not thrust toward the ground
      // horizontal speed nulled; a sky crane first flies clear of the backshell and its parachute (edl.divert: m/s, for s)
      const aHz =
        divertDir && t - poweredT0 < edl.divert[1]
          ? vscale(vsub(vscale(divertDir, edl.divert[0] / 1000), hz), 1 / 3.0)
          : vscale(hz, -1 / 3.0);
      let ac = vadd(vscale(up, aUp), aHz);
      ac = vsub(ac, aAero);
      let am = vnorm(ac);
      const amax = land.Tmax / m / 1000;
      if (am > amax) {
        am = amax;
      }
      if (am < (land.minThr || 0.05) * amax) am = (land.minThr || 0.05) * amax;
      thrDir = vunit(ac);
      aT = vscale(thrDir, am);
      thrust = am * m * 1000;
      if (edl && edl.skycrane && !sky && alt < (edl.skyAlt - edl.hang) / 1000) {
        sky = true;
        evt(
          "Sky crane",
          `${edl.skyAlt} m up, the descent stage lets the rover down on ${edl.bridle} m bridles, still descending at 0.75 m/s.`,
          "skycrane",
        );
      }
    }
    const aProper = (vnorm(vadd(aAero, aT)) * 1000) / G0;
    const heat =
      (kSG * Math.sqrt(atm.rho / (opt.rn || 1)) * Math.pow(vms, 3)) / 1e4; // W/cm^2
    if (aProper > maxG) {
      maxG = aProper;
      tPeakG = t;
    }
    if (heat > maxHeat) {
      maxHeat = heat;
      tPeakHeat = t;
    }
    if (q > maxQ) maxQ = q;
    const bo =
      body === "earth"
        ? vrn > 6.5 && alt < 95 && alt > 38
        : vrn > 3.5 && alt < 75 && alt > 25;
    if (bo && !blackout) {
      blackout = true;
      evt(
        body === "earth" ? "Plasma blackout begins" : "Plasma sheath",
        "Ionised gas around the vehicle blocks radio signals.",
        "blackout",
      );
    }
    if (!bo && blackout) {
      blackout = false;
      evt(
        body === "earth" ? "Blackout ends" : "Plasma sheath clears",
        "Radio contact is restored.",
        "blackout",
      );
    }
    if (samples.length === 0 || t - samples[samples.length - 1].t >= 0.999)
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: thrust,
        thrDir: thrDir ? vcopy(thrDir) : null,
        D: vscale(aAero, m * 1000),
        alt,
        q,
        mach,
        heat,
        gload: aProper,
        phase:
          skipPhase === 2
            ? "skip coast"
            : powered
              ? "powered descent"
              : chuteState
                ? "parachute"
                : "entry",
        chute: chuteState,
        blackout: bo,
        bank: bankNow * RAD,
      });
    if (alt <= 0) {
      landed = true;
      break;
    }
    if (t - opt.t0 > (opt.maxTime || 4000)) break;
    // integrate RK4 (thrust held)
    const h = alt < 15 ? 0.1 : alt > 130 ? 2.0 : dt;
    const acc = (rr, vv) => {
      const n = vnorm(rr);
      return vadd(vadd(vscale(rr, -mu / (n * n * n)), aeroAt(rr, vv)), aT);
    };
    const k1v = acc(r, v),
      k1r = v;
    const k2r = vaddScaled(v, k1v, h / 2),
      k2v = acc(vaddScaled(r, k1r, h / 2), k2r);
    const k3r = vaddScaled(v, k2v, h / 2),
      k3v = acc(vaddScaled(r, k2r, h / 2), k3r);
    const k4r = vaddScaled(v, k3v, h),
      k4v = acc(vaddScaled(r, k3r, h), k4r);
    r = vadd(
      r,
      vscale(vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)), h / 6),
    );
    v = vadd(
      v,
      vscale(vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)), h / 6),
    );
    if (thrust > 0 && land) {
      const dm = (thrust / (land.isp * G0)) * h;
      m -= dm;
      propUsed += dm;
    }
    t += h;
  }
  const ll = subPointLL(body, r, t),
    vTD = vnorm(vsub(v, vcross(omega, r))) * 1000; // m/s at the ground
  if (PL && vTD > 30) landed = false; // a propulsive landing that reaches the ground fast has crashed
  return {
    landed,
    t,
    r,
    v,
    m,
    samples,
    events,
    maxG,
    maxHeat,
    maxQ,
    tPeakG,
    tPeakHeat,
    ll,
    propUsed,
    vTD,
  };
}
// great-circle angular distance between lat/lon (deg) → rad
function gcAngle(lat1, lon1, lat2, lon2) {
  const a = llToBF(lat1, lon1),
    b = llToBF(lat2, lon2);
  return vangle(a, b);
}
// ---------------------------------------------------------------------------
// Two-burn ascent for short, high-thrust vehicles (e.g. Mars Ascent Vehicle):
// gravity turn until apoapsis = target, coast to apoapsis, circularise.
// ---------------------------------------------------------------------------
function simulateTwoBurnAscent(opt) {
  const body = opt.body,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const run = (kickDeg, record) => {
    const st = { ...opt.stack.stages[0] };
    let prop = st.propMass;
    const mass = () => st.dry + prop + (opt.stack.payload || 0);
    const t0 = opt.t0,
      Rb = R + (opt.siteElev || 0),
      omega = bodyOmegaEcl(body, t0);
    let r = vscale(vunit(sitePosEcl(body, opt.lat, opt.lon, 0, t0)), Rb),
      v = vcross(omega, r),
      t = t0;
    const lf0 = localFrame(body, r, t0),
      nT = vunit(opt.target.normal);
    let dIn = vunit(
      vsub(
        vcross(nT, lf0.up),
        vscale(lf0.up, vdot(vcross(nT, lf0.up), lf0.up)),
      ),
    );
    const azI = Math.atan2(vdot(dIn, lf0.east), vdot(dIn, lf0.north));
    const vOrb = Math.sqrt(mu / (R + opt.target.hp)),
      vEq = vdot(v, lf0.east);
    const azR = Math.atan2(vOrb * Math.sin(azI) - vEq, vOrb * Math.cos(azI));
    const raT = R + opt.target.ha,
      rpT = R + opt.target.hp;
    const ve = st.ispVac * G0,
      mdot = st.thrustVac / ve,
      dt = 0.1;
    const samples = [];
    const events = [];
    let phase = "vertical",
      ok = false;
    const push = (T, dir) => {
      if (
        record &&
        (!samples.length || t - samples[samples.length - 1].t >= 0.999)
      )
        samples.push({
          t,
          r: vcopy(r),
          v: vcopy(v),
          m: mass(),
          T,
          thrDir: dir ? vcopy(dir) : null,
          alt: vnorm(r) - R,
          phase,
        });
    };
    const step = (dir, thrust) => {
      const acc = (rr, vv, mm) => {
        const n = vnorm(rr);
        let a = vscale(rr, -mu / (n * n * n));
        if (thrust) a = vadd(a, vscale(dir, st.thrustVac / mm / 1000));
        return a;
      };
      const m0 = mass(),
        m1 = thrust ? m0 - mdot * dt : m0;
      const k1v = acc(r, v, m0),
        k1r = v;
      const k2v = acc(
          vaddScaled(r, k1r, dt / 2),
          vaddScaled(v, k1v, dt / 2),
          (m0 + m1) / 2,
        ),
        k2r = vaddScaled(v, k1v, dt / 2);
      const k3v = acc(
          vaddScaled(r, k2r, dt / 2),
          vaddScaled(v, k2v, dt / 2),
          (m0 + m1) / 2,
        ),
        k3r = vaddScaled(v, k2v, dt / 2);
      const k4v = acc(vaddScaled(r, k3r, dt), vaddScaled(v, k3v, dt), m1),
        k4r = vaddScaled(v, k3v, dt);
      r = vadd(
        r,
        vscale(
          vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)),
          dt / 6,
        ),
      );
      v = vadd(
        v,
        vscale(
          vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)),
          dt / 6,
        ),
      );
      if (thrust) prop -= mdot * dt;
      t += dt;
    };
    // burn 1
    for (let i = 0; i < 20000 && prop > 0; i++) {
      const lf = localFrame(body, r, t),
        tf = t - t0;
      const vrel = vsub(v, vcross(omega, r));
      let dir;
      const az = vadd(
        vscale(lf.north, Math.cos(azR)),
        vscale(lf.east, Math.sin(azR)),
      );
      if (tf < (opt.vert ?? 3)) {
        dir = lf.up;
        phase = "vertical";
      } else if (tf < (opt.vert ?? 3) + 4) {
        const k = (kickDeg * DEG * (tf - (opt.vert ?? 3))) / 4;
        dir = vunit(vadd(vscale(lf.up, Math.cos(k)), vscale(az, Math.sin(k))));
        phase = "pitchover";
      } else {
        const g = Math.asin(clamp(vdot(vunit(vrel), lf.up), -1, 1));
        dir = vunit(vadd(vscale(lf.up, Math.sin(g)), vscale(az, Math.cos(g))));
        phase = "gravity turn";
      }
      push(st.thrustVac, dir);
      const el = rv2coe(r, v, mu);
      if (el.e < 1 && el.ra >= raT) break;
      step(dir, true);
      if (vnorm(r) < Rb - 0.05) return { ok: false, prop, samples, events };
    }
    events.push({
      t,
      name: "First burn cutoff",
      desc: "Apoapsis now at the target altitude; coasting up.",
      kind: "staging",
    });
    // coast to apoapsis
    phase = "coast to apoapsis";
    const dtA =
      timeToPeri(r, v, mu) +
      Math.PI * Math.sqrt(Math.pow(rv2coe(r, v, mu).a, 3) / mu);
    let dtc = dtA;
    if (dtc < 0)
      dtc += 2 * Math.PI * Math.sqrt(Math.pow(rv2coe(r, v, mu).a, 3) / mu);
    const tc0 = t,
      rc0 = r,
      vc0 = v;
    for (let tt = 0; tt < dtc; tt += 5) {
      const s = kepProp(rc0, vc0, tt, mu);
      r = s.r;
      v = s.v;
      t = tc0 + tt;
      push(0, null);
    }
    {
      const s = kepProp(rc0, vc0, dtc, mu);
      r = s.r;
      v = s.v;
      t = tc0 + dtc;
    }
    // burn 2: circularise (horizontal, in-plane)
    phase = "circularisation";
    events.push({
      t,
      name: "Circularisation burn",
      desc: "At apoapsis the second burn raises the periapsis out of the atmosphere.",
      kind: "ignition",
    });
    for (let i = 0; i < 20000 && prop > 0; i++) {
      const el = rv2coe(r, v, mu);
      if (el.rp >= rpT) {
        ok = true;
        break;
      }
      const hd = vunit(vcross(vunit(vcross(r, v)), vunit(r)));
      push(st.thrustVac, hd);
      step(hd, true);
    }
    const el = rv2coe(r, v, mu);
    if (el.rp >= rpT - 5) ok = true;
    events.push({
      t,
      name: ok ? "Orbit insertion" : "Insufficient performance",
      desc: ok
        ? `Orbit ${(el.rp - R).toFixed(0)} × ${(el.ra - R).toFixed(0)} km.`
        : "Propellant exhausted before reaching orbit.",
      kind: ok ? "insertion" : "fail",
    });
    return {
      ok,
      prop,
      samples,
      events,
      t,
      r,
      v,
      m: mass(),
      hpAch: el.rp - R,
      haAch: el.ra - R,
      el,
    };
  };
  let best = null;
  for (let k = 5; k <= 80; k += 5) {
    const o = run(k, false);
    const sc = (o.ok ? 1e4 : 0) + o.prop;
    if (!best || sc > best.sc) best = { k, sc };
  }
  const g = goldenMin(
    (k) => {
      const o = run(k, false);
      return -((o.ok ? 1e4 : 0) + o.prop);
    },
    Math.max(1, best.k - 5),
    Math.min(85, best.k + 5),
    14,
  );
  const res = run(g.x, true);
  res.kick = g.x;
  res.stack = { stages: [{ propLeft: res.prop }] };
  return res;
}

// ---------------------------------------------------------------------------
// WINGED ENTRY (Space Shuttle orbiter), from entry interface to terminal area energy management (TAEM, about
// Mach 2.5 at 25 km). The angle of attack follows the flight schedule: 40° until about Mach 13, easing to about 14°
// at TAEM. The bank angle is the guidance. Its size sets how quickly the orbiter sinks into denser air (more bank,
// less vertical lift, more drag), re-planned every few seconds by predicting the range still to fly. Its sign steers
// toward the runway and flips, in a roll reversal, whenever the heading error grows past a deadband.
// opt: t0, r0, v0 (Earth-centred ECL), m0, S (m²), rn (m), target {lat, lon, elev}, rTaem (km before the target),
//      vTaem (km/s), blackout (bool), maxTime
// ---------------------------------------------------------------------------
function shuttleAlpha(vRel) {
  // deg, from the Earth-relative speed (km/s)
  if (vRel >= 4.2) return 40;
  if (vRel <= 0.76) return 14;
  if (vRel >= 1.4) return 22 + (18 * (vRel - 1.4)) / 2.8;
  return 14 + (8 * (vRel - 0.76)) / 0.64;
}
const SHUTTLE_AERO = [
  [14, 0.48, 0.25],
  [22, 0.62, 0.4],
  [30, 0.78, 0.62],
  [40, 0.84, 0.84],
  [45, 0.86, 1.0],
]; // alpha°, CL, CD (hypersonic, S = 249.9 m²)
function shuttleAero(alphaDeg) {
  const T = SHUTTLE_AERO;
  if (alphaDeg <= T[0][0]) return { CL: T[0][1], CD: T[0][2] };
  for (let i = 0; i < T.length - 1; i++)
    if (alphaDeg <= T[i + 1][0]) {
      const f = (alphaDeg - T[i][0]) / (T[i + 1][0] - T[i][0]);
      return {
        CL: T[i][1] + f * (T[i + 1][1] - T[i][1]),
        CD: T[i][2] + f * (T[i + 1][2] - T[i][2]),
      };
    }
  const L = T[T.length - 1];
  return { CL: L[1], CD: L[2] };
}
function simulateWingedEntry(opt) {
  const mu = BODIES.earth.mu,
    R = BODIES.earth.R,
    kSG = 1.7415e-4,
    S = opt.S || 249.9,
    rn = opt.rn || 1.0;
  const omega = bodyOmegaEcl("earth", opt.t0),
    m = opt.m0;
  const vTaem = opt.vTaem ?? 0.76,
    rTaem = opt.rTaem ?? 96;
  const tgt = opt.target,
    tgtAt = (tt) => vunit(sitePosEcl("earth", tgt.lat, tgt.lon, 0, tt));
  // aerodynamic acceleration (km/s²) for a state and a bank angle (rad, + = lift to the right)
  const aero = (rr, vv, bank, planar) => {
    const rnorm = vnorm(rr),
      h = rnorm - R,
      at = earthAtmos(h);
    const vr = vsub(vv, vcross(omega, rr)),
      vrn = vnorm(vr);
    if (vrn < 1e-9 || at.rho <= 0)
      return { a: [0, 0, 0], q: 0, mach: 0, rho: 0, vrn, alpha: 40, D: 0 };
    const vms = vrn * 1000,
      q = 0.5 * at.rho * vms * vms,
      alpha = shuttleAlpha(vrn),
      co = shuttleAero(alpha);
    const D = (q * co.CD * S) / m / 1000,
      Lf = (q * co.CL * S) / m / 1000;
    const vh = vscale(vr, 1 / vrn);
    let up = vsub(vscale(rr, 1 / rnorm), vscale(vh, vdot(rr, vh) / rnorm));
    up = vunit(up);
    const side = vcross(vh, up),
      ld = planar
        ? vscale(up, Math.cos(bank))
        : vadd(vscale(up, Math.cos(bank)), vscale(side, Math.sin(bank)));
    return {
      a: vadd(vscale(vh, -D), vscale(ld, Lf)),
      q,
      mach: vms / (at.a || 300),
      rho: at.rho,
      vrn,
      alpha,
      D: D * 1000,
    };
  };
  const grav = (rr) => {
    const n = vnorm(rr);
    return vscale(rr, -mu / (n * n * n));
  };
  const rk4 = (rr, vv, bank, h, planar) => {
    const acc = (r_, v_) => vadd(grav(r_), aero(r_, v_, bank, planar).a);
    const k1v = acc(rr, vv),
      k1r = vv;
    const k2r = vaddScaled(vv, k1v, h / 2),
      k2v = acc(vaddScaled(rr, k1r, h / 2), k2r);
    const k3r = vaddScaled(vv, k2v, h / 2),
      k3v = acc(vaddScaled(rr, k2r, h / 2), k3r);
    const k4r = vaddScaled(vv, k3v, h),
      k4v = acc(vaddScaled(rr, k3r, h), k4r);
    return {
      r: vadd(
        rr,
        vscale(
          vadd(vadd(k1r, vscale(k2r, 2)), vadd(vscale(k3r, 2), k4r)),
          h / 6,
        ),
      ),
      v: vadd(
        vv,
        vscale(
          vadd(vadd(k1v, vscale(k2v, 2)), vadd(vscale(k3v, 2), k4v)),
          h / 6,
        ),
      ),
    };
  };
  // fly a constant bank to TAEM speed, with the lift kept in the vertical plane (the range predictor: the bank sign
  // only steers, it is left out); return the final point and time
  // the bank is assumed to taper linearly with speed from its current value to 35° at TAEM, as entry bank angles do;
  // planning on a lighter bank late keeps steering margin for the end of the entry
  const predict = (rr, vv, tt, bank) => {
    let r = rr,
      v = vv,
      t = tt;
    const v0 = vnorm(vsub(vv, vcross(omega, rr))),
      bEnd = Math.sign(bank || 1) * 35 * DEG;
    for (let k = 0; k < 2500; k++) {
      const s = aero(r, v, 0, true);
      const h = vnorm(r) - R;
      if (s.vrn <= vTaem || h < 12) break;
      const w = clamp((s.vrn - vTaem) / Math.max(v0 - vTaem, 1e-6), 0, 1),
        bk = bEnd + (bank - bEnd) * w;
      const dt = h > 100 ? 8 : 3;
      const nx = rk4(r, v, bk, dt, true);
      r = nx.r;
      v = nx.v;
      t += dt;
    }
    return { r, t };
  };
  // range error of a prediction: distance flown minus the distance still to go to the TAEM point (+ = too far)
  const rangeErr = (rNow, pr) =>
    vangle(rNow, pr.r) * R - (vangle(rNow, tgtAt(pr.t)) * R - rTaem);
  const headingErr = (rr, vv, tt) => {
    // target bearing minus Earth-relative velocity azimuth (rad)
    const lf = localFrame("earth", rr, tt),
      vr = vsub(vv, vcross(omega, rr));
    const azV = Math.atan2(vdot(vr, lf.east), vdot(vr, lf.north));
    const uT = tgtAt(tt + (opt._tgo || 900)),
      d = vsub(uT, vscale(lf.up, vdot(uT, lf.up)));
    const azT = Math.atan2(vdot(d, lf.east), vdot(d, lf.north));
    return wrapPi(azT - azV);
  };
  let t = opt.t0,
    r = vcopy(opt.r0),
    v = vcopy(opt.v0);
  const samples = [],
    events = [];
  const evt = (name, desc, kind) => events.push({ t, name, desc, kind });
  let bank = 0,
    sigMag = 60 * DEG,
    sign = 0,
    banked = false,
    reversals = 0,
    nextGuid = t,
    blackout = false;
  let maxG = 0,
    maxHeat = 0,
    maxQ = 0,
    tPeakG = t,
    tPeakHeat = t,
    mach10 = false,
    lastErr = 0;
  for (let step = 0; step < 20000; step++) {
    const s = aero(r, v, bank),
      h = vnorm(r) - R;
    const heat =
      (kSG * Math.sqrt(s.rho / rn) * Math.pow(s.vrn * 1000, 3)) / 1e4;
    const g = (vnorm(s.a) * 1000) / G0;
    if (g > maxG) {
      maxG = g;
      tPeakG = t;
    }
    if (heat > maxHeat) {
      maxHeat = heat;
      tPeakHeat = t;
    }
    if (s.q > maxQ) maxQ = s.q;
    // guidance
    if (opt.fixedBank != null) {
      banked = true;
      sign = 1;
      sigMag = opt.fixedBank;
      nextGuid = Infinity;
    }
    const climbing =
      vdot(vsub(v, vcross(omega, r)), vunit(r)) > 0 &&
      h < 100 &&
      t - opt.t0 > 60;
    if (!banked && (s.D >= 0.8 || climbing || t - opt.t0 > 330)) {
      banked = true;
      sign = Math.sign(headingErr(r, v, t)) || 1;
      evt(
        "First roll",
        `With the air thick enough to steer by (drag ≈ ${fx1((s.D / G0) * 100)} % of g), the orbiter rolls about ${Math.round(sigMag * RAD)}° onto its ${sign > 0 ? "right" : "left"} side. Banking tilts the lift away from vertical: the orbiter sinks into denser air and brakes harder, and the bank angle becomes the steering wheel for the next 25 minutes.`,
        "roll",
      );
    }
    if (banked && t >= nextGuid && s.vrn < 1.3) {
      nextGuid = t + 4;
      sigMag = Math.min(sigMag, 50 * DEG);
      const he = headingErr(r, v, t);
      if (Math.abs(he) > 4 * DEG && Math.sign(he) !== sign) {
        sign = -sign;
        reversals++;
        evt(
          `Roll reversal ${reversals}`,
          "Below Mach 4 the orbiter banks toward the runway to line up for the approach.",
          "roll",
        );
      }
    }
    if (banked && t >= nextGuid) {
      nextGuid = t + (s.vrn > 3 ? 10 : 6);
      const f = (sg) => rangeErr(r, predict(r, v, t, sign * sg));
      let a = clamp(sigMag, 0, 80 * DEG),
        fa = f(a),
        b = clamp(a + (fa > 0 ? 6 : -6) * DEG, 0, 80 * DEG),
        fb = f(b);
      for (
        let k = 0;
        k < 4 && Math.abs(fb) > 2 && Math.abs(fb - fa) > 1e-6;
        k++
      ) {
        const c = clamp(b - (fb * (b - a)) / (fb - fa), 0, 80 * DEG);
        a = b;
        fa = fb;
        b = c;
        fb = f(b);
      }
      sigMag = b;
      lastErr = fb;
      const pr = predict(r, v, t, sign * sigMag);
      opt._tgo = pr.t - t;
      const he = headingErr(r, v, t),
        db = (s.vrn < 1.6 ? 4 : reversals === 0 ? 10.5 : 17.5) * DEG;
      if (Math.abs(he) > db && Math.sign(he) !== sign) {
        sign = -sign;
        reversals++;
        evt(
          `Roll reversal ${reversals}`,
          `The heading error to the runway reached ${Math.abs(he * RAD).toFixed(1)}°, so the orbiter rolls through wings-level to bank the other way. Each reversal swings the ground track back across the line to the runway; the Shuttle usually flew three or four.`,
          "roll",
        );
      }
    }
    const want = banked ? sign * sigMag : 0,
      rate = 8 * DEG; // roll rate in reversals
    // samples
    if (
      !opt.noSamples &&
      (!samples.length || t - samples[samples.length - 1].t >= 0.999)
    )
      samples.push({
        t,
        r: vcopy(r),
        v: vcopy(v),
        m,
        T: 0,
        thrDir: null,
        D: vscale(s.a, m * 1000),
        alt: h,
        q: s.q,
        mach: s.mach,
        heat,
        gload: g,
        phase: "entry",
        bank: bank * RAD,
        alpha: s.alpha,
        blackout: blackout || undefined,
      });
    if (!mach10 && s.mach < 10 && h < 60) {
      mach10 = true;
      evt(
        "Mach 10",
        `Speed ${fx1(s.vrn)} km/s at ${Math.round(h)} km. The angle of attack begins to ease from 40° toward 14° as the air thickens.`,
        "info",
      );
    }
    const bo = !!opt.blackout && h < 85 && h > 40 && s.vrn > 4.0;
    if (bo && !blackout) {
      blackout = true;
      evt(
        "Communications blackout",
        "Ionised air around the orbiter blocks radio contact with the ground. (From 1988 the TDRS relay satellites, reached through the top of the plasma sheath, all but ended the blackout.)",
        "blackout",
      );
    }
    if (!bo && blackout) {
      blackout = false;
      evt(
        "Blackout ends",
        "Radio contact with Mission Control is restored.",
        "blackout",
      );
    }
    if (s.vrn <= vTaem || h < 15 || t - opt.t0 > (opt.maxTime || 2600)) break;
    const dt = h > 100 ? 2 : opt.coarse ? 2 : 0.5;
    bank =
      opt.fixedBank != null
        ? opt.fixedBank
        : bank + clamp(want - bank, -rate * dt, rate * dt);
    const nx = rk4(r, v, bank, dt);
    r = nx.r;
    v = nx.v;
    t += dt;
  }
  return {
    t,
    r,
    v,
    m,
    samples,
    events,
    maxG,
    maxHeat,
    maxQ,
    tPeakG,
    tPeakHeat,
    reversals,
    rangeErr: lastErr,
  };
}
function fx1(x) {
  return (Math.round(x * 10) / 10).toFixed(1);
}

// ---- timeline.js
// ============================================================================
// timeline.js — mission container: objects, trajectory segments, events, budget
// Every segment returns body-relative state (ref body, ECL axes, km, km/s).
// ============================================================================
function bsearch(arr, t) {
  // last index i with arr[i] <= t
  let lo = 0,
    hi = arr.length - 1;
  if (t <= arr[0]) return 0;
  if (t >= arr[hi]) return hi;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (arr[m] <= t) lo = m;
    else hi = m;
  }
  return lo;
}
class SampleSeg {
  // samples: [{t, r, v, m, T, thrDir, D, ...extras}]
  constructor(ref, samples, meta = {}) {
    this.type = "samples";
    this.ref = ref;
    this.meta = meta;
    const n = samples.length;
    this.n = n;
    this.t = new Float64Array(n);
    this.r = new Float64Array(3 * n);
    this.v = new Float64Array(3 * n);
    this.m = new Float64Array(n);
    this.T = new Float64Array(n);
    this.dir = new Float64Array(3 * n);
    this.D = new Float64Array(3 * n);
    this.extra = [];
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      this.t[i] = s.t;
      for (let k = 0; k < 3; k++) {
        this.r[3 * i + k] = s.r[k];
        this.v[3 * i + k] = s.v[k];
        this.dir[3 * i + k] = s.thrDir ? s.thrDir[k] : 0;
        this.D[3 * i + k] = s.D ? s.D[k] : 0;
      }
      this.m[i] = s.m ?? meta.m ?? 0;
      this.T[i] = s.T || 0;
      const ex = {};
      for (const key of [
        "alt",
        "q",
        "mach",
        "heat",
        "gload",
        "phase",
        "chute",
        "blackout",
        "stage",
        "throttle",
        "bank",
        "alpha",
        "hdg",
      ])
        if (s[key] !== undefined) ex[key] = s[key];
      this.extra.push(ex);
    }
    this.t0 = this.t[0];
    this.t1 = this.t[n - 1];
  }
  stateAt(t) {
    const i = bsearch(this.t, t),
      j = Math.min(i + 1, this.n - 1);
    const out = { ref: this.ref, extra: this.extra[i] };
    if (i === j || this.t[j] === this.t[i]) {
      out.r = [this.r[3 * i], this.r[3 * i + 1], this.r[3 * i + 2]];
      out.v = [this.v[3 * i], this.v[3 * i + 1], this.v[3 * i + 2]];
      out.m = this.m[i];
      out.T = this.T[i];
      out.dir = [this.dir[3 * i], this.dir[3 * i + 1], this.dir[3 * i + 2]];
      out.D = [this.D[3 * i], this.D[3 * i + 1], this.D[3 * i + 2]];
      return out;
    }
    const h = this.t[j] - this.t[i],
      s = clamp((t - this.t[i]) / h, 0, 1);
    const p0 = [this.r[3 * i], this.r[3 * i + 1], this.r[3 * i + 2]],
      p1 = [this.r[3 * j], this.r[3 * j + 1], this.r[3 * j + 2]];
    const v0 = [this.v[3 * i], this.v[3 * i + 1], this.v[3 * i + 2]],
      v1 = [this.v[3 * j], this.v[3 * j + 1], this.v[3 * j + 2]];
    const hs = hermite(p0, v0, p1, v1, h, s);
    out.r = hs.r;
    out.v = hs.v;
    out.m = this.m[i] + (this.m[j] - this.m[i]) * s;
    out.T = this.T[i];
    out.dir = [this.dir[3 * i], this.dir[3 * i + 1], this.dir[3 * i + 2]];
    {
      const d1 = [this.dir[3 * j], this.dir[3 * j + 1], this.dir[3 * j + 2]]; // the attitude turns smoothly between samples (where both have one)
      if (vnorm(out.dir) > 0.5 && vnorm(d1) > 0.5 && vdot(out.dir, d1) > 0)
        out.dir = vunit(vlerp(out.dir, d1, s));
    }
    out.D = vlerp(
      [this.D[3 * i], this.D[3 * i + 1], this.D[3 * i + 2]],
      [this.D[3 * j], this.D[3 * j + 1], this.D[3 * j + 2]],
      s,
    );
    out.extra = s < 0.5 ? this.extra[i] : this.extra[j];
    return out;
  }
}
class ConicSeg {
  constructor(ref, t0, t1, r0, v0, m, meta = {}) {
    this.type = "conic";
    this.ref = ref;
    this.t0 = t0;
    this.t1 = t1;
    this.r0 = vcopy(r0);
    this.v0 = vcopy(v0);
    this.mu = BODIES[ref].mu;
    this.mconst = m;
    this.meta = meta;
  }
  stateAt(t) {
    const s = kepProp(this.r0, this.v0, t - this.t0, this.mu);
    return {
      ref: this.ref,
      r: s.r,
      v: s.v,
      m: this.mconst,
      T: 0,
      dir: [0, 0, 0],
      D: [0, 0, 0],
      extra: this.meta.extra || {},
    };
  }
}
// impulsive burn rendered as a finite burn: blends pre- and post-burn conics around tc
class BurnSeg {
  constructor(ref, tc, dur, r, vPre, vPost, m0, m1, thrust, meta = {}) {
    this.type = "burn";
    this.ref = ref;
    this.tc = tc;
    this.t0 = tc - dur / 2;
    this.t1 = tc + dur / 2;
    this.r = vcopy(r);
    this.vPre = vcopy(vPre);
    this.vPost = vcopy(vPost);
    this.mu = BODIES[ref].mu;
    this.m0 = m0;
    this.m1 = m1;
    this.thrust = thrust;
    this.meta = meta;
    this.dvDir = vunit(vsub(vPost, vPre));
  }
  stateAt(t) {
    const a = kepProp(this.r, this.vPre, t - this.tc, this.mu),
      b = kepProp(this.r, this.vPost, t - this.tc, this.mu);
    const w = smoothstep((t - this.t0) / Math.max(this.t1 - this.t0, 1e-6));
    const f = clamp((t - this.t0) / Math.max(this.t1 - this.t0, 1e-6), 0, 1);
    return {
      ref: this.ref,
      r: vlerp(a.r, b.r, w),
      v: vlerp(a.v, b.v, w),
      m: this.m0 + (this.m1 - this.m0) * f,
      T: this.thrust,
      dir: this.dvDir,
      D: [0, 0, 0],
      extra: this.meta.extra || {},
    };
  }
}
const SURF_LIFT = 0.002; // km: a craft standing on a surface is placed this far above the site's elevation
class SurfaceSeg {
  constructor(ref, t0, t1, lat, lon, elev, m, meta = {}) {
    this.type = "surface";
    this.ref = ref;
    this.t0 = t0;
    this.t1 = t1;
    this.lat = lat;
    this.lon = lon;
    this.elev = elev || 0;
    this.mconst = m;
    this.meta = meta;
  }
  stateAt(t) {
    const r = sitePosEcl(
      this.ref,
      this.lat,
      this.lon,
      this.elev + SURF_LIFT,
      t,
    );
    const m =
      this.m1 != null
        ? this.m0 +
          (this.m1 - this.m0) *
            clamp((t - this.t0) / Math.max(this.t1 - this.t0, 1e-9), 0, 1)
        : this.mconst;
    return {
      ref: this.ref,
      r,
      v: vcross(bodyOmegaEcl(this.ref, t), r),
      m,
      T: 0,
      dir: vunit(r),
      D: [0, 0, 0],
      extra: { phase: "on surface", alt: 0, ...(this.meta.extra || {}) },
      surface: true,
    };
  }
}
class MObject {
  constructor(id, name, opts = {}) {
    this.id = id;
    this.name = name;
    this.segs = [];
    this.configs = [];
    this.kind = opts.kind || "craft";
    this.color = opts.color || "#7fd1ff";
    this.model = opts.model || "generic";
    this.crew = opts.crew || 0;
    this.trail = opts.trail !== false;
    this.primary = !!opts.primary;
    this.labelPriority = opts.labelPriority || 1;
  }
  add(seg) {
    if (seg && seg.t1 > seg.t0 - 1e-9) this.segs.push(seg);
    return seg;
  }
  get t0() {
    return this.segs.length ? this.segs[0].t0 : Infinity;
  }
  get t1() {
    return this.segs.length ? this.segs[this.segs.length - 1].t1 : -Infinity;
  }
  setConfig(t, key, label) {
    this.configs.push({ t, key, label });
    this.configs.sort((a, b) => a.t - b.t);
  }
  configAt(t) {
    let c = this.configs[0];
    for (const x of this.configs)
      if (x.t <= t) c = x;
      else break;
    return c;
  }
  segIndex(t) {
    // the segment in effect at t (the last to start at or before it), or −1
    const s = this.segs;
    if (!s.length) return -1;
    if (t < s[0].t0 || t > s[s.length - 1].t1) return -1;
    let lo = 0,
      hi = s.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (s[m].t0 <= t) lo = m;
      else hi = m - 1;
    }
    return lo;
  }
  segAt(t) {
    const i = this.segIndex(t);
    return i < 0 ? null : this.segs[i];
  }
  stateAt(t) {
    const i = this.segIndex(t);
    if (i < 0) return null;
    const sg = this.segs[i],
      nx = this.segs[i + 1];
    if (t > sg.t1 && nx) return bridgeState(sg, nx, t);
    const st = sg.stateAt(Math.min(Math.max(t, sg.t0), sg.t1));
    st.seg = sg;
    return st;
  }
}
// A segment can end a moment before the next one starts: an integration sampled about once a second stops short of the
// engine cutoff, splashdown or wheel stop where the next segment begins. In between, the craft goes from the state the one
// ends with to the state the next starts with (positions and velocities matched at both ends) instead of holding still in
// space, where a turning planet would slide away under it. The gap is the end of the earlier segment: its engines, mass and
// phase. A landing ends on the ground itself, not at the height a standing craft is placed.
function bridgeState(a, b, t) {
  const A = a.stateAt(a.t1),
    B = b.stateAt(b.t0),
    h = b.t0 - a.t1;
  let rB = B.surface ? vscale(B.r, 1 - SURF_LIFT / vnorm(B.r)) : B.r,
    vB = B.v;
  if (B.ref !== A.ref) {
    const pa = planetHelio(A.ref, b.t0),
      pb = planetHelio(B.ref, b.t0);
    rB = vadd(rB, vsub(pb.r, pa.r));
    vB = vadd(vB, vsub(pb.v, pa.v));
  }
  const hs = hermite(A.r, A.v, rB, vB, h, clamp((t - a.t1) / h, 0, 1));
  A.r = hs.r;
  A.v = hs.v;
  A.seg = a;
  return A;
}
class Mission {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = cfg.name;
    this.objects = [];
    this.events = [];
    this.burns = [];
    this.phases = [];
    this.warnings = [];
    this.notes = [];
    this.t0 = isoToT(cfg.launch);
    this.tEnd = this.t0 + 3600;
    this.summary = {};
  }
  obj(id) {
    return this.objects.find((o) => o.id === id);
  }
  addObj(o) {
    this.objects.push(o);
    return o;
  }
  ev(t, objId, name, desc, kind = "info", extra = {}) {
    this.events.push({ t, obj: objId, name, desc, kind, ...extra });
  }
  phase(t0, t1, name, color) {
    this.phases.push({ t0, t1, name, color });
  }
  burn(b) {
    this.burns.push(b);
  }
  finalize() {
    this.events.sort((a, b) => a.t - b.t);
    for (const o of this.objects) o.segs.sort((a, b) => a.t0 - b.t0);
    let tEnd = this.t0;
    for (const o of this.objects)
      if (o.primary || o.kind === "craft") tEnd = Math.max(tEnd, o.t1);
    this.tEnd = Math.max(this.tEnd, tEnd);
    this.phases.sort((a, b) => a.t0 - b.t0);
  }
}
// rocket-equation helpers
const propForDv = (m0, dvKms, isp) =>
  m0 * (1 - Math.exp((-dvKms * 1000) / (isp * G0)));
const dvForProp = (m0, mp, isp) =>
  (isp * G0 * Math.log(m0 / Math.max(m0 - mp, 1e-9))) / 1000;
// convert integrator output (geocentric etc.) into samples
function integToSamples(res, extraFn, every = 0) {
  const out = [];
  let last = -Infinity;
  for (let i = 0; i < res.t.length; i++) {
    const t = res.t[i];
    if (every > 0 && t - last < every && i !== res.t.length - 1) continue;
    const y = res.y[i];
    const s = { t, r: [y[0], y[1], y[2]], v: [y[3], y[4], y[5]], m: y[6] };
    if (extraFn) Object.assign(s, extraFn(t, y, i));
    out.push(s);
    last = t;
  }
  return out;
}
// resample a SampleSeg-like set of samples from analytic propagation for display (conics are evaluated analytically anyway)

// ---- planner.js
// ============================================================================
// planner.js — shared mission-planning machinery
//   launch phase → ascent samples, staging debris, events
//   rocket-equation bookkeeping (Propulsion), Newton targeting solver
// ============================================================================
const EXPLAIN = {
  liftoff:
    "Engines reach full thrust; hold-down clamps release. Thrust must exceed weight (T/W > 1) — the rocket climbs slowly at first.",
  vertical:
    "The vehicle rises vertically to clear the tower, then begins a small pitch-over manoeuvre toward the launch azimuth.",
  gravityTurn:
    "Gravity turn: the rocket keeps its nose along the airflow and lets gravity bend the path toward horizontal, minimising aerodynamic load.",
  maxq: "Max-Q: dynamic pressure ½ρv² peaks — air density falls with altitude while speed climbs. Engines may throttle down here.",
  staging:
    "Staging: discarding empty tanks and engines keeps the mass ratio favourable (Tsiolkovsky rocket equation: Δv = Isp·g₀·ln(m₀/m₁)).",
  insertion:
    "Orbit insertion: horizontal speed ≈ 7.8 km/s. The vehicle is now in free fall around the Earth — astronauts feel weightless.",
  parking:
    "Parking orbit: a temporary low orbit used to check systems and wait for the correct point to start the departure burn.",
  tli: "Trans-Lunar Injection: a ~3.1 km/s burn near perigee raises the apogee to the Moon’s distance. Burning deep in Earth’s gravity well exploits the Oberth effect.",
  tmi: "Trans-Mars Injection: escape burn from the parking orbit onto a hyperbola whose excess velocity (v∞) puts the craft on a heliocentric transfer orbit to Mars.",
  coast:
    "Coasting: no engine thrust — the trajectory is shaped purely by gravity (Earth, Moon and Sun are all pulling).",
  soiMoon:
    "Entering the Moon’s sphere of influence (~66,000 km): lunar gravity now dominates over the Earth’s perturbation.",
  loi: "Lunar Orbit Insertion: a retrograde burn behind the Moon slows the craft so lunar gravity can capture it. Out of radio contact with Earth.",
  mcc: "Mid-course correction: a small burn trims the trajectory so the craft arrives at exactly the planned point.",
  pdi: "Powered descent: the lander fires its engine retrograde, braking from ~1.7 km/s orbital speed to a hover over the landing site.",
  surface:
    "On the surface. The local gravity is 1.62 m/s² (Moon) or 3.71 m/s² (Mars).",
  ascent:
    "Ascent: the ascent stage launches from the descent stage, which serves as a launch pad.",
  rendezvous:
    "Rendezvous: the lower, faster ascent vehicle catches up and docks with the orbiter (orbital mechanics: lower orbit = shorter period).",
  tei: "Trans-Earth Injection: a prograde burn leaves lunar orbit and starts the fall back toward Earth.",
  entry:
    "Atmospheric entry at ~11 km/s: kinetic energy is shed as heat in a shock layer of plasma (> 2,500 °C) around the heat shield.",
  splash: "Splashdown under parachutes at ~8 m/s.",
  freeReturn:
    "Free return: the trajectory is arranged so that lunar gravity bends the path back toward Earth with no engine burn required.",
  flyby:
    "Gravity assist / flyby: in the planet’s frame the craft enters and leaves at the same speed, but its direction is turned — in the Sun’s frame this adds or removes speed.",
  moi: "Mars Orbit Insertion: braking burn at periapsis of the arrival hyperbola so Mars can capture the craft.",
  edl: "Entry, descent & landing: from ~5–7 km/s to zero in about seven minutes — heat shield, supersonic parachute, then rocket-powered descent.",
  cruise:
    "Interplanetary cruise: the craft follows a heliocentric ellipse. The Sun’s gravity dominates; Earth and Mars are distant perturbations.",
};
function planeNormalFromAz(body, lat, lon, t, az) {
  const r = sitePosEcl(body, lat, lon, 0, t);
  const lf = localFrame(body, r, t);
  const d = vadd(
    vscale(lf.north, Math.cos(az * DEG)),
    vscale(lf.east, Math.sin(az * DEG)),
  );
  return vunit(vcross(lf.up, d));
}
// historical "flight azimuth" is measured in the Earth-fixed frame; convert to the inertial orbit plane
function planeNormalFromAzRel(body, lat, lon, t, azRel, vOrb = 7.8) {
  const r = sitePosEcl(body, lat, lon, 0, t),
    lf = localFrame(body, r, t);
  const vEq = vdot(vcross(bodyOmegaEcl(body, t), r), lf.east);
  const f = (azI) =>
    Math.atan2(vOrb * Math.sin(azI) - vEq, vOrb * Math.cos(azI)) - azRel * DEG;
  let azI = azRel * DEG;
  for (let k = 0; k < 30; k++) {
    const d = f(azI);
    azI -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return { n: planeNormalFromAz(body, lat, lon, t, azI * RAD), azI: azI * RAD };
}
// plane containing launch site at time t and a target direction; eastward-moving sense
function planeThroughSite(body, lat, lon, t, dir) {
  const s = vunit(sitePosEcl(body, lat, lon, 0, t));
  let n = vunit(vcross(s, dir));
  const lf = localFrame(body, s, t);
  const motion = vcross(n, s);
  if (vdot(motion, lf.east) < 0) n = vscale(n, -1);
  const az =
    Math.atan2(vdot(vcross(n, s), lf.east), vdot(vcross(n, s), lf.north)) * RAD;
  return { n, az };
}
// ------------- small linear algebra -------------
function solveLin(A, b) {
  // A: m x m array of arrays
  const m = b.length,
    M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-300) return null;
    for (let r = 0; r < m; r++)
      if (r !== c) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k];
      }
  }
  return M.map((row, i) => row[m] / row[i]);
}
// minimum-norm Newton (Gauss–Newton with backtracking). F: x -> residual array (length m <= n)
function newtonSolve(F, x0, opt = {}) {
  const n = x0.length,
    h = opt.h || 1e-5,
    tol = opt.tol || 1e-3,
    maxIt = opt.maxIt || 18;
  let x = x0.slice(),
    Fx = F(x),
    nf = Math.hypot(...Fx),
    it = 0;
  const hist = [nf];
  for (; it < maxIt && nf > tol; it++) {
    let accepted = false;
    // A finite-difference step small enough to be lost in the integrators' noise gives a Jacobian that points nowhere
    // useful (the outcome can then differ between JavaScript engines): when no step along it helps, retry with a larger one.
    for (const hh of [h, h * 30]) {
      const m = Fx.length,
        J = Array.from({ length: m }, () => new Array(n).fill(0));
      for (let j = 0; j < n; j++) {
        const xp = x.slice();
        xp[j] += hh;
        const Fp = F(xp);
        for (let i = 0; i < m; i++) J[i][j] = (Fp[i] - Fx[i]) / hh;
      }
      // dx = -J^T (J J^T + λI)^-1 F
      const JJt = Array.from({ length: m }, (_, i) =>
        Array.from(
          { length: m },
          (_, k) =>
            J[i].reduce((s, a, j) => s + a * J[k][j], 0) +
            (i === k ? opt.lambda || 0 : 0),
        ),
      );
      const y = solveLin(
        JJt,
        Fx.map((v) => -v),
      );
      if (!y) continue;
      let dx = new Array(n).fill(0);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < m; i++) dx[j] += J[i][j] * y[i];
      const maxStep = opt.maxStep || Infinity,
        dn = Math.hypot(...dx);
      if (dn > maxStep) dx = dx.map((v) => (v * maxStep) / dn);
      let lam = 1;
      for (let ls = 0; ls < 8; ls++) {
        const xn = x.map((v, j) => v + lam * dx[j]);
        const Fn = F(xn);
        const nn = Math.hypot(...Fn);
        if (isFinite(nn) && nn < nf) {
          x = xn;
          Fx = Fn;
          nf = nn;
          accepted = true;
          break;
        }
        lam *= 0.5;
      }
      if (accepted) break;
    }
    hist.push(nf);
    if (!accepted) break;
  }
  return { x, F: Fx, norm: nf, it, ok: nf <= (opt.okTol || tol * 10), hist };
}
// Nelder–Mead simplex minimiser (n-D); scales: initial step per dimension
function nelderMead(f, x0, scales, opt = {}) {
  const n = x0.length,
    maxIt = opt.maxIt || 120,
    tol = opt.tol || 1e-6;
  let P = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] += scales[i];
    P.push(x);
  }
  let Fv = P.map(f);
  for (let it = 0; it < maxIt; it++) {
    const idx = Fv.map((v, i) => i).sort((a, b) => Fv[a] - Fv[b]);
    P = idx.map((i) => P[i]);
    Fv = idx.map((i) => Fv[i]);
    if (Math.abs(Fv[n] - Fv[0]) < tol * (Math.abs(Fv[0]) + 1e-12)) break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += P[i][j] / n;
    const xr = c.map((v, j) => v + (v - P[n][j])),
      fr = f(xr);
    if (fr < Fv[0]) {
      const xe = c.map((v, j) => v + 2 * (v - P[n][j])),
        fe = f(xe);
      if (fe < fr) {
        P[n] = xe;
        Fv[n] = fe;
      } else {
        P[n] = xr;
        Fv[n] = fr;
      }
    } else if (fr < Fv[n - 1]) {
      P[n] = xr;
      Fv[n] = fr;
    } else {
      const xc = c.map((v, j) => v + 0.5 * (P[n][j] - v)),
        fc = f(xc);
      if (fc < Fv[n]) {
        P[n] = xc;
        Fv[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          P[i] = P[i].map((v, j) => P[0][j] + 0.5 * (v - P[0][j]));
          Fv[i] = f(P[i]);
        }
      }
    }
  }
  let bi = 0;
  for (let i = 1; i <= n; i++) if (Fv[i] < Fv[bi]) bi = i;
  return { x: P[bi], f: Fv[bi] };
}
// golden-section minimiser on [a,b]
function goldenMin(f, a, b, it = 40) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a),
    d = a + g * (b - a),
    fc = f(c),
    fd = f(d);
  for (let i = 0; i < it; i++) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return fc < fd ? { x: c, f: fc } : { x: d, f: fd };
}
function bisectRoot(f, a, b, it = 80) {
  let fa = f(a),
    fb = f(b);
  if (fa * fb > 0) return null;
  for (let i = 0; i < it; i++) {
    const m = 0.5 * (a + b),
      fm = f(m);
    if (fa * fm <= 0) {
      b = m;
      fb = fm;
    } else {
      a = m;
      fa = fm;
    }
  }
  return 0.5 * (a + b);
}

// ---------------------------------------------------------------------------
// Propulsion bookkeeping: tracks propellant of upper stage and spacecraft modules
// ---------------------------------------------------------------------------
class Propulsion {
  constructor(sc) {
    this.sc = sc;
    this.mods = {};
    for (const k in sc.modules)
      this.mods[k] = {
        ...sc.modules[k],
        propLeft: sc.modules[k].prop,
        attached: true,
      };
    this.upper = null;
  }
  attachUpper(stage, propLeft) {
    this.upper = { ...stage, propLeft, attached: true };
  }
  massOf(ids) {
    let m = 0;
    for (const id of ids) {
      const md = this.mods[id];
      if (md && md.attached) m += md.dry + md.propLeft;
    }
    return m;
  }
  // execute burn by `engine` ('upper' or module id) carrying mass mStack; returns {ok, prop, dur, dvAch}
  burn(engineId, mStack, dvKms) {
    const e =
      engineId === "upper"
        ? {
            thrust: this.upper.thrustVac,
            isp: this.upper.ispVac,
            prop: this.upper.prop,
            name: this.upper.engine,
          }
        : this.mods[engineId].engine;
    const tank = engineId === "upper" ? this.upper : this.mods[engineId];
    let need = propForDv(mStack, dvKms, e.isp),
      ok = true;
    if (need > tank.propLeft + 1e-6) {
      need = tank.propLeft;
      ok = false;
    }
    tank.propLeft -= need;
    const mdot = e.thrust / (e.isp * G0);
    return {
      ok,
      prop: need,
      dur: need / mdot,
      dvAch: dvForProp(mStack, need, e.isp),
      thrust: e.thrust,
      isp: e.isp,
      engine: e.name,
      propType: e.prop || (engineId === "upper" ? this.upper.prop : ""),
    };
  }
  engineOf(engineId) {
    if (engineId === "upper")
      return {
        thrust: this.upper.thrustVac,
        isp: this.upper.ispVac,
        name: this.upper.engine,
        prop: this.upper.prop,
      };
    return this.mods[engineId].engine;
  }
  tankOf(engineId) {
    return engineId === "upper" ? this.upper : this.mods[engineId];
  }
  dvLeft(engineId, mStack) {
    const t = this.tankOf(engineId);
    const e = this.engineOf(engineId);
    return dvForProp(mStack, t.propLeft, e.isp);
  }
}

// ---------------------------------------------------------------------------
// LAUNCH PHASE (shared).  Returns {ok, asc, ship}.  ship object gets ascent samples.
// ---------------------------------------------------------------------------
function launchPhase(M, cfg, L, scMass, normal, opts = {}) {
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0;
  const stack = buildAscentStack(L, scMass);
  const hp = cfg.parking?.hp ?? L.ascent.hp,
    ha = cfg.parking?.ha ?? L.ascent.ha;
  const hCut = cfg.parking?.hCut ?? L.ascent.hCut;
  const asc = optimizeAscent({
    body: "earth",
    t0,
    lat: S.lat,
    lon: S.lon,
    stack,
    target: { normal, hp, ha, hCut },
    vert: L.ascent.vert,
    kickGuess: L.ascent.kickGuess,
    fairingR: L.payloadFairing ? L.payloadFairing.r : 0,
    qMax: L.ascent.qMax || 33000,
    arefExtra: L.arefExtra || 0,
    gTgo: !!L.ascent.gTgo,
    sampleDt: 0.5,
  });
  const ship = opts.ship;
  ship.add(new SampleSeg("earth", asc.samples, { phase: "ascent" }));
  // configs per staging
  const nSt = L.stages.length;
  const cfgAt = (stFrom, boosters, fairing, les, sac) => ({
    key: "launch",
    stFrom,
    boosters,
    fairing,
    les,
    sac: sac ?? true,
    launcher: cfg.launcher,
    variant: cfg.lvVariant,
    orbiter: cfg.orbiterId,
  }); // (orbiter: which Shuttle orbiter rides the stack)
  ship.setConfig(t0 - 7200, "launch", cfgAt(0, true, true, true));
  let stFrom = 0,
    boosters = L.stages[0].parallel,
    fairing = !!L.payloadFairing,
    les = L.jettison.some((j) => j.part === "LES"),
    saj = L.jettison.some((j) => j.part === "SAJ"),
    ist = L.jettison.some((j) => j.part === "IST");
  const lit = liftoffStages(L),
    liq = lit.filter((s) => s.prop !== "solid"),
    sol = lit.filter((s) => s.prop === "solid");
  const IG = L.ign || { t: 3, ramp: 1.5 };
  const nm = engineCounts;
  if (IG.t > 0 && liq.length)
    M.ev(
      t0 - IG.t,
      "ship",
      "Ignition sequence start",
      `${nm(liq)} ignite on the pad${IG.seq ? " — " + IG.seq : ""}. Hold-down clamps keep the ${L.name} in place while the engines build up to full thrust and the computers check every engine; water floods the pad to soak up heat and sound.${sol.length ? ` The ${nm(sol)} solid boosters wait for T−0: once lit they cannot be shut down.` : ""}`,
      "launch",
      { ign: true },
    );
  M.ev(
    t0,
    "ship",
    "Liftoff",
    `${sol.length ? `${nm(sol)} ignite; ` : ""}${EXPLAIN.liftoff} Liftoff mass ${(stackMass(buildAscentStack(L, scMass)) / 1000).toFixed(0)} t, thrust ${(lit.reduce((a, s) => a + s.thrustSL, 0) / 1e6).toFixed(1)} MN.`,
    "launch",
  );
  M.ev(
    t0 + (L.ascent.vert || 10) + 2,
    "ship",
    "Pitch-over",
    EXPLAIN.vertical + ` Launch azimuth ${asc.azI.toFixed(1)}°.`,
    "ascent",
  );
  for (const e of asc.events) {
    let desc = e.desc;
    if (e.kind === "staging") {
      const idx = L.stages.findIndex((s) => s.id === e.stage);
      if (L.stages[idx].parallel) boosters = false;
      else stFrom = idx + 1;
      ship.setConfig(e.t, "launch", {
        ...cfgAt(stFrom, boosters, fairing, les),
        saj,
        ist,
      });
      desc += " " + EXPLAIN.staging;
      // debris object
      const st = ship.stateAt(e.t);
      if (st) {
        const deb = M.addObj(
          new MObject("debris-" + e.stage, L.stages[idx].name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(e.t, "stage", {
          key: "stage",
          launcher: cfg.launcher,
          stage: idx,
          variant: cfg.lvVariant,
        });
        const vSep = vadd(st.v, vscale(vunit(st.v), -0.004));
        deb.add(
          new ConicSeg("earth", e.t, e.t + 900, st.r, vSep, L.stages[idx].dry, {
            extra: { phase: "spent stage" },
          }),
        );
      }
    }
    if (e.kind === "jettison") {
      if (e.part === "fairing") fairing = false;
      if (e.part === "LES") les = false;
      if (e.part === "SAJ") saj = false;
      if (e.part === "IST") ist = false;
      ship.setConfig(e.t, "launch", {
        ...cfgAt(stFrom, boosters, fairing, les),
        saj,
        ist,
      });
    }
    if (e.kind === "jettison" && e.part === "IST") {
      // the aft interstage, the ring the S-II's engines have fired through since staging, falls behind
      const st = ship.stateAt(e.t),
        j = L.jettison.find((j) => j.part === "IST");
      if (st) {
        const deb = M.addObj(
          new MObject("debris-IST", j.name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(e.t, "stage", { key: "ist", launcher: cfg.launcher });
        deb.add(
          new ConicSeg(
            "earth",
            e.t,
            e.t + 900,
            st.r,
            vadd(st.v, vscale(vunit(st.v), -0.002)),
            j.mass,
            { extra: { phase: "jettisoned" } },
          ),
        );
      }
    }
    if (e.kind === "maxq") desc = e.desc + " " + EXPLAIN.maxq;
    if (e.kind === "insertion") desc = e.desc + " " + EXPLAIN.insertion;
    M.ev(e.t, "ship", e.name, desc, e.kind);
  }
  // a non-restartable sustainer that reached orbit (e.g. SLS core) is discarded; the next stage becomes the upper stage
  if (asc.ok && asc.upper && !asc.upper.restart) {
    const idx = L.stages.findIndex((s) => s.id === asc.upper.id);
    const nxt = asc.stack.stages.slice(idx + 1).find((s) => s.attached);
    if (nxt) {
      const dropped = asc.upper.dry + asc.upper.propLeft;
      asc.m -= dropped;
      asc.upper.attached = false;
      asc.upper = nxt;
      asc.upperProp = nxt.propLeft;
      stFrom = idx + 1;
      ship.setConfig(asc.t, "launch", {
        ...cfgAt(stFrom, false, fairing, les),
        saj,
        ist,
      });
      M.ev(
        asc.t + 1,
        "ship",
        `${L.stages[idx].id} separation`,
        `The ${L.stages[idx].name} has done its job and separates; the ${nxt.name} will perform the upcoming burns.`,
        "staging",
      );
      const st = ship.stateAt(asc.t);
      if (st) {
        const deb = M.addObj(
          new MObject("debris-" + L.stages[idx].id, L.stages[idx].name, {
            kind: "debris",
            model: "stage",
            color: "#888",
            trail: false,
          }),
        );
        deb.setConfig(asc.t, "stage", {
          key: "stage",
          launcher: cfg.launcher,
          stage: idx,
        });
        deb.add(
          new ConicSeg(
            "earth",
            asc.t,
            asc.t + 1500,
            st.r,
            vadd(st.v, vscale(vunit(st.v), -0.003)),
            L.stages[idx].dry,
            { extra: { phase: "spent stage" } },
          ),
        );
      }
    }
  }
  M.phase(t0, asc.t, "Launch & ascent", "#ff9f43");
  M.summary.ascent = {
    maxG: asc.maxG,
    maxQ: asc.maxQ,
    tIns: asc.t - t0,
    hp: asc.hpAch,
    ha: asc.haAch,
    kick: asc.kick,
    az: asc.azI,
    upperProp: asc.upperProp,
    upper: asc.upper ? asc.upper.id : null,
    swing10: asc.swing10,
    swingT: asc.swingT,
  };
  return { ok: asc.ok, asc, stFrom, fairing, les, boosters };
}
function budgetRow(M, b) {
  M.burn(b);
}

// ---- lunar.js
// ============================================================================
// lunar.js — Earth–Moon missions, numerically integrated (Earth + Moon + Sun)
// Profiles: lunar-orbit (orbit & return), lunar-landing (land & return),
//           lunar-flyby (free return), lunar-landing-oneway
// ============================================================================
const R_E = BODIES.earth.R,
  R_MOON = BODIES.moon.R,
  EI_ALT = 121.92;
function cisInt(t0, y0, t1, opt = {}) {
  return integrate(
    makeCislunarODE(opt.thrust || null),
    t0,
    Float64Array.from(y0),
    t1,
    {
      rtol: opt.rtol ?? 1e-10,
      atol: opt.atol ?? 1e-7,
      hmax: opt.hmax ?? 1200,
      events: opt.events || [],
      h0: opt.h0 ?? 5,
      maxSteps: opt.maxSteps ?? 400000,
    },
  );
}
const evPerilune = (maxD = 150000, tWin = null) => ({
  name: "perilune",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (tWin && (t < tWin[0] || t > tWin[1])) return -1;
    const m = moonGeo(t);
    const rx = y[0] - m.r[0],
      ry = y[1] - m.r[1],
      rz = y[2] - m.r[2];
    if (rx * rx + ry * ry + rz * rz > maxD * maxD) return -1;
    return rx * (y[3] - m.v[0]) + ry * (y[4] - m.v[1]) + rz * (y[5] - m.v[2]);
  },
});
const evPerigee = (maxD = 120000) => ({
  name: "perigee",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (y[0] * y[0] + y[1] * y[1] + y[2] * y[2] > maxD * maxD) return -1;
    return y[0] * y[3] + y[1] * y[4] + y[2] * y[5];
  },
});
const evPerigeeAfter = (tStart, delay = 600, maxD = 120000) => ({
  name: "perigee",
  dir: 1,
  terminal: true,
  g: (t, y) => {
    if (t - tStart < delay) return -1;
    if (y[0] * y[0] + y[1] * y[1] + y[2] * y[2] > maxD * maxD) return -1;
    return y[0] * y[3] + y[1] * y[4] + y[2] * y[5];
  },
});
function cisIntDelayed(t0, y0, tDelay, t1, events, opt = {}) {
  // events enabled only after tDelay
  if (tDelay <= t0) return cisInt(t0, y0, t1, { ...opt, events });
  const a = cisInt(t0, y0, Math.min(tDelay, t1), opt);
  if (tDelay >= t1) return a;
  const b = cisInt(tDelay, a.y[a.y.length - 1], t1, { ...opt, events });
  return {
    t: a.t.concat(b.t.slice(1)),
    y: a.y.concat(b.y.slice(1)),
    f: a.f.concat(b.f.slice(1)),
    events: b.events,
    tEnd: b.tEnd,
    stopped: b.stopped,
    stopEvent: b.stopEvent,
  };
}
const evEI = () => ({
  name: "EI",
  dir: -1,
  terminal: true,
  g: (t, y) => Math.hypot(y[0], y[1], y[2]) - (R_E + EI_ALT),
});
const evLunarImpact = () => ({
  name: "impact",
  dir: -1,
  terminal: true,
  g: (t, y) => {
    const m = moonGeo(t).r;
    return Math.hypot(y[0] - m[0], y[1] - m[1], y[2] - m[2]) - R_MOON;
  },
});
const yToRV = (y) => ({
  r: [y[0], y[1], y[2]],
  v: [y[3], y[4], y[5]],
  m: y[6],
});
function resState(res, t) {
  // Hermite state from integrator result at time t
  const T = res.t;
  let i = bsearch(T, t);
  if (i >= T.length - 1) i = T.length - 2;
  if (i < 0) i = 0;
  return hermiteState(
    T[i],
    res.y[i],
    res.f[i],
    T[i + 1],
    res.y[i + 1],
    res.f[i + 1],
    clamp(t, T[i], T[i + 1]),
    7,
  );
}
// an integrator result up to t, ending at t itself (where the next segment starts) rather than at its last step before it
function resUntil(res, t) {
  let k = res.t.findIndex((x) => x > t);
  if (k < 0) k = res.t.length;
  const out = { t: res.t.slice(0, k), y: res.y.slice(0, k) };
  if (!out.t.length || out.t[out.t.length - 1] < t) {
    out.t.push(t);
    out.y.push(resState(res, t));
  }
  return out;
}
function seleno(t, y) {
  const m = moonGeo(t);
  return {
    r: [y[0] - m.r[0], y[1] - m.r[1], y[2] - m.r[2]],
    v: [y[3] - m.v[0], y[4] - m.v[1], y[5] - m.v[2]],
  };
}
function geoFromSeleno(t, r, v) {
  const m = moonGeo(t);
  return { r: vadd(r, m.r), v: vadd(v, m.v) };
}
// samples for a geocentric result
function resToSeg(res, phase, extra = {}, burn = null) {
  const S = integToSamples(res, (t, y) =>
    burn
      ? {
          phase,
          ...extra,
          T: burn.T,
          thrDir: burn.law(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]]),
        }
      : { phase, ...extra },
  );
  return new SampleSeg("earth", S, { phase });
}
// local thrust-direction law: keep the angle relative to (v, r⊥, h) frame fixed (as in a guided burn)
function localDirLaw(r, v, dirAtStart, center = "earth") {
  const fr = (rr, vv) => {
    const e1 = vunit(vv);
    let e2 = vsub(vunit(rr), vscale(e1, vdot(vunit(rr), e1)));
    e2 = vunit(e2);
    const e3 = vcross(e1, e2);
    return [e1, e2, e3];
  };
  const [a, b, c] = fr(r, v);
  const comp = [vdot(dirAtStart, a), vdot(dirAtStart, b), vdot(dirAtStart, c)];
  return (t, rr, vv) => {
    let R = rr,
      V = vv;
    if (center === "moon") {
      const m = moonGeo(t);
      R = vsub(rr, m.r);
      V = vsub(vv, m.v);
    }
    const [e1, e2, e3] = fr(R, V);
    return vunit(
      vadd(vadd(vscale(e1, comp[0]), vscale(e2, comp[1])), vscale(e3, comp[2])),
    );
  };
}
// finite burn with secant search on duration so that `metric(yEnd)` hits 0. startState(tIgn) -> y
function finiteBurn({
  tCenter,
  startState,
  engine,
  dirLaw,
  D0,
  metric,
  maxProp,
  maxIt = 8,
  fixedStart = null,
}) {
  const mdot = engine.thrust / (engine.isp * G0);
  const run = (D) => {
    const tIgn = fixedStart ?? tCenter - D / 2;
    const y0 = startState(tIgn);
    const law = dirLaw(tIgn, y0);
    const res = cisInt(tIgn, y0, tIgn + D, {
      thrust: { T: engine.thrust, mdot, dir: law },
      hmax: 20,
      h0: 1,
    });
    return {
      res,
      tIgn,
      err: metric(res.y[res.y.length - 1], tIgn + D),
      burn: { T: engine.thrust, law },
    };
  };
  const Dmax = maxProp / mdot;
  let D1 = Math.min(D0, Dmax),
    r1 = run(D1);
  let D2 = Math.min(D1 * 1.03 + 1, Dmax),
    r2 = run(D2);
  for (let i = 0; i < maxIt && Math.abs(r2.err) > 1e-7; i++) {
    const dd = r2.err - r1.err;
    if (Math.abs(dd) < 1e-15) break;
    let D3 = D2 - (r2.err * (D2 - D1)) / dd;
    D3 = clamp(D3, 0.2 * D2, Math.min(3 * D2 + 5, Dmax));
    D1 = D2;
    r1 = r2;
    D2 = D3;
    r2 = run(D2);
    if (D2 >= Dmax - 1e-6 && r2.err < 0) break;
  }
  return { D: D2, ...r2, short: D2 >= Dmax - 1e-6 && Math.abs(r2.err) > 1e-4 };
}
const energyGeo = (y) =>
  (y[3] * y[3] + y[4] * y[4] + y[5] * y[5]) / 2 -
  MU_E / Math.hypot(y[0], y[1], y[2]);
function energySel(t, y) {
  const s = seleno(t, y);
  return vdot(s.v, s.v) / 2 - MU_M / vnorm(s.r);
}
function vacPerigee(r, v) {
  const el = rv2coe(r, v, MU_E);
  return el.rp;
}
function fpaDeg(r, v) {
  return Math.asin(clamp(vdot(vunit(r), vunit(v)), -1, 1)) * RAD;
}

// entry reference (range & duration) for a capsule
function entryReference(capsule, vEI = 11.0, fpa = -6.5, bank = 55, mass) {
  const r0 = [R_E + EI_ALT, 0, 0];
  const v0 = [vEI * Math.sin(fpa * DEG), vEI * Math.cos(fpa * DEG), 0];
  // simple: equatorial; rotation small effect for reference purposes
  const res = simulateEntry({
    body: "earth",
    t0: 0,
    r0,
    v0,
    m0: mass,
    diam: capsule.heat.diam,
    cd: capsule.heat.cd,
    LD: capsule.heat.LD,
    rn: capsule.heat.rn,
    bank,
    chutes: capsule.heat.chutes,
    maxTime: 3000,
  });
  const ang = vangle(r0, res.r);
  return { range: ang, dur: res.t, res };
}
// generic arrival residuals for targeting (n-body).
// mode.type: 'bplane' (B-plane target from desired plane/far side), 'plane' (rp + site plane), 'freeReturn' (rp + return perigee), 'natural' (rp)
function moonOrbitNormal(t) {
  const m = moonGeo(t);
  return vunit(vcross(m.r, m.v));
}
function bTarget(S, hStar, rp, vinf) {
  const b = bFromRp(rp, Math.max(vinf, 0.2), MU_M);
  return vscale(vunit(vcross(S, hStar)), b);
}
function makeArrivalF(tS, yS, mode) {
  const H = 3600;
  return (dv, wantDetail) => {
    const y0 = [...yS];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    const r1 = cisIntDelayed(
      tS,
      y0,
      mode.tWin ? mode.tWin[0] : tS,
      mode.tWin ? mode.tWin[1] + 3600 : tS + 9 * 24 * H,
      [evPerilune(mode.maxD || 200000)],
      { rtol: 1e-9, atol: 1e-6, hmax: 3600 },
    );
    if (!r1.stopEvent) return wantDetail ? { fail: true } : mode.fallback;
    const tp = r1.stopEvent.t,
      ye = r1.stopEvent.y,
      sel = seleno(tp, ye);
    const rp = vnorm(sel.r),
      h = vunit(vcross(sel.r, sel.v));
    let F;
    if (mode.type === "bplane") {
      const bv = bVector(sel.r, sel.v, MU_M);
      if (!bv) return wantDetail ? { fail: true } : mode.fallback;
      const k = mode.inPlaneOnly || moonOrbitNormal(tp),
        T = vunit(vcross(bv.S, k)),
        R = vcross(bv.S, T);
      const hStar = mode.hStar(tp, bv.S);
      const Bs = bTarget(bv.S, hStar, mode.rp, bv.vinf);
      F = mode.inPlaneOnly
        ? [(vdot(bv.B, T) - vdot(Bs, T)) / 1000]
        : [
            (vdot(bv.B, T) - vdot(Bs, T)) / 1000,
            (vdot(bv.B, R) - vdot(Bs, R)) / 1000,
          ];
    } else {
      F = [(rp - mode.rp) / 50];
      if (mode.type === "plane")
        F.push(Math.asin(clamp(vdot(h, mode.planeDir(tp)), -1, 1)) * RAD * 2);
    }
    let rvp = null;
    if (mode.type === "freeReturn" || mode.withReturn) {
      const r2 = cisInt(tp, ye, tp + 8 * 24 * H, {
        events: [evPerigee(), evEI()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      const yl = r2.y[r2.y.length - 1];
      rvp = vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]);
      if (mode.type === "freeReturn") F.push((rvp - mode.rvp) / 50);
    }
    if (mode.tPeri) F.push(((tp - mode.tPeri) / H) * (mode.timeWeight ?? 1));
    return wantDetail ? { F, tp, rp, h, ye, rvp } : F;
  };
}
// desired lunar-orbit normal: plane containing site direction (if any), retrograde sense (far-side arrival)
function hStarFor(cfg, t0) {
  const H = 3600;
  const site = cfg.hybrid
    ? { lat: cfg.hybrid.lat, lon: cfg.hybrid.lon, met: cfg.hybrid.landMET }
    : cfg.landing
      ? { lat: cfg.landing.lat, lon: cfg.landing.lon, met: cfg.landMET ?? 100 }
      : null;
  return (tp, S) => {
    const kRetro = vscale(moonOrbitNormal(tp), -1);
    if (!site) {
      const hN = vsub(kRetro, vscale(S, vdot(kRetro, S)));
      return vunit(hN);
    }
    const sd = vunit(
      sitePosEcl("moon", site.lat, site.lon, 0, t0 + site.met * H),
    );
    let h = vunit(vcross(S, sd));
    if (vdot(h, kRetro) < 0) h = vscale(h, -1);
    return h;
  };
}
function arrivalMode(cfg, t0, rp, tA) {
  const H = 3600;
  if (cfg.hybrid) {
    const hs = cfg.hybrid;
    return {
      type: "plane",
      rp,
      planeDir: () =>
        vunit(sitePosEcl("moon", hs.lat, hs.lon, 0, t0 + hs.landMET * H)),
      fallback: [1e3, 1e3],
    };
  }
  if (cfg.profile === "lunar-flyby") {
    return {
      type: "freeReturn",
      rp,
      rvp: rvpFor(cfg.entry?.fpa ?? -6.5),
      fallback: [1e3, 1e3],
    };
  }
  if (cfg.landing) {
    const st = cfg.landing,
      tL = t0 + (cfg.landMET ?? 100) * H;
    return {
      type: "plane",
      rp,
      planeDir: () => vunit(sitePosEcl("moon", st.lat, st.lon, 0, tL)),
      fallback: [1e3, 1e3],
    };
  }
  return { type: "natural", rp, fallback: [1e3] };
}
function rvpFor(fpaDegV) {
  const r = R_E + EI_ALT,
    v = 11.0,
    g = fpaDegV * DEG;
  const h = r * v * Math.cos(g),
    eps = (v * v) / 2 - MU_E / r;
  const e = Math.sqrt(1 + (2 * eps * h * h) / (MU_E * MU_E));
  return (h * h) / MU_E / (1 + e);
}
// --------------------------------------------------------------------------
function planLunar(cfg, progress = () => {}) {
  const M = new Mission(cfg);
  const L = LAUNCHERS[cfg.launcher],
    SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0,
    H = 3600;
  const crew = cfg.crew || 0;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const scMass0 = scTotalMass(SC);
  const tofOut = (cfg.tof || 72) * H;
  // ---------------- launch window / plane ----------------
  progress("Solving launch window & ascent…");
  let normal, launchInfo;
  const tliGuess = t0 + (cfg.tliMET ?? (cfg.heo ? 25.6 : 2.7)) * H;
  if (cfg.launchAz != null) {
    const pa = planeNormalFromAzRel("earth", S.lat, S.lon, t0, cfg.launchAz);
    normal = pa.n;
    launchInfo = `Flight azimuth ${cfg.launchAz.toFixed(2)}° (historical, Earth-fixed) → inertial ${pa.azI.toFixed(2)}°, parking-orbit inclination ${(Math.acos(clamp(eclToEq(normal)[2], -1, 1)) * RAD).toFixed(2)}°.`;
  } else {
    const pl = planeThroughSite(
      "earth",
      S.lat,
      S.lon,
      t0,
      vunit(moonGeo(tliGuess + tofOut).r),
    );
    normal = pl.n;
    launchInfo = `Launch azimuth ${pl.az.toFixed(1)}° chosen so the parking orbit plane contains the Moon’s position at arrival.`;
  }
  const LP = launchPhase(M, cfg, L, scMass0, normal, { ship });
  M.notes.push(launchInfo);
  if (!LP.ok) {
    M.warnings.push("The launch vehicle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  P.attachUpper(asc.upper, asc.upperProp);
  const upperMass = () =>
    P.upper.attached ? P.upper.dry + P.upper.propLeft : 0;
  let t = asc.t,
    y = [...asc.r, ...asc.v, asc.m];
  ship.setConfig(t, "stack", {
    key: "stack",
    parts: ["upper", "sc-stowed"],
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    sc: SC.model,
  });
  // ---------------- Earth orbit phase (optional HEO raise) ----------------
  const coast = (tEnd, phase, objRef = ship, extra) => {
    const res = cisInt(t, y, tEnd, {});
    objRef.add(resToSeg(res, phase, extra));
    const yl = res.y[res.y.length - 1];
    t = res.t[res.t.length - 1];
    y = Array.from(yl);
    return res;
  };
  if (cfg.heo) {
    // apogee raise at a perigee by the upper stage (Artemis II style)
    progress("Earth orbit: apogee raise to high Earth orbit…");
    const res = cisInt(t, y, t + 5 * H, {});
    const resP = cisIntDelayed(t, y, t + 1200, t + 4 * H, [evPerigee(20000)]);
    const tPer0 = resP.stopEvent ? resP.stopEvent.t : t + 1.8 * H;
    const per0 = resState(res, tPer0),
      pHat0 = vunit([per0[0], per0[1], per0[2]]);
    const h0 = vunit(vcross(y.slice(0, 3), y.slice(3, 6)));
    const raTarget = R_E + cfg.heo.ha;
    // 2-body design: rotate the high-orbit perigee so a TLI at the following perigee meets the Moon after `tof`
    const rpPark = (() => {
      const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
      return el;
    })();
    const rAt = (phi) => rpPark.p / (1 + rpPark.e * Math.cos(phi));
    const nPark = (2 * Math.PI) / rpPark.period;
    const Fdir = (x) => {
      const phi = x[0],
        dv = x[1],
        rp = rAt(phi),
        aH = (rp + raTarget) / 2,
        PH = 2 * Math.PI * Math.sqrt((aH * aH * aH) / MU_E);
      const pdir = vrot(pHat0, h0, phi),
        tTLI = tPer0 + phi / nPark + PH;
      const vp = Math.sqrt(MU_E * (2 / rp - 1 / aH)) + dv;
      const kp = kepProp(
        vscale(pdir, rp),
        vscale(vunit(vcross(h0, pdir)), vp),
        tofOut,
        MU_E,
      );
      const m = moonGeo(tTLI + tofOut).r,
        mp = vsub(m, vscale(h0, vdot(m, h0)));
      return [
        (vnorm(kp.r) - vnorm(mp)) / 1000,
        (Math.atan2(vdot(vcross(kp.r, mp), h0), vdot(kp.r, mp)) * vnorm(mp)) /
          1000,
      ];
    };
    const sd = newtonSolve(Fdir, [0, 0.4], {
      h: 1e-6,
      tol: 1e-4,
      maxIt: 40,
      maxStep: 0.3,
    });
    let phiB = clamp(sd.x[0], -1.2, 1.2);
    if (!sd.ok) phiB = 0;
    const eng = P.engineOf("upper");
    const startState = (tt) => Array.from(resState(res, tt));
    const runARB = (phiCmd) => {
      const tPer = tPer0 + phiCmd / nPark,
        peri = resState(res, tPer);
      const rp = Math.hypot(peri[0], peri[1], peri[2]);
      const epsT = -MU_E / (rp + raTarget);
      const vNew = vscale(
        vunit(vcross(h0, vunit([peri[0], peri[1], peri[2]]))),
        Math.sqrt(MU_E * (2 / rp - 2 / (rp + raTarget))),
      );
      const dvVec = vsub(vNew, [peri[3], peri[4], peri[5]]);
      const law = (tI, y0) =>
        localDirLaw(
          [peri[0], peri[1], peri[2]],
          [peri[3], peri[4], peri[5]],
          vunit(dvVec),
        );
      const fb = finiteBurn({
        tCenter: tPer,
        startState,
        engine: eng,
        dirLaw: law,
        D0:
          propForDv(peri[6], vnorm(dvVec), eng.isp) /
          (eng.thrust / (eng.isp * G0)),
        metric: (ye) => energyGeo(ye) - epsT,
        maxProp: P.upper.propLeft,
      });
      const ye = fb.res.y[fb.res.y.length - 1],
        el = rv2coe([ye[0], ye[1], ye[2]], [ye[3], ye[4], ye[5]], MU_E);
      const ehat = vunit(el.evec),
        phiAch = Math.atan2(vdot(vcross(pHat0, ehat), h0), vdot(pHat0, ehat));
      return { fb, phiAch };
    };
    let phiCmd = phiB,
      arb = runARB(phiCmd);
    for (let k = 0; k < 3 && Math.abs(arb.phiAch - phiB) > 0.2 * DEG; k++) {
      phiCmd += wrapPi(phiB - arb.phiAch);
      arb = runARB(phiCmd);
    }
    if (globalThis.DEBUG)
      console.log(
        "ARB phi target",
        phiB * RAD,
        "achieved",
        arb.phiAch * RAD,
        "cmd",
        phiCmd * RAD,
      );
    const fb = arb.fb;
    // add coast to ignition
    const resC = cisInt(t, y, fb.tIgn, {});
    ship.add(resToSeg(resC, "Earth orbit"));
    ship.add(
      resToSeg(fb.res, "apogee raise burn", { stage: P.upper.id }, fb.burn),
    );
    const used = fb.res.y[0][6] - fb.res.y[fb.res.y.length - 1][6];
    P.upper.propLeft -= used;
    const ye = fb.res.y[fb.res.y.length - 1];
    M.burn({
      name: cfg.heo.name || "Apogee raise (upper stage)",
      t: fb.tIgn,
      dur: fb.D,
      dv: dvForProp(fb.res.y[0][6], used, eng.isp) * 1000,
      engine: eng.name,
      isp: eng.isp,
      prop: used,
      m0: fb.res.y[0][6],
      obj: "ship",
      propType: eng.prop,
    });
    M.ev(
      fb.tIgn,
      "ship",
      cfg.heo.name || "Apogee raise burn",
      `${P.upper.name} burns ${fmtDur(fb.D)} near perigee, raising apogee to ${Math.round(cfg.heo.ha).toLocaleString()} km — a high Earth orbit for checkout before committing to the Moon.`,
      "burn",
    );
    t = fb.res.tEnd;
    y = Array.from(ye);
    // separation of spacecraft from upper stage
    const tSep = t + (cfg.heo.sepAfter || 1.4) * H;
    coast(tSep, "high Earth orbit");
    const up = M.addObj(
      new MObject("upper", P.upper.name, {
        kind: "stage",
        model: "stage",
        color: "#aaa",
      }),
    );
    up.setConfig(t, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: L.stages.length - 1,
    });
    const resU = cisInt(
      t,
      [
        ...y.slice(0, 3),
        ...vadd(y.slice(3, 6), vscale(vunit(y.slice(3, 6)), -0.0005)),
        P.upper.dry + P.upper.propLeft,
      ],
      t + 30 * H,
      {},
    );
    up.add(resToSeg(resU, "spent stage"));
    y[6] -= upperMass();
    P.upper.attached = false;
    ship.setConfig(t, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
    M.ev(
      t,
      "ship",
      cfg.heo.sepName || "Spacecraft separation",
      cfg.heo.sepDesc || "The spacecraft separates from the spent upper stage.",
      "sep",
    );
    if (cfg.heo.proxOps)
      M.ev(
        t + 0.2 * H,
        "ship",
        "Proximity operations demo",
        "The crew manually flies the spacecraft around the spent upper stage, using it as a docking target to test handling qualities.",
        "info",
      );
  }
  // ---------------- TLI ----------------
  progress("Targeting trans-lunar injection…");
  const tliEngineId = cfg.tliBy === "sc" ? SC.prop.orbiter : "upper";
  const eng = P.engineOf(tliEngineId);
  // parking orbit propagation (long enough)
  const parkRes = cisInt(t, y, t + 30 * H, {});
  const parkNormal = vunit(vcross(y.slice(0, 3), y.slice(3, 6)));
  let tIgn;
  const mdotT = eng.thrust / (eng.isp * G0);
  const s0park = resState(parkRes, t);
  // TLI design in the two-body model: tangential impulse at t1 with magnitude dv; craft must reach the Moon
  // (radius + small far-side aim offset, and in-plane angle) at tArr.  Then MCC fixes n-body / out-of-plane errors.
  const aimOff = cfg.flybySide === "near" ? -1500 : 2500;
  const tliF = (t1, dv, tArr) => {
    const s = resState(parkRes, t1),
      r = [s[0], s[1], s[2]],
      v = [s[3], s[4], s[5]];
    const v1 = vadd(v, vscale(vunit(v), dv));
    const kp = kepProp(r, v1, tArr - t1, MU_E);
    const h = vunit(vcross(r, v1));
    let m = moonGeo(tArr).r;
    const mp = vsub(m, vscale(h, vdot(m, h)));
    const ang = Math.atan2(vdot(vcross(kp.r, mp), h), vdot(kp.r, mp));
    return [
      (vnorm(kp.r) - (vnorm(mp) + aimOff)) / 1000,
      (ang * vnorm(mp)) / 1000,
    ];
  };
  let t1, dv1, tA;
  const dvHoh = (s) => {
    const r = Math.hypot(s[0], s[1], s[2]);
    return (
      Math.sqrt(MU_E * (2 / r - 2 / (r + 384000))) -
      Math.hypot(s[3], s[4], s[5])
    );
  };
  if (cfg.tliMET != null || cfg.heo) {
    if (cfg.tliMET != null) tIgn = t0 + cfg.tliMET * H;
    else {
      const rp = cisIntDelayed(t, y, t + 3 * H, t + 30 * H, [evPerigee(30000)]);
      tIgn = (rp.stopEvent ? rp.stopEvent.t : t + 23 * H) - 175;
    }
    let D =
      propForDv(s0park[6], dvHoh(resState(parkRes, tIgn)), eng.isp) / mdotT;
    if (globalThis.DEBUG) {
      const sp = resState(parkRes, tIgn);
      const pr = [sp[0], sp[1], sp[2]];
      const hh = vunit(vcross(pr, [sp[3], sp[4], sp[5]]));
      for (const dh of [70, 90, 100, 110, 120]) {
        const mm = moonGeo(tIgn + dh * H).r;
        const mp = vsub(mm, vscale(hh, vdot(mm, hh)));
        console.log(
          "HEO geom: Moon at TLI+" + dh + "h: in-plane angle",
          (Math.atan2(vdot(vcross(pr, mp), hh), vdot(pr, mp)) * RAD).toFixed(1),
          "out-of-plane deg",
          (Math.asin(vdot(vunit(mm), hh)) * RAD).toFixed(2),
        );
      }
      console.log(
        "TLI ign",
        fmtUTC(tIgn),
        "perigee alt",
        vnorm(pr) - R_E,
        "dvHoh",
        dvHoh(sp),
      );
    }
    dv1 = dvHoh(resState(parkRes, tIgn + D / 2));
    tA = tIgn + D / 2 + tofOut;
    for (let k = 0; k < 3; k++) {
      t1 = tIgn + D / 2;
      const sol = newtonSolve((x) => tliF(t1, x[0], x[1]), [dv1, tA], {
        h: 1e-4,
        tol: 1e-6,
        maxIt: 30,
      });
      dv1 = sol.x[0];
      tA = sol.x[1];
      D = propForDv(s0park[6], dv1, eng.isp) / mdotT;
    }
  } else {
    // free TLI epoch: craft must depart roughly opposite the Moon's arrival position
    const P0 =
      2 * Math.PI * Math.sqrt(Math.pow(vnorm(y.slice(0, 3)), 3) / MU_E);
    const mArr = vunit(moonGeo(t + 1.5 * H + tofOut).r);
    let tBest = t + 0.9 * H,
      best = -2;
    for (let tt = t + 0.9 * H; tt < t + 0.9 * H + P0; tt += 30) {
      const s = resState(parkRes, tt);
      const c = -vdot(vunit([s[0], s[1], s[2]]), mArr);
      if (c > best) {
        best = c;
        tBest = tt;
      }
    }
    t1 = tBest - 0.035 * P0;
    dv1 = dvHoh(resState(parkRes, t1));
    tA = t1 + tofOut;
    const sol = newtonSolve(
      (x) => tliF(x[0], x[1], t1 + tofOut + (x[0] - t1) * 0),
      [t1, dv1],
      { h: 1e-4, tol: 1e-6, maxIt: 30 },
    );
    // keep TOF fixed relative to t1: solve (t1, dv) with tArr = t1 + tof
    const sol2 = newtonSolve(
      (x) => tliF(x[0], x[1], x[0] + tofOut),
      [sol.x[0], sol.x[1]],
      { h: 1e-3, tol: 1e-6, maxIt: 30 },
    );
    t1 = sol2.x[0];
    dv1 = sol2.x[1];
    tA = t1 + tofOut;
    const D = propForDv(resState(parkRes, t1)[6], dv1, eng.isp) / mdotT;
    tIgn = t1 - D / 2;
  }
  let tArrA = null;
  // --- stage A (n-body, in-plane): tangential burn; adjust Δv and burn epoch to minimise lunar miss distance
  {
    const tTarget = (tt) => tt + tofOut;
    const rpAim =
      R_MOON + (cfg.hybrid ? cfg.hybrid.perilune : cfg.perilune || 110);
    const missAt = (tt, dv) => {
      const s = resState(parkRes, tt);
      const y0 = Array.from(s);
      const vv = vunit([y0[3], y0[4], y0[5]]);
      y0[3] += vv[0] * dv;
      y0[4] += vv[1] * dv;
      y0[5] += vv[2] * dv;
      const win = [tt + 0.55 * tofOut, tt + 1.6 * tofOut];
      const r = cisIntDelayed(
        tt,
        y0,
        win[0],
        win[1] + 3600,
        [evPerilune(450000)],
        { rtol: 1e-8, atol: 1e-5, hmax: 3600 },
      );
      if (!r.stopEvent) return 1e6;
      const sl = seleno(r.stopEvent.t, r.stopEvent.y);
      const tw = cfg.tliMET != null ? Math.abs(tt - t1) / 60 : 0;
      const dtH = Math.abs(r.stopEvent.t - tTarget(tt)) / 3600;
      missAt.tp = r.stopEvent.t;
      return (
        Math.abs(vnorm(sl.r) - rpAim) + tw * 50 + Math.max(0, dtH - 3) * 400
      );
    };
    const t1base = t1,
      dvBase = dv1,
      tSpan = cfg.heo ? 4 : 9;
    if (globalThis.DEBUG && cfg.heo) {
      for (const dvx of [0.36, 0.44]) {
        const s0 = resState(parkRes, t1base);
        const y0 = Array.from(s0);
        const vv = vunit([y0[3], y0[4], y0[5]]);
        y0[3] += vv[0] * dvx;
        y0[4] += vv[1] * dvx;
        y0[5] += vv[2] * dvx;
        const el = rv2coe([y0[0], y0[1], y0[2]], [y0[3], y0[4], y0[5]], MU_E);
        console.log(
          "dv",
          dvx,
          "rp",
          el.rp.toFixed(0),
          "ra",
          el.ra.toFixed(0),
          "flight path deg",
          fpaDeg([s0[0], s0[1], s0[2]], [s0[3], s0[4], s0[5]]).toFixed(2),
          "|r|",
          Math.hypot(s0[0], s0[1], s0[2]).toFixed(0),
        );
        const rr = cisInt(t1base, y0, t1base + 150 * H, {});
        for (const hh of [24, 48, 72, 90, 100, 120]) {
          const st = resState(rr, t1base + hh * H);
          const m = moonGeo(t1base + hh * H).r;
          console.log(
            "   +" + hh + "h dEarth",
            Math.round(Math.hypot(st[0], st[1], st[2])),
            "dMoon",
            Math.round(vnorm(vsub([st[0], st[1], st[2]], m))),
            "moonDist",
            Math.round(vnorm(m)),
          );
        }
      }
    } // ±400 s at a HEO perigee, ±900 s otherwise
    // 1-D scan on Δv first (robust starting point), then bounded simplex on (Δv, epoch)
    {
      let best = { f: Infinity, dv: dv1 };
      for (let dv = dvBase - 0.08; dv <= dvBase + 0.16; dv += 0.01) {
        const f = missAt(t1base, dv);
        if (globalThis.DEBUG)
          console.log(
            "scanA",
            dv.toFixed(3),
            Math.round(f),
            ((missAt.tp - t1base) / 3600).toFixed(1),
          );
        if (f < best.f) best = { f, dv };
      }
      dv1 = best.dv;
    }
    const bounded = (x) =>
      Math.abs(x[1]) > tSpan || Math.abs(x[0] - dvBase) > 0.25
        ? 1e7
        : missAt(t1base + x[1] * 100, x[0]);
    const nm = nelderMead(bounded, [dv1, 0], [0.01, 2], {
      maxIt: 90,
      tol: 1e-7,
    });
    dv1 = nm.x[0];
    t1 = t1base + nm.x[1] * 100;
    missAt(t1, dv1);
    tArrA = missAt.tp;
    if (globalThis.DEBUG)
      console.log(
        "stage A",
        nm.f,
        dv1,
        t1 - t1base,
        "arrival GET h",
        (tArrA - t0) / 3600,
      );
    const D = propForDv(resState(parkRes, t1)[6], dv1, eng.isp) / mdotT;
    tIgn = t1 - D / 2;
  }
  const sT1 = resState(parkRes, t1);
  const imp = { r: [sT1[0], sT1[1], sT1[2]], v: [sT1[3], sT1[4], sT1[5]] };
  // --- n-body refinement of the impulsive TLI (3-D B-plane targeting): x = Δv components in (v, r⊥, h) frame
  const rpMoon0 =
    R_MOON + (cfg.hybrid ? cfg.hybrid.perilune : cfg.perilune || 110);
  const fr = (() => {
    const e1 = vunit(imp.v);
    let e2 = vunit(vsub(vunit(imp.r), vscale(e1, vdot(vunit(imp.r), e1))));
    return [e1, e2, vcross(e1, e2)];
  })();
  const xToDv = (x) =>
    vadd(vadd(vscale(fr[0], x[0]), vscale(fr[1], x[1])), vscale(fr[2], x[2]));
  const isFR = cfg.profile === "lunar-flyby" && !cfg.hybrid;
  const tWinT = tArrA ? [tArrA - 40 * H, tArrA + 40 * H] : null;
  const modeT = {
    type: "bplane",
    rp: rpMoon0,
    hStar: hStarFor(cfg, t0),
    fallback: [1e3, 1e3],
    tWin: tWinT,
    inPlaneOnly: isFR ? null : vunit(vcross(imp.r, imp.v)),
    tPeri: t1 + tofOut,
    timeWeight: 0.6,
  };
  const FT0 = makeArrivalF(t1, Array.from(sT1), modeT);
  let solTLI = newtonSolve((x) => FT0(xToDv(x)), [dv1, 0, 0], {
    h: 1e-6,
    tol: 1e-3,
    maxIt: 25,
    maxStep: 0.15,
  });
  let FT = FT0;
  if (isFR) {
    // second stage: true free-return conditions (perilune radius, return perigee) + arrival time
    const modeF = {
      type: "freeReturn",
      rp: rpMoon0,
      rvp: rvpFor(cfg.entry?.fpa ?? -6.5),
      fallback: [1e3, 1e3, 1e3],
      tWin: tWinT,
      tPeri: t1 + tofOut,
      timeWeight: 0.3,
    };
    const FTf = makeArrivalF(t1, Array.from(sT1), modeF);
    const s2 = newtonSolve((x) => FTf(xToDv(x)), solTLI.x, {
      h: 1e-6,
      tol: 1e-3,
      maxIt: 25,
      maxStep: 0.05,
    });
    if (globalThis.DEBUG)
      console.log(
        "TLI free-return stage",
        s2.norm,
        s2.hist.map((v) => +v.toFixed(3)),
      );
    if (s2.norm < 5) {
      solTLI = s2;
      FT = FTf;
    }
  }
  if (globalThis.DEBUG) {
    const d = FT(xToDv(solTLI.x), true);
    console.log(
      "TLI nbody",
      solTLI.norm,
      solTLI.hist.map((v) => +v.toFixed(3)),
      solTLI.x,
      (d.tp - t0) / 3600,
      d.rp,
    );
  }
  if (!solTLI.ok)
    M.notes.push(
      "TLI targeting converged approximately; mid-course corrections absorb the residual.",
    );
  dv1 = vnorm(xToDv(solTLI.x));
  imp.L1 = { v1: vadd(imp.v, xToDv(solTLI.x)) };
  const dvImp = vsub(imp.L1.v1, imp.v);
  const Dest = propForDv(sT1[6], dv1, eng.isp) / mdotT;
  const tc = t1;
  const epsTLI = vdot(imp.L1.v1, imp.L1.v1) / 2 - MU_E / vnorm(imp.r);
  const tank = P.tankOf(tliEngineId);
  const fbT = finiteBurn({
    tCenter: tc,
    fixedStart: tIgn,
    startState: (tt) => Array.from(resState(parkRes, tt)),
    engine: eng,
    dirLaw: (tI, y0) => localDirLaw(imp.r, imp.v, vunit(dvImp)),
    D0: Dest,
    metric: (ye) => energyGeo(ye) - epsTLI,
    maxProp: tank.propLeft,
  });
  {
    const resC = cisInt(t, y, tIgn, {});
    ship.add(resToSeg(resC, cfg.heo ? "high Earth orbit" : "parking orbit"));
  }
  ship.add(
    resToSeg(
      fbT.res,
      "trans-lunar injection",
      { stage: tliEngineId === "upper" ? P.upper.id : tliEngineId },
      fbT.burn,
    ),
  );
  const usedT = fbT.res.y[0][6] - fbT.res.y[fbT.res.y.length - 1][6];
  tank.propLeft -= usedT;
  const dvT = dvForProp(fbT.res.y[0][6], usedT, eng.isp) * 1000;
  M.burn({
    name: "TLI — trans-lunar injection",
    t: tIgn,
    dur: fbT.D,
    dv: dvT,
    engine: eng.name,
    isp: eng.isp,
    prop: usedT,
    m0: fbT.res.y[0][6],
    obj: "ship",
    propType: eng.prop,
  });
  M.ev(
    tIgn,
    "ship",
    "Trans-lunar injection",
    `${EXPLAIN.tli} Burn ${fmtDur(fbT.D)}, Δv ≈ ${dvT.toFixed(0)} m/s using ${(usedT / 1000).toFixed(1)} t of propellant.`,
    "burn",
  );
  M.phase(asc.t, tIgn, cfg.heo ? "Earth orbits" : "Parking orbit", "#4ea8de");
  t = fbT.res.tEnd;
  y = Array.from(fbT.res.y[fbT.res.y.length - 1]);
  if (fbT.short) {
    M.warnings.push(
      `Not enough propellant for the full trans-lunar injection (Δv achieved ${dvT.toFixed(0)} m/s) — the vehicle stays in an elliptical Earth orbit. Choose a more capable launch vehicle or a lighter spacecraft.`,
    );
    M.failed = "tli";
    const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
    const tEndF =
      t + Math.min(Math.max(el.period || 6 * H, 6 * H) * 2, 10 * 24 * H);
    coast(tEndF, "stranded in Earth orbit");
    M.phase(tIgn, tEndF, "Stranded in Earth orbit", "#ff5d5d");
    M.ev(
      tIgn + fbT.D,
      "ship",
      "TLI shortfall",
      `The upper stage ran dry before reaching escape energy. Apogee ${Math.round(el.ra - R_E).toLocaleString()} km — the Moon (≈384,000 km) is out of reach.`,
      "fail",
    );
    M.finalize();
    return M;
  }
  if (globalThis.DEBUG) {
    const el = rv2coe(y.slice(0, 3), y.slice(3, 6), MU_E);
    console.log("post-TLI", {
      D: fbT.D,
      short: fbT.short,
      err: fbT.err,
      rp: el.rp,
      ra: el.ra,
      e: el.e,
      dvImp: vnorm(dvImp),
      tIgn: fmtUTC(tIgn),
      tc: fmtUTC(tc),
    });
    const elImp = rv2coe(imp.r, imp.L1.v1, MU_E);
    console.log("impulsive", { rp: elImp.rp, ra: elImp.ra, i: elImp.i * RAD });
    const rr = cisInt(t, y, t + 5 * 86400, {});
    let mn = 1e12,
      tm = 0;
    for (let i = 0; i < rr.t.length; i++) {
      const d = vnorm(vsub(rr.y[i].slice(0, 3), moonGeo(rr.t[i]).r));
      if (d < mn) {
        mn = d;
        tm = rr.t[i];
      }
    }
    console.log("closest Moon", mn, fmtUTC(tm));
    const kp = kepProp(imp.r, imp.L1.v1, tofOut, MU_E);
    console.log(
      "kepler arrival miss vs moon",
      vnorm(vsub(kp.r, moonGeo(tc + tofOut).r)),
    );
  }
  // ---------------- upper-stage separation (TD&E) ----------------
  if (tliEngineId === "upper" && P.upper.attached) {
    const tSep = t + (cfg.sepAfterTLI ?? 0.5) * H;
    coast(tSep, "translunar coast");
    const up = M.addObj(
      new MObject("upper", P.upper.name, {
        kind: "stage",
        model: "stage",
        color: "#aaa",
      }),
    );
    up.setConfig(t, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: L.stages.length - 1,
      withAdapter: true,
    });
    const mUp = upperMass() + P.massOf(SC.adapter || []);
    const resU = cisInt(
      t,
      [
        ...y.slice(0, 3),
        ...vadd(y.slice(3, 6), vscale(vunit(y.slice(3, 6)), -0.004)),
        mUp,
      ],
      t + (cfg.upperDays || 5) * 24 * H,
      { events: [evLunarImpact()] },
    );
    up.add(resToSeg(resU, "spent stage"));
    y[6] -= mUp;
    P.upper.attached = false;
    for (const a of SC.adapter || []) P.mods[a].attached = false;
    ship.setConfig(t, "sc", {
      key: "sc",
      sc: SC.model,
      parts: SC.lander ? ["orbiter", "lander"] : ["orbiter"],
      deployT: t,
    }); // (a spacecraft that unfolds after it leaves the stage does so from deployT)
    M.ev(
      t,
      "ship",
      cfg.sepName || "Spacecraft separation",
      cfg.sepDesc ||
        "The spacecraft separates from the spent upper stage, which is sent onto a different trajectory.",
      "sep",
    );
  }
  // ---------------- outbound mid-course correction (targeting) ----------------
  progress("Mid-course correction: targeting the Moon…");
  const profile = cfg.profile;
  const rpMoonT = R_MOON + (cfg.perilune || 110);
  const site = cfg.landing;
  const capsuleId = SC.capsule;
  const entryCfg = cfg.entry || {};
  const capMass = () => P.massOf([capsuleId]);
  const ref = SC.capsule
    ? entryReference(
        SC.modules[capsuleId],
        11.0,
        entryCfg.fpa ?? -6.5,
        entryCfg.bank ?? 55,
        P.mods[capsuleId].dry,
      )
    : null;
  const tMcc =
    cfg.mccMET != null ? t0 + cfg.mccMET * H : t + (cfg.mccAfterTLI ?? 20) * H;
  coast(tMcc, "translunar coast");
  const tLandEst = site
    ? t0 + (cfg.landMET ?? (cfg.tliMET ?? 2.7) + (cfg.tof || 72) + 26) * H
    : 0;
  const siteDirAt = (tt) =>
    vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt));
  const rvpT = (() => {
    // vacuum perigee radius for target entry FPA (approx, v_EI 11 km/s)
    const r = R_E + EI_ALT,
      v = 11.0,
      g = (entryCfg.fpa ?? -6.5) * DEG;
    const h = r * v * Math.cos(g),
      eps = (v * v) / 2 - MU_E / r;
    const e = Math.sqrt(1 + (2 * eps * h * h) / (MU_E * MU_E));
    return (h * h) / MU_E / (1 + e);
  })();
  const mccRun = (dv, full) => {
    const y0 = [...y];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    const r1 = cisInt(tMcc, y0, tMcc + 9 * 24 * H, {
      events: [evPerilune()],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    if (!r1.stopEvent) return { fail: true };
    const ye = r1.stopEvent.y,
      tp = r1.stopEvent.t,
      sel = seleno(tp, ye);
    const out = {
      tp,
      rp: vnorm(sel.r),
      h: vunit(vcross(sel.r, sel.v)),
      ye,
      res1: r1,
    };
    if (full) {
      const r2 = cisInt(tp, ye, tp + 8 * 24 * H, {
        events: [evPerigee(), evEI()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      const yl = r2.y[r2.y.length - 1];
      out.rvp = vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]);
      out.res2 = r2;
    }
    return out;
  };
  let modeM;
  if (profile === "lunar-flyby" && !cfg.hybrid)
    modeM = {
      type: "freeReturn",
      rp: rpMoonT,
      rvp: rvpT,
      fallback: [1e3, 1e3],
    };
  else
    modeM = {
      type: "bplane",
      rp: cfg.hybrid ? R_MOON + cfg.hybrid.perilune : rpMoonT,
      hStar: hStarFor(cfg, t0),
      fallback: [1e3, 1e3],
    };
  if (tArrA) modeM.tWin = [tArrA - 30 * H, tArrA + 30 * H];
  const FM = makeArrivalF(tMcc, y, modeM);
  const F = (dv) => FM(dv);
  const sol = newtonSolve(F, [0, 0, 0], {
    h: 1e-6,
    tol: 1e-3,
    maxIt: 20,
    maxStep: 0.25,
  });
  const dvM = sol.x,
    dvMag = vnorm(dvM) * 1000;
  if (globalThis.DEBUG) {
    const o = FM(dvM, true);
    console.log(
      "MCC sol",
      sol.norm,
      sol.hist.map((v) => +v.toFixed(4)),
      dvM.map((v) => v * 1000),
      o.fail ? "FAIL" : { rp: o.rp, tp: fmtUTC(o.tp) },
    );
  }
  if (!sol.ok)
    M.warnings.push(
      `Outbound targeting converged only approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  const mccEngId = SC.prop.orbiter;
  const pm = P.burn(mccEngId, y[6], dvMag / 1000);
  M.burn({
    name: "MCC — outbound mid-course correction",
    t: tMcc,
    dur: pm.dur,
    dv: dvMag,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: y[6],
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tMcc,
    "ship",
    "Mid-course correction",
    `${EXPLAIN.mcc} Δv ${dvMag.toFixed(1)} m/s (${fmtDur(pm.dur)} burn).`,
    "burn",
    { dv: dvMag },
  );
  y[3] += dvM[0];
  y[4] += dvM[1];
  y[5] += dvM[2];
  y[6] -= pm.prop;
  // ---------------- Apollo-13 style mid-course re-targeting events ----------------
  const scripted = cfg.scripted || [];
  // ---------------- integrate to perilune ----------------
  progress("Coasting to the Moon…");
  if (profile === "lunar-flyby")
    return finishFlyby(
      M,
      cfg,
      SC,
      P,
      ship,
      t0,
      tMcc,
      y,
      rpMoonT,
      rvpT,
      ref,
      scripted,
      progress,
    );
  let res = cisInt(tMcc, y, tMcc + 9 * 24 * H, { events: [evPerilune()] });
  const tSOI = (() => {
    for (let i = 0; i < res.t.length; i++) {
      const m = moonGeo(res.t[i]).r;
      if (
        vnorm(vsub([res.y[i][0], res.y[i][1], res.y[i][2]], m)) <
        BODIES.moon.soi
      )
        return res.t[i];
    }
    return null;
  })();
  if (tSOI)
    M.ev(tSOI, "ship", "Lunar sphere of influence", EXPLAIN.soiMoon, "soi");
  if (!res.stopEvent) {
    ship.add(resToSeg(res, "translunar coast"));
    M.warnings.push(
      "The trajectory does not reach the Moon — targeting failed for these inputs.",
    );
    M.failed = "arrival";
    M.finalize();
    return M;
  }
  const tPeri = res.stopEvent.t;
  // ---------------- LOI-1 ----------------
  progress("Lunar orbit insertion…");
  const orbEngId = SC.prop.orbiter,
    orbEng = P.engineOf(orbEngId);
  const loi = cfg.loi || { apo: 314 };
  const raLOI = R_MOON + loi.apo;
  const peri = res.stopEvent.y,
    selP = seleno(tPeri, peri);
  const epsLOI = -MU_M / (vnorm(selP.r) + raLOI);
  const vpTarget = Math.sqrt(2 * (epsLOI + MU_M / vnorm(selP.r)));
  const dvLOIest = vnorm(selP.v) - vpTarget;
  const DLOI =
    propForDv(peri[6], dvLOIest, orbEng.isp) /
    (orbEng.thrust / (orbEng.isp * G0));
  const retro = (tI, y0) => (tt, rr, vv) => {
    const m = moonGeo(tt);
    return vunit(vsub(m.v, vv));
  };
  const fbL = finiteBurn({
    tCenter: tPeri,
    startState: (tt) => Array.from(resState(res, tt)),
    engine: orbEng,
    dirLaw: retro,
    D0: DLOI,
    metric: (ye, te) => energySel(te, ye) - epsLOI,
    maxProp: P.tankOf(orbEngId).propLeft,
  });
  {
    const resC = cisInt(tMcc, y, fbL.tIgn, {});
    ship.add(resToSeg(resC, "translunar coast"));
  }
  ship.add(
    resToSeg(fbL.res, "lunar orbit insertion", { stage: orbEngId }, fbL.burn),
  );
  const usedL = fbL.res.y[0][6] - fbL.res.y[fbL.res.y.length - 1][6];
  P.tankOf(orbEngId).propLeft -= usedL;
  const dvL = dvForProp(fbL.res.y[0][6], usedL, orbEng.isp) * 1000;
  M.burn({
    name: "LOI-1 — lunar orbit insertion",
    t: fbL.tIgn,
    dur: fbL.D,
    dv: dvL,
    engine: orbEng.name,
    isp: orbEng.isp,
    prop: usedL,
    m0: fbL.res.y[0][6],
    obj: "ship",
    propType: orbEng.prop,
  });
  M.ev(
    fbL.tIgn,
    "ship",
    "Lunar orbit insertion",
    `${EXPLAIN.loi} ${fmtDur(fbL.D)} burn, Δv ${dvL.toFixed(0)} m/s → orbit ${(cfg.perilune || 110).toFixed(0)} × ${loi.apo} km.`,
    "burn",
  );
  M.phase(tIgn, fbL.tIgn, "Translunar coast", "#9b5de5");
  // LOS behind the Moon
  M.ev(
    fbL.tIgn - 600,
    "ship",
    "Loss of signal",
    "The spacecraft passes behind the Moon — no radio contact with Earth until it re-emerges ~45 minutes later.",
    "los",
  );
  if (fbL.short) {
    M.warnings.push("Insufficient propellant for lunar orbit insertion.");
  }
  t = fbL.res.tEnd;
  y = Array.from(fbL.res.y[fbL.res.y.length - 1]);
  // ---------------- LOI-2 circularisation ----------------
  if (loi.circ) {
    const after = loi.circAfter ?? 4.4;
    let r2 = cisInt(t, y, t + after * H + 4 * H, {});
    let best = null;
    for (let i = 1; i < r2.t.length; i++) {
      const a = seleno(r2.t[i - 1], r2.y[i - 1]),
        b = seleno(r2.t[i], r2.y[i]);
      if (vdot(a.r, a.v) < 0 && vdot(b.r, b.v) >= 0) {
        const tc = r2.t[i];
        if (
          !best ||
          Math.abs(tc - (t + after * H)) < Math.abs(best - (t + after * H))
        )
          best = tc;
      }
    }
    const tc2 = best || t + after * H;
    const s2 = resState(r2, tc2),
      sel2 = seleno(tc2, s2),
      rp2 = vnorm(sel2.r);
    const ra2 = R_MOON + loi.circ;
    const eps2 = -MU_M / (rp2 + ra2);
    const dvE = vnorm(sel2.v) - Math.sqrt(2 * (eps2 + MU_M / rp2));
    const D2 = Math.max(
      2,
      propForDv(s2[6], Math.abs(dvE), orbEng.isp) /
        (orbEng.thrust / (orbEng.isp * G0)),
    );
    const fb2 = finiteBurn({
      tCenter: tc2,
      startState: (tt) => Array.from(resState(r2, tt)),
      engine: orbEng,
      dirLaw: retro,
      D0: D2,
      metric: (ye, te) => energySel(te, ye) - eps2,
      maxProp: P.tankOf(orbEngId).propLeft,
    });
    {
      const resC = cisInt(t, y, fb2.tIgn, {});
      ship.add(resToSeg(resC, "lunar orbit"));
    }
    ship.add(resToSeg(fb2.res, "LOI-2", { stage: orbEngId }, fb2.burn));
    const u2 = fb2.res.y[0][6] - fb2.res.y[fb2.res.y.length - 1][6];
    P.tankOf(orbEngId).propLeft -= u2;
    const d2 = dvForProp(fb2.res.y[0][6], u2, orbEng.isp) * 1000;
    M.burn({
      name: "LOI-2 — circularisation",
      t: fb2.tIgn,
      dur: fb2.D,
      dv: d2,
      engine: orbEng.name,
      isp: orbEng.isp,
      prop: u2,
      m0: fb2.res.y[0][6],
      obj: "ship",
      propType: orbEng.prop,
    });
    M.ev(
      fb2.tIgn,
      "ship",
      "LOI-2 circularisation",
      `A ${fmtDur(fb2.D)} burn trims the orbit to ≈${(cfg.perilune || 110).toFixed(0)} × ${loi.circ} km. Lunar orbital speed ≈ 1.6 km/s, period ≈ 2 hours.`,
      "burn",
    );
    t = fb2.res.tEnd;
    y = Array.from(fb2.res.y[fb2.res.y.length - 1]);
  }
  const tLOIend = t;
  // lunar orbit events (Earthrise etc.)
  for (const e of scripted)
    if (e.when === "lunarOrbit")
      M.ev(t0 + e.met * H, "ship", e.name, e.desc, e.kind || "info");
  // ---------------- landing ----------------
  let tDepart;
  if (profile === "lunar-landing" || profile === "lunar-landing-oneway") {
    const ok = doLanding(
      M,
      cfg,
      SC,
      P,
      ship,
      t0,
      () => ({ t, y }),
      (nt, ny) => {
        t = nt;
        y = ny;
      },
      progress,
    );
    if (!ok) {
      M.finalize();
      return M;
    }
    if (profile === "lunar-landing-oneway") {
      M.finalize();
      return M;
    }
  }
  // ---------------- lunar orbit stay → TEI ----------------
  progress("Trans-Earth injection targeting…");
  const tTEInom =
    cfg.teiMET != null ? t0 + cfg.teiMET * H : t + (cfg.orbitStay ?? 20) * H;
  const tReturn = (cfg.returnTof ?? 62) * H;
  const splash = cfg.splash;
  const tEntryDur = ref ? ref.dur : 800;
  const thetaRange = ref ? ref.range : 0.35;
  const siteE = (tt) =>
    vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
  // orbit propagation through TEI window
  const orbRes = cisInt(t, y, tTEInom + 3 * H, {});
  const per =
    2 * Math.PI * Math.sqrt(Math.pow(vnorm(seleno(t, y).r), 3) / MU_M);
  const teiTrial = (tb, dv, full) => {
    const s = resState(orbRes, tb),
      sel = seleno(tb, s);
    const vdir = vunit(sel.v);
    const y0 = Array.from(s);
    y0[3] += vdir[0] * dv[0] + dv[1];
    y0[4] += vdir[1] * dv[0] + dv[2];
    y0[5] += vdir[2] * dv[0] + dv[3];
    const r = cisInt(tb, y0, tb + 6 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    const yl = r.y[r.y.length - 1];
    return {
      tEnd: r.tEnd,
      y: yl,
      ei: r.stopEvent && r.stopEvent.name === "EI",
      rvp: vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]),
      res: r,
    };
  };
  // --- TEI targeting: (1) epoch that points the return at Earth, (2) Δv magnitude giving the right
  // landing longitude (Earth rotation), (3) Newton on [dv_t, dv_r, dv_n, epoch] for [γ_EI, cross-range, along-track]
  const dv0 = (() => {
    const s = resState(orbRes, tTEInom),
      sel = seleno(tTEInom, s);
    const rr = vnorm(sel.r);
    return Math.sqrt(0.82 + (2 * MU_M) / rr) - vnorm(sel.v);
  })();
  const kRefTEI = moonOrbitNormal(tTEInom);
  const hTgtTEI = Math.sqrt(MU_E * rvpT * 1.98);
  const evalTEI = (tb, x) => {
    // x = [dv_t, dv_r, dv_n] in selenocentric local frame
    const s = resState(orbRes, tb),
      sel = seleno(tb, s);
    const e1 = vunit(sel.v);
    const e2 = vunit(vsub(vunit(sel.r), vscale(e1, vdot(vunit(sel.r), e1))));
    const e3 = vcross(e1, e2);
    const dvv = vadd(
      vadd(vscale(e1, x[0]), vscale(e2, x[1])),
      vscale(e3, x[2]),
    );
    const y0 = Array.from(s);
    y0[3] += dvv[0];
    y0[4] += dvv[1];
    y0[5] += dvv[2];
    const r = cisInt(tb, y0, tb + 6 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
    const yl = r.y[r.y.length - 1],
      rr = [yl[0], yl[1], yl[2]],
      vv = [yl[3], yl[4], yl[5]];
    const ei = !!(r.stopEvent && r.stopEvent.name === "EI");
    const out = {
      ei,
      tEnd: r.tEnd,
      rvp: vacPerigee(rr, vv),
      dvv,
      rEI: rr,
      vEI: vv,
      hk:
        (Math.sign(vdot(vcross(rr, vv), kRefTEI)) || 1) * vnorm(vcross(rr, vv)),
    };
    if (ei) {
      const tl = r.tEnd + tEntryDur,
        sd = siteE(tl),
        h = vunit(vcross(rr, vv));
      out.fpa = fpaDeg(rr, vv);
      out.cross = Math.asin(clamp(vdot(h, sd), -1, 1)) * RAD;
      out.along =
        (Math.atan2(vdot(vcross(vunit(rr), sd), h), vdot(vunit(rr), sd)) -
          thetaRange) *
        RAD;
    }
    return out;
  };
  // geographic landing error helper: landing point = EI point carried downrange by the entry range
  const geoErr = (o) => {
    // returns {cross, along} in degrees using RA/Dec of the landing point
    const tl = o.tEnd + tEntryDur;
    const L = vrot(vunit(o.rEI), vunit(vcross(o.rEI, o.vEI)), thetaRange);
    const Le = eclToEq(L),
      dec = Math.asin(clamp(Le[2], -1, 1)) * RAD,
      ra = Math.atan2(Le[1], Le[0]) * RAD;
    const raSite = gmst(tl) * RAD + splash.lon;
    return {
      cross: dec - splash.lat,
      along: wrapPi((raSite - ra) * DEG) * RAD,
    };
  };
  const evalTEI2 = (tb, x) => {
    const o = evalTEI(tb, x);
    if (o.ei) {
      Object.assign(o, geoErr(o));
    }
    return o;
  };
  let bestT = null;
  for (let tb = tTEInom - per * 0.5; tb <= tTEInom + per * 0.5; tb += 150) {
    const o = evalTEI(tb, [dv0, 0, 0]);
    const back = o.ei || o.tEnd - tb < 6 * 24 * H - 60;
    const sc =
      Math.abs(o.rvp - rvpT) +
      (back ? 0 : 1e6) +
      (Math.abs(o.tEnd - tb - tReturn) / H) * 10;
    if (!bestT || sc < bestT.sc) bestT = { tb, sc, o };
  }
  let tTEI = bestT.tb;
  {
    const g = goldenMin(
      (tb) => {
        const o = evalTEI(tb, [dv0, 0, 0]);
        return (
          Math.abs(o.rvp - rvpT) +
          (o.ei || o.tEnd - tb < 6 * 24 * H - 60 ? 0 : 1e6)
        );
      },
      tTEI - 150,
      tTEI + 150,
      14,
    );
    tTEI = g.x;
  }
  // tangential TEI; the burn epoch controls the entry corridor (vacuum perigee), the magnitude controls return time
  const hSign = Math.sign(evalTEI(tTEI, [dv0, 0, 0]).hk) || 1;
  // g(tb) = signed |h| of the return conic minus its target; only trajectories that come back count
  const gTb = (tb, dvt) => {
    const o = evalTEI(tb, [dvt, 0, 0]);
    const back = o.ei || o.tEnd - tb < 6 * 24 * H - 60;
    return back ? o.hk - hSign * hTgtTEI : NaN;
  };
  const tbSolve = (dvt, tbG) => {
    // bracket the root near tbG on a 100-s grid, then Illinois regula falsi
    const xs = [],
      gs = [];
    for (let k = -6; k <= 6; k++) {
      xs.push(tbG + k * 100);
      gs.push(gTb(tbG + k * 100, dvt));
    }
    let best = null;
    for (let i = 0; i < xs.length - 1; i++) {
      if (
        !isFinite(gs[i]) ||
        !isFinite(gs[i + 1]) ||
        Math.sign(gs[i]) === Math.sign(gs[i + 1])
      )
        continue;
      if (Math.abs(gs[i] - gs[i + 1]) > 3 * hTgtTEI) continue; // discontinuity, not a root
      const d = Math.abs(xs[i] + 50 - tbG);
      if (!best || d < best.d)
        best = { d, a: xs[i], b: xs[i + 1], ga: gs[i], gb: gs[i + 1] };
    }
    if (!best) return null;
    let { a, b, ga, gb } = best,
      side = 0,
      x = a;
    for (let k = 0; k < 14; k++) {
      x = b - (gb * (b - a)) / (gb - ga);
      const gx = gTb(x, dvt);
      if (!isFinite(gx)) return null;
      if (Math.abs(gx) < 40 || Math.abs(b - a) < 0.5) return x;
      if (Math.sign(gx) === Math.sign(gb)) {
        b = x;
        gb = gx;
        if (side === -1) ga /= 2;
        side = -1;
      } else {
        a = x;
        ga = gx;
        if (side === 1) gb /= 2;
        side = 1;
      }
    }
    return x;
  };
  let dvBest = dv0,
    roots = [];
  {
    // continuation in Δv from dv0, upward then downward, following the root tb(dv)
    const seq = [];
    const walk = (dir, n) => {
      let tbg = tTEI;
      for (let k = 0; k <= n; k++) {
        const dv = dv0 + dir * k * 0.02;
        if (dir < 0 && k === 0) continue;
        const tb = tbSolve(dv, tbg);
        if (globalThis.DEBUG) {
          const oo = tb == null ? null : evalTEI2(tb, [dv, 0, 0]);
          console.log(
            "TEIscan",
            dv.toFixed(3),
            tb == null ? "tb-fail" : (tb - tTEI).toFixed(0) + "s",
            oo && oo.ei,
            oo && oo.along && oo.along.toFixed(1),
            oo && ((oo.tEnd - tb) / 3600).toFixed(1),
            oo && oo.rvp.toFixed(0),
          );
        }
        if (tb == null) break;
        tbg = tb;
        const o = evalTEI2(tb, [dv, 0, 0]);
        if (!o.ei) break;
        seq.push({ dv, tb, o });
      }
    };
    walk(1, 20);
    walk(-1, 4);
    seq.sort((p, q) => p.dv - q.dv);
    for (let i = 0; i + 1 < seq.length; i++) {
      const p = seq[i],
        q = seq[i + 1];
      if (q.dv - p.dv > 0.021) continue;
      if (
        Math.sign(p.o.along) !== Math.sign(q.o.along) &&
        Math.abs(p.o.along - q.o.along) < 90
      ) {
        const f = p.o.along / (p.o.along - q.o.along);
        roots.push({
          dv: p.dv + f * (q.dv - p.dv),
          tb: p.tb + f * (q.tb - p.tb),
          tof:
            p.o.tEnd + f * (q.o.tEnd - p.o.tEnd) - (p.tb + f * (q.tb - p.tb)),
        });
      }
    }
  }
  let tb0 = tTEI;
  if (roots.length) {
    roots.sort((a, b) => Math.abs(a.tof - tReturn) - Math.abs(b.tof - tReturn));
    dvBest = roots[0].dv;
    tb0 = roots[0].tb;
  }
  const Ftei = (x) => {
    const o = evalTEI2(tb0 + x[1] * 100, [x[0], 0, 0]);
    if (!o.ei) return [(o.rvp - rvpT) / 30, 0];
    return [(o.fpa - (entryCfg.fpa ?? -6.5)) * 2, o.along];
  };
  let solT = newtonSolve(Ftei, [dvBest, 0], {
    h: 1e-5,
    tol: 0.01,
    maxIt: 20,
    maxStep: 0.5,
  });
  let dvnT = 0;
  {
    // optional: also null the cross-range (landing latitude) with an out-of-plane component, if affordable
    const F3 = (x) => {
      const o = evalTEI2(tb0 + x[1] * 100, [x[0], 0, x[2]]);
      if (!o.ei) return [(o.rvp - rvpT) / 30, 0, 0];
      return [(o.fpa - (entryCfg.fpa ?? -6.5)) * 2, o.along, o.cross];
    };
    const s3 = newtonSolve(F3, [solT.x[0], solT.x[1], 0], {
      h: 1e-5,
      tol: 0.02,
      maxIt: 20,
      maxStep: 0.25,
    });
    const dvA = Math.hypot(s3.x[0], s3.x[2]);
    if (globalThis.DEBUG)
      console.log("TEI cross", s3.norm, s3.x, dvA, solT.x[0]);
    if (s3.ok && dvA < solT.x[0] * 1.3) {
      solT = { ...solT, x: [s3.x[0], s3.x[1]], ok: true };
      dvnT = s3.x[2];
    }
  }
  tTEI = tb0 + solT.x[1] * 100;
  solT.x = [solT.x[0], 0, dvnT, 0];
  if (globalThis.DEBUG)
    console.log("TEI", {
      dv0,
      dvBest,
      roots: roots.map((r) => [r.dv.toFixed(4), (r.tof / 3600).toFixed(1)]),
      norm: solT.norm,
      hist: solT.hist.map((v) => +v.toFixed(3)),
      x: solT.x,
    });
  if (!solT.ok)
    M.notes.push(
      "TEI targeting converged approximately; the return correction trims the remainder.",
    );
  tTEI += solT.x[3] * 100;
  const xT3 = [solT.x[0], solT.x[1], solT.x[2]];
  const sT = resState(orbRes, tTEI),
    selT = seleno(tTEI, sT);
  const dvTEIvec = evalTEI(tTEI, xT3).dvv;
  const epsTEI = (() => {
    const vv = vadd(selT.v, dvTEIvec);
    return vdot(vv, vv) / 2 - MU_M / vnorm(selT.r);
  })();
  const DT =
    propForDv(sT[6], vnorm(dvTEIvec), orbEng.isp) /
    (orbEng.thrust / (orbEng.isp * G0));
  const fbE = finiteBurn({
    tCenter: tTEI,
    startState: (tt) => Array.from(resState(orbRes, tt)),
    engine: orbEng,
    dirLaw: (tI, y0) => localDirLaw(selT.r, selT.v, vunit(dvTEIvec), "moon"),
    D0: DT,
    metric: (ye, te) => energySel(te, ye) - epsTEI,
    maxProp: P.tankOf(orbEngId).propLeft,
  });
  {
    const resC = cisInt(t, y, fbE.tIgn, {});
    ship.add(resToSeg(resC, "lunar orbit"));
  }
  M.phase(
    tLOIend - (cfg.loi?.circ ? 4 * H : 0),
    fbE.tIgn,
    "Lunar orbit",
    "#43aa8b",
  );
  ship.add(
    resToSeg(fbE.res, "trans-Earth injection", { stage: orbEngId }, fbE.burn),
  );
  const uE = fbE.res.y[0][6] - fbE.res.y[fbE.res.y.length - 1][6];
  P.tankOf(orbEngId).propLeft -= uE;
  const dE = dvForProp(fbE.res.y[0][6], uE, orbEng.isp) * 1000;
  M.burn({
    name: "TEI — trans-Earth injection",
    t: fbE.tIgn,
    dur: fbE.D,
    dv: dE,
    engine: orbEng.name,
    isp: orbEng.isp,
    prop: uE,
    m0: fbE.res.y[0][6],
    obj: "ship",
    propType: orbEng.prop,
  });
  M.ev(
    fbE.tIgn,
    "ship",
    "Trans-Earth injection",
    `${EXPLAIN.tei} ${fmtDur(fbE.D)} burn, Δv ${dE.toFixed(0)} m/s.`,
    "burn",
  );
  if (fbE.short)
    M.warnings.push(
      "Insufficient propellant for trans-Earth injection — the crew would be stranded in lunar orbit.",
    );
  t = fbE.res.tEnd;
  y = Array.from(fbE.res.y[fbE.res.y.length - 1]);
  return finishReturn(
    M,
    cfg,
    SC,
    P,
    ship,
    t0,
    t,
    y,
    ref,
    rvpT,
    progress,
    fbE.tIgn,
  );
}
// --------------------------------------------------------------------------
// return coast → MCC → CM/SM sep → entry → splashdown
const crewOf = (cfg) => (cfg.crew || 0) > 0;
function finishReturn(
  M,
  cfg,
  SC,
  P,
  ship,
  t0,
  t,
  y,
  ref,
  rvpT,
  progress,
  tDepart,
) {
  const H = 3600,
    entryCfg = cfg.entry || {},
    splash = cfg.splash;
  const capsuleId = SC.capsule;
  const tEntryDur = ref ? ref.dur : 800,
    thetaRange = ref ? ref.range : 0.35;
  const siteE = (tt) =>
    vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
  progress("Return coast & entry targeting…");
  const tMcc = t + (cfg.returnMccAfter ?? 15) * H;
  const r0 = cisInt(t, y, tMcc, {});
  ship.add(resToSeg(r0, "transearth coast"));
  t = r0.tEnd;
  y = Array.from(r0.y[r0.y.length - 1]);
  const run = (dv) => {
    const y0 = [...y];
    y0[3] += dv[0];
    y0[4] += dv[1];
    y0[5] += dv[2];
    return cisInt(tMcc, y0, tMcc + 8 * 24 * H, {
      events: [evEI(), evPerigee(80000)],
      rtol: 1e-9,
      atol: 1e-6,
      hmax: 3600,
    });
  };
  const geoE = (rr, vv, tEI) => {
    const tl = tEI + tEntryDur;
    const Lp = vrot(vunit(rr), vunit(vcross(rr, vv)), thetaRange);
    const Le = eclToEq(Lp);
    const ra = Math.atan2(Le[1], Le[0]) * RAD,
      dec = Math.asin(clamp(Le[2], -1, 1)) * RAD;
    return {
      along: wrapPi((gmst(tl) * RAD + splash.lon - ra) * DEG) * RAD,
      cross: dec - splash.lat,
    };
  };
  const F = (dv) => {
    const r = run(dv);
    const yl = r.y[r.y.length - 1],
      rr = [yl[0], yl[1], yl[2]],
      vv = [yl[3], yl[4], yl[5]];
    if (!(r.stopEvent && r.stopEvent.name === "EI"))
      return [(vacPerigee(rr, vv) - rvpT) / 30, 0];
    const g = geoE(rr, vv, r.tEnd);
    return [(fpaDeg(rr, vv) - (entryCfg.fpa ?? -6.5)) * 2, g.along];
  };
  let sol = newtonSolve(F, [0, 0, 0], {
    h: 2e-6,
    tol: 0.01,
    maxIt: 16,
    maxStep: 0.03,
  });
  if (!sol.ok || vnorm(sol.x) > 0.05) {
    const F1 = (dv) => [F(dv)[0]];
    sol = newtonSolve(F1, [0, 0, 0], {
      h: 2e-6,
      tol: 0.01,
      maxIt: 16,
      maxStep: 0.03,
    });
    M.notes.push(
      "Return correction trims only the entry angle; the splashdown point follows from the return trajectory.",
    );
  }
  const dvm = sol.x,
    mag = vnorm(dvm) * 1000;
  const engId = cfg.lifeboat || SC.prop.orbiter;
  let pm = { prop: 0, dur: 0, engine: "—", isp: 0 };
  if (P.mods[engId] && P.mods[engId].attached)
    pm = P.burn(engId, y[6], mag / 1000);
  M.burn({
    name: "MCC — return correction",
    t: tMcc,
    dur: pm.dur,
    dv: mag,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: y[6],
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tMcc,
    "ship",
    "Return mid-course correction",
    `Fine-tunes the entry corridor: the flight-path angle at entry must be ≈ ${(entryCfg.fpa ?? -6.5).toFixed(1)}° (too steep → excessive g and heating; too shallow → skip back out). Δv ${mag.toFixed(1)} m/s.`,
    "burn",
    { dv: mag },
  );
  y[3] += dvm[0];
  y[4] += dvm[1];
  y[5] += dvm[2];
  y[6] -= pm.prop;
  const rEI = cisInt(tMcc, y, tMcc + 8 * 24 * H, { events: [evEI()] });
  if (!rEI.stopEvent) {
    ship.add(resToSeg(rEI, "transearth coast"));
    M.warnings.push("The return trajectory misses the atmosphere.");
    M.finalize();
    return M;
  }
  const tEI = rEI.stopEvent.t;
  // CM/SM separation 15 min before EI
  const tSep = tEI - (cfg.smSepBeforeEI ?? 15) * 60;
  ship.add(
    new SampleSeg(
      "earth",
      integToSamples(resUntil(rEI, tSep), () => ({
        phase: "transearth coast",
      })),
    ),
  );
  const yS = resState(rEI, tSep);
  const capM = P.massOf([capsuleId]);
  if (SC.orbiter && SC.orbiter.length > 1) {
    const sm = M.addObj(
      new MObject("sm", cfg.smName || "Service module", {
        kind: "stage",
        model: SC.model,
        color: "#aaa",
      }),
    );
    sm.setConfig(tSep, "sc", { key: "sc", sc: SC.model, parts: ["service"] });
    const rs = cisInt(
      tSep,
      [
        yS[0],
        yS[1],
        yS[2],
        yS[3] - (0.0015 * yS[3]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[4] - (0.0015 * yS[4]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[5] - (0.0015 * yS[5]) / Math.hypot(yS[3], yS[4], yS[5]),
        yS[6] - capM,
      ],
      tSep + 3 * H,
      {
        events: [
          {
            name: "burnup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 70),
          },
        ],
      },
    );
    sm.add(resToSeg(rs, "service module (burns up on entry)"));
    sm.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["service"],
      damaged: !!cfg.lifeboat,
    });
  }
  M.ev(
    tSep,
    "ship",
    cfg.smSepName || "Crew module / service module separation",
    cfg.smSepDesc ||
      "Only the capsule with its heat shield will enter the atmosphere; the service module burns up.",
    "sep",
  );
  if (cfg.lifeboat) {
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["capsule", "lander"],
    });
    const tLm = tEI - (cfg.lifeboatJettisonBeforeEI ?? 1.18) * H;
    const yLm = resState(rEI, tLm);
    const lm = M.addObj(
      new MObject("lifeboat", cfg.lifeboatName || "Lunar Module (lifeboat)", {
        kind: "stage",
        model: SC.model,
        color: "#b9a3ff",
      }),
    );
    lm.setConfig(tLm, "sc", { key: "sc", sc: SC.model, parts: ["lander"] });
    const rl = cisInt(
      tLm,
      [
        yLm[0],
        yLm[1],
        yLm[2],
        yLm[3] * 0.99995,
        yLm[4] * 0.99995,
        yLm[5] * 0.99995,
        P.massOf(SC.lander),
      ],
      tLm + 3 * H,
      {
        events: [
          {
            name: "burnup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 70),
          },
        ],
      },
    );
    lm.add(resToSeg(rl, "LM jettisoned — burns up over the Pacific"));
    M.ev(
      tLm,
      "ship",
      cfg.lifeboatJettisonName || "Lifeboat jettison",
      cfg.lifeboatJettisonDesc ||
        "The crew climbs back into the command module and releases the lunar module.",
      "sep",
    );
    ship.setConfig(tLm, "capsule", { key: "capsule", sc: SC.model });
  } else ship.setConfig(tSep, "capsule", { key: "capsule", sc: SC.model });
  const rC = cisInt(
    tSep,
    [yS[0], yS[1], yS[2], yS[3], yS[4], yS[5], capM],
    tEI + 60,
    { events: [evEI()] },
  );
  ship.add(resToSeg(rC, "final approach"));
  const yE = rC.stopEvent ? rC.stopEvent.y : rC.y[rC.y.length - 1];
  const tE = rC.stopEvent ? rC.stopEvent.t : rC.tEnd;
  const vEI = vnorm(
    vsub(
      [yE[3], yE[4], yE[5]],
      vcross(bodyOmegaEcl("earth", tE), [yE[0], yE[1], yE[2]]),
    ),
  );
  M.ev(
    tE,
    "ship",
    "Entry interface (122 km)",
    `${EXPLAIN.entry} Speed ${Math.hypot(yE[3], yE[4], yE[5]).toFixed(2)} km/s, flight-path angle ${fpaDeg([yE[0], yE[1], yE[2]], [yE[3], yE[4], yE[5]]).toFixed(2)}°.`,
    "entry",
  );
  // ---------------- entry with bank-angle targeting ----------------
  progress("Atmospheric entry…");
  const cap = SC.modules[capsuleId];
  const entryRun = (bank, bank2) =>
    simulateEntry({
      body: "earth",
      t0: tE,
      r0: [yE[0], yE[1], yE[2]],
      v0: [yE[3], yE[4], yE[5]],
      m0: capM,
      diam: cap.heat.diam,
      cd: cap.heat.cd,
      LD: cap.heat.LD,
      rn: cap.heat.rn,
      bank,
      bank2,
      skip: !!entryCfg.skip,
      chutes: cap.heat.chutes,
      maxTime: entryCfg.skip ? 6000 : 3000,
    });
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], splash.lat, splash.lon) * R_E;
  let best = null;
  const gLim = crewOf(cfg) ? 7.0 : 12;
  const cost = (e) =>
    missF(e) + Math.max(0, e.maxG - gLim) * 400 + (e.landed ? 0 : 5000);
  for (let b = 0; b <= 120; b += 7.5) {
    const e = entryRun(b, b + 20);
    const d = cost(e);
    if (!best || d < best.d) best = { b, d, e };
  }
  const g = goldenMin(
    (b) => cost(entryRun(b, b + 20)),
    Math.max(0, best.b - 7.5),
    Math.min(140, best.b + 7.5),
    18,
  );
  const ent = entryRun(g.x, g.x + 20);
  ship.add(new SampleSeg("earth", ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Stagnation heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm² (Sutton–Graves estimate). The ablative heat shield chars and erodes, carrying the heat away.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(1)} g — the crew is pressed into their couches.`,
    "gload",
  );
  ship.setConfig(ent.samples.find((s) => s.chute >= 1)?.t ?? ent.t, "capsule", {
    key: "capsule",
    sc: SC.model,
    chutes: 1,
  });
  const tMain = ent.samples.find((s) => s.chute >= 2)?.t;
  if (tMain)
    ship.setConfig(tMain, "capsule", {
      key: "capsule",
      sc: SC.model,
      chutes: 2,
    });
  const miss = missF(ent);
  M.ev(
    ent.t,
    "ship",
    cfg.splashName || "Splashdown",
    `${cfg.splashDesc || EXPLAIN.splash} Landing point ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(0)} km from the planned recovery area (${splash.name || "recovery zone"}).`,
    "landing",
  );
  ship.add(
    new SurfaceSeg(
      "earth",
      ent.t,
      ent.t + 2 * H,
      ent.ll[0],
      ent.ll[1],
      0,
      capM,
      { extra: { phase: "recovery" } },
    ),
  );
  M.phase(tDepart, tE, "Return to Earth", "#f15bb5");
  M.phase(tE, ent.t, "Entry & splashdown", "#ff5d5d");
  M.summary.entry = {
    vEI,
    maxG: ent.maxG,
    maxHeat: ent.maxHeat,
    miss,
    ll: ent.ll,
    bank: g.x,
  };
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
function finishFlyby(
  M,
  cfg,
  SC,
  P,
  ship,
  t0,
  tMcc,
  y,
  rpMoonT,
  rvpT,
  ref,
  scripted,
  progress,
) {
  const H = 3600;
  let t = tMcc;
  // integrate to perilune
  let res = cisInt(t, y, t + 8 * 24 * H, { events: [evPerilune()] });
  const tPeri = res.stopEvent ? res.stopEvent.t : res.tEnd;
  const sel = seleno(tPeri, res.stopEvent.y);
  for (let i = 0; i < res.t.length; i++) {
    const m = moonGeo(res.t[i]).r;
    if (
      vnorm(vsub([res.y[i][0], res.y[i][1], res.y[i][2]], m)) < BODIES.moon.soi
    ) {
      M.ev(
        res.t[i],
        "ship",
        "Lunar sphere of influence",
        EXPLAIN.soiMoon,
        "soi",
      );
      break;
    }
  }
  M.phase(
    M.burns.find((b) => b.name.startsWith("TLI"))?.t ?? tMcc,
    tPeri - 4 * H,
    "Translunar coast",
    "#9b5de5",
  );
  // scripted events (Apollo 13) before perilune: explosion / DPS burn
  let yCur = y;
  for (const e of scripted.filter((e) => e.met && t0 + e.met * H < tPeri)) {
    if (e.kind === "emergency")
      M.ev(t0 + e.met * H, "ship", e.name, e.desc, "emergency", {
        fx: "venting",
      });
  }
  const dpsBurn = scripted.find((e) => e.type === "freeReturnBurn");
  if (dpsBurn) {
    const tb = t0 + dpsBurn.met * H;
    const rr = cisInt(t, y, tb, {});
    ship.add(resToSeg(rr, "translunar coast (hybrid trajectory)"));
    t = rr.tEnd;
    yCur = Array.from(rr.y[rr.y.length - 1]);
    const runFR = (dv) => {
      const y0 = [...yCur];
      y0[3] += dv[0];
      y0[4] += dv[1];
      y0[5] += dv[2];
      const r1 = cisInt(t, y0, t + 6 * 24 * H, {
        events: [evPerilune()],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
      if (!r1.stopEvent) return [1e3, 1e3];
      const sp = seleno(r1.stopEvent.t, r1.stopEvent.y);
      const r2 = cisInt(
        r1.stopEvent.t,
        r1.stopEvent.y,
        r1.stopEvent.t + 7 * 24 * H,
        { events: [evPerigee(), evEI()], rtol: 1e-9, atol: 1e-6, hmax: 3600 },
      );
      const yl = r2.y[r2.y.length - 1];
      return [
        (vnorm(sp.r) - rpMoonT) / 50,
        (vacPerigee([yl[0], yl[1], yl[2]], [yl[3], yl[4], yl[5]]) - rvpT) / 50,
      ];
    };
    const so = newtonSolve(runFR, [0, 0, 0], {
      h: 2e-6,
      tol: 2e-3,
      maxIt: 20,
      maxStep: 0.1,
    });
    const mag = vnorm(so.x) * 1000,
      engId = dpsBurn.engine || SC.prop.lander;
    const pm = P.burn(engId, yCur[6], mag / 1000);
    M.burn({
      name: dpsBurn.name,
      t,
      dur: pm.dur,
      dv: mag,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: yCur[6],
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      t,
      "ship",
      dpsBurn.name,
      `${dpsBurn.desc} Δv ${mag.toFixed(1)} m/s.`,
      "burn",
    );
    yCur[3] += so.x[0];
    yCur[4] += so.x[1];
    yCur[5] += so.x[2];
    yCur[6] -= pm.prop;
  }
  const segStart = t;
  res = cisInt(t, yCur, t + 8 * 24 * H, { events: [evPerilune()] });
  const tP = res.stopEvent.t,
    yP = res.stopEvent.y,
    sP = seleno(tP, yP);
  const altP = vnorm(sP.r) - R_MOON;
  const dEarthMax = (() => {
    let m = 0,
      tm = tP;
    const r2 = cisInt(
      tP - 6 * H,
      Array.from(resState(res, tP - 6 * H)),
      tP + 6 * H,
      {},
    );
    for (let i = 0; i < r2.t.length; i++) {
      const d = Math.hypot(r2.y[i][0], r2.y[i][1], r2.y[i][2]);
      if (d > m) {
        m = d;
        tm = r2.t[i];
      }
    }
    return { m, tm };
  })();
  ship.add(resToSeg(res, "lunar flyby approach"));
  t = tP;
  yCur = Array.from(yP);
  M.ev(
    tP - 0.6 * H,
    "ship",
    "Loss of signal (behind the Moon)",
    "The Moon blocks the radio path to Earth.",
    "los",
  );
  M.ev(
    tP,
    "ship",
    "Closest approach to the Moon",
    `${EXPLAIN.freeReturn} Altitude ${altP.toFixed(0)} km above the far side, speed relative to the Moon ${vnorm(sP.v).toFixed(2)} km/s.`,
    "flyby",
  );
  M.ev(
    dEarthMax.tm,
    "ship",
    "Maximum distance from Earth",
    `${Math.round(dEarthMax.m).toLocaleString()} km from Earth’s centre (${Math.round(dEarthMax.m - R_E).toLocaleString()} km above the surface).`,
    "record",
  );
  for (const e of scripted.filter((e) => e.when === "flyby"))
    M.ev(tP + (e.dt || 0) * H, "ship", e.name, e.desc, e.kind || "info");
  M.summary.flyby = { alt: altP, maxDist: dEarthMax.m };
  // optional post-perilune burn (Apollo 13 PC+2): targets return
  const pc2 = scripted.find((e) => e.type === "pc2");
  let tDepart = tP;
  if (pc2) {
    const tb = tP + pc2.dt * H;
    const rr = cisInt(t, yCur, tb, {});
    ship.add(resToSeg(rr, "leaving the Moon"));
    t = rr.tEnd;
    yCur = Array.from(rr.y[rr.y.length - 1]);
    // solve prograde-ish burn targeting splashdown at given time
    const splash = cfg.splash,
      entryCfg = cfg.entry || {};
    const tEntryDur = ref.dur,
      thetaRange = ref.range;
    const siteE = (tt) =>
      vunit(sitePosEcl("earth", splash.lat, splash.lon, 0, tt));
    const tEIgoal = t0 + pc2.eiMET * H;
    const run = (dv) => {
      const y0 = [...yCur];
      y0[3] += dv[0];
      y0[4] += dv[1];
      y0[5] += dv[2];
      return cisInt(t, y0, t + 6 * 24 * H, {
        events: [evEI(), evPerigee(80000)],
        rtol: 1e-9,
        atol: 1e-6,
        hmax: 3600,
      });
    };
    const Fp = (dv) => {
      const r = run(dv);
      const yl = r.y[r.y.length - 1],
        rr2 = [yl[0], yl[1], yl[2]],
        vv = [yl[3], yl[4], yl[5]];
      if (!(r.stopEvent && r.stopEvent.name === "EI"))
        return [
          (vacPerigee(rr2, vv) - rvpT) / 30,
          (r.tEnd - tEIgoal) / 3600,
          0,
        ];
      return [
        (fpaDeg(rr2, vv) - (entryCfg.fpa ?? -6.5)) * 2,
        (r.tEnd - tEIgoal) / 3600,
        Math.asin(
          clamp(vdot(vunit(vcross(rr2, vv)), siteE(r.tEnd + tEntryDur)), -1, 1),
        ) * RAD,
      ];
    };
    const vdir = vunit(vsub(yCur.slice(3, 6), moonGeo(t).v));
    const x0 = vscale(vdir, pc2.dvGuess / 1000);
    const sol = newtonSolve(Fp, x0, {
      h: 2e-6,
      tol: 0.02,
      maxIt: 18,
      maxStep: 0.1,
    });
    const dvv = sol.x,
      mag = vnorm(dvv) * 1000;
    const engId = pc2.engine || SC.prop.lander;
    const pm = P.burn(engId, yCur[6], mag / 1000);
    M.burn({
      name: pc2.name,
      t,
      dur: pm.dur,
      dv: mag,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: yCur[6],
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      t,
      "ship",
      pc2.name,
      `${pc2.desc} Δv ${mag.toFixed(0)} m/s, ${fmtDur(pm.dur)} burn.`,
      "burn",
    );
    yCur[3] += dvv[0];
    yCur[4] += dvv[1];
    yCur[5] += dvv[2];
    yCur[6] -= pm.prop;
    tDepart = t;
  }
  // continue home
  M.phase(tP - 4 * H, tP + 4 * H, "Lunar flyby", "#43aa8b");
  return finishReturn(
    M,
    cfg,
    SC,
    P,
    ship,
    t0,
    t,
    yCur,
    ref,
    rvpT,
    progress,
    tP + 4 * H,
  );
}
// --------------------------------------------------------------------------
// LANDING: undock, DOI, powered descent, surface stay, ascent, rendezvous
function doLanding(M, cfg, SC, P, ship, t0, getState, setState, progress) {
  const H = 3600;
  let { t, y } = getState();
  const site = cfg.landing,
    mu = MU_M;
  const landerIds = SC.lander,
    ascIds = SC.ascender || [],
    orbIds = SC.orbiter;
  const dsId = SC.prop.lander,
    asId = SC.prop.ascender;
  const tUndock =
    cfg.undockMET != null
      ? t0 + cfg.undockMET * H
      : t + (cfg.orbitsBeforeDescent ?? 10) * 2 * H;
  const tPDInom = cfg.pdiMET != null ? t0 + cfg.pdiMET * H : tUndock + 2.3 * H;
  progress("Lunar orbit: planning descent…");
  // orbit propagation through landing window
  const oRes = cisInt(t, y, tPDInom + 6 * H, {});
  const per = 2 * Math.PI * Math.sqrt(Math.pow(vnorm(seleno(t, y).r), 3) / mu);
  // range angle of the powered descent (estimate from lander T/W)
  const mLander = P.massOf(landerIds),
    eng = P.engineOf(dsId);
  const aAvg = eng.thrust / (mLander * 0.8) / 1000;
  const vPDI = Math.sqrt(mu / (R_MOON + 15)) * 1.005;
  const thetaPDI = clamp((vPDI * vPDI) / (2 * aAvg * 0.72) / R_MOON, 0.12, 0.6);
  const tDescEst = vPDI / (aAvg * 0.72) + 60;
  // find PDI time: orbiter angle to site (in-plane) equals thetaPDI
  const phi = (tt) => {
    const s = resState(oRes, tt),
      sel = seleno(tt, s);
    const u = vunit(sel.r),
      h = vunit(vcross(sel.r, sel.v));
    let sp = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt + tDescEst));
    sp = vunit(vsub(sp, vscale(h, vdot(sp, h))));
    return Math.atan2(vdot(vcross(u, sp), h), vdot(u, sp));
  };
  let tPDI = null,
    bestD = Infinity;
  for (let tt = tPDInom - per * 1.1; tt < tPDInom + per * 1.1; tt += 15) {
    const a = phi(tt) - thetaPDI,
      b = phi(tt + 15) - thetaPDI;
    if (a > 0 && b <= 0 && Math.abs(a - b) < 1) {
      const tr = tt + (15 * a) / (a - b);
      if (Math.abs(tr - tPDInom) < bestD) {
        bestD = Math.abs(tr - tPDInom);
        tPDI = tr;
      }
    }
  }
  if (!tPDI) tPDI = tPDInom;
  // DOI half an orbit earlier (Hohmann to 15 km perilune)
  const tDOI = tPDI - (per / 2) * 0.985;
  const tUnd = Math.min(tUndock, tDOI - 0.6 * H);
  // coast to undock (whole stack)
  {
    const r = cisInt(t, y, tUnd, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  const mL = P.massOf(landerIds);
  const lander = M.addObj(
    new MObject("lander", cfg.landerName || "Lander", {
      crew: cfg.landerCrew || 0,
      model: SC.model,
      color: "#b9a3ff",
      primary: false,
    }),
  );
  lander.setConfig(tUnd, "sc", { key: "sc", sc: SC.model, parts: ["lander"] });
  ship.setConfig(tUnd, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
  M.ev(
    tUnd,
    "lander",
    cfg.undockName || "Undocking",
    cfg.undockDesc ||
      "The lander separates from the orbiter. One crew member (or the orbiter) stays in lunar orbit.",
    "sep",
  );
  let yL = [...y];
  yL[6] = mL;
  y[6] -= mL;
  // lander: coast to DOI, burn
  {
    const r = cisInt(t, yL, tDOI, {});
    lander.add(resToSeg(r, "lunar orbit (separated)"));
    yL = Array.from(r.y[r.y.length - 1]);
  }
  const sD = seleno(tDOI, yL),
    rD = vnorm(sD.r),
    aN = (rD + R_MOON + (cfg.pdiAlt ?? 15)) / 2;
  const vN = Math.sqrt(mu * (2 / rD - 1 / aN));
  const vt = vunit(vsub(sD.v, vscale(vunit(sD.r), vdot(sD.v, vunit(sD.r)))));
  const dvDOIvec = vsub(vscale(vt, vN), sD.v);
  const pD = P.burn(dsId, yL[6], vnorm(dvDOIvec));
  M.burn({
    name: "DOI — descent orbit insertion",
    t: tDOI,
    dur: pD.dur,
    dv: vnorm(dvDOIvec) * 1000,
    engine: pD.engine,
    isp: pD.isp,
    prop: pD.prop,
    m0: yL[6],
    obj: "lander",
    propType: pD.propType,
  });
  M.ev(
    tDOI,
    "lander",
    "Descent orbit insertion",
    `A ${(vnorm(dvDOIvec) * 1000).toFixed(0)} m/s retro burn lowers the perilune to ~${cfg.pdiAlt ?? 15} km, half an orbit ahead, where powered descent will begin.`,
    "burn",
  );
  yL[3] += dvDOIvec[0];
  yL[4] += dvDOIvec[1];
  yL[5] += dvDOIvec[2];
  yL[6] -= pD.prop;
  const rP = cisInt(tDOI, yL, tDOI + per, { events: [evPerilune(5000)] });
  lander.add(resToSeg(rP, "descent orbit"));
  const tP = rP.stopEvent ? rP.stopEvent.t : tPDI;
  const yP = rP.stopEvent ? rP.stopEvent.y : rP.y[rP.y.length - 1];
  const sP = seleno(tP, yP);
  // powered descent: search tgo
  progress("Powered descent & landing…");
  const engD = P.engineOf(dsId),
    dryLimit = yP[6] - P.tankOf(dsId).propLeft;
  const sDir = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tP + tDescEst));
  const rangeKm = vangle(sP.r, sDir) * R_MOON;
  let bestD2 = null;
  for (const k of [0.95, 1.05, 1.15, 1.25, 1.35, 1.5]) {
    const tgo = ((2 * rangeKm) / vnorm(sP.v)) * k;
    const d = simulateDescent({
      body: "moon",
      t0: tP,
      r0: sP.r,
      v0: sP.v,
      m0: yP[6],
      Tmax: engD.thrust,
      isp: engD.isp,
      minThr: engD.minThr ?? 0.1,
      lat: site.lat,
      lon: site.lon,
      elev: site.elev || 0,
      tgo,
      dryLimit,
    });
    const sc = (d.landed ? 0 : 1e6) + d.miss * 50 + d.propUsed;
    if (!bestD2 || sc < bestD2.sc) bestD2 = { sc, d, tgo };
  }
  const D = bestD2.d;
  P.tankOf(dsId).propLeft -= D.propUsed;
  const dvPD = dvForProp(yP[6], D.propUsed, engD.isp) * 1000;
  M.burn({
    name: "Powered descent",
    t: tP,
    dur: D.t - tP,
    dv: dvPD,
    engine: engD.name,
    isp: engD.isp,
    prop: D.propUsed,
    m0: yP[6],
    obj: "lander",
    propType: engD.prop,
  });
  // convert seleno samples to SampleSeg with ref 'moon'
  lander.add(
    new SampleSeg(
      "moon",
      D.samples.map((s) => ({
        ...s,
        phase: s.phase === "landed" ? "touchdown" : "powered descent",
      })),
      { phase: "powered descent" },
    ),
  );
  M.ev(
    tP,
    "lander",
    "Powered descent initiation",
    `${EXPLAIN.pdi} Starting ${Math.round(rangeKm)} km uprange at ${(vnorm(sP.r) - R_MOON).toFixed(1)} km altitude.`,
    "burn",
  );
  for (const e of D.events) M.ev(e.t, "lander", e.name, e.desc, e.kind);
  if (!D.landed) {
    M.warnings.push("Powered descent failed to land.");
    M.failed = "landing";
    return false;
  }
  const tLand = D.t;
  const ll = D.ll;
  M.summary.landing = { t: tLand, ll, miss: D.miss, dv: dvPD };
  M.phase(tUnd, tLand, "Descent", "#ffb703");
  // surface stay
  const stay = (cfg.surfaceStay ?? 21.6) * H;
  const tLiftNom =
    cfg.ascentMET != null ? t0 + cfg.ascentMET * H : tLand + stay;
  const mOnSurf = yP[6] - D.propUsed;
  for (const e of (cfg.scripted || []).filter((e) => e.when === "surface"))
    M.ev(
      e.afterLanding != null ? tLand + e.afterLanding * H : t0 + e.met * H,
      "lander",
      e.name,
      e.desc,
      e.kind || "info",
    );
  if (cfg.profile === "lunar-landing-oneway") {
    lander.add(
      new SurfaceSeg(
        "moon",
        tLand,
        tLand + 3 * 24 * H,
        ll[0],
        ll[1],
        site.elev || 0,
        mOnSurf,
      ),
    );
    lander.setConfig(tLand, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      landed: true,
    });
    const r = cisInt(t, y, tLand + 3 * 24 * H, {});
    ship.add(resToSeg(r, "lunar orbit"));
    M.phase(tLand, tLand + 3 * 24 * H, "Surface operations", "#ffd166");
    setState(r.tEnd, Array.from(r.y[r.y.length - 1]));
    return true;
  }
  // orbiter coasts; check plane for ascent (lunar orbit plane change if needed)
  progress("Surface stay, ascent & rendezvous…");
  let oR = cisInt(t, y, tLiftNom + 8 * H, {});
  const asDesc = SC.modules[SC.prop.ascender] || {};
  // choose liftoff time: orbiter phase lead ~ 15–25° at insertion
  const perO = per;
  const leadAt = (tt) => {
    const s = resState(oR, tt + 430),
      sel = seleno(tt + 430, s),
      h = vunit(vcross(sel.r, sel.v));
    let site0 = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tt));
    site0 = vunit(vsub(site0, vscale(h, vdot(site0, h))));
    const ins = vrot(site0, h, 9 * DEG);
    return Math.atan2(
      vdot(vcross(ins, vunit(sel.r)), h),
      vdot(ins, vunit(sel.r)),
    );
  };
  let tLift = tLiftNom,
    bL = Infinity;
  for (let tt = tLiftNom - perO * 1.2; tt < tLiftNom + perO * 1.2; tt += 20) {
    const a = leadAt(tt) - 18 * DEG,
      b = leadAt(tt + 20) - 18 * DEG;
    if (a < 0 && b >= 0 && Math.abs(a - b) < 1) {
      const tr = tt + (20 * -a) / (b - a);
      if (Math.abs(tr - tLiftNom) < bL) {
        bL = Math.abs(tr - tLiftNom);
        tLift = tr;
      }
    }
  }
  // plane change of orbiter if site is out of plane at liftoff
  const sAtLift = seleno(tLift, resState(oR, tLift));
  const hO = vunit(vcross(sAtLift.r, sAtLift.v)),
    sDirL = vunit(sitePosEcl("moon", site.lat, site.lon, 0, tLift));
  const outAng = Math.asin(clamp(vdot(hO, sDirL), -1, 1));
  if (Math.abs(outAng) > 0.25 * DEG) {
    const hN = vunit(vsub(hO, vscale(sDirL, vdot(hO, sDirL))));
    const node = vunit(vcross(hO, hN));
    // find node crossing ~ half to one orbit before liftoff
    let tNode = null;
    for (let tt = tLift - 1.6 * perO; tt < tLift - 0.3 * perO; tt += 20) {
      const a = vdot(vunit(seleno(tt, resState(oR, tt)).r), vcross(hO, node)),
        b = vdot(
          vunit(seleno(tt + 20, resState(oR, tt + 20)).r),
          vcross(hO, node),
        );
      if (a * b <= 0) {
        tNode = tt + (20 * a) / (a - b);
      }
    }
    if (tNode) {
      const r = cisInt(t, y, tNode, {});
      ship.add(resToSeg(r, "lunar orbit"));
      t = r.tEnd;
      y = Array.from(r.y[r.y.length - 1]);
      const sN = seleno(t, y);
      const ang = Math.acos(clamp(vdot(hO, hN), -1, 1));
      const sgn = vdot(vcross(hO, hN), vunit(sN.r)) > 0 ? 1 : -1;
      const vNew = vrot(sN.v, vunit(sN.r), sgn * ang);
      const dvp = vsub(vNew, sN.v);
      const pmp = P.burn(SC.prop.orbiter, y[6], vnorm(dvp));
      M.burn({
        name: "Orbit plane change (orbiter)",
        t,
        dur: pmp.dur,
        dv: vnorm(dvp) * 1000,
        engine: pmp.engine,
        isp: pmp.isp,
        prop: pmp.prop,
        m0: y[6],
        obj: "ship",
        propType: pmp.propType,
      });
      M.ev(
        t,
        "ship",
        "Orbiter plane change",
        `The Moon rotated under the orbit during the surface stay. A ${(vnorm(dvp) * 1000).toFixed(0)} m/s burn swings the orbit plane by ${(ang * RAD).toFixed(2)}° so it passes over the landing site at liftoff.`,
        "burn",
      );
      y[3] += dvp[0];
      y[4] += dvp[1];
      y[5] += dvp[2];
      y[6] -= pmp.prop;
      oR = cisInt(t, y, tLiftNom + 30 * H, {});
    }
  }
  const sL2 = seleno(tLift, resState(oR, tLift));
  const hTarget = vunit(vcross(sL2.r, sL2.v));
  // lander: on surface
  lander.add(
    new SurfaceSeg("moon", tLand, tLift, ll[0], ll[1], site.elev || 0, mOnSurf),
  );
  lander.setConfig(tLand, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["lander"],
    landed: true,
    tLand,
  }); // (a lander that works on the surface times it from tLand)
  M.phase(tLand, tLift, "Surface operations", "#ffd166");
  // descent stage stays forever
  const dsObj = M.addObj(
    new MObject(
      "descent-stage",
      cfg.dsName || "Descent stage (left on surface)",
      { kind: "stage", model: SC.model, color: "#d4a017", trail: false },
    ),
  );
  dsObj.setConfig(tLift, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["descent"],
    landed: true,
  });
  dsObj.add(
    new SurfaceSeg(
      "moon",
      tLift,
      tLift + 60 * 24 * H,
      ll[0],
      ll[1],
      site.elev || 0,
      P.massOf([dsId]),
    ),
  );
  // ascent
  const engA = P.engineOf(asId),
    tankA = P.tankOf(asId);
  const ascStack = {
    name: "Ascent",
    payload: 0,
    stages: [
      {
        id: "AS",
        name: P.mods[asId].name,
        prop: "hypergolic",
        engine: engA.name,
        n: 1,
        thrustSL: engA.thrust,
        thrustVac: engA.thrust,
        ispSL: engA.isp,
        ispVac: engA.isp,
        dry: P.massOf(ascIds) - tankA.propLeft + (cfg.samples || 0),
        propMass: tankA.propLeft,
        propLeft: tankA.propLeft,
        attached: true,
        ignited: false,
        geom: [[3, 2, 2, "#888"]],
      },
    ],
    jettison: [],
  };
  const hp = cfg.ascentOrbit?.hp ?? 17,
    ha = cfg.ascentOrbit?.ha ?? 83;
  const AS = simulateAscent({
    body: "moon",
    t0: tLift,
    lat: ll[0],
    lon: ll[1],
    stack: ascStack,
    target: { normal: hTarget, hp, ha },
    vert: 10,
    kick: 5,
    closedLoopAt: 12,
    dt: 0.2,
    maxTime: 1200,
    sampleDt: 1,
  });
  if (!AS.ok) {
    M.warnings.push("Lunar ascent failed to reach orbit.");
  }
  const usedA = tankA.propLeft - AS.stack.stages[0].propLeft;
  tankA.propLeft -= usedA;
  const dvA =
    dvForProp(
      ascStack.stages[0].dry + ascStack.stages[0].propMass,
      usedA,
      engA.isp,
    ) * 1000;
  M.burn({
    name: "Lunar ascent",
    t: tLift,
    dur: AS.t - tLift,
    dv: dvA,
    engine: engA.name,
    isp: engA.isp,
    prop: usedA,
    m0: ascStack.stages[0].dry + ascStack.stages[0].propMass,
    obj: "lander",
    propType: engA.prop,
  });
  const ascObj = lander; // continue same object
  ascObj.setConfig(tLift, "sc", { key: "sc", sc: SC.model, parts: ["ascent"] });
  ascObj.add(
    new SampleSeg(
      "moon",
      AS.samples.map((s) => ({ ...s, phase: "lunar ascent" })),
      { phase: "ascent" },
    ),
  );
  M.ev(
    tLift,
    "lander",
    cfg.liftoffName || "Lunar liftoff",
    `${EXPLAIN.ascent} Δv ≈ ${dvA.toFixed(0)} m/s to reach orbit; ascent lasts ${fmtDur(AS.t - tLift)}.`,
    "launch",
  );
  M.ev(
    AS.t,
    "lander",
    "Lunar orbit insertion (ascent)",
    `Orbit ${AS.hpAch.toFixed(0)} × ${AS.haAch.toFixed(0)} km — below and behind the orbiter.`,
    "insertion",
  );
  // rendezvous: lander geocentric state
  const tI = AS.t;
  const gI = geoFromSeleno(tI, AS.r, AS.v);
  let yA = [...gI.r, ...gI.v, AS.m];
  const minDelay = (cfg.rendezvousMinDelay ?? 0.6) * H;
  const oR2 = cisInt(t, y, tI + minDelay + 30 * H, {});
  const lR = cisInt(tI, yA, tI + minDelay + 30 * H, {});
  let best = null;
  const perA =
    2 * Math.PI * Math.sqrt(Math.pow(R_MOON + (hp + ha) / 2, 3) / mu);
  for (let tt = tI + minDelay; tt < tI + minDelay + 26 * H; tt += 60) {
    const a = seleno(tt, resState(lR, tt));
    const tof = 0.37 * perA;
    const b = seleno(tt + tof, resState(oR2, tt + tof));
    const Lb = lambert(a.r, b.r, tof, mu, vunit(vcross(a.r, a.v)));
    if (!Lb) continue;
    const tot = vnorm(vsub(Lb.v1, a.v)) + vnorm(vsub(b.v, Lb.v2));
    if (!best || tot < best.tot) best = { tt, tof, tot, Lb, a, b };
    if (best && tt > best.tt + 1.2 * perA && best.tot < 0.08) break;
  }
  const tTPI = best.tt,
    tDock = best.tt + best.tof;
  ascObj.add(resToSeg(resUntil(lR, tTPI), "catch-up orbit"));
  const dv1 = vsub(best.Lb.v1, best.a.v);
  const yT = Array.from(resState(lR, tTPI));
  yT[3] += dv1[0];
  yT[4] += dv1[1];
  yT[5] += dv1[2];
  const pT = P.burn(asId, yT[6], vnorm(dv1));
  yT[6] -= pT.prop;
  M.burn({
    name: "Terminal phase initiation (rendezvous)",
    t: tTPI,
    dur: pT.dur,
    dv: vnorm(dv1) * 1000,
    engine: pT.engine,
    isp: pT.isp,
    prop: pT.prop,
    m0: yT[6] + pT.prop,
    obj: "lander",
    propType: pT.propType,
  });
  M.ev(
    tTPI,
    "lander",
    "Terminal phase initiation",
    `${EXPLAIN.rendezvous} Intercept burn ${(vnorm(dv1) * 1000).toFixed(1)} m/s; arrival in ${fmtDur(best.tof)}.`,
    "burn",
  );
  const rT = cisInt(tTPI, yT, tDock, {});
  ascObj.add(resToSeg(rT, "rendezvous transfer"));
  const dv2 = vnorm(vsub(best.b.v, best.Lb.v2));
  const pB = P.burn(asId, rT.y[rT.y.length - 1][6], dv2);
  M.burn({
    name: "Braking & docking",
    t: tDock,
    dur: pB.dur,
    dv: dv2 * 1000,
    engine: pB.engine,
    isp: pB.isp,
    prop: pB.prop,
    m0: rT.y[rT.y.length - 1][6],
    obj: "lander",
    propType: pB.propType,
  });
  M.ev(
    tDock,
    "ship",
    cfg.dockName || "Docking",
    cfg.dockDesc ||
      "The ascent vehicle docks with the orbiter; crew and samples transfer.",
    "dock",
  );
  // orbiter coasts up to docking
  {
    const r = cisInt(t, y, tDock, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  ship.setConfig(tDock, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["orbiter", "ascent"],
  });
  // jettison ascent stage after crew transfer
  const tJet = tDock + (cfg.ascJettisonAfter ?? 2.1) * H;
  {
    const r = cisInt(t, y, tJet, {});
    ship.add(resToSeg(r, "lunar orbit"));
    t = r.tEnd;
    y = Array.from(r.y[r.y.length - 1]);
  }
  const mAsc = rT.y[rT.y.length - 1][6] - pB.prop;
  const jet = M.addObj(
    new MObject(
      "ascent-stage",
      cfg.ascStageName || "Ascent stage (jettisoned)",
      { kind: "stage", model: SC.model, color: "#999" },
    ),
  );
  jet.setConfig(tJet, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["ascent"],
    dock: true,
  }); // (Chang'e 5 releases its docking and support modules with the ascender)
  {
    const yJ = [...y];
    yJ[3] += 0.0006 * vunit(y.slice(3, 6))[0];
    yJ[6] = mAsc;
    const r = cisInt(tJet, yJ, tJet + 30 * H, { events: [evLunarImpact()] });
    jet.add(resToSeg(r, "jettisoned"));
  }
  ship.setConfig(tJet, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["orbiter"],
    dock: false,
  });
  M.ev(
    tJet,
    "ship",
    cfg.ascJettisonName || "Ascent stage jettison",
    "The empty ascent vehicle is released.",
    "sep",
  );
  y[6] = P.massOf(orbIds) + (cfg.samples || 0);
  setState(t, y);
  M.phase(tLift, tDock, "Ascent & rendezvous", "#06d6a0");
  return true;
}

// ---- interplanetary.js
// ============================================================================
// interplanetary.js — Mars & gravity-assist missions (patched conics, B-plane targeting)
// Profiles: mars-flyby, mars-orbit, mars-landing (direct entry), mars-orbit-landing,
//           mars-landing-return, mars-orbit-return, mars-flyby-return, multi-flyby
// Trajectory is continuous: planet-centred hyperbola ⇄ heliocentric conic at the sphere of influence.
// ============================================================================
const MU_SUN = BODIES.sun.mu;
function soiOf(b) {
  return BODIES[b].soi || 1e6;
}
// time (s) after the current state until |r| reaches R (outbound, hyperbolic or elliptic), Kepler
function timeToRadius(r, v, mu, R, outbound = true) {
  const el = rv2coe(r, v, mu);
  const e = el.e,
    a = el.a;
  if (e > 1) {
    const cF = (1 - R / a) / e;
    if (cF < 1) return null;
    const F1 = Math.acosh(cF) * (outbound ? 1 : -1);
    const nu0 = el.nu > Math.PI ? el.nu - TAU : el.nu;
    const F0 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu0 / 2));
    const n = Math.sqrt(mu / (-a * a * a));
    const M0 = e * Math.sinh(F0) - F0,
      M1 = e * Math.sinh(F1) - F1;
    return (M1 - M0) / n;
  }
  // ellipse: first crossing of radius R (in either direction) within one period
  const P = el.period,
    rad = (tt) => vnorm(kepProp(r, v, tt, mu).r) - R;
  const s0 = Math.sign(rad(1e-3));
  const N = 720;
  let prev = 1e-3,
    fp = rad(prev);
  for (let i = 1; i <= N; i++) {
    const tt = (P * i) / N,
      f = rad(tt);
    if (Math.sign(f) !== Math.sign(fp)) {
      let lo = prev,
        hi = tt;
      for (let k = 0; k < 80; k++) {
        const m = 0.5 * (lo + hi);
        if (Math.sign(rad(m)) === Math.sign(fp)) lo = m;
        else hi = m;
      }
      return 0.5 * (lo + hi);
    }
    prev = tt;
    fp = f;
  }
  return null;
}
function timeToPeri(r, v, mu) {
  // time from state to periapsis (negative if periapsis is behind)
  const el = rv2coe(r, v, mu);
  let nu = el.nu > Math.PI ? el.nu - TAU : el.nu;
  return -timeSincePeri(el.e, el.a, nu, mu);
}
// heliocentric coast: find time of entry into target SOI after tStart, within [tStart, tMax]
function findSOIEntry(t0, rH, vH, target, tGuess, tMax) {
  const R = soiOf(target);
  const d = (t) => {
    const s = kepProp(rH, vH, t - t0, MU_SUN);
    return vnorm(vsub(s.r, bodyPos(target, t))) - R;
  };
  // coarse scan around guess
  const step = 3 * 3600;
  let a = Math.max(t0 + 60, tGuess - 40 * 86400),
    fa = d(a);
  for (let t = a + step; t <= Math.min(tMax, tGuess + 40 * 86400); t += step) {
    const ft = d(t);
    if (fa > 0 && ft <= 0) {
      let lo = t - step,
        hi = t;
      for (let k = 0; k < 60; k++) {
        const m = 0.5 * (lo + hi);
        if (d(m) > 0) lo = m;
        else hi = m;
      }
      return 0.5 * (lo + hi);
    }
    fa = ft;
    a = t;
  }
  return null;
}
// minimum distance to target in a window (for diagnostics / misses)
function closestApproachHelio(t0, rH, vH, target, ta, tb) {
  const f = (t) => {
    const s = kepProp(rH, vH, t - t0, MU_SUN);
    return vnorm(vsub(s.r, bodyPos(target, t)));
  };
  let best = { t: ta, d: f(ta) };
  const st = (tb - ta) / 400;
  for (let t = ta; t <= tb; t += st) {
    const dd = f(t);
    if (dd < best.d) best = { t, d: dd };
  }
  const g = goldenMin(f, best.t - st, best.t + st, 40);
  return { t: g.x, d: g.f };
}
// position miss vector (km) at time tArr of the heliocentric conic after SOI exit, w.r.t. target centre
function centreMiss(tB, rRel, vRel, depBody, target, tArr) {
  const muD = BODIES[depBody].mu,
    dtx = timeToRadius(rRel, vRel, muD, soiOf(depBody));
  if (dtx == null) return [1e9, 1e9, 1e9];
  const sX = kepProp(rRel, vRel, dtx, muD),
    pD = planetHelio(depBody, tB + dtx);
  const s = kepProp(
    vadd(pD.r, sX.r),
    vadd(pD.v, sX.v),
    tArr - (tB + dtx),
    MU_SUN,
  );
  return vsub(s.r, bodyPos(target, tArr));
}
// propagate from planet-relative departure state (after burn) through SOI exit → heliocentric → target SOI entry
function patchedLeg(tB, rRel, vRel, depBody, target, tArrGuess) {
  const muD = BODIES[depBody].mu;
  const dtx = timeToRadius(rRel, vRel, muD, soiOf(depBody));
  if (dtx == null) return null;
  const tX = tB + dtx,
    sX = kepProp(rRel, vRel, dtx, muD);
  const pD = planetHelio(depBody, tX);
  const rH = vadd(pD.r, sX.r),
    vH = vadd(pD.v, sX.v);
  const tE = findSOIEntry(
    tX,
    rH,
    vH,
    target,
    tArrGuess,
    tArrGuess + 120 * 86400,
  );
  if (tE == null) return { tX, rH, vH, miss: true };
  const sE = kepProp(rH, vH, tE - tX, MU_SUN),
    pT = planetHelio(target, tE);
  const rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v);
  const muT = BODIES[target].mu;
  const bv = bVector(rT, vT, muT);
  const tp = tE + timeToPeri(rT, vT, muT);
  const elT = rv2coe(rT, vT, muT);
  return { tX, rH, vH, tE, rT, vT, bv, tp, rp: elT.rp, el: elT };
}
// same but starting heliocentric (after a flyby or TCM)
function patchedHelio(t0, rH, vH, target, tArrGuess) {
  const tE = findSOIEntry(
    t0,
    rH,
    vH,
    target,
    tArrGuess,
    tArrGuess + 120 * 86400,
  );
  if (tE == null) return { miss: true };
  const sE = kepProp(rH, vH, tE - t0, MU_SUN),
    pT = planetHelio(target, tE);
  const rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v),
    muT = BODIES[target].mu;
  return {
    tE,
    rT,
    vT,
    bv: bVector(rT, vT, muT),
    tp: tE + timeToPeri(rT, vT, muT),
    rp: rv2coe(rT, vT, muT).rp,
  };
}
function bPlaneAxes(S) {
  const k = [0, 0, 1];
  const T = vunit(vcross(S, k));
  return { T, R: vcross(S, T) };
}
// arrival design for direct entry / landing at a surface site
function entryGeometry(
  body,
  vinfVec,
  rEI,
  fpaDeg_,
  thetaRange,
  Tentry,
  site,
  tLandGuess,
  win = 0.55 * 86400,
) {
  const mu = BODIES[body].mu,
    vinf = vnorm(vinfVec),
    S = vunit(vinfVec);
  const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI),
    g = fpaDeg_ * DEG;
  const h = rEI * vEI * Math.cos(g),
    e = Math.sqrt(1 + (vinf * vinf * h * h) / (mu * mu)),
    p = (h * h) / mu;
  const rp = p / (1 + e),
    nuInf = Math.acos(-1 / e);
  const nuEI = -Math.acos(clamp((p / rEI - 1) / e, -1, 1));
  const beta = nuInf + nuEI + thetaRange; // angle from incoming position direction (-S) to landing point
  const sDir = (t) =>
    vunit(sitePosEcl(body, site.lat, site.lon, site.elev || 0, t));
  const f = (t) => vdot(sDir(t), vscale(S, -1)) - Math.cos(beta);
  let best = null;
  const st = 300;
  for (let t = tLandGuess - win; t < tLandGuess + win; t += st) {
    const a = f(t),
      b = f(t + st);
    if (a * b <= 0) {
      const r = bisectRoot(f, t, t + st, 50);
      if (
        r != null &&
        (!best || Math.abs(r - tLandGuess) < Math.abs(best - tLandGuess))
      )
        best = r;
    }
  }
  let tLand = best,
    approx = false;
  if (tLand == null) {
    // latitude not reachable: take the closest approach
    const gm = goldenMin(
      (t) => Math.abs(f(t)),
      tLandGuess - win,
      tLandGuess + win,
      60,
    );
    tLand = gm.x;
    approx = true;
  }
  const sd = sDir(tLand);
  let hh = vunit(vcross(vscale(S, -1), sd));
  if (vnorm(hh) < 1e-9) hh = vperp(S);
  // time from EI to periapsis on hyperbola
  const a = -mu / (vinf * vinf);
  const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nuEI / 2));
  const tEItoP = -(e * Math.sinh(F) - F) / Math.sqrt(mu / (-a * a * a));
  const tEI = tLand - Tentry;
  return {
    tLand,
    tEI,
    tp: tEI + tEItoP,
    hhat: hh,
    rp,
    e,
    B: vscale(vunit(vcross(S, hh)), bFromRp(rp, vinf, mu)),
    approx,
    beta,
  };
}
// reference EDL to get entry range & duration
function marsEntryRef(SC, P, vEI, fpa, bank) {
  const edl = SC.edl,
    R = surfaceRadius("mars");
  const r0 = [R + 125, 0, 0],
    v0 = [vEI * Math.sin(fpa * DEG), vEI * Math.cos(fpa * DEG), 0];
  const res = runMarsEDL(
    SC,
    P,
    0,
    r0,
    v0,
    bank,
    { lat: 0, lon: 0, elev: 0 },
    true,
  );
  return { range: vangle(r0, res.r), dur: res.t, res };
}
function entryMassOf(SC, P) {
  return P.massOf(SC.entry || SC.orbiter);
}
function runMarsEDL(SC, P, t0, r0, v0, bank, site, refOnly) {
  const edl = SC.edl,
    mE = SC.entry
      ? P.massOf(SC.entry)
      : P.massOf(SC.orbiter) +
        (P.upper && P.upper.attached ? P.upper.dry + P.upper.propLeft : 0);
  const landId = SC.prop.lander;
  const eng = landId
    ? P.engineOf(landId)
    : SC.usesUpperStage
      ? { thrust: 3 * 2.3e6, isp: 330, minThr: 0.4 }
      : null;
  const opt = {
    body: "mars",
    t0,
    r0,
    v0,
    m0: mE,
    diam: edl.diam,
    cd: edl.cd,
    LD: edl.LD,
    rn: edl.rn,
    bank,
    siteElev: site.elev || 0,
    maxTime: 2400,
  };
  if (edl.propulsive) {
    opt.propulsiveLanding = { ignAlt: 9, bellyCdA: 1.0 * 9 * 50 };
    opt.land = { Tmax: eng.thrust, isp: eng.isp, minThr: 0.08 };
  } else {
    opt.edl = edl;
    opt.heatshieldMass =
      edl.heatshieldMass ??
      (SC.modules.AEROSHELL
        ? 440
        : SC.modules.CAPS
          ? SC.modules.CAPS.dry * 0.45
          : 300);
    opt.backshellMass =
      edl.backshellMass ??
      (SC.modules.AEROSHELL
        ? SC.modules.AEROSHELL.dry - 440
        : SC.modules.CAPS
          ? SC.modules.CAPS.dry * 0.55
          : 300);
    opt.land = { Tmax: eng.thrust, isp: eng.isp, minThr: eng.minThr || 0.1 };
  }
  return simulateEntry(opt);
}
// A Mars entry capsule's shells once they let go: the entry vehicle without its heat shield, the platform or descent stage
// inside showing (and a trim wing out, edl.trimWing, from when it swung out); the heat shield falling away and the
// backshell coming down on its parachute, each through the air from where it let go to where it lies.
function shellParts(M, SC, ship, ent, site, tEnd) {
  const edl = SC.edl,
    sc = SC.model,
    elev = site.elev || 0,
    at = (n) => ent.events.find((e) => e.name === n),
    trim = edl.trimWing ? { trim: 1 } : {};
  const hs = at("Heat shield separation"),
    bs = at("Backshell separation · powered descent"),
    tw = at("Trim wing deploys");
  if (tw)
    ship.setConfig(tw.t, "sc", {
      key: "sc",
      sc,
      parts: ["aeroshell"],
      trimT: tw.t,
    });
  if (hs)
    ship.setConfig(hs.t, "sc", {
      key: "sc",
      sc,
      parts: ["aeroshell"],
      chute: 1,
      hs: false,
      hsT: hs.t,
      ...trim,
    });
  const fall = (id, name, e, m, diam, cd, part, chute) => {
    if (!e) return;
    const f = simulateEntry({
      body: "mars",
      t0: e.t,
      r0: e.r,
      v0: e.v,
      m0: m,
      diam,
      cd,
      LD: 0,
      rn: diam / 2,
      siteElev: elev,
      maxTime: 900,
    });
    const smp = f.samples.map((x) => ({
      ...x,
      phase: `${name.toLowerCase()}${chute ? " on its parachute" : ", falling"}`,
    }));
    if (f.t > smp[smp.length - 1].t)
      smp.push({ ...smp[smp.length - 1], t: f.t, r: f.r, v: f.v }); // down to the ground itself
    const o = M.addObj(
      new MObject(id, name, {
        kind: "debris",
        model: sc,
        color: "#9aa3ad",
        trail: false,
      }),
    );
    o.setConfig(e.t, "sc", {
      key: "sc",
      sc,
      parts: [part],
      ...(chute ? { chute: 1 } : {}),
    });
    o.add(new SampleSeg("mars", smp, { m }));
    if (f.landed) {
      o.setConfig(f.t, "sc", { key: "sc", sc, parts: [part], rest: true });
      o.add(
        new SurfaceSeg("mars", f.t, tEnd, f.ll[0], f.ll[1], elev, m, {
          extra: { phase: "on the ground" },
        }),
      );
    }
  };
  const shell = SC.modules.AEROSHELL || SC.modules.CAPS,
    mHS = edl.heatshieldMass ?? (SC.modules.AEROSHELL ? 440 : shell.dry * 0.45);
  fall(
    "heatshield",
    "Heat shield",
    hs,
    mHS,
    edl.diam,
    1.0,
    "heatshield",
    false,
  );
  fall(
    "backshell",
    "Backshell",
    bs,
    edl.backshellMass ?? shell.dry - mHS,
    edl.chute.diam,
    0.62,
    "backshell",
    true,
  ); // the parachute's drag, and a little of the backshell's
}
// Mars 2020's landing in its parts (edl.skycrane). The configurations the app shows the entry vehicle in, from the heat
// shield's going to the rover's lowering (app/33_mars2020.js), and the parts that go their own ways: the heat shield and
// the backshell (shellParts); and the descent stage, once the rover is down, flying off: a second's hover, a climb, a turn to 45° from the
// vertical and thrust (2.2 g here) for as long as it takes to come down edl.flyaway metres away along the ground track.
// It is not seen after it hits the ground.
function skyCraneParts(M, SC, ship, ent, site, mDS, tEnd) {
  const edl = SC.edl,
    sc = SC.model,
    R = surfaceRadius("mars"),
    elev = site.elev || 0,
    at = (n) => ent.events.find((e) => e.name === n);
  const sky = at("Sky crane");
  shellParts(M, SC, ship, ent, site, tEnd);
  if (sky)
    ship.setConfig(sky.t, "sc", {
      key: "sc",
      sc,
      parts: ["lander"],
      powered: true,
      skyT: sky.t,
    });
  // the descent stage's flight in the site's own frame (metres along the ground track and up; m/s; thrust in m/s²; tilt)
  const g = (BODIES.mars.mu / (R * R)) * 1000,
    aT = 2.2 * g;
  const fly = (tb) => {
    const out = [];
    let x = 0,
      z = edl.hang,
      vx = 0,
      vz = 0;
    for (let k = 0; k < 6000; k++) {
      const s = k * 0.05,
        th = clamp((s - 2.5) / 1.5, 0, 1) * 45 * DEG,
        a = s < 1 ? g : s < 2.5 ? g + 4 : s < 2.5 + tb ? aT : 0;
      out.push([s, x, z, vx, vz, a, th]);
      if (z < 0) break;
      vx += a * Math.sin(th) * 0.05;
      vz += (a * Math.cos(th) - g) * 0.05;
      x += vx * 0.05;
      z += vz * 0.05;
    }
    return out;
  };
  let lo = 0,
    hi = 30;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2,
      p = fly(mid);
    if (p[p.length - 1][1] < edl.flyaway) lo = mid;
    else hi = mid;
  }
  const path = fly((lo + hi) / 2);
  const pd =
      ent.samples.find((x) => x.phase === "powered descent") || ent.samples[0],
    ll0 = subPointLL("mars", pd.r, pd.t),
    cl = Math.cos(ent.ll[0] * DEG);
  let he = (ent.ll[1] - ll0[1]) * cl,
    hn = ent.ll[0] - ll0[0];
  const hl = Math.hypot(he, hn);
  if (hl > 1e-9) {
    he /= hl;
    hn /= hl;
  } else {
    he = 1;
    hn = 0;
  } // heading: on along the ground track
  const W = vunit(bodyOmegaEcl("mars", ent.t)),
    t0 = ent.t;
  const pos = (x, z, t) =>
    sitePosEcl(
      "mars",
      ent.ll[0] + ((x * hn) / (R * 1000)) * RAD,
      ent.ll[1] + ((x * he) / (R * 1000 * cl)) * RAD,
      elev + z / 1000,
      t,
    );
  const smp = [],
    idx = [];
  for (let i = 0; i < path.length - 1; i += 5) idx.push(i);
  idx.push(path.length - 1); // every quarter second, and the impact
  for (const i of idx) {
    const [s, x, z, vx, vz, a, th] = path[i],
      t = t0 + s,
      r = pos(x, Math.max(z, 0), t),
      h = 0.01;
    const v = vscale(
      vsub(
        pos(x + vx * h, z + vz * h, t + h),
        pos(x - vx * h, z - vz * h, t - h),
      ),
      1 / (2 * h),
    );
    const U = vunit(r),
      E = vunit(vcross(W, U)),
      N = vcross(U, E),
      H = vadd(vscale(E, he), vscale(N, hn));
    smp.push({
      t,
      r,
      v,
      m: mDS,
      T: a * mDS,
      thrDir:
        a > 0
          ? vunit(vadd(vscale(H, Math.sin(th)), vscale(U, Math.cos(th))))
          : null,
      phase: "descent stage flyaway",
      alt: z / 1000,
    });
  }
  const ds = M.addObj(
    new MObject("ds", "Descent stage", {
      kind: "stage",
      model: sc,
      color: "#aaa",
    }),
  );
  ds.setConfig(t0, "sc", { key: "sc", sc, parts: ["descentstage"] });
  ds.add(new SampleSeg("mars", smp, { m: mDS }));
  M.ev(
    t0 + 1,
    "ds",
    "Descent stage flyaway",
    "The bridles are cut; the descent stage throttles up and flies off at 45°, clear of the rover.",
    "powered",
  );
  M.ev(
    smp[smp.length - 1].t,
    "ds",
    "Descent stage impact",
    `The descent stage comes down about ${edl.flyaway} m from the rover.`,
    "info",
  );
}
function earthEntryGeneric(SC, P, t0, r0, v0, m, bank) {
  if (SC.usesUpperStage) {
    const e = SC.edl,
      mm = m ?? P.massOf(SC.orbiter) + P.upper.dry + P.upper.propLeft;
    return simulateEntry({
      body: "earth",
      t0,
      r0,
      v0,
      m0: mm,
      diam: e.diam,
      cd: e.cd,
      LD: e.LD,
      rn: e.rn,
      bank,
      maxTime: 4000,
      propulsiveLanding: { ignAlt: 2.5, bellyCdA: 1.0 * 9 * 50 },
      land: { Tmax: 3 * 2.3e6, isp: 327, minThr: 0.08 },
    });
  }
  const cap = SC.modules[SC.capsule];
  return earthEntryRun(cap, t0, r0, v0, m ?? P.massOf([SC.capsule]), bank);
}
function earthEntryRun(cap, t0, r0, v0, m, bank, chutes) {
  return simulateEntry({
    body: "earth",
    t0,
    r0,
    v0,
    m0: m,
    diam: cap.heat.diam,
    cd: cap.heat.cd,
    LD: cap.heat.LD,
    rn: cap.heat.rn,
    bank,
    chutes: chutes ?? cap.heat.chutes,
    maxTime: 4000,
  });
}
// --------------------------------------------------------------------------
function planInterplanetary(cfg, progress = () => {}) {
  const M = new Mission(cfg);
  const H = 3600,
    D = 86400;
  const L = LAUNCHERS[cfg.launcher],
    SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  if (cfg.payloadMass && SC.modules.CARGO)
    SC.modules.CARGO.dry = cfg.payloadMass;
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site];
  const t0 = M.t0,
    crew = cfg.crew || 0;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const legs = cfg.legs; // [{body:'mars', t:'ISO', type:'flyby'|'arrive'}, ...]
  // ---------------- heliocentric design (Lambert legs) ----------------
  progress("Interplanetary trajectory design (Lambert)…");
  const tDep =
    t0 + (cfg.refill ? cfg.refill.days * D : 0) + (cfg.tmiDelay ?? 1.0) * H;
  const nodes = [
    { body: "earth", t: tDep },
    ...legs.map((l) => ({ ...l, t: isoToT(l.t) })),
  ];
  const lam = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = planetHelio(nodes[i].body, nodes[i].t),
      b = planetHelio(nodes[i + 1].body, nodes[i + 1].t);
    const sol = lambert(
      a.r,
      b.r,
      nodes[i + 1].t - nodes[i].t,
      MU_SUN,
      [0, 0, 1],
    );
    lam.push({
      v1: sol.v1,
      v2: sol.v2,
      vinfOut: vsub(sol.v1, a.v),
      vinfIn: vsub(sol.v2, b.v),
    });
  }
  for (let i = 1; i < nodes.length - 1; i++)
    if (nodes[i].type === "flyby") nodes[i].vinfNext = lam[i].vinfOut;
  const vinfDep = lam[0].vinfOut,
    C3 = vdot(vinfDep, vinfDep);
  M.summary.design = {
    C3,
    vinfDep: vnorm(vinfDep),
    legs: lam.map((l, i) => ({
      to: nodes[i + 1].body,
      vinfIn: vnorm(l.vinfIn),
      vinfOut: vnorm(l.vinfOut),
    })),
  };
  // ---------------- launch plane contains departure asymptote ----------------
  const pl =
    cfg.launchAz != null
      ? {
          n: planeNormalFromAzRel("earth", S.lat, S.lon, t0, cfg.launchAz).n,
          az: cfg.launchAz,
        }
      : planeThroughSite("earth", S.lat, S.lon, t0, vunit(vinfDep));
  M.notes.push(
    `Launch azimuth ${pl.az.toFixed(1)}° — the parking orbit plane contains the outgoing asymptote (declination ${(Math.asin(eclToEq(vunit(vinfDep))[2]) * RAD).toFixed(1)}°), so the departure burn needs no plane change.`,
  );
  progress("Launch & ascent…");
  const scMass0 = scTotalMass(SC);
  const LP = launchPhase(M, cfg, L, scMass0, pl.n, { ship });
  if (!LP.ok) {
    M.warnings.push("The launch vehicle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  P.attachUpper(asc.upper, asc.upperProp);
  let mass = asc.m;
  ship.setConfig(asc.t, "stack", {
    key: "stack",
    parts: ["upper", "sc-stowed"],
    launcher: cfg.launcher,
    stage: L.stages.length - 1,
    sc: SC.model,
  });
  let t = asc.t,
    r = asc.r,
    v = asc.v;
  // optional: orbital refilling (Starship)
  if (cfg.refill) {
    const tR = t + cfg.refill.days * D;
    ship.add(
      new ConicSeg("earth", t, tR, r, v, mass, {
        extra: { phase: "low Earth orbit — propellant transfer" },
      }),
    );
    const s2 = kepProp(r, v, tR - t, MU_E);
    r = s2.r;
    v = s2.v;
    const add = cfg.refill.to - P.upper.propLeft;
    P.upper.propLeft = cfg.refill.to;
    mass += add;
    M.ev(
      t + 0.5 * D,
      "ship",
      "Orbital refilling begins",
      `Tanker Starships dock one by one and transfer liquid methane and oxygen. ${cfg.refill.tankers} tanker flights deliver ≈${(add / 1000).toFixed(0)} t of propellant.`,
      "refill",
    );
    M.ev(
      tR - 0.2 * D,
      "ship",
      "Tanks full",
      `The Ship now carries ${(cfg.refill.to / 1000).toFixed(0)} t of propellant — enough for the trans-Mars injection.`,
      "refill",
    );
    M.phase(t, tR, "Propellant transfer in LEO", "#4ea8de");
    t = tR;
  }
  // ---------------- TMI geometry: periapsis of departure hyperbola ----------------
  progress("Trans-Mars injection targeting…");
  const hP = vunit(vcross(r, v));
  const rPark = vnorm(r);
  const depH = departureHyperbola(vinfDep, hP, rPark, MU_E);
  // first passage of parking orbit through periapsis direction after a short coast
  const ang = (rr) =>
    Math.atan2(
      vdot(vcross(vunit(rr), depH.phat), hP),
      vdot(vunit(rr), depH.phat),
    );
  const periodPark = 2 * Math.PI * Math.sqrt(Math.pow(rPark, 3) / MU_E);
  let dth = ang(r);
  if (dth < 0) dth += TAU;
  if (dth < 0.25) dth += TAU;
  const tTMI = t + (dth / TAU) * periodPark;
  const sT = kepProp(r, v, tTMI - t, MU_E);
  const vpNeeded = vscale(
    vunit(vcross(hP, vunit(sT.r))),
    Math.sqrt(vdot(vinfDep, vinfDep) + (2 * MU_E) / vnorm(sT.r)),
  );
  let dvTMI = vsub(vpNeeded, sT.v);
  // ---------------- arrival target (B-plane) for the first leg ----------------
  const first = nodes[1];
  const tArr1 = nodes[1].t;
  const target = first.body;
  let tgt = arrivalTarget(cfg, first, lam[0].vinfIn, tArr1, SC, P, M);
  // Newton on TMI Δv → [B·T, B·R, t_periapsis]
  const FT = (x) => {
    const vv = vadd(sT.v, vadd(dvTMI, x));
    const o = patchedLeg(tTMI, sT.r, vv, "earth", target, tArr1);
    if (!o || o.miss || !o.bv) return [1e3, 1e3, 1e3];
    const ax = bPlaneAxes(o.bv.S);
    return [
      (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
      (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
      (o.tp - tgt.tp) / H / 2,
    ];
  };
  // stage 1: aim at the planet centre (smooth even when the SOI is missed), stage 2: B-plane
  const s1 = newtonSolve(
    (x) =>
      vscale(
        centreMiss(
          tTMI,
          sT.r,
          vadd(sT.v, vadd(dvTMI, x)),
          "earth",
          target,
          tgt.tp,
        ),
        1e-4,
      ),
    [0, 0, 0],
    { h: 1e-7, tol: 1e-3, maxIt: 30, maxStep: 0.1 },
  );
  let sol = newtonSolve(FT, s1.x, {
    h: 1e-7,
    tol: 1e-3,
    maxIt: 30,
    maxStep: 0.05,
  });
  // refine target with actual v_inf (landing geometry depends on it) and re-solve
  for (let k = 0; k < 2; k++) {
    const o = patchedLeg(
      tTMI,
      sT.r,
      vadd(sT.v, vadd(dvTMI, sol.x)),
      "earth",
      target,
      tArr1,
    );
    if (!o || o.miss) break;
    const vin = vsub(kepProp(o.rT, o.vT, 0, BODIES[target].mu).v, [0, 0, 0]);
    const vinfVec = vscale(o.bv.S, o.bv.vinf);
    tgt = arrivalTarget(cfg, first, vinfVec, o.tp, SC, P, M);
    sol = newtonSolve(FT, sol.x, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.05,
    });
  }
  if (!sol.ok)
    M.warnings.push(
      `Arrival targeting converged only approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  dvTMI = vadd(dvTMI, sol.x);
  // ---------------- execute TMI ----------------
  const tmiEng =
    SC.usesUpperStage || cfg.tmiBy !== "sc" ? "upper" : SC.prop.orbiter;
  const eng = P.engineOf(tmiEng);
  const pb = P.burn(tmiEng, mass, vnorm(dvTMI));
  const vPost = vadd(sT.v, vscale(dvTMI, pb.dvAch / vnorm(dvTMI)));
  ship.add(
    new ConicSeg("earth", t, tTMI - pb.dur / 2, r, v, mass, {
      extra: { phase: "parking orbit" },
    }),
  );
  ship.add(
    new BurnSeg(
      "earth",
      tTMI,
      pb.dur,
      sT.r,
      sT.v,
      vPost,
      mass,
      mass - pb.prop,
      pb.thrust,
      {
        extra: {
          phase: cfg.depBurnName || "trans-Mars injection",
          stage: tmiEng,
        },
      },
    ),
  );
  M.burn({
    name: cfg.depBurnName || "TMI — trans-Mars injection",
    t: tTMI - pb.dur / 2,
    dur: pb.dur,
    dv: pb.dvAch * 1000,
    engine: pb.engine,
    isp: pb.isp,
    prop: pb.prop,
    m0: mass,
    obj: "ship",
    propType: pb.propType,
  });
  M.ev(
    tTMI - pb.dur / 2,
    "ship",
    cfg.depBurnName || "Trans-Mars injection",
    `${EXPLAIN.tmi} C3 = ${C3.toFixed(1)} km²/s², v∞ = ${Math.sqrt(C3).toFixed(2)} km/s. Burn ${fmtDur(pb.dur)}, Δv ${(pb.dvAch * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  M.phase(
    asc.t,
    tTMI - pb.dur / 2,
    cfg.refill ? "Earth orbit (refilling)" : "Parking orbit",
    "#4ea8de",
  );
  mass -= pb.prop;
  // separation from upper stage
  const tPost = tTMI + pb.dur / 2;
  const sPost = kepProp(sT.r, vPost, pb.dur / 2, MU_E);
  if (!pb.ok) {
    M.failed = "tmi";
    const dvNeed = vnorm(dvTMI) * 1000,
      dvGot = pb.dvAch * 1000;
    M.warnings.push(
      `Insufficient propellant for the departure burn: Δv ${dvGot.toFixed(0)} of ${dvNeed.toFixed(0)} m/s. The craft cannot reach ${BODIES[target].name}. Choose a more capable launch vehicle${SC.usesUpperStage ? ", orbital refilling" : ""} or a lighter payload.`,
    );
    const el = rv2coe(sPost.r, sPost.v, MU_E);
    M.ev(
      tPost,
      "ship",
      "Departure burn shortfall",
      el.e < 1
        ? `Propellant ran out ${(dvNeed - dvGot).toFixed(0)} m/s short. The craft is left in an elliptical Earth orbit with apogee ${Math.round(el.ra - BODIES.earth.R).toLocaleString()} km.`
        : `Propellant ran out ${(dvNeed - dvGot).toFixed(0)} m/s short. The craft escapes Earth but on a solar orbit that never reaches ${BODIES[target].name}.`,
      "fail",
    );
    if (el.e < 1) {
      const tEnd = tPost + Math.min(Math.max(2 * el.period, 6 * H), 20 * D);
      ship.add(
        new ConicSeg("earth", tPost, tEnd, sPost.r, sPost.v, mass, {
          extra: { phase: "stranded in Earth orbit" },
        }),
      );
      M.phase(tTMI - pb.dur / 2, tEnd, "Stranded in Earth orbit", "#ff5d5d");
    } else {
      const tOut = timeToRadius(sPost.r, sPost.v, MU_E, BODIES.earth.soi, true);
      const tSoi = tPost + (tOut && tOut > 0 ? tOut : 5 * D);
      ship.add(
        new ConicSeg("earth", tPost, tSoi, sPost.r, sPost.v, mass, {
          extra: { phase: "departure hyperbola" },
        }),
      );
      const sE = kepProp(sPost.r, sPost.v, tSoi - tPost, MU_E),
        pE = planetHelio("earth", tSoi);
      const rH = vadd(pE.r, sE.r),
        vH = vadd(pE.v, sE.v);
      ship.add(
        new ConicSeg("sun", tSoi, tSoi + 300 * D, rH, vH, mass, {
          extra: { phase: "heliocentric drift (target missed)" },
        }),
      );
      M.phase(
        tTMI - pb.dur / 2,
        tSoi + 300 * D,
        "Off-course solar orbit",
        "#ff5d5d",
      );
    }
    M.finalize();
    return M;
  }
  let tCur = tPost,
    rCur = sPost.r,
    vCur = sPost.v;
  if (!SC.usesUpperStage && tmiEng === "upper") {
    const tSep = tPost + (cfg.sepAfter ?? 0.6) * H;
    ship.add(
      new ConicSeg("earth", tPost, tSep, rCur, vCur, mass, {
        extra: { phase: "departure hyperbola" },
      }),
    );
    const s3 = kepProp(rCur, vCur, tSep - tPost, MU_E);
    rCur = s3.r;
    vCur = s3.v;
    tCur = tSep;
    const up = M.addObj(
      new MObject("upper", P.upper.name, {
        kind: "stage",
        model: "stage",
        color: "#aaa",
      }),
    );
    up.setConfig(tSep, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: L.stages.length - 1,
    });
    const mUp = P.upper.dry + P.upper.propLeft;
    up.add(
      new ConicSeg(
        "earth",
        tSep,
        tSep + 3 * D,
        rCur,
        vadd(vCur, vscale(vunit(vCur), -0.01)),
        mUp,
        {
          extra: {
            phase: "spent upper stage (escapes Earth into solar orbit)",
          },
        },
      ),
    );
    mass -= mUp;
    P.upper.attached = false;
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["cruise"],
      deployT: tSep,
    }); // (a spacecraft that unfolds after it leaves the stage does so from deployT)
    M.ev(
      tSep,
      "ship",
      "Spacecraft separation",
      `${SC.name} separates from the spent ${P.upper.name}. Solar arrays deploy and the craft begins its ${Math.round((tArr1 - tSep) / D)}-day cruise.`,
      "sep",
    );
  }
  // ---------------- cruise legs ----------------
  return cruiseAndArrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes,
    lam,
    0,
    tCur,
    rCur,
    vCur,
    "earth",
    mass,
    tgt,
    progress,
  );
}
// gravity-assist design: hyperbola that turns v∞in into the direction of v∞out (powered if |v∞| differ)
function flybyDesign(vIn, vOut, mu, rMin) {
  const a = vnorm(vIn),
    b = vnorm(vOut),
    delta = vangle(vIn, vOut);
  let hh = vunit(vcross(vIn, vOut));
  if (vnorm(vcross(vIn, vOut)) < 1e-9) hh = vperp(vIn);
  const f = (rp) =>
    Math.asin(1 / (1 + (rp * a * a) / mu)) +
    Math.asin(1 / (1 + (rp * b * b) / mu)) -
    delta;
  let rp = bisectRoot(f, rMin * 0.05, rMin * 2000);
  const feasible = rp != null && rp >= rMin;
  if (rp == null || rp < rMin) rp = rMin;
  const dvP = Math.abs(
    Math.sqrt(b * b + (2 * mu) / rp) - Math.sqrt(a * a + (2 * mu) / rp),
  );
  return { hhat: hh, rp, dvP, feasible, delta };
}
// arrival design for leg end
function arrivalTarget(cfg, leg, vinfVec, tArr, SC, P, M) {
  const body = leg.body,
    mu = BODIES[body].mu,
    S = vunit(vinfVec),
    vinf = vnorm(vinfVec);
  const R = surfaceRadius(body);
  if (leg.type === "entry") {
    // direct entry to a surface site
    const eCfg = leg.entry || {};
    const rEI = R + (eCfg.alt ?? (body === "earth" ? 125 : 125));
    let ref;
    if (body === "mars") {
      const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI);
      ref = marsEntryRef(SC, P, vEI, eCfg.fpa ?? -15.5, eCfg.bank ?? 45);
    } else {
      const vEI = Math.sqrt(vinf * vinf + (2 * mu) / rEI);
      const rr = [rEI, 0, 0],
        vv = [
          vEI * Math.sin((eCfg.fpa ?? -9) * DEG),
          vEI * Math.cos((eCfg.fpa ?? -9) * DEG),
          0,
        ];
      const e = earthEntryGeneric(SC, P, 0, rr, vv, null, eCfg.bank ?? 55);
      ref = { range: vangle(rr, e.r), dur: e.t };
    }
    const g = entryGeometry(
      body,
      vinfVec,
      rEI,
      eCfg.fpa ?? (body === "mars" ? -15.5 : -9),
      ref.range,
      ref.dur,
      leg.site,
      leg.tLand ? isoToT(leg.tLand) : tArr + 600,
    );
    if (g.approx && M)
      M.notes.push(
        `${BODIES[body].name}: the approach geometry cannot reach latitude ${leg.site.lat.toFixed(1)}° exactly; landing at the nearest reachable point.`,
      );
    return { B: g.B, tp: g.tp, entry: g, ref };
  }
  if (leg.type === "flyby" && leg.vinfNext) {
    const fd = flybyDesign(vinfVec, leg.vinfNext, mu, R + (leg.minAlt ?? 200));
    const rpF = leg.alt != null && leg.forceAlt ? R + leg.alt : fd.rp;
    leg.design = fd;
    return {
      B: vscale(vunit(vcross(S, fd.hhat)), bFromRp(rpF, vinf, mu)),
      tp: tArr,
      hhat: fd.hhat,
      rp: rpF,
    };
  }
  // orbit insertion / flyby: plane from requested inclination (to planet equator) or natural
  const rp = R + (leg.alt ?? 400);
  let hh;
  if (leg.incl != null) {
    const pole = bodyPoleEcl(body, tArr);
    // h ⊥ S with h·pole = cos(i)
    const u = vperp(S),
      w = vcross(S, u);
    const ci = Math.cos(leg.incl * DEG);
    const A = vdot(u, pole),
      Bc = vdot(w, pole),
      Rr = Math.hypot(A, Bc);
    let phi0 = Math.atan2(Bc, A),
      c = clamp(ci / (Rr || 1e-9), -1, 1);
    const ang = phi0 + (leg.inclSide === "b" ? -1 : 1) * Math.acos(c);
    hh = vunit(vadd(vscale(u, Math.cos(ang)), vscale(w, Math.sin(ang))));
  } else if (leg.hhat) hh = leg.hhat;
  else {
    const k = leg.retro ? [0, 0, -1] : [0, 0, 1];
    hh = vunit(vsub(k, vscale(S, vdot(k, S))));
  }
  if (leg.bSide === "flip") hh = vscale(hh, -1);
  return {
    B: vscale(vunit(vcross(S, hh)), bFromRp(rp, vinf, mu)),
    tp: tArr,
    hhat: hh,
    rp,
  };
}
// --------------------------------------------------------------------------
function cruiseAndArrive(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  t,
  rRel,
  vRel,
  fromBody,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400;
  const leg = nodes[iLeg + 1],
    target = leg.body;
  const muF = BODIES[fromBody].mu,
    muT = BODIES[target].mu;
  progress(`Cruise to ${BODIES[target].name}…`);
  // departure hyperbola to SOI exit
  const dtx = timeToRadius(rRel, vRel, muF, soiOf(fromBody));
  let tX = t + dtx;
  ship.add(
    new ConicSeg(fromBody, t, tX, rRel, vRel, mass, {
      extra: {
        phase: `leaving ${BODIES[fromBody].name}’s sphere of influence`,
      },
    }),
  );
  const sX = kepProp(rRel, vRel, dtx, muF),
    pX = planetHelio(fromBody, tX);
  let rH = vadd(pX.r, sX.r),
    vH = vadd(pX.v, sX.v);
  M.ev(
    tX,
    "ship",
    `Leaving ${BODIES[fromBody].name}’s sphere of influence`,
    `${(soiOf(fromBody) / 1000).toFixed(0)},000 km out, the Sun’s gravity now dominates. ${EXPLAIN.cruise}`,
    "soi",
  );
  // TCM events from config (historical, informational) & optional correction burn after flybys
  let tE = findSOIEntry(tX, rH, vH, target, leg.t, leg.t + 120 * D);
  let tCM = null;
  if (iLeg > 0 || tE == null) {
    // post-flyby trajectory correction: retarget next B-plane
    tCM = tX + (cfg.tcmAfterFlyby ?? 12) * D;
    const sC = kepProp(rH, vH, tCM - tX, MU_SUN);
    const FT = (x) => {
      const o = patchedHelio(tCM, sC.r, vadd(sC.v, x), target, leg.t);
      if (o.miss || !o.bv) return [1e3, 1e3, 1e3];
      const ax = bPlaneAxes(o.bv.S);
      return [
        (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
        (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
        (o.tp - tgt.tp) / H / 2,
      ];
    };
    // initial guess from Lambert to target centre
    const pTa = planetHelio(target, leg.t);
    const Lb = lambert(sC.r, pTa.r, leg.t - tCM, MU_SUN, [0, 0, 1]);
    const x0 = Lb ? vsub(Lb.v1, sC.v) : [0, 0, 0];
    let sol = newtonSolve(FT, x0, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.1,
    });
    for (let k = 0; k < 2 && tgt.entry; k++) {
      const o = patchedHelio(tCM, sC.r, vadd(sC.v, sol.x), target, leg.t);
      if (o.miss) break;
      tgt = arrivalTarget(cfg, leg, vscale(o.bv.S, o.bv.vinf), o.tp, SC, P, M);
      sol = newtonSolve(FT, sol.x, {
        h: 1e-7,
        tol: 1e-3,
        maxIt: 30,
        maxStep: 0.1,
      });
    }
    const dv = vnorm(sol.x);
    const engId = SC.usesUpperStage ? "upper" : SC.prop.orbiter;
    const pm = P.burn(engId, mass, dv);
    ship.add(
      new ConicSeg("sun", tX, tCM, rH, vH, mass, {
        extra: { phase: "heliocentric cruise" },
      }),
    );
    M.burn({
      name: `Deep-space manoeuvre (to ${BODIES[target].name})`,
      t: tCM,
      dur: pm.dur,
      dv: dv * 1000,
      engine: pm.engine,
      isp: pm.isp,
      prop: pm.prop,
      m0: mass,
      obj: "ship",
      propType: pm.propType,
    });
    M.ev(
      tCM,
      "ship",
      "Trajectory correction",
      `A ${(dv * 1000).toFixed(1)} m/s burn re-aims the trajectory at the ${BODIES[target].name} aim point (B-plane targeting). In this patched-conic model it also absorbs small mismatches of the idealised flyby.`,
      "burn",
      { dv: dv * 1000 },
    );
    mass -= pm.prop;
    rH = sC.r;
    vH = vadd(sC.v, sol.x);
    tX = tCM;
    tE = findSOIEntry(tX, rH, vH, target, leg.t, leg.t + 120 * D);
  }
  for (const e of (cfg.tcms || []).filter((e) => e.leg === iLeg))
    M.ev(
      isoToT(e.t),
      "ship",
      e.name,
      e.desc || "Trajectory correction manoeuvre (historical).",
      "info",
    );
  if (tE == null) {
    const ca = closestApproachHelio(
      tX,
      rH,
      vH,
      target,
      leg.t - 30 * D,
      leg.t + 30 * D,
    );
    ship.add(
      new ConicSeg("sun", tX, leg.t + 60 * D, rH, vH, mass, {
        extra: { phase: "heliocentric cruise" },
      }),
    );
    M.warnings.push(
      `The trajectory misses ${BODIES[target].name} by ${Math.round(ca.d).toLocaleString()} km.`,
    );
    M.finalize();
    return M;
  }
  ship.add(
    new ConicSeg("sun", tX, tE, rH, vH, mass, {
      extra: { phase: "heliocentric cruise" },
    }),
  );
  M.phase(tX - 2 * D, tE, `Cruise to ${BODIES[target].name}`, "#9b5de5");
  // cruise events: midpoint facts
  const midT = 0.5 * (tX + tE),
    sM = kepProp(rH, vH, midT - tX, MU_SUN);
  M.ev(
    midT,
    "ship",
    "Mid-cruise",
    `${(vnorm(sM.r) / AU).toFixed(2)} AU from the Sun, heliocentric speed ${vnorm(sM.v).toFixed(1)} km/s. One-way radio delay to Earth: ${(vnorm(vsub(sM.r, bodyPos("earth", midT))) / C_KMS / 60).toFixed(1)} min.`,
    "info",
  );
  const sE = kepProp(rH, vH, tE - tX, MU_SUN),
    pT = planetHelio(target, tE);
  let rT = vsub(sE.r, pT.r),
    vT = vsub(sE.v, pT.v);
  M.ev(
    tE,
    "ship",
    `${BODIES[target].name} sphere of influence`,
    `${BODIES[target].name}’s gravity now dominates (sphere of influence radius ${Math.round(soiOf(target)).toLocaleString()} km). Approach speed v∞ = ${vnorm(vT).toFixed(2)} km/s.`,
    "soi",
  );
  return arrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes,
    lam,
    iLeg,
    tE,
    rT,
    vT,
    target,
    mass,
    tgt,
    progress,
  );
}
// --------------------------------------------------------------------------
function arrive(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  tE,
  rT,
  vT,
  target,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[target].mu,
    R = surfaceRadius(target);
  const elA = rv2coe(rT, vT, mu);
  const tP = tE + timeToPeri(rT, vT, mu);
  const sP = kepProp(rT, vT, tP - tE, mu);
  if (leg.type === "flyby") {
    // ---------------- flyby / gravity assist ----------------
    const dtx = timeToRadius(sP.r, sP.v, mu, soiOf(target));
    const tX = tP + dtx;
    ship.add(
      new ConicSeg(target, tE, tP, rT, vT, mass, {
        extra: { phase: `${BODIES[target].name} flyby` },
      }),
    );
    const vinf = Math.sqrt(2 * elA.energy),
      turn = 2 * Math.asin(1 / elA.e) * RAD;
    const pIn = planetHelio(target, tE),
      sx = kepProp(rT, vT, tX - tE, mu),
      pOut = planetHelio(target, tX);
    const vHin = vnorm(vadd(pIn.v, vT)),
      vHout = vnorm(vadd(pOut.v, sx.v));
    M.ev(
      tP,
      "ship",
      leg.name || `${BODIES[target].name} flyby (gravity assist)`,
      `${EXPLAIN.flyby} Closest approach ${Math.round(elA.rp - R).toLocaleString()} km altitude at ${Math.sqrt(vinf * vinf + (2 * mu) / elA.rp).toFixed(2)} km/s. Trajectory bent by ${turn.toFixed(1)}°; heliocentric speed ${vHin.toFixed(2)} → ${vHout.toFixed(2)} km/s (${vHout >= vHin ? "+" : ""}${(vHout - vHin).toFixed(2)} km/s).`,
      "flyby",
    );
    for (const e of leg.events || [])
      M.ev(tP + (e.dt || 0) * H, "ship", e.name, e.desc, e.kind || "photo");
    M.summary.flybys = M.summary.flybys || [];
    M.summary.flybys.push({
      body: target,
      alt: elA.rp - R,
      dvHelio: vHout - vHin,
      turn,
    });
    M.phase(tE, tX, `${BODIES[target].name} flyby`, "#43aa8b");
    if (iLeg + 2 < nodes.length && nodes[iLeg + 2].type !== "design") {
      // next leg
      const nl = nodes[iLeg + 2];
      const tgt2 = arrivalTarget(cfg, nl, lam[iLeg + 1].vinfIn, nl.t, SC, P, M);
      return cruiseAndArrive(
        M,
        cfg,
        SC,
        P,
        ship,
        nodes,
        lam,
        iLeg + 1,
        tP,
        sP.r,
        sP.v,
        target,
        mass,
        tgt2,
        progress,
      );
    }
    // final: coast on after flyby
    const pX = planetHelio(target, tX);
    const tEnd = tX + (cfg.coastAfter ?? 60) * D;
    ship.add(
      new ConicSeg(target, tP, tX, sP.r, sP.v, mass, {
        extra: { phase: `leaving ${BODIES[target].name}` },
      }),
    );
    ship.add(
      new ConicSeg("sun", tX, tEnd, vadd(pX.r, sx.r), vadd(pX.v, sx.v), mass, {
        extra: { phase: cfg.afterPhase || "heliocentric orbit" },
      }),
    );
    if (cfg.endNote)
      M.ev(tEnd - 1, "ship", cfg.endNote.name, cfg.endNote.desc, "info");
    M.phase(tX, tEnd, cfg.afterPhase || "Heliocentric orbit", "#9b5de5");
    M.finalize();
    return M;
  }
  if (leg.type === "entry")
    return doDirectEntry(
      M,
      cfg,
      SC,
      P,
      ship,
      nodes,
      lam,
      iLeg,
      tE,
      rT,
      vT,
      target,
      mass,
      tgt,
      progress,
    );
  if (leg.type === "orbit")
    return doOrbitInsertion(
      M,
      cfg,
      SC,
      P,
      ship,
      nodes,
      lam,
      iLeg,
      tE,
      rT,
      vT,
      target,
      mass,
      tgt,
      progress,
    );
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
function doDirectEntry(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  tE,
  rT,
  vT,
  body,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const rEI = R + (leg.entry?.alt ?? 125);
  const dtEI = timeToRadius(rT, vT, mu, rEI, false);
  if (dtEI == null) {
    M.warnings.push(`The approach misses ${BODIES[body].name}’s atmosphere.`);
    M.finalize();
    return M;
  }
  const tEI = tE + dtEI;
  // cruise stage separation 10 min before EI (Mars) / capsule separation (Earth return)
  const tSep = tEI - (leg.sepBefore ?? 10) * 60;
  ship.add(
    new ConicSeg(body, tE, tSep, rT, vT, mass, {
      extra: { phase: `approach to ${BODIES[body].name}` },
    }),
  );
  const sS = kepProp(rT, vT, tSep - tE, mu);
  let mEntry;
  if (body === "mars" && SC.orbiterStays) {
    M.msrOrbiter = msrOrbiterBranch(M, cfg, SC, P, tE, rT, vT, mass, tEI, leg);
    mEntry = P.massOf(SC.entry);
    ship.setConfig(tSep, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["aeroshell"],
    });
  } else if (body === "mars") {
    if (SC.entry) {
      const cruiseIds = SC.orbiter.filter((id) => !SC.entry.includes(id));
      const cs = M.addObj(
        new MObject("cruise", cfg.cruiseName || "Cruise stage", {
          kind: "stage",
          model: SC.model,
          color: "#aaa",
        }),
      );
      cs.setConfig(tSep, "sc", {
        key: "sc",
        sc: SC.model,
        parts: ["cruisestage"],
      });
      cs.add(
        new ConicSeg(
          body,
          tSep,
          tEI + 900,
          sS.r,
          vadd(sS.v, vscale(vunit(sS.v), -0.0005)),
          P.massOf(cruiseIds),
          { extra: { phase: "cruise stage (burns up)" } },
        ),
      );
      for (const id of cruiseIds) P.mods[id].attached = false;
      M.ev(
        tSep,
        "ship",
        "Cruise stage separation",
        "The entry vehicle (aeroshell with rover inside) separates and turns heat-shield forward.",
        "sep",
      );
      ship.setConfig(tSep, "sc", {
        key: "sc",
        sc: SC.model,
        parts: ["aeroshell"],
      });
    }
    mEntry = SC.entry ? P.massOf(SC.entry) : mass;
  }
  if (body !== "mars") {
    // Earth return capsule
    const capM = SC.usesUpperStage ? mass : P.massOf([SC.capsule]);
    if (!SC.usesUpperStage) {
      const sm = M.addObj(
        new MObject("sm", cfg.smName || "Carrier spacecraft", {
          kind: "stage",
          model: SC.model,
          color: "#aaa",
        }),
      );
      sm.setConfig(tSep, "sc", { key: "sc", sc: SC.model, parts: ["service"] });
      sm.add(
        new ConicSeg(
          body,
          tSep,
          tEI + 1200,
          sS.r,
          vadd(sS.v, vscale(vunit(sS.v), -0.0008)),
          mass - capM,
          { extra: { phase: "carrier (divert / burns up)" } },
        ),
      );
      ship.setConfig(tSep, "capsule", { key: "capsule", sc: SC.model });
      M.ev(
        tSep,
        "ship",
        leg.sepName || "Capsule separation",
        "Only the heat-shielded capsule continues to atmospheric entry.",
        "sep",
      );
      mEntry = capM;
    } else mEntry = mass;
  }
  ship.add(
    new ConicSeg(body, tSep, tEI, sS.r, sS.v, mEntry, {
      extra: { phase: "final approach" },
    }),
  );
  const sE = kepProp(rT, vT, dtEI, mu);
  const vrel = vsub(sE.v, vcross(bodyOmegaEcl(body, tEI), sE.r));
  M.ev(
    tEI,
    "ship",
    `Entry interface (${(rEI - R).toFixed(0)} km)`,
    `${body === "mars" ? EXPLAIN.edl : EXPLAIN.entry} Speed ${vnorm(sE.v).toFixed(2)} km/s (${vnorm(vrel).toFixed(2)} km/s relative to the rotating atmosphere), flight-path angle ${fpaDeg(sE.r, sE.v).toFixed(1)}°.`,
    "entry",
  );
  progress(`${BODIES[body].name} entry, descent & landing…`);
  const site = leg.site;
  let run;
  if (body === "mars") run = (b) => runMarsEDL(SC, P, tEI, sE.r, sE.v, b, site);
  else run = (b) => earthEntryGeneric(SC, P, tEI, sE.r, sE.v, mEntry, b);
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], site.lat, site.lon) * R;
  const gLim = (cfg.crew || 0) > 0 ? 8 : 25;
  const cost = (e) =>
    missF(e) + Math.max(0, e.maxG - gLim) * 300 + (e.landed ? 0 : 5000);
  let best = null;
  for (let b = 0; b <= 135; b += 9) {
    const e = run(b);
    const c = cost(e);
    if (!best || c < best.c) best = { b, c, e };
  }
  const g = goldenMin(
    (b) => cost(run(b)),
    Math.max(0, best.b - 9),
    Math.min(150, best.b + 9),
    16,
  );
  const ent = run(g.x);
  ship.add(new SampleSeg(body, ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm² at the heat shield stagnation point.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(1)} g.`,
    "gload",
  );
  const chuteT = ent.samples.find((s) => s.chute >= 1)?.t;
  if (chuteT)
    ship.setConfig(
      chuteT,
      body === "mars" ? "sc" : "capsule",
      body === "mars"
        ? { key: "sc", sc: SC.model, parts: ["aeroshell"], chute: 1 }
        : { key: "capsule", sc: SC.model, chutes: 1 },
    );
  const pdT = ent.samples.find((s) => s.phase === "powered descent")?.t;
  if (pdT && body === "mars")
    ship.setConfig(pdT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      powered: true,
    });
  if (body === "mars" && SC.prop.lander)
    P.tankOf(SC.prop.lander).propLeft -= ent.propUsed;
  if (SC.usesUpperStage && ent.propUsed > 0) {
    // Starship lands on the propellant in its own tanks: book the landing burn
    const lb = ent.events.find((e) => e.name === "Landing burn"),
      tI = lb ? lb.t : ent.t - 30,
      eng = P.engineOf("upper");
    const m0 = ent.m + ent.propUsed,
      isp = body === "earth" ? 327 : 330;
    P.upper.propLeft = Math.max(0, P.upper.propLeft - ent.propUsed);
    M.burn({
      name: "Landing burn",
      t: tI,
      dur: ent.t - tI,
      dv: isp * G0 * Math.log(m0 / ent.m),
      engine: eng.name,
      isp,
      prop: ent.propUsed,
      m0,
      obj: "ship",
      propType: eng.prop,
    });
  }
  const miss = missF(ent);
  const landName =
    body === "mars" ? cfg.landName || "Touchdown" : leg.landName || "Landing";
  M.ev(
    ent.t,
    "ship",
    landName,
    `${body === "mars" ? "Touchdown on Mars" : "Landing on Earth"} at ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(1)} km from the target (${site.name}). ${body === "mars" ? `One-way radio delay to Earth: ${(vnorm(vsub(bodyPos("mars", ent.t), bodyPos("earth", ent.t))) / C_KMS / 60).toFixed(1)} min — the landing was over before Earth heard about entry.` : ""}`,
    "landing",
  );
  M.phase(
    tEI,
    ent.t,
    body === "mars" ? "Entry, descent & landing" : "Earth entry",
    "#ff5d5d",
  );
  M.summary.entries = M.summary.entries || [];
  M.summary.entries.push({
    body,
    vEI: vnorm(vrel),
    maxG: ent.maxG,
    maxHeat: ent.maxHeat,
    miss,
    ll: ent.ll,
    bank: g.x,
  });
  const crane = body === "mars" && SC.edl && SC.edl.skycrane,
    mLanded = crane ? SC.modules.ROVER.dry : ent.m; // a sky crane flies off and leaves the rover
  if (body === "mars") {
    ship.setConfig(ent.t, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      landed: true,
    });
    if (crane)
      skyCraneParts(
        M,
        SC,
        ship,
        ent,
        site,
        ent.m - mLanded,
        ent.t + (cfg.surfaceDays ?? 3) * D,
      );
    if (leg.next === "return")
      return surfaceStayAndReturn(
        M,
        cfg,
        SC,
        P,
        ship,
        nodes,
        lam,
        iLeg,
        ent,
        mLanded,
        progress,
      );
    for (const e of cfg.surfaceEvents || [])
      M.ev(
        ent.t + e.afterLanding * D,
        "ship",
        e.name,
        e.desc,
        e.kind || "info",
      );
    const tEnd = ent.t + (cfg.surfaceDays ?? 3) * D;
    ship.add(
      new SurfaceSeg(
        "mars",
        ent.t,
        tEnd,
        ent.ll[0],
        ent.ll[1],
        site.elev || 0,
        mLanded,
        { extra: { phase: "surface operations" } },
      ),
    );
    M.phase(ent.t, tEnd, "Surface operations", "#ffd166");
  } else {
    ship.add(
      new SurfaceSeg(
        "earth",
        ent.t,
        ent.t + 2 * H,
        ent.ll[0],
        ent.ll[1],
        0,
        mLanded,
        { extra: { phase: "recovery" } },
      ),
    );
  }
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
function doOrbitInsertion(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  tE,
  rT,
  vT,
  body,
  mass,
  tgt,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const tP = tE + timeToPeri(rT, vT, mu),
    sP = kepProp(rT, vT, tP - tE, mu);
  const rp = vnorm(sP.r),
    ra = R + leg.apo;
  const vpT = Math.sqrt(mu * (2 / rp - 2 / (rp + ra)));
  const dv = vnorm(sP.v) - vpT;
  const engId = SC.usesUpperStage ? "upper" : SC.prop.orbiter;
  const pm = P.burn(engId, mass, dv);
  const vPost = vscale(vunit(sP.v), vnorm(sP.v) - pm.dvAch);
  ship.add(
    new ConicSeg(body, tE, tP - pm.dur / 2, rT, vT, mass, {
      extra: { phase: `approach to ${BODIES[body].name}` },
    }),
  );
  ship.add(
    new BurnSeg(
      body,
      tP,
      pm.dur,
      sP.r,
      sP.v,
      vPost,
      mass,
      mass - pm.prop,
      pm.thrust,
      { extra: { phase: "orbit insertion burn", stage: engId } },
    ),
  );
  M.burn({
    name: `${body === "mars" ? "MOI" : "Orbit insertion"} — capture burn`,
    t: tP - pm.dur / 2,
    dur: pm.dur,
    dv: pm.dvAch * 1000,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: mass,
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tP - pm.dur / 2,
    "ship",
    leg.moiName || "Mars orbit insertion",
    `${EXPLAIN.moi} ${fmtDur(pm.dur)} burn, Δv ${(pm.dvAch * 1000).toFixed(0)} m/s → orbit ${Math.round(rp - R)} × ${Math.round(leg.apo).toLocaleString()} km.`,
    "burn",
  );
  if (!pm.ok)
    M.warnings.push(
      "Insufficient propellant for orbit insertion — the craft flies past.",
    );
  mass -= pm.prop;
  let t = tP + pm.dur / 2;
  let st = kepProp(sP.r, vPost, pm.dur / 2, mu);
  let r = st.r,
    v = st.v;
  const el0 = rv2coe(r, v, mu);
  M.summary.orbit = {
    rp: el0.rp - R,
    ra: el0.ra - R,
    i: Math.acos(vdot(vunit(el0.h), bodyPoleEcl(body, t))) * RAD,
    period: el0.period,
  };
  for (const e of leg.events || [])
    M.ev(tP + (e.dt || 0) * D, "ship", e.name, e.desc, e.kind || "photo");
  // optional orbit lowering (period change)
  if (leg.trim) {
    const tT = t + leg.trim.after * D;
    const n = Math.round((tT - t) / el0.period);
    const tA = t + (n + 0.5) * el0.period; // at an apoapsis
    ship.add(
      new ConicSeg(body, t, tA, r, v, mass, {
        extra: { phase: "capture orbit" },
      }),
    );
    const sA = kepProp(r, v, tA - t, mu);
    // at apoapsis: change periapsis (and plane) to target
    const rA = vnorm(sA.r);
    const newRp = R + leg.trim.peri,
      aN = (rA + newRp) / 2;
    let hN = vunit(vcross(sA.r, sA.v));
    if (leg.trim.incl != null) {
      const pole = bodyPoleEcl(body, tA),
        rh = vunit(sA.r);
      // rotate plane about radius vector to reach inclination
      const f = (th) =>
        Math.acos(clamp(vdot(vrot(hN, rh, th), pole), -1, 1)) * RAD -
        leg.trim.incl;
      const g2 = goldenMin((th) => Math.abs(f(th)), -Math.PI, Math.PI, 60);
      hN = vrot(hN, rh, g2.x);
    }
    const vA = Math.sqrt(mu * (2 / rA - 1 / aN));
    const vNew = vscale(vunit(vcross(hN, vunit(sA.r))), vA);
    const dvv = vsub(vNew, sA.v),
      pmt = P.burn(engId, mass, vnorm(dvv));
    ship.add(
      new BurnSeg(
        body,
        tA,
        Math.max(pmt.dur, 1),
        sA.r,
        sA.v,
        vNew,
        mass,
        mass - pmt.prop,
        pmt.thrust,
        { extra: { phase: "orbit trim" } },
      ),
    );
    M.burn({
      name: "Orbit change at apoapsis",
      t: tA,
      dur: pmt.dur,
      dv: vnorm(dvv) * 1000,
      engine: pmt.engine,
      isp: pmt.isp,
      prop: pmt.prop,
      m0: mass,
      obj: "ship",
      propType: pmt.propType,
    });
    M.ev(
      tA,
      "ship",
      leg.trim.name || "Orbit change at apoapsis",
      `${leg.trim.desc || "Plane and periapsis changes are cheapest far from the planet, where the craft moves slowly."} Δv ${(vnorm(dvv) * 1000).toFixed(0)} m/s.`,
      "burn",
    );
    mass -= pmt.prop;
    t = tA + Math.max(pmt.dur, 1) / 2;
    st = kepProp(sA.r, vNew, Math.max(pmt.dur, 1) / 2, mu);
    r = st.r;
    v = st.v;
  }
  if (leg.next === "land")
    return orbitThenLand(
      M,
      cfg,
      SC,
      P,
      ship,
      nodes,
      lam,
      iLeg,
      t,
      r,
      v,
      body,
      mass,
      progress,
    );
  if (leg.next === "return")
    return orbitStayAndReturn(
      M,
      cfg,
      SC,
      P,
      ship,
      nodes,
      lam,
      iLeg,
      t,
      r,
      v,
      body,
      mass,
      progress,
    );
  const tEnd = t + (cfg.orbitDays ?? 30) * D;
  ship.add(
    new ConicSeg(body, t, tEnd, r, v, mass, {
      extra: { phase: `${BODIES[body].name} orbit` },
    }),
  );
  M.phase(t, tEnd, `${BODIES[body].name} orbit`, "#43aa8b");
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
// Orbit → deorbit → EDL (Tianwen-1 style): parking orbit designed backward from the landing
function orbitThenLand(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  t,
  r,
  v,
  body,
  mass,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  const site = leg.site,
    tLand = isoToT(leg.tLand);
  progress("Designing the descent from orbit…");
  // reference EDL from a typical orbital entry (4.8 km/s, -11°) for range/duration
  const ref = marsEntryRef(SC, P, 4.8, leg.entryFpa ?? -11.5, 30);
  // deorbit orbit: periapsis below the surface so that entry happens at fpa; apoapsis = current apoapsis
  const el = rv2coe(r, v, mu);
  const ra = leg.parkApo ? R + leg.parkApo : el.ra;
  const rEI = R + 125,
    g = (leg.entryFpa ?? -11.5) * DEG;
  // choose periapsis radius so fpa at EI = g on an ellipse with apoapsis ra
  const fpaAt = (rpx) => {
    const a = (ra + rpx) / 2,
      e = (ra - rpx) / (ra + rpx),
      p = a * (1 - e * e);
    const vE = Math.sqrt(mu * (2 / rEI - 1 / a));
    const h = Math.sqrt(mu * p);
    return -Math.acos(clamp(h / (rEI * vE), -1, 1));
  };
  const rpD = bisectRoot((rpx) => fpaAt(rpx) - g, 0.2 * R, rEI - 1) ?? R * 0.9;
  // landing geometry in inertial space: plane containing site at landing; EI point = site rotated back by range
  const sL = vunit(sitePosEcl(body, site.lat, site.lon, site.elev || 0, tLand));
  let hO = vunit(el.h);
  // plane: rotate current plane minimally so that it contains the site at landing
  let hD = vunit(vsub(hO, vscale(sL, vdot(hO, sL))));
  const eiDir = vrot(sL, hD, -ref.range);
  const aD = (ra + rpD) / 2,
    eD = (ra - rpD) / (ra + rpD),
    pD = aD * (1 - eD * eD);
  const nuEI = -Math.acos(clamp((pD / rEI - 1) / eD, -1, 1));
  const periDir = vrot(eiDir, hD, -nuEI);
  const apoDir = vscale(periDir, -1);
  const tEI = tLand - ref.dur;
  const Fq = 2 * Math.atan(Math.sqrt((1 - eD) / (1 + eD)) * Math.tan(nuEI / 2));
  const Mq = Fq - eD * Math.sin(Fq);
  const nD = Math.sqrt(mu / (aD * aD * aD)),
    tPeriD = tEI - Mq / nD; // Mq negative
  const tApoD = tPeriD - Math.PI / nD;
  // state at deorbit point (apoapsis of deorbit orbit)
  const vApoD = Math.sqrt(mu * (2 / ra - 1 / aD));
  const rDeo = vscale(apoDir, ra),
    vDeoAfter = vscale(vunit(vcross(hD, apoDir)), vApoD);
  // parking orbit = same apoapsis point, periapsis R+parkPeri, same plane hD, reached by a Lambert transfer from current orbit
  const rpPark = R + (leg.parkPeri ?? 280);
  const aP = (ra + rpPark) / 2,
    vApoP = Math.sqrt(mu * (2 / ra - 1 / aP));
  const vDeoBefore = vscale(vunit(vcross(hD, apoDir)), vApoP);
  const perP = 2 * Math.PI * Math.sqrt((aP * aP * aP) / mu);
  const nRev = Math.max(1, Math.floor((tApoD - t - 3 * D) / perP));
  const tJoin = tApoD - nRev * perP; // parking orbit apoapsis time (state rDeo, vDeoBefore)
  // Lambert from current orbit (depart at an apoapsis passage) to the parking orbit state at tJoin + half period (its periapsis) — choose min Δv
  let best = null;
  const per0 = el.period;
  // depart near capture-orbit apoapsis passages, arrive at parking-orbit apoapsis passages (slow → cheap)
  const tApo0 = t + timeToPeri(r, v, mu) + per0 / 2;
  const deps = [t + 600];
  for (let j = -1; j < 4; j++) {
    const td = tApo0 + j * per0;
    if (td > t + 600) deps.push(td);
  }
  for (const tDepT of deps) {
    if (tDepT > tApoD - 2 * D) continue;
    const s0 = kepProp(r, v, tDepT - t, mu);
    for (let k = 0; k < 200; k++) {
      const tArrT = tApoD - k * perP;
      if (tArrT < tDepT + 1 * D) break;
      if (tArrT > tDepT + 30 * D) continue;
      for (const off of [-0.2, 0, 0.2]) {
        const ta = tArrT + off * perP;
        const sJ = kepProp(rDeo, vDeoBefore, ta - tApoD, mu);
        const Lb = lambert(
          s0.r,
          sJ.r,
          ta - tDepT,
          mu,
          vunit(vcross(s0.r, s0.v)),
        );
        if (!Lb) continue;
        const tot = vnorm(vsub(Lb.v1, s0.v)) + vnorm(vsub(sJ.v, Lb.v2));
        if (!best || tot < best.tot)
          best = { tot, tDepT, tArrT: ta, s0, sJ, Lb };
      }
    }
  }
  if (best) {
    best.tJoinRef = tApoD;
  }
  const engO = SC.prop.orbiter;
  if (best) {
    ship.add(
      new ConicSeg(body, t, best.tDepT, r, v, mass, {
        extra: { phase: "capture orbit" },
      }),
    );
    const dv1 = vsub(best.Lb.v1, best.s0.v),
      p1 = P.burn(engO, mass, vnorm(dv1));
    ship.add(
      new BurnSeg(
        body,
        best.tDepT,
        Math.max(p1.dur, 1),
        best.s0.r,
        best.s0.v,
        best.Lb.v1,
        mass,
        mass - p1.prop,
        p1.thrust,
        { extra: { phase: "orbit change" } },
      ),
    );
    M.burn({
      name: "Orbit change 1 (toward parking orbit)",
      t: best.tDepT,
      dur: p1.dur,
      dv: vnorm(dv1) * 1000,
      engine: p1.engine,
      isp: p1.isp,
      prop: p1.prop,
      m0: mass,
      obj: "ship",
      propType: p1.propType,
    });
    M.ev(
      best.tDepT,
      "ship",
      "Orbit change toward the parking orbit",
      `Two-impulse transfer into a parking orbit whose ground track passes over the landing site on landing day. Δv ${(vnorm(dv1) * 1000).toFixed(0)} m/s.`,
      "burn",
    );
    mass -= p1.prop;
    const tb = best.tDepT + Math.max(p1.dur, 1) / 2;
    const sb = kepProp(best.s0.r, best.Lb.v1, Math.max(p1.dur, 1) / 2, mu);
    ship.add(
      new ConicSeg(body, tb, best.tArrT, sb.r, sb.v, mass, {
        extra: { phase: "transfer orbit" },
      }),
    );
    const sA2 = kepProp(best.s0.r, best.Lb.v1, best.tArrT - best.tDepT, mu);
    const dv2 = vsub(best.sJ.v, sA2.v),
      p2 = P.burn(engO, mass, vnorm(dv2));
    ship.add(
      new BurnSeg(
        body,
        best.tArrT,
        Math.max(p2.dur, 1),
        sA2.r,
        sA2.v,
        best.sJ.v,
        mass,
        mass - p2.prop,
        p2.thrust,
        { extra: { phase: "orbit change" } },
      ),
    );
    M.burn({
      name: "Orbit change 2 (parking orbit)",
      t: best.tArrT,
      dur: p2.dur,
      dv: vnorm(dv2) * 1000,
      engine: p2.engine,
      isp: p2.isp,
      prop: p2.prop,
      m0: mass,
      obj: "ship",
      propType: p2.propType,
    });
    M.ev(
      best.tArrT,
      "ship",
      "Parking orbit",
      `Orbit ${Math.round(rpPark - R)} × ${Math.round(ra - R).toLocaleString()} km. The lander will be released from here. Δv ${(vnorm(dv2) * 1000).toFixed(0)} m/s.`,
      "burn",
    );
    mass -= p2.prop;
    const tc = best.tArrT + Math.max(p2.dur, 1) / 2,
      sc2 = kepProp(best.sJ.r, best.sJ.v, Math.max(p2.dur, 1) / 2, mu);
    ship.add(
      new ConicSeg(body, tc, tApoD, sc2.r, sc2.v, mass, {
        extra: { phase: "parking orbit (reconnaissance of landing site)" },
      }),
    );
    M.phase(t, tApoD, `${BODIES[body].name} orbit`, "#43aa8b");
  } else {
    ship.add(
      new ConicSeg(body, t, tApoD, rDeo, vDeoBefore, mass, {
        extra: { phase: "parking orbit" },
      }),
    );
    M.warnings.push(
      "Could not find an orbit-change sequence; showing the parking orbit directly.",
    );
  }
  for (const e of leg.orbitEvents || [])
    M.ev(isoToT(e.t), "ship", e.name, e.desc, e.kind || "photo");
  // deorbit at apoapsis: lower periapsis into atmosphere, then capsule separates; orbiter raises periapsis again
  const dvD = vsub(vDeoAfter, vDeoBefore),
    pD2 = P.burn(engO, mass, vnorm(dvD));
  ship.add(
    new BurnSeg(
      body,
      tApoD,
      Math.max(pD2.dur, 1),
      rDeo,
      vDeoBefore,
      vDeoAfter,
      mass,
      mass - pD2.prop,
      pD2.thrust,
      { extra: { phase: "deorbit burn" } },
    ),
  );
  M.burn({
    name: "Deorbit burn",
    t: tApoD,
    dur: pD2.dur,
    dv: vnorm(dvD) * 1000,
    engine: pD2.engine,
    isp: pD2.isp,
    prop: pD2.prop,
    m0: mass,
    obj: "ship",
    propType: pD2.propType,
  });
  M.ev(
    tApoD,
    "ship",
    "Deorbit manoeuvre",
    `At apoapsis the stack lowers its periapsis into the atmosphere (Δv ${(vnorm(dvD) * 1000).toFixed(0)} m/s).`,
    "burn",
  );
  mass -= pD2.prop;
  const tRel = tEI - 3 * H;
  const t1 = tApoD + Math.max(pD2.dur, 1) / 2,
    s1 = kepProp(rDeo, vDeoAfter, Math.max(pD2.dur, 1) / 2, mu);
  ship.add(
    new ConicSeg(body, t1, tRel, s1.r, s1.v, mass, {
      extra: { phase: "descent orbit" },
    }),
  );
  const sR = kepProp(rDeo, vDeoAfter, tRel - tApoD, mu);
  // orbiter separates and raises periapsis
  const orb = M.addObj(
    new MObject("orbiter", cfg.orbiterName || "Orbiter", {
      model: SC.model,
      color: "#7fd1ff",
    }),
  );
  orb.setConfig(tRel, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
  const mOrb = P.massOf(SC.orbiter);
  const vUp = vadd(sR.v, vscale(vunit(sR.v), 0.03));
  orb.add(
    new ConicSeg(body, tRel, tLand + 5 * D, sR.r, vUp, mOrb, {
      extra: { phase: "orbiter (relay)" },
    }),
  );
  M.ev(
    tRel,
    "orbiter",
    "Lander separation",
    "The entry capsule separates; the orbiter raises its periapsis back to stay in orbit as a radio relay.",
    "sep",
  );
  const mEntry = P.massOf(SC.entry);
  ship.setConfig(tRel, "sc", { key: "sc", sc: SC.model, parts: ["aeroshell"] });
  const dtE = timeToRadius(sR.r, sR.v, mu, rEI, false);
  const tEIa = tRel + dtE,
    sEI = kepProp(sR.r, sR.v, dtE, mu);
  ship.add(
    new ConicSeg(body, tRel, tEIa, sR.r, sR.v, mEntry, {
      extra: { phase: "entry capsule coast" },
    }),
  );
  M.ev(
    tEIa,
    "ship",
    "Entry interface (125 km)",
    `${EXPLAIN.edl} Speed ${vnorm(sEI.v).toFixed(2)} km/s, flight-path angle ${fpaDeg(sEI.r, sEI.v).toFixed(1)}°.`,
    "entry",
  );
  progress("Entry, descent & landing…");
  const run = (b) => runMarsEDL(SC, P, tEIa, sEI.r, sEI.v, b, site);
  const missF = (e) => gcAngle(e.ll[0], e.ll[1], site.lat, site.lon) * R;
  let bb = null;
  for (let b = 0; b <= 135; b += 9) {
    const e = run(b);
    const c = missF(e) + (e.landed ? 0 : 5000);
    if (!bb || c < bb.c) bb = { b, c };
  }
  const gg = goldenMin(
    (b) => {
      const e = run(b);
      return missF(e) + (e.landed ? 0 : 5000);
    },
    Math.max(0, bb.b - 9),
    Math.min(150, bb.b + 9),
    14,
  );
  const ent = run(gg.x);
  ship.add(new SampleSeg(body, ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Heat flux ≈ ${ent.maxHeat.toFixed(0)} W/cm².`,
    "heat",
  );
  const pdT = ent.samples.find((s) => s.phase === "powered descent")?.t;
  if (pdT)
    ship.setConfig(pdT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["lander"],
      powered: true,
    });
  const chT = ent.samples.find((s) => s.chute >= 1)?.t;
  if (chT)
    ship.setConfig(chT, "sc", {
      key: "sc",
      sc: SC.model,
      parts: ["aeroshell"],
      chute: 1,
      ...(SC.edl.trimWing ? { trim: 1 } : {}),
    });
  const tEnd = ent.t + (cfg.surfaceDays ?? 5) * D;
  shellParts(M, SC, ship, ent, site, tEnd);
  const miss = missF(ent);
  M.ev(
    ent.t,
    "ship",
    cfg.landName || "Touchdown",
    `Touchdown at ${ent.ll[0].toFixed(2)}°, ${ent.ll[1].toFixed(2)}° — ${miss.toFixed(1)} km from the target (${site.name}).`,
    "landing",
  );
  // a rover that rides down on the platform (cfg.roverOff, days after touchdown): it unfolds, the ramp opens, it drives off
  const ro = cfg.roverOff,
    dT = (k) => (ro && ro[k] != null ? ent.t + ro[k] * D : undefined);
  ship.setConfig(ent.t, "sc", {
    key: "sc",
    sc: SC.model,
    parts: ["lander"],
    landed: true,
    ...(ro
      ? { wingsT: dT("wings"), rampT: dT("ramp"), rollT: dT("roll") }
      : {}),
  });
  ship.add(
    new SurfaceSeg(
      "mars",
      ent.t,
      tEnd,
      ent.ll[0],
      ent.ll[1],
      site.elev || 0,
      ent.m,
      { extra: { phase: "surface operations" } },
    ),
  );
  for (const e of cfg.surfaceEvents || [])
    M.ev(ent.t + e.afterLanding * D, "ship", e.name, e.desc, e.kind || "info");
  M.phase(tEIa, ent.t, "Entry, descent & landing", "#ff5d5d");
  M.phase(ent.t, tEnd, "Surface operations", "#ffd166");
  M.summary.entries = [
    {
      body,
      vEI: vnorm(sEI.v),
      maxG: ent.maxG,
      maxHeat: ent.maxHeat,
      miss,
      ll: ent.ll,
    },
  ];
  M.finalize();
  return M;
}
// --------------------------------------------------------------------------
// Surface stay → ascent → (rendezvous) → Earth return
function surfaceStayAndReturn(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  ent,
  mLanded,
  progress,
) {
  const H = 3600,
    D = 86400,
    body = "mars",
    mu = BODIES.mars.mu,
    R = surfaceRadius("mars");
  const leg = nodes[iLeg + 1],
    ret = nodes[iLeg + 2];
  const site = { lat: ent.ll[0], lon: ent.ll[1], elev: leg.site.elev || 0 };
  const tDepM = ret.departMars
    ? isoToT(ret.departMars)
    : ent.t + (cfg.surfaceDays ?? 450) * D;
  // heliocentric return Lambert
  const pa = planetHelio("mars", tDepM),
    pb = planetHelio("earth", ret.t);
  const Lr = lambert(pa.r, pb.r, ret.t - tDepM, MU_SUN, [0, 0, 1]);
  const vinfOut = vsub(Lr.v1, pa.v);
  // ascent target: low Mars orbit in plane containing v∞ and the site at liftoff
  const hLMO = cfg.lmoAlt ?? 300;
  // liftoff time: plane through site containing v∞; departure periapsis reachable after short coast
  let tLiftNom = tDepM - (cfg.ascentLead ?? 6) * H;
  let plane = planeThroughSite(
    "mars",
    site.lat,
    site.lon,
    tLiftNom,
    vunit(vinfOut),
  );
  if (M.msrOrbiter) {
    // launch when the site passes under the orbiter's orbit plane
    const o = M.msrOrbiter,
      hO = vunit(vcross(o.r, o.v));
    tLiftNom = isoToT(
      ret.mavLaunch ||
        fmtUTC(ent.t + (cfg.surfaceDays ?? 300) * D).replace(" ", "T") + "Z",
    );
    const f = (tt) =>
      vdot(vunit(sitePosEcl("mars", site.lat, site.lon, 0, tt)), hO);
    let tl = null;
    for (let tt = tLiftNom; tt < tLiftNom + 2 * D; tt += 600) {
      if (f(tt) * f(tt + 600) <= 0) {
        tl = bisectRoot(f, tt, tt + 600, 50);
        break;
      }
    }
    if (tl) tLiftNom = tl;
    plane = { n: hO, az: 0 };
  }
  // surface stay segment (ISRU for Starship)
  const mProd = cfg.isru
    ? Math.max(0, cfg.isru.to - (SC.usesUpperStage ? P.upper.propLeft : 0))
    : 0; // tops the tanks up to the target
  if (cfg.isru) {
    M.ev(
      ent.t + 3 * D,
      "ship",
      "ISRU propellant plant starts",
      `Solar-powered Sabatier reactors turn Martian CO₂ and water ice into methane and oxygen: CO₂ + 4H₂ → CH₄ + 2H₂O. Target: ${(cfg.isru.to / 1000).toFixed(0)} t of propellant before the return window.`,
      "isru",
    );
  }
  const surf = new SurfaceSeg(
    "mars",
    ent.t,
    tLiftNom,
    site.lat,
    site.lon,
    site.elev,
    mLanded,
    {
      extra: {
        phase: cfg.isru
          ? "surface stay — making propellant"
          : "surface operations",
      },
    },
  );
  if (cfg.isru) {
    surf.m0 = mLanded;
    surf.m1 = mLanded + mProd;
  }
  ship.add(surf);
  M.phase(ent.t, tLiftNom, "Surface stay", "#ffd166");
  for (const e of cfg.surfaceEvents || [])
    M.ev(ent.t + e.afterLanding * D, "ship", e.name, e.desc, e.kind || "info");
  // ascent vehicle
  let stack, ascName, stageId;
  if (SC.usesUpperStage) {
    P.upper.propLeft = cfg.isru.to;
    P.upper.attached = true;
    stageId = "upper";
    stack = {
      name: "Ship",
      payload: P.massOf(SC.orbiter),
      stages: [
        {
          id: "Ship",
          name: "Ship",
          prop: "methalox",
          engine: P.upper.engine,
          n: 6,
          thrustSL: P.upper.thrustSL,
          thrustVac: P.upper.thrustVac,
          ispSL: P.upper.ispSL,
          ispVac: P.upper.ispVac,
          dry: P.upper.dry,
          propMass: P.upper.propLeft,
          propLeft: P.upper.propLeft,
          attached: true,
          ignited: false,
          geom: [[50, 4.5, 4.5, "#bbb"]],
        },
      ],
      jettison: [],
    };
    ascName = "Mars liftoff";
  } else {
    const asId = SC.prop.ascender,
      e = P.engineOf(asId),
      tk = P.tankOf(asId);
    stageId = asId;
    stack = {
      name: "MAV",
      payload: cfg.samples || 1,
      stages: [
        {
          id: "MAV",
          name: tk.name,
          prop: "solid",
          engine: e.name,
          n: 1,
          thrustSL: e.thrust * 0.9,
          thrustVac: e.thrust,
          ispSL: e.isp * 0.9,
          ispVac: e.isp,
          dry: tk.dry,
          propMass: tk.propLeft,
          propLeft: tk.propLeft,
          attached: true,
          ignited: false,
          geom: [[3, 0.3, 0.3, "#ddd"]],
        },
      ],
      jettison: [],
    };
    ascName = "Mars Ascent Vehicle launch";
  }
  progress("Mars ascent…");
  const AS = SC.usesUpperStage
    ? simulateAscent({
        body: "mars",
        t0: tLiftNom,
        lat: site.lat,
        lon: site.lon,
        siteElev: site.elev,
        stack,
        target: { normal: plane.n, hp: Math.min(110, hLMO), ha: hLMO },
        vert: 6,
        kick: 10,
        closedLoopAt: 25,
        dt: 0.2,
        maxTime: 1500,
        sampleDt: 1,
      })
    : simulateTwoBurnAscent({
        body: "mars",
        t0: tLiftNom,
        lat: site.lat,
        lon: site.lon,
        siteElev: site.elev,
        stack,
        target: { normal: plane.n, hp: hLMO, ha: hLMO },
        vert: 3,
      });
  const used = stack.stages[0].propMass - AS.stack.stages[0].propLeft;
  P.tankOf(stageId).propLeft -= used;
  ship.setConfig(tLiftNom, "sc", {
    key: "sc",
    sc: SC.model,
    parts: SC.usesUpperStage ? ["ship"] : ["mav"],
  });
  ship.add(
    new SampleSeg(
      "mars",
      AS.samples.map((s) => ({ ...s, phase: "Mars ascent" })),
      { phase: "Mars ascent" },
    ),
  );
  const dvAsc =
    dvForProp(
      stack.stages[0].dry + stack.stages[0].propMass + stack.payload,
      used,
      stack.stages[0].ispVac,
    ) * 1000;
  M.burn({
    name: ascName,
    t: tLiftNom,
    dur: AS.t - tLiftNom,
    dv: dvAsc,
    engine: stack.stages[0].engine,
    isp: stack.stages[0].ispVac,
    prop: used,
    m0: stack.stages[0].dry + stack.stages[0].propMass + stack.payload,
    obj: "ship",
    propType: SC.usesUpperStage ? "methalox" : "solid",
  });
  M.ev(
    tLiftNom,
    "ship",
    ascName,
    `Liftoff from Mars: gravity 3.71 m/s², low-orbit speed only ≈3.4 km/s (vs 7.8 km/s at Earth). Δv ≈ ${dvAsc.toFixed(0)} m/s into a ${Math.min(110, hLMO)} × ${hLMO} km orbit.`,
    "launch",
  );
  if (!AS.ok) M.warnings.push("Mars ascent did not reach orbit.");
  for (const e of AS.events)
    if (e.kind === "insertion")
      M.ev(e.t, "ship", "Mars orbit insertion (ascent)", e.desc, "insertion");
  let t = AS.t,
    r = AS.r,
    v = AS.v,
    mass = AS.m;
  M.phase(tLiftNom, AS.t, "Mars ascent", "#06d6a0");
  if (!SC.usesUpperStage && M.msrOrbiter) {
    ship.setConfig(AS.t, "sc", { key: "sc", sc: SC.model, parts: ["os"] });
    return msrRendezvousAndReturn(
      M,
      cfg,
      SC,
      P,
      M.msrOrbiter,
      ship,
      AS,
      site,
      nodes,
      iLeg,
      ret,
      vinfOut,
      tDepM,
      progress,
    );
  }
  // TEI from LMO
  return departPlanet(
    M,
    cfg,
    SC,
    P,
    ship,
    t,
    r,
    v,
    "mars",
    mass,
    vinfOut,
    tDepM,
    ret,
    progress,
  );
}
function orbitStayAndReturn(
  M,
  cfg,
  SC,
  P,
  ship,
  nodes,
  lam,
  iLeg,
  t,
  r,
  v,
  body,
  mass,
  progress,
) {
  const H = 3600,
    D = 86400,
    leg = nodes[iLeg + 1],
    ret = nodes[iLeg + 2];
  const tDepM = ret.departMars
    ? isoToT(ret.departMars)
    : t + (cfg.orbitDays ?? 30) * D;
  const pa = planetHelio(body, tDepM),
    pb = planetHelio("earth", ret.t);
  const Lr = lambert(pa.r, pb.r, ret.t - tDepM, MU_SUN, [0, 0, 1]);
  const vinfOut = vsub(Lr.v1, pa.v);
  for (const e of leg.orbitEvents || [])
    M.ev(t + e.afterArrival * D, "ship", e.name, e.desc, e.kind || "photo");
  return departPlanet(
    M,
    cfg,
    SC,
    P,
    ship,
    t,
    r,
    v,
    body,
    mass,
    vinfOut,
    tDepM,
    ret,
    progress,
    true,
  );
}
// departure from planetary orbit toward Earth, with patched-conic targeting of the Earth entry
function departPlanet(
  M,
  cfg,
  SC,
  P,
  ship,
  t,
  r,
  v,
  body,
  mass,
  vinfOut,
  tDepNom,
  ret,
  progress,
  fromHighOrbit,
) {
  const H = 3600,
    D = 86400,
    mu = BODIES[body].mu,
    R = surfaceRadius(body);
  progress("Trans-Earth injection targeting…");
  const el = rv2coe(r, v, mu);
  // find TEI point: minimise impulsive Δv to reach the outgoing asymptote, over the orbit before nominal departure
  const per = el.period;
  const dvAt = (tb) => {
    const s = kepProp(r, v, tb - t, mu),
      rn = vnorm(s.r);
    const hh = vunit(vcross(s.r, s.v));
    // hyperbola through s.r with asymptote along vinfOut (projected into a plane containing r and v∞)
    const Sx = vunit(vinfOut);
    let hq = vunit(vcross(s.r, Sx));
    if (vdot(hq, hh) < 0) hq = vscale(hq, -1);
    const thr = Math.atan2(
      vdot(vcross(vunit(s.r), Sx), hq),
      vdot(vunit(s.r), Sx),
    ); // angle from r to asymptote
    const vi = vnorm(vinfOut);
    const f = (e) => {
      const nuI = Math.acos(-1 / e);
      const nuR = nuI - thr;
      const p = ((e * e - 1) * mu) / (vi * vi);
      return rn * (1 + e * Math.cos(nuR)) - p;
    };
    const e = bisectRoot(f, 1.0001, 50) ?? 1.5;
    const nuI = Math.acos(-1 / e),
      nuR = nuI - thr,
      p = ((e * e - 1) * mu) / (vi * vi);
    const vr = Math.sqrt(mu / p) * e * Math.sin(nuR),
      vt = Math.sqrt(mu / p) * (1 + e * Math.cos(nuR));
    const vNeed = vadd(
      vscale(vunit(s.r), vr),
      vscale(vunit(vcross(hq, s.r)), vt),
    );
    return { tb, s, vNeed, dv: vnorm(vsub(vNeed, s.v)) };
  };
  let best = null;
  const tStart = Math.max(t + 0.3 * H, tDepNom - per * 1.5);
  for (let tb = tStart; tb < tStart + per * 2; tb += per / 90) {
    const o = dvAt(tb);
    if (!best || o.dv < best.dv) best = o;
  }
  const gm = goldenMin(
    (tb) => dvAt(tb).dv,
    best.tb - per / 90,
    best.tb + per / 90,
    30,
  );
  best = dvAt(gm.x);
  const tTEI = best.tb,
    sTEI = best.s;
  // Earth arrival target (entry)
  const retLeg = { ...ret, type: "entry", body: "earth" };
  const Lret =
    lambert(
      bodyPos(body, tTEI),
      bodyPos("earth", ret.t),
      ret.t - tTEI,
      MU_SUN,
      [0, 0, 1],
    ) ||
    lambert(
      bodyPos(body, tDepNom),
      bodyPos("earth", ret.t),
      ret.t - tDepNom,
      MU_SUN,
      [0, 0, 1],
    );
  let tgt = arrivalTarget(
    cfg,
    retLeg,
    vsub(Lret.v2, planetHelio("earth", ret.t).v),
    ret.t,
    SC,
    P,
    M,
  );
  const F = (x) => {
    const o = patchedLeg(
      tTEI,
      sTEI.r,
      vadd(best.vNeed, x),
      body,
      "earth",
      ret.t,
    );
    if (!o || o.miss || !o.bv) return [1e3, 1e3, 1e3];
    const ax = bPlaneAxes(o.bv.S);
    return [
      (vdot(o.bv.B, ax.T) - vdot(tgt.B, ax.T)) / 1000,
      (vdot(o.bv.B, ax.R) - vdot(tgt.B, ax.R)) / 1000,
      (o.tp - tgt.tp) / H / 2,
    ];
  };
  const s1 = newtonSolve(
    (x) =>
      vscale(
        centreMiss(tTEI, sTEI.r, vadd(best.vNeed, x), body, "earth", tgt.tp),
        1e-4,
      ),
    [0, 0, 0],
    { h: 1e-7, tol: 1e-3, maxIt: 30, maxStep: 0.1 },
  );
  let sol = newtonSolve(F, s1.x, {
    h: 1e-7,
    tol: 1e-3,
    maxIt: 30,
    maxStep: 0.05,
  });
  for (let k = 0; k < 2; k++) {
    const o = patchedLeg(
      tTEI,
      sTEI.r,
      vadd(best.vNeed, sol.x),
      body,
      "earth",
      ret.t,
    );
    if (!o || o.miss) break;
    tgt = arrivalTarget(cfg, retLeg, vscale(o.bv.S, o.bv.vinf), o.tp, SC, P, M);
    sol = newtonSolve(F, sol.x, {
      h: 1e-7,
      tol: 1e-3,
      maxIt: 30,
      maxStep: 0.05,
    });
  }
  if (!sol.ok)
    M.warnings.push(
      `Earth-return targeting converged approximately (residual ${sol.norm.toFixed(2)}).`,
    );
  const vPost = vadd(best.vNeed, sol.x),
    dvv = vsub(vPost, sTEI.v);
  const engId = SC.usesUpperStage ? "upper" : SC.prop.orbiter;
  const pm = P.burn(engId, mass, vnorm(dvv));
  ship.add(
    new ConicSeg(body, t, tTEI - pm.dur / 2, r, v, mass, {
      extra: { phase: `${BODIES[body].name} orbit` },
    }),
  );
  ship.add(
    new BurnSeg(
      body,
      tTEI,
      pm.dur,
      sTEI.r,
      sTEI.v,
      vadd(sTEI.v, vscale(dvv, pm.dvAch / vnorm(dvv))),
      mass,
      mass - pm.prop,
      pm.thrust,
      { extra: { phase: "trans-Earth injection", stage: engId } },
    ),
  );
  M.burn({
    name: "TEI — trans-Earth injection",
    t: tTEI - pm.dur / 2,
    dur: pm.dur,
    dv: pm.dvAch * 1000,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: mass,
    obj: "ship",
    propType: pm.propType,
  });
  M.ev(
    tTEI - pm.dur / 2,
    "ship",
    "Trans-Earth injection",
    `Escape burn toward Earth: v∞ = ${vnorm(vinfOut).toFixed(2)} km/s. Δv ${(pm.dvAch * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  if (!pm.ok)
    M.warnings.push("Insufficient propellant for trans-Earth injection.");
  M.phase(t - 2 * H, tTEI, `${BODIES[body].name} orbit`, "#43aa8b");
  mass -= pm.prop;
  const tPost = tTEI + pm.dur / 2,
    sP = kepProp(
      sTEI.r,
      vadd(sTEI.v, vscale(dvv, pm.dvAch / vnorm(dvv))),
      pm.dur / 2,
      mu,
    );
  const nodes2 = [{ body, t: tTEI }, retLeg];
  return cruiseAndArrive(
    M,
    cfg,
    SC,
    P,
    ship,
    nodes2,
    [{}],
    0,
    tPost,
    sP.r,
    sP.v,
    body,
    mass,
    tgt,
    progress,
  );
}
// --------------------------------------------------------------------------
// porkchop: departure/arrival grid → C3 (km²/s²) and arrival v∞ (km/s)
function porkchop(from, to, tDep0, tDep1, tof0, tof1, nx = 60, ny = 60) {
  const out = {
    nx,
    ny,
    tDep0,
    tDep1,
    tof0,
    tof1,
    c3: new Float32Array(nx * ny),
    vinf: new Float32Array(nx * ny),
  };
  for (let i = 0; i < nx; i++) {
    const td = tDep0 + ((tDep1 - tDep0) * i) / (nx - 1),
      a = planetHelio(from, td);
    for (let j = 0; j < ny; j++) {
      const tof = tof0 + ((tof1 - tof0) * j) / (ny - 1),
        b = planetHelio(to, td + tof);
      const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
      if (!L) {
        out.c3[j * nx + i] = NaN;
        out.vinf[j * nx + i] = NaN;
        continue;
      }
      const d = vsub(L.v1, a.v),
        e = vsub(L.v2, b.v);
      out.c3[j * nx + i] = vdot(d, d);
      out.vinf[j * nx + i] = vnorm(e);
    }
  }
  return out;
}
function bestTransfer(from, to, tDep0, tDep1, tof0, tof1, wArr = 1) {
  const f = (x) => {
    const td = x[0],
      tof = x[1];
    if (tof < tof0 || tof > tof1 || td < tDep0 || td > tDep1) return 1e9;
    const a = planetHelio(from, td),
      b = planetHelio(to, td + tof);
    const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
    if (!L) return 1e9;
    const d = vsub(L.v1, a.v),
      e = vsub(L.v2, b.v);
    return vdot(d, d) + wArr * vdot(e, e);
  };
  let best = null;
  for (let i = 0; i <= 30; i++)
    for (let j = 0; j <= 30; j++) {
      const x = [
        tDep0 + ((tDep1 - tDep0) * i) / 30,
        tof0 + ((tof1 - tof0) * j) / 30,
      ];
      const v = f(x);
      if (!best || v < best.v) best = { x, v };
    }
  const nm = nelderMead(f, best.x, [(tDep1 - tDep0) / 30, (tof1 - tof0) / 30], {
    maxIt: 200,
    tol: 1e-10,
  });
  const td = nm.x[0],
    tof = nm.x[1],
    a = planetHelio(from, td),
    b = planetHelio(to, td + tof);
  const L = lambert(a.r, b.r, tof, MU_SUN, [0, 0, 1]);
  return {
    tDep: td,
    tArr: td + tof,
    tof,
    c3: vdot(vsub(L.v1, a.v), vsub(L.v1, a.v)),
    vinfArr: vnorm(vsub(L.v2, b.v)),
  };
}

// ---------------------------------------------------------------------------
// Sample-return orbiter: separates on approach, diverts, captures, aerobrakes to a low orbit and waits
function msrOrbiterBranch(M, cfg, SC, P, tE, rT, vT, massStack, tEI, leg) {
  const H = 3600,
    D = 86400,
    mu = BODIES.mars.mu,
    R = surfaceRadius("mars");
  const tSep = tEI - (cfg.orbiterSepDays ?? 2) * D;
  const tSepAbs = Math.max(tSep, tE + 600);
  const sS = kepProp(rT, vT, tSepAbs - tE, mu);
  const orb = M.addObj(
    new MObject("orbiter", cfg.orbiterName || "Earth-return orbiter", {
      model: SC.model,
      color: "#7fd1ff",
      primary: false,
    }),
  );
  orb.setConfig(tSepAbs, "sc", { key: "sc", sc: SC.model, parts: ["orbiter"] });
  const engId = SC.prop.orbiter;
  let m = P.massOf(SC.orbiter);
  // divert: raise periapsis to R + capPeri while keeping plane
  const rpT = R + (cfg.capPeri ?? 400);
  const elA = rv2coe(sS.r, sS.v, mu);
  const S = vunit(bVector(sS.r, sS.v, mu).S),
    hh = vunit(elA.h);
  const Bt = vscale(
    vunit(vcross(S, hh)),
    bFromRp(rpT, Math.sqrt(2 * elA.energy), mu),
  );
  const F = (x) => {
    const v2 = vadd(sS.v, x);
    const bv = bVector(sS.r, v2, mu);
    if (!bv) return [1e3, 1e3];
    const ax = bPlaneAxes(bv.S);
    return [
      (vdot(bv.B, ax.T) - vdot(Bt, ax.T)) / 100,
      (vdot(bv.B, ax.R) - vdot(Bt, ax.R)) / 100,
    ];
  };
  const so = newtonSolve(F, [0, 0, 0], { h: 1e-7, tol: 1e-4, maxIt: 30 });
  const pd = P.burn(engId, m, vnorm(so.x));
  m -= pd.prop;
  M.burn({
    name: "Orbiter divert manoeuvre",
    t: tSepAbs,
    dur: pd.dur,
    dv: vnorm(so.x) * 1000,
    engine: pd.engine,
    isp: pd.isp,
    prop: pd.prop,
    m0: m + pd.prop,
    obj: "orbiter",
    propType: pd.propType,
  });
  M.ev(
    tSepAbs,
    "orbiter",
    "Lander / orbiter separation",
    `The entry capsule continues toward the atmosphere; the orbiter diverts (Δv ${(vnorm(so.x) * 1000).toFixed(1)} m/s) to pass ${cfg.capPeri ?? 400} km above Mars instead.`,
    "sep",
  );
  const v1 = vadd(sS.v, so.x);
  const tP = tSepAbs + timeToPeri(sS.r, v1, mu),
    sP = kepProp(sS.r, v1, tP - tSepAbs, mu);
  const ra = R + (cfg.capApo ?? 40000),
    rp = vnorm(sP.r);
  const vp = Math.sqrt(mu * (2 / rp - 2 / (rp + ra))),
    dvM = vnorm(sP.v) - vp;
  const pm = P.burn(engId, m, dvM);
  const vPost = vscale(vunit(sP.v), vnorm(sP.v) - pm.dvAch);
  orb.add(
    new ConicSeg("mars", tSepAbs, tP - pm.dur / 2, sS.r, v1, m, {
      extra: { phase: "orbiter approach" },
    }),
  );
  orb.add(
    new BurnSeg(
      "mars",
      tP,
      pm.dur,
      sP.r,
      sP.v,
      vPost,
      m,
      m - pm.prop,
      pm.thrust,
      { extra: { phase: "orbit insertion burn" } },
    ),
  );
  M.burn({
    name: "Orbiter MOI — capture",
    t: tP - pm.dur / 2,
    dur: pm.dur,
    dv: pm.dvAch * 1000,
    engine: pm.engine,
    isp: pm.isp,
    prop: pm.prop,
    m0: m,
    obj: "orbiter",
    propType: pm.propType,
  });
  M.ev(
    tP - pm.dur / 2,
    "orbiter",
    "Orbiter: Mars orbit insertion",
    `${EXPLAIN.moi} Capture into ${cfg.capPeri ?? 400} × ${Math.round((ra - R) / 1000)},000 km. Δv ${(pm.dvAch * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  m -= pm.prop;
  // aerobraking (simplified): apoapsis lowered in steps by atmospheric drag passes — no propellant
  let t = tP + pm.dur / 2,
    st = kepProp(sP.r, vPost, pm.dur / 2, mu),
    r = st.r,
    v = st.v;
  const steps = cfg.aerobrakeSteps ?? 8,
    tAB = (cfg.aerobrakeDays ?? 150) * D;
  const rLow = R + (cfg.lmoOrbiter ?? 400);
  M.ev(
    t + 2 * D,
    "orbiter",
    "Aerobraking campaign begins",
    `Hundreds of shallow passes through the upper atmosphere (≈110 km) gradually shrink the orbit without propellant. (Simplified here as ${steps} steps.)`,
    "info",
  );
  for (let k = 1; k <= steps; k++) {
    // the drag passes are at periapsis: each step ends at the periapsis passage nearest its share of the campaign, where the
    // smaller orbit starts from the same point (switching orbits anywhere else would move the orbiter by up to thousands of km)
    const Tp = TAU * Math.sqrt(Math.pow(rv2coe(r, v, mu).a, 3) / mu),
      tq = t + timeToPeri(r, v, mu);
    const tk = tq + Math.max(1, Math.round((t + tAB / steps - tq) / Tp)) * Tp;
    orb.add(
      new ConicSeg("mars", t, tk, r, v, m, { extra: { phase: "aerobraking" } }),
    );
    const s2 = kepProp(r, v, tk - t, mu);
    const el = rv2coe(s2.r, s2.v, mu);
    const raN = el.ra + (rLow - el.ra) * (k / steps);
    // at periapsis, set the new orbit with the same periapsis direction & radius rp0, new apoapsis
    const rp0 = el.rp,
      aN = (rp0 + raN) / 2,
      eN = (raN - rp0) / (raN + rp0),
      pN = aN * (1 - eN * eN);
    const nu = el.nu;
    const vN = coe2rv(pN, eN, el.i, el.Om, el.w, nu, mu);
    r = vN.r;
    v = vN.v;
    t = tk;
  }
  // final circularisation near periapsis (small burn)
  M.ev(
    t,
    "orbiter",
    "Aerobraking complete",
    `Orbit lowered to about ${cfg.lmoOrbiter ?? 400} km. The orbiter waits for the orbiting sample container.`,
    "info",
  );
  return { obj: orb, t, r, v, m, engId };
}
function msrRendezvousAndReturn(
  M,
  cfg,
  SC,
  P,
  orbInfo,
  mavObj,
  AS,
  site,
  nodes,
  iLeg,
  ret,
  vinfOut,
  tDepM,
  progress,
) {
  const H = 3600,
    D = 86400,
    mu = BODIES.mars.mu;
  const orb = orbInfo.obj;
  // MAV orbit (sample container) propagates; orbiter intercepts via Lambert
  const tI = AS.t,
    osR = AS.r,
    osV = AS.v;
  if (globalThis.DEBUG) {
    const hO = vunit(vcross(orbInfo.r, orbInfo.v)),
      hS = vunit(vcross(osR, osV));
    console.log(
      "MSR plane diff deg",
      vangle(hO, hS) * RAD,
      "OS orbit",
      rv2coe(osR, osV, mu).rp - surfaceRadius("mars"),
      rv2coe(osR, osV, mu).ra - surfaceRadius("mars"),
      "orb",
      rv2coe(orbInfo.r, orbInfo.v, mu).rp - surfaceRadius("mars"),
      rv2coe(orbInfo.r, orbInfo.v, mu).ra - surfaceRadius("mars"),
    );
  }
  let best = null;
  for (let tt = tI + 0.5 * H; tt < tI + 96 * H; tt += 300) {
    const so = kepProp(orbInfo.r, orbInfo.v, tt - orbInfo.t, mu);
    const Pp = 2 * Math.PI * Math.sqrt(Math.pow(vnorm(so.r), 3) / mu);
    for (const fr of [0.42, 0.48, 0.54]) {
      const tof = fr * Pp,
        sc = kepProp(osR, osV, tt + tof - tI, mu);
      const Lb = lambert(so.r, sc.r, tof, mu, vunit(vcross(so.r, so.v)));
      if (!Lb) continue;
      const tot = vnorm(vsub(Lb.v1, so.v)) + vnorm(vsub(sc.v, Lb.v2));
      if (!best || tot < best.tot) best = { tt, tof, tot, so, sc, Lb };
    }
  }
  orb.add(
    new ConicSeg("mars", orbInfo.t, best.tt, orbInfo.r, orbInfo.v, orbInfo.m, {
      extra: { phase: "low Mars orbit — waiting" },
    }),
  );
  const p1 = P.burn(
    orbInfo.engId,
    orbInfo.m,
    vnorm(vsub(best.Lb.v1, best.so.v)),
  );
  let m = orbInfo.m - p1.prop;
  orb.add(
    new ConicSeg(
      "mars",
      best.tt,
      best.tt + best.tof,
      best.so.r,
      best.Lb.v1,
      m,
      { extra: { phase: "rendezvous transfer" } },
    ),
  );
  const p2 = P.burn(orbInfo.engId, m, vnorm(vsub(best.sc.v, best.Lb.v2)));
  m -= p2.prop;
  M.burn({
    name: "Orbiter rendezvous (intercept + braking)",
    t: best.tt,
    dur: p1.dur + p2.dur,
    dv: best.tot * 1000,
    engine: p1.engine,
    isp: p1.isp,
    prop: p1.prop + p2.prop,
    m0: orbInfo.m,
    obj: "orbiter",
    propType: p1.propType,
  });
  M.ev(
    best.tt,
    "orbiter",
    "Rendezvous with the sample container",
    `The orbiter tracks the basketball-sized container with its cameras and closes in. Δv ${(best.tot * 1000).toFixed(0)} m/s.`,
    "burn",
  );
  const tCap = best.tt + best.tof;
  mavObj.add(
    new ConicSeg("mars", tI, tCap, osR, osV, cfg.samples || 1, {
      extra: { phase: "orbiting sample container" },
    }),
  );
  M.ev(
    tCap,
    "orbiter",
    "Sample capture",
    "The container is captured, sealed in a biocontainment system and transferred into the Earth entry capsule.",
    "dock",
  );
  M.phase(tI, tCap, "Rendezvous in Mars orbit", "#06d6a0");
  return departPlanet(
    M,
    cfg,
    SC,
    P,
    orb,
    tCap,
    best.sc.r,
    best.sc.v,
    "mars",
    m + (cfg.samples || 1),
    vinfOut,
    tDepM,
    ret,
    progress,
    false,
  );
}

// ---- leo.js
// ============================================================================
// leo.js — Earth-orbit missions flown by the Space Shuttle: ascent to main engine cutoff, External Tank
// separation, OMS burns, payload deploy or rendezvous and docking with the ISS, deorbit, winged entry,
// terminal area energy management (TAEM) around the heading alignment cone, and the runway landing.
// Orbits are integrated with Earth's J2 oblateness (the plane of a low orbit swings several degrees a day).
// ============================================================================
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

function planLEO(cfg, progress = () => {}) {
  const M = new Mission(cfg),
    H = 3600;
  const L = shuttleLauncher(cfg);
  const SC = JSON.parse(JSON.stringify(SPACECRAFT[cfg.spacecraft]));
  if (cfg.scOverride)
    for (const k in cfg.scOverride)
      Object.assign(SC.modules[k], cfg.scOverride[k]);
  if (cfg.payloadMass != null && SC.modules.PAY)
    SC.modules.PAY.dry = cfg.payloadMass;
  const P = new Propulsion(SC);
  const S = LAUNCH_SITES[cfg.site],
    t0 = M.t0,
    rwy = RUNWAYS[cfg.runway] || RUNWAYS.KSC15;
  const ship = M.addObj(
    new MObject("ship", cfg.shipName || SC.name, {
      primary: true,
      crew: cfg.crew || 0,
      model: SC.model,
      color: "#ffd166",
    }),
  );
  const OMS = "OMS",
    eng = P.engineOf(OMS),
    mdotOMS = eng.thrust / (eng.isp * G0);
  // ---------------- launch ----------------
  const incl = cfg.incl ?? 51.6;
  const azI =
    Math.asin(clamp(Math.cos(incl * DEG) / Math.cos(S.lat * DEG), -1, 1)) * RAD;
  const normal = planeNormalFromAz("earth", S.lat, S.lon, t0, azI);
  progress("Solving the ascent: boosters, main engines, MECO…");
  const LP = launchPhase(M, cfg, L, scTotalMass(SC), normal, { ship });
  M.notes.push(
    `Launch azimuth ${azI.toFixed(1)}° (inertial, north-east) for an orbit inclined ${incl.toFixed(2)}° to the equator.`,
  );
  if (!LP.ok) {
    M.warnings.push("The Shuttle cannot reach orbit with this payload.");
    M.failed = "ascent";
    M.finalize();
    return M;
  }
  const asc = LP.asc;
  shuttleAscentEvents(M, cfg, L, asc, ship);
  let t = asc.t,
    y = [...asc.r, ...asc.v, asc.m];
  const st = () => ({ r: [y[0], y[1], y[2]], v: [y[3], y[4], y[5]] });
  const coast = (tEnd, phase, extra) => {
    if (tEnd <= t + 1e-6) return null;
    const res = leoInt(t, y, tEnd);
    ship.add(resToSeg(res, phase, extra));
    t = res.tEnd;
    y = Array.from(res.y[res.y.length - 1]);
    return res;
  };
  // finite OMS burn centred on tc; dvAt(state at tc) gives the impulsive Δv vector it replaces
  const omsBurn = (tc, dvAt, name, describe, phase) => {
    const pre = leoInt(t, y, tc);
    const sC = Array.from(pre.y[pre.y.length - 1]);
    const dv = dvAt([sC[0], sC[1], sC[2]], [sC[3], sC[4], sC[5]]),
      dvm = vnorm(dv);
    if (!(dvm > 1e-6)) return null;
    const D = propForDv(sC[6], dvm, eng.isp) / mdotOMS,
      tIgn = tc - D / 2;
    coast(tIgn, phase);
    const law = localDirLaw(st().r, st().v, vunit(dv));
    const tank = P.tankOf(OMS);
    const Dmax = tank.propLeft / mdotOMS,
      Duse = Math.min(D, Dmax);
    const res = leoInt(tIgn, y, tIgn + Duse, {
      thrust: { T: eng.thrust, mdot: mdotOMS, dir: law },
      hmax: 2,
      h0: 0.5,
    });
    ship.add(resToSeg(res, name, { stage: OMS }, { T: eng.thrust, law }));
    const used = res.y[0][6] - res.y[res.y.length - 1][6];
    tank.propLeft -= used;
    const dvA = dvForProp(res.y[0][6], used, eng.isp) * 1000;
    M.burn({
      name,
      t: tIgn,
      dur: Duse,
      dv: dvA,
      engine: eng.name,
      isp: eng.isp,
      prop: used,
      m0: res.y[0][6],
      obj: "ship",
      propType: eng.prop,
    });
    t = res.tEnd;
    y = Array.from(res.y[res.y.length - 1]);
    const el = rv2coe(st().r, st().v, MU_E);
    M.ev(
      tIgn,
      "ship",
      name.split(" — ")[0],
      describe({ dv: dvA, dur: Duse, hp: el.rp - R_E, ha: el.ra - R_E }),
      "burn",
      { dv: dvA },
    );
    if (Duse < D - 0.5)
      M.warnings.push(`The OMS ran dry during ${name.split(" — ")[0]}.`);
    return { tIgn, dur: Duse, dv: dvA };
  };
  // tangential Δv at a point that puts the opposite side of the orbit at radius rT
  const dvToApsis = (r, v, rT) => {
    const rn = vnorm(r),
      vt = vnorm(vsub(v, vscale(vunit(r), vdot(v, vunit(r)))));
    const vNeed = Math.sqrt((2 * MU_E * rT) / (rn * (rn + rT)));
    return vscale(vunit(v), vNeed - vt);
  };
  // ---------------- MECO → External Tank separation ----------------
  const tMECO = asc.t,
    tETsep = tMECO + 18;
  coast(tETsep, "MECO — coasting with the tank");
  {
    const et = M.addObj(
      new MObject("et", "External Tank", {
        kind: "stage",
        model: "stage",
        color: "#d98b4a",
      }),
    );
    et.setConfig(tETsep, "stage", {
      key: "stage",
      launcher: cfg.launcher,
      stage: 1,
      variant: cfg.lvVariant,
    });
    // The stack's attitude after MECO (as the viewer draws it): nose along the velocity, the tank's −Z side (where the
    // orbiter rides) facing down — or up after the roll to heads-up. The trajectory so far is the stack's reference point
    // on the tank's axis; the orbiter's own reference point sits 7.4 m aft of it and 8.55 m off the axis.
    const sv = st(),
      n = vunit(sv.v),
      upS = vunit(sv.r),
      hN = vunit(vcross(asc.r, asc.v)),
      A = vunit(vcross(hN, upS)),
      ref = vsub(upS, A);
    let Zs = vunit(vsub(ref, vscale(n, vdot(ref, n))));
    if (cfg.headsUpMET) Zs = vscale(Zs, -1);
    const offOrb = vadd(vscale(n, -0.007405), vscale(Zs, -0.00855)),
      mET = asc.upper ? asc.upper.dry + asc.upper.propLeft : L.stages[1].dry;
    const rET = leoInt(
      tETsep,
      [...sv.r, ...vadd(sv.v, vscale(Zs, 0.0006)), mET],
      tETsep + 3 * H,
      {
        events: [
          {
            name: "breakup",
            dir: -1,
            terminal: true,
            g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - (R_E + 75),
          },
        ],
      },
    );
    et.add(resToSeg(rET, "External Tank — falling back"));
    if (rET.stopEvent) {
      const ll = subPointLL(
        "earth",
        [rET.stopEvent.y[0], rET.stopEvent.y[1], rET.stopEvent.y[2]],
        rET.stopEvent.t,
      );
      M.ev(
        rET.stopEvent.t,
        "et",
        "External Tank breaks up",
        `The empty tank, ${Math.round(mET / 1000)} t, comes back into the atmosphere half an orbit after separation and breaks up around 75 km over the ${oceanName(ll[0], ll[1])}. It was the only part of the Shuttle that was not reused.`,
        "info",
      );
    }
    y[6] = P.massOf(SC.orbiter);
    for (let k = 0; k < 3; k++) {
      y[k] += offOrb[k];
      y[3 + k] -= Zs[k] * 0.0012;
    } // the −Z translation, away from the tank
    ship.setConfig(tETsep, "sc", orbiterCfg(cfg));
    M.ev(
      tETsep,
      "ship",
      "External Tank separation",
      `Eighteen seconds after MECO the tank is released and the orbiter fires its reaction-control jets to move clear (a 4 ft/s "−Z translation"). MECO left the orbit's low point inside the atmosphere on purpose, so the tank falls back on its own; the orbiter will raise its perigee with the OMS.`,
      "sep",
    );
  }
  // ---------------- OMS-1 (standard insertion only) and OMS-2 ----------------
  progress("OMS burns: raising the orbit…");
  if (cfg.oms1)
    omsBurn(
      t0 + cfg.oms1.met,
      (r, v) => dvToApsis(r, v, R_E + cfg.oms1.ha),
      "OMS-1 — orbit insertion",
      (b) =>
        `Both OMS engines fire for ${fmtDur(b.dur)} (Δv ${Math.round(b.dv)} m/s), raising the far side of the orbit to ${fmtNmi(b.ha)}. Early flights flew this "standard insertion"; from 1984 a higher MECO made OMS-1 unnecessary.`,
      "MECO — coasting",
    );
  {
    const s = st();
    const tA = nextApsis(t, s.r, s.v, true);
    const hp = cfg.oms2.hp;
    omsBurn(
      tA,
      (r, v) => dvToApsis(r, v, R_E + hp),
      "OMS-2 — circularisation",
      (b) =>
        `At the high point of the orbit both OMS engines fire for ${fmtDur(b.dur)} (Δv ${Math.round(b.dv)} m/s): the perigee rises out of the atmosphere. Orbit now ${Math.round(b.hp)} × ${Math.round(b.ha)} km.`,
      "climbing to apogee",
    );
  }
  M.phase(tMECO, t, "Orbit insertion", "#4ea8de");
  const tIns = t;
  // payload bay doors open about 1½ hours after launch: the radiators on their inner faces must dump the orbiter's heat
  const tBay = t0 + (cfg.bayOpenMET ?? 1.5) * H;
  ship.setConfig(tBay, "sc", { ...orbiterCfg(cfg), bay: "open", bayT: tBay }); // the doors swing open over the next three minutes (app/32_shuttle.js)
  M.ev(
    tBay,
    "ship",
    "Payload bay doors open",
    "The two 18-m doors swing open. Their inner faces are the radiators that carry the orbiter’s heat away — without opening them the crew would have to come home within hours.",
    "info",
  );
  // ---------------- orbit operations ----------------
  const ops = {
    M,
    cfg,
    SC,
    P,
    ship,
    L,
    t0,
    H,
    omsBurn,
    coast,
    dvToApsis,
    get t() {
      return t;
    },
    set t(v) {
      t = v;
    },
    get y() {
      return y;
    },
    set y(v) {
      y = v;
    },
    st,
    tBay,
    rwy,
    progress,
  };
  for (const b of cfg.orbitBurns || []) {
    let tc = t0 + b.met * H;
    if (b.at) {
      const pre = leoInt(t, y, tc);
      const yy = pre.y[pre.y.length - 1];
      tc = nextApsis(
        tc,
        [yy[0], yy[1], yy[2]],
        [yy[3], yy[4], yy[5]],
        b.at === "apo",
      );
    }
    omsBurn(
      tc,
      (r, v) =>
        b.ha != null
          ? dvToApsis(r, v, R_E + b.ha)
          : dvToApsis(r, v, R_E + b.hp),
      b.name,
      (x) =>
        `${b.desc || "Orbit adjustment."} Δv ${Math.round(x.dv)} m/s. Orbit now ${Math.round(x.hp)} × ${Math.round(x.ha)} km.`,
      "in orbit",
    );
  }
  for (const e of cfg.scripted || [])
    M.ev(t0 + e.met * H, "ship", e.name, e.desc, e.kind || "info");
  if (cfg.iss) issRendezvous(ops);
  if (cfg.deploy) payloadDeploy(ops);
  return shuttleReturn(ops, tIns);
}
// rename and add the Shuttle's ascent milestones
function shuttleAscentEvents(M, cfg, L, asc, ship) {
  const t0 = M.t0,
    ev = M.events,
    H = 3600;
  const find = (f) => ev.find(f);
  const po = find((e) => e.name === "Pitch-over");
  if (po) {
    po.name = "Roll program";
    po.t = t0 + 10;
    po.desc = `Clear of the tower, the Shuttle rolls onto its launch azimuth (${asc.azI.toFixed(0)}° inertial) and pitches over, ending up “heads-down”: the orbiter rides beneath the tank with the crew facing the ground. The attitude spreads the aerodynamic loads on the wings and keeps the antennas pointed at the ground stations.`;
  }
  const lo = find((e) => e.name === "Liftoff");
  if (lo)
    lo.desc = `The boosters ignite at T−0 and the hold-down bolts fire: ${(liftoffStages(L).reduce((a, s) => a + s.thrustSL, 0) / 1e6).toFixed(1)} MN of thrust, about 85 % of it from the two solid rocket boosters, lifts ${(stackMass(buildAscentStack(L, asc.stack.payload)) / 1000).toFixed(0)} t off the pad.`;
  const sch = L.stages[1].sched;
  if (sch) {
    const iD = sch.findIndex((p, i) => i > 0 && p[1] < sch[i - 1][1]),
      iU = sch.findIndex((p, i) => i > iD && iD > 0 && p[1] > sch[i - 1][1]);
    if (iD > 0)
      M.ev(
        t0 + sch[iD - 1][0],
        "ship",
        "Throttle down",
        `The main engines throttle back to about ${Math.round(sch[iD][1] * 104.5)} % for the thickest air, so the dynamic pressure stays within limits through Max-Q. The boosters’ shaped propellant grain cuts their thrust at the same time.`,
        "ascent",
      );
    if (iU > 0)
      M.ev(
        t0 + sch[iU][0],
        "ship",
        "Throttle up",
        "“Go at throttle up.” Past Max-Q the main engines return to full power (104.5 %).",
        "ascent",
      );
  }
  const mq = find((e) => e.kind === "maxq");
  if (mq)
    mq.desc = `Maximum dynamic pressure, ${(asc.maxQ / 1000).toFixed(1)} kPa (about ${Math.round(asc.maxQ / 47.88)} lb/ft²): the moment of greatest aerodynamic stress.`;
  const sb = find((e) => e.kind === "staging" && /Booster/.test(e.name));
  if (sb) {
    sb.name = "SRB separation";
    sb.desc = `The two boosters burn out and are pushed clear by sixteen small separation motors. They coast up to about 65 km, then parachute into the Atlantic, where ships recover them for refurbishment. ${EXPLAIN.staging}`;
  }
  M.ev(
    t0 + (cfg.negReturn ?? 240),
    "ship",
    "Negative return",
    "Too far and too fast to turn around: a return-to-launch-site abort is no longer possible. An engine failure from here on means an abort across the Atlantic or to orbit.",
    "ascent",
  );
  M.ev(
    t0 + (cfg.pressToMeco ?? 375),
    "ship",
    "Press to MECO",
    "Even if one main engine failed now, the other two could still reach orbit.",
    "ascent",
  );
  if (cfg.headsUpMET) {
    M.ev(
      t0 + cfg.headsUpMET,
      "ship",
      "Roll to heads-up",
      "The stack rolls over so the orbiter rides on top of the tank. Its antennas now face up, toward the TDRS relay satellites, instead of the ground stations along the coast.",
      "ascent",
    );
    const c = ship.configAt(t0 + cfg.headsUpMET);
    if (c)
      ship.setConfig(t0 + cfg.headsUpMET, "launch", {
        ...c.label,
        headsUp: true,
      });
  }
  const s3 = (asc.samples || []).find(
    (s) =>
      s.t > t0 + 300 && s.throttle < (sch ? curveAt(sch, s.t - t0) : 1) - 0.015,
  );
  if (s3)
    M.ev(
      s3.t,
      "ship",
      "3-g throttling",
      "The stack keeps getting lighter as the tank empties, so the main engines throttle back to hold the acceleration at 3 g.",
      "ascent",
    );
  const ins = find((e) => e.kind === "insertion");
  if (ins) {
    ins.name = "MECO";
    const el = asc.el;
    ins.desc = `Main engine cutoff, ${Math.round(asc.t - t0 - 0)} s after liftoff: ${vnorm(asc.v).toFixed(2)} km/s at ${Math.round(vnorm(asc.r) - R_E)} km. The orbit is ${Math.round(el.rp - R_E)} × ${Math.round(el.ra - R_E)} km — still dipping into the atmosphere, which is where the tank will fall.`;
  }
}

// ---------------------------------------------------------------------------
// ISS rendezvous and docking (STS-135 style): phasing burns, terminal initiation, an R-bar approach from below,
// the R-bar pitch maneuver, a swing up to the V-bar and the final approach to the docking port; undocking,
// flyaround and separation. The station's orbit is built so the meeting happens at the historical docking time:
// its altitude and plane are right; its position along the orbit is set where the orbiter arrives.
// ---------------------------------------------------------------------------
function issRendezvous(o) {
  const { M, cfg, ship, H } = o,
    c = cfg.iss;
  const tDock = isoToT(c.dock),
    tUndock = isoToT(c.undock),
    tArr = tDock - (c.arriveBefore ?? 1.45) * H;
  const rISS = R_E + (c.hp + c.ha) / 2;
  o.progress("Rendezvous: phasing burns toward the station…");
  const hLow = (c.hp + c.ha) / 2 - (c.below ?? 14);
  const Pl = 2 * Math.PI * Math.sqrt(Math.pow(R_E + hLow, 3) / MU_E);
  const aTr = (R_E + hLow + rISS) / 2,
    Ttr = Math.PI * Math.sqrt((aTr * aTr * aTr) / MU_E);
  const tTI = tArr - Ttr,
    tNC1 = o.t0 + (c.nc1MET ?? 3.3) * H,
    tNC2 = tTI - 1.5 * Pl;
  // Where the docking happens along the orbit decides when the landing opportunities come days later. The station's
  // real position is matched indirectly: the phasing orbit (NC-1 apogee) is chosen so that, after undocking, the
  // orbit passes the landing runway at the historical landing time — as it did for the real, phased rendezvous.
  const tStar = isoToT(cfg.landing) - 12.5 * 60,
    rw = o.rwy;
  const dryArrive = (ha1) => {
    let t = o.t,
      y = o.y.slice();
    const prop = (t1) => {
      const r = leoInt(t, y, t1, { rtol: 1e-9, atol: 1e-6, hmax: 120 });
      t = r.tEnd;
      y = Array.from(r.y[r.y.length - 1]);
    };
    const kick = (rT) => {
      const dv = o.dvToApsis([y[0], y[1], y[2]], [y[3], y[4], y[5]], rT);
      y[3] += dv[0];
      y[4] += dv[1];
      y[5] += dv[2];
    };
    prop(tNC1);
    kick(R_E + ha1);
    prop(tNC2);
    kick(R_E + hLow);
    prop(nextApsis(t, [y[0], y[1], y[2]], [y[3], y[4], y[5]], true));
    kick(R_E + hLow - 2);
    prop(tTI);
    kick(rISS - 0.6);
    prop(tArr);
    return y;
  };
  const issFrom = (y) => {
    const r = [y[0], y[1], y[2]],
      up = vunit(r),
      hh = vunit(vcross(r, [y[3], y[4], y[5]]));
    const rI = vscale(up, vnorm(r) + 0.6);
    return [
      ...rI,
      ...vscale(vunit(vcross(hh, up)), Math.sqrt(MU_E / vnorm(rI))),
      c.mass,
    ];
  };
  const phaseErr = (ha1) => {
    const yI = issFrom(dryArrive(ha1));
    const rr = leoInt(tArr, yI, tStar, { rtol: 1e-9, atol: 1e-6, hmax: 120 });
    const s = rr.y[rr.y.length - 1];
    const r = [s[0], s[1], s[2]],
      h = vunit(vcross(r, [s[3], s[4], s[5]])),
      k = vunit(sitePosEcl("earth", rw.lat, rw.lon, 0, tStar)),
      kp = vunit(vsub(k, vscale(h, vdot(k, h))));
    return Math.atan2(vdot(vcross(vunit(r), kp), h), vdot(vunit(r), kp));
  };
  let ha1 = c.nc1Ha ?? 270;
  if (cfg.landing && !c.nc1Ha) {
    // The station takes the altitude the orbiter arrives at, and over the days to the landing a few hundred metres of
    // altitude add up to a large shift along the orbit, so the error swings through whole turns across the range of
    // apogees. Scan it, then refine the zero crossing nearest the nominal apogee (Illinois-modified false position).
    const lo = 175,
      hi = 375,
      step = 5,
      wrap = (e) => e - 2 * Math.PI * Math.round(e / (2 * Math.PI));
    const xs = [],
      es = [];
    for (let x = lo; x <= hi + 1e-9; x += step) {
      xs.push(x);
      es.push(wrap(phaseErr(x)));
    }
    const brackets = [];
    for (let i = 0; i + 1 < xs.length; i++)
      if (es[i] * es[i + 1] <= 0 && Math.abs(es[i] - es[i + 1]) < Math.PI)
        brackets.push(i);
    brackets.sort(
      (i, j) =>
        Math.abs(xs[i] + step / 2 - 270) - Math.abs(xs[j] + step / 2 - 270),
    );
    if (brackets.length) {
      const i = brackets[0];
      let a = xs[i],
        b = xs[i + 1],
        ea = es[i],
        eb = es[i + 1],
        x = a,
        side = 0;
      for (let it = 0; it < 16; it++) {
        x = eb !== ea ? b - (eb * (b - a)) / (eb - ea) : (a + b) / 2;
        const e = wrap(phaseErr(x));
        if (Math.abs(e) < 0.002) break;
        if (e < 0 === eb < 0) {
          b = x;
          eb = e;
          if (side === -1) ea /= 2;
          side = -1;
        } else {
          a = x;
          ea = e;
          if (side === 1) eb /= 2;
          side = 1;
        }
      }
      ha1 = x;
    } else
      M.notes.push(
        "The phasing orbit could not be adjusted to match the historical landing time.",
      );
  }
  // NC-1 raises the apogee early on; NC-2/NC-3 lift the orbit to ~14 km under the station before terminal initiation
  o.omsBurn(
    tNC1,
    (r, v) => o.dvToApsis(r, v, R_E + ha1),
    "NC-1 — phasing burn",
    (b) =>
      `The first of the phasing burns that set how fast the orbiter catches up with the station, ${Math.round(c.hp)} km up and thousands of kilometres ahead: the lower the orbit, the faster it goes around. Δv ${Math.round(b.dv)} m/s; orbit ${Math.round(b.hp)} × ${Math.round(b.ha)} km.`,
    "in orbit — catching up",
  );
  o.omsBurn(
    tNC2,
    (r, v) => o.dvToApsis(r, v, R_E + hLow),
    "NC-2 — height adjust",
    (b) =>
      `Raises the far side of the orbit to ${Math.round(hLow)} km, just under the station. Δv ${Math.round(b.dv)} m/s.`,
    "in orbit — catching up",
  );
  {
    const s = o.st();
    const tA = nextApsis(o.t, s.r, s.v, true);
    o.omsBurn(
      tA,
      (r, v) => o.dvToApsis(r, v, R_E + hLow - 2),
      "NC-3 — coelliptic burn",
      (b) =>
        `At apogee, a burn makes the orbit nearly circular ${Math.round(b.hp)} × ${Math.round(b.ha)} km, a steady ${Math.round(rISS - R_E - hLow)} km below the station. The orbiter now creeps up on it from behind.`,
      "in orbit — closing in",
    );
  }
  // TI: a Hohmann-like hop up to the station's altitude, arriving half an orbit later 600 m below it
  o.coast(tTI - 30, "in orbit — closing in");
  o.omsBurn(
    tTI,
    (r, v) => o.dvToApsis(r, v, rISS - 0.6),
    "TI — terminal initiation",
    (b) =>
      `The burn that commits to the rendezvous: it raises the far side of the orbit to the station’s altitude, half an orbit ahead. From here the crew flies by radar, star trackers and the docking camera. Δv ${Math.round(b.dv)} m/s.`,
    "rendezvous",
  );
  o.coast(tArr, "rendezvous — closing on the station");
  // the station, defined from where the orbiter arrives: 600 m above it, moving on a circular orbit in the same plane
  const sA = o.st();
  const upA = vunit(sA.r),
    hA = vunit(vcross(sA.r, sA.v));
  const rI = vscale(upA, vnorm(sA.r) + 0.6),
    vI = vscale(vunit(vcross(hA, upA)), Math.sqrt(MU_E / vnorm(rI)));
  const tEndISS = isoToT(cfg.landing) + 6 * H;
  const resB = leoInt(tArr, [...rI, ...vI, c.mass], M.t0 - 2 * H, { hmax: 60 }),
    resF = leoInt(tArr, [...rI, ...vI, c.mass], tEndISS, { hmax: 60 });
  // resState expects increasing times: put the backward leg in forward order
  const rev = {
    t: resB.t.slice().reverse(),
    y: resB.y.slice().reverse(),
    f: resB.f.slice().reverse(),
  };
  const issAt2 = (tt) => {
    const s = resState(tt < tArr ? rev : resF, tt);
    return { r: [s[0], s[1], s[2]], v: [s[3], s[4], s[5]] };
  };
  const iss = M.addObj(
    new MObject("iss", "International Space Station", {
      kind: "craft",
      model: "iss",
      color: "#9fd3ff",
      crew: c.crew || 6,
      labelPriority: 2,
    }),
  );
  iss.add(
    new SampleSeg(
      "earth",
      integToSamples(rev, () => ({ phase: "ISS orbit" })),
      { phase: "ISS orbit" },
    ),
  );
  iss.add(
    new SampleSeg(
      "earth",
      integToSamples(resF, () => ({ phase: "ISS orbit" })),
      { phase: "ISS orbit" },
    ),
  );
  iss.setConfig(M.t0 - 2 * H, "sc", { key: "sc", sc: "iss", parts: ["iss"] });
  // relative-motion legs (LVLH metres → absolute samples): R-bar approach, R-bar pitch maneuver, swing to the V-bar, docking
  const rel0 = toLvlh(lvlh(rI, vI), vsub(sA.r, rI));
  const dock = c.dockOffset || [0.0231, 0, -0.0068]; // orbiter reference point from the station's, LVLH km: docking ports touching (renderer models)
  const tR0 = isoToT(c.rpm),
    tR1 = tR0 + 9 * 60,
    tV = tDock - 28 * 60,
    tV2 = tDock - 7 * 60;
  const ease = (x) => smoothstep(clamp(x, 0, 1));
  const relAt = (tt) => {
    if (tt <= tR0) {
      const f = ease((tt - tArr) / (tR0 - tArr));
      return vlerp(rel0, [0, 0, -0.183], f);
    }
    if (tt <= tR1) return [0, 0, -0.183];
    if (tt <= tV) {
      const f = ease((tt - tR1) / (tV - tR1)),
        ph = (-Math.PI / 2) * (1 - f),
        rr = 0.183 + (0.095 - 0.183) * f;
      return [rr * Math.cos(ph), 0, rr * Math.sin(ph)];
    }
    if (tt <= tV2) {
      const f = ease((tt - tV) / (tV2 - tV));
      return vlerp([0.095, 0, 0], [dock[0] + 0.009, 0, dock[2]], f);
    }
    const f = ease((tt - tV2) / (tDock - tV2));
    return vlerp([dock[0] + 0.009, 0, dock[2]], dock, f);
  };
  const relSamples = (ta, tb, dt, fn, phase) => {
    const out = [];
    const mass = o.y[6];
    const abs = (tt) => {
      const I = issAt2(tt);
      return vadd(I.r, fromLvlh(lvlh(I.r, I.v), fn(tt)));
    };
    for (let tt = ta; ; tt = Math.min(tt + dt, tb)) {
      const p = abs(tt),
        vv = vscale(vsub(abs(tt + 0.5), abs(tt - 0.5)), 1);
      out.push({
        t: tt,
        r: p,
        v: vv,
        m: mass,
        phase: typeof phase === "function" ? phase(tt) : phase,
      });
      if (tt >= tb) break;
    }
    return out;
  };
  o.progress("Proximity operations and docking…");
  ship.add(
    new SampleSeg(
      "earth",
      relSamples(tArr, tDock, 2, relAt, (tt) =>
        tt < tR0
          ? "R-bar approach"
          : tt < tR1
            ? "R-bar pitch maneuver"
            : tt < tV
              ? "moving to the V-bar"
              : "V-bar approach — docking",
      ),
      { phase: "proximity operations" },
    ),
  );
  const dv0 = vnorm(vsub(sA.v, vI)) * 1000;
  M.burn({
    name: "Braking — rendezvous",
    t: tArr,
    dur: 60,
    dv: dv0,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp(-dv0 / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tArr - 25 * 60,
    "ship",
    "Mid-course corrections",
    "Small reaction-control burns trim the intercept as the radar locks on to the station.",
    "info",
  );
  M.ev(
    tArr,
    "ship",
    "Station 600 m above",
    `The orbiter arrives directly below the station (on the "R-bar", the line to Earth’s centre) and brakes, ${dv0.toFixed(1)} m/s. The commander takes manual control at the aft flight-deck windows.`,
    "burn",
  );
  M.ev(
    tR0,
    "ship",
    "R-bar pitch maneuver",
    "Six hundred feet (183 m) below the station the orbiter does a slow back-flip, 360° in nine minutes, so the station crew can photograph every heat-shield tile with 400 and 800 mm lenses. The images are checked on the ground for damage before entry.",
    "photo",
  );
  M.ev(
    tR1 + 60,
    "ship",
    "Swing to the V-bar",
    'The orbiter flies a quarter circle up and around to a point 95 m (310 ft) in front of the station, on its direction of travel (the "V-bar"), now nose up with the payload bay facing the docking port.',
    "info",
  );
  M.ev(
    tV2,
    "ship",
    "30 ft — final approach",
    "The orbiter holds 9 m (30 ft) from the docking port to line up, then closes at about 3 cm/s.",
    "info",
  );
  {
    const I = issAt2(tDock);
    M.ev(
      tDock,
      "ship",
      "Docking",
      `“Capture confirmed.” The orbiter’s docking system latches on to Pressurized Mating Adapter 2 on the front of the station, ${Math.round(vnorm(I.r) - R_E)} km up, at ${fmtUTC(tDock)} UTC.`,
      "dock",
    );
  }
  M.phase(o.t0 + (c.nc1MET ?? 3.3) * H, tArr, "Rendezvous", "#4cc9f0");
  // docked
  ship.setConfig(tArr - 20 * 60, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "rbar",
  });
  ship.setConfig(tR0, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "rpm",
    rpm0: tR0,
    rpm1: tR1,
  });
  ship.setConfig(tR1, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
    sw0: tR1,
    sw1: tV,
  }); // pitch up while swinging to the V-bar
  const mplmOut = c.mplmOut ? isoToT(c.mplmOut) : null,
    mplmIn = c.mplmIn ? isoToT(c.mplmIn) : null;
  const dockedRel = () => dock;
  const docked = relSamples(tDock, tUndock, 30, dockedRel, "docked to the ISS");
  ship.add(new SampleSeg("earth", docked, { phase: "docked to the ISS" }));
  ship.setConfig(tDock, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
    docked: true,
  });
  M.ev(
    tDock + 1.7 * H,
    "ship",
    "Hatches open",
    "The two crews meet. For the next week the orbiter and the station fly as one 520-tonne spacecraft.",
    "info",
  );
  if (mplmOut) {
    ship.setConfig(mplmOut, "sc", {
      ...orbiterCfg(cfg),
      pay: null,
      bay: "open",
      att: "vbar",
      docked: true,
    });
    iss.setConfig(mplmOut, "sc", {
      key: "sc",
      sc: "iss",
      parts: ["iss"],
      mplm: true,
    });
    M.ev(
      mplmOut,
      "ship",
      `${c.mplmName || "Logistics module"} moved to the station`,
      "The station’s robot arm lifts the cargo module out of the payload bay and berths it to the Harmony node. The crews unload about 4 t of supplies — food and spares to keep the station going after the Shuttle retires.",
      "info",
    );
  }
  if (mplmIn) {
    ship.setConfig(mplmIn, "sc", {
      ...orbiterCfg(cfg),
      bay: "open",
      att: "vbar",
      docked: true,
    });
    iss.setConfig(mplmIn, "sc", { key: "sc", sc: "iss", parts: ["iss"] });
    M.ev(
      mplmIn,
      "ship",
      `${c.mplmName || "Logistics module"} back in the bay`,
      "Refilled with station trash and equipment for return, the module goes back into the payload bay.",
      "info",
    );
  }
  M.phase(tDock, tUndock, "Docked to the ISS", "#43aa8b");
  // undocking, flyaround, separation
  const tBack = tUndock + 20 * 60,
    tFly = tBack + 75 * 60;
  const relAfter = (tt) => {
    if (tt <= tBack) {
      const f = ease((tt - tUndock) / (tBack - tUndock));
      return vlerp(dock, [0.183, 0, 0], f);
    }
    const f = clamp((tt - tBack) / (tFly - tBack), 0, 1),
      ph = 2 * Math.PI * smoothstep(f);
    return [0.183 * Math.cos(ph), 0, 0.183 * Math.sin(ph)];
  };
  ship.add(
    new SampleSeg(
      "earth",
      relSamples(tUndock, tFly, 2, relAfter, (tt) =>
        tt < tBack ? "undocking — backing away" : "flyaround",
      ),
      { phase: "flyaround" },
    ),
  );
  ship.setConfig(tUndock, "sc", {
    ...orbiterCfg(cfg),
    bay: "open",
    att: "vbar",
  });
  ship.setConfig(tBack, "sc", { ...orbiterCfg(cfg), bay: "open", att: "fly" });
  M.ev(
    tUndock,
    "ship",
    "Undocking",
    "Springs push the orbiter gently away from the station; it backs out along the V-bar to about 180 m.",
    "sep",
  );
  M.ev(
    tBack + 60,
    "ship",
    "Flyaround",
    "A last lap around the station at about 180 m, over the top, behind and underneath, while the crew photographs it from every side.",
    "photo",
  );
  // free flight again: set the state at the end of the flyaround and fire the separation burn
  const end = relSamples(tFly - 0.5, tFly + 0.5, 0.5, relAfter, "");
  const sE = end[1];
  o.t = tFly;
  o.y = [...sE.r, ...sE.v, o.y[6]];
  const F = lvlh(sE.r, sE.v),
    dvSep = vadd(vscale(F.x, -0.0006), vscale(F.z, -0.0003));
  o.y[3] += dvSep[0];
  o.y[4] += dvSep[1];
  o.y[5] += dvSep[2];
  M.burn({
    name: "Separation burn",
    t: tFly,
    dur: 10,
    dv: vnorm(dvSep) * 1000,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp((-vnorm(dvSep) * 1000) / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tFly,
    "ship",
    "Final separation",
    "A small burn takes the orbiter below and ahead of the station; on the lower, faster orbit it pulls away a few kilometres every lap.",
    "burn",
  );
  ship.setConfig(tFly + 120, "sc", { ...orbiterCfg(cfg), bay: "open" });
  M.phase(tUndock, tFly, "Undocking & flyaround", "#4cc9f0");
}
// ---------------------------------------------------------------------------
// Payload deploy with the robot arm (STS-31: the Hubble Space Telescope)
// ---------------------------------------------------------------------------
function payloadDeploy(o) {
  const { M, cfg, ship, H } = o,
    d = cfg.deploy;
  const tRel = isoToT(d.t),
    tGr = tRel - (d.grapple ?? 8) * H,
    tUn = tRel - (d.unberth ?? 6.4) * H,
    tArr = tRel - (d.arrays ?? 2.6) * H;
  o.progress("Payload deploy…");
  o.coast(tGr - 0.5 * H, "in orbit");
  // the arm and the payload move continuously between these times (the renderer poses them: app/32_shuttle.js deployRig):
  // the arm unstows and reaches for the grapple fixture in the 25 minutes before the grapple, lifts the payload out at the
  // unberth, holds it upright over the bay while its arrays unfurl, lets go at the release and is stowed again within the hour
  const armT = { gr: tGr, un: tUn, arr: tArr, rel: tRel };
  ship.setConfig(tGr - 0.5 * H, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    armPay: d.model,
    armT,
    bay: "open",
    att: "deploy",
  });
  ship.setConfig(tRel, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    armT,
    bay: "open",
    att: "deploy",
  });
  ship.setConfig(tRel + 1.2 * H, "sc", {
    ...orbiterCfg(cfg),
    pay: null,
    bay: "open",
  });
  M.ev(
    tGr,
    "ship",
    `Robot arm grapples ${d.short || d.name}`,
    `The 15-m Canadarm, flown from the aft flight deck, latches on to the telescope’s grapple fixture. ${d.name} has been running on the orbiter’s power; now it switches to its own batteries.`,
    "info",
  );
  M.ev(
    tUn,
    "ship",
    `${d.short || d.name} lifted out of the bay`,
    "Slowly, a few centimetres per second, the arm lifts the 11-tonne telescope clear of the payload bay — clearances along the bay sill were only a few centimetres.",
    "info",
  );
  M.ev(
    tArr,
    "ship",
    "Solar arrays and antennas unfurl",
    "The two 12-m solar array wings roll out from their storage drums and the two high-gain antennas swing out on their booms. One wing stuck partway, and two spacewalkers suited up in the airlock before ground controllers freed it with a software fix.",
    "photo",
  );
  // release: the payload becomes its own spacecraft; the orbiter backs away
  o.coast(tRel, "in orbit — deploy");
  const s = o.st();
  const F = lvlh(s.r, s.v),
    off = fromLvlh(F, d.armOffset || [0.0028, 0, 0.012]); // where the arm holds it, upright over the bay (in the orbiter's frame 2.8 m forward of its reference point and 12 m up)
  const pay = M.addObj(
    new MObject(d.id || "payload", d.name, {
      kind: "craft",
      model: d.model,
      color: "#bfe3ff",
    }),
  );
  pay.setConfig(tRel, "sc", { key: "sc", sc: d.model, parts: ["deployed"] });
  if (d.doorOpen) {
    const td = isoToT(d.doorOpen);
    pay.setConfig(td, "sc", {
      key: "sc",
      sc: d.model,
      parts: ["deployed"],
      door: true,
      doorT: td,
    });
    M.ev(
      td,
      d.id || "payload",
      "Aperture door opens",
      "Two days after the deploy, the telescope’s aperture door swings open; first light follows a month later — and with it the discovery that the main mirror had been ground to the wrong shape.",
      "photo",
    );
  }
  const tPayEnd = isoToT(cfg.landing) + 8 * H;
  const rP = leoInt(tRel, [...vadd(s.r, off), ...s.v, d.mass], tPayEnd, {
    hmax: 60,
  });
  pay.add(resToSeg(rP, `${d.short || d.name} in orbit`));
  M.ev(
    tRel,
    "ship",
    `${d.short || d.name} released`,
    `The arm lets go at ${fmtUTC(tRel)} UTC, ${Math.round(vnorm(s.r) - R_E)} km up — the highest orbit a Shuttle had flown. The telescope is on its own.`,
    "sep",
  );
  const dvS = vscale(F.x, 0.0004);
  o.y[3] += dvS[0];
  o.y[4] += dvS[1];
  o.y[5] += dvS[2];
  o.y[6] -= d.mass;
  if (o.P.mods.PAY) o.P.mods.PAY.attached = false;
  M.burn({
    name: "Separation burn",
    t: tRel + 1,
    dur: 8,
    dv: 0.4,
    engine: "RCS (primary jets)",
    isp: 280,
    prop: o.y[6] * (1 - Math.exp(-0.4 / (280 * G0))),
    m0: o.y[6],
    obj: "ship",
    propType: "mmh",
  });
  M.ev(
    tRel + 0.4 * H,
    "ship",
    "Standing by",
    "The orbiter backs away and stays within reach for two days, in case a spacewalk is needed to fix the telescope.",
    "info",
  );
  M.phase(tGr, tRel + 0.5 * H, `${d.short || d.name} deploy`, "#43aa8b");
}

// ---------------------------------------------------------------------------
// Coming home: pick the landing opportunity, close the payload bay, deorbit burn, entry, TAEM, landing, rollout
// ---------------------------------------------------------------------------
const EI_SH = 121.92; // entry interface, 400,000 ft
function shuttleReturn(o, tIns) {
  const { M, cfg, ship, H, rwy } = o;
  const tLandNom = isoToT(cfg.landing);
  o.progress("Deorbit planning: finding the landing opportunity…");
  const pr = leoInt(o.t, o.y, tLandNom + 2 * H, { hmax: 60 });
  const rwyDir = (tt) => vunit(sitePosEcl("earth", rwy.lat, rwy.lon, 0, tt));
  // passes: local minima of the ground track's distance from the runway
  const passes = [];
  let prev = null,
    prev2 = null;
  for (
    let tt = Math.max(o.t + 600, tLandNom - 5 * H);
    tt <= tLandNom + 1.5 * H;
    tt += 20
  ) {
    const s = resState(pr, tt),
      d = vangle([s[0], s[1], s[2]], rwyDir(tt)) * R_E;
    if (prev && prev2 && prev.d < prev2.d && prev.d <= d)
      passes.push({ t: prev.t, d: prev.d });
    prev2 = prev;
    prev = { t: tt, d };
  }
  const pick = passes
    .map((p) => ({
      ...p,
      cost:
        Math.abs(p.t + 13 * 60 - tLandNom) / 60 +
        (p.d > 1250 ? 1e6 : p.d / 100),
    }))
    .sort((a, b) => a.cost - b.cost)[0];
  if (!pick) {
    M.warnings.push(
      "No landing opportunity found near the planned landing time.",
    );
    M.failed = "deorbit";
    o.coast(tLandNom, "in orbit");
    M.finalize();
    return M;
  }
  if (pick.d > 1250)
    M.warnings.push(
      `The landing pass is ${Math.round(pick.d)} km off the runway — more than the orbiter's usual cross-range.`,
    );
  // deorbit Δv: retrograde, sized for a −1.2° flight-path angle at entry interface (two-body estimate)
  const fpaT = (cfg.entryFpa ?? -1.2) * DEG,
    rEI = R_E + EI_SH;
  const dvFor = (r, v) => {
    let lo = 0.02,
      hi = 0.45;
    for (let k = 0; k < 50; k++) {
      const dv = (lo + hi) / 2,
        v1 = vadd(v, vscale(vunit(v), -dv));
      const el = rv2coe(r, v1, MU_E);
      if (el.rp > rEI) {
        lo = dv;
        continue;
      }
      const hh = el.hn,
        vE = Math.sqrt(2 * (el.energy + MU_E / rEI)),
        g = -Math.acos(clamp(hh / (rEI * vE), -1, 1));
      if (g > fpaT) lo = dv;
      else hi = dv;
    }
    return (lo + hi) / 2;
  };
  const evEIsh = {
    name: "EI",
    dir: -1,
    terminal: true,
    g: (tt, yy) => Math.hypot(yy[0], yy[1], yy[2]) - rEI,
  };
  const target = { lat: rwy.lat, lon: rwy.lon, elev: rwy.elev };
  const trial = (td) => {
    const s = resState(pr, td),
      r = [s[0], s[1], s[2]],
      v = [s[3], s[4], s[5]],
      dv = dvFor(r, v);
    const rr = leoInt(
      td,
      [...r, ...vadd(v, vscale(vunit(v), -dv)), s[6]],
      td + 2.5 * H,
      { events: [evEIsh] },
    );
    if (!rr.stopEvent) return null;
    const ye = rr.stopEvent.y,
      te = rr.stopEvent.t;
    const ent = simulateWingedEntry({
      t0: te,
      r0: [ye[0], ye[1], ye[2]],
      v0: [ye[3], ye[4], ye[5]],
      m0: s[6],
      target,
      rTaem: 96,
      fixedBank: (cfg.refBank ?? 55) * DEG,
      noSamples: true,
      coarse: true,
    });
    const rE = [ye[0], ye[1], ye[2]],
      err = vangle(rE, ent.r) * R_E - (vangle(rE, rwyDir(ent.t)) * R_E - 96);
    return { dv, err, te };
  };
  let td = pick.t + 13 * 60 - 65 * 60,
    tr = trial(td);
  for (let k = 0; k < 6 && tr && Math.abs(tr.err) > 15; k++) {
    td -= tr.err / 7.3;
    tr = trial(td);
  }
  if (!tr) {
    M.warnings.push("Deorbit targeting failed.");
    M.failed = "deorbit";
    M.finalize();
    return M;
  }
  // payload bay doors close a few hours before the burn
  const tDoors = td - (cfg.doorsCloseBefore ?? 2.8) * H;
  M.ev(
    tDoors,
    "ship",
    "Payload bay doors closed",
    "The crew stows the cabin, closes the payload bay doors and puts on launch and entry suits.",
    "info",
  );
  ship.setConfig(tDoors, "sc", {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    bayT: tDoors,
  }); // swinging shut over the next three minutes
  M.phase(tIns, td - 1800, cfg.orbitPhaseName || "In orbit", "#4ea8de");
  // deorbit burn
  o.progress("Deorbit burn and entry…");
  o.coast(Math.min(tDoors, td - 1800), "in orbit");
  const b = o.omsBurn(
    td,
    (r, v) => vscale(vunit(v), -tr.dv),
    "Deorbit burn",
    (x) =>
      `Flying tail-first and upside down, half a world away from ${rwy.short}, both OMS engines fire for ${fmtDur(x.dur)}: Δv ${Math.round(x.dv)} m/s, enough to drop the far side of the orbit into the atmosphere. There is no turning back after this burn.`,
    "in orbit — deorbit preparations",
  );
  ship.setConfig(o.t + 150, "sc", {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    att: "entry",
  });
  M.ev(
    o.t + 150,
    "ship",
    "Pitch around to entry attitude",
    "The orbiter turns nose-forward and raises its nose 40° above the direction of flight, so the black heat-shield tiles on its belly will meet the air first.",
    "info",
  );
  const rEIres = leoInt(o.t, o.y, o.t + 2.5 * H, { events: [evEIsh] });
  ship.add(resToSeg(rEIres, "falling toward the atmosphere"));
  const yE = Array.from(rEIres.y[rEIres.y.length - 1]);
  const tEI = rEIres.tEnd;
  const vEIrel = vnorm(
    vsub(
      [yE[3], yE[4], yE[5]],
      vcross(bodyOmegaEcl("earth", tEI), [yE[0], yE[1], yE[2]]),
    ),
  );
  const rngEI = vangle([yE[0], yE[1], yE[2]], rwyDir(tEI + 1900)) * R_E;
  M.ev(
    tEI,
    "ship",
    "Entry interface (400,000 ft)",
    `${vnorm([yE[3], yE[4], yE[5]]).toFixed(2)} km/s at 122 km, about ${Math.round(rngEI / 10) * 10} km from the runway, flight-path angle ${fpaDeg([yE[0], yE[1], yE[2]], [yE[3], yE[4], yE[5]]).toFixed(2)}°. The orbiter enters at a 40° angle of attack: the belly takes the heat and the air brakes it. ${cfg.blackout ? "" : "Unlike a capsule it can steer — by banking."}`,
    "entry",
  );
  const ent = simulateWingedEntry({
    t0: tEI,
    r0: [yE[0], yE[1], yE[2]],
    v0: [yE[3], yE[4], yE[5]],
    m0: yE[6],
    target,
    rTaem: 96,
    vTaem: 0.76,
    blackout: !!cfg.blackout,
  });
  ship.add(new SampleSeg("earth", ent.samples, { phase: "entry" }));
  for (const e of ent.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  M.ev(
    ent.tPeakHeat,
    "ship",
    "Peak heating",
    `Stagnation heat flux about ${Math.round(ent.maxHeat)} W/cm² (Sutton–Graves estimate): the wing leading edges and nose cap of reinforced carbon-carbon glow at up to 1,500 °C, and the shock layer ahead of the orbiter is hotter still.`,
    "heat",
  );
  M.ev(
    ent.tPeakG,
    "ship",
    "Peak deceleration",
    `${ent.maxG.toFixed(2)} g — gentle by capsule standards: the orbiter’s lift spreads the braking over half an hour.`,
    "gload",
  );
  if (Math.abs(ent.rangeErr) > 60)
    M.warnings.push(
      `Entry guidance ended ${Math.round(ent.rangeErr)} km off its target energy point.`,
    );
  // terminal area energy management, approach & landing, rollout
  o.progress("Approach and landing…");
  const AP = shuttleApproach({ t: ent.t, r: ent.r, v: ent.v }, rwy, {
    m: yE[6],
    chute: !!cfg.dragChute,
    ogs: cfg.ogs || 19,
    rollout: cfg.rollout,
  });
  ship.add(new SampleSeg("earth", AP.samples, { phase: "approach & landing" }));
  for (const e of AP.events) M.ev(e.t, "ship", e.name, e.desc, e.kind);
  const cBase = {
    ...orbiterCfg(cfg),
    pay:
      cfg.bayPayloadReturn !== undefined
        ? cfg.bayPayloadReturn
        : cfg.bayPayload || null,
    bay: "closed",
    att: "entry",
  };
  ship.setConfig(AP.tGear, "sc", { ...cBase, gear: true });
  if (AP.tChute) {
    ship.setConfig(AP.tChute, "sc", { ...cBase, gear: true, dragChute: 1 });
    ship.setConfig(AP.tChuteJet, "sc", { ...cBase, gear: true });
  }
  const mStop = yE[6];
  ship.add(
    new SurfaceSeg(
      "earth",
      AP.tStop,
      AP.tStop + 1.5 * H,
      AP.stopLL[0],
      AP.stopLL[1],
      rwy.elev,
      mStop,
      { extra: { phase: "wheel stop — on the runway", hdg: rwy.hdg } },
    ),
  );
  M.phase(td - 1800, ent.t, "Deorbit & entry", "#ff5d5d");
  M.phase(ent.t, AP.tStop, "Approach & landing", "#f15bb5");
  M.phase(AP.tStop, AP.tStop + 1.5 * H, "On the runway", "#ffd166");
  M.summary.entries = [
    {
      body: "earth",
      vEI: vEIrel,
      maxG: ent.maxG,
      maxHeat: ent.maxHeat,
      miss: 0,
      ll: AP.stopLL,
      reversals: ent.reversals,
    },
  ];
  M.summary.landing = { t: AP.tTD, ll: AP.tdLL, miss: 0, runway: rwy.short };
  M.notes.push(
    `Deorbit burn ${fmtUTC(b ? b.tIgn : td)} UTC, Δv ${Math.round(tr.dv * 1000)} m/s; entry flown with ${ent.reversals} roll reversal${ent.reversals === 1 ? "" : "s"}; TAEM reached ${Math.round(ent.rangeErr)} km from its target point.`,
  );
  M.finalize();
  return M;
}
// TAEM, heading alignment cone, outer and inner glideslopes, flare, touchdown and rollout, flown as a guided path
// (the orbiter is a glider: speed comes from trading altitude). Returns ECL samples and events.
function shuttleApproach(start, rwy, opt) {
  const g = 9.80665,
    t0 = start.t,
    Rb = R_E + rwy.elev,
    gearH = 0.00603,
    ogs = (opt.ogs || 19) * DEG; // gearH: the orbiter's reference plane above the main wheels, wings level
  const omega = bodyOmegaEcl("earth", t0),
    Mb = bodyFixedToEcl("earth", t0),
    toBF = (v) => mvec(mT(Mb), v);
  const rB = toBF(start.r),
    vB = toBF(vsub(start.v, vcross(omega, start.r)));
  const U = llToBF(rwy.lat, rwy.lon),
    Tp = vscale(U, Rb),
    E = vunit(vcross([0, 0, 1], U)),
    N = vcross(U, E);
  const f = vadd(
      vscale(N, Math.cos(rwy.hdg * DEG)),
      vscale(E, Math.sin(rwy.hdg * DEG)),
    ),
    lf = vcross(U, f);
  const toXY = (p) => {
    const d = vunit(p),
      k = Rb / vdot(d, U);
    return [k * vdot(d, f), k * vdot(d, lf)];
  }; // the inverse of posBF below: the path starts where the entry ends (a plain projection put it 400–600 m off)
  const P0 = toXY(rB),
    h0 = vnorm(rB) - Rb,
    upL = vunit(rB);
  const vh = vsub(vB, vscale(upL, vdot(vB, upL)));
  const dir0 = (() => {
    const d = [vdot(vh, f), vdot(vh, lf)],
      n = Math.hypot(d[0], d[1]);
    return [d[0] / n, d[1] / n];
  })();
  const gam0 = Math.asin(clamp(vdot(vB, upL) / vnorm(vB), -1, 1));
  const XA = -2.29,
    XE = -12.0,
    rH = 5.5,
    hE = (XA - XE) * Math.tan(ogs),
    XTD = 0.762;
  // heading alignment cone: pick the side whose tangent line asks for the least turn at the start
  const opts = [1, -1]
    .map((s) => {
      const C = [XE, s * rH],
        d = Math.hypot(P0[0] - C[0], P0[1] - C[1]);
      if (d < rH * 1.3) return null;
      const be = Math.atan2(P0[1] - C[1], P0[0] - C[0]),
        thQ = s > 0 ? be + Math.acos(rH / d) : be - Math.acos(rH / d);
      const Q = [C[0] + rH * Math.cos(thQ), C[1] + rH * Math.sin(thQ)],
        dQ =
          s > 0
            ? [-Math.sin(thQ), Math.cos(thQ)]
            : [Math.sin(thQ), -Math.cos(thQ)];
      const thE = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      let dth = s > 0 ? thE - thQ : thQ - thE;
      dth = ((dth % TAU) + TAU) % TAU;
      const lq = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]),
        dirPQ = [(Q[0] - P0[0]) / lq, (Q[1] - P0[1]) / lq];
      const hd = Math.acos(
        clamp(dirPQ[0] * dir0[0] + dirPQ[1] * dir0[1], -1, 1),
      );
      return {
        s,
        C,
        thQ,
        Q,
        dQ,
        dth,
        cost: hd + (dth < 100 * DEG ? 0.6 : 0) + (dth > 320 * DEG ? 0.6 : 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.cost - b.cost);
  const hac = opts[0];
  // ground path: Bézier to the cone, arc around it, straight in along the centreline
  const pts = [];
  {
    const lq = Math.hypot(hac.Q[0] - P0[0], hac.Q[1] - P0[1]),
      a = 0.42 * lq;
    const B1 = [P0[0] + a * dir0[0], P0[1] + a * dir0[1]],
      B2 = [hac.Q[0] - a * hac.dQ[0], hac.Q[1] - a * hac.dQ[1]];
    const n = Math.max(60, Math.ceil(lq / 0.4));
    for (let i = 0; i < n; i++) {
      const u = i / n,
        w = 1 - u;
      pts.push({
        x:
          w * w * w * P0[0] +
          3 * w * w * u * B1[0] +
          3 * w * u * u * B2[0] +
          u * u * u * hac.Q[0],
        y:
          w * w * w * P0[1] +
          3 * w * w * u * B1[1] +
          3 * w * u * u * B2[1] +
          u * u * u * hac.Q[1],
        seg: "taem",
      });
    }
  }
  const nA = Math.max(30, Math.ceil(hac.dth / (1 * DEG)));
  for (let i = 0; i < nA; i++) {
    const th = hac.thQ + (hac.s * hac.dth * i) / nA;
    pts.push({
      x: hac.C[0] + rH * Math.cos(th),
      y: hac.C[1] + rH * Math.sin(th),
      seg: "hac",
    });
  }
  const xEnd = XTD + rwy.len * 0.95;
  for (let x = XE; x <= xEnd; x += x < XTD - 1 ? 0.1 : 0.01)
    pts.push({ x, y: 0, seg: x < XTD ? "final" : "roll" });
  let L = 0;
  pts[0].l = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    pts[i].l = L;
  }
  const iE = pts.findIndex((p) => p.seg === "final"),
    lE = pts[iE].l;
  // altitude: monotone cubic from the TAEM state down to the cone exit, then the glideslopes
  const dH = hE - h0;
  let m0 = Math.tan(gam0) * lE,
    m1 = -Math.tan(ogs) * lE;
  {
    const a = m0 / dH,
      b = m1 / dH;
    if (a < 0) m0 = 0;
    if (b < 0) m1 = 0;
    const rr = Math.hypot(m0 / dH, m1 / dH);
    if (rr > 3) {
      m0 *= 3 / rr;
      m1 *= 3 / rr;
    }
  }
  const hAt = (p) => {
    if (p.seg === "taem" || p.seg === "hac") {
      const u = p.l / lE,
        u2 = u * u,
        u3 = u2 * u;
      return (
        (2 * u3 - 3 * u2 + 1) * h0 +
        (u3 - 2 * u2 + u) * m0 +
        (-2 * u3 + 3 * u2) * hE +
        (u3 - u2) * m1
      );
    }
    if (p.seg === "roll") return gearH;
    const hPf = 0.533,
      xPf = XA - hPf / Math.tan(ogs);
    if (p.x <= xPf) return (XA - p.x) * Math.tan(ogs);
    const u = (p.x - xPf) / (XTD - xPf),
      u2 = u * u,
      u3 = u2 * u,
      Dx = XTD - xPf,
      s0 = -Math.tan(ogs) * Dx,
      s1 = -0.012 * Dx;
    return (
      (2 * u3 - 3 * u2 + 1) * hPf +
      (u3 - 2 * u2 + u) * s0 +
      (-2 * u3 + 3 * u2) * gearH +
      (u3 - u2) * s1
    );
  };
  for (const p of pts) p.h = hAt(p);
  // speed: equivalent airspeed held near 290 knots (150 m/s), true airspeed follows the air density
  const rho0 = 1.225,
    sig = (hh) => earthAtmos(hh + rwy.elev).rho / rho0;
  const eas0 = vnorm(vB) * 1000 * Math.sqrt(sig(h0)),
    xPf = XA - 0.533 / Math.tan(ogs);
  const vTD = 100 / Math.sqrt(sig(0));
  for (const p of pts) {
    if (p.seg === "taem" || p.seg === "hac") {
      const u = clamp(p.l / lE, 0, 1);
      p.v = (eas0 + (150 - eas0) * smoothstep(u)) / Math.sqrt(sig(p.h));
    } else if (p.seg === "final") {
      const eas =
        p.x <= xPf ? 150 : 150 + ((100 - 150) * (p.x - xPf)) / (XTD - xPf);
      p.v = eas / Math.sqrt(sig(p.h));
    }
  }
  // rollout: decelerate on the runway (aero drag and rolling, then brakes, plus the drag chute when fitted)
  const iTD = pts.findIndex((p) => p.seg === "roll");
  let tt = 0;
  for (let i = 1; i < iTD; i++) {
    const p = pts[i],
      q = pts[i - 1],
      ds = (p.l - q.l) * 1000,
      dh = (p.h - q.h) * 1000,
      vg = Math.max(0.5 * (p.v + q.v), 1) * Math.cos(Math.atan2(dh, ds));
    tt += ds / vg;
    p.t = tt;
  }
  pts[0].t = 0;
  const tTD = pts[iTD - 1].t + 0.2,
    chuteT = opt.chute ? tTD + 5.6 : null,
    noseT = tTD + 10;
  // rollout: aerodynamic drag and rolling friction, the drag chute, then the brakes below 140 knots; the braking is
  // scaled to the flight's recorded rollout distance
  const rollRun = (k) => {
    let v = vTD,
      x = pts[iTD].x,
      tR = tTD,
      chuteJet = null;
    const roll = [];
    while (v > 0.05 && roll.length < 6000) {
      let a = 1.0;
      if (tR > noseT && v < 74) a += 1.6 * k;
      if (chuteT && tR > chuteT + 2 && !chuteJet) a += 0.7;
      if (chuteT && !chuteJet && v < 31) chuteJet = tR;
      if (v < 3) a = Math.min(a, v / 0.8 + 0.3);
      const dt = 0.1;
      x += ((v - 0.5 * a * dt) * dt) / 1000;
      v = Math.max(0, v - a * dt);
      tR += dt;
      roll.push({ t: tR, x, v });
    }
    return { roll, chuteJet, tStop: tR, dist: x - pts[iTD].x };
  };
  let kb = 1,
    RR = rollRun(kb);
  for (
    let it = 0;
    it < 12 && Math.abs(RR.dist - (opt.rollout || 2.7)) > 0.02;
    it++
  ) {
    kb = clamp(kb * Math.pow(RR.dist / (opt.rollout || 2.7), 1.6), 0.3, 4);
    RR = rollRun(kb);
  }
  const roll = RR.roll,
    chuteJet = RR.chuteJet,
    tStop = RR.tStop;
  // samples on a regular clock, converted to ECL
  const P = pts.slice(0, iTD);
  const posBF = (px, py, hh) =>
    vscale(vunit(vadd(Tp, vadd(vscale(f, px), vscale(lf, py)))), Rb + hh);
  const curv = (i) => {
    const a = P[Math.max(0, i - 3)],
      b = P[i],
      c = P[Math.min(P.length - 1, i + 3)];
    const ax = b.x - a.x,
      ay = b.y - a.y,
      bx = c.x - b.x,
      by = c.y - b.y;
    const cr = ax * by - ay * bx,
      la = Math.hypot(ax, ay),
      lb = Math.hypot(bx, by),
      lc = Math.hypot(c.x - a.x, c.y - a.y);
    return la * lb * lc > 1e-9 ? (2 * cr) / (la * lb * lc) : 0;
  };
  const samples = [],
    events = [];
  const at = (tq) => {
    // state on the path at time tq (s after TAEM)
    if (tq >= tTD) {
      let k = roll.findIndex((r) => r.t >= tq);
      if (k < 0) k = roll.length - 1;
      const r = roll[k],
        x0 = r.x;
      return {
        x: x0,
        y: 0,
        h: gearH,
        v: r.v,
        seg: "roll",
        dir: [1, 0],
        vh: 0,
        kap: 0,
      };
    }
    let j = P.findIndex((p) => p.t >= tq);
    if (j < 0) j = P.length - 1;
    if (j < 1) j = 1; // past the last approach point (touchdown is 0.2 s later): hold it, not the start of TAEM
    const a = P[j - 1],
      b = P[j],
      w = clamp((tq - a.t) / Math.max(b.t - a.t, 1e-6), 0, 1);
    const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
    return {
      x: a.x + (b.x - a.x) * w,
      y: a.y + (b.y - a.y) * w,
      h: a.h + (b.h - a.h) * w,
      v: a.v + (b.v - a.v) * w,
      seg: w < 0.5 ? a.seg : b.seg,
      dir: [(b.x - a.x) / dl, (b.y - a.y) / dl],
      vh: ((b.h - a.h) * 1000) / Math.max(b.t - a.t, 1e-6),
      kap: curv(j),
    };
  };
  let bankS = 0,
    lastT = 0,
    machOne = false,
    hacEv = false,
    alEv = false,
    pfEv = false,
    gearT = null;
  const tEnd = tStop;
  for (let tq = 0; tq <= tEnd + 1e-6; tq += tq < tTD - 40 ? 1 : 0.5) {
    const s = at(tq),
      tAbs = t0 + tq;
    const hAbs = s.h + rwy.elev,
      atm = earthAtmos(hAbs),
      vms = s.v,
      mach = vms / atm.a,
      q = 0.5 * atm.rho * vms * vms;
    const bankT =
      s.seg === "roll" ? 0 : -Math.atan((vms * vms * s.kap) / 1000 / g) * RAD;
    bankS += (bankT - bankS) * clamp((tq - lastT) / 2.5, 0, 1);
    lastT = tq;
    let alpha =
      mach > 1
        ? 9 + 5 * clamp((mach - 1) / 1.5, 0, 1)
        : s.seg === "final"
          ? s.x > xPf
            ? 6 + 4 * clamp((s.x - xPf) / (XTD - xPf), 0, 1)
            : 6
          : 8;
    if (s.seg === "roll")
      alpha = 10 - (10 + 4.39) * smoothstep((tq - tTD - 4) / 6); // derotation: the nose comes down until the nose wheels touch, the orbiter 4.39° nose down on its gear
    const pB = posBF(s.x, s.y, s.h);
    const dB = vadd(vscale(f, s.dir[0]), vscale(lf, s.dir[1]));
    const upB = vunit(pB),
      dBh = vunit(vsub(dB, vscale(upB, vdot(dB, upB))));
    const vBv = vadd(
      vscale(dBh, Math.sqrt(Math.max(vms * vms - s.vh * s.vh, 0)) / 1000),
      vscale(upB, s.vh / 1000),
    );
    const M_ = bodyFixedToEcl("earth", tAbs),
      w = bodyOmegaEcl("earth", tAbs),
      r = mvec(M_, pB),
      vv = vadd(mvec(M_, vBv), vcross(w, r));
    const phase =
      s.seg === "taem"
        ? mach > 1
          ? "TAEM — supersonic glide"
          : "TAEM — subsonic glide"
        : s.seg === "hac"
          ? "heading alignment cone"
          : s.seg === "final"
            ? s.x > xPf
              ? "flare — inner glideslope"
              : "final approach — outer glideslope"
            : tq < tStop - 0.01
              ? "rollout"
              : "wheel stop";
    samples.push({
      t: tAbs,
      r,
      v: vv,
      m: opt.m,
      T: 0,
      thrDir: null,
      D: [0, 0, 0],
      alt: hAbs,
      q,
      mach,
      heat: 0,
      gload: 1 / Math.cos(bankS * DEG),
      phase,
      bank: bankS,
      alpha,
      _va: mvec(M_, vBv),
      _vs: vms,
      _vh: s.vh,
    });
    if (!machOne && mach < 1) {
      machOne = true;
      events.push({
        t: tAbs,
        name: "Sonic booms",
        desc: `The orbiter slows below the speed of sound ${Math.round(hAbs)} km up. A moment later the twin “ba-boom” of its bow and tail shock waves rolls across ${rwy.short.split(" Runway")[0]}: the signal for spectators that the orbiter is coming in.`,
        kind: "info",
      });
    }
    if (!hacEv && s.seg === "hac") {
      hacEv = true;
      events.push({
        t: tAbs,
        name: "Heading alignment cone",
        desc: `The orbiter banks into a ${Math.round(hac.dth * RAD)}° turn around an imaginary cone ${rH.toFixed(1)} km in radius, spiralling down to line up with ${rwy.short}. The radius of the turn is the energy control: wider to fly a longer path, tighter to cut it short.`,
        kind: "info",
      });
    }
    if (!alEv && s.seg === "final") {
      alEv = true;
      events.push({
        t: tAbs,
        name: "Approach and landing",
        desc: `On the centreline, ${((hAbs * 1000) / 0.3048 / 1000).toFixed(0)},000 ft up at 290 knots: the orbiter dives down the ${(ogs * RAD).toFixed(0)}° outer glideslope, about seven times steeper than an airliner’s, with the speed brake (the split rudder) holding the airspeed.`,
        kind: "approach",
      });
    }
    if (!pfEv && s.seg === "final" && s.x > xPf) {
      pfEv = true;
      events.push({
        t: tAbs,
        name: "Preflare",
        desc: "At 1,750 ft the commander pulls the nose up, flattening the dive onto the 1.5° inner glideslope.",
        kind: "approach",
      });
    }
    if (gearT == null && s.seg === "final" && s.h < 0.09) {
      gearT = tAbs;
      events.push({
        t: tAbs,
        name: "Landing gear down",
        desc: "The pilot arms and deploys the landing gear at about 300 ft — late, because the gear doors are part of the heat shield and the extended gear adds drag. Gravity and springs lower it in seconds.",
        kind: "info",
      });
    }
  }
  // drag (and on the runway, braking) from the along-path balance: dV/dt = −D/m − g·sin γ
  const Dacc = samples.map((s, i) => {
    const a = samples[Math.max(0, i - 1)],
      b = samples[Math.min(samples.length - 1, i + 1)];
    const dVdt = b.t > a.t ? (b._vs - a._vs) / (b.t - a.t) : 0,
      sg = s._vs > 1 ? clamp(s._vh / s._vs, -1, 1) : 0;
    return Math.max(0, -dVdt - g * sg);
  });
  samples.forEach((s, i) => {
    if (vnorm(s._va) > 1e-9) s.D = vscale(vunit(s._va), -opt.m * Dacc[i]);
    delete s._va;
    delete s._vs;
    delete s._vh;
  });
  const roll0 = roll[0],
    tdV = vTD;
  events.push({
    t: t0 + tTD,
    name: "Main gear touchdown",
    desc: `${Math.round(tdV / 0.5144)} knots (${Math.round(tdV * 3.6)} km/h), ${Math.round((XTD * 1000) / 0.3048)} ft past the threshold of ${rwy.short}.`,
    kind: "touchdown",
  });
  if (chuteT)
    events.push({
      t: t0 + chuteT,
      name: "Drag chute",
      desc: "The 40-ft drag chute deploys from the base of the tail, cutting the rollout by about 2,000 ft and saving the brakes (used from 1992).",
      kind: "chute",
    });
  events.push({
    t: t0 + noseT,
    name: "Nose gear touchdown",
    desc: "The commander lowers the nose (derotation); the brakes come on below 140 knots.",
    kind: "info",
  });
  if (chuteJet)
    events.push({
      t: t0 + chuteJet,
      name: "Drag chute jettisoned",
      desc: "Released at about 60 knots so it cannot drag the orbiter off the centreline.",
      kind: "jettison",
    });
  const rollDist = (roll[roll.length - 1].x - (roll0 ? roll0.x : XTD)) * 1000;
  events.push({
    t: t0 + tStop,
    name: "“Wheel stop”",
    desc: `The orbiter rolls to a stop ${Math.round(rollDist)} m (${Math.round(rollDist / 0.3048)} ft) down the runway. Ground crews in protective suits check for toxic propellant vapour before the crew can leave, about an hour later.`,
    kind: "landing",
  });
  const llOf = (px, py) => bfToLL(posBF(px, py, 0));
  return {
    samples,
    events,
    tTD: t0 + tTD,
    tStop: t0 + tStop,
    tGear: gearT || t0 + tTD - 15,
    tChute: chuteT ? t0 + chuteT : null,
    tChuteJet: chuteJet ? t0 + chuteJet : null,
    stopLL: llOf(roll[roll.length - 1].x, 0),
    tdLL: llOf(XTD, 0),
    hacTurn: hac.dth * RAD,
  };
}

// ---- scenarios.js
// ============================================================================
// scenarios.js — real-mission presets (sources: NASA mission reports, Wikipedia
// mission pages, CNSA releases). Times UTC.  MET = hours after liftoff.
// ============================================================================
const SCENARIOS = [
  {
    id: "apollo8",
    title: "Apollo 8",
    year: 1968,
    agency: "NASA",
    status: "Flown",
    crewed: true,
    dest: "moon",
    tag: "Lunar orbit & return",
    blurb:
      "First humans to leave Earth orbit. Ten orbits of the Moon on Christmas Eve 1968 — the “Earthrise” photograph — then home. No lander.",
    crewNames: "Frank Borman, Jim Lovell, Bill Anders",
    real: {
      Launch: "1968-12-21 12:51 UTC",
      TLI: "GET 2:50:37, 5 m 18 s burn",
      "Lunar orbit": "10 revs, 111 × 112 km",
      TEI: "GET 89:19:16",
      Splashdown: "1968-12-27 15:51 UTC, 8.1°N 165.0°W",
      Duration: "6 d 3 h 0 m",
    },
    cfg: {
      name: "Apollo 8",
      profile: "lunar-orbit",
      launcher: "saturnV",
      spacecraft: "apolloCSMLTA",
      crew: 3,
      shipName: "Apollo 8 (CSM-103)",
      site: "KSC39A",
      launch: "1968-12-21T12:51:00Z",
      launchAz: 72.124,
      parking: { hp: 185, ha: 190 },
      tliMET: 2.843,
      tof: 66.2,
      sepAfterTLI: 0.55,
      mccMET: 10.99,
      perilune: 112,
      loi: { apo: 312, circ: 112, circAfter: 4.45 },
      teiMET: 89.32,
      returnTof: 57.5,
      returnMccAfter: 14.7,
      splash: { lat: 8.133, lon: -165.017, name: "Pacific, USS Yorktown" },
      entry: { fpa: -6.5 },
      sepName: "CSM separation from S-IVB",
      sepDesc:
        "The CSM separates from the S-IVB, which carries the LM test article (LTA-B) into solar orbit after a lunar slingshot.",
      scripted: [
        {
          when: "lunarOrbit",
          met: 75.8,
          name: "Earthrise",
          desc: "Bill Anders photographs the Earth rising over the lunar horizon (AS08-14-2383) — one of the most influential photographs ever taken.",
          kind: "photo",
        },
        {
          when: "lunarOrbit",
          met: 85.73,
          name: "Christmas Eve broadcast",
          desc: "The crew reads from the Book of Genesis during a live TV broadcast from lunar orbit, watched by an estimated billion people.",
          kind: "info",
        },
      ],
    },
  },
  {
    id: "apollo11",
    title: "Apollo 11",
    year: 1969,
    agency: "NASA",
    status: "Flown",
    crewed: true,
    dest: "moon",
    tag: "Landing & return",
    blurb:
      "First crewed lunar landing. Eagle lands in the Sea of Tranquility while Columbia waits in lunar orbit; lunar-orbit rendezvous, then return to the Pacific.",
    crewNames: "Neil Armstrong, Buzz Aldrin, Michael Collins",
    real: {
      Launch: "1969-07-16 13:32 UTC",
      TLI: "GET 2:44:16, Δv ≈ 3,182 m/s",
      "LOI-1": "GET 75:49:50, Δv ≈ 889 m/s",
      Landing: "1969-07-20 20:17:40 UTC, 0.674°N 23.473°E",
      "Lunar liftoff": "GET 124:22",
      Splashdown: "1969-07-24 16:50 UTC, 13.3°N 169.2°W",
      "Entry speed": "11.03 km/s",
    },
    cfg: {
      name: "Apollo 11",
      profile: "lunar-landing",
      launcher: "saturnV",
      spacecraft: "apolloCSMLM",
      crew: 3,
      landerCrew: 2,
      shipName: "Columbia (CSM-107)",
      landerName: "Eagle (LM-5)",
      site: "KSC39A",
      launch: "1969-07-16T13:32:00Z",
      launchAz: 72.058,
      parking: { hp: 185, ha: 190 },
      tliMET: 2.738,
      tof: 73.0,
      sepAfterTLI: 1.3,
      mccMET: 26.75,
      perilune: 111,
      loi: { apo: 314, circ: 120, circAfter: 4.36 },
      landing: { lat: 0.67408, lon: 23.47297, name: "Tranquility Base" },
      undockMET: 100.2,
      pdiMET: 102.55,
      landMET: 102.76,
      ascentMET: 124.367,
      ascentOrbit: { hp: 17, ha: 87 },
      samples: 21.5,
      rendezvousMinDelay: 0.9,
      ascJettisonAfter: 2.1,
      teiMET: 135.395,
      returnTof: 59.6,
      returnMccAfter: 15.1,
      splash: { lat: 13.317, lon: -169.15, name: "Pacific, USS Hornet" },
      entry: { fpa: -6.48 },
      sepName: "Transposition, docking & extraction",
      sepDesc:
        "Columbia separates, turns around, docks with Eagle and pulls it free of the S-IVB, which is then sent past the Moon into solar orbit.",
      undockName: "Eagle undocks",
      undockDesc:
        "“The Eagle has wings.” Collins stays aboard Columbia in lunar orbit.",
      liftoffName: "Eagle liftoff",
      dockName: "Docking with Columbia",
      dsName: "Eagle descent stage (Tranquility Base)",
      ascStageName: "Eagle ascent stage",
      scripted: [
        {
          when: "surface",
          afterLanding: 0.005,
          name: "“The Eagle has landed.”",
          desc: "Armstrong: “Houston, Tranquility Base here. The Eagle has landed.” About 25 seconds of descent propellant remained.",
          kind: "info",
        },
        {
          when: "surface",
          afterLanding: 6.6,
          name: "First step",
          desc: "“That’s one small step for [a] man, one giant leap for mankind.” — 1969-07-21 02:56 UTC.",
          kind: "info",
        },
      ],
    },
  },
  {
    id: "apollo13",
    title: "Apollo 13",
    year: 1970,
    agency: "NASA",
    status: "Flown",
    crewed: true,
    dest: "moon",
    tag: "Free-return abort (flyby)",
    blurb:
      "“Houston, we’ve had a problem.” An oxygen tank explodes 56 hours out. The crew survives in the lunar module, swings around the Moon on a free-return trajectory and splashes down safely.",
    crewNames: "Jim Lovell, Jack Swigert, Fred Haise",
    real: {
      Launch: "1970-04-11 19:13 UTC",
      Explosion: "GET 55:54:53",
      "DPS burn (free return)": "GET 61:29:43",
      "Closest approach": "GET 77:02:39, 254 km above far side",
      "Max distance": "400,171 km (record until Artemis II)",
      "PC+2 burn": "GET 79:27:39, ≈ 262 m/s",
      Splashdown: "1970-04-17 18:07 UTC, 21.6°S 165.4°W",
    },
    cfg: {
      name: "Apollo 13",
      profile: "lunar-flyby",
      launcher: "saturnV",
      spacecraft: "apolloCSMLM",
      crew: 3,
      shipName: "Odyssey + Aquarius",
      landerName: "Aquarius (LM-7)",
      site: "KSC39A",
      launch: "1970-04-11T19:13:00Z",
      launchAz: 72.043,
      parking: { hp: 185, ha: 190 },
      tliMET: 2.596,
      tof: 74.4,
      sepAfterTLI: 0.5,
      mccMET: 30.68,
      perilune: 254,
      hybrid: { perilune: 111, lat: -3.65, lon: -17.47, landMET: 103.7 },
      lifeboat: "LMDS",
      smSepBeforeEI: 282,
      lifeboatJettisonBeforeEI: 1.18,
      returnMccAfter: 25,
      splash: {
        lat: -21.633,
        lon: -165.367,
        name: "South Pacific, USS Iwo Jima",
      },
      entry: { fpa: -6.27 },
      sepName: "Transposition, docking & extraction",
      smSepName: "Service module jettison",
      smSepDesc:
        "The crew sees the damage for the first time: an entire panel of the service module is blown away.",
      lifeboatName: "Aquarius (lifeboat)",
      lifeboatJettisonName: "Aquarius jettisoned",
      lifeboatJettisonDesc:
        "“Farewell, Aquarius, and we thank you.” The LM that kept the crew alive is released to burn up.",
      scripted: [
        {
          met: 55.915,
          name: "Oxygen tank 2 explodes",
          desc: "“Houston, we’ve had a problem.” A damaged heater wire ignites insulation in oxygen tank 2. The service module loses oxygen, power and its main engine. The crew powers down Odyssey and moves into Aquarius.",
          kind: "emergency",
        },
        {
          type: "freeReturnBurn",
          met: 61.495,
          name: "DPS burn — return to free return",
          desc: "With the service module engine unusable, the lunar module descent engine puts the stack back on a free-return trajectory.",
          engine: "LMDS",
        },
        {
          type: "pc2",
          dt: 2.4,
          eiMET: 142.68,
          dvGuess: 260,
          name: "PC+2 burn (descent engine)",
          desc: "Two hours after pericynthion the LM descent engine burns to speed up the return and move splashdown to the Pacific recovery area.",
          engine: "LMDS",
        },
      ],
    },
  },
  {
    id: "artemis2",
    title: "Artemis II",
    year: 2026,
    agency: "NASA / CSA / ESA",
    status: "Flown",
    crewed: true,
    dest: "moon",
    tag: "Crewed lunar flyby (free return)",
    blurb:
      "First crewed flight of SLS and Orion (April 2026). A day in high Earth orbit for checkout, then a free-return loop 6,545 km beyond the lunar far side — a new human distance record.",
    crewNames: "Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen",
    real: {
      Launch: "2026-04-01 22:35:12 UTC, LC-39B",
      "High Earth orbit": "192 × 70,174 km, 23.5 h",
      TLI: "Flight day 2, OMS-E 5 m 49 s",
      "Closest approach": "2026-04-06 23:00 UTC, 6,545 km above far side",
      "Max distance": "406,771 km (record)",
      Splashdown: "2026-04-11 00:07 UTC, 32.3°N 117.8°W",
    },
    cfg: {
      name: "Artemis II",
      profile: "lunar-flyby",
      launcher: "sls1",
      spacecraft: "orion",
      crew: 4,
      shipName: "Orion “Integrity”",
      site: "KSC39B",
      launch: "2026-04-01T22:35:12Z",
      parking: { hp: 185, ha: 2300 },
      heo: {
        ha: 70174,
        name: "Apogee raise burn (ICPS)",
        sepAfter: 1.35,
        sepName: "Orion separates from ICPS",
        sepDesc:
          "Orion separates from the Interim Cryogenic Propulsion Stage in high Earth orbit.",
        proxOps: true,
      },
      tliBy: "sc",
      tof: 95.6,
      mccAfterTLI: 22,
      perilune: 6545,
      returnMccAfter: 40,
      splash: {
        lat: 32.3,
        lon: -117.8,
        name: "Pacific, SW of San Diego (USS John P. Murtha)",
      },
      entry: { fpa: -5.9 },
      smSepBeforeEI: 20,
      smSepName: "Crew module / ESM separation",
      smName: "European Service Module",
      scripted: [
        {
          when: "flyby",
          dt: -0.1,
          name: "Solar eclipse from behind the Moon",
          desc: "The crew watches the Sun disappear behind the Moon — a total solar eclipse seen from deep space.",
          kind: "photo",
        },
      ],
    },
  },
  {
    id: "change5",
    title: "Chang’e 5",
    year: 2020,
    agency: "CNSA",
    status: "Flown",
    crewed: false,
    dest: "moon",
    tag: "Robotic landing & sample return",
    blurb:
      "China’s first lunar sample return: 1,731 g of young basalt from Mons Rümker. Robotic landing, launch from the Moon, automated rendezvous in lunar orbit and a skip re-entry into Inner Mongolia.",
    real: {
      Launch: "2020-11-23 20:30 UTC, Long March 5",
      LOI: "2020-11-28 12:58 UTC",
      Landing: "2020-12-01 15:11 UTC, 43.06°N 51.92°W",
      Ascent: "2020-12-03 15:10 UTC",
      Docking: "2020-12-05 21:42 UTC",
      TEI: "2020-12-13 01:51 UTC",
      "Landing on Earth": "2020-12-16 ≈18:00 UTC, Siziwang Banner",
    },
    cfg: {
      name: "Chang’e 5",
      profile: "lunar-landing",
      launcher: "lm5",
      spacecraft: "change5",
      crew: 0,
      shipName: "Orbiter + returner",
      landerName: "Lander + ascender",
      site: "WENCHANG",
      launch: "2020-11-23T20:30:12Z",
      parking: { hp: 200, ha: 210 },
      tof: 112,
      sepAfterTLI: 0.1,
      mccAfterTLI: 17,
      perilune: 200,
      loi: { apo: 5000, circ: 200, circAfter: 23.4 },
      landing: {
        lat: 43.0576,
        lon: -51.9161,
        name: "Mons Rümker, Oceanus Procellarum",
      },
      undockMET: 168.0,
      pdiMET: 186.6,
      landMET: 186.68,
      ascentMET: 234.67,
      ascentOrbit: { hp: 15, ha: 180 },
      samples: 1.731,
      rendezvousMinDelay: 46,
      ascJettisonAfter: 6.9,
      teiMET: 461.35,
      returnTof: 88,
      returnMccAfter: 30,
      splash: {
        lat: 42.0,
        lon: 111.5,
        name: "Siziwang Banner, Inner Mongolia",
      },
      entry: { fpa: -5.5, skip: true },
      splashName: "Returner lands",
      splashDesc:
        "The returner comes down on land under its parachute, on the snowy grassland of Siziwang Banner, where the recovery teams find it by its beacon.",
      smSepBeforeEI: 30,
      smSepName: "Returner separation",
      smName: "Chang’e 5 orbiter (continues to Sun–Earth L1)",
      sepName: "Probe separation",
      sepDesc:
        "The probe separates from the Long March 5 second stage, already on its Earth–Moon transfer orbit.",
      undockName: "Lander + ascender separate",
      undockDesc:
        "The lander–ascender combination separates from the orbiter–returner, which stays in a 200 km lunar orbit.",
      liftoffName: "Ascender liftoff (first Chinese launch from another world)",
      dockName: "Robotic docking",
      dockDesc:
        "First robotic rendezvous and docking in lunar orbit; the sample canister is transferred into the returner.",
      dsName: "Chang’e 5 lander (Mons Rümker)",
      ascStageName: "Ascender (deorbited)",
      ascJettisonName: "Ascender released",
      scripted: [
        // times after touchdown (15:11 UTC): the drilling was done by 20:53, the sampling sealed by 14:00 next day (CNSA); the flag before liftoff
        {
          when: "surface",
          afterLanding: 1.0,
          name: "Drilling",
          desc: "The drill bores about a metre into the regolith. The core, in a flexible bag, is coiled up and sealed into the container on top of the ascender.",
          kind: "info",
        },
        {
          when: "surface",
          afterLanding: 6.0,
          name: "Scooping",
          desc: "The robotic arm scoops surface soil in several places and empties each scoop into the container on top of the ascender. Drill and scoop together: 1,731 g of regolith.",
          kind: "info",
        },
        {
          when: "surface",
          afterLanding: 46.0,
          name: "Flag unfurled",
          desc: "A Chinese flag, made of a composite fabric to survive the Moon’s heat and radiation, unfurls on its pole at the side of the lander — China’s first fabric flag on the Moon (earlier landers carried painted flags).",
          kind: "photo",
        },
      ],
    },
  },
  // ------------------------------------------------------------------ MARS
  {
    id: "mariner4",
    title: "Mariner 4",
    year: 1965,
    agency: "NASA / JPL",
    status: "Flown",
    crewed: false,
    dest: "mars",
    tag: "Mars flyby (one-way)",
    blurb:
      "The first successful Mars flyby and the first close-up photographs of another planet: 21 grainy images showing a cratered, Moon-like surface.",
    real: {
      Launch: "1964-11-28 14:22 UTC, Atlas-Agena D",
      "Mars flyby": "1965-07-15 01:00 UTC",
      "Closest approach": "9,846 km altitude",
      Images: "21 + 1 partial (8.33 bit/s downlink)",
      "Spacecraft mass": "260.8 kg",
    },
    cfg: {
      name: "Mariner 4",
      profile: "mars-flyby",
      dest: "mars",
      launcher: "atlasAgena",
      spacecraft: "mariner4",
      crew: 0,
      shipName: "Mariner 4",
      site: "CCSFS12",
      launch: "1964-11-28T14:22:01Z",
      parking: { hp: 185, ha: 190 },
      tmiDelay: 0.75,
      legs: [
        {
          body: "mars",
          t: "1965-07-15T01:00:57Z",
          type: "flyby",
          alt: 9846,
          name: "Mars flyby — first close-up images",
          events: [
            {
              dt: -0.45,
              name: "Imaging sequence",
              desc: "The TV camera records 21 pictures (plus part of a 22nd) onto tape. Each image will take about 10 hours to send home at 8.33 bits per second.",
              kind: "photo",
            },
            {
              dt: 1.2,
              name: "Radio occultation",
              desc: "Mariner 4 passes behind Mars as seen from Earth. The fading radio signal reveals a thin atmosphere — surface pressure only 4–7 mbar.",
              kind: "info",
            },
          ],
        },
      ],
      coastAfter: 120,
      afterPhase: "heliocentric orbit (still circling the Sun today)",
    },
  },
  {
    id: "perseverance",
    title: "Mars 2020 Perseverance",
    year: 2021,
    agency: "NASA / JPL",
    status: "Flown",
    crewed: false,
    dest: "mars",
    tag: "Direct entry & landing (one-way)",
    blurb:
      "Atlas V launch, seven-month cruise, then the “seven minutes of terror”: 5.4 km/s entry, supersonic parachute, terrain-relative navigation and the sky crane lowering the rover into Jezero Crater.",
    real: {
      Launch: "2020-07-30 11:50 UTC, Atlas V 541",
      "Launch mass": "4,060 kg",
      Entry: "2021-02-18 ≈20:38 UTC, ~5.4 km/s",
      Landing: "2021-02-18 20:55 UTC (Earth receive)",
      Site: "Jezero Crater 18.445°N 77.451°E",
      Parachute: "21.5 m disk-gap-band, Mach ≈1.75",
    },
    cfg: {
      name: "Mars 2020 Perseverance",
      profile: "mars-landing",
      dest: "mars",
      launcher: "atlasV541",
      spacecraft: "perseverance",
      crew: 0,
      shipName: "Mars 2020 (Perseverance)",
      site: "CCSFS41",
      launch: "2020-07-30T11:50:00Z",
      parking: { hp: 185, ha: 185 },
      tmiDelay: 0.85,
      legs: [
        {
          body: "mars",
          t: "2021-02-18T20:38:00Z",
          type: "entry",
          tLand: "2021-02-18T20:44:00Z",
          site: {
            lat: 18.4447,
            lon: 77.4508,
            elev: -2.57,
            name: "Jezero Crater — Octavia E. Butler Landing",
          },
          entry: { fpa: -15.5, alt: 125, bank: 30 },
          sepBefore: 10,
        },
      ],
      landName: "Touchdown — Perseverance",
      surfaceDays: 33,
      cruiseName: "Mars 2020 cruise stage",
      // first drive as flown on 4 March 2021 (JPL), then illustrative commutes; the real route is not modelled
      rover: {
        body: "mars",
        top: 0.042,
        avg: 0.03,
        heading: 160,
        drives: [
          {
            sol: 14,
            name: "First drive on Mars",
            desc: "Perseverance drives 4 m forward, turns 150° to the left in place and backs up 2.5 m into a temporary parking spot — 6.5 m in about 33 minutes (4 March 2021).",
            moves: [
              ["fwd", 4],
              ["turn", -150],
              ["back", 2.5],
            ],
            pause: 780,
          },
          { sol: 16, turn: 35, dist: 20 },
          { sol: 19, turn: -25, dist: 45 },
          { sol: 22, turn: 40, dist: 70 },
          { sol: 25, turn: -20, dist: 100 },
          { sol: 28, turn: 25, dist: 110 },
          { sol: 31, turn: -35, dist: 120 },
        ],
      },
      surfaceEvents: [
        {
          afterLanding: 0.01,
          name: "“Touchdown confirmed!”",
          desc: "JPL mission control receives confirmation 11 minutes after the rover actually landed — the radio signal’s travel time from Mars.",
          kind: "info",
        },
        {
          afterLanding: 2.5,
          name: "First panoramas",
          desc: "Mastcam-Z begins imaging the delta deposits of an ancient lake.",
          kind: "photo",
        },
      ],
    },
  },
  {
    id: "tianwen1",
    title: "Tianwen-1 / Zhurong",
    year: 2021,
    agency: "CNSA",
    status: "Flown",
    crewed: false,
    dest: "mars",
    tag: "Orbiter + landing (one-way)",
    blurb:
      "China’s first Mars mission did everything at once: orbit, land and rove. After three months surveying the landing zone from orbit, the capsule landed Zhurong in Utopia Planitia.",
    real: {
      Launch: "2020-07-23 04:41 UTC, Long March 5",
      "Mars orbit insertion": "2021-02-10 11:52 UTC",
      "Parking orbit": "≈280 × 59,000 km, 86.9°, 2 sols",
      Landing: "2021-05-14 23:18 UTC",
      Site: "Utopia Planitia 25.07°N 109.93°E",
      Mass: "5,000 kg",
    },
    cfg: {
      name: "Tianwen-1",
      profile: "mars-orbit-landing",
      dest: "mars",
      launcher: "lm5",
      spacecraft: "tianwen1",
      crew: 0,
      shipName: "Tianwen-1",
      site: "WENCHANG",
      launch: "2020-07-23T04:41:15Z",
      parking: { hp: 200, ha: 210 },
      tmiDelay: 0.6,
      legs: [
        {
          body: "mars",
          t: "2021-02-10T11:52:00Z",
          type: "orbit",
          alt: 400,
          apo: 180000,
          incl: 10,
          moiName: "Mars orbit insertion (capture)",
          trim: {
            after: 5,
            peri: 265,
            incl: 86.9,
            name: "Plane change to a polar orbit",
            desc: "At apoapsis, 180,000 km out, the orbiter swings its orbit plane over the poles so the ground track can reach the landing site.",
          },
          next: "land",
          site: {
            lat: 25.066,
            lon: 109.925,
            elev: -4.1,
            name: "Utopia Planitia",
          },
          tLand: "2021-05-14T23:18:00Z",
          parkPeri: 280,
          parkApo: 59000,
          entryFpa: -11.5,
          orbitEvents: [
            {
              t: "2021-03-04T00:00:00Z",
              name: "High-resolution imaging of the landing zone",
              desc: "HiRIC camera images the pre-selected landing area at 0.5–0.7 m per pixel.",
              kind: "photo",
            },
          ],
        },
      ],
      landName: "Touchdown — Zhurong lander",
      surfaceDays: 8,
      orbiterName: "Tianwen-1 orbiter",
      roverOff: { wings: 0.6, ramp: 2.0, roll: 7.14 }, // days after touchdown; it drove off on 22 May 02:40 UTC (the first two approximate)
      surfaceEvents: [
        {
          afterLanding: 0.6,
          name: "Zhurong unfolds",
          desc: "The rover raises its body on its suspension, opens its four solar wings like a butterfly’s and lifts its mast and antenna. (Time approximate.)",
          kind: "deploy",
        },
        {
          afterLanding: 2.0,
          name: "Ramp unfolds",
          desc: "Two rails swing down from the front of the landing platform and run out to the ground. (Time approximate.)",
          kind: "deploy",
        },
        {
          afterLanding: 7.14,
          name: "Zhurong rolls off the lander",
          desc: "The 240 kg solar-powered rover drives down the ramp onto the surface of Utopia Planitia.",
          kind: "info",
        },
      ],
    },
  },
  {
    id: "msr",
    title: "Mars Sample Return",
    year: 2031,
    agency: "CNSA Tianwen-3-style architecture",
    status: "Planned / concept",
    crewed: false,
    dest: "mars",
    tag: "Robotic landing & sample return",
    blurb:
      "Concept based on the announced Tianwen-3 plan (launch window 2028, samples on Earth by 2031): land, drill, launch a Mars Ascent Vehicle, capture the sample in orbit, return the capsule to Earth. Simplified to a single launch.",
    real: {
      Status: "Planned (Tianwen-3: two Long March 5 launches, 2028)",
      Return: "“by 2031” (CNSA)",
      "Model note": "Dates chosen by the minimum-energy transfer search",
    },
    cfg: {
      name: "Mars Sample Return (concept)",
      profile: "mars-landing-return",
      dest: "mars",
      launcher: "lm5",
      spacecraft: "msrConcept",
      crew: 0,
      shipName: "Sample-return stack",
      site: "WENCHANG",
      launch: "2028-11-24T08:00:00Z",
      parking: { hp: 200, ha: 210 },
      tmiDelay: 0.6,
      samples: 0.6,
      legs: [
        {
          body: "mars",
          t: "2029-09-22T07:00:00Z",
          type: "entry",
          tLand: "2029-09-22T07:08:00Z",
          site: {
            lat: 25.1,
            lon: 109.9,
            elev: -4.1,
            name: "Utopia Planitia (candidate)",
          },
          entry: { fpa: -12.5, alt: 125, bank: 35 },
          next: "return",
          sepBefore: 30,
        },
        {
          body: "earth",
          t: "2031-08-26T16:00:00Z",
          departMars: "2030-09-30T16:00:00Z",
          type: "entry",
          site: {
            lat: 42.0,
            lon: 111.5,
            name: "Siziwang Banner, Inner Mongolia",
          },
          entry: { fpa: -10.5, alt: 125, bank: 30 },
          sepBefore: 60,
          sepName: "Earth entry capsule release",
        },
      ],
      lmoAlt: 350,
      ascentLead: 8,
      surfaceDays: 370,
    },
  },
  {
    id: "starshipMars",
    title: "Crewed Mars — Starship",
    year: 2033,
    agency: "SpaceX (concept)",
    status: "Concept",
    crewed: true,
    dest: "mars",
    tag: "Crewed landing & return (conjunction class)",
    blurb:
      "Concept profile: launch to LEO, refill with tanker flights, 6-month cruise, direct entry and propulsive landing, ~18 months on the surface making propellant from the Martian air and ice, then a direct launch home.",
    real: {
      Status: "Concept (SpaceX architecture; not yet flown)",
      Vehicle: "Super Heavy + Ship, Block 2 specs",
      Refilling: "≈8 tanker flights in Earth orbit",
      Stay: "≈560 days (conjunction class)",
      "Return propellant": "In-situ resource utilisation (Sabatier)",
    },
    cfg: {
      name: "Crewed Mars — Starship (concept)",
      profile: "mars-landing-return",
      dest: "mars",
      launcher: "starship",
      spacecraft: "starshipCrew",
      crew: 6,
      shipName: "Starship (crewed)",
      payloadMass: 100000,
      site: "STARBASE",
      launch: "2033-03-10T15:00:00Z",
      parking: { hp: 200, ha: 210 },
      refill: { days: 33, to: 1500000, tankers: 8 },
      tmiDelay: 0.2,
      legs: [
        {
          body: "mars",
          t: "2033-10-22T16:00:00Z",
          type: "entry",
          tLand: "2033-10-22T16:10:00Z",
          site: {
            lat: 40.8,
            lon: 150.0,
            elev: -4.0,
            name: "Arcadia Planitia (candidate)",
          },
          entry: { fpa: -11, alt: 125, bank: 20 },
          next: "return",
          sepBefore: 1,
        },
        {
          body: "earth",
          t: "2035-11-24T16:00:00Z",
          departMars: "2035-05-10T15:00:00Z",
          type: "entry",
          site: { lat: 25.99, lon: -97.15, name: "Starbase, Texas" },
          entry: { fpa: -6.2, alt: 125, bank: 40 },
          sepBefore: 1,
        },
      ],
      isru: { to: 1300000 },
      lmoAlt: 250,
      ascentLead: 4,
      surfaceEvents: [
        {
          afterLanding: 1.0,
          name: "First human steps on Mars",
          desc: "Surface gravity 0.38 g; air pressure under 1 % of Earth’s; the sky is butterscotch by day and blue at sunset.",
          kind: "info",
        },
      ],
    },
  },
  {
    id: "starshipOrbit",
    title: "Crewed Mars orbit & return",
    year: 2033,
    agency: "Concept",
    status: "Concept",
    crewed: true,
    dest: "mars",
    tag: "Crewed orbit & return (no landing)",
    blurb:
      "Concept: a crew flies to Mars, captures into a high orbit, films and surveys the planet and its moons for the length of a conjunction-class stay, then fires for home — never touching the surface.",
    real: {
      Status: "Concept profile",
      Vehicle: "Starship (refilled in LEO)",
      "Mars orbit": "≈250 × 33,000 km (1-sol)",
      "Stay in orbit": "≈560 days",
    },
    cfg: {
      name: "Crewed Mars orbit & return (concept)",
      profile: "mars-orbit-return",
      dest: "mars",
      launcher: "starship",
      spacecraft: "starshipCrew",
      crew: 4,
      shipName: "Starship (orbital)",
      payloadMass: 50000,
      site: "STARBASE",
      launch: "2033-03-10T15:00:00Z",
      parking: { hp: 200, ha: 210 },
      refill: { days: 33, to: 1500000, tankers: 8 },
      tmiDelay: 0.2,
      legs: [
        {
          body: "mars",
          t: "2033-10-22T16:00:00Z",
          type: "orbit",
          alt: 250,
          apo: 33000,
          incl: 30,
          next: "return",
          moiName: "Mars orbit insertion",
          orbitEvents: [
            {
              afterArrival: 2,
              name: "Phobos close pass",
              desc: "From the high elliptical orbit the crew films Phobos (22 km across) from a few thousand kilometres.",
              kind: "photo",
            },
            {
              afterArrival: 30,
              name: "Global dust-storm watch",
              desc: "Long-duration filming of weather systems, polar caps and Valles Marineris at dawn.",
              kind: "photo",
            },
          ],
        },
        {
          body: "earth",
          t: "2035-11-24T16:00:00Z",
          departMars: "2035-05-10T15:00:00Z",
          type: "entry",
          site: { lat: 25.99, lon: -97.15, name: "Starbase, Texas" },
          entry: { fpa: -6.2, alt: 125, bank: 40 },
          sepBefore: 1,
        },
      ],
    },
  },
  {
    id: "inspirationMars",
    title: "Inspiration Mars",
    year: 2018,
    agency: "Inspiration Mars Foundation (concept)",
    status: "Concept (not flown)",
    crewed: true,
    dest: "mars",
    tag: "Crewed Mars flyby & free return",
    blurb:
      "Dennis Tito’s 2013 proposal: a married couple on a 501-day free-return flight around Mars, using the planet’s gravity to swing back to Earth with no major burn — and a record 14 km/s re-entry.",
    real: {
      "Launch (proposed)": "2018-01-05",
      "Mars flyby": "2018-08-20, close pass",
      Return: "2019-05-21, entry ≈14 km/s",
      Duration: "501 days",
      Crew: "2",
    },
    cfg: {
      name: "Inspiration Mars (concept)",
      profile: "mars-flyby-return",
      dest: "mars",
      launcher: "sls1",
      spacecraft: "inspirationMars",
      crew: 2,
      shipName: "Capsule + habitat",
      site: "KSC39B",
      launch: "2018-01-05T12:00:00Z",
      parking: { hp: 185, ha: 190 },
      tmiDelay: 0.7,
      legs: [
        {
          body: "mars",
          t: "2018-08-20T12:00:00Z",
          type: "flyby",
          minAlt: 100,
          name: "Mars flyby (gravity-assisted free return)",
          events: [
            {
              dt: -2,
              name: "Mars fills the window",
              desc: "For a few hours the crew sees Mars grow from a bright star to a globe filling the window.",
              kind: "photo",
            },
          ],
        },
        {
          body: "earth",
          t: "2019-05-21T12:00:00Z",
          type: "entry",
          site: { lat: 33.0, lon: -122.0, name: "Pacific off California" },
          entry: { fpa: -7.4, alt: 125, bank: 40 },
          sepBefore: 60,
          sepName: "Capsule separation from habitat",
        },
      ],
      tcmAfterFlyby: 10,
    },
  },
  // ------------------------------------------------------------------ EARTH ORBIT (Space Shuttle)
  {
    id: "sts1",
    title: "STS-1 Columbia",
    year: 1981,
    agency: "NASA",
    status: "Flown",
    crewed: true,
    dest: "earth",
    tag: "First Space Shuttle flight",
    blurb:
      "The first Space Shuttle flight, and the first time NASA flew a crew on a new spacecraft’s maiden flight. John Young and Bob Crippen tested Columbia for 36 orbits, then glided home onto a dry lakebed in the Mojave Desert.",
    crewNames: "John Young, Robert Crippen",
    real: {
      Launch: "1981-04-12 12:00:04 UTC, LC-39A",
      Ascent: "Standard insertion: MECO T+8:34, OMS-1 T+10:34, OMS-2 T+44:02",
      Orbit: "≈ 241 km, raised to 273 × 276 km; 40.3°",
      Landing:
        "1981-04-14 18:20:57 UTC, Rogers Dry Lake Runway 23, Edwards AFB",
      Duration: "2 d 6 h 20 m 53 s, 36 orbits",
      "External Tank": "Painted white (STS-1 and STS-2 only)",
    },
    cfg: {
      name: "STS-1",
      profile: "leo-shuttle",
      dest: "earth",
      launcher: "shuttle",
      spacecraft: "shuttle",
      crew: 2,
      shipName: "Columbia (OV-102)",
      orbiterId: "OV-102",
      lvVariant: "sts1",
      bayPayload: "dfi",
      site: "KSC39A",
      launch: "1981-04-12T12:00:04Z",
      incl: 40.3,
      parking: { hp: 37, ha: 125, hCut: 118 },
      etDry: 34500,
      ssme: {
        sched: [
          [0, 0.957],
          [27, 0.957],
          [29, 0.622],
          [52, 0.622],
          [55, 0.957],
        ],
      },
      negReturn: 245,
      pressToMeco: 385,
      oms1: { met: 690, ha: 244 },
      oms2: { hp: 241 },
      bayOpenMET: 1.45,
      orbitBurns: [
        {
          met: 6.346,
          name: "OMS-3 — orbit raise",
          ha: 276,
          desc: "The first of two burns that lift Columbia to its working orbit.",
        },
        {
          met: 7.092,
          name: "OMS-4 — circularisation",
          hp: 273,
          desc: "Half an orbit later the second burn rounds the orbit off.",
        },
      ],
      scripted: [
        {
          met: 1.6,
          name: "Missing tiles on the OMS pods",
          desc: "Television pictures of the open payload bay show gaps where sixteen heat-shield tiles came off the OMS pods during launch. The pods see little heating and engineers clear them, but the crew cannot see Columbia’s belly — its condition stays unknown until entry.",
          kind: "photo",
        },
        {
          met: 7.6,
          name: "TV from orbit",
          desc: "The crew shows the world the inside of the first reusable spacecraft, floating through the mid-deck and the flight deck.",
          kind: "info",
        },
      ],
      landing: "1981-04-14T18:20:57Z",
      runway: "EDW23L",
      blackout: true,
      dragChute: false,
      ogs: 19,
      rollout: 2.741,
      orbitPhaseName: "In orbit — flight tests",
      scOverride: {
        ORB: {
          name: "Columbia (OV-102) with crew and consumables",
          dry: 84000,
        },
        PAY: { name: "Development Flight Instrumentation pallet", dry: 4600 },
        OMS: { prop: 10800 },
      },
    },
  },
  {
    id: "sts31",
    title: "STS-31 Discovery — Hubble",
    year: 1990,
    agency: "NASA / ESA",
    status: "Flown",
    crewed: true,
    dest: "earth",
    tag: "Deploying the Hubble Space Telescope",
    blurb:
      "Discovery carried the Hubble Space Telescope to about 615 km, the highest orbit any Shuttle reached. The robot arm lifted the 11-tonne telescope out of the bay, its solar arrays unrolled, and it was set free — where it still works today.",
    crewNames:
      "Loren Shriver, Charles Bolden, Steven Hawley, Bruce McCandless II, Kathryn Sullivan",
    real: {
      Launch: "1990-04-24 12:33:51 UTC, LC-39B",
      "MECO orbit": "611 × 89 km (330 × 48 nmi)",
      "After OMS-2": "611 × 576 km (330 × 311 nmi), 28.5°",
      "Hubble release": "1990-04-25 19:37:51 UTC",
      Landing: "1990-04-29 13:49:57 UTC, Edwards Runway 22",
      Duration: "5 d 1 h 16 m",
      "Hubble mass": "≈ 10,900 kg",
    },
    cfg: {
      name: "STS-31",
      profile: "leo-shuttle",
      dest: "earth",
      launcher: "shuttle",
      spacecraft: "shuttle",
      crew: 5,
      shipName: "Discovery (OV-103)",
      orbiterId: "OV-103",
      bayPayload: "hst",
      bayPayloadReturn: null,
      site: "KSC39B",
      launch: "1990-04-24T12:33:51Z",
      incl: 28.45,
      parking: { hp: 89, ha: 611, hCut: 112 },
      etDry: 30000,
      ssme: {
        sched: [
          [0, 0.995],
          [18, 0.995],
          [19, 0.928],
          [28, 0.928],
          [29, 0.641],
          [59, 0.641],
          [61, 0.995],
        ],
      },
      negReturn: 250,
      pressToMeco: 390,
      oms2: { hp: 576 },
      bayOpenMET: 1.4,
      orbitBurns: [
        {
          met: 2.2,
          at: "apo",
          name: "OMS-3 — raise to deploy orbit",
          hp: 613,
          desc: "Raises the low side of the orbit to about 613 km: the higher Hubble starts, the longer it lasts before air drag pulls it down.",
        },
      ],
      deploy: {
        t: "1990-04-25T19:37:51Z",
        name: "Hubble Space Telescope",
        short: "Hubble",
        id: "hst",
        model: "hubble",
        mass: 10886,
        grapple: 8,
        unberth: 6.4,
        arrays: 2.6,
        doorOpen: "1990-04-27T13:30:00Z",
      },
      landing: "1990-04-29T13:49:57Z",
      runway: "EDW22",
      blackout: false,
      dragChute: false,
      ogs: 19,
      rollout: 2.705,
      orbitPhaseName: "In orbit",
      scOverride: {
        ORB: {
          name: "Discovery (OV-103) with crew and consumables",
          dry: 84800,
        },
        PAY: { name: "Hubble Space Telescope", dry: 10886 },
        OMS: { prop: 11400 },
      },
    },
  },
  {
    id: "sts135",
    title: "STS-135 Atlantis",
    year: 2011,
    agency: "NASA",
    status: "Flown",
    crewed: true,
    dest: "earth",
    tag: "Last Shuttle flight — docking with the ISS",
    blurb:
      "The 135th and final Space Shuttle flight. Atlantis carried a year’s worth of supplies to the International Space Station in the Raffaello logistics module, stayed docked for eight days, flew a last lap around the station and landed at Kennedy before dawn.",
    crewNames: "Chris Ferguson, Doug Hurley, Sandra Magnus, Rex Walheim",
    real: {
      Launch: "2011-07-08 15:29:04 UTC, LC-39A",
      MECO: "T+8:24, then OMS-2 at T+37:45 → 158 × 229 km",
      Docking: "2011-07-10 15:07 UTC, PMA-2 on Harmony",
      Undocking: "2011-07-19 06:26 UTC",
      Landing: "2011-07-21 09:57:00 UTC, KSC Runway 15 (night)",
      Duration: "12 d 18 h 28 m",
      "ISS orbit": "≈ 383 × 390 km, 51.6°",
    },
    cfg: {
      name: "STS-135",
      profile: "leo-shuttle",
      dest: "earth",
      launcher: "shuttle",
      spacecraft: "shuttle",
      crew: 4,
      shipName: "Atlantis (OV-104)",
      orbiterId: "OV-104",
      bayPayload: "mplm",
      site: "KSC39A",
      launch: "2011-07-08T15:29:04Z",
      incl: 51.6,
      parking: { hp: 58, ha: 225, hCut: 105 },
      ssme: {
        sched: [
          [0, 1],
          [35, 1],
          [36, 0.69],
          [47, 0.69],
          [48, 1],
        ],
      },
      headsUpMET: 345,
      negReturn: 234,
      pressToMeco: 374,
      oms2: { hp: 158 },
      bayOpenMET: 1.4,
      iss: {
        dock: "2011-07-10T15:07:15Z",
        rpm: "2011-07-10T14:05:20Z",
        undock: "2011-07-19T06:25:45Z",
        hp: 383,
        ha: 390,
        mass: 420000,
        crew: 6,
        mplmOut: "2011-07-11T11:30:00Z",
        mplmIn: "2011-07-18T12:30:00Z",
        mplmName: "Raffaello",
      },
      landing: "2011-07-21T09:57:00Z",
      runway: "KSC15",
      blackout: false,
      dragChute: true,
      ogs: 18,
      rollout: 2.84,
      orbitPhaseName: "In orbit",
      scOverride: {
        ORB: {
          name: "Atlantis (OV-104) with crew and consumables",
          dry: 91500,
        },
        PAY: { name: "Raffaello logistics module (loaded)", dry: 12900 },
        OMS: { prop: 11000 },
      },
    },
  },
  // ------------------------------------------------------------------ GRAVITY ASSIST
  {
    id: "europaClipper",
    title: "Europa Clipper (MEGA)",
    year: 2024,
    agency: "NASA / JPL",
    status: "In flight",
    crewed: false,
    dest: "mars",
    tag: "Mars & Earth gravity assists",
    blurb:
      "NASA’s largest planetary spacecraft could not reach Jupiter directly. It borrows energy from Mars (March 2025) and Earth (December 2026) — a Mars–Earth Gravity Assist (MEGA) trajectory.",
    real: {
      Launch: "2024-10-14 16:06 UTC, Falcon Heavy (expendable)",
      "Mars flyby": "2025-03-01 17:57 UTC, 884 km",
      "Earth flyby": "2026-12-03 ≈21:15 UTC",
      "Jupiter arrival": "2030-04-11",
      Mass: "6,065 kg (2,750 kg propellant)",
    },
    cfg: {
      name: "Europa Clipper",
      profile: "multi-flyby",
      dest: "mars",
      launcher: "falconHeavy",
      spacecraft: "europaClipper",
      crew: 0,
      shipName: "Europa Clipper",
      site: "KSC39A",
      launch: "2024-10-14T16:06:00Z",
      parking: { hp: 185, ha: 190 },
      tmiDelay: 0.6,
      legs: [
        {
          body: "mars",
          t: "2025-03-01T17:57:00Z",
          type: "flyby",
          minAlt: 300,
          name: "Mars gravity assist",
          events: [
            {
              dt: -0.3,
              name: "Infrared images of Mars",
              desc: "The thermal imager (E-THEMIS) is tested on Mars during the flyby.",
              kind: "photo",
            },
          ],
        },
        {
          body: "earth",
          t: "2026-12-03T21:15:00Z",
          type: "flyby",
          minAlt: 300,
          name: "Earth gravity assist",
        },
        { body: "jupiter", t: "2030-04-11T00:00:00Z", type: "design" },
      ],
      coastAfter: 150,
      afterPhase: "cruise to Jupiter",
      endNote: {
        name: "Onward to Jupiter",
        desc: "After the Earth flyby the craft climbs to Jupiter’s orbit, arriving in April 2030 for 49 flybys of Europa.",
      },
      tcmAfterFlyby: 12,
    },
  },
];
function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}
function planScenario(cfg, progress) {
  if ((cfg.profile || "").startsWith("leo")) return planLEO(cfg, progress);
  if (cfg.dest === "moon" || (cfg.profile || "").startsWith("lunar"))
    return planLunar(cfg, progress);
  return planInterplanetary(cfg, progress);
}
