// index-inline-1 34 — lam
// Lines 12014-12339 of readable/index-inline-1.pretty.js (statement-aligned).
function cr3bpODE(mu, withSTM) {
  return (t, y, out) => {
    const x = y[0],
      yy = y[1],
      z = y[2],
      vx = y[3],
      vy = y[4],
      vz = y[5];
    const x1 = x + mu,
      x2 = x - 1 + mu,
      r1s = x1 * x1 + yy * yy + z * z,
      r2s = x2 * x2 + yy * yy + z * z;
    const r13 = Math.pow(r1s, -1.5),
      r23 = Math.pow(r2s, -1.5),
      m1 = 1 - mu,
      m2 = mu;
    out[0] = vx;
    out[1] = vy;
    out[2] = vz;
    out[3] = 2 * vy + x - m1 * x1 * r13 - m2 * x2 * r23;
    out[4] = -2 * vx + yy - m1 * yy * r13 - m2 * yy * r23;
    out[5] = -m1 * z * r13 - m2 * z * r23;
    if (!withSTM) return;
    const r15 = r13 / r1s,
      r25 = r23 / r2s;
    const Uxx =
      1 - m1 * r13 - m2 * r23 + 3 * m1 * x1 * x1 * r15 + 3 * m2 * x2 * x2 * r25;
    const Uyy =
      1 - m1 * r13 - m2 * r23 + 3 * m1 * yy * yy * r15 + 3 * m2 * yy * yy * r25;
    const Uzz =
      -m1 * r13 - m2 * r23 + 3 * m1 * z * z * r15 + 3 * m2 * z * z * r25;
    const Uxy = 3 * m1 * x1 * yy * r15 + 3 * m2 * x2 * yy * r25,
      Uxz = 3 * m1 * x1 * z * r15 + 3 * m2 * x2 * z * r25,
      Uyz = 3 * m1 * yy * z * r15 + 3 * m2 * yy * z * r25;
    // A = [[0, I], [U, 2Ω]] with Ω the rotation; Φ̇ = A Φ, Φ stored row-major from index 6
    const A = [
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
      [Uxx, Uxy, Uxz, 0, 2, 0],
      [Uxy, Uyy, Uyz, -2, 0, 0],
      [Uxz, Uyz, Uzz, 0, 0, 0],
    ];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) {
        let s = 0;
        for (let k = 0; k < 6; k++) s += A[i][k] * y[6 + 6 * k + j];
        out[6 + 6 * i + j] = s;
      }
  };
}
// Richardson's third-order approximation of a halo about L2 (1980), lengths in units of γ about L2, time in units of
// 1/n: the state at τ₁ = 0 (the x–z plane crossing nearest the Earth), the frequency ω and the period
function richardsonHalo(mu, gam, azU, n = 1) {
  const c = (k) =>
    (Math.pow(-1, k) * mu +
      (Math.pow(-1, k) * (1 - mu) * Math.pow(gam, k + 1)) /
        Math.pow(1 + gam, k + 1)) /
    (gam * gam * gam);
  const c2 = c(2),
    c3 = c(3),
    c4 = c(4);
  const lam = Math.sqrt(
    (2 - c2 + Math.sqrt((c2 - 2) * (c2 - 2) + 4 * (c2 - 1) * (1 + 2 * c2))) / 2,
  );
  const k = (2 * lam) / (lam * lam + 1 - c2),
    Del = lam * lam - c2;
  const d1 = ((3 * lam * lam) / k) * (k * (6 * lam * lam - 1) - 2 * lam),
    d2 = ((8 * lam * lam) / k) * (k * (11 * lam * lam - 1) - 2 * lam);
  const a21 = (3 * c3 * (k * k - 2)) / (4 * (1 + 2 * c2)),
    a22 = (3 * c3) / (4 * (1 + 2 * c2));
  const a23 =
      ((-3 * c3 * lam) / (4 * k * d1)) *
      (3 * k * k * k * lam - 6 * k * (k - lam) + 4),
    a24 = ((-3 * c3 * lam) / (4 * k * d1)) * (2 + 3 * k * lam);
  const b21 = ((-3 * c3 * lam) / (2 * d1)) * (3 * k * lam - 4),
    b22 = (3 * c3 * lam) / d1,
    d21 = -c3 / (2 * lam * lam);
  const a31 =
    ((-9 * lam) / (4 * d2)) *
      (4 * c3 * (k * a23 - b21) + k * c4 * (4 + k * k)) +
    ((9 * lam * lam + 1 - c2) / (2 * d2)) *
      (3 * c3 * (2 * a23 - k * b21) + c4 * (2 + 3 * k * k));
  const a32 =
    (-1 / d2) *
    (((9 * lam) / 4) * (4 * c3 * (k * a24 - b22) + k * c4) +
      1.5 * (9 * lam * lam + 1 - c2) * (c3 * (k * b22 + d21 - 2 * a24) - c4));
  const b31 =
    (3 / (8 * d2)) *
    (8 * lam * (3 * c3 * (k * b21 - 2 * a23) - c4 * (2 + 3 * k * k)) +
      (9 * lam * lam + 1 + 2 * c2) *
        (4 * c3 * (k * a23 - b21) + k * c4 * (4 + k * k)));
  const b32 =
    (1 / d2) *
    (9 * lam * (c3 * (k * b22 + d21 - 2 * a24) - c4) +
      (3 / 8) *
        (9 * lam * lam + 1 + 2 * c2) *
        (4 * c3 * (k * a24 - b22) + k * c4));
  const d31 = (3 / (64 * lam * lam)) * (4 * c3 * a24 + c4),
    d32 = (3 / (64 * lam * lam)) * (4 * c3 * (a23 - d21) + c4 * (4 + k * k));
  const s1 =
    (1 / (2 * lam * (lam * (1 + k * k) - 2 * k))) *
    (1.5 * c3 * (2 * a21 * (k * k - 2) - a23 * (k * k + 2) - 2 * k * b21) -
      (3 / 8) * c4 * (3 * k ** 4 - 8 * k * k + 8));
  const s2 =
    (1 / (2 * lam * (lam * (1 + k * k) - 2 * k))) *
    (1.5 *
      c3 *
      (2 * a22 * (k * k - 2) + a24 * (k * k + 2) + 2 * k * b22 + 5 * d21) +
      (3 / 8) * c4 * (12 - k * k));
  const a1 =
      -1.5 * c3 * (2 * a21 + a23 + 5 * d21) - (3 / 8) * c4 * (12 - k * k),
    a2 = 1.5 * c3 * (a24 - 2 * a22) + (9 / 8) * c4;
  const l1 = a1 + 2 * lam * lam * s1,
    l2 = a2 + 2 * lam * lam * s2;
  const Az = azU,
    Ax = Math.sqrt(-(l2 * Az * Az + Del) / l1),
    dn = 2 - n;
  const om = 1 + s1 * Ax * Ax + s2 * Az * Az;
  const x0 =
    a21 * Ax * Ax +
    a22 * Az * Az -
    Ax +
    (a23 * Ax * Ax - a24 * Az * Az) +
    (a31 * Ax ** 3 - a32 * Ax * Az * Az);
  const z0 =
    dn * Az +
    dn * d21 * Ax * Az * (1 - 3) +
    dn * (d32 * Az * Ax * Ax - d31 * Az ** 3);
  const vy0 =
    lam *
    om *
    (k * Ax +
      2 * (b21 * Ax * Ax - b22 * Az * Az) +
      3 * (b31 * Ax ** 3 - b32 * Ax * Az * Az)); // (τ₁ = λωt: the phase runs at λω)
  return { x0, z0, vy0, om, T: (2 * Math.PI) / (lam * om), Ax };
}
// A periodic halo about L2 with out-of-plane amplitude azKm (northern, or southern for azKm < 0), in CR3BP units: the state at the x–z plane
// crossing nearest the Earth and the period. From Richardson's guess, corrected until the orbit recrosses the plane
// perpendicularly half a period later (x0 and ẏ0 adjusted, z0 held).
function haloCR3BP(azKm) {
  // (azKm < 0: the southern halo, the northern one's mirror image in the ecliptic)
  haloCR3BP.cache = haloCR3BP.cache || {};
  if (haloCR3BP.cache[azKm]) return haloCR3BP.cache[azKm];
  const mu = MU_SE,
    gam = l2Gamma(),
    AU_KM = vnorm(planetHelio("earth", isoToT("2022-01-01T00:00:00Z")).r);
  const R = richardsonHalo(
    mu,
    gam,
    Math.abs(azKm) / (gam * AU_KM),
    azKm < 0 ? 3 : 1,
  );
  // into barycentric units: L2 at 1 − μ + γ, lengths × γ
  const y0 = new Float64Array(42);
  y0[0] = 1 - mu + gam + R.x0 * gam;
  y0[2] = R.z0 * gam;
  y0[4] = R.vy0 * gam;
  for (let i = 0; i < 6; i++) y0[6 + 7 * i] = 1;
  const f = cr3bpODE(mu, true);
  let Thalf = R.T / 2;
  for (let it = 0; it < 30; it++) {
    const res = integrate(f, 0, y0, 1.5 * Thalf, {
      rtol: 1e-12,
      atol: 1e-14,
      h0: 0.01,
      events: [{ name: "xz", g: (t, y) => y[1], dir: 0, terminal: true }],
      maxSteps: 2e5,
    });
    if (!res.stopped) break;
    const ye = res.stopEvent.y,
      fe = res.stopEvent.f,
      P = (i, j) => ye[6 + 6 * i + j];
    const vx = ye[3],
      vz = ye[5];
    Thalf = res.stopEvent.t;
    if (Math.abs(vx) < 1e-11 && Math.abs(vz) < 1e-11) break;
    // δ[ẋ, ż] at the crossing from δ[x0, ẏ0], the crossing time's own shift folded in (δt = −δy / ẏ)
    const vy = ye[4],
      ax = fe[3],
      az = fe[5];
    const m00 = P(3, 0) - (ax / vy) * P(1, 0),
      m01 = P(3, 4) - (ax / vy) * P(1, 4),
      m10 = P(5, 0) - (az / vy) * P(1, 0),
      m11 = P(5, 4) - (az / vy) * P(1, 4);
    const det = m00 * m11 - m01 * m10;
    const dx0 = (-vx * m11 + vz * m01) / det,
      dvy0 = (-m00 * vz + m10 * vx) / det;
    y0[0] += dx0;
    y0[4] += dvy0;
  }
  const out = {
    y0: Float64Array.from(y0.subarray(0, 6)),
    T: 2 * Thalf,
    mu,
    gam,
  };
  // the orbit over one period, sampled for haloRef (positions and velocities in CR3BP units)
  const res = integrate(cr3bpODE(mu, false), 0, out.y0, out.T, {
    rtol: 1e-12,
    atol: 1e-14,
    h0: 0.01,
    hmax: out.T / 720,
    maxSteps: 2e5,
  });
  out.ts = res.t;
  out.ys = res.y;
  return (haloCR3BP.cache[azKm] = out);
}
// the halo's period in seconds at time t (the CR3BP period in units of the Earth's mean motion then)
function haloPeriodS(t, azKm) {
  return haloCR3BP(azKm).T / seOmega(t);
}
// the reference halo at time t, geocentric ecliptic km and km/s: phase 0 (the crossing nearest the Earth) at tPhase0; the
// CR3BP orbit is scaled by the Earth's distance from the Sun that day and turned into the inertial frame with seRot(t)
function haloRef(t, tPhase0, azKm) {
  const H = haloCR3BP(azKm),
    om = seOmega(t),
    T = H.T / om;
  let ph = ((t - tPhase0) / T) % 1;
  if (ph < 0) ph += 1;
  const tau = ph * H.T,
    i = bsearch(H.ts, tau),
    j = Math.min(i + 1, H.ts.length - 1),
    s = H.ts[j] > H.ts[i] ? (tau - H.ts[i]) / (H.ts[j] - H.ts[i]) : 0;
  const y = [];
  for (let k = 0; k < 6; k++)
    y.push(H.ys[i][k] + (H.ys[j][k] - H.ys[i][k]) * s);
  const e = planetHelio("earth", t),
    L = vnorm(e.r),
    Rm = seRot(t);
  const rr = [(y[0] - (1 - H.mu)) * L, y[1] * L, y[2] * L]; // from the Earth, rotating frame, km
  const vr = [y[3] * L * om, y[4] * L * om, y[5] * L * om]; // km/s in the rotating frame
  const wxr = [-om * rr[1], om * rr[0], 0]; // ω × r with ω = om ẑ
  const vi = vadd(vr, wxr);
  const rot = (v) => [
    Rm[0] * v[0] + Rm[1] * v[1] + Rm[2] * v[2],
    Rm[3] * v[0] + Rm[4] * v[1] + Rm[5] * v[2],
    Rm[6] * v[0] + Rm[7] * v[1] + Rm[8] * v[2],
  ];
  return { r: rot(rr), v: rot(vi) };
}
// ---------------- the stable manifold: the way in ----------------
// A halo is unstable, and so has a stable manifold: the family of paths that fall onto it. One branch of it comes down
// to the Earth — and that is Webb's transfer: the launcher put the telescope on it at perigee, and it climbed for a month
// to settle onto the halo with next to no insertion burn. Here the branch is found in the CR3BP from the halo's
// monodromy matrix (the stable eigenvector), followed backward from a point near the halo down to its perigee, and laid
// into the real ephemeris as the reference the flight tracks.
function haloStableDir(azKm) {
  // the stable eigenvector of the monodromy matrix at the halo's phase 0, and the state-transition matrices round the orbit
  const H = haloCR3BP(azKm);
  if (H.vs) return H;
  const f = cr3bpODE(H.mu, true),
    y0 = new Float64Array(42);
  for (let i = 0; i < 6; i++) y0[i] = H.y0[i];
  for (let i = 0; i < 6; i++) y0[6 + 7 * i] = 1;
  const res = integrate(f, 0, y0, H.T, {
    rtol: 1e-12,
    atol: 1e-14,
    h0: 0.01,
    hmax: H.T / 240,
    maxSteps: 2e5,
  });
  const yE = res.y[res.y.length - 1],
    Mon = Array.from({ length: 6 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => yE[6 + 6 * i + j]),
    );
  // the stable direction: the dominant eigenvector of the inverse (power iteration)
  const inv = (A) => {
    const n = 6,
      Mx = A.map((r, i) => [
        ...r,
        ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
      ]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++)
        if (Math.abs(Mx[r][c]) > Math.abs(Mx[p][c])) p = r;
      [Mx[c], Mx[p]] = [Mx[p], Mx[c]];
      const d = Mx[c][c];
      for (let j = 0; j < 2 * n; j++) Mx[c][j] /= d;
      for (let r = 0; r < n; r++)
        if (r !== c) {
          const fct = Mx[r][c];
          for (let j = 0; j < 2 * n; j++) Mx[r][j] -= fct * Mx[c][j];
        }
    }
    return Mx.map((r) => r.slice(n));
  };
  const Mi = inv(Mon);
  let v = [1, 0.3, 0.2, 0.1, 0.5, 0.1];
  for (let i = 0; i < 400; i++) {
    const w = Mi.map((r) => r.reduce((a, b, j) => a + b * v[j], 0));
    const nn = Math.hypot(...w);
    v = w.map((x) => x / nn);
  }
  H.vs = v;
  H.stm = res;
  return H;
}
// the state on the halo at phase ph (0…1), and the stable direction carried there
function haloSeed(azKm, ph) {
  const H = haloStableDir(azKm),
    tau = ph * H.T,
    S = H.stm,
    i = bsearch(S.t, tau),
    j = Math.min(i + 1, S.t.length - 1),
    f = S.t[j] > S.t[i] ? (tau - S.t[i]) / (S.t[j] - S.t[i]) : 0;
  const y = [],
    Phi = [];
  for (let k = 0; k < 6; k++) y.push(S.y[i][k] + (S.y[j][k] - S.y[i][k]) * f);
  for (let a = 0; a < 6; a++) {
    let acc = 0;
    for (let b = 0; b < 6; b++)
      acc +=
        (S.y[i][6 + 6 * a + b] +
          (S.y[j][6 + 6 * a + b] - S.y[i][6 + 6 * a + b]) * f) *
        H.vs[b];
    Phi.push(acc);
  }
  const nv = Math.hypot(...Phi);
  return { y, vs: Phi.map((x) => x / nv), H };
}
// The branch of the stable manifold from the seed (the halo at phase ph, pushed eps along the stable direction, sign sg):
// backward in CR3BP time to its perigee about the Earth (or until it leaves), and forward through the approach onto the
// halo for fwdT. Returns the samples in CR3BP units with tau = 0 at the seed, and the perigee.
