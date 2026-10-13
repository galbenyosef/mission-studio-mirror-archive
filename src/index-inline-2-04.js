// index-inline-2 04 — math
// Lines 792-965 of readable/index-inline-2.pretty.js (statement-aligned).
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
