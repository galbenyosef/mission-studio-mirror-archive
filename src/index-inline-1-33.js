// index-inline-1 33 — best
// Lines 11670-12013 of readable/index-inline-1.pretty.js (statement-aligned).
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

// ---- halo.js
// ============================================================================
// halo.js — the Sun–Earth L2 point and a halo orbit about it (James Webb)
//   seRot(t): the Sun–Earth rotating frame; l2Point(t): where L2 is
//   haloCR3BP(az): a periodic halo in the circular restricted three-body problem (Richardson's third-order
//     approximation, then differential correction); haloRef(t, …): that orbit laid into the real ephemeris
//   haloStableDir / manifoldBranch: the halo's stable manifold, the branch of it that comes down to the Earth
//   planHalo(cfg): the transfer designed as that branch (launch plane, perigee, timing), then the launch, the injection
//     onto it, the corrections, the insertion and the station-keeping, all tracking the branch as reference
// ============================================================================
// the mass parameter of the Sun–(Earth+Moon) problem; the Earth and Moon together stand at the Earth's place
const MU_SE =
  (BODIES.earth.mu + BODIES.moon.mu) /
  (BODIES.sun.mu + BODIES.earth.mu + BODIES.moon.mu);
// The Sun–Earth rotating frame: x̂ from the Sun through the Earth (on toward L2), ẑ the normal of the Earth's orbit, ŷ
// completing it. Row-major, columns x̂ ŷ ẑ — the layout of emRot (app/40_missionview.js), so the two frames share code.
function seRot(t) {
  const e = planetHelio("earth", t),
    x = vunit(e.r),
    z = vunit(vcross(e.r, e.v)),
    y = vcross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}
// the Earth's mean motion about the Sun (rad/s): the sidereal year. (The instantaneous rate swings 7 % between perihelion
// and aphelion; the reference orbit keeps the mean, so its phase comes round exactly once a period.)
const SE_N = TAU / (365.25636 * 86400);
function seOmega() {
  return SE_N;
}
// γ: the distance of L2 from the Earth in units of the Sun–Earth distance, the root of the quintic
function l2Gamma() {
  if (l2Gamma.v) return l2Gamma.v;
  const mu = MU_SE;
  let g = Math.cbrt(mu / 3);
  for (let k = 0; k < 50; k++) {
    const f =
      g ** 5 +
      (3 - mu) * g ** 4 +
      (3 - 2 * mu) * g ** 3 -
      mu * g * g -
      2 * mu * g -
      mu;
    const df =
      5 * g ** 4 +
      4 * (3 - mu) * g ** 3 +
      3 * (3 - 2 * mu) * g * g -
      2 * mu * g -
      2 * mu;
    const d = f / df;
    g -= d;
    if (Math.abs(d) < 1e-15) break;
  }
  return (l2Gamma.v = g);
}
// L2 now, geocentric ecliptic km: on the anti-Sun line, γ of the Earth's distance out
function l2Point(t) {
  const e = planetHelio("earth", t);
  return vscale(vunit(e.r), l2Gamma() * vnorm(e.r));
}
// ---------------- the circular restricted three-body problem ----------------
// Rotating frame, origin the barycentre, x toward the Earth (at 1 − μ), unit length the Sun–Earth distance, unit time
// 1/n (so a year is 2π). y: [x, y, z, ẋ, ẏ, ż] and, for the state transition matrix, 36 more.
