// index-inline-1 29 — mass
// Lines 10330-10531 of readable/index-inline-1.pretty.js (statement-aligned).
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
