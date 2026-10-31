// index-inline-1 01 — math
// Lines 7-345 of readable/index-inline-1.pretty.js (statement-aligned).
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
