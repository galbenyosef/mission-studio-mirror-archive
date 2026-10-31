// index-inline-1 33 — best
// Lines 11548-11890 of readable/index-inline-1.pretty.js (statement-aligned).
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
